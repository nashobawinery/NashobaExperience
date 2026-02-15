import { Router } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { isAuthenticated, isAdmin } from "../replitAuth";
import {
  getToastToken,
  getRestaurants,
  getRestaurantInfo,
  syncOrdersBatch,
  syncGuestFromOrder,
  refreshSegments,
} from "./toast-api";

const router = Router();

router.get("/status", isAuthenticated, async (_req, res) => {
  try {
    const hasClientId = !!process.env.TOAST_CLIENT_ID;
    const hasClientSecret = !!process.env.TOAST_CLIENT_SECRET;
    const configured = hasClientId && hasClientSecret;

    let authenticated = false;
    let restaurants: any[] = [];

    if (configured) {
      try {
        await getToastToken();
        authenticated = true;
        restaurants = await getRestaurants();
      } catch (err: any) {
        console.error("[Toast API] Status check auth error:", err.message);
      }
    }

    const lastSync = await db.execute(sql`
      SELECT MAX(updated_at) as last_sync
      FROM toast_guests
      WHERE updated_at > imported_at
    `);

    const syncStats = await db.execute(sql`
      SELECT
        COUNT(*) as total_guests,
        COUNT(CASE WHEN updated_at > imported_at THEN 1 END) as api_synced,
        COUNT(CASE WHEN email1 IS NOT NULL AND email1 != '' THEN 1 END) as with_email,
        COUNT(CASE WHEN phone1 IS NOT NULL AND phone1 != '' THEN 1 END) as with_phone
      FROM toast_guests
    `);

    const stats: any = syncStats.rows[0];

    res.json({
      configured,
      authenticated,
      restaurants: restaurants.map((r: any) => ({
        guid: r.restaurantGuid,
        name: r.restaurantName,
        location: r.locationName || null,
      })),
      lastSync: lastSync.rows[0]?.last_sync || null,
      stats: {
        totalGuests: Number(stats.total_guests),
        apiSynced: Number(stats.api_synced),
        withEmail: Number(stats.with_email),
        withPhone: Number(stats.with_phone),
      },
    });
  } catch (error: any) {
    console.error("[Toast API] Status error:", error.message);
    res.status(500).json({ error: "Failed to check Toast API status" });
  }
});

router.get("/restaurants", isAuthenticated, async (_req, res) => {
  try {
    const restaurants = await getRestaurants();
    res.json({
      restaurants: restaurants.map((r: any) => ({
        guid: r.restaurantGuid,
        name: r.restaurantName,
        location: r.locationName || null,
        managementGroupGuid: r.managementGroupGuid || null,
      })),
    });
  } catch (error: any) {
    console.error("[Toast API] Restaurants error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get("/restaurants/:guid", isAuthenticated, async (req, res) => {
  try {
    const info = await getRestaurantInfo(req.params.guid);
    res.json(info);
  } catch (error: any) {
    console.error("[Toast API] Restaurant info error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post("/sync/orders", isAdmin, async (req, res) => {
  try {
    const { restaurantGuid, startDate, endDate } = req.body;

    if (!restaurantGuid || !startDate || !endDate) {
      return res.status(400).json({
        error: "restaurantGuid, startDate, and endDate are required",
      });
    }

    console.log(`[Toast Sync] Starting order sync for ${restaurantGuid}: ${startDate} to ${endDate}`);
    const result = await syncOrdersBatch(restaurantGuid, startDate, endDate);
    console.log(`[Toast Sync] Complete:`, result);

    res.json({
      message: "Order sync complete",
      ...result,
    });
  } catch (error: any) {
    console.error("[Toast Sync] Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post("/sync/segments", isAdmin, async (_req, res) => {
  try {
    const updated = await refreshSegments();
    res.json({ message: "Segments refreshed", updated });
  } catch (error: any) {
    console.error("[Toast Sync] Segment refresh error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post("/webhook", async (req, res) => {
  res.status(200).json({ received: true });

  try {
    const event = req.body;
    const eventType = event.eventType || event.type;

    console.log(`[Toast Webhook] Received event: ${eventType}`);

    if (eventType === "ORDER_COMPLETED" || eventType === "ORDER_PAID") {
      const order = event.order || event.data?.order;
      if (order) {
        const result = await syncGuestFromOrder(order);
        console.log(`[Toast Webhook] Guest sync result:`, result);
      }
    }
  } catch (err: any) {
    console.error("[Toast Webhook] Processing error:", err.message);
  }
});

router.get("/sync/history", isAuthenticated, async (_req, res) => {
  try {
    const history = await db.execute(sql`
      SELECT
        DATE(updated_at) as sync_date,
        COUNT(*) as records_updated,
        COUNT(CASE WHEN updated_at > imported_at AND DATE(updated_at) = DATE(imported_at) THEN 1 END) as new_records
      FROM toast_guests
      WHERE updated_at > imported_at
      GROUP BY DATE(updated_at)
      ORDER BY sync_date DESC
      LIMIT 30
    `);

    res.json({ history: history.rows });
  } catch (error: any) {
    console.error("[Toast API] Sync history error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
