import { db } from "../db";
import { toastGuests } from "@shared/schema";
import { sql, eq } from "drizzle-orm";

const TOAST_API_HOST = "https://ws-api.toasttab.com";

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

export async function getToastToken(): Promise<string> {
  const clientId = process.env.TOAST_CLIENT_ID;
  const clientSecret = process.env.TOAST_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Toast API credentials not configured");
  }

  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.accessToken;
  }

  const response = await fetch(`${TOAST_API_HOST}/authentication/v1/authentication/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId,
      clientSecret,
      userAccessType: "TOAST_MACHINE_CLIENT",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Toast auth failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const token = data.token;

  cachedToken = {
    accessToken: token.accessToken,
    expiresAt: Date.now() + (token.expiresIn || 86400) * 1000,
  };

  console.log("[Toast API] Authentication successful, token cached");
  return cachedToken.accessToken;
}

export async function toastApiRequest(path: string, restaurantGuid?: string): Promise<any> {
  const token = await getToastToken();
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (restaurantGuid) {
    headers["Toast-Restaurant-External-ID"] = restaurantGuid;
  }

  const response = await fetch(`${TOAST_API_HOST}${path}`, { headers });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Toast API error (${response.status}): ${text}`);
  }

  return response.json();
}

export async function getRestaurants(): Promise<any[]> {
  return toastApiRequest("/partners/v1/restaurants");
}

export async function getRestaurantInfo(restaurantGuid: string): Promise<any> {
  return toastApiRequest(`/config/v2/restaurants`, restaurantGuid);
}

export async function getMenus(restaurantGuid: string): Promise<any[]> {
  return toastApiRequest("/menus/v2/menus", restaurantGuid);
}

export async function getOrdersBulk(
  restaurantGuid: string,
  startDate: string,
  endDate: string,
  page?: number,
  pageSize: number = 100
): Promise<any> {
  let path = `/orders/v2/ordersBulk?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&pageSize=${pageSize}`;
  if (page !== undefined) {
    path += `&page=${page}`;
  }
  return toastApiRequest(path, restaurantGuid);
}

export async function getOrder(restaurantGuid: string, orderGuid: string): Promise<any> {
  return toastApiRequest(`/orders/v2/orders/${orderGuid}`, restaurantGuid);
}

export async function getOrdersByBusinessDate(
  restaurantGuid: string,
  businessDate: string,
  page?: number,
  pageSize: number = 100
): Promise<any> {
  const formattedDate = businessDate.replace(/-/g, '');
  let path = `/orders/v2/ordersBulk?businessDate=${formattedDate}&pageSize=${pageSize}`;
  if (page !== undefined) {
    path += `&page=${page}`;
  }
  return toastApiRequest(path, restaurantGuid);
}

const ACTIVITY_CATEGORY_RULES: Array<{ category: string; keywords: string[] }> = [
  {
    category: "Tasting Room",
    keywords: ["tasting", "flight", "wine tasting", "wine flight", "spirit tasting", "spirits tasting", "spirit flight", "beer tasting", "beer flight", "sample", "winery"],
  },
  {
    category: "Restaurant",
    keywords: ["burger", "steak", "salad", "sandwich", "soup", "appetizer", "entree", "dessert", "pizza", "pasta", "chicken", "fish", "lobster", "fries", "chowder", "wings", "nachos", "tacos", "flatbread", "risotto", "pork", "lamb", "shrimp", "scallop", "breakfast", "brunch", "lunch", "dinner"],
  },
  {
    category: "Brewery",
    keywords: ["ipa", "ale", "lager", "stout", "porter", "pilsner", "wheat beer", "hefeweizen", "draft beer", "pint", "growler", "crowler", "beer"],
  },
  {
    category: "Winery",
    keywords: ["wine", "chardonnay", "cabernet", "merlot", "pinot", "riesling", "sauvignon", "zinfandel", "rosé", "rose", "red blend", "white blend", "sparkling", "prosecco", "champagne", "bottle wine", "glass wine"],
  },
  {
    category: "Distillery",
    keywords: ["whiskey", "bourbon", "vodka", "gin", "rum", "brandy", "cognac", "tequila", "mezcal", "spirit", "cocktail", "martini", "margarita", "old fashioned", "manhattan", "negroni", "mojito", "daiquiri", "distillery"],
  },
  {
    category: "Events",
    keywords: ["event", "private", "party", "wedding", "banquet", "catering", "group", "reservation", "ticket", "admission", "concert", "festival", "music"],
  },
  {
    category: "Retail",
    keywords: ["merchandise", "gift", "t-shirt", "shirt", "hat", "mug", "glass", "bottle", "case", "pack", "6-pack", "12-pack", "to go", "take home", "retail"],
  },
];

