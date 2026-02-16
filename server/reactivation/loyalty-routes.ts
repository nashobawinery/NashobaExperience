import { Router } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import {
  boomerangRfmScores, boomerangLoyaltyTiers, boomerangLoyaltyAccounts,
  boomerangPointsLedger, boomerangCampaigns, boomerangOffers,
  boomerangRedemptions, boomerangAutomationRules, boomerangAutomationExecutions,
  boomerangReferralCodes, boomerangReferrals,
} from "@shared/schema";

const router = Router();

// ==========================================
// RFM SCORING
// ==========================================

router.post("/rfm/compute", async (_req, res) => {
  try {
    await db.execute(sql`DELETE FROM boomerang_rfm_scores`);

    await db.execute(sql`
      INSERT INTO boomerang_rfm_scores (toast_guest_id, recency_score, frequency_score, monetary_score, rfm_total, rfm_segment)
      SELECT 
        id,
        CASE 
          WHEN days_since_last_visit IS NULL THEN 1
          WHEN days_since_last_visit <= 30 THEN 5
          WHEN days_since_last_visit <= 60 THEN 4
          WHEN days_since_last_visit <= 120 THEN 3
          WHEN days_since_last_visit <= 365 THEN 2
          ELSE 1
        END as recency_score,
        CASE 
          WHEN COALESCE(total_visits, 0) = 0 THEN 1
          WHEN total_visits = 1 THEN 2
          WHEN total_visits <= 5 THEN 3
          WHEN total_visits <= 15 THEN 4
          ELSE 5
        END as frequency_score,
        CASE 
          WHEN CAST(COALESCE(lifetime_spend, '0') AS FLOAT) = 0 THEN 1
          WHEN CAST(lifetime_spend AS FLOAT) < 50 THEN 2
          WHEN CAST(lifetime_spend AS FLOAT) < 200 THEN 3
          WHEN CAST(lifetime_spend AS FLOAT) < 500 THEN 4
          ELSE 5
        END as monetary_score,
        (CASE WHEN days_since_last_visit IS NULL THEN 1 WHEN days_since_last_visit <= 30 THEN 5 WHEN days_since_last_visit <= 60 THEN 4 WHEN days_since_last_visit <= 120 THEN 3 WHEN days_since_last_visit <= 365 THEN 2 ELSE 1 END) +
        (CASE WHEN COALESCE(total_visits, 0) = 0 THEN 1 WHEN total_visits = 1 THEN 2 WHEN total_visits <= 5 THEN 3 WHEN total_visits <= 15 THEN 4 ELSE 5 END) +
        (CASE WHEN CAST(COALESCE(lifetime_spend, '0') AS FLOAT) = 0 THEN 1 WHEN CAST(lifetime_spend AS FLOAT) < 50 THEN 2 WHEN CAST(lifetime_spend AS FLOAT) < 200 THEN 3 WHEN CAST(lifetime_spend AS FLOAT) < 500 THEN 4 ELSE 5 END) as rfm_total,
        CASE 
          WHEN (CASE WHEN days_since_last_visit IS NULL THEN 1 WHEN days_since_last_visit <= 30 THEN 5 WHEN days_since_last_visit <= 60 THEN 4 WHEN days_since_last_visit <= 120 THEN 3 WHEN days_since_last_visit <= 365 THEN 2 ELSE 1 END) >= 4
            AND (CASE WHEN COALESCE(total_visits, 0) = 0 THEN 1 WHEN total_visits = 1 THEN 2 WHEN total_visits <= 5 THEN 3 WHEN total_visits <= 15 THEN 4 ELSE 5 END) >= 4
            AND (CASE WHEN CAST(COALESCE(lifetime_spend, '0') AS FLOAT) = 0 THEN 1 WHEN CAST(lifetime_spend AS FLOAT) < 50 THEN 2 WHEN CAST(lifetime_spend AS FLOAT) < 200 THEN 3 WHEN CAST(lifetime_spend AS FLOAT) < 500 THEN 4 ELSE 5 END) >= 4 THEN 'champions'
          WHEN (CASE WHEN days_since_last_visit IS NULL THEN 1 WHEN days_since_last_visit <= 30 THEN 5 WHEN days_since_last_visit <= 60 THEN 4 WHEN days_since_last_visit <= 120 THEN 3 WHEN days_since_last_visit <= 365 THEN 2 ELSE 1 END) >= 4
            AND (CASE WHEN COALESCE(total_visits, 0) = 0 THEN 1 WHEN total_visits = 1 THEN 2 WHEN total_visits <= 5 THEN 3 WHEN total_visits <= 15 THEN 4 ELSE 5 END) >= 3 THEN 'loyal_customers'
          WHEN (CASE WHEN days_since_last_visit IS NULL THEN 1 WHEN days_since_last_visit <= 30 THEN 5 WHEN days_since_last_visit <= 60 THEN 4 WHEN days_since_last_visit <= 120 THEN 3 WHEN days_since_last_visit <= 365 THEN 2 ELSE 1 END) >= 3
            AND (CASE WHEN CAST(COALESCE(lifetime_spend, '0') AS FLOAT) = 0 THEN 1 WHEN CAST(lifetime_spend AS FLOAT) < 50 THEN 2 WHEN CAST(lifetime_spend AS FLOAT) < 200 THEN 3 WHEN CAST(lifetime_spend AS FLOAT) < 500 THEN 4 ELSE 5 END) >= 4 THEN 'big_spenders'
          WHEN (CASE WHEN days_since_last_visit IS NULL THEN 1 WHEN days_since_last_visit <= 30 THEN 5 WHEN days_since_last_visit <= 60 THEN 4 WHEN days_since_last_visit <= 120 THEN 3 WHEN days_since_last_visit <= 365 THEN 2 ELSE 1 END) >= 4
            AND (CASE WHEN COALESCE(total_visits, 0) = 0 THEN 1 WHEN total_visits = 1 THEN 2 WHEN total_visits <= 5 THEN 3 WHEN total_visits <= 15 THEN 4 ELSE 5 END) <= 2 THEN 'new_customers'
          WHEN (CASE WHEN days_since_last_visit IS NULL THEN 1 WHEN days_since_last_visit <= 30 THEN 5 WHEN days_since_last_visit <= 60 THEN 4 WHEN days_since_last_visit <= 120 THEN 3 WHEN days_since_last_visit <= 365 THEN 2 ELSE 1 END) <= 2
            AND (CASE WHEN COALESCE(total_visits, 0) = 0 THEN 1 WHEN total_visits = 1 THEN 2 WHEN total_visits <= 5 THEN 3 WHEN total_visits <= 15 THEN 4 ELSE 5 END) >= 3
            AND (CASE WHEN CAST(COALESCE(lifetime_spend, '0') AS FLOAT) = 0 THEN 1 WHEN CAST(lifetime_spend AS FLOAT) < 50 THEN 2 WHEN CAST(lifetime_spend AS FLOAT) < 200 THEN 3 WHEN CAST(lifetime_spend AS FLOAT) < 500 THEN 4 ELSE 5 END) >= 3 THEN 'at_risk_high_value'
          WHEN (CASE WHEN days_since_last_visit IS NULL THEN 1 WHEN days_since_last_visit <= 30 THEN 5 WHEN days_since_last_visit <= 60 THEN 4 WHEN days_since_last_visit <= 120 THEN 3 WHEN days_since_last_visit <= 365 THEN 2 ELSE 1 END) <= 2
            AND (CASE WHEN COALESCE(total_visits, 0) = 0 THEN 1 WHEN total_visits = 1 THEN 2 WHEN total_visits <= 5 THEN 3 WHEN total_visits <= 15 THEN 4 ELSE 5 END) >= 3 THEN 'needs_attention'
          WHEN (CASE WHEN days_since_last_visit IS NULL THEN 1 WHEN days_since_last_visit <= 30 THEN 5 WHEN days_since_last_visit <= 60 THEN 4 WHEN days_since_last_visit <= 120 THEN 3 WHEN days_since_last_visit <= 365 THEN 2 ELSE 1 END) <= 2 THEN 'hibernating'
          ELSE 'potential'
        END as rfm_segment
      FROM toast_guests
      WHERE merged_into_id IS NULL
    `);

    const summary = await db.execute(sql`
      SELECT rfm_segment, COUNT(*) as count, 
        ROUND(AVG(CAST(rfm_total AS NUMERIC)), 1) as avg_score
      FROM boomerang_rfm_scores 
      GROUP BY rfm_segment 
      ORDER BY avg_score DESC
    `);

    res.json({
      message: "RFM scores computed successfully",
      totalScored: summary.rows.reduce((sum: number, r: any) => sum + Number(r.count), 0),
      segments: summary.rows.map((r: any) => ({
        segment: r.rfm_segment,
        count: Number(r.count),
        avgScore: Number(r.avg_score),
      })),
    });
  } catch (error: any) {
    console.error("[Boomerang] Error computing RFM:", error);
    res.status(500).json({ error: "Failed to compute RFM scores" });
  }
});

