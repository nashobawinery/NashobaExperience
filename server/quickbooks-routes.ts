import { Router, Request, Response } from "express";
import axios from "axios";
import { db } from "./db";
import { qbConnection, qbCustomerMap, qbItemMap, qbSyncLog, qbInvoiceMap, b2bOrders, b2bOrderItems, b2bCustomers, products } from "@shared/schema";
import { eq, desc, and, isNull, sql } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

const QB_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const QB_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const QB_REVOKE_URL = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";
const QB_API_BASE_SANDBOX = "https://sandbox-quickbooks.api.intuit.com";
const QB_API_BASE_PROD = "https://quickbooks.api.intuit.com";
const QB_SCOPES = "com.intuit.quickbooks.accounting";

function getRedirectUri() {
  const base = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.REPL_SLUG
      ? `https://${process.env.REPL_SLUG}.replit.app`
      : "http://localhost:5000";
  return `${base}/api/quickbooks/callback`;
}

function getApiBase() {
  return process.env.QB_ENVIRONMENT === "production" ? QB_API_BASE_PROD : QB_API_BASE_SANDBOX;
}

async function getActiveConnection() {
  const [conn] = await db.select().from(qbConnection).where(eq(qbConnection.isActive, true)).limit(1);
  return conn || null;
}

async function refreshTokenIfNeeded(conn: typeof qbConnection.$inferSelect) {
  const now = new Date();
  const expiresAt = new Date(conn.accessTokenExpiresAt);
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return conn.accessToken;
  }

  try {
    const response = await axios.post(
      QB_TOKEN_URL,
      new URLSearchParams({ grant_type: "refresh_token", refresh_token: conn.refreshToken }),
      {
        auth: { username: process.env.QUICKBOOKS_CLIENT_ID!, password: process.env.QUICKBOOKS_CLIENT_SECRET! },
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      }
    );

    const accessTokenExpiresAt = new Date(Date.now() + response.data.expires_in * 1000);
    const refreshTokenExpiresAt = new Date(Date.now() + response.data.x_refresh_token_expires_in * 1000);

    await db.update(qbConnection).set({
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      updatedAt: new Date(),
    }).where(eq(qbConnection.id, conn.id));

    return response.data.access_token as string;
  } catch (error: any) {
    console.error("QB token refresh failed:", error.response?.data || error.message);
    throw new Error("Failed to refresh QuickBooks token. You may need to reconnect.");
  }
}

