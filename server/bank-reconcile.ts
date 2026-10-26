import { randomUUID } from "crypto";
import { Router } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { postQuickBooks, queryQuickBooks } from "./quickbooks-routes";
import { requirePlatformRole } from "./platformAuth";

type AccountRow = { id: string; name: string; full: string; number: string; type: string };
type StatementLine = {
  id: string;
  seq: number;
  txnDate: string;
  description: string;
  memo: string;
  amount: number;
  checkNumber: string;
  balance: number | null;
};
type BookHit = { id: string; kind: string; doc: string; date: string; name: string; amount: number; detail: string };
type MemoryRule = { pattern: string; kind: string; accountId: string; accountName: string; uses: number };
type AmazonItem = { orderId: string; orderDate: string; title: string; amount: number };

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const bookCache = new Map<string, { at: number; hits: BookHit[] }>();

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function cents(value: number) {
  return Math.round(Number(value || 0) * 100);
}

function qbFault(error: unknown) {
  const err = error as { response?: { data?: { Fault?: { Error?: { Detail?: string; Message?: string }[] } } }; message?: string };
  const item = err.response?.data?.Fault?.Error?.[0];
  return item?.Detail || item?.Message || err.message || "QuickBooks request failed";
}

function shiftIso(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function monthEnd(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber, 0));
  return date.toISOString().slice(0, 10);
}

function isoDate(value: string) {
  const text = value.trim();
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const us = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!us) return "";
  const year = us[3].length === 2 ? `20${us[3]}` : us[3];
  return `${year}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
}

function numberOf(value: string) {
  const text = value.replace(/[$,]/g, "").trim();
  if (!text) return 0;
  const wrapped = /^\(.*\)$/.test(text);
  const amount = Number(text.replace(/[()]/g, ""));
  if (!Number.isFinite(amount)) return 0;
  return wrapped ? -Math.abs(amount) : amount;
}

function rowsFromUpload(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", raw: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" }) as unknown[][];
  return grid.map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "").trim()) : []));
}

function headerIndex(headers: string[], tests: RegExp[]) {
  return headers.findIndex((header) => tests.some((test) => test.test(header)));
}

function parseStatement(buffer: Buffer, accountType: string) {
  const grid = rowsFromUpload(buffer);
  const headerAt = grid.findIndex((row) => {
    const joined = row.join(" ").toLowerCase();
    return joined.includes("date") && (joined.includes("description") || joined.includes("debit") || joined.includes("amount"));
  });
  if (headerAt < 0) throw new Error("The file needs a header row with a date and an amount.");
  const headers = grid[headerAt].map((header) => header.toLowerCase());
  const dateAt = headerIndex(headers, [/^date$/, /trans.*date/, /posted/, /txn date/]);
  const descAt = headerIndex(headers, [/description/, /payee/, /name/, /merchant/]);
  const memoAt = headerIndex(headers, [/^memo$/, /note/, /reference/, /detail/]);
  const debitAt = headerIndex(headers, [/amount debit/, /^debit$/]);
  const creditAt = headerIndex(headers, [/amount credit/, /^credit$/]);
  const amountAt = headerIndex(headers, [/^amount$/, /^amt$/]);
  const balanceAt = headerIndex(headers, [/^balance$/]);
  const checkAt = headerIndex(headers, [/check number/, /^check$/, /cheque/, /check #/]);
  if (dateAt < 0 || (amountAt < 0 && debitAt < 0 && creditAt < 0)) throw new Error("The file needs a date and an amount, or debit and credit columns.");

  const parsed: StatementLine[] = [];
  for (const row of grid.slice(headerAt + 1)) {
    const txnDate = isoDate(row[dateAt] || "");
    if (!txnDate) continue;
    let amount = 0;
    if (debitAt >= 0 || creditAt >= 0) {
      const debit = numberOf(row[debitAt] || "");
      const credit = numberOf(row[creditAt] || "");
      amount = debit < 0 || credit < 0 ? money(credit + debit) : money(credit - debit);
    } else {
      amount = money(numberOf(row[amountAt] || ""));
    }
    if (!amount) continue;
    const balanceText = balanceAt >= 0 ? row[balanceAt] || "" : "";
    parsed.push({
      id: randomUUID(),
      seq: parsed.length,
      txnDate,
      description: (row[descAt] || "").slice(0, 240),
      memo: (row[memoAt] || "").slice(0, 400),
      amount,
      checkNumber: (row[checkAt] || "").replace(/\.0$/, "").slice(0, 40),
      balance: balanceText ? money(numberOf(balanceText)) : null,
    });
  }
  if (!parsed.length) throw new Error("No transactions were found in that file.");
  const newestFirst = parsed[0].txnDate > parsed[parsed.length - 1].txnDate;
  const lines = newestFirst ? [...parsed].reverse() : parsed;
  if (accountType === "Credit Card" && amountAt >= 0 && debitAt < 0) {
    const positive = lines.filter((line) => line.amount > 0).length;
    if (positive > lines.length / 2) {
      for (const line of lines) line.amount = money(-line.amount);
    }
  }
  lines.forEach((line, index) => { line.seq = index; });
  return lines;
}

function parseAmazon(buffer: Buffer) {
  const grid = rowsFromUpload(buffer);
  const headerAt = grid.findIndex((row) => {
    const joined = row.join(" ").toLowerCase();
    return joined.includes("date") && (joined.includes("title") || joined.includes("product") || joined.includes("item"));
  });
  if (headerAt < 0) throw new Error("The Amazon file needs a date and a product title.");
  const headers = grid[headerAt].map((header) => header.toLowerCase());
  const dateAt = headerIndex(headers, [/order date/, /^date$/]);
  const orderAt = headerIndex(headers, [/order id/, /order number/]);
  const titleAt = headerIndex(headers, [/^title$/, /product/, /item name/, /^item$/]);
  const amountAt = headerIndex(headers, [/item net total/, /item total/, /amount/, /total/]);
  if (dateAt < 0 || titleAt < 0 || amountAt < 0) throw new Error("The Amazon file needs the order date, the product, and the amount.");
  const items: AmazonItem[] = [];
  for (const row of grid.slice(headerAt + 1)) {
    const orderDate = isoDate(row[dateAt] || "");
    const title = (row[titleAt] || "").slice(0, 240);
    const amount = money(Math.abs(numberOf(row[amountAt] || "")));
    if (!orderDate || !title || !amount) continue;
    items.push({ orderId: (row[orderAt] || `${orderDate}-${title}`).slice(0, 80), orderDate, title, amount });
  }
  if (!items.length) throw new Error("No Amazon items were found in that file.");
  return items;
}

async function ensureTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS accounting_reconcile_statements (
      id varchar PRIMARY KEY,
      account_id varchar NOT NULL,
      account_name varchar NOT NULL,
      account_type varchar NOT NULL,
      filename varchar NOT NULL,
      period_start varchar NOT NULL,
      period_end varchar NOT NULL,
      created_at timestamp DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS accounting_reconcile_lines (
      id varchar PRIMARY KEY,
      statement_id varchar NOT NULL,
      seq integer NOT NULL,
      txn_date varchar NOT NULL,
      description varchar NOT NULL,
      memo varchar NOT NULL,
      amount numeric NOT NULL,
      check_number varchar NOT NULL,
      balance numeric,
      month varchar NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS accounting_reconcile_decisions (
      id varchar PRIMARY KEY,
      line_id varchar NOT NULL UNIQUE,
      action varchar NOT NULL,
      account_id varchar NOT NULL,
      account_name varchar NOT NULL,
      amount numeric NOT NULL,
      book_id varchar NOT NULL,
      book_doc varchar NOT NULL,
      note varchar NOT NULL,
      created_at timestamp DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS accounting_amazon_items (
      id varchar PRIMARY KEY,
      order_id varchar NOT NULL,
      order_date varchar NOT NULL,
      title varchar NOT NULL,
      amount numeric NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS accounting_classify_rules (
      id varchar PRIMARY KEY,
      pattern varchar NOT NULL,
      kind varchar NOT NULL,
      account_id varchar NOT NULL,
      account_name varchar NOT NULL,
      uses integer NOT NULL DEFAULT 1,
      updated_at timestamp DEFAULT now(),
      UNIQUE (kind, pattern)
    )
  `);
}

