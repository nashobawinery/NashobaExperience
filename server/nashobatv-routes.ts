import { Router, Request, Response } from "express";
import { db } from "./db";
import { eq, and, sql, asc, desc } from "drizzle-orm";
import {
  nashobatvSlides,
  nashobatvEvents,
  nashobatvAnnouncements,
  nashobatvPhotos,
  nashobatvDisplaySettings,
  nashobatvDailySpecials,
  products,
} from "@shared/schema";
import { objectStorageClient } from "./objectStorage";

const router = Router();

function photoProxyUrl(photoId: number, imageUrl: string): string {
  if (!imageUrl.startsWith("https://storage.googleapis.com/")) return imageUrl;
  return `/api/public/display/photo-file/${photoId}`;
}

function requireAuth(req: Request, res: Response, next: Function) {
  if (!(req as any).user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

// ====== PUBLIC ENDPOINTS (no auth - for display page) ======

router.get("/api/public/display/settings", async (_req: Request, res: Response) => {
  try {
    const settings = await db
      .select()
      .from(nashobatvDisplaySettings)
      .orderBy(asc(nashobatvDisplaySettings.sortOrder));
    res.json(settings);
  } catch (error) {
    console.error("Error fetching display settings:", error);
    res.status(500).json({ error: "Failed to fetch display settings" });
  }
});

router.get("/api/public/display/slides", async (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const slides = await db
      .select()
      .from(nashobatvSlides)
      .where(eq(nashobatvSlides.isActive, true))
      .orderBy(asc(nashobatvSlides.sortOrder));

    const filtered = slides.filter((s) => {
      if (s.startDate && s.startDate > today) return false;
      if (s.endDate && s.endDate < today) return false;
      return true;
    });
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching display slides:", error);
    res.status(500).json({ error: "Failed to fetch slides" });
  }
});

router.get("/api/public/display/events/today", async (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const events = await db
      .select()
      .from(nashobatvEvents)
      .where(and(eq(nashobatvEvents.isActive, true), eq(nashobatvEvents.eventDate, today)))
      .orderBy(asc(nashobatvEvents.startTime));
    res.json(events);
  } catch (error) {
    console.error("Error fetching today's events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

router.get("/api/public/display/events/upcoming", async (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const events = await db
      .select()
      .from(nashobatvEvents)
      .where(and(eq(nashobatvEvents.isActive, true), sql`${nashobatvEvents.eventDate} >= ${today}`))
      .orderBy(asc(nashobatvEvents.eventDate), asc(nashobatvEvents.startTime));
    const limited = events.slice(0, 10);
    res.json(limited);
  } catch (error) {
    console.error("Error fetching upcoming events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

router.get("/api/public/display/wines", async (_req: Request, res: Response) => {
  try {
    const wines = await db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        category: products.category,
        price: products.price,
        alcoholContent: products.alcoholContent,
        imageUrl: products.imageUrl,
      })
      .from(products)
      .where(and(
        eq(products.isArchived, false),
        sql`${products.category} IN ('wine', 'canned_wine', 'cider', 'beer', 'spirits', 'canned_cocktail')`
      ))
      .orderBy(products.category, products.name);
    res.json(wines);
  } catch (error) {
    console.error("Error fetching wines:", error);
    res.status(500).json({ error: "Failed to fetch wines" });
  }
});

router.get("/api/public/display/announcements", async (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const announcements = await db
      .select()
      .from(nashobatvAnnouncements)
      .where(eq(nashobatvAnnouncements.isActive, true))
      .orderBy(desc(nashobatvAnnouncements.priority));

    const filtered = announcements.filter((a) => {
      if (a.startDate && a.startDate > today) return false;
      if (a.endDate && a.endDate < today) return false;
      return true;
    });
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching announcements:", error);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

router.get("/api/public/display/photos", async (_req: Request, res: Response) => {
  try {
    const photos = await db
      .select()
      .from(nashobatvPhotos)
      .where(eq(nashobatvPhotos.isDisplayed, true))
      .orderBy(asc(nashobatvPhotos.sortOrder));
    const mapped = photos.map((p) => ({
      ...p,
      imageUrl: photoProxyUrl(p.id, p.imageUrl),
    }));
    res.json(mapped);
  } catch (error) {
    console.error("Error fetching photos:", error);
    res.status(500).json({ error: "Failed to fetch photos" });
  }
});

router.get("/api/public/display/photo-file/:photoId", async (req: Request, res: Response) => {
  try {
    const photoId = parseInt(req.params.photoId);
    if (isNaN(photoId)) return res.status(400).json({ error: "Invalid photo ID" });

    const [photo] = await db
      .select()
      .from(nashobatvPhotos)
      .where(eq(nashobatvPhotos.id, photoId));
    if (!photo) return res.status(404).json({ error: "Photo not found" });

    const imageUrl = photo.imageUrl;
    if (imageUrl.startsWith("https://storage.googleapis.com/")) {
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split("/").filter(Boolean);
      const bucketName = pathParts[0];
      const objectName = pathParts.slice(1).join("/");
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      const [metadata] = await file.getMetadata();
      res.setHeader("Content-Type", metadata.contentType || "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      const stream = file.createReadStream();
      stream.on("error", (err) => {
        console.error("Photo stream error:", err);
        if (!res.headersSent) res.status(500).json({ error: "Error streaming photo" });
      });
      stream.pipe(res);
    } else {
      res.redirect(imageUrl);
    }
  } catch (error) {
    console.error("Error serving photo:", error);
    res.status(500).json({ error: "Failed to serve photo" });
  }
});

router.get("/api/public/display/specials", async (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const specials = await db
      .select()
      .from(nashobatvDailySpecials)
      .where(eq(nashobatvDailySpecials.isActive, true));

    const filtered = specials.filter((s) => !s.validDate || s.validDate === today);
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching specials:", error);
    res.status(500).json({ error: "Failed to fetch specials" });
  }
});

// ====== ADMIN ENDPOINTS ======

// --- Slides CRUD ---
router.get("/api/nashobatv/slides", requireAuth, async (_req: Request, res: Response) => {
  try {
    const slides = await db.select().from(nashobatvSlides).orderBy(asc(nashobatvSlides.sortOrder));
    res.json(slides);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch slides" });
  }
});

router.post("/api/nashobatv/slides", requireAuth, async (req: Request, res: Response) => {
  try {
    const [slide] = await db.insert(nashobatvSlides).values(req.body).returning();
    res.json(slide);
  } catch (error) {
    console.error("Error creating slide:", error);
    res.status(500).json({ error: "Failed to create slide" });
  }
});

router.put("/api/nashobatv/slides/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const [slide] = await db
      .update(nashobatvSlides)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(nashobatvSlides.id, parseInt(req.params.id)))
      .returning();
    res.json(slide);
  } catch (error) {
    console.error("Error updating slide:", error);
    res.status(500).json({ error: "Failed to update slide" });
  }
});

router.delete("/api/nashobatv/slides/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    await db.delete(nashobatvSlides).where(eq(nashobatvSlides.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete slide" });
  }
});

