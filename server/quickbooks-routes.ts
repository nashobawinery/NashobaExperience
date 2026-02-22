import { Router, Request, Response } from "express";
import axios from "axios";
import { db } from "./db";
import { qbConnection, qbCustomerMap, qbItemMap, qbSyncLog, qbInvoiceMap, qbPaymentMap, b2bOrders, b2bOrderItems, b2bCustomers, products } from "@shared/schema";
import { eq, desc, and, isNull, sql, inArray } from "drizzle-orm";
import { storage } from "./storage";
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
    const clientId = process.env.QUICKBOOKS_CLIENT_ID;
    const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
    console.log("[QB OAuth] Token exchange attempt:", {
      redirectUri,
      clientIdLength: clientId?.length || 0,
      clientIdPrefix: clientId?.substring(0, 8) || "MISSING",
      secretLength: clientSecret?.length || 0,
      hasSecret: !!clientSecret,
    });
    const response = await axios.post(
      QB_TOKEN_URL,
      new URLSearchParams({ grant_type: "authorization_code", code: code as string, redirect_uri: redirectUri }),
      {
        auth: { username: clientId!, password: clientSecret! },
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      }
    );

    const accessTokenExpiresAt = new Date(Date.now() + response.data.expires_in * 1000);
    const refreshTokenExpiresAt = new Date(Date.now() + response.data.x_refresh_token_expires_in * 1000);

    await db.delete(qbConnection);

    let companyName = null;
    try {
      const companyInfo = await axios.get(
        `${getApiBase()}/v3/company/${realmId}/companyinfo/${realmId}`,
        { headers: { Authorization: `Bearer ${response.data.access_token}`, Accept: "application/json" } }
      );
      companyName = companyInfo.data?.CompanyInfo?.CompanyName || null;
    } catch (e) {
      console.log("[QB OAuth] Could not fetch company name:", (e as any)?.message);
    }

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

