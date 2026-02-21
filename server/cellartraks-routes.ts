import { Router, Request, Response } from "express";
import { db } from "./db";
import { eq, and, isNotNull, sql } from "drizzle-orm";
import {
  cellartraksProductClassifications,
  products,
  insertCellartraksProductClassificationSchema,
} from "@shared/schema";

const router = Router();

function requireAuth(req: Request, res: Response, next: Function) {
  if (!(req.session as any)?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

router.get('/api/cellartraks/product-classifications', requireAuth, async (req: Request, res: Response) => {
  try {
    const { division } = req.query;
    const classifications = await db
      .select({
        id: cellartraksProductClassifications.id,
        productId: cellartraksProductClassifications.productId,
        productName: products.name,
        productCategory: products.category,
        productSku: products.sku,
        alcoholContent: products.alcoholContent,
        division: cellartraksProductClassifications.division,
        ttbWineClass: cellartraksProductClassifications.ttbWineClass,
        ttbSpiritsClass: cellartraksProductClassifications.ttbSpiritsClass,
        ttbBeerClass: cellartraksProductClassifications.ttbBeerClass,
        maAb1Class: cellartraksProductClassifications.maAb1Class,
        reportingUom: cellartraksProductClassifications.reportingUom,
        abvPercent: cellartraksProductClassifications.abvPercent,
        proofGallonFactor: cellartraksProductClassifications.proofGallonFactor,
        bottleSizeMl: cellartraksProductClassifications.bottleSizeMl,
        isClassified: cellartraksProductClassifications.isClassified,
        notes: cellartraksProductClassifications.notes,
        createdAt: cellartraksProductClassifications.createdAt,
        updatedAt: cellartraksProductClassifications.updatedAt,
      })
      .from(cellartraksProductClassifications)
      .leftJoin(products, eq(cellartraksProductClassifications.productId, products.id))
      .where(division ? eq(cellartraksProductClassifications.division, division as string) : undefined)
      .orderBy(products.name);
    res.json(classifications);
  } catch (error) {
    console.error("Error fetching CellarTraks classifications:", error);
    res.status(500).json({ error: "Failed to fetch classifications" });
  }
});

router.get('/api/cellartraks/products/unclassified', requireAuth, async (req: Request, res: Response) => {
  try {
    const allProducts = await db
      .select({
        id: products.id,
        name: products.name,
        category: products.category,
        sku: products.sku,
        alcoholContent: products.alcoholContent,
        bottleSize: products.bottleSize,
        available: products.available,
        isArchived: products.isArchived,
      })
      .from(products)
      .where(eq(products.isArchived, false));

    const classified = await db
      .select({ productId: cellartraksProductClassifications.productId })
      .from(cellartraksProductClassifications);

    const classifiedIds = new Set(classified.map(c => c.productId));
    const unclassified = allProducts.filter(p => !classifiedIds.has(p.id));
    res.json(unclassified);
  } catch (error) {
    console.error("Error fetching unclassified products:", error);
    res.status(500).json({ error: "Failed to fetch unclassified products" });
  }
});

router.post('/api/cellartraks/product-classifications', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = insertCellartraksProductClassificationSchema.parse(req.body);

    const hasClass = parsed.ttbWineClass || parsed.ttbSpiritsClass || parsed.ttbBeerClass || parsed.maAb1Class;
    const dataToInsert = {
      ...parsed,
      isClassified: !!hasClass,
    };

    const [result] = await db
      .insert(cellartraksProductClassifications)
      .values(dataToInsert)
      .onConflictDoUpdate({
        target: cellartraksProductClassifications.productId,
        set: {
          division: dataToInsert.division,
          ttbWineClass: dataToInsert.ttbWineClass ?? null,
          ttbSpiritsClass: dataToInsert.ttbSpiritsClass ?? null,
          ttbBeerClass: dataToInsert.ttbBeerClass ?? null,
          maAb1Class: dataToInsert.maAb1Class ?? null,
          reportingUom: dataToInsert.reportingUom ?? null,
          abvPercent: dataToInsert.abvPercent ?? null,
          proofGallonFactor: dataToInsert.proofGallonFactor ?? null,
          bottleSizeMl: dataToInsert.bottleSizeMl ?? null,
          isClassified: dataToInsert.isClassified,
          notes: dataToInsert.notes ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();
    res.json(result);
  } catch (error: any) {
    console.error("Error saving classification:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to save classification" });
  }
});

router.put('/api/cellartraks/product-classifications/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = insertCellartraksProductClassificationSchema.partial().parse(req.body);

    const hasClass = parsed.ttbWineClass || parsed.ttbSpiritsClass || parsed.ttbBeerClass || parsed.maAb1Class;

    const [result] = await db
      .update(cellartraksProductClassifications)
      .set({
        division: parsed.division,
        ttbWineClass: parsed.ttbWineClass ?? null,
        ttbSpiritsClass: parsed.ttbSpiritsClass ?? null,
        ttbBeerClass: parsed.ttbBeerClass ?? null,
        maAb1Class: parsed.maAb1Class ?? null,
        reportingUom: parsed.reportingUom ?? null,
        abvPercent: parsed.abvPercent ?? null,
        proofGallonFactor: parsed.proofGallonFactor ?? null,
        bottleSizeMl: parsed.bottleSizeMl ?? null,
        isClassified: !!hasClass,
        notes: parsed.notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(cellartraksProductClassifications.id, parseInt(id)))
      .returning();

    if (!result) {
      return res.status(404).json({ error: "Classification not found" });
    }
    res.json(result);
  } catch (error: any) {
    console.error("Error updating classification:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update classification" });
  }
});

