# Compliance Module - Complete Implementation Guide

This document contains everything needed to recreate the Compliance Management module in another Replit app.

---

## 1. DATABASE SCHEMA (shared/schema.ts)

Add these enums and tables to your `shared/schema.ts`:

```typescript
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, boolean, timestamp, jsonb, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================
// COMPLIANCE MODULE ENUMS
// ============================================

export const complianceCategoryEnum = pgEnum("compliance_category", [
  "tax",
  "licensing",
  "payroll",
  "privacy",
  "security",
  "environmental",
  "health_safety",
  "regulatory",
  "administrative",
  "insurance",
  "other"
]);

export const complianceRecurrenceEnum = pgEnum("compliance_recurrence", [
  "one_time",
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "semi_annual",
  "annual",
  "custom"
]);

export const compliancePriorityEnum = pgEnum("compliance_priority", ["low", "medium", "high", "critical"]);

export const complianceStatusEnum = pgEnum("compliance_status", ["pending", "in_progress", "completed", "overdue", "cancelled"]);

// ============================================
// COMPLIANCE TASKS TABLE
// ============================================

export const complianceTasks = pgTable("compliance_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskName: text("task_name").notNull(),
  description: text("description"),
  category: complianceCategoryEnum("category").notNull(),
  subcategory: text("subcategory"),
  jurisdiction: text("jurisdiction"), // e.g., "Federal", "Massachusetts", "Local"
  regulatoryBody: text("regulatory_body"), // e.g., "IRS", "TTB", "State ABC"
  
  // Recurrence settings
  recurrence: complianceRecurrenceEnum("recurrence").notNull().default("one_time"),
  customRecurrenceDays: integer("custom_recurrence_days"), // For custom recurrence patterns
  
  // Deadline management
  dueDate: timestamp("due_date"),
  reminderDays: integer("reminder_days").array(), // e.g., [30, 14, 7, 1] days before
  lastReminderSent: timestamp("last_reminder_sent"),
  
  // Assignment
  assignedToName: text("assigned_to_name"),
  assignedToEmail: text("assigned_to_email"),
  assignedById: varchar("assigned_by_id").references(() => users.id),
  
  // Status and priority
  status: complianceStatusEnum("status").notNull().default("pending"),
  priority: compliancePriorityEnum("priority").notNull().default("medium"),
  
  // Portal/credential info (encrypted in practice)
  portalUrl: text("portal_url"),
  portalUsername: text("portal_username"),
  portalPassword: text("portal_password"),
  portalNotes: text("portal_notes"),
  
  // Financial tracking
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 10, scale: 2 }),
  penaltyAmount: decimal("penalty_amount", { precision: 10, scale: 2 }),
  
  // Completion tracking
  completedAt: timestamp("completed_at"),
  completedById: varchar("completed_by_id").references(() => users.id),
  completionNotes: text("completion_notes"),
  confirmationNumber: text("confirmation_number"),
  
  // Tags for flexible categorization
  tags: text("tags").array(),
  
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdById: varchar("created_by_id").references(() => users.id),
  isActive: boolean("is_active").notNull().default(true),
  archivedAt: timestamp("archived_at"),
}, (table) => [
  index("idx_compliance_category").on(table.category),
  index("idx_compliance_status").on(table.status),
  index("idx_compliance_due_date").on(table.dueDate),
  index("idx_compliance_assigned").on(table.assignedToEmail),
]);

// ============================================
// COMPLIANCE TASK HISTORY (Audit Log)
// ============================================

export const complianceTaskHistory = pgTable("compliance_task_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => complianceTasks.id, { onDelete: 'cascade' }),
  changedById: varchar("changed_by_id").references(() => users.id),
  changedByName: text("changed_by_name"),
  action: text("action").notNull(), // e.g., "created", "updated", "completed", "status_changed"
  fieldChanged: text("field_changed"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_compliance_history_task").on(table.taskId),
  index("idx_compliance_history_date").on(table.createdAt),
]);

// ============================================
// COMPLIANCE REMINDERS (Sent Reminder Log)
// ============================================

export const complianceReminders = pgTable("compliance_reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => complianceTasks.id, { onDelete: 'cascade' }),
  sentToEmail: text("sent_to_email").notNull(),
  sentToName: text("sent_to_name"),
  method: text("method").notNull().default("email"), // email, calendar_invite, push
  subject: text("subject"),
  status: text("status").notNull().default("sent"), // sent, failed, opened
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  daysBeforeDue: integer("days_before_due"),
}, (table) => [
  index("idx_compliance_reminders_task").on(table.taskId),
  index("idx_compliance_reminders_date").on(table.sentAt),
]);

// ============================================
// COMPLIANCE ATTACHMENTS
// ============================================

export const complianceAttachments = pgTable("compliance_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => complianceTasks.id, { onDelete: 'cascade' }),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type"),
  fileSize: integer("file_size"),
  uploadedById: varchar("uploaded_by_id").references(() => users.id),
  uploadedByName: text("uploaded_by_name"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_compliance_attachments_task").on(table.taskId),
]);

// ============================================
// INSERT SCHEMAS & TYPES
// ============================================

export const insertComplianceTaskSchema = createInsertSchema(complianceTasks).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  completedAt: true,
  lastReminderSent: true,
  archivedAt: true
});
export const insertComplianceTaskHistorySchema = createInsertSchema(complianceTaskHistory).omit({ id: true, createdAt: true });
export const insertComplianceReminderSchema = createInsertSchema(complianceReminders).omit({ id: true, sentAt: true });
export const insertComplianceAttachmentSchema = createInsertSchema(complianceAttachments).omit({ id: true, createdAt: true });

// Types
export type InsertComplianceTask = z.infer<typeof insertComplianceTaskSchema>;
export type ComplianceTask = typeof complianceTasks.$inferSelect;

export type InsertComplianceTaskHistory = z.infer<typeof insertComplianceTaskHistorySchema>;
export type ComplianceTaskHistory = typeof complianceTaskHistory.$inferSelect;

export type InsertComplianceReminder = z.infer<typeof insertComplianceReminderSchema>;
export type ComplianceReminder = typeof complianceReminders.$inferSelect;

export type InsertComplianceAttachment = z.infer<typeof insertComplianceAttachmentSchema>;
export type ComplianceAttachment = typeof complianceAttachments.$inferSelect;

// Extended types
export type ComplianceTaskWithDetails = ComplianceTask & {
  history?: ComplianceTaskHistory[];
  reminders?: ComplianceReminder[];
  attachments?: ComplianceAttachment[];
};
```

