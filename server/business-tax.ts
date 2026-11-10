import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { sendEmail } from "./email";
import { toastBusinessTotals } from "./toast-books";
import { requirePlatformRole } from "./platformAuth";
import { postQuickBooks, queryQuickBooks } from "./quickbooks-routes";

type TaxKind = "ma" | "local" | "meals" | "bottle" | "combined";

type TaxLine = { name: string; amount: number; kind: TaxKind };

type MonthRow = {
  month: string;
  sales: number;
  maSalesTax: number;
  localSalesTax: number;
  mealsTax: number;
  bottleTax: number;
  combined: number;
  lines: TaxLine[];
  generatedAt: string;
  dueDate: string;
  remindedAt: string;
  filedAt: string;
  salesPaymentId: string;
  mealsPaymentId: string;
  bottlePaymentId: string;
  paySales: number;
  payMeals: number;
  payBottle: number;
};

const SETTING_ID = "tax";
const BANK_ACCOUNT = "475";
const SALES_LIABILITY = "113";
const BOTTLE_LIABILITY = "112";
const SALES_VENDOR = "1764";
const MEALS_VENDOR = "1599";
const BOTTLE_VENDOR = "1432";

export function taxKind(name: string): TaxKind {
  const label = name.toLowerCase();
  if (label === "all taxes" || label === "tax") return "combined";
  const bottle = label.includes("bottle");
  const meals = label.includes("meal");
  const local = label.includes("local");
  const sales = label.includes("sales") || label.includes("tasting");
  if (bottle && (meals || local || sales)) return "combined";
  if (bottle) return "bottle";
  if (meals && sales) return "combined";
  if (meals) return "meals";
  if (local) return "local";
  return "ma";
}

function money(cents: number) {
  return Math.round(cents) / 100;
}

function easternToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function shiftDay(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function nthWeekday(year: number, monthIndex: number, weekday: number, n: number) {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  return 1 + offset + (n - 1) * 7;
}

function lastWeekday(year: number, monthIndex: number, weekday: number) {
  const last = new Date(Date.UTC(year, monthIndex + 1, 0));
  const offset = (last.getUTCDay() - weekday + 7) % 7;
  return last.getUTCDate() - offset;
}

function observedFixed(year: number, monthIndex: number, day: number) {
  const date = new Date(Date.UTC(year, monthIndex, day));
  const weekday = date.getUTCDay();
  if (weekday === 6) date.setUTCDate(day - 1);
  if (weekday === 0) date.setUTCDate(day + 1);
  return date.toISOString().slice(0, 10);
}

function holidaySet(year: number) {
  const days = new Set<string>([
    observedFixed(year, 0, 1),
    observedFixed(year, 5, 19),
    observedFixed(year, 6, 4),
    observedFixed(year, 10, 11),
    observedFixed(year, 11, 25),
  ]);
  const add = (monthIndex: number, day: number) => days.add(new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10));
  add(0, nthWeekday(year, 0, 1, 3));
  add(1, nthWeekday(year, 1, 1, 3));
  add(3, nthWeekday(year, 3, 1, 3));
  add(4, lastWeekday(year, 4, 1));
  add(8, nthWeekday(year, 8, 1, 1));
  add(9, nthWeekday(year, 9, 1, 2));
  add(10, nthWeekday(year, 10, 4, 4));
  return days;
}

function closedDay(iso: string, holidays: Set<string>) {
  const weekday = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return weekday === 0 || weekday === 6 || holidays.has(iso);
}

export function filingDue(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, monthNumber + 1, 0)).getUTCDate();
  const due = new Date(Date.UTC(year, monthNumber, Math.min(30, last)));
  const holidays = new Set<string>([...holidaySet(due.getUTCFullYear()), ...holidaySet(due.getUTCFullYear() + 1)]);
  let iso = due.toISOString().slice(0, 10);
  while (closedDay(iso, holidays)) iso = shiftDay(iso, 1);
  return iso;
}