router.get("/rfm/summary", async (_req, res) => {
  try {
    const totalScored = await db.execute(sql`SELECT COUNT(*) as total FROM boomerang_rfm_scores`);
    if (Number((totalScored.rows[0] as any).total) === 0) {
      return res.json({ computed: false, segments: [], totalScored: 0 });
    }

    const segments = await db.execute(sql`
      SELECT 
        r.rfm_segment,
        COUNT(*) as customer_count,
        ROUND(AVG(CAST(r.rfm_total AS NUMERIC)), 1) as avg_rfm_score,
        ROUND(AVG(CAST(r.recency_score AS NUMERIC)), 1) as avg_recency,
        ROUND(AVG(CAST(r.frequency_score AS NUMERIC)), 1) as avg_frequency,
        ROUND(AVG(CAST(r.monetary_score AS NUMERIC)), 1) as avg_monetary,
        ROUND(AVG(CAST(COALESCE(g.lifetime_spend, '0') AS NUMERIC)), 2) as avg_lifetime_spend,
        ROUND(AVG(CAST(COALESCE(g.total_visits, 0) AS NUMERIC)), 1) as avg_visits,
        COUNT(CASE WHEN g.email1 IS NOT NULL AND g.email1 != '' THEN 1 END) as with_email
      FROM boomerang_rfm_scores r
      JOIN toast_guests g ON g.id = r.toast_guest_id
      GROUP BY r.rfm_segment
      ORDER BY avg_rfm_score DESC
    `);

    const distribution = await db.execute(sql`
      SELECT rfm_total as score, COUNT(*) as count 
      FROM boomerang_rfm_scores 
      GROUP BY rfm_total 
      ORDER BY rfm_total
    `);

    res.json({
      computed: true,
      totalScored: Number((totalScored.rows[0] as any).total),
      segments: segments.rows.map((r: any) => ({
        segment: r.rfm_segment,
        customerCount: Number(r.customer_count),
        avgRfmScore: Number(r.avg_rfm_score),
        avgRecency: Number(r.avg_recency),
        avgFrequency: Number(r.avg_frequency),
        avgMonetary: Number(r.avg_monetary),
        avgLifetimeSpend: Number(r.avg_lifetime_spend),
        avgVisits: Number(r.avg_visits),
        withEmail: Number(r.with_email),
      })),
      distribution: distribution.rows.map((r: any) => ({
        score: Number(r.score),
        count: Number(r.count),
      })),
    });
  } catch (error: any) {
    console.error("[Boomerang] Error fetching RFM summary:", error);
    res.status(500).json({ error: "Failed to fetch RFM summary" });
  }
});

