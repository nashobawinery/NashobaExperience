import { Router } from "express";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import OpenAI from "openai";
import {
  ccContentAssets, insertCcContentAssetSchema,
  ccContentCalendar, insertCcContentCalendarSchema,
  ccCampaignBuilder, insertCcCampaignBuilderSchema,
  ccMarketingScorecards,
  ccQuickPromotions,
} from "@shared/schema";

const router = Router();

function getOpenAI() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.log('[Growth Studio] OPENAI_API_KEY not found in env');
      return null;
    }
    return new OpenAI({ apiKey });
  } catch (err: any) {
    console.error('[Growth Studio] Failed to create OpenAI client:', err.message);
    return null;
  }
}

const contentUpdateSchema = z.object({
  title: z.string().optional(),
  status: z.enum(["draft", "saved", "published", "archived"]).optional(),
  selectedVariation: z.number().int().min(0).optional(),
  channel: z.string().nullable().optional(),
  targetSegment: z.string().nullable().optional(),
});

const calendarUpdateSchema = z.object({
  date: z.string().optional(),
  channel: z.enum(["email", "sms", "social", "on_site", "print"]).optional(),
  title: z.string().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(["planned", "published", "cancelled"]).optional(),
});

const campaignUpdateSchema = z.object({
  name: z.string().optional(),
  status: z.enum(["draft", "ready", "launched", "completed", "cancelled"]).optional(),
  targetSegment: z.string().nullable().optional(),
  channels: z.array(z.string()).optional(),
  estimatedReach: z.number().int().nullable().optional(),
});