function monthDays(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return Array.from({ length: last }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`);
}

function previousMonth(today: string) {
  const [year, monthNumber] = today.slice(0, 7).split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 2, 1));
  return date.toISOString().slice(0, 7);
}

function validMonth(month: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function ensureTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS accounting_business_tax_settings (
      id varchar PRIMARY KEY,
      email varchar NOT NULL DEFAULT ''
    )
  `);
  await db.execute(sql`
    INSERT INTO accounting_business_tax_settings (id, email)
    VALUES (${SETTING_ID}, '')
    ON CONFLICT (id) DO NOTHING
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS accounting_business_tax_months (
      month varchar PRIMARY KEY,
      sales numeric(14, 2) NOT NULL,
      ma_sales_tax numeric(14, 2) NOT NULL,
      local_sales_tax numeric(14, 2) NOT NULL,
      meals_tax numeric(14, 2) NOT NULL,
      bottle_tax numeric(14, 2) NOT NULL,
      combined numeric(14, 2) NOT NULL,
      lines jsonb NOT NULL,
      generated_at timestamp NOT NULL DEFAULT now(),
      due_date date NOT NULL,
      reminded_at timestamp,
      filed_at timestamp,
      sales_payment_id varchar,
      meals_payment_id varchar,
      bottle_payment_id varchar
    )
  `);
  await db.execute(sql`ALTER TABLE accounting_business_tax_months ADD COLUMN IF NOT EXISTS filed_at timestamp`);
  await db.execute(sql`ALTER TABLE accounting_business_tax_months ADD COLUMN IF NOT EXISTS sales_payment_id varchar`);
  await db.execute(sql`ALTER TABLE accounting_business_tax_months ADD COLUMN IF NOT EXISTS meals_payment_id varchar`);
  await db.execute(sql`ALTER TABLE accounting_business_tax_months ADD COLUMN IF NOT EXISTS bottle_payment_id varchar`);
}

function asLines(value: unknown): TaxLine[] {
  if (!Array.isArray(value)) return [];
  return value.map((line) => {
    const row = line as { name?: string; amount?: number; kind?: string };
    const kind = row.kind === "local" || row.kind === "meals" || row.kind === "bottle" || row.kind === "combined" ? row.kind : "ma";
    return { name: String(row.name || ""), amount: Number(row.amount || 0), kind };
  });
}

function round2(amount: number) {
  return Math.round(amount * 100) / 100;
}

export function filingPayments(lines: TaxLine[]) {
  let sales = 0;
  let meals = 0;
  let bottle = 0;
  for (const line of lines) {
    if (line.kind === "bottle") bottle += line.amount;
    else if (line.kind === "meals" || (line.kind === "local" && !/sales/i.test(line.name))) meals += line.amount;
    else if (line.kind === "ma" || line.kind === "local") sales += line.amount;
  }
  return { sales: round2(sales), meals: round2(meals), bottle: round2(bottle) };
}

function toMonth(row: Record<string, unknown>): MonthRow {
  const lines = asLines(row.lines);
  const pay = filingPayments(lines);
  return {
    month: String(row.month),
    sales: Number(row.sales || 0),
    maSalesTax: Number(row.ma_sales_tax || 0),
    localSalesTax: Number(row.local_sales_tax || 0),
    mealsTax: Number(row.meals_tax || 0),
    bottleTax: Number(row.bottle_tax || 0),
    combined: Number(row.combined || 0),
    lines,
    generatedAt: row.generated_at instanceof Date ? row.generated_at.toISOString() : String(row.generated_at || ""),
    dueDate: String(row.due_date || "").slice(0, 10),
    remindedAt: row.reminded_at instanceof Date ? row.reminded_at.toISOString() : String(row.reminded_at || ""),
    filedAt: row.filed_at instanceof Date ? row.filed_at.toISOString() : String(row.filed_at || ""),
    salesPaymentId: String(row.sales_payment_id || ""),
    mealsPaymentId: String(row.meals_payment_id || ""),
    bottlePaymentId: String(row.bottle_payment_id || ""),
    paySales: pay.sales,
    payMeals: pay.meals,
    payBottle: pay.bottle,
  };
}

