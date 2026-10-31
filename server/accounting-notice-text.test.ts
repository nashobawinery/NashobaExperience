import assert from "node:assert/strict";
import test from "node:test";
import { amountNotice, attentionText, draftNotice, paymentNotice, statementNotices } from "./accounting-notice-text";

test("a withdrawal that cannot be applied is included, and a completed one is not", () => {
  const open = paymentNotice({
    id: "88",
    date: "2026-10-24",
    amount: 3271.49,
    status: "unmatched",
    note: "No open invoices due that week add up to this draft.",
  });
  assert.match(open?.line || "", /3271\.49/);
  assert.equal(paymentNotice({
    id: "88",
    date: "2026-10-24",
    amount: 10,
    status: "corrected",
    note: "Already replaced.",
  }), null);
});

test("a draft with a missing invoice is included, and a closed draft is not", () => {
  assert.match(draftNotice({
    date: "2026-10-24",
    reference: "EFT1024",
    status: "missing-bill",
    note: "An invoice on this draft is not in QuickBooks yet.",
  })?.line || "", /EFT1024/);
  assert.equal(draftNotice({
    date: "2026-10-24",
    reference: "EFT1024",
    status: "already-paid",
    note: "These invoices are already closed.",
  }), null);
});

test("a statement emails only when the invoices cannot be reconciled", () => {
  const lines = statementNotices("US Foods", [
    { severity: "high", title: "Amounts do not match", detail: "18964: statement 4677.76, books 4751.08" },
    { severity: "medium", title: "Already paid", detail: "813579" },
  ]);
  assert.equal(lines.length, 1);
  assert.match(lines[0].line, /18964/);
});

test("an amount difference on a posted invoice is included", () => {
  const line = amountNotice("p1", "US Foods", "18964", "Posted. Invoice 18964 was already in QuickBooks for $4751.08. This copy shows $4677.76 and was not sent again.");
  assert.match(line?.line || "", /4677\.76/);
  assert.equal(amountNotice("p1", "US Foods", "18964", "Posted. Invoice 18964 was already in QuickBooks, so this copy was not sent again."), null);
});

test("the email names the accounting page", () => {
  const text = attentionText("A payment could not be applied to the invoices.", ["US Foods withdrawal on 2026-10-24 for $10.00."]);
  assert.match(text, /nashobawinery.org\/accounting/);
  assert.match(text, /\$10\.00/);
});
