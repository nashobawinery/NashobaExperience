import { db } from "./db";
import { sql } from "drizzle-orm";
import { getRestaurants, syncOrdersBatch, refreshSegments } from "./reactivation/toast-api";
import { fetchAllShopifyCustomers, isShopifyAvailable, shopifyApiRequest, categorizeShopifyLineItems } from "./shopify/shopify-api";

async function runToastCustomerSync(): Promise<{ synced: number; created: number; updated: number; errors: number }> {
  try {
    const restaurants = await getRestaurants();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const startDate = yesterday.toISOString().split("T")[0] + "T00:00:00.000+0000";
    const endDate = yesterday.toISOString().split("T")[0] + "T23:59:59.999+0000";

    let totalResult = { synced: 0, created: 0, updated: 0, errors: 0 };

    for (const restaurant of restaurants) {
      try {
        const result = await syncOrdersBatch(restaurant.restaurantGuid, startDate, endDate);
        totalResult.synced += result.synced;
        totalResult.created += result.created;
        totalResult.updated += result.updated;
        totalResult.errors += result.errors;
      } catch (err: any) {
        console.error(`[Nightly Sync] Toast sync error for ${restaurant.restaurantName}:`, err.message);
        totalResult.errors++;
      }
    }

    console.log(`[Nightly Sync] Toast customer sync complete:`, totalResult);
    return totalResult;
  } catch (err: any) {
    console.error("[Nightly Sync] Toast sync failed:", err.message);
    return { synced: 0, created: 0, updated: 0, errors: 1 };
  }
}

async function runShopifyCustomerSync(): Promise<{ imported: number; updated: number; merged: number }> {
  if (!isShopifyAvailable()) {
    console.log("[Nightly Sync] Shopify not configured, skipping");
    return { imported: 0, updated: 0, merged: 0 };
  }

  try {
    const customers = await fetchAllShopifyCustomers();

    const customerCategoryMap = new Map<number, Set<string>>();
    try {
      let hasMoreOrders = true;
      let orderPage = 0;
      const maxPages = 10;
      let nextPageUrl: string | null = null;

      while (hasMoreOrders && orderPage < maxPages) {
        let result: any;
        if (nextPageUrl) {
          const { getShopifyToken } = await import("./shopify/shopify-api");
          const token = await getShopifyToken();
          const resp = await fetch(nextPageUrl, {
            headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
          });
          const linkHeader = resp.headers.get("link");
          result = await resp.json();
          result._nextPageUrl = null;
          if (linkHeader) {
            const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
            if (nextMatch) result._nextPageUrl = nextMatch[1];
          }
        } else {
          result = await shopifyApiRequest("/orders.json", {
            limit: "250",
            status: "any",
            fields: "id,customer,line_items,financial_status,cancelled_at",
          });
        }

        const orders = result.orders || [];
        if (orders.length === 0) break;

        for (const order of orders) {
          if (order.cancelled_at || order.financial_status === "voided" || order.financial_status === "refunded") continue;
          const custId = order.customer?.id;
          if (!custId) continue;
          const cats = categorizeShopifyLineItems(order.line_items || []);
          if (!customerCategoryMap.has(custId)) customerCategoryMap.set(custId, new Set());
          for (const c of cats) customerCategoryMap.get(custId)!.add(c);
        }

        nextPageUrl = result._nextPageUrl || null;
        if (!nextPageUrl) hasMoreOrders = false;
        orderPage++;
      }
    } catch (catErr: any) {
      console.error("[Nightly Sync] Error building Shopify category map:", catErr.message);
    }

    let imported = 0, updated = 0, merged = 0;

    for (const customer of customers) {
      const email = customer.email?.trim()?.toLowerCase();
      const phone = customer.phone?.trim();
      const firstName = customer.first_name?.trim();
      const lastName = customer.last_name?.trim();
      if (!email && !phone) continue;

      const guestGuid = `shopify-${customer.id}`;
      const totalSpent = parseFloat(customer.total_spent || "0");
      const ordersCount = customer.orders_count || 0;
      const avgSpend = ordersCount > 0 ? totalSpent / ordersCount : 0;
      const lastOrderDate = customer.updated_at ? new Date(customer.updated_at) : null;
      const daysSince = lastOrderDate ? Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)) : null;

      let segment = "lost";
      if (daysSince !== null) {
        if (daysSince <= 30) segment = "active";
        else if (daysSince <= 60) segment = "at_risk";
        else if (daysSince <= 120) segment = "lapsed";
        else if (daysSince <= 365) segment = "dormant";
      }

      const shopifyCustCategories = customerCategoryMap.get(customer.id);
      const categoriesStr = shopifyCustCategories && shopifyCustCategories.size > 0
        ? Array.from(shopifyCustCategories).join(";") : null;

      try {
        const existing = await db.execute(sql`SELECT id, activity_categories FROM toast_guests WHERE guest_guid = ${guestGuid}`);

        if (existing.rows.length > 0) {
          const existingCats = ((existing.rows[0] as any).activity_categories || "").split(";").filter((c: string) => c.trim());
          const mergedCats = new Set<string>(existingCats);
          if (shopifyCustCategories) for (const c of shopifyCustCategories) mergedCats.add(c);
          const finalCats = mergedCats.size > 0 ? Array.from(mergedCats).join(";") : null;

          await db.execute(sql`
            UPDATE toast_guests SET
              email1 = COALESCE(NULLIF(${email || ""}, ''), email1),
              phone1 = COALESCE(NULLIF(${phone || ""}, ''), phone1),
              first_name = COALESCE(NULLIF(${firstName || ""}, ''), first_name),
              last_name = COALESCE(NULLIF(${lastName || ""}, ''), last_name),
              total_visits = ${ordersCount}, lifetime_spend = ${totalSpent.toFixed(2)},
              average_spend = ${avgSpend.toFixed(2)}, days_since_last_visit = ${daysSince},
              reactivation_segment = ${segment}, activity_categories = ${finalCats},
              source = 'shopify', updated_at = NOW()
            WHERE guest_guid = ${guestGuid}
          `);
          updated++;
        } else {
          const insertResult = await db.execute(sql`
            INSERT INTO toast_guests (
              guest_guid, email1, phone1, first_name, last_name,
              first_visit_date, last_visit_date, total_visits,
              average_spend, lifetime_spend, days_since_last_visit,
              reactivation_segment, activity_categories, source, imported_at, updated_at
            ) VALUES (
              ${guestGuid}, ${email || null}, ${phone || null},
              ${firstName || null}, ${lastName || null},
              ${customer.created_at ? new Date(customer.created_at) : new Date()},
              ${lastOrderDate || new Date()}, ${ordersCount},
              ${avgSpend.toFixed(2)}, ${totalSpent.toFixed(2)},
              ${daysSince}, ${segment}, ${categoriesStr}, 'shopify', NOW(), NOW()
            )
            ON CONFLICT (guest_guid) DO UPDATE SET
              total_visits = ${ordersCount}, lifetime_spend = ${totalSpent.toFixed(2)},
              average_spend = ${avgSpend.toFixed(2)},
              activity_categories = COALESCE(${categoriesStr}, toast_guests.activity_categories),
              source = 'shopify', updated_at = NOW()
            RETURNING id
          `);
          imported++;
        }

        if (email) {
          const toastMatch = await db.execute(sql`
            SELECT id FROM toast_guests WHERE LOWER(email1) = ${email} AND source = 'toast' LIMIT 1
          `);
          if (toastMatch.rows.length > 0) {
            const toastGuestId = (toastMatch.rows[0] as any).id;
            const shopifyGuestId = existing.rows.length > 0 ? (existing.rows[0] as any).id : null;
            if (shopifyGuestId) {
              const existingLink = await db.execute(sql`SELECT canonical_id FROM customer_identity_links WHERE guest_id = ${shopifyGuestId}`);
              if (existingLink.rows.length === 0) {
                merged++;
              }
            }
          }
        }
      } catch (err: any) {
        console.error(`[Nightly Sync] Error syncing Shopify customer ${customer.id}:`, err.message);
      }
    }

    console.log(`[Nightly Sync] Shopify customer sync: ${imported} imported, ${updated} updated, ${merged} new merges`);
    return { imported, updated, merged };
  } catch (err: any) {
    console.error("[Nightly Sync] Shopify sync failed:", err.message);
    return { imported: 0, updated: 0, merged: 0 };
  }
}

