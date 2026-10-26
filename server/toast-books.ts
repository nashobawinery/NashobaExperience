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
type SourcePiece = { name: string; cents: number };
type TenderLane = "" | "cash" | "card";
type ExpectedLine = { accountId: string; accountName: string; classId: string; className: string; cents: number; lane: TenderLane; sources: SourcePiece[] };
type JournalLine = { accountId: string; classId: string; cents: number };
type DepositMovement = {
  customerKey: string;
  customerName: string;
  email: string;
  phone: string;
  businessDate: string;
  visitDate: string;
  direction: "credit" | "debit";
  cents: number;
  memo: string;
  orderGuid: string;
  source: string;
  reservationDate: string;
};

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
const DEPOSITS_COLLECTED = "Deposits Collected";

function isCustomerDepositItem(name: string) {
  return /toast tables deposit|function deposit|banquet deposit|event deposit/i.test(name);
}

function isDepositUse(name: string) {
  return /reservation deposit|deposit redemption|banquet deposit|event deposit/i.test(name);
}

function classifyDeposit(depositGross: number, earlyPrincipal: number, redemptionPrincipal: number) {
  const wash = Math.min(Math.max(depositGross, 0), Math.max(redemptionPrincipal, 0));
  const recognized = Math.min(Math.max(depositGross - wash, 0), Math.max(earlyPrincipal, 0));
  const collected = Math.max(depositGross - wash - recognized, 0);
  return { wash, recognized, collected };
}

function bookDepositPieces(buckets: Map<string, Bucket>, pieces: { gross: number; category: string }[], earlyPrincipal: number, redemptionPrincipal: number) {
  const depositGross = pieces.reduce((sum, piece) => sum + piece.gross, 0);
  const { wash, recognized } = classifyDeposit(depositGross, earlyPrincipal, redemptionPrincipal);
  let remainingWash = wash;
  let remainingRecognized = recognized;
  for (const piece of pieces) {
    let left = piece.gross;
    const pieceWash = Math.min(left, remainingWash);
    remainingWash -= pieceWash;
    left -= pieceWash;
    const pieceRecognized = Math.min(left, remainingRecognized);
    remainingRecognized -= pieceRecognized;
    left -= pieceRecognized;
    if (pieceWash + left) add(buckets, "DEPSALE", DEPOSITS_COLLECTED, pieceWash + left);
    if (pieceRecognized) add(buckets, "DEPSALE", piece.category === "Unassigned" ? "Deposits Recognized" : piece.category, pieceRecognized);
  }
}