async function queryRows<T>(entity: string, where: string) {
  const rows: T[] = [];
  for (let start = 1; start <= 2000; start += 500) {
    const page = await queryQuickBooks(`SELECT * FROM ${entity} WHERE ${where} STARTPOSITION ${start} MAXRESULTS 500`);
    const batch = (page.data?.QueryResponse?.[entity] ?? []) as T[];
    rows.push(...batch);
    if (batch.length < 500) break;
  }
  return rows;
}

let accountCache: { at: number; rows: AccountRow[] } | null = null;

async function chart() {
  if (accountCache && Date.now() - accountCache.at < 5 * 60 * 1000) return accountCache.rows;
  const rows = await queryRows<{ Id: string; Name?: string; FullyQualifiedName?: string; AcctNum?: string; AccountType?: string; Active?: boolean }>("Account", "Active IN (true, false)");
  const mapped = rows
    .filter((account) => account.Active !== false)
    .map((account) => ({
      id: account.Id,
      name: account.Name || "",
      full: account.FullyQualifiedName || account.Name || "",
      number: account.AcctNum || "",
      type: account.AccountType || "",
    }));
  accountCache = { at: Date.now(), rows: mapped };
  return mapped;
}

function preferAccount(accounts: AccountRow[], test: RegExp) {
  return accounts.find((account) => test.test(`${account.number} ${account.full}`)) || null;
}

function payeePattern(description: string, memo: string) {
  const source = `${description} ${memo}`.toLowerCase().replace(/external (withdrawal|deposit)/g, " ");
  const cut = source.split(/[-*]/)[0] || source;
  return cut.replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim().split(" ").slice(0, 4).join(" ");
}

function productPattern(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim().split(" ").filter((word) => word.length > 2).slice(0, 6).join(" ");
}

function learnScore(pattern: string, text: string) {
  if (!pattern || !text) return 0;
  if (text.includes(pattern) || pattern.includes(text)) return pattern.split(" ").length + 2;
  const words = pattern.split(" ").filter((word) => word.length > 3);
  const hits = words.filter((word) => text.includes(word)).length;
  return words.length && hits === words.length ? hits : 0;
}

async function memoryRules() {
  await ensureTables();
  const result = await db.execute(sql`SELECT pattern, kind, account_id, account_name, uses FROM accounting_classify_rules ORDER BY uses DESC, updated_at DESC LIMIT 200`);
  return (result.rows as { pattern: string; kind: string; account_id: string; account_name: string; uses: number }[]).map((row) => ({
    pattern: row.pattern,
    kind: row.kind,
    accountId: row.account_id,
    accountName: row.account_name,
    uses: Number(row.uses),
  }));
}

