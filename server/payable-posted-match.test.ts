import assert from "node:assert/strict";
import test from "node:test";
import { choosePostedBill, docVariants, normalizeDoc, postedBillBlock, type PostedBill } from "./payable-posted-match";

const usFoods: PostedBill = {
  id: "46496",
  doc: "18964",
  vendorId: "614",
  vendorName: "US Foods, Inc",
  total: 4751.08,
};

test("invoice numbers ignore leading zeros", () => {
  assert.equal(normalizeDoc("018964"), normalizeDoc("18964"));
  assert.deepEqual(docVariants("018964"), ["018964", "18964"]);
});

test("a unique vendor and invoice already in QuickBooks is posted", () => {
  const chosen = choosePostedBill(
    { invoiceNumber: "18964", vendorId: "614", vendorName: "US Foods", amount: 4751.08 },
    [usFoods],
  );
  assert.equal(chosen?.billId, "46496");
  assert.match(chosen?.note || "", /already in QuickBooks/);
  assert.doesNotMatch(chosen?.note || "", /This copy shows/);
});

test("a different amount is still posted and the two amounts are named", () => {
  const chosen = choosePostedBill(
    { invoiceNumber: "18964", vendorId: null, vendorName: "US Foods, Inc", amount: 4677.76 },
    [usFoods],
  );
  assert.equal(chosen?.billId, "46496");
  assert.match(chosen?.note || "", /\$4751\.08/);
  assert.match(chosen?.note || "", /\$4677\.76/);
});

test("another vendor with the same invoice number is left for approval", () => {
  const chosen = choosePostedBill(
    { invoiceNumber: "18964", vendorId: "22", vendorName: "Smith", amount: 4751.08 },
    [usFoods],
  );
  assert.equal(chosen, null);
});

test("two QuickBooks bills for one invoice are left for approval unless one amount matches", () => {
  const second = { ...usFoods, id: "46510", total: 100 };
  assert.equal(choosePostedBill(
    { invoiceNumber: "18964", vendorId: "614", vendorName: "US Foods", amount: 50 },
    [usFoods, second],
  ), null);
  const priced = choosePostedBill(
    { invoiceNumber: "18964", vendorId: "614", vendorName: "US Foods", amount: 100 },
    [usFoods, second],
  );
  assert.equal(priced?.billId, "46510");
});

test("two QuickBooks bills produce a notice and one exact amount does not", () => {
  const second = { ...usFoods, id: "46510", total: 100 };
  assert.match(postedBillBlock(
    { invoiceNumber: "18964", vendorId: "614", vendorName: "US Foods", amount: 50 },
    [usFoods, second],
  ) || "", /left for approval/);
  assert.equal(postedBillBlock(
    { invoiceNumber: "18964", vendorId: "614", vendorName: "US Foods", amount: 100 },
    [usFoods, second],
  ), null);
  assert.equal(postedBillBlock(
    { invoiceNumber: "99999", vendorId: "614", vendorName: "US Foods", amount: 10 },
    [usFoods],
  ), null);
});

test("a statement-length number that is too short is not matched", () => {
  assert.equal(choosePostedBill(
    { invoiceNumber: "12", vendorId: "614", vendorName: "US Foods", amount: 12 },
    [{ ...usFoods, doc: "12", total: 12 }],
  ), null);
});