// --- Events CRUD ---
router.get("/api/nashobatv/events", requireAuth, async (_req: Request, res: Response) => {
  try {
    const events = await db.select().from(nashobatvEvents).orderBy(desc(nashobatvEvents.eventDate));
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

router.post("/api/nashobatv/events", requireAuth, async (req: Request, res: Response) => {
  try {
    const [event] = await db.insert(nashobatvEvents).values(req.body).returning();
    res.json(event);
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: "Failed to create event" });
  }
});

router.put("/api/nashobatv/events/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const [event] = await db
      .update(nashobatvEvents)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(nashobatvEvents.id, parseInt(req.params.id)))
      .returning();
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: "Failed to update event" });
  }
});

router.delete("/api/nashobatv/events/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    await db.delete(nashobatvEvents).where(eq(nashobatvEvents.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete event" });
  }
});

// --- Announcements CRUD ---
router.get("/api/nashobatv/announcements", requireAuth, async (_req: Request, res: Response) => {
  try {
    const announcements = await db.select().from(nashobatvAnnouncements).orderBy(desc(nashobatvAnnouncements.priority));
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

router.post("/api/nashobatv/announcements", requireAuth, async (req: Request, res: Response) => {
  try {
    const [announcement] = await db.insert(nashobatvAnnouncements).values(req.body).returning();
    res.json(announcement);
  } catch (error) {
    res.status(500).json({ error: "Failed to create announcement" });
  }
});

router.put("/api/nashobatv/announcements/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const [announcement] = await db
      .update(nashobatvAnnouncements)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(nashobatvAnnouncements.id, parseInt(req.params.id)))
      .returning();
    res.json(announcement);
  } catch (error) {
    res.status(500).json({ error: "Failed to update announcement" });
  }
});

