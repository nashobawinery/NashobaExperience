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
             SUM(net_sales::numeric) as total_sales, SUM(order_count) as total_orders,
             SUM(gross_sales::numeric) as total_gross, SUM(discount_amount::numeric) as total_discounts,
             SUM(service_charge_amount::numeric) as total_service_charges
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
             SUM(net_sales::numeric) as total_sales, SUM(item_count) as total_items,
             SUM(gross_sales::numeric) as total_gross, SUM(discount_amount::numeric) as total_discounts
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
        SELECT revenue_center_guid as guid, revenue_center_name as name, source, net_sales, gross_sales, discount_amount, service_charge_amount, order_count
        FROM rcc_daily_revenue_by_center WHERE date = ${date as string} ORDER BY net_sales DESC
      `),
      db.execute(sql`
        SELECT sales_category_guid as guid, sales_category_name as name, source, net_sales, gross_sales, discount_amount, item_count
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

router.get("/wholesale-breakdown", async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: "date required" });
    }

    const result = await db.execute(sql`
      SELECT o.id, o.order_number, o.status, o.total, o.subtotal,
             c.company_name as customer_name,
             COALESCE(json_agg(
               json_build_object(
                 'name', oi.product_name,
                 'quantity', oi.quantity,
                 'price', oi.unit_price,
                 'total', oi.line_total
               )
             ) FILTER (WHERE oi.id IS NOT NULL), '[]') as items,
             COUNT(oi.id)::int as item_count
      FROM b2b_orders o
      LEFT JOIN b2b_customers c ON o.customer_id = c.id
      LEFT JOIN b2b_order_items oi ON oi.order_id = o.id
      WHERE (o.scheduled_delivery_date::date = ${date as string}::date
             OR o.delivered_at::date = ${date as string}::date
             OR o.order_date::date = ${date as string}::date)
        AND o.status NOT IN ('cancelled', 'rejected')
      GROUP BY o.id, o.order_number, o.status, o.total, o.subtotal, c.company_name
      ORDER BY o.total::numeric DESC
    `);

    const orders = (result.rows as any[]).map(row => ({
      orderNumber: row.order_number,
      customerName: row.customer_name || "Unknown",
      status: row.status,
      totalAmount: row.total || "0",
      itemCount: row.item_count || 0,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []),
    }));

    const totalAmount = orders.reduce((sum, o) => sum + parseFloat(o.totalAmount || "0"), 0);

    res.json({
      orders,
      totalAmount,
      orderCount: orders.length,
    });
  } catch (err: any) {
    console.error("[Revenue Detail] wholesale-breakdown error:", err.message);
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
        grossSales: toastResult.grossSales,
        totalDiscounts: toastResult.totalDiscounts,
        totalServiceCharges: toastResult.totalServiceCharges,
        totalVoidAmount: toastResult.totalVoidAmount,
        totalVoidCount: toastResult.totalVoidCount,
        discountPct: toastResult.grossSales > 0 ? Math.round((toastResult.totalDiscounts / toastResult.grossSales) * 10000) / 100 : 0,
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

const bulkSyncJobs = new Map<string, { totalDates: number; completed: number; errors: number; done: boolean; startDate: string; endDate: string }>();

router.post("/bulk-sync-detail", async (req, res) => {
  try {
    const { startDate, endDate, source } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate required" });
    }

    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
    }

    const dates: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }

    const jobId = `${startDate}_${endDate}_${source || "all"}`;
    const job = { totalDates: dates.length, completed: 0, errors: 0, done: false, startDate, endDate };
    bulkSyncJobs.set(jobId, job);

    res.json({ status: "started", totalDates: dates.length, startDate, endDate, jobId });

    (async () => {
      for (const dateStr of dates) {
        try {
          if (!source || source === "toast") {
            await syncToastRevenueDetailToDb(dateStr);
          }
          if (!source || source === "shopify") {
            try { await syncShopifyRevenueDetailToDb(dateStr); } catch (_e) {}
          }
          job.completed++;
          console.log(`[Bulk Detail Sync] ${dateStr} synced (${job.completed}/${dates.length})`);
        } catch (err: any) {
          job.errors++;
          job.completed++;
          console.error(`[Bulk Detail Sync] ${dateStr} error: ${err.message}`);
        }
        await new Promise(r => setTimeout(r, 300));
      }
      job.done = true;
      console.log(`[Bulk Detail Sync] Complete: ${job.completed - job.errors} synced, ${job.errors} errors out of ${dates.length} dates`);
      setTimeout(() => bulkSyncJobs.delete(jobId), 300000);
    })();
  } catch (err: any) {
    console.error("[Revenue Detail] bulk-sync-detail error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/bulk-sync-status", async (req, res) => {
  try {
    const { jobId } = req.query;
    if (jobId && bulkSyncJobs.has(jobId as string)) {
      const job = bulkSyncJobs.get(jobId as string)!;
      return res.json({
        completed: job.completed,
        totalDates: job.totalDates,
        errors: job.errors,
        done: job.done,
      });
    }
    res.json({ completed: 0, totalDates: 0, errors: 0, done: true });
  } catch (err: any) {
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
