import { Router, Request, Response } from "express";
import { storage } from "./storage";
import { insertProceduresTemplateSchema, insertProceduresItemSchema, insertProceduresUserSchema, insertProceduresSubmissionSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

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
// STAFF ACCESS (Public - PIN-based)
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
    const validated = insertProceduresSubmissionSchema.parse(req.body);
    const submission = await storage.createProceduresSubmission(validated);
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

export default router;