router.get("/rfm/segment/:segment", async (req, res) => {
  try {
    const { segment } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || "";

    const searchCondition = search
      ? sql`AND (LOWER(COALESCE(g.first_name, '') || ' ' || COALESCE(g.last_name, '')) LIKE LOWER(${`%${search}%`}) OR LOWER(COALESCE(g.email1, '')) LIKE LOWER(${`%${search}%`}))`
      : sql``;

    const countResult = await db.execute(sql`
      SELECT COUNT(*) as total
      FROM boomerang_rfm_scores r
      JOIN toast_guests g ON g.id = r.toast_guest_id
      WHERE r.rfm_segment = ${segment}
      ${searchCondition}
    `);
    const total = Number((countResult.rows[0] as any).total);

    const customers = await db.execute(sql`
      SELECT 
        g.id, g.first_name, g.last_name, g.email1, g.phone1,
        g.lifetime_spend, g.total_visits, g.last_visit_date,
        g.days_since_last_visit, g.reactivation_segment,
        r.recency_score, r.frequency_score, r.monetary_score, r.rfm_total
      FROM boomerang_rfm_scores r
      JOIN toast_guests g ON g.id = r.toast_guest_id
      WHERE r.rfm_segment = ${segment}
      ${searchCondition}
      ORDER BY CAST(COALESCE(g.lifetime_spend, '0') AS FLOAT) DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    res.json({
      customers: customers.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error("[Boomerang] Error fetching RFM segment customers:", error);
    res.status(500).json({ error: "Failed to fetch segment customers" });
  }
});

// ==========================================
// LOYALTY TIERS
// ==========================================

router.get("/loyalty/tiers", async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT t.*, 
        (SELECT COUNT(*) FROM boomerang_loyalty_accounts a WHERE a.tier_id = t.id) as member_count
      FROM boomerang_loyalty_tiers t
      WHERE t.is_active = true
      ORDER BY t.sort_order
    `);
    res.json({ tiers: result.rows });
  } catch (error: any) {
    console.error("[Boomerang] Error fetching tiers:", error);
    res.status(500).json({ error: "Failed to fetch tiers" });
  }
});