function dayStamp(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

function stampToIso(stamp: string) {
  if (!/^\d{8}$/.test(stamp)) return "";
  return `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}`;
}

function easternDay(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^\d{8}$/.test(raw)) return stampToIso(raw);
  if (/[T ]\d/.test(raw)) {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(date);
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  return stampToIso(dayStamp(raw));
}

function depositContext(order: { source?: string; promisedDate?: string; estimatedFulfillmentDate?: string; businessDate?: string | number }, fallback: string) {
  const sourceName = String(order?.source || "");
  const source = /toast tables/i.test(sourceName) ? "Toast Tables" : (sourceName.slice(0, 80) || "Toast");
  const reservationDate = easternDay(order?.promisedDate) || easternDay(order?.estimatedFulfillmentDate) || easternDay(order?.businessDate) || fallback;
  return { source, reservationDate };
}

function tenderLane(kind: string): TenderLane {
  if (kind === "CASH") return "cash";
  if (kind === "CREDIT") return "card";
  return "";
}

function laneFromDescription(description: string): TenderLane {
  if (/cash deposit/i.test(description)) return "cash";
  if (/toast cc deposit/i.test(description)) return "card";
  return "";
}

function lineDetail(lane: TenderLane) {
  if (lane === "cash") return "Cash deposit";
  if (lane === "card") return "Card deposit";
  return "";
}

function journalDescription(lane: TenderLane, businessDate: string) {
  if (lane === "cash") return "Cash deposit";
  if (lane === "card") return "Toast CC deposit";
  return `Toast ${businessDate}`;
}

function addSource(sources: SourcePiece[], name: string, cents: number) {
  const current = sources.find((item) => item.name === name);
  if (current) current.cents += cents;
  else sources.push({ name, cents });
}

function guestIdentity(order: { guid?: string; customer?: { guid?: string; firstName?: string; lastName?: string; email?: string; phone?: string }; tabName?: string; checks?: { customer?: { guid?: string; firstName?: string; lastName?: string; email?: string; phone?: string }; tabName?: string }[] }, check?: { customer?: { guid?: string; firstName?: string; lastName?: string; email?: string; phone?: string }; tabName?: string }) {
  const customer = check?.customer || order.checks?.find((item) => item?.customer)?.customer || order.customer || {};
  const first = String(customer.firstName || "").trim();
  const last = String(customer.lastName || "").trim();
  const email = String(customer.email || "").trim().toLowerCase();
  const phone = String(customer.phone || "").replace(/\D/g, "");
  const name = [first, last].filter(Boolean).join(" ")
    || String(check?.tabName || order.tabName || "").trim()
    || email
    || (phone ? phone : "Unknown guest");
  const key = String(customer.guid || "").trim() || email || (phone ? `phone:${phone}` : `order:${order.guid || name}`);
  return { customerKey: key.slice(0, 180), customerName: name.slice(0, 160), email: email.slice(0, 160), phone: phone.slice(0, 20) };
}

function extraOpenCard(check: { paymentStatus?: string; amount?: number; taxAmount?: number; payments?: { voidInfo?: unknown; paymentStatus?: string; type?: string; amount?: number }[] }, payment: { type?: string; paymentStatus?: string }) {
  if (String(check.paymentStatus || "").toUpperCase() !== "CLOSED") return false;
  if (String(payment.type || "").toUpperCase() !== "CREDIT") return false;
  if (String(payment.paymentStatus || "").toUpperCase() !== "OPEN") return false;
  const due = centsOf(check.amount) + centsOf(check.taxAmount);
  if (due <= 0) return false;
  const captured = (check.payments || []).reduce((sum, item) => {
    if (item.voidInfo || String(item.paymentStatus || "").toUpperCase() !== "CAPTURED") return sum;
    if (String(item.type || "").toUpperCase() !== "CREDIT") return sum;
    return sum + centsOf(item.amount);
  }, 0);
  return captured + 1 >= due;
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

async function applyDepositsCollected(buckets: Map<string, Bucket>, restaurantGuid: string, businessDate: string, alternatePayments: Map<string, string>, seenPayments: Set<string>, movements: DepositMovement[]) {
  const today = dayStamp(businessDate);
  const listed = await toastApiRequest(`/orders/v2/payments?paidBusinessDate=${today}`, restaurantGuid);
  const guids = (Array.isArray(listed) ? listed : [])
    .map((item: string | { guid?: string }) => (typeof item === "string" ? item : item?.guid || ""))
    .filter((guid: string) => guid && !seenPayments.has(guid));
  const orders = new Map<string, Awaited<ReturnType<typeof getOrder>>>();
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
      const visitDate = stampToIso(orderDay) || businessDate;
      const guest = guestIdentity(order);
      const context = depositContext(order, visitDate);
      movements.push({
        ...guest,
        businessDate,
        visitDate,
        reservationDate: context.reservationDate,
        source: context.source,
        direction: "credit",
        cents: paid,
        memo: `Paid for the ${context.reservationDate} visit`,
        orderGuid: orderGuid.slice(0, 80),
      });
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

type CheckBreak = {
  check: string;
  guest: string;
  amount: number;
  status: string;
  tenders: string;
  paidOn: string;
  deposit: number;
  tastings: number | null;
  customerKey: string;
  email: string;
  phone: string;
  source: string;
  reservationDate: string;
  depositNote: string;
};

function unbalancedCheck(
  order: Parameters<typeof guestIdentity>[0] & { businessDate?: string | number; tabName?: string; source?: string; promisedDate?: string; estimatedFulfillmentDate?: string },
  check: {
    displayNumber?: string;
    guid?: string;
    paymentStatus?: string;
    taxAmount?: number;
    tabName?: string;
    customer?: { firstName?: string; lastName?: string };
    selections?: { voided?: boolean; quantity?: number; preDiscountPrice?: number; price?: number; displayName?: string; item?: { name?: string }; appliedDiscounts?: { processingState?: string; nonTaxableDiscountAmount?: number; discountAmount?: number }[]; appliedTaxes?: { taxAmount?: number; amount?: number }[] }[];
    appliedDiscounts?: { processingState?: string; nonTaxableDiscountAmount?: number; discountAmount?: number }[];
    appliedServiceCharges?: { voided?: boolean; chargeAmount?: number }[];
    appliedTaxes?: { taxAmount?: number; amount?: number }[];
    payments?: { voidInfo?: unknown; paymentStatus?: string; amount?: number; tipAmount?: number; paidBusinessDate?: string | number; type?: string; originalProcessingFee?: number; otherPayment?: { name?: string; guid?: string } }[];
  },
  businessDate: string,
  alternatePayments: Map<string, string>,
): CheckBreak | null {
  const creditKinds = new Set(["DEPSALE", "SERVICECHARGE", "TAX"]);
  const signed = (kind: string, amount: number) => (creditKinds.has(kind) ? -amount : amount);
  let net = 0;
  const depositPieces: number[] = [];
  for (const selection of check.selections || []) {
    if (selection.voided) continue;
    const quantity = selection.quantity || 1;
    const gross = selection.preDiscountPrice != null ? centsOf(selection.preDiscountPrice) : centsOf((selection.price || 0) * quantity);
    const itemName = selection.displayName || selection.item?.name || "";
    if (gross && isCustomerDepositItem(itemName)) depositPieces.push(gross);
    else if (gross) net += signed("DEPSALE", gross);
    for (const discount of selection.appliedDiscounts || []) {
      if (discount.processingState === "VOID" || discount.processingState === "PENDING_VOID") continue;
      net += signed("DISCOUNT", centsOf(discount.nonTaxableDiscountAmount || discount.discountAmount));
    }
  }
  for (const discount of check.appliedDiscounts || []) {
    if (discount.processingState === "VOID" || discount.processingState === "PENDING_VOID") continue;
    net += signed("DISCOUNT", centsOf(discount.nonTaxableDiscountAmount || discount.discountAmount));
  }
  for (const charge of check.appliedServiceCharges || []) {
    if (charge.voided) continue;
    net += signed("SERVICECHARGE", centsOf(charge.chargeAmount));
  }
  const itemTaxes = (check.selections || []).flatMap((selection) => selection.voided ? [] : (selection.appliedTaxes || []));
  const taxes = (check.appliedTaxes || []).length ? check.appliedTaxes || [] : itemTaxes;
  if (taxes.length) {
    for (const tax of taxes) net += signed("TAX", centsOf(tax.taxAmount || tax.amount));
  } else if (check.taxAmount) net += signed("TAX", centsOf(check.taxAmount));
  const orderDay = dayStamp(order.businessDate || businessDate);
  let earlyPrincipal = 0;
  let redemptionPrincipal = 0;
  const paymentBits: string[] = [];
  const paidOn: string[] = [];
  for (const payment of check.payments || []) {
    if (payment.voidInfo || payment.paymentStatus === "VOIDED" || payment.paymentStatus === "DENIED") continue;
    if (extraOpenCard(check, payment)) continue;
    const paid = centsOf(payment.amount) + centsOf(payment.tipAmount);
    const tip = centsOf(payment.tipAmount);
    const paidDay = dayStamp(payment.paidBusinessDate) || orderDay;
    const type = String(payment.type || "").toUpperCase();
    const tender = payment.otherPayment?.name || alternatePayments.get(String(payment.otherPayment?.guid || "")) || type || "Other";
    if (paidDay !== orderDay) paidOn.push(stampToIso(paidDay));
    paymentBits.push(`${tender} ${money(paid).toFixed(2)}`);
    if (paidDay < orderDay && (type === "CREDIT" || type === "CASH")) {
      earlyPrincipal += centsOf(payment.amount);
      net += signed("OTHERTENDER", paid);
      if (tip) net += signed("SERVICECHARGE", tip);
      continue;
    }
    if (isDepositUse(tender)) redemptionPrincipal += centsOf(payment.amount);
    if (type === "CREDIT") {
      const processingFee = Math.min(Math.max(0, centsOf(payment.originalProcessingFee)), Math.max(paid, 0));
      net += signed("CREDIT", paid - processingFee);
      if (processingFee) net += signed("OTHERTENDER", processingFee);
    } else if (type === "CASH") net += signed("CASH", paid);
    else net += signed("OTHERTENDER", paid);
    if (tip) net += signed("SERVICECHARGE", tip);
  }
  const depositGross = depositPieces.reduce((sum, piece) => sum + piece, 0);
  const { wash, recognized } = classifyDeposit(depositGross, earlyPrincipal, redemptionPrincipal);
  let remainingWash = wash;
  let remainingRecognized = recognized;
  for (const gross of depositPieces) {
    let left = gross;
    const pieceWash = Math.min(left, remainingWash);
    remainingWash -= pieceWash;
    left -= pieceWash;
    const pieceRecognized = Math.min(left, remainingRecognized);
    remainingRecognized -= pieceRecognized;
    left -= pieceRecognized;
    if (pieceWash + left) net += signed("DEPSALE", pieceWash + left);
    if (pieceRecognized) net += signed("DEPSALE", pieceRecognized);
  }
  if (!net) return null;
  const tastings = redemptionPrincipal > 0 && net > 0 && Math.abs(net - redemptionPrincipal) <= 1 && net % 2000 === 0 ? net / 2000 : null;
  const guest = guestIdentity(order, check);
  const context = depositContext(order, stampToIso(orderDay) || businessDate);
  return {
    check: String(check.displayNumber || check.guid || ""),
    guest: guest.customerName,
    amount: money(net),
    status: String(check.paymentStatus || ""),
    tenders: paymentBits.join("; "),
    paidOn: paidOn.filter((day, index) => day && paidOn.indexOf(day) === index).join(", "),
    deposit: money(redemptionPrincipal),
    tastings,
    customerKey: guest.customerKey,
    email: guest.email,
    phone: guest.phone,
    source: context.source,
    reservationDate: context.reservationDate,
    depositNote: "",
  };
}

async function toastBuckets(businessDate: string) {
  const buckets = new Map<string, Bucket>();
  const movements: DepositMovement[] = [];
  const breaks: CheckBreak[] = [];
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
          const depositPieces: { gross: number; category: string }[] = [];
          for (const selection of check.selections || []) {
            if (selection.voided) continue;
            const quantity = selection.quantity || 1;
            const gross = selection.preDiscountPrice != null ? centsOf(selection.preDiscountPrice) : centsOf((selection.price || 0) * quantity);
            const itemName = selection.displayName || selection.item?.name || "";
            const category = selection.salesCategory?.name || categories.get(String(selection.salesCategory?.guid || "")) || "Unassigned";
            if (gross && isCustomerDepositItem(itemName)) depositPieces.push({ gross, category });
            else if (gross && category === "Unassigned") add(buckets, "DEPSALE", "Unassigned Sales", gross);
            else if (gross) add(buckets, "DEPSALE", category, gross);
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
          let earlyPrincipal = 0;
          let earlyPaid = 0;
          let redemptionPrincipal = 0;
          let redemptionPaid = 0;
          const orderDay = dayStamp(order.businessDate || businessDate);
          for (const payment of check.payments || []) {
            if (payment.voidInfo || payment.paymentStatus === "VOIDED" || payment.paymentStatus === "DENIED") continue;
            if (extraOpenCard(check, payment)) continue;
            if (payment.guid) seenPayments.add(String(payment.guid));
            const paid = centsOf(payment.amount) + centsOf(payment.tipAmount);
            tendered += centsOf(payment.amount);
            const paidDay = dayStamp(payment.paidBusinessDate) || orderDay;
            const type = String(payment.type || "").toUpperCase();
            if (paidDay < orderDay && (type === "CREDIT" || type === "CASH")) {
              earlyPrincipal += centsOf(payment.amount);
              earlyPaid += paid;
              add(buckets, "OTHERTENDER", DEPOSIT_LIABILITY, paid);
              if (centsOf(payment.tipAmount)) add(buckets, "SERVICECHARGE", "Tips", centsOf(payment.tipAmount));
              continue;
            }
            const tender = payment.otherPayment?.name || alternatePayments.get(String(payment.otherPayment?.guid || "")) || "Other";
            if (isDepositUse(tender)) {
              redemptionPrincipal += centsOf(payment.amount);
              redemptionPaid += paid;
            }
            bookPayment(buckets, payment, alternatePayments);
          }
          bookDepositPieces(buckets, depositPieces, earlyPrincipal, redemptionPrincipal);
          const depositGross = depositPieces.reduce((sum, piece) => sum + piece.gross, 0);
          const { wash, collected } = classifyDeposit(depositGross, earlyPrincipal, redemptionPrincipal);
          const guest = guestIdentity(order, check);
          const visitDate = stampToIso(orderDay) || businessDate;
          const context = depositContext(order, visitDate);
          const orderGuid = String(order.guid || "").slice(0, 80);
          const held = collected + Math.max(0, wash - redemptionPaid);
          const used = earlyPaid + Math.max(0, redemptionPaid - wash);
          const gap = unbalancedCheck(order, check, businessDate, alternatePayments);
          if (gap) breaks.push(gap);
          if (held > 0) {
            movements.push({ ...guest, businessDate, visitDate, reservationDate: context.reservationDate, source: context.source, direction: "credit", cents: held, memo: "Deposit collected", orderGuid });
          }
          if (used > 0 && !gap?.tastings) {
            movements.push({ ...guest, businessDate, visitDate, reservationDate: context.reservationDate, source: context.source, direction: "debit", cents: used, memo: "Deposit used", orderGuid });
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
    await applyDepositsCollected(buckets, restaurant.restaurantGuid, businessDate, alternatePayments, seenPayments, movements);
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
  let ledgerSaved = true;
  try {
    await saveGuestDepositDay(businessDate, movements);
  } catch (error) {
    ledgerSaved = false;
    console.error("[Toast deposits] customer ledger was not saved:", error instanceof Error ? error.message : error);
  }
  breaks.sort((left, right) => Math.abs(right.amount) - Math.abs(left.amount));
  return { orders, buckets: list, cashEntries, openChecks, cashDrawerWarning, movements, ledgerSaved, breaks };
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
    const lane = tenderLane(bucket.kind);
    imbalance += signed;
    if (bankEarly && account.id === bankEarly.id) {
      if (lane === "cash") cashExpectedCents += bucket.cents;
      else cardExpectedCents += bucket.cents;
    }
    const key = `${account.id}|${classRef?.id || ""}|${lane}`;
    const current = expected.get(key);
    if (current) {
      current.cents += signed;
      addSource(current.sources, bucket.name, signed);
    } else {
      expected.set(key, { accountId: account.id, accountName: account.full, classId: classRef?.id || "", className: classRef?.full || row.className, cents: signed, lane, sources: [{ name: bucket.name, cents: signed }] });
    }
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
      const key = `${account.id}||`;
      const current = expected.get(key);
      if (current) {
        current.cents -= imbalance;
        addSource(current.sources, "Penny balance", -imbalance);
      } else expected.set(key, { accountId: account.id, accountName: account.full, classId: "", className: "", cents: -imbalance, lane: "", sources: [{ name: "Penny balance", cents: -imbalance }] });
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
      const key = `${detail.AccountRef.value}|${detail.ClassRef?.value || ""}|${laneFromDescription(line.Description || "")}`;
      const current = target.get(key);
      if (current) current.cents += signed;
      else target.set(key, { accountId: detail.AccountRef.value, classId: detail.ClassRef?.value || "", cents: signed });
    }
  }
  const shogoJournals = journals.filter((journal) => journal.source === "shogo");
  const ourJournals = journals.filter((journal) => journal.source === "ours");
  const actual = ourJournals.length ? ourActual : shogoActual;
  let cardRecordedCents = 0;
  let cashRecordedCents = 0;
  for (const journal of journalRows) {
    const doc = journal.DocNumber || "";
    const chosen = ourJournals.length ? ourJournals.some((item) => item.id === journal.Id) : shogoJournals.some((item) => item.id === journal.Id);
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

  const lines: { accountName: string; className: string; detail: string; toast: number; quickbooks: number; difference: number; accountId: string; classId: string; correction: number; sources: { name: string; amount: number }[] }[] = [];
  const seen = new Set<string>();
  expected.forEach((line, key) => {
    seen.add(key);
    const qb = actual.get(key)?.cents || 0;
    if (!line.cents && !qb) return;
    lines.push({
      accountName: line.accountName,
      className: line.className,
      detail: lineDetail(line.lane),
      toast: money(-line.cents),
      quickbooks: money(-qb),
      difference: money(-(line.cents - qb)),
      accountId: line.accountId,
      classId: line.classId,
      correction: line.cents - qb,
      sources: line.sources
        .filter((source) => source.cents)
        .map((source) => ({ name: source.name, amount: money(-source.cents) }))
        .sort((left, right) => Math.abs(right.amount) - Math.abs(left.amount)),
    });
  });
  actual.forEach((line, key) => {
    if (seen.has(key) || !line.cents) return;
    const account = accounts.find((item) => item.id === line.accountId);
    const classRef = classes.find((item) => item.id === line.classId);
    const lane = key.split("|")[2] === "cash" || key.split("|")[2] === "card" ? key.split("|")[2] as TenderLane : "";
    lines.push({
      accountName: account?.full || line.accountId,
      className: classRef?.full || "",
      detail: lineDetail(lane),
      toast: 0,
      quickbooks: money(-line.cents),
      difference: money(line.cents),
      accountId: line.accountId,
      classId: line.classId,
      correction: -line.cents,
      sources: [],
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

  const ourEntry: { accountId: string; classId: string; cents: number; description: string }[] = [];
  expected.forEach((line) => {
    if (line.cents) ourEntry.push({ accountId: line.accountId, classId: line.classId, cents: line.cents, description: journalDescription(line.lane, businessDate) });
  });
  const entryBalance = ourEntry.reduce((sum, line) => sum + line.cents, 0);
  const correction = lines.filter((line) => line.correction !== 0);
  const hasOurs = ourJournals.some((journal) => journal.doc.startsWith("TOAST-"));
  const otherDocs = shogoJournals.map((journal) => journal.doc).join(", ");
  let postBlock: string | null = null;
  if (businessDate < OPEN_YEAR) postBlock = "A 2025 or earlier day is not posted.";
  else if (unmapped.length) postBlock = "A Toast category or account in the mapping could not be matched, so nothing was posted.";
  else if (imbalance !== 0) postBlock = `Toast's day is out of balance by ${money(imbalance).toFixed(2)}. The missing piece has to be identified before it is posted.`;
  else if (entryBalance !== 0) postBlock = `The entry is out of balance by ${money(entryBalance).toFixed(2)}.`;
  else if (hasOurs) postBlock = otherDocs
    ? `QuickBooks has this day's journal and ${otherDocs}. Remove ${otherDocs} so the day is not recorded twice.`
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
      detail: line.detail,
      toast: line.toast,
      quickbooks: line.quickbooks,
      difference: line.difference,
      sources: line.sources,
    })),
    unmapped,
    plugNote,
    matched: (hasOurs || shogoJournals.length > 0) && correction.length === 0 && !unmapped.length && !imbalance,
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
    breaks: toast.breaks,
  };
}

function fallbackFinding(day: Awaited<ReturnType<typeof booksForDate>>) {
  const ours = day.ourJournals.map((journal) => journal.doc).join(", ");
  const other = day.shogoJournals.map((journal) => journal.doc).join(", ");
  if (day.ourJournals.length && day.shogoJournals.length) {
    const gap = day.lines.find((line) => line.difference !== 0);
    if (!gap) return `${day.date}: ${ours} is posted. QuickBooks also has ${other}. Remove ${other} so the day is not recorded twice.`;
    const where = gap.className ? `${gap.accountName}, class ${gap.className}` : gap.accountName;
    return `${day.date}: ${ours} is posted, and QuickBooks also has ${other}. The largest difference is ${gap.difference.toFixed(2)} on ${where}. Remove the extra journal so the day is not recorded twice.`;
  }
  if (day.matched) return `${day.date} matches the journal in QuickBooks.`;
  if (day.unmapped.length) {
    const names = day.unmapped.slice(0, 4).map((item) => `${item.name} (${item.amount.toFixed(2)})`).join(", ");
    return `${day.date} has Toast items that are not in the mapping: ${names}.`;
  }
  if (!day.shogoJournals.length && !day.ourJournals.length) {
    if (day.postBlock) return `${day.date}: ${day.postBlock}`;
    return `${day.date} is not posted yet. Toast balances, so this day can be posted.`;
  }
  const gap = day.lines.find((line) => line.difference !== 0);
  if (!gap) return day.postBlock || `${day.date} needs a look.`;
  const where = gap.className ? `${gap.accountName}, class ${gap.className}` : gap.accountName;
  if (other && !ours) return `${day.date} is off by ${gap.difference.toFixed(2)} on ${where}. QuickBooks still has ${other}. This day's journal is not posted yet.`;
  return `${day.date} is off by ${gap.difference.toFixed(2)} on ${where}.`;
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
            journals: day.journals.map((journal) => ({ doc: journal.doc })),
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

const TASTING_ACCOUNT = "(3052010) *Retail Sales:Tours & Tastings";
const GIFT_ACCOUNT = "(2120001) Gift Cards Outstanding";

type DayRecommendation = {
  title: string;
  detail: string;
  amount: number | null;
  account: string;
  kind: string;
  toastKind: string;
  name: string;
};

type DayAdvice = {
  summary: string;
  recommendations: DayRecommendation[];
  checks: CheckBreak[];
};

function suggestedAccount(name: string) {
  if (/gift|certificate/i.test(name)) return GIFT_ACCOUNT;
  return "";
}

export function buildDayAdvice(input: {
  date: string;
  canPost: boolean;
  postBlock: string | null;
  unmapped: { kind: string; name: string; amount: number }[];
  checks: CheckBreak[];
}): DayAdvice {
  const checks = input.checks.filter((item) => Math.abs(item.amount) >= 1);
  const recommendations: DayRecommendation[] = [];
  for (const item of input.unmapped) {
    const account = suggestedAccount(item.name);
    recommendations.push({
      title: account ? `Map ${item.name}` : `Choose an account for ${item.name}`,
      detail: account
        ? `${item.name} was used for ${item.amount.toFixed(2)} and has no account. Use ${account}, the same account as Gift Card. Save that mapping, then check this date again.`
        : `${item.name} was used for ${item.amount.toFixed(2)} and has no account. Choose the QuickBooks account, save the mapping, then check this date again.`,
      amount: item.amount,
      account,
      kind: "map",
      toastKind: item.kind,
      name: item.name,
    });
  }
  const tastings = checks.filter((item) => item.tastings);
  const otherDeposits = checks.filter((item) => !item.tastings && item.deposit > 0);
  const otherChecks = checks.filter((item) => !item.tastings && item.deposit <= 0);
  if (tastings.length) {
    const total = tastings.reduce((sum, item) => sum + item.amount, 0);
    const count = tastings.reduce((sum, item) => sum + (item.tastings || 0), 0);
    recommendations.push({
      title: "Credit these deposits to tours and tastings",
      detail: `${tastings.length} open checks used a reservation deposit and have no item on the check. The amounts are multiples of 20.00, ${count} guests, totaling ${total.toFixed(2)}. A pair is a tasting and a larger party is a tour. Credit ${TASTING_ACCOUNT} for that amount. Each guest is listed below.`,
      amount: Math.round(total * 100) / 100,
      account: TASTING_ACCOUNT,
      kind: "tasting",
      toastKind: "",
      name: "",
    });
  }
  for (const item of otherDeposits) {
    recommendations.push({
      title: `Deposit on check ${item.check} has no sale`,
      detail: `${item.guest} used a ${item.deposit.toFixed(2)} deposit on check ${item.check}${item.paidOn ? `, paid on ${item.paidOn}` : ""}. No item was rung, and the amount is not a 20.00 tasting. Confirm what was served before choosing a sales account.`,
      amount: item.amount,
      account: "",
      kind: "deposit",
      toastKind: "",
      name: item.check,
    });
  }
  for (const item of otherChecks.slice(0, 8)) {
    recommendations.push({
      title: `Check ${item.check} is off by ${Math.abs(item.amount).toFixed(2)}`,
      detail: `${item.guest || "This check"} is ${item.status || "open"} and does not balance. Payments: ${item.tenders || "none"}.`,
      amount: item.amount,
      account: "",
      kind: "check",
      toastKind: "",
      name: item.check,
    });
  }
  const summary = recommendations.length
    ? recommendations.map((item) => item.detail).join(" ")
    : input.canPost
      ? `${input.date} balances and can be posted.`
      : input.postBlock || `${input.date} needs a look.`;
  return { summary, recommendations, checks };
}

function adviceAmounts(advice: DayAdvice) {
  const amounts = new Set<string>();
  const add = (value: number | null | undefined) => {
    if (value == null || !Number.isFinite(value)) return;
    amounts.add(Math.abs(value).toFixed(2));
  };
  advice.recommendations.forEach((item) => add(item.amount));
  advice.checks.forEach((item) => {
    add(item.amount);
    add(item.deposit);
    if (item.tastings) add(item.tastings * 20);
  });
  add(advice.checks.reduce((sum, item) => sum + item.amount, 0));
  add(advice.checks.reduce((sum, item) => sum + item.deposit, 0));
  return amounts;
}

async function explainDayAdvice(day: Awaited<ReturnType<typeof booksForDate>>): Promise<DayAdvice> {
  const advice = buildDayAdvice({
    date: day.date,
    canPost: day.canPost,
    postBlock: day.postBlock,
    unmapped: day.unmapped,
    checks: day.breaks,
  });
  if (!advice.recommendations.length) return advice;
  try {
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: "You explain a Toast sales day to a winery bookkeeper. Use only the JSON. Write a summary of two to four sentences. Name the business date, each dollar amount that blocks posting, and the account when one is supplied. A deposit that is a multiple of 20.00 with no item on the check is a tour or a tasting: say to credit 3052010 Tours & Tastings, including a larger party. An unmapped gift certificate uses 2120001 Gift Cards Outstanding. Do not invent guests, checks, or amounts.",
        },
        {
          role: "user",
          content: JSON.stringify({
            date: day.date,
            postBlock: day.postBlock,
            recommendations: advice.recommendations.map((item) => ({ title: item.title, detail: item.detail, amount: item.amount, account: item.account })),
            checks: advice.checks.slice(0, 20).map((item) => ({ check: item.check, guest: item.guest, amount: item.amount, deposit: item.deposit, tastings: item.tastings, paidOn: item.paidOn, status: item.status })),
          }),
        },
      ],
    });
    const summary = response.choices[0]?.message?.content?.trim() || "";
    const known = adviceAmounts(advice);
    const used = summary.match(/\d+\.\d{2}/g) || [];
    if (summary && used.every((amount) => known.has(amount))) advice.summary = summary;
  } catch (error) {
    console.warn("[Toast DSR] advice was not written:", error instanceof Error ? error.message : error);
  }
  return advice;
}

function publicDay(day: Awaited<ReturnType<typeof booksForDate>>, finding: string, advice: DayAdvice) {
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
    breaks: day.breaks,
    advice,
  };
}

