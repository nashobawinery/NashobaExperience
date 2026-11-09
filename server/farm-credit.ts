import { randomUUID } from "crypto";
import { Router } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { queryQuickBooks } from "./quickbooks-routes";
import { requirePlatformRole } from "./platformAuth";

type LoanLine = {
  id: string;
  accountNumber: string;
  txnDate: string;
  description: string;
  txnType: string;
  amount: number;
  principal: number;
  interest: number;
  balance: number;
  bookDate: string;
  bookId: string;
  bookPrincipal: number | null;
  bookInterest: number | null;
  status: string;
  note: string;
};

type LoanDef = { accountNumber: string; qbId: string; name: string };

const LOANS: LoanDef[] = [
  { accountNumber: "4055101102", qbId: "701", name: "Construction loan, cave and bathrooms" },
  { accountNumber: "7563612102", qbId: "140", name: "Equipment line" },
  { accountNumber: "7563612101", qbId: "131", name: "Operating line" },
];

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

function round(value: number) {
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

function numberOf(value: string) {
  const text = value.replace(/[$,]/g, "").trim();
  if (!text) return 0;
  const negative = text.startsWith("-") || /^\(.*\)$/.test(text);
  const amount = Math.abs(Number(text.replace(/[()]/g, "")));
  if (!Number.isFinite(amount)) return 0;
  return negative ? -round(amount) : round(amount);
}

function isoDate(value: string) {
  const text = value.trim();
  const us = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? iso[0] : "";
}

export function parseLoanHistory(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" }) as unknown[][];
  const headerAt = grid.findIndex((row) => row.some((cell) => String(cell).trim().toLowerCase() === "principal"));
  if (headerAt < 0) throw new Error("The file needs the Farm Credit columns, including Principal and Balance.");
  const headers = grid[headerAt].map((cell) => String(cell).trim().toLowerCase());
  const at = (name: string) => headers.findIndex((header) => header === name);
  const dateAt = at("date");
  const accountAt = at("account number");
  const descriptionAt = at("statement description");
  const typeAt = at("transaction type");
  const amountAt = at("transaction amount");
  const principalAt = at("principal");
  const interestAt = at("interest");
  const balanceAt = at("balance");
  if (dateAt < 0 || principalAt < 0 || balanceAt < 0) throw new Error("The file needs a date, principal, and balance.");
  const lines: LoanLine[] = [];
  let accountNumber = "";
  for (const row of grid.slice(headerAt + 1)) {
    const txnDate = isoDate(String(row[dateAt] || ""));
    if (!txnDate) continue;
    accountNumber = String(row[accountAt] || accountNumber).replace(/\D/g, "") || accountNumber;
    lines.push({
      id: randomUUID(),
      accountNumber,
      txnDate,
      description: String(row[descriptionAt] || "").slice(0, 240),
      txnType: String(row[typeAt] || "").slice(0, 80),
      amount: numberOf(String(row[amountAt] || "")),
      principal: numberOf(String(row[principalAt] || "")),
      interest: numberOf(String(row[interestAt] || "")),
      balance: numberOf(String(row[balanceAt] || "")),
      bookDate: "",
      bookId: "",
      bookPrincipal: null,
      bookInterest: null,
      status: "unchecked",
      note: "",
    });
  }
  if (!accountNumber || !lines.length) throw new Error("No loan transactions were found in that file.");
  if (!LOANS.some((loan) => loan.accountNumber === accountNumber)) {
    throw new Error(`Account ${accountNumber} is not one of the three Farm Credit loans on this page.`);
  }
  return { accountNumber, lines };
}

async function ensureTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS accounting_loan_lines (
      id varchar PRIMARY KEY,
      account_number varchar NOT NULL,
      txn_date varchar NOT NULL,
      description varchar NOT NULL,
      txn_type varchar NOT NULL,
      amount numeric NOT NULL,
      principal numeric NOT NULL,
      interest numeric NOT NULL,
      balance numeric NOT NULL,
      book_date varchar NOT NULL DEFAULT '',
      book_id varchar NOT NULL DEFAULT '',
      book_principal numeric,
      book_interest numeric,
      status varchar NOT NULL,
      note varchar NOT NULL DEFAULT ''
    )
  `);
}

async function queryRows<T>(entity: string, where: string) {
  const rows: T[] = [];
  for (let start = 1; start <= 4000; start += 500) {
    const page = await queryQuickBooks(`SELECT * FROM ${entity} WHERE ${where} STARTPOSITION ${start} MAXRESULTS 500`);
    const batch = (page.data?.QueryResponse?.[entity] ?? []) as T[];
    rows.push(...batch);
    if (batch.length < 500) break;
  }
  return rows;
}

type BookTxn = { id: string; date: string; total: number; principal: number; interest: number; kind: string };

async function bookActivity(from: string, to: string) {
  const byLoan = new Map<string, BookTxn[]>(LOANS.map((loan) => [loan.qbId, []]));
  let cursor = `${from.slice(0, 7)}-01`;
  const endMonth = to.slice(0, 7);
  while (cursor.slice(0, 7) <= endMonth) {
    const [year, month] = cursor.slice(0, 7).split("-").map(Number);
    const next = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
    const where = `TxnDate >= '${cursor}' AND TxnDate < '${next}'`;
    const purchases = await queryRows<{
      Id: string; TxnDate?: string; TotalAmt?: number; EntityRef?: { name?: string };
      Line?: { Amount?: number; AccountBasedExpenseLineDetail?: { AccountRef?: { value?: string; name?: string } } }[];
    }>("Purchase", where);
    for (const purchase of purchases) {
      const lines = purchase.Line ?? [];
      const farmCredit = /pioneer|farm credit/i.test(purchase.EntityRef?.name || "");
      const interest = round(lines.filter((line) => /interest/i.test(line.AccountBasedExpenseLineDetail?.AccountRef?.name || "")).reduce((sum, line) => sum + Number(line.Amount || 0), 0));
      for (const loan of LOANS) {
        const principal = round(lines.filter((line) => line.AccountBasedExpenseLineDetail?.AccountRef?.value === loan.qbId).reduce((sum, line) => sum + Number(line.Amount || 0), 0));
        if (!principal && !(farmCredit && interest)) continue;
        if (!principal && !farmCredit) continue;
        byLoan.get(loan.qbId)?.push({ id: purchase.Id, date: String(purchase.TxnDate), total: round(Number(purchase.TotalAmt || 0)), principal, interest, kind: "Purchase" });
      }
    }
    const deposits = await queryRows<{
      Id: string; TxnDate?: string; TotalAmt?: number;
      Line?: { Amount?: number; DepositLineDetail?: { AccountRef?: { value?: string } } }[];
    }>("Deposit", where);
    for (const deposit of deposits) {
      for (const loan of LOANS) {
        const drawn = (deposit.Line ?? []).filter((line) => line.DepositLineDetail?.AccountRef?.value === loan.qbId).reduce((sum, line) => sum + Number(line.Amount || 0), 0);
        if (!drawn) continue;
        byLoan.get(loan.qbId)?.push({ id: deposit.Id, date: String(deposit.TxnDate), total: round(drawn), principal: round(-drawn), interest: 0, kind: "Deposit" });
      }
    }
    const journals = await queryRows<{
      Id: string; TxnDate?: string;
      Line?: { Amount?: number; JournalEntryLineDetail?: { PostingType?: string; AccountRef?: { value?: string; name?: string } } }[];
    }>("JournalEntry", where);
    for (const journal of journals) {
      for (const loan of LOANS) {
        let principal = 0;
        for (const line of journal.Line ?? []) {
          const amount = Number(line.Amount || 0);
          const posting = line.JournalEntryLineDetail?.PostingType;
          if (line.JournalEntryLineDetail?.AccountRef?.value === loan.qbId) principal += posting === "Debit" ? amount : -amount;
        }
        if (!principal) continue;
        let interest = 0;
        for (const line of journal.Line ?? []) {
          const amount = Number(line.Amount || 0);
          const posting = line.JournalEntryLineDetail?.PostingType;
          if (/interest/i.test(line.JournalEntryLineDetail?.AccountRef?.name || "")) interest += posting === "Debit" ? amount : -amount;
        }
        byLoan.get(loan.qbId)?.push({ id: journal.Id, date: String(journal.TxnDate), total: round(Math.abs(principal)), principal: round(principal), interest: round(interest), kind: "Journal" });
      }
    }
    cursor = next;
  }
  return byLoan;
}

function near(left: string, right: string) {
  return Math.abs(Date.parse(`${left}T00:00:00Z`) - Date.parse(`${right}T00:00:00Z`)) <= 31 * 86400000;
}

function classify(line: LoanLine, txns: BookTxn[]) {
  if (/accrual/i.test(line.txnType)) {
    return { ...line, status: "accrual", note: "Farm Credit accrued interest. This is not a bank withdrawal." };
  }
  const draw = line.principal > 0;
  const wanted = Math.abs(line.principal);
  const wantedInterest = Math.abs(line.interest);
  const candidates = txns.filter((txn) => near(txn.date, line.txnDate) && (cents(txn.total) === cents(Math.abs(line.amount)) || (wanted && cents(Math.abs(txn.principal)) === cents(wanted))));
  const txn = candidates.sort((a, b) => Math.abs(Date.parse(`${a.date}T00:00:00Z`) - Date.parse(`${line.txnDate}T00:00:00Z`)) - Math.abs(Date.parse(`${b.date}T00:00:00Z`) - Date.parse(`${line.txnDate}T00:00:00Z`)))[0];
  if (!txn) {
    return {
      ...line,
      status: draw ? "draw" : "missing",
      note: draw
        ? `Farm Credit advanced ${wanted.toFixed(2)}. No matching deposit was found in QuickBooks around this date.`
        : `Farm Credit took ${Math.abs(line.amount).toFixed(2)}. Record ${wanted.toFixed(2)} as principal on the loan and ${wantedInterest.toFixed(2)} as interest.`,
    };
  }
  const principalGap = round(Math.abs(txn.principal) - wanted);
  const interestGap = round(txn.interest - wantedInterest);
  const same = Math.abs(cents(Math.abs(txn.principal)) - cents(wanted)) <= 2 && Math.abs(cents(txn.interest) - cents(wantedInterest)) <= 2;
  const status = same ? "matched" : "difference";
  const note = same
    ? "The bank withdrawal and the principal and interest split match Farm Credit."
    : `QuickBooks has principal ${Math.abs(txn.principal).toFixed(2)} and interest ${txn.interest.toFixed(2)}. Farm Credit has principal ${wanted.toFixed(2)} and interest ${wantedInterest.toFixed(2)}.`;
  return {
    ...line,
    bookDate: txn.date,
    bookId: txn.id,
    bookPrincipal: txn.principal,
    bookInterest: txn.interest,
    status,
    note: principalGap || interestGap ? note : "The bank withdrawal and the principal and interest split match Farm Credit.",
  };
}

export async function saveLoanHistory(accountNumber: string, lines: LoanLine[]) {
  await ensureTables();
  await db.execute(sql`DELETE FROM accounting_loan_lines WHERE account_number = ${accountNumber}`);
  for (const line of lines) {
    await db.execute(sql`
      INSERT INTO accounting_loan_lines (
        id, account_number, txn_date, description, txn_type, amount, principal, interest, balance, status, note
      ) VALUES (
        ${line.id}, ${accountNumber}, ${line.txnDate}, ${line.description}, ${line.txnType},
        ${line.amount}, ${line.principal}, ${line.interest}, ${line.balance}, 'unchecked', ''
      )
    `);
  }
}

export async function refreshLoanBooks() {
  await ensureTables();
  const stored = await db.execute(sql`SELECT * FROM accounting_loan_lines ORDER BY account_number, txn_date`);
  const rows = stored.rows as Record<string, unknown>[];
  const dates = rows.map(toLine).map((line) => line.txnDate).sort();
  const activity = dates.length ? await bookActivity(dates[0], dates[dates.length - 1]) : new Map<string, BookTxn[]>();
  for (const loan of LOANS) {
    const lines = rows.filter((row) => row.account_number === loan.accountNumber).map(toLine);
    if (!lines.length) continue;
    const txns = activity.get(loan.qbId) ?? [];
    for (const line of lines) {
      const checked = classify(line, txns);
      await db.execute(sql`
        UPDATE accounting_loan_lines
        SET book_date = ${checked.bookDate}, book_id = ${checked.bookId},
            book_principal = ${checked.bookPrincipal}, book_interest = ${checked.bookInterest},
            status = ${checked.status}, note = ${checked.note}
        WHERE id = ${line.id}
      `);
    }
  }
}

function toLine(row: Record<string, unknown>): LoanLine {
  return {
    id: String(row.id),
    accountNumber: String(row.account_number),
    txnDate: String(row.txn_date),
    description: String(row.description),
    txnType: String(row.txn_type),
    amount: Number(row.amount),
    principal: Number(row.principal),
    interest: Number(row.interest),
    balance: Number(row.balance),
    bookDate: String(row.book_date || ""),
    bookId: String(row.book_id || ""),
    bookPrincipal: row.book_principal == null ? null : Number(row.book_principal),
    bookInterest: row.book_interest == null ? null : Number(row.book_interest),
    status: String(row.status),
    note: String(row.note || ""),
  };
}

function yearTotals(lines: LoanLine[], year: string) {
  const chosen = lines.filter((line) => line.txnDate.startsWith(year) && !/accrual/i.test(line.txnType));
  const principalPaid = round(chosen.filter((line) => line.principal < 0).reduce((sum, line) => sum + Math.abs(line.principal), 0));
  const interestPaid = round(chosen.filter((line) => line.interest < 0).reduce((sum, line) => sum + Math.abs(line.interest), 0));
  const draws = round(chosen.filter((line) => line.principal > 0).reduce((sum, line) => sum + line.principal, 0));
  return { principalPaid, interestPaid, draws, netCashIn: round(draws - principalPaid - interestPaid) };
}

async function accountBalances() {
  const rows = await queryRows<{ Id: string; Name: string; FullyQualifiedName?: string; AccountType?: string; AcctNum?: string; CurrentBalance?: number; Active?: boolean }>("Account", "Active IN (true, false)");
  return rows.filter((row) => row.Active !== false);
}

export async function lendingReport() {
  await ensureTables();
  const accounts = await accountBalances();
  const stored = await db.execute(sql`SELECT * FROM accounting_loan_lines ORDER BY txn_date DESC`);
  const lines = (stored.rows as Record<string, unknown>[]).map(toLine);
  const loans = LOANS.map((loan) => {
    const account = accounts.find((row) => row.Id === loan.qbId);
    const history = lines.filter((line) => line.accountNumber === loan.accountNumber);
    const latest = [...history].sort((a, b) => b.txnDate.localeCompare(a.txnDate))[0];
    const books = round(-(account?.CurrentBalance || 0));
    const statement = latest ? round(latest.balance) : null;
    return {
      ...loan,
      qbName: account?.FullyQualifiedName || loan.name,
      books,
      statement,
      difference: statement == null ? null : round(books - statement),
      thisYear: yearTotals(history, "2026"),
      open: history.filter((line) => line.status === "missing" || line.status === "difference" || line.status === "draw").length,
      lines: history,
    };
  });
  const shown = new Set(LOANS.map((loan) => loan.qbId));
  const others = accounts
    .filter((row) => /liability|payable/i.test(row.AccountType || "") && !shown.has(row.Id) && Math.abs(Number(row.CurrentBalance || 0)) >= 1000)
    .map((row) => ({
      id: row.Id,
      name: row.FullyQualifiedName || row.Name,
      type: row.AccountType || "",
      balance: round(Number(row.CurrentBalance || 0)),
    }))
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
  const cash = round(accounts.filter((row) => row.AccountType === "Bank").reduce((sum, row) => sum + Number(row.CurrentBalance || 0), 0));
  return { cash, loans, others };
}

export function registerFarmCreditRoutes(router: Router) {
  const isAdmin = requirePlatformRole(["super_admin"]);

  router.get("/lending", isAdmin, async (_req, res) => {
    try {
      res.json(await lendingReport());
    } catch (error) {
      res.status(500).json({ message: qbFault(error) });
    }
  });

  router.post("/lending/statements", isAdmin, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "Choose the Farm Credit account history file." });
      const parsed = parseLoanHistory(req.file.buffer);
      await saveLoanHistory(parsed.accountNumber, parsed.lines);
      res.json({ accountNumber: parsed.accountNumber, count: parsed.lines.length });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "The file could not be read." });
    }
  });

  router.post("/lending/refresh", isAdmin, async (_req, res) => {
    try {
      await refreshLoanBooks();
      res.json(await lendingReport());
    } catch (error) {
      res.status(500).json({ message: qbFault(error) });
    }
  });
}
