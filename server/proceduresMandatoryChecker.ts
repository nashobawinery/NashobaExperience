import { storage } from "./storage";
import { sendEmail } from "./email";

const DAY_MAP: Record<number, string> = {
  0: "sunday",
  1: "monday", 
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday"
};

// Helper to get current Eastern time
function getEasternTime(): { hour: number; minute: number } {
  const easternFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const parts = easternFormatter.formatToParts(new Date());
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';
  return {
    hour: parseInt(getPart('hour')),
    minute: parseInt(getPart('minute'))
  };
}

// Check if deadline has passed for a template
function isDeadlinePassed(completionTime: string | null): boolean {
  const eastern = getEasternTime();
  const currentMinutes = eastern.hour * 60 + eastern.minute;
  
  // If no completion time specified, default to 11:30 PM deadline
  if (!completionTime) {
    return currentMinutes >= (23 * 60 + 30);
  }
  
  // Parse completion time (format: "HH:MM")
  const [hours, minutes] = completionTime.split(':').map(Number);
  const deadlineMinutes = hours * 60 + minutes;
  
  return currentMinutes >= deadlineMinutes;
}

async function checkMissedMandatoryProcedures(): Promise<void> {
  console.log("[Mandatory Procedures] Starting missed procedure check...");
  
  try {
    const templates = await storage.getProceduresTemplates({ isActive: true });
    const mandatoryTemplates = templates.filter((t: any) => t.isMandatory === true);
    
    if (mandatoryTemplates.length === 0) {
      console.log("[Mandatory Procedures] No mandatory procedures configured");
      return;
    }
    
    console.log(`[Mandatory Procedures] Found ${mandatoryTemplates.length} mandatory templates to check`);
    
    const today = new Date();
    const todayDayKey = DAY_MAP[today.getDay()];
    
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    const submissions = await storage.getProceduresSubmissions();
    
    for (const template of mandatoryTemplates) {
      const daysOfWeek = template.daysOfWeek as Record<string, boolean>;
      
      if (!daysOfWeek[todayDayKey]) {
        console.log(`[Mandatory Procedures] ${template.procedureCode} not scheduled for ${todayDayKey}`);
        continue;
      }
      
      // Check if the template's deadline has passed
      const completionTime = (template as any).completionTime || null;
      if (!isDeadlinePassed(completionTime)) {
        console.log(`[Mandatory Procedures] ${template.procedureCode} deadline (${completionTime || '23:30'}) has not passed yet`);
        continue;
      }
      
      const todaySubmissions = submissions.filter((s: any) => {
        const submissionDate = new Date(s.submissionDate);
        return s.templateId === template.id && 
               submissionDate >= todayStart && 
               submissionDate <= todayEnd &&
               s.status !== "no_report";
      });
      
      if (todaySubmissions.length > 0) {
        console.log(`[Mandatory Procedures] ${template.procedureCode} already has ${todaySubmissions.length} submission(s) today`);
        continue;
      }
      
      console.log(`[Mandatory Procedures] MISSING: ${template.procedureCode} (deadline: ${completionTime || '23:30'}) - creating NO REPORT FILED entry`);
      
      const noReportSubmission = await storage.createProceduresSubmission({
        templateId: template.id,
        procedureCode: template.procedureCode,
        department: template.department,
        submittedByName: "SYSTEM",
        submissionDate: today,
        dateTimeStarted: null,
        dateTimeSubmitted: new Date(),
        status: "no_report",
        answers: {},
        notes: "NO REPORT FILED - This mandatory procedure was not completed for this date.",
        lateReason: null
      });
      
      console.log(`[Mandatory Procedures] Created no-report entry: ${noReportSubmission.id}`);
      
      const emailTo = template.emailRecipientsTo || [];
      const emailCc = template.emailRecipientsCc || [];
      
      if (emailTo.length > 0 || emailCc.length > 0) {
        const { subject, html, text } = generateMissedProcedureEmail(template, today);
        
        for (const recipient of emailTo) {
          try {
            await sendEmail(recipient, subject, html, text);
            console.log(`[Mandatory Procedures] Alert sent to ${recipient}`);
          } catch (err) {
            console.error(`[Mandatory Procedures] Failed to send alert to ${recipient}:`, err);
          }
        }
        
        for (const ccRecipient of emailCc) {
          try {
            await sendEmail(ccRecipient, subject, html, text);
            console.log(`[Mandatory Procedures] Alert CC sent to ${ccRecipient}`);
          } catch (err) {
            console.error(`[Mandatory Procedures] Failed to send CC alert to ${ccRecipient}:`, err);
          }
        }
        
        await storage.updateProceduresSubmissionEmailStatus(noReportSubmission.id, 'success');
      }
    }
    
    console.log("[Mandatory Procedures] Check completed");
  } catch (error) {
    console.error("[Mandatory Procedures] Error checking mandatory procedures:", error);
  }
}

