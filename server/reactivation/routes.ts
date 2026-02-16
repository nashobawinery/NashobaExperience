import { Router } from "express";
import { db } from "../db";
import { toastGuests } from "@shared/schema";
import { sql, eq, and, gte, lte, like, or, desc, asc, count } from "drizzle-orm";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", module: "reactivation", timestamp: new Date().toISOString() });
});

router.get("/segments", async (_req, res) => {
  try {
    const results = await db.execute(sql`
      SELECT 
        reactivation_segment,
        COUNT(*) as customer_count,
        COALESCE(AVG(total_visits), 0) as avg_visits,
        COALESCE(AVG(CAST(lifetime_spend AS FLOAT)), 0) as avg_lifetime_spend,
        COALESCE(AVG(CAST(average_spend AS FLOAT)), 0) as avg_spend_per_visit,
        COALESCE(AVG(days_since_last_visit), 0) as avg_days_inactive,
        COUNT(CASE WHEN email1 IS NOT NULL AND email1 != '' THEN 1 END) as with_email,
        COUNT(CASE WHEN phone1 IS NOT NULL AND phone1 != '' THEN 1 END) as with_phone,
        SUM(CAST(COALESCE(lifetime_spend, '0') AS FLOAT)) as total_lifetime_revenue
      FROM toast_guests
      WHERE reactivation_segment IS NOT NULL AND COALESCE(is_staff, false) = false
      GROUP BY reactivation_segment
      ORDER BY 
        CASE reactivation_segment
          WHEN 'active' THEN 1
          WHEN 'at_risk' THEN 2
          WHEN 'lapsed' THEN 3
          WHEN 'dormant' THEN 4
          WHEN 'lost' THEN 5
        END
    `);

    const totalCustomers = await db.execute(sql`SELECT COUNT(*) as total FROM toast_guests WHERE COALESCE(is_staff, false) = false`);

    const sourceStats = await db.execute(sql`
      SELECT source, COUNT(*) as count FROM toast_guests GROUP BY source
    `);
    const mergedCount = await db.execute(sql`
      SELECT COUNT(DISTINCT canonical_id) as count FROM customer_identity_links
    `);

    res.json({
      segments: results.rows.map((r: any) => ({
        segment: r.reactivation_segment,
        customerCount: Number(r.customer_count),
        avgVisits: Math.round(Number(r.avg_visits) * 10) / 10,
        avgLifetimeSpend: Math.round(Number(r.avg_lifetime_spend) * 100) / 100,
        avgSpendPerVisit: Math.round(Number(r.avg_spend_per_visit) * 100) / 100,
        avgDaysInactive: Math.round(Number(r.avg_days_inactive)),
        withEmail: Number(r.with_email),
        withPhone: Number(r.with_phone),
        totalLifetimeRevenue: Math.round(Number(r.total_lifetime_revenue) * 100) / 100,
      })),
      totalCustomers: Number((totalCustomers.rows[0] as any).total),
      sourceCounts: Object.fromEntries(sourceStats.rows.map((r: any) => [r.source, Number(r.count)])),
      mergedCount: Number((mergedCount.rows[0] as any).count),
    });
  } catch (error: any) {
    console.error("[Reactivation] Error fetching segments:", error);
    res.status(500).json({ error: "Failed to fetch segment data" });
  }
});

