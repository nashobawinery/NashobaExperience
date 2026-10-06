import { randomUUID } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { Router } from "express";
import sgMail from "@sendgrid/mail";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { fetchSalesCategories, getCashEntries, getOrder, getOrdersByBusinessDate, getRestaurants, toastApiRequest } from "./reactivation/toast-api";
import { postQuickBooks, queryQuickBooks } from "./quickbooks-routes";
import { requirePlatformRole } from "./platformAuth";

type MapRow = { kind: string; name: string; account: string; className: string };
type SettingRow = { setting: string; value: string };
const mappingPath = path.join(process.cwd(), "server/data/shogo-mapping.json");
let mapping = JSON.parse(readFileSync(mappingPath, "utf8")) as { memoRule?: string; general?: SettingRow[]; accounting?: SettingRow[]; rows: MapRow[] };
type Bucket = { kind: string; name: string; cents: number };
type Account = { id: string; name: string; full: string; number: string };
type ClassRef = { id: string; name: string; full: string };
type ExpectedLine = { accountId: string; accountName: string; classId: string; className: string; cents: number };
type JournalLine = { accountId: string; classId: string; cents: number };

const OPEN_YEAR = "2026-01-01";
const PENNY_LIMIT = 100;
const DEPOSIT_MATCH_CENTS = 5;

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

