import { Router, Request, Response } from "express";
import { storage } from "./storage";
import { insertProceduresTemplateSchema, insertProceduresItemSchema, insertProceduresUserSchema, insertProceduresSubmissionSchema, insertProceduresStaffSchema, ProceduresItem, ProceduresTemplate } from "@shared/schema";
import { z } from "zod";
import { sendEmail } from "./email";
import { scheduleMandatoryCheck } from "./proceduresMandatoryChecker";

const router = Router();

// Initialize the mandatory procedure checker scheduler
scheduleMandatoryCheck();

// Generate procedure submission notification email
function generateProcedureSubmissionEmail(
  template: ProceduresTemplate & { items: ProceduresItem[] },
  submittedByName: string,
  submissionDate: Date,
  answers: Record<string, { value: any; initials?: string; comment?: string; completedAt?: string }>
): { subject: string; html: string; text: string } {
  // Use Eastern Time for all date/time formatting
  const easternTimeZone = 'America/New_York';
  const dateStr = submissionDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: easternTimeZone });
  const subject = `${template.procedureType.charAt(0).toUpperCase() + template.procedureType.slice(1)} Procedures Completed - ${template.procedureName}`;

  // Build text version
  let text = `${template.procedureType.toUpperCase()} PROCEDURES COMPLETED\n\n`;
  text += `Template: ${template.procedureName}\n`;
  text += `Department: ${template.department}\n`;
  text += `Submitted By: ${submittedByName}\n`;
  text += `Date: ${dateStr}\n\n`;
  text += `COMPLETED TASKS:\n`;
  text += `${'='.repeat(40)}\n`;

  template.items.forEach((item, index) => {
    const answer = answers[item.id];
    const value = answer?.value ?? 'Not completed';
    const completedTime = answer?.completedAt ? new Date(answer.completedAt).toLocaleTimeString('en-US', { timeZone: easternTimeZone }) : '';
    text += `\n${index + 1}. ${item.label}\n`;
    text += `   Response: ${value}\n`;
    if (completedTime) text += `   Completed at: ${completedTime}\n`;
    if (answer?.initials) text += `   Initials: ${answer.initials}\n`;
    if (answer?.comment) text += `   Comment: ${answer.comment}\n`;
  });

  // Build HTML version
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; }
    .header { background-color: #5C2535; color: #F5F5F0; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 20px; }
    .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .meta { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e0e0e0; }
    .meta-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .meta-row:last-child { border-bottom: none; }
    .meta-label { font-weight: bold; color: #666; }
    .tasks { background: white; border-radius: 8px; border: 1px solid #e0e0e0; overflow: hidden; }
    .task { padding: 15px; border-bottom: 1px solid #eee; }
    .task:last-child { border-bottom: none; }
    .task-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .task-label { font-weight: bold; color: #333; flex: 1; }
    .task-time { font-size: 12px; color: #888; white-space: nowrap; margin-left: 10px; }
    .task-value { margin-top: 8px; padding: 8px 12px; background: #f0f0f0; border-radius: 4px; }
    .task-value.completed { background: #d4edda; color: #155724; }
    .task-value.not-completed { background: #f8d7da; color: #721c24; }
    .task-meta { font-size: 12px; color: #666; margin-top: 5px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${template.procedureType.toUpperCase()} PROCEDURES COMPLETED</h1>
    <p>${template.procedureName}</p>
  </div>
  <div class="content">
    <div class="meta">
      <div class="meta-row">
        <span class="meta-label">Department</span>
        <span>${template.department}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Submitted By</span>
        <span>${submittedByName}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Date</span>
        <span>${dateStr}</span>
      </div>
    </div>
    <div class="tasks">
      ${template.items.map((item, index) => {
        const answer = answers[item.id];
        const value = answer?.value;
        const completedTime = answer?.completedAt ? new Date(answer.completedAt).toLocaleTimeString('en-US', { timeZone: easternTimeZone }) : null;
        const isCompleted = value !== undefined && value !== null && value !== '';
        const displayValue = item.responseType === 'checkbox' 
          ? (value ? 'Completed' : 'Not completed')
          : (value ?? 'Not provided');
        return `
          <div class="task">
            <div class="task-header">
              <span class="task-label">${index + 1}. ${item.label}</span>
              ${completedTime ? `<span class="task-time">${completedTime}</span>` : ''}
            </div>
            <div class="task-value ${isCompleted ? 'completed' : 'not-completed'}">${displayValue}</div>
            ${answer?.initials || answer?.comment ? `
              <div class="task-meta">
                ${answer.initials ? `Initials: ${answer.initials}` : ''}
                ${answer.initials && answer.comment ? ' | ' : ''}
                ${answer.comment ? `Note: ${answer.comment}` : ''}
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
  </div>
  <div class="footer">
    <p>This is an automated notification from the Nashoba Valley Operations Platform.</p>
  </div>
</body>
</html>
  `.trim();

  return { subject, html, text };
}

// Helper function to send procedure submission emails (with full CC support)
async function sendProcedureSubmissionEmails(submission: { id: string; templateId: string; submittedByName: string; submissionDate: Date; answers: any }): Promise<void> {
  try {
    const template = await storage.getProceduresTemplateWithItems(submission.templateId);
    if (!template) {
      console.error(`[Procedures Email] Template not found: ${submission.templateId}`);
      return;
    }

    const emailTo = template.emailRecipientsTo as string[] | null;
    const emailCc = template.emailRecipientsCc as string[] | null;

    if (!emailTo || emailTo.length === 0) {
      console.log(`[Procedures Email] No email recipients configured for template: ${template.procedureName}`);
      await storage.updateProceduresSubmissionEmailStatus(submission.id, 'no_recipients');
      return;
    }

    const { subject, html, text } = generateProcedureSubmissionEmail(
      template,
      submission.submittedByName,
      new Date(submission.submissionDate),
      submission.answers as Record<string, { value: any; initials?: string; comment?: string; completedAt?: string }>
    );

    // Send to each recipient
    let successCount = 0;
    let failCount = 0;

    for (const recipient of emailTo) {
      try {
        await sendEmail(recipient, subject, html, text);
        successCount++;
        console.log(`[Procedures Email] Sent to ${recipient}`);
      } catch (err) {
        failCount++;
        console.error(`[Procedures Email] Failed to send to ${recipient}:`, err);
      }
    }

    // Send CC copies
    if (emailCc && emailCc.length > 0) {
      for (const ccRecipient of emailCc) {
        try {
          await sendEmail(ccRecipient, subject, html, text);
          console.log(`[Procedures Email] Sent CC to ${ccRecipient}`);
        } catch (err) {
          console.error(`[Procedures Email] Failed to send CC to ${ccRecipient}:`, err);
        }
      }
    }

    // Update email status
    const status = failCount === 0 ? 'success' : (successCount > 0 ? 'partial' : 'failed');
    await storage.updateProceduresSubmissionEmailStatus(submission.id, status);
    console.log(`[Procedures Email] Status updated to: ${status}`);
  } catch (emailError) {
    console.error("[Procedures Email] Error sending notification:", emailError);
    await storage.updateProceduresSubmissionEmailStatus(submission.id, 'failed');
  }
}

// ==========================================
// PROCEDURE TEMPLATES
// ==========================================

router.get("/templates", async (req: Request, res: Response) => {
  try {
    const { department, procedureType, isActive } = req.query;
    const templates = await storage.getProceduresTemplates({
      department: department as string | undefined,
      procedureType: procedureType as string | undefined,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined
    });
    res.json(templates);
  } catch (error) {
    console.error("Error fetching procedure templates:", error);
    res.status(500).json({ error: "Failed to fetch procedure templates" });
  }
});

router.get("/templates/:id", async (req: Request, res: Response) => {
  try {
    const template = await storage.getProceduresTemplateWithItems(req.params.id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    res.json(template);
  } catch (error) {
    console.error("Error fetching procedure template:", error);
    res.status(500).json({ error: "Failed to fetch procedure template" });
  }
});

router.post("/templates", async (req: Request, res: Response) => {
  try {
    const validated = insertProceduresTemplateSchema.parse(req.body);
    const template = await storage.createProceduresTemplate(validated);
    res.status(201).json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Error creating procedure template:", error);
    res.status(500).json({ error: "Failed to create procedure template" });
  }
});

router.patch("/templates/:id", async (req: Request, res: Response) => {
  try {
    const template = await storage.updateProceduresTemplate(req.params.id, req.body);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    res.json(template);
  } catch (error) {
    console.error("Error updating procedure template:", error);
    res.status(500).json({ error: "Failed to update procedure template" });
  }
});

router.delete("/templates/:id", async (req: Request, res: Response) => {
  try {
    const deleted = await storage.deleteProceduresTemplate(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Template not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting procedure template:", error);
    res.status(500).json({ error: "Failed to delete procedure template" });
  }
});

router.post("/templates/:id/copy", async (req: Request, res: Response) => {
  try {
    const original = await storage.getProceduresTemplateWithItems(req.params.id);
    if (!original) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    // Create a copy of the template with a new name
    const copyData = {
      procedureName: `${original.procedureName} (Copy)`,
      procedureCode: `${original.procedureCode}_COPY_${Date.now().toString(36).toUpperCase()}`,
      department: original.department,
      procedureType: original.procedureType,
      description: original.description,
      daysOfWeek: original.daysOfWeek,
      isActive: false, // Start inactive so admin can review
      isMandatory: original.isMandatory,
      completionTime: original.completionTime,
      emailRecipientsTo: original.emailRecipientsTo,
      emailRecipientsCc: original.emailRecipientsCc,
    };
    
    const newTemplate = await storage.createProceduresTemplate(copyData);
    
    // Copy all items
    if (original.items && original.items.length > 0) {
      for (const item of original.items) {
        await storage.createProceduresItem({
          templateId: newTemplate.id,
          label: item.label,
          description: item.description,
          isRequired: item.isRequired,
          requireInitials: item.requireInitials,
          requireComment: item.requireComment,
          responseType: item.responseType,
          dropdownOptions: item.dropdownOptions,
          sortOrder: item.sortOrder,
        });
      }
    }
    
    // Fetch the complete new template with items
    const completeTemplate = await storage.getProceduresTemplateWithItems(newTemplate.id);
    res.status(201).json(completeTemplate);
  } catch (error) {
    console.error("Error copying procedure template:", error);
    res.status(500).json({ error: "Failed to copy procedure template" });
  }
});

// ==========================================
// PROCEDURE ITEMS
// ==========================================

router.get("/templates/:templateId/items", async (req: Request, res: Response) => {
  try {
    const items = await storage.getProceduresItems(req.params.templateId);
    res.json(items);
  } catch (error) {
    console.error("Error fetching procedure items:", error);
    res.status(500).json({ error: "Failed to fetch procedure items" });
  }
});

router.post("/templates/:templateId/items", async (req: Request, res: Response) => {
  try {
    const validated = insertProceduresItemSchema.parse({
      ...req.body,
      templateId: req.params.templateId
    });
    const item = await storage.createProceduresItem(validated);
    res.status(201).json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Error creating procedure item:", error);
    res.status(500).json({ error: "Failed to create procedure item" });
  }
});

router.patch("/items/:id", async (req: Request, res: Response) => {
  try {
    const item = await storage.updateProceduresItem(req.params.id, req.body);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }
    res.json(item);
  } catch (error) {
    console.error("Error updating procedure item:", error);
    res.status(500).json({ error: "Failed to update procedure item" });
  }
});

router.delete("/items/:id", async (req: Request, res: Response) => {
  try {
    const deleted = await storage.deleteProceduresItem(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Item not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting procedure item:", error);
    res.status(500).json({ error: "Failed to delete procedure item" });
  }
});

router.post("/templates/:templateId/items/reorder", async (req: Request, res: Response) => {
  try {
    const { itemIds } = req.body;
    if (!Array.isArray(itemIds)) {
      return res.status(400).json({ error: "itemIds must be an array" });
    }
    await storage.reorderProceduresItems(req.params.templateId, itemIds);
    res.json({ success: true });
  } catch (error) {
    console.error("Error reordering procedure items:", error);
    res.status(500).json({ error: "Failed to reorder procedure items" });
  }
});

// ==========================================
// PROCEDURE USERS
// ==========================================

router.get("/users", async (req: Request, res: Response) => {
  try {
    const { isActive } = req.query;
    const users = await storage.getProceduresUsers({
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined
    });
    res.json(users);
  } catch (error) {
    console.error("Error fetching procedure users:", error);
    res.status(500).json({ error: "Failed to fetch procedure users" });
  }
});

router.get("/users/:id", async (req: Request, res: Response) => {
  try {
    const user = await storage.getProceduresUser(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching procedure user:", error);
    res.status(500).json({ error: "Failed to fetch procedure user" });
  }
});

router.post("/users", async (req: Request, res: Response) => {
  try {
    const validated = insertProceduresUserSchema.parse(req.body);
    const user = await storage.createProceduresUser(validated);
    res.status(201).json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Error creating procedure user:", error);
    res.status(500).json({ error: "Failed to create procedure user" });
  }
});

router.patch("/users/:id", async (req: Request, res: Response) => {
  try {
    const user = await storage.updateProceduresUser(req.params.id, req.body);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error updating procedure user:", error);
    res.status(500).json({ error: "Failed to update procedure user" });
  }
});

router.delete("/users/:id", async (req: Request, res: Response) => {
  try {
    const deleted = await storage.deleteProceduresUser(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting procedure user:", error);
    res.status(500).json({ error: "Failed to delete procedure user" });
  }
});

// ==========================================
// STAFF ACCESS (Public - Code-based for procedures_staff)
// ==========================================

// Staff login by code (uses procedures_staff table)
router.post("/staff-login", async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: "Access code is required" });
    }
    
    const staff = await storage.getProceduresStaffByCode(code);
    if (!staff) {
      return res.status(401).json({ error: "Invalid access code" });
    }
    
    // Update last used timestamp
    await storage.updateProceduresStaff(staff.id, { lastUsedAt: new Date() } as any);
    res.json(staff);
  } catch (error) {
    console.error("Error logging in staff:", error);
    res.status(500).json({ error: "Failed to log in" });
  }
});

// Get procedures assigned to a staff member
router.get("/staff-procedures/:staffId", async (req: Request, res: Response) => {
  try {
    const procedures = await storage.getProceduresForStaff(req.params.staffId);
    res.json(procedures);
  } catch (error) {
    console.error("Error fetching staff procedures:", error);
    res.status(500).json({ error: "Failed to fetch procedures" });
  }
});

// ==========================================
// LEGACY STAFF ACCESS (PIN-based for proceduresUsers)
// ==========================================

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { pin } = req.body;
    if (!pin || typeof pin !== 'string') {
      return res.status(400).json({ error: "PIN is required" });
    }
    
    const user = await storage.getProceduresUserByPin(pin);
    if (!user) {
      return res.status(401).json({ error: "Invalid PIN" });
    }
    
    await storage.updateProceduresUserLastLogin(user.id);
    res.json(user);
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "Failed to log in" });
  }
});

router.get("/today/:userId", async (req: Request, res: Response) => {
  try {
    const procedures = await storage.getTodaysProceduresForUser(req.params.userId);
    res.json(procedures);
  } catch (error) {
    console.error("Error fetching today's procedures:", error);
    res.status(500).json({ error: "Failed to fetch today's procedures" });
  }
});

// ==========================================
// SUBMISSIONS
// ==========================================

router.get("/submissions", async (req: Request, res: Response) => {
  try {
    const { department, procedureCode, startDate, endDate, userId } = req.query;
    const submissions = await storage.getProceduresSubmissions({
      department: department as string | undefined,
      procedureCode: procedureCode as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      userId: userId as string | undefined
    });
    res.json(submissions);
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

// Get draft submission for a template and staff member (must be before :id route)
router.get("/submissions/draft/:templateId", async (req: Request, res: Response) => {
  try {
    const { staffName } = req.query;
    if (!staffName || typeof staffName !== 'string') {
      return res.status(400).json({ error: "staffName is required" });
    }
    const draft = await storage.getProceduresSubmissionDraft(req.params.templateId, staffName);
    if (!draft) {
      return res.status(404).json({ error: "No draft found" });
    }
    res.json(draft);
  } catch (error) {
    console.error("Error fetching draft:", error);
    res.status(500).json({ error: "Failed to fetch draft" });
  }
});

router.get("/submissions/:id", async (req: Request, res: Response) => {
  try {
    const submission = await storage.getProceduresSubmission(req.params.id);
    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }
    res.json(submission);
  } catch (error) {
    console.error("Error fetching submission:", error);
    res.status(500).json({ error: "Failed to fetch submission" });
  }
});

router.post("/submissions", async (req: Request, res: Response) => {
  try {
    // Convert date strings to Date objects
    const submissionDate = req.body.submissionDate ? new Date(req.body.submissionDate) : new Date();
    const body = {
      ...req.body,
      submissionDate,
      dateTimeStarted: req.body.dateTimeStarted ? new Date(req.body.dateTimeStarted) : undefined,
      dateTimeSubmitted: req.body.dateTimeSubmitted ? new Date(req.body.dateTimeSubmitted) : new Date(),
    };
    
    // Check if a submission already exists for this template, date, and staff member
    const existingSubmission = await storage.getProceduresSubmissionByDateAndStaff(
      req.body.templateId,
      submissionDate,
      req.body.submittedByName
    );
    
    if (existingSubmission) {
      // If existing submission is already submitted (not draft), prevent duplicate submission
      if (existingSubmission.status === 'submitted' && req.body.status === 'submitted') {
        console.log(`[Procedures] Submission already exists and submitted for ${req.body.submittedByName} on ${submissionDate.toISOString().split('T')[0]}`);
        return res.status(409).json({ 
          error: "A submission for this procedure has already been submitted today",
          existingSubmission 
        });
      }
      
      // Update existing submission instead of creating duplicate
      const updateData: any = {};
      if (req.body.answers) updateData.answers = req.body.answers;
      if (req.body.notes !== undefined) updateData.notes = req.body.notes;
      if (req.body.lateReason !== undefined) updateData.lateReason = req.body.lateReason;
      if (req.body.status) updateData.status = req.body.status;
      if (req.body.dateTimeStarted) updateData.dateTimeStarted = new Date(req.body.dateTimeStarted);
      if (req.body.dateTimeSubmitted) updateData.dateTimeSubmitted = new Date(req.body.dateTimeSubmitted);
      
      const updatedSubmission = await storage.updateProceduresSubmission(existingSubmission.id, updateData);
      console.log(`[Procedures] Updated existing submission ${existingSubmission.id} for ${req.body.submittedByName}`);
      
      // If updating to submitted status, send email using the shared helper
      if (req.body.status === 'submitted' && existingSubmission.status === 'draft' && updatedSubmission) {
        // Trigger email sending asynchronously (don't block the response)
        sendProcedureSubmissionEmails(updatedSubmission);
      }
      
      return res.json(updatedSubmission);
    }
    
    const validated = insertProceduresSubmissionSchema.parse(body);
    const submission = await storage.createProceduresSubmission(validated);
    console.log(`[Procedures] Created new submission ${submission.id} for ${req.body.submittedByName}`);

    // Send email notifications asynchronously using the shared helper (don't block the response)
    if (submission.status === 'submitted') {
      sendProcedureSubmissionEmails(submission);
    }

    res.status(201).json(submission);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Error creating submission:", error);
    res.status(500).json({ error: "Failed to create submission" });
  }
});

router.patch("/submissions/:id", async (req: Request, res: Response) => {
  try {
    const submission = await storage.updateProceduresSubmission(req.params.id, req.body);
    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }
    res.json(submission);
  } catch (error) {
    console.error("Error updating submission:", error);
    res.status(500).json({ error: "Failed to update submission" });
  }
});

router.delete("/submissions/:id", async (req: Request, res: Response) => {
  try {
    const deleted = await storage.deleteProceduresSubmission(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Submission not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting submission:", error);
    res.status(500).json({ error: "Failed to delete submission" });
  }
});

// Get departments from Daily Reports for consistency
router.get("/departments", async (req: Request, res: Response) => {
  try {
    const templates = await storage.getDailyReportTemplates();
    const departments = templates.map(t => ({
      department: t.department,
      departmentLabel: t.departmentLabel
    }));
    res.json(departments);
  } catch (error) {
    console.error("Error fetching departments:", error);
    res.status(500).json({ error: "Failed to fetch departments" });
  }
});

// ==========================================
// PROCEDURE STAFF
// ==========================================

router.get("/staff", async (req: Request, res: Response) => {
  try {
    const { isActive } = req.query;
    const staff = await storage.getProceduresStaff({
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined
    });
    res.json(staff);
  } catch (error) {
    console.error("Error fetching procedure staff:", error);
    res.status(500).json({ error: "Failed to fetch procedure staff" });
  }
});

router.get("/staff/:id", async (req: Request, res: Response) => {
  try {
    const staff = await storage.getProceduresStaffMember(req.params.id);
    if (!staff) {
      return res.status(404).json({ error: "Staff member not found" });
    }
    res.json(staff);
  } catch (error) {
    console.error("Error fetching staff member:", error);
    res.status(500).json({ error: "Failed to fetch staff member" });
  }
});

router.post("/staff", async (req: Request, res: Response) => {
  try {
    const validated = insertProceduresStaffSchema.parse(req.body);
    const staff = await storage.createProceduresStaff(validated);
    res.status(201).json(staff);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Error creating staff member:", error);
    res.status(500).json({ error: "Failed to create staff member" });
  }
});

router.patch("/staff/:id", async (req: Request, res: Response) => {
  try {
    const staff = await storage.updateProceduresStaff(req.params.id, req.body);
    if (!staff) {
      return res.status(404).json({ error: "Staff member not found" });
    }
    res.json(staff);
  } catch (error) {
    console.error("Error updating staff member:", error);
    res.status(500).json({ error: "Failed to update staff member" });
  }
});

router.delete("/staff/:id", async (req: Request, res: Response) => {
  try {
    const deleted = await storage.deleteProceduresStaff(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Staff member not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting staff member:", error);
    res.status(500).json({ error: "Failed to delete staff member" });
  }
});

export default router;