async function fetchAndAnalyzeInvoices(conn: typeof qbConnection.$inferSelect, startDate?: string, endDate?: string, docNumberPrefix?: string) {
  const ekosPrefix = docNumberPrefix !== undefined ? docNumberPrefix : "E";

  let query = "SELECT * FROM Invoice";
  const conditions: string[] = [];
  if (startDate) conditions.push(`TxnDate >= '${startDate}'`);
  if (endDate) conditions.push(`TxnDate <= '${endDate}'`);
  if (!startDate && !endDate && conn.lastSyncAt) {
    conditions.push(`MetaData.LastUpdatedTime >= '${conn.lastSyncAt.toISOString()}'`);
  } else if (!startDate && !endDate) {
    conditions.push(`TxnDate >= '2026-01-01'`);
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

  const existingOrders = await db.select({
    id: b2bOrders.id,
    orderNumber: b2bOrders.orderNumber,
    invoiceNumber: b2bOrders.invoiceNumber,
    customerId: b2bOrders.customerId,
    orderDate: b2bOrders.orderDate,
    total: b2bOrders.total,
    status: b2bOrders.status,
    orderSource: b2bOrders.orderSource,
  }).from(b2bOrders);

  const existingOrderItems = await db.select().from(b2bOrderItems);

  const analyzed: any[] = [];

  for (const invoice of invoices) {
    const qbInvId = String(invoice.Id);
    const docNumber = invoice.DocNumber || "";
    const custMap = customerMaps.find(m => m.qbCustomerId === String(invoice.CustomerRef?.value));
    const invoiceTotal = parseFloat(invoice.TotalAmt || "0");
    const invoiceDate = invoice.TxnDate || "";

    let status: "ready" | "already_imported" | "duplicate_detected" | "unmapped_customer" | "unmapped_items" | "no_lines" = "ready";
    let duplicateMatch: any = null;
    let duplicateReason = "";
    const itemIssues: string[] = [];

    if (existingInvoiceMaps.find(m => m.qbInvoiceId === qbInvId)) {
      status = "already_imported";
    } else if (!custMap?.b2bCustomerId) {
      status = "unmapped_customer";
    } else {
      const ekosOrderNumber = `EKOS-${docNumber || qbInvId}`;
      const qbOrderNumber = `QB-${docNumber || qbInvId}`;
      const matchByOrderNumber = existingOrders.find(o => o.orderNumber === ekosOrderNumber || o.orderNumber === qbOrderNumber);
      if (matchByOrderNumber) {
        status = "duplicate_detected";
        duplicateMatch = matchByOrderNumber;
        duplicateReason = `Order ${matchByOrderNumber.orderNumber} already exists`;
      }

      if (status === "ready" && docNumber) {
        const matchByInvoice = existingOrders.find(o =>
          o.invoiceNumber && o.invoiceNumber === docNumber
        );
        if (matchByInvoice) {
          status = "duplicate_detected";
          duplicateMatch = matchByInvoice;
          duplicateReason = `Existing order ${matchByInvoice.orderNumber} has same invoice number "${docNumber}"`;
        }
      }

      if (status === "ready" && custMap?.b2bCustomerId) {
        const matchByCustomerTotal = existingOrders.find(o => {
          if (o.customerId !== custMap.b2bCustomerId) return false;
          const orderDate = new Date(o.orderDate);
          const qbDate = new Date(invoiceDate + "T12:00:00");
          const daysDiff = Math.abs(orderDate.getTime() - qbDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysDiff > 2) return false;
          const orderTotal = parseFloat(o.total || "0");
          const totalDiff = Math.abs(orderTotal - invoiceTotal);
          return totalDiff < 0.50;
        });
        if (matchByCustomerTotal) {
          status = "duplicate_detected";
          duplicateMatch = matchByCustomerTotal;
          duplicateReason = `Existing order ${matchByCustomerTotal.orderNumber} matches same customer, date (within 2 days), and total ($${parseFloat(matchByCustomerTotal.total || "0").toFixed(2)} vs $${invoiceTotal.toFixed(2)})`;
        }
      }
    }

    const lines = (invoice.Line || []).filter((l: any) => l.DetailType === "SalesItemLineDetail");
    if (lines.length === 0 && status === "ready") {
      status = "no_lines";
    }

    const orderItems: any[] = [];
    let hasUnmappedItems = false;

    for (const line of lines) {
      const qbItemId = String(line.SalesItemLineDetail?.ItemRef?.value || "");
      const qbItemName = line.SalesItemLineDetail?.ItemRef?.name || "Unknown";
      const itemMap = itemMaps.find(m => m.qbItemId === qbItemId);

      if (!itemMap?.productId) {
        if (!itemMap?.isIgnored) {
          hasUnmappedItems = true;
          itemIssues.push(`"${qbItemName}" not mapped`);
        }
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

    if (hasUnmappedItems && status === "ready" && orderItems.length === 0) {
      status = "unmapped_items";
    }

    analyzed.push({
      qbInvoiceId: qbInvId,
      docNumber,
      customerName: invoice.CustomerRef?.name || "Unknown",
      b2bCustomerId: custMap?.b2bCustomerId || null,
      b2bCustomerName: custMap ? undefined : null,
      date: invoiceDate,
      total: invoiceTotal,
      lineCount: lines.length,
      status,
      duplicateReason,
      duplicateMatch: duplicateMatch ? {
        orderId: duplicateMatch.id,
        orderNumber: duplicateMatch.orderNumber,
        total: duplicateMatch.total,
        status: duplicateMatch.status,
      } : null,
      itemIssues,
      orderItems,
    });
  }

  return analyzed;
}

router.post("/api/quickbooks/sync/preview", async (req: Request, res: Response) => {
  try {
    const conn = await getActiveConnection();
    if (!conn) return res.status(400).json({ error: "QuickBooks not connected" });

    const { startDate, endDate, docNumberPrefix } = req.body;
    const analyzed = await fetchAndAnalyzeInvoices(conn, startDate, endDate, docNumberPrefix);

    const summary = {
      total: analyzed.length,
      ready: analyzed.filter(a => a.status === "ready").length,
      alreadyImported: analyzed.filter(a => a.status === "already_imported").length,
      duplicateDetected: analyzed.filter(a => a.status === "duplicate_detected").length,
      unmappedCustomer: analyzed.filter(a => a.status === "unmapped_customer").length,
      unmappedItems: analyzed.filter(a => a.status === "unmapped_items").length,
      noLines: analyzed.filter(a => a.status === "no_lines").length,
    };

    res.json({ summary, invoices: analyzed });
  } catch (error: any) {
    console.error("QB preview error:", error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/quickbooks/sync/invoices", async (req: Request, res: Response) => {
  try {
    const conn = await getActiveConnection();
    if (!conn) return res.status(400).json({ error: "QuickBooks not connected" });

    const { startDate, endDate, docNumberPrefix, selectedInvoiceIds } = req.body;
    const analyzed = await fetchAndAnalyzeInvoices(conn, startDate, endDate, docNumberPrefix);

    const toImport = selectedInvoiceIds
      ? analyzed.filter(a => selectedInvoiceIds.includes(a.qbInvoiceId) && (a.status === "ready" || a.status === "duplicate_detected"))
      : analyzed.filter(a => a.status === "ready");

    const [logEntry] = await db.insert(qbSyncLog).values({
      syncType: "invoices",
      status: "running",
    }).returning();

    let created = 0, skipped = 0, failed = 0;
    const errors: string[] = [];

    for (const inv of toImport) {
      try {
        if (inv.status !== "ready" && !selectedInvoiceIds) {
          skipped++;
          continue;
        }

        if (!inv.b2bCustomerId) {
          errors.push(`Invoice #${inv.docNumber}: Customer not mapped`);
          failed++;
          continue;
        }

        if (inv.orderItems.length === 0) {
          errors.push(`Invoice #${inv.docNumber}: No mapped line items`);
          failed++;
          continue;
        }

        const subtotal = inv.orderItems.reduce((sum: number, i: any) => sum + parseFloat(i.lineTotal), 0);
        const tax = inv.total - subtotal;
        const orderNumber = `EKOS-${inv.docNumber || inv.qbInvoiceId}`;

        const legacyOrderNumber = `QB-${inv.docNumber || inv.qbInvoiceId}`;
        const [existingOrder] = await db.select().from(b2bOrders)
          .where(sql`${b2bOrders.orderNumber} IN (${orderNumber}, ${legacyOrderNumber})`)
          .limit(1);
        if (existingOrder) {
          skipped++;
          continue;
        }

        const [newOrder] = await db.insert(b2bOrders).values({
          customerId: inv.b2bCustomerId,
          orderNumber,
          invoiceNumber: inv.docNumber || null,
          orderType: "order",
          orderSource: "quickbooks",
          orderDate: inv.date ? new Date(inv.date + "T12:00:00") : new Date(),
          status: "delivered",
          subtotal: String(subtotal.toFixed(2)),
          tax: String(Math.max(0, tax).toFixed(2)),
          total: String(inv.total.toFixed(2)),
          notes: `Wholesale - Imported from EKOS via QuickBooks (Invoice #${inv.docNumber || inv.qbInvoiceId})`,
        }).returning();

        for (const item of inv.orderItems) {
          await db.insert(b2bOrderItems).values({
            orderId: newOrder.id,
            ...item,
          });
        }

        await db.insert(qbInvoiceMap).values({
          qbInvoiceId: inv.qbInvoiceId,
          qbDocNumber: inv.docNumber || null,
          b2bOrderId: newOrder.id,
        });

        created++;
      } catch (err: any) {
        errors.push(`Invoice #${inv.docNumber || inv.qbInvoiceId}: ${err.message}`);
        failed++;
      }
    }

    await db.update(qbSyncLog).set({
      status: "completed",
      invoicesProcessed: toImport.length,
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
      processed: toImport.length,
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

// ==================== Payment Sync ====================

async function fetchAndAnalyzePayments(conn: typeof qbConnection.$inferSelect, startDate?: string, endDate?: string) {
  let query = "SELECT * FROM Payment";
  const conditions: string[] = [];
  if (startDate) conditions.push(`TxnDate >= '${startDate}'`);
  if (endDate) conditions.push(`TxnDate <= '${endDate}'`);
  if (!startDate && !endDate) {
    conditions.push(`TxnDate >= '2026-01-01'`);
  }
  if (conditions.length > 0) query += " WHERE " + conditions.join(" AND ");
  query += " MAXRESULTS 500";

  const result = await qbApiRequest(conn, "/query?query=" + encodeURIComponent(query));
  const payments = result?.QueryResponse?.Payment || [];

  const existingPaymentMaps = await db.select().from(qbPaymentMap);
  const importedPaymentIds = new Set(existingPaymentMaps.map(p => p.qbPaymentId));

  const invoiceMaps = await db.select().from(qbInvoiceMap);
  const invoiceMapByQbId: Record<string, typeof invoiceMaps[0]> = {};
  for (const m of invoiceMaps) {
    invoiceMapByQbId[m.qbInvoiceId] = m;
  }

  const analyzedPayments: any[] = [];

  for (const pmt of payments) {
    const qbPaymentId = pmt.Id;
    const txnDate = pmt.TxnDate;
    const totalAmt = parseFloat(pmt.TotalAmt || "0");
    const paymentMethodName = pmt.PaymentMethodRef?.name || null;
    const paymentRefNum = pmt.PaymentRefNum || null;
    const customerName = pmt.CustomerRef?.name || "Unknown";

    const linkedInvoices: any[] = [];
    const lines = pmt.Line || [];
    for (const line of lines) {
      const linkedTxns = line.LinkedTxn || [];
      for (const lt of linkedTxns) {
        if (lt.TxnType === "Invoice") {
          const invMap = invoiceMapByQbId[lt.TxnId];
          linkedInvoices.push({
            qbInvoiceId: lt.TxnId,
            amountApplied: parseFloat(line.Amount || "0"),
            b2bOrderId: invMap?.b2bOrderId || null,
            qbDocNumber: invMap?.qbDocNumber || null,
            mapped: !!invMap,
          });
        }
      }
    }

    let status = "ready";
    let statusReason = "";

    if (importedPaymentIds.has(qbPaymentId)) {
      status = "already_imported";
      statusReason = "Payment already synced";
    } else if (linkedInvoices.length === 0) {
      status = "no_invoices";
      statusReason = "No linked invoices found";
    } else if (linkedInvoices.every((li: any) => !li.mapped)) {
      status = "unmapped_invoices";
      statusReason = "Linked invoices not imported into B2B yet";
    } else if (linkedInvoices.some((li: any) => !li.mapped)) {
      status = "partial_match";
      statusReason = "Some linked invoices not imported into B2B";
    }

    analyzedPayments.push({
      qbPaymentId,
      txnDate,
      totalAmt,
      paymentMethod: paymentMethodName,
      paymentRefNum,
      customerName,
      linkedInvoices,
      status,
      statusReason,
    });
  }

  return analyzedPayments;
}

router.post("/api/quickbooks/sync/payments/preview", async (req: Request, res: Response) => {
  try {
    const conn = await getActiveConnection();
    if (!conn) return res.status(400).json({ error: "QuickBooks not connected" });

    const { startDate, endDate } = req.body;
    const analyzed = await fetchAndAnalyzePayments(conn, startDate, endDate);

    const summary = {
      total: analyzed.length,
      ready: analyzed.filter(p => p.status === "ready" || p.status === "partial_match").length,
      alreadyImported: analyzed.filter(p => p.status === "already_imported").length,
      unmappedInvoices: analyzed.filter(p => p.status === "unmapped_invoices").length,
      noInvoices: analyzed.filter(p => p.status === "no_invoices").length,
    };

    res.json({ summary, payments: analyzed });
  } catch (error: any) {
    console.error("QB payment preview error:", error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/quickbooks/sync/payments/import", async (req: Request, res: Response) => {
  try {
    const conn = await getActiveConnection();
    if (!conn) return res.status(400).json({ error: "QuickBooks not connected" });

    const { startDate, endDate, selectedPaymentIds } = req.body;
    const analyzed = await fetchAndAnalyzePayments(conn, startDate, endDate);

    const toImport = selectedPaymentIds
      ? analyzed.filter(a => selectedPaymentIds.includes(a.qbPaymentId) && a.status !== "already_imported")
      : analyzed.filter(a => a.status === "ready");

    let applied = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const pmt of toImport) {
      try {
        const mappedInvoices = pmt.linkedInvoices.filter((li: any) => li.mapped && li.b2bOrderId);

        if (mappedInvoices.length === 0) {
          skipped++;
          continue;
        }

        for (const li of mappedInvoices) {
          const existingPmtMap = await db.select().from(qbPaymentMap)
            .where(and(
              eq(qbPaymentMap.qbPaymentId, pmt.qbPaymentId),
              eq(qbPaymentMap.qbInvoiceId, li.qbInvoiceId)
            )).limit(1);

          if (existingPmtMap.length > 0) continue;

          await db.insert(qbPaymentMap).values({
            qbPaymentId: pmt.qbPaymentId,
            qbInvoiceId: li.qbInvoiceId,
            b2bOrderId: li.b2bOrderId,
            amountApplied: String(li.amountApplied),
            paymentDate: new Date(pmt.txnDate),
            paymentMethod: pmt.paymentMethod,
            paymentRefNum: pmt.paymentRefNum,
          });

          const [order] = await db.select().from(b2bOrders).where(eq(b2bOrders.id, li.b2bOrderId)).limit(1);
          if (order && !order.paidAt) {
            await db.update(b2bOrders)
              .set({
                status: "completed",
                paidAt: new Date(pmt.txnDate),
                completedAt: new Date(pmt.txnDate),
                paymentMethod: pmt.paymentMethod || "QuickBooks Payment",
                paymentReference: pmt.paymentRefNum || `QB-PMT-${pmt.qbPaymentId}`,
                paymentNotes: `Synced from QuickBooks (Payment #${pmt.qbPaymentId})`,
                updatedAt: new Date(),
              })
              .where(eq(b2bOrders.id, li.b2bOrderId));

            try {
              const commissions = await storage.getCommissionsByOrderId(li.b2bOrderId);
              for (const commission of commissions) {
                if (commission.status === "pending") {
                  await storage.updateCommissionStatus(commission.id, "earned");
                }
              }
            } catch (commErr) {
              console.error("Error updating commissions for order:", li.b2bOrderId, commErr);
            }
          }
        }

        applied++;
      } catch (err: any) {
        failed++;
        errors.push(`Payment ${pmt.qbPaymentId}: ${err.message}`);
      }
    }

    const [logEntry] = await db.insert(qbSyncLog).values({
      syncType: "payments",
      status: failed > 0 ? "completed_with_errors" : "completed",
      invoicesProcessed: toImport.length,
      invoicesCreated: applied,
      invoicesSkipped: skipped,
      invoicesFailed: failed,
      errorDetails: errors.length > 0 ? errors.join("; ") : null,
      completedAt: new Date(),
    }).returning();

    res.json({
      success: true,
      logId: logEntry.id,
      processed: toImport.length,
      applied,
      skipped,
      failed,
      errors: errors.slice(0, 20),
    });
  } catch (error: any) {
    console.error("QB payment sync error:", error.response?.data || error.message);
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
