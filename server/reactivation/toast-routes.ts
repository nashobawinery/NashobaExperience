import { Router } from "express";
import { db } from "../db";
import { sql, eq, and, inArray, or } from "drizzle-orm";
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

router.get("/menus/available", isAuthenticated, async (req, res) => {
  try {
    const restaurantGuid = req.query.restaurantGuid as string;
    if (!restaurantGuid) {
      return res.status(400).json({ error: "restaurantGuid is required" });
    }

    console.log(`[Toast Menus] Fetching available menus for restaurant ${restaurantGuid}`);
    const rawResponse = await getMenus(restaurantGuid);

    let menuList: any[] = [];
    if (Array.isArray(rawResponse)) {
      menuList = rawResponse;
    } else if (rawResponse && typeof rawResponse === "object") {
      const obj = rawResponse as Record<string, any>;
      menuList = obj.menus || obj.data || [rawResponse];
    }

    const available = menuList.map((menu: any) => ({
      guid: menu.guid || menu.id || menu.menuId || "",
      name: menu.name || "Unnamed Menu",
      groupCount: (menu.menuGroups || menu.groups || menu.subgroups || []).length,
      itemCount: (menu.menuGroups || menu.groups || menu.subgroups || []).reduce(
        (acc: number, g: any) => acc + (g.menuItems || g.items || []).length, 0
      ),
    })).filter((m: any) => m.guid);

    console.log(`[Toast Menus] Found ${available.length} available menus`);
    res.json(available);
  } catch (error: any) {
    console.error("[Toast Menus] Available menus error:", error.message);
    res.status(500).json({ error: error.message || "Failed to fetch available menus" });
  }
});