async function qbApiRequest(conn: typeof qbConnection.$inferSelect, endpoint: string, method = "GET", data?: any) {
  const accessToken = await refreshTokenIfNeeded(conn);
  const url = `${getApiBase()}/v3/company/${conn.realmId}${endpoint}`;

  try {
    const response = await axios({
      method,
      url,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      data,
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      const newToken = await refreshTokenIfNeeded({ ...conn, accessTokenExpiresAt: new Date(0) } as any);
      const retry = await axios({
        method,
        url,
        headers: { Authorization: `Bearer ${newToken}`, Accept: "application/json", "Content-Type": "application/json" },
        data,
      });
      return retry.data;
    }
    throw error;
  }
}

// ==================== OAuth Routes ====================

router.get("/api/quickbooks/connect", (req: Request, res: Response) => {
  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = getRedirectUri();
  const authUrl = `${QB_AUTH_URL}?client_id=${process.env.QUICKBOOKS_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(QB_SCOPES)}&state=${state}`;
  res.json({ authUrl, redirectUri });
});

router.get("/api/quickbooks/callback", async (req: Request, res: Response) => {
  const { code, realmId } = req.query;

  if (!code || !realmId) {
    return res.redirect("/command-center?qb=error&reason=missing_params");
  }

  try {
    const redirectUri = getRedirectUri();
    const response = await axios.post(
      QB_TOKEN_URL,
      new URLSearchParams({ grant_type: "authorization_code", code: code as string, redirect_uri: redirectUri }),
      {
        auth: { username: process.env.QUICKBOOKS_CLIENT_ID!, password: process.env.QUICKBOOKS_CLIENT_SECRET! },
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      }
    );

    const accessTokenExpiresAt = new Date(Date.now() + response.data.expires_in * 1000);
    const refreshTokenExpiresAt = new Date(Date.now() + response.data.x_refresh_token_expires_in * 1000);

    await db.delete(qbConnection).where(eq(qbConnection.isActive, true));

    const tempConn = {
      realmId: realmId as string,
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    };

    let companyName = null;
    try {
      const companyInfo = await axios.get(
        `${getApiBase()}/v3/company/${realmId}/companyinfo/${realmId}`,
        { headers: { Authorization: `Bearer ${response.data.access_token}`, Accept: "application/json" } }
      );
      companyName = companyInfo.data?.CompanyInfo?.CompanyName || null;
    } catch (e) {}

    await db.insert(qbConnection).values({
      realmId: realmId as string,
      companyName,
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      isActive: true,
    });

    res.redirect("/command-center?section=qb-sync&qb=connected");
  } catch (error: any) {
    console.error("QB OAuth callback error:", error.response?.data || error.message);
    res.redirect("/command-center?section=qb-sync&qb=error&reason=token_exchange_failed");
  }
});

router.get("/api/quickbooks/status", async (_req: Request, res: Response) => {
  try {
    const conn = await getActiveConnection();
    if (!conn) {
      return res.json({ connected: false });
    }

    const now = new Date();
    const refreshExpires = new Date(conn.refreshTokenExpiresAt);
    const daysUntilRefreshExpiry = Math.floor((refreshExpires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    res.json({
      connected: true,
      companyName: conn.companyName,
      realmId: conn.realmId,
      lastSyncAt: conn.lastSyncAt,
      connectedAt: conn.connectedAt,
      refreshTokenExpiresAt: conn.refreshTokenExpiresAt,
      daysUntilRefreshExpiry,
      needsReconnect: daysUntilRefreshExpiry < 7,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/quickbooks/disconnect", async (_req: Request, res: Response) => {
  try {
    const conn = await getActiveConnection();
    if (!conn) {
      return res.json({ success: true });
    }

    try {
      await axios.post(
        QB_REVOKE_URL,
        new URLSearchParams({ token: conn.refreshToken }),
        {
          auth: { username: process.env.QUICKBOOKS_CLIENT_ID!, password: process.env.QUICKBOOKS_CLIENT_SECRET! },
          headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        }
      );
    } catch (e) {}

    await db.update(qbConnection).set({ isActive: false, updatedAt: new Date() }).where(eq(qbConnection.id, conn.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Customer Mapping Routes ====================

router.get("/api/quickbooks/customers", async (_req: Request, res: Response) => {
  try {
    const mappings = await db.select({
      id: qbCustomerMap.id,
      qbCustomerId: qbCustomerMap.qbCustomerId,
      qbCustomerName: qbCustomerMap.qbCustomerName,
      b2bCustomerId: qbCustomerMap.b2bCustomerId,
      isAutoMatched: qbCustomerMap.isAutoMatched,
      isIgnored: qbCustomerMap.isIgnored,
      b2bCustomerName: b2bCustomers.accountName,
    })
    .from(qbCustomerMap)
    .leftJoin(b2bCustomers, eq(qbCustomerMap.b2bCustomerId, b2bCustomers.id))
    .orderBy(qbCustomerMap.qbCustomerName);

    res.json(mappings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/quickbooks/customers/sync", async (_req: Request, res: Response) => {
  try {
    const conn = await getActiveConnection();
    if (!conn) return res.status(400).json({ error: "QuickBooks not connected" });

    const result = await qbApiRequest(conn, "/query?query=" + encodeURIComponent("SELECT * FROM Customer MAXRESULTS 1000"));
    const qbCustomers = result?.QueryResponse?.Customer || [];

    const existingB2b = await db.select().from(b2bCustomers);
    const existingMaps = await db.select().from(qbCustomerMap);

    let newMapped = 0;
    for (const qbCust of qbCustomers) {
      const existing = existingMaps.find(m => m.qbCustomerId === String(qbCust.Id));
      if (existing) continue;

      const nameMatch = existingB2b.find(b =>
        b.accountName.toLowerCase().trim() === (qbCust.DisplayName || qbCust.CompanyName || "").toLowerCase().trim()
      );

      await db.insert(qbCustomerMap).values({
        qbCustomerId: String(qbCust.Id),
        qbCustomerName: qbCust.DisplayName || qbCust.CompanyName || qbCust.FullyQualifiedName || "Unknown",
        b2bCustomerId: nameMatch?.id || null,
        isAutoMatched: !!nameMatch,
      });
      if (nameMatch) newMapped++;
    }

    res.json({ total: qbCustomers.length, newMapped, alreadyMapped: existingMaps.length });
  } catch (error: any) {
    console.error("QB customer sync error:", error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

router.patch("/api/quickbooks/customers/:id", async (req: Request, res: Response) => {
  try {
    const { b2bCustomerId, isIgnored } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (b2bCustomerId !== undefined) {
      updates.b2bCustomerId = b2bCustomerId || null;
      updates.isAutoMatched = false;
    }
    if (isIgnored !== undefined) updates.isIgnored = isIgnored;

    await db.update(qbCustomerMap).set(updates).where(eq(qbCustomerMap.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Item Mapping Routes ====================

router.get("/api/quickbooks/items", async (_req: Request, res: Response) => {
  try {
    const mappings = await db.select({
      id: qbItemMap.id,
      qbItemId: qbItemMap.qbItemId,
      qbItemName: qbItemMap.qbItemName,
      productId: qbItemMap.productId,
      isAutoMatched: qbItemMap.isAutoMatched,
      isIgnored: qbItemMap.isIgnored,
      productName: products.name,
    })
    .from(qbItemMap)
    .leftJoin(products, eq(qbItemMap.productId, products.id))
    .orderBy(qbItemMap.qbItemName);

    res.json(mappings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/quickbooks/items/sync", async (_req: Request, res: Response) => {
  try {
    const conn = await getActiveConnection();
    if (!conn) return res.status(400).json({ error: "QuickBooks not connected" });

    const result = await qbApiRequest(conn, "/query?query=" + encodeURIComponent("SELECT * FROM Item WHERE Type IN ('Inventory', 'NonInventory', 'Service') MAXRESULTS 1000"));
    const qbItems = result?.QueryResponse?.Item || [];

    const existingProducts = await db.select().from(products);
    const existingMaps = await db.select().from(qbItemMap);

    let newMapped = 0;
    for (const qbItem of qbItems) {
      const existing = existingMaps.find(m => m.qbItemId === String(qbItem.Id));
      if (existing) continue;

      const skuMatch = qbItem.Sku ? existingProducts.find(p => p.sku && p.sku.toLowerCase() === qbItem.Sku.toLowerCase()) : null;
      const nameMatch = !skuMatch ? existingProducts.find(p =>
        p.name.toLowerCase().trim() === (qbItem.Name || "").toLowerCase().trim()
      ) : null;
      const match = skuMatch || nameMatch;

      await db.insert(qbItemMap).values({
        qbItemId: String(qbItem.Id),
        qbItemName: qbItem.Name || qbItem.FullyQualifiedName || "Unknown",
        productId: match?.id || null,
        isAutoMatched: !!match,
      });
      if (match) newMapped++;
    }

    res.json({ total: qbItems.length, newMapped, alreadyMapped: existingMaps.length });
  } catch (error: any) {
    console.error("QB item sync error:", error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

router.patch("/api/quickbooks/items/:id", async (req: Request, res: Response) => {
  try {
    const { productId, isIgnored } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (productId !== undefined) {
      updates.productId = productId || null;
      updates.isAutoMatched = false;
    }
    if (isIgnored !== undefined) updates.isIgnored = isIgnored;

    await db.update(qbItemMap).set(updates).where(eq(qbItemMap.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Invoice Sync Routes ====================

router.post("/api/quickbooks/sync/invoices", async (req: Request, res: Response) => {
  try {
    const conn = await getActiveConnection();
    if (!conn) return res.status(400).json({ error: "QuickBooks not connected" });

    const { startDate, endDate, docNumberPrefix } = req.body;
    const ekosPrefix = docNumberPrefix !== undefined ? docNumberPrefix : "E";

    const [logEntry] = await db.insert(qbSyncLog).values({
      syncType: "invoices",
      status: "running",
    }).returning();

    let query = "SELECT * FROM Invoice";
    const conditions: string[] = [];
    if (startDate) conditions.push(`TxnDate >= '${startDate}'`);
    if (endDate) conditions.push(`TxnDate <= '${endDate}'`);
    if (conn.lastSyncAt && !startDate && !endDate) {
      conditions.push(`MetaData.LastUpdatedTime >= '${conn.lastSyncAt.toISOString()}'`);
    }
    if (conditions.length > 0) query += " WHERE " + conditions.join(" AND ");
    query += " MAXRESULTS 500";

    const result = await qbApiRequest(conn, "/query?query=" + encodeURIComponent(query));
    let invoices = result?.QueryResponse?.Invoice || [];

    if (ekosPrefix) {
      invoices = invoices.filter((inv: any) => {
        const docNum = inv.DocNumber || "";
        return docNum.startsWith(ekosPrefix);
      });
    }

    const customerMaps = await db.select().from(qbCustomerMap);
    const itemMaps = await db.select().from(qbItemMap);
    const existingInvoiceMaps = await db.select().from(qbInvoiceMap);
    const allProducts = await db.select().from(products);

    let created = 0, skipped = 0, failed = 0;
    const errors: string[] = [];

    for (const invoice of invoices) {
      try {
        const qbInvId = String(invoice.Id);
        if (existingInvoiceMaps.find(m => m.qbInvoiceId === qbInvId)) {
          skipped++;
          continue;
        }

        const custMap = customerMaps.find(m => m.qbCustomerId === String(invoice.CustomerRef?.value));
        if (!custMap?.b2bCustomerId) {
          errors.push(`Invoice #${invoice.DocNumber || invoice.Id}: Customer "${invoice.CustomerRef?.name}" not mapped`);
          failed++;
          continue;
        }

        const lines = (invoice.Line || []).filter((l: any) => l.DetailType === "SalesItemLineDetail");
        if (lines.length === 0) {
          skipped++;
          continue;
        }

        const orderItems: any[] = [];
        let hasUnmappedItems = false;

        for (const line of lines) {
          const qbItemId = String(line.SalesItemLineDetail?.ItemRef?.value || "");
          const itemMap = itemMaps.find(m => m.qbItemId === qbItemId);

          if (!itemMap?.productId) {
            hasUnmappedItems = true;
            errors.push(`Invoice #${invoice.DocNumber || invoice.Id}: Item "${line.SalesItemLineDetail?.ItemRef?.name}" not mapped`);
            continue;
          }

          const product = allProducts.find(p => p.id === itemMap.productId);
          if (!product) continue;

          const qty = line.SalesItemLineDetail?.Qty || 1;
          const unitPrice = line.SalesItemLineDetail?.UnitPrice || 0;
          const lineTotal = line.Amount || (qty * unitPrice);

          orderItems.push({
            productId: product.id,
            productName: product.name,
            sku: product.sku || null,
            quantity: qty,
            unitPrice: String(unitPrice),
            retailPrice: String(product.price),
            lineTotal: String(lineTotal),
          });
        }

        if (orderItems.length === 0) {
          if (hasUnmappedItems) failed++;
          else skipped++;
          continue;
        }

        const subtotal = orderItems.reduce((sum, i) => sum + parseFloat(i.lineTotal), 0);
        const tax = parseFloat(invoice.TxnTaxDetail?.TotalTax || "0");
        const total = subtotal + tax;

        const orderNumber = `QB-${invoice.DocNumber || invoice.Id}`;

        const [existingOrder] = await db.select().from(b2bOrders).where(eq(b2bOrders.orderNumber, orderNumber)).limit(1);
        if (existingOrder) {
          skipped++;
          continue;
        }

        const [newOrder] = await db.insert(b2bOrders).values({
          customerId: custMap.b2bCustomerId,
          orderNumber,
          invoiceNumber: invoice.DocNumber || null,
          orderType: "order",
          orderDate: invoice.TxnDate ? new Date(invoice.TxnDate + "T12:00:00") : new Date(),
          status: "delivered",
          subtotal: String(subtotal),
          tax: String(tax),
          total: String(total),
          notes: `Imported from QuickBooks (Invoice #${invoice.DocNumber || invoice.Id})`,
        }).returning();

        for (const item of orderItems) {
          await db.insert(b2bOrderItems).values({
            orderId: newOrder.id,
            ...item,
          });
        }

        await db.insert(qbInvoiceMap).values({
          qbInvoiceId: qbInvId,
          qbDocNumber: invoice.DocNumber || null,
          b2bOrderId: newOrder.id,
          qbLastUpdated: invoice.MetaData?.LastUpdatedTime ? new Date(invoice.MetaData.LastUpdatedTime) : null,
        });

        created++;
      } catch (err: any) {
        errors.push(`Invoice #${invoice.DocNumber || invoice.Id}: ${err.message}`);
        failed++;
      }
    }

    await db.update(qbSyncLog).set({
      status: "completed",
      invoicesProcessed: invoices.length,
      invoicesCreated: created,
      invoicesSkipped: skipped,
      invoicesFailed: failed,
      errorDetails: errors.length > 0 ? errors.join("\n") : null,
      completedAt: new Date(),
    }).where(eq(qbSyncLog.id, logEntry.id));

    await db.update(qbConnection).set({
      lastSyncAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(qbConnection.id, conn.id));

    res.json({
      processed: invoices.length,
      created,
      skipped,
      failed,
      errors: errors.slice(0, 20),
    });
  } catch (error: any) {
    console.error("QB invoice sync error:", error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Sync History ====================

router.get("/api/quickbooks/sync/history", async (_req: Request, res: Response) => {
  try {
    const logs = await db.select().from(qbSyncLog).orderBy(desc(qbSyncLog.startedAt)).limit(20);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== B2B Customers List (for mapping dropdown) ====================

router.get("/api/quickbooks/b2b-customers", async (_req: Request, res: Response) => {
  try {
    const customers = await db.select({
      id: b2bCustomers.id,
      accountName: b2bCustomers.accountName,
      customerNumber: b2bCustomers.customerNumber,
      customerType: b2bCustomers.customerType,
    }).from(b2bCustomers).orderBy(b2bCustomers.accountName);
    res.json(customers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/quickbooks/products", async (_req: Request, res: Response) => {
  try {
    const prods = await db.select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      category: products.category,
    }).from(products).orderBy(products.name);
    res.json(prods);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/quickbooks/redirect-uri", (_req: Request, res: Response) => {
  res.json({ redirectUri: getRedirectUri() });
});

export default router;
