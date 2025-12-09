import { Router, Request, Response } from "express";
import { db } from "./db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import {
  spotInventoryLocations,
  spotInventoryAreas,
  spotInventorySessions,
  spotInventoryCounts,
  products,
  proceduresStaff,
  insertSpotInventoryLocationSchema,
  insertSpotInventoryAreaSchema,
  insertSpotInventorySessionSchema,
  insertSpotInventoryCountSchema,
  type SpotInventoryLocation,
  type SpotInventoryArea,
  type SpotInventorySession,
  type SpotInventoryCount,
} from "@shared/schema";

const router = Router();

// ============================================
// LOCATIONS
// ============================================

router.get("/locations", async (req: Request, res: Response) => {
  try {
    const locations = await db
      .select()
      .from(spotInventoryLocations)
      .orderBy(spotInventoryLocations.name);
    res.json(locations);
  } catch (error: any) {
    console.error("[Spot Inventory] Error fetching locations:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/locations/:id", async (req: Request, res: Response) => {
  try {
    const [location] = await db
      .select()
      .from(spotInventoryLocations)
      .where(eq(spotInventoryLocations.id, req.params.id));
    
    if (!location) {
      return res.status(404).json({ error: "Location not found" });
    }
    res.json(location);
  } catch (error: any) {
    console.error("[Spot Inventory] Error fetching location:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/locations", async (req: Request, res: Response) => {
  try {
    const parsed = insertSpotInventoryLocationSchema.parse(req.body);
    const [location] = await db
      .insert(spotInventoryLocations)
      .values(parsed)
      .returning();
    res.status(201).json(location);
  } catch (error: any) {
    console.error("[Spot Inventory] Error creating location:", error);
    res.status(400).json({ error: error.message });
  }
});

router.patch("/locations/:id", async (req: Request, res: Response) => {
  try {
    const [location] = await db
      .update(spotInventoryLocations)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(spotInventoryLocations.id, req.params.id))
      .returning();
    
    if (!location) {
      return res.status(404).json({ error: "Location not found" });
    }
    res.json(location);
  } catch (error: any) {
    console.error("[Spot Inventory] Error updating location:", error);
    res.status(400).json({ error: error.message });
  }
});

router.delete("/locations/:id", async (req: Request, res: Response) => {
  try {
    await db
      .delete(spotInventoryLocations)
      .where(eq(spotInventoryLocations.id, req.params.id));
    res.status(204).send();
  } catch (error: any) {
    console.error("[Spot Inventory] Error deleting location:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// AREAS
// ============================================

router.get("/areas", async (req: Request, res: Response) => {
  try {
    const { locationId } = req.query;
    
    let areas;
    if (locationId) {
      areas = await db.select().from(spotInventoryAreas)
        .where(eq(spotInventoryAreas.locationId, locationId as string))
        .orderBy(spotInventoryAreas.sortOrder, spotInventoryAreas.name);
    } else {
      areas = await db.select().from(spotInventoryAreas)
        .orderBy(spotInventoryAreas.sortOrder, spotInventoryAreas.name);
    }
    
    res.json(areas);
  } catch (error: any) {
    console.error("[Spot Inventory] Error fetching areas:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/areas/:id", async (req: Request, res: Response) => {
  try {
    const [area] = await db
      .select()
      .from(spotInventoryAreas)
      .where(eq(spotInventoryAreas.id, req.params.id));
    
    if (!area) {
      return res.status(404).json({ error: "Area not found" });
    }
    res.json(area);
  } catch (error: any) {
    console.error("[Spot Inventory] Error fetching area:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/areas", async (req: Request, res: Response) => {
  try {
    const parsed = insertSpotInventoryAreaSchema.parse(req.body);
    const [area] = await db
      .insert(spotInventoryAreas)
      .values(parsed)
      .returning();
    res.status(201).json(area);
  } catch (error: any) {
    console.error("[Spot Inventory] Error creating area:", error);
    res.status(400).json({ error: error.message });
  }
});

router.patch("/areas/:id", async (req: Request, res: Response) => {
  try {
    const [area] = await db
      .update(spotInventoryAreas)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(spotInventoryAreas.id, req.params.id))
      .returning();
    
    if (!area) {
      return res.status(404).json({ error: "Area not found" });
    }
    res.json(area);
  } catch (error: any) {
    console.error("[Spot Inventory] Error updating area:", error);
    res.status(400).json({ error: error.message });
  }
});

router.delete("/areas/:id", async (req: Request, res: Response) => {
  try {
    await db
      .delete(spotInventoryAreas)
      .where(eq(spotInventoryAreas.id, req.params.id));
    res.status(204).send();
  } catch (error: any) {
    console.error("[Spot Inventory] Error deleting area:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SESSIONS
// ============================================

router.get("/sessions", async (req: Request, res: Response) => {
  try {
    const { areaId, status, date } = req.query;
    
    const sessions = await db.select({
      session: spotInventorySessions,
      area: spotInventoryAreas,
    })
    .from(spotInventorySessions)
    .leftJoin(spotInventoryAreas, eq(spotInventorySessions.areaId, spotInventoryAreas.id))
    .orderBy(desc(spotInventorySessions.startedAt));
    
    let result = sessions.map(s => ({
      ...s.session,
      area: s.area
    }));
    
    if (areaId) {
      result = result.filter(s => s.areaId === areaId);
    }
    if (status) {
      result = result.filter(s => s.status === status);
    }
    if (date) {
      const dateStr = date as string;
      const startOfDay = new Date(dateStr);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateStr);
      endOfDay.setHours(23, 59, 59, 999);
      result = result.filter(s => {
        const completed = s.completedAt ? new Date(s.completedAt) : null;
        return completed && completed >= startOfDay && completed <= endOfDay;
      });
    }
    
    res.json(result);
  } catch (error: any) {
    console.error("[Spot Inventory] Error fetching sessions:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/sessions/:id", async (req: Request, res: Response) => {
  try {
    const [session] = await db
      .select()
      .from(spotInventorySessions)
      .where(eq(spotInventorySessions.id, req.params.id));
    
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    
    const counts = await db
      .select()
      .from(spotInventoryCounts)
      .where(eq(spotInventoryCounts.sessionId, req.params.id))
      .orderBy(spotInventoryCounts.scannedAt);
    
    res.json({ ...session, counts });
  } catch (error: any) {
    console.error("[Spot Inventory] Error fetching session:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/sessions", async (req: Request, res: Response) => {
  try {
    const parsed = insertSpotInventorySessionSchema.parse(req.body);
    const [session] = await db
      .insert(spotInventorySessions)
      .values(parsed)
      .returning();
    res.status(201).json(session);
  } catch (error: any) {
    console.error("[Spot Inventory] Error creating session:", error);
    res.status(400).json({ error: error.message });
  }
});

router.patch("/sessions/:id", async (req: Request, res: Response) => {
  try {
    const updateData: any = { ...req.body, updatedAt: new Date() };
    if (req.body.status === "completed" && !req.body.completedAt) {
      updateData.completedAt = new Date();
    }
    
    const [session] = await db
      .update(spotInventorySessions)
      .set(updateData)
      .where(eq(spotInventorySessions.id, req.params.id))
      .returning();
    
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.json(session);
  } catch (error: any) {
    console.error("[Spot Inventory] Error updating session:", error);
    res.status(400).json({ error: error.message });
  }
});

// ============================================
// COUNTS
// ============================================

router.post("/counts", async (req: Request, res: Response) => {
  try {
    const parsed = insertSpotInventoryCountSchema.parse(req.body);
    const [count] = await db
      .insert(spotInventoryCounts)
      .values(parsed)
      .returning();
    res.status(201).json(count);
  } catch (error: any) {
    console.error("[Spot Inventory] Error creating count:", error);
    res.status(400).json({ error: error.message });
  }
});

router.patch("/counts/:id", async (req: Request, res: Response) => {
  try {
    const [count] = await db
      .update(spotInventoryCounts)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(spotInventoryCounts.id, req.params.id))
      .returning();
    
    if (!count) {
      return res.status(404).json({ error: "Count not found" });
    }
    res.json(count);
  } catch (error: any) {
    console.error("[Spot Inventory] Error updating count:", error);
    res.status(400).json({ error: error.message });
  }
});

router.delete("/counts/:id", async (req: Request, res: Response) => {
  try {
    await db
      .delete(spotInventoryCounts)
      .where(eq(spotInventoryCounts.id, req.params.id));
    res.status(204).send();
  } catch (error: any) {
    console.error("[Spot Inventory] Error deleting count:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PRODUCT LOOKUP (for barcode scanning)
// ============================================

router.get("/products/lookup", async (req: Request, res: Response) => {
  try {
    const { sku, search } = req.query;
    
    if (sku) {
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.sku, sku as string));
      
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      return res.json(product);
    }
    
    if (search) {
      const searchTerm = `%${search}%`;
      const results = await db
        .select()
        .from(products)
        .where(
          sql`${products.name} ILIKE ${searchTerm} OR ${products.sku} ILIKE ${searchTerm}`
        )
        .limit(20);
      return res.json(results);
    }
    
    res.status(400).json({ error: "Must provide sku or search parameter" });
  } catch (error: any) {
    console.error("[Spot Inventory] Error looking up product:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// INVENTORY REPORT
// ============================================

router.get("/report", async (req: Request, res: Response) => {
  try {
    const { date, locationId } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: "Date parameter is required" });
    }
    
    const reportDate = new Date(date as string);
    const startOfDay = new Date(reportDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get all completed sessions for the date
    let sessionsQuery = db.select({
      session: spotInventorySessions,
      area: spotInventoryAreas,
      location: spotInventoryLocations,
    })
    .from(spotInventorySessions)
    .leftJoin(spotInventoryAreas, eq(spotInventorySessions.areaId, spotInventoryAreas.id))
    .leftJoin(spotInventoryLocations, eq(spotInventoryAreas.locationId, spotInventoryLocations.id))
    .where(
      and(
        eq(spotInventorySessions.status, "completed"),
        gte(spotInventorySessions.completedAt, startOfDay),
        lte(spotInventorySessions.completedAt, endOfDay)
      )
    );
    
    const sessions = await sessionsQuery;
    
    // Filter by location if specified
    let filteredSessions = sessions;
    if (locationId) {
      filteredSessions = sessions.filter(s => s.location?.id === locationId);
    }
    
    if (filteredSessions.length === 0) {
      return res.json({
        location_name: locationId ? "Selected Location" : "All Locations",
        report_date: date,
        areas: [],
        products: []
      });
    }
    
    // Get unique areas
    const areasMap = new Map();
    filteredSessions.forEach(s => {
      if (s.area && !areasMap.has(s.area.id)) {
        areasMap.set(s.area.id, { id: s.area.id, name: s.area.name });
      }
    });
    const areas = Array.from(areasMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    
    // Get all counts for these sessions
    const sessionIds = filteredSessions.map(s => s.session.id);
    const allCounts = await db
      .select()
      .from(spotInventoryCounts)
      .where(sql`${spotInventoryCounts.sessionId} IN (${sql.join(sessionIds.map(id => sql`${id}`), sql`, `)})`);
    
    // Also need to get session -> area mapping
    const sessionToArea = new Map<string, string>();
    filteredSessions.forEach(s => {
      if (s.area) {
        sessionToArea.set(s.session.id, s.area.id);
      }
    });
    
    // Build product totals
    const productMap = new Map<string, {
      product_id: string;
      name: string;
      total: number;
      by_area: Record<string, number>;
    }>();
    
    allCounts.forEach(count => {
      const areaId = sessionToArea.get(count.sessionId);
      if (!areaId) return;
      
      if (!productMap.has(count.productId)) {
        productMap.set(count.productId, {
          product_id: count.productId,
          name: count.productName,
          total: 0,
          by_area: {}
        });
      }
      
      const productEntry = productMap.get(count.productId)!;
      productEntry.total += count.quantity;
      productEntry.by_area[areaId] = (productEntry.by_area[areaId] || 0) + count.quantity;
    });
    
    const productsResult = Array.from(productMap.values())
      .sort((a, b) => a.name.localeCompare(b.name));
    
    // Fill in zeros for areas with no counts
    productsResult.forEach(p => {
      areas.forEach(area => {
        if (!(area.id in p.by_area)) {
          p.by_area[area.id] = 0;
        }
      });
    });
    
    const locationName = locationId && filteredSessions[0]?.location 
      ? filteredSessions[0].location.name 
      : "All Locations";
    
    res.json({
      location_name: locationName,
      report_date: date,
      areas,
      products: productsResult
    });
  } catch (error: any) {
    console.error("[Spot Inventory] Error generating report:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