function generateMissedProcedureEmail(
  template: { procedureName: string; procedureCode: string; department: string; procedureType: string },
  date: Date
): { subject: string; html: string; text: string } {
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const subject = `ALERT: Mandatory Procedure Not Filed - ${template.procedureName}`;
  
  const text = `
MANDATORY PROCEDURE NOT FILED

Procedure: ${template.procedureName}
Code: ${template.procedureCode}
Department: ${template.department}
Type: ${template.procedureType}
Date: ${dateStr}

This is an automated alert to notify you that the above mandatory procedure was not submitted for ${dateStr}.

A "NO REPORT FILED" entry has been recorded in the submissions log.

Please follow up with the responsible staff to understand why this procedure was not completed.
  `.trim();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 20px; }
    .content { padding: 20px; background-color: #fef2f2; border: 1px solid #fecaca; border-top: none; border-radius: 0 0 8px 8px; }
    .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e0e0e0; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { font-weight: bold; color: #666; }
    .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin-top: 15px; }
    .warning-title { color: #b45309; font-weight: bold; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>MANDATORY PROCEDURE NOT FILED</h1>
  </div>
  <div class="content">
    <div class="details">
      <div class="detail-row">
        <span class="detail-label">Procedure:</span>
        <span>${template.procedureName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Code:</span>
        <span>${template.procedureCode}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Department:</span>
        <span>${template.department}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Type:</span>
        <span>${template.procedureType}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Date:</span>
        <span>${dateStr}</span>
      </div>
    </div>
    
    <div class="warning">
      <div class="warning-title">Action Required</div>
      <p style="margin: 0;">A "NO REPORT FILED" entry has been recorded. Please follow up with the responsible staff to understand why this mandatory procedure was not completed.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
  
  return { subject, html, text };
}

function scheduleMandatoryCheck(): void {
  const runAtEndOfDay = () => {
    const now = new Date();
    
    // Calculate 11:30 PM Eastern Time
    // Get current time in Eastern timezone
    const easternFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = easternFormatter.formatToParts(now);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';
    
    const easternHour = parseInt(getPart('hour'));
    const easternMinute = parseInt(getPart('minute'));
    const easternTime = easternHour * 60 + easternMinute;
    const targetTime = 23 * 60 + 30; // 11:30 PM = 1410 minutes
    
    let minutesUntilRun: number;
    if (easternTime >= targetTime) {
      // Already past 11:30 PM Eastern, schedule for tomorrow
      minutesUntilRun = (24 * 60 - easternTime) + targetTime;
    } else {
      minutesUntilRun = targetTime - easternTime;
    }
    
    const msUntilRun = minutesUntilRun * 60 * 1000;
    const targetDate = new Date(now.getTime() + msUntilRun);
    
    console.log(`[Mandatory Procedures] Next check scheduled for ${targetDate.toLocaleString('en-US', { timeZone: 'America/New_York' })} Eastern (in ${minutesUntilRun} minutes)`);
    
    setTimeout(() => {
      checkMissedMandatoryProcedures()
        .then(() => runAtEndOfDay())
        .catch((error) => {
          console.error("[Mandatory Procedures] Error in scheduled check:", error);
          runAtEndOfDay();
        });
    }, msUntilRun);
  };
  
  runAtEndOfDay();
  console.log("[Mandatory Procedures] Scheduler initialized");
}

export { checkMissedMandatoryProcedures, scheduleMandatoryCheck };