router.get("/api/growth-studio/content", async (_req, res) => {
  try {
    const assets = await db.select().from(ccContentAssets).orderBy(desc(ccContentAssets.createdAt));
    res.json(assets);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api/growth-studio/content", async (req, res) => {
  try {
    const parsed = insertCcContentAssetSchema.parse(req.body);
    const [asset] = await db.insert(ccContentAssets).values(parsed).returning();
    res.json(asset);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.patch("/api/growth-studio/content/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validated = contentUpdateSchema.parse(req.body);
    const [updated] = await db.update(ccContentAssets).set(validated).where(eq(ccContentAssets.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Content not found" });
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/api/growth-studio/content/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(ccContentAssets).where(eq(ccContentAssets.id, id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api/growth-studio/content/generate", async (req, res) => {
  try {
    const openai = getOpenAI();
    if (!openai) return res.status(503).json({ error: "AI service is not configured. Please check the OpenAI API key." });

    const { type, context, targetSegment, channel } = req.body;

    const typeLabels: Record<string, string> = {
      social_post: "social media post",
      email_subject: "email subject line and preview text",
      ad_copy: "advertisement copy",
      event_promo: "event promotion",
      sms_blast: "SMS marketing message",
    };

    const prompt = `You are an expert marketing copywriter for Nashoba Valley Winery, a premium winery, brewery, and distillery in Bolton, Massachusetts. They also have a restaurant, host private events, and sell products online through Shopify.

Generate 4 different variations of a ${typeLabels[type] || type} based on the following context:

${context ? `Context/Topic: ${context}` : "General winery promotion"}
${targetSegment ? `Target Audience: ${targetSegment} customers` : ""}
${channel ? `Channel: ${channel}` : ""}

Requirements:
- Each variation should have a different tone/approach (e.g., casual/fun, sophisticated/elegant, urgent/limited-time, storytelling)
- Keep the brand voice warm, inviting, and authentic
- Reference specific Nashoba Valley products or experiences when relevant
- For social posts: include hashtag suggestions
- For email subjects: keep under 60 characters, make compelling
- For ad copy: include a clear call-to-action
- For SMS: keep under 160 characters
- For event promos: create excitement and urgency

Return ONLY a JSON array of 4 strings, each being one variation. No additional text or explanation.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    });

    const responseText = completion.choices[0]?.message?.content || "[]";
    let variations: string[];
    try {
      variations = JSON.parse(responseText.replace(/```json\n?|\n?```/g, "").trim());
    } catch {
      variations = [responseText];
    }

    const title = context?.substring(0, 100) || `${typeLabels[type] || type} - Generated`;

    const [asset] = await db.insert(ccContentAssets).values({
      type,
      title,
      context: context || null,
      variations,
      selectedVariation: 0,
      channel: channel || null,
      status: "draft",
      targetSegment: targetSegment || null,
    }).returning();

    res.json(asset);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/growth-studio/calendar", async (_req, res) => {
  try {
    const entries = await db.select().from(ccContentCalendar).orderBy(desc(ccContentCalendar.date));
    res.json(entries);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api/growth-studio/calendar", async (req, res) => {
  try {
    const parsed = insertCcContentCalendarSchema.parse(req.body);
    const [entry] = await db.insert(ccContentCalendar).values(parsed).returning();
    res.json(entry);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.patch("/api/growth-studio/calendar/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validated = calendarUpdateSchema.parse(req.body);
    const [updated] = await db.update(ccContentCalendar).set(validated).where(eq(ccContentCalendar.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Calendar entry not found" });
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/api/growth-studio/calendar/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(ccContentCalendar).where(eq(ccContentCalendar.id, id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/growth-studio/campaigns", async (_req, res) => {
  try {
    const campaigns = await db.select().from(ccCampaignBuilder).orderBy(desc(ccCampaignBuilder.createdAt));
    res.json(campaigns);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api/growth-studio/campaigns", async (req, res) => {
  try {
    const parsed = insertCcCampaignBuilderSchema.parse(req.body);
    const [campaign] = await db.insert(ccCampaignBuilder).values(parsed).returning();
    res.json(campaign);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.patch("/api/growth-studio/campaigns/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validated = campaignUpdateSchema.parse(req.body);
    const [updated] = await db.update(ccCampaignBuilder).set(validated).where(eq(ccCampaignBuilder.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Campaign not found" });
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/api/growth-studio/campaigns/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(ccCampaignBuilder).where(eq(ccCampaignBuilder.id, id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api/growth-studio/campaigns/:id/generate", async (req, res) => {
  try {
    const openai = getOpenAI();
    if (!openai) return res.status(503).json({ error: "AI service is not configured. Please check the OpenAI API key." });

    const id = parseInt(req.params.id);
    const [campaign] = await db.select().from(ccCampaignBuilder).where(eq(ccCampaignBuilder.id, id));
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    const goalDescriptions: Record<string, string> = {
      traffic: "driving foot traffic and website visits to Nashoba Valley Winery",
      reactivation: "reactivating lapsed or dormant customers who haven't visited recently",
      event_promotion: "promoting an upcoming event at Nashoba Valley",
      new_product: "launching a new wine, beer, spirit, or food product",
      seasonal: "capitalizing on a seasonal opportunity (holidays, harvest, summer, etc.)",
    };

    const prompt = `You are a marketing strategist for Nashoba Valley Winery in Bolton, Massachusetts. Create a comprehensive marketing campaign strategy.

Campaign: "${campaign.name}"
Goal: ${goalDescriptions[campaign.goal] || campaign.goal}
Target Segment: ${campaign.targetSegment || "all customers"}
Channels: ${campaign.channels?.join(", ") || "all channels"}

Create a detailed marketing strategy that includes:
1. STRATEGY OVERVIEW: A 2-3 sentence summary of the approach
2. KEY MESSAGES: 3 core messages to communicate
3. CHANNEL PLAN: Specific tactics for each selected channel
4. TIMELINE: Suggested rollout over 1-2 weeks
5. CONTENT IDEAS: 3-4 specific content pieces to create
6. SUCCESS METRICS: How to measure results
7. SAMPLE CONTENT: One ready-to-use piece for each channel

Return the strategy as a well-structured text with clear sections using markdown formatting.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const strategy = completion.choices[0]?.message?.content || "Strategy generation failed.";

    const [updated] = await db.update(ccCampaignBuilder)
      .set({ strategy, status: "ready" })
      .where(eq(ccCampaignBuilder.id, id))
      .returning();

    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/growth-studio/scorecard", async (_req, res) => {
  try {
    const scorecards = await db.select().from(ccMarketingScorecards).orderBy(desc(ccMarketingScorecards.createdAt)).limit(10);
    res.json(scorecards);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api/growth-studio/scorecard/generate", async (_req, res) => {
  try {
    const openai = getOpenAI();
    if (!openai) return res.status(503).json({ error: "AI service is not configured. Please check the OpenAI API key." });

    const prompt = `You are a marketing analyst for Nashoba Valley Winery in Bolton, Massachusetts. Generate a marketing performance scorecard for the current period.

Analyze marketing effectiveness and provide:

1. PERFORMANCE METRICS (as JSON object):
{
  "overallScore": 0-100,
  "channelScores": { "email": 0-100, "sms": 0-100, "social": 0-100, "onSite": 0-100 },
  "topMetrics": [
    { "label": "metric name", "value": "metric value", "trend": "up/down/stable" }
  ]
}

2. KEY INSIGHTS: 4-5 bullet points about what's working and what needs attention

3. RECOMMENDATIONS: 3-4 actionable recommendations ranked by potential impact

Return as JSON with three keys: "metrics" (the object above), "insights" (string with bullet points), "recommendations" (string with numbered recommendations).`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content || "{}";
    let parsed;
    try {
      parsed = JSON.parse(responseText.replace(/```json\n?|\n?```/g, "").trim());
    } catch {
      parsed = { metrics: "{}", insights: responseText, recommendations: "" };
    }

    const now = new Date();
    const periodLabel = `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;

    const [scorecard] = await db.insert(ccMarketingScorecards).values({
      periodLabel,
      metrics: typeof parsed.metrics === "string" ? parsed.metrics : JSON.stringify(parsed.metrics),
      insights: parsed.insights || "",
      recommendations: parsed.recommendations || "",
    }).returning();

    res.json(scorecard);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/growth-studio/quick-promos", async (_req, res) => {
  try {
    const promos = await db.select().from(ccQuickPromotions).orderBy(desc(ccQuickPromotions.createdAt));
    res.json(promos);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api/growth-studio/quick-promos/generate", async (req, res) => {
  try {
    const openai = getOpenAI();
    if (!openai) return res.status(503).json({ error: "AI service is not configured. Please check the OpenAI API key." });

    const { type, channel, targetSegment, customContext } = req.body;

    const promoTemplates: Record<string, { title: string; prompt: string }> = {
      seasonal_special: {
        title: "Seasonal Special",
        prompt: "Create a seasonal promotion for Nashoba Valley Winery. Consider the current time of year and what seasonal experiences or products would appeal to visitors. Include a special offer or incentive.",
      },
      new_release: {
        title: "New Release Announcement",
        prompt: "Create an exciting announcement for a new product release at Nashoba Valley Winery. This could be a new wine, craft beer, spirit, or cider. Build anticipation and encourage first purchases.",
      },
      weather_deal: {
        title: "Weather-Based Deal",
        prompt: "Create a weather-themed promotion for Nashoba Valley Winery. Match the current weather (rainy day cozy wine tasting, sunny patio dining, crisp fall harvest visit). Make visitors feel like today is the perfect day to visit.",
      },
      event_promo: {
        title: "Event Promotion",
        prompt: "Create a promotion for an upcoming event at Nashoba Valley (wine tasting, live music, seasonal festival, private dining, brewery tour). Create urgency with limited availability.",
      },
      loyalty_reward: {
        title: "Loyalty Reward",
        prompt: "Create a special loyalty reward offer for returning Nashoba Valley customers. Make them feel valued and appreciated for their continued support. Include an exclusive benefit.",
      },
      flash_sale: {
        title: "Flash Sale",
        prompt: "Create a time-limited flash sale promotion for Nashoba Valley Winery products or experiences. Emphasize urgency and scarcity. Must end within 24-48 hours.",
      },
    };

    const template = promoTemplates[type];
    if (!template) return res.status(400).json({ error: "Invalid promotion type" });

    const channelInstructions: Record<string, string> = {
      email: "Format as an email with subject line and body. Keep body under 200 words.",
      sms: "Format as an SMS message. Keep under 160 characters. Include a short link placeholder [LINK].",
      social: "Format as a social media post. Include relevant hashtags. Keep engaging and shareable.",
      on_site: "Format as an on-site banner or popup message. Keep concise and action-oriented.",
    };

    const prompt = `${template.prompt}

${customContext ? `Additional context: ${customContext}` : ""}
${targetSegment ? `Target audience: ${targetSegment} customers` : ""}
Channel: ${channel || "multi-channel"}
${channelInstructions[channel] || "Provide content suitable for multiple channels."}

Generate the promotional content. Be creative, on-brand for a New England winery, and include a clear call-to-action. Return ONLY the promotional text, no additional explanation.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.85,
    });

    const generatedContent = completion.choices[0]?.message?.content || "Content generation failed.";

    const [promo] = await db.insert(ccQuickPromotions).values({
      type,
      title: template.title,
      generatedContent,
      channel: channel || "multi",
      targetSegment: targetSegment || null,
      status: "generated",
    }).returning();

    res.json(promo);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/api/growth-studio/quick-promos/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(ccQuickPromotions).where(eq(ccQuickPromotions.id, id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
