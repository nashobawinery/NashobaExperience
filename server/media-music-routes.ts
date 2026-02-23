import { Router, Request, Response } from "express";
import { db } from "./db";
import { eq, and, desc, asc, gte } from "drizzle-orm";
import {
  mediaMusicians,
  mediaMusicEvents,
  mediaMusicianSubmissions,
  insertMusicianSchema,
  insertMusicEventSchema,
  insertMusicianSubmissionSchema,
} from "@shared/schema";

const router = Router();

function requireAuth(req: Request, res: Response, next: Function) {
  if (!(req as any).user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

// ==================== Musicians CRUD ====================

router.get("/api/media/musicians", requireAuth, async (_req: Request, res: Response) => {
  try {
    const musicians = await db.select().from(mediaMusicians).orderBy(asc(mediaMusicians.name));
    res.json(musicians);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/media/musicians", requireAuth, async (req: Request, res: Response) => {
  try {
    const data = insertMusicianSchema.parse(req.body);
    const [musician] = await db.insert(mediaMusicians).values(data).returning();
    res.json(musician);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/api/media/musicians/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const data = insertMusicianSchema.partial().parse(req.body);
    const [musician] = await db.update(mediaMusicians).set(data).where(eq(mediaMusicians.id, id)).returning();
    if (!musician) return res.status(404).json({ error: "Musician not found" });
    res.json(musician);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/api/media/musicians/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(mediaMusicians).where(eq(mediaMusicians.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Music Events CRUD ====================

router.get("/api/media/music-events", requireAuth, async (_req: Request, res: Response) => {
  try {
    const events = await db.select().from(mediaMusicEvents).orderBy(desc(mediaMusicEvents.eventDate));
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/media/music-events", requireAuth, async (req: Request, res: Response) => {
  try {
    const data = insertMusicEventSchema.parse(req.body);
    const [event] = await db.insert(mediaMusicEvents).values(data).returning();
    res.json(event);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/api/media/music-events/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const data = insertMusicEventSchema.partial().parse(req.body);
    const [event] = await db.update(mediaMusicEvents).set(data).where(eq(mediaMusicEvents.id, id)).returning();
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(event);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/api/media/music-events/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(mediaMusicEvents).where(eq(mediaMusicEvents.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Musician Submissions ====================

router.get("/api/media/musician-submissions", requireAuth, async (_req: Request, res: Response) => {
  try {
    const submissions = await db.select().from(mediaMusicianSubmissions).orderBy(desc(mediaMusicianSubmissions.createdAt));
    res.json(submissions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/api/media/musician-submissions/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { status, reviewNotes } = req.body;

    if (!["approved", "declined"].includes(status)) {
      return res.status(400).json({ error: "Status must be 'approved' or 'declined'" });
    }

    const [existing] = await db.select().from(mediaMusicianSubmissions).where(eq(mediaMusicianSubmissions.id, id));
    if (!existing) return res.status(404).json({ error: "Submission not found" });

    const [submission] = await db
      .update(mediaMusicianSubmissions)
      .set({ status, reviewNotes, reviewedAt: new Date() })
      .where(eq(mediaMusicianSubmissions.id, id))
      .returning();

    if (status === "approved") {
      await db.insert(mediaMusicians).values({
        name: existing.musicianName,
        genre: existing.genre,
        bio: existing.bio,
        websiteUrl: existing.websiteUrl,
        contactEmail: existing.contactEmail,
        contactPhone: existing.contactPhone,
        isApproved: true,
        isActive: true,
      });
    }

    res.json(submission);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Public Endpoints ====================

router.post("/api/public/musician-submit", async (req: Request, res: Response) => {
  try {
    const data = insertMusicianSubmissionSchema.parse(req.body);

    if (!data.proAcknowledged) {
      return res.status(400).json({ error: "You must acknowledge the PRO licensing policy" });
    }
    if (!data.songList || data.songList.trim().length === 0) {
      return res.status(400).json({ error: "Song list is required" });
    }

    const [submission] = await db.insert(mediaMusicianSubmissions).values({
      ...data,
      status: "pending",
    }).returning();

    res.json(submission);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/api/public/music-calendar", async (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const events = await db
      .select({
        id: mediaMusicEvents.id,
        title: mediaMusicEvents.title,
        eventDate: mediaMusicEvents.eventDate,
        startTime: mediaMusicEvents.startTime,
        endTime: mediaMusicEvents.endTime,
        location: mediaMusicEvents.location,
        description: mediaMusicEvents.description,
        imageUrl: mediaMusicEvents.imageUrl,
        isFeatured: mediaMusicEvents.isFeatured,
        musicianId: mediaMusicEvents.musicianId,
        musicianName: mediaMusicians.name,
        musicianGenre: mediaMusicians.genre,
        musicianBio: mediaMusicians.bio,
        musicianImageUrl: mediaMusicians.imageUrl,
        musicianWebsiteUrl: mediaMusicians.websiteUrl,
      })
      .from(mediaMusicEvents)
      .leftJoin(mediaMusicians, eq(mediaMusicEvents.musicianId, mediaMusicians.id))
      .where(
        and(
          eq(mediaMusicEvents.isActive, true),
          gte(mediaMusicEvents.eventDate, today)
        )
      )
      .orderBy(asc(mediaMusicEvents.eventDate), asc(mediaMusicEvents.startTime));

    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