---

## 2. BACKEND API ROUTES (server/routes.ts)

Add these imports at the top:

```typescript
import { insertComplianceTaskSchema } from "@shared/schema";
import sgMail from '@sendgrid/mail';
import crypto from 'crypto';

// Password encryption for portal credentials
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here';
const IV_LENGTH = 16;

function encryptPassword(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptPassword(text: string): string {
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch {
    return text;
  }
}

// Initialize SendGrid (for email reminders)
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}
```

Add these API routes inside your `registerRoutes` function:

```typescript
// ============================================
// COMPLIANCE API ROUTES
// ============================================

// Get all compliance tasks
app.get('/api/compliance/tasks', isAdmin, async (req, res) => {
  try {
    const { status, category, priority } = req.query;
    let query = sql`
      SELECT * FROM compliance_tasks 
      WHERE is_active = true
      ${status ? sql` AND status = ${status}` : sql``}
      ${category ? sql` AND category = ${category}` : sql``}
      ${priority ? sql` AND priority = ${priority}` : sql``}
      ORDER BY 
        CASE WHEN status = 'overdue' THEN 1
             WHEN status = 'pending' AND due_date < NOW() THEN 2
             WHEN status = 'in_progress' THEN 3
             WHEN status = 'pending' THEN 4
             ELSE 5 END,
        due_date ASC NULLS LAST
    `;
    const result = await db.execute(query);
    const tasksWithDecryptedPasswords = result.rows.map((task: any) => ({
      ...task,
      portal_password: task.portal_password ? decryptPassword(task.portal_password) : null
    }));
    res.json(tasksWithDecryptedPasswords);
  } catch (error) {
    console.error('Error fetching compliance tasks:', error);
    res.status(500).json({ message: 'Failed to fetch compliance tasks' });
  }
});

// Get single compliance task with details
app.get('/api/compliance/tasks/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const taskResult = await db.execute(sql`
      SELECT * FROM compliance_tasks WHERE id = ${id}
    `);
    
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const task = taskResult.rows[0] as any;
    if (task.portal_password) {
      task.portal_password = decryptPassword(task.portal_password);
    }

    const historyResult = await db.execute(sql`
      SELECT * FROM compliance_task_history 
      WHERE task_id = ${id} 
      ORDER BY created_at DESC
    `);

    const remindersResult = await db.execute(sql`
      SELECT * FROM compliance_reminders 
      WHERE task_id = ${id} 
      ORDER BY sent_at DESC
    `);

    const attachmentsResult = await db.execute(sql`
      SELECT * FROM compliance_attachments 
      WHERE task_id = ${id} 
      ORDER BY created_at DESC
    `);

    res.json({
      ...task,
      history: historyResult.rows,
      reminders: remindersResult.rows,
      attachments: attachmentsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching compliance task:', error);
    res.status(500).json({ message: 'Failed to fetch compliance task' });
  }
});

// Create compliance task
app.post('/api/compliance/tasks', isAdmin, async (req: any, res) => {
  try {
    const parsed = insertComplianceTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid task data', errors: parsed.error.errors });
    }

    const userId = req.user?.claims?.sub;
    const userName = req.user?.claims?.email || 'Admin';
    
    const result = await db.execute(sql`
      INSERT INTO compliance_tasks (
        task_name, description, category, subcategory, jurisdiction, regulatory_body,
        recurrence, custom_recurrence_days, due_date, reminder_days,
        assigned_to_name, assigned_to_email, assigned_by_id,
        status, priority, portal_url, portal_username, portal_password, portal_notes,
        estimated_cost, actual_cost, penalty_amount, tags, created_by_id
      ) VALUES (
        ${parsed.data.taskName},
        ${parsed.data.description || null},
        ${parsed.data.category},
        ${parsed.data.subcategory || null},
        ${parsed.data.jurisdiction || null},
        ${parsed.data.regulatoryBody || null},
        ${parsed.data.recurrence || 'one_time'},
        ${parsed.data.customRecurrenceDays || null},
        ${parsed.data.dueDate || null},
        ${parsed.data.reminderDays ? `{${parsed.data.reminderDays.join(',')}}` : null}::integer[],
        ${parsed.data.assignedToName || null},
        ${parsed.data.assignedToEmail || null},
        ${userId || null},
        ${parsed.data.status || 'pending'},
        ${parsed.data.priority || 'medium'},
        ${parsed.data.portalUrl || null},
        ${parsed.data.portalUsername || null},
        ${parsed.data.portalPassword ? encryptPassword(parsed.data.portalPassword) : null},
        ${parsed.data.portalNotes || null},
        ${parsed.data.estimatedCost || null},
        ${parsed.data.actualCost || null},
        ${parsed.data.penaltyAmount || null},
        ${parsed.data.tags || null},
        ${userId || null}
      ) RETURNING *
    `);

    // Log creation in history
    const task = result.rows[0];
    await db.execute(sql`
      INSERT INTO compliance_task_history (task_id, changed_by_id, changed_by_name, action, new_value)
      VALUES (${task.id}, ${userId || null}, ${userName}, 'created', ${parsed.data.taskName})
    `);

    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating compliance task:', error);
    res.status(500).json({ message: 'Failed to create compliance task' });
  }
});

// Delete compliance task (soft delete)
app.delete('/api/compliance/tasks/:id', isAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.claims?.sub;
    const userName = req.user?.claims?.email || 'Admin';

    await db.execute(sql`
      UPDATE compliance_tasks SET is_active = false, updated_at = NOW() WHERE id = ${id}
    `);

    await db.execute(sql`
      INSERT INTO compliance_task_history (task_id, changed_by_id, changed_by_name, action)
      VALUES (${id}, ${userId || null}, ${userName}, 'deleted')
    `);

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting compliance task:', error);
    res.status(500).json({ message: 'Failed to delete compliance task' });
  }
});

// Complete compliance task and move to next cycle
app.post('/api/compliance/tasks/:id/complete', isAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { completionNotes, confirmationNumber, actualCost } = req.body;
    const userId = req.user?.claims?.sub;
    const userName = req.user?.claims?.email || 'Admin';

    const taskResult = await db.execute(sql`
      SELECT * FROM compliance_tasks WHERE id = ${id}
    `);

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const task = taskResult.rows[0] as any;
    const currentDueDate = task.due_date ? new Date(task.due_date) : new Date();
    const recurrence = task.recurrence as string;
    const customRecurrenceDays = task.custom_recurrence_days;

    // Calculate next due date based on recurrence
    let nextDueDate: Date | null = null;
    switch (recurrence) {
      case "daily":
        nextDueDate = new Date(currentDueDate);
        nextDueDate.setDate(nextDueDate.getDate() + 1);
        break;
      case "weekly":
        nextDueDate = new Date(currentDueDate);
        nextDueDate.setDate(nextDueDate.getDate() + 7);
        break;
      case "monthly":
        nextDueDate = new Date(currentDueDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        break;
      case "quarterly":
        nextDueDate = new Date(currentDueDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + 3);
        break;
      case "semi_annual":
        nextDueDate = new Date(currentDueDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + 6);
        break;
      case "annual":
        nextDueDate = new Date(currentDueDate);
        nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
        break;
      case "custom":
        if (customRecurrenceDays && customRecurrenceDays > 0) {
          nextDueDate = new Date(currentDueDate);
          nextDueDate.setDate(nextDueDate.getDate() + customRecurrenceDays);
        }
        break;
    }

    // Log completion to history
    await db.execute(sql`
      INSERT INTO compliance_task_history (
        task_id, changed_by_id, changed_by_name, action, 
        field_changed, old_value, new_value
      )
      VALUES (
        ${id}, ${userId || null}, ${userName}, 'completed',
        'completed_cycle', ${currentDueDate.toISOString()}, ${nextDueDate ? nextDueDate.toISOString() : 'one_time_completed'}
      )
    `);

    if (recurrence === "one_time" || !nextDueDate) {
      // One-time task: just mark as completed
      await db.execute(sql`
        UPDATE compliance_tasks 
        SET status = 'completed',
            completed_at = NOW(),
            completed_by_id = ${userId || null},
            completion_notes = ${completionNotes || null},
            confirmation_number = ${confirmationNumber || null},
            actual_cost = ${actualCost || null},
            updated_at = NOW()
        WHERE id = ${id}
      `);
      res.json({ message: 'Task completed successfully', nextCycle: false });
    } else {
      // Recurring task: reset for next cycle
      await db.execute(sql`
        UPDATE compliance_tasks 
        SET status = 'pending',
            due_date = ${nextDueDate},
            completed_at = NULL,
            completed_by_id = NULL,
            completion_notes = NULL,
            confirmation_number = NULL,
            actual_cost = NULL,
            last_reminder_sent = NULL,
            updated_at = NOW()
        WHERE id = ${id}
      `);
      res.json({ 
        message: 'Task completed and moved to next cycle', 
        nextCycle: true,
        nextDueDate: nextDueDate.toISOString()
      });
    }
  } catch (error) {
    console.error('Error completing compliance task:', error);
    res.status(500).json({ message: 'Failed to complete compliance task' });
  }
});

// Get compliance dashboard stats
app.get('/api/compliance/stats', isAdmin, async (req, res) => {
  try {
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) FILTER (WHERE is_active = true) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'pending' AND is_active = true) as pending,
        COUNT(*) FILTER (WHERE status = 'in_progress' AND is_active = true) as in_progress,
        COUNT(*) FILTER (WHERE status = 'completed' AND is_active = true) as completed,
        COUNT(*) FILTER (WHERE status = 'overdue' AND is_active = true) as overdue,
        COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed', 'cancelled') AND is_active = true) as past_due,
        COUNT(*) FILTER (WHERE due_date BETWEEN NOW() AND NOW() + INTERVAL '7 days' AND status NOT IN ('completed', 'cancelled') AND is_active = true) as due_this_week,
        COUNT(*) FILTER (WHERE due_date BETWEEN NOW() AND NOW() + INTERVAL '30 days' AND status NOT IN ('completed', 'cancelled') AND is_active = true) as due_this_month
      FROM compliance_tasks
    `);
    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Error fetching compliance stats:', error);
    res.status(500).json({ message: 'Failed to fetch compliance stats' });
  }
});

