import { db } from "../db";
import { sql } from "drizzle-orm";

const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || "2025-10";

export class ShopifyNotInstalledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShopifyNotInstalledError";
  }
}

let shopifyUnavailableUntil: number = 0;

export function isShopifyAvailable(): boolean {
  if (Date.now() < shopifyUnavailableUntil) {
    return false;
  }
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  return !!(storeDomain && accessToken);
}

export async function getShopifyToken(): Promise<string> {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!storeDomain) {
    throw new ShopifyNotInstalledError("SHOPIFY_STORE_DOMAIN not configured");
  }

  if (!accessToken) {
    throw new ShopifyNotInstalledError(
      "SHOPIFY_ACCESS_TOKEN not configured. Set a Shopify Admin API access token for this environment."
    );
  }

  return accessToken;
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

  const dateObj = new Date(dateStr + 'T12:00:00Z');
  const year = dateObj.getUTCFullYear();
  const dayOfWeek = dateObj.getUTCDay();
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const weekOfYear = Math.ceil(((dateObj.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getUTCDay() + 1) / 7);

  await db.execute(sql`
    INSERT INTO rcc_toast_historical_revenue (year, revenue_date, net_revenue, shopify_revenue, day_of_week, week_of_year)
    VALUES (${year}, ${dateStr}, '0', ${netSales.toFixed(2)}, ${dayOfWeek}, ${weekOfYear})
    ON CONFLICT (revenue_date) DO UPDATE SET shopify_revenue = ${netSales.toFixed(2)}
  `);

  return { netSales, orderCount };
}

async function getProductMetadata(productId: string): Promise<{ productType: string; vendor: string } | null> {
  const cached = await db.execute(sql`
    SELECT product_type, vendor FROM shopify_product_cache WHERE product_id = ${productId}
  `);
  if (cached.rows.length > 0) {
    return { productType: (cached.rows[0] as any).product_type || "", vendor: (cached.rows[0] as any).vendor || "" };
  }

  try {
    const result = await shopifyApiRequest(`/products/${productId}.json`, { fields: "id,title,product_type,vendor,tags" });
    const product = result.product;
    if (product) {
      await db.execute(sql`
        INSERT INTO shopify_product_cache (product_id, title, product_type, vendor, updated_at)
        VALUES (${productId}, ${product.title || ""}, ${product.product_type || ""}, ${product.vendor || ""}, NOW())
        ON CONFLICT (product_id) DO UPDATE SET
          title = ${product.title || ""}, product_type = ${product.product_type || ""},
          vendor = ${product.vendor || ""}, updated_at = NOW()
      `);
      return { productType: product.product_type || "", vendor: product.vendor || "" };
    }
  } catch (err: any) {
    console.error(`[Shopify Product] Error fetching product ${productId}:`, err.message);
  }
  return null;
}

export interface ShopifyRevenueDetailResult {
  netSales: number;
  orderCount: number;
  salesCategoryBreakdown: Array<{ name: string; netSales: number; itemCount: number }>;
  itemSales: Array<{
    itemName: string;
    productId: string | null;
    variantId: string | null;
    productType: string | null;
    vendor: string | null;
    quantity: number;
    netSales: number;
  }>;
}

export async function fetchDailyShopifyRevenueDetail(dateStr: string): Promise<ShopifyRevenueDetailResult> {
  const orders = await fetchAllShopifyOrdersByDate(dateStr);

  let netSales = 0;
  let validOrderCount = 0;
  const catAgg: Record<string, { name: string; netSales: number; itemCount: number }> = {};
  const itemAgg: Record<string, {
    itemName: string; productId: string | null; variantId: string | null;
    productType: string | null; vendor: string | null;
    quantity: number; netSales: number;
  }> = {};

  for (const order of orders) {
    if (order.cancelled_at) continue;
    if (order.financial_status === "voided" || order.financial_status === "refunded") continue;

    validOrderCount++;

    for (const item of (order.line_items || [])) {
      const itemPrice = parseFloat(item.price || "0") * (item.quantity || 1);
      const discountPerItem = parseFloat(item.total_discount || "0");
      const lineNetSales = itemPrice - discountPerItem;
      netSales += lineNetSales;

      const productId = item.product_id ? String(item.product_id) : null;
      const variantId = item.variant_id ? String(item.variant_id) : null;
      let productType = item.product_type || "";
      let vendor = item.vendor || "";

      if (productId && (!productType && !vendor)) {
        const meta = await getProductMetadata(productId);
        if (meta) {
          productType = meta.productType;
          vendor = meta.vendor;
        }
      } else if (productId) {
        db.execute(sql`
          INSERT INTO shopify_product_cache (product_id, title, product_type, vendor, updated_at)
          VALUES (${productId}, ${item.title || ""}, ${productType}, ${vendor}, NOW())
          ON CONFLICT (product_id) DO UPDATE SET
            title = ${item.title || ""}, product_type = ${productType},
            vendor = ${vendor}, updated_at = NOW()
        `).catch(() => {});
      }

      const catName = productType || vendor || "Uncategorized";
      if (!catAgg[catName]) {
        catAgg[catName] = { name: catName, netSales: 0, itemCount: 0 };
      }
      catAgg[catName].netSales += lineNetSales;
      catAgg[catName].itemCount += (item.quantity || 1);

      const itemKey = `${item.title || "Unknown"}|${productId || ""}|${variantId || ""}`;
      if (!itemAgg[itemKey]) {
        itemAgg[itemKey] = {
          itemName: item.title || "Unknown", productId, variantId,
          productType: productType || null, vendor: vendor || null,
          quantity: 0, netSales: 0,
        };
      }
      itemAgg[itemKey].quantity += (item.quantity || 1);
      itemAgg[itemKey].netSales += lineNetSales;
    }
  }

  const round = (n: number) => Math.round(n * 100) / 100;
  netSales = round(netSales);

  console.log(`[Shopify Revenue Detail] ${dateStr}: $${netSales.toFixed(2)} net, ${validOrderCount} orders, ${Object.keys(catAgg).length} categories, ${Object.keys(itemAgg).length} items`);

  return {
    netSales,
    orderCount: validOrderCount,
    salesCategoryBreakdown: Object.values(catAgg).map(c => ({ ...c, netSales: round(c.netSales) })),
    itemSales: Object.values(itemAgg).map(i => ({ ...i, netSales: round(i.netSales) })),
  };
}

