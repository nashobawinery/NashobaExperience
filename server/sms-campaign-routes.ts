import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { smsCampaigns, smsMessages } from "@shared/schema";
import { sendSMS, isSmsConfigured } from "./sms";
import { isPlatformAuthenticated } from "./platformAuth";
import { generateUnsubscribeUrl } from "./unsubscribe-routes";

const router = Router();
const isAuthenticated = isPlatformAuthenticated;

router.get("/status", isAuthenticated, async (_req, res) => {
  res.json({ configured: isSmsConfigured() });
});

router.get("/campaigns", isAuthenticated, async (_req, res) => {
  try {
    const campaigns = await db.execute(sql`
      SELECT * FROM sms_campaigns ORDER BY created_at DESC
    `);
    res.json(campaigns.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/campaigns/:id", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await db.execute(sql`
      SELECT * FROM sms_campaigns WHERE id = ${parseInt(id)}
    `);
    if (campaign.rows.length === 0) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    const messages = await db.execute(sql`
      SELECT * FROM sms_messages WHERE campaign_id = ${parseInt(id)} ORDER BY created_at DESC LIMIT 100
    `);
    res.json({ campaign: campaign.rows[0], messages: messages.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/campaigns", isAuthenticated, async (req, res) => {
  try {
    const { name, message, segments, scheduledAt } = req.body;
    if (!name || !message) {
      return res.status(400).json({ error: "Name and message are required" });
    }

    const segArray = segments && segments.length > 0 
      ? `{${segments.map((s: string) => `"${s}"`).join(',')}}` 
      : null;
    const sess = req.session as any;
    const user = sess.platformAuth?.userId ? {
      id: sess.platformAuth.userId,
      email: sess.platformAuth.email,
      firstName: sess.platformAuth.firstName,
      lastName: sess.platformAuth.lastName
    } : null;

    const result = await db.execute(sql`
      INSERT INTO sms_campaigns (name, message, segments, status, created_by, scheduled_at)
      VALUES (${name}, ${message}, ${segArray}::text[], 'draft', ${user?.email || 'unknown'}, ${scheduledAt || null})
      RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/campaigns/:id/preview", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await db.execute(sql`
      SELECT * FROM sms_campaigns WHERE id = ${parseInt(id)}
    `);
    if (campaign.rows.length === 0) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const c = campaign.rows[0] as any;
    const segments: string[] = c.segments || [];
    const segmentCondition = segments.length > 0
      ? sql`AND reactivation_segment = ANY(${`{${segments.map(s => `"${s}"`).join(',')}}`}::text[])`
      : sql``;

    const countResult = await db.execute(sql`
      SELECT COUNT(*) as total FROM toast_guests
      WHERE phone1 IS NOT NULL AND phone1 != ''
      AND (phone1_marketing_preference IS NULL OR phone1_marketing_preference != 'OPT_OUT')
      AND merged_into_id IS NULL
      ${segmentCondition}
    `);

    const sampleResult = await db.execute(sql`
      SELECT id, first_name, last_name, phone1, reactivation_segment, lifetime_spend, last_visit_date
      FROM toast_guests
      WHERE phone1 IS NOT NULL AND phone1 != ''
      AND (phone1_marketing_preference IS NULL OR phone1_marketing_preference != 'OPT_OUT')
      AND merged_into_id IS NULL
      ${segmentCondition}
      ORDER BY lifetime_spend DESC NULLS LAST
      LIMIT 10
    `);

    res.json({
      totalRecipients: parseInt((countResult.rows[0] as any).total),
      sampleRecipients: sampleResult.rows,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/campaigns/:id/send", isAuthenticated, async (req, res) => {
  try {
    if (!isSmsConfigured()) {
      return res.status(400).json({ error: "SMS is not configured. Check Twilio credentials." });
    }

    const { id } = req.params;
    const { limit: sendLimit } = req.body;
    const maxSend = Math.min(sendLimit || 50, 500);

    const campaign = await db.execute(sql`
      SELECT * FROM sms_campaigns WHERE id = ${parseInt(id)}
    `);
    if (campaign.rows.length === 0) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const c = campaign.rows[0] as any;
    if (c.status === "sending") {
      return res.status(400).json({ error: "Campaign is already sending" });
    }

    const segments: string[] = c.segments || [];
    const segmentCondition = segments.length > 0
      ? sql`AND reactivation_segment = ANY(${`{${segments.map(s => `"${s}"`).join(',')}}`}::text[])`
      : sql``;

    const recipients = await db.execute(sql`
      SELECT id, first_name, last_name, phone1 FROM toast_guests
      WHERE phone1 IS NOT NULL AND phone1 != ''
      AND (phone1_marketing_preference IS NULL OR phone1_marketing_preference != 'OPT_OUT')
      AND merged_into_id IS NULL
      ${segmentCondition}
      AND id NOT IN (SELECT toast_guest_id FROM sms_messages WHERE campaign_id = ${parseInt(id)} AND toast_guest_id IS NOT NULL)
      ORDER BY lifetime_spend DESC NULLS LAST
      LIMIT ${maxSend}
    `);

    const isFirstBatch = !c.sent_at;
    await db.execute(sql`
      UPDATE sms_campaigns SET status = 'sending',
        total_recipients = COALESCE(total_recipients, 0) + ${recipients.rows.length},
        sent_at = COALESCE(sent_at, NOW())
      WHERE id = ${parseInt(id)}
    `);

    res.json({ status: "sending", totalRecipients: recipients.rows.length });

    let sent = 0;
    let failed = 0;

    for (const recipient of recipients.rows as any[]) {
      const firstName = recipient.first_name || "Friend";
      const personalizedMessage = c.message.replace(/\{first_name\}/gi, firstName);
      const unsubUrl = generateUnsubscribeUrl(recipient.id, "sms");
      const fullMessage = `${personalizedMessage}\n\nTo opt out: ${unsubUrl}`;

      try {
        const result = await sendSMS(recipient.phone1, fullMessage);

        await db.execute(sql`
          INSERT INTO sms_messages (campaign_id, toast_guest_id, recipient_phone, recipient_name, message_body, status, twilio_sid, sent_at)
          VALUES (${parseInt(id)}, ${recipient.id}, ${recipient.phone1}, ${firstName + ' ' + (recipient.last_name || '')}, ${fullMessage}, ${result.success ? 'sent' : 'failed'}, ${result.messageId || null}, NOW())
        `);

        if (result.success) {
          sent++;
        } else {
          failed++;
          await db.execute(sql`
            UPDATE sms_messages SET error_message = ${result.error || 'Unknown error'}
            WHERE campaign_id = ${parseInt(id)} AND toast_guest_id = ${recipient.id}
          `);
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error: any) {
        failed++;
        await db.execute(sql`
          INSERT INTO sms_messages (campaign_id, toast_guest_id, recipient_phone, recipient_name, message_body, status, error_message, sent_at)
          VALUES (${parseInt(id)}, ${recipient.id}, ${recipient.phone1}, ${firstName}, ${fullMessage}, 'failed', ${error.message}, NOW())
        `);
      }
    }

    const remainingResult = await db.execute(sql`
      SELECT COUNT(*) as remaining FROM toast_guests
      WHERE phone1 IS NOT NULL AND phone1 != ''
      AND (phone1_marketing_preference IS NULL OR phone1_marketing_preference != 'OPT_OUT')
      AND merged_into_id IS NULL
      ${segmentCondition}
      AND id NOT IN (SELECT toast_guest_id FROM sms_messages WHERE campaign_id = ${parseInt(id)} AND toast_guest_id IS NOT NULL)
    `);
    const remaining = parseInt((remainingResult.rows[0] as any).remaining);

    await db.execute(sql`
      UPDATE sms_campaigns SET
        status = ${remaining === 0 ? 'completed' : 'partial'},
        total_sent = COALESCE(total_sent, 0) + ${sent},
        total_delivered = COALESCE(total_delivered, 0) + ${sent},
        total_failed = COALESCE(total_failed, 0) + ${failed},
        completed_at = ${remaining === 0 ? sql`NOW()` : sql`NULL`}
      WHERE id = ${parseInt(id)}
    `);

    console.log(`[SMS Campaign] Campaign ${id} complete: ${sent} sent, ${failed} failed`);
  } catch (error: any) {
    console.error("[SMS Campaign] Error:", error.message);
    await db.execute(sql`
      UPDATE sms_campaigns SET status = 'failed' WHERE id = ${parseInt(req.params.id)}
    `);
  }
});

router.post("/campaigns/:id/test", isAuthenticated, async (req, res) => {
  try {
    if (!isSmsConfigured()) {
      return res.status(400).json({ error: "SMS is not configured" });
    }

    const { id } = req.params;
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: "Phone number required" });
    }

    const campaign = await db.execute(sql`
      SELECT * FROM sms_campaigns WHERE id = ${parseInt(id)}
    `);
    if (campaign.rows.length === 0) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const c = campaign.rows[0] as any;
    const testMessage = c.message.replace(/\{first_name\}/gi, "Test");

    const result = await sendSMS(phone, `[TEST] ${testMessage}`);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/campaigns/:id", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute(sql`DELETE FROM sms_messages WHERE campaign_id = ${parseInt(id)}`);
    await db.execute(sql`DELETE FROM sms_campaigns WHERE id = ${parseInt(id)}`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/send-quick", isAuthenticated, async (req, res) => {
  try {
    if (!isSmsConfigured()) {
      return res.status(400).json({ error: "SMS is not configured" });
    }
    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ error: "Phone and message are required" });
    }
    const result = await sendSMS(phone, message);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
