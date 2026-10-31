export type PostedBill = {
  id: string;
  doc: string;
  vendorId: string;
  vendorName: string;
  total: number;
};

export type PostedPayable = {
  invoiceNumber: string;
  vendorId: string | null;
  vendorName: string | null;
  amount: number | null;
};

export function normalizeDoc(value: string) {
  const digits = String(value || "").replace(/\D/g, "").replace(/^0+/, "");
  return digits || String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function docVariants(value: string) {
  const raw = String(value || "").trim().slice(0, 21);
  const digits = raw.replace(/\D/g, "");
  const stripped = digits.replace(/^0+/, "");
  const variants = [raw, digits, stripped].filter((item) => /^[A-Za-z0-9-]+$/.test(item) && item.length >= 4 && item.length <= 21);
  return [...new Set(variants)];
}

function cents(value: number) {
  return Math.round(Number(value) * 100);
}

function money(value: number) {
  return `$${Number(value).toFixed(2)}`;
}

function vendorNamesMatch(left: string, right: string) {
  const a = left.toLowerCase().replace(/[^a-z0-9]/g, "");
  const b = right.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (a.length < 4 || b.length < 4) return false;
  return a.includes(b) || b.includes(a);
}

function vendorBills(payable: PostedPayable, bills: PostedBill[]) {
  const key = normalizeDoc(payable.invoiceNumber);
  if (key.length < 4) return [];
  const sameNumber = bills.filter((bill) => normalizeDoc(bill.doc) === key);
  if (payable.vendorId) return sameNumber.filter((bill) => bill.vendorId === payable.vendorId);
  if (payable.vendorName) return sameNumber.filter((bill) => vendorNamesMatch(bill.vendorName, payable.vendorName || ""));
  return [];
}

export function postedBillBlock(payable: PostedPayable, bills: PostedBill[]) {
  const candidates = vendorBills(payable, bills);
  if (candidates.length < 2) return null;
  if (payable.amount != null && Number.isFinite(payable.amount)) {
    const priced = candidates.filter((bill) => cents(bill.total) === cents(payable.amount as number));
    if (priced.length === 1) return null;
  }
  const vendor = payable.vendorName || "this vendor";
  return `Invoice ${payable.invoiceNumber} for ${vendor} matches ${candidates.length} QuickBooks bills, so it was left for approval.`;
}

export function choosePostedBill(payable: PostedPayable, bills: PostedBill[]) {
  let candidates = vendorBills(payable, bills);
  if (candidates.length > 1 && payable.amount != null && Number.isFinite(payable.amount)) {
    const priced = candidates.filter((bill) => cents(bill.total) === cents(payable.amount as number));
    if (priced.length === 1) candidates = priced;
  }
  if (candidates.length !== 1) return null;
  const bill = candidates[0];
  const amountDiffers = payable.amount != null && Number.isFinite(payable.amount) && cents(payable.amount) !== cents(bill.total);
  const note = amountDiffers
    ? `Posted. Invoice ${bill.doc} was already in QuickBooks for ${money(bill.total)}. This copy shows ${money(payable.amount as number)} and was not sent again.`
    : `Posted. Invoice ${bill.doc} was already in QuickBooks, so this copy was not sent again.`;
  return { billId: bill.id, vendorId: bill.vendorId, note };
}