router.get("/customers", async (req, res) => {
  try {
    const {
      segment,
      search,
      sortBy = "lifetime_spend",
      sortDir = "desc",
      page = "1",
      limit = "50",
      hasEmail,
      hasPhone,
      marketingOptIn,
      source,
      includeStaff,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const conditions: ReturnType<typeof sql>[] = [];

    if (includeStaff !== "true") {
      conditions.push(sql`COALESCE(tg.is_staff, false) = false`);
    }

    if (segment && segment !== "all") {
      if (segment === "unknown") {
        conditions.push(sql`tg.reactivation_segment IS NULL`);
      } else {
        conditions.push(sql`tg.reactivation_segment = ${segment}`);
      }
    }

    if (search) {
      const searchStr = `%${search}%`;
      conditions.push(sql`(
        tg.first_name ILIKE ${searchStr} OR 
        tg.last_name ILIKE ${searchStr} OR 
        tg.email1 ILIKE ${searchStr} OR 
        tg.phone1 ILIKE ${searchStr} OR 
        CONCAT(tg.first_name, ' ', tg.last_name) ILIKE ${searchStr}
      )`);
    }

    if (hasEmail === "true") {
      conditions.push(sql`tg.email1 IS NOT NULL AND tg.email1 != ''`);
    }
    if (hasPhone === "true") {
      conditions.push(sql`tg.phone1 IS NOT NULL AND tg.phone1 != ''`);
    }
    if (marketingOptIn === "true") {
      conditions.push(sql`tg.email1_marketing_preference = 'OPT_IN'`);
    }
    if (source && source !== "all") {
      if (source === "merged") {
        conditions.push(sql`tg.id IN (SELECT cil2.guest_id FROM customer_identity_links cil2 GROUP BY cil2.guest_id)`);
      } else {
        conditions.push(sql`tg.source = ${source}`);
      }
    }

    const whereClause = conditions.length > 0
      ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
      : sql``;

    const allowedSorts: Record<string, string> = {
      lifetime_spend: "CAST(COALESCE(lifetime_spend, '0') AS FLOAT)",
      total_visits: "COALESCE(total_visits, 0)",
      last_visit: "last_visit_date",
      average_spend: "CAST(COALESCE(average_spend, '0') AS FLOAT)",
      days_inactive: "COALESCE(days_since_last_visit, 99999)",
      first_name: "first_name",
      last_name: "last_name",
    };
    const sortColumn = allowedSorts[sortBy as string] || allowedSorts.lifetime_spend;
    const sortDirection = sortDir === "asc" ? "ASC" : "DESC";
    const orderClause = sql.raw(`ORDER BY ${sortColumn} ${sortDirection} NULLS LAST`);

    const countResult = await db.execute(sql`SELECT COUNT(DISTINCT tg.id) as total FROM toast_guests tg LEFT JOIN customer_identity_links cil ON cil.guest_id = tg.id ${whereClause}`);
    const totalRecords = Number((countResult.rows[0] as any).total);

    const dataResult = await db.execute(sql`
      SELECT tg.id, tg.guest_guid, tg.email1, tg.email1_marketing_preference, tg.phone1, tg.phone1_marketing_preference,
        tg.first_name, tg.last_name, tg.first_visit_date, tg.last_visit_date, tg.last_dining_behavior,
        tg.total_visits, tg.dining_behaviors, tg.average_spend, tg.average_tip, tg.lifetime_spend,
        tg.days_since_last_visit, tg.reactivation_segment, tg.source, tg.activity_categories,
        COALESCE(tg.is_staff, false) as is_staff,
        CASE WHEN cil.canonical_id IS NOT NULL THEN true ELSE false END as is_merged,
        cil.canonical_id
      FROM toast_guests tg
      LEFT JOIN customer_identity_links cil ON cil.guest_id = tg.id
      ${whereClause}
      ${orderClause}
      LIMIT ${limitNum} OFFSET ${offset}
    `);

    res.json({
      customers: dataResult.rows.map((r: any) => ({
        id: r.id,
        guestGuid: r.guest_guid,
        email: r.email1,
        emailOptIn: r.email1_marketing_preference === "OPT_IN",
        phone: r.phone1,
        firstName: r.first_name,
        lastName: r.last_name,
        firstVisitDate: r.first_visit_date,
        lastVisitDate: r.last_visit_date,
        lastDiningBehavior: r.last_dining_behavior,
        totalVisits: r.total_visits,
        diningBehaviors: r.dining_behaviors,
        averageSpend: r.average_spend ? parseFloat(r.average_spend) : null,
        averageTip: r.average_tip ? parseFloat(r.average_tip) : null,
        lifetimeSpend: r.lifetime_spend ? parseFloat(r.lifetime_spend) : null,
        daysSinceLastVisit: r.days_since_last_visit,
        segment: r.reactivation_segment,
        source: r.source || "toast",
        activityCategories: r.activity_categories || null,
        isStaff: r.is_staff === true,
        isMerged: r.is_merged,
        canonicalId: r.canonical_id,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalRecords,
        totalPages: Math.ceil(totalRecords / limitNum),
      },
    });
  } catch (error: any) {
    console.error("[Reactivation] Error fetching customers:", error);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

router.get("/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid customer ID" });
    }
    const result = await db.execute(sql`SELECT * FROM toast_guests WHERE id = ${id}`);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }
    const r: any = result.rows[0];

    let linkedRecords: any[] = [];
    const linkResult = await db.execute(sql`
      SELECT cil.canonical_id, cil.source as link_source, cil.linked_at,
        tg.id as linked_guest_id, tg.guest_guid, tg.first_name, tg.last_name,
        tg.email1, tg.phone1, tg.total_visits, tg.lifetime_spend, tg.average_spend,
        tg.days_since_last_visit, tg.reactivation_segment, tg.source
      FROM customer_identity_links cil
      JOIN customer_identity_links cil2 ON cil2.canonical_id = cil.canonical_id AND cil2.guest_id = ${id}
      JOIN toast_guests tg ON tg.id = cil.guest_id
      WHERE cil.guest_id != ${id}
    `);

    linkedRecords = linkResult.rows.map((lr: any) => ({
      id: lr.linked_guest_id,
      guestGuid: lr.guest_guid,
      firstName: lr.first_name,
      lastName: lr.last_name,
      email: lr.email1,
      phone: lr.phone1,
      totalVisits: lr.total_visits,
      lifetimeSpend: lr.lifetime_spend ? parseFloat(lr.lifetime_spend) : null,
      averageSpend: lr.average_spend ? parseFloat(lr.average_spend) : null,
      daysSinceLastVisit: lr.days_since_last_visit,
      segment: lr.reactivation_segment,
      source: lr.source,
      linkedAt: lr.linked_at,
    }));

    res.json({
      id: r.id,
      guestGuid: r.guest_guid,
      emails: [
        { email: r.email1, preference: r.email1_marketing_preference },
        { email: r.email2, preference: r.email2_marketing_preference },
        { email: r.email3, preference: r.email3_marketing_preference },
        { email: r.email4, preference: r.email4_marketing_preference },
        { email: r.email5, preference: r.email5_marketing_preference },
      ].filter(e => e.email),
      phones: [
        { phone: r.phone1, preference: r.phone1_marketing_preference },
        { phone: r.phone2, preference: r.phone2_marketing_preference },
        { phone: r.phone3, preference: r.phone3_marketing_preference },
        { phone: r.phone4, preference: r.phone4_marketing_preference },
        { phone: r.phone5, preference: r.phone5_marketing_preference },
      ].filter(p => p.phone),
      firstName: r.first_name,
      lastName: r.last_name,
      firstVisitDate: r.first_visit_date,
      lastVisitDate: r.last_visit_date,
      lastDiningBehavior: r.last_dining_behavior,
      totalVisits: r.total_visits,
      diningBehaviors: r.dining_behaviors,
      averageSpend: r.average_spend ? parseFloat(r.average_spend) : null,
      averageTip: r.average_tip ? parseFloat(r.average_tip) : null,
      averageTipPercentage: r.average_tip_percentage ? parseFloat(r.average_tip_percentage) : null,
      lifetimeSpend: r.lifetime_spend ? parseFloat(r.lifetime_spend) : null,
      daysSinceLastVisit: r.days_since_last_visit,
      segment: r.reactivation_segment,
      source: r.source || "toast",
      activityCategories: r.activity_categories || null,
      isStaff: r.is_staff === true,
      isMerged: linkedRecords.length > 0,
      linkedRecords,
    });
  } catch (error: any) {
    console.error("[Reactivation] Error fetching customer:", error);
    res.status(500).json({ error: "Failed to fetch customer" });
  }
});

