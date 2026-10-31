export type NoticeLine = { key: string; line: string };

const paymentStatuses = new Set(["unmatched", "ambiguous", "mixed", "posted-to-payable"]);
const draftStatuses = new Set(["missing-bill", "amount-differs", "needs-review"]);

export function paymentNotice(expense: { id: string; date: string; amount: number; status: string; note: string }): NoticeLine | null {
  if (!paymentStatuses.has(expense.status)) return null;
  return {
    key: `us-foods:${expense.id}:${expense.status}`,
    line: `US Foods withdrawal on ${expense.date} for $${expense.amount.toFixed(2)}. ${expense.note}`,
  };
}

export function draftNotice(draft: { date: string; reference: string; status: string; note: string }): NoticeLine | null {
  if (!draftStatuses.has(draft.status)) return null;
  return {
    key: `us-foods-draft:${draft.date}:${draft.reference}:${draft.status}`,
    line: `US Foods draft ${draft.reference} on ${draft.date}. ${draft.note}`,
  };
}

export function applyFailureNotice(reference: string, message: string): NoticeLine {
  return {
    key: `us-foods-apply:${reference}:${message}`.slice(0, 500),
    line: `US Foods ${reference} was not applied. ${message}`,
  };
}

export function statementNotices(vendorName: string, issues: { severity: string; title: string; detail: string }[]): NoticeLine[] {
  return issues.filter((issue) => issue.severity === "high").map((issue) => ({
    key: `statement:${vendorName}:${issue.title}:${issue.detail}`.slice(0, 500),
    line: `${vendorName}. ${issue.title}. ${issue.detail}`,
  }));
}

export function amountNotice(id: string, vendorName: string, invoiceNumber: string, note: string): NoticeLine | null {
  if (!note.includes("This copy shows")) return null;
  return {
    key: `payable-amount:${id}`,
    line: `${vendorName || "Vendor"} invoice ${invoiceNumber}. ${note}`,
  };
}

export function blockNotice(id: string, block: string): NoticeLine {
  return { key: `payable-block:${id}`, line: block };
}

export function attentionText(intro: string, lines: string[]) {
  return [
    "Nashoba Experience",
    "",
    intro,
    "",
    ...lines.map((line) => `- ${line}`),
    "",
    "Log in at https://nashobawinery.org/accounting and look into this.",
  ].join("\n");
}
