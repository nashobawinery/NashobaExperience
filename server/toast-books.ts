import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import path from "path";
import { Router } from "express";
import sgMail from "@sendgrid/mail";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { getOrdersByBusinessDate, getRestaurants } from "./reactivation/toast-api";
import { postQuickBooks, queryQuickBooks } from "./quickbooks-routes";
import { requirePlatformRole } from "./platformAuth";

type MapRow = { kind: string; name: string; account: string; className: string };
type Bucket = { kind: string; name: string; cents: number };
type Account = { id: string; name: string; full: string; number: string };
type ClassRef = { id: string; name: string; full: string };
type ExpectedLine = { accountId: string; accountName: string; classId: string; className: string; cents: number };
type JournalLine = { accountId: string; classId: string; cents: number };

const OPEN_YEAR = "2026-01-01";
const PENNY_LIMIT = 100;
const DEPOSIT_MATCH_CENTS = 5;
const mapping = JSON.parse(readFileSync(path.join(process.cwd(), "server/data/shogo-mapping.json"), "utf8")) as { rows: MapRow[] };

function centsOf(value: unknown) {
  return Math.round(Number(value || 0) * 100);
}

function money(cents: number) {
  return cents / 100;
}

function norm(value: string) {
  return value.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
}

function qbFault(error: unknown) {
  const err = error as { response?: { data?: { Fault?: { Error?: { Detail?: string; Message?: string }[] } } }; message?: string };
  const item = err.response?.data?.Fault?.Error?.[0];
  return item?.Detail || item?.Message || err.message || "QuickBooks request failed";
}

function add(target: Map<string, Bucket>, kind: string, name: string, cents: number) {
  if (!cents) return;
  const key = `${kind}|${norm(name)}`;
  const current = target.get(key);
  if (current) current.cents += cents;
  else target.set(key, { kind, name, cents });
}

function findRow(kind: string, name: string, fallbackKind?: string) {
  const exact = mapping.rows.find((row) => row.kind === kind && norm(row.name) === norm(name) && row.account);
  if (exact) return exact;
  if (!fallbackKind) return null;
  return mapping.rows.find((row) => row.kind === fallbackKind && row.account) ?? null;
}

function parseAccount(raw: string) {
  const match = raw.match(/^\(([^)]+)\)\s*(.*)$/);
  if (!match) return { number: "", name: raw.trim() };
  return { number: match[1].trim(), name: match[2].trim().replace(/^\*/, "") };
}

function resolveAccount(accounts: Account[], raw: string) {
  const parsed = parseAccount(raw);
  const wanted = norm(parsed.name).replace(/^\*/, "");
  const leaf = wanted.split(":").pop() || wanted;
  if (parsed.number) {
    const byNumber = accounts.find((account) => account.number.replace(/\s/g, "") === parsed.number.replace(/\s/g, ""));
    if (byNumber) return byNumber;
  }
  const byFull = accounts.find((account) => {
    const full = norm(account.full).replace(/^\*/, "");
    const name = norm(account.name).replace(/^\*/, "");
    return full === wanted || name === wanted || full.endsWith(`:${wanted}`);
  });
  if (byFull) return byFull;
  const byLeaf = accounts.filter((account) => norm(account.name).replace(/^\*/, "") === leaf);
  return byLeaf.length === 1 ? byLeaf[0] : null;
}

function resolveClass(classes: ClassRef[], name: string) {
  if (!name) return null;
  const wanted = norm(name);
  return classes.find((item) => norm(item.full) === wanted || norm(item.name) === wanted) ?? null;
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

async function toastBuckets(businessDate: string) {
  const buckets = new Map<string, Bucket>();
  const restaurants = await getRestaurants();
  let orders = 0;
  for (const restaurant of restaurants) {
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const batch = await getOrdersByBusinessDate(restaurant.restaurantGuid, businessDate, page, 100);
      if (!Array.isArray(batch) || batch.length === 0) break;
      for (const order of batch) {
        if (order.voided || order.deleted) continue;
        orders += 1;
        for (const check of order.checks || []) {
          if (check.voided || check.deleted) continue;
          for (const selection of check.selections || []) {
            if (selection.voided) continue;
            const quantity = selection.quantity || 1;
            const gross = selection.preDiscountPrice != null ? centsOf(selection.preDiscountPrice) : centsOf((selection.price || 0) * quantity);
            const category = selection.salesCategory?.name || "Unassigned";
            if (gross) add(buckets, "DEPSALE", category, gross);
            for (const discount of selection.appliedDiscounts || []) {
              if (discount.processingState === "VOID" || discount.processingState === "PENDING_VOID") continue;
              add(buckets, "DISCOUNT", discount.name || "Discount", centsOf(discount.nonTaxableDiscountAmount || discount.discountAmount));
            }
          }
          for (const discount of check.appliedDiscounts || []) {
            if (discount.processingState === "VOID" || discount.processingState === "PENDING_VOID") continue;
            add(buckets, "DISCOUNT", discount.name || "Discount", centsOf(discount.nonTaxableDiscountAmount || discount.discountAmount));
          }
          for (const charge of check.appliedServiceCharges || []) {
            if (charge.voided) continue;
            add(buckets, "SERVICECHARGE", charge.name || (charge.gratuity ? "Tips" : "Service charge"), centsOf(charge.chargeAmount));
          }
          const taxes = check.appliedTaxes || [];
          if (taxes.length) {
            for (const tax of taxes) add(buckets, "TAX", tax.name || "Sales Tax", centsOf(tax.taxAmount || tax.amount));
          } else if (check.taxAmount) {
            add(buckets, "TAX", "All Taxes", centsOf(check.taxAmount));
          }
          for (const payment of check.payments || []) {
            if (payment.voidInfo || payment.paymentStatus === "VOIDED" || payment.paymentStatus === "DENIED") continue;
            const paid = centsOf(payment.amount) + centsOf(payment.tipAmount);
            const tip = centsOf(payment.tipAmount);
            const type = String(payment.type || "").toUpperCase();
            if (type === "CREDIT") add(buckets, "CREDIT", `${payment.cardType || "Card"} (Credit)`, paid);
            else if (type === "CASH") add(buckets, "CASH", "Cash Deposit", paid);
            else if (type === "GIFTCARD") add(buckets, "OTHERTENDER", "Gift Card", paid);
            else if (type === "HOUSE_ACCOUNT" || type === "HOUSEACCOUNT") add(buckets, "OTHERTENDER", "House Account", paid);
            else add(buckets, "OTHERTENDER", payment.otherPayment?.name || payment.type || "Other", paid);
            if (tip) add(buckets, "SERVICECHARGE", "Tips", tip);
          }
        }
      }
      page += 1;
      if (batch.length < 100) hasMore = false;
    }
  }
  const list: Bucket[] = [];
  buckets.forEach((bucket) => list.push(bucket));
  return { orders, buckets: list };
}

