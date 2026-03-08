import { db } from "./db";
import { sql } from "drizzle-orm";
import sgMail from "@sendgrid/mail";
import crypto from "crypto";
import { format, addDays } from "date-fns";

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface ComplianceTaskWithReminder {
  id: string;
  task_name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  jurisdiction: string | null;
  regulatory_body: string | null;
  priority: string;
  status: string;
  due_date: string;
  assigned_to_name: string | null;
  assigned_to_email: string | null;
  reminder_days: number[] | null;
  last_reminder_sent: string | null;
  portal_url: string | null;
  estimated_cost: string | null;
}

function generateComplianceReminderEmail(task: any, daysUntilDue: number | null, completionUrl?: string): string {
  const priorityColors: Record<string, string> = {
    low: '#22c55e',
    medium: '#f59e0b',
    high: '#ef4444',
    critical: '#dc2626'
  };

  const priorityColor = priorityColors[task.priority] || '#6b7280';
  const dueDateDisplay = task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'Not set';

  const urgencyMessage = daysUntilDue !== null 
    ? daysUntilDue <= 0 
      ? '<p style="color: #dc2626; font-weight: bold;">This task is OVERDUE!</p>'
      : daysUntilDue <= 7 
        ? `<p style="color: #f59e0b; font-weight: bold;">Due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}</p>`
        : `<p style="color: #22c55e;">Due in ${daysUntilDue} days</p>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px 20px; max-width: 600px; margin: 0 auto; }
    .task-box { background-color: #f3f4f6; border-left: 4px solid ${priorityColor}; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .priority-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; background-color: ${priorityColor}; color: white; text-transform: uppercase; }
    .detail-row { margin: 10px 0; }
    .detail-label { font-weight: bold; color: #4f46e5; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Compliance Task Reminder</h1>
  </div>
  <div class="content">
    <p>Hello ${task.assigned_to_name || 'Team Member'},</p>
    
    <p>This is a reminder about an upcoming compliance task that requires your attention.</p>
    
    ${urgencyMessage}
    
    <div class="task-box">
      <h2 style="margin-top: 0;">${task.task_name}</h2>
      <span class="priority-badge">${task.priority} Priority</span>
      
      <div class="detail-row">
        <span class="detail-label">Category:</span> ${task.category.replace('_', ' ').toUpperCase()}
      </div>
      
      <div class="detail-row">
        <span class="detail-label">Due Date:</span> ${dueDateDisplay}
      </div>
      
      ${task.jurisdiction ? `<div class="detail-row"><span class="detail-label">Jurisdiction:</span> ${task.jurisdiction}</div>` : ''}
      
      ${task.regulatory_body ? `<div class="detail-row"><span class="detail-label">Regulatory Body:</span> ${task.regulatory_body}</div>` : ''}
      
      ${task.description ? `<div class="detail-row"><span class="detail-label">Description:</span><br>${task.description}</div>` : ''}
      
      ${task.portal_url ? `<div class="detail-row"><span class="detail-label">Portal URL:</span> <a href="${task.portal_url}">${task.portal_url}</a></div>` : ''}
      
      ${task.estimated_cost ? `<div class="detail-row"><span class="detail-label">Estimated Cost:</span> $${parseFloat(task.estimated_cost).toFixed(2)}</div>` : ''}
    </div>
    
    <p>Please ensure this task is completed before the deadline to maintain compliance.</p>
    
    ${completionUrl ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${completionUrl}" style="display: inline-block; background-color: #22c55e; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Mark Task as Complete</a>
      <p style="font-size: 12px; color: #666; margin-top: 10px;">Click the button above when you have completed this task</p>
    </div>
    ` : ''}
    
    <div class="footer">
      <p>Nashoba Valley Winery Compliance System</p>
      <p>This is an automated reminder. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