async function remember(kind: string, pattern: string, accountId: string, accountName: string) {
  const cleaned = pattern.slice(0, 160);
  if (cleaned.length < 3 || !accountId) return;
  await db.execute(sql`
    INSERT INTO accounting_classify_rules (id, pattern, kind, account_id, account_name, uses)
    VALUES (${randomUUID()}, ${cleaned}, ${kind}, ${accountId}, ${accountName}, 1)
    ON CONFLICT (kind, pattern) DO UPDATE
    SET account_id = ${accountId}, account_name = ${accountName}, uses = accounting_classify_rules.uses + 1, updated_at = now()
  `);
}

function depositLabel(memo: string) {
  const match = memo.match(/\bDEP\s+([A-Z]{3})\s+(\d{1,2})\b/i);
  if (!match) return "";
  return `${match[1].toUpperCase()} ${match[2]}`;
}

async function bookHits(accountId: string, month: string) {
  const key = `${accountId}|${month}`;
  const cached = bookCache.get(key);
  if (cached && Date.now() - cached.at < 60 * 1000) return cached.hits;
  const start = shiftIso(`${month}-01`, -21);
  const end = shiftIso(monthEnd(month), 3);
  const where = `TxnDate >= '${start}' AND TxnDate <= '${end}'`;
  const [journals, purchases, bills, deposits, transfers, payments] = await Promise.all([
    queryRows<{ Id: string; DocNumber?: string; TxnDate?: string; PrivateNote?: string; Line?: { Amount?: number; Description?: string; JournalEntryLineDetail?: { PostingType?: string; AccountRef?: { value?: string } } }[] }>("JournalEntry", where),
    queryRows<{ Id: string; DocNumber?: string; TxnDate?: string; TotalAmt?: number; PrivateNote?: string; AccountRef?: { value?: string }; EntityRef?: { name?: string } }>("Purchase", where),
    queryRows<{ Id: string; DocNumber?: string; TxnDate?: string; TotalAmt?: number; PrivateNote?: string; VendorRef?: { name?: string }; CheckPayment?: { BankAccountRef?: { value?: string } }; CreditCardPayment?: { CCAccountRef?: { value?: string } } }>("BillPayment", where),
    queryRows<{ Id: string; TxnDate?: string; TotalAmt?: number; PrivateNote?: string; DepositToAccountRef?: { value?: string } }>("Deposit", where),
    queryRows<{ Id: string; TxnDate?: string; Amount?: number; PrivateNote?: string; FromAccountRef?: { value?: string }; ToAccountRef?: { value?: string } }>("Transfer", where),
    queryRows<{ Id: string; TxnDate?: string; TotalAmt?: number; PrivateNote?: string; DepositToAccountRef?: { value?: string }; CustomerRef?: { name?: string } }>("Payment", where),
  ]);
  const hits: BookHit[] = [];
  for (const journal of journals) {
    (journal.Line || []).forEach((line, index) => {
      const detail = line.JournalEntryLineDetail;
      if (detail?.AccountRef?.value !== accountId || !detail.PostingType) return;
      const signed = detail.PostingType === "Debit" ? Number(line.Amount || 0) : -Number(line.Amount || 0);
      if (!signed) return;
      hits.push({
        id: `${journal.Id}:${index}`,
        kind: "journal",
        doc: journal.DocNumber || journal.Id,
        date: journal.TxnDate || "",
        name: line.Description || journal.PrivateNote || "Journal",
        amount: money(signed),
        detail: journal.Id,
      });
    });
  }
  for (const purchase of purchases) {
    if (purchase.AccountRef?.value !== accountId) continue;
    hits.push({ id: `purchase:${purchase.Id}`, kind: "purchase", doc: purchase.DocNumber || purchase.Id, date: purchase.TxnDate || "", name: purchase.EntityRef?.name || purchase.PrivateNote || "Purchase", amount: money(-Number(purchase.TotalAmt || 0)), detail: purchase.Id });
  }
  for (const bill of bills) {
    const bank = bill.CheckPayment?.BankAccountRef?.value || bill.CreditCardPayment?.CCAccountRef?.value;
    if (bank !== accountId) continue;
    hits.push({ id: `bill:${bill.Id}`, kind: "bill", doc: bill.DocNumber || bill.Id, date: bill.TxnDate || "", name: bill.VendorRef?.name || "Bill payment", amount: money(-Number(bill.TotalAmt || 0)), detail: bill.Id });
  }
  for (const deposit of deposits) {
    if (deposit.DepositToAccountRef?.value !== accountId) continue;
    hits.push({ id: `deposit:${deposit.Id}`, kind: "deposit", doc: deposit.Id, date: deposit.TxnDate || "", name: deposit.PrivateNote || "Deposit", amount: money(Number(deposit.TotalAmt || 0)), detail: deposit.Id });
  }
  for (const transfer of transfers) {
    if (transfer.ToAccountRef?.value === accountId) hits.push({ id: `transfer:${transfer.Id}:in`, kind: "transfer", doc: transfer.Id, date: transfer.TxnDate || "", name: transfer.PrivateNote || "Transfer in", amount: money(Number(transfer.Amount || 0)), detail: transfer.Id });
    if (transfer.FromAccountRef?.value === accountId) hits.push({ id: `transfer:${transfer.Id}:out`, kind: "transfer", doc: transfer.Id, date: transfer.TxnDate || "", name: transfer.PrivateNote || "Transfer out", amount: money(-Number(transfer.Amount || 0)), detail: transfer.Id });
  }
  for (const payment of payments) {
    if (payment.DepositToAccountRef?.value !== accountId) continue;
    hits.push({ id: `payment:${payment.Id}`, kind: "payment", doc: payment.Id, date: payment.TxnDate || "", name: payment.CustomerRef?.name || "Customer payment", amount: money(Number(payment.TotalAmt || 0)), detail: payment.Id });
  }
  bookCache.set(key, { at: Date.now(), hits });
  return hits;
}

