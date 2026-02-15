import { db } from "../db";
import { sql } from "drizzle-orm";

const SHOPIFY_API_VERSION = "2026-01";

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

export async function getShopifyToken(): Promise<string> {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;

  if (!clientId || !clientSecret || !storeDomain) {
    throw new Error("Shopify API credentials not configured (SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET, SHOPIFY_STORE_DOMAIN)");
  }

  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.accessToken;
  }

  const response = await fetch(`https://${storeDomain}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify auth failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + 23 * 60 * 60 * 1000,
  };

  console.log("[Shopify API] Authentication successful, token cached");
  return cachedToken.accessToken;
}

export async function shopifyApiRequest(path: string, params?: Record<string, string>): Promise<any> {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  if (!storeDomain) throw new Error("SHOPIFY_STORE_DOMAIN not configured");

  const token = await getShopifyToken();
  let url = `https://${storeDomain}/admin/api/${SHOPIFY_API_VERSION}${path}`;

  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const response = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify API error (${response.status}): ${text}`);
  }

  const linkHeader = response.headers.get("link");
  const result = await response.json();
  result._nextPageUrl = null;

  if (linkHeader) {
    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    if (nextMatch) {
      result._nextPageUrl = nextMatch[1];
    }
  }

  return result;
}

async function shopifyApiRequestUrl(fullUrl: string): Promise<any> {
  const token = await getShopifyToken();

  const response = await fetch(fullUrl, {
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify API error (${response.status}): ${text}`);
  }

  const linkHeader = response.headers.get("link");
  const result = await response.json();
  result._nextPageUrl = null;

  if (linkHeader) {
    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    if (nextMatch) {
      result._nextPageUrl = nextMatch[1];
    }
  }

  return result;
}

export async function fetchShopifyOrdersByDate(
  dateStr: string
): Promise<{ orders: any[]; nextPageUrl: string | null }> {
  const startDate = `${dateStr}T00:00:00-05:00`;
  const endDate = `${dateStr}T23:59:59-05:00`;

  const result = await shopifyApiRequest("/orders.json", {
    created_at_min: startDate,
    created_at_max: endDate,
    status: "any",
    limit: "250",
    fields: "id,name,created_at,total_price,subtotal_price,financial_status,cancelled_at,customer,line_items,total_discounts,total_tax",
  });

  return { orders: result.orders || [], nextPageUrl: result._nextPageUrl };
}

async function fetchAllShopifyOrdersByDate(dateStr: string): Promise<any[]> {
  const allOrders: any[] = [];
  let result = await fetchShopifyOrdersByDate(dateStr);
  allOrders.push(...result.orders);

  while (result.nextPageUrl) {
    const nextResult = await shopifyApiRequestUrl(result.nextPageUrl);
    allOrders.push(...(nextResult.orders || []));
    result = { orders: nextResult.orders || [], nextPageUrl: nextResult._nextPageUrl };
  }

  return allOrders;
}

export async function fetchDailyShopifyRevenue(
  dateStr: string
): Promise<{ netSales: number; orderCount: number; orders: any[] }> {
  const orders = await fetchAllShopifyOrdersByDate(dateStr);

  let netSales = 0;
  let validOrderCount = 0;

  for (const order of orders) {
    if (order.cancelled_at) continue;
    if (order.financial_status === "voided" || order.financial_status === "refunded") continue;

    const subtotal = parseFloat(order.subtotal_price || "0");
    netSales += subtotal;
    validOrderCount++;
  }

  netSales = Math.round(netSales * 100) / 100;

  console.log(`[Shopify Revenue] ${dateStr}: $${netSales.toFixed(2)} net sales, ${validOrderCount} orders`);

  return {
    netSales,
    orderCount: validOrderCount,
    orders,
  };
}

export async function fetchShopifyCustomers(
  sinceId?: string,
  limit: number = 250
): Promise<{ customers: any[]; nextPageUrl: string | null }> {
  const params: Record<string, string> = {
    limit: limit.toString(),
    fields: "id,email,first_name,last_name,phone,orders_count,total_spent,created_at,updated_at,last_order_id,last_order_name,tags,note",
  };
  if (sinceId) {
    params.since_id = sinceId;
  }

  const result = await shopifyApiRequest("/customers.json", params);
  return { customers: result.customers || [], nextPageUrl: result._nextPageUrl };
}

export async function fetchAllShopifyCustomers(): Promise<any[]> {
  const allCustomers: any[] = [];
  let result = await fetchShopifyCustomers();
  allCustomers.push(...result.customers);

  while (result.nextPageUrl) {
    const nextResult = await shopifyApiRequestUrl(result.nextPageUrl);
    allCustomers.push(...(nextResult.customers || []));
    result = { customers: nextResult.customers || [], nextPageUrl: nextResult._nextPageUrl };
  }

  console.log(`[Shopify Customers] Fetched ${allCustomers.length} total customers`);
  return allCustomers;
}

export async function syncShopifyRevenueToDb(dateStr: string): Promise<{ netSales: number; orderCount: number }> {
  const { netSales, orderCount } = await fetchDailyShopifyRevenue(dateStr);

  await db.execute(sql`
    UPDATE rcc_daily_revenue
    SET shopify_revenue = ${netSales.toFixed(2)}
    WHERE date = ${dateStr}
  `);

  const year = parseInt(dateStr.split("-")[0]);
  const existing = await db.execute(sql`
    SELECT id FROM rcc_toast_historical_revenue
    WHERE revenue_date = ${dateStr}
  `);

  if (existing.rows.length > 0) {
    await db.execute(sql`
      UPDATE rcc_toast_historical_revenue
      SET shopify_revenue = ${netSales.toFixed(2)}
      WHERE revenue_date = ${dateStr}
    `);
  } else {
    await db.execute(sql`
      INSERT INTO rcc_toast_historical_revenue (year, revenue_date, net_revenue, shopify_revenue)
      VALUES (${year}, ${dateStr}, '0', ${netSales.toFixed(2)})
      ON CONFLICT (revenue_date) DO UPDATE SET shopify_revenue = ${netSales.toFixed(2)}
    `);
  }

  return { netSales, orderCount };
}

export async function getShopifyCustomerCount(): Promise<number> {
  const result = await shopifyApiRequest("/customers/count.json");
  return result.count || 0;
}

export async function getShopifyOrderCount(dateStr?: string): Promise<number> {
  const params: Record<string, string> = { status: "any" };
  if (dateStr) {
    params.created_at_min = `${dateStr}T00:00:00-05:00`;
    params.created_at_max = `${dateStr}T23:59:59-05:00`;
  }
  const result = await shopifyApiRequest("/orders/count.json", params);
  return result.count || 0;
}
