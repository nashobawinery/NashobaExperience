import { Router, Request, Response } from "express";
import { db } from "./db";
import { eq, and, sql, asc, desc } from "drizzle-orm";
import {
  nashobatvChannels,
  nashobatvSlides,
  nashobatvEvents,
  nashobatvAnnouncements,
  nashobatvPhotos,
  nashobatvDisplaySettings,
  nashobatvDailySpecials,
  products,
  triviaQuestions,
  nashobatvHistoricalFacts,
  mediaSpecialEvents,
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

const DEFAULT_DISPLAY_SETTINGS = [
  { slideType: "welcome", isEnabled: true, duration: 15, sortOrder: 1 },
  { slideType: "events_today", isEnabled: true, duration: 12, sortOrder: 2 },
  { slideType: "upcoming_events", isEnabled: true, duration: 12, sortOrder: 3 },
  { slideType: "photo_gallery", isEnabled: true, duration: 10, sortOrder: 4 },
  { slideType: "announcement", isEnabled: true, duration: 10, sortOrder: 5 },
  { slideType: "weather", isEnabled: false, duration: 8, sortOrder: 6 },
  { slideType: "wine_club", isEnabled: true, duration: 12, sortOrder: 7 },
  { slideType: "daily_specials", isEnabled: true, duration: 12, sortOrder: 8 },
  { slideType: "trivia", isEnabled: true, duration: 15, sortOrder: 9 },
  { slideType: "history", isEnabled: true, duration: 15, sortOrder: 10 },
  { slideType: "custom", isEnabled: false, duration: 12, sortOrder: 11 },
];

async function ensureDefaultChannel(): Promise<typeof nashobatvChannels.$inferSelect> {
  const existing = await db.select().from(nashobatvChannels).limit(1);
  if (existing.length > 0) return existing[0];
  const [channel] = await db.insert(nashobatvChannels).values({
    name: "Tasting Room",
    slug: "tasting-room",
    channelType: "tv_display",
    location: "Tasting Room",
    isEmbeddable: true,
  }).returning();
  console.log("[NashobaTV] Created default channel: Tasting Room");
  return channel;
}

async function ensureDisplaySettingsExist(channelId: number): Promise<void> {
  const existing = await db
    .select()
    .from(nashobatvDisplaySettings)
    .where(eq(nashobatvDisplaySettings.channelId, channelId));
  if (existing.length === 0) {
    console.log(`[NashobaTV] Initializing default display settings for channel ${channelId}...`);
    for (const setting of DEFAULT_DISPLAY_SETTINGS) {
      await db.insert(nashobatvDisplaySettings).values({ ...setting, channelId }).onConflictDoNothing();
    }
    console.log("[NashobaTV] Default display settings created");
  }
}

async function getChannelBySlug(slug: string) {
  const [channel] = await db
    .select()
    .from(nashobatvChannels)
    .where(eq(nashobatvChannels.slug, slug));
  return channel || null;
}

async function getDefaultChannel() {
  const [channel] = await db
    .select()
    .from(nashobatvChannels)
    .where(eq(nashobatvChannels.isActive, true))
    .orderBy(asc(nashobatvChannels.id))
    .limit(1);
  if (channel) return channel;
  return ensureDefaultChannel();
}

// ====== CHANNEL CRUD (Admin) ======

router.get("/api/nashobatv/channels", requireAuth, async (_req: Request, res: Response) => {
  try {
    const channels = await db.select().from(nashobatvChannels).orderBy(asc(nashobatvChannels.name));
    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch channels" });
  }
});

router.post("/api/nashobatv/channels", requireAuth, async (req: Request, res: Response) => {
  try {
    const [channel] = await db.insert(nashobatvChannels).values(req.body).returning();
    res.json(channel);
  } catch (error) {
    console.error("Error creating channel:", error);
    res.status(500).json({ error: "Failed to create channel" });
  }
});

router.put("/api/nashobatv/channels/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const [channel] = await db
      .update(nashobatvChannels)
      .set(req.body)
      .where(eq(nashobatvChannels.id, parseInt(req.params.id)))
      .returning();
    res.json(channel);
  } catch (error) {
    console.error("Error updating channel:", error);
    res.status(500).json({ error: "Failed to update channel" });
  }
});