function fallbackKind(kind: string) {
  if (kind === "DEPSALE") return "ALLSALES";
  if (kind === "DISCOUNT") return "ALLDISCOUNTS";
  if (kind === "TAX") return "ALLTAX";
  if (kind === "CREDIT") return "ALLCREDIT";
  return "";
}

function signedCents(kind: string, amount: number) {
  if (kind === "DEPSALE" || kind === "ALLSALES" || kind === "SERVICECHARGE" || kind === "TAX" || kind === "ALLTAX") return -amount;
  return amount;
}

async function booksForDate(businessDate: string) {
  const toast = await toastBuckets(businessDate);
  const [accountRows, classRows] = await Promise.all([
    queryRows<{ Id: string; Name: string; FullyQualifiedName?: string; AcctNum?: string }>("Account", "Active IN (true, false)"),
    queryRows<{ Id: string; Name: string; FullyQualifiedName?: string }>("Class", "Active IN (true, false)").catch(() => []),
  ]);
  const accounts: Account[] = accountRows.map((account) => ({
    id: account.Id,
    name: account.Name,
    full: account.FullyQualifiedName || account.Name,
    number: account.AcctNum || "",
  }));
  const classes: ClassRef[] = classRows.map((item) => ({ id: item.Id, name: item.Name, full: item.FullyQualifiedName || item.Name }));
  const unmapped: { kind: string; name: string; amount: number }[] = [];
  const expected = new Map<string, ExpectedLine>();
  let imbalance = 0;

  toast.buckets.forEach((bucket) => {
    const row = findRow(bucket.kind, bucket.name, fallbackKind(bucket.kind));
    if (!row) {
      unmapped.push({ kind: bucket.kind, name: bucket.name, amount: money(bucket.cents) });
      return;
    }
    const account = resolveAccount(accounts, row.account);
    if (!account) {
      unmapped.push({ kind: bucket.kind, name: `${bucket.name} → ${row.account}`, amount: money(bucket.cents) });
      return;
    }
    const classRef = resolveClass(classes, row.className);
    const signed = signedCents(row.kind, bucket.cents);
    imbalance += signed;
    const key = `${account.id}|${classRef?.id || ""}`;
    const current = expected.get(key);
    if (current) current.cents += signed;
    else expected.set(key, { accountId: account.id, accountName: account.full, classId: classRef?.id || "", className: classRef?.full || row.className, cents: signed });
  });

  let plugNote = "";
  if (imbalance !== 0 && Math.abs(imbalance) <= PENNY_LIMIT) {
    const overShort = mapping.rows.find((row) => row.kind === "OVERSHORT");
    const account = overShort ? resolveAccount(accounts, overShort.account) : null;
    if (account) {
      const key = `${account.id}|`;
      const current = expected.get(key);
      if (current) current.cents -= imbalance;
      else expected.set(key, { accountId: account.id, accountName: account.full, classId: "", className: "", cents: -imbalance });
      plugNote = `Toast's day was ${money(imbalance).toFixed(2)} out of balance. That amount is parked in cash over/short.`;
      imbalance = 0;
    }
  }

  const through = new Date(`${businessDate}T00:00:00Z`);
  through.setUTCDate(through.getUTCDate() + 2);
  const throughDate = through.toISOString().slice(0, 10);
  const journalRows = await queryRows<{
    Id: string;
    DocNumber?: string;
    PrivateNote?: string;
    TxnDate?: string;
    Line?: { Amount?: number; Description?: string; JournalEntryLineDetail?: { PostingType?: string; AccountRef?: { value?: string }; ClassRef?: { value?: string } } }[];
  }>("JournalEntry", `TxnDate >= '${businessDate}' AND TxnDate <= '${throughDate}'`);

  const journals: { id: string; doc: string; note: string; source: "shogo" | "ours" }[] = [];
  const shogoActual = new Map<string, JournalLine>();
  const ourActual = new Map<string, JournalLine>();
  const seenJournals = new Set<string>();
  for (const journal of journalRows) {
    if (seenJournals.has(journal.Id)) continue;
    seenJournals.add(journal.Id);
    const doc = journal.DocNumber || "";
    if (doc.startsWith("TDLY-")) continue;
    const memo = (journal.PrivateNote || "").toLowerCase();
    const journalLines = journal.Line || [];
    const isOurs = doc.startsWith("TOAST-") || doc.startsWith("TFIX-");
    const stamp = businessDate.slice(2).replace(/-/g, "");
    const isShogoThisDay = doc.toLowerCase() === `${stamp}toast` && journalLines.some((line) => /toast cc deposit|cash deposit/i.test(line.Description || ""));
    const isShogo = !isOurs && (memo.includes(businessDate) || isShogoThisDay);
    if (!isOurs && !isShogo) continue;
    journals.push({ id: journal.Id, doc: journal.DocNumber || journal.Id, note: journal.PrivateNote || "", source: isOurs ? "ours" : "shogo" });
    const target = isOurs ? ourActual : shogoActual;
    for (const line of journalLines) {
      const detail = line.JournalEntryLineDetail;
      if (!detail?.AccountRef?.value || !detail.PostingType) continue;
      const signed = detail.PostingType === "Debit" ? centsOf(line.Amount) : -centsOf(line.Amount);
      const key = `${detail.AccountRef.value}|${detail.ClassRef?.value || ""}`;
      const current = target.get(key);
      if (current) current.cents += signed;
      else target.set(key, { accountId: detail.AccountRef.value, classId: detail.ClassRef?.value || "", cents: signed });
    }
  }
  const shogoJournals = journals.filter((journal) => journal.source === "shogo");
  const ourJournals = journals.filter((journal) => journal.source === "ours");
  const actual = shogoJournals.length ? shogoActual : ourActual;

  const depositRows = await queryRows<{ Id: string; TotalAmt?: number; DepositToAccountRef?: { name?: string }; PrivateNote?: string }>("Deposit", `TxnDate = '${businessDate}'`).catch(() => []);
  const deposits = depositRows.map((deposit) => ({
    id: deposit.Id,
    total: Number(deposit.TotalAmt || 0),
    account: deposit.DepositToAccountRef?.name || "",
    note: deposit.PrivateNote || "",
  }));

  const lines: { accountName: string; className: string; toast: number; quickbooks: number; difference: number; accountId: string; classId: string; correction: number }[] = [];
  const seen = new Set<string>();
  expected.forEach((line, key) => {
    seen.add(key);
    const qb = actual.get(key)?.cents || 0;
    if (!line.cents && !qb) return;
    lines.push({
      accountName: line.accountName,
      className: line.className,
      toast: money(-line.cents),
      quickbooks: money(-qb),
      difference: money(-(line.cents - qb)),
      accountId: line.accountId,
      classId: line.classId,
      correction: line.cents - qb,
    });
  });
  actual.forEach((line, key) => {
    if (seen.has(key) || !line.cents) return;
    const account = accounts.find((item) => item.id === line.accountId);
    const classRef = classes.find((item) => item.id === line.classId);
    lines.push({
      accountName: account?.full || line.accountId,
      className: classRef?.full || "",
      toast: 0,
      quickbooks: money(-line.cents),
      difference: money(line.cents),
      accountId: line.accountId,
      classId: line.classId,
      correction: -line.cents,
    });
  });
  lines.sort((left, right) => Math.abs(right.correction) - Math.abs(left.correction));

  const bank = accounts.find((account) => account.number.replace(/\s/g, "") === "100000")
    || accounts.find((account) => norm(account.name).includes("clinton savings"));
  let bankCents = 0;
  let recordedBank = 0;
  if (bank) {
    expected.forEach((line) => { if (line.accountId === bank.id) bankCents += line.cents; });
    actual.forEach((line) => { if (line.accountId === bank.id) recordedBank += line.cents; });
  }

  const ourEntry: { accountId: string; classId: string; cents: number }[] = [];
  expected.forEach((line) => {
    if (line.cents) ourEntry.push({ accountId: line.accountId, classId: line.classId, cents: line.cents });
  });
  const entryBalance = ourEntry.reduce((sum, line) => sum + line.cents, 0);
  const correction = lines.filter((line) => line.correction !== 0);
  const hasOurs = ourJournals.some((journal) => journal.doc.startsWith("TOAST-"));
  const hasShogo = shogoJournals.length > 0;
  let postBlock: string | null = null;
  if (businessDate < OPEN_YEAR) postBlock = "A 2025 or earlier day is not posted.";
  else if (unmapped.length) postBlock = "A Toast category or account in the mapping could not be matched, so nothing was posted.";
  else if (imbalance !== 0) postBlock = `Toast's day is out of balance by ${money(imbalance).toFixed(2)}. The missing piece has to be identified before it is posted.`;
  else if (entryBalance !== 0) postBlock = `The entry is out of balance by ${money(entryBalance).toFixed(2)}.`;
  else if (hasOurs) postBlock = hasShogo
    ? `Our journal and Shogo's journal are both in QuickBooks. Compare them and delete one.`
    : "Our journal is already in QuickBooks for this date.";
  else if (!ourEntry.length) postBlock = "This date has no Toast sales to post.";

  return {
    date: businessDate,
    orderCount: toast.orders,
    journals,
    shogoJournals,
    ourJournals,
    deposits,
    lines: lines.map((line) => ({
      accountName: line.accountName,
      className: line.className,
      toast: line.toast,
      quickbooks: line.quickbooks,
      difference: line.difference,
    })),
    unmapped,
    plugNote,
    matched: hasShogo && correction.length === 0 && !unmapped.length && !imbalance,
    mode: hasOurs ? "posted" : "post-day",
    canPost: !postBlock && ourEntry.length > 0,
    postBlock,
    correction,
    ourEntry,
    bankExpected: money(bankCents),
    bankRecorded: money(recordedBank),
  };
}