router.delete('/api/cellartraks/product-classifications/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db
      .delete(cellartraksProductClassifications)
      .where(eq(cellartraksProductClassifications.id, parseInt(id)));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting classification:", error);
    res.status(500).json({ error: "Failed to delete classification" });
  }
});

router.get('/api/cellartraks/classification-stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const totalProducts = await db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.isArchived, false));
    const classifiedCount = await db.select({ count: sql<number>`count(*)` }).from(cellartraksProductClassifications).where(eq(cellartraksProductClassifications.isClassified, true));
    const byDivision = await db
      .select({
        division: cellartraksProductClassifications.division,
        count: sql<number>`count(*)`,
      })
      .from(cellartraksProductClassifications)
      .groupBy(cellartraksProductClassifications.division);

    res.json({
      totalProducts: Number(totalProducts[0]?.count || 0),
      classifiedProducts: Number(classifiedCount[0]?.count || 0),
      byDivision: byDivision.map(d => ({ division: d.division, count: Number(d.count) })),
    });
  } catch (error) {
    console.error("Error fetching classification stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.post('/api/cellartraks/product-classifications/batch', requireAuth, async (req: Request, res: Response) => {
  try {
    const { classifications } = req.body;
    if (!Array.isArray(classifications) || classifications.length === 0) {
      return res.status(400).json({ error: "Classifications array is required" });
    }

    const results = [];
    for (const item of classifications) {
      const hasClass = item.ttbWineClass || item.ttbSpiritsClass || item.ttbBeerClass || item.maAb1Class;
      const [result] = await db
        .insert(cellartraksProductClassifications)
        .values({
          ...item,
          isClassified: !!hasClass,
        })
        .onConflictDoUpdate({
          target: cellartraksProductClassifications.productId,
          set: {
            division: item.division,
            ttbWineClass: item.ttbWineClass ?? null,
            ttbSpiritsClass: item.ttbSpiritsClass ?? null,
            ttbBeerClass: item.ttbBeerClass ?? null,
            maAb1Class: item.maAb1Class ?? null,
            reportingUom: item.reportingUom ?? null,
            abvPercent: item.abvPercent ?? null,
            proofGallonFactor: item.proofGallonFactor ?? null,
            bottleSizeMl: item.bottleSizeMl ?? null,
            isClassified: !!hasClass,
            notes: item.notes ?? null,
            updatedAt: new Date(),
          },
        })
        .returning();
      results.push(result);
    }
    res.json(results);
  } catch (error) {
    console.error("Error batch saving classifications:", error);
    res.status(500).json({ error: "Failed to batch save classifications" });
  }
});

export default router;