router.patch("/customers/:id/staff", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid customer ID" });
    }
    const { isStaff } = req.body;
    if (typeof isStaff !== "boolean") {
      return res.status(400).json({ error: "isStaff must be a boolean" });
    }
    await db.execute(sql`UPDATE toast_guests SET is_staff = ${isStaff}, updated_at = NOW() WHERE id = ${id}`);
    res.json({ success: true, id, isStaff });
  } catch (error: any) {
    console.error("[Reactivation] Error updating staff flag:", error);
    res.status(500).json({ error: "Failed to update staff flag" });
  }
});

router.get("/high-value", async (req, res) => {
  try {
    const { segment, limit: lim = "20" } = req.query;
    const limitNum = Math.min(100, parseInt(lim as string) || 20);

    const validSegments = ["at_risk", "lapsed", "dormant"];
    const segmentCondition = (segment && segment !== "all" && validSegments.includes(segment as string))
      ? sql`AND reactivation_segment = ${segment}`
      : sql``;

    const result = await db.execute(sql`
      SELECT id, first_name, last_name, email1, phone1, total_visits,
        lifetime_spend, average_spend, days_since_last_visit, reactivation_segment,
        last_visit_date, email1_marketing_preference
      FROM toast_guests
      WHERE lifetime_spend IS NOT NULL 
        AND CAST(lifetime_spend AS FLOAT) > 0
        AND reactivation_segment IN ('at_risk', 'lapsed', 'dormant')
        AND COALESCE(is_staff, false) = false
        ${segmentCondition}
      ORDER BY CAST(lifetime_spend AS FLOAT) DESC
      LIMIT ${limitNum}
    `);

    res.json({
      customers: result.rows.map((r: any) => ({
        id: r.id,
        firstName: r.first_name,
        lastName: r.last_name,
        email: r.email1,
        phone: r.phone1,
        emailOptIn: r.email1_marketing_preference === "OPT_IN",
        totalVisits: r.total_visits,
        lifetimeSpend: r.lifetime_spend ? parseFloat(r.lifetime_spend) : 0,
        averageSpend: r.average_spend ? parseFloat(r.average_spend) : 0,
        daysSinceLastVisit: r.days_since_last_visit,
        segment: r.reactivation_segment,
        lastVisitDate: r.last_visit_date,
      })),
    });
  } catch (error: any) {
    console.error("[Reactivation] Error fetching high-value:", error);
    res.status(500).json({ error: "Failed to fetch high-value customers" });
  }
});