export async function syncShopifyRevenueDetailToDb(dateStr: string): Promise<ShopifyRevenueDetailResult> {
  const detail = await fetchDailyShopifyRevenueDetail(dateStr);

  await db.execute(sql`DELETE FROM rcc_daily_revenue_by_category WHERE date = ${dateStr} AND source = 'shopify'`);
  await db.execute(sql`DELETE FROM rcc_daily_item_sales WHERE date = ${dateStr} AND source = 'shopify'`);

  for (const sc of detail.salesCategoryBreakdown) {
    await db.execute(sql`
      INSERT INTO rcc_daily_revenue_by_category (date, source, sales_category_name, net_sales, item_count)
      VALUES (${dateStr}, 'shopify', ${sc.name}, ${sc.netSales.toFixed(2)}, ${sc.itemCount})
    `);
  }

  for (const item of detail.itemSales) {
    await db.execute(sql`
      INSERT INTO rcc_daily_item_sales (date, source, item_name, product_id, variant_id, product_type, vendor, quantity, net_sales)
      VALUES (${dateStr}, 'shopify', ${item.itemName}, ${item.productId}, ${item.variantId}, ${item.productType}, ${item.vendor}, ${item.quantity}, ${item.netSales.toFixed(2)})
    `);
  }

  await db.execute(sql`
    UPDATE rcc_daily_revenue SET shopify_revenue = ${detail.netSales.toFixed(2)} WHERE date = ${dateStr}
  `);

  return detail;
}

const SHOPIFY_CATEGORY_RULES: Array<{ category: string; keywords: string[] }> = [
  {
    category: "Winery",
    keywords: ["wine", "chardonnay", "cabernet", "merlot", "pinot", "riesling", "sauvignon", "zinfandel", "rosé", "rose", "red blend", "white blend", "sparkling", "prosecco", "champagne", "vidal", "noiret", "frontenac", "marquette", "seyval"],
  },
  {
    category: "Brewery",
    keywords: ["beer", "ipa", "ale", "lager", "stout", "porter", "pilsner", "hefeweizen", "growler", "crowler", "pint"],
  },
  {
    category: "Distillery",
    keywords: ["whiskey", "bourbon", "vodka", "gin", "rum", "brandy", "spirit", "liquor", "cordial", "apple brandy", "grappa"],
  },
  {
    category: "Retail",
    keywords: ["merchandise", "gift", "shirt", "hat", "mug", "glass", "candle", "soap", "jam", "jelly", "syrup", "sauce", "honey", "cheese", "snack", "accessory", "apparel"],
  },
  {
    category: "Tasting Room",
    keywords: ["tasting", "flight", "sample", "tour"],
  },
  {
    category: "Events",
    keywords: ["event", "ticket", "admission", "festival", "concert", "party", "wedding"],
  },
];

export function categorizeShopifyLineItems(lineItems: any[]): string[] {
  const categories = new Set<string>();

  for (const item of lineItems) {
    const title = (item.title || "").toLowerCase();
    const productType = (item.product_type || "").toLowerCase();
    const vendor = (item.vendor || "").toLowerCase();

    const searchText = `${title} ${productType} ${vendor}`;

    for (const rule of SHOPIFY_CATEGORY_RULES) {
      if (rule.keywords.some(kw => searchText.includes(kw))) {
        categories.add(rule.category);
        break;
      }
    }
  }

  return Array.from(categories);
}

export async function fetchCustomerOrders(customerId: number | string, limit: number = 50): Promise<any[]> {
  try {
    const result = await shopifyApiRequest(`/customers/${customerId}/orders.json`, {
      limit: limit.toString(),
      status: "any",
      fields: "id,line_items,created_at,financial_status,cancelled_at",
    });
    return result.orders || [];
  } catch (err: any) {
    console.error(`[Shopify] Error fetching orders for customer ${customerId}:`, err.message);
    return [];
  }
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