router.delete("/api/nashobatv/channels/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    await db.delete(nashobatvChannels).where(eq(nashobatvChannels.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete channel" });
  }
});

// ====== PUBLIC ENDPOINTS (no auth - for display page) ======
// Order: 1) photo-file (specific), 2) legacy routes (no slug), 3) slug-based routes

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

// --- Legacy public endpoints (no slug - use default channel) ---

router.get("/api/public/display/settings", async (_req: Request, res: Response) => {
  try {
    const channel = await getDefaultChannel();
    await ensureDisplaySettingsExist(channel.id);
    const settings = await db
      .select()
      .from(nashobatvDisplaySettings)
      .where(eq(nashobatvDisplaySettings.channelId, channel.id))
      .orderBy(asc(nashobatvDisplaySettings.sortOrder));
    res.json(settings);
  } catch (error) {
    console.error("Error fetching display settings:", error);
    res.status(500).json({ error: "Failed to fetch display settings" });
  }
});

router.get("/api/public/display/slides", async (_req: Request, res: Response) => {
  try {
    const channel = await getDefaultChannel();
    const today = new Date().toISOString().split("T")[0];
    const slides = await db
      .select()
      .from(nashobatvSlides)
      .where(and(eq(nashobatvSlides.isActive, true), eq(nashobatvSlides.channelId, channel.id)))
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
      .from(mediaSpecialEvents)
      .where(and(
        eq(mediaSpecialEvents.isActive, true),
        eq(mediaSpecialEvents.eventDate, today)
      ))
      .orderBy(asc(mediaSpecialEvents.startTime));
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
      .from(mediaSpecialEvents)
      .where(and(
        eq(mediaSpecialEvents.isActive, true),
        sql`${mediaSpecialEvents.eventDate} > ${today}`
      ))
      .orderBy(asc(mediaSpecialEvents.eventDate), asc(mediaSpecialEvents.startTime));
    const limited = events.slice(0, 4);
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
    const channel = await getDefaultChannel();
    const today = new Date().toISOString().split("T")[0];
    const announcements = await db
      .select()
      .from(nashobatvAnnouncements)
      .where(and(eq(nashobatvAnnouncements.isActive, true), eq(nashobatvAnnouncements.channelId, channel.id)))
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
    const channel = await getDefaultChannel();
    const photos = await db
      .select()
      .from(nashobatvPhotos)
      .where(and(eq(nashobatvPhotos.isDisplayed, true), eq(nashobatvPhotos.channelId, channel.id)))
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

router.get("/api/public/display/specials", async (_req: Request, res: Response) => {
  try {
    const channel = await getDefaultChannel();
    const today = new Date().toISOString().split("T")[0];
    const specials = await db
      .select()
      .from(nashobatvDailySpecials)
      .where(and(eq(nashobatvDailySpecials.isActive, true), eq(nashobatvDailySpecials.channelId, channel.id)));
    const filtered = specials.filter((s) => !s.validDate || s.validDate === today);
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching specials:", error);
    res.status(500).json({ error: "Failed to fetch specials" });
  }
});

router.get("/api/public/display/weather", async (_req: Request, res: Response) => {
  try {
    const lat = 42.4334;
    const lon = -71.6068;
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,sunrise,sunset&timezone=America/New_York&forecast_days=3`;
    const response = await fetch(weatherUrl);
    if (!response.ok) return res.status(502).json({ error: "Weather service unavailable" });
    const data = await response.json();

    const celsiusToFahrenheit = (c: number) => Math.round((c * 9 / 5) + 32);
    const getCondition = (code: number): string => {
      if (code === 0) return "Clear";
      if (code <= 3) return "Partly Cloudy";
      if (code <= 49) return "Foggy";
      if (code <= 59) return "Drizzle";
      if (code <= 69) return "Rain";
      if (code <= 79) return "Snow";
      if (code <= 99) return "Thunderstorm";
      return "Unknown";
    };

    const current = data.current ? {
      temp: celsiusToFahrenheit(data.current.temperature_2m),
      humidity: Math.round(data.current.relative_humidity_2m),
      condition: getCondition(data.current.weather_code),
      windSpeed: Math.round(data.current.wind_speed_10m * 0.621371),
    } : null;

    const forecast = data.daily?.time?.map((date: string, i: number) => ({
      date,
      high: celsiusToFahrenheit(data.daily.temperature_2m_max[i]),
      low: celsiusToFahrenheit(data.daily.temperature_2m_min[i]),
      condition: getCondition(data.daily.weather_code[i]),
      precipitation: data.daily.precipitation_sum[i] || 0,
      sunrise: data.daily.sunrise?.[i]?.split("T")[1]?.slice(0, 5) || "",
      sunset: data.daily.sunset?.[i]?.split("T")[1]?.slice(0, 5) || "",
    })) || [];

    res.json({ current, forecast, location: "Bolton, MA" });
  } catch (error) {
    console.error("Error fetching weather for display:", error);
    res.status(500).json({ error: "Failed to fetch weather" });
  }
});

router.get("/api/public/display/trivia", async (_req: Request, res: Response) => {
  try {
    const questions = await db
      .select()
      .from(triviaQuestions)
      .where(eq(triviaQuestions.isActive, true));
    const shuffled = questions.sort(() => Math.random() - 0.5);
    res.json(shuffled.map((q) => ({
      id: q.id,
      question: q.question,
      answers: q.answers,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    })));
  } catch (error) {
    console.error("Error fetching trivia for display:", error);
    res.status(500).json({ error: "Failed to fetch trivia" });
  }
});

router.get("/api/public/display/history", async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const allFacts = await db
      .select()
      .from(nashobatvHistoricalFacts)
      .where(eq(nashobatvHistoricalFacts.isActive, true));

    const relevantFacts = allFacts.filter((f) => {
      if (f.month === currentMonth && f.day === currentDay) return true;
      if (f.month === currentMonth && !f.day) return true;
      if (!f.month && !f.day) return true;
      return false;
    });

    const sorted = relevantFacts.sort((a, b) => {
      if (a.month === currentMonth && a.day === currentDay) return -1;
      if (b.month === currentMonth && b.day === currentDay) return 1;
      if (a.month === currentMonth && !a.day) return -1;
      if (b.month === currentMonth && !b.day) return 1;
      return Math.random() - 0.5;
    });

    res.json(sorted.map((f) => ({
      id: f.id,
      fact: f.fact,
      year: f.year,
      month: f.month,
      day: f.day,
      category: f.category,
    })));
  } catch (error) {
    console.error("Error fetching historical facts:", error);
    res.status(500).json({ error: "Failed to fetch historical facts" });
  }
});

// --- Slug-based public endpoints ---

router.get("/api/public/display/:slug/settings", async (req: Request, res: Response) => {
  try {
    const channel = await getChannelBySlug(req.params.slug);
    if (!channel) return res.status(404).json({ error: "Channel not found" });
    await ensureDisplaySettingsExist(channel.id);
    const settings = await db
      .select()
      .from(nashobatvDisplaySettings)
      .where(eq(nashobatvDisplaySettings.channelId, channel.id))
      .orderBy(asc(nashobatvDisplaySettings.sortOrder));
    res.json(settings);
  } catch (error) {
    console.error("Error fetching display settings:", error);
    res.status(500).json({ error: "Failed to fetch display settings" });
  }
});

router.get("/api/public/display/:slug/slides", async (req: Request, res: Response) => {
  try {
    const channel = await getChannelBySlug(req.params.slug);
    if (!channel) return res.status(404).json({ error: "Channel not found" });
    const today = new Date().toISOString().split("T")[0];
    const slides = await db
      .select()
      .from(nashobatvSlides)
      .where(and(eq(nashobatvSlides.isActive, true), eq(nashobatvSlides.channelId, channel.id)))
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

router.get("/api/public/display/:slug/events/today", async (req: Request, res: Response) => {
  try {
    const channel = await getChannelBySlug(req.params.slug);
    if (!channel) return res.status(404).json({ error: "Channel not found" });
    const today = new Date().toISOString().split("T")[0];
    const events = await db
      .select()
      .from(mediaSpecialEvents)
      .where(and(
        eq(mediaSpecialEvents.isActive, true),
        eq(mediaSpecialEvents.eventDate, today)
      ))
      .orderBy(asc(mediaSpecialEvents.startTime));
    res.json(events);
  } catch (error) {
    console.error("Error fetching today's events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

router.get("/api/public/display/:slug/events/upcoming", async (req: Request, res: Response) => {
  try {
    const channel = await getChannelBySlug(req.params.slug);
    if (!channel) return res.status(404).json({ error: "Channel not found" });
    const today = new Date().toISOString().split("T")[0];
    const events = await db
      .select()
      .from(mediaSpecialEvents)
      .where(and(
        eq(mediaSpecialEvents.isActive, true),
        sql`${mediaSpecialEvents.eventDate} > ${today}`
      ))
      .orderBy(asc(mediaSpecialEvents.eventDate), asc(mediaSpecialEvents.startTime));
    const limited = events.slice(0, 4);
    res.json(limited);
  } catch (error) {
    console.error("Error fetching upcoming events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

router.get("/api/public/display/:slug/wines", async (_req: Request, res: Response) => {
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

router.get("/api/public/display/:slug/announcements", async (req: Request, res: Response) => {
  try {
    const channel = await getChannelBySlug(req.params.slug);
    if (!channel) return res.status(404).json({ error: "Channel not found" });
    const today = new Date().toISOString().split("T")[0];
    const announcements = await db
      .select()
      .from(nashobatvAnnouncements)
      .where(and(eq(nashobatvAnnouncements.isActive, true), eq(nashobatvAnnouncements.channelId, channel.id)))
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

router.get("/api/public/display/:slug/photos", async (req: Request, res: Response) => {
  try {
    const channel = await getChannelBySlug(req.params.slug);
    if (!channel) return res.status(404).json({ error: "Channel not found" });
    const photos = await db
      .select()
      .from(nashobatvPhotos)
      .where(and(eq(nashobatvPhotos.isDisplayed, true), eq(nashobatvPhotos.channelId, channel.id)))
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

router.get("/api/public/display/:slug/specials", async (req: Request, res: Response) => {
  try {
    const channel = await getChannelBySlug(req.params.slug);
    if (!channel) return res.status(404).json({ error: "Channel not found" });
    const today = new Date().toISOString().split("T")[0];
    const specials = await db
      .select()
      .from(nashobatvDailySpecials)
      .where(and(eq(nashobatvDailySpecials.isActive, true), eq(nashobatvDailySpecials.channelId, channel.id)));
    const filtered = specials.filter((s) => !s.validDate || s.validDate === today);
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching specials:", error);
    res.status(500).json({ error: "Failed to fetch specials" });
  }
});

router.get("/api/public/display/:slug/weather", async (_req: Request, res: Response) => {
  try {
    const lat = 42.4334;
    const lon = -71.6068;
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,sunrise,sunset&timezone=America/New_York&forecast_days=3`;
    const response = await fetch(weatherUrl);
    if (!response.ok) return res.status(502).json({ error: "Weather service unavailable" });
    const data = await response.json();

    const celsiusToFahrenheit = (c: number) => Math.round((c * 9 / 5) + 32);
    const getCondition = (code: number): string => {
      if (code === 0) return "Clear";
      if (code <= 3) return "Partly Cloudy";
      if (code <= 49) return "Foggy";
      if (code <= 59) return "Drizzle";
      if (code <= 69) return "Rain";
      if (code <= 79) return "Snow";
      if (code <= 99) return "Thunderstorm";
      return "Unknown";
    };

    const current = data.current ? {
      temp: celsiusToFahrenheit(data.current.temperature_2m),
      humidity: Math.round(data.current.relative_humidity_2m),
      condition: getCondition(data.current.weather_code),
      windSpeed: Math.round(data.current.wind_speed_10m * 0.621371),
    } : null;

    const forecast = data.daily?.time?.map((date: string, i: number) => ({
      date,
      high: celsiusToFahrenheit(data.daily.temperature_2m_max[i]),
      low: celsiusToFahrenheit(data.daily.temperature_2m_min[i]),
      condition: getCondition(data.daily.weather_code[i]),
      precipitation: data.daily.precipitation_sum[i] || 0,
      sunrise: data.daily.sunrise?.[i]?.split("T")[1]?.slice(0, 5) || "",
      sunset: data.daily.sunset?.[i]?.split("T")[1]?.slice(0, 5) || "",
    })) || [];

    res.json({ current, forecast, location: "Bolton, MA" });
  } catch (error) {
    console.error("Error fetching weather for display:", error);
    res.status(500).json({ error: "Failed to fetch weather" });
  }
});

router.get("/api/public/display/:slug/history", async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const allFacts = await db
      .select()
      .from(nashobatvHistoricalFacts)
      .where(eq(nashobatvHistoricalFacts.isActive, true));

    const relevantFacts = allFacts.filter((f) => {
      if (f.month === currentMonth && f.day === currentDay) return true;
      if (f.month === currentMonth && !f.day) return true;
      if (!f.month && !f.day) return true;
      return false;
    });

    const sorted = relevantFacts.sort((a, b) => {
      if (a.month === currentMonth && a.day === currentDay) return -1;
      if (b.month === currentMonth && b.day === currentDay) return 1;
      if (a.month === currentMonth && !a.day) return -1;
      if (b.month === currentMonth && !b.day) return 1;
      return Math.random() - 0.5;
    });

    res.json(sorted.map((f) => ({
      id: f.id,
      fact: f.fact,
      year: f.year,
      month: f.month,
      day: f.day,
      category: f.category,
    })));
  } catch (error) {
    console.error("Error fetching historical facts:", error);
    res.status(500).json({ error: "Failed to fetch historical facts" });
  }
});

router.get("/api/public/display/:slug/trivia", async (_req: Request, res: Response) => {
  try {
    const questions = await db
      .select()
      .from(triviaQuestions)
      .where(eq(triviaQuestions.isActive, true));
    const shuffled = questions.sort(() => Math.random() - 0.5);
    res.json(shuffled.map((q) => ({
      id: q.id,
      question: q.question,
      answers: q.answers,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    })));
  } catch (error) {
    console.error("Error fetching trivia for display:", error);
    res.status(500).json({ error: "Failed to fetch trivia" });
  }
});

// ====== ADMIN ENDPOINTS ======

// --- Slides CRUD ---
router.get("/api/nashobatv/slides", requireAuth, async (req: Request, res: Response) => {
  try {
    const channelId = req.query.channelId ? parseInt(req.query.channelId as string) : null;
    let query = db.select().from(nashobatvSlides).orderBy(asc(nashobatvSlides.sortOrder));
    if (channelId) {
      const slides = await db.select().from(nashobatvSlides)
        .where(eq(nashobatvSlides.channelId, channelId))
        .orderBy(asc(nashobatvSlides.sortOrder));
      return res.json(slides);
    }
    const slides = await query;
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
router.get("/api/nashobatv/events", requireAuth, async (req: Request, res: Response) => {
  try {
    const channelId = req.query.channelId ? parseInt(req.query.channelId as string) : null;
    if (channelId) {
      const events = await db.select().from(nashobatvEvents)
        .where(eq(nashobatvEvents.channelId, channelId))
        .orderBy(desc(nashobatvEvents.eventDate));
      return res.json(events);
    }
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
router.get("/api/nashobatv/announcements", requireAuth, async (req: Request, res: Response) => {
  try {
    const channelId = req.query.channelId ? parseInt(req.query.channelId as string) : null;
    if (channelId) {
      const announcements = await db.select().from(nashobatvAnnouncements)
        .where(eq(nashobatvAnnouncements.channelId, channelId))
        .orderBy(desc(nashobatvAnnouncements.priority));
      return res.json(announcements);
    }
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
router.get("/api/nashobatv/photos", requireAuth, async (req: Request, res: Response) => {
  try {
    const channelId = req.query.channelId ? parseInt(req.query.channelId as string) : null;
    if (channelId) {
      const photos = await db.select().from(nashobatvPhotos)
        .where(eq(nashobatvPhotos.channelId, channelId))
        .orderBy(asc(nashobatvPhotos.sortOrder));
      const proxied = photos.map(p => ({ ...p, imageUrl: photoProxyUrl(p.id, p.imageUrl) }));
      return res.json(proxied);
    }
    const photos = await db.select().from(nashobatvPhotos).orderBy(asc(nashobatvPhotos.sortOrder));
    const proxied = photos.map(p => ({ ...p, imageUrl: photoProxyUrl(p.id, p.imageUrl) }));
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
router.get("/api/nashobatv/specials", requireAuth, async (req: Request, res: Response) => {
  try {
    const channelId = req.query.channelId ? parseInt(req.query.channelId as string) : null;
    if (channelId) {
      const specials = await db.select().from(nashobatvDailySpecials)
        .where(eq(nashobatvDailySpecials.channelId, channelId))
        .orderBy(desc(nashobatvDailySpecials.createdAt));
      return res.json(specials);
    }
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
router.get("/api/nashobatv/display-settings", requireAuth, async (req: Request, res: Response) => {
  try {
    const channelId = req.query.channelId ? parseInt(req.query.channelId as string) : null;
    if (channelId) {
      await ensureDisplaySettingsExist(channelId);
      const settings = await db.select().from(nashobatvDisplaySettings)
        .where(eq(nashobatvDisplaySettings.channelId, channelId))
        .orderBy(asc(nashobatvDisplaySettings.sortOrder));
      return res.json(settings);
    }
    const settings = await db.select().from(nashobatvDisplaySettings).orderBy(asc(nashobatvDisplaySettings.sortOrder));
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch display settings" });
  }
});

router.get("/api/nashobatv/historical-facts", requireAuth, async (_req: Request, res: Response) => {
  try {
    const facts = await db.select().from(nashobatvHistoricalFacts).orderBy(asc(nashobatvHistoricalFacts.year));
    res.json(facts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch historical facts" });
  }
});

router.post("/api/nashobatv/historical-facts", requireAuth, async (req: Request, res: Response) => {
  try {
    const { fact, year, month, day, category, isActive } = req.body;
    const [created] = await db.insert(nashobatvHistoricalFacts).values({
      fact,
      year: year || null,
      month: month || null,
      day: day || null,
      category: category || "winery",
      isActive: isActive !== false,
    }).returning();
    res.json(created);
  } catch (error) {
    res.status(500).json({ error: "Failed to create historical fact" });
  }
});

router.put("/api/nashobatv/historical-facts/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const [updated] = await db.update(nashobatvHistoricalFacts)
      .set(req.body)
      .where(eq(nashobatvHistoricalFacts.id, parseInt(req.params.id)))
      .returning();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update historical fact" });
  }
});

router.delete("/api/nashobatv/historical-facts/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    await db.delete(nashobatvHistoricalFacts).where(eq(nashobatvHistoricalFacts.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete historical fact" });
  }
});

router.put("/api/nashobatv/display-settings/bulk", requireAuth, async (req: Request, res: Response) => {
  try {
    const { settings } = req.body;
    const results = [];
    for (const s of settings) {
      const updateData: any = { sortOrder: s.sortOrder, isEnabled: s.isEnabled, duration: s.duration };
      if (s.configData !== undefined) updateData.configData = s.configData;
      const [updated] = await db
        .update(nashobatvDisplaySettings)
        .set(updateData)
        .where(eq(nashobatvDisplaySettings.id, s.id))
        .returning();
      results.push(updated);
    }
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: "Failed to update display settings" });
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

router.post("/api/nashobatv/display-settings", requireAuth, async (req: Request, res: Response) => {
  try {
    const [setting] = await db
      .insert(nashobatvDisplaySettings)
      .values(req.body)
      .returning();
    res.json(setting);
  } catch (error) {
    console.error("Error creating display setting:", error);
    res.status(500).json({ error: "Failed to create display setting" });
  }
});

router.delete("/api/nashobatv/display-settings/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    await db.delete(nashobatvDisplaySettings).where(eq(nashobatvDisplaySettings.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting display setting:", error);
    res.status(500).json({ error: "Failed to delete display setting" });
  }
});

export default router;
