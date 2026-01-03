import { db } from "./db";
import { sql } from "drizzle-orm";
import sgMail from "@sendgrid/mail";
import { format, addDays } from "date-fns";

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface PersonEntry {
  name: string;
  email: string;
}

interface TaskWithReminder {
  id: number;
  task_name: string;
  description: string | null;
  department_name: string;
  due_date: string;
  assigned_to_name: string | null;
  assigned_to_email: string | null;
  assignees: PersonEntry[] | string | null;
  manager_name: string | null;
  manager_email: string | null;
  managers: PersonEntry[] | string | null;
  priority: string;
  reminder_days: number[] | null;
  last_reminder_sent: string | null;
}

async function sendDepartmentReminders() {
  console.log(`[Dept Calendar Reminders] Starting scheduled reminder check at ${new Date().toISOString()}`);
  
  if (!process.env.SENDGRID_API_KEY) {
    console.log("[Dept Calendar Reminders] SendGrid not configured, skipping reminders");
    return { sent: 0, errors: 0, total: 0 };
  }
  
  try {
    const result = await db.execute(sql`
      SELECT dt.id, dt.task_name, dt.description, dt.due_date, 
             dt.assigned_to_name, dt.assigned_to_email, dt.assignees,
             dt.manager_name, dt.manager_email, dt.managers,
             dt.priority, dt.reminder_days, dt.last_reminder_sent,
             d.name as department_name
      FROM department_tasks dt
      JOIN departments d ON dt.department_id = d.id
      WHERE dt.is_active = true 
        AND dt.status IN ('pending', 'in_progress')
        AND dt.due_date IS NOT NULL
        AND dt.reminder_days IS NOT NULL
        AND (dt.assigned_to_email IS NOT NULL OR (dt.assignees IS NOT NULL AND dt.assignees::text != '[]'))
    `);
    
    const tasks = result.rows as unknown as TaskWithReminder[];
    console.log(`[Dept Calendar Reminders] Found ${tasks.length} tasks with reminder settings`);
    
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
        
        const shouldSendReminder = reminderDays.includes(daysUntilDue);
        
        const lastReminderDate = task.last_reminder_sent ? new Date(task.last_reminder_sent) : null;
        const alreadySentToday = lastReminderDate && 
          format(lastReminderDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
        
        if (shouldSendReminder && !alreadySentToday) {
          const dueDateFormatted = format(dueDate, 'MMMM d, yyyy');
          
          // Get all assignees - from array or fall back to legacy single field
          let allAssignees: PersonEntry[] = [];
          if (task.assignees) {
            const parsed = typeof task.assignees === 'string' ? JSON.parse(task.assignees) : task.assignees;
            if (Array.isArray(parsed) && parsed.length > 0) {
              allAssignees = parsed.filter((a: PersonEntry) => a.email?.trim());
            }
          }
          // Fall back to legacy single assignee if no array entries
          if (allAssignees.length === 0 && task.assigned_to_email) {
            allAssignees = [{ name: task.assigned_to_name || '', email: task.assigned_to_email }];
          }
          
          // Get all managers - from array or fall back to legacy single field
          let allManagers: PersonEntry[] = [];
          if (task.managers) {
            const parsed = typeof task.managers === 'string' ? JSON.parse(task.managers) : task.managers;
            if (Array.isArray(parsed) && parsed.length > 0) {
              allManagers = parsed.filter((m: PersonEntry) => m.email?.trim());
            }
          }
          // Fall back to legacy single manager if no array entries
          if (allManagers.length === 0 && task.manager_email) {
            allManagers = [{ name: task.manager_name || '', email: task.manager_email }];
          }
          
          // Format list of all assignee names for manager emails
          const assigneeNamesList = allAssignees.map(a => a.name || a.email).join(', ');
          
          // Send to all assignees
          for (const assignee of allAssignees) {
            const assigneeMsg = {
              to: assignee.email,
              from: process.env.SENDGRID_FROM_EMAIL || 'noreply@nashobavalley.com',
              subject: `Task Reminder: ${task.task_name} - Due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #333;">Scheduled Task Reminder</h2>
                  <p>Hello ${assignee.name || 'Team Member'},</p>
                  <p>This is a scheduled reminder about the following upcoming task:</p>
                  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin: 0 0 10px 0; color: #333;">${task.task_name}</h3>
                    <p style="margin: 5px 0;"><strong>Department:</strong> ${task.department_name}</p>
                    <p style="margin: 5px 0;"><strong>Due Date:</strong> ${dueDateFormatted}</p>
                    <p style="margin: 5px 0;"><strong>Days Until Due:</strong> ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}</p>
                    <p style="margin: 5px 0;"><strong>Priority:</strong> ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</p>
                    ${task.description ? `<p style="margin: 15px 0 0 0;">${task.description}</p>` : ''}
                  </div>
                  <p>Please ensure this task is completed by the due date.</p>
                  <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated reminder from Nashoba Valley Operations Platform.</p>
                </div>
              `,
            };
            
            await sgMail.send(assigneeMsg);
            sentCount++;
            
            await db.execute(sql`
              INSERT INTO department_task_reminders (task_id, sent_to_email, sent_to_name, subject, status, days_before_due)
              VALUES (${task.id}, ${assignee.email}, ${assignee.name || null}, ${assigneeMsg.subject}, 'sent', ${daysUntilDue})
            `);
            
            console.log(`[Dept Calendar Reminders] Sent reminder for task "${task.task_name}" to ${assignee.email}`);
          }
          
          // Send to all managers
          for (const manager of allManagers) {
            const managerReminderMsg = {
              to: manager.email,
              from: process.env.SENDGRID_FROM_EMAIL || 'noreply@nashobavalley.com',
              subject: `Manager FYI: Task Reminder - ${task.task_name} (Due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''})`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #333;">Manager Task Reminder</h2>
                  <p>Hello ${manager.name || 'Manager'},</p>
                  <p>This is a reminder that the following task assigned to <strong>${assigneeNamesList || 'your team members'}</strong> is due soon:</p>
                  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin: 0 0 10px 0; color: #333;">${task.task_name}</h3>
                    <p style="margin: 5px 0;"><strong>Department:</strong> ${task.department_name}</p>
                    <p style="margin: 5px 0;"><strong>Assigned To:</strong> ${assigneeNamesList || 'Unassigned'}</p>
                    <p style="margin: 5px 0;"><strong>Due Date:</strong> ${dueDateFormatted}</p>
                    <p style="margin: 5px 0;"><strong>Days Until Due:</strong> ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}</p>
                    <p style="margin: 5px 0;"><strong>Priority:</strong> ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</p>
                    ${task.description ? `<p style="margin: 15px 0 0 0;">${task.description}</p>` : ''}
                  </div>
                  <p>This notification is for your awareness. The assigned team members have also received reminders.</p>
                  <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated reminder from Nashoba Valley Operations Platform.</p>
                </div>
              `,
            };
            
            await sgMail.send(managerReminderMsg);
            sentCount++;
            
            await db.execute(sql`
              INSERT INTO department_task_reminders (task_id, sent_to_email, sent_to_name, subject, status, days_before_due)
              VALUES (${task.id}, ${manager.email}, ${manager.name || null}, ${managerReminderMsg.subject}, 'sent', ${daysUntilDue})
            `);
            
            console.log(`[Dept Calendar Reminders] Sent manager reminder for task "${task.task_name}" to ${manager.email}`);
          }
          
          await db.execute(sql`
            UPDATE department_tasks SET last_reminder_sent = NOW() WHERE id = ${task.id}
          `);
        }
        
        if (daysUntilDue < 0) {
          const daysPastDue = Math.abs(daysUntilDue);
          const shouldSendOverdueReminder = !alreadySentToday && (daysPastDue === 1 || daysPastDue % 3 === 0);
          
          if (shouldSendOverdueReminder) {
            // Get all assignees - from array or fall back to legacy single field
            let allAssignees: PersonEntry[] = [];
            if (task.assignees) {
              const parsed = typeof task.assignees === 'string' ? JSON.parse(task.assignees) : task.assignees;
              if (Array.isArray(parsed) && parsed.length > 0) {
                allAssignees = parsed.filter((a: PersonEntry) => a.email?.trim());
              }
            }
            if (allAssignees.length === 0 && task.assigned_to_email) {
              allAssignees = [{ name: task.assigned_to_name || '', email: task.assigned_to_email }];
            }
            
            // Get all managers - from array or fall back to legacy single field
            let allManagers: PersonEntry[] = [];
            if (task.managers) {
              const parsed = typeof task.managers === 'string' ? JSON.parse(task.managers) : task.managers;
              if (Array.isArray(parsed) && parsed.length > 0) {
                allManagers = parsed.filter((m: PersonEntry) => m.email?.trim());
              }
            }
            if (allManagers.length === 0 && task.manager_email) {
              allManagers = [{ name: task.manager_name || '', email: task.manager_email }];
            }
            
            const assigneeNamesList = allAssignees.map(a => a.name || a.email).join(', ');
            
            // Send overdue alerts to all assignees
            for (const assignee of allAssignees) {
              const overdueMsg = {
                to: assignee.email,
                from: process.env.SENDGRID_FROM_EMAIL || 'noreply@nashobavalley.com',
                subject: `OVERDUE: ${task.task_name} - ${daysPastDue} day${daysPastDue !== 1 ? 's' : ''} past due`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #dc2626;">Overdue Task Alert</h2>
                    <p>Hello ${assignee.name || 'Team Member'},</p>
                    <p>The following task is now overdue and requires immediate attention:</p>
                    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
                      <h3 style="margin: 0 0 10px 0; color: #333;">${task.task_name}</h3>
                      <p style="margin: 5px 0;"><strong>Department:</strong> ${task.department_name}</p>
                      <p style="margin: 5px 0;"><strong>Due Date:</strong> ${format(dueDate, 'MMMM d, yyyy')}</p>
                      <p style="margin: 5px 0; color: #dc2626; font-weight: bold;"><strong>Status:</strong> ${daysPastDue} day${daysPastDue !== 1 ? 's' : ''} overdue</p>
                      <p style="margin: 5px 0;"><strong>Priority:</strong> ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</p>
                      ${task.description ? `<p style="margin: 15px 0 0 0;">${task.description}</p>` : ''}
                    </div>
                    <p>Please complete this task as soon as possible.</p>
                    <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated reminder from Nashoba Valley Operations Platform.</p>
                  </div>
                `,
              };
              await sgMail.send(overdueMsg);
              sentCount++;
              console.log(`[Dept Calendar Reminders] Sent overdue alert for task "${task.task_name}" to ${assignee.email}`);
            }
            
            // Send overdue alerts to all managers
            for (const manager of allManagers) {
              const managerMsg = {
                to: manager.email,
                from: process.env.SENDGRID_FROM_EMAIL || 'noreply@nashobavalley.com',
                subject: `Manager Alert: Overdue Task - ${task.task_name}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #dc2626;">Manager Alert: Delinquent Task</h2>
                    <p>Hello ${manager.name || 'Manager'},</p>
                    <p>The following task assigned to <strong>${assigneeNamesList || 'your team members'}</strong> is now overdue:</p>
                    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
                      <h3 style="margin: 0 0 10px 0; color: #333;">${task.task_name}</h3>
                      <p style="margin: 5px 0;"><strong>Department:</strong> ${task.department_name}</p>
                      <p style="margin: 5px 0;"><strong>Assigned To:</strong> ${assigneeNamesList || 'Unassigned'}</p>
                      <p style="margin: 5px 0;"><strong>Due Date:</strong> ${format(dueDate, 'MMMM d, yyyy')}</p>
                      <p style="margin: 5px 0; color: #dc2626; font-weight: bold;"><strong>Status:</strong> ${daysPastDue} day${daysPastDue !== 1 ? 's' : ''} overdue</p>
                      <p style="margin: 5px 0;"><strong>Priority:</strong> ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</p>
                      ${task.description ? `<p style="margin: 15px 0 0 0;">${task.description}</p>` : ''}
                    </div>
                    <p>Please follow up with the assigned team members to ensure this task is completed promptly.</p>
                    <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated notification from Nashoba Valley Operations Platform.</p>
                  </div>
                `,
              };
              await sgMail.send(managerMsg);
              sentCount++;
              console.log(`[Dept Calendar Reminders] Sent overdue manager alert for task "${task.task_name}" to ${manager.email}`);
            }
            
            await db.execute(sql`
              UPDATE department_tasks SET last_reminder_sent = NOW() WHERE id = ${task.id}
            `);
          }
        }
      } catch (taskError) {
        console.error(`[Dept Calendar Reminders] Failed to process task ${task.id}:`, taskError);
        errorCount++;
      }
    }
    
    console.log(`[Dept Calendar Reminders] Completed: ${sentCount} sent, ${errorCount} errors`);
    return { sent: sentCount, errors: errorCount, total: tasks.length };
  } catch (error) {
    console.error("[Dept Calendar Reminders] Fatal error in reminder job:", error);
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
  
  console.log(`[Dept Calendar Reminders] Next reminder run scheduled for ${nextRun.toLocaleString()} (in ${minutesUntilNextRun} minutes)`);
  
  setTimeout(async () => {
    try {
      await sendDepartmentReminders();
    } catch (error) {
      console.error("[Dept Calendar Reminders] Error running scheduled job:", error);
    }
    scheduleNextRun();
  }, msUntilNextRun);
}

export function initDepartmentCalendarReminders() {
  scheduleNextRun();
  console.log("[Dept Calendar Reminders] Scheduler initialized");
}

export { sendDepartmentReminders };