const dayTalk = new Map<string, { at: number; day: ReturnType<typeof publicDay> }>();

export async function reviewToastDay(businessDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(businessDate)) throw new Error("Choose a business date.");
  const day = await booksForDate(businessDate);
  const advice = await explainDayAdvice(day);
  const plan = await matchTastingDeposits(day.breaks, businessDate, []);
  noteTastingDeposits(advice, plan);
  const finding = advice.recommendations.length ? advice.summary : await explainGap(day);
  const reviewed = publicDay(day, finding, advice);
  dayTalk.set(businessDate, { at: Date.now(), day: reviewed });
  return reviewed;
}

type DayChoice = {
  action: "post" | "credit-tastings" | "map" | "ask-manager";
  label: string;
  detail: string;
  kind: string;
  name: string;
  account: string;
};

type OpenGuestDeposit = {
  customerKey: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  reservationDate: string;
  amount: number;
};

type TastingDepositMatch = {
  check: string;
  checkGuest: string;
  amount: number;
  customerKey: string;
  customerName: string;
  email: string;
  phone: string;
  source: string;
  reservationDate: string;
  how: "name" | "amount" | "group" | "named";
};

type AmbiguousTasting = {
  amount: number;
  checks: { check: string; guest: string }[];
  guests: { name: string; reservationDate: string; amount: number }[];
};

type TastingDepositPlan = {
  matches: TastingDepositMatch[];
  ambiguous: AmbiguousTasting[];
  ledgerFrom: string;
  ledgerThrough: string;
  ledgerDays: number;
};

function guestNameKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function unknownGuestName(value: string) {
  const name = guestNameKey(value);
  return !name || name === "unknown guest";
}

function sameGuestName(left: string, right: string) {
  const a = guestNameKey(left);
  const b = guestNameKey(right);
  if (!a || !b || unknownGuestName(left) || unknownGuestName(right)) return false;
  if (a === b) return true;
  const aParts = a.split(" ");
  const bParts = b.split(" ");
  return aParts.length >= 2 && bParts.length >= 2 && aParts[0] === bParts[0] && aParts[aParts.length - 1] === bParts[bParts.length - 1];
}

function mentionsGuest(messages: { role: string; content: string }[], name: string) {
  const parts = guestNameKey(name).split(" ").filter((part) => part.length > 2);
  if (!parts.length) return false;
  const hay = ` ${messages.filter((item) => item.role === "user").map((item) => guestNameKey(item.content)).join(" ")} `;
  if (parts.length >= 2) return parts.every((part) => hay.includes(` ${part} `));
  return parts[0].length >= 4 && hay.includes(` ${parts[0]} `);
}

function tastingGuestSentence(plan: TastingDepositPlan) {
  const parts: string[] = [];
  if (!plan.ledgerDays) {
    parts.push("The guest deposit list has not been read from Toast yet. Open Guest deposits and choose Update from Toast so these checks can be tied to a guest.");
  } else if (plan.matches.length) {
    parts.push(`Open guest deposits that match: ${plan.matches.map((item) => `${item.customerName} ${item.amount.toFixed(2)}`).join(", ")}. Crediting tours and tastings reduces those deposits.`);
  }
  for (const group of plan.ambiguous) {
    const shown = group.guests.slice(0, 12);
    const names = shown.map((item) => item.name).join(", ");
    const extra = group.guests.length > shown.length ? `, and ${group.guests.length - shown.length} more` : "";
    parts.push(`${group.checks.length} checks of ${group.amount.toFixed(2)} match more than one open deposit: ${names}${extra}. Those stay open until you name the guest.`);
  }
  if (plan.ledgerDays && !plan.matches.length && !plan.ambiguous.length) {
    parts.push(`No open guest deposit matches these amounts. The saved guest list runs from ${plan.ledgerFrom || "the first saved day"} through ${plan.ledgerThrough || "the last saved day"}.`);
  }
  return parts.join(" ");
}

function tastingGuestReply(plan: TastingDepositPlan) {
  const parts = ["These open checks are round tasting amounts, so the open guest deposits were searched."];
  const sentence = tastingGuestSentence(plan);
  if (sentence) parts.push(sentence);
  parts.push("Press the button to credit Tours & Tastings and post the day. Each guest named here is reduced by the same dollars, so the guest list stays in balance with the journal.");
  return parts.join(" ");
}

function noteTastingDeposits(advice: DayAdvice, plan: TastingDepositPlan) {
  const named = new Map<string, TastingDepositMatch>();
  for (const match of plan.matches) {
    if (match.how === "group") continue;
    named.set(`${match.check}|${match.amount.toFixed(2)}`, match);
  }
  for (const item of advice.checks) {
    if (!item.tastings) continue;
    const match = named.get(`${item.check}|${item.amount.toFixed(2)}`);
    if (match) item.depositNote = `Reduce ${match.customerName}'s deposit and credit Tours & Tastings`;
    else if (plan.ambiguous.some((group) => group.amount.toFixed(2) === item.amount.toFixed(2))) item.depositNote = "More than one guest has an open deposit for this amount";
    else if (plan.matches.some((row) => row.how === "group" && row.amount.toFixed(2) === item.amount.toFixed(2))) item.depositNote = "Credit Tours & Tastings and reduce the open guest deposits of this amount";
  }
  const sentence = tastingGuestSentence(plan);
  if (!sentence) return;
  const tasting = advice.recommendations.find((item) => item.kind === "tasting");
  if (tasting) tasting.detail = `${tasting.detail} ${sentence}`;
  if (advice.summary) advice.summary = `${advice.summary} ${sentence}`;
}

async function openRoundDeposits(through: string) {
  await ensureGuestDepositTables();
  const coverage = await db.execute(sql`
    SELECT MIN(business_date) AS start_date, MAX(business_date) AS through, COUNT(*)::int AS days
    FROM accounting_guest_deposit_days
  `);
  const span = (coverage.rows[0] || {}) as { start_date?: string; through?: string; days?: number };
  const result = await db.execute(sql`
    SELECT customer_key,
      COALESCE(NULLIF(reservation_date, ''), visit_date) AS reservation_date,
      MAX(customer_name) AS customer_name,
      MAX(NULLIF(email, '')) AS email,
      MAX(NULLIF(phone, '')) AS phone,
      MAX(NULLIF(source, '')) AS source,
      SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END) AS credits,
      SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END) AS debits
    FROM accounting_guest_deposit_ledger
    GROUP BY customer_key, COALESCE(NULLIF(reservation_date, ''), visit_date)
  `);
  const reconciled = await db.execute(sql`SELECT customer_key, reservation_date FROM accounting_guest_deposit_reconciles`);
  const done = new Set((reconciled.rows as { customer_key: string; reservation_date: string }[]).map((row) => `${row.customer_key}|${row.reservation_date}`));
  const deposits = (result.rows as { customer_key: string; reservation_date: string; customer_name: string; email: string | null; phone: string | null; source: string | null; credits: string; debits: string }[])
    .map((row) => {
      const credits = ledgerAmount(row.credits);
      const debits = ledgerAmount(row.debits);
      return {
        customerKey: row.customer_key,
        name: row.customer_name,
        email: row.email || "",
        phone: row.phone || "",
        source: row.source || "Toast",
        reservationDate: row.reservation_date,
        amount: ledgerAmount(credits - debits),
      };
    })
    .filter((row) => row.reservationDate >= OPEN_YEAR && row.reservationDate <= through && row.amount >= 20 && centsOf(row.amount) % 2000 === 0 && !done.has(`${row.customerKey}|${row.reservationDate}`))
    .sort((left, right) => left.reservationDate.localeCompare(right.reservationDate) || left.name.localeCompare(right.name));
  return {
    from: span.start_date || "",
    through: span.through || "",
    days: Number(span.days || 0),
    deposits,
  };
}

function takeDeposit(pool: (OpenGuestDeposit & { used: boolean })[], deposit: OpenGuestDeposit & { used: boolean }, check: CheckBreak, how: TastingDepositMatch["how"], matches: TastingDepositMatch[]) {
  deposit.used = true;
  matches.push({
    check: check.check,
    checkGuest: check.guest,
    amount: deposit.amount,
    customerKey: deposit.customerKey,
    customerName: deposit.name,
    email: deposit.email,
    phone: deposit.phone,
    source: deposit.source,
    reservationDate: deposit.reservationDate,
    how,
  });
}

async function matchTastingDeposits(checks: CheckBreak[], businessDate: string, messages: { role: string; content: string }[]): Promise<TastingDepositPlan> {
  const empty: TastingDepositPlan = { matches: [], ambiguous: [], ledgerFrom: "", ledgerThrough: "", ledgerDays: 0 };
  const tastings = checks.filter((item) => item.tastings && Math.abs(item.amount) >= 1);
  if (!tastings.length) return empty;
  const open = await openRoundDeposits(businessDate);
  const pool = open.deposits.map((item) => ({ ...item, used: false }));
  const matches: TastingDepositMatch[] = [];
  const remaining = new Set(tastings.map((_, index) => index));
  const claim = (index: number, deposit: OpenGuestDeposit & { used: boolean }, how: TastingDepositMatch["how"]) => {
    remaining.delete(index);
    takeDeposit(pool, deposit, tastings[index], how, matches);
  };
  tastings.forEach((check, index) => {
    const deposit = pool.find((item) => !item.used && centsOf(item.amount) === centsOf(check.amount) && sameGuestName(check.guest, item.name));
    if (deposit) claim(index, deposit, "name");
  });
  for (const deposit of pool) {
    if (deposit.used || !mentionsGuest(messages, deposit.name)) continue;
    const indexes = Array.from(remaining).filter((index) => centsOf(tastings[index].amount) === centsOf(deposit.amount));
    if (indexes.length) claim(indexes[0], deposit, "named");
  }
  const amounts = new Set<number>();
  remaining.forEach((index) => amounts.add(centsOf(tastings[index].amount)));
  pool.forEach((item) => { if (!item.used) amounts.add(centsOf(item.amount)); });
  const ambiguous: AmbiguousTasting[] = [];
  const amountList = Array.from(amounts).sort((left, right) => left - right);
  for (const cents of amountList) {
    const checkIndexes = Array.from(remaining).filter((index) => centsOf(tastings[index].amount) === cents);
    const deposits = pool.filter((item) => !item.used && centsOf(item.amount) === cents);
    if (!checkIndexes.length || !deposits.length) continue;
    if (deposits.length <= checkIndexes.length) {
      deposits.forEach((deposit, index) => claim(checkIndexes[index], deposit, deposits.length === 1 ? "amount" : "group"));
      continue;
    }
    ambiguous.push({
      amount: money(cents),
      checks: checkIndexes.map((index) => ({ check: tastings[index].check, guest: tastings[index].guest })),
      guests: deposits.map((item) => ({ name: item.name, reservationDate: item.reservationDate, amount: item.amount })),
    });
  }
  return { matches, ambiguous, ledgerFrom: open.from, ledgerThrough: open.through, ledgerDays: open.days };
}

