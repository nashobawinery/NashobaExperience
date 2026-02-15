import { Router } from "express";
import { db } from "../db";
import { sql, eq, desc, and, isNotNull, ne } from "drizzle-orm";
import { targetingCampaigns, targetingListMembers, offerPerformance } from "@shared/schema";
import { isAuthenticated } from "../replitAuth";
import OpenAI from "openai";

const router = Router();

const OFFER_TYPES = [
  { type: "percentage_discount_10", label: "10% Off Next Visit", estimatedCost: 8 },
  { type: "percentage_discount_15", label: "15% Off Next Visit", estimatedCost: 12 },
  { type: "percentage_discount_20", label: "20% Off Next Visit", estimatedCost: 16 },
  { type: "free_tasting", label: "Complimentary Tasting Experience", estimatedCost: 15 },
  { type: "bogo", label: "Buy One Get One Free", estimatedCost: 20 },
  { type: "loyalty_bonus", label: "Double Loyalty Points", estimatedCost: 5 },
  { type: "seasonal_special", label: "Seasonal Special Offer", estimatedCost: 10 },
  { type: "free_appetizer", label: "Free Appetizer with Purchase", estimatedCost: 8 },
];

const SEGMENT_CONVERSION_RATES: Record<string, number> = {
  at_risk: 0.25,
  lapsed: 0.12,
  dormant: 0.06,
  lost: 0.02,
  active: 0.40,
};

const OFFER_CONVERSION_MULTIPLIERS: Record<string, number> = {
  percentage_discount_10: 1.0,
  percentage_discount_15: 1.3,
  percentage_discount_20: 1.6,
  free_tasting: 1.4,
  bogo: 1.5,
  loyalty_bonus: 0.8,
  seasonal_special: 1.2,
  free_appetizer: 1.1,
};

function calculateReactivationScore(
  recencyScore: number,
  frequencyScore: number,
  monetaryScore: number,
  daysSinceLastVisit: number | null,
  totalVisits: number
): number {
  const recencyWeight = 0.45;
  const frequencyWeight = 0.30;
  const monetaryWeight = 0.25;

  let rawScore = (recencyScore * recencyWeight + frequencyScore * frequencyWeight + monetaryScore * monetaryWeight) * 20;

  if (totalVisits >= 5) rawScore *= 1.15;
  if (totalVisits >= 10) rawScore *= 1.10;

  if (daysSinceLastVisit !== null) {
    if (daysSinceLastVisit <= 60) rawScore *= 1.20;
    else if (daysSinceLastVisit <= 120) rawScore *= 1.05;
    else if (daysSinceLastVisit > 365) rawScore *= 0.70;
  }

  return Math.min(Math.round(rawScore * 100) / 100, 100);
}

function selectBestOffer(segment: string, avgSpend: number, totalVisits: number): { offerType: string; detail: string } {
  if (segment === "at_risk") {
    if (avgSpend > 80) return { offerType: "free_tasting", detail: "Complimentary premium tasting - high-value customer showing signs of churn" };
    return { offerType: "percentage_discount_10", detail: "10% off to re-engage before they lapse" };
  }
  if (segment === "lapsed") {
    if (avgSpend > 60) return { offerType: "percentage_discount_15", detail: "15% off comeback offer for above-average spenders" };
    if (totalVisits >= 3) return { offerType: "free_appetizer", detail: "Free appetizer to reward past loyalty and encourage return" };
    return { offerType: "seasonal_special", detail: "Seasonal invitation to rediscover what's new" };
  }
  if (segment === "dormant") {
    if (avgSpend > 100) return { offerType: "percentage_discount_20", detail: "20% off win-back offer for high-value dormant customer" };
    if (totalVisits >= 4) return { offerType: "bogo", detail: "BOGO offer to bring them back with a friend" };
    return { offerType: "percentage_discount_15", detail: "15% off re-engagement for dormant customer" };
  }
  if (segment === "lost") {
    if (avgSpend > 80) return { offerType: "bogo", detail: "BOGO - strong incentive to win back lost high-spender" };
    return { offerType: "percentage_discount_20", detail: "20% off major win-back attempt for lost customer" };
  }
  return { offerType: "loyalty_bonus", detail: "Double points to reinforce active behavior" };
}

