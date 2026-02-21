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

export async function fetchRevenueCenters(restaurantGuid: string): Promise<any[]> {
  try {
    const result = await toastApiRequest("/config/v2/revenueCenters", restaurantGuid);
    return Array.isArray(result) ? result : [];
  } catch (err: any) {
    console.error(`[Toast Config] Error fetching revenue centers:`, err.message);
    return [];
  }
}

export async function fetchSalesCategories(restaurantGuid: string): Promise<any[]> {
  try {
    const result = await toastApiRequest("/config/v2/salesCategories", restaurantGuid);
    return Array.isArray(result) ? result : [];
  } catch (err: any) {
    console.error(`[Toast Config] Error fetching sales categories:`, err.message);
    return [];
  }
}

export async function syncToastConfig(restaurantGuid: string): Promise<{
  revenueCenters: Map<string, string>;
  salesCategories: Map<string, string>;
}> {
  const revCenters = await fetchRevenueCenters(restaurantGuid);
  const salesCats = await fetchSalesCategories(restaurantGuid);

  const revCenterMap = new Map<string, string>();
  const salesCatMap = new Map<string, string>();

  for (const rc of revCenters) {
    const guid = rc.guid;
    const name = rc.name || "Unknown";
    revCenterMap.set(guid, name);
    await db.execute(sql`
      INSERT INTO rcc_revenue_centers (guid, name, restaurant_guid, updated_at)
      VALUES (${guid}, ${name}, ${restaurantGuid}, NOW())
      ON CONFLICT (guid) DO UPDATE SET name = ${name}, updated_at = NOW()
    `);
  }

  for (const sc of salesCats) {
    const guid = sc.guid;
    const name = sc.name || "Unknown";
    salesCatMap.set(guid, name);
    await db.execute(sql`
      INSERT INTO rcc_sales_categories (guid, name, restaurant_guid, updated_at)
      VALUES (${guid}, ${name}, ${restaurantGuid}, NOW())
      ON CONFLICT (guid) DO UPDATE SET name = ${name}, updated_at = NOW()
    `);
  }

  console.log(`[Toast Config] Synced ${revCenterMap.size} revenue centers, ${salesCatMap.size} sales categories for ${restaurantGuid}`);
  return { revenueCenters: revCenterMap, salesCategories: salesCatMap };
}

export interface VoidDiscountRecord {
  recordType: 'void' | 'discount';
  level: 'order' | 'check' | 'item';
  orderGuid: string | null;
  orderNumber: string | null;
  checkGuid: string | null;
  itemName: string | null;
  itemGuid: string | null;
  amount: number;
  discountName: string | null;
  discountType: string | null;
  discountReasonName: string | null;
  discountReasonComment: string | null;
  voidReasonGuid: string | null;
  approverGuid: string | null;
  serverGuid: string | null;
  revenueCenterName: string | null;
  restaurantGuid: string | null;
  restaurantName: string | null;
  occurredAt: string | null;
}

export interface RevenueDetailResult {
  netSales: number;
  grossSales: number;
  totalDiscounts: number;
  totalServiceCharges: number;
  totalVoidAmount: number;
  totalVoidCount: number;
  orderCount: number;
  locationBreakdown: Record<string, number>;
  revenueCenterBreakdown: Array<{ guid: string | null; name: string; netSales: number; grossSales: number; discountAmount: number; serviceChargeAmount: number; orderCount: number }>;
  salesCategoryBreakdown: Array<{ guid: string | null; name: string; netSales: number; grossSales: number; discountAmount: number; itemCount: number }>;
  itemSales: Array<{
    itemName: string;
    itemGuid: string | null;
    salesCategoryGuid: string | null;
    salesCategoryName: string | null;
    revenueCenterGuid: string | null;
    revenueCenterName: string | null;
    quantity: number;
    netSales: number;
  }>;
  voidDiscountDetails: VoidDiscountRecord[];
}