export function categorizeOrderItems(order: any): string[] {
  const categories = new Set<string>();
  const checks = order.checks || [];

  for (const check of checks) {
    if (check.voided || check.deleted) continue;

    for (const selection of (check.selections || [])) {
      if (selection.voided) continue;
      const itemName = (selection.displayName || "").toLowerCase();
      if (!itemName) continue;

      for (const rule of ACTIVITY_CATEGORY_RULES) {
        if (rule.keywords.some(kw => itemName.includes(kw))) {
          categories.add(rule.category);
          break;
        }
      }
    }
  }

  const rawDiningOption = order.diningOption;
  const diningBehavior = (typeof rawDiningOption === "string" ? rawDiningOption : rawDiningOption?.behavior || rawDiningOption?.name || "").toUpperCase();
  if (diningBehavior === "DINE_IN" && categories.size === 0) {
    categories.add("Restaurant");
  }
  if (diningBehavior === "TAKE_OUT" && categories.size === 0) {
    categories.add("Retail");
  }

  return Array.from(categories);
}

function calculateNetSalesFromOrder(order: any): number {
  if (order.voided || order.deleted) return 0;

  let netSales = 0;
  const checks = order.checks || [];

  for (const check of checks) {
    if (check.voided || check.deleted) continue;

    let checkSales = 0;

    for (const selection of (check.selections || [])) {
      if (selection.voided) continue;
      const name = (selection.displayName || "").toLowerCase();
      if (name === "gift card") continue;
      if (name.includes("deposit")) continue;

      checkSales += selection.price || 0;
    }

    netSales += checkSales;
  }

  return netSales;
}

export async function fetchDailyRevenue(
  businessDate: string
): Promise<{ netSales: number; orderCount: number; locationBreakdown: Record<string, number> }> {
  const restaurants = await getRestaurants();
  let totalNetSales = 0;
  let totalOrderCount = 0;
  const locationBreakdown: Record<string, number> = {};

  for (const restaurant of restaurants) {
    const guid = restaurant.restaurantGuid;
    const name = restaurant.restaurantName || restaurant.locationName || guid;
    let locationSales = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const orders = await getOrdersByBusinessDate(guid, businessDate, page, 100);

        if (!Array.isArray(orders) || orders.length === 0) {
          hasMore = false;
          break;
        }

        for (const order of orders) {
          const orderNetSales = calculateNetSalesFromOrder(order);
          locationSales += orderNetSales;
          if (!order.voided && !order.deleted) {
            totalOrderCount++;
          }
        }

        page++;
        if (orders.length < 100) hasMore = false;
      } catch (err: any) {
        console.error(`[Toast Revenue] Error fetching orders for ${name} page ${page}:`, err.message);
        hasMore = false;
      }
    }

    locationBreakdown[name] = Math.round(locationSales * 100) / 100;
    totalNetSales += locationSales;
  }

  console.log(`[Toast Revenue] ${businessDate}: $${totalNetSales.toFixed(2)} net sales, ${totalOrderCount} orders`);

  return {
    netSales: Math.round(totalNetSales * 100) / 100,
    orderCount: totalOrderCount,
    locationBreakdown,
  };
}

function computeReactivationSegment(daysSinceLastVisit: number | null): string {
  if (daysSinceLastVisit === null) return "lost";
  if (daysSinceLastVisit <= 30) return "active";
  if (daysSinceLastVisit <= 60) return "at_risk";
  if (daysSinceLastVisit <= 120) return "lapsed";
  if (daysSinceLastVisit <= 365) return "dormant";
  return "lost";
}

