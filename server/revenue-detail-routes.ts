import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { syncToastRevenueDetailToDb } from "./reactivation/toast-api";
import { syncShopifyRevenueDetailToDb } from "./shopify/shopify-api";

const router = Router();

router.get("/by-center", async (req, res) => {
  try {
    const { startDate, endDate, source } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate required" });
    }

    let query = sql`
      SELECT revenue_center_guid as guid, revenue_center_name as name, source,
             SUM(net_sales::numeric) as total_sales, SUM(order_count) as total_orders
      FROM rcc_daily_revenue_by_center
      WHERE date >= ${startDate as string} AND date <= ${endDate as string}
    `;
    if (source) query = sql`${query} AND source = ${source as string}`;
    query = sql`${query} GROUP BY revenue_center_guid, revenue_center_name, source ORDER BY total_sales DESC`;

    const result = await db.execute(query);
    res.json(result.rows);
  } catch (err: any) {
    console.error("[Revenue Detail] by-center error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/by-category", async (req, res) => {
  try {
    const { startDate, endDate, source } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate required" });
    }

    let query = sql`
      SELECT sales_category_guid as guid, sales_category_name as name, source,
             SUM(net_sales::numeric) as total_sales, SUM(item_count) as total_items
      FROM rcc_daily_revenue_by_category
      WHERE date >= ${startDate as string} AND date <= ${endDate as string}
    `;
    if (source) query = sql`${query} AND source = ${source as string}`;
    query = sql`${query} GROUP BY sales_category_guid, sales_category_name, source ORDER BY total_sales DESC`;

    const result = await db.execute(query);
    res.json(result.rows);
  } catch (err: any) {
    console.error("[Revenue Detail] by-category error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/top-items", async (req, res) => {
  try {
    const { startDate, endDate, source, limit: limitParam } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate required" });
    }
    const limit = parseInt(limitParam as string) || 50;

    let query = sql`
      SELECT item_name, source, sales_category_name, revenue_center_name,
             product_type, vendor,
             SUM(quantity) as total_qty, SUM(net_sales::numeric) as total_sales
      FROM rcc_daily_item_sales
      WHERE date >= ${startDate as string} AND date <= ${endDate as string}
    `;
    if (source) query = sql`${query} AND source = ${source as string}`;
    query = sql`${query} GROUP BY item_name, source, sales_category_name, revenue_center_name, product_type, vendor
                ORDER BY total_sales DESC LIMIT ${limit}`;

    const result = await db.execute(query);
    res.json(result.rows);
  } catch (err: any) {
    console.error("[Revenue Detail] top-items error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/daily-breakdown", async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: "date required" });
    }

    const [centers, categories, items] = await Promise.all([
      db.execute(sql`
        SELECT revenue_center_guid as guid, revenue_center_name as name, source, net_sales, order_count
        FROM rcc_daily_revenue_by_center WHERE date = ${date as string} ORDER BY net_sales DESC
      `),
      db.execute(sql`
        SELECT sales_category_guid as guid, sales_category_name as name, source, net_sales, item_count
        FROM rcc_daily_revenue_by_category WHERE date = ${date as string} ORDER BY net_sales DESC
      `),
      db.execute(sql`
        SELECT item_name, source, sales_category_name, revenue_center_name, product_type, vendor, quantity, net_sales
        FROM rcc_daily_item_sales WHERE date = ${date as string} ORDER BY net_sales DESC LIMIT 100
      `),
    ]);

    res.json({
      revenueCenters: centers.rows,
      salesCategories: categories.rows,
      topItems: items.rows,
    });
  } catch (err: any) {
    console.error("[Revenue Detail] daily-breakdown error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/sync-detail", async (req, res) => {
  try {
    const { date, source } = req.body;
    if (!date) {
      return res.status(400).json({ error: "date required" });
    }

    let toastResult = null;
    let shopifyResult = null;

    if (!source || source === "toast") {
      try {
        toastResult = await syncToastRevenueDetailToDb(date);
      } catch (err: any) {
        console.error(`[Revenue Detail] Toast detail sync error for ${date}:`, err.message);
      }
    }

    if (!source || source === "shopify") {
      try {
        shopifyResult = await syncShopifyRevenueDetailToDb(date);
      } catch (err: any) {
        console.error(`[Revenue Detail] Shopify detail sync error for ${date}:`, err.message);
      }
    }

    res.json({
      date,
      toast: toastResult ? {
        netSales: toastResult.netSales,
        orderCount: toastResult.orderCount,
        revenueCenters: toastResult.revenueCenterBreakdown?.length || 0,
        salesCategories: toastResult.salesCategoryBreakdown?.length || 0,
        items: toastResult.itemSales?.length || 0,
      } : null,
      shopify: shopifyResult ? {
        netSales: shopifyResult.netSales,
        orderCount: shopifyResult.orderCount,
        salesCategories: shopifyResult.salesCategoryBreakdown?.length || 0,
        items: shopifyResult.itemSales?.length || 0,
      } : null,
    });
  } catch (err: any) {
    console.error("[Revenue Detail] sync-detail error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/config", async (req, res) => {
  try {
    const [centers, categories] = await Promise.all([
      db.execute(sql`SELECT guid, name FROM rcc_revenue_centers ORDER BY name`),
      db.execute(sql`SELECT guid, name FROM rcc_sales_categories ORDER BY name`),
    ]);
    res.json({
      revenueCenters: centers.rows,
      salesCategories: categories.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