export async function fetchDailyRevenueDetail(
  businessDate: string
): Promise<RevenueDetailResult> {
  const restaurants = await getRestaurants();
  let totalNetSales = 0;
  let totalGrossSales = 0;
  let totalDiscounts = 0;
  let totalServiceCharges = 0;
  let totalVoidAmount = 0;
  let totalVoidCount = 0;
  let totalOrderCount = 0;
  const locationBreakdown: Record<string, number> = {};
  const revCenterAgg: Record<string, { guid: string | null; name: string; netSales: number; grossSales: number; discountAmount: number; serviceChargeAmount: number; orderCount: number }> = {};
  const salesCatAgg: Record<string, { guid: string | null; name: string; netSales: number; grossSales: number; discountAmount: number; itemCount: number }> = {};
  const itemAgg: Record<string, {
    itemName: string; itemGuid: string | null;
    salesCategoryGuid: string | null; salesCategoryName: string | null;
    revenueCenterGuid: string | null; revenueCenterName: string | null;
    quantity: number; netSales: number;
  }> = {};

  const voidDiscountDetails: VoidDiscountRecord[] = [];

  for (const restaurant of restaurants) {
    const guid = restaurant.restaurantGuid;
    const name = restaurant.restaurantName || restaurant.locationName || guid;

    const { revenueCenters: revCenterMap, salesCategories: salesCatMap } = await syncToastConfig(guid);

    let locationSales = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const orders = await getOrdersByBusinessDate(guid, businessDate, page, 100);
        if (!Array.isArray(orders) || orders.length === 0) { hasMore = false; break; }

        for (const order of orders) {
          const orderServerGuid = order.server?.guid || null;
          const orderRevCenterNameForVD = order.revenueCenter?.guid
            ? (revCenterMap.get(order.revenueCenter.guid) || "Unknown")
            : "Uncategorized";

          if (order.voided || order.deleted) {
            let voidEstimate = 0;
            const voidItemNames: string[] = [];
            for (const vCheck of (order.checks || [])) {
              if (vCheck.totalAmount) {
                voidEstimate += Math.abs(vCheck.totalAmount);
              } else {
                for (const vSel of (vCheck.selections || [])) {
                  const vPrice = vSel.preDiscountPrice != null ? vSel.preDiscountPrice : (vSel.price || 0) * (vSel.quantity || 1);
                  voidEstimate += vPrice;
                  if (vSel.displayName) voidItemNames.push(vSel.displayName);
                }
              }
            }
            if (voidEstimate > 0) {
              totalVoidAmount += voidEstimate;
              totalVoidCount++;
              voidDiscountDetails.push({
                recordType: 'void',
                level: 'order',
                orderGuid: order.guid || null,
                orderNumber: order.displayNumber || null,
                checkGuid: null,
                itemName: voidItemNames.length > 0 ? voidItemNames.join(', ') : null,
                itemGuid: null,
                amount: Math.round(voidEstimate * 100) / 100,
                discountName: null,
                discountType: null,
                discountReasonName: null,
                discountReasonComment: null,
                voidReasonGuid: null,
                approverGuid: null,
                serverGuid: orderServerGuid,
                revenueCenterName: orderRevCenterNameForVD,
                restaurantGuid: guid,
                restaurantName: name,
                occurredAt: order.voidDate || order.modifiedDate || null,
              });
            }
            continue;
          }

          const orderRevCenterGuid = order.revenueCenter?.guid || null;
          const orderRevCenterName = orderRevCenterGuid ? (revCenterMap.get(orderRevCenterGuid) || "Unknown") : "Uncategorized";

          let orderGrossSales = 0;
          let orderItemDiscounts = 0;
          let orderCheckDiscounts = 0;
          let orderServiceCharges = 0;
          const checks = order.checks || [];

          for (const check of checks) {
            if (check.voided || check.deleted) {
              const voidVal = check.totalAmount ? Math.abs(check.totalAmount) : 0;
              if (voidVal > 0) {
                totalVoidAmount += voidVal;
                totalVoidCount++;
                const checkVoidItems: string[] = [];
                for (const vSel of (check.selections || [])) {
                  if (vSel.displayName) checkVoidItems.push(vSel.displayName);
                }
                voidDiscountDetails.push({
                  recordType: 'void',
                  level: 'check',
                  orderGuid: order.guid || null,
                  orderNumber: order.displayNumber || null,
                  checkGuid: check.guid || null,
                  itemName: checkVoidItems.length > 0 ? checkVoidItems.join(', ') : null,
                  itemGuid: null,
                  amount: Math.round(voidVal * 100) / 100,
                  discountName: null,
                  discountType: null,
                  discountReasonName: null,
                  discountReasonComment: null,
                  voidReasonGuid: null,
                  approverGuid: null,
                  serverGuid: orderServerGuid,
                  revenueCenterName: orderRevCenterNameForVD,
                  restaurantGuid: guid,
                  restaurantName: name,
                  occurredAt: check.voidDate || check.modifiedDate || null,
                });
              }
              continue;
            }

            let checkGrossSales = 0;
            let checkItemDiscounts = 0;

            for (const selection of (check.selections || [])) {
              if (selection.voided) {
                const voidItemVal = selection.preDiscountPrice != null ? selection.preDiscountPrice : (selection.price || 0) * (selection.quantity || 1);
                if (voidItemVal > 0) {
                  totalVoidAmount += voidItemVal;
                  totalVoidCount++;
                  voidDiscountDetails.push({
                    recordType: 'void',
                    level: 'item',
                    orderGuid: order.guid || null,
                    orderNumber: order.displayNumber || null,
                    checkGuid: check.guid || null,
                    itemName: selection.displayName || null,
                    itemGuid: selection.item?.guid || selection.guid || null,
                    amount: Math.round(voidItemVal * 100) / 100,
                    discountName: null,
                    discountType: null,
                    discountReasonName: null,
                    discountReasonComment: null,
                    voidReasonGuid: selection.voidReason?.guid || null,
                    approverGuid: null,
                    serverGuid: orderServerGuid,
                    revenueCenterName: orderRevCenterNameForVD,
                    restaurantGuid: guid,
                    restaurantName: name,
                    occurredAt: selection.voidDate || null,
                  });
                }
                continue;
              }
              const itemName = selection.displayName || "Unknown Item";
              if (itemName.toLowerCase() === "gift card" || itemName.toLowerCase().includes("deposit")) continue;

              const qty = selection.quantity || 1;
              const preDiscountPrice = selection.preDiscountPrice != null ? selection.preDiscountPrice : (selection.price || 0) * qty;

              let itemDiscount = 0;
              if (Array.isArray(selection.appliedDiscounts)) {
                for (const disc of selection.appliedDiscounts) {
                  if (disc.processingState === 'VOID' || disc.processingState === 'PENDING_VOID') continue;
                  const discAmt = (disc.nonTaxableDiscountAmount || disc.discountAmount || 0);
                  itemDiscount += discAmt;
                  if (discAmt > 0) {
                    voidDiscountDetails.push({
                      recordType: 'discount',
                      level: 'item',
                      orderGuid: order.guid || null,
                      orderNumber: order.displayNumber || null,
                      checkGuid: check.guid || null,
                      itemName: selection.displayName || null,
                      itemGuid: selection.item?.guid || selection.guid || null,
                      amount: Math.round(discAmt * 100) / 100,
                      discountName: disc.name || null,
                      discountType: disc.discountType || null,
                      discountReasonName: disc.appliedDiscountReason?.name || null,
                      discountReasonComment: disc.appliedDiscountReason?.comment || null,
                      voidReasonGuid: null,
                      approverGuid: disc.approver?.guid || null,
                      serverGuid: orderServerGuid,
                      revenueCenterName: orderRevCenterNameForVD,
                      restaurantGuid: guid,
                      restaurantName: name,
                      occurredAt: order.modifiedDate || order.createdDate || null,
                    });
                  }
                }
              }

              const lineSales = preDiscountPrice - itemDiscount;

              checkGrossSales += preDiscountPrice;
              checkItemDiscounts += itemDiscount;

              const selCatGuid = selection.salesCategory?.guid || null;
              const selCatName = selCatGuid ? (salesCatMap.get(selCatGuid) || "Unknown") : "Uncategorized";
              const selItemGuid = selection.item?.guid || selection.guid || null;

              const catKey = selCatGuid || "uncategorized";
              if (!salesCatAgg[catKey]) {
                salesCatAgg[catKey] = { guid: selCatGuid, name: selCatName, netSales: 0, grossSales: 0, discountAmount: 0, itemCount: 0 };
              }
              salesCatAgg[catKey].netSales += lineSales;
              salesCatAgg[catKey].grossSales += preDiscountPrice;
              salesCatAgg[catKey].discountAmount += itemDiscount;
              salesCatAgg[catKey].itemCount += qty;

              const itemKey = `${itemName}|${selCatGuid || ""}|${orderRevCenterGuid || ""}`;
              if (!itemAgg[itemKey]) {
                itemAgg[itemKey] = {
                  itemName, itemGuid: selItemGuid,
                  salesCategoryGuid: selCatGuid, salesCategoryName: selCatName,
                  revenueCenterGuid: orderRevCenterGuid, revenueCenterName: orderRevCenterName,
                  quantity: 0, netSales: 0,
                };
              }
              itemAgg[itemKey].quantity += qty;
              itemAgg[itemKey].netSales += lineSales;
            }

            let checkLevelDiscount = 0;
            if (Array.isArray(check.appliedDiscounts)) {
              for (const disc of check.appliedDiscounts) {
                if (disc.processingState === 'VOID' || disc.processingState === 'PENDING_VOID') continue;
                const checkDiscAmt = (disc.nonTaxableDiscountAmount || disc.discountAmount || 0);
                checkLevelDiscount += checkDiscAmt;
                if (checkDiscAmt > 0) {
                  voidDiscountDetails.push({
                    recordType: 'discount',
                    level: 'check',
                    orderGuid: order.guid || null,
                    orderNumber: order.displayNumber || null,
                    checkGuid: check.guid || null,
                    itemName: null,
                    itemGuid: null,
                    amount: Math.round(checkDiscAmt * 100) / 100,
                    discountName: disc.name || null,
                    discountType: disc.discountType || null,
                    discountReasonName: disc.appliedDiscountReason?.name || null,
                    discountReasonComment: disc.appliedDiscountReason?.comment || null,
                    voidReasonGuid: null,
                    approverGuid: disc.approver?.guid || null,
                    serverGuid: orderServerGuid,
                    revenueCenterName: orderRevCenterNameForVD,
                    restaurantGuid: guid,
                    restaurantName: name,
                    occurredAt: order.modifiedDate || order.createdDate || null,
                  });
                }
              }
            }

            let serviceCharges = 0;
            if (Array.isArray(check.appliedServiceCharges)) {
              for (const sc of check.appliedServiceCharges) {
                if (sc.voided) continue;
                if (sc.gratuity) continue;
                serviceCharges += (sc.chargeAmount || 0);
              }
            }

            orderGrossSales += checkGrossSales;
            orderItemDiscounts += checkItemDiscounts;
            orderCheckDiscounts += checkLevelDiscount;
            orderServiceCharges += serviceCharges;

            if (checkLevelDiscount > 0 && checkGrossSales > 0) {
              for (const selection of (check.selections || [])) {
                if (selection.voided) continue;
                const selItemName = selection.displayName || "Unknown Item";
                if (selItemName.toLowerCase() === "gift card" || selItemName.toLowerCase().includes("deposit")) continue;

                const selPreDiscount = selection.preDiscountPrice != null ? selection.preDiscountPrice : (selection.price || 0) * (selection.quantity || 1);
                if (selPreDiscount <= 0) continue;

                const proportion = selPreDiscount / checkGrossSales;
                const allocatedCheckDiscount = checkLevelDiscount * proportion;

                const selCatGuid2 = selection.salesCategory?.guid || null;
                const catKey2 = selCatGuid2 || "uncategorized";
                if (salesCatAgg[catKey2]) {
                  salesCatAgg[catKey2].netSales -= allocatedCheckDiscount;
                  salesCatAgg[catKey2].discountAmount += allocatedCheckDiscount;
                }

                const selRevCenterGuid = orderRevCenterGuid;
                const itemKey2 = `${selItemName}|${selCatGuid2 || ""}|${selRevCenterGuid || ""}`;
                if (itemAgg[itemKey2]) {
                  itemAgg[itemKey2].netSales -= allocatedCheckDiscount;
                }
              }
            }
          }

          const orderTotalDiscounts = orderItemDiscounts + orderCheckDiscounts;
          const orderNetSales = orderGrossSales - orderTotalDiscounts + orderServiceCharges;

          const rcKey = orderRevCenterGuid || "uncategorized";
          if (!revCenterAgg[rcKey]) {
            revCenterAgg[rcKey] = { guid: orderRevCenterGuid, name: orderRevCenterName, netSales: 0, grossSales: 0, discountAmount: 0, serviceChargeAmount: 0, orderCount: 0 };
          }
          revCenterAgg[rcKey].netSales += orderNetSales;
          revCenterAgg[rcKey].grossSales += orderGrossSales;
          revCenterAgg[rcKey].discountAmount += orderTotalDiscounts;
          revCenterAgg[rcKey].serviceChargeAmount += orderServiceCharges;
          revCenterAgg[rcKey].orderCount += 1;

          locationSales += orderNetSales;
          totalGrossSales += orderGrossSales;
          totalDiscounts += orderTotalDiscounts;
          totalServiceCharges += orderServiceCharges;
          totalOrderCount++;
        }

        page++;
        if (orders.length < 100) hasMore = false;
      } catch (err: any) {
        console.error(`[Toast Revenue Detail] Error fetching orders for ${name} page ${page}:`, err.message);
        hasMore = false;
      }
    }

    locationBreakdown[name] = Math.round(locationSales * 100) / 100;
    totalNetSales += locationSales;
  }

  const round = (n: number) => Math.round(n * 100) / 100;

  console.log(`[Toast Revenue Detail] ${businessDate}: $${round(totalNetSales).toFixed(2)} net ($${round(totalGrossSales).toFixed(2)} gross - $${round(totalDiscounts).toFixed(2)} discounts + $${round(totalServiceCharges).toFixed(2)} svc charges), voids: $${round(totalVoidAmount).toFixed(2)} (${totalVoidCount}), ${totalOrderCount} orders, ${Object.keys(revCenterAgg).length} centers, ${Object.keys(salesCatAgg).length} categories, ${Object.keys(itemAgg).length} items`);

  return {
    netSales: round(totalNetSales),
    grossSales: round(totalGrossSales),
    totalDiscounts: round(totalDiscounts),
    totalServiceCharges: round(totalServiceCharges),
    totalVoidAmount: round(totalVoidAmount),
    totalVoidCount,
    orderCount: totalOrderCount,
    locationBreakdown,
    revenueCenterBreakdown: Object.values(revCenterAgg).map(r => ({ ...r, netSales: round(r.netSales), grossSales: round(r.grossSales), discountAmount: round(r.discountAmount), serviceChargeAmount: round(r.serviceChargeAmount) })),
    salesCategoryBreakdown: Object.values(salesCatAgg).map(c => ({ ...c, netSales: round(c.netSales), grossSales: round(c.grossSales), discountAmount: round(c.discountAmount) })),
    itemSales: Object.values(itemAgg).map(i => ({ ...i, netSales: round(i.netSales) })),
    voidDiscountDetails,
  };
}