function fallbackFinding(day: Awaited<ReturnType<typeof booksForDate>>) {
  const ours = day.ourJournals.map((journal) => journal.doc).join(", ");
  const shogo = day.shogoJournals.map((journal) => journal.doc).join(", ");
  if (day.ourJournals.length && day.shogoJournals.length) {
    const gap = day.lines.find((line) => line.difference !== 0);
    if (!gap) return `${day.date}: our journal ${ours} matches Shogo ${shogo}. Delete one of them so the day is not recorded twice.`;
    const where = gap.className ? `${gap.accountName}, class ${gap.className}` : gap.accountName;
    return `${day.date}: our journal ${ours} and Shogo ${shogo} are both in QuickBooks. The largest difference is ${gap.difference.toFixed(2)} on ${where}. Delete the journal you do not want to keep.`;
  }
  if (day.matched) return `${day.date} matches Shogo.`;
  if (!day.shogoJournals.length && !day.unmapped.length) {
    return `${day.date} is not in QuickBooks yet. Toast balances and can be posted as our journal. Shogo can stay on; delete one of the two journals after you compare them.`;
  }
  if (day.unmapped.length) {
    const names = day.unmapped.slice(0, 4).map((item) => `${item.name} (${item.amount.toFixed(2)})`).join(", ");
    return `${day.date} has Toast items that are not in the mapping: ${names}.`;
  }
  const gap = day.lines.find((line) => line.difference !== 0);
  if (!gap) return day.postBlock || `${day.date} needs a look.`;
  const where = gap.className ? `${gap.accountName}, class ${gap.className}` : gap.accountName;
  return `${day.date} is off by ${gap.difference.toFixed(2)} on ${where}. Shogo is ${shogo || "not posted"}. Our journal is ${ours || "not posted yet"}.`;
}

async function explainGap(day: Awaited<ReturnType<typeof booksForDate>>) {
  const fallback = fallbackFinding(day);
  if (day.matched || !day.shogoJournals.length || day.ourJournals.length) return fallback;
  try {
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: "You help a bookkeeper find why a Toast sales day does not match the QuickBooks journal already posted for that date. Use only the JSON. A missing mapping is only an item in unmapped. An amount on both Toast and QuickBooks that is not equal is a mismatch: name the business date, the account, and the dollar difference. Mention the largest two gaps. Two to four sentences.",
        },
        {
          role: "user",
          content: JSON.stringify({
            date: day.date,
            unmapped: day.unmapped,
            plugNote: day.plugNote,
            postBlock: day.postBlock,
            journals: day.journals,
            deposits: day.deposits,
            gaps: day.lines.filter((line) => line.difference !== 0).slice(0, 8),
          }),
        },
      ],
    });
    return response.choices[0]?.message?.content?.trim() || fallback;
  } catch {
    return fallback;
  }
}