export async function syncGuestFromOrder(order: any): Promise<{ created: boolean; updated: boolean; guestGuid: string | null }> {
  const checks = order.checks || [];
  let customer: any = null;

  for (const check of checks) {
    if (check.customer) {
      customer = check.customer;
      break;
    }
  }

  if (!customer) {
    return { created: false, updated: false, guestGuid: null };
  }

  const email = customer.email?.trim();
  const phone = customer.phone?.trim();
  const firstName = customer.firstName?.trim();
  const lastName = customer.lastName?.trim();

  if (!email && !phone) {
    return { created: false, updated: false, guestGuid: null };
  }

  const guestGuid = customer.guid || `order-${order.guid}`;

  const orderTotal = checks.reduce((sum: number, check: any) => {
    return sum + (check.totalAmount || 0);
  }, 0);

  const orderDate = order.closedDate || order.modifiedDate || order.createdDate;
  const parsedDate = orderDate ? new Date(orderDate) : new Date();

  const orderCategories = categorizeOrderItems(order);

  const existing = await db.execute(sql`
    SELECT * FROM toast_guests
    WHERE guest_guid = ${guestGuid}
    OR (email1 IS NOT NULL AND email1 != '' AND email1 = ${email || ''})
    OR (phone1 IS NOT NULL AND phone1 != '' AND phone1 = ${phone || ''})
    LIMIT 1
  `);

  if (existing.rows.length > 0) {
    const guest: any = existing.rows[0];
    const currentVisits = guest.total_visits || 0;
    const currentSpend = parseFloat(guest.lifetime_spend || "0");
    const newVisits = currentVisits + 1;
    const newSpend = currentSpend + orderTotal;
    const newAvgSpend = newVisits > 0 ? newSpend / newVisits : 0;

    const lastVisit = guest.last_visit_date ? new Date(guest.last_visit_date) : null;
    const newLastVisit = !lastVisit || parsedDate > lastVisit ? parsedDate : lastVisit;
    const daysSince = Math.floor((Date.now() - newLastVisit.getTime()) / (1000 * 60 * 60 * 24));

    const existingCategories = new Set<string>(
      (guest.activity_categories || "").split(";").filter((c: string) => c.trim())
    );
    for (const cat of orderCategories) {
      existingCategories.add(cat);
    }
    const mergedCategories = Array.from(existingCategories).join(";");

    await db.execute(sql`
      UPDATE toast_guests SET
        total_visits = ${newVisits},
        lifetime_spend = ${newSpend.toFixed(2)},
        average_spend = ${newAvgSpend.toFixed(2)},
        last_visit_date = ${newLastVisit},
        days_since_last_visit = ${daysSince},
        reactivation_segment = ${computeReactivationSegment(daysSince)},
        activity_categories = ${mergedCategories || null},
        first_name = COALESCE(NULLIF(${firstName || ""}, ''), first_name),
        last_name = COALESCE(NULLIF(${lastName || ""}, ''), last_name),
        email1 = COALESCE(NULLIF(${email || ""}, ''), email1),
        phone1 = COALESCE(NULLIF(${phone || ""}, ''), phone1),
        updated_at = NOW()
      WHERE id = ${guest.id}
    `);

    return { created: false, updated: true, guestGuid };
  }

  const daysSince = Math.floor((Date.now() - parsedDate.getTime()) / (1000 * 60 * 60 * 24));
  const categoriesStr = orderCategories.length > 0 ? orderCategories.join(";") : null;

  await db.execute(sql`
    INSERT INTO toast_guests (
      guest_guid, email1, phone1, first_name, last_name,
      first_visit_date, last_visit_date, total_visits,
      average_spend, lifetime_spend, days_since_last_visit,
      reactivation_segment, activity_categories, imported_at, updated_at
    ) VALUES (
      ${guestGuid}, ${email || null}, ${phone || null},
      ${firstName || null}, ${lastName || null},
      ${parsedDate}, ${parsedDate}, ${1},
      ${orderTotal.toFixed(2)}, ${orderTotal.toFixed(2)},
      ${daysSince}, ${computeReactivationSegment(daysSince)},
      ${categoriesStr},
      NOW(), NOW()
    )
    ON CONFLICT (guest_guid) DO UPDATE SET
      total_visits = toast_guests.total_visits + 1,
      lifetime_spend = (CAST(toast_guests.lifetime_spend AS NUMERIC) + ${orderTotal})::TEXT,
      last_visit_date = GREATEST(toast_guests.last_visit_date, ${parsedDate}),
      activity_categories = CASE
        WHEN toast_guests.activity_categories IS NULL THEN ${categoriesStr}
        WHEN ${categoriesStr} IS NULL THEN toast_guests.activity_categories
        ELSE toast_guests.activity_categories || ';' || ${categoriesStr}
      END,
      updated_at = NOW()
  `);

  return { created: true, updated: false, guestGuid };
}

export async function syncOrdersBatch(
  restaurantGuid: string,
  startDate: string,
  endDate: string
): Promise<{ synced: number; created: number; updated: number; errors: number }> {
  let synced = 0, created = 0, updated = 0, errors = 0;
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const orders = await getOrdersBulk(restaurantGuid, startDate, endDate, page, 100);

      if (!Array.isArray(orders) || orders.length === 0) {
        hasMore = false;
        break;
      }

      for (const order of orders) {
        try {
          const result = await syncGuestFromOrder(order);
          if (result.guestGuid) {
            synced++;
            if (result.created) created++;
            if (result.updated) updated++;
          }
        } catch (err: any) {
          errors++;
          console.error(`[Toast Sync] Error syncing order ${order.guid}:`, err.message);
        }
      }

      page++;
      if (orders.length < 100) hasMore = false;
    } catch (err: any) {
      console.error(`[Toast Sync] Error fetching page ${page}:`, err.message);
      hasMore = false;
      errors++;
    }
  }

  return { synced, created, updated, errors };
}

export async function refreshSegments(): Promise<number> {
  const result = await db.execute(sql`
    UPDATE toast_guests SET
      days_since_last_visit = CASE
        WHEN last_visit_date IS NOT NULL THEN
          EXTRACT(DAY FROM NOW() - last_visit_date)::INTEGER
        ELSE NULL
      END,
      reactivation_segment = CASE
        WHEN last_visit_date IS NULL THEN 'lost'
        WHEN EXTRACT(DAY FROM NOW() - last_visit_date) <= 30 THEN 'active'
        WHEN EXTRACT(DAY FROM NOW() - last_visit_date) <= 60 THEN 'at_risk'
        WHEN EXTRACT(DAY FROM NOW() - last_visit_date) <= 120 THEN 'lapsed'
        WHEN EXTRACT(DAY FROM NOW() - last_visit_date) <= 365 THEN 'dormant'
        ELSE 'lost'
      END,
      updated_at = NOW()
    WHERE last_visit_date IS NOT NULL
  `);

  return result.rowCount || 0;
}
