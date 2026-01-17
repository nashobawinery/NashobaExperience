import { db } from "./db";
import { eq, and, or, lt, isNull, sql } from "drizzle-orm";
import { supportRequests, supportAgents } from "@shared/schema";
import { storage } from "./storage";
import { notifySupportAgents } from "./email";
import crypto from "crypto";

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

async function sendTicketReminders() {
  console.log("[Support Reminders] Starting daily reminder check...");
  
  try {
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - FORTY_EIGHT_HOURS_MS);
    
    const openTickets = await db
      .select()
      .from(supportRequests)
      .where(
        and(
          or(
            eq(supportRequests.status, "new"),
            eq(supportRequests.status, "pending"),
            eq(supportRequests.status, "bot_responded")
          ),
          isNull(supportRequests.closedAt)
        )
      );
    
    console.log(`[Support Reminders] Found ${openTickets.length} open tickets to check`);
    
    let remindersSent = 0;
    let escalationsSent = 0;
    let errors = 0;
    
    for (const ticket of openTickets) {
      try {
        const ticketAge = now.getTime() - new Date(ticket.createdAt).getTime();
        const isOverdue = ticketAge > FORTY_EIGHT_HOURS_MS;
        const wasEscalated = !!ticket.escalatedAt;
        
        if (isOverdue && !wasEscalated) {
          console.log(`[Support Reminders] Escalating ticket ${ticket.id} - overdue by ${Math.round(ticketAge / 3600000)} hours`);
          await sendEscalationToAllAgents(ticket);
          
          await db.update(supportRequests)
            .set({ 
              escalatedAt: now,
              lastReminderSentAt: now,
              reminderCount: (ticket.reminderCount || 0) + 1
            })
            .where(eq(supportRequests.id, ticket.id));
          
          escalationsSent++;
        } else if (!isOverdue) {
          console.log(`[Support Reminders] Sending reminder for ticket ${ticket.id}`);
          await sendReminderToAssignedAgents(ticket);
          
          await db.update(supportRequests)
            .set({ 
              lastReminderSentAt: now,
              reminderCount: (ticket.reminderCount || 0) + 1
            })
            .where(eq(supportRequests.id, ticket.id));
          
          remindersSent++;
        }
      } catch (ticketError) {
        console.error(`[Support Reminders] Error processing ticket ${ticket.id}:`, ticketError);
        errors++;
      }
    }
    
    console.log(`[Support Reminders] Completed: ${remindersSent} reminders, ${escalationsSent} escalations, ${errors} errors`);
    return { remindersSent, escalationsSent, errors, total: openTickets.length };
  } catch (error) {
    console.error("[Support Reminders] Fatal error in reminder job:", error);
    throw error;
  }
}

async function sendReminderToAssignedAgents(ticket: any) {
  const agents = await storage.getSupportAgentsForNotification(null);
  
  if (agents.length === 0) {
    console.log(`[Support Reminders] No agents to notify for ticket ${ticket.id}`);
    return;
  }
  
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : 'http://localhost:5000';
  
  for (const agent of agents) {
    if (!agent.email || !agent.receiveEmailNotifications) continue;
    
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    await storage.createAgentAccessToken({
      agentId: agent.id,
      requestId: ticket.id,
      token,
      expiresAt,
      action: 'email_link'
    });
    
    await sendReminderEmail(agent, ticket, token, baseUrl, false);
  }
}

async function sendEscalationToAllAgents(ticket: any) {
  const allAgents = await db.select().from(supportAgents).where(eq(supportAgents.isActive, true));
  
  if (allAgents.length === 0) {
    console.log(`[Support Reminders] No active agents for escalation of ticket ${ticket.id}`);
    return;
  }
  
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : 'http://localhost:5000';
  
  for (const agent of allAgents) {
    if (!agent.email || !agent.receiveEmailNotifications) continue;
    
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    await storage.createAgentAccessToken({
      agentId: agent.id,
      requestId: ticket.id,
      token,
      expiresAt,
      action: 'email_link'
    });
    
    await sendReminderEmail(agent, ticket, token, baseUrl, true);
  }
}