function publicDay(day: Awaited<ReturnType<typeof booksForDate>>, finding: string) {
  return {
    date: day.date,
    orderCount: day.orderCount,
    journals: day.journals,
    shogoJournals: day.shogoJournals,
    ourJournals: day.ourJournals,
    deposits: day.deposits,
    lines: day.lines,
    unmapped: day.unmapped,
    plugNote: day.plugNote,
    matched: day.matched,
    mode: day.mode,
    canPost: day.canPost,
    postBlock: day.postBlock,
    finding,
    bankExpected: day.bankExpected,
    bankRecorded: day.bankRecorded,
  };
}

export async function reviewToastDay(businessDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(businessDate)) throw new Error("Choose a business date.");
  const day = await booksForDate(businessDate);
  return publicDay(day, await explainGap(day));
}

export async function scanToastDays(through: string, days: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(through)) throw new Error("Choose a business date.");
  const count = Math.min(Math.max(days || 7, 1), 7);
  const results = [];
  for (let offset = 0; offset < count; offset += 1) {
    const date = new Date(`${through}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - offset);
    const businessDate = date.toISOString().slice(0, 10);
    const day = await booksForDate(businessDate);
    const gap = day.lines.find((line) => line.difference !== 0);
    results.push({
      date: businessDate,
      matched: day.matched,
      mode: day.mode,
      orderCount: day.orderCount,
      unmapped: day.unmapped.length,
      account: gap?.accountName || "",
      difference: gap?.difference || 0,
      note: fallbackFinding(day),
    });
  }
  return results;
}

function shiftIso(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

type DepositRow = {
  date: string;
  orderCount: number;
  journalDeposit: number;
  depositDate: string | null;
  bankDeposit: number | null;
  difference: number | null;
  status: "waiting" | "match" | "timing" | "mismatch" | "quiet";
  note: string;
  suggestion: string;
};

export async function reviewDeposits(through: string, days: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(through)) throw new Error("Choose a business date.");
  const count = Math.min(Math.max(days || 7, 1), 10);
  const dates: string[] = [];
  for (let offset = 0; offset < count; offset += 1) dates.push(shiftIso(through, -offset));
  const newer = shiftIso(through, 1);
  if (newer <= todayIso()) dates.push(newer);
  dates.sort();

  const books = [];
  for (const date of dates) books.push(await booksForDate(date));

  const rows: DepositRow[] = books.map((day) => {
    const expected = centsOf(day.bankExpected);
    if (!day.orderCount && expected === 0) {
      return { date: day.date, orderCount: 0, journalDeposit: 0, depositDate: null, bankDeposit: null, difference: null, status: "quiet" as const, note: "No Toast sales.", suggestion: "" };
    }
    if (!day.journals.length) {
      return {
        date: day.date,
        orderCount: day.orderCount,
        journalDeposit: day.bankExpected,
        depositDate: null,
        bankDeposit: null,
        difference: null,
        status: "waiting" as const,
        note: "The Toast journal is not in QuickBooks yet. This day is checked after that journal and the next day, so a charge that slips overnight can be seen.",
        suggestion: "",
      };
    }
    const recorded = centsOf(day.bankRecorded);
    const difference = recorded - expected;
    const dollars = money(difference);
    const status = Math.abs(difference) <= DEPOSIT_MATCH_CENTS ? "match" as const : "mismatch" as const;
    const note = status === "match"
      ? `The ${day.date} deposit matches the journal this app would post.`
      : `The ${day.date} deposit is ${Math.abs(dollars).toFixed(2)} ${dollars < 0 ? "under" : "over"} the journal this app would post (${day.bankExpected.toFixed(2)}).`;
    return {
      date: day.date,
      orderCount: day.orderCount,
      journalDeposit: day.bankExpected,
      depositDate: day.date,
      bankDeposit: money(recorded),
      difference: dollars,
      status,
      note,
      suggestion: "",
    };
  });

  for (let index = 0; index < rows.length - 1; index += 1) {
    const left = rows[index];
    const right = rows[index + 1];
    if (left.difference == null || right.difference == null) continue;
    if (left.status === "quiet" || right.status === "quiet") continue;
    const leftCents = centsOf(left.difference);
    const rightCents = centsOf(right.difference);
    if (Math.abs(leftCents) <= DEPOSIT_MATCH_CENTS || Math.abs(leftCents + rightCents) > DEPOSIT_MATCH_CENTS) continue;
    const moved = Math.abs(money(leftCents)).toFixed(2);
    const shortDate = leftCents < 0 ? left.date : right.date;
    const overDate = leftCents < 0 ? right.date : left.date;
    const suggestion = `Problem: ${moved} left the ${shortDate} deposit and arrived with the ${overDate} deposit. Resolution: book ${moved} to Toast Deposit in Transit on ${shortDate} and reverse it on ${overDate}. Clinton Savings stays as deposited. That account shows the delay until it clears.`;
    left.status = "timing";
    right.status = "timing";
    left.note = suggestion;
    right.note = suggestion;
    left.suggestion = suggestion;
    right.suggestion = suggestion;
  }

  for (let index = 0; index < rows.length; index += 1) {
    const next = rows[index + 1];
    if (rows[index].status === "mismatch" && (!next || next.difference == null)) {
      rows[index].status = "waiting";
      rows[index].note = "Waiting on the next deposit. A charge that slips one day makes this deposit short and the next one over by the same amount.";
      rows[index].suggestion = "";
      continue;
    }
    if (rows[index].status !== "mismatch" || rows[index].difference == null) continue;
    const amount = Math.abs(rows[index].difference || 0).toFixed(2);
    const direction = (rows[index].difference || 0) < 0 ? "under" : "over";
    const neighbor = next?.difference == null
      ? "The next deposit is not in yet."
      : `The next day is ${Math.abs(next.difference).toFixed(2)} ${next.difference < 0 ? "under" : "over"}, so this is not one transaction delayed a day.`;
    rows[index].suggestion = `Problem: the ${rows[index].date} deposit is ${amount} ${direction} the journal this app would post (${rows[index].journalDeposit.toFixed(2)}). ${neighbor} Resolution: leave Toast Deposit in Transit alone. Open ${rows[index].date} and correct the card or cash line that does not match the deposit.`;
    rows[index].note = rows[index].suggestion;
  }

  return rows.filter((row) => row.status !== "quiet" && row.date <= through);
}

async function chartOfAccounts() {
  const rows = await queryRows<{ Id: string; Name: string; FullyQualifiedName?: string; AcctNum?: string }>("Account", "Active IN (true, false)");
  return rows.map((account) => ({
    id: account.Id,
    name: account.Name,
    full: account.FullyQualifiedName || account.Name,
    number: account.AcctNum || "",
  }));
}

async function ensureTimingAccount(accounts: Account[]) {
  const found = accounts.find((account) => norm(account.name) === "toast deposit in transit");
  if (found) return found;
  const numberTaken = accounts.some((account) => account.number.replace(/\s/g, "") === "101500");
  const created = await postQuickBooks("/account", {
    Name: "Toast Deposit in Transit",
    AccountType: "Other Current Asset",
    AccountSubType: "OtherCurrentAssets",
    ...(numberTaken ? {} : { AcctNum: "101500" }),
  });
  const account = created?.Account as { Id?: string; Name?: string; FullyQualifiedName?: string; AcctNum?: string } | undefined;
  if (!account?.Id) throw new Error("Toast Deposit in Transit could not be added in QuickBooks.");
  return { id: account.Id, name: account.Name || "Toast Deposit in Transit", full: account.FullyQualifiedName || account.Name || "Toast Deposit in Transit", number: account.AcctNum || "101500" };
}

async function journalDocExists(doc: string) {
  const existing = await queryQuickBooks(`SELECT Id FROM JournalEntry WHERE DocNumber = '${doc}'`);
  return (existing.data?.QueryResponse?.JournalEntry ?? []).length > 0;
}

export async function bookTimingAdjustments(rows: DepositRow[]) {
  const pairs: { shortDate: string; overDate: string; cents: number }[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < rows.length - 1; index += 1) {
    const left = rows[index];
    const right = rows[index + 1];
    if (left.status !== "timing" || right.status !== "timing" || left.difference == null || right.difference == null) continue;
    const key = [left.date, right.date].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    const cents = Math.abs(centsOf(left.difference));
    if (!cents) continue;
    pairs.push({
      shortDate: left.difference < 0 ? left.date : right.date,
      overDate: left.difference < 0 ? right.date : left.date,
      cents,
    });
  }
  if (!pairs.length) return [] as string[];
  const accounts = await chartOfAccounts();
  const timing = await ensureTimingAccount(accounts);
  const bong = resolveAccount(accounts, "(685000) Bong Account - Cash Over Under");
  if (!bong) throw new Error("Bong Account - Cash Over Under is not in QuickBooks.");
  const booked: string[] = [];
  for (const pair of pairs) {
    if (pair.shortDate < OPEN_YEAR || pair.overDate < OPEN_YEAR) continue;
    const amount = money(pair.cents);
    const shortDoc = `TDLY-${pair.shortDate.replace(/-/g, "")}`.slice(0, 21);
    const overDoc = `TDLY-${pair.overDate.replace(/-/g, "")}`.slice(0, 21);
    const held = `Toast deposit timing. ${amount.toFixed(2)} from ${pair.shortDate} is held until ${pair.overDate}. Clinton Savings is not changed.`;
    const cleared = `Toast deposit timing. ${amount.toFixed(2)} from ${pair.shortDate} cleared on ${pair.overDate}. Clinton Savings is not changed.`;
    let posted = false;
    if (!(await journalDocExists(shortDoc))) {
      await postQuickBooks("/journalentry", {
        TxnDate: pair.shortDate,
        DocNumber: shortDoc,
        PrivateNote: held,
        Line: [
          { Amount: amount, Description: held, DetailType: "JournalEntryLineDetail", JournalEntryLineDetail: { PostingType: "Debit", AccountRef: { value: timing.id } } },
          { Amount: amount, Description: held, DetailType: "JournalEntryLineDetail", JournalEntryLineDetail: { PostingType: "Credit", AccountRef: { value: bong.id } } },
        ],
      });
      posted = true;
    }
    if (!(await journalDocExists(overDoc))) {
      await postQuickBooks("/journalentry", {
        TxnDate: pair.overDate,
        DocNumber: overDoc,
        PrivateNote: cleared,
        Line: [
          { Amount: amount, Description: cleared, DetailType: "JournalEntryLineDetail", JournalEntryLineDetail: { PostingType: "Debit", AccountRef: { value: bong.id } } },
          { Amount: amount, Description: cleared, DetailType: "JournalEntryLineDetail", JournalEntryLineDetail: { PostingType: "Credit", AccountRef: { value: timing.id } } },
        ],
      });
      posted = true;
    }
    if (posted) booked.push(`${pair.shortDate} to ${pair.overDate}`);
  }
  return booked;
}

async function explainDeposits(rows: DepositRow[]) {
  const actionable = rows.filter((row) => row.suggestion && (row.status === "mismatch" || row.status === "timing"));
  const seen = new Set<string>();
  const suggestions: string[] = [];
  actionable.forEach((row) => {
    if (seen.has(row.suggestion)) return;
    seen.add(row.suggestion);
    suggestions.push(row.suggestion);
  });
  const fallback = suggestions.join("\n\n");
  if (!fallback) return "";
  try {
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: "You write an email to a bookkeeper. Use only the suggestion text. Keep every dollar amount and the account name Toast Deposit in Transit. A delay is booked to that account and reversed the next day. Any other mismatch is corrected on that day's card or cash line, not on Toast Deposit in Transit. State the problem and the resolution. Two to five sentences. Do not invent amounts.",
        },
        { role: "user", content: JSON.stringify(suggestions) },
      ],
    });
    const text = response.choices[0]?.message?.content?.trim();
    if (!text || !text.includes("Toast Deposit in Transit")) return fallback;
    return text;
  } catch {
    return fallback;
  }
}

const TOAST_NOTICES = [
  { key: "cash-outstanding", label: "Outstanding cash deposits", fallback: "aparrow@nashobawinery.com" },
  { key: "card-outstanding", label: "Outstanding card deposits", fallback: "email@nashobawinery.com" },
  { key: "deposit-mismatch", label: "Deposit does not match the journal", fallback: "email@nashobawinery.com" },
];

function parseNoticeEmails(raw: string) {
  const emails: string[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(/[,;\n]/)) {
    const email = part.trim().toLowerCase();
    if (!email) continue;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`${part.trim()} is not an email address.`);
    if (seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }
  return emails;
}

async function ensureNoticeTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS accounting_toast_notices (
      notice_key varchar PRIMARY KEY,
      emails text NOT NULL DEFAULT ''
    )
  `);
  for (const notice of TOAST_NOTICES) {
    await db.execute(sql`
      INSERT INTO accounting_toast_notices (notice_key, emails)
      VALUES (${notice.key}, ${notice.fallback})
      ON CONFLICT (notice_key) DO NOTHING
    `);
  }
}

