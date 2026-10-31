import sgMail from "@sendgrid/mail";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { attentionText, type NoticeLine } from "./accounting-notice-text";

const TO = "email@nashobawinery.com";
let tableReady = false;

async function ensureNoticeTable() {
  if (tableReady) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS accounting_attention_notices (
      notice_key varchar PRIMARY KEY,
      subject text NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);
  tableReady = true;
}

async function forget(keys: string[]) {
  for (const key of keys) {
    await db.execute(sql`DELETE FROM accounting_attention_notices WHERE notice_key = ${key}`);
  }
}

export async function sendAccountingAttention(subject: string, intro: string, items: NoticeLine[]) {
  const unique = new Map<string, string>();
  for (const item of items) {
    const key = item.key.trim().slice(0, 500);
    const line = item.line.trim();
    if (key && line) unique.set(key, line);
  }
  if (!unique.size) return { sent: false, count: 0 };
  try {
    await ensureNoticeTable();
    const fresh: string[] = [];
    const lines: string[] = [];
    for (const [key, line] of unique) {
      const inserted = await db.execute(sql`
        INSERT INTO accounting_attention_notices (notice_key, subject)
        VALUES (${key}, ${subject})
        ON CONFLICT (notice_key) DO NOTHING
        RETURNING notice_key
      `);
      if (inserted.rows[0]) {
        fresh.push(key);
        lines.push(line);
      }
    }
    if (!lines.length) return { sent: false, count: 0 };
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      await forget(fresh);
      console.error("[Accounting] Email is not configured, so the notice was not sent.");
      return { sent: false, count: 0 };
    }
    const text = attentionText(intro, lines);
    const html = `<div style="font-family:sans-serif;color:#111;max-width:640px;"><p>${intro.replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char] || char))}</p><ul>${lines.map((line) => `<li>${line.replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char] || char))}</li>`).join("")}</ul><p>Log in at <a href="https://nashobawinery.org/accounting">Accounting</a> and look into this.</p></div>`;
    try {
      sgMail.setApiKey(apiKey);
      await sgMail.send({
        to: TO,
        from: { email: process.env.SENDGRID_FROM_EMAIL || TO, name: "Nashoba Experience" },
        subject,
        text,
        html,
      });
      console.log(`[Accounting] Emailed ${TO} about ${lines.length} item(s): ${subject}`);
      return { sent: true, count: lines.length };
    } catch (error) {
      await forget(fresh);
      console.error("[Accounting] The notice email was not sent:", error instanceof Error ? error.message : "send failed");
      return { sent: false, count: 0 };
    }
  } catch (error) {
    console.error("[Accounting] The notice could not be recorded:", error instanceof Error ? error.message : "notice failed");
    return { sent: false, count: 0 };
  }
}