async function sendReminderEmail(agent: any, ticket: any, token: string, baseUrl: string, isEscalation: boolean) {
  const sgMail = await import('@sendgrid/mail');
  
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[Support Reminders] SendGrid not configured, skipping email to ${agent.email}`);
    return;
  }
  
  sgMail.default.setApiKey(process.env.SENDGRID_API_KEY);
  
  const viewUrl = `${baseUrl}/support/ticket/${ticket.id}?token=${token}&action=view`;
  const forwardUrl = `${baseUrl}/support/ticket/${ticket.id}?token=${token}&action=forward`;
  const spamUrl = `${baseUrl}/support/ticket/${ticket.id}?token=${token}&action=spam`;
  
  const ticketAge = Math.round((Date.now() - new Date(ticket.createdAt).getTime()) / 3600000);
  
  const BRAND_COLORS = {
    burgundy: '#722F37',
    cream: '#F5F5DC',
    gold: '#D4AF37'
  };
  
  const subject = isEscalation 
    ? `[URGENT] Unanswered Support Ticket - ${ticketAge}+ Hours - Action Required`
    : `[Reminder] Open Support Ticket Needs Attention`;
  
  const urgentBanner = isEscalation ? `
    <div style="background-color: #DC2626; color: white; padding: 15px; text-align: center; font-weight: bold; margin-bottom: 20px;">
      URGENT: This ticket has been open for ${ticketAge}+ hours without a response
    </div>
  ` : '';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background-color: ${BRAND_COLORS.burgundy}; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Support Ticket ${isEscalation ? 'Escalation' : 'Reminder'}</h1>
      </div>
      
      ${urgentBanner}
      
      <div style="padding: 30px;">
        <p style="margin: 0 0 20px;">Hi ${agent.displayName},</p>
        
        <p style="margin: 0 0 20px;">
          ${isEscalation 
            ? `A support ticket has been waiting for a response for over ${ticketAge} hours. This requires immediate attention.`
            : `This is a daily reminder about an open support ticket that still needs a response.`
          }
        </p>
        
        <div style="background-color: ${BRAND_COLORS.cream}; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px;"><strong>From:</strong> ${ticket.customerName || 'Guest'} ${ticket.customerEmail ? `(${ticket.customerEmail})` : ''}</p>
          ${ticket.subject ? `<p style="margin: 0 0 10px;"><strong>Subject:</strong> ${ticket.subject}</p>` : ''}
          <p style="margin: 0 0 10px;"><strong>Status:</strong> ${ticket.status}</p>
          <p style="margin: 0 0 10px;"><strong>Age:</strong> ${ticketAge} hours</p>
          <p style="margin: 0 0 10px; font-weight: bold; color: ${BRAND_COLORS.burgundy};">Message:</p>
          <p style="margin: 0; white-space: pre-wrap;">${ticket.initialMessage?.substring(0, 300) || ''}${(ticket.initialMessage?.length || 0) > 300 ? '...' : ''}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <p style="margin: 0 0 15px; color: #666; font-size: 14px;">Quick Actions:</p>
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 400px; margin: 0 auto;">
            <tr>
              <td style="padding: 5px; text-align: center;">
                <a href="${viewUrl}" style="display: inline-block; background-color: ${BRAND_COLORS.burgundy}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Ticket</a>
              </td>
              <td style="padding: 5px; text-align: center;">
                <a href="${forwardUrl}" style="display: inline-block; background-color: ${BRAND_COLORS.gold}; color: #333; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Forward</a>
              </td>
              <td style="padding: 5px; text-align: center;">
                <a href="${spamUrl}" style="display: inline-block; background-color: #6B7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Spam</a>
              </td>
            </tr>
          </table>
        </div>
        
        <p style="margin: 20px 0 0; color: #666; font-size: 13px; text-align: center;">
          These secure links are valid for 24 hours.
        </p>
      </div>
      
      <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #666;">
        <p style="margin: 0;">Nashoba Valley Winery</p>
        <p style="margin: 5px 0 0;">100 Wattaquadock Hill Road, Bolton, MA 01740</p>
      </div>
    </div>
  `;
  
  const text = `
${isEscalation ? 'URGENT: ' : ''}Support Ticket ${isEscalation ? 'Escalation' : 'Reminder'}

Hi ${agent.displayName},

${isEscalation 
  ? `A support ticket has been waiting for a response for over ${ticketAge} hours. This requires immediate attention.`
  : `This is a daily reminder about an open support ticket that still needs a response.`
}

From: ${ticket.customerName || 'Guest'} ${ticket.customerEmail ? `(${ticket.customerEmail})` : ''}
${ticket.subject ? `Subject: ${ticket.subject}` : ''}
Status: ${ticket.status}
Age: ${ticketAge} hours

Message:
${ticket.initialMessage?.substring(0, 300) || ''}${(ticket.initialMessage?.length || 0) > 300 ? '...' : ''}

Quick Actions:
- View Ticket: ${viewUrl}
- Forward: ${forwardUrl}
- Mark as Spam: ${spamUrl}

These secure links are valid for 24 hours.

---
Nashoba Valley Winery
100 Wattaquadock Hill Road, Bolton, MA 01740
  `.trim();
  
  try {
    await sgMail.default.send({
      to: agent.email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@nashobawinery.com',
      subject,
      html,
      text
    });
    console.log(`[Support Reminders] Sent ${isEscalation ? 'escalation' : 'reminder'} email to ${agent.email} for ticket ${ticket.id}`);
  } catch (error) {
    console.error(`[Support Reminders] Failed to send email to ${agent.email}:`, error);
    throw error;
  }
}

function scheduleTicketReminders() {
  const runAt8AM = () => {
    const now = new Date();
    const easternOffset = -5;
    const utcHours = now.getUTCHours();
    const easternHours = (utcHours + easternOffset + 24) % 24;
    
    const target = new Date();
    const hoursUntil8AM = (8 - easternHours + 24) % 24;
    
    if (hoursUntil8AM === 0 && now.getMinutes() > 0) {
      target.setHours(target.getHours() + 24);
    } else {
      target.setHours(target.getHours() + hoursUntil8AM);
    }
    target.setMinutes(0, 0, 0);
    
    const msUntil8AM = target.getTime() - now.getTime();
    
    console.log(`[Support Reminders] Next reminder run scheduled for ${target.toLocaleString('en-US', { timeZone: 'America/New_York' })} Eastern (in ${Math.round(msUntil8AM / 60000)} minutes)`);
    
    setTimeout(() => {
      sendTicketReminders()
        .then(() => runAt8AM())
        .catch((error) => {
          console.error("[Support Reminders] Error in scheduled run:", error);
          runAt8AM();
        });
    }, msUntil8AM);
  };
  
  runAt8AM();
  console.log("[Support Reminders] Scheduler initialized");
}

export { sendTicketReminders, scheduleTicketReminders };
