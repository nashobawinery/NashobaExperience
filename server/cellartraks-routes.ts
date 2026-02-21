import { Router, Request, Response } from "express";
import { db } from "./db";
import { eq, and, isNotNull, sql } from "drizzle-orm";
import {
  cellartraksProductClassifications,
  cellartraksStateTaxClasses,
  cellartraksFederalTaxRates,
  products,
  insertCellartraksProductClassificationSchema,
  insertCellartraksStateTaxClassSchema,
  insertCellartraksFederalTaxRateSchema,
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
        federalTaxRateId: cellartraksProductClassifications.federalTaxRateId,
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

// ============ State Tax Classes ============

router.get('/api/cellartraks/state-tax-classes', requireAuth, async (req: Request, res: Response) => {
  try {
    const { stateCode } = req.query;
    const where = stateCode ? eq(cellartraksStateTaxClasses.stateCode, stateCode as string) : undefined;
    const classes = await db
      .select()
      .from(cellartraksStateTaxClasses)
      .where(where)
      .orderBy(cellartraksStateTaxClasses.stateCode, cellartraksStateTaxClasses.sortOrder);
    res.json(classes);
  } catch (error) {
    console.error("Error fetching state tax classes:", error);
    res.status(500).json({ error: "Failed to fetch state tax classes" });
  }
});

router.get('/api/cellartraks/state-tax-classes/states', requireAuth, async (req: Request, res: Response) => {
  try {
    const states = await db
      .selectDistinct({
        stateCode: cellartraksStateTaxClasses.stateCode,
        stateName: cellartraksStateTaxClasses.stateName,
      })
      .from(cellartraksStateTaxClasses)
      .orderBy(cellartraksStateTaxClasses.stateName);
    res.json(states);
  } catch (error) {
    console.error("Error fetching states:", error);
    res.status(500).json({ error: "Failed to fetch states" });
  }
});

router.post('/api/cellartraks/state-tax-classes', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = insertCellartraksStateTaxClassSchema.parse(req.body);
    const [result] = await db
      .insert(cellartraksStateTaxClasses)
      .values(parsed)
      .returning();
    res.json(result);
  } catch (error: any) {
    console.error("Error creating state tax class:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    if (error.code === '23505') {
      return res.status(409).json({ error: "A classification with this key already exists for this state" });
    }
    res.status(500).json({ error: "Failed to create state tax class" });
  }
});

router.put('/api/cellartraks/state-tax-classes/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = insertCellartraksStateTaxClassSchema.partial().parse(req.body);

    const [result] = await db
      .update(cellartraksStateTaxClasses)
      .set({
        ...parsed,
        updatedAt: new Date(),
      })
      .where(eq(cellartraksStateTaxClasses.id, parseInt(id)))
      .returning();

    if (!result) {
      return res.status(404).json({ error: "State tax class not found" });
    }
    res.json(result);
  } catch (error: any) {
    console.error("Error updating state tax class:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update state tax class" });
  }
});

router.delete('/api/cellartraks/state-tax-classes/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db
      .delete(cellartraksStateTaxClasses)
      .where(eq(cellartraksStateTaxClasses.id, parseInt(id)));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting state tax class:", error);
    res.status(500).json({ error: "Failed to delete state tax class" });
  }
});

// ============ Federal Tax Rates ============

router.get('/api/cellartraks/federal-tax-rates', requireAuth, async (req: Request, res: Response) => {
  try {
    const { beverageType } = req.query;
    const where = beverageType ? eq(cellartraksFederalTaxRates.beverageType, beverageType as string) : undefined;
    const rates = await db
      .select()
      .from(cellartraksFederalTaxRates)
      .where(where)
      .orderBy(cellartraksFederalTaxRates.beverageType, cellartraksFederalTaxRates.sortOrder);
    res.json(rates);
  } catch (error) {
    console.error("Error fetching federal tax rates:", error);
    res.status(500).json({ error: "Failed to fetch federal tax rates" });
  }
});

router.post('/api/cellartraks/federal-tax-rates', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = insertCellartraksFederalTaxRateSchema.parse(req.body);
    const [result] = await db
      .insert(cellartraksFederalTaxRates)
      .values(parsed)
      .returning();
    res.json(result);
  } catch (error: any) {
    console.error("Error creating federal tax rate:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create federal tax rate" });
  }
});

