import { Router } from "express";
import { db } from "../db";
import { sql, eq, and } from "drizzle-orm";
import { isAuthenticated, isAdmin } from "../replitAuth";
import { toastMenus, toastMenuGroups, toastMenuItems } from "@shared/schema";
import {
  getToastToken,
  getRestaurants,
  getRestaurantInfo,
  getMenus,
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

// ===================== Toast Menu Routes =====================

router.post("/menus/sync", isAuthenticated, async (req, res) => {
  try {
    const { restaurantGuid } = req.body;
    if (!restaurantGuid) {
      return res.status(400).json({ error: "restaurantGuid is required" });
    }

    console.log(`[Toast Menus] Starting menu sync for restaurant ${restaurantGuid}`);
    const rawResponse = await getMenus(restaurantGuid);

    let menuList: any[] = [];
    if (Array.isArray(rawResponse)) {
      menuList = rawResponse;
    } else if (rawResponse && typeof rawResponse === "object") {
      menuList = rawResponse.menus || rawResponse.data || [rawResponse];
    }

    if (menuList.length === 0) {
      console.warn("[Toast Menus] No menus found in response. Keys:", Object.keys(rawResponse || {}));
      return res.json({ success: true, menuCount: 0, groupCount: 0, itemCount: 0, syncedAt: new Date().toISOString() });
    }

    console.log(`[Toast Menus] Found ${menuList.length} menus in response`);
    console.log(`[Toast Menus] First menu keys: ${Object.keys(menuList[0]).join(", ")}`);

    await db.delete(toastMenuItems).where(eq(toastMenuItems.restaurantGuid, restaurantGuid));
    await db.delete(toastMenuGroups).where(eq(toastMenuGroups.restaurantGuid, restaurantGuid));
    await db.delete(toastMenus).where(eq(toastMenus.restaurantGuid, restaurantGuid));

    let menuCount = 0;
    let groupCount = 0;
    let itemCount = 0;

    for (const menu of menuList) {
      const menuGuid = menu.guid || menu.id || menu.menuId || "";
      const menuName = menu.name || "Unnamed Menu";
      const visibilityArr = menu.visibility || [];

      if (!menuGuid) {
        console.warn(`[Toast Menus] Skipping menu with no GUID: ${menuName}`);
        continue;
      }

      await db.insert(toastMenus).values({
        menuGuid,
        restaurantGuid,
        name: menuName,
        description: menu.description || null,
        orderable: menu.orderable !== false,
        visibility: JSON.stringify(visibilityArr),
      });
      menuCount++;

      const groups = menu.menuGroups || menu.groups || menu.subgroups || [];
      if (groups.length > 0) {
        console.log(`[Toast Menus] Menu "${menuName}" has ${groups.length} groups. First group keys: ${Object.keys(groups[0]).join(", ")}`);
      }

      for (let gi = 0; gi < groups.length; gi++) {
        const group = groups[gi];
        const groupGuid = group.guid || group.id || group.groupId || "";
        const groupName = group.name || "Unnamed Group";

        if (!groupGuid) continue;

        await db.insert(toastMenuGroups).values({
          groupGuid,
          menuGuid,
          restaurantGuid,
          name: groupName,
          description: group.description || null,
          displayOrder: gi,
          visibility: JSON.stringify(group.visibility || []),
        });
        groupCount++;

        const items = group.menuItems || group.items || [];
        for (const item of items) {
          const itemGuid = item.guid || item.id || item.itemId || "";
          const itemName = item.name || "Unnamed Item";
          if (!itemGuid) continue;

          let price: string | null = null;
          if (item.price != null && item.price !== "") {
            price = String(item.price);
          } else if (item.prices && item.prices.length > 0) {
            price = String(item.prices[0].price ?? item.prices[0].amount ?? 0);
          }

          await db.insert(toastMenuItems).values({
            itemGuid,
            groupGuid,
            menuGuid,
            restaurantGuid,
            name: itemName,
            description: item.description || null,
            price,
            posName: item.posName || null,
            sku: item.sku || null,
            plu: item.plu || null,
            type: item.type || null,
            visibility: JSON.stringify(item.visibility || []),
            imageUrl: item.imageUrl || item.image || null,
          });
          itemCount++;
        }
      }
    }

    console.log(`[Toast Menus] Sync complete: ${menuCount} menus, ${groupCount} groups, ${itemCount} items`);
    res.json({
      success: true,
      menuCount,
      groupCount,
      itemCount,
      syncedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Toast Menus] Sync error:", error.message);
    res.status(500).json({ error: error.message || "Failed to sync menus" });
  }
});

router.get("/menus", isAuthenticated, async (req, res) => {
  try {
    const restaurantGuid = req.query.restaurantGuid as string | undefined;
    let query;
    if (restaurantGuid) {
      query = await db.select().from(toastMenus).where(eq(toastMenus.restaurantGuid, restaurantGuid));
    } else {
      query = await db.select().from(toastMenus);
    }
    res.json(query);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch menus" });
  }
});

router.get("/menu-groups", isAuthenticated, async (req, res) => {
  try {
    const menuGuid = req.query.menuGuid as string | undefined;
    const restaurantGuid = req.query.restaurantGuid as string | undefined;
    let results;
    if (menuGuid) {
      results = await db.select().from(toastMenuGroups)
        .where(eq(toastMenuGroups.menuGuid, menuGuid))
        .orderBy(toastMenuGroups.displayOrder);
    } else if (restaurantGuid) {
      results = await db.select().from(toastMenuGroups)
        .where(eq(toastMenuGroups.restaurantGuid, restaurantGuid))
        .orderBy(toastMenuGroups.displayOrder);
    } else {
      results = await db.select().from(toastMenuGroups).orderBy(toastMenuGroups.displayOrder);
    }
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch menu groups" });
  }
});

router.get("/menu-items", isAuthenticated, async (req, res) => {
  try {
    const groupGuid = req.query.groupGuid as string | undefined;
    const menuGuid = req.query.menuGuid as string | undefined;
    const restaurantGuid = req.query.restaurantGuid as string | undefined;
    const search = req.query.search as string | undefined;

    let results;
    if (groupGuid) {
      results = await db.select().from(toastMenuItems)
        .where(eq(toastMenuItems.groupGuid, groupGuid))
        .orderBy(toastMenuItems.name);
    } else if (menuGuid) {
      results = await db.select().from(toastMenuItems)
        .where(eq(toastMenuItems.menuGuid, menuGuid))
        .orderBy(toastMenuItems.name);
    } else if (restaurantGuid) {
      results = await db.select().from(toastMenuItems)
        .where(eq(toastMenuItems.restaurantGuid, restaurantGuid))
        .orderBy(toastMenuItems.name);
    } else {
      results = await db.select().from(toastMenuItems).orderBy(toastMenuItems.name);
    }

    if (search) {
      const q = search.toLowerCase();
      results = results.filter((item) =>
        item.name.toLowerCase().includes(q) ||
        (item.posName && item.posName.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    }

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch menu items" });
  }
});

router.get("/menus/sync-status", isAuthenticated, async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT 
        restaurant_guid,
        COUNT(DISTINCT menu_guid) as menu_count,
        MAX(synced_at) as last_synced
      FROM toast_menus
      GROUP BY restaurant_guid
    `);
    const itemCounts = await db.execute(sql`
      SELECT restaurant_guid, COUNT(*) as item_count
      FROM toast_menu_items
      GROUP BY restaurant_guid
    `);
    const groupCounts = await db.execute(sql`
      SELECT restaurant_guid, COUNT(*) as group_count
      FROM toast_menu_groups
      GROUP BY restaurant_guid
    `);

    const statusMap: Record<string, any> = {};
    for (const row of result.rows as any[]) {
      statusMap[row.restaurant_guid] = {
        menuCount: Number(row.menu_count),
        lastSynced: row.last_synced,
        itemCount: 0,
        groupCount: 0,
      };
    }
    for (const row of itemCounts.rows as any[]) {
      if (statusMap[row.restaurant_guid]) {
        statusMap[row.restaurant_guid].itemCount = Number(row.item_count);
      }
    }
    for (const row of groupCounts.rows as any[]) {
      if (statusMap[row.restaurant_guid]) {
        statusMap[row.restaurant_guid].groupCount = Number(row.group_count);
      }
    }

    res.json(statusMap);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch sync status" });
  }
});

export default router;