export async function toastNotices() {
  await ensureNoticeTable();
  const result = await db.execute(sql`SELECT notice_key, emails FROM accounting_toast_notices`);
  const saved = new Map((result.rows as { notice_key: string; emails: string }[]).map((row) => [row.notice_key, row.emails || ""]));
  return TOAST_NOTICES.map((notice) => ({ key: notice.key, label: notice.label, emails: saved.get(notice.key) ?? notice.fallback }));
}

export async function saveToastNotices(input: Record<string, unknown>) {
  await ensureNoticeTable();
  for (const notice of TOAST_NOTICES) {
    const emails = parseNoticeEmails(String(input[notice.key] ?? "")).join(", ");
    await db.execute(sql`
      INSERT INTO accounting_toast_notices (notice_key, emails)
      VALUES (${notice.key}, ${emails})
      ON CONFLICT (notice_key) DO UPDATE SET emails = ${emails}
    `);
  }
  return toastNotices();
}

async function noticeRecipients(key: string) {
  const notices = await toastNotices();
  const notice = notices.find((item) => item.key === key);
  return notice ? parseNoticeEmails(notice.emails) : [];
}

async function emailOutstandingDeposits() {
  const report = await outstandingDeposits(todayIso());
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return;
  const from = process.env.SENDGRID_FROM_EMAIL || "email@nashobawinery.com";
  sgMail.setApiKey(apiKey);
  const cashTo = await noticeRecipients("cash-outstanding");
  if (cashTo.length && report.cash.length) {
    const lines = report.cash.map((row) => `${row.date}  ${row.amount.toFixed(2)}  ${row.doc}`).join("\n");
    const htmlRows = report.cash.map((row) => `<tr><td style="padding:8px;border-bottom:1px solid #e5e5e5;">${row.date}</td><td style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right;">${row.amount.toFixed(2)}</td><td style="padding:8px;border-bottom:1px solid #e5e5e5;">${row.doc}</td></tr>`).join("");
    await sgMail.send({
      to: cashTo,
      from,
      subject: `Outstanding Toast cash deposits ${report.cashTotal.toFixed(2)}`,
      text: `These cash deposits are still waiting to go to the bank. Total ${report.cashTotal.toFixed(2)}.\n\n${lines}`,
      html: `<div style="font-family:sans-serif;color:#111;"><p>These cash deposits are still waiting to go to the bank. Total ${report.cashTotal.toFixed(2)}.</p><table style="border-collapse:collapse;font-size:14px;"><thead><tr><th style="text-align:left;padding:8px;">Sales date</th><th style="text-align:right;padding:8px;">Cash</th><th style="text-align:left;padding:8px;">Journal</th></tr></thead><tbody>${htmlRows}</tbody></table></div>`,
    });
  }
  const cardTo = await noticeRecipients("card-outstanding");
  if (cardTo.length && report.card.length) {
    const lines = report.card.map((row) => `${row.date}  ${row.amount.toFixed(2)}  ${row.doc}`).join("\n");
    const htmlRows = report.card.map((row) => `<tr><td style="padding:8px;border-bottom:1px solid #e5e5e5;">${row.date}</td><td style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right;">${row.amount.toFixed(2)}</td><td style="padding:8px;border-bottom:1px solid #e5e5e5;">${row.doc}</td></tr>`).join("");
    await sgMail.send({
      to: cardTo,
      from,
      subject: `Outstanding Toast card deposits ${report.cardTotal.toFixed(2)}`,
      text: `These card batches are still in transit. Total ${report.cardTotal.toFixed(2)}.\n\n${lines}`,
      html: `<div style="font-family:sans-serif;color:#111;"><p>These card batches are still in transit. Total ${report.cardTotal.toFixed(2)}.</p><table style="border-collapse:collapse;font-size:14px;"><thead><tr><th style="text-align:left;padding:8px;">Sales date</th><th style="text-align:right;padding:8px;">Cards</th><th style="text-align:left;padding:8px;">Journal</th></tr></thead><tbody>${htmlRows}</tbody></table></div>`,
    });
  }
}