async function runNightlySync() {
  const startTime = Date.now();
  console.log("[Nightly Sync] Starting nightly sync...");

  await db.execute(sql`
    INSERT INTO rcc_sync_log (sync_type, status, started_at)
    VALUES ('nightly_auto', 'running', NOW())
    ON CONFLICT DO NOTHING
  `).catch(() => {});

  const toastResult = await runToastCustomerSync();
  const shopifyResult = await runShopifyCustomerSync();
  const segmentsUpdated = await refreshSegments();

  const elapsed = Math.round((Date.now() - startTime) / 1000);

  console.log(`[Nightly Sync] Complete in ${elapsed}s - Toast: ${toastResult.synced} synced, Shopify: ${shopifyResult.imported + shopifyResult.updated} processed, Segments: ${segmentsUpdated} refreshed`);

  await db.execute(sql`
    INSERT INTO rcc_sync_log (sync_type, status, started_at, completed_at, toast_synced, shopify_synced, segments_refreshed)
    VALUES ('nightly_auto', 'completed', ${new Date(startTime)}, NOW(), ${toastResult.synced}, ${shopifyResult.imported + shopifyResult.updated}, ${segmentsUpdated})
  `).catch((err) => {
    console.error("[Nightly Sync] Error logging sync:", err.message);
  });
}

function scheduleNightlySync() {
  const scheduleNext = () => {
    const now = new Date();
    const target = new Date();
    target.setHours(2, 0, 0, 0);

    if (now >= target) {
      target.setDate(target.getDate() + 1);
    }

    const msUntilRun = target.getTime() - now.getTime();
    const hoursUntil = Math.round(msUntilRun / 3600000 * 10) / 10;

    console.log(`[Nightly Sync] Next sync scheduled for ${target.toLocaleString("en-US", { timeZone: "America/New_York" })} Eastern (in ${hoursUntil} hours)`);

    setTimeout(() => {
      runNightlySync()
        .then(() => scheduleNext())
        .catch((error) => {
          console.error("[Nightly Sync] Error in scheduled run:", error);
          scheduleNext();
        });
    }, msUntilRun);
  };

  scheduleNext();
  console.log("[Nightly Sync] Scheduler initialized - runs daily at 2:00 AM");
}

export { runNightlySync, scheduleNightlySync };