router.post("/loyalty/tiers", async (req, res) => {
  try {
    const { name, minPoints, pointsMultiplier, benefits, color, sortOrder } = req.body;
    const result = await db.execute(sql`
      INSERT INTO boomerang_loyalty_tiers (name, min_points, points_multiplier, benefits, color, sort_order)
      VALUES (${name}, ${minPoints || 0}, ${pointsMultiplier || "1.00"}, ${JSON.stringify(benefits || [])}, ${color || "#94a3b8"}, ${sortOrder || 0})
      RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("[Boomerang] Error creating tier:", error);
    res.status(500).json({ error: "Failed to create tier" });
  }
});

router.put("/loyalty/tiers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid tier ID" });
    const { name, minPoints, pointsMultiplier, benefits, color, sortOrder, isActive } = req.body;
    const result = await db.execute(sql`
      UPDATE boomerang_loyalty_tiers
      SET name = ${name}, min_points = ${minPoints}, points_multiplier = ${pointsMultiplier},
        benefits = ${JSON.stringify(benefits || [])}, color = ${color}, sort_order = ${sortOrder},
        is_active = ${isActive ?? true}
      WHERE id = ${id}
      RETURNING *
    `);
    if (result.rows.length === 0) return res.status(404).json({ error: "Tier not found" });
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("[Boomerang] Error updating tier:", error);
    res.status(500).json({ error: "Failed to update tier" });
  }
});

// ==========================================
// LOYALTY ACCOUNTS & STATS
// ==========================================

router.get("/loyalty/stats", async (_req, res) => {
  try {
    const totalAccounts = await db.execute(sql`SELECT COUNT(*) as total FROM boomerang_loyalty_accounts`);
    const tierBreakdown = await db.execute(sql`
      SELECT t.name, t.color, COUNT(a.id) as member_count, 
        COALESCE(SUM(a.points_balance), 0) as total_points,
        COALESCE(AVG(a.lifetime_points), 0) as avg_lifetime_points
      FROM boomerang_loyalty_tiers t
      LEFT JOIN boomerang_loyalty_accounts a ON a.tier_id = t.id
      WHERE t.is_active = true
      GROUP BY t.id, t.name, t.color, t.sort_order
      ORDER BY t.sort_order
    `);
    const recentActivity = await db.execute(sql`
      SELECT COUNT(*) as count FROM boomerang_points_ledger 
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);
    const totalPoints = await db.execute(sql`
      SELECT COALESCE(SUM(points_balance), 0) as outstanding,
        COALESCE(SUM(lifetime_points), 0) as lifetime
      FROM boomerang_loyalty_accounts
    `);

    res.json({
      totalMembers: Number((totalAccounts.rows[0] as any).total),
      outstandingPoints: Number((totalPoints.rows[0] as any).outstanding),
      lifetimePointsIssued: Number((totalPoints.rows[0] as any).lifetime),
      recentTransactions: Number((recentActivity.rows[0] as any).count),
      tierBreakdown: tierBreakdown.rows.map((r: any) => ({
        tier: r.name,
        color: r.color,
        memberCount: Number(r.member_count),
        totalPoints: Number(r.total_points),
        avgLifetimePoints: Math.round(Number(r.avg_lifetime_points)),
      })),
    });
  } catch (error: any) {
    console.error("[Boomerang] Error fetching loyalty stats:", error);
    res.status(500).json({ error: "Failed to fetch loyalty stats" });
  }
});

router.get("/loyalty/accounts", async (req, res) => {
  try {
    const { page = "1", limit = "25", tierId, search } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 25));
    const offset = (pageNum - 1) * limitNum;

    const conditions: ReturnType<typeof sql>[] = [];
    if (tierId && tierId !== "all") conditions.push(sql`a.tier_id = ${parseInt(tierId as string, 10)}`);
    if (search) {
      const searchStr = `%${search}%`;
      conditions.push(sql`(g.first_name ILIKE ${searchStr} OR g.last_name ILIKE ${searchStr} OR g.email1 ILIKE ${searchStr})`);
    }
    const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

    const countRes = await db.execute(sql`
      SELECT COUNT(*) as total FROM boomerang_loyalty_accounts a
      JOIN toast_guests g ON g.id = a.toast_guest_id
      ${whereClause}
    `);

    const result = await db.execute(sql`
      SELECT a.*, g.first_name, g.last_name, g.email1, g.phone1, g.total_visits, g.lifetime_spend,
        t.name as tier_name, t.color as tier_color
      FROM boomerang_loyalty_accounts a
      JOIN toast_guests g ON g.id = a.toast_guest_id
      LEFT JOIN boomerang_loyalty_tiers t ON t.id = a.tier_id
      ${whereClause}
      ORDER BY a.lifetime_points DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `);

    res.json({
      accounts: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: Number((countRes.rows[0] as any).total),
        totalPages: Math.ceil(Number((countRes.rows[0] as any).total) / limitNum),
      },
    });
  } catch (error: any) {
    console.error("[Boomerang] Error fetching loyalty accounts:", error);
    res.status(500).json({ error: "Failed to fetch loyalty accounts" });
  }
});

router.post("/loyalty/enroll-batch", async (req, res) => {
  try {
    const { segment, rfmSegment, limit: batchLimit = 1000 } = req.body;
    const conditions: ReturnType<typeof sql>[] = [
      sql`g.id NOT IN (SELECT toast_guest_id FROM boomerang_loyalty_accounts)`,
      sql`g.email1 IS NOT NULL AND g.email1 != ''`,
      sql`g.merged_into_id IS NULL`,
    ];
    if (segment) conditions.push(sql`g.reactivation_segment = ${segment}`);
    if (rfmSegment) conditions.push(sql`r.rfm_segment = ${rfmSegment}`);

    const whereClause = sql`WHERE ${sql.join(conditions, sql` AND `)}`;

    const bronzeTier = await db.execute(sql`SELECT id FROM boomerang_loyalty_tiers WHERE sort_order = 1 LIMIT 1`);
    const tierId = bronzeTier.rows.length > 0 ? (bronzeTier.rows[0] as any).id : null;

    const result = await db.execute(sql`
      INSERT INTO boomerang_loyalty_accounts (toast_guest_id, tier_id, points_balance, lifetime_points)
      SELECT g.id, ${tierId}, 0, 0
      FROM toast_guests g
      LEFT JOIN boomerang_rfm_scores r ON r.toast_guest_id = g.id
      ${whereClause}
      LIMIT ${parseInt(String(batchLimit), 10)}
      RETURNING id
    `);

    res.json({ enrolled: result.rows.length, message: `${result.rows.length} customers enrolled in loyalty program` });
  } catch (error: any) {
    console.error("[Boomerang] Error enrolling batch:", error);
    res.status(500).json({ error: "Failed to enroll customers" });
  }
});