async function emailDepositMismatches(rows: DepositRow[], booked: string[]) {
  const flagged = rows.filter((row) => row.status === "mismatch" || row.status === "timing");
  if (!flagged.length) return { sent: false, reason: "matched" };
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS accounting_toast_deposit_alerts (
      id varchar PRIMARY KEY,
      business_date varchar NOT NULL,
      variance_cents integer NOT NULL,
      sent_at timestamp DEFAULT now()
    )
  `);
  const fresh: DepositRow[] = [];
  for (const row of flagged) {
    const cents = centsOf(row.difference || 0);
    const prior = await db.execute(sql`SELECT id FROM accounting_toast_deposit_alerts WHERE business_date = ${row.date} AND variance_cents = ${cents} LIMIT 1`);
    if ((prior.rows as { id: string }[]).length) continue;
    fresh.push(row);
  }
  if (!fresh.length) return { sent: false, reason: "already-sent" };
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return { sent: false, reason: "email-not-configured" };
  const finding = await explainDeposits(fresh);
  const findingHtml = finding.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
  const bookedNote = booked.length ? ` Booked to Toast Deposit in Transit: ${booked.join("; ")}.` : "";
  const to = await noticeRecipients("deposit-mismatch");
  if (!to.length) return { sent: false, reason: "no-recipients" };
  const lines = fresh.map((row) => `<tr><td style="padding:8px;border-bottom:1px solid #e5e5e5;">${row.date}</td><td style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right;">${row.journalDeposit.toFixed(2)}</td><td style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right;">${(row.bankDeposit ?? 0).toFixed(2)}</td><td style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right;">${(row.difference ?? 0).toFixed(2)}</td><td style="padding:8px;border-bottom:1px solid #e5e5e5;">${(row.suggestion || row.note).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</td></tr>`).join("");
  const mismatches = fresh.filter((row) => row.status === "mismatch");
  sgMail.setApiKey(apiKey);
  await sgMail.send({
    to,
    from: process.env.SENDGRID_FROM_EMAIL || "email@nashobawinery.com",
    subject: mismatches.length ? (mismatches.length === 1 ? `Toast deposit does not match ${mismatches[0].date}` : `Toast deposits do not match ${mismatches.length} days`) : `Toast deposit delayed ${fresh[0].date}`,
    text: `${finding}${bookedNote}\n\n${fresh.map((row) => row.suggestion || row.note).join("\n")}`,
    html: `<div style="font-family:sans-serif;color:#111;"><p>${findingHtml}</p>${bookedNote ? `<p>${bookedNote}</p>` : ""}<table style="border-collapse:collapse;font-size:14px;"><thead><tr><th style="text-align:left;padding:8px;">Sales date</th><th style="text-align:right;padding:8px;">Journal</th><th style="text-align:right;padding:8px;">Deposit</th><th style="text-align:right;padding:8px;">Difference</th><th style="text-align:left;padding:8px;">Suggested resolution</th></tr></thead><tbody>${lines}</tbody></table></div>`,
  });
  for (const row of fresh) {
    await db.execute(sql`
      INSERT INTO accounting_toast_deposit_alerts (id, business_date, variance_cents)
      VALUES (${randomUUID()}, ${row.date}, ${centsOf(row.difference || 0)})
    `);
  }
  return { sent: true, dates: fresh.map((row) => row.date) };
}