async function applyTastingDepositUses(businessDate: string, doc: string, matches: TastingDepositMatch[]) {
  await ensureGuestDepositTables();
  const applied: string[] = [];
  for (const match of matches) {
    const prior = await db.execute(sql`
      SELECT id FROM accounting_guest_deposit_reconciles
      WHERE customer_key = ${match.customerKey} AND reservation_date = ${match.reservationDate}
      LIMIT 1
    `);
    if (prior.rows.length) continue;
    const memo = `Reservation date passed. Tasting on ${businessDate} check ${match.check}. Journal ${doc}`.slice(0, 200);
    await db.execute(sql`
      INSERT INTO accounting_guest_deposit_reconciles (id, customer_key, reservation_date, amount, journal_doc, guest_name)
      VALUES (${randomUUID()}, ${match.customerKey}, ${match.reservationDate}, ${match.amount}, ${doc}, ${match.customerName})
    `);
    await db.execute(sql`
      INSERT INTO accounting_guest_deposit_ledger (
        id, business_date, visit_date, customer_key, customer_name, email, phone, direction, amount, memo, order_guid, source, reservation_date
      ) VALUES (
        ${randomUUID()},
        ${businessDate},
        ${match.reservationDate},
        ${match.customerKey},
        ${match.customerName},
        ${match.email},
        ${match.phone},
        'debit',
        ${match.amount},
        ${memo},
        '',
        ${match.source},
        ${match.reservationDate}
      )
    `);
    applied.push(`${match.customerName} ${match.amount.toFixed(2)}`);
  }
  if (!applied.length) return "No open guest deposit was reduced.";
  return `Guest deposits reduced: ${applied.join(", ")}.`;
}

function dayChoices(day: ReturnType<typeof publicDay>, plan: TastingDepositPlan): DayChoice[] {
  const choices: DayChoice[] = [];
  const other = day.journals.filter((journal) => journal.source === "shogo").map((journal) => journal.doc).join(", ");
  if (day.canPost) {
    choices.push({
      action: "post",
      label: "Post this day",
      detail: other
        ? `${day.date} balances and can be posted. QuickBooks also has ${other}. Remove that journal after this one is posted so the day is not recorded twice.`
        : `${day.date} balances and can be posted.`,
      kind: "",
      name: "",
      account: "",
    });
  }
  const gap = day.postBlock?.match(/out of balance by (\d+\.\d{2})/);
  const tastings = day.breaks.filter((item) => item.tastings && Math.abs(item.amount) >= 1);
  const credit = tastings.reduce((sum, item) => sum + centsOf(item.amount), 0);
  if (gap && credit > 0 && centsOf(gap[1]) === credit) {
    const guests = tastings.reduce((sum, item) => sum + (item.tastings || 0), 0);
    const guestsFound = tastingGuestSentence(plan);
    choices.push({
      action: "credit-tastings",
      label: plan.matches.length ? "Credit tours and tastings and reduce these guest deposits" : "Credit tours and tastings, then post",
      detail: `${tastings.length} open checks, ${guests} guests, total ${money(credit).toFixed(2)}. Crediting Tours & Tastings for that amount lets this day post. ${guestsFound}`.trim(),
      kind: "",
      name: "",
      account: TASTING_ACCOUNT,
    });
  }
  for (const item of day.unmapped) {
    const account = suggestedAccount(item.name);
    if (!account) continue;
    choices.push({
      action: "map",
      label: `Use ${account}`,
      detail: `${item.name} for ${item.amount.toFixed(2)} has no account. Saving it to ${account} uses that account the next time this date is checked.`,
      kind: item.kind,
      name: item.name,
      account,
    });
  }
  choices.push({
    action: "ask-manager",
    label: "Email the accounting manager",
    detail: "This day needs the accounting manager. The email includes the date, the reason, and this conversation.",
    kind: "",
    name: "",
    account: "",
  });
  return choices;
}

function cleanTalk(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input.slice(-12).flatMap((item) => {
    const row = item as { role?: unknown; content?: unknown };
    const role = row.role === "assistant" ? "assistant" as const : row.role === "user" ? "user" as const : "";
    const content = String(row.content || "").trim().slice(0, 1000);
    if (!role || !content) return [];
    return [{ role, content }];
  });
}

function talkFacts(day: ReturnType<typeof publicDay>, choices: DayChoice[], plan: TastingDepositPlan) {
  return {
    date: day.date,
    canPost: day.canPost,
    postBlock: day.postBlock,
    journals: day.journals.map((journal) => ({ doc: journal.doc })),
    unmapped: day.unmapped,
    checks: day.breaks.filter((item) => Math.abs(item.amount) >= 1).slice(0, 15).map((item) => ({
      check: item.check,
      guest: item.guest,
      amount: item.amount,
      status: item.status,
      tenders: item.tenders,
      deposit: item.deposit,
      tastings: item.tastings,
      depositNote: item.depositNote,
    })),
    depositPlan: {
      ledgerDays: plan.ledgerDays,
      ledgerFrom: plan.ledgerFrom,
      ledgerThrough: plan.ledgerThrough,
      matches: plan.matches.map((item) => ({ guest: item.customerName, amount: item.amount, check: item.check, reservationDate: item.reservationDate })),
      ambiguous: plan.ambiguous.map((group) => ({
        amount: group.amount,
        checks: group.checks,
        guests: group.guests.slice(0, 12).map((item) => ({ guest: item.name, amount: item.amount, reservationDate: item.reservationDate })),
      })),
    },
    choices: choices.map((choice) => ({ action: choice.action, name: choice.name, detail: choice.detail })),
  };
}

function knownTalkAmounts(day: ReturnType<typeof publicDay>, choices: DayChoice[], plan: TastingDepositPlan) {
  const amounts = new Set<string>();
  const add = (value: number | string | null | undefined) => {
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed)) return;
    amounts.add(Math.abs(parsed).toFixed(2));
  };
  day.breaks.forEach((item) => {
    add(item.amount);
    add(item.deposit);
  });
  day.unmapped.forEach((item) => add(item.amount));
  choices.forEach((choice) => (choice.detail.match(/\d+\.\d{2}/g) || []).forEach(add));
  plan.matches.forEach((item) => add(item.amount));
  plan.ambiguous.forEach((group) => {
    add(group.amount);
    group.guests.forEach((item) => add(item.amount));
  });
  (day.postBlock?.match(/\d+\.\d{2}/g) || []).forEach(add);
  return amounts;
}

async function emailAccountingManager(day: ReturnType<typeof publicDay>, messages: { role: string; content: string }[]) {
  const to = await noticeRecipients("dsr-manager");
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!to.length || !apiKey) return false;
  const when = longDate(day.date);
  const talk = messages.slice(-8).map((item) => `${item.role === "assistant" ? "Nashoba" : "Staff"}: ${item.content}`).join("\n\n");
  const reason = day.postBlock || "The day could not be corrected from the conversation.";
  sgMail.setApiKey(apiKey);
  await sgMail.send({
    to,
    from: depositMailFrom(),
    subject: `Nashoba Experience: ${when} needs the accounting manager`,
    text: `Nashoba Experience\n\n${when} could not be corrected by the person working on the daily sales report.\n\n${reason}\n\n${talk}\n\nLog in at ${appHome()}/accounting, open DSR, and check ${day.date}.`,
    html: `<div style="font-family:sans-serif;color:#111;max-width:640px;"><div style="background:#7a1f1f;color:#fff;padding:16px 18px;"><div style="font-size:12px;letter-spacing:0.06em;text-transform:uppercase;">Nashoba Experience</div><div style="font-size:18px;font-weight:600;margin-top:4px;">${escapeHtml(when)} needs the accounting manager</div></div><div style="border:1px solid #e7c98a;border-top:none;background:#fff8eb;padding:16px 18px;"><p style="margin:0 0 12px;">${escapeHtml(when)} could not be corrected by the person working on the daily sales report.</p><p style="margin:0 0 12px;">${escapeHtml(reason)}</p><pre style="white-space:pre-wrap;font-family:sans-serif;margin:0 0 12px;">${escapeHtml(talk)}</pre><p style="margin:0;">Log in at ${escapeHtml(appHome())}/accounting, open DSR, and check ${escapeHtml(day.date)}.</p></div></div>`,
  });
  return true;
}

export async function discussToastDay(businessDate: string, input: unknown) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(businessDate)) throw new Error("Choose a business date.");
  const messages = cleanTalk(input);
  if (!messages.some((item) => item.role === "user")) throw new Error("Say what you know about this day.");
  const cached = dayTalk.get(businessDate);
  const day = cached && Date.now() - cached.at < 10 * 60 * 1000 ? cached.day : await reviewToastDay(businessDate);
  const plan = await matchTastingDeposits(day.breaks, businessDate, messages);
  const choices = dayChoices(day, plan);
  const fallbackChoice = day.canPost ? choices.find((choice) => choice.action === "post") : choices.find((choice) => choice.action === "ask-manager");
  const fallback = day.canPost
    ? `${businessDate} balances. Press Post this day when you are ready.`
    : `${day.postBlock || `${businessDate} cannot be corrected from here.`} Ask the accounting manager.`;
  let reply = fallback;
  let action = "none";
  let name = "";
  try {
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You help a winery employee who is not an accountant correct one Toast daily sales day. Use only the JSON facts. Write reply in 2 to 4 short sentences, plain words, no journal instructions they would have to type. Choose action only from choices. Use post only when canPost is true and the person is ready for the journal to be written. Use credit-tastings only when that choice exists and the person agrees those checks are tours or tastings, including when they also want the guest deposits reduced. depositPlan.matches are the open guest deposits that will be reduced by the same dollars. Name those guests and amounts. depositPlan.ambiguous lists amounts that fit more than one guest. Name those guests and say those deposits stay open until the person names the guest. Do not use ask-manager just because the person asked to find the customers. Use map only when that choice exists and the person agrees to that account; set name to the Toast name. Use ask-manager when the missing piece is not one of the choices, and tell them to ask the accounting manager. Use none when you only need another fact, such as which guest an open deposit belongs to. Do not invent guests, checks, or amounts. Return JSON with reply, action, and name.",
        },
        { role: "user", content: JSON.stringify({ facts: talkFacts(day, choices, plan), conversation: messages }) },
      ],
    });
    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}") as { reply?: unknown; action?: unknown; name?: unknown };
    const wanted = String(parsed.action || "none");
    const allowed = choices.find((choice) => choice.action === wanted && (wanted !== "map" || choice.name === String(parsed.name || "")));
    if (wanted === "none") action = "none";
    else if (allowed) {
      action = allowed.action;
      name = allowed.name;
    }
    const text = String(parsed.reply || "").trim();
    const known = knownTalkAmounts(day, choices, plan);
    const used = text.match(/\d+\.\d{2}/g) || [];
    if (text && used.every((amount) => known.has(amount))) reply = text;
  } catch (error) {
    console.warn("[Toast DSR] the day conversation was not written:", error instanceof Error ? error.message : error);
    action = fallbackChoice?.action || "ask-manager";
  }
  const latestUser = [...messages].reverse().find((item) => item.role === "user")?.content || "";
  const askedForGuests = /deposit|guest|customer|find the|who paid|which guest/i.test(latestUser);
  const askedForManager = /accounting manager|email the manager/i.test(latestUser);
  const tastingChoice = choices.find((choice) => choice.action === "credit-tastings");
  if (tastingChoice && askedForGuests && !askedForManager && action === "ask-manager") {
    action = "credit-tastings";
    name = "";
    reply = tastingGuestReply(plan);
  } else if (action === "credit-tastings") {
    const sentence = tastingGuestSentence(plan);
    if (sentence && !/guest deposit/i.test(reply)) reply = `${reply} ${sentence}`;
  }
  const proposal = action === "none" ? null : choices.find((choice) => choice.action === action && (action !== "map" || choice.name === name)) || null;
  return { reply, proposal };
}

