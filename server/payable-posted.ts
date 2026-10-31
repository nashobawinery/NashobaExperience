import { sql } from "drizzle-orm";
import { db } from "./db";
import { queryQuickBooks } from "./quickbooks-routes";
import { choosePostedBill, docVariants, postedBillBlock, type PostedBill } from "./payable-posted-match";
import { sendAccountingAttention } from "./accounting-notice";
import { amountNotice, blockNotice } from "./accounting-notice-text";

type OpenPayable = {
  id: string;
  invoiceNumber: string;
  vendorId: string | null;
  vendorName: string | null;
  amount: number | null;
};

let started = false;
let running = false;

function faultMessage(error: unknown) {
  const err = error as { response?: { data?: { Fault?: { Error?: { Detail?: string; Message?: string }[] } } }; message?: string };
  const item = err.response?.data?.Fault?.Error?.[0];
  return item?.Detail || item?.Message || err.message || "QuickBooks request failed";
}

async function ensurePostNote() {
  await db.execute(sql`ALTER TABLE accounting_payables ADD COLUMN IF NOT EXISTS post_note text`);
}

async function billsForInvoice(invoiceNumber: string, vendorId: string | null) {
  const found = new Map<string, PostedBill>();
  const vendorClause = vendorId && /^\d+$/.test(vendorId) ? ` AND VendorRef = '${vendorId}'` : "";
  for (const variant of docVariants(invoiceNumber)) {
    const result = await queryQuickBooks(
      `SELECT Id, DocNumber, TotalAmt, VendorRef FROM Bill WHERE DocNumber = '${variant}'${vendorClause} MAXRESULTS 20`,
    );
    const rows = (result.data?.QueryResponse?.Bill ?? []) as {
      Id: string;
      DocNumber?: string;
      TotalAmt?: string | number;
      VendorRef?: { value?: string; name?: string };
    }[];
    for (const row of rows) {
      found.set(row.Id, {
        id: row.Id,
        doc: row.DocNumber || variant,
        vendorId: String(row.VendorRef?.value || ""),
        vendorName: String(row.VendorRef?.name || ""),
        total: Number(row.TotalAmt || 0),
      });
    }
  }
  return [...found.values()];
}

async function markOne(payable: OpenPayable) {
  const bills = await billsForInvoice(payable.invoiceNumber, payable.vendorId);
  const block = postedBillBlock(payable, bills);
  if (block) {
    await sendAccountingAttention(
      "Accounting: an invoice could not be reconciled",
      "An invoice could not be reconciled to QuickBooks.",
      [blockNotice(payable.id, block)],
    );
  }
  const chosen = choosePostedBill(payable, bills);
  if (!chosen) return null;
  const updated = await db.execute(sql`
    UPDATE accounting_payables
    SET qb_bill_id = ${chosen.billId},
        qb_vendor_id = COALESCE(NULLIF(qb_vendor_id, ''), ${chosen.vendorId || null}),
        document_kind = CASE WHEN document_kind = 'unreviewed' THEN 'invoice' ELSE document_kind END,
        post_note = ${chosen.note}
    WHERE id = ${payable.id} AND qb_bill_id IS NULL
    RETURNING id
  `);
  if (!updated.rows[0]) return null;
  const amount = amountNotice(payable.id, payable.vendorName || "", payable.invoiceNumber, chosen.note);
  if (amount) {
    await sendAccountingAttention(
      "Accounting: an invoice could not be reconciled",
      "An invoice amount does not match the bill already in QuickBooks.",
      [amount],
    );
  }
  return chosen.note;
}

export async function markPayableIfAlreadyPosted(id: string) {
  try {
    await ensurePostNote();
    const result = await db.execute(sql`
      SELECT id, invoice_number as "invoiceNumber", vendor_name as "vendorName",
             qb_vendor_id as "vendorId", amount
      FROM accounting_payables
      WHERE id = ${id}
        AND qb_bill_id IS NULL
        AND document_kind <> 'statement'
        AND invoice_number IS NOT NULL
        AND invoice_number <> ''
    `);
    const row = result.rows[0] as { id: string; invoiceNumber: string; vendorName: string | null; vendorId: string | null; amount: string | null } | undefined;
    if (!row) return null;
    return await markOne({
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      vendorId: row.vendorId,
      vendorName: row.vendorName,
      amount: row.amount == null ? null : Number(row.amount),
    });
  } catch (error) {
    console.error("[Payables] Could not check whether this invoice is already in QuickBooks:", faultMessage(error));
    return null;
  }
}

export async function markUnpostedPayables() {
  await ensurePostNote();
  const result = await db.execute(sql`
    SELECT id, invoice_number as "invoiceNumber", vendor_name as "vendorName",
           qb_vendor_id as "vendorId", amount
    FROM accounting_payables
    WHERE qb_bill_id IS NULL
      AND document_kind <> 'statement'
      AND invoice_number IS NOT NULL
      AND invoice_number <> ''
    ORDER BY created_at DESC
  `);
  const notes: string[] = [];
  let linked = 0;
  for (const row of result.rows as { id: string; invoiceNumber: string; vendorName: string | null; vendorId: string | null; amount: string | null }[]) {
    try {
      const note = await markOne({
        id: row.id,
        invoiceNumber: row.invoiceNumber,
        vendorId: row.vendorId,
        vendorName: row.vendorName,
        amount: row.amount == null ? null : Number(row.amount),
      });
      if (note) {
        linked += 1;
        notes.push(note);
      }
    } catch (error) {
      notes.push(`${row.invoiceNumber}: ${faultMessage(error)}`);
    }
  }
  return { linked, notes };
}

export function initPayablePostedReview() {
  if (started || process.env.PAYABLE_POSTED_REVIEW === "0") return;
  started = true;
  const run = () => {
    if (running) return;
    running = true;
    markUnpostedPayables()
      .then((result) => {
        if (result.linked) console.log(`[Payables] Marked ${result.linked} invoice(s) Posted because they were already in QuickBooks.`);
      })
      .catch((error) => console.error("[Payables] Daily posted review failed:", faultMessage(error)))
      .finally(() => {
        running = false;
      });
  };
  setTimeout(run, 75_000);
  setInterval(run, 24 * 60 * 60 * 1000);
}