function applyCashDrawer(buckets: Map<string, Bucket>, entries: { amount?: number; type?: string; reason?: string }[]) {
  let applied = 0;
  for (const entry of entries || []) {
    const amount = centsOf(entry.amount);
    if (!amount) continue;
    const type = String(entry.type || "").toUpperCase();
    const reason = String(entry.reason || "");
    if (type === "NO_SALE" || type === "CLOSE_OUT_EXACT") continue;
    if (type === "CASH_COLLECTED" && !/undo tip out/i.test(reason)) continue;
    if (type === "TIP_OUT" && /undo cash collected/i.test(reason)) continue;

    if (type === "PAY_OUT" || type === "UNDO_PAY_OUT" || type === "DRIVER_REIMBURSEMENT") {
      add(buckets, "PAYOUT", "Payouts", -amount);
      add(buckets, "CASH", "Cash Deposit", amount);
    } else if (type === "TIP_OUT" || (type === "CASH_COLLECTED" && /undo tip out/i.test(reason))) {
      add(buckets, "PAYOUTTIPS", "Tip Payouts", -amount);
      add(buckets, "CASH", "Cash Deposit", amount);
    } else if ((type === "CASH_IN" && /undo cash out/i.test(reason)) || (type === "CASH_OUT" && !/undo cash in/i.test(reason))) {
      add(buckets, "CASHINDRAWER", "Cash in Drawer", -amount);
      add(buckets, "CASH", "Cash Deposit", amount);
    } else if (type === "CASH_IN" || (type === "CASH_OUT" && /undo cash in/i.test(reason))) {
      add(buckets, "PAIDIN", "Payins", amount);
      add(buckets, "CASH", "Cash Deposit", amount);
    } else if (type === "CLOSE_OUT_OVERAGE" || type === "CLOSE_OUT_SHORTAGE") {
      add(buckets, "OVERSHORT", "Cash Over/Short", -amount);
      add(buckets, "CASH", "Cash Deposit", amount);
    } else {
      continue;
    }
    applied += 1;
  }
  return applied;
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

const DEPOSIT_LIABILITY = "Payment Exceptions";

function dayStamp(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

function bookPayment(buckets: Map<string, Bucket>, payment: { type?: string; amount?: number; tipAmount?: number; originalProcessingFee?: number; cardType?: string; otherPayment?: { name?: string; guid?: string } }, alternatePayments: Map<string, string>, creditTip = true) {
  const paid = centsOf(payment.amount) + centsOf(payment.tipAmount);
  const tip = centsOf(payment.tipAmount);
  const type = String(payment.type || "").toUpperCase();
  if (type === "CREDIT") {
    const processingFee = Math.min(Math.max(0, centsOf(payment.originalProcessingFee)), Math.max(paid, 0));
    if (paid - processingFee) add(buckets, "CREDIT", `${payment.cardType || "Card"} (Credit)`, paid - processingFee);
    if (processingFee) add(buckets, "OTHERTENDER", "Toast CC Fees", processingFee);
  } else if (type === "CASH") add(buckets, "CASH", "Cash Deposit", paid);
  else if (type === "GIFTCARD") add(buckets, "OTHERTENDER", "Gift Card", paid);
  else if (type === "HOUSE_ACCOUNT" || type === "HOUSEACCOUNT") add(buckets, "OTHERTENDER", "House Account", paid);
  else add(buckets, "OTHERTENDER", payment.otherPayment?.name || alternatePayments.get(String(payment.otherPayment?.guid || "")) || "Other", paid);
  if (tip && creditTip) add(buckets, "SERVICECHARGE", "Tips", tip);
}

async function applyDepositsCollected(buckets: Map<string, Bucket>, restaurantGuid: string, businessDate: string, alternatePayments: Map<string, string>, seenPayments: Set<string>) {
  const today = dayStamp(businessDate);
  const listed = await toastApiRequest(`/orders/v2/payments?paidBusinessDate=${today}`, restaurantGuid);
  const guids = (Array.isArray(listed) ? listed : [])
    .map((item: string | { guid?: string }) => (typeof item === "string" ? item : item?.guid || ""))
    .filter((guid: string) => guid && !seenPayments.has(guid));
  const orders = new Map<string, { businessDate?: number | string; voided?: boolean; deleted?: boolean }>();
  for (let index = 0; index < guids.length; index += 6) {
    await Promise.all(guids.slice(index, index + 6).map(async (guid) => {
      const payment = await toastApiRequest(`/orders/v2/payments/${guid}`, restaurantGuid);
      if (!payment || payment.voidInfo || payment.paymentStatus === "VOIDED" || payment.paymentStatus === "DENIED") return;
      if (dayStamp(payment.paidBusinessDate) !== today) return;
      const type = String(payment.type || "").toUpperCase();
      if (type !== "CREDIT" && type !== "CASH") return;
      const orderGuid = String(payment.orderGuid || "");
      if (!orderGuid) return;
      let order = orders.get(orderGuid);
      if (!order) {
        order = await getOrder(restaurantGuid, orderGuid);
        orders.set(orderGuid, order);
      }
      if (!order || order.voided || order.deleted) return;
      const orderDay = dayStamp(order.businessDate);
      if (!orderDay || orderDay <= today) return;
      const paid = centsOf(payment.amount) + centsOf(payment.tipAmount);
      bookPayment(buckets, payment, alternatePayments, false);
      add(buckets, "OTHERTENDER", DEPOSIT_LIABILITY, -paid);
    }));
  }
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
  let cashEntries = 0;
  let openChecks = 0;
  let cashDrawerWarning = "";
  for (const restaurant of restaurants) {
    const categories = new Map<string, string>();
    for (const category of await fetchSalesCategories(restaurant.restaurantGuid)) {
      if (category?.guid && category?.name) categories.set(String(category.guid), String(category.name));
    }
    const alternatePayments = new Map<string, string>();
    try {
      const types = await toastApiRequest("/config/v2/alternatePaymentTypes", restaurant.restaurantGuid);
      for (const type of types || []) {
        if (type?.guid && type?.name) alternatePayments.set(String(type.guid), String(type.name));
      }
    } catch (error) {
      console.warn(`[Toast DSR] alternate payments ${restaurant.restaurantGuid}: ${error instanceof Error ? error.message : error}`);
    }
    const seenPayments = new Set<string>();
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
          const itemTaxes: { name?: string; taxAmount?: number; amount?: number }[] = [];
          for (const selection of check.selections || []) {
            if (selection.voided) continue;
            const quantity = selection.quantity || 1;
            const gross = selection.preDiscountPrice != null ? centsOf(selection.preDiscountPrice) : centsOf((selection.price || 0) * quantity);
            const category = selection.salesCategory?.name || categories.get(String(selection.salesCategory?.guid || "")) || "Unassigned";
            if (gross) add(buckets, "DEPSALE", category, gross);
            for (const discount of selection.appliedDiscounts || []) {
              if (discount.processingState === "VOID" || discount.processingState === "PENDING_VOID") continue;
              add(buckets, "DISCOUNT", discount.name || "Discount", centsOf(discount.nonTaxableDiscountAmount || discount.discountAmount));
            }
            for (const tax of selection.appliedTaxes || []) itemTaxes.push(tax);
          }
          for (const discount of check.appliedDiscounts || []) {
            if (discount.processingState === "VOID" || discount.processingState === "PENDING_VOID") continue;
            add(buckets, "DISCOUNT", discount.name || "Discount", centsOf(discount.nonTaxableDiscountAmount || discount.discountAmount));
          }
          for (const charge of check.appliedServiceCharges || []) {
            if (charge.voided) continue;
            add(buckets, "SERVICECHARGE", charge.name || (charge.gratuity ? "Tips" : "Service charge"), centsOf(charge.chargeAmount));
          }
          const taxes = (check.appliedTaxes || []).length ? check.appliedTaxes : itemTaxes;
          if (taxes.length) {
            for (const tax of taxes) add(buckets, "TAX", tax.name || "Sales Tax", centsOf(tax.taxAmount || tax.amount));
          } else if (check.taxAmount) {
            add(buckets, "TAX", "All Taxes", centsOf(check.taxAmount));
          }
          let tendered = 0;
          const orderDay = dayStamp(order.businessDate || businessDate);
          for (const payment of check.payments || []) {
            if (payment.voidInfo || payment.paymentStatus === "VOIDED" || payment.paymentStatus === "DENIED") continue;
            if (payment.guid) seenPayments.add(String(payment.guid));
            const paid = centsOf(payment.amount) + centsOf(payment.tipAmount);
            tendered += centsOf(payment.amount);
            const paidDay = dayStamp(payment.paidBusinessDate) || orderDay;
            const type = String(payment.type || "").toUpperCase();
            if (paidDay < orderDay && (type === "CREDIT" || type === "CASH")) {
              add(buckets, "OTHERTENDER", DEPOSIT_LIABILITY, paid);
              if (centsOf(payment.tipAmount)) add(buckets, "SERVICECHARGE", "Tips", centsOf(payment.tipAmount));
              continue;
            }
            bookPayment(buckets, payment, alternatePayments);
          }
          if (String(check.paymentStatus || "").toUpperCase() === "OPEN") {
            const due = centsOf(check.totalAmount);
            if (due > tendered) openChecks += due - tendered;
          }
        }
      }
      page += 1;
      if (batch.length < 100) hasMore = false;
    }
    await applyDepositsCollected(buckets, restaurant.restaurantGuid, businessDate, alternatePayments, seenPayments);
    try {
      cashEntries += applyCashDrawer(buckets, await getCashEntries(restaurant.restaurantGuid, businessDate));
    } catch (error) {
      cashDrawerWarning = "Toast did not return the cash drawer, so payins, payouts, and the drawer close are not on this day.";
      console.warn(`[Toast DSR] ${restaurant.restaurantGuid}: ${error instanceof Error ? error.message : error}`);
    }
  }
  if (openChecks > 0 && Math.abs(mappedImbalance(buckets) + openChecks) <= PENNY_LIMIT) {
    add(buckets, "OTHERTENDER", "Open Checks", openChecks);
  } else {
    openChecks = 0;
  }
  const list: Bucket[] = [];
  buckets.forEach((bucket) => list.push(bucket));
  return { orders, buckets: list, cashEntries, openChecks, cashDrawerWarning };
}

function fallbackKind(kind: string) {
  if (kind === "DEPSALE") return "ALLSALES";
  if (kind === "DISCOUNT") return "ALLDISCOUNTS";
  if (kind === "TAX") return "ALLTAX";
  if (kind === "CREDIT") return "ALLCREDIT";
  return "";
}

function signedCents(kind: string, amount: number) {
  if (kind === "DEPSALE" || kind === "ALLSALES" || kind === "SERVICECHARGE" || kind === "TAX" || kind === "ALLTAX" || kind === "PAIDIN") return -amount;
  return amount;
}