// ==========================================
// CAMPAIGNS
// ==========================================

router.get("/campaigns", async (req, res) => {
  try {
    const { status } = req.query;
    const conditions: ReturnType<typeof sql>[] = [];
    if (status && status !== "all") conditions.push(sql`status = ${status}`);
    const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

    const result = await db.execute(sql`
      SELECT c.*,
        (SELECT COUNT(*) FROM boomerang_offers o WHERE o.campaign_id = c.id) as offer_count,
        (SELECT COALESCE(SUM(current_redemptions), 0) FROM boomerang_offers o WHERE o.campaign_id = c.id) as total_redemptions
      FROM boomerang_campaigns c
      ${whereClause}
      ORDER BY c.created_at DESC
    `);

    res.json({ campaigns: result.rows });
  } catch (error: any) {
    console.error("[Boomerang] Error fetching campaigns:", error);
    res.status(500).json({ error: "Failed to fetch campaigns" });
  }
});

router.post("/campaigns", async (req, res) => {
  try {
    const { name, description, type, status, targetSegment, targetRfmSegment, channel, budget, costPerSend, startDate, endDate } = req.body;
    if (!name || !type) return res.status(400).json({ error: "Name and type are required" });

    const result = await db.execute(sql`
      INSERT INTO boomerang_campaigns (name, description, type, status, target_segment, target_rfm_segment, channel, budget, cost_per_send, start_date, end_date)
      VALUES (${name}, ${description || null}, ${type}, ${status || "draft"}, ${targetSegment || null}, ${targetRfmSegment || null}, ${channel || "email"}, ${budget || null}, ${costPerSend || null}, ${startDate ? new Date(startDate) : null}, ${endDate ? new Date(endDate) : null})
      RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("[Boomerang] Error creating campaign:", error);
    res.status(500).json({ error: "Failed to create campaign" });
  }
});

router.put("/campaigns/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid campaign ID" });
    const { name, description, type, status, targetSegment, targetRfmSegment, channel, budget, costPerSend, totalSent, totalOpened, totalClicked, totalConverted, totalRevenue, startDate, endDate } = req.body;

    const result = await db.execute(sql`
      UPDATE boomerang_campaigns SET
        name = ${name}, description = ${description || null}, type = ${type}, status = ${status},
        target_segment = ${targetSegment || null}, target_rfm_segment = ${targetRfmSegment || null},
        channel = ${channel}, budget = ${budget || null}, cost_per_send = ${costPerSend || null},
        total_sent = ${totalSent || 0}, total_opened = ${totalOpened || 0},
        total_clicked = ${totalClicked || 0}, total_converted = ${totalConverted || 0},
        total_revenue = ${totalRevenue || "0"}, 
        start_date = ${startDate ? new Date(startDate) : null}, end_date = ${endDate ? new Date(endDate) : null},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `);
    if (result.rows.length === 0) return res.status(404).json({ error: "Campaign not found" });
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("[Boomerang] Error updating campaign:", error);
    res.status(500).json({ error: "Failed to update campaign" });
  }
});

router.delete("/campaigns/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid campaign ID" });
    await db.execute(sql`DELETE FROM boomerang_redemptions WHERE campaign_id = ${id}`);
    await db.execute(sql`DELETE FROM boomerang_offers WHERE campaign_id = ${id}`);
    await db.execute(sql`DELETE FROM boomerang_campaigns WHERE id = ${id}`);
    res.json({ success: true });
  } catch (error: any) {
    console.error("[Boomerang] Error deleting campaign:", error);
    res.status(500).json({ error: "Failed to delete campaign" });
  }
});

// ==========================================
// OFFERS
// ==========================================

router.get("/offers", async (req, res) => {
  try {
    const { campaignId } = req.query;
    const conditions: ReturnType<typeof sql>[] = [];
    if (campaignId) conditions.push(sql`o.campaign_id = ${parseInt(campaignId as string, 10)}`);
    const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

    const result = await db.execute(sql`
      SELECT o.*, c.name as campaign_name
      FROM boomerang_offers o
      LEFT JOIN boomerang_campaigns c ON c.id = o.campaign_id
      ${whereClause}
      ORDER BY o.created_at DESC
    `);
    res.json({ offers: result.rows });
  } catch (error: any) {
    console.error("[Boomerang] Error fetching offers:", error);
    res.status(500).json({ error: "Failed to fetch offers" });
  }
});

router.post("/offers", async (req, res) => {
  try {
    const { campaignId, name, description, offerType, discountValue, discountPercent, minPurchase, couponCode, maxRedemptions, pointsCost, isActive, validFrom, validUntil } = req.body;
    if (!name || !offerType) return res.status(400).json({ error: "Name and offer type are required" });

    const result = await db.execute(sql`
      INSERT INTO boomerang_offers (campaign_id, name, description, offer_type, discount_value, discount_percent, min_purchase, coupon_code, max_redemptions, points_cost, is_active, valid_from, valid_until)
      VALUES (${campaignId || null}, ${name}, ${description || null}, ${offerType}, ${discountValue || null}, ${discountPercent || null}, ${minPurchase || null}, ${couponCode || null}, ${maxRedemptions || null}, ${pointsCost || null}, ${isActive ?? true}, ${validFrom ? new Date(validFrom) : null}, ${validUntil ? new Date(validUntil) : null})
      RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("[Boomerang] Error creating offer:", error);
    res.status(500).json({ error: "Failed to create offer" });
  }
});

router.post("/offers/:id/redeem", async (req, res) => {
  try {
    const offerId = parseInt(req.params.id, 10);
    if (isNaN(offerId)) return res.status(400).json({ error: "Invalid offer ID" });
    const { toastGuestId, orderValue, discountApplied, channel } = req.body;

    const offer = await db.execute(sql`SELECT * FROM boomerang_offers WHERE id = ${offerId}`);
    if (offer.rows.length === 0) return res.status(404).json({ error: "Offer not found" });
    const o: any = offer.rows[0];
    if (!o.is_active) return res.status(400).json({ error: "Offer is not active" });
    if (o.max_redemptions && o.current_redemptions >= o.max_redemptions) return res.status(400).json({ error: "Offer has reached max redemptions" });

    const result = await db.execute(sql`
      INSERT INTO boomerang_redemptions (offer_id, toast_guest_id, campaign_id, order_value, discount_applied, channel)
      VALUES (${offerId}, ${toastGuestId || null}, ${o.campaign_id || null}, ${orderValue || null}, ${discountApplied || null}, ${channel || null})
      RETURNING *
    `);

    await db.execute(sql`UPDATE boomerang_offers SET current_redemptions = current_redemptions + 1 WHERE id = ${offerId}`);
    if (o.campaign_id) {
      await db.execute(sql`UPDATE boomerang_campaigns SET total_converted = total_converted + 1, total_revenue = CAST(total_revenue AS FLOAT) + ${parseFloat(orderValue) || 0}, updated_at = NOW() WHERE id = ${o.campaign_id}`);
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("[Boomerang] Error redeeming offer:", error);
    res.status(500).json({ error: "Failed to redeem offer" });
  }
});

// ==========================================
// AUTOMATION RULES
// ==========================================

router.get("/automations", async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT a.*, o.name as offer_name, o.offer_type, o.coupon_code
      FROM boomerang_automation_rules a
      LEFT JOIN boomerang_offers o ON o.id = a.offer_id
      ORDER BY a.created_at DESC
    `);
    res.json({ rules: result.rows });
  } catch (error: any) {
    console.error("[Boomerang] Error fetching automations:", error);
    res.status(500).json({ error: "Failed to fetch automations" });
  }
});

router.post("/automations", async (req, res) => {
  try {
    const { name, description, triggerType, conditions, offerId, actionType, actionConfig, isActive } = req.body;
    if (!name || !triggerType) return res.status(400).json({ error: "Name and trigger type are required" });

    const result = await db.execute(sql`
      INSERT INTO boomerang_automation_rules (name, description, trigger_type, conditions, offer_id, action_type, action_config, is_active)
      VALUES (${name}, ${description || null}, ${triggerType}, ${JSON.stringify(conditions || {})}, ${offerId || null}, ${actionType || "send_offer"}, ${JSON.stringify(actionConfig || {})}, ${isActive ?? true})
      RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("[Boomerang] Error creating automation:", error);
    res.status(500).json({ error: "Failed to create automation" });
  }
});