// Get upcoming deadlines
app.get('/api/compliance/upcoming', isAdmin, async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT * FROM compliance_tasks 
      WHERE is_active = true 
        AND status NOT IN ('completed', 'cancelled')
        AND due_date IS NOT NULL
        AND due_date >= NOW()
      ORDER BY due_date ASC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching upcoming deadlines:', error);
    res.status(500).json({ message: 'Failed to fetch upcoming deadlines' });
  }
});

// Send compliance reminder email
app.post('/api/compliance/tasks/:id/send-reminder', isAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    
    const taskResult = await db.execute(sql`
      SELECT * FROM compliance_tasks WHERE id = ${id}
    `);
    
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const task = taskResult.rows[0] as any;

    if (!task.assigned_to_email) {
      return res.status(400).json({ message: 'No assignee email configured for this task' });
    }

    if (!process.env.SENDGRID_API_KEY) {
      return res.status(500).json({ message: 'Email service not configured' });
    }

    // Calculate days until due
    const dueDate = task.due_date ? new Date(task.due_date) : null;
    const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

    const subject = `Compliance Reminder: ${task.task_name}`;
    const html = `<h1>Compliance Reminder</h1><p>Task: ${task.task_name}</p><p>Due: ${dueDate?.toLocaleDateString() || 'Not set'}</p>`;

    const msg = {
      to: task.assigned_to_email,
      from: 'your-email@yourdomain.com', // Change this!
      subject,
      html,
    };

    await sgMail.send(msg);

    // Log the reminder
    await db.execute(sql`
      INSERT INTO compliance_reminders (task_id, sent_to_email, sent_to_name, method, subject, status, days_before_due)
      VALUES (${id}, ${task.assigned_to_email}, ${task.assigned_to_name || null}, 'email', ${subject}, 'sent', ${daysUntilDue || null})
    `);

    // Update last reminder sent
    await db.execute(sql`
      UPDATE compliance_tasks SET last_reminder_sent = NOW() WHERE id = ${id}
    `);

    res.json({ message: 'Reminder sent successfully' });
  } catch (error) {
    console.error('Error sending compliance reminder:', error);
    res.status(500).json({ message: 'Failed to send reminder' });
  }
});