router.put('/api/cellartraks/federal-tax-rates/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = insertCellartraksFederalTaxRateSchema.partial().parse(req.body);
    const [result] = await db
      .update(cellartraksFederalTaxRates)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(cellartraksFederalTaxRates.id, parseInt(id)))
      .returning();
    if (!result) return res.status(404).json({ error: "Rate not found" });
    res.json(result);
  } catch (error: any) {
    console.error("Error updating federal tax rate:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update federal tax rate" });
  }
});

router.delete('/api/cellartraks/federal-tax-rates/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(cellartraksFederalTaxRates).where(eq(cellartraksFederalTaxRates.id, parseInt(id)));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting federal tax rate:", error);
    res.status(500).json({ error: "Failed to delete federal tax rate" });
  }
});

router.post('/api/cellartraks/federal-tax-rates/seed', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await db.select({ count: sql<number>`count(*)` }).from(cellartraksFederalTaxRates);
    if (Number(existing[0]?.count) > 0) {
      return res.json({ message: "Federal tax rates already seeded", count: Number(existing[0]?.count) });
    }

    const rates = [
      // ====== BEER ======
      { beverageType: 'beer', rateKey: 'beer_small_first_60k', displayName: 'Small Brewer - First 60,000 Barrels', description: 'Domestic brewer producing 2,000,000 barrels or less per calendar year', ratePerUnit: '3.50', rateUnit: 'per barrel', volumeMin: '0', volumeMax: '60000', volumeUnit: 'barrels per calendar year', producerType: 'small', sortOrder: 1, effectiveDate: '2018-01-01', notes: 'Reduced rate for small domestic brewers' },
      { beverageType: 'beer', rateKey: 'beer_small_over_60k', displayName: 'Small Brewer - Over 60,000 Barrels', description: 'Domestic brewer producing 2,000,000 barrels or less; over 60,000 up to 2,000,000 barrels', ratePerUnit: '16.00', rateUnit: 'per barrel', volumeMin: '60000', volumeMax: '2000000', volumeUnit: 'barrels per calendar year', producerType: 'small', sortOrder: 2, effectiveDate: '2018-01-01' },
      { beverageType: 'beer', rateKey: 'beer_large_first_6m', displayName: 'Large Brewer - First 6,000,000 Barrels', description: 'Domestic brewer producing over 2,000,000 barrels per calendar year who produced the beer; or electing U.S. importer with assigned reduced rate', ratePerUnit: '16.00', rateUnit: 'per barrel', volumeMin: '0', volumeMax: '6000000', volumeUnit: 'barrels per calendar year', producerType: 'large', sortOrder: 3, effectiveDate: '2018-01-01' },
      { beverageType: 'beer', rateKey: 'beer_general', displayName: 'General Rate', description: 'Domestic brewer who did not produce the beer; U.S. importer not assigned a reduced rate; or brewer/importer who exhausted reduced rate entitlement', ratePerUnit: '18.00', rateUnit: 'per barrel', volumeMin: null, volumeMax: null, volumeUnit: 'all barrels', producerType: 'general', sortOrder: 4, effectiveDate: '2018-01-01' },

      // ====== WINE - Base Rates ======
      { beverageType: 'wine', rateKey: 'wine_still_16_under', displayName: 'Still Wine - 16% and Under', description: 'Still wine, 16% and under alcohol by volume (0.392g CO2/100mL or less)', ratePerUnit: '1.07', rateUnit: 'per wine gallon', producerType: 'base_rate', sortOrder: 10, effectiveDate: '2018-01-01' },
      { beverageType: 'wine', rateKey: 'wine_still_16_to_21', displayName: 'Still Wine - Over 16% to 21%', description: 'Still wine, over 16% to 21% alcohol by volume (0.392g CO2/100mL or less)', ratePerUnit: '1.57', rateUnit: 'per wine gallon', producerType: 'base_rate', sortOrder: 11, effectiveDate: '2018-01-01' },
      { beverageType: 'wine', rateKey: 'wine_still_21_to_24', displayName: 'Still Wine - Over 21% to 24%', description: 'Still wine, over 21% to 24% alcohol by volume (0.392g CO2/100mL or less)', ratePerUnit: '3.15', rateUnit: 'per wine gallon', producerType: 'base_rate', sortOrder: 12, effectiveDate: '2018-01-01' },
      { beverageType: 'wine', rateKey: 'wine_mead', displayName: 'Mead', description: 'No more than 0.64g CO2/100mL; derived solely from honey and water; no fruit product or flavoring; less than 8.5% ABV', ratePerUnit: '1.07', rateUnit: 'per wine gallon', producerType: 'base_rate', sortOrder: 13, effectiveDate: '2018-01-01' },
      { beverageType: 'wine', rateKey: 'wine_low_abv', displayName: 'Low Alcohol by Volume Wine', description: 'No more than 0.64g CO2/100mL; derived primarily from grapes or grape juice concentrate and water; no fruit product or flavoring other than grape; less than 8.5% ABV', ratePerUnit: '1.07', rateUnit: 'per wine gallon', producerType: 'base_rate', sortOrder: 14, effectiveDate: '2018-01-01' },
      { beverageType: 'wine', rateKey: 'wine_artificially_carbonated', displayName: 'Artificially Carbonated Wine', description: 'Over 0.392g CO2/100mL - injected or otherwise added', ratePerUnit: '3.30', rateUnit: 'per wine gallon', producerType: 'base_rate', sortOrder: 15, effectiveDate: '2018-01-01' },
      { beverageType: 'wine', rateKey: 'wine_sparkling', displayName: 'Sparkling Wine', description: 'Over 0.392g CO2/100mL - naturally occurring', ratePerUnit: '3.40', rateUnit: 'per wine gallon', producerType: 'base_rate', sortOrder: 16, effectiveDate: '2018-01-01' },
      { beverageType: 'wine', rateKey: 'wine_hard_cider', displayName: 'Hard Cider', description: 'No more than 0.64g CO2/100mL; derived primarily from apples/pears or apple/pear juice concentrate and water; no other fruit product or flavoring other than apple/pear; at least 0.5% and less than 8.5% ABV', ratePerUnit: '0.226', rateUnit: 'per wine gallon', producerType: 'base_rate', sortOrder: 17, effectiveDate: '2018-01-01' },

      // ====== WINE - Credit Tiers (First 30,000 wine gallons) ======
      { beverageType: 'wine', rateKey: 'wine_credit_still_16_under_t1', displayName: 'Still Wine 16% & Under - First 30,000 Gal Credit', parentRateKey: 'wine_still_16_under', creditAmount: '1.00', effectiveRateAfterCredit: '0.07', ratePerUnit: '1.07', rateUnit: 'per wine gallon', volumeMin: '0', volumeMax: '30000', volumeUnit: 'wine gallons per calendar year', producerType: 'credit_tier_1', sortOrder: 20, effectiveDate: '2018-01-01' },
      { beverageType: 'wine', rateKey: 'wine_credit_still_16_to_21_t1', displayName: 'Still Wine 16-21% - First 30,000 Gal Credit', parentRateKey: 'wine_still_16_to_21', creditAmount: '1.00', effectiveRateAfterCredit: '0.57', ratePerUnit: '1.57', rateUnit: 'per wine gallon', volumeMin: '0', volumeMax: '30000', volumeUnit: 'wine gallons per calendar year', producerType: 'credit_tier_1', sortOrder: 21, effectiveDate: '2018-01-01' },
      { beverageType: 'wine', rateKey: 'wine_credit_still_21_to_24_t1', displayName: 'Still Wine 21-24% - First 30,000 Gal Credit', parentRateKey: 'wine_still_21_to_24', creditAmount: '1.00', effectiveRateAfterCredit: '2.15', ratePerUnit: '3.15', rateUnit: 'per wine gallon', volumeMin: '0', volumeMax: '30000', volumeUnit: 'wine gallons per calendar year', producerType: 'credit_tier_1', sortOrder: 22, effectiveDate: '2018-01-01' },
      { beverageType: 'wine', rateKey: 'wine_credit_artificially_carb_t1', displayName: 'Artificially Carbonated - First 30,000 Gal Credit', parentRateKey: 'wine_artificially_carbonated', creditAmount: '1.00', effectiveRateAfterCredit: '2.30', ratePerUnit: '3.30', rateUnit: 'per wine gallon', volumeMin: '0', volumeMax: '30000', volumeUnit: 'wine gallons per calendar year', producerType: 'credit_tier_1', sortOrder: 23, effectiveDate: '2018-01-01' },
      { beverageType: 'wine', rateKey: 'wine_credit_sparkling_t1', displayName: 'Sparkling Wine - First 30,000 Gal Credit', parentRateKey: 'wine_sparkling', creditAmount: '1.00', effectiveRateAfterCredit: '2.40', ratePerUnit: '3.40', rateUnit: 'per wine gallon', volumeMin: '0', volumeMax: '30000', volumeUnit: 'wine gallons per calendar year', producerType: 'credit_tier_1', sortOrder: 24, effectiveDate: '2018-01-01' },
      { beverageType: 'wine', rateKey: 'wine_credit_hard_cider_t1', displayName: 'Hard Cider - First 30,000 Gal Credit', parentRateKey: 'wine_hard_cider', creditAmount: '0.062', effectiveRateAfterCredit: '0.164', ratePerUnit: '0.226', rateUnit: 'per wine gallon', volumeMin: '0', volumeMax: '30000', volumeUnit: 'wine gallons per calendar year', producerType: 'credit_tier_1', sortOrder: 25, effectiveDate: '2018-01-01' },
      { beverageType: 'wine', rateKey: 'wine_credit_mead_t1', displayName: 'Mead - First 30,000 Gal Credit', parentRateKey: 'wine_mead', creditAmount: '1.00', effectiveRateAfterCredit: '0.07', ratePerUnit: '1.07', rateUnit: 'per wine gallon', volumeMin: '0', volumeMax: '30000', volumeUnit: 'wine gallons per calendar year', producerType: 'credit_tier_1', sortOrder: 26, effectiveDate: '2018-01-01' },
      { beverageType: 'wine', rateKey: 'wine_credit_low_abv_t1', displayName: 'Low ABV Wine - First 30,000 Gal Credit', parentRateKey: 'wine_low_abv', creditAmount: '1.00', effectiveRateAfterCredit: '0.07', ratePerUnit: '1.07', rateUnit: 'per wine gallon', volumeMin: '0', volumeMax: '30000', volumeUnit: 'wine gallons per calendar year', producerType: 'credit_tier_1', sortOrder: 27, effectiveDate: '2018-01-01' },

      // ====== WINE - Credit Tiers (30,001 - 130,000 wine gallons) ======
      { beverageType: 'wine', rateKey: 'wine_credit_still_16_under_t2', displayName: 'Still Wine 16% & Under - 30k-130k Gal Credit', parentRateKey: 'wine_still_16_under', creditAmount: '0.90', effectiveRateAfterCredit: '0.17', ratePerUnit: '1.07', rateUnit: 'per wine gallon', volumeMin: '30000', volumeMax: '130000', volumeUnit: 'wine gallons per calendar year', producerType: 'credit_tier_2', sortOrder: 30, effectiveDate: '2018-01-01' },
      { beverageType: 'wine', rateKey: 'wine_credit_still_16_to_21_t2', displayName: 'Still Wine 16-21% - 30k-130k Gal Credit', parentRateKey: 'wine_still_16_to_21', creditAmount: '0.90', effectiveRateAfterCredit: '0.67', ratePerUnit: '1.57', rateUnit: 'per wine gallon', volumeMin: '30000', volumeMax: '130000', volumeUnit: 'wine gallons per calendar year', producerType: 'credit_tier_2', sortOrder: 31, effectiveDate: '2018-01-01' },
      { beverageType: 'wine', rateKey: 'wine_credit_still_21_to_24_t2', displayName: 'Still Wine 21-24% - 30k-130k Gal Credit', parentRateKey: 'wine_still_21_to_24', creditAmount: '0.90', effectiveRateAfterCredit: '2.25', ratePerUnit: '3.15', rateUnit: 'per wine gallon', volumeMin: '30000', volumeMax: '130000', volumeUnit: 'wine gallons per calendar year', producerType: 'credit_tier_2', sortOrder: 32, effectiveDate: '2018-01-01' },
      { beverageType: 'wine', rateKey: 'wine_credit_artificially_carb_t2', displayName: 'Artificially Carbonated - 30k-130k Gal Credit', parentRateKey: 'wine_artificially_carbonated', creditAmount: '0.90', effectiveRateAfterCredit: '2.40', ratePerUnit: '3.30', rateUnit: 'per wine gallon', volumeMin: '30000', volumeMax: '130000', volumeUnit: 'wine gallons per calendar year', producerType: 'credit_tier_2', sortOrder: 33, effectiveDate: '2018-01-01' },
      { beverageType: 'wine', rateKey: 'wine_credit_sparkling_t2', displayName: 'Sparkling Wine - 30k-130k Gal Credit', parentRateKey: 'wine_sparkling', creditAmount: '0.90', effectiveRateAfterCredit: '2.50', ratePerUnit: '3.40', rateUnit: 'per wine gallon', volumeMin: '30000', volumeMax: '130000', volumeUnit: 'wine gallons per calendar year', producerType: 'credit_tier_2', sortOrder: 34, effectiveDate: '2018-01-01' },
      { beverageType: 'wine', rateKey: 'wine_credit_hard_cider_t2', displayName: 'Hard Cider - 30k-130k Gal Credit', parentRateKey: 'wine_hard_cider', creditAmount: '0.056', effectiveRateAfterCredit: '0.17', ratePerUnit: '0.226', rateUnit: 'per wine gallon', volumeMin: '30000', volumeMax: '130000', volumeUnit: 'wine gallons per calendar year', producerType: 'credit_tier_2', sortOrder: 35, effectiveDate: '2018-01-01' },
      { beverageType: 'wine', rateKey: 'wine_credit_mead_t2', displayName: 'Mead - 30k-130k Gal Credit', parentRateKey: 'wine_mead', creditAmount: '0.90', effectiveRateAfterCredit: '0.17', ratePerUnit: '1.07', rateUnit: 'per wine gallon', volumeMin: '30000', volumeMax: '130000', volumeUnit: 'wine gallons per calendar year', producerType: 'credit_tier_2', sortOrder: 36, effectiveDate: '2018-01-01' },
      { beverageType: 'wine', rateKey: 'wine_credit_low_abv_t2', displayName: 'Low ABV Wine - 30k-130k Gal Credit', parentRateKey: 'wine_low_abv', creditAmount: '0.90', effectiveRateAfterCredit: '0.17', ratePerUnit: '1.07', rateUnit: 'per wine gallon', volumeMin: '30000', volumeMax: '130000', volumeUnit: 'wine gallons per calendar year', producerType: 'credit_tier_2', sortOrder: 37, effectiveDate: '2018-01-01' },

      // ====== WINE - Credit Tiers (130,001 - 750,000 wine gallons) ======
      { beverageType: 'wine', rateKey: 'wine_credit_still_16_under_t3', displayName: 'Still Wine 16% & Under - 130k-750k Gal Credit', parentRateKey: 'wine_still_16_under', creditAmount: '0.535', effectiveRateAfterCredit: '0.535', ratePerUnit: '1.07', rateUnit: 'per wine gallon', volumeMin: '130000', volumeMax: '750000', volumeUnit: 'wine gallons per calendar year', producerType: 'credit_tier_3', sortOrder: 40, effectiveDate: '2018-01-01' },
      { beverageType: 'wine', rateKey: 'wine_credit_still_16_to_21_t3', displayName: 'Still Wine 16-21% - 130k-750k Gal Credit', parentRateKey: 'wine_still_16_to_21', creditAmount: '0.535', effectiveRateAfterCredit: '1.035', ratePerUnit: '1.57', rateUnit: 'per wine gallon', volumeMin: '130000', volumeMax: '750000', volumeUnit: 'wine gallons per calendar year', producerType: 'credit_tier_3', sortOrder: 41, effectiveDate: '2018-01-01' },
      { beverageType: 'wine', rateKey: 'wine_credit_still_21_to_24_t3', displayName: 'Still Wine 21-24% - 130k-750k Gal Credit', parentRateKey: 'wine_still_21_to_24', creditAmount: '0.535', effectiveRateAfterCredit: '2.615', ratePerUnit: '3.15', rateUnit: 'per wine gallon', volumeMin: '130000', volumeMax: '750000', volumeUnit: 'wine gallons per calendar year', producerType: 'credit_tier_3', sortOrder: 42, effectiveDate: '2018-01-01' },
      { beverageType: 'wine', rateKey: 'wine_credit_artificially_carb_t3', displayName: 'Artificially Carbonated - 130k-750k Gal Credit', parentRateKey: 'wine_artificially_carbonated', creditAmount: '0.535', effectiveRateAfterCredit: '2.765', ratePerUnit: '3.30', rateUnit: 'per wine gallon', volumeMin: '130000', volumeMax: '750000', volumeUnit: 'wine gallons per calendar year', producerType: 'credit_tier_3', sortOrder: 43, effectiveDate: '2018-01-01' },
      { beverageType: 'wine', rateKey: 'wine_credit_sparkling_t3', displayName: 'Sparkling Wine - 130k-750k Gal Credit', parentRateKey: 'wine_sparkling', creditAmount: '0.535', effectiveRateAfterCredit: '2.865', ratePerUnit: '3.40', rateUnit: 'per wine gallon', volumeMin: '130000', volumeMax: '750000', volumeUnit: 'wine gallons per calendar year', producerType: 'credit_tier_3', sortOrder: 44, effectiveDate: '2018-01-01' },
      { beverageType: 'wine', rateKey: 'wine_credit_hard_cider_t3', displayName: 'Hard Cider - 130k-750k Gal Credit', parentRateKey: 'wine_hard_cider', creditAmount: '0.033', effectiveRateAfterCredit: '0.193', ratePerUnit: '0.226', rateUnit: 'per wine gallon', volumeMin: '130000', volumeMax: '750000', volumeUnit: 'wine gallons per calendar year', producerType: 'credit_tier_3', sortOrder: 45, effectiveDate: '2018-01-01' },
      { beverageType: 'wine', rateKey: 'wine_credit_mead_t3', displayName: 'Mead - 130k-750k Gal Credit', parentRateKey: 'wine_mead', creditAmount: '0.535', effectiveRateAfterCredit: '0.535', ratePerUnit: '1.07', rateUnit: 'per wine gallon', volumeMin: '130000', volumeMax: '750000', volumeUnit: 'wine gallons per calendar year', producerType: 'credit_tier_3', sortOrder: 46, effectiveDate: '2018-01-01' },
      { beverageType: 'wine', rateKey: 'wine_credit_low_abv_t3', displayName: 'Low ABV Wine - 130k-750k Gal Credit', parentRateKey: 'wine_low_abv', creditAmount: '0.535', effectiveRateAfterCredit: '0.535', ratePerUnit: '1.07', rateUnit: 'per wine gallon', volumeMin: '130000', volumeMax: '750000', volumeUnit: 'wine gallons per calendar year', producerType: 'credit_tier_3', sortOrder: 47, effectiveDate: '2018-01-01' },

      // ====== SPIRITS ======
      { beverageType: 'spirits', rateKey: 'spirits_reduced_first_100k', displayName: 'Reduced Rate - First 100,000 Proof Gallons', description: 'DSP proprietors who remove distilled spirits they distilled or processed; electing U.S. importers with assigned reduced rate', ratePerUnit: '2.70', rateUnit: 'per proof gallon', volumeMin: '0', volumeMax: '100000', volumeUnit: 'proof gallons per calendar year', producerType: 'small', sortOrder: 50, effectiveDate: '2018-01-01' },
      { beverageType: 'spirits', rateKey: 'spirits_reduced_over_100k', displayName: 'Reduced Rate - Over 100,000 Proof Gallons', description: 'Over 100,000 up to 22,230,000 proof gallons per calendar year', ratePerUnit: '13.34', rateUnit: 'per proof gallon', volumeMin: '100000', volumeMax: '22230000', volumeUnit: 'proof gallons per calendar year', producerType: 'small', sortOrder: 51, effectiveDate: '2018-01-01' },
      { beverageType: 'spirits', rateKey: 'spirits_general', displayName: 'General Rate', description: 'DSP proprietors removing spirits they did not distill or process; U.S. importers not assigned a reduced rate; exhausted reduced rate entitlement', ratePerUnit: '13.50', rateUnit: 'per proof gallon', volumeMin: null, volumeMax: null, volumeUnit: 'all proof gallons', producerType: 'general', sortOrder: 52, effectiveDate: '2018-01-01' },
    ];

    const results = [];
    for (const rate of rates) {
      const [result] = await db
        .insert(cellartraksFederalTaxRates)
        .values(rate as any)
        .returning();
      results.push(result);
    }

    res.json({ message: "Federal tax rates seeded successfully", count: results.length });
  } catch (error) {
    console.error("Error seeding federal tax rates:", error);
    res.status(500).json({ error: "Failed to seed federal tax rates" });
  }
});

export default router;