export async function ensureToastDepositAccount() {
  return ensureTimingAccount(await chartOfAccounts());
}

export async function postYesterdayToastJournal() {
  const businessDate = shiftIso(todayIso(), -1);
  try {
    const posted = await postToastDay(businessDate);
    console.log("[Toast GL] posted", posted.doc, "for", businessDate);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/already in QuickBooks|no Toast sales/i.test(message)) {
      console.log("[Toast GL]", businessDate, message);
      return;
    }
    console.error("[Toast GL]", businessDate, message);
    try {
      const to = await noticeRecipients("deposit-mismatch");
      const apiKey = process.env.SENDGRID_API_KEY;
      if (to.length && apiKey) {
        sgMail.setApiKey(apiKey);
        await sgMail.send({
          to,
          from: process.env.SENDGRID_FROM_EMAIL || "email@nashobawinery.com",
          subject: `Toast journal was not posted for ${businessDate}`,
          text: `${businessDate} was not posted beside Shogo. ${message}`,
          html: `<p>${businessDate} was not posted beside Shogo. ${message}</p>`,
        });
      }
    } catch (mailError) {
      console.error("[Toast GL] notice was not sent:", mailError instanceof Error ? mailError.message : mailError);
    }
  }
}

function scheduleToastGlPost() {
  const scheduleNext = () => {
    const now = new Date();
    const target = new Date();
    target.setUTCHours(7, 0, 0, 0);
    if (now >= target) target.setUTCDate(target.getUTCDate() + 1);
    const wait = target.getTime() - now.getTime();
    console.log(`[Toast GL] Next journal posts at ${target.toLocaleString("en-US", { timeZone: "America/New_York" })} Eastern`);
    setTimeout(() => {
      postYesterdayToastJournal().finally(scheduleNext);
    }, wait);
  };
  scheduleNext();
}

export function initToastDepositCheck() {
  const run = () => {
    const through = shiftIso(todayIso(), -3);
    ensureToastDepositAccount().catch((error) => console.error("[Toast deposits] account:", error instanceof Error ? error.message : error));
    reviewDeposits(through, 8)
      .then(async (rows) => {
        let booked: string[] = [];
        try {
          booked = await bookTimingAdjustments(rows);
        } catch (error) {
          console.error("[Toast deposits] adjustment was not booked:", error instanceof Error ? error.message : error);
        }
        const result = await emailDepositMismatches(rows, booked);
        try {
          await emailOutstandingDeposits();
        } catch (error) {
          console.error("[Toast deposits] outstanding notice was not sent:", error instanceof Error ? error.message : error);
        }
        return result;
      })
      .then((result) => console.log("[Toast deposits]", result.sent ? `emailed ${result.dates?.join(", ")}` : result.reason))
      .catch((error) => console.error("[Toast deposits]", error instanceof Error ? error.message : error));
  };
  setTimeout(run, 90_000);
  setInterval(run, 24 * 60 * 60 * 1000);
  scheduleToastGlPost();
}

export async function postToastDay(businessDate: string) {
  const day = await booksForDate(businessDate);
  if (!day.canPost) throw new Error(day.postBlock || "This date already has our journal.");
  const doc = `TOAST-${businessDate.replace(/-/g, "")}`.slice(0, 21);
  const existing = await queryQuickBooks(`SELECT Id FROM JournalEntry WHERE DocNumber = '${doc}'`);
  if ((existing.data?.QueryResponse?.JournalEntry ?? []).length) {
    throw new Error(`${doc} is already in QuickBooks for this date.`);
  }
  const shogo = day.shogoJournals.map((journal) => journal.doc).join(", ");
  const entry = await postQuickBooks("/journalentry", {
    TxnDate: businessDate,
    DocNumber: doc,
    PrivateNote: shogo
      ? `Toast sales for POS date ${businessDate}. Our journal, posted beside Shogo ${shogo} so the two can be compared. Delete one.`
      : `Toast sales for POS date ${businessDate}.`,
    Line: day.ourEntry.map((line) => ({
      Amount: money(Math.abs(line.cents)),
      Description: `Toast ${businessDate}`,
      DetailType: "JournalEntryLineDetail",
      JournalEntryLineDetail: {
        PostingType: line.cents > 0 ? "Debit" : "Credit",
        AccountRef: { value: line.accountId },
        ...(line.classId ? { ClassRef: { value: line.classId } } : {}),
      },
    })),
  });
  return { id: entry?.JournalEntry?.Id, doc, lines: day.ourEntry.length, mode: day.mode };
}

export function toastBooksFault(error: unknown) {
  return qbFault(error);
}