export async function syncToastRevenueDetailToDb(businessDate: string): Promise<RevenueDetailResult> {
  const detail = await fetchDailyRevenueDetail(businessDate);

  await db.execute(sql`DELETE FROM rcc_daily_revenue_by_center WHERE date = ${businessDate} AND source = 'toast'`);
  await db.execute(sql`DELETE FROM rcc_daily_revenue_by_category WHERE date = ${businessDate} AND source = 'toast'`);
  await db.execute(sql`DELETE FROM rcc_daily_item_sales WHERE date = ${businessDate} AND source = 'toast'`);

  for (const rc of detail.revenueCenterBreakdown) {
    await db.execute(sql`
      INSERT INTO rcc_daily_revenue_by_center (date, source, revenue_center_guid, revenue_center_name, net_sales, gross_sales, discount_amount, service_charge_amount, order_count)
      VALUES (${businessDate}, 'toast', ${rc.guid}, ${rc.name}, ${rc.netSales.toFixed(2)}, ${rc.grossSales.toFixed(2)}, ${rc.discountAmount.toFixed(2)}, ${rc.serviceChargeAmount.toFixed(2)}, ${rc.orderCount})
    `);
  }

  for (const sc of detail.salesCategoryBreakdown) {
    await db.execute(sql`
      INSERT INTO rcc_daily_revenue_by_category (date, source, sales_category_guid, sales_category_name, net_sales, gross_sales, discount_amount, item_count)
      VALUES (${businessDate}, 'toast', ${sc.guid}, ${sc.name}, ${sc.netSales.toFixed(2)}, ${sc.grossSales.toFixed(2)}, ${sc.discountAmount.toFixed(2)}, ${sc.itemCount})
    `);
  }

  for (const item of detail.itemSales) {
    await db.execute(sql`
      INSERT INTO rcc_daily_item_sales (date, source, item_name, item_guid, sales_category_guid, sales_category_name, revenue_center_guid, revenue_center_name, quantity, net_sales)
      VALUES (${businessDate}, 'toast', ${item.itemName}, ${item.itemGuid}, ${item.salesCategoryGuid}, ${item.salesCategoryName}, ${item.revenueCenterGuid}, ${item.revenueCenterName}, ${item.quantity}, ${item.netSales.toFixed(2)})
    `);
  }

  const existingIds = new Set<number>();
  for (const vd of detail.voidDiscountDetails) {
    const existing = await db.execute(sql`
      SELECT id FROM toast_void_discount_details
      WHERE date = ${businessDate}
        AND COALESCE(order_guid, '') = ${vd.orderGuid || ''}
        AND COALESCE(check_guid, '') = ${vd.checkGuid || ''}
        AND COALESCE(item_guid, '') = ${vd.itemGuid || ''}
        AND record_type = ${vd.recordType}
        AND level = ${vd.level}
        AND COALESCE(discount_name, '') = ${vd.discountName || ''}
      LIMIT 1
    `);

    if (existing.rows.length > 0) {
      const existingId = (existing.rows[0] as any).id;
      existingIds.add(existingId);
      await db.execute(sql`
        UPDATE toast_void_discount_details SET
          order_number = ${vd.orderNumber},
          item_name = ${vd.itemName},
          amount = ${vd.amount.toFixed(2)},
          discount_type = ${vd.discountType},
          discount_reason_name = ${vd.discountReasonName},
          discount_reason_comment = ${vd.discountReasonComment},
          void_reason_guid = ${vd.voidReasonGuid},
          approver_guid = ${vd.approverGuid},
          server_guid = ${vd.serverGuid},
          revenue_center_name = ${vd.revenueCenterName},
          restaurant_guid = ${vd.restaurantGuid},
          restaurant_name = ${vd.restaurantName},
          occurred_at = ${vd.occurredAt}
        WHERE id = ${existingId}
      `);
    } else {
      const inserted = await db.execute(sql`
        INSERT INTO toast_void_discount_details (date, record_type, level, order_guid, order_number, check_guid, item_name, item_guid, amount, discount_name, discount_type, discount_reason_name, discount_reason_comment, void_reason_guid, approver_guid, server_guid, revenue_center_name, restaurant_guid, restaurant_name, occurred_at)
        VALUES (${businessDate}, ${vd.recordType}, ${vd.level}, ${vd.orderGuid}, ${vd.orderNumber}, ${vd.checkGuid}, ${vd.itemName}, ${vd.itemGuid}, ${vd.amount.toFixed(2)}, ${vd.discountName}, ${vd.discountType}, ${vd.discountReasonName}, ${vd.discountReasonComment}, ${vd.voidReasonGuid}, ${vd.approverGuid}, ${vd.serverGuid}, ${vd.revenueCenterName}, ${vd.restaurantGuid}, ${vd.restaurantName}, ${vd.occurredAt})
        RETURNING id
      `);
      if (inserted.rows.length > 0) existingIds.add((inserted.rows[0] as any).id);
    }
  }

  if (existingIds.size > 0) {
    const idsArray = Array.from(existingIds);
    await db.execute(sql`
      DELETE FROM toast_void_explanations WHERE void_detail_id IN (
        SELECT id FROM toast_void_discount_details WHERE date = ${businessDate} AND id != ALL(${idsArray}::int[])
      )
    `);
    await db.execute(sql`
      DELETE FROM toast_void_discount_details WHERE date = ${businessDate} AND id != ALL(${idsArray}::int[])
    `);
  } else if (detail.voidDiscountDetails.length === 0) {
    await db.execute(sql`
      DELETE FROM toast_void_explanations WHERE void_detail_id IN (
        SELECT id FROM toast_void_discount_details WHERE date = ${businessDate}
      )
    `);
    await db.execute(sql`DELETE FROM toast_void_discount_details WHERE date = ${businessDate}`);
  }

  console.log(`[Toast Void/Discount Details] ${businessDate}: ${detail.voidDiscountDetails.filter(v => v.recordType === 'void').length} voids, ${detail.voidDiscountDetails.filter(v => v.recordType === 'discount').length} discounts stored (preserved existing explanations)`);

  const discountPct = detail.grossSales > 0 ? (detail.totalDiscounts / detail.grossSales) * 100 : 0;
  const round = (n: number) => Math.round(n * 100) / 100;

  await db.execute(sql`
    UPDATE rcc_daily_revenue SET
      toast_gross_sales = ${detail.grossSales.toFixed(2)},
      toast_discount_amount = ${detail.totalDiscounts.toFixed(2)},
      toast_discount_pct = ${round(discountPct).toFixed(2)},
      toast_void_amount = ${detail.totalVoidAmount.toFixed(2)},
      toast_void_count = ${detail.totalVoidCount},
      toast_service_charges = ${detail.totalServiceCharges.toFixed(2)}
    WHERE date = ${businessDate}
  `);

  return detail;
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
