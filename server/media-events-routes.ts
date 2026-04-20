import { Router, Request, Response } from "express";
import { db } from "./db";
import { eq, and, desc, asc, gte } from "drizzle-orm";
import {
  mediaSpecialEvents,
  mediaSpecialEventsDayBanners,
  insertSpecialEventSchema,
  insertSpecialEventsDayBannerSchema,
} from "@shared/schema";

const router = Router();

function requireAuth(req: Request, res: Response, next: Function) {
  const sess = req.session as any;
  if (!sess.platformAuth?.platformUserId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

// ==================== Special Events CRUD ====================

router.get("/api/media/special-events", requireAuth, async (_req: Request, res: Response) => {
  try {
    const events = await db.select().from(mediaSpecialEvents).orderBy(desc(mediaSpecialEvents.eventDate));
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/media/special-events", requireAuth, async (req: Request, res: Response) => {
  try {
    const data = insertSpecialEventSchema.parse(req.body);
    const [event] = await db.insert(mediaSpecialEvents).values(data).returning();
    res.json(event);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/api/media/special-events/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const data = insertSpecialEventSchema.partial().parse(req.body);
    const [event] = await db.update(mediaSpecialEvents).set(data).where(eq(mediaSpecialEvents.id, id)).returning();
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(event);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/api/media/special-events/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(mediaSpecialEvents).where(eq(mediaSpecialEvents.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Public Endpoint ====================

router.get("/api/public/special-events", async (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const events = await db
      .select()
      .from(mediaSpecialEvents)
      .where(
        and(
          eq(mediaSpecialEvents.isActive, true),
          gte(mediaSpecialEvents.eventDate, today)
        )
      )
      .orderBy(asc(mediaSpecialEvents.eventDate), asc(mediaSpecialEvents.startTime));
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Special Events day banners (public calendar) ====================

router.get("/api/media/special-events-day-banners", requireAuth, async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(mediaSpecialEventsDayBanners).orderBy(desc(mediaSpecialEventsDayBanners.bannerDate));
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/media/special-events-day-banners", requireAuth, async (req: Request, res: Response) => {
  try {
    const data = insertSpecialEventsDayBannerSchema.parse(req.body);
    const [row] = await db.insert(mediaSpecialEventsDayBanners).values(data).returning();
    res.json(row);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/api/media/special-events-day-banners/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = insertSpecialEventsDayBannerSchema.partial().parse(req.body);
    const [row] = await db
      .update(mediaSpecialEventsDayBanners)
      .set(data)
      .where(eq(mediaSpecialEventsDayBanners.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/api/media/special-events-day-banners/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.delete(mediaSpecialEventsDayBanners).where(eq(mediaSpecialEventsDayBanners.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/public/special-events-day-banners", async (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const rows = await db
      .select({
        bannerDate: mediaSpecialEventsDayBanners.bannerDate,
        label: mediaSpecialEventsDayBanners.label,
      })
      .from(mediaSpecialEventsDayBanners)
      .where(and(eq(mediaSpecialEventsDayBanners.isActive, true), gte(mediaSpecialEventsDayBanners.bannerDate, today)))
      .orderBy(asc(mediaSpecialEventsDayBanners.bannerDate));
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
