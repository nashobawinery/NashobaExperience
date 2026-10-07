import { createRequire } from "module";
import { randomUUID } from "crypto";
import { Router, type Request, type Response } from "express";
import multer from "multer";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { postQuickBooks, queryQuickBooks } from "./quickbooks-routes";
import { requirePlatformRole } from "./platformAuth";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx") as {
  read: (data: Buffer, options: { type: "buffer"; cellDates: boolean }) => { SheetNames: string[]; Sheets: Record<string, unknown> };
  utils: { sheet_to_json: (sheet: unknown, options: { header: 1; raw: boolean; defval: string }) => unknown[][] };
};

const VENDOR_ID = "614";
const BANK_ID = "475";
const AP_ID = "434";
const OPEN_YEAR = "2026-01-01";
const isAdmin = requirePlatformRole(["super_admin"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

type Bill = { id: string; doc: string; date: string; due: string; balance: number };
type Credit = { id: string; doc: string; date: string; balance: number };
type PurchaseRow = {
  Id: string;
  SyncToken?: string;
  TxnDate: string;
  TotalAmt: string | number;
  AccountRef?: { value?: string; name?: string };
  EntityRef?: { value?: string };
  Line?: { Amount?: number; DetailType?: string; AccountBasedExpenseLineDetail?: { AccountRef?: { value?: string; name?: string } } }[];
};

type Expense = { id: string; date: string; amount: number; accountId: string; accountName: string; bankAccountId: string; mixed: boolean };
type ExpenseStatus = "ready" | "ambiguous" | "unmatched" | "corrected" | "posted-to-payable" | "mixed";

type ExpenseReview = Expense & {
  status: ExpenseStatus;
  bills: { id: string; doc: string }[];
  note: string;
};

type DraftLine = { doc: string; amount: number };
type DraftPreview = {
  date: string;
  reference: string;
  net: number;
  status: "ready-offset" | "ready-payment" | "already-paid" | "missing-bill" | "amount-differs" | "prior-year" | "needs-review";
  note: string;
  lines: DraftLine[];
};

const pendingFiles = new Map<string, { buffer: Buffer; expires: number }>();
let running = false;
let tablesReady = false;

function cents(value: number) {
  return Math.round(Number(value) * 100);
}

function money(centsValue: number) {
  return centsValue / 100;
}

function qbFault(error: unknown) {
  const err = error as { response?: { data?: { Fault?: { Error?: { Detail?: string; Message?: string }[] } } }; message?: string };
  const item = err.response?.data?.Fault?.Error?.[0];
  return item?.Detail || item?.Message || err.message || "QuickBooks request failed";
}

function daysBetween(left: string, right: string) {
  const ms = Date.parse(`${left}T00:00:00Z`) - Date.parse(`${right}T00:00:00Z`);
  return Math.round(ms / 86400000);
}

function normalizeDoc(value: string) {
  const digits = String(value || "").replace(/\D/g, "").replace(/^0+/, "");
  return digits || "0";
}

function isoDaysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function expenseAccount(purchase: PurchaseRow) {
  const accounts = new Map<string, { id: string; name: string }>();
  for (const line of purchase.Line ?? []) {
    const account = line.AccountBasedExpenseLineDetail?.AccountRef;
    if (line.DetailType !== "AccountBasedExpenseLineDetail" || !account?.value || !Number(line.Amount)) continue;
    accounts.set(account.value, { id: account.value, name: account.name || account.value });
  }
  if (accounts.size !== 1) return { accountId: "", accountName: "", mixed: accounts.size > 1 };
  const account = accounts.values().next().value;
  if (!account) return { accountId: "", accountName: "", mixed: false };
  return { accountId: account.id, accountName: account.name, mixed: false };
}

async function ensureTables() {
  if (tablesReady) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS accounting_us_foods_actions (
      id varchar PRIMARY KEY,
      purchase_id varchar,
      draft_key varchar,
      action varchar NOT NULL,
      note text,
      amount numeric,
      created_at timestamp NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS accounting_us_foods_purchase_idx ON accounting_us_foods_actions (purchase_id);
    CREATE UNIQUE INDEX IF NOT EXISTS accounting_us_foods_draft_idx ON accounting_us_foods_actions (draft_key);
  `);
  tablesReady = true;
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

async function handledPurchaseIds() {
  await ensureTables();
  const result = await db.execute(sql`SELECT purchase_id FROM accounting_us_foods_actions WHERE purchase_id IS NOT NULL`);
  return new Set((result.rows as { purchase_id: string }[]).map((row) => row.purchase_id));
}

async function recentActions() {
  await ensureTables();
  const result = await db.execute(sql`
    SELECT action, note, amount, created_at
    FROM accounting_us_foods_actions
    ORDER BY created_at DESC
    LIMIT 20
  `);
  return (result.rows as { action: string; note: string | null; amount: string | null; created_at: string }[]).map((row) => ({
    action: row.action,
    note: row.note,
    amount: row.amount == null ? null : Number(row.amount),
    createdAt: row.created_at,
  }));
}

async function loadBooks() {
  const since = isoDaysAgo(45);
  const [vendorRows, billRows, creditRows, purchaseRows, handled] = await Promise.all([
    queryRows<{ Id: string; Balance: number; DisplayName: string }>("Vendor", `Id = '${VENDOR_ID}'`),
    queryRows<{ Id: string; DocNumber?: string; TxnDate: string; DueDate?: string; Balance: string | number }>("Bill", `VendorRef = '${VENDOR_ID}' AND Balance > '0'`),
    queryRows<{ Id: string; DocNumber?: string; TxnDate: string; Balance?: string | number }>("VendorCredit", `VendorRef = '${VENDOR_ID}' AND TxnDate >= '${OPEN_YEAR}'`),
    queryRows<PurchaseRow>("Purchase", `TxnDate >= '${since < OPEN_YEAR ? OPEN_YEAR : since}'`),
    handledPurchaseIds(),
  ]);

  const bills: Bill[] = billRows
    .map((bill) => ({
      id: bill.Id,
      doc: bill.DocNumber || bill.Id,
      date: bill.TxnDate,
      due: bill.DueDate || "",
      balance: Number(bill.Balance),
    }))
    .filter((bill) => bill.date >= OPEN_YEAR && bill.balance > 0)
    .sort((left, right) => left.due.localeCompare(right.due));

  const credits: Credit[] = creditRows
    .map((credit) => ({
      id: credit.Id,
      doc: credit.DocNumber || "",
      date: credit.TxnDate,
      balance: Number(credit.Balance || 0),
    }))
    .filter((credit) => credit.balance > 0);

  const expenses: Expense[] = purchaseRows
    .filter((purchase) => String(purchase.EntityRef?.value || "") === VENDOR_ID && Number(purchase.TotalAmt) > 0 && purchase.TxnDate >= OPEN_YEAR)
    .map((purchase) => {
      const account = expenseAccount(purchase);
      return {
        id: purchase.Id,
        date: purchase.TxnDate,
        amount: Number(purchase.TotalAmt),
        accountId: account.accountId,
        accountName: account.accountName,
        bankAccountId: purchase.AccountRef?.value || BANK_ID,
        mixed: account.mixed,
      };
    });

  return {
    vendorName: vendorRows[0]?.DisplayName || "US Foods, Inc",
    vendorBalance: Number(vendorRows[0]?.Balance || 0),
    bills,
    credits,
    expenses,
    handled,
  };
}

function dueNear(expense: Expense, bill: Bill) {
  return Boolean(bill.due) && bill.date <= expense.date && Math.abs(daysBetween(expense.date, bill.due)) <= 7 && bill.balance > 0;
}

function invoiceSets(expense: Expense, bills: Bill[]) {
  const candidates = bills.filter((bill) => dueNear(expense, bill)).sort((left, right) => cents(right.balance) - cents(left.balance));
  const target = cents(expense.amount);
  const found: Bill[][] = [];
  const current: Bill[] = [];
  const search = (start: number, remaining: number) => {
    if (found.length > 1) return;
    if (remaining === 0) {
      found.push([...current]);
      return;
    }
    for (let index = start; index < candidates.length; index += 1) {
      const value = cents(candidates[index].balance);
      if (value <= 0 || value > remaining) continue;
      current.push(candidates[index]);
      search(index + 1, remaining - value);
      current.pop();
      if (found.length > 1) return;
    }
  };
  if (candidates.length <= 16) search(0, target);
  return found;
}

function describeInvoices(bills: { doc: string }[]) {
  return bills.map((bill) => bill.doc).join(", ");
}

export function reviewExpenses(expenses: Expense[], bills: Bill[], handled: Set<string>): ExpenseReview[] {
  const available = [...bills];
  const ordered = [...expenses].sort((left, right) => right.amount - left.amount || left.date.localeCompare(right.date));
  const byId = new Map<string, ExpenseReview>();
  for (const expense of ordered) {
    if (handled.has(expense.id)) {
      byId.set(expense.id, { ...expense, status: "corrected", bills: [], note: "This bank draft was already replaced with a bill payment." });
      continue;
    }
    if (expense.mixed || !expense.accountId) {
      byId.set(expense.id, { ...expense, status: "mixed", bills: [], note: "This bank line does not use a single expense account, so it was left alone." });
      continue;
    }
    if (expense.accountId === AP_ID) {
      byId.set(expense.id, { ...expense, status: "posted-to-payable", bills: [], note: "This draft was posted to Accounts Payable. It does not close a specific invoice." });
      continue;
    }
    const sets = invoiceSets(expense, available);
    if (sets.length === 1) {
      const chosen = sets[0];
      chosen.forEach((bill) => {
        const index = available.findIndex((item) => item.id === bill.id);
        if (index >= 0) available.splice(index, 1);
      });
      byId.set(expense.id, {
        ...expense,
        status: "ready",
        bills: chosen.map((bill) => ({ id: bill.id, doc: bill.doc })),
        note: `Pays ${describeInvoices(chosen)}. The expense will be deleted and a bill payment for the same amount will be applied to ${chosen.length === 1 ? "that invoice" : "those invoices"}.`,
      });
      continue;
    }
    if (sets.length > 1) {
      byId.set(expense.id, { ...expense, status: "ambiguous", bills: [], note: "More than one set of open invoices adds up to this draft. Upload the payment file so the right invoices are paid." });
      continue;
    }
    byId.set(expense.id, { ...expense, status: "unmatched", bills: [], note: "No open invoices due that week add up to this draft. Upload the payment file when the invoices are known." });
  }
  return expenses.map((expense) => byId.get(expense.id) || { ...expense, status: "unmatched", bills: [], note: "This draft was not reviewed." });
}

async function recordAction(action: { purchaseId?: string; draftKey?: string; kind: string; note: string; amount: number }) {
  await ensureTables();
  await db.execute(sql`
    INSERT INTO accounting_us_foods_actions (id, purchase_id, draft_key, action, note, amount)
    VALUES (${randomUUID()}, ${action.purchaseId ?? null}, ${action.draftKey ?? null}, ${action.kind}, ${action.note}, ${action.amount})
  `);
}

async function deleteQuickBooks(entity: "purchase" | "billpayment", id: string, syncToken: string) {
  await postQuickBooks(`/${entity}?operation=delete`, { Id: id, SyncToken: syncToken });
}

async function replaceExpenseWithBillPayment(expense: Expense, bills: Bill[], credits: { id: string; amount: number }[] = []): Promise<"deleted" | "kept"> {
  if (expense.date < OPEN_YEAR || bills.some((bill) => bill.date < OPEN_YEAR)) {
    throw new Error("A prior-year US Foods transaction was left unchanged.");
  }
  if (!expense.accountId || expense.accountId === AP_ID || expense.mixed) {
    throw new Error("This bank draft is not an expense that can be replaced.");
  }
  const billed = bills.reduce((sum, bill) => sum + cents(bill.balance), 0);
  const credited = credits.reduce((sum, credit) => sum + cents(credit.amount), 0);
  if (billed - credited !== cents(expense.amount)) throw new Error("The invoices no longer match the bank expense.");
  const names = describeInvoices(bills);
  const created = await postQuickBooks("/billpayment", {
    VendorRef: { value: VENDOR_ID },
    TxnDate: expense.date,
    TotalAmt: expense.amount,
    PayType: "Check",
    DocNumber: `USF-${expense.id}`.slice(0, 21),
    PrivateNote: `Replaces the US Foods expense from ${expense.date}. Pays ${names}.`,
    CheckPayment: { BankAccountRef: { value: expense.bankAccountId || BANK_ID }, PrintStatus: "PrintComplete" },
    Line: [
      ...bills.map((bill) => ({ Amount: bill.balance, LinkedTxn: [{ TxnId: bill.id, TxnType: "Bill" }] })),
      ...credits.map((credit) => ({ Amount: credit.amount, LinkedTxn: [{ TxnId: credit.id, TxnType: "VendorCredit" }] })),
    ],
  });
  const payment = created?.BillPayment as { Id?: string; SyncToken?: string } | undefined;
  if (!payment?.Id || payment.SyncToken == null) throw new Error(`QuickBooks did not return the bill payment for ${names}.`);
  const current = await queryQuickBooks(`SELECT Id, SyncToken FROM Purchase WHERE Id = '${expense.id}'`);
  const purchase = (current.data?.QueryResponse?.Purchase?.[0] || null) as { Id?: string; SyncToken?: string } | null;
  if (!purchase?.Id || purchase.SyncToken == null) {
    await deleteQuickBooks("billpayment", payment.Id, String(payment.SyncToken));
    throw new Error("The expense was no longer available, so the bill payment was removed.");
  }
  try {
    await deleteQuickBooks("purchase", purchase.Id, String(purchase.SyncToken));
  } catch (error) {
    try {
      await deleteQuickBooks("billpayment", payment.Id, String(payment.SyncToken));
    } catch (rollback) {
      throw new Error(`Bill payment ${payment.Id} was created and expense ${expense.id} is still in QuickBooks. ${qbFault(error)} ${qbFault(rollback)}`);
    }
    if (/matched to a transaction that was downloaded/i.test(qbFault(error))) {
      await payMatchedExpense(expense, bills, credits);
      return "kept";
    }
    throw error;
  }
  return "deleted";
}

async function payMatchedExpense(expense: Expense, bills: Bill[], credits: { id: string; amount: number }[]) {
  const offset = await postQuickBooks("/vendorcredit", {
    VendorRef: { value: VENDOR_ID },
    TxnDate: expense.date,
    DocNumber: `BANK-${expense.id}`.slice(0, 21),
    PrivateNote: `QuickBooks would not delete the ${expense.date} US Foods expense because it is matched to a downloaded bank transaction. This reverses ${expense.accountName} so the invoices are paid without a second withdrawal.`,
    Line: [{
      Amount: expense.amount,
      DetailType: "AccountBasedExpenseLineDetail",
      Description: `US Foods ${describeInvoices(bills)}`,
      AccountBasedExpenseLineDetail: { AccountRef: { value: expense.accountId } },
    }],
  });
  const creditId = offset?.VendorCredit?.Id as string | undefined;
  if (!creditId) throw new Error("QuickBooks did not return the credit for the matched expense.");
  await postQuickBooks("/billpayment", {
    VendorRef: { value: VENDOR_ID },
    TxnDate: expense.date,
    TotalAmt: 0,
    PayType: "Check",
    PrivateNote: `Pays ${describeInvoices(bills)}. The bank expense stays because QuickBooks would not delete it. The $0 amount is the application, not a second withdrawal.`,
    CheckPayment: { BankAccountRef: { value: expense.bankAccountId || BANK_ID }, PrintStatus: "PrintComplete" },
    Line: [
      ...bills.map((bill) => ({ Amount: bill.balance, LinkedTxn: [{ TxnId: bill.id, TxnType: "Bill" }] })),
      ...credits.map((credit) => ({ Amount: credit.amount, LinkedTxn: [{ TxnId: credit.id, TxnType: "VendorCredit" }] })),
      { Amount: expense.amount, LinkedTxn: [{ TxnId: creditId, TxnType: "VendorCredit" }] },
    ],
  });
}

export async function reviewUsFoods() {
  const books = await loadBooks();
  const expenses = reviewExpenses(books.expenses, books.bills, books.handled);
  const openBillSum = money(books.bills.reduce((sum, bill) => sum + cents(bill.balance), 0));
  return {
    checkedAt: new Date().toISOString(),
    vendorName: books.vendorName,
    vendorBalance: books.vendorBalance,
    openBillSum,
    inBalance: cents(books.vendorBalance) === cents(openBillSum),
    openBills: books.bills,
    expenses,
    readyCount: expenses.filter((expense) => expense.status === "ready").length,
    recentActions: await recentActions(),
  };
}

export async function applyReadyCorrections() {
  if (running) return { closed: 0, waiting: 0, notes: ["A US Foods check is already running."] };
  running = true;
  const notes: string[] = [];
  let closed = 0;
  try {
    const books = await loadBooks();
    const reviewed = reviewExpenses(books.expenses, books.bills, books.handled);
    const ready = reviewed.filter((expense) => expense.status === "ready");
    const waiting = reviewed.filter((expense) => expense.status === "unmatched" || expense.status === "ambiguous").length;
    for (const expense of ready) {
      const chosen = expense.bills.flatMap((item) => {
        const bill = books.bills.find((candidate) => candidate.id === item.id);
        return bill ? [bill] : [];
      });
      if (chosen.length !== expense.bills.length) {
        notes.push(`The invoices for the ${expense.date} draft changed before they could be paid.`);
        continue;
      }
      try {
        const outcome = await replaceExpenseWithBillPayment(expense, chosen);
        const names = describeInvoices(chosen);
        const note = outcome === "deleted"
          ? `Deleted the ${expense.date} expense of ${expense.amount.toFixed(2)} and paid ${names}.`
          : `QuickBooks would not delete the matched ${expense.date} expense of ${expense.amount.toFixed(2)}. Paid ${names} without a second withdrawal.`;
        await recordAction({
          purchaseId: expense.id,
          kind: "bill-payment",
          note,
          amount: expense.amount,
        });
        closed += 1;
        notes.push(note);
      } catch (error) {
        notes.push(`The ${expense.date} expense was not replaced: ${qbFault(error)}`);
      }
    }
    return { closed, waiting, notes };
  } finally {
    running = false;
  }
}

function headerIndex(headers: string[], labels: string[], reject: string[] = []) {
  for (const label of labels) {
    const index = headers.findIndex((header) => {
      if (reject.some((word) => header.includes(word))) return false;
      return header === label || header.includes(label);
    });
    if (index >= 0) return index;
  }
  return -1;
}

function parseAmount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return money(cents(value));
  if (value instanceof Date || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const paren = trimmed.startsWith("(") && trimmed.endsWith(")");
  const numeric = Number(trimmed.replace(/[()$,\s]/g, ""));
  if (!Number.isFinite(numeric)) return null;
  return money(cents(paren ? -Math.abs(numeric) : numeric));
}

function parseDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${value.getFullYear()}-${month}-${day}`;
  }
  if (typeof value === "number" && value > 20000 && value < 80000) {
    const utc = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
    return utc.toISOString().slice(0, 10);
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  return null;
}

export function parsePaymentActivity(buffer: Buffer): { date: string; reference: string; lines: DraftLine[] }[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
  let headerRow = -1;
  let columns = { date: -1, reference: -1, doc: -1, amount: -1 };
  for (let index = 0; index < Math.min(rows.length, 25); index += 1) {
    const headers = (rows[index] ?? []).map((cell) => String(cell || "").trim().toLowerCase());
    const date = headerIndex(headers, ["payment date", "draft date", "transaction date", "date"], ["invoice", "due", "document"]);
    const reference = headerIndex(headers, ["payment reference", "reference number", "reference", "confirmation", "eft"]);
    const doc = headerIndex(headers, ["invoice number", "invoice #", "document number", "transaction number", "doc number", "invoice"], ["date"]);
    const amount = headerIndex(headers, ["payment amount", "amount paid", "applied amount", "net amount", "amount"]);
    if (date >= 0 && doc >= 0 && amount >= 0) {
      headerRow = index;
      columns = { date, reference, doc, amount };
      break;
    }
  }
  if (headerRow < 0) {
    throw new Error("The payment file needs columns for the payment date, invoice number, and amount.");
  }

  const grouped = new Map<string, { date: string; reference: string; lines: DraftLine[] }>();
  for (const row of rows.slice(headerRow + 1)) {
    const date = parseDate(row[columns.date]);
    const doc = String(row[columns.doc] || "").trim();
    const amount = parseAmount(row[columns.amount]);
    if (!date || !doc || amount == null || amount === 0) continue;
    const reference = columns.reference >= 0 ? String(row[columns.reference] || "").trim() : "";
    const key = `${date}|${reference.toUpperCase()}`;
    const draft = grouped.get(key) ?? { date, reference: reference || date, lines: [] };
    draft.lines.push({ doc, amount });
    grouped.set(key, draft);
  }
  const drafts: { date: string; reference: string; lines: DraftLine[] }[] = [];
  grouped.forEach((draft) => drafts.push(draft));
  return drafts;
}

async function findBill(doc: string, openBills: Bill[]) {
  const key = normalizeDoc(doc);
  const open = openBills.find((bill) => normalizeDoc(bill.doc) === key);
  if (open) return open;
  const digits = doc.replace(/\D/g, "");
  if (!digits) return null;
  const stripped = digits.replace(/^0+/, "");
  const variants = stripped && stripped !== digits ? [digits, stripped] : [digits];
  for (const variant of variants) {
    const result = await queryQuickBooks(`SELECT Id, DocNumber, TxnDate, DueDate, Balance FROM Bill WHERE VendorRef = '${VENDOR_ID}' AND DocNumber = '${variant}'`);
    const bill = result.data?.QueryResponse?.Bill?.[0] as { Id: string; DocNumber?: string; TxnDate: string; DueDate?: string; Balance: string | number } | undefined;
    if (bill) {
      return { id: bill.Id, doc: bill.DocNumber || variant, date: bill.TxnDate, due: bill.DueDate || "", balance: Number(bill.Balance) };
    }
  }
  return null;
}

async function findCredit(doc: string, credits: Credit[]) {
  const key = normalizeDoc(doc);
  return credits.find((credit) => credit.doc && normalizeDoc(credit.doc) === key) ?? null;
}

async function expensesOnDate(date: string) {
  const rows = await queryRows<PurchaseRow>("Purchase", `TxnDate = '${date}'`);
  return rows
    .filter((purchase) => String(purchase.EntityRef?.value || "") === VENDOR_ID && Number(purchase.TotalAmt) > 0)
    .map((purchase) => {
      const account = expenseAccount(purchase);
      return { id: purchase.Id, date: purchase.TxnDate, amount: Number(purchase.TotalAmt), accountId: account.accountId, accountName: account.accountName, bankAccountId: purchase.AccountRef?.value || BANK_ID, mixed: account.mixed };
    });
}

export async function previewDrafts(drafts: { date: string; reference: string; lines: DraftLine[] }[]): Promise<DraftPreview[]> {
  const books = await loadBooks();
  const previews: DraftPreview[] = [];
  for (const draft of drafts) {
    const net = money(draft.lines.reduce((sum, line) => sum + cents(line.amount), 0));
    if (draft.date < OPEN_YEAR) {
      previews.push({ ...draft, net, status: "prior-year", note: "This draft is from 2025 or earlier and was left unchanged." });
      continue;
    }
    const bills: Bill[] = [];
    let missing = false;
    let differs = false;
    let openCount = 0;
    for (const line of draft.lines.filter((item) => item.amount > 0)) {
      const bill = await findBill(line.doc, books.bills);
      if (!bill) {
        missing = true;
        continue;
      }
      bills.push(bill);
      if (cents(bill.balance) === 0) continue;
      openCount += 1;
      if (cents(bill.balance) !== cents(line.amount)) differs = true;
    }
    if (missing) {
      previews.push({ ...draft, net, status: "missing-bill", note: "An invoice on this draft is not in QuickBooks yet." });
      continue;
    }
    if (openCount === 0) {
      previews.push({ ...draft, net, status: "already-paid", note: "These invoices are already closed." });
      continue;
    }
    if (differs) {
      previews.push({ ...draft, net, status: "amount-differs", note: "An open invoice amount does not match the payment file, so this draft was not applied." });
      continue;
    }
    const sameDay = (await expensesOnDate(draft.date)).filter((expense) => cents(expense.amount) === cents(net));
    if (sameDay.length > 1) {
      previews.push({ ...draft, net, status: "needs-review", note: "More than one bank expense matches this draft." });
      continue;
    }
    if (sameDay.length === 1 && (sameDay[0].mixed || sameDay[0].accountId === AP_ID || !sameDay[0].accountId)) {
      previews.push({ ...draft, net, status: "needs-review", note: "The bank expense for this draft is not a single food expense, so it was left alone." });
      continue;
    }
    if (sameDay.length === 1 && books.handled.has(sameDay[0].id)) {
      previews.push({ ...draft, net, status: "already-paid", note: "This bank draft was already applied." });
      continue;
    }
    previews.push({
      ...draft,
      net,
      status: sameDay.length === 1 ? "ready-offset" : "ready-payment",
      note: sameDay.length === 1
        ? "The bank expense will be deleted and a bill payment for the same amount will pay these invoices."
        : "No bank expense was found. A bill payment will be created. Match the later bank line to that payment.",
    });
  }
  return previews;
}

async function applyOffsetDraft(draft: DraftPreview, expense: Expense, books: Awaited<ReturnType<typeof loadBooks>>) {
  const billLines: { id: string; amount: number; doc: string }[] = [];
  for (const line of draft.lines.filter((item) => item.amount > 0)) {
    const bill = await findBill(line.doc, books.bills);
    if (!bill || cents(bill.balance) !== cents(line.amount)) throw new Error(`Invoice ${line.doc} no longer matches the payment file.`);
    billLines.push({ id: bill.id, amount: bill.balance, doc: bill.doc });
  }
  const creditLines: { id: string; amount: number }[] = [];
  for (const line of draft.lines.filter((item) => item.amount < 0)) {
    const existing = await findCredit(line.doc, books.credits);
    const amount = Math.abs(line.amount);
    if (existing && cents(existing.balance) >= cents(amount)) {
      creditLines.push({ id: existing.id, amount });
      continue;
    }
    if (existing) throw new Error(`Credit ${line.doc} is already partly used and does not cover this draft.`);
    const created = await postQuickBooks("/vendorcredit", {
      VendorRef: { value: VENDOR_ID },
      TxnDate: draft.date,
      DocNumber: line.doc.slice(0, 21),
      PrivateNote: `US Foods credit ${line.doc} on draft ${draft.reference}.`,
      Line: [{
        Amount: amount,
        DetailType: "AccountBasedExpenseLineDetail",
        Description: `US Foods credit ${line.doc}`,
        AccountBasedExpenseLineDetail: { AccountRef: { value: expense.accountId } },
      }],
    });
    const id = created?.VendorCredit?.Id as string | undefined;
    if (!id) throw new Error(`QuickBooks did not return credit ${line.doc}.`);
    creditLines.push({ id, amount });
  }
  const covered = creditLines.reduce((sum, line) => sum + cents(line.amount), 0);
  const billed = billLines.reduce((sum, line) => sum + cents(line.amount), 0);
  if (billed - covered !== cents(expense.amount)) {
    throw new Error(`Draft ${draft.reference} does not tie to the bank expense.`);
  }
  await replaceExpenseWithBillPayment(
    expense,
    billLines.map((line) => ({ id: line.id, doc: line.doc, date: draft.date, due: draft.date, balance: line.amount })),
    creditLines,
  );
  await recordAction({
    purchaseId: expense.id,
    draftKey: `${draft.date}|${draft.reference}`,
    kind: "bill-payment",
    note: `Replaced the bank expense with a bill payment for ${billLines.map((line) => line.doc).join(", ")}.`,
    amount: expense.amount,
  });
}

async function applyBankPayment(draft: DraftPreview, books: Awaited<ReturnType<typeof loadBooks>>) {
  const billLines: { id: string; amount: number }[] = [];
  for (const line of draft.lines.filter((item) => item.amount > 0)) {
    const bill = await findBill(line.doc, books.bills);
    if (!bill || cents(bill.balance) !== cents(line.amount)) throw new Error(`Invoice ${line.doc} no longer matches the payment file.`);
    billLines.push({ id: bill.id, amount: bill.balance });
  }
  const creditLines: { id: string; amount: number }[] = [];
  for (const line of draft.lines.filter((item) => item.amount < 0)) {
    const existing = await findCredit(line.doc, books.credits);
    const amount = Math.abs(line.amount);
    if (existing && cents(existing.balance) >= cents(amount)) {
      creditLines.push({ id: existing.id, amount });
      continue;
    }
    if (existing) throw new Error(`Credit ${line.doc} is already partly used and does not cover this draft.`);
    const created = await postQuickBooks("/vendorcredit", {
      VendorRef: { value: VENDOR_ID },
      TxnDate: draft.date,
      DocNumber: line.doc.slice(0, 21),
      PrivateNote: `US Foods credit ${line.doc} on draft ${draft.reference}.`,
      Line: [{
        Amount: amount,
        DetailType: "AccountBasedExpenseLineDetail",
        Description: `US Foods credit ${line.doc}`,
        AccountBasedExpenseLineDetail: { AccountRef: { value: "507" } },
      }],
    });
    const id = created?.VendorCredit?.Id as string | undefined;
    if (!id) throw new Error(`QuickBooks did not return credit ${line.doc}.`);
    creditLines.push({ id, amount });
  }
  await postQuickBooks("/billpayment", {
    VendorRef: { value: VENDOR_ID },
    TxnDate: draft.date,
    TotalAmt: draft.net,
    PayType: "Check",
    PrivateNote: `US Foods draft ${draft.reference}. Match the bank feed to this payment. Do not categorize it as food.`,
    CheckPayment: { BankAccountRef: { value: BANK_ID }, PrintStatus: "PrintComplete" },
    Line: [
      ...billLines.map((line) => ({ Amount: line.amount, LinkedTxn: [{ TxnId: line.id, TxnType: "Bill" }] })),
      ...creditLines.map((line) => ({ Amount: line.amount, LinkedTxn: [{ TxnId: line.id, TxnType: "VendorCredit" }] })),
    ],
  });
  await recordAction({
    draftKey: `${draft.date}|${draft.reference}`,
    kind: "bill-payment",
    note: `Created the bill payment for ${draft.reference}. Match the bank line to it.`,
    amount: draft.net,
  });
}

export async function applyPaymentDrafts(drafts: { date: string; reference: string; lines: DraftLine[] }[]) {
  if (running) return { applied: 0, notes: ["A US Foods check is already running."] };
  running = true;
  const notes: string[] = [];
  let applied = 0;
  try {
    const previews = await previewDrafts(drafts);
    const books = await loadBooks();
    for (const preview of previews) {
      if (preview.status !== "ready-offset" && preview.status !== "ready-payment") {
        notes.push(`${preview.reference}: ${preview.note}`);
        continue;
      }
      try {
        if (preview.date < OPEN_YEAR) throw new Error("A prior-year US Foods transaction was left unchanged.");
        if (preview.status === "ready-offset") {
          const expense = (await expensesOnDate(preview.date)).find((item) => cents(item.amount) === cents(preview.net) && item.accountId && item.accountId !== AP_ID && !item.mixed);
          if (!expense) throw new Error("The bank expense was no longer available.");
          await applyOffsetDraft(preview, expense, books);
        } else {
          await applyBankPayment(preview, books);
        }
        applied += 1;
        notes.push(`${preview.reference}: ${preview.note}`);
      } catch (error) {
        notes.push(`${preview.reference}: ${qbFault(error)}`);
      }
    }
    return { applied, previews, notes };
  } finally {
    running = false;
  }
}

function rememberFile(buffer: Buffer) {
  const now = Date.now();
  const expired: string[] = [];
  pendingFiles.forEach((file, id) => {
    if (file.expires < now) expired.push(id);
  });
  expired.forEach((id) => pendingFiles.delete(id));
  const id = randomUUID();
  pendingFiles.set(id, { buffer, expires: now + 15 * 60 * 1000 });
  return id;
}

export function registerUsFoodsRoutes(router: Router) {
  router.get("/us-foods/review", isAdmin, async (_req, res) => {
    try {
      res.json(await reviewUsFoods());
    } catch (error) {
      res.status(500).json({ message: qbFault(error) });
    }
  });

  router.post("/us-foods/correct", isAdmin, async (_req, res) => {
    try {
      res.json(await applyReadyCorrections());
    } catch (error) {
      res.status(500).json({ message: qbFault(error) });
    }
  });

  router.post("/us-foods/payment-file", isAdmin, (req: Request, res: Response) => {
    upload.single("file")(req, res, async (uploadError: unknown) => {
      if (uploadError) {
        res.status(400).json({ message: "Upload the US Foods payment activity file." });
        return;
      }
      const file = (req as Request & { file?: { buffer: Buffer } }).file;
      if (!file) {
        res.status(400).json({ message: "Choose the payment activity file." });
        return;
      }
      try {
        const drafts = parsePaymentActivity(file.buffer);
        const previews = await previewDrafts(drafts);
        res.json({ uploadId: rememberFile(file.buffer), drafts: previews });
      } catch (error) {
        res.status(400).json({ message: qbFault(error) });
      }
    });
  });

  router.post("/us-foods/payment-file/apply", isAdmin, async (req, res) => {
    try {
      const pending = pendingFiles.get(String(req.body?.uploadId || ""));
      if (!pending || pending.expires < Date.now()) {
        res.status(400).json({ message: "Upload the payment file again, then apply it." });
        return;
      }
      const drafts = parsePaymentActivity(pending.buffer);
      pendingFiles.delete(String(req.body.uploadId));
      res.json(await applyPaymentDrafts(drafts));
    } catch (error) {
      res.status(500).json({ message: qbFault(error) });
    }
  });
}

export function initUsFoodsDailyCheck() {
  const run = () => {
    applyReadyCorrections()
      .then((result) => {
        if (result) console.log(`[US Foods] Closed ${result.closed} invoice(s). ${result.waiting} draft(s) still need the payment file.`);
      })
      .catch((error) => console.error("[US Foods] Daily check failed:", qbFault(error)));
  };
  setTimeout(run, 60_000);
  setInterval(run, 24 * 60 * 60 * 1000);
}