router.put("/automations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid automation ID" });
    const { name, description, triggerType, conditions, offerId, actionType, actionConfig, isActive } = req.body;

    const result = await db.execute(sql`
      UPDATE boomerang_automation_rules SET
        name = ${name}, description = ${description || null}, trigger_type = ${triggerType},
        conditions = ${JSON.stringify(conditions || {})}, offer_id = ${offerId || null},
        action_type = ${actionType || "send_offer"}, action_config = ${JSON.stringify(actionConfig || {})},
        is_active = ${isActive ?? true}
      WHERE id = ${id}
      RETURNING *
    `);
    if (result.rows.length === 0) return res.status(404).json({ error: "Automation not found" });
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("[Boomerang] Error updating automation:", error);
    res.status(500).json({ error: "Failed to update automation" });
  }
});

router.delete("/automations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid automation ID" });
    await db.execute(sql`DELETE FROM boomerang_automation_executions WHERE rule_id = ${id}`);
    await db.execute(sql`DELETE FROM boomerang_automation_rules WHERE id = ${id}`);
    res.json({ success: true });
  } catch (error: any) {
    console.error("[Boomerang] Error deleting automation:", error);
    res.status(500).json({ error: "Failed to delete automation" });
  }
});

router.post("/automations/:id/simulate", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid automation ID" });

    const rule = await db.execute(sql`SELECT * FROM boomerang_automation_rules WHERE id = ${id}`);
    if (rule.rows.length === 0) return res.status(404).json({ error: "Automation not found" });
    const r: any = rule.rows[0];

    const conditions: ReturnType<typeof sql>[] = [sql`g.merged_into_id IS NULL`];
    const cond = r.conditions as Record<string, any>;

    if (r.trigger_type === "inactivity" && cond.daysInactive) {
      conditions.push(sql`g.days_since_last_visit >= ${cond.daysInactive}`);
    }
    if (r.trigger_type === "rfm_segment" && cond.rfmSegment) {
      conditions.push(sql`rfm.rfm_segment = ${cond.rfmSegment}`);
    }
    if (cond.minSpend) conditions.push(sql`CAST(COALESCE(g.lifetime_spend, '0') AS FLOAT) >= ${cond.minSpend}`);
    if (cond.minVisits) conditions.push(sql`COALESCE(g.total_visits, 0) >= ${cond.minVisits}`);
    if (cond.hasEmail) conditions.push(sql`g.email1 IS NOT NULL AND g.email1 != ''`);
    if (cond.segment) conditions.push(sql`g.reactivation_segment = ${cond.segment}`);

    const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

    const count = await db.execute(sql`
      SELECT COUNT(*) as eligible
      FROM toast_guests g
      LEFT JOIN boomerang_rfm_scores rfm ON rfm.toast_guest_id = g.id
      ${whereClause}
    `);

    res.json({
      ruleName: r.name,
      eligibleCustomers: Number((count.rows[0] as any).eligible),
      triggerType: r.trigger_type,
      conditions: r.conditions,
    });
  } catch (error: any) {
    console.error("[Boomerang] Error simulating automation:", error);
    res.status(500).json({ error: "Failed to simulate automation" });
  }
});

