import { db } from "./db";
import { sql } from "drizzle-orm";
import sgMail from "@sendgrid/mail";
import { sendEmail, generateBrandedEmailFooter } from "./email";

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function generateVendorReminderEmail(
  truckName: string,
  eventDate: string,
  eventTitle: string,
  daysOut: number,
  isRemoval: boolean
): string {
  const formattedDate = new Date(eventDate + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (isRemoval) {
    return `
<!DOCTYPE html>
<html>
<head><style>
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
  .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
  .content { padding: 30px; max-width: 600px; margin: 0 auto; }
  .alert { background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin: 20px 0; }
</style></head>
<body>
<div class="header"><h2>Nashoba Valley Winery — Food Truck Scheduling Notice</h2></div>
<div class="content">
  <p>Dear ${truckName},</p>
  <p>We regret to inform you that your scheduled appearance at Nashoba Valley Winery on <strong>${formattedDate}</strong> has been <strong>removed from our calendar</strong>.</p>
  <div class="alert">
    <strong>Reason:</strong> A valid Nashoba Board of Health food vendor permit was not submitted prior to your scheduled event date.
  </div>
  <p>Per our vendor policy, all food trucks must hold a valid permit from the <strong>Nashoba Board of Health (Ayer, MA)</strong> to appear at our venue. Without an active permit on file, we are unable to host your truck.</p>
  <p>We would love to have you back in the future. Once you have obtained your permit, please resubmit your application through our website and we will be happy to reschedule you.</p>
  <p>Thank you for your understanding.</p>
  <p>Warm regards,<br><strong>Nashoba Valley Winery Events Team</strong></p>
  ${generateBrandedEmailFooter(true)}
</div>
</body></html>`;
  }

  const urgencyColor = daysOut <= 7 ? "#dc2626" : daysOut <= 14 ? "#f59e0b" : "#2563eb";
  const urgencyLabel = daysOut <= 7 ? "URGENT" : daysOut <= 14 ? "ACTION REQUIRED" : "REMINDER";

  return `
<!DOCTYPE html>
<html>
<head><style>
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
  .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; }
  .content { padding: 30px; max-width: 600px; margin: 0 auto; }
  .alert { background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 16px; margin: 20px 0; }
  .urgent { color: ${urgencyColor}; font-weight: bold; }
  .steps { background-color: #f9fafb; border-radius: 6px; padding: 16px; margin: 20px 0; }
  .steps ol { margin: 8px 0; padding-left: 20px; }
</style></head>
<body>
<div class="header"><h2>Food Permit Required — ${urgencyLabel}</h2></div>
<div class="content">
  <p>Dear ${truckName},</p>
  <p>You have an upcoming scheduled appearance at <strong>Nashoba Valley Winery</strong>:</p>
  <div class="alert">
    <strong>Event:</strong> ${eventTitle}<br>
    <strong>Date:</strong> ${formattedDate}<br>
    <span class="urgent">Days Remaining: ${daysOut}</span>
  </div>
  <p>Our records show that we have <strong>not yet received a copy of your valid Nashoba Board of Health food vendor permit</strong>. This permit is required for all food truck vendors appearing at our venue.</p>
  <p><strong>Please submit your permit as soon as possible.</strong> If we do not receive a valid permit on file, your appearance will be removed from our calendar <strong>30 days before your event date</strong>.</p>
  <div class="steps">
    <strong>How to obtain your permit (if you haven't already):</strong>
    <ol>
      <li>Contact the <strong>Nashoba Board of Health</strong>, Town of Ayer, MA at (978) 772-8220</li>
      <li>Complete the Mobile Food Vendor permit application</li>
      <li>Ensure your ServSafe or equivalent food safety certification is current</li>
      <li>Once approved, email a copy of your permit to <a href="mailto:events@nashobawinery.com">events@nashobawinery.com</a></li>
    </ol>
  </div>
  <p>If you have already submitted your permit and believe this message was sent in error, please contact us at <a href="mailto:events@nashobawinery.com">events@nashobawinery.com</a>.</p>
  <p>Thank you for your cooperation.</p>
  <p>Warm regards,<br><strong>Nashoba Valley Winery Events Team</strong></p>
  ${generateBrandedEmailFooter(true)}
</div>
</body></html>`;
}

function generateAdminAlertEmail(
  truckName: string,
  eventDate: string,
  eventTitle: string,
  eventId: number,
  daysOut: number,
  isRemoval: boolean,
  truckEmail: string | null
): string {
  const formattedDate = new Date(eventDate + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const manageUrl = `${process.env.APP_URL || "https://nashobawinery.org"}/media-center`;

  if (isRemoval) {
    return `
<!DOCTYPE html>
<html>
<head><style>
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
  .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
  .content { padding: 30px; max-width: 600px; margin: 0 auto; }
  .info { background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin: 20px 0; }
</style></head>
<body>
<div class="header"><h2>Food Truck Auto-Removed — Permit Not Submitted</h2></div>
<div class="content">
  <p>This is an automated notification from Nashoba Valley Winery's Food Truck system.</p>
  <div class="info">
    <strong>Truck:</strong> ${truckName}<br>
    <strong>Event:</strong> ${eventTitle}<br>
    <strong>Scheduled Date:</strong> ${formattedDate}<br>
    <strong>Vendor Email:</strong> ${truckEmail || "Not on file"}
  </div>
  <p>This food truck event has been <strong>automatically removed from the public calendar</strong> because no valid Board of Health permit was submitted before the event date.</p>
  <p>A removal notice has been sent to the vendor${truckEmail ? ` at ${truckEmail}` : ""}.</p>
  <p><a href="${manageUrl}">Manage Food Trucks →</a></p>
  ${generateBrandedEmailFooter(false)}
</div>
</body></html>`;
  }

  return `
<!DOCTYPE html>
<html>
<head><style>
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
  .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; }
  .content { padding: 30px; max-width: 600px; margin: 0 auto; }
  .info { background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 16px; margin: 20px 0; }
  .urgent { color: #dc2626; font-weight: bold; }
</style></head>
<body>
<div class="header"><h2>Food Truck Permit Missing — Admin Alert</h2></div>
<div class="content">
  <p>This is an automated notification from Nashoba Valley Winery's Food Truck scheduling system.</p>
  <div class="info">
    <strong>Truck:</strong> ${truckName}<br>
    <strong>Event:</strong> ${eventTitle}<br>
    <strong>Scheduled Date:</strong> ${formattedDate}<br>
    <strong>Vendor Email:</strong> ${truckEmail || "Not on file"}<br>
    <span class="urgent">Days Until Event: ${daysOut}</span>
  </div>
  <p>A weekly permit reminder has been sent to this vendor. If no permit is submitted before the event date, the event will be <strong>automatically removed from the public calendar</strong>.</p>
  <p>You may manually update the permit status or remove the event via the admin panel:</p>
  <p><a href="${manageUrl}">Manage Food Trucks →</a></p>
  ${generateBrandedEmailFooter(false)}
</div>
</body></html>`;
}

async function getAdminEmails(): Promise<{ email: string; firstName: string }[]> {
  try {
    const result = await db.execute(sql`
      SELECT email, first_name
      FROM platform_users
      WHERE global_role = 'admin'
        AND email IS NOT NULL
        AND active = true
    `);
    return (result.rows as any[]).map((r) => ({
      email: r.email as string,
      firstName: (r.first_name as string) || "Admin",
    }));
  } catch {
    return [];
  }
}

export async function runFoodTruckPermitReminders(): Promise<void> {
  console.log(`[Food Truck Permits] Starting permit reminder check at ${new Date().toISOString()}`);

  if (!process.env.SENDGRID_API_KEY) {
    console.log("[Food Truck Permits] SendGrid not configured, skipping reminders");
    return;
  }

  try {
    const today = new Date().toISOString().split("T")[0];

    // Find active future events where the truck still lacks a compliant permit on file.
    // A permit PDF upload (permit_image_url) satisfies the requirement when no expiry is recorded yet;
    // if an expiry date is present and in the past, keep reminding until staff renews (image + future expiry).
    const upcomingEvents = await db.execute(sql`
      SELECT
        e.id AS event_id,
        e.title,
        e.event_date,
        e.permit_reminder_sent_at,
        t.id AS truck_id,
        t.name AS truck_name,
        t.contact_email,
        t.permit_expiry
      FROM media_food_truck_events e
      JOIN media_food_trucks t ON e.food_truck_id = t.id
      WHERE e.is_active = true
        AND e.event_date >= ${today}
        AND NOT (
          (t.permit_expiry IS NOT NULL AND t.permit_expiry >= ${today})
          OR (
            TRIM(COALESCE(t.permit_image_url, '')) <> ''
            AND (t.permit_expiry IS NULL OR t.permit_expiry >= ${today})
          )
        )
      ORDER BY e.event_date ASC
    `);

    const rows = upcomingEvents.rows as any[];
    const adminUsers = await getAdminEmails();

    let remindersSent = 0;
    let removedCount = 0;

    for (const row of rows) {
      const days = daysUntil(row.event_date);

      // Auto-remove: event is today or past (shouldn't be in future query but guard anyway)
      // Also auto-remove if event is within 0 days (day of event, no permit)
      if (days <= 0) {
        await db.execute(sql`
          UPDATE media_food_truck_events SET is_active = false WHERE id = ${row.event_id}
        `);
        removedCount++;
        console.log(`[Food Truck Permits] Auto-removed event ${row.event_id} (${row.truck_name}) — event date passed with no permit`);

        // Notify vendor of removal
        if (row.contact_email) {
          try {
            const html = generateVendorReminderEmail(row.truck_name, row.event_date, row.title, days, true);
            await sendEmail(row.contact_email, `Your Nashoba Valley Winery appearance has been removed — ${row.title}`, html, `Your scheduled appearance on ${row.event_date} has been removed because no Board of Health permit was on file.`);
          } catch (err) {
            console.error(`[Food Truck Permits] Failed to send removal notice to ${row.contact_email}:`, err);
          }
        }

        // Notify admins of removal
        for (const admin of adminUsers) {
          try {
            const html = generateAdminAlertEmail(row.truck_name, row.event_date, row.title, row.event_id, days, true, row.contact_email);
            await sendEmail(admin.email, `[Food Truck Auto-Removed] ${row.truck_name} — ${row.event_date}`, html, `Food truck ${row.truck_name} was auto-removed from the calendar (no permit on file).`);
          } catch (err) {
            console.error(`[Food Truck Permits] Failed to send admin removal alert to ${admin.email}:`, err);
          }
        }
        continue;
      }

      // Only send reminders within 30 days of the event
      if (days > 30) continue;

      // Throttle: only send once per week per event
      const lastSent = row.permit_reminder_sent_at ? new Date(row.permit_reminder_sent_at) : null;
      if (lastSent) {
        const daysSinceLastSent = Math.floor((Date.now() - lastSent.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceLastSent < 7) continue;
      }

      console.log(`[Food Truck Permits] Sending reminder for event ${row.event_id} (${row.truck_name}) — ${days} days out`);

      // Send to vendor
      if (row.contact_email) {
        try {
          const html = generateVendorReminderEmail(row.truck_name, row.event_date, row.title, days, false);
          await sendEmail(
            row.contact_email,
            `Action Required: Food Permit Needed for Your Nashoba Valley Winery Appearance (${days} days away)`,
            html,
            `Your appearance at Nashoba Valley Winery on ${row.event_date} requires a valid Board of Health permit. Please submit your permit immediately.`
          );
          remindersSent++;
        } catch (err) {
          console.error(`[Food Truck Permits] Failed to send vendor reminder to ${row.contact_email}:`, err);
        }
      }

      // Send to all admins
      for (const admin of adminUsers) {
        try {
          const html = generateAdminAlertEmail(row.truck_name, row.event_date, row.title, row.event_id, days, false, row.contact_email);
          await sendEmail(
            admin.email,
            `[Food Truck Permit Alert] ${row.truck_name} — ${days} days until event`,
            html,
            `Food truck ${row.truck_name} has an appearance on ${row.event_date} but no valid Board of Health permit is on file.`
          );
        } catch (err) {
          console.error(`[Food Truck Permits] Failed to send admin alert to ${admin.email}:`, err);
        }
      }

      // Update reminder timestamp
      await db.execute(sql`
        UPDATE media_food_truck_events SET permit_reminder_sent_at = NOW() WHERE id = ${row.event_id}
      `);
    }

    console.log(`[Food Truck Permits] Completed: ${remindersSent} vendor reminders sent, ${removedCount} events auto-removed`);
  } catch (error) {
    console.error("[Food Truck Permits] Fatal error in reminder job:", error);
  }
}

function scheduleNextRun() {
  const now = new Date();
  const next = new Date();
  next.setHours(8, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  const msUntilNext = next.getTime() - now.getTime();
  const minutesUntilNext = Math.round(msUntilNext / 60000);
  console.log(`[Food Truck Permits] Next reminder run scheduled for ${next.toLocaleString("en-US")} (in ${minutesUntilNext} minutes)`);

  setTimeout(async () => {
    try {
      await runFoodTruckPermitReminders();
    } catch (error) {
      console.error("[Food Truck Permits] Error running scheduled job:", error);
    }
    scheduleNextRun();
  }, msUntilNext);
}

export function initFoodTruckPermitReminders() {
  scheduleNextRun();
  console.log("[Food Truck Permits] Scheduler initialized");
}
