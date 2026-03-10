import { Router, Request, Response } from "express";
import { db } from "./db";
import { eq, and, desc, asc, gte } from "drizzle-orm";
import {
  mediaFoodTrucks,
  mediaFoodTruckEvents,
  mediaFoodTruckSubmissions,
  insertFoodTruckSchema,
  insertFoodTruckEventSchema,
  insertFoodTruckSubmissionSchema,
} from "@shared/schema";

const router = Router();

function requireAuth(req: Request, res: Response, next: Function) {
  if (!(req as any).user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

// ==================== Food Trucks CRUD ====================

router.get("/api/media/food-trucks", requireAuth, async (_req: Request, res: Response) => {
  try {
    const trucks = await db.select().from(mediaFoodTrucks).orderBy(asc(mediaFoodTrucks.name));
    res.json(trucks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/media/food-trucks", requireAuth, async (req: Request, res: Response) => {
  try {
    const data = insertFoodTruckSchema.parse(req.body);
    const [truck] = await db.insert(mediaFoodTrucks).values(data).returning();
    res.json(truck);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/api/media/food-trucks/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const data = insertFoodTruckSchema.partial().parse(req.body);
    const [truck] = await db.update(mediaFoodTrucks).set(data).where(eq(mediaFoodTrucks.id, id)).returning();
    if (!truck) return res.status(404).json({ error: "Food truck not found" });
    res.json(truck);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/api/media/food-trucks/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(mediaFoodTrucks).where(eq(mediaFoodTrucks.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Food Truck Events CRUD ====================

router.get("/api/media/food-truck-events", requireAuth, async (_req: Request, res: Response) => {
  try {
    const events = await db.select().from(mediaFoodTruckEvents).orderBy(desc(mediaFoodTruckEvents.eventDate));
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/media/food-truck-events", requireAuth, async (req: Request, res: Response) => {
  try {
    const data = insertFoodTruckEventSchema.parse(req.body);
    const [event] = await db.insert(mediaFoodTruckEvents).values(data).returning();
    res.json(event);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/api/media/food-truck-events/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const data = insertFoodTruckEventSchema.partial().parse(req.body);
    const [event] = await db.update(mediaFoodTruckEvents).set(data).where(eq(mediaFoodTruckEvents.id, id)).returning();
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(event);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/api/media/food-truck-events/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(mediaFoodTruckEvents).where(eq(mediaFoodTruckEvents.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Food Truck Submissions ====================

router.get("/api/media/food-truck-submissions", requireAuth, async (_req: Request, res: Response) => {
  try {
    const submissions = await db.select().from(mediaFoodTruckSubmissions).orderBy(desc(mediaFoodTruckSubmissions.createdAt));
    res.json(submissions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/api/media/food-truck-submissions/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { status, reviewNotes } = req.body;

    if (!["approved", "declined"].includes(status)) {
      return res.status(400).json({ error: "Status must be 'approved' or 'declined'" });
    }

    const [existing] = await db.select().from(mediaFoodTruckSubmissions).where(eq(mediaFoodTruckSubmissions.id, id));
    if (!existing) return res.status(404).json({ error: "Submission not found" });

    const [submission] = await db
      .update(mediaFoodTruckSubmissions)
      .set({ status, reviewNotes, reviewedAt: new Date() })
      .where(eq(mediaFoodTruckSubmissions.id, id))
      .returning();

    if (status === "approved") {
      await db.insert(mediaFoodTrucks).values({
        name: existing.truckName,
        cuisineType: existing.cuisineType,
        description: existing.description,
        websiteUrl: existing.websiteUrl,
        contactEmail: existing.contactEmail,
        contactPhone: existing.contactPhone,
        isApproved: true,
        isActive: true,
      });
    }

    res.json(submission);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== Public Endpoints ====================

router.post("/api/public/food-truck-submit", async (req: Request, res: Response) => {
  try {
    const data = insertFoodTruckSubmissionSchema.parse(req.body);

    if (!data.healthLicenseAcknowledged) {
      return res.status(400).json({ error: "You must acknowledge the Board of Health licensing requirement" });
    }
    if (!data.menuDescription || data.menuDescription.trim().length === 0) {
      return res.status(400).json({ error: "Menu description is required" });
    }

    const [submission] = await db.insert(mediaFoodTruckSubmissions).values({
      ...data,
      status: "pending",
    }).returning();

    res.json(submission);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/api/public/food-truck-calendar", async (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const events = await db
      .select({
        id: mediaFoodTruckEvents.id,
        title: mediaFoodTruckEvents.title,
        eventDate: mediaFoodTruckEvents.eventDate,
        startTime: mediaFoodTruckEvents.startTime,
        endTime: mediaFoodTruckEvents.endTime,
        location: mediaFoodTruckEvents.location,
        description: mediaFoodTruckEvents.description,
        imageUrl: mediaFoodTruckEvents.imageUrl,
        isFeatured: mediaFoodTruckEvents.isFeatured,
        foodTruckId: mediaFoodTruckEvents.foodTruckId,
        truckName: mediaFoodTrucks.name,
        cuisineType: mediaFoodTrucks.cuisineType,
        truckDescription: mediaFoodTrucks.description,
        truckImageUrl: mediaFoodTrucks.imageUrl,
        truckWebsiteUrl: mediaFoodTrucks.websiteUrl,
      })
      .from(mediaFoodTruckEvents)
      .leftJoin(mediaFoodTrucks, eq(mediaFoodTruckEvents.foodTruckId, mediaFoodTrucks.id))
      .where(
        and(
          eq(mediaFoodTruckEvents.isActive, true),
          gte(mediaFoodTruckEvents.eventDate, today)
        )
      )
      .orderBy(asc(mediaFoodTruckEvents.eventDate), asc(mediaFoodTruckEvents.startTime));

    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