function mappedImbalance(buckets: Map<string, Bucket>) {
  let total = 0;
  buckets.forEach((bucket) => {
    const row = findRow(bucket.kind, bucket.name, fallbackKind(bucket.kind));
    if (!row) return;
    total += signedCents(row.kind, bucket.cents);
  });
  return total;
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

  const bankEarly = accounts.find((account) => account.number.replace(/\s/g, "") === "100000")
    || accounts.find((account) => norm(account.name).includes("clinton savings"));
  let cardExpectedCents = 0;
  let cashExpectedCents = 0;
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
    if (bankEarly && account.id === bankEarly.id) {
      if (bucket.kind === "CASH" || /cash deposit/i.test(bucket.name)) cashExpectedCents += bucket.cents;
      else cardExpectedCents += bucket.cents;
    }
    const key = `${account.id}|${classRef?.id || ""}`;
    const current = expected.get(key);
    if (current) current.cents += signed;
    else expected.set(key, { accountId: account.id, accountName: account.full, classId: classRef?.id || "", className: classRef?.full || row.className, cents: signed });
  });

  const drawerNotes = [
    toast.cashEntries ? "Payins, payouts, tip payouts, and the drawer close from Toast are included." : "",
    toast.openChecks ? `Unpaid checks of ${money(toast.openChecks).toFixed(2)} are on Open Checks.` : "",
    toast.cashDrawerWarning,
  ].filter(Boolean);
  let plugNote = drawerNotes.join(" ");
  if (imbalance !== 0 && Math.abs(imbalance) <= PENNY_LIMIT) {
    const overShort = mapping.rows.find((row) => row.kind === "OVERSHORT");
    const account = overShort ? resolveAccount(accounts, overShort.account) : null;
    if (account) {
      const key = `${account.id}|`;
      const current = expected.get(key);
      if (current) current.cents -= imbalance;
      else expected.set(key, { accountId: account.id, accountName: account.full, classId: "", className: "", cents: -imbalance });
      const pennyNote = `Toast's day was ${money(imbalance).toFixed(2)} out of balance. That amount is parked in cash over/short.`;
      plugNote = plugNote ? `${plugNote} ${pennyNote}` : pennyNote;
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
    if (doc.startsWith("TDLY-") || doc.startsWith("TDLC-")) continue;
    const memo = (journal.PrivateNote || "").toLowerCase();
    const journalLines = journal.Line || [];
    const isOurs = (doc.startsWith("TOAST-") || doc.startsWith("TFIX-")) && businessDateFromDoc(doc, journal.PrivateNote || "", journal.TxnDate || "") === businessDate;
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
  let cardRecordedCents = 0;
  let cashRecordedCents = 0;
  for (const journal of journalRows) {
    const doc = journal.DocNumber || "";
    const chosen = shogoJournals.length ? shogoJournals.some((item) => item.id === journal.Id) : ourJournals.some((item) => item.id === journal.Id);
    if (!chosen || doc.startsWith("TDLY-") || doc.startsWith("TDLC-")) continue;
    for (const line of journal.Line || []) {
      if (line.JournalEntryLineDetail?.PostingType !== "Debit") continue;
      const description = line.Description || "";
      if (/cash deposit/i.test(description)) cashRecordedCents += centsOf(line.Amount);
      if (/toast cc deposit/i.test(description)) cardRecordedCents += centsOf(line.Amount);
    }
  }

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
    cardExpected: money(cardExpectedCents),
    cashExpected: money(cashExpectedCents),
    cardRecorded: money(cardRecordedCents),
    cashRecorded: money(cashRecordedCents),
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
    cardExpected: day.cardExpected,
    cashExpected: day.cashExpected,
    cardRecorded: day.cardRecorded,
    cashRecorded: day.cashRecorded,
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

type DepositGap = { accountName: string; className: string; salesPosting: number; depositJournal: number; difference: number };
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
  cardJournal: number;
  cardDeposit: number;
  cashJournal: number;
  cashDeposit: number;
  gaps: DepositGap[];
  splitsLabeled: boolean;
};

function postingAdjustment(row: DepositRow) {
  const cardGap = centsOf(row.cardDeposit) - centsOf(row.cardJournal);
  if (cardGap > DEPOSIT_MATCH_CENTS) {
    return `Debit the card line on the ${row.date} sales posting ${money(cardGap).toFixed(2)} so it matches the card deposit of ${row.cardDeposit.toFixed(2)}. Sales accounts that differ only by class are the same revenue. Do not adjust those.`;
  }
  if (cardGap >= -DEPOSIT_MATCH_CENTS) return "Sales accounts that differ only by class are the same revenue. Do not adjust those to balance the deposit.";
  const short = Math.abs(cardGap);
  const fees: { accountName: string; cents: number }[] = [];
  const feeTotals = new Map<string, number>();
  row.gaps.forEach((gap) => {
    if (!/fee/i.test(gap.accountName) || gap.difference <= 0) return;
    feeTotals.set(gap.accountName, (feeTotals.get(gap.accountName) || 0) + centsOf(gap.difference));
  });
  feeTotals.forEach((cents, accountName) => {
    if (cents > DEPOSIT_MATCH_CENTS) fees.push({ accountName, cents });
  });
  const feeCents = fees.reduce((sum, fee) => sum + fee.cents, 0);
  const feeText = fees.map((fee) => `${fee.accountName} ${money(fee.cents).toFixed(2)}`).join(" and ");
  const remainder = short - Math.min(feeCents, short);
  if (feeCents > DEPOSIT_MATCH_CENTS && remainder <= DEPOSIT_MATCH_CENTS) {
    return `Credit the card line on the ${row.date} sales posting ${money(short).toFixed(2)} and debit ${feeText}. The fee is why the card deposit of ${row.cardDeposit.toFixed(2)} is lower than the posting. Sales accounts that differ only by class are the same revenue. Do not adjust those.`;
  }
  if (feeCents > DEPOSIT_MATCH_CENTS) {
    return `Credit the card line on the ${row.date} sales posting ${money(short).toFixed(2)} so it matches the card deposit of ${row.cardDeposit.toFixed(2)}. Debit ${feeText} for the fee already on the deposit journal. The remaining ${money(remainder).toFixed(2)} is not that fee and did not arrive with the next deposit. Sales accounts that differ only by class are the same revenue. Do not adjust those.`;
  }
  return `Credit the card line on the ${row.date} sales posting ${money(short).toFixed(2)} so it matches the card deposit of ${row.cardDeposit.toFixed(2)}. Sales accounts that differ only by class are the same revenue. Do not adjust those.`;
}

function emptyDeposit(date: string, orderCount: number, journalDeposit: number, status: DepositRow["status"], note: string): DepositRow {
  return {
    date,
    orderCount,
    journalDeposit,
    depositDate: null,
    bankDeposit: null,
    difference: null,
    status,
    note,
    suggestion: "",
    cardJournal: 0,
    cardDeposit: 0,
    cashJournal: 0,
    cashDeposit: 0,
    gaps: [],
    splitsLabeled: false,
  };
}

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
    const gaps = day.lines.filter((line) => line.difference !== 0 && !/clinton savings|toast deposit in transit/i.test(line.accountName)).map((line) => ({
      accountName: line.accountName,
      className: line.className,
      salesPosting: line.toast,
      depositJournal: line.quickbooks,
      difference: line.difference,
    }));
    const base = {
      cardJournal: day.cardExpected,
      cardDeposit: day.cardRecorded,
      cashJournal: day.cashExpected,
      cashDeposit: day.cashRecorded,
      gaps,
      splitsLabeled: day.cardRecorded !== 0 || day.cashRecorded !== 0 || centsOf(day.bankRecorded) === 0,
    };
    if (!day.orderCount && expected === 0) {
      return { ...emptyDeposit(day.date, 0, 0, "quiet", "No Toast sales."), ...base };
    }
    if (!day.journals.length) {
      return { ...emptyDeposit(day.date, day.orderCount, day.bankExpected, "waiting", "The sales posting is not in QuickBooks yet. The deposit is compared after that posting and the next day, so a charge that slips overnight can be seen."), ...base, journalDeposit: day.bankExpected };
    }
    const recorded = centsOf(day.bankRecorded);
    const difference = recorded - expected;
    const dollars = money(difference);
    const status = Math.abs(difference) <= DEPOSIT_MATCH_CENTS ? "match" as const : "mismatch" as const;
    const note = status === "match"
      ? `The deposit for the ${day.date} sales posting matches.`
      : `The deposit for the ${day.date} sales posting is ${Math.abs(dollars).toFixed(2)} ${dollars < 0 ? "under" : "over"} the posting (${day.bankExpected.toFixed(2)}).`;
    return {
      ...base,
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

  const timingNote = (kind: string, amount: string, shortDate: string, overDate: string) =>
    `The ${kind} deposit of ${amount} belongs to the ${shortDate} sales posting and arrived with the ${overDate} deposit. Debit Toast Deposit in Transit ${amount} on ${shortDate} and credit it on ${overDate}. Do not change the sales accounts.`;

  for (let index = 0; index < rows.length - 1; index += 1) {
    const left = rows[index];
    const right = rows[index + 1];
    if (left.status === "quiet" || right.status === "quiet" || left.status === "waiting" || right.status === "waiting") continue;
    const notes: string[] = [];
    const cardLeft = centsOf(left.cardDeposit) - centsOf(left.cardJournal);
    const cardRight = centsOf(right.cardDeposit) - centsOf(right.cardJournal);
    if (Math.abs(cardLeft) > DEPOSIT_MATCH_CENTS && Math.abs(cardLeft + cardRight) <= DEPOSIT_MATCH_CENTS) {
      const shortDate = cardLeft < 0 ? left.date : right.date;
      const overDate = cardLeft < 0 ? right.date : left.date;
      notes.push(timingNote("card", Math.abs(money(cardLeft)).toFixed(2), shortDate, overDate));
    }
    const cashLeft = centsOf(left.cashDeposit) - centsOf(left.cashJournal);
    const cashRight = centsOf(right.cashDeposit) - centsOf(right.cashJournal);
    if (Math.abs(cashLeft) > DEPOSIT_MATCH_CENTS && Math.abs(cashLeft + cashRight) <= DEPOSIT_MATCH_CENTS) {
      const shortDate = cashLeft < 0 ? left.date : right.date;
      const overDate = cashLeft < 0 ? right.date : left.date;
      notes.push(timingNote("cash", Math.abs(money(cashLeft)).toFixed(2), shortDate, overDate));
    }
    if (!notes.length) continue;
    const suggestion = notes.join(" ");
    left.status = "timing";
    right.status = "timing";
    left.suggestion = [left.suggestion, suggestion].filter(Boolean).join(" ");
    right.suggestion = [right.suggestion, suggestion].filter(Boolean).join(" ");
    left.note = left.suggestion;
    right.note = right.suggestion;
  }

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const next = rows[index + 1];
    if (row.status === "mismatch" && (!next || next.difference == null)) {
      row.status = "waiting";
      row.note = "Waiting on the next deposit. The sales posting is already in, and a charge that slips one day makes this deposit short and the next one over by the same amount.";
      row.suggestion = "";
      continue;
    }
    if (row.status === "waiting" || row.status === "quiet" || row.status === "match") continue;
    const cashShort = centsOf(row.cashDeposit) - centsOf(row.cashJournal);
    const nextCash = next && next.cashDeposit != null ? centsOf(next.cashDeposit) - centsOf(next.cashJournal) : null;
    const cashOffsets = nextCash != null && Math.abs(cashShort) > DEPOSIT_MATCH_CENTS && Math.abs(cashShort + nextCash) <= DEPOSIT_MATCH_CENTS;
    const cashNote = row.splitsLabeled && !cashOffsets && cashShort < -DEPOSIT_MATCH_CENTS
      ? `Cash of ${row.cashJournal.toFixed(2)} on the ${row.date} sales posting is not in the deposit yet (${row.cashDeposit.toFixed(2)} deposited). Leave the sales posting alone until that cash is taken to the bank.`
      : "";
    const adjustment = row.status === "timing" ? "" : postingAdjustment(row);
    const postingNote = adjustment
      ? `To balance the posting: ${adjustment} Do not book this difference to Toast Deposit in Transit.`
      : "";
    const which = row.splitsLabeled
      ? `The deposit that belongs to the ${row.date} sales posting shows cards ${row.cardDeposit.toFixed(2)} against ${row.cardJournal.toFixed(2)} on the posting, and cash ${row.cashDeposit.toFixed(2)} against ${row.cashJournal.toFixed(2)}.`
      : "";
    const suggestion = [which, row.suggestion, cashNote, postingNote].filter(Boolean).join(" ");
    if (suggestion) {
      row.suggestion = suggestion;
      row.note = suggestion;
    }
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
  return asJournalList(existing.data?.QueryResponse?.JournalEntry).length > 0;
}

export async function bookTimingAdjustments(rows: DepositRow[]) {
  const seen = new Set<string>();
  const booked: string[] = [];
  let accounts: Account[] | null = null;
  let timing: Account | null = null;
  let bong: Account | null = null;
  for (let index = 0; index < rows.length - 1; index += 1) {
    const left = rows[index];
    const right = rows[index + 1];
    if (left.status !== "timing" || right.status !== "timing") continue;
    const key = [left.date, right.date].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    const pieces: { cents: number; prefix: string; shortDate: string; overDate: string }[] = [];
    const cardLeft = centsOf(left.cardDeposit) - centsOf(left.cardJournal);
    const cardRight = centsOf(right.cardDeposit) - centsOf(right.cardJournal);
    if (Math.abs(cardLeft) > DEPOSIT_MATCH_CENTS && Math.abs(cardLeft + cardRight) <= DEPOSIT_MATCH_CENTS) {
      pieces.push({
        cents: Math.abs(cardLeft),
        prefix: "TDLY-",
        shortDate: cardLeft < 0 ? left.date : right.date,
        overDate: cardLeft < 0 ? right.date : left.date,
      });
    }
    const cashLeft = centsOf(left.cashDeposit) - centsOf(left.cashJournal);
    const cashRight = centsOf(right.cashDeposit) - centsOf(right.cashJournal);
    if (Math.abs(cashLeft) > DEPOSIT_MATCH_CENTS && Math.abs(cashLeft + cashRight) <= DEPOSIT_MATCH_CENTS) {
      pieces.push({
        cents: Math.abs(cashLeft),
        prefix: "TDLC-",
        shortDate: cashLeft < 0 ? left.date : right.date,
        overDate: cashLeft < 0 ? right.date : left.date,
      });
    }
    if (!pieces.length) continue;
    if (!accounts) {
      accounts = await chartOfAccounts();
      timing = await ensureTimingAccount(accounts);
      bong = resolveAccount(accounts, "(685000) Bong Account - Cash Over Under");
      if (!bong) throw new Error("Bong Account - Cash Over Under is not in QuickBooks.");
    }
    for (const piece of pieces) {
      if (piece.shortDate < OPEN_YEAR || piece.overDate < OPEN_YEAR) continue;
      const amount = money(piece.cents);
      const shortDoc = `${piece.prefix}${piece.shortDate.replace(/-/g, "")}`.slice(0, 21);
      const overDoc = `${piece.prefix}${piece.overDate.replace(/-/g, "")}`.slice(0, 21);
      const held = `Toast deposit timing. ${amount.toFixed(2)} from ${piece.shortDate} is held until ${piece.overDate}. Clinton Savings is not changed.`;
      const cleared = `Toast deposit timing. ${amount.toFixed(2)} from ${piece.shortDate} cleared on ${piece.overDate}. Clinton Savings is not changed.`;
      let posted = false;
      if (!(await journalDocExists(shortDoc))) {
        await postQuickBooks("/journalentry", {
          TxnDate: piece.shortDate,
          DocNumber: shortDoc,
          PrivateNote: held,
          Line: [
            { Amount: amount, Description: held, DetailType: "JournalEntryLineDetail", JournalEntryLineDetail: { PostingType: "Debit", AccountRef: { value: timing!.id } } },
            { Amount: amount, Description: held, DetailType: "JournalEntryLineDetail", JournalEntryLineDetail: { PostingType: "Credit", AccountRef: { value: bong!.id } } },
          ],
        });
        posted = true;
      }
      if (!(await journalDocExists(overDoc))) {
        await postQuickBooks("/journalentry", {
          TxnDate: piece.overDate,
          DocNumber: overDoc,
          PrivateNote: cleared,
          Line: [
            { Amount: amount, Description: cleared, DetailType: "JournalEntryLineDetail", JournalEntryLineDetail: { PostingType: "Debit", AccountRef: { value: bong!.id } } },
            { Amount: amount, Description: cleared, DetailType: "JournalEntryLineDetail", JournalEntryLineDetail: { PostingType: "Credit", AccountRef: { value: timing!.id } } },
          ],
        });
        posted = true;
      }
      if (posted) booked.push(`${piece.shortDate} to ${piece.overDate}`);
    }
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
          content: "You email a bookkeeper when a bank deposit does not match the Toast sales posting. The sales posting is created first and the deposit arrives later. Use only the JSON. Repeat the suggestion's debit or credit and every dollar amount. A card or cash amount that is short on one sales date and over on the next by the same amount belongs to the earlier posting: debit Toast Deposit in Transit on the short date and credit it on the later date, and do not change sales. Cash that is short and not made up the next day stays in the drawer. A fee named in the suggestion is part of the card difference. Do not change a sales account because the class is different. Two to five sentences. Do not invent amounts.",
        },
        {
          role: "user",
          content: JSON.stringify(actionable.map((row) => ({
            date: row.date,
            suggestion: row.suggestion,
            cardOnSalesPosting: row.cardJournal,
            cardOnDeposit: row.cardDeposit,
            cashOnSalesPosting: row.cashJournal,
            cashOnDeposit: row.cashDeposit,
          }))),
        },
      ],
    });
    const text = response.choices[0]?.message?.content?.trim();
    const amounts = fallback.match(/\d+\.\d{2}/g) || [];
    if (!text || amounts.some((amount) => !text.includes(amount))) return fallback;
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
    const posted = await postDueToastJournals();
    console.log("[Toast GL] posted", posted.map((entry) => entry.doc).join(", ") || "nothing new", "through", businessDate);
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