export async function outstandingDeposits(through: string) {
  const end = /^\d{4}-\d{2}-\d{2}$/.test(through) ? through : todayIso();
  const start = shiftIso(end, -44);
  const journals = await queryRows<{
    Id: string;
    DocNumber?: string;
    PrivateNote?: string;
    TxnDate?: string;
    Line?: { Amount?: number; Description?: string; JournalEntryLineDetail?: { PostingType?: string } }[];
  }>("JournalEntry", `TxnDate >= '${start}' AND TxnDate <= '${shiftIso(end, 2)}'`);

  const byDate = new Map<string, { cash: number; card: number; doc: string }>();
  const seen = new Set<string>();
  for (const journal of journals) {
    if (seen.has(journal.Id)) continue;
    seen.add(journal.Id);
    const doc = journal.DocNumber || "";
    if (doc.startsWith("TDLY-")) continue;
    const note = journal.PrivateNote || "";
    const lines = journal.Line || [];
    const noteDate = note.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || "";
    const docMatch = doc.match(/^(\d{2})(\d{2})(\d{2})toast/i);
    const docDate = docMatch ? `20${docMatch[1]}-${docMatch[2]}-${docMatch[3]}` : "";
    const businessDate = noteDate || docDate;
    if (!businessDate || businessDate < start || businessDate > end) continue;
    let cash = 0;
    let card = 0;
    for (const line of lines) {
      if (line.JournalEntryLineDetail?.PostingType !== "Debit") continue;
      const description = line.Description || "";
      if (/cash deposit/i.test(description)) cash += centsOf(line.Amount);
      if (/toast cc deposit/i.test(description)) card += centsOf(line.Amount);
    }
    if (!cash && !card) continue;
    const current = byDate.get(businessDate) || { cash: 0, card: 0, doc };
    current.cash += cash;
    current.card += card;
    byDate.set(businessDate, current);
  }

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS accounting_toast_deposit_clears (
      id varchar PRIMARY KEY,
      business_date varchar NOT NULL,
      kind varchar NOT NULL,
      amount numeric NOT NULL,
      deposited_on varchar NOT NULL,
      created_at timestamp DEFAULT now()
    )
  `);
  const cleared = await db.execute(sql`SELECT business_date, kind FROM accounting_toast_deposit_clears`);
  const clearedKeys = new Set((cleared.rows as { business_date: string; kind: string }[]).map((row) => `${row.business_date}|${row.kind}`));
  const cardSince = shiftIso(end, -4);
  const cash: { date: string; amount: number; doc: string }[] = [];
  const card: { date: string; amount: number; doc: string }[] = [];
  byDate.forEach((value, date) => {
    if (value.cash && !clearedKeys.has(`${date}|cash`)) cash.push({ date, amount: money(value.cash), doc: value.doc });
    if (value.card && date >= cardSince && !clearedKeys.has(`${date}|card`)) card.push({ date, amount: money(value.card), doc: value.doc });
  });
  cash.sort((left, right) => right.date.localeCompare(left.date));
  card.sort((left, right) => right.date.localeCompare(left.date));
  return {
    cash,
    card,
    cashTotal: money(cash.reduce((sum, row) => sum + centsOf(row.amount), 0)),
    cardTotal: money(card.reduce((sum, row) => sum + centsOf(row.amount), 0)),
  };
}

export async function clearDeposits(dates: string[], depositedOn: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(depositedOn)) throw new Error("Choose the date the cash was taken to the bank.");
  const unique = dates.filter((date, index) => /^\d{4}-\d{2}-\d{2}$/.test(date) && dates.indexOf(date) === index);
  if (!unique.length) throw new Error("Choose at least one cash deposit.");
  const report = await outstandingDeposits(todayIso());
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS accounting_toast_deposit_clears (
      id varchar PRIMARY KEY,
      business_date varchar NOT NULL,
      kind varchar NOT NULL,
      amount numeric NOT NULL,
      deposited_on varchar NOT NULL,
      created_at timestamp DEFAULT now()
    )
  `);
  for (const date of unique) {
    const row = report.cash.find((item) => item.date === date);
    if (!row) continue;
    const existing = await db.execute(sql`SELECT id FROM accounting_toast_deposit_clears WHERE business_date = ${date} AND kind = 'cash' LIMIT 1`);
    if ((existing.rows as { id: string }[]).length) continue;
    await db.execute(sql`
      INSERT INTO accounting_toast_deposit_clears (id, business_date, kind, amount, deposited_on)
      VALUES (${randomUUID()}, ${date}, 'cash', ${row.amount}, ${depositedOn})
    `);
  }
  return outstandingDeposits(todayIso());
}

export function registerToastSalesRoutes(router: Router) {
  const isAdmin = requirePlatformRole(["super_admin"]);

  router.get("/toast-sales", isAdmin, async (req, res) => {
    try {
      res.json(await reviewToastDay(String(req.query.date || "")));
    } catch (error) {
      res.status(500).json({ message: qbFault(error) });
    }
  });

  router.get("/toast-sales/scan", isAdmin, async (req, res) => {
    try {
      const days = Number(req.query.days || 7);
      res.json(await scanToastDays(String(req.query.through || ""), days));
    } catch (error) {
      res.status(500).json({ message: qbFault(error) });
    }
  });

  router.get("/toast-sales/deposits", isAdmin, async (req, res) => {
    try {
      const days = Number(req.query.days || 7);
      res.json(await reviewDeposits(String(req.query.through || ""), days));
    } catch (error) {
      res.status(500).json({ message: qbFault(error) });
    }
  });

  router.get("/toast-sales/notices", isAdmin, async (_req, res) => {
    try {
      res.json({ notices: await toastNotices() });
    } catch (error) {
      res.status(500).json({ message: qbFault(error) });
    }
  });

  router.put("/toast-sales/notices", isAdmin, async (req, res) => {
    try {
      res.json({ notices: await saveToastNotices(req.body?.notices || {}) });
    } catch (error) {
      res.status(400).json({ message: qbFault(error) });
    }
  });

  router.get("/toast-sales/outstanding", isAdmin, async (req, res) => {
    try {
      res.json(await outstandingDeposits(String(req.query.through || "")));
    } catch (error) {
      res.status(500).json({ message: qbFault(error) });
    }
  });

  router.post("/toast-sales/outstanding/clear", isAdmin, async (req, res) => {
    try {
      const dates = Array.isArray(req.body?.dates) ? req.body.dates.map((date: unknown) => String(date)) : [];
      res.json(await clearDeposits(dates, String(req.body?.depositedOn || "")));
    } catch (error) {
      res.status(400).json({ message: qbFault(error) });
    }
  });

  router.post("/toast-sales/post", isAdmin, async (req, res) => {
    try {
      res.json(await postToastDay(String(req.body?.date || "")));
    } catch (error) {
      res.status(400).json({ message: qbFault(error) });
    }
  });
}
