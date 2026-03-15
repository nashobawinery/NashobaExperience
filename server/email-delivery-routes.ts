import express from "express";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";

const router = express.Router();

// ── SendGrid Event Webhook ─────────────────────────────────────────────────
// Configure this URL in SendGrid: Settings > Mail Settings > Event Webhook
// URL: https://yourdomain.com/api/support/email-events
// Events to enable: Delivered, Opened, Bounced, Spam Report, Dropped, Deferred
router.post("/api/support/email-events", async (req, res) => {
  try {
    const events = Array.isArray(req.body) ? req.body : [req.body];

    for (const event of events) {
      const sendgridMessageId: string | undefined = event.sg_message_id?.split(".")[0];
      if (!sendgridMessageId) continue;

      const eventType: string = event.event;
      const now = new Date();

      const updates: {
        status: string;
        statusDetail?: string;
        deliveredAt?: Date;
        openedAt?: Date;
        lastEventAt?: Date;
      } = { status: eventType, lastEventAt: now };

      if (eventType === "delivered") {
        updates.status = "delivered";
        updates.deliveredAt = now;
      } else if (eventType === "open") {
        updates.status = "opened";
        updates.openedAt = now;
      } else if (eventType === "bounce") {
        updates.status = "bounced";
        updates.statusDetail = event.reason || event.status || "Bounced";
      } else if (eventType === "spamreport") {
        updates.status = "spam_report";
        updates.statusDetail = "Customer marked as spam";
      } else if (eventType === "dropped") {
        updates.status = "failed";
        updates.statusDetail = event.reason || "Dropped by SendGrid";
      } else if (eventType === "deferred") {
        updates.status = "deferred";
        updates.statusDetail = event.response || "Deferred";
      } else {
        continue;
      }

      await storage.updateEmailDeliveryLogBySendgridId(sendgridMessageId, updates);
      console.log(`[Email Delivery] ${eventType} for msg ${sendgridMessageId}`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("[Email Delivery] Webhook error:", err);
    res.status(200).json({ received: true });
  }
});

// ── Get email delivery logs for a ticket ──────────────────────────────────
router.get("/api/support/tickets/:ticketId/email-logs", isAuthenticated, async (req, res) => {
  try {
    const logs = await storage.getEmailDeliveryLogsForTicket(req.params.ticketId);
    res.json(logs);
  } catch (err) {
    console.error("[Email Delivery] Failed to fetch logs:", err);
    res.status(500).json({ message: "Failed to fetch email logs" });
  }
});

// ── Resend a specific email log entry ─────────────────────────────────────
router.post("/api/support/tickets/:ticketId/email-logs/:logId/resend", isAuthenticated, async (req, res) => {
  try {
    const { ticketId, logId } = req.params;
    const log = await storage.resendEmailDeliveryLog(logId);

    if (!log || log.ticketId !== ticketId) {
      return res.status(404).json({ message: "Email log not found" });
    }

    const ticket = await storage.getSupportRequest(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const sgMail = (await import("@sendgrid/mail")).default;
    sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

    const emailContent: any = {
      to: log.recipientEmail,
      from: { email: "support@nashobawinery.com", name: "Nashoba Valley Support" },
      subject: log.subject || `Support Ticket #${ticketId.slice(0, 8)}`,
      text: `Hello ${ticket.customerName || "Valued Customer"},\n\nWe are resending our previous reply for your reference.\n\n---\nNashoba Valley Support\nReference: #${ticketId.slice(0, 8)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <p>Hello ${ticket.customerName || "Valued Customer"},</p>
          <p>We are resending our previous reply for your reference. If you continue to experience issues receiving our emails, please check your spam folder or contact us by phone.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">Nashoba Valley Support<br>Reference: #${ticketId.slice(0, 8)}</p>
        </div>
      `,
      customArgs: { ticket_id: ticketId, resent_from_log: logId },
      trackingSettings: { clickTracking: { enable: false }, openTracking: { enable: true } },
    };

    const [sendgridResponse] = await sgMail.send(emailContent);
    const newSendgridId = (sendgridResponse?.headers?.["x-message-id"] as string | undefined);

    await storage.createEmailDeliveryLog({
      ticketId,
      messageId: log.messageId ?? undefined,
      recipientEmail: log.recipientEmail,
      subject: log.subject ?? undefined,
      sendgridMessageId: newSendgridId,
      status: "sent",
    });

    res.json({ success: true, message: "Email resent successfully" });
  } catch (err: unknown) {
    console.error("[Email Delivery] Resend error:", err);
    const message = err instanceof Error ? err.message : "Failed to resend email";
    res.status(500).json({ message });
  }
});

// ── TEMPORARY: one-time resend for messages that missed the email bug ──────
// Protected by X-Resend-Secret header. Remove this endpoint after use.
router.post("/api/support/admin-resend-missed", async (req, res) => {
  const secret = req.headers["x-resend-secret"];
  if (secret !== "nashoba-resend-2026-03-15") {
    return res.status(403).json({ message: "Forbidden" });
  }
  const { ticketId } = req.body as { ticketId: string };
  if (!ticketId) return res.status(400).json({ message: "ticketId required" });

  try {
    const ticket = await storage.getSupportRequest(ticketId);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const messages = await storage.getSupportMessages(ticketId);
    const botMsg = [...messages].reverse().find(m => m.senderType === "bot" || m.senderType === "agent");
    if (!botMsg) return res.status(404).json({ message: "No agent/bot message found on ticket" });

    if (!ticket.customerEmail) return res.status(400).json({ message: "Ticket has no customer email" });

    const sgMail = (await import("@sendgrid/mail")).default;
    sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

    const emailSubject = `Re: ${ticket.subject} [Ticket #${ticket.id.slice(0, 8)}]`;
    const emailContent: any = {
      to: ticket.customerEmail,
      from: { email: "support@nashobawinery.com", name: "Nashoba Valley Support" },
      subject: emailSubject,
      text: `Hello ${ticket.customerName || "Valued Customer"},\n\n${botMsg.content}\n\n---\nNashoba Valley Support\nReference: #${ticket.id.slice(0, 8)}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <p>Hello ${ticket.customerName || "Valued Customer"},</p>
        <div style="white-space:pre-wrap;margin:20px 0">${botMsg.content.replace(/\n/g, "<br>")}</div>
        <hr style="border:none;border-top:1px solid #eee;margin:30px 0">
        <p style="color:#666;font-size:12px">Nashoba Valley Support<br>Reference: #${ticket.id.slice(0, 8)}</p>
      </div>`,
      customArgs: { ticket_id: ticket.id, message_id: botMsg.id, resend: "missed_bug_fix" },
      trackingSettings: { clickTracking: { enable: false }, openTracking: { enable: true } },
    };

    const [sgResp] = await sgMail.send(emailContent);
    const newMsgId = sgResp?.headers?.["x-message-id"] as string | undefined;

    await storage.createEmailDeliveryLog({
      ticketId: ticket.id,
      messageId: botMsg.id,
      recipientEmail: ticket.customerEmail,
      subject: emailSubject,
      sendgridMessageId: newMsgId,
      status: "sent",
    });

    console.log(`[AdminResend] Sent missed email for ticket ${ticketId} to ${ticket.customerEmail}, sgId=${newMsgId}`);
    res.json({ success: true, to: ticket.customerEmail, subject: emailSubject, sendgridMessageId: newMsgId });
  } catch (err: unknown) {
    console.error("[AdminResend] Error:", err);
    res.status(500).json({ message: err instanceof Error ? err.message : "Failed to send" });
  }
});

export default router;