async function sendComplianceReminders() {
  console.log(`[Compliance Reminders] Starting scheduled reminder check at ${new Date().toISOString()}`);
  
  if (!process.env.SENDGRID_API_KEY) {
    console.log("[Compliance Reminders] SendGrid not configured, skipping reminders");
    return { sent: 0, errors: 0, total: 0 };
  }
  
  try {
    const result = await db.execute(sql`
      SELECT id, task_name, description, category, subcategory, jurisdiction, 
             regulatory_body, priority, status, due_date, 
             assigned_to_name, assigned_to_email, reminder_days, 
             last_reminder_sent, portal_url, estimated_cost
      FROM compliance_tasks 
      WHERE is_active = true 
        AND status IN ('pending', 'in_progress')
        AND due_date IS NOT NULL
        AND reminder_days IS NOT NULL
        AND assigned_to_email IS NOT NULL
    `);
    
    const tasks = result.rows as unknown as ComplianceTaskWithReminder[];
    console.log(`[Compliance Reminders] Found ${tasks.length} tasks with reminder settings`);
    
    let sentCount = 0;
    let errorCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const task of tasks) {
      try {
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        const reminderDays = Array.isArray(task.reminder_days) 
          ? task.reminder_days 
          : JSON.parse(task.reminder_days as unknown as string) as number[];
        
        const shouldSendReminder = reminderDays.includes(daysUntilDue) || daysUntilDue <= 0;
        
        const lastReminderDate = task.last_reminder_sent ? new Date(task.last_reminder_sent) : null;
        const alreadySentToday = lastReminderDate && 
          format(lastReminderDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
        
        if (shouldSendReminder && !alreadySentToday) {
          console.log(`[Compliance Reminders] Sending reminder for task "${task.task_name}" (${daysUntilDue} days until due) to ${task.assigned_to_email}`);
          
          const token = crypto.randomBytes(32).toString('hex');
          const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
          
          await db.execute(sql`
            INSERT INTO compliance_action_tokens (task_id, token, action, recipient_email, recipient_name, expires_at)
            VALUES (${task.id}, ${token}, 'complete', ${task.assigned_to_email}, ${task.assigned_to_name || null}, ${expiresAt})
          `);
          
          const baseUrl = process.env.REPLIT_DEV_DOMAIN 
            ? `https://${process.env.REPLIT_DEV_DOMAIN}`
            : process.env.REPLIT_DOMAINS?.split(',')[0] 
              ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
              : 'https://localhost:5000';
          const completionUrl = `${baseUrl}/compliance/complete?token=${token}`;
          
          const subject = daysUntilDue <= 0 
            ? `OVERDUE: ${task.task_name}` 
            : `Compliance Reminder: ${task.task_name} - Due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`;
          const html = generateComplianceReminderEmail(task, daysUntilDue, completionUrl);
          
          const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'support@nashobawinery.com';
          
          const msg = {
            to: task.assigned_to_email!,
            from: fromEmail,
            subject,
            html,
            text: `Compliance Reminder: ${task.task_name}\n\nDue Date: ${dueDate.toLocaleDateString('en-US') || 'Not set'}\nCategory: ${task.category}\nPriority: ${task.priority}\n\nDescription: ${task.description || 'N/A'}\n\nMark as Complete: ${completionUrl}`
          };
          
          await sgMail.send(msg);
          
          await db.execute(sql`
            INSERT INTO compliance_reminders (task_id, sent_to_email, sent_to_name, method, subject, status, days_before_due)
            VALUES (${task.id}, ${task.assigned_to_email}, ${task.assigned_to_name || null}, 'email', ${subject}, 'sent', ${daysUntilDue})
          `);
          
          await db.execute(sql`
            UPDATE compliance_tasks SET last_reminder_sent = NOW() WHERE id = ${task.id}
          `);
          
          sentCount++;
          console.log(`[Compliance Reminders] Successfully sent reminder for task "${task.task_name}" to ${task.assigned_to_email}`);
        }
      } catch (taskError) {
        console.error(`[Compliance Reminders] Failed to process task ${task.id} "${task.task_name}":`, taskError);
        errorCount++;
      }
    }
    
    if (sentCount > 0 || errorCount > 0) {
      console.log(`[Compliance Reminders] Completed: ${sentCount} sent, ${errorCount} errors out of ${tasks.length} tasks checked`);
    } else {
      console.log(`[Compliance Reminders] No reminders needed today (${tasks.length} tasks checked)`);
    }
    
    return { sent: sentCount, errors: errorCount, total: tasks.length };
  } catch (error) {
    console.error("[Compliance Reminders] Fatal error in reminder job:", error);
    throw error;
  }
}

function scheduleNextRun() {
  const now = new Date();
  const targetHour = 8;
  
  let nextRun = new Date(now);
  nextRun.setHours(targetHour, 0, 0, 0);
  
  if (now >= nextRun) {
    nextRun = addDays(nextRun, 1);
  }
  
  const msUntilNextRun = nextRun.getTime() - now.getTime();
  const minutesUntilNextRun = Math.round(msUntilNextRun / 60000);
  
  console.log(`[Compliance Reminders] Next reminder run scheduled for ${nextRun.toLocaleString('en-US')} (in ${minutesUntilNextRun} minutes)`);
  
  setTimeout(async () => {
    try {
      await sendComplianceReminders();
    } catch (error) {
      console.error("[Compliance Reminders] Error running scheduled job:", error);
    }
    scheduleNextRun();
  }, msUntilNextRun);
}

export function initComplianceReminders() {
  scheduleNextRun();
  console.log("[Compliance Reminders] Scheduler initialized");
}

export { sendComplianceReminders };