// ==========================================
// REFERRALS
// ==========================================

router.get("/referrals/stats", async (_req, res) => {
  try {
    const stats = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM boomerang_referral_codes) as total_codes,
        (SELECT COUNT(*) FROM boomerang_referral_codes WHERE is_active = true) as active_codes,
        (SELECT COALESCE(SUM(total_referrals), 0) FROM boomerang_referral_codes) as total_referrals,
        (SELECT COALESCE(SUM(total_converted), 0) FROM boomerang_referral_codes) as total_converted,
        (SELECT COALESCE(SUM(total_points_earned), 0) FROM boomerang_referral_codes) as total_points_earned
    `);
    const s: any = stats.rows[0];
    res.json({
      totalCodes: Number(s.total_codes),
      activeCodes: Number(s.active_codes),
      totalReferrals: Number(s.total_referrals),
      totalConverted: Number(s.total_converted),
      conversionRate: Number(s.total_referrals) > 0 ? Math.round(Number(s.total_converted) / Number(s.total_referrals) * 100) : 0,
      totalPointsEarned: Number(s.total_points_earned),
    });
  } catch (error: any) {
    console.error("[Boomerang] Error fetching referral stats:", error);
    res.status(500).json({ error: "Failed to fetch referral stats" });
  }
});

router.get("/referrals/codes", async (req, res) => {
  try {
    const { page = "1", limit = "25" } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, parseInt(limit as string, 10) || 25);
    const offset = (pageNum - 1) * limitNum;

    const countRes = await db.execute(sql`SELECT COUNT(*) as total FROM boomerang_referral_codes`);
    const result = await db.execute(sql`
      SELECT rc.*, g.first_name, g.last_name, g.email1
      FROM boomerang_referral_codes rc
      JOIN toast_guests g ON g.id = rc.toast_guest_id
      ORDER BY rc.total_referrals DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `);

    res.json({
      codes: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: Number((countRes.rows[0] as any).total),
        totalPages: Math.ceil(Number((countRes.rows[0] as any).total) / limitNum),
      },
    });
  } catch (error: any) {
    console.error("[Boomerang] Error fetching referral codes:", error);
    res.status(500).json({ error: "Failed to fetch referral codes" });
  }
});

router.post("/referrals/generate-batch", async (req, res) => {
  try {
    const { segment, rfmSegment, limit: batchLimit = 100 } = req.body;
    const conditions: ReturnType<typeof sql>[] = [
      sql`g.id NOT IN (SELECT toast_guest_id FROM boomerang_referral_codes)`,
      sql`g.email1 IS NOT NULL AND g.email1 != ''`,
      sql`COALESCE(g.total_visits, 0) >= 3`,
      sql`g.merged_into_id IS NULL`,
    ];
    if (segment) conditions.push(sql`g.reactivation_segment = ${segment}`);
    if (rfmSegment) conditions.push(sql`r.rfm_segment = ${rfmSegment}`);

    const whereClause = sql`WHERE ${sql.join(conditions, sql` AND `)}`;

    const guests = await db.execute(sql`
      SELECT g.id FROM toast_guests g
      LEFT JOIN boomerang_rfm_scores r ON r.toast_guest_id = g.id
      ${whereClause}
      ORDER BY CAST(COALESCE(g.lifetime_spend, '0') AS FLOAT) DESC
      LIMIT ${parseInt(String(batchLimit), 10)}
    `);

    let generated = 0;
    for (const row of guests.rows) {
      const guestId = (row as any).id;
      const code = `NVW${String(guestId).padStart(5, '0')}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      try {
        await db.execute(sql`
          INSERT INTO boomerang_referral_codes (toast_guest_id, code)
          VALUES (${guestId}, ${code})
          ON CONFLICT DO NOTHING
        `);
        generated++;
      } catch { /* skip duplicates */ }
    }

    res.json({ generated, message: `${generated} referral codes created` });
  } catch (error: any) {
    console.error("[Boomerang] Error generating referral codes:", error);
    res.status(500).json({ error: "Failed to generate referral codes" });
  }
});

