import { Router } from "express";
import { db } from "./db";
import { enhancementRequests, insertEnhancementRequestSchema } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { isPlatformAuthenticated, requirePlatformRole } from "./platformAuth";
import sgMail from "@sendgrid/mail";
import { generateBrandedEmailHeader, generateBrandedEmailFooter, getBrandedEmailStyles } from "./email";
import { z } from "zod";

const router = Router();
const isAuthenticated = isPlatformAuthenticated;
const isAdmin = requirePlatformRole(['super_admin']);

const updateEnhancementSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  module: z.string().nullable().optional(),
  submittedBy: z.string().optional(),
  submitterEmail: z.string().email().nullable().optional(),
  status: z.enum(["new", "reviewing", "in_progress", "completed", "declined"]).optional(),
  adminNotes: z.string().nullable().optional(),
});

router.get("/api/enhancement-requests", async (_req, res) => {
  try {
    const requests = await db.select().from(enhancementRequests).orderBy(desc(enhancementRequests.createdAt));
    res.json(requests);
  } catch (error) {
    console.error("[Enhancement] Error fetching requests:", error);
    res.status(500).json({ message: "Failed to fetch enhancement requests" });
  }
});

router.post("/api/enhancement-requests", async (req, res) => {
  try {
    const parsed = insertEnhancementRequestSchema.parse(req.body);
    const [request] = await db.insert(enhancementRequests).values(parsed).returning();
    res.status(201).json(request);
  } catch (error) {
    console.error("[Enhancement] Error creating request:", error);
    res.status(400).json({ message: "Failed to create enhancement request" });
  }
});

router.patch("/api/enhancement-requests/:id", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const parsed = updateEnhancementSchema.parse(req.body);
    const updates: any = { ...parsed, updatedAt: new Date() };

    const [updated] = await db.update(enhancementRequests)
      .set(updates)
      .where(eq(enhancementRequests.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Enhancement request not found" });
    }
    res.json(updated);
  } catch (error) {
    console.error("[Enhancement] Error updating request:", error);
    res.status(500).json({ message: "Failed to update enhancement request" });
  }
});

router.post("/api/enhancement-requests/:id/vote", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { direction } = req.body;
    const increment = direction === "up" ? 1 : -1;

    const [updated] = await db.update(enhancementRequests)
      .set({
        votes: sql`${enhancementRequests.votes} + ${increment}`,
        updatedAt: new Date(),
      })
      .where(eq(enhancementRequests.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Enhancement request not found" });
    }
    res.json(updated);
  } catch (error) {
    console.error("[Enhancement] Error voting:", error);
    res.status(500).json({ message: "Failed to vote" });
  }
});

router.post("/api/enhancement-requests/:id/complete", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { changesDescription, responseMessage } = req.body;

    const [updated] = await db.update(enhancementRequests)
      .set({
        status: "completed",
        changesDescription,
        responseMessage,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(enhancementRequests.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Enhancement request not found" });
    }

    if (updated.submitterEmail && process.env.SENDGRID_API_KEY) {
      try {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        const from = process.env.SENDGRID_FROM_EMAIL || 'email@nashobawinery.com';

        const header = generateBrandedEmailHeader(
          "Enhancement Request Update",
          "Your request has been completed"
        );
        const footer = generateBrandedEmailFooter(false);
        const styles = getBrandedEmailStyles();

        const html = `
          <!DOCTYPE html>
          <html>
          <head><style>${styles}</style></head>
          <body>
            <div class="email-container">
              ${header}
              <div class="content">
                <p>Hi ${updated.submittedBy},</p>
                <p>Great news! Your enhancement request has been completed:</p>
                <div style="background-color: #f8f9fa; border-left: 4px solid #5C2535; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0;">
                  <h3 style="margin: 0 0 8px; color: #5C2535;">${updated.title}</h3>
                  <p style="margin: 0; color: #666; font-size: 14px;">${updated.description}</p>
                </div>
                ${changesDescription ? `
                <h3 style="color: #5C2535; margin-top: 25px;">What Changed</h3>
                <p>${changesDescription}</p>
                ` : ''}
                ${responseMessage ? `
                <h3 style="color: #5C2535; margin-top: 25px;">Our Response</h3>
                <p>${responseMessage}</p>
                ` : ''}
                <p style="margin-top: 25px;">Thank you for helping us improve the platform!</p>
              </div>
              ${footer}
            </div>
          </body>
          </html>
        `;

        const text = `Hi ${updated.submittedBy},\n\nYour enhancement request "${updated.title}" has been completed.\n\n${changesDescription ? `What Changed: ${changesDescription}\n\n` : ''}${responseMessage ? `Our Response: ${responseMessage}\n\n` : ''}Thank you for helping us improve the platform!`;

        await sgMail.send({ to: updated.submitterEmail, from, subject: `Enhancement Request Completed: ${updated.title}`, html, text });
        console.log(`[Enhancement] Completion email sent to ${updated.submitterEmail}`);
      } catch (emailError) {
        console.error("[Enhancement] Failed to send completion email:", emailError);
      }
    }

    res.json(updated);
  } catch (error) {
    console.error("[Enhancement] Error completing request:", error);
    res.status(500).json({ message: "Failed to complete enhancement request" });
  }
});

router.delete("/api/enhancement-requests/:id", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(enhancementRequests).where(eq(enhancementRequests.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("[Enhancement] Error deleting request:", error);
    res.status(500).json({ message: "Failed to delete enhancement request" });
  }
});

export default router;