router.delete("/api/nashobatv/announcements/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    await db.delete(nashobatvAnnouncements).where(eq(nashobatvAnnouncements.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete announcement" });
  }
});

// --- Photos CRUD ---
router.get("/api/nashobatv/photos", requireAuth, async (_req: Request, res: Response) => {
  try {
    const photos = await db.select().from(nashobatvPhotos).orderBy(asc(nashobatvPhotos.sortOrder));
    const proxied = photos.map(p => ({
      ...p,
      imageUrl: photoProxyUrl(p.id, p.imageUrl),
    }));
    res.json(proxied);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch photos" });
  }
});

router.post("/api/nashobatv/photos", requireAuth, async (req: Request, res: Response) => {
  try {
    const [photo] = await db.insert(nashobatvPhotos).values(req.body).returning();
    res.json(photo);
  } catch (error) {
    res.status(500).json({ error: "Failed to create photo" });
  }
});

router.put("/api/nashobatv/photos/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const [photo] = await db
      .update(nashobatvPhotos)
      .set(req.body)
      .where(eq(nashobatvPhotos.id, parseInt(req.params.id)))
      .returning();
    res.json(photo);
  } catch (error) {
    res.status(500).json({ error: "Failed to update photo" });
  }
});

router.delete("/api/nashobatv/photos/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    await db.delete(nashobatvPhotos).where(eq(nashobatvPhotos.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete photo" });
  }
});

// --- Daily Specials CRUD ---
router.get("/api/nashobatv/specials", requireAuth, async (_req: Request, res: Response) => {
  try {
    const specials = await db.select().from(nashobatvDailySpecials).orderBy(desc(nashobatvDailySpecials.createdAt));
    res.json(specials);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch specials" });
  }
});

router.post("/api/nashobatv/specials", requireAuth, async (req: Request, res: Response) => {
  try {
    const [special] = await db.insert(nashobatvDailySpecials).values(req.body).returning();
    res.json(special);
  } catch (error) {
    res.status(500).json({ error: "Failed to create special" });
  }
});

router.put("/api/nashobatv/specials/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const [special] = await db
      .update(nashobatvDailySpecials)
      .set(req.body)
      .where(eq(nashobatvDailySpecials.id, parseInt(req.params.id)))
      .returning();
    res.json(special);
  } catch (error) {
    res.status(500).json({ error: "Failed to update special" });
  }
});

router.delete("/api/nashobatv/specials/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    await db.delete(nashobatvDailySpecials).where(eq(nashobatvDailySpecials.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete special" });
  }
});

// --- Display Settings ---
router.get("/api/nashobatv/display-settings", requireAuth, async (_req: Request, res: Response) => {
  try {
    const settings = await db.select().from(nashobatvDisplaySettings).orderBy(asc(nashobatvDisplaySettings.sortOrder));
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch display settings" });
  }
});

router.put("/api/nashobatv/display-settings/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const [setting] = await db
      .update(nashobatvDisplaySettings)
      .set(req.body)
      .where(eq(nashobatvDisplaySettings.id, parseInt(req.params.id)))
      .returning();
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: "Failed to update display setting" });
  }
});

router.put("/api/nashobatv/display-settings/bulk", requireAuth, async (req: Request, res: Response) => {
  try {
    const { settings } = req.body;
    const results = [];
    for (const s of settings) {
      const [updated] = await db
        .update(nashobatvDisplaySettings)
        .set({ isEnabled: s.isEnabled, duration: s.duration, sortOrder: s.sortOrder })
        .where(eq(nashobatvDisplaySettings.id, s.id))
        .returning();
      results.push(updated);
    }
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: "Failed to update display settings" });
  }
});

export default router;