router.get("/analytics", async (_req, res) => {
  try {
    const spendDistribution = await db.execute(sql`
      SELECT spend_range, count FROM (
        SELECT 
          CASE 
            WHEN CAST(COALESCE(lifetime_spend, '0') AS FLOAT) = 0 THEN '$0'
            WHEN CAST(lifetime_spend AS FLOAT) < 50 THEN '$1-$49'
            WHEN CAST(lifetime_spend AS FLOAT) < 100 THEN '$50-$99'
            WHEN CAST(lifetime_spend AS FLOAT) < 250 THEN '$100-$249'
            WHEN CAST(lifetime_spend AS FLOAT) < 500 THEN '$250-$499'
            WHEN CAST(lifetime_spend AS FLOAT) < 1000 THEN '$500-$999'
            ELSE '$1000+'
          END as spend_range,
          CASE 
            WHEN CAST(COALESCE(lifetime_spend, '0') AS FLOAT) = 0 THEN 1
            WHEN CAST(lifetime_spend AS FLOAT) < 50 THEN 2
            WHEN CAST(lifetime_spend AS FLOAT) < 100 THEN 3
            WHEN CAST(lifetime_spend AS FLOAT) < 250 THEN 4
            WHEN CAST(lifetime_spend AS FLOAT) < 500 THEN 5
            WHEN CAST(lifetime_spend AS FLOAT) < 1000 THEN 6
            ELSE 7
          END as sort_order,
          COUNT(*) as count
        FROM toast_guests
        GROUP BY spend_range, sort_order
      ) sub ORDER BY sort_order
    `);

    const visitDistribution = await db.execute(sql`
      SELECT visit_range, count FROM (
        SELECT 
          CASE 
            WHEN COALESCE(total_visits, 0) = 0 THEN '0 visits'
            WHEN total_visits = 1 THEN '1 visit'
            WHEN total_visits BETWEEN 2 AND 5 THEN '2-5 visits'
            WHEN total_visits BETWEEN 6 AND 10 THEN '6-10 visits'
            WHEN total_visits BETWEEN 11 AND 25 THEN '11-25 visits'
            WHEN total_visits BETWEEN 26 AND 50 THEN '26-50 visits'
            ELSE '50+ visits'
          END as visit_range,
          CASE 
            WHEN COALESCE(total_visits, 0) = 0 THEN 1
            WHEN total_visits = 1 THEN 2
            WHEN total_visits BETWEEN 2 AND 5 THEN 3
            WHEN total_visits BETWEEN 6 AND 10 THEN 4
            WHEN total_visits BETWEEN 11 AND 25 THEN 5
            WHEN total_visits BETWEEN 26 AND 50 THEN 6
            ELSE 7
          END as sort_order,
          COUNT(*) as count
        FROM toast_guests
        GROUP BY visit_range, sort_order
      ) sub ORDER BY sort_order
    `);

    const reachability = await db.execute(sql`
      SELECT 
        COUNT(CASE WHEN email1 IS NOT NULL AND email1 != '' AND email1_marketing_preference = 'OPT_IN' THEN 1 END) as email_opt_in,
        COUNT(CASE WHEN email1 IS NOT NULL AND email1 != '' AND email1_marketing_preference = 'OPT_OUT' THEN 1 END) as email_opt_out,
        COUNT(CASE WHEN email1 IS NOT NULL AND email1 != '' AND (email1_marketing_preference IS NULL OR email1_marketing_preference NOT IN ('OPT_IN', 'OPT_OUT')) THEN 1 END) as email_unknown,
        COUNT(CASE WHEN email1 IS NULL OR email1 = '' THEN 1 END) as no_email,
        COUNT(CASE WHEN phone1 IS NOT NULL AND phone1 != '' THEN 1 END) as has_phone,
        COUNT(*) as total
      FROM toast_guests
    `);

    const atRiskRevenue = await db.execute(sql`
      SELECT 
        reactivation_segment,
        SUM(CAST(COALESCE(lifetime_spend, '0') AS FLOAT)) as total_at_risk_revenue,
        COUNT(*) as count
      FROM toast_guests
      WHERE reactivation_segment IN ('at_risk', 'lapsed', 'dormant')
      GROUP BY reactivation_segment
    `);

    res.json({
      spendDistribution: spendDistribution.rows.map((r: any) => ({
        range: r.spend_range,
        count: Number(r.count),
      })),
      visitDistribution: visitDistribution.rows.map((r: any) => ({
        range: r.visit_range,
        count: Number(r.count),
      })),
      reachability: {
        emailOptIn: Number((reachability.rows[0] as any).email_opt_in),
        emailOptOut: Number((reachability.rows[0] as any).email_opt_out),
        emailUnknown: Number((reachability.rows[0] as any).email_unknown),
        noEmail: Number((reachability.rows[0] as any).no_email),
        hasPhone: Number((reachability.rows[0] as any).has_phone),
        total: Number((reachability.rows[0] as any).total),
      },
      atRiskRevenue: atRiskRevenue.rows.map((r: any) => ({
        segment: r.reactivation_segment,
        totalRevenue: Math.round(Number(r.total_at_risk_revenue) * 100) / 100,
        count: Number(r.count),
      })),
    });
  } catch (error: any) {
    console.error("[Reactivation] Error fetching analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

router.get("/source-counts", async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT source, COUNT(*) as cnt FROM toast_guests 
      WHERE COALESCE(is_staff, false) = false
      GROUP BY source
    `);
    const mergedResult = await db.execute(sql`
      SELECT COUNT(DISTINCT guest_id) as cnt FROM customer_identity_links
    `);
    const counts: Record<string, number> = {};
    for (const row of result.rows as any[]) {
      counts[row.source || "unknown"] = Number(row.cnt);
    }
    counts["merged"] = Number((mergedResult.rows[0] as any)?.cnt || 0);
    res.json(counts);
  } catch (error: any) {
    console.error("[Reactivation] Error fetching source counts:", error);
    res.status(500).json({ error: "Failed to fetch source counts" });
  }
});

router.get("/sync-status", async (_req, res) => {
  try {
    const lastSync = await db.execute(sql`
      SELECT * FROM rcc_sync_log
      WHERE status = 'completed'
      ORDER BY completed_at DESC
      LIMIT 1
    `);

    const recentSyncs = await db.execute(sql`
      SELECT * FROM rcc_sync_log
      ORDER BY started_at DESC
      LIMIT 10
    `);

    const lastToastUpdate = await db.execute(sql`
      SELECT MAX(updated_at) as last_update FROM toast_guests WHERE source = 'toast'
    `);

    const lastShopifyUpdate = await db.execute(sql`
      SELECT MAX(updated_at) as last_update FROM toast_guests WHERE source = 'shopify'
    `);

    res.json({
      lastSync: lastSync.rows[0] || null,
      recentSyncs: recentSyncs.rows,
      lastToastUpdate: (lastToastUpdate.rows[0] as any)?.last_update || null,
      lastShopifyUpdate: (lastShopifyUpdate.rows[0] as any)?.last_update || null,
      schedule: "Daily at 2:00 AM Eastern",
    });
  } catch (error: any) {
    console.error("[Reactivation] Error fetching sync status:", error);
    res.status(500).json({ error: "Failed to fetch sync status" });
  }
});

router.post("/sync/run-now", async (_req, res) => {
  try {
    const { runNightlySync } = await import("../nightlySync");
    res.json({ message: "Sync started in background" });
    runNightlySync().catch(err => console.error("[Manual Sync] Error:", err));
  } catch (error: any) {
    console.error("[Reactivation] Error triggering sync:", error);
    res.status(500).json({ error: "Failed to trigger sync" });
  }
});

export default router;