// Duplicate compliance task
app.post('/api/compliance/tasks/:id/duplicate', isAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.claims?.sub;
    const userName = req.user?.claims?.email || 'Admin';

    const taskResult = await db.execute(sql`
      SELECT * FROM compliance_tasks WHERE id = ${id}
    `);

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const original = taskResult.rows[0] as any;

    const newTaskResult = await db.execute(sql`
      INSERT INTO compliance_tasks (
        task_name, description, category, subcategory, jurisdiction, regulatory_body,
        recurrence, custom_recurrence_days, due_date, reminder_days,
        assigned_to_name, assigned_to_email, status, priority,
        portal_url, portal_username, portal_password, portal_notes,
        estimated_cost, penalty_amount, tags, created_by_id, is_active
      ) VALUES (
        ${original.task_name + ' (Copy)'},
        ${original.description},
        ${original.category},
        ${original.subcategory},
        ${original.jurisdiction},
        ${original.regulatory_body},
        ${original.recurrence},
        ${original.custom_recurrence_days},
        ${original.due_date},
        ${original.reminder_days},
        ${original.assigned_to_name},
        ${original.assigned_to_email},
        'pending',
        ${original.priority},
        ${original.portal_url},
        ${original.portal_username},
        ${original.portal_password},
        ${original.portal_notes},
        ${original.estimated_cost},
        ${original.penalty_amount},
        ${original.tags},
        ${userId || null},
        true
      )
      RETURNING *
    `);

    res.json({ message: 'Task duplicated', task: newTaskResult.rows[0] });
  } catch (error) {
    console.error('Error duplicating task:', error);
    res.status(500).json({ message: 'Failed to duplicate task' });
  }
});

