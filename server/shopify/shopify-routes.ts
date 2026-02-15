import { Router, Request, Response } from "express";
import {
  fetchDailyShopifyRevenue,
  syncShopifyRevenueToDb,
  getShopifyCustomerCount,
  getShopifyOrderCount,
  fetchAllShopifyCustomers,
  getShopifyToken,
} from "./shopify-api";

const router = Router();

function isAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated?.() || (req.session as any)?.userId) {
    return next();
  }
  res.status(401).json({ error: "Authentication required" });
}

router.get("/status", isAuthenticated, async (_req: Request, res: Response) => {
  try {
    await getShopifyToken();
    const customerCount = await getShopifyCustomerCount();
    const orderCount = await getShopifyOrderCount();

    res.json({
      connected: true,
      storeDomain: process.env.SHOPIFY_STORE_DOMAIN,
      customerCount,
      totalOrderCount: orderCount,
    });
  } catch (err: any) {
    res.json({
      connected: false,
      error: err.message,
    });
  }
});

router.post("/sync-revenue", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { date } = req.body;
    if (!date) {
      return res.status(400).json({ error: "date is required (YYYY-MM-DD)" });
    }

    const result = await syncShopifyRevenueToDb(date);
    res.json({
      success: true,
      date,
      netSales: result.netSales,
      orderCount: result.orderCount,
    });
  } catch (err: any) {
    console.error("[Shopify] Revenue sync error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/sync-revenue-week", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required (YYYY-MM-DD)" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const results: Array<{ date: string; netSales: number; orderCount: number }> = [];

    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split("T")[0];
      try {
        const result = await syncShopifyRevenueToDb(dateStr);
        results.push({ date: dateStr, ...result });
      } catch (err: any) {
        console.error(`[Shopify] Error syncing ${dateStr}:`, err.message);
        results.push({ date: dateStr, netSales: 0, orderCount: 0 });
      }
      current.setDate(current.getDate() + 1);
    }

    const totalRevenue = results.reduce((sum, r) => sum + r.netSales, 0);
    res.json({
      success: true,
      startDate,
      endDate,
      daysProcessed: results.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      results,
    });
  } catch (err: any) {
    console.error("[Shopify] Week sync error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/customers/count", isAuthenticated, async (_req: Request, res: Response) => {
  try {
    const count = await getShopifyCustomerCount();
    res.json({ count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/customers/sync", isAuthenticated, async (_req: Request, res: Response) => {
  try {
    const customers = await fetchAllShopifyCustomers();
    let imported = 0;
    let updated = 0;

    for (const customer of customers) {
      const email = customer.email?.trim();
      const phone = customer.phone?.trim();
      const firstName = customer.first_name?.trim();
      const lastName = customer.last_name?.trim();

      if (!email && !phone) continue;

      const guestGuid = `shopify-${customer.id}`;
      const totalSpent = parseFloat(customer.total_spent || "0");
      const ordersCount = customer.orders_count || 0;
      const avgSpend = ordersCount > 0 ? totalSpent / ordersCount : 0;

      const lastOrderDate = customer.updated_at ? new Date(customer.updated_at) : null;
      const daysSince = lastOrderDate
        ? Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      let segment = "lost";
      if (daysSince !== null) {
        if (daysSince <= 30) segment = "active";
        else if (daysSince <= 60) segment = "at_risk";
        else if (daysSince <= 120) segment = "lapsed";
        else if (daysSince <= 365) segment = "dormant";
      }

      const { db: database } = await import("../db");
      const { sql: sqlTag } = await import("drizzle-orm");

      const existing = await database.execute(sqlTag`
        SELECT id FROM toast_guests WHERE guest_guid = ${guestGuid}
      `);

      if (existing.rows.length > 0) {
        await database.execute(sqlTag`
          UPDATE toast_guests SET
            email1 = COALESCE(NULLIF(${email || ""}, ''), email1),
            phone1 = COALESCE(NULLIF(${phone || ""}, ''), phone1),
            first_name = COALESCE(NULLIF(${firstName || ""}, ''), first_name),
            last_name = COALESCE(NULLIF(${lastName || ""}, ''), last_name),
            total_visits = ${ordersCount},
            lifetime_spend = ${totalSpent.toFixed(2)},
            average_spend = ${avgSpend.toFixed(2)},
            days_since_last_visit = ${daysSince},
            reactivation_segment = ${segment},
            updated_at = NOW()
          WHERE guest_guid = ${guestGuid}
        `);
        updated++;
      } else {
        await database.execute(sqlTag`
          INSERT INTO toast_guests (
            guest_guid, email1, phone1, first_name, last_name,
            first_visit_date, last_visit_date, total_visits,
            average_spend, lifetime_spend, days_since_last_visit,
            reactivation_segment, imported_at, updated_at
          ) VALUES (
            ${guestGuid}, ${email || null}, ${phone || null},
            ${firstName || null}, ${lastName || null},
            ${customer.created_at ? new Date(customer.created_at) : new Date()},
            ${lastOrderDate || new Date()},
            ${ordersCount},
            ${avgSpend.toFixed(2)}, ${totalSpent.toFixed(2)},
            ${daysSince}, ${segment},
            NOW(), NOW()
          )
          ON CONFLICT (guest_guid) DO UPDATE SET
            total_visits = ${ordersCount},
            lifetime_spend = ${totalSpent.toFixed(2)},
            average_spend = ${avgSpend.toFixed(2)},
            updated_at = NOW()
        `);
        imported++;
      }
    }

    res.json({
      success: true,
      totalFetched: customers.length,
      imported,
      updated,
    });
  } catch (err: any) {
    console.error("[Shopify] Customer sync error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