// ==========================================
// RETENTION ANALYTICS (CAC, LTV, ROI)
// ==========================================

router.get("/retention/metrics", async (_req, res) => {
  try {
    const campaignMetrics = await db.execute(sql`
      SELECT 
        COUNT(*) as total_campaigns,
        COALESCE(SUM(CAST(COALESCE(budget, '0') AS FLOAT)), 0) as total_spend,
        COALESCE(SUM(total_sent), 0) as total_sent,
        COALESCE(SUM(total_converted), 0) as total_converted,
        COALESCE(SUM(CAST(COALESCE(total_revenue, '0') AS FLOAT)), 0) as total_revenue
      FROM boomerang_campaigns
      WHERE status != 'draft'
    `);
    const cm: any = campaignMetrics.rows[0];

    const totalSpend = Number(cm.total_spend);
    const totalConverted = Number(cm.total_converted);
    const totalRevenue = Number(cm.total_revenue);
    const cac = totalConverted > 0 ? Math.round(totalSpend / totalConverted * 100) / 100 : 0;
    const roi = totalSpend > 0 ? Math.round((totalRevenue - totalSpend) / totalSpend * 100) : 0;

    const ltv = await db.execute(sql`
      SELECT ROUND(AVG(CAST(COALESCE(lifetime_spend, '0') AS NUMERIC)), 2) as avg_ltv,
        ROUND(AVG(CAST(COALESCE(total_visits, 0) AS NUMERIC)), 1) as avg_visits
      FROM toast_guests
      WHERE CAST(COALESCE(lifetime_spend, '0') AS NUMERIC) > 0 AND merged_into_id IS NULL
    `);
    const ltvData: any = ltv.rows[0];

    const retentionRate = await db.execute(sql`
      SELECT 
        COUNT(CASE WHEN total_visits >= 2 THEN 1 END) as repeat_customers,
        COUNT(*) as total_with_visits
      FROM toast_guests
      WHERE COALESCE(total_visits, 0) >= 1 AND merged_into_id IS NULL
    `);
    const rr: any = retentionRate.rows[0];

    const redemptionStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_redemptions,
        COALESCE(SUM(CAST(COALESCE(order_value, '0') AS FLOAT)), 0) as total_order_value,
        COALESCE(SUM(CAST(COALESCE(discount_applied, '0') AS FLOAT)), 0) as total_discount,
        COALESCE(AVG(CAST(COALESCE(order_value, '0') AS FLOAT)), 0) as avg_order_value
      FROM boomerang_redemptions
    `);
    const rs: any = redemptionStats.rows[0];

    const channelPerformance = await db.execute(sql`
      SELECT channel, 
        COUNT(*) as campaigns,
        COALESCE(SUM(total_sent), 0) as sent,
        COALESCE(SUM(total_converted), 0) as converted,
        COALESCE(SUM(CAST(COALESCE(total_revenue, '0') AS FLOAT)), 0) as revenue
      FROM boomerang_campaigns
      WHERE status != 'draft'
      GROUP BY channel
    `);

    res.json({
      cac,
      avgLtv: Number(ltvData.avg_ltv),
      avgVisitsPerCustomer: Number(ltvData.avg_visits),
      roi,
      retentionRate: Number(rr.total_with_visits) > 0 ? Math.round(Number(rr.repeat_customers) / Number(rr.total_with_visits) * 100) : 0,
      totalCampaignSpend: totalSpend,
      totalCampaignRevenue: totalRevenue,
      totalRedemptions: Number(rs.total_redemptions),
      totalRedemptionValue: Number(rs.total_order_value),
      avgOrderValue: Math.round(Number(rs.avg_order_value) * 100) / 100,
      channelPerformance: channelPerformance.rows.map((r: any) => ({
        channel: r.channel,
        campaigns: Number(r.campaigns),
        sent: Number(r.sent),
        converted: Number(r.converted),
        revenue: Number(r.revenue),
        conversionRate: Number(r.sent) > 0 ? Math.round(Number(r.converted) / Number(r.sent) * 100) : 0,
      })),
    });
  } catch (error: any) {
    console.error("[Boomerang] Error fetching retention metrics:", error);
    res.status(500).json({ error: "Failed to fetch retention metrics" });
  }
});

export default router;