const postingDays = new Map<string, Promise<{ id?: string; doc: string; lines: number; mode: string }>>();

export function postToastDay(businessDate: string) {
  const current = postingDays.get(businessDate);
  if (current) return current;
  const run = postToastDayOnce(businessDate).finally(() => postingDays.delete(businessDate));
  postingDays.set(businessDate, run);
  return run;
}

async function postToastDayOnce(businessDate: string) {
  const day = await booksForDate(businessDate);
  if (!day.canPost) throw new Error(day.postBlock || "This date already has our journal.");
  const doc = `TOAST-${businessDate.replace(/-/g, "")}`.slice(0, 21);
  const existing = await journalsForDoc(doc);
  if (existing.length) {
    throw new Error(`${doc} is already in QuickBooks for this date.`);
  }
  const shogo = day.shogoJournals.map((journal) => journal.doc).join(", ");
  const entry = await postQuickBooks("/journalentry", {
    TxnDate: businessDate,
    DocNumber: doc,
    PrivateNote: shogo
      ? `CT. Toast sales for POS date ${businessDate}. Our journal, posted beside Shogo ${shogo} so the two can be compared. Delete one.`
      : `CT. Toast sales for POS date ${businessDate}.`,
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
  const keeper = await collapseDoc(doc);
  return { id: keeper?.Id || entry?.JournalEntry?.Id, doc, lines: day.ourEntry.length, mode: day.mode };
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
    if (doc.startsWith("TDLY-") || doc.startsWith("TDLC-") || doc.startsWith("TOAST-") || doc.startsWith("TFIX-")) continue;
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

export function toastSalesMapping() {
  return {
    memoRule: mapping.memoRule || "",
    general: mapping.general || [],
    accounting: mapping.accounting || [],
    rows: mapping.rows,
  };
}

export function saveToastSalesMapping(input: unknown) {
  if (!Array.isArray(input)) throw new Error("The mapping was not saved.");
  const edits = input as { kind?: unknown; name?: unknown; account?: unknown; className?: unknown }[];
  mapping = {
    ...mapping,
    rows: mapping.rows.map((row) => {
      const edited = edits.find((item) => item.kind === row.kind && item.name === row.name);
      if (!edited) return row;
      return {
        ...row,
        account: String(edited.account || "").slice(0, 240),
        className: String(edited.className || "").slice(0, 120),
      };
    }),
  };
  writeFileSync(mappingPath, `${JSON.stringify(mapping, null, 2)}\n`);
  return toastSalesMapping();
}

export async function toastBookRefs() {
  const [accounts, classes] = await Promise.all([
    chartOfAccounts(),
    queryRows<{ Id: string; Name: string; FullyQualifiedName?: string }>("Class", "Active IN (true, false)").catch(() => []),
  ]);
  return {
    accounts,
    classes: classes.map((item) => ({ id: item.Id, name: item.Name, full: item.FullyQualifiedName || item.Name })),
  };
}

type StoredJournal = {
  Id: string;
  SyncToken?: string;
  DocNumber?: string;
  TxnDate?: string;
  PrivateNote?: string;
  MetaData?: { CreateTime?: string };
  Line?: {
    Id?: string;
    Amount?: number;
    Description?: string;
    JournalEntryLineDetail?: {
      PostingType?: string;
      AccountRef?: { value?: string; name?: string };
      ClassRef?: { value?: string; name?: string };
    };
  }[];
};

function businessDateFromDoc(doc: string, note: string, txnDate: string) {
  const ours = doc.match(/^TOAST-(\d{4})(\d{2})(\d{2})/i);
  if (ours) return `${ours[1]}-${ours[2]}-${ours[3]}`;
  return note.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || txnDate;
}

function presentSync(journal: StoredJournal) {
  const doc = journal.DocNumber || "";
  const note = journal.PrivateNote || "";
  const lines = (journal.Line || []).flatMap((line) => {
    const detail = line.JournalEntryLineDetail;
    if (!detail?.AccountRef?.value || (detail.PostingType !== "Debit" && detail.PostingType !== "Credit")) return [];
    return [{
      accountId: detail.AccountRef.value,
      accountName: detail.AccountRef.name || detail.AccountRef.value,
      classId: detail.ClassRef?.value || "",
      className: detail.ClassRef?.name || "",
      posting: detail.PostingType,
      amount: Number(line.Amount || 0),
      description: line.Description || "",
    }];
  });
  const debitTotal = lines.filter((line) => line.posting === "Debit").reduce((sum, line) => sum + centsOf(line.amount), 0);
  return {
    id: journal.Id,
    doc,
    txnDate: journal.TxnDate || "",
    businessDate: businessDateFromDoc(doc, note, journal.TxnDate || ""),
    created: journal.MetaData?.CreateTime || "",
    note,
    lineCount: lines.length,
    debitTotal: money(debitTotal),
    source: "CT",
    lines,
  };
}

function asJournalList(value: unknown) {
  if (!value) return [] as StoredJournal[];
  return (Array.isArray(value) ? value : [value]) as StoredJournal[];
}

async function journalsFrom(start: string, end: string, where = `TxnDate >= '${start}' AND TxnDate <= '${end}'`) {
  const rows: StoredJournal[] = [];
  const seen = new Set<string>();
  for (let startPos = 1; startPos <= 6000; startPos += 1000) {
    const page = await queryQuickBooks(`SELECT * FROM JournalEntry WHERE ${where} STARTPOSITION ${startPos} MAXRESULTS 1000`);
    const batch = asJournalList(page.data?.QueryResponse?.JournalEntry);
    for (const journal of batch) {
      if (seen.has(journal.Id)) continue;
      seen.add(journal.Id);
      rows.push(journal);
    }
    if (batch.length < 1000) break;
  }
  return rows;
}

async function ourToastJournals() {
  const end = shiftIso(todayIso(), 2);
  const dated = `TxnDate >= '${OPEN_YEAR}' AND TxnDate <= '${end}'`;
  let journals: StoredJournal[];
  try {
    const [toastDocs, fixDocs] = await Promise.all([
      journalsFrom(OPEN_YEAR, end, `${dated} AND DocNumber LIKE 'TOAST%'`),
      journalsFrom(OPEN_YEAR, end, `${dated} AND DocNumber LIKE 'TFIX%'`),
    ]);
    journals = [...toastDocs, ...fixDocs];
  } catch {
    journals = await journalsFrom(OPEN_YEAR, end);
  }
  const seen = new Set<string>();
  return journals.filter((journal) => {
    if (!journal.Id || seen.has(journal.Id)) return false;
    seen.add(journal.Id);
    const doc = journal.DocNumber || "";
    return doc.startsWith("TOAST-") || doc.startsWith("TFIX-");
  });
}

async function journalsForDoc(doc: string) {
  const page = await queryQuickBooks(`SELECT * FROM JournalEntry WHERE DocNumber = '${doc}'`);
  const journals = asJournalList(page.data?.QueryResponse?.JournalEntry);
  const seen = new Set<string>();
  return journals.filter((journal) => {
    if (!journal.Id || seen.has(journal.Id)) return false;
    seen.add(journal.Id);
    return true;
  });
}

function sameJournal(left: StoredJournal, right: StoredJournal) {
  const a = presentSync(left);
  const b = presentSync(right);
  const debit = (sync: ReturnType<typeof presentSync>) => sync.lines.filter((line) => line.posting === "Debit").reduce((sum, line) => sum + centsOf(line.amount), 0);
  return a.lineCount === b.lineCount && debit(a) === debit(b);
}

async function deleteOurJournal(journal: StoredJournal) {
  await postQuickBooks("/journalentry?operation=delete", { Id: journal.Id, SyncToken: journal.SyncToken });
}

async function collapseDoc(doc: string) {
  const journals = (await journalsForDoc(doc)).filter((journal) => {
    const number = journal.DocNumber || "";
    return number.startsWith("TOAST-") || number.startsWith("TFIX-");
  });
  if (journals.length < 2) return journals[0];
  const ranked = [...journals].sort((left, right) => (left.MetaData?.CreateTime || "").localeCompare(right.MetaData?.CreateTime || "") || Number(left.Id) - Number(right.Id));
  const keeper = ranked[0];
  for (const extra of ranked.slice(1)) {
    if (!sameJournal(keeper, extra)) continue;
    try {
      await deleteOurJournal(extra);
      console.log("[Toast GL] removed duplicate", extra.DocNumber, extra.Id);
    } catch (error) {
      console.error("[Toast GL] duplicate was not removed", extra.Id, qbFault(error));
    }
  }
  return keeper;
}

export async function collapseToastSyncDuplicates() {
  const journals = await ourToastJournals();
  const docs = [...new Set(journals.map((journal) => journal.DocNumber || "").filter(Boolean))];
  const removed: string[] = [];
  for (const doc of docs) {
    const before = journals.filter((journal) => journal.DocNumber === doc).length;
    if (before < 2) continue;
    await collapseDoc(doc);
    const after = (await journalsForDoc(doc)).length;
    if (after < before) removed.push(doc);
  }
  return removed;
}

function datesFrom(start: string, end: string) {
  const dates: string[] = [];
  for (let cursor = start; cursor <= end; cursor = shiftIso(cursor, 1)) dates.push(cursor);
  return dates;
}

export async function postDueToastJournals() {
  await collapseToastSyncDuplicates();
  const journals = await ourToastJournals();
  const posted = new Set(journals.map((journal) => businessDateFromDoc(journal.DocNumber || "", journal.PrivateNote || "", journal.TxnDate || "")));
  const yesterday = shiftIso(todayIso(), -1);
  const known = [...posted].filter((date) => date >= OPEN_YEAR && date <= yesterday).sort();
  const start = known[0] || yesterday;
  const postedEntries: { id?: string; doc: string; lines: number; mode: string }[] = [];
  const failures: string[] = [];
  for (const date of datesFrom(start, yesterday)) {
    if (posted.has(date)) continue;
    try {
      postedEntries.push(await postToastDay(date));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${date}: ${message}`);
      console.error("[Toast GL]", date, message);
    }
  }
  if (!posted.has(yesterday) && failures.some((line) => line.startsWith(yesterday))) {
    throw new Error(failures.find((line) => line.startsWith(yesterday)) || `${yesterday} was not posted.`);
  }
  return postedEntries;
}

export async function listToastSyncs() {
  const journals = await ourToastJournals();
  const counts = new Map<string, number>();
  journals.forEach((journal) => {
    const doc = journal.DocNumber || journal.Id;
    counts.set(doc, (counts.get(doc) || 0) + 1);
  });
  const rows = journals.map((journal) => {
    const row = presentSync(journal);
    return { ...row, lines: undefined, duplicate: (counts.get(row.doc) || 0) > 1, missing: false };
  });
  const postedDates = new Set(rows.map((row) => row.businessDate));
  const earliest = [...postedDates].filter((date) => date >= OPEN_YEAR).sort()[0];
  const yesterday = shiftIso(todayIso(), -1);
  const missing = earliest ? datesFrom(earliest, yesterday).filter((date) => !postedDates.has(date)).map((date) => ({
    id: `missing-${date}`,
    doc: "",
    txnDate: date,
    businessDate: date,
    created: "",
    note: "",
    lineCount: 0,
    debitTotal: 0,
    duplicate: false,
    missing: true,
    source: "",
  })) : [];
  return [...rows, ...missing].sort((left, right) => right.businessDate.localeCompare(left.businessDate) || right.created.localeCompare(left.created));
}

async function loadOurJournal(id: string) {
  if (!/^\d+$/.test(id)) throw new Error("That journal was not found.");
  const page = await queryQuickBooks(`SELECT * FROM JournalEntry WHERE Id = '${id}'`);
  const journal = asJournalList(page.data?.QueryResponse?.JournalEntry)[0];
  if (!journal) throw new Error("That journal was not found.");
  const doc = journal.DocNumber || "";
  if (!doc.startsWith("TOAST-") && !doc.startsWith("TFIX-")) throw new Error("Only a Nashoba daily sales journal can be changed here.");
  return journal;
}

export async function getToastSync(id: string) {
  return presentSync(await loadOurJournal(id));
}

function normalizeSyncLines(input: unknown) {
  if (!Array.isArray(input) || input.length < 2) throw new Error("A journal needs at least two lines.");
  return input.map((line) => {
    const row = line as { accountId?: unknown; classId?: unknown; posting?: unknown; amount?: unknown; description?: unknown };
    const accountId = String(row.accountId || "");
    const classId = String(row.classId || "");
    const posting = row.posting === "Credit" ? "Credit" : row.posting === "Debit" ? "Debit" : "";
    const amount = Math.round(Number(row.amount) * 100) / 100;
    if (!/^\d+$/.test(accountId)) throw new Error("Each line needs an account.");
    if (!posting) throw new Error("Each line needs a debit or a credit.");
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Each line needs an amount greater than zero.");
    if (classId && !/^\d+$/.test(classId)) throw new Error("A class on a line was not recognized.");
    return { accountId, classId, posting: posting as "Debit" | "Credit", amount, description: String(row.description || "").slice(0, 400) };
  });
}

async function replaceJournalLines(id: string, lines: ReturnType<typeof normalizeSyncLines>, note: string) {
  const debit = lines.filter((line) => line.posting === "Debit").reduce((sum, line) => sum + centsOf(line.amount), 0);
  const credit = lines.filter((line) => line.posting === "Credit").reduce((sum, line) => sum + centsOf(line.amount), 0);
  if (debit !== credit) throw new Error(`The journal is out of balance by ${money(Math.abs(debit - credit)).toFixed(2)}.`);
  const journal = await loadOurJournal(id);
  const existingLineIds = (journal.Line || []).flatMap((line) => line.Id ? [line.Id] : []);
  await postQuickBooks("/journalentry", {
    Id: journal.Id,
    SyncToken: journal.SyncToken,
    TxnDate: journal.TxnDate,
    DocNumber: journal.DocNumber,
    PrivateNote: note,
    Line: lines.map((line, index) => ({
      ...(existingLineIds[index] ? { Id: existingLineIds[index] } : {}),
      Amount: line.amount,
      Description: line.description || `Toast ${businessDateFromDoc(journal.DocNumber || "", note, journal.TxnDate || "")}`,
      DetailType: "JournalEntryLineDetail",
      JournalEntryLineDetail: {
        PostingType: line.posting,
        AccountRef: { value: line.accountId },
        ...(line.classId ? { ClassRef: { value: line.classId } } : {}),
      },
    })),
  });
  return getToastSync(id);
}

export async function updateToastSync(id: string, input: unknown) {
  const journal = await loadOurJournal(id);
  const note = journal.PrivateNote || "";
  return replaceJournalLines(id, normalizeSyncLines(input), /^CT\b/i.test(note) ? note : `CT. ${note}`.trim());
}

export async function modernizeToastSync(id: string) {
  const journal = await loadOurJournal(id);
  const businessDate = businessDateFromDoc(journal.DocNumber || "", journal.PrivateNote || "", journal.TxnDate || "");
  const day = await booksForDate(businessDate);
  if (day.unmapped.length) {
    const names = day.unmapped.slice(0, 4).map((item) => item.name).join(", ");
    throw new Error(`The current mapping does not cover ${names}.`);
  }
  const alreadyPosted = Boolean(day.postBlock && /QuickBooks/.test(day.postBlock));
  if (day.postBlock && !alreadyPosted) throw new Error(day.postBlock);
  const balance = day.ourEntry.reduce((sum, line) => sum + line.cents, 0);
  if (!day.ourEntry.length) throw new Error("This date has no Toast sales to post.");
  if (balance !== 0) throw new Error(day.postBlock || `The rebuilt day is out of balance by ${money(balance).toFixed(2)}.`);
  const lines = day.ourEntry.filter((line) => line.cents).map((line) => ({
    accountId: line.accountId,
    classId: line.classId,
    posting: (line.cents > 0 ? "Debit" : "Credit") as "Debit" | "Credit",
    amount: money(Math.abs(line.cents)),
    description: `Toast ${businessDate}`,
  }));
  return replaceJournalLines(id, lines, `CT. Toast sales for POS date ${businessDate}. Updated in place to the current mapping.`);
}

export function registerToastSalesRoutes(router: Router) {
  const isAdmin = requirePlatformRole(["super_admin"]);

  router.get("/toast-sales/mapping", isAdmin, (_req, res) => {
    res.json(toastSalesMapping());
  });

  router.put("/toast-sales/mapping", isAdmin, (req, res) => {
    try {
      res.json(saveToastSalesMapping(req.body?.rows));
    } catch (error) {
      res.status(400).json({ message: qbFault(error) });
    }
  });

  router.get("/toast-sales/accounts", isAdmin, async (_req, res) => {
    try {
      res.json(await toastBookRefs());
    } catch (error) {
      res.status(500).json({ message: qbFault(error) });
    }
  });

  router.get("/toast-sales/syncs", isAdmin, async (_req, res) => {
    try {
      res.json(await listToastSyncs());
    } catch (error) {
      res.status(500).json({ message: qbFault(error) });
    }
  });

  router.get("/toast-sales/syncs/:id", isAdmin, async (req, res) => {
    try {
      res.json(await getToastSync(String(req.params.id || "")));
    } catch (error) {
      res.status(400).json({ message: qbFault(error) });
    }
  });

  router.put("/toast-sales/syncs/:id", isAdmin, async (req, res) => {
    try {
      res.json(await updateToastSync(String(req.params.id || ""), req.body?.lines));
    } catch (error) {
      res.status(400).json({ message: qbFault(error) });
    }
  });

  router.post("/toast-sales/syncs/:id/modernize", isAdmin, async (req, res) => {
    try {
      res.json(await modernizeToastSync(String(req.params.id || "")));
    } catch (error) {
      res.status(400).json({ message: qbFault(error) });
    }
  });

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