async function taxEmail() {
  await ensureTables();
  const result = await db.execute(sql`SELECT email FROM accounting_business_tax_settings WHERE id = ${SETTING_ID}`);
  return String((result.rows[0] as { email?: string } | undefined)?.email || "");
}

export async function businessTaxReport(year: number) {
  await ensureTables();
  const email = await taxEmail();
  const result = await db.execute(sql`
    SELECT * FROM accounting_business_tax_months
    WHERE month LIKE ${`${year}-%`}
    ORDER BY month
  `);
  return {
    email,
    year,
    months: (result.rows as Record<string, unknown>[]).map(toMonth),
  };
}

export async function saveTaxEmail(email: string) {
  const trimmed = email.trim();
  if (trimmed && !validEmail(trimmed)) throw new Error("Enter the tax email address.");
  await ensureTables();
  await db.execute(sql`UPDATE accounting_business_tax_settings SET email = ${trimmed} WHERE id = ${SETTING_ID}`);
  return trimmed;
}

const buildingMonths = new Map<string, Promise<{ month: string; orders: number; sales: number; maSalesTax: number; localSalesTax: number; mealsTax: number; bottleTax: number; combined: number; dueDate: string }>>();

export async function generateBusinessTaxMonth(month: string) {
  const current = buildingMonths.get(month);
  if (current) return current;
  const job = buildBusinessTaxMonth(month).finally(() => buildingMonths.delete(month));
  buildingMonths.set(month, job);
  return job;
}

async function buildBusinessTaxMonth(month: string) {
  if (!validMonth(month)) throw new Error("Choose a month.");
  const today = easternToday();
  if (month >= today.slice(0, 7)) throw new Error("A month is built from Toast after it has ended.");
  await ensureTables();
  const totals = { sales: 0, ma: 0, local: 0, meals: 0, bottle: 0, combined: 0, orders: 0 };
  const byName = new Map<string, { cents: number; kind: TaxKind }>();
  for (const day of monthDays(month)) {
    const toast = await toastBusinessTotals(day);
    totals.orders += toast.orders;
    totals.sales += toast.salesCents;
    for (const tax of toast.taxes) {
      const kind = taxKind(tax.name);
      const current = byName.get(tax.name) || { cents: 0, kind };
      current.cents += tax.cents;
      byName.set(tax.name, current);
      if (kind === "local") totals.local += tax.cents;
      else if (kind === "meals") totals.meals += tax.cents;
      else if (kind === "bottle") totals.bottle += tax.cents;
      else if (kind === "combined") totals.combined += tax.cents;
      else totals.ma += tax.cents;
    }
  }
  const lines = [...byName.entries()]
    .map(([name, line]) => ({ name, amount: money(line.cents), kind: line.kind }))
    .filter((line) => line.amount !== 0)
    .sort((left, right) => Math.abs(right.amount) - Math.abs(left.amount));
  const dueDate = filingDue(month);
  const sales = money(totals.sales);
  const maSalesTax = money(totals.ma);
  const localSalesTax = money(totals.local);
  const mealsTax = money(totals.meals);
  const bottleTax = money(totals.bottle);
  const combined = money(totals.combined);
  await db.execute(sql`
    INSERT INTO accounting_business_tax_months (
      month, sales, ma_sales_tax, local_sales_tax, meals_tax, bottle_tax, combined, lines, generated_at, due_date, reminded_at
    ) VALUES (
      ${month}, ${sales}, ${maSalesTax}, ${localSalesTax}, ${mealsTax}, ${bottleTax}, ${combined},
      ${JSON.stringify(lines)}::jsonb, now(), ${dueDate}, NULL
    )
    ON CONFLICT (month) DO UPDATE SET
      sales = EXCLUDED.sales,
      ma_sales_tax = EXCLUDED.ma_sales_tax,
      local_sales_tax = EXCLUDED.local_sales_tax,
      meals_tax = EXCLUDED.meals_tax,
      bottle_tax = EXCLUDED.bottle_tax,
      combined = EXCLUDED.combined,
      lines = EXCLUDED.lines,
      generated_at = now(),
      due_date = EXCLUDED.due_date
  `);
  return { month, orders: totals.orders, sales, maSalesTax, localSalesTax, mealsTax, bottleTax, combined, dueDate };
}