// Archive compliance task
app.post('/api/compliance/tasks/:id/archive', isAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.claims?.sub;
    const userName = req.user?.claims?.email || 'Admin';

    await db.execute(sql`
      UPDATE compliance_tasks 
      SET is_active = false, 
          status = 'cancelled',
          archived_at = NOW(),
          updated_at = NOW() 
      WHERE id = ${id}
    `);

    await db.execute(sql`
      INSERT INTO compliance_task_history (task_id, changed_by_id, changed_by_name, action)
      VALUES (${id}, ${userId || null}, ${userName}, 'archived')
    `);

    res.json({ message: 'Task archived successfully' });
  } catch (error) {
    console.error('Error archiving task:', error);
    res.status(500).json({ message: 'Failed to archive task' });
  }
});
```

---

## 3. FRONTEND COMPONENT

The complete frontend component is at: `client/src/pages/compliance/ComplianceAdminDashboard.tsx`

It's approximately 1,275 lines. The key features are:
- Overview tab with stats cards (total tasks, overdue, due this week, completed)
- Tasks list with filters (category, status, priority, search)
- Calendar view for deadline visualization
- Create/Edit task dialog with comprehensive form
- View task dialog with full details
- Actions: Complete, Archive, Duplicate, Send Reminder, Delete

---

## 4. REQUIRED DEPENDENCIES

```bash
npm install @sendgrid/mail date-fns
```

---

## 5. ENVIRONMENT VARIABLES

```
SENDGRID_API_KEY=your_sendgrid_api_key
ENCRYPTION_KEY=your-32-character-secret-key
```

---

## 6. ROUTE REGISTRATION (App.tsx)

```typescript
import ComplianceAdminDashboard from "@/pages/compliance/ComplianceAdminDashboard";

// Add route
<Route path="/compliance/admin" component={ComplianceAdminRoute} />

// Add route component
function ComplianceAdminRoute() {
  const { isLoading, isAdmin } = useAuth();
  if (isLoading) return <Loader />;
  if (!isAdmin) return <Redirect to="/" />;
  return <ComplianceAdminDashboard />;
}
```

---

## 7. DATABASE MIGRATION

After adding the schema, run:
```bash
npm run db:push
```

---

## KEY FEATURES

1. **Task Management**: Create, edit, delete, duplicate tasks
2. **Recurrence**: One-time, daily, weekly, monthly, quarterly, semi-annual, annual, custom
3. **Priority Levels**: Low, medium, high, critical
4. **Categories**: Tax, licensing, regulatory, insurance, environmental, health & safety, etc.
5. **Portal Credentials**: Encrypted storage of login info for regulatory portals
6. **Email Reminders**: SendGrid integration for automatic reminders
7. **Audit History**: Complete audit trail of all changes
8. **Financial Tracking**: Estimated/actual costs and penalty amounts
9. **Smart Completion**: Recurring tasks auto-advance to next cycle when completed