export async function applyToastDayChoice(businessDate: string, action: string, name = "", input: unknown = []) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(businessDate)) throw new Error("Choose a business date.");
  const messages = cleanTalk(input);
  const day = await reviewToastDay(businessDate);
  const plan = await matchTastingDeposits(day.breaks, businessDate, messages);
  const choice = dayChoices(day, plan).find((item) => item.action === action && (action !== "map" || item.name === name));
  if (!choice && action === "credit-tastings" && day.ourJournals.some((journal) => journal.doc.startsWith("TOAST-"))) {
    const doc = day.ourJournals.find((journal) => journal.doc.startsWith("TOAST-"))?.doc || "";
    const ledgerNote = await applyTastingDepositUses(businessDate, doc, plan.matches);
    dayTalk.delete(businessDate);
    return { reply: `${doc} is already posted. ${ledgerNote}`, proposal: null };
  }
  if (!choice) throw new Error("That correction is not available for this day.");
  if (choice.action === "post") {
    const posted = await postToastDay(businessDate);
    dayTalk.delete(businessDate);
    return { reply: `Posted ${posted.doc}.`, proposal: null };
  }
  if (choice.action === "credit-tastings") {
    const posted = await postToastDay(businessDate, { creditTastings: true });
    let ledgerNote = "No open guest deposit was reduced.";
    try {
      ledgerNote = await applyTastingDepositUses(businessDate, posted.doc, plan.matches);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Posted ${posted.doc}. The guest deposits were not fully reduced. Do not post this day again. ${message}`);
    }
    dayTalk.delete(businessDate);
    const stillOpen = plan.ambiguous.length ? ` ${tastingGuestSentence({ ...plan, matches: [], ledgerDays: plan.ledgerDays })}` : "";
    return { reply: `Credited Tours & Tastings and posted ${posted.doc}. ${ledgerNote}${stillOpen}`, proposal: null };
  }
  if (choice.action === "map") {
    assignToastSalesName(choice.kind, choice.name, choice.account);
    dayTalk.delete(businessDate);
    return { reply: `${choice.name} now uses ${choice.account}. Check this date again, then post it if it balances.`, proposal: null };
  }
  const emailed = await emailAccountingManager(day, cleanTalk(input));
  return {
    reply: emailed
      ? "Ask the accounting manager. The conversation and the reason were emailed."
      : "Ask the accounting manager. The email could not be sent, so tell them which date you were correcting.",
    proposal: null,
  };
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
    const comparable = day.ourJournals.length > 0 || day.shogoJournals.length > 0;
    const gap = comparable ? day.lines.find((line) => line.difference !== 0) : undefined;
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
  cashAtBank: number | null;
  gaps: DepositGap[];
  splitsLabeled: boolean;
  synced: boolean;
  dsrNote: string;
};

function feeMissingFromJournal(row: DepositRow) {
  let missing = 0;
  row.gaps.forEach((gap) => {
    if (!/fee/i.test(gap.accountName)) return;
    missing += centsOf(gap.depositJournal) - centsOf(gap.salesPosting);
  });
  return missing;
}

function feeInsideCardDeposit(row: DepositRow) {
  const cardGap = centsOf(row.cardDeposit) - centsOf(row.cardJournal);
  const missing = feeMissingFromJournal(row);
  if (cardGap <= DEPOSIT_MATCH_CENTS || missing <= DEPOSIT_MATCH_CENTS) return 0;
  if (Math.abs(missing - cardGap) > 100) return 0;
  return missing;
}

function postingAdjustment(row: DepositRow) {
  const cardGap = centsOf(row.cardDeposit) - centsOf(row.cardJournal);
  const feeInside = feeInsideCardDeposit(row);
  if (feeInside) {
    return `Credit the card line and debit the Toast fee for ${money(feeInside).toFixed(2)}. Do not add to the card line. Sales accounts that differ only by class are the same revenue. Do not adjust those.`;
  }
  if (cardGap > DEPOSIT_MATCH_CENTS) {
    return `Debit the card line on the ${row.date} sales posting ${money(cardGap).toFixed(2)} so it matches the card deposit of ${row.cardDeposit.toFixed(2)}. Sales accounts that differ only by class are the same revenue. Do not adjust those.`;
  }
  if (cardGap >= -DEPOSIT_MATCH_CENTS) return "";
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
    cashAtBank: null,
    gaps: [],
    splitsLabeled: false,
    synced: false,
    dsrNote: "",
  };
}

async function reservationDepositOwedCents() {
  const accounts = await queryRows<{ AcctNum?: string; CurrentBalance?: number }>("Account", "Active IN (true, false)");
  const account = accounts.find((item) => String(item.AcctNum || "").replace(/\s/g, "") === "214000");
  if (!account) throw new Error("QuickBooks account 214000 Toast - Reservation Deposits was not found.");
  return -centsOf(account.CurrentBalance);
}

async function tallyDepositLiability(
  restaurantGuid: string,
  businessDate: string,
  alternatePayments: Map<string, string>,
) {
  let collected = 0;
  let redeemed = 0;
  const seenPayments = new Set<string>();
  const today = dayStamp(businessDate);
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const batch = await getOrdersByBusinessDate(restaurantGuid, businessDate, page, 100);
    if (!Array.isArray(batch) || batch.length === 0) break;
    for (const order of batch) {
      if (order.voided || order.deleted) continue;
      for (const check of order.checks || []) {
        if (check.voided || check.deleted) continue;
        let depositGross = 0;
        for (const selection of check.selections || []) {
          if (selection.voided) continue;
          const quantity = selection.quantity || 1;
          const gross = selection.preDiscountPrice != null ? centsOf(selection.preDiscountPrice) : centsOf((selection.price || 0) * quantity);
          const itemName = selection.displayName || selection.item?.name || "";
          if (gross && isCustomerDepositItem(itemName)) depositGross += gross;
        }
        let earlyPaid = 0;
        let earlyPrincipal = 0;
        let redemptionPaid = 0;
        let redemptionPrincipal = 0;
        const orderDay = dayStamp(order.businessDate || businessDate);
        for (const payment of check.payments || []) {
          if (payment.voidInfo || payment.paymentStatus === "VOIDED" || payment.paymentStatus === "DENIED") continue;
          if (payment.guid) seenPayments.add(String(payment.guid));
          const paid = centsOf(payment.amount) + centsOf(payment.tipAmount);
          const principal = centsOf(payment.amount);
          const paidDay = dayStamp(payment.paidBusinessDate) || orderDay;
          const type = String(payment.type || "").toUpperCase();
          if (paidDay < orderDay && (type === "CREDIT" || type === "CASH")) {
            earlyPaid += paid;
            earlyPrincipal += principal;
            continue;
          }
          const tender = payment.otherPayment?.name || alternatePayments.get(String(payment.otherPayment?.guid || "")) || "Other";
          if (isDepositUse(tender)) {
            redemptionPaid += paid;
            redemptionPrincipal += principal;
          }
        }
        const { wash, collected: fresh } = classifyDeposit(depositGross, earlyPrincipal, redemptionPrincipal);
        collected += fresh;
        redeemed += earlyPaid + redemptionPaid - wash;
      }
    }
    page += 1;
    if (batch.length < 100) hasMore = false;
  }

  const listed = await toastApiRequest(`/orders/v2/payments?paidBusinessDate=${today}`, restaurantGuid);
  const guids = (Array.isArray(listed) ? listed : [])
    .map((item: string | { guid?: string }) => (typeof item === "string" ? item : item?.guid || ""))
    .filter((guid: string) => guid && !seenPayments.has(guid));
  const orders = new Map<string, { businessDate?: number | string; voided?: boolean; deleted?: boolean }>();
  for (let index = 0; index < guids.length; index += 6) {
    const additions = await Promise.all(guids.slice(index, index + 6).map(async (guid) => {
      const payment = await toastApiRequest(`/orders/v2/payments/${guid}`, restaurantGuid);
      if (!payment || payment.voidInfo || payment.paymentStatus === "VOIDED" || payment.paymentStatus === "DENIED") return 0;
      if (dayStamp(payment.paidBusinessDate) !== today) return 0;
      const type = String(payment.type || "").toUpperCase();
      if (type !== "CREDIT" && type !== "CASH") return 0;
      const orderGuid = String(payment.orderGuid || "");
      if (!orderGuid) return 0;
      let order = orders.get(orderGuid);
      if (!order) {
        order = await getOrder(restaurantGuid, orderGuid);
        orders.set(orderGuid, order);
      }
      if (!order || order.voided || order.deleted) return 0;
      const orderDay = dayStamp(order.businessDate);
      if (!orderDay || orderDay <= today) return 0;
      return centsOf(payment.amount) + centsOf(payment.tipAmount);
    }));
    collected += additions.reduce((sum, amount) => sum + amount, 0);
  }
  return { collected, redeemed };
}

export async function reviewDepositLiability(from: string, to: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) throw new Error("Choose a start and end date.");
  const span = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
  if (span > 31) throw new Error("Review one month at a time.");
  const restaurants = await getRestaurants();
  const setups: { guid: string; alternatePayments: Map<string, string> }[] = [];
  for (const restaurant of restaurants) {
    const alternatePayments = new Map<string, string>();
    try {
      const types = await toastApiRequest("/config/v2/alternatePaymentTypes", restaurant.restaurantGuid);
      for (const type of types || []) {
        if (type?.guid && type?.name) alternatePayments.set(String(type.guid), String(type.name));
      }
    } catch (error) {
      console.warn(`[Toast DSR] alternate payments ${restaurant.restaurantGuid}: ${error instanceof Error ? error.message : error}`);
    }
    setups.push({ guid: restaurant.restaurantGuid, alternatePayments });
  }
  let collected = 0;
  let redeemed = 0;
  for (let date = from; date <= to; date = shiftIso(date, 1)) {
    for (const setup of setups) {
      const day = await tallyDepositLiability(setup.guid, date, setup.alternatePayments);
      collected += day.collected;
      redeemed += day.redeemed;
    }
  }
  const quickBooksOwed = await reservationDepositOwedCents();
  return {
    from,
    to,
    collected: money(collected),
    redeemed: money(redeemed),
    outstanding: money(collected - redeemed),
    quickBooksOwed: money(quickBooksOwed),
    accountName: "214000 Toast - Reservation Deposits",
  };
}

export async function reviewDeposits(through: string, days: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(through)) throw new Error("Choose a business date.");
  const count = Math.min(Math.max(days || 7, 1), 15);
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
    const synced = day.ourJournals.some((journal) => journal.doc.startsWith("TOAST-") || journal.doc.startsWith("TFIX-"));
    const dsrNote = synced ? day.ourJournals.map((journal) => journal.doc).join(", ") : (day.postBlock || "Not posted.");
    const base = {
      cardJournal: day.cardExpected,
      cardDeposit: day.cardRecorded,
      cashJournal: day.cashExpected,
      cashDeposit: day.cashRecorded,
      gaps,
      splitsLabeled: day.cardRecorded !== 0 || day.cashRecorded !== 0 || centsOf(day.bankRecorded) === 0,
      synced,
      dsrNote,
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
  const clearedCash = await db.execute(sql`SELECT business_date, amount FROM accounting_toast_deposit_clears WHERE kind = 'cash'`);
  const cashAtBank = new Map((clearedCash.rows as { business_date: string; amount: string }[]).map((row) => [row.business_date, Number(row.amount)]));
  for (const row of rows) {
    if (centsOf(row.cashJournal) <= DEPOSIT_MATCH_CENTS) row.cashAtBank = 0;
    else if (cashAtBank.has(row.date)) row.cashAtBank = cashAtBank.get(row.date) ?? 0;
    else row.cashAtBank = null;
  }

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
    const cashUnmatched = row.cashAtBank == null && centsOf(row.cashJournal) > DEPOSIT_MATCH_CENTS;
    const cashNote = Math.abs(cashShort) > DEPOSIT_MATCH_CENTS
      ? `Cash on the sales journal is ${row.cashDeposit.toFixed(2)} and cash on the DSR is ${row.cashJournal.toFixed(2)}.${cashUnmatched ? " That cash has not been marked as taken to the bank." : ""}`
      : cashUnmatched
        ? `Cash of ${row.cashJournal.toFixed(2)} on the ${row.date} DSR is unmatched at the bank. Leave the sales posting alone until that cash is taken to the bank.`
        : row.splitsLabeled && !cashOffsets && cashShort < -DEPOSIT_MATCH_CENTS
          ? `Cash of ${row.cashJournal.toFixed(2)} on the ${row.date} sales posting is not in the deposit yet (${row.cashDeposit.toFixed(2)} deposited). Leave the sales posting alone until that cash is taken to the bank.`
          : "";
    const adjustment = row.status === "timing" ? "" : postingAdjustment(row);
    const postingNote = adjustment
      ? `To balance the posting: ${adjustment} Do not book this difference to Toast Deposit in Transit.`
      : "";
    const cashWords = Math.abs(cashShort) > DEPOSIT_MATCH_CENTS
      ? `cash ${row.cashDeposit.toFixed(2)} on the sales journal against ${row.cashJournal.toFixed(2)} on the DSR`
      : row.cashAtBank == null && centsOf(row.cashJournal) > DEPOSIT_MATCH_CENTS
        ? `cash ${row.cashJournal.toFixed(2)} on the DSR is unmatched at the bank`
        : `cash ${row.cashDeposit.toFixed(2)} against ${row.cashJournal.toFixed(2)}`;
    const feeInside = feeInsideCardDeposit(row);
    const which = feeInside
      ? `Cards are ${row.cardDeposit.toFixed(2)} on the sales journal. ${money(feeInside).toFixed(2)} of that is the Toast fee, so the card amount that reaches the bank is ${row.cardJournal.toFixed(2)}.`
      : row.splitsLabeled
        ? `The deposit that belongs to the ${row.date} sales posting shows cards ${row.cardDeposit.toFixed(2)} against ${row.cardJournal.toFixed(2)} on the posting, and ${cashWords}.`
        : "";
    const suggestion = [which, row.suggestion, cashNote, postingNote].filter(Boolean).join(" ");
    if (suggestion) {
      row.suggestion = suggestion;
      row.note = suggestion;
    }
  }

  for (const row of rows) {
    if (row.cashAtBank != null || centsOf(row.cashJournal) <= DEPOSIT_MATCH_CENTS) continue;
    const line = `Cash of ${row.cashJournal.toFixed(2)} on the ${row.date} DSR is unmatched at the bank.`;
    if (row.suggestion.includes(line) || row.note.includes(line) || row.note.includes("taken to the bank")) continue;
    row.suggestion = [row.suggestion, line].filter(Boolean).join(" ");
    if (!row.note.includes("unmatched at the bank")) row.note = [row.note, line].filter(Boolean).join(" ");
  }

  const cardGap = (row: DepositRow) => centsOf(row.cardDeposit) - centsOf(row.cardJournal);
  const comparable = rows.filter((row) => row.status !== "quiet");
  for (let index = 0; index < comparable.length; index += 1) {
    const earlier = comparable[index];
    const short = cardGap(earlier);
    if (short >= -DEPOSIT_MATCH_CENTS) continue;
    for (let laterIndex = index + 1; laterIndex < comparable.length; laterIndex += 1) {
      const later = comparable[laterIndex];
      const apart = Math.round((Date.parse(`${later.date}T00:00:00Z`) - Date.parse(`${earlier.date}T00:00:00Z`)) / 86400000);
      if (apart > 3) break;
      const over = cardGap(later);
      if (over <= DEPOSIT_MATCH_CENTS) continue;
      if (Math.abs(short + over) > 100) continue;
      const amount = Math.abs(money(short)).toFixed(2);
      const line = `Cards are short ${amount} on ${earlier.date} and over ${money(over).toFixed(2)} on ${later.date}. That is a credit card processing delay. Debit Toast Deposit in Transit ${amount} on ${earlier.date} and credit it on ${later.date}. Do not change the sales accounts.`;
      for (const row of [earlier, later]) {
        if (row.suggestion.includes("credit card processing delay") || row.suggestion.includes("belongs to the")) continue;
        const withoutPostingChange = row.suggestion.replace(/To balance the posting:[\s\S]*?Do not book this difference to Toast Deposit in Transit\./g, "").replace(/\s+/g, " ").trim();
        row.suggestion = [line, withoutPostingChange].filter(Boolean).join(" ");
        row.note = row.suggestion;
        if (row.status === "mismatch") row.status = "timing";
      }
      break;
    }
  }

  return rows.filter((row) => row.status !== "quiet" && row.date <= through);
}

function depositStanding(status: DepositRow["status"]) {
  if (status === "match") return "Match" as const;
  if (status === "mismatch" || status === "timing") return "Problem" as const;
  if (status === "quiet") return "No sales" as const;
  return "Pending" as const;
}

export async function closeStatusReport(through: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(through)) throw new Error("Choose a business date.");
  const rows = await reviewDeposits(through, 15);
  const byDate = new Map(rows.map((row) => [row.date, row]));
  return Array.from({ length: 15 }, (_, offset) => shiftIso(through, -offset)).map((date) => {
    const row = byDate.get(date);
    if (!row) return { date, dsr: "No sales" as const, deposit: "No sales" as const, detail: "No Toast sales." };
    const deposit = depositStanding(row.status);
    const detail = !row.synced
      ? (deposit === "Match" || deposit === "Problem" ? `${row.dsrNote} ${row.note}` : row.dsrNote)
      : deposit === "Match"
        ? `${row.dsrNote} is posted, and the deposit matches the sales posting.`
        : row.note;
    return { date, dsr: row.synced ? "Synced" as const : "Not synced" as const, deposit, detail };
  });
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
          content: "You explain deposit differences to a bookkeeper. The days are in date order. cardOverUnder is cards at the bank minus cards on the daily sales report: negative means the bank is short, positive means the bank is over. Read consecutive days. A negative card amount followed within three days by a positive card amount of about the same dollars is a credit card processing delay. Name both dates and both amounts, and say to debit Toast Deposit in Transit on the short date and credit it on the later date. Do not change the sales accounts for that pair. A difference that is not followed by an opposite amount stays on that day: repeat the suggestion. Cash that is unmatched stays in the drawer. Use only amounts present in the JSON. Three to six sentences.",
        },
        {
          role: "user",
          content: JSON.stringify(rows.map((row) => ({
            date: row.date,
            cardOverUnder: money(centsOf(row.cardDeposit) - centsOf(row.cardJournal)),
            suggestion: row.suggestion,
            cardOnSalesPosting: row.cardJournal,
            cardOnDeposit: row.cardDeposit,
            cashOnSalesPosting: row.cashJournal,
            cashOnDeposit: row.cashAtBank,
          }))),
        },
      ],
    });
    const text = response.choices[0]?.message?.content?.trim();
    const known = new Set<string>(fallback.match(/\d+\.\d{2}/g) || []);
    rows.forEach((row) => known.add(Math.abs(money(centsOf(row.cardDeposit) - centsOf(row.cardJournal))).toFixed(2)));
    const used = text?.match(/\d+\.\d{2}/g) || [];
    if (!text || used.some((amount) => !known.has(amount))) return fallback;
    return text;
  } catch {
    return fallback;
  }
}

const TOAST_NOTICES = [
  { key: "cash-outstanding", label: "Outstanding cash deposits", fallback: "aparrow@nashobawinery.com" },
  { key: "card-outstanding", label: "Outstanding card deposits", fallback: "email@nashobawinery.com" },
  { key: "deposit-mismatch", label: "DSR out of balance, or a deposit amount differs", fallback: "email@nashobawinery.com" },
  { key: "dsr-manager", label: "Accounting manager, when a daily sales day cannot be corrected", fallback: "email@nashobawinery.com" },
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

function usd(amount: number) {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function longDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, day)));
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function depositFees(row: DepositRow) {
  const totals = new Map<string, number>();
  row.gaps.forEach((gap) => {
    if (!/fee/i.test(gap.accountName) || gap.difference <= 0) return;
    totals.set(gap.accountName, (totals.get(gap.accountName) || 0) + centsOf(gap.difference));
  });
  return [...totals.entries()]
    .filter(([, cents]) => cents > DEPOSIT_MATCH_CENTS)
    .map(([accountName, cents]) => ({ accountName, cents }));
}

function depositFinding(row: DepositRow) {
  const cardGap = centsOf(row.cardDeposit) - centsOf(row.cardJournal);
  const cashGap = centsOf(row.cashDeposit) - centsOf(row.cashJournal);
  const lines: string[] = [];
  const feeInside = feeInsideCardDeposit(row);
  if (feeInside) lines.push(`The card line still includes the Toast fee of ${usd(money(feeInside))}. After that fee, cards match.`);
  else if (Math.abs(cardGap) <= DEPOSIT_MATCH_CENTS) lines.push("Cards match.");
  else lines.push(cardGap < 0 ? `The card deposit is ${usd(money(Math.abs(cardGap)))} lower than the sales journal.` : `The card deposit is ${usd(money(cardGap))} higher than the sales journal.`);
  if (Math.abs(cashGap) <= DEPOSIT_MATCH_CENTS) lines.push("Cash matches.");
  else lines.push(cashGap < 0 ? `The cash deposit is ${usd(money(Math.abs(cashGap)))} lower than the sales journal.` : `The cash deposit is ${usd(money(cashGap))} higher than the sales journal.`);
  return lines;
}

function depositRecommendation(row: DepositRow) {
  if (row.status === "timing") {
    return row.suggestion
      .replace(/Do not change the sales accounts\./gi, "Leave the sales accounts unchanged.")
      .split(/(?<=\.)\s+/)
      .map((step) => step.trim())
      .filter(Boolean);
  }
  const steps: string[] = [];
  const when = longDate(row.date);
  const cardGap = centsOf(row.cardDeposit) - centsOf(row.cardJournal);
  const feeInside = feeInsideCardDeposit(row);
  if (feeInside) {
    steps.push(`The card line of ${usd(row.cardDeposit)} still includes the Toast fee of ${usd(money(feeInside))}. After that fee, cards match ${usd(row.cardJournal)}. Credit the card line and debit the Toast fee for ${usd(money(feeInside))}. Do not add to the card line.`);
  } else if (cardGap > DEPOSIT_MATCH_CENTS) {
    steps.push(`Debit the card line on the ${when} sales journal by ${usd(money(cardGap))} so it matches the card deposit of ${usd(row.cardDeposit)}.`);
  } else if (cardGap < -DEPOSIT_MATCH_CENTS) {
    const short = Math.abs(cardGap);
    const fees = depositFees(row);
    const feeCents = fees.reduce((sum, fee) => sum + fee.cents, 0);
    const remainder = short - Math.min(feeCents, short);
    steps.push(`Credit the card line on the ${when} sales journal by ${usd(money(short))} so it matches the card deposit of ${usd(row.cardDeposit)}.`);
    if (feeCents > DEPOSIT_MATCH_CENTS) {
      const feeText = fees.map((fee) => `${fee.accountName} ${usd(money(fee.cents))}`).join(" and ");
      steps.push(`Debit ${feeText}. That fee is already on the deposit journal.`);
      if (remainder <= DEPOSIT_MATCH_CENTS) steps.push("The fee is why the card deposit is lower than the sales journal.");
      else steps.push(`${usd(money(remainder))} is still open after the fee. It did not arrive with the next deposit. Leave Toast Deposit in Transit unchanged.`);
    } else {
      steps.push("Leave Toast Deposit in Transit unchanged.");
    }
  }
  if (/not in the deposit yet/i.test(row.suggestion)) {
    steps.push(`Cash of ${usd(row.cashJournal)} is still in the drawer. ${usd(row.cashDeposit)} has been deposited. Leave the sales journal unchanged until that cash goes to the bank.`);
  }
  steps.push("Sales accounts that differ only by class are the same revenue. Leave those accounts unchanged.");
  return steps;
}

function depositNoticeHtml(row: DepositRow) {
  const finding = depositFinding(row).map((line) => `<li style="margin:0 0 4px;">${escapeHtml(line)}</li>`).join("");
  const steps = depositRecommendation(row).map((step) => `<li style="margin:0 0 8px;">${escapeHtml(step)}</li>`).join("");
  const amount = (value: number) => `<td style="padding:6px 8px;text-align:right;">${escapeHtml(usd(value))}</td>`;
  return `<div style="background:#fff;border:1px solid #ead7a4;border-radius:8px;margin:0 0 16px;overflow:hidden;"><div style="padding:12px 14px;font-weight:600;">${escapeHtml(longDate(row.date))}</div><div style="padding:0 14px 14px;"><div style="font-size:12px;letter-spacing:0.05em;text-transform:uppercase;color:#7a1f1f;margin:0 0 6px;">Finding</div><table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 8px;"><thead><tr><th style="text-align:left;padding:6px 8px;"></th><th style="text-align:right;padding:6px 8px;color:#666;">Deposit</th><th style="text-align:right;padding:6px 8px;color:#666;">Sales journal</th></tr></thead><tbody><tr><td style="padding:6px 8px;border-top:1px solid #f0e2c4;">Cards</td>${amount(row.cardDeposit)}${amount(row.cardJournal)}</tr><tr><td style="padding:6px 8px;border-top:1px solid #f0e2c4;">Cash</td>${amount(row.cashDeposit)}${amount(row.cashJournal)}</tr></tbody></table><ul style="margin:0 0 14px;padding-left:18px;">${finding}</ul><div style="font-size:12px;letter-spacing:0.05em;text-transform:uppercase;color:#7a1f1f;margin:0 0 6px;">Reconcile</div><ol style="margin:0;padding-left:18px;">${steps}</ol></div></div>`;
}

function depositNoticeText(row: DepositRow) {
  const finding = depositFinding(row).map((line) => `- ${line}`).join("\n");
  const steps = depositRecommendation(row).map((step, index) => `${index + 1}. ${step}`).join("\n");
  return `${longDate(row.date)}\n\nFinding\nCards on the deposit: ${usd(row.cardDeposit)}\nCards on the sales journal: ${usd(row.cardJournal)}\nCash on the deposit: ${usd(row.cashDeposit)}\nCash on the sales journal: ${usd(row.cashJournal)}\n${finding}\n\nReconcile\n${steps}`;
}

function depositMailFrom() {
  return { email: process.env.SENDGRID_FROM_EMAIL || "email@nashobawinery.com", name: "Nashoba Experience" };
}

function appHome() {
  const base = process.env.NODE_ENV === "production" ? "https://nashobawinery.org" : (process.env.APP_URL || "https://nashobawinery.org");
  return base.replace(/\/$/, "");
}

function correctionSteps(kind: "dsr" | "deposit", date: string) {
  const home = `${appHome()}/accounting`;
  if (kind === "dsr") {
    return [
      `Log in to Nashoba Experience at ${home}.`,
      "Open Accounting, then DSR.",
      `Set the date to ${date} and click Check this date.`,
      "Read How to fix this day. It names the account and the checks.",
      "Make that correction, then check the date again. Post this day once it balances.",
    ];
  }
  return [
    `Log in to Nashoba Experience at ${home}.`,
    "Open Accounting, then DSR, then Outstanding deposits.",
    "Click Compare deposits.",
    `The recommendation names the debit or credit for ${date}. Correct it there.`,
  ];
}

function correctionHtml(steps: string[]) {
  return `<div style="margin-top:16px;"><div style="font-size:12px;letter-spacing:0.05em;text-transform:uppercase;color:#7a1f1f;margin:0 0 6px;">Log in and correct</div><ol style="margin:0;padding-left:18px;">${steps.map((step) => `<li style="margin:0 0 8px;">${escapeHtml(step)}</li>`).join("")}</ol></div>`;
}

function depositComparisonTable(row: DepositRow) {
  const amount = (value: number) => `<td style="padding:6px 8px;text-align:right;border-top:1px solid #f0e2c4;">${escapeHtml(usd(value))}</td>`;
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 8px;background:#fff;"><thead><tr><th style="text-align:left;padding:6px 8px;"></th><th style="text-align:right;padding:6px 8px;color:#666;">Deposit</th><th style="text-align:right;padding:6px 8px;color:#666;">Sales journal</th></tr></thead><tbody><tr><td style="padding:6px 8px;border-top:1px solid #f0e2c4;">Cards</td>${amount(row.cardDeposit)}${amount(row.cardJournal)}</tr><tr><td style="padding:6px 8px;border-top:1px solid #f0e2c4;">Cash</td>${amount(row.cashDeposit)}${amount(row.cashJournal)}</tr></tbody></table>`;
}

async function emailDepositMismatches(rows: DepositRow[], booked: string[]) {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS accounting_toast_deposit_alerts (
      id varchar PRIMARY KEY,
      business_date varchar NOT NULL,
      variance_cents integer NOT NULL,
      sent_at timestamp DEFAULT now()
    )
  `);
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return { sent: false, reason: "email-not-configured" };
  const to = await noticeRecipients("deposit-mismatch");
  if (!to.length) return { sent: false, reason: "no-recipients" };
  sgMail.setApiKey(apiKey);
  const dates: string[] = [];

  for (const row of rows.filter((item) => item.status === "mismatch" || item.status === "timing")) {
    const cents = centsOf(row.difference || 0);
    const prior = await db.execute(sql`SELECT id FROM accounting_toast_deposit_alerts WHERE business_date = ${row.date} AND variance_cents = ${cents} LIMIT 1`);
    if ((prior.rows as { id: string }[]).length) continue;
    const when = longDate(row.date);
    const warningTitle = row.status === "timing" ? `Toast deposit delayed ${when}` : `Toast deposit does not match ${when}`;
    const bookedNote = booked.some((item) => item.includes(row.date))
      ? `Nashoba Experience already booked the timing difference to Toast Deposit in Transit for ${booked.filter((item) => item.includes(row.date)).join("; ")}.`
      : "";
    await sgMail.send({
      to,
      from: depositMailFrom(),
      subject: `Nashoba Experience warning: ${warningTitle}`,
      text: `Warning from Nashoba Experience\n\n${warningTitle}.\n\n${bookedNote ? `${bookedNote}\n\n` : ""}${depositNoticeText(row)}\n\nLog in and correct\n${correctionSteps("deposit", row.date).map((step, index) => `${index + 1}. ${step}`).join("\n")}`,
      html: `<div style="font-family:sans-serif;color:#111;max-width:640px;"><div style="background:#7a1f1f;color:#fff;padding:16px 18px;"><div style="font-size:12px;letter-spacing:0.06em;text-transform:uppercase;">Nashoba Experience</div><div style="font-size:18px;font-weight:600;margin-top:4px;">Warning: ${escapeHtml(warningTitle)}</div></div><div style="border:1px solid #e7c98a;border-top:none;background:#fff8eb;padding:16px 18px;"><p style="margin:0 0 16px;">The finding is first. The steps to reconcile it follow.</p>${bookedNote ? `<p style="margin:0 0 16px;">${escapeHtml(bookedNote)}</p>` : ""}${depositNoticeHtml(row)}${correctionHtml(correctionSteps("deposit", row.date))}</div></div>`,
    });
    await db.execute(sql`
      INSERT INTO accounting_toast_deposit_alerts (id, business_date, variance_cents)
      VALUES (${randomUUID()}, ${row.date}, ${cents})
    `);
    dates.push(row.date);
  }

  for (const row of rows.filter((item) => item.status === "match")) {
    const prior = await db.execute(sql`SELECT id FROM accounting_toast_deposit_alerts WHERE business_date = ${row.date} AND variance_cents BETWEEN ${-DEPOSIT_MATCH_CENTS} AND ${DEPOSIT_MATCH_CENTS} LIMIT 1`);
    if ((prior.rows as { id: string }[]).length) continue;
    const when = longDate(row.date);
    const cardsMatch = Math.abs(centsOf(row.cardDeposit) - centsOf(row.cardJournal)) <= DEPOSIT_MATCH_CENTS;
    const cashMatch = Math.abs(centsOf(row.cashDeposit) - centsOf(row.cashJournal)) <= DEPOSIT_MATCH_CENTS;
    const split = cardsMatch && cashMatch;
    const finding = split ? depositFinding(row).map((line) => `<li style="margin:0 0 4px;">${escapeHtml(line)}</li>`).join("") : "";
    const detailHtml = split ? `${depositComparisonTable(row)}<ul style="margin:0;padding-left:18px;">${finding}</ul>` : `<p style="margin:0;">Toast deposit ${escapeHtml(usd(row.journalDeposit))}. QuickBooks deposit ${escapeHtml(usd(row.bankDeposit ?? row.journalDeposit))}.</p>`;
    const detailText = split
      ? `Cards on the deposit: ${usd(row.cardDeposit)}\nCards on the sales journal: ${usd(row.cardJournal)}\nCash on the deposit: ${usd(row.cashDeposit)}\nCash on the sales journal: ${usd(row.cashJournal)}\n${depositFinding(row).map((line) => `- ${line}`).join("\n")}`
      : `Toast deposit ${usd(row.journalDeposit)}. QuickBooks deposit ${usd(row.bankDeposit ?? row.journalDeposit)}.`;
    await sgMail.send({
      to,
      from: depositMailFrom(),
      subject: `Nashoba Experience: Congrats, the ${when} Toast deposit matches`,
      text: `Congrats from Nashoba Experience\n\nThe Toast deposit for ${when} matches the deposit in QuickBooks.\n\n${detailText}`,
      html: `<div style="font-family:sans-serif;color:#111;max-width:640px;"><div style="background:#1f6b3a;color:#fff;padding:16px 18px;"><div style="font-size:12px;letter-spacing:0.06em;text-transform:uppercase;">Nashoba Experience</div><div style="font-size:18px;font-weight:600;margin-top:4px;">Congrats</div></div><div style="border:1px solid #b7d7c3;border-top:none;background:#f3faf6;padding:16px 18px;"><p style="margin:0 0 12px;">The Toast deposit for ${escapeHtml(when)} matches the deposit in QuickBooks.</p>${detailHtml}</div></div>`,
    });
    await db.execute(sql`
      INSERT INTO accounting_toast_deposit_alerts (id, business_date, variance_cents)
      VALUES (${randomUUID()}, ${row.date}, ${centsOf(row.difference || 0)})
    `);
    dates.push(row.date);
  }

  if (!dates.length) return { sent: false, reason: "already-sent" };
  return { sent: true, dates };
}

export async function ensureToastDepositAccount() {
  return ensureTimingAccount(await chartOfAccounts());
}

async function emailDsrCorrections(failures: { date: string; message: string }[]) {
  const problems = failures.filter((item) => /out of balance|could not be matched/i.test(item.message));
  if (!problems.length) return;
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return;
  const to = await noticeRecipients("deposit-mismatch");
  if (!to.length) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS accounting_toast_dsr_alerts (
      id varchar PRIMARY KEY,
      business_date varchar NOT NULL,
      reason text NOT NULL,
      sent_at timestamp DEFAULT now()
    )
  `);
  sgMail.setApiKey(apiKey);
  for (const problem of problems) {
    const prior = await db.execute(sql`SELECT id FROM accounting_toast_dsr_alerts WHERE business_date = ${problem.date} AND reason = ${problem.message} LIMIT 1`);
    if ((prior.rows as { id: string }[]).length) continue;
    const when = longDate(problem.date);
    const steps = correctionSteps("dsr", problem.date);
    await sgMail.send({
      to,
      from: depositMailFrom(),
      subject: `Nashoba Experience: ${when} DSR needs a correction`,
      text: `Nashoba Experience\n\nThe ${when} daily sales report was not posted.\n\n${problem.message}\n\nLog in and correct\n${steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}`,
      html: `<div style="font-family:sans-serif;color:#111;max-width:640px;"><div style="background:#7a1f1f;color:#fff;padding:16px 18px;"><div style="font-size:12px;letter-spacing:0.06em;text-transform:uppercase;">Nashoba Experience</div><div style="font-size:18px;font-weight:600;margin-top:4px;">${escapeHtml(when)} needs a correction</div></div><div style="border:1px solid #e7c98a;border-top:none;background:#fff8eb;padding:16px 18px;"><p style="margin:0 0 12px;">The ${escapeHtml(when)} daily sales report was not posted.</p><p style="margin:0 0 12px;">${escapeHtml(problem.message)}</p>${correctionHtml(steps)}</div></div>`,
    });
    await db.execute(sql`
      INSERT INTO accounting_toast_dsr_alerts (id, business_date, reason)
      VALUES (${randomUUID()}, ${problem.date}, ${problem.message})
    `);
  }
}