function daysApart(left: string, right: string) {
  if (!left || !right) return 99;
  return Math.abs(Math.round((Date.parse(`${left}T00:00:00Z`) - Date.parse(`${right}T00:00:00Z`)) / 86400000));
}

function sameAmount(left: number, right: number) {
  return Math.abs(cents(left) - cents(right)) <= 5;
}

type Proposal = {
  lineId: string;
  date: string;
  description: string;
  memo: string;
  amount: number;
  checkNumber: string;
  action: "match" | "correct-fee" | "correct-cash" | "classify" | "review";
  suggestion: string;
  accountId: string;
  accountName: string;
  bookId: string;
  bookDoc: string;
  bookAmount: number | null;
  correction: number;
  items: { title: string; amount: number }[];
};

function closestHit(hits: BookHit[], amount: number, date: string, window: number, used: Set<string>) {
  return hits
    .filter((hit) => !used.has(hit.id) && sameAmount(hit.amount, amount) && daysApart(hit.date, date) <= window)
    .sort((left, right) => daysApart(left.date, date) - daysApart(right.date, date))[0] || null;
}

export async function reviewStatement(statementId: string, month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("Choose a month.");
  await ensureTables();
  const statementResult = await db.execute(sql`SELECT id, account_id, account_name, account_type, filename, period_start, period_end FROM accounting_reconcile_statements WHERE id = ${statementId} LIMIT 1`);
  const statement = statementResult.rows[0] as { id: string; account_id: string; account_name: string; account_type: string; filename: string; period_start: string; period_end: string } | undefined;
  if (!statement) throw new Error("Upload a statement for this account.");
  const lineResult = await db.execute(sql`
    SELECT id, seq, txn_date, description, memo, amount, check_number, balance
    FROM accounting_reconcile_lines
    WHERE statement_id = ${statementId} AND month = ${month}
    ORDER BY seq
  `);
  const lines = (lineResult.rows as { id: string; seq: number; txn_date: string; description: string; memo: string; amount: string; check_number: string; balance: string | null }[]).map((row) => ({
    id: row.id,
    seq: Number(row.seq),
    txnDate: row.txn_date,
    description: row.description,
    memo: row.memo,
    amount: Number(row.amount),
    checkNumber: row.check_number,
    balance: row.balance == null ? null : Number(row.balance),
  }));
  const decisionResult = await db.execute(sql`
    SELECT d.line_id, d.action, d.note
    FROM accounting_reconcile_decisions d
    JOIN accounting_reconcile_lines l ON l.id = d.line_id
    WHERE l.statement_id = ${statementId} AND l.month = ${month}
  `);
  const decided = new Set((decisionResult.rows as { line_id: string }[]).map((row) => row.line_id));
  const accounts = await chart();
  const books = await bookHits(statement.account_id, month);
  const rules = await memoryRules();
  const from = shiftIso(`${month}-01`, -10);
  const to = shiftIso(monthEnd(month), 5);
  const amazonResult = await db.execute(sql`SELECT order_id, order_date, title, amount FROM accounting_amazon_items WHERE order_date >= ${from} AND order_date <= ${to}`);
  const amazon = amazonResult.rows as { order_id: string; order_date: string; title: string; amount: string }[];
  const feeAccount = preferAccount(accounts, /5655501|toast credit card fee/i);
  const shortAccount = preferAccount(accounts, /685000|cash over/i);
  const hints: { test: RegExp; account: RegExp }[] = [
    { test: /foodservice|us foods/, account: /food/i },
    { test: /pepsi/, account: /beverage|soda|pepsi|soft drink/i },
    { test: /comcast|xfinity/, account: /telephone|internet|utilities|cable/i },
    { test: /ngrid|national grid|eversource/, account: /electric|utilities|gas/i },
    { test: /republic/, account: /trash|waste|rubbish/i },
    { test: /unitedhealth|health/, account: /insurance|health/i },
    { test: /farm credit|sba loan/, account: /loan|interest/i },
    { test: /payroll|toast payr|tax collect/, account: /payroll/i },
    { test: /dept\. of revenue|excise|dor pay/, account: /sales tax|excise|tax payable/i },
    { test: /shopify|stripe/, account: /shopify|stripe|retail sales|wine income/i },
  ];

  const used = new Set<string>();
  const proposals: Proposal[] = [];
  const open = lines.filter((line) => !decided.has(line.id));
  for (const line of open) {
    const text = `${line.description} ${line.memo}`.toLowerCase();
    const toastIn = /toast/.test(text) && line.amount > 0 && /deposit/.test(text);
    const cashIn = line.description.trim().toLowerCase() === "deposit" && line.amount > 0;
    let hit: BookHit | null = null;
    if (line.checkNumber) {
      hit = books.find((item) => !used.has(item.id) && item.doc.replace(/\.0$/, "") === line.checkNumber && sameAmount(item.amount, line.amount) && daysApart(item.date, line.txnDate) <= 45) || null;
    }
    if (!hit && toastIn) {
      hit = closestHit(books.filter((item) => /toast cc deposit/i.test(item.name)), line.amount, line.txnDate, 6, used);
    } else if (!hit && cashIn) {
      hit = closestHit(books.filter((item) => /cash deposit/i.test(item.name)), line.amount, line.txnDate, 21, used);
    } else if (!hit) {
      hit = closestHit(books, line.amount, line.txnDate, 10, used);
    }
    if (hit) {
      used.add(hit.id);
      proposals.push({
        lineId: line.id,
        date: line.txnDate,
        description: line.description,
        memo: line.memo,
        amount: line.amount,
        checkNumber: line.checkNumber,
        action: "match",
        suggestion: `${hit.doc} on ${hit.date} is ${hit.amount.toFixed(2)}, ${hit.name}. Match this statement line to it.`,
        accountId: "",
        accountName: "",
        bookId: hit.detail,
        bookDoc: hit.doc,
        bookAmount: hit.amount,
        correction: 0,
        items: [],
      });
      continue;
    }

    if (toastIn || cashIn) {
      const lane = toastIn ? books.filter((item) => /toast cc deposit/i.test(item.name) && item.amount > 0) : books.filter((item) => /cash deposit/i.test(item.name) && item.amount > 0);
      const near = lane
        .filter((item) => !used.has(item.id) && daysApart(item.date, line.txnDate) <= (toastIn ? 6 : 21))
        .sort((left, right) => Math.abs(left.amount - line.amount) - Math.abs(right.amount - line.amount))[0];
      const gap = near ? money(near.amount - line.amount) : 0;
      const close = near && Math.abs(gap) >= 0.5 && Math.abs(gap) <= Math.max(50, Math.abs(near.amount) * (toastIn ? 0.08 : 0.05));
      if (near && close) {
        used.add(near.id);
        const target = toastIn ? feeAccount : shortAccount;
        const label = depositLabel(line.memo);
        proposals.push({
          lineId: line.id,
          date: line.txnDate,
          description: line.description,
          memo: line.memo,
          amount: line.amount,
          checkNumber: line.checkNumber,
          action: toastIn ? "correct-fee" : "correct-cash",
          suggestion: toastIn
            ? `The bank received ${line.amount.toFixed(2)}${label ? ` for the ${label} Toast deposit` : ""}. ${near.doc} has ${near.amount.toFixed(2)} on this account. Move ${Math.abs(gap).toFixed(2)} on that daily sales journal so the deposit matches the bank.`
            : `This cash deposit is ${line.amount.toFixed(2)}. ${near.doc} has ${near.amount.toFixed(2)}. Move ${Math.abs(gap).toFixed(2)} so the cash line matches the bank.`,
          accountId: target?.id || "",
          accountName: target?.full || "",
          bookId: near.detail,
          bookDoc: near.doc,
          bookAmount: near.amount,
          correction: gap,
          items: [],
        });
        continue;
      }
      if (toastIn || near) {
        proposals.push({
          lineId: line.id,
          date: line.txnDate,
          description: line.description,
          memo: line.memo,
          amount: line.amount,
          checkNumber: line.checkNumber,
          action: "review",
          suggestion: toastIn
            ? near
              ? `This Toast deposit is ${line.amount.toFixed(2)}. The nearest daily sales card line is ${near.amount.toFixed(2)} on ${near.doc}. Those amounts are too far apart to change the journal from here.`
              : "This Toast deposit has no daily sales card line near this date. Post that day on the DSR page, then come back to match it."
            : `This cash deposit is ${line.amount.toFixed(2)}. ${near?.doc} has ${near?.amount.toFixed(2)}, which is too far from the bank amount to change from here.`,
          accountId: "",
          accountName: "",
          bookId: "",
          bookDoc: near?.doc || "",
          bookAmount: near?.amount || null,
          correction: 0,
          items: [],
        });
        continue;
      }
    }

    const pattern = payeePattern(line.description, line.memo);
    const learned = rules
      .map((rule) => ({ rule, score: learnScore(rule.pattern, `${pattern} ${text}`) }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score || right.rule.uses - left.rule.uses)[0]?.rule;
    let account = learned ? accounts.find((item) => item.id === learned.accountId) || null : null;
    let items: { title: string; amount: number }[] = [];
    if (/amazon|amzn/.test(text)) {
      const orders = new Map<string, { date: string; total: number; items: { title: string; amount: number }[] }>();
      for (const item of amazon) {
        const order = orders.get(item.order_id) || { date: item.order_date, total: 0, items: [] };
        order.total = money(order.total + Number(item.amount));
        order.items.push({ title: item.title, amount: Number(item.amount) });
        orders.set(item.order_id, order);
      }
      const found = Array.from(orders.values()).filter((order) => Math.abs(order.total - Math.abs(line.amount)) <= 0.5 && daysApart(order.date, line.txnDate) <= 8);
      if (found.length === 1) {
        items = found[0].items;
        const productRule = items
          .map((item) => rules.find((rule) => rule.kind === "product" && learnScore(rule.pattern, productPattern(item.title)) > 0))
          .find(Boolean);
        if (!account && productRule) account = accounts.find((item) => item.id === productRule.accountId) || null;
      }
    }
    if (!account) {
      const hint = hints.find((item) => item.test.test(text));
      if (hint) account = preferAccount(accounts, hint.account);
    }
    const names = items.map((item) => item.title).slice(0, 3).join("; ");
    proposals.push({
      lineId: line.id,
      date: line.txnDate,
      description: line.description,
      memo: line.memo,
      amount: line.amount,
      checkNumber: line.checkNumber,
      action: "classify",
      suggestion: items.length
        ? `Amazon order for ${Math.abs(line.amount).toFixed(2)}: ${names}. ${account ? `Use ${account.full}.` : "Choose the account for these items."}`
        : learned
          ? `This payee was classified to ${learned.accountName} before. Use that account again.`
          : account
            ? `Classify this ${line.amount < 0 ? "withdrawal" : "deposit"} to ${account.full}.`
            : "Choose the account for this line. The choice is remembered for the next time this payee or product appears.",
      accountId: account?.id || "",
      accountName: account?.full || "",
      bookId: "",
      bookDoc: "",
      bookAmount: null,
      correction: 0,
      items,
    });
  }

  const first = lines[0];
  const last = lines[lines.length - 1];
  const opening = first?.balance == null ? null : money(first.balance - first.amount);
  const closing = last?.balance ?? null;
  return {
    statement: {
      id: statement.id,
      accountId: statement.account_id,
      accountName: statement.account_name,
      accountType: statement.account_type,
      filename: statement.filename,
      from: statement.period_start,
      through: statement.period_end,
    },
    month,
    opening,
    closing,
    deposits: money(lines.filter((line) => line.amount > 0).reduce((sum, line) => sum + line.amount, 0)),
    withdrawals: money(lines.filter((line) => line.amount < 0).reduce((sum, line) => sum + Math.abs(line.amount), 0)),
    cleared: decided.size,
    open: proposals.length,
    exact: proposals.filter((item) => item.action === "match").length,
    corrections: proposals.filter((item) => item.action === "correct-fee" || item.action === "correct-cash").length,
    proposals,
    memory: rules.slice(0, 12),
  };
}

async function loadJournal(id: string) {
  const page = await queryQuickBooks(`SELECT * FROM JournalEntry WHERE Id = '${id.replace(/'/g, "")}'`);
  const journal = page.data?.QueryResponse?.JournalEntry?.[0] as {
    Id: string;
    SyncToken?: string;
    TxnDate?: string;
    DocNumber?: string;
    PrivateNote?: string;
    Line?: { Id?: string; Amount?: number; Description?: string; JournalEntryLineDetail?: { PostingType?: string; AccountRef?: { value?: string }; ClassRef?: { value?: string } } }[];
  } | undefined;
  if (!journal?.Id) throw new Error("The daily sales journal could not be read.");
  return journal;
}

async function moveJournalDifference(journalId: string, accountId: string, offsetAccountId: string, bankAmount: number, note: string) {
  const journal = await loadJournal(journalId);
  const lines = (journal.Line || []).map((line) => ({
    id: line.Id,
    amount: money(Number(line.Amount || 0)),
    description: line.Description || "",
    posting: line.JournalEntryLineDetail?.PostingType || "",
    accountId: line.JournalEntryLineDetail?.AccountRef?.value || "",
    classId: line.JournalEntryLineDetail?.ClassRef?.value || "",
  })).filter((line) => line.amount > 0 && line.posting && line.accountId);
  const bankLines = lines.filter((line) => line.accountId === accountId && line.posting === "Debit");
  const bankLine = bankLines.sort((left, right) => Math.abs(left.amount - bankAmount) - Math.abs(right.amount - bankAmount))[0];
  if (!bankLine) throw new Error("That journal has no debit to this account to change.");
  const delta = money(bankLine.amount - bankAmount);
  if (Math.abs(delta) < 0.01) return journal.DocNumber || journal.Id;
  if (bankAmount <= 0) throw new Error("The bank amount has to stay above zero.");
  bankLine.amount = money(bankAmount);
  const offset = lines.find((line) => line.accountId === offsetAccountId && line.posting === (delta > 0 ? "Debit" : "Credit"));
  if (offset) offset.amount = money(offset.amount + Math.abs(delta));
  else lines.push({ id: undefined, amount: money(Math.abs(delta)), description: delta > 0 ? "Toast credit card fee" : "Deposit correction", posting: delta > 0 ? "Debit" : "Credit", accountId: offsetAccountId, classId: bankLine.classId });
  const debit = lines.filter((line) => line.posting === "Debit").reduce((sum, line) => sum + cents(line.amount), 0);
  const credit = lines.filter((line) => line.posting === "Credit").reduce((sum, line) => sum + cents(line.amount), 0);
  if (debit !== credit) throw new Error(`The corrected journal would be out of balance by ${money(Math.abs(debit - credit) / 100).toFixed(2)}.`);
  await postQuickBooks("/journalentry", {
    Id: journal.Id,
    SyncToken: journal.SyncToken,
    TxnDate: journal.TxnDate,
    DocNumber: journal.DocNumber,
    PrivateNote: `${journal.PrivateNote || ""} ${note}`.trim().slice(0, 4000),
    Line: lines.map((line) => ({
      ...(line.id ? { Id: line.id } : {}),
      Amount: line.amount,
      Description: line.description,
      DetailType: "JournalEntryLineDetail",
      JournalEntryLineDetail: {
        PostingType: line.posting,
        AccountRef: { value: line.accountId },
        ...(line.classId ? { ClassRef: { value: line.classId } } : {}),
      },
    })),
  });
  bookCache.clear();
  return journal.DocNumber || journal.Id;
}

async function postClassifyJournal(accountId: string, offsetAccountId: string, txnDate: string, amount: number, description: string) {
  const doc = `RCN-${txnDate.replace(/-/g, "")}-${randomUUID().slice(0, 4)}`.slice(0, 21);
  const abs = money(Math.abs(amount));
  const bankDebit = amount > 0;
  await postQuickBooks("/journalentry", {
    TxnDate: txnDate,
    DocNumber: doc,
    PrivateNote: description.slice(0, 4000),
    Line: [
      {
        Amount: abs,
        Description: description.slice(0, 400),
        DetailType: "JournalEntryLineDetail",
        JournalEntryLineDetail: { PostingType: bankDebit ? "Debit" : "Credit", AccountRef: { value: accountId } },
      },
      {
        Amount: abs,
        Description: description.slice(0, 400),
        DetailType: "JournalEntryLineDetail",
        JournalEntryLineDetail: { PostingType: bankDebit ? "Credit" : "Debit", AccountRef: { value: offsetAccountId } },
      },
    ],
  });
  bookCache.clear();
  return doc;
}

async function saveDecision(lineId: string, action: string, accountId: string, accountName: string, amount: number, bookId: string, bookDoc: string, note: string) {
  await db.execute(sql`
    INSERT INTO accounting_reconcile_decisions (id, line_id, action, account_id, account_name, amount, book_id, book_doc, note)
    VALUES (${randomUUID()}, ${lineId}, ${action}, ${accountId}, ${accountName}, ${amount}, ${bookId}, ${bookDoc}, ${note.slice(0, 500)})
  `);
}

export async function acceptLine(body: { lineId?: string; action?: string; accountId?: string; amount?: number; bookId?: string; bookDoc?: string }) {
  await ensureTables();
  const lineId = String(body.lineId || "");
  const action = String(body.action || "");
  const lineResult = await db.execute(sql`
    SELECT l.id, l.txn_date, l.description, l.memo, l.amount, l.statement_id, s.account_id
    FROM accounting_reconcile_lines l
    JOIN accounting_reconcile_statements s ON s.id = l.statement_id
    WHERE l.id = ${lineId}
    LIMIT 1
  `);
  const line = lineResult.rows[0] as { id: string; txn_date: string; description: string; memo: string; amount: string; account_id: string } | undefined;
  if (!line) throw new Error("That statement line was not found.");
  const existing = await db.execute(sql`SELECT id FROM accounting_reconcile_decisions WHERE line_id = ${lineId} LIMIT 1`);
  if (existing.rows.length) throw new Error("This line is already cleared.");
  const statementAmount = Number(line.amount);
  const accounts = await chart();
  const account = accounts.find((item) => item.id === String(body.accountId || ""));

  if (action === "match") {
    const doc = String(body.bookDoc || "");
    if (!doc) throw new Error("There is no book entry to match.");
    await saveDecision(lineId, action, "", "", statementAmount, String(body.bookId || ""), doc, `Matched to ${doc}.`);
    return { note: `Matched to ${doc}.` };
  }

  if (action === "correct-fee" || action === "correct-cash") {
    const journalId = String(body.bookId || "");
    const correction = money(Number(body.amount));
    if (!journalId) throw new Error("The daily sales journal was not found.");
    if (!account) throw new Error("Choose the account for the difference.");
    if (!Number.isFinite(correction) || Math.abs(correction) < 0.01 || Math.abs(correction) > Math.max(50, Math.abs(statementAmount) * 0.1)) {
      throw new Error("The correction is too far from the difference between the statement and the daily sales journal.");
    }
    const journal = await loadJournal(journalId);
    const bankLine = (journal.Line || []).find((item) => item.JournalEntryLineDetail?.AccountRef?.value === line.account_id && item.JournalEntryLineDetail?.PostingType === "Debit");
    const current = Number(bankLine?.Amount || 0);
    const target = money(current - correction);
    const note = `Statement ${statementAmount.toFixed(2)} on ${line.txn_date}. ${Math.abs(correction).toFixed(2)} moved to ${account.full}.`;
    const doc = await moveJournalDifference(journalId, line.account_id, account.id, target, note);
    await saveDecision(lineId, action, account.id, account.full, correction, journalId, doc, note);
    return { note: `${doc} now shows ${target.toFixed(2)} on this account.` };
  }

  if (action === "classify") {
    if (!account) throw new Error("Choose an account.");
    if (Math.abs(cents(Number(body.amount)) - cents(statementAmount)) > 5) throw new Error("The amount has to stay the statement amount.");
    const description = `${line.description} ${line.memo}`.trim();
    const doc = await postClassifyJournal(line.account_id, account.id, line.txn_date, statementAmount, description);
    await remember("vendor", payeePattern(line.description, line.memo), account.id, account.full);
    if (/amazon|amzn/i.test(description)) {
      const from = shiftIso(line.txn_date, -8);
      const to = shiftIso(line.txn_date, 8);
      const amazonResult = await db.execute(sql`SELECT order_id, title, amount FROM accounting_amazon_items WHERE order_date >= ${from} AND order_date <= ${to}`);
      const grouped = new Map<string, { total: number; titles: string[] }>();
      for (const item of amazonResult.rows as { order_id: string; title: string; amount: string }[]) {
        const order = grouped.get(item.order_id) || { total: 0, titles: [] };
        order.total = money(order.total + Number(item.amount));
        order.titles.push(item.title);
        grouped.set(item.order_id, order);
      }
      const found = Array.from(grouped.values()).find((order) => Math.abs(order.total - Math.abs(statementAmount)) <= 0.5);
      for (const title of found?.titles || []) await remember("product", productPattern(title), account.id, account.full);
    }
    await saveDecision(lineId, action, account.id, account.full, statementAmount, "", doc, `Classified to ${account.full}.`);
    return { note: `Posted ${doc} to ${account.full}.` };
  }

  throw new Error("Choose a match, a daily sales correction, or an account.");
}

export async function acceptExact(statementId: string, month: string) {
  const review = await reviewStatement(statementId, month);
  const exact = review.proposals.filter((item) => item.action === "match");
  const notes: string[] = [];
  for (const item of exact) {
    const result = await acceptLine({ lineId: item.lineId, action: "match", bookId: item.bookId, bookDoc: item.bookDoc });
    notes.push(result.note);
  }
  return { accepted: notes.length, notes };
}

export function registerReconcileRoutes(router: Router) {
  const isAdmin = requirePlatformRole(["super_admin"]);

  router.get("/reconcile/accounts", isAdmin, async (_req, res) => {
    try {
      const accounts = await chart();
      const rank = (type: string) => type === "Bank" ? 0 : type === "Credit Card" ? 1 : 2;
      accounts.sort((left, right) => rank(left.type) - rank(right.type) || left.full.localeCompare(right.full));
      res.json({ accounts });
    } catch (error) {
      res.status(500).json({ message: qbFault(error) });
    }
  });

  router.get("/reconcile/statements", isAdmin, async (req, res) => {
    try {
      await ensureTables();
      const accountId = String(req.query.accountId || "");
      const result = await db.execute(sql`
        SELECT id, account_id, account_name, account_type, filename, period_start, period_end, created_at
        FROM accounting_reconcile_statements
        WHERE account_id = ${accountId}
        ORDER BY created_at DESC
        LIMIT 12
      `);
      res.json({ statements: result.rows });
    } catch (error) {
      res.status(500).json({ message: qbFault(error) });
    }
  });

  router.post("/reconcile/statements", isAdmin, csvUpload.single("file"), async (req, res) => {
    try {
      const file = (req as { file?: { buffer: Buffer; originalname?: string } }).file;
      const accountId = String(req.body?.accountId || "");
      if (!file?.buffer) return res.status(400).json({ message: "Upload the bank or card statement." });
      const accounts = await chart();
      const account = accounts.find((item) => item.id === accountId);
      if (!account) return res.status(400).json({ message: "Choose an account." });
      const lines = parseStatement(file.buffer, account.type);
      await ensureTables();
      const id = randomUUID();
      const start = lines[0].txnDate;
      const end = lines[lines.length - 1].txnDate;
      await db.execute(sql`
        INSERT INTO accounting_reconcile_statements (id, account_id, account_name, account_type, filename, period_start, period_end)
        VALUES (${id}, ${account.id}, ${account.full}, ${account.type}, ${(file.originalname || "statement").slice(0, 180)}, ${start}, ${end})
      `);
      for (let index = 0; index < lines.length; index += 40) {
        const values = sql.join(lines.slice(index, index + 40).map((line) => sql`(${line.id}, ${id}, ${line.seq}, ${line.txnDate}, ${line.description}, ${line.memo}, ${line.amount}, ${line.checkNumber}, ${line.balance}, ${line.txnDate.slice(0, 7)})`), sql`, `);
        await db.execute(sql`
          INSERT INTO accounting_reconcile_lines (id, statement_id, seq, txn_date, description, memo, amount, check_number, balance, month)
          VALUES ${values}
        `);
      }
      const months = Array.from(new Set(lines.map((line) => line.txnDate.slice(0, 7))));
      res.json({ id, accountName: account.full, from: start, through: end, count: lines.length, months });
    } catch (error) {
      res.status(400).json({ message: qbFault(error) });
    }
  });

  router.post("/reconcile/amazon", isAdmin, csvUpload.single("file"), async (req, res) => {
    try {
      const file = (req as { file?: { buffer: Buffer } }).file;
      if (!file?.buffer) return res.status(400).json({ message: "Upload the Amazon order history." });
      const items = parseAmazon(file.buffer);
      await ensureTables();
      for (const orderId of Array.from(new Set(items.map((item) => item.orderId)))) {
        await db.execute(sql`DELETE FROM accounting_amazon_items WHERE order_id = ${orderId}`);
      }
      for (let index = 0; index < items.length; index += 40) {
        const values = sql.join(items.slice(index, index + 40).map((item) => sql`(${randomUUID()}, ${item.orderId}, ${item.orderDate}, ${item.title}, ${item.amount})`), sql`, `);
        await db.execute(sql`
          INSERT INTO accounting_amazon_items (id, order_id, order_date, title, amount)
          VALUES ${values}
        `);
      }
      const count = await db.execute(sql`SELECT COUNT(*)::int AS items, COUNT(DISTINCT order_id)::int AS orders FROM accounting_amazon_items`);
      res.json({ added: items.length, ...(count.rows[0] as { items: number; orders: number }) });
    } catch (error) {
      res.status(400).json({ message: qbFault(error) });
    }
  });

  router.get("/reconcile/amazon", isAdmin, async (_req, res) => {
    try {
      await ensureTables();
      const count = await db.execute(sql`SELECT COUNT(*)::int AS items, COUNT(DISTINCT order_id)::int AS orders FROM accounting_amazon_items`);
      const rules = await memoryRules();
      res.json({ ...(count.rows[0] as { items: number; orders: number }), memory: rules.slice(0, 12) });
    } catch (error) {
      res.status(500).json({ message: qbFault(error) });
    }
  });

  router.get("/reconcile", isAdmin, async (req, res) => {
    try {
      res.json(await reviewStatement(String(req.query.statementId || ""), String(req.query.month || "")));
    } catch (error) {
      res.status(400).json({ message: qbFault(error) });
    }
  });

  router.post("/reconcile/accept", isAdmin, async (req, res) => {
    try {
      res.json(await acceptLine(req.body || {}));
    } catch (error) {
      res.status(400).json({ message: qbFault(error) });
    }
  });

  router.post("/reconcile/accept-matches", isAdmin, async (req, res) => {
    try {
      res.json(await acceptExact(String(req.body?.statementId || ""), String(req.body?.month || "")));
    } catch (error) {
      res.status(400).json({ message: qbFault(error) });
    }
  });
}