router.post("/menus/sync", isAuthenticated, async (req, res) => {
  try {
    const { restaurantGuid, menuGuids } = req.body;
    if (!restaurantGuid) {
      return res.status(400).json({ error: "restaurantGuid is required" });
    }

    const selectedGuids: string[] | null = Array.isArray(menuGuids) && menuGuids.length > 0 ? menuGuids : null;

    console.log(`[Toast Menus] Starting menu sync for restaurant ${restaurantGuid}${selectedGuids ? ` (${selectedGuids.length} selected)` : " (all)"}`);
    const rawResponse = await getMenus(restaurantGuid);

    let menuList: any[] = [];
    if (Array.isArray(rawResponse)) {
      menuList = rawResponse;
    } else if (rawResponse && typeof rawResponse === "object") {
      const obj = rawResponse as Record<string, any>;
      menuList = obj.menus || obj.data || [rawResponse];
    }

    if (selectedGuids) {
      menuList = menuList.filter((menu: any) => {
        const guid = menu.guid || menu.id || menu.menuId || "";
        return selectedGuids.includes(guid);
      });
    }

    if (menuList.length === 0) {
      console.warn("[Toast Menus] No menus found in response. Keys:", Object.keys(rawResponse || {}));
      return res.json({ success: true, menuCount: 0, groupCount: 0, itemCount: 0, syncedAt: new Date().toISOString() });
    }

    console.log(`[Toast Menus] Syncing ${menuList.length} menus`);
    console.log(`[Toast Menus] First menu keys: ${Object.keys(menuList[0]).join(", ")}`);

    const existingOverrides = new Map<string, { hidden: boolean | null; suggestedPairing: string | null; displayOrder: number | null; description: string | null; descriptionEdited: boolean }>();
    {
      let existingItems;
      const selectFields = { itemGuid: toastMenuItems.itemGuid, hidden: toastMenuItems.hidden, suggestedPairing: toastMenuItems.suggestedPairing, displayOrder: toastMenuItems.displayOrder, description: toastMenuItems.description };
      if (selectedGuids) {
        existingItems = await db.select(selectFields)
          .from(toastMenuItems)
          .where(and(eq(toastMenuItems.restaurantGuid, restaurantGuid)));
      } else {
        existingItems = await db.select(selectFields)
          .from(toastMenuItems)
          .where(eq(toastMenuItems.restaurantGuid, restaurantGuid));
      }
      for (const item of existingItems) {
        if (item.hidden || item.suggestedPairing || item.displayOrder != null || item.description) {
          existingOverrides.set(item.itemGuid, { hidden: item.hidden, suggestedPairing: item.suggestedPairing, displayOrder: item.displayOrder, description: item.description, descriptionEdited: false });
        }
      }
      console.log(`[Toast Menus] Preserved ${existingOverrides.size} item overrides (hidden/pairing/order/description)`);
    }

    if (selectedGuids) {
      for (const guid of selectedGuids) {
        await db.delete(toastMenuItems).where(and(eq(toastMenuItems.restaurantGuid, restaurantGuid), eq(toastMenuItems.menuGuid, guid)));
        await db.delete(toastMenuGroups).where(and(eq(toastMenuGroups.restaurantGuid, restaurantGuid), eq(toastMenuGroups.menuGuid, guid)));
        await db.delete(toastMenus).where(and(eq(toastMenus.restaurantGuid, restaurantGuid), eq(toastMenus.menuGuid, guid)));
      }
    } else {
      await db.delete(toastMenuItems).where(eq(toastMenuItems.restaurantGuid, restaurantGuid));
      await db.delete(toastMenuGroups).where(eq(toastMenuGroups.restaurantGuid, restaurantGuid));
      await db.delete(toastMenus).where(eq(toastMenus.restaurantGuid, restaurantGuid));
    }

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
        for (let ii = 0; ii < items.length; ii++) {
          const item = items[ii];
          const itemGuid = item.guid || item.id || item.itemId || "";
          const itemName = item.name || "Unnamed Item";
          if (!itemGuid) continue;

          let price: string | null = null;
          if (item.price != null && item.price !== "") {
            price = String(item.price);
          } else if (item.prices && item.prices.length > 0) {
            price = String(item.prices[0].price ?? item.prices[0].amount ?? 0);
          }

          const overrides = existingOverrides.get(itemGuid);

          let rawDesc = item.description || "";
          let extractedPairing: string | null = null;
          const pairingMatch = rawDesc.match(/(?:^|\n)\s*Suggested\s+Pairing[:\s]+(.+?)(?:\s*\$\d+)?\s*$/im);
          if (pairingMatch) {
            extractedPairing = pairingMatch[1].trim();
            rawDesc = rawDesc.replace(/(?:^|\n)\s*Suggested\s+Pairing[:\s]+.+?(?:\s*\$\d+)?\s*$/im, "").trim();
          }

          const cleanDesc = rawDesc || null;
          const finalPairing = overrides?.suggestedPairing || extractedPairing || null;
          const finalDescription = (overrides?.description && overrides.description !== cleanDesc) ? overrides.description : cleanDesc;

          await db.insert(toastMenuItems).values({
            itemGuid,
            groupGuid,
            menuGuid,
            restaurantGuid,
            name: itemName,
            description: finalDescription,
            price,
            posName: item.posName || null,
            sku: item.sku || null,
            plu: item.plu || null,
            type: item.type || null,
            visibility: JSON.stringify(item.visibility || []),
            imageUrl: item.imageUrl || item.image || null,
            hidden: overrides?.hidden ?? false,
            suggestedPairing: finalPairing,
            displayOrder: overrides?.displayOrder ?? ii,
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
        .orderBy(toastMenuItems.displayOrder, toastMenuItems.name);
    } else if (menuGuid) {
      results = await db.select().from(toastMenuItems)
        .where(eq(toastMenuItems.menuGuid, menuGuid))
        .orderBy(toastMenuItems.displayOrder, toastMenuItems.name);
    } else if (restaurantGuid) {
      results = await db.select().from(toastMenuItems)
        .where(eq(toastMenuItems.restaurantGuid, restaurantGuid))
        .orderBy(toastMenuItems.displayOrder, toastMenuItems.name);
    } else {
      results = await db.select().from(toastMenuItems).orderBy(toastMenuItems.displayOrder, toastMenuItems.name);
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

// ===================== Admin Item Overrides =====================

router.patch("/menu-items/:itemId/overrides", isAuthenticated, async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    if (isNaN(itemId)) return res.status(400).json({ error: "Invalid item ID" });

    const { hidden, suggestedPairing, displayOrder, description } = req.body;
    const updates: Record<string, any> = {};
    if (typeof hidden === "boolean") updates.hidden = hidden;
    if (suggestedPairing !== undefined) updates.suggestedPairing = suggestedPairing || null;
    if (displayOrder !== undefined) updates.displayOrder = displayOrder != null ? Number(displayOrder) : null;
    if (description !== undefined) updates.description = description;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const result = await db.update(toastMenuItems)
      .set(updates)
      .where(eq(toastMenuItems.id, itemId))
      .returning();

    if (result.length === 0) return res.status(404).json({ error: "Item not found" });
    res.json(result[0]);
  } catch (error: any) {
    console.error("[Toast Items] Override update error:", error.message);
    res.status(500).json({ error: "Failed to update item overrides" });
  }
});

router.patch("/menu-items/batch-overrides", isAuthenticated, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Items array required" });
    }

    const results = [];
    for (const item of items) {
      const updates: Record<string, any> = {};
      if (typeof item.hidden === "boolean") updates.hidden = item.hidden;
      if (item.suggestedPairing !== undefined) updates.suggestedPairing = item.suggestedPairing || null;
      if (item.displayOrder !== undefined) updates.displayOrder = item.displayOrder != null ? Number(item.displayOrder) : null;

      if (Object.keys(updates).length > 0 && item.id) {
        const result = await db.update(toastMenuItems)
          .set(updates)
          .where(eq(toastMenuItems.id, item.id))
          .returning();
        if (result.length > 0) results.push(result[0]);
      }
    }

    res.json({ updated: results.length, items: results });
  } catch (error: any) {
    console.error("[Toast Items] Batch override error:", error.message);
    res.status(500).json({ error: "Failed to batch update overrides" });
  }
});

// ===================== Public Routes (no auth - for embed/print) =====================

router.get("/public/menus-combined", async (req, res) => {
  try {
    const guidsParam = req.query.guids as string;
    const includeHidden = req.query.includeHidden === "true";
    if (!guidsParam) return res.status(400).json({ error: "guids required" });
    const guids = guidsParam.split(",").map(g => g.trim()).filter(Boolean);

    const results = [];
    for (const guid of guids) {
      const menu = await db.select().from(toastMenus)
        .where(or(eq(toastMenus.menuGuid, guid), eq(toastMenus.name, guid)))
        .limit(1);
      if (menu.length === 0) continue;

      const menuGuid = menu[0].menuGuid;
      const groups = await db.select().from(toastMenuGroups)
        .where(eq(toastMenuGroups.menuGuid, menuGuid))
        .orderBy(toastMenuGroups.displayOrder);

      const allItems = await db.select().from(toastMenuItems)
        .where(eq(toastMenuItems.menuGuid, menuGuid))
        .orderBy(toastMenuItems.displayOrder, toastMenuItems.name);

      const visibleItems = includeHidden ? allItems : allItems.filter((i) => !i.hidden);

      const groupsWithItems = groups.map((g) => ({
        ...g,
        items: visibleItems.filter((i) => i.groupGuid === g.groupGuid),
      }));

      results.push({
        menu: menu[0],
        groups: groupsWithItems,
        totalItems: visibleItems.length,
      });
    }

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch combined menus" });
  }
});

router.get("/public/menu/:menuGuid", async (req, res) => {
  try {
    const { menuGuid } = req.params;
    const groupGuid = req.query.groupGuid as string | undefined;
    const includeHidden = req.query.includeHidden === "true";

    const menu = await db.select().from(toastMenus).where(eq(toastMenus.menuGuid, menuGuid)).limit(1);
    if (menu.length === 0) {
      return res.status(404).json({ error: "Menu not found" });
    }

    let groups;
    if (groupGuid) {
      groups = await db.select().from(toastMenuGroups)
        .where(and(eq(toastMenuGroups.menuGuid, menuGuid), eq(toastMenuGroups.groupGuid, groupGuid)))
        .orderBy(toastMenuGroups.displayOrder);
    } else {
      groups = await db.select().from(toastMenuGroups)
        .where(eq(toastMenuGroups.menuGuid, menuGuid))
        .orderBy(toastMenuGroups.displayOrder);
    }

    const allItems = await db.select().from(toastMenuItems)
      .where(eq(toastMenuItems.menuGuid, menuGuid))
      .orderBy(toastMenuItems.displayOrder, toastMenuItems.name);

    const visibleItems = includeHidden ? allItems : allItems.filter((i) => !i.hidden);

    const groupsWithItems = groups.map((g) => ({
      ...g,
      items: visibleItems.filter((i) => i.groupGuid === g.groupGuid),
    }));

    res.json({
      menu: menu[0],
      groups: groupsWithItems,
      totalItems: visibleItems.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch menu data" });
  }
});

router.get("/public/menu/:menuGuid/embed", async (req, res) => {
  try {
    const { menuGuid } = req.params;
    const template = (req.query.template as string) || "fine-dining";
    const groupGuidParam = req.query.groupGuid as string | undefined;
    const groupGuids = groupGuidParam ? groupGuidParam.split(",").map(g => g.trim()).filter(Boolean) : [];
    const rawScale = parseFloat(req.query.scale as string) || 100;
    const scale = Math.min(120, Math.max(60, rawScale));
    const rawPages = parseInt(req.query.pages as string) || 0;
    const pages = Math.min(10, Math.max(0, rawPages));
    const customHeader = (req.query.header as string) || "";
    const customFooter = (req.query.footer as string) || "";
    const pagebreaksParam = req.query.pagebreaks as string | undefined;
    const pagebreakGuids = pagebreaksParam ? pagebreaksParam.split(",").map(g => g.trim()).filter(Boolean) : [];
    const hideDescriptions = req.query.hidedesc === "1";
    const hidePricing = req.query.hideprice === "1";
    const hideWinePairing = req.query.hidepairing === "1";

    const menu = await db.select().from(toastMenus).where(or(eq(toastMenus.menuGuid, menuGuid), eq(toastMenus.name, menuGuid))).limit(1);
    if (menu.length === 0) {
      return res.status(404).send("<html><body><p>Menu not found</p></body></html>");
    }

    // Use the actual GUID if name was provided
    const actualMenuGuid = menu[0].menuGuid;

    let groups;
    if (groupGuids.length > 0) {
      // Find group GUIDs if names were provided
      const resolvedGroupGuids = [];
      for (const g of groupGuids) {
        const found = await db.select({ groupGuid: toastMenuGroups.groupGuid })
          .from(toastMenuGroups)
          .where(and(
            eq(toastMenuGroups.menuGuid, actualMenuGuid),
            or(eq(toastMenuGroups.groupGuid, g), eq(toastMenuGroups.name, g))
          ))
          .limit(1);
        if (found.length > 0) resolvedGroupGuids.push(found[0].groupGuid);
      }

      if (resolvedGroupGuids.length > 0) {
        groups = await db.select().from(toastMenuGroups)
          .where(and(eq(toastMenuGroups.menuGuid, actualMenuGuid), inArray(toastMenuGroups.groupGuid, resolvedGroupGuids)))
          .orderBy(toastMenuGroups.displayOrder);
      } else {
        // Fallback to all if none resolved
        groups = await db.select().from(toastMenuGroups)
          .where(eq(toastMenuGroups.menuGuid, actualMenuGuid))
          .orderBy(toastMenuGroups.displayOrder);
      }
    } else {
      groups = await db.select().from(toastMenuGroups)
        .where(eq(toastMenuGroups.menuGuid, actualMenuGuid))
        .orderBy(toastMenuGroups.displayOrder);
    }

    const allItems = await db.select().from(toastMenuItems)
      .where(eq(toastMenuItems.menuGuid, actualMenuGuid))
      .orderBy(toastMenuItems.displayOrder, toastMenuItems.name);

    const visibleItems = allItems.filter((i) => !i.hidden);

    const menuData = menu[0];
    const groupsWithItems = groups.map((g) => ({
      ...g,
      items: visibleItems.filter((i) => i.groupGuid === g.groupGuid),
    }));

    const formatPrice = (price: string | null) => {
      if (!price) return "";
      const num = parseFloat(price);
      return isNaN(num) ? "" : `$${num.toFixed(2)}`;
    };

    const escapeHtml = (str: string) =>
      str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    const sanitizeDescriptionHtml = (str: string) => {
      return str.replace(/<br\s*\/?>/gi, "___BR___")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
        .replace(/___BR___/g, "<br>");
    };

    const extractDietaryTags = (name: string): string[] => {
      const tags: string[] = [];
      const patterns = [
        { regex: /\(GF\)/i, label: "GF" },
        { regex: /\(V\)/i, label: "V" },
        { regex: /\(VG\)/i, label: "VG" },
        { regex: /\(DF\)/i, label: "DF" },
        { regex: /\(NF\)/i, label: "NF" },
        { regex: /gluten[- ]?free/i, label: "GF" },
        { regex: /vegan/i, label: "VG" },
        { regex: /vegetarian/i, label: "V" },
      ];
      for (const p of patterns) {
        if (p.regex.test(name)) tags.push(p.label);
      }
      const uniqueTags = [];
      const seen = new Set();
      for (const t of tags) {
        if (!seen.has(t)) {
          seen.add(t);
          uniqueTags.push(t);
        }
      }
      return uniqueTags;
    };

    const cleanItemName = (name: string): string => {
      return name.replace(/\s*\((GF|V|VG|DF|NF)\)\s*/gi, " ").trim();
    };

    let groupsHtml = "";
    for (const group of groupsWithItems) {
      if (group.items.length === 0) continue;
      let itemsHtml = "";
      for (const item of group.items) {
        const price = formatPrice(item.price);
        const dietaryTags = extractDietaryTags(item.name);
        const cleanName = cleanItemName(item.name);
        const tagsHtml = dietaryTags.length > 0
          ? `<span class="dietary-tags">${dietaryTags.map(t => `<span class="dietary-tag">${t}</span>`).join("")}</span>`
          : "";
        const pairingHtml = item.suggestedPairing
          ? `<p class="item-pairing">${escapeHtml(item.suggestedPairing)}</p>`
          : "";

        const showDesc = !hideDescriptions && item.description;
        const showPairing = (!hideDescriptions && !hideWinePairing) ? pairingHtml : "";
        const showPrice = !hidePricing;

        if (template === "beverage") {
          itemsHtml += `
            <div class="bev-item">
              <span class="bev-name">${escapeHtml(cleanName)}${tagsHtml}</span>
              ${showPrice && price ? `<span class="bev-price">${price}</span>` : ""}
            </div>`;
        } else if (template === "fine-dining") {
          itemsHtml += `
            <div class="menu-item">
              <h3 class="item-name">${escapeHtml(cleanName)}${tagsHtml}${showPrice && price ? ` <span class="item-price">${price}</span>` : ""}</h3>
              ${showDesc ? `<p class="item-description">${sanitizeDescriptionHtml(item.description!)}</p>` : ""}
              ${showPairing}
            </div>`;
        } else {
          itemsHtml += `
            <div class="menu-item">
              <div class="item-header">
                <span class="item-name">${escapeHtml(cleanName)}${tagsHtml}</span>
                ${showPrice && price ? `<span class="item-price">${price}</span>` : ""}
              </div>
              ${showDesc ? `<p class="item-description">${sanitizeDescriptionHtml(item.description!)}</p>` : ""}
              ${showPairing}
            </div>`;
        }
      }
      const hasPageBreak = pagebreakGuids.includes(group.groupGuid);
      if (template === "beverage") {
        groupsHtml += `
          <div class="bev-group${hasPageBreak ? " page-break" : ""}">
            <h2 class="bev-group-name">${escapeHtml(group.name)}</h2>
            ${itemsHtml}
          </div>`;
      } else {
        groupsHtml += `
          <div class="menu-group${hasPageBreak ? " page-break" : ""}">
            <h2 class="group-name">${escapeHtml(group.name)}</h2>
            <div class="group-divider"></div>
            ${itemsHtml}
          </div>`;
      }
    }

    const embedTitle = groupGuids.length === 1 && groups.length === 1
      ? groups[0].name
      : menuData.name;

    let css = "";
    const dietaryTagsCss = `
        .dietary-tags { margin-left: 6px; }
        .dietary-tag { display: inline-block; font-size: 0.65rem; font-weight: 600; letter-spacing: 0.05em; padding: 1px 5px; border-radius: 3px; margin-left: 3px; vertical-align: middle; }
    `;
    if (template === "fine-dining") {
      css = `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,600;1,400&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'EB Garamond', 'Georgia', serif; background: #1a1a18; color: #e8dcc8; min-height: 100vh; font-size: 18px; }
        .menu-container { max-width: 800px; margin: 0 auto; padding: 48px 32px; }
        .menu-title { font-family: 'Cormorant Garamond', serif; font-size: 2.8rem; font-weight: 700; text-align: center; letter-spacing: 0.15em; text-transform: uppercase; color: #d4b896; margin-bottom: 8px; }
        .menu-subtitle { text-align: center; font-size: 1.1rem; letter-spacing: 0.3em; text-transform: uppercase; color: #a08c6e; margin-bottom: 40px; }
        .ornament { text-align: center; font-size: 1.8rem; color: #a08c6e; margin: 32px 0; letter-spacing: 0.5em; }
        .menu-group { margin-bottom: 40px; }
        .group-name { font-family: 'Cormorant Garamond', serif; font-size: 1.7rem; font-weight: 600; text-align: center; letter-spacing: 0.2em; text-transform: uppercase; color: #d4b896; margin-bottom: 4px; }
        .group-divider { width: 60px; height: 1px; background: #a08c6e; margin: 8px auto 24px; }
        .menu-item { text-align: center; margin-bottom: 20px; }
        .item-name { font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #e8dcc8; }
        .item-price { font-weight: 400; color: #d4b896; margin-left: 8px; }
        .item-description { font-family: 'EB Garamond', serif; font-size: 1.1rem; color: #b8a890; margin-top: 4px; line-height: 1.5; max-width: 600px; margin-left: auto; margin-right: auto; }
        .item-pairing { font-family: 'EB Garamond', serif; font-size: 1.1rem; color: #a08c6e; margin-top: 4px; font-style: italic; }
        .item-pairing::before { content: "Suggested Pairings: "; font-weight: normal; }
        ${dietaryTagsCss}
        .dietary-tag { background: rgba(212, 184, 150, 0.15); color: #d4b896; border: 1px solid rgba(212, 184, 150, 0.3); font-size: 0.8rem; }
        .custom-header { text-align: center; font-size: 1rem; color: #a08c6e; font-style: italic; letter-spacing: 0.1em; margin-bottom: 12px; }
        .footer { text-align: center; margin-top: 48px; font-size: 0.9rem; color: #6b5f4f; letter-spacing: 0.1em; }
        .custom-footer { margin-top: 12px; font-size: 0.95rem; color: #a08c6e; font-style: italic; }
        .page-break { border-top: 2px dashed #a08c6e; padding-top: 32px; margin-top: 16px; position: relative; }
        .page-break::before { content: "PAGE BREAK"; position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #1a1a18; padding: 0 12px; font-size: 0.65rem; letter-spacing: 0.15em; color: #a08c6e; }
        @page { size: letter; margin: 0.3in 0.4in; }
        @media print { html { font-size: ${scale}%; } body { background: white; color: #1a1a18; display: flex; align-items: center; justify-content: center; min-height: 100vh; } .menu-title { font-size: 2rem; color: #1a1a18; margin-bottom: 4px; } .menu-subtitle { margin-bottom: 16px; } .group-name { font-size: 1.3rem; color: #1a1a18; } .item-name { font-size: 1.1rem; color: #1a1a18; } .item-description { color: #555; font-size: 0.95rem; } .item-price, .menu-subtitle, .ornament { color: #444; } .ornament { margin: 8px 0; font-size: 1.2rem; } .group-divider { background: #333; margin-bottom: 10px; } .item-pairing { color: #666; font-size: 0.95rem; } .dietary-tag { background: #f0f0f0; color: #333; border-color: #ccc; } .menu-container { padding: 8px 0; } .menu-group { margin-bottom: 14px; } .menu-item { margin-bottom: 6px; } .footer { margin-top: 12px; } .custom-footer { color: #555; } .page-break { page-break-before: always; break-before: page; border-top: none; padding-top: 0; margin-top: 0; } .page-break::before { display: none; } }
        @media (max-width: 600px) { .menu-container { padding: 24px 16px; } .menu-title { font-size: 1.8rem; } .group-name { font-size: 1.2rem; } }`;
    } else if (template === "beverage") {
      css = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #fff; color: #1c1917; min-height: 100vh; font-size: 14px; }
        .menu-container { max-width: 850px; margin: 0 auto; padding: 32px 24px; }
        .menu-title { font-size: 2rem; font-weight: 700; text-align: center; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; border-bottom: 2px solid #1c1917; padding-bottom: 8px; }
        .menu-subtitle { text-align: center; font-size: 0.85rem; color: #78716c; margin-bottom: 24px; }
        .bev-groups-container { column-count: 2; column-gap: 32px; }
        .bev-group { break-inside: avoid; margin-bottom: 20px; }
        .bev-group-name { font-size: 1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #1c1917; padding-bottom: 2px; margin-bottom: 6px; }
        .bev-item { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; padding: 1px 0; line-height: 1.4; }
        .bev-name { font-size: 0.85rem; font-weight: 400; }
        .bev-price { font-size: 0.85rem; font-weight: 500; white-space: nowrap; }
        ${dietaryTagsCss}
        .dietary-tag { background: #f0f0f0; color: #333; border: 1px solid #ddd; font-size: 0.6rem; }
        .footer { text-align: center; margin-top: 32px; font-size: 0.75rem; color: #a8a29e; }
        .custom-footer { margin-top: 8px; font-size: 0.8rem; color: #78716c; font-style: italic; }
        .page-break { border-top: 2px dashed #d6d3d1; padding-top: 16px; margin-top: 8px; position: relative; }
        .page-break::before { content: "PAGE BREAK"; position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #fff; padding: 0 12px; font-size: 0.65rem; letter-spacing: 0.15em; color: #a8a29e; }
        @page { size: letter; margin: 0.3in 0.4in; }
        @media print { html { font-size: ${scale}%; } body { display: flex; align-items: center; justify-content: center; min-height: 100vh; } .menu-container { padding: 4px 0; } .menu-title { font-size: 1.5rem; margin-bottom: 2px; padding-bottom: 4px; } .menu-subtitle { margin-bottom: 12px; } .bev-group { margin-bottom: 10px; } .bev-group-name { font-size: 0.85rem; margin-bottom: 3px; } .bev-item { padding: 0; line-height: 1.3; } .bev-name { font-size: 0.8rem; } .bev-price { font-size: 0.8rem; } .footer { margin-top: 8px; } .custom-footer { color: #555; } .page-break { page-break-before: always; break-before: page; border-top: none; padding-top: 0; margin-top: 0; } .page-break::before { display: none; } }
        @media (max-width: 600px) { .bev-groups-container { column-count: 1; } .menu-container { padding: 16px 12px; } }`;
    } else {
      css = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #fafaf9; color: #1c1917; min-height: 100vh; font-size: 16px; }
        .menu-container { max-width: 700px; margin: 0 auto; padding: 40px 24px; }
        .menu-title { font-size: 2.2rem; font-weight: 600; text-align: center; margin-bottom: 4px; }
        .menu-subtitle { text-align: center; font-size: 1rem; color: #78716c; margin-bottom: 32px; }
        .menu-group { margin-bottom: 32px; }
        .group-name { font-size: 1.3rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #44403c; margin-bottom: 4px; }
        .group-divider { width: 100%; height: 1px; background: #e7e5e4; margin-bottom: 16px; }
        .menu-item { padding: 10px 0; border-bottom: 1px solid #f5f5f4; }
        .item-header { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
        .item-name { font-weight: 500; font-size: 1.1rem; }
        .item-price { font-weight: 600; color: #44403c; white-space: nowrap; }
        .item-description { font-size: 1rem; color: #78716c; margin-top: 4px; line-height: 1.4; }
        .item-pairing { font-size: 1rem; color: #78716c; margin-top: 2px; font-style: italic; }
        .item-pairing::before { content: "Suggested Pairings: "; font-weight: normal; }
        ${dietaryTagsCss}
        .dietary-tag { background: #f5f5f4; color: #44403c; border: 1px solid #e7e5e4; font-size: 0.75rem; }
        .footer { text-align: center; margin-top: 40px; font-size: 0.85rem; color: #a8a29e; }
        .custom-footer { margin-top: 12px; font-size: 0.9rem; color: #78716c; font-style: italic; }
        .page-break { border-top: 2px dashed #d6d3d1; padding-top: 24px; margin-top: 12px; position: relative; }
        .page-break::before { content: "PAGE BREAK"; position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #fafaf9; padding: 0 12px; font-size: 0.65rem; letter-spacing: 0.15em; color: #a8a29e; }
        @page { size: letter; margin: 0.3in 0.4in; }
        @media print { html { font-size: ${scale}%; } body { display: flex; align-items: center; justify-content: center; min-height: 100vh; } .menu-container { padding: 8px 0; } .menu-title { font-size: 1.8rem; margin-bottom: 2px; } .menu-subtitle { margin-bottom: 16px; } .menu-group { margin-bottom: 14px; } .group-name { font-size: 1.1rem; margin-bottom: 2px; } .group-divider { margin-bottom: 8px; } .menu-item { padding: 4px 0; } .item-name { font-size: 1rem; } .item-description { font-size: 0.9rem; margin-top: 2px; } .item-pairing { font-size: 0.9rem; } .footer { margin-top: 12px; } .custom-footer { color: #555; } .page-break { page-break-before: always; break-before: page; border-top: none; padding-top: 0; margin-top: 0; } .page-break::before { display: none; } }
        @media (max-width: 600px) { .menu-container { padding: 20px 16px; } }`;
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(embedTitle)}</title>
  <style>${css}</style>
</head>
<body>
  <div class="menu-container">
    ${customHeader ? `<p class="custom-header">${escapeHtml(customHeader)}</p>` : ""}
    <h1 class="menu-title">${escapeHtml(embedTitle)}</h1>
    ${template === "fine-dining" ? `<div class="ornament">&mdash;</div>` : template === "beverage" ? `<p class="menu-subtitle">Beverage List</p>` : `<p class="menu-subtitle">Menu</p>`}
    ${template === "beverage" ? `<div class="bev-groups-container">${groupsHtml}</div>` : groupsHtml}
    <div class="footer">
      <p>Consumer Advisory: Consumption of undercooked meat, poultry, eggs, or seafood may increase the risk of food-borne illnesses.</p>
      <p>Alert your server if you have special dietary requirements.</p>
      ${customFooter ? `<p class="custom-footer">${escapeHtml(customFooter)}</p>` : ""}
    </div>
  </div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(html);
  } catch (error: any) {
    res.status(500).send("<html><body><p>Error loading menu</p></body></html>");
  }
});

router.get("/public/menus/embed", async (req, res) => {
  try {
    const menuGuidsParam = req.query.menus as string;
    if (!menuGuidsParam) {
      return res.status(400).send("<html><body><p>No menus specified</p></body></html>");
    }
    const menuIdentifiers = menuGuidsParam.split(",").map(g => g.trim()).filter(Boolean);
    if (menuIdentifiers.length === 0) {
      return res.status(400).send("<html><body><p>No menus specified</p></body></html>");
    }

    const template = (req.query.template as string) || "fine-dining";
    const rawScale = parseFloat(req.query.scale as string) || 100;
    const scale = Math.min(120, Math.max(60, rawScale));
    const rawPages = parseInt(req.query.pages as string) || 0;
    const pages = Math.min(10, Math.max(0, rawPages));
    const customHeader = (req.query.header as string) || "";
    const customFooter = (req.query.footer as string) || "";
    const pagebreaksParam = req.query.pagebreaks as string | undefined;
    const pagebreakGuids = pagebreaksParam ? pagebreaksParam.split(",").map(g => g.trim()).filter(Boolean) : [];
    const hideDescriptions = req.query.hidedesc === "1";
    const hidePricing = req.query.hideprice === "1";
    const hideWinePairing = req.query.hidepairing === "1";
    const customTitle = (req.query.title as string) || "";
    const groupGuidParam = req.query.groupGuid as string | undefined;
    const filterGroupGuids = groupGuidParam ? groupGuidParam.split(",").map(g => g.trim()).filter(Boolean) : [];

    const allGroups: { group: any; items: any[]; menuName: string }[] = [];
    const menuNames: string[] = [];

    for (const identifier of menuIdentifiers) {
      const menu = await db.select().from(toastMenus)
        .where(or(eq(toastMenus.menuGuid, identifier), eq(toastMenus.name, identifier)))
        .limit(1);
      if (menu.length === 0) continue;

      const actualMenuGuid = menu[0].menuGuid;
      menuNames.push(menu[0].name);

      const groups = await db.select().from(toastMenuGroups)
        .where(eq(toastMenuGroups.menuGuid, actualMenuGuid))
        .orderBy(toastMenuGroups.displayOrder);

      const items = await db.select().from(toastMenuItems)
        .where(eq(toastMenuItems.menuGuid, actualMenuGuid))
        .orderBy(toastMenuItems.displayOrder, toastMenuItems.name);

      const visibleItems = items.filter((i) => !i.hidden);

      for (const group of groups) {
        if (filterGroupGuids.length > 0 && !filterGroupGuids.includes(group.groupGuid)) continue;
        const groupItems = visibleItems.filter((i) => i.groupGuid === group.groupGuid);
        if (groupItems.length > 0) {
          allGroups.push({ group, items: groupItems, menuName: menu[0].name });
        }
      }
    }

    if (allGroups.length === 0) {
      return res.status(404).send("<html><body><p>No menu items found</p></body></html>");
    }

    const formatPrice = (price: string | null) => {
      if (!price) return "";
      const num = parseFloat(price);
      return isNaN(num) ? "" : `$${num.toFixed(2)}`;
    };

    const escapeHtml = (str: string) =>
      str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    const sanitizeDescriptionHtml = (str: string) => {
      return str.replace(/<br\s*\/?>/gi, "___BR___")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
        .replace(/___BR___/g, "<br>");
    };

    const extractDietaryTags = (name: string): string[] => {
      const tags: string[] = [];
      const patterns = [
        { regex: /\(GF\)/i, label: "GF" },
        { regex: /\(V\)/i, label: "V" },
        { regex: /\(VG\)/i, label: "VG" },
        { regex: /\(DF\)/i, label: "DF" },
        { regex: /\(NF\)/i, label: "NF" },
        { regex: /gluten[- ]?free/i, label: "GF" },
        { regex: /vegan/i, label: "VG" },
        { regex: /vegetarian/i, label: "V" },
      ];
      for (const p of patterns) {
        if (p.regex.test(name)) tags.push(p.label);
      }
      const seen = new Set<string>();
      return tags.filter(t => { if (seen.has(t)) return false; seen.add(t); return true; });
    };

    const cleanItemName = (name: string): string => {
      return name.replace(/\s*\((GF|V|VG|DF|NF)\)\s*/gi, " ").trim();
    };

    let groupsHtml = "";
    for (const { group, items } of allGroups) {
      let itemsHtml = "";
      for (const item of items) {
        const price = formatPrice(item.price);
        const dietaryTags = extractDietaryTags(item.name);
        const cleanName = cleanItemName(item.name);
        const tagsHtml = dietaryTags.length > 0
          ? `<span class="dietary-tags">${dietaryTags.map(t => `<span class="dietary-tag">${t}</span>`).join("")}</span>`
          : "";
        const pairingHtml = item.suggestedPairing
          ? `<p class="item-pairing">${escapeHtml(item.suggestedPairing)}</p>`
          : "";

        const showDesc = !hideDescriptions && item.description;
        const showPairing = (!hideDescriptions && !hideWinePairing) ? pairingHtml : "";
        const showPrice = !hidePricing;

        if (template === "beverage") {
          itemsHtml += `
            <div class="bev-item">
              <span class="bev-name">${escapeHtml(cleanName)}${tagsHtml}</span>
              ${showPrice && price ? `<span class="bev-price">${price}</span>` : ""}
            </div>`;
        } else if (template === "fine-dining") {
          itemsHtml += `
            <div class="menu-item">
              <h3 class="item-name">${escapeHtml(cleanName)}${tagsHtml}${showPrice && price ? ` <span class="item-price">${price}</span>` : ""}</h3>
              ${showDesc ? `<p class="item-description">${sanitizeDescriptionHtml(item.description!)}</p>` : ""}
              ${showPairing}
            </div>`;
        } else {
          itemsHtml += `
            <div class="menu-item">
              <div class="item-header">
                <span class="item-name">${escapeHtml(cleanName)}${tagsHtml}</span>
                ${showPrice && price ? `<span class="item-price">${price}</span>` : ""}
              </div>
              ${showDesc ? `<p class="item-description">${sanitizeDescriptionHtml(item.description!)}</p>` : ""}
              ${showPairing}
            </div>`;
        }
      }
      const hasPageBreak = pagebreakGuids.includes(group.groupGuid);
      if (template === "beverage") {
        groupsHtml += `
          <div class="bev-group${hasPageBreak ? " page-break" : ""}">
            <h2 class="bev-group-name">${escapeHtml(group.name)}</h2>
            ${itemsHtml}
          </div>`;
      } else {
        groupsHtml += `
          <div class="menu-group${hasPageBreak ? " page-break" : ""}">
            <h2 class="group-name">${escapeHtml(group.name)}</h2>
            <div class="group-divider"></div>
            ${itemsHtml}
          </div>`;
      }
    }

    const embedTitle = customTitle || (menuNames.length === 1 ? menuNames[0] : "Menu");

    const dietaryTagsCss = `
        .dietary-tags { margin-left: 6px; }
        .dietary-tag { display: inline-block; font-size: 0.65rem; font-weight: 600; letter-spacing: 0.05em; padding: 1px 5px; border-radius: 3px; margin-left: 3px; vertical-align: middle; }
    `;

    let css = "";
    if (template === "fine-dining") {
      css = `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,600;1,400&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'EB Garamond', 'Georgia', serif; background: #1a1a18; color: #e8dcc8; min-height: 100vh; font-size: 18px; }
        .menu-container { max-width: 800px; margin: 0 auto; padding: 48px 32px; }
        .menu-title { font-family: 'Cormorant Garamond', serif; font-size: 2.8rem; font-weight: 700; text-align: center; letter-spacing: 0.15em; text-transform: uppercase; color: #d4b896; margin-bottom: 8px; }
        .menu-subtitle { text-align: center; font-size: 1.1rem; letter-spacing: 0.3em; text-transform: uppercase; color: #a08c6e; margin-bottom: 40px; }
        .ornament { text-align: center; font-size: 1.8rem; color: #a08c6e; margin: 32px 0; letter-spacing: 0.5em; }
        .menu-group { margin-bottom: 40px; }
        .group-name { font-family: 'Cormorant Garamond', serif; font-size: 1.7rem; font-weight: 600; text-align: center; letter-spacing: 0.2em; text-transform: uppercase; color: #d4b896; margin-bottom: 4px; }
        .group-divider { width: 60px; height: 1px; background: #a08c6e; margin: 8px auto 24px; }
        .menu-item { text-align: center; margin-bottom: 20px; }
        .item-name { font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #e8dcc8; }
        .item-price { font-weight: 400; color: #d4b896; margin-left: 8px; }
        .item-description { font-family: 'EB Garamond', serif; font-size: 1.1rem; color: #b8a890; margin-top: 4px; line-height: 1.5; max-width: 600px; margin-left: auto; margin-right: auto; }
        .item-pairing { font-family: 'EB Garamond', serif; font-size: 1.1rem; color: #a08c6e; margin-top: 4px; font-style: italic; }
        .item-pairing::before { content: "Suggested Pairings: "; font-weight: normal; }
        ${dietaryTagsCss}
        .dietary-tag { background: rgba(212, 184, 150, 0.15); color: #d4b896; border: 1px solid rgba(212, 184, 150, 0.3); font-size: 0.8rem; }
        .custom-header { text-align: center; font-size: 1rem; color: #a08c6e; font-style: italic; letter-spacing: 0.1em; margin-bottom: 12px; }
        .footer { text-align: center; margin-top: 48px; font-size: 0.9rem; color: #6b5f4f; letter-spacing: 0.1em; }
        .custom-footer { margin-top: 12px; font-size: 0.95rem; color: #a08c6e; font-style: italic; }
        .page-break { border-top: 2px dashed #a08c6e; padding-top: 32px; margin-top: 16px; position: relative; }
        .page-break::before { content: "PAGE BREAK"; position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #1a1a18; padding: 0 12px; font-size: 0.65rem; letter-spacing: 0.15em; color: #a08c6e; }
        @page { size: letter; margin: 0.3in 0.4in; }
        @media print { html { font-size: ${scale}%; } body { background: white; color: #1a1a18; display: flex; align-items: center; justify-content: center; min-height: 100vh; } .menu-title { font-size: 2rem; color: #1a1a18; margin-bottom: 4px; } .menu-subtitle { margin-bottom: 16px; } .group-name { font-size: 1.3rem; color: #1a1a18; } .item-name { font-size: 1.1rem; color: #1a1a18; } .item-description { color: #555; font-size: 0.95rem; } .item-price, .menu-subtitle, .ornament { color: #444; } .ornament { margin: 8px 0; font-size: 1.2rem; } .group-divider { background: #333; margin-bottom: 10px; } .item-pairing { color: #666; font-size: 0.95rem; } .dietary-tag { background: #f0f0f0; color: #333; border-color: #ccc; } .menu-container { padding: 8px 0; } .menu-group { margin-bottom: 14px; } .menu-item { margin-bottom: 6px; } .footer { margin-top: 12px; } .custom-footer { color: #555; } .page-break { page-break-before: always; break-before: page; border-top: none; padding-top: 0; margin-top: 0; } .page-break::before { display: none; } }
        @media (max-width: 600px) { .menu-container { padding: 24px 16px; } .menu-title { font-size: 1.8rem; } .group-name { font-size: 1.2rem; } }`;
    } else if (template === "beverage") {
      css = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #fff; color: #1c1917; min-height: 100vh; font-size: 14px; }
        .menu-container { max-width: 850px; margin: 0 auto; padding: 32px 24px; }
        .menu-title { font-size: 2rem; font-weight: 700; text-align: center; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; border-bottom: 2px solid #1c1917; padding-bottom: 8px; }
        .menu-subtitle { text-align: center; font-size: 0.85rem; color: #78716c; margin-bottom: 24px; }
        .bev-groups-container { column-count: 2; column-gap: 32px; }
        .bev-group { break-inside: avoid; margin-bottom: 20px; }
        .bev-group-name { font-size: 1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #1c1917; padding-bottom: 2px; margin-bottom: 6px; }
        .bev-item { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; padding: 1px 0; line-height: 1.4; }
        .bev-name { font-size: 0.85rem; font-weight: 400; }
        .bev-price { font-size: 0.85rem; font-weight: 500; white-space: nowrap; }
        ${dietaryTagsCss}
        .dietary-tag { background: #f0f0f0; color: #333; border: 1px solid #ddd; font-size: 0.6rem; }
        .footer { text-align: center; margin-top: 32px; font-size: 0.75rem; color: #a8a29e; }
        .custom-footer { margin-top: 8px; font-size: 0.8rem; color: #78716c; font-style: italic; }
        .page-break { border-top: 2px dashed #d6d3d1; padding-top: 16px; margin-top: 8px; position: relative; }
        .page-break::before { content: "PAGE BREAK"; position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #fff; padding: 0 12px; font-size: 0.65rem; letter-spacing: 0.15em; color: #a8a29e; }
        @page { size: letter; margin: 0.3in 0.4in; }
        @media print { html { font-size: ${scale}%; } body { display: flex; align-items: center; justify-content: center; min-height: 100vh; } .menu-container { padding: 4px 0; } .menu-title { font-size: 1.5rem; margin-bottom: 2px; padding-bottom: 4px; } .menu-subtitle { margin-bottom: 12px; } .bev-group { margin-bottom: 10px; } .bev-group-name { font-size: 0.85rem; margin-bottom: 3px; } .bev-item { padding: 0; line-height: 1.3; } .bev-name { font-size: 0.8rem; } .bev-price { font-size: 0.8rem; } .footer { margin-top: 8px; } .custom-footer { color: #555; } .page-break { page-break-before: always; break-before: page; border-top: none; padding-top: 0; margin-top: 0; } .page-break::before { display: none; } }
        @media (max-width: 600px) { .bev-groups-container { column-count: 1; } .menu-container { padding: 16px 12px; } }`;
    } else {
      css = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #fafaf9; color: #1c1917; min-height: 100vh; font-size: 16px; }
        .menu-container { max-width: 700px; margin: 0 auto; padding: 40px 24px; }
        .menu-title { font-size: 2.2rem; font-weight: 600; text-align: center; margin-bottom: 4px; }
        .menu-subtitle { text-align: center; font-size: 1rem; color: #78716c; margin-bottom: 32px; }
        .menu-group { margin-bottom: 32px; }
        .group-name { font-size: 1.3rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #44403c; margin-bottom: 4px; }
        .group-divider { width: 100%; height: 1px; background: #e7e5e4; margin-bottom: 16px; }
        .menu-item { padding: 10px 0; border-bottom: 1px solid #f5f5f4; }
        .item-header { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
        .item-name { font-weight: 500; font-size: 1.1rem; }
        .item-price { font-weight: 600; color: #44403c; white-space: nowrap; }
        .item-description { font-size: 1rem; color: #78716c; margin-top: 4px; line-height: 1.4; }
        .item-pairing { font-size: 1rem; color: #78716c; margin-top: 2px; font-style: italic; }
        .item-pairing::before { content: "Suggested Pairings: "; font-weight: normal; }
        ${dietaryTagsCss}
        .dietary-tag { background: #f5f5f4; color: #44403c; border: 1px solid #e7e5e4; font-size: 0.75rem; }
        .footer { text-align: center; margin-top: 40px; font-size: 0.85rem; color: #a8a29e; }
        .custom-footer { margin-top: 12px; font-size: 0.9rem; color: #78716c; font-style: italic; }
        .page-break { border-top: 2px dashed #d6d3d1; padding-top: 24px; margin-top: 12px; position: relative; }
        .page-break::before { content: "PAGE BREAK"; position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #fafaf9; padding: 0 12px; font-size: 0.65rem; letter-spacing: 0.15em; color: #a8a29e; }
        @page { size: letter; margin: 0.3in 0.4in; }
        @media print { html { font-size: ${scale}%; } body { display: flex; align-items: center; justify-content: center; min-height: 100vh; } .menu-container { padding: 8px 0; } .menu-title { font-size: 1.8rem; margin-bottom: 2px; } .menu-subtitle { margin-bottom: 16px; } .menu-group { margin-bottom: 14px; } .group-name { font-size: 1.1rem; margin-bottom: 2px; } .group-divider { margin-bottom: 8px; } .menu-item { padding: 4px 0; } .item-name { font-size: 1rem; } .item-description { font-size: 0.9rem; margin-top: 2px; } .item-pairing { font-size: 0.9rem; } .footer { margin-top: 12px; } .custom-footer { color: #555; } .page-break { page-break-before: always; break-before: page; border-top: none; padding-top: 0; margin-top: 0; } .page-break::before { display: none; } }
        @media (max-width: 600px) { .menu-container { padding: 20px 16px; } }`;
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(embedTitle)}</title>
  <style>${css}</style>
</head>
<body>
  <div class="menu-container">
    ${customHeader ? `<p class="custom-header">${escapeHtml(customHeader)}</p>` : ""}
    <h1 class="menu-title">${escapeHtml(embedTitle)}</h1>
    ${template === "fine-dining" ? `<div class="ornament">&mdash;</div>` : template === "beverage" ? `<p class="menu-subtitle">Beverage List</p>` : `<p class="menu-subtitle">Menu</p>`}
    ${template === "beverage" ? `<div class="bev-groups-container">${groupsHtml}</div>` : groupsHtml}
    <div class="footer">
      <p>Consumer Advisory: Consumption of undercooked meat, poultry, eggs, or seafood may increase the risk of food-borne illnesses.</p>
      <p>Alert your server if you have special dietary requirements.</p>
      ${customFooter ? `<p class="custom-footer">${escapeHtml(customFooter)}</p>` : ""}
    </div>
  </div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(html);
  } catch (error: any) {
    res.status(500).send("<html><body><p>Error loading combined menu</p></body></html>");
  }
});

router.get("/public/menus", async (_req, res) => {
  try {
    const menus = await db.select().from(toastMenus).orderBy(toastMenus.name);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json(menus);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch menus" });
  }
});

export default router;