function dollars(amount: number) {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

async function remindMonth(row: MonthRow, email: string) {
  const label = monthLabel(row.month);
  const subject = `File ${label} Massachusetts tax by ${row.dueDate}`;
  const combined = row.combined
    ? `Toast also collected ${dollars(row.combined)} under tax names that mix more than one tax. Those amounts are on the Business Tax page and are not in the totals below.`
    : "";
  const text = [
    `${label} is ready from Toast.`,
    `Total sales ${dollars(row.sales)}.`,
    `MA sales tax to pay ${dollars(row.paySales)}.`,
    `Meals tax to pay, including local town tax, ${dollars(row.payMeals)}.`,
    `Bottle tax to pay ${dollars(row.payBottle)}.`,
    combined,
    `File by ${row.dueDate}. This note is the day before that return is due.`,
  ].filter(Boolean).join("\n");
  const html = text.split("\n").map((line) => `<p>${line}</p>`).join("");
  await sendEmail(email, subject, html, text);
  await db.execute(sql`UPDATE accounting_business_tax_months SET reminded_at = now() WHERE month = ${row.month}`);
}

export async function runBusinessTaxSchedule() {
  await ensureTables();
  const today = easternToday();
  const month = previousMonth(today);
  const existing = await db.execute(sql`SELECT month FROM accounting_business_tax_months WHERE month = ${month}`);
  if (!existing.rows.length && month < today.slice(0, 7)) {
    await generateBusinessTaxMonth(month);
    console.log(`[Business tax] Built ${month} from Toast.`);
  }
  const email = await taxEmail();
  if (!email) return;
  const pending = await db.execute(sql`
    SELECT * FROM accounting_business_tax_months
    WHERE reminded_at IS NULL AND due_date >= ${today}
  `);
  for (const raw of pending.rows as Record<string, unknown>[]) {
    const row = toMonth(raw);
    const reminder = shiftDay(row.dueDate, -1);
    if (today >= reminder && today <= row.dueDate) {
      await remindMonth(row, email);
      console.log(`[Business tax] Reminded ${email} to file ${row.month} by ${row.dueDate}.`);
    }
  }
}

function qbFault(error: unknown) {
  const detail = (error as { response?: { data?: { Fault?: { Error?: Array<{ Detail?: string }> } } } })?.response?.data?.Fault?.Error?.[0]?.Detail;
  return detail || (error instanceof Error ? error.message : "QuickBooks did not record the check.");
}

async function existingCheck(doc: string) {
  const rows = (await queryQuickBooks(`SELECT Id FROM Purchase WHERE DocNumber = '${doc}'`)).data?.QueryResponse?.Purchase || [];
  const row = rows[0] as { Id?: string } | undefined;
  return row?.Id ? String(row.Id) : "";
}

async function enterAch(doc: string, date: string, vendorId: string, accountId: string, amount: number, note: string) {
  if (amount <= 0) return "";
  const prior = await existingCheck(doc);
  if (prior) return prior;
  const created = await postQuickBooks("/purchase", {
    PaymentType: "Check",
    AccountRef: { value: BANK_ACCOUNT },
    EntityRef: { value: vendorId, type: "Vendor" },
    TxnDate: date,
    DocNumber: doc,
    PrivateNote: note,
    Line: [{
      Amount: amount,
      Description: note,
      DetailType: "AccountBasedExpenseLineDetail",
      AccountBasedExpenseLineDetail: { AccountRef: { value: accountId } },
    }],
  });
  const id = (created as { Purchase?: { Id?: string } })?.Purchase?.Id;
  if (!id) throw new Error("QuickBooks did not return the check.");
  return String(id);
}

export async function fileBusinessTaxMonth(month: string) {
  if (!validMonth(month)) throw new Error("Choose a month.");
  await ensureTables();
  const result = await db.execute(sql`SELECT * FROM accounting_business_tax_months WHERE month = ${month}`);
  const raw = result.rows[0] as Record<string, unknown> | undefined;
  if (!raw) throw new Error("Build that month from Toast before marking the return filed.");
  const row = toMonth(raw);
  if (row.combined > 0.009) throw new Error("A Toast tax name mixes more than one tax. Split that name before entering the ACH.");
  const label = monthLabel(month);
  const date = easternToday();
  const payments = [
    { column: "sales_payment_id", id: row.salesPaymentId, doc: `ACH-${month.replace("-", "")}-S`, vendor: SALES_VENDOR, account: SALES_LIABILITY, amount: row.paySales, note: `ACH. Massachusetts sales tax for ${label}.` },
    { column: "meals_payment_id", id: row.mealsPaymentId, doc: `ACH-${month.replace("-", "")}-M`, vendor: MEALS_VENDOR, account: SALES_LIABILITY, amount: row.payMeals, note: `ACH. Massachusetts meals tax, including local town tax, for ${label}.` },
    { column: "bottle_payment_id", id: row.bottlePaymentId, doc: `ACH-${month.replace("-", "")}-B`, vendor: BOTTLE_VENDOR, account: BOTTLE_LIABILITY, amount: row.payBottle, note: `ACH. Bottle deposits for ${label}.` },
  ];
  try {
    for (const payment of payments) {
      const id = payment.id || await enterAch(payment.doc, date, payment.vendor, payment.account, payment.amount, payment.note);
      if (!id) continue;
      if (payment.column === "sales_payment_id") await db.execute(sql`UPDATE accounting_business_tax_months SET sales_payment_id = ${id} WHERE month = ${month}`);
      if (payment.column === "meals_payment_id") await db.execute(sql`UPDATE accounting_business_tax_months SET meals_payment_id = ${id} WHERE month = ${month}`);
      if (payment.column === "bottle_payment_id") await db.execute(sql`UPDATE accounting_business_tax_months SET bottle_payment_id = ${id} WHERE month = ${month}`);
    }
  } catch (error) {
    throw new Error(qbFault(error));
  }
  await db.execute(sql`UPDATE accounting_business_tax_months SET filed_at = now() WHERE month = ${month}`);
  const filed = await db.execute(sql`SELECT * FROM accounting_business_tax_months WHERE month = ${month}`);
  return toMonth(filed.rows[0] as Record<string, unknown>);
}

export function initBusinessTaxReports() {
  const run = () => {
    runBusinessTaxSchedule().catch((error) => console.error("[Business tax]", error instanceof Error ? error.message : error));
  };
  setTimeout(run, 75_000);
  setInterval(run, 24 * 60 * 60 * 1000);
}

export function registerBusinessTaxRoutes(router: Router) {
  const isAdmin = requirePlatformRole(["super_admin"]);

  router.get("/business-tax", isAdmin, async (req, res) => {
    try {
      const year = Number(req.query.year || easternToday().slice(0, 4));
      if (!Number.isInteger(year) || year < 2000 || year > 2100) return res.status(400).json({ message: "Choose a year." });
      res.json(await businessTaxReport(year));
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "The tax report could not be loaded." });
    }
  });

  router.put("/business-tax/email", isAdmin, async (req, res) => {
    try {
      const email = await saveTaxEmail(String(req.body?.email || ""));
      res.json({ email });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "The tax email was not saved." });
    }
  });

  router.post("/business-tax/file", isAdmin, async (req, res) => {
    try {
      res.json(await fileBusinessTaxMonth(String(req.body?.month || "")));
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "The ACH was not entered." });
    }
  });

  router.post("/business-tax/generate", isAdmin, async (req, res) => {
    try {
      const month = await generateBusinessTaxMonth(String(req.body?.month || ""));
      res.json(month);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Toast did not return that month." });
    }
  });
}