export async function postYesterdayToastJournal() {
  const businessDate = shiftIso(todayIso(), -1);
  try {
    const posted = await postDueToastJournals();
    console.log("[Toast GL] posted", posted.map((entry) => entry.doc).join(", ") || "nothing new", "through", businessDate);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/already in QuickBooks|no Toast sales|out of balance|could not be matched/i.test(message)) {
      console.log("[Toast GL]", businessDate, message);
      return;
    }
    console.error("[Toast GL]", businessDate, message);
    try {
      const to = await noticeRecipients("deposit-mismatch");
      const apiKey = process.env.SENDGRID_API_KEY;
      if (to.length && apiKey) {
        const steps = correctionSteps("dsr", businessDate);
        sgMail.setApiKey(apiKey);
        await sgMail.send({
          to,
          from: depositMailFrom(),
          subject: `Nashoba Experience: ${longDate(businessDate)} DSR needs a correction`,
          text: `Nashoba Experience\n\nThe ${longDate(businessDate)} daily sales report was not posted.\n\n${message}\n\nLog in and correct\n${steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}`,
          html: `<div style="font-family:sans-serif;color:#111;max-width:640px;"><div style="background:#7a1f1f;color:#fff;padding:16px 18px;"><div style="font-size:12px;letter-spacing:0.06em;text-transform:uppercase;">Nashoba Experience</div><div style="font-size:18px;font-weight:600;margin-top:4px;">${escapeHtml(longDate(businessDate))} needs a correction</div></div><div style="border:1px solid #e7c98a;border-top:none;background:#fff8eb;padding:16px 18px;"><p style="margin:0 0 12px;">The ${escapeHtml(longDate(businessDate))} daily sales report was not posted.</p><p style="margin:0 0 12px;">${escapeHtml(message)}</p>${correctionHtml(steps)}</div></div>`,
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

export function postToastDay(businessDate: string, options?: { creditTastings?: boolean }) {
  const current = postingDays.get(businessDate);
  if (current) return current;
  const run = postToastDayOnce(businessDate, options).finally(() => postingDays.delete(businessDate));
  postingDays.set(businessDate, run);
  return run;
}

function applyTastingCredit(day: Awaited<ReturnType<typeof booksForDate>>, accountId: string) {
  const tastings = day.breaks.filter((item) => item.tastings);
  const credit = tastings.reduce((sum, item) => sum + centsOf(item.amount), 0);
  const imbalance = day.ourEntry.reduce((sum, line) => sum + line.cents, 0);
  if (!tastings.length || credit !== imbalance) {
    throw new Error(`The tour and tasting credit of ${money(credit).toFixed(2)} does not close the ${money(imbalance).toFixed(2)} gap, so ${day.date} was not posted.`);
  }
  const guests = tastings.reduce((sum, item) => sum + (item.tastings || 0), 0);
  const existing = day.ourEntry.find((line) => line.accountId === accountId && !line.classId);
  if (existing) existing.cents -= credit;
  else day.ourEntry.push({ accountId, classId: "", cents: -credit, description: `Tours and tastings, ${guests} guests` });
  return { credit, guests, checks: tastings.length };
}

async function postToastDayOnce(businessDate: string, options?: { creditTastings?: boolean }) {
  const day = await booksForDate(businessDate);
  let tastingCredit: { credit: number; guests: number; checks: number } | null = null;
  if (options?.creditTastings && day.postBlock && /out of balance/i.test(day.postBlock)) {
    const account = resolveAccount(await chartOfAccounts(), TASTING_ACCOUNT);
    if (!account) throw new Error("QuickBooks account 3052010 Tours & Tastings was not found.");
    tastingCredit = applyTastingCredit(day, account.id);
  }
  if (!day.canPost && !tastingCredit) throw new Error(day.postBlock || "This date already has our journal.");
  if (tastingCredit && day.ourEntry.reduce((sum, line) => sum + line.cents, 0) !== 0) {
    throw new Error(`${businessDate} is still out of balance after the tours and tastings credit, so it was not posted.`);
  }
  const doc = `TOAST-${businessDate.replace(/-/g, "")}`.slice(0, 21);
  const existing = await journalsForDoc(doc);
  if (existing.length) {
    throw new Error(`${doc} is already in QuickBooks for this date.`);
  }
  const other = day.shogoJournals.map((journal) => journal.doc).join(", ");
  const tastingNote = tastingCredit
    ? ` Tours and tastings credited ${money(tastingCredit.credit).toFixed(2)} for ${tastingCredit.guests} guests on ${tastingCredit.checks} open checks.`
    : "";
  const entry = await postQuickBooks("/journalentry", {
    TxnDate: businessDate,
    DocNumber: doc,
    PrivateNote: other
      ? `CT. Toast sales for POS date ${businessDate}. QuickBooks also has ${other}. Remove that journal so the day is not recorded twice.${tastingNote}`
      : `CT. Toast sales for POS date ${businessDate}.${tastingNote}`,
    Line: day.ourEntry.map((line) => ({
      Amount: money(Math.abs(line.cents)),
      Description: line.description,
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

  const oursByDate = new Map<string, { cash: number; card: number; doc: string }>();
  const shogoByDate = new Map<string, { cash: number; card: number; doc: string }>();
  const seen = new Set<string>();
  for (const journal of journals) {
    if (seen.has(journal.Id)) continue;
    seen.add(journal.Id);
    const doc = journal.DocNumber || "";
    if (doc.startsWith("TDLY-") || doc.startsWith("TDLC-")) continue;
    const isOurs = doc.startsWith("TOAST-") || doc.startsWith("TFIX-");
    const note = journal.PrivateNote || "";
    const lines = journal.Line || [];
    const noteDate = note.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || "";
    const docMatch = doc.match(/^(\d{2})(\d{2})(\d{2})toast/i);
    const docDate = docMatch ? `20${docMatch[1]}-${docMatch[2]}-${docMatch[3]}` : "";
    const businessDate = isOurs ? businessDateFromDoc(doc, note, journal.TxnDate || "") : (noteDate || docDate);
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
    const target = isOurs ? oursByDate : shogoByDate;
    const current = target.get(businessDate) || { cash: 0, card: 0, doc };
    current.cash += cash;
    current.card += card;
    target.set(businessDate, current);
  }
  const byDate = new Map<string, { cash: number; card: number; doc: string }>();
  const depositDates = new Set<string>();
  oursByDate.forEach((_value, date) => depositDates.add(date));
  shogoByDate.forEach((_value, date) => depositDates.add(date));
  depositDates.forEach((date) => {
    const ours = oursByDate.get(date);
    const shogo = shogoByDate.get(date);
    const chosen = ours && (ours.cash || ours.card) ? ours : shogo;
    if (chosen) byDate.set(date, chosen);
  });

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

export function assignToastSalesName(kind: string, name: string, account: string, className = "") {
  const cleanKind = kind.slice(0, 40).trim();
  const cleanName = name.slice(0, 160).trim();
  const cleanAccount = account.slice(0, 240).trim();
  const cleanClass = className.slice(0, 120).trim();
  if (!cleanKind || !cleanName || !cleanAccount) throw new Error("Choose an account for this Toast name.");
  const existing = mapping.rows.find((row) => row.kind === cleanKind && row.name === cleanName);
  if (existing) existing.account = cleanAccount;
  else mapping.rows.push({ kind: cleanKind, name: cleanName, account: cleanAccount, className: cleanClass });
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
  const failures: { date: string; message: string }[] = [];
  for (const date of datesFrom(start, yesterday)) {
    if (posted.has(date)) continue;
    try {
      postedEntries.push(await postToastDay(date));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ date, message });
      console.error("[Toast GL]", date, message);
    }
  }
  try {
    await emailDsrCorrections(failures);
  } catch (error) {
    console.error("[Toast GL] correction notice was not sent:", error instanceof Error ? error.message : error);
  }
  const yesterdayFailure = failures.find((item) => item.date === yesterday);
  if (!posted.has(yesterday) && yesterdayFailure) throw new Error(`${yesterday}: ${yesterdayFailure.message}`);
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
    description: line.description,
  }));
  return replaceJournalLines(id, lines, `CT. Toast sales for POS date ${businessDate}. Updated in place to the current mapping.`);
}

async function ensureGuestDepositTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS accounting_guest_deposit_ledger (
      id varchar PRIMARY KEY,
      business_date varchar NOT NULL,
      visit_date varchar NOT NULL,
      customer_key varchar NOT NULL,
      customer_name varchar NOT NULL,
      email varchar NOT NULL DEFAULT '',
      phone varchar NOT NULL DEFAULT '',
      direction varchar NOT NULL,
      amount numeric NOT NULL,
      memo varchar NOT NULL DEFAULT '',
      order_guid varchar NOT NULL DEFAULT ''
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS accounting_guest_deposit_days (
      business_date varchar PRIMARY KEY,
      synced_at timestamp DEFAULT now()
    )
  `);
  await db.execute(sql`ALTER TABLE accounting_guest_deposit_ledger ADD COLUMN IF NOT EXISTS source varchar NOT NULL DEFAULT ''`);
  await db.execute(sql`ALTER TABLE accounting_guest_deposit_ledger ADD COLUMN IF NOT EXISTS reservation_date varchar NOT NULL DEFAULT ''`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS accounting_guest_deposit_reconciles (
      id varchar PRIMARY KEY,
      customer_key varchar NOT NULL,
      reservation_date varchar NOT NULL,
      amount numeric NOT NULL,
      journal_doc varchar NOT NULL,
      guest_name varchar NOT NULL DEFAULT '',
      created_at timestamp DEFAULT now()
    )
  `);
}

async function saveGuestDepositDay(businessDate: string, movements: DepositMovement[]) {
  await ensureGuestDepositTables();
    await db.execute(sql`
    DELETE FROM accounting_guest_deposit_ledger
    WHERE business_date = ${businessDate}
      AND memo NOT LIKE 'Reservation date passed%'
  `);
  for (const movement of movements) {
    if (!movement.cents) continue;
    await db.execute(sql`
      INSERT INTO accounting_guest_deposit_ledger (
        id, business_date, visit_date, customer_key, customer_name, email, phone, direction, amount, memo, order_guid, source, reservation_date
      ) VALUES (
        ${randomUUID()},
        ${businessDate},
        ${movement.visitDate || businessDate},
        ${movement.customerKey},
        ${movement.customerName},
        ${movement.email},
        ${movement.phone},
        ${movement.direction},
        ${money(movement.cents)},
        ${movement.memo.slice(0, 200)},
        ${movement.orderGuid},
        ${movement.source.slice(0, 80)},
        ${movement.reservationDate || movement.visitDate || businessDate}
      )
    `);
  }
  await db.execute(sql`
    INSERT INTO accounting_guest_deposit_days (business_date)
    VALUES (${businessDate})
    ON CONFLICT (business_date) DO UPDATE SET synced_at = now()
  `);
}

function ledgerAmount(value: unknown) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export async function syncGuestDepositLedger(from: string, to: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) throw new Error("Choose a start and end date.");
  const span = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
  if (span > 31) throw new Error("Update one month at a time.");
  let collected = 0;
  let redeemed = 0;
  for (let date = from; date <= to; date = shiftIso(date, 1)) {
    const day = await toastBuckets(date);
    if (!day.ledgerSaved) throw new Error(`The guest ledger for ${date} was not saved.`);
    for (const movement of day.movements) {
      if (movement.direction === "credit") collected += movement.cents;
      else redeemed += movement.cents;
    }
  }
  return { from, to, collected: money(collected), redeemed: money(redeemed) };
}

export async function guestDepositLedger(search: string) {
  await ensureGuestDepositTables();
  const coverage = await db.execute(sql`
    SELECT MIN(business_date) AS start_date, MAX(business_date) AS through, COUNT(*)::int AS days
    FROM accounting_guest_deposit_days
  `);
  const span = (coverage.rows[0] || {}) as { start_date?: string; through?: string; days?: number };
  const result = await db.execute(sql`
    SELECT customer_key,
      MAX(customer_name) AS customer_name,
      MAX(NULLIF(email, '')) AS email,
      MAX(NULLIF(phone, '')) AS phone,
      SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END) AS credits,
      SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END) AS debits
    FROM accounting_guest_deposit_ledger
    GROUP BY customer_key
  `);
  const eventRows = await db.execute(sql`
    SELECT customer_key,
      COALESCE(NULLIF(reservation_date, ''), visit_date) AS reservation_date,
      SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END) AS credits,
      SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END) AS debits
    FROM accounting_guest_deposit_ledger
    GROUP BY customer_key, COALESCE(NULLIF(reservation_date, ''), visit_date)
  `);
  const eventsByGuest = new Map<string, { date: string; amount: number }[]>();
  for (const row of eventRows.rows as { customer_key: string; reservation_date: string; credits: string; debits: string }[]) {
    const amount = ledgerAmount(ledgerAmount(row.credits) - ledgerAmount(row.debits));
    if (amount < 0.01 || !row.reservation_date) continue;
    const events = eventsByGuest.get(row.customer_key) || [];
    events.push({ date: row.reservation_date, amount });
    eventsByGuest.set(row.customer_key, events);
  }
  eventsByGuest.forEach((events) => events.sort((left, right) => left.date.localeCompare(right.date)));
  const needle = search.trim().toLowerCase();
  const customers = (result.rows as { customer_key: string; customer_name: string; email: string | null; phone: string | null; credits: string; debits: string }[])
    .map((row) => {
      const credits = ledgerAmount(row.credits);
      const debits = ledgerAmount(row.debits);
      return {
        key: row.customer_key,
        name: row.customer_name,
        email: row.email || "",
        phone: row.phone || "",
        credits,
        debits,
        balance: ledgerAmount(credits - debits),
        events: eventsByGuest.get(row.customer_key) || [],
      };
    })
    .filter((row) => {
      if (!needle) return Math.abs(row.balance) >= 0.01 || row.credits !== 0 || row.debits !== 0;
      return [row.name, row.email, row.phone].join(" ").toLowerCase().includes(needle);
    })
    .sort((left, right) => right.balance - left.balance || left.name.localeCompare(right.name));
  return {
    from: span.start_date || "",
    through: span.through || "",
    days: Number(span.days || 0),
    customers,
  };
}

export async function guestDepositEntries(customerKey: string) {
  const key = customerKey.trim();
  if (!key) throw new Error("Choose a guest.");
  await ensureGuestDepositTables();
  const result = await db.execute(sql`
    SELECT business_date, visit_date, reservation_date, customer_name, email, phone, direction, amount, memo
    FROM accounting_guest_deposit_ledger
    WHERE customer_key = ${key}
    ORDER BY business_date, direction DESC, memo
  `);
  const rows = result.rows as { business_date: string; visit_date: string; reservation_date: string; customer_name: string; email: string; phone: string; direction: string; amount: string; memo: string }[];
  let running = 0;
  const entries = rows.map((row) => {
    const amount = ledgerAmount(row.amount);
    const credit = row.direction === "credit" ? amount : 0;
    const debit = row.direction === "debit" ? amount : 0;
    running = ledgerAmount(running + credit - debit);
    return {
      date: row.business_date,
      visitDate: row.visit_date,
      eventDate: row.reservation_date || row.visit_date,
      memo: row.memo,
      credit,
      debit,
      balance: running,
    };
  });
  const first = rows[0];
  return {
    key,
    name: first?.customer_name || "",
    email: rows.map((row) => row.email).find(Boolean) || "",
    phone: rows.map((row) => row.phone).find(Boolean) || "",
    entries,
  };
}

export async function pastGuestDeposits() {
  await ensureGuestDepositTables();
  const today = todayIso();
  const coverage = await db.execute(sql`
    SELECT MIN(business_date) AS start_date, MAX(business_date) AS through, COUNT(*)::int AS days
    FROM accounting_guest_deposit_days
  `);
  const span = (coverage.rows[0] || {}) as { start_date?: string; through?: string; days?: number };
  const result = await db.execute(sql`
    SELECT customer_key,
      COALESCE(NULLIF(reservation_date, ''), visit_date) AS reservation_date,
      MAX(customer_name) AS customer_name,
      MAX(NULLIF(email, '')) AS email,
      MAX(NULLIF(phone, '')) AS phone,
      MAX(NULLIF(source, '')) AS source,
      SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END) AS credits,
      SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END) AS debits
    FROM accounting_guest_deposit_ledger
    GROUP BY customer_key, COALESCE(NULLIF(reservation_date, ''), visit_date)
  `);
  const reconciled = await db.execute(sql`SELECT customer_key, reservation_date FROM accounting_guest_deposit_reconciles`);
  const done = new Set((reconciled.rows as { customer_key: string; reservation_date: string }[]).map((row) => `${row.customer_key}|${row.reservation_date}`));
  const deposits = (result.rows as { customer_key: string; reservation_date: string; customer_name: string; email: string | null; phone: string | null; source: string | null; credits: string; debits: string }[])
    .map((row) => {
      const credits = ledgerAmount(row.credits);
      const debits = ledgerAmount(row.debits);
      return {
        customerKey: row.customer_key,
        name: row.customer_name,
        email: row.email || "",
        phone: row.phone || "",
        reservationDate: row.reservation_date,
        source: row.source || "Toast",
        amount: ledgerAmount(credits - debits),
      };
    })
    .filter((row) => row.reservationDate < today && row.reservationDate >= OPEN_YEAR && row.amount >= 0.01 && !done.has(`${row.customerKey}|${row.reservationDate}`))
    .sort((left, right) => left.reservationDate.localeCompare(right.reservationDate) || left.name.localeCompare(right.name));
  const toastTables = deposits.filter((row) => row.source === "Toast Tables");
  return {
    from: span.start_date || "",
    through: span.through || "",
    days: Number(span.days || 0),
    today,
    count: deposits.length,
    toastTables: toastTables.length,
    total: ledgerAmount(deposits.reduce((sum, row) => sum + row.amount, 0)),
    toastTablesTotal: ledgerAmount(toastTables.reduce((sum, row) => sum + row.amount, 0)),
    deposits,
  };
}

export async function postPastDepositJournal() {
  const review = await pastGuestDeposits();
  if (!review.deposits.length) throw new Error("No past reservation still has a deposit to reconcile.");
  const accounts = await chartOfAccounts();
  const liability = accounts.find((account) => account.number.replace(/\s/g, "") === "214000");
  if (!liability) throw new Error("QuickBooks account 214000 Toast - Reservation Deposits was not found.");
  const recognized = mapping.rows.find((row) => row.kind === "DEPSALE" && row.name === "Deposits Recognized");
  const revenue = (recognized && resolveAccount(accounts, recognized.account))
    || accounts.find((account) => account.number.replace(/\s/g, "") === "316000");
  if (!revenue) throw new Error("The account for a recognized deposit was not found.");
  const today = todayIso();
  let doc = `TPAST-${today.replace(/-/g, "")}`;
  if (await journalDocExists(doc)) {
    doc = `TPAST-${today.replace(/-/g, "")}B`.slice(0, 21);
    if (await journalDocExists(doc)) throw new Error(`${doc} is already in QuickBooks.`);
  }
  const note = `CT. Guest deposits whose reservation date has passed. Each line names the guest and the reservation date. ${liability.number} is debited. ${revenue.number} ${revenue.name} is credited.`;
  await postQuickBooks("/journalentry", {
    TxnDate: today,
    DocNumber: doc,
    PrivateNote: note.slice(0, 4000),
    Line: review.deposits.flatMap((deposit) => {
      const description = `${deposit.name}, ${deposit.source}, reservation ${deposit.reservationDate}`.slice(0, 400);
      return [
        { Amount: deposit.amount, Description: description, DetailType: "JournalEntryLineDetail", JournalEntryLineDetail: { PostingType: "Debit", AccountRef: { value: liability.id } } },
        { Amount: deposit.amount, Description: description, DetailType: "JournalEntryLineDetail", JournalEntryLineDetail: { PostingType: "Credit", AccountRef: { value: revenue.id } } },
      ];
    }),
  });
  try {
    for (const deposit of review.deposits) {
      await db.execute(sql`
        INSERT INTO accounting_guest_deposit_reconciles (id, customer_key, reservation_date, amount, journal_doc, guest_name)
        VALUES (${randomUUID()}, ${deposit.customerKey}, ${deposit.reservationDate}, ${deposit.amount}, ${doc}, ${deposit.name})
      `);
      await db.execute(sql`
        INSERT INTO accounting_guest_deposit_ledger (
          id, business_date, visit_date, customer_key, customer_name, email, phone, direction, amount, memo, order_guid, source, reservation_date
        ) VALUES (
          ${randomUUID()},
          ${today},
          ${deposit.reservationDate},
          ${deposit.customerKey},
          ${deposit.name},
          ${deposit.email},
          ${deposit.phone},
          'debit',
          ${deposit.amount},
          ${`Reservation date passed. Journal ${doc}`.slice(0, 200)},
          '',
          ${deposit.source},
          ${deposit.reservationDate}
        )
      `);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Posted ${doc}. The guest ledger was not fully updated. Do not post this list again. ${message}`);
  }
  return {
    doc,
    count: review.count,
    toastTables: review.toastTables,
    total: review.total,
    liability: `${liability.number} ${liability.name}`,
    creditAccount: `${revenue.number} ${revenue.name}`,
  };
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

  router.post("/toast-sales/mapping/name", isAdmin, (req, res) => {
    try {
      res.json(assignToastSalesName(String(req.body?.kind || "OTHERTENDER"), String(req.body?.name || ""), String(req.body?.account || ""), String(req.body?.className || "")));
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

  router.get("/toast-sales/close-report", isAdmin, async (req, res) => {
    try {
      const through = String(req.query.through || shiftIso(todayIso(), -1));
      res.json(await closeStatusReport(through));
    } catch (error) {
      res.status(500).json({ message: qbFault(error) });
    }
  });

  router.get("/toast-sales/deposits", isAdmin, async (req, res) => {
    try {
      const days = Number(req.query.days || 7);
      const rows = await reviewDeposits(String(req.query.through || ""), days);
      res.json({ rows, advice: await explainDeposits(rows) });
    } catch (error) {
      res.status(500).json({ message: qbFault(error) });
    }
  });

  router.get("/toast-sales/deposit-liability", isAdmin, async (req, res) => {
    try {
      res.json(await reviewDepositLiability(String(req.query.from || ""), String(req.query.to || "")));
    } catch (error) {
      res.status(500).json({ message: qbFault(error) });
    }
  });

  router.get("/toast-sales/deposit-ledger", isAdmin, async (req, res) => {
    try {
      res.json(await guestDepositLedger(String(req.query.q || "")));
    } catch (error) {
      res.status(500).json({ message: qbFault(error) });
    }
  });

  router.get("/toast-sales/deposit-ledger/entries", isAdmin, async (req, res) => {
    try {
      res.json(await guestDepositEntries(String(req.query.customer || "")));
    } catch (error) {
      res.status(400).json({ message: qbFault(error) });
    }
  });

  router.post("/toast-sales/deposit-ledger/sync", isAdmin, async (req, res) => {
    try {
      res.json(await syncGuestDepositLedger(String(req.body?.from || ""), String(req.body?.to || "")));
    } catch (error) {
      res.status(400).json({ message: qbFault(error) });
    }
  });

  router.get("/toast-sales/deposit-ledger/past", isAdmin, async (_req, res) => {
    try {
      res.json(await pastGuestDeposits());
    } catch (error) {
      res.status(500).json({ message: qbFault(error) });
    }
  });

  router.post("/toast-sales/deposit-ledger/past", isAdmin, async (_req, res) => {
    try {
      res.json(await postPastDepositJournal());
    } catch (error) {
      res.status(400).json({ message: qbFault(error) });
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

  router.post("/toast-sales/discuss", isAdmin, async (req, res) => {
    try {
      res.json(await discussToastDay(String(req.body?.date || ""), req.body?.messages));
    } catch (error) {
      res.status(400).json({ message: qbFault(error) });
    }
  });

  router.post("/toast-sales/apply", isAdmin, async (req, res) => {
    try {
      res.json(await applyToastDayChoice(String(req.body?.date || ""), String(req.body?.action || ""), String(req.body?.name || ""), req.body?.messages));
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
