import { db } from './db';
import { sql } from 'drizzle-orm';
import { sendEmail, generateWorkOrderNotificationEmail } from './email';

function getNextEasternTime8AM(): Date {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  
  const jan = new Date(year, 0, 1);
  const jul = new Date(year, 6, 1);
  const isDST = now.getTimezoneOffset() < Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
  const easternOffsetHours = isDST ? -4 : -5;
  
  let next8AM = new Date(Date.UTC(year, month, day, 8 - easternOffsetHours, 0, 0, 0));
  
  if (next8AM <= now) {
    next8AM = new Date(Date.UTC(year, month, day + 1, 8 - easternOffsetHours, 0, 0, 0));
  }
  
  return next8AM;
}

async function sendOverdueWorkOrderReminders(): Promise<void> {
  console.log('[Maintenance Reminders] Checking for work orders older than 7 days...');
  
  try {
    const supervisors = await db.execute(sql`
      SELECT email, first_name, last_name FROM maintenance_technicians 
      WHERE is_supervisor = true AND is_active = true AND email IS NOT NULL
    `);
    
    if (supervisors.rows.length === 0) {
      console.log('[Maintenance Reminders] No active supervisors found');
      return;
    }
    
    const overdueOrders = await db.execute(sql`
      SELECT wo.*, 
             a.name as asset_name, a.asset_number,
             ml.name as maint_location_name,
             sl.location_name as shared_location_name,
             t.first_name as tech_first_name, t.last_name as tech_last_name,
             r.first_name as requester_first_name, r.last_name as requester_last_name
      FROM maintenance_work_orders wo
      LEFT JOIN maintenance_assets a ON wo.asset_id = a.id
      LEFT JOIN maintenance_locations ml ON wo.maintenance_location_id = ml.id
      LEFT JOIN shared_locations sl ON wo.location_id = sl.id
      LEFT JOIN maintenance_technicians t ON wo.maintenance_technician_id = t.id
      LEFT JOIN platform_users r ON wo.requested_by = r.id::text
      WHERE wo.status NOT IN ('completed', 'cancelled', 'closed')
        AND wo.created_at < NOW() - INTERVAL '7 days'
      ORDER BY wo.created_at ASC
    `);
    
    if (overdueOrders.rows.length === 0) {
      console.log('[Maintenance Reminders] No work orders older than 7 days found');
      return;
    }
    
    console.log(`[Maintenance Reminders] Found ${overdueOrders.rows.length} work orders older than 7 days`);
    
    const summaryHtml = generateOverdueSummaryEmail(overdueOrders.rows as any[]);
    const subject = `[Supervisor Alert] ${overdueOrders.rows.length} Work Orders Pending Over 7 Days`;
    
    for (const supervisor of supervisors.rows as any[]) {
      try {
        await sendEmail(supervisor.email, subject, summaryHtml.html, summaryHtml.text);
        console.log(`[Maintenance Reminders] Sent 7-day reminder to supervisor ${supervisor.email}`);
      } catch (emailError) {
        console.error(`[Maintenance Reminders] Failed to send to ${supervisor.email}:`, emailError);
      }
    }
    
    console.log('[Maintenance Reminders] Completed sending overdue work order reminders');
  } catch (error) {
    console.error('[Maintenance Reminders] Error sending reminders:', error);
  }
}

function generateOverdueSummaryEmail(workOrders: any[]): { html: string; text: string } {
  const priorityColors: Record<string, string> = {
    critical: '#DC2626',
    high: '#EA580C',
    medium: '#CA8A04',
    low: '#16A34A'
  };
  
  const workOrderRows = workOrders.map(wo => {
    const locationName = wo.maint_location_name || wo.shared_location_name || '-';
    const assigneeName = wo.tech_first_name ? `${wo.tech_first_name} ${wo.tech_last_name}` : 'Unassigned';
    const createdDate = new Date(wo.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const daysOld = Math.floor((Date.now() - new Date(wo.created_at).getTime()) / (1000 * 60 * 60 * 24));
    const priorityColor = priorityColors[wo.priority?.toLowerCase()] || '#6B7280';
    
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${wo.work_order_number}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${wo.title}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; color: #ffffff; background-color: ${priorityColor};">${wo.priority}</span>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${assigneeName}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${locationName}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${createdDate}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #DC2626; font-weight: 600;">${daysOld} days</td>
      </tr>
    `;
  }).join('');
  
  const textRows = workOrders.map(wo => {
    const locationName = wo.maint_location_name || wo.shared_location_name || '-';
    const assigneeName = wo.tech_first_name ? `${wo.tech_first_name} ${wo.tech_last_name}` : 'Unassigned';
    const daysOld = Math.floor((Date.now() - new Date(wo.created_at).getTime()) / (1000 * 60 * 60 * 24));
    return `- ${wo.work_order_number}: ${wo.title} (${wo.priority}) - Assigned: ${assigneeName} - ${daysOld} days old`;
  }).join('\n');
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; background-color: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background-color: #DC2626; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 24px; }
    .alert-box { background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
    .alert-box p { margin: 0; color: #991b1b; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background-color: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; }
    .footer { background-color: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Work Order Reminder - 7+ Days Pending</h1>
    </div>
    <div class="content">
      <div class="alert-box">
        <p><strong>Attention:</strong> The following ${workOrders.length} work order(s) have been pending for over 7 days and require attention.</p>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>WO #</th>
            <th>Title</th>
            <th>Priority</th>
            <th>Assigned To</th>
            <th>Location</th>
            <th>Created</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          ${workOrderRows}
        </tbody>
      </table>
    </div>
    <div class="footer">
      <p>This is an automated reminder from the Nashoba Valley Operations Platform.</p>
    </div>
  </div>
</body>
</html>
  `;
  
  const text = `Work Order Reminder - 7+ Days Pending

Attention: The following ${workOrders.length} work order(s) have been pending for over 7 days and require attention.

${textRows}

This is an automated reminder from the Nashoba Valley Operations Platform.`;
  
  return { html, text };
}

let reminderTimeout: NodeJS.Timeout | null = null;

function scheduleNextReminder(): void {
  if (reminderTimeout) {
    clearTimeout(reminderTimeout);
  }
  
  const nextRun = getNextEasternTime8AM();
  const msUntilNextRun = nextRun.getTime() - Date.now();
  const minutesUntilNextRun = Math.round(msUntilNextRun / 60000);
  
  console.log(`[Maintenance Reminders] Next reminder run scheduled for ${nextRun.toLocaleString('en-US')} (in ${minutesUntilNextRun} minutes)`);
  
  reminderTimeout = setTimeout(async () => {
    await sendOverdueWorkOrderReminders();
    scheduleNextReminder();
  }, msUntilNextRun);
}

export function initMaintenanceReminders(): void {
  console.log('[Maintenance Reminders] Scheduler initialized');
  scheduleNextReminder();
}

export { sendOverdueWorkOrderReminders };
