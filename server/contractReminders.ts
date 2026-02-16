import { db } from "./db";
import { sql } from "drizzle-orm";
import { sendEmail, generateBrandedEmailFooter } from "./email";

const NOTIFICATION_DAYS = [60, 45, 30, 15];
const CHECK_INTERVAL = 24 * 60 * 60 * 1000;

export function initContractReminders() {
  console.log("[Contracts] Initializing contract expiration reminder scheduler");
  checkAndSendReminders();
  setInterval(checkAndSendReminders, CHECK_INTERVAL);
}

async function checkAndSendReminders() {
  try {
    for (const daysOut of NOTIFICATION_DAYS) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysOut);
      const dateStr = targetDate.toISOString().split("T")[0];

      const expiringContracts = await db.execute(sql`
        SELECT c.id, c.name, c.vendor, c.expiration_date, c.amount, c.category,
               c.notifications_sent, c.status
        FROM contract_contracts c
        WHERE c.status IN ('active', 'expiring_soon')
          AND c.expiration_date IS NOT NULL
          AND DATE(c.expiration_date) = ${dateStr}::date
      `);

      for (const contract of expiringContracts.rows as any[]) {
        const sent: Record<string, boolean> = parseNotificationsSent(contract.notifications_sent);
        const key = `day_${daysOut}`;

        if (sent[key]) continue;

        const responsibles = await db.execute(sql`
          SELECT pu.email, pu.first_name, pu.last_name
          FROM contract_responsibles cr
          JOIN platform_users pu ON cr.user_id = pu.id
          WHERE cr.contract_id = ${contract.id}
        `);

        const recipients = responsibles.rows as any[];
        if (recipients.length === 0) continue;

        for (const recipient of recipients) {
          await sendContractExpirationEmail(recipient, contract, daysOut);
        }

        sent[key] = true;
        await db.execute(sql`
          UPDATE contract_contracts
          SET notifications_sent = ${JSON.stringify(sent)},
              status = CASE WHEN ${daysOut} <= 60 AND status = 'active' THEN 'expiring_soon'::contract_status ELSE status END,
              updated_at = NOW()
          WHERE id = ${contract.id}
        `);

        console.log(`[Contracts] Sent ${daysOut}-day expiration reminder for "${contract.name}" to ${recipients.length} users`);
      }
    }
  } catch (error) {
    console.error("[Contracts] Error checking contract reminders:", error);
  }
}

function parseNotificationsSent(value: any): Record<string, boolean> {
  if (!value) return {};
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return {};
  }
}

async function sendContractExpirationEmail(
  recipient: { email: string; first_name: string; last_name: string },
  contract: { name: string; vendor: string; expiration_date: string; amount: string | null; category: string },
  daysOut: number
) {
  const expDate = new Date(contract.expiration_date).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const urgencyColor = daysOut <= 15 ? "#dc2626" : daysOut <= 30 ? "#ea580c" : "#d97706";
  const urgencyLabel = daysOut <= 15 ? "URGENT" : daysOut <= 30 ? "Action Required" : "Upcoming";

  const categoryLabel = contract.category.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const amountStr = contract.amount ? `$${parseFloat(contract.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "Not specified";

  const appUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.REPL_SLUG
      ? `https://${process.env.REPL_SLUG}.replit.app`
      : "https://nashoba-valley.replit.app";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${urgencyColor}; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0; font-size: 18px;">${urgencyLabel}: Contract Expiring in ${daysOut} Days</h2>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p>Hi ${recipient.first_name},</p>
        <p>This is a reminder that the following contract is expiring soon and may need renegotiation:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-weight: bold; width: 140px;">Contract</td><td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${contract.name}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-weight: bold;">Vendor</td><td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${contract.vendor}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-weight: bold;">Category</td><td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${categoryLabel}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-weight: bold;">Expiration</td><td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${expDate}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-weight: bold;">Amount</td><td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${amountStr}</td></tr>
        </table>
        <p>Please review the contract and begin negotiations if needed. You can manage this contract in the platform:</p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${appUrl}/contracts" style="background: ${urgencyColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Contract</a>
        </p>
        ${generateBrandedEmailFooter(false)}
      </div>
    </div>
  `;

  const text = `${urgencyLabel}: Contract "${contract.name}" with ${contract.vendor} expires on ${expDate} (${daysOut} days). Amount: ${amountStr}. Please review and begin negotiations if needed.`;

  try {
    await sendEmail(recipient.email, `${urgencyLabel}: "${contract.name}" expires in ${daysOut} days`, html, text);
  } catch (error) {
    console.error(`[Contracts] Failed to send reminder to ${recipient.email}:`, error);
  }
}