router.get("/campaigns", isAuthenticated, async (_req, res) => {
  try {
    const campaigns = await db.select().from(targetingCampaigns).orderBy(desc(targetingCampaigns.createdAt)).limit(20);
    res.json(campaigns);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/campaigns/:id", isAuthenticated, async (req, res) => {
  try {
    const [campaign] = await db.select().from(targetingCampaigns).where(eq(targetingCampaigns.id, parseInt(req.params.id)));
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });
    res.json(campaign);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/campaigns/:id/members", isAuthenticated, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const sortBy = (req.query.sortBy as string) || "reactivation_score";
    const useExpectedValue = sortBy === "expected_value";

    const members = useExpectedValue
      ? await db.execute(sql`
          SELECT m.*, 
            g.first_name, g.last_name, g.email1, g.phone1, 
            g.total_visits, g.average_spend, g.lifetime_spend, g.days_since_last_visit,
            g.last_visit_date, g.last_dining_behavior, g.reactivation_segment
          FROM targeting_list_members m
          JOIN toast_guests g ON m.toast_guest_id = g.id
          WHERE m.campaign_id = ${campaignId}
          ORDER BY CAST(m.expected_value AS FLOAT) DESC
          LIMIT ${limit} OFFSET ${offset}
        `)
      : await db.execute(sql`
          SELECT m.*, 
            g.first_name, g.last_name, g.email1, g.phone1, 
            g.total_visits, g.average_spend, g.lifetime_spend, g.days_since_last_visit,
            g.last_visit_date, g.last_dining_behavior, g.reactivation_segment
          FROM targeting_list_members m
          JOIN toast_guests g ON m.toast_guest_id = g.id
          WHERE m.campaign_id = ${campaignId}
          ORDER BY CAST(m.reactivation_score AS FLOAT) DESC
          LIMIT ${limit} OFFSET ${offset}
        `);

    const [countResult] = (await db.execute(sql`
      SELECT COUNT(*) as total FROM targeting_list_members WHERE campaign_id = ${campaignId}
    `)).rows as any[];

    const [statsResult] = (await db.execute(sql`
      SELECT 
        COUNT(CASE WHEN status = 'sent' OR status = 'opened' OR status = 'clicked' OR status = 'converted' THEN 1 END) as total_sent,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as total_converted,
        SUM(CASE WHEN status = 'converted' THEN CAST(conversion_revenue AS FLOAT) ELSE 0 END) as total_revenue,
        AVG(CAST(reactivation_score AS FLOAT)) as avg_score,
        AVG(CAST(expected_value AS FLOAT)) as avg_expected_value
      FROM targeting_list_members WHERE campaign_id = ${campaignId}
    `)).rows as any[];

    res.json({
      members: members.rows,
      total: parseInt(countResult?.total || "0"),
      stats: statsResult || {},
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/generate", isAuthenticated, async (req, res) => {
  try {
    const VALID_SEGMENTS = ["active", "at_risk", "lapsed", "dormant", "lost"];
    const VALID_CHANNELS = ["email", "sms"];

    const { 
      name = `Weekly Targets - ${new Date().toLocaleDateString()}`,
      targetCount: rawTargetCount = 500, 
      segments: rawSegments = ["at_risk", "lapsed", "dormant"], 
      channel: rawChannel = "email",
      weekStart = new Date().toISOString(),
    } = req.body;

    const targetCount = Math.min(Math.max(parseInt(rawTargetCount) || 500, 10), 2000);
    const channel = VALID_CHANNELS.includes(rawChannel) ? rawChannel : "email";
    const segments = (Array.isArray(rawSegments) ? rawSegments : []).filter((s: string) => VALID_SEGMENTS.includes(s));
    if (segments.length === 0) {
      return res.status(400).json({ error: "At least one valid segment required" });
    }

    const segmentSqlParts = segments.map((s: string) => sql`${s}`);
    const segmentList = sql.join(segmentSqlParts, sql`, `);

    const existingMembers = await db.execute(sql`
      SELECT DISTINCT toast_guest_id FROM targeting_list_members 
      WHERE campaign_id IN (
        SELECT id FROM targeting_campaigns WHERE status IN ('active', 'sent') 
        AND created_at > NOW() - INTERVAL '30 days'
      )
    `);
    const excludeIds = existingMembers.rows.map((r: any) => r.toast_guest_id);

    const contactFilter = channel === "email"
      ? sql`AND g.email1 IS NOT NULL AND g.email1 != ''`
      : sql`AND g.phone1 IS NOT NULL AND g.phone1 != ''`;

    const excludeFilter = excludeIds.length > 0
      ? sql`AND g.id NOT IN (${sql.join(excludeIds.map(id => sql`${id}`), sql`, `)})`
      : sql``;

    const fetchLimit = targetCount * 2;

    const candidates = await db.execute(sql`
      SELECT 
        g.id,
        g.reactivation_segment as segment,
        g.total_visits,
        CAST(COALESCE(g.average_spend, '0') AS FLOAT) as avg_spend,
        CAST(COALESCE(g.lifetime_spend, '0') AS FLOAT) as lifetime_spend,
        g.days_since_last_visit,
        COALESCE(r.recency_score, 
          CASE 
            WHEN g.days_since_last_visit IS NULL THEN 1
            WHEN g.days_since_last_visit <= 30 THEN 5
            WHEN g.days_since_last_visit <= 60 THEN 4
            WHEN g.days_since_last_visit <= 120 THEN 3
            WHEN g.days_since_last_visit <= 365 THEN 2
            ELSE 1
          END
        ) as recency_score,
        COALESCE(r.frequency_score,
          CASE
            WHEN COALESCE(g.total_visits, 0) >= 10 THEN 5
            WHEN COALESCE(g.total_visits, 0) >= 6 THEN 4
            WHEN COALESCE(g.total_visits, 0) >= 3 THEN 3
            WHEN COALESCE(g.total_visits, 0) >= 2 THEN 2
            ELSE 1
          END
        ) as frequency_score,
        COALESCE(r.monetary_score,
          CASE
            WHEN CAST(COALESCE(g.lifetime_spend, '0') AS FLOAT) >= 500 THEN 5
            WHEN CAST(COALESCE(g.lifetime_spend, '0') AS FLOAT) >= 200 THEN 4
            WHEN CAST(COALESCE(g.lifetime_spend, '0') AS FLOAT) >= 100 THEN 3
            WHEN CAST(COALESCE(g.lifetime_spend, '0') AS FLOAT) >= 50 THEN 2
            ELSE 1
          END
        ) as monetary_score
      FROM toast_guests g
      LEFT JOIN boomerang_rfm_scores r ON r.toast_guest_id = g.id
      WHERE g.reactivation_segment IN (${segmentList})
        ${contactFilter}
        ${excludeFilter}
        AND COALESCE(g.total_visits, 0) > 0
      ORDER BY 
        CAST(COALESCE(g.lifetime_spend, '0') AS FLOAT) * 
        CASE g.reactivation_segment
          WHEN 'at_risk' THEN 5
          WHEN 'lapsed' THEN 3
          WHEN 'dormant' THEN 1.5
          WHEN 'lost' THEN 0.5
          ELSE 1
        END DESC
      LIMIT ${fetchLimit}
    `);

    const scoredCandidates = candidates.rows.map((c: any) => {
      const recency = parseInt(c.recency_score) || 1;
      const frequency = parseInt(c.frequency_score) || 1;
      const monetary = parseInt(c.monetary_score) || 1;
      const reactivationScore = calculateReactivationScore(
        recency, frequency, monetary,
        c.days_since_last_visit, c.total_visits || 0
      );

      const baseConversion = SEGMENT_CONVERSION_RATES[c.segment] || 0.05;
      const offer = selectBestOffer(c.segment, c.avg_spend, c.total_visits || 0);
      const offerMultiplier = OFFER_CONVERSION_MULTIPLIERS[offer.offerType] || 1.0;
      const adjustedConversion = Math.min(baseConversion * offerMultiplier * (reactivationScore / 50), 1.0);
      const expectedValue = adjustedConversion * (c.avg_spend || 50);

      return {
        toastGuestId: c.id,
        reactivationScore: reactivationScore.toFixed(2),
        expectedValue: expectedValue.toFixed(2),
        recencyScore: recency,
        frequencyScore: frequency,
        monetaryScore: monetary,
        segment: c.segment,
        assignedOfferType: offer.offerType,
        assignedOfferDetail: offer.detail,
        status: "pending",
      };
    });

    scoredCandidates.sort((a, b) => parseFloat(b.expectedValue) - parseFloat(a.expectedValue));
    const topTargets = scoredCandidates.slice(0, targetCount);

    const totalProjectedRevenue = topTargets.reduce((sum, t) => sum + parseFloat(t.expectedValue), 0);
    const avgConversionRate = topTargets.length > 0
      ? topTargets.reduce((sum, t) => {
          const baseRate = SEGMENT_CONVERSION_RATES[t.segment || ""] || 0.05;
          const mult = OFFER_CONVERSION_MULTIPLIERS[t.assignedOfferType] || 1.0;
          return sum + Math.min(baseRate * mult * (parseFloat(t.reactivationScore) / 50), 1.0);
        }, 0) / topTargets.length
      : 0;
    const totalCost = topTargets.reduce((sum, t) => {
      const offerInfo = OFFER_TYPES.find(o => o.type === t.assignedOfferType);
      return sum + (offerInfo?.estimatedCost || 10);
    }, 0);
    const projectedRoi = totalCost > 0 ? ((totalProjectedRevenue - totalCost) / totalCost * 100) : 0;

    const [campaign] = await db.insert(targetingCampaigns).values({
      name,
      weekStart: new Date(weekStart),
      targetCount: topTargets.length,
      segments,
      offerTypes: [...new Set(topTargets.map(t => t.assignedOfferType))],
      channel,
      projectedConversionRate: avgConversionRate.toFixed(2),
      projectedRevenue: totalProjectedRevenue.toFixed(2),
      projectedRoi: projectedRoi.toFixed(2),
    }).returning();

    if (topTargets.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < topTargets.length; i += batchSize) {
        const batch = topTargets.slice(i, i + batchSize);
        await db.insert(targetingListMembers).values(
          batch.map(t => ({
            ...t,
            campaignId: campaign.id,
          }))
        );
      }
    }

    const segmentBreakdown = topTargets.reduce((acc, t) => {
      acc[t.segment || "unknown"] = (acc[t.segment || "unknown"] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const offerBreakdown = topTargets.reduce((acc, t) => {
      acc[t.assignedOfferType] = (acc[t.assignedOfferType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      campaign,
      summary: {
        totalTargets: topTargets.length,
        projectedConversionRate: (avgConversionRate * 100).toFixed(1) + "%",
        projectedRevenue: totalProjectedRevenue.toFixed(2),
        estimatedCost: totalCost.toFixed(2),
        projectedRoi: projectedRoi.toFixed(1) + "%",
        segmentBreakdown,
        offerBreakdown,
      },
    });
  } catch (error: any) {
    console.error("[Targeting] Generate error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/campaigns/:id/ai-insights", isAuthenticated, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const [campaign] = await db.select().from(targetingCampaigns).where(eq(targetingCampaigns.id, campaignId));
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    const memberStats = await db.execute(sql`
      SELECT 
        m.segment,
        m.assigned_offer_type,
        COUNT(*) as count,
        AVG(CAST(m.reactivation_score AS FLOAT)) as avg_score,
        AVG(CAST(m.expected_value AS FLOAT)) as avg_ev,
        COUNT(CASE WHEN m.status = 'converted' THEN 1 END) as conversions,
        SUM(CASE WHEN m.status = 'converted' THEN CAST(m.conversion_revenue AS FLOAT) ELSE 0 END) as revenue
      FROM targeting_list_members m
      WHERE m.campaign_id = ${campaignId}
      GROUP BY m.segment, m.assigned_offer_type
    `);

    const historicalPerf = await db.execute(sql`
      SELECT offer_type, segment, 
        CAST(avg_conversion_rate AS FLOAT) as conv_rate, 
        CAST(avg_order_value AS FLOAT) as aov
      FROM offer_performance
      ORDER BY CAST(avg_conversion_rate AS FLOAT) DESC
    `);

    const openai = new OpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a customer reactivation strategist for Nashoba Valley Winery, a premium winery and restaurant in Bolton, MA. Analyze targeting campaign data and provide actionable insights. Be specific with numbers and percentages. Format your response with clear headers and bullet points.`,
        },
        {
          role: "user",
          content: `Analyze this weekly targeting campaign and provide insights:

Campaign: ${campaign.name}
Target Count: ${campaign.targetCount}
Segments Targeted: ${JSON.stringify(campaign.segments)}
Channel: ${campaign.channel}
Projected Conversion Rate: ${campaign.projectedConversionRate}%
Projected Revenue: $${campaign.projectedRevenue}
Projected ROI: ${campaign.projectedRoi}%

Segment & Offer Breakdown:
${JSON.stringify(memberStats.rows, null, 2)}

Historical Offer Performance:
${JSON.stringify(historicalPerf.rows, null, 2)}

Provide:
1. Strategy Assessment - Is this the right mix of segments and offers?
2. Top 3 Quick Wins - Specific actions to maximize conversion
3. Offer Optimization - Which offers should be increased/decreased based on data
4. Timing Recommendations - Best days/times to send based on dining patterns
5. Expected Outcomes - Realistic conversion and revenue projections
6. Risk Factors - What could reduce performance`,
        },
      ],
      max_tokens: 1000,
    });

    const insights = completion.choices[0]?.message?.content || "Unable to generate insights.";

    await db.update(targetingCampaigns)
      .set({ aiInsights: insights, updatedAt: new Date() })
      .where(eq(targetingCampaigns.id, campaignId));

    res.json({ insights });
  } catch (error: any) {
    console.error("[Targeting] AI insights error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.patch("/campaigns/:id/status", isAuthenticated, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const { status } = req.body;
    if (!["draft", "active", "sent", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const [updated] = await db.update(targetingCampaigns)
      .set({ status, updatedAt: new Date() })
      .where(eq(targetingCampaigns.id, campaignId))
      .returning();

    if (status === "sent") {
      await db.execute(sql`
        UPDATE targeting_list_members 
        SET status = 'sent', sent_at = NOW()
        WHERE campaign_id = ${campaignId} AND status = 'pending'
      `);
      await db.update(targetingCampaigns)
        .set({ totalSent: updated.targetCount })
        .where(eq(targetingCampaigns.id, campaignId));
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/members/:id/convert", isAuthenticated, async (req, res) => {
  try {
    const memberId = parseInt(req.params.id);
    const { revenue } = req.body;

    await db.execute(sql`
      UPDATE targeting_list_members 
      SET status = 'converted', converted_at = NOW(), conversion_revenue = ${revenue || 0}
      WHERE id = ${memberId}
    `);

    const [member] = (await db.execute(sql`
      SELECT campaign_id, segment, assigned_offer_type FROM targeting_list_members WHERE id = ${memberId}
    `)).rows as any[];

    if (member) {
      await db.execute(sql`
        UPDATE targeting_campaigns 
        SET actual_conversions = actual_conversions + 1,
            actual_revenue = CAST(actual_revenue AS NUMERIC) + ${revenue || 0},
            updated_at = NOW()
        WHERE id = ${member.campaign_id}
      `);

      await db.execute(sql`
        INSERT INTO offer_performance (offer_type, segment, total_sent, total_converted, total_revenue, avg_conversion_rate, avg_order_value)
        VALUES (${member.assigned_offer_type}, ${member.segment}, 0, 1, ${revenue || 0}, 0, ${revenue || 0})
        ON CONFLICT (offer_type, segment)
        DO UPDATE SET 
          total_converted = offer_performance.total_converted + 1,
          total_revenue = CAST(offer_performance.total_revenue AS NUMERIC) + ${revenue || 0},
          avg_conversion_rate = CASE 
            WHEN offer_performance.total_sent > 0 
            THEN CAST((offer_performance.total_converted + 1) AS NUMERIC) / offer_performance.total_sent * 100
            ELSE 0 
          END,
          avg_order_value = CAST((CAST(offer_performance.total_revenue AS NUMERIC) + ${revenue || 0}) AS NUMERIC) / (offer_performance.total_converted + 1),
          updated_at = NOW()
      `);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/roi-summary", isAuthenticated, async (_req, res) => {
  try {
    const campaigns = await db.execute(sql`
      SELECT 
        COUNT(*) as total_campaigns,
        SUM(target_count) as total_targeted,
        SUM(total_sent) as total_sent,
        SUM(actual_conversions) as total_conversions,
        SUM(CAST(actual_revenue AS FLOAT)) as total_revenue,
        AVG(CAST(projected_conversion_rate AS FLOAT)) as avg_projected_conv,
        CASE WHEN SUM(total_sent) > 0 
          THEN CAST(SUM(actual_conversions) AS FLOAT) / SUM(total_sent) * 100 
          ELSE 0 
        END as actual_conv_rate,
        AVG(CAST(projected_roi AS FLOAT)) as avg_projected_roi
      FROM targeting_campaigns
      WHERE status != 'cancelled'
    `);

    const offerStats = await db.execute(sql`
      SELECT * FROM offer_performance ORDER BY CAST(avg_conversion_rate AS FLOAT) DESC
    `);

    const segmentPerf = await db.execute(sql`
      SELECT 
        segment,
        COUNT(*) as total_targeted,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as conversions,
        SUM(CASE WHEN status = 'converted' THEN CAST(conversion_revenue AS FLOAT) ELSE 0 END) as revenue,
        AVG(CAST(expected_value AS FLOAT)) as avg_expected_value,
        CASE WHEN COUNT(*) > 0 
          THEN CAST(COUNT(CASE WHEN status = 'converted' THEN 1 END) AS FLOAT) / COUNT(*) * 100 
          ELSE 0 
        END as conversion_rate
      FROM targeting_list_members
      GROUP BY segment
      ORDER BY conversion_rate DESC
    `);

    res.json({
      overview: campaigns.rows[0] || {},
      offerPerformance: offerStats.rows,
      segmentPerformance: segmentPerf.rows,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/offer-types", isAuthenticated, async (_req, res) => {
  res.json(OFFER_TYPES);
});

router.delete("/campaigns/:id", isAuthenticated, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    await db.execute(sql`DELETE FROM targeting_list_members WHERE campaign_id = ${campaignId}`);
    await db.delete(targetingCampaigns).where(eq(targetingCampaigns.id, campaignId));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
