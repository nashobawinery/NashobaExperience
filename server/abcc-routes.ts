import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { abccProductClassification } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

const EXACT_GROUP_MATCH: Record<string, { beverageType: string; defaultSizeOz: number; containerType: string }> = {
  "wine": { beverageType: "wine", defaultSizeOz: 6, containerType: "glass" },
  "wine 9-ounce": { beverageType: "wine", defaultSizeOz: 9, containerType: "glass" },
  "wine pairings": { beverageType: "wine", defaultSizeOz: 3, containerType: "tasting" },
  "vd wine pairings": { beverageType: "wine", defaultSizeOz: 3, containerType: "tasting" },
  "wine - retail": { beverageType: "wine", defaultSizeOz: 25.4, containerType: "bottle" },
  "canned wine": { beverageType: "wine", defaultSizeOz: 12, containerType: "can" },
  "canned wine and spritz": { beverageType: "wine", defaultSizeOz: 12, containerType: "can" },
  "spirits": { beverageType: "spirits", defaultSizeOz: 1.5, containerType: "shot" },
  "scratch bar": { beverageType: "spirits", defaultSizeOz: 2, containerType: "cocktail" },
  "canned cocktails & thumper": { beverageType: "spirits", defaultSizeOz: 12, containerType: "can" },
  "beer": { beverageType: "beer", defaultSizeOz: 16, containerType: "pint" },
  "bolton beer works": { beverageType: "beer", defaultSizeOz: 16, containerType: "pint" },
  "hard cider": { beverageType: "cider", defaultSizeOz: 16, containerType: "pint" },
  "cider": { beverageType: "cider", defaultSizeOz: 16, containerType: "pint" },
  "j- non alcoholic wine and beer": { beverageType: "non_alcoholic", defaultSizeOz: 12, containerType: "bottle" },
  "j - mocktails": { beverageType: "non_alcoholic", defaultSizeOz: 12, containerType: "glass" },
  "function beverage": { beverageType: "wine", defaultSizeOz: 6, containerType: "glass" },
  "group tasting": { beverageType: "wine", defaultSizeOz: 2, containerType: "tasting" },
};

const KEYWORD_RULES: { keywords: string[]; exclude?: string[]; result: { beverageType: string; defaultSizeOz: number; containerType: string } }[] = [
  { keywords: ["non alcoholic", "non-alcoholic", "mocktail", "na beer", "na wine"], result: { beverageType: "non_alcoholic", defaultSizeOz: 12, containerType: "glass" } },
  { keywords: ["canned wine", "wine can"], result: { beverageType: "wine", defaultSizeOz: 12, containerType: "can" } },
  { keywords: ["wine retail", "retail wine", "retail bottle", "wine bottle"], result: { beverageType: "wine", defaultSizeOz: 25.4, containerType: "bottle" } },
  { keywords: ["wine pairing", "wine flight", "tasting flight", "wine tasting"], result: { beverageType: "wine", defaultSizeOz: 3, containerType: "tasting" } },
  { keywords: ["wine 9", "9-ounce", "9 ounce", "9oz"], result: { beverageType: "wine", defaultSizeOz: 9, containerType: "glass" } },
  { keywords: ["wine"], exclude: ["non alcoholic", "canned", "retail"], result: { beverageType: "wine", defaultSizeOz: 6, containerType: "glass" } },
  { keywords: ["canned cocktail", "thumper", "canned spirit"], result: { beverageType: "spirits", defaultSizeOz: 12, containerType: "can" } },
  { keywords: ["spirits", "spirit", "cocktail", "scratch bar", "mixed drink", "martini"], exclude: ["non alcoholic"], result: { beverageType: "spirits", defaultSizeOz: 1.5, containerType: "shot" } },
  { keywords: ["hard cider", "cider"], result: { beverageType: "cider", defaultSizeOz: 16, containerType: "pint" } },
  { keywords: ["beer", "ale", "ipa", "lager", "stout", "pilsner", "brew"], exclude: ["non alcoholic", "root beer"], result: { beverageType: "beer", defaultSizeOz: 16, containerType: "pint" } },
  { keywords: ["beverage", "drink"], exclude: ["soft", "coffee", "tea", "non alcoholic"], result: { beverageType: "wine", defaultSizeOz: 6, containerType: "glass" } },
];

function classifyMenuGroup(groupName: string): { beverageType: string; defaultSizeOz: number; containerType: string } | null {
  const lower = groupName.toLowerCase().trim();
  const exactMatch = EXACT_GROUP_MATCH[lower];
  if (exactMatch) return exactMatch;

  for (const rule of KEYWORD_RULES) {
    const hasKeyword = rule.keywords.some(kw => lower.includes(kw));
    const hasExclude = rule.exclude?.some(ex => lower.includes(ex));
    if (hasKeyword && !hasExclude) return rule.result;
  }
  return null;
}

router.post("/auto-classify", async (req, res) => {
  try {
    const itemsResult = await db.execute(sql`
      SELECT DISTINCT i.name, i.item_guid, g.name as group_name, g.group_guid
      FROM toast_menu_items i
      JOIN toast_menu_groups g ON i.group_guid = g.group_guid
      WHERE i.hidden = false OR i.hidden IS NULL
    `);

    const existingResult = await db.execute(sql`SELECT item_guid, item_name FROM abcc_product_classification`);
    const existingSet = new Set(
      (existingResult.rows as any[]).map(r => r.item_guid || r.item_name)
    );

    let classified = 0;
    let skipped = 0;

    for (const item of itemsResult.rows as any[]) {
      const key = item.item_guid || item.name;
      if (existingSet.has(key)) { skipped++; continue; }

      const match = classifyMenuGroup(item.group_name || "");

      if (match) {
        await db.execute(sql`
          INSERT INTO abcc_product_classification 
          (item_guid, item_name, menu_group_guid, menu_group_name, beverage_type, serving_size_oz, container_type, auto_classified)
          VALUES (${item.item_guid}, ${item.name}, ${item.group_guid}, ${item.group_name}, ${match.beverageType}, ${match.defaultSizeOz.toString()}, ${match.containerType}, true)
        `);
        classified++;
        existingSet.add(key);
      }
    }

    res.json({ classified, skipped, total: itemsResult.rows.length });
  } catch (err: any) {
    console.error("[ABCC] Auto-classify error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/classifications", async (req, res) => {
  try {
    const { beverageType, search } = req.query;
    let query = sql`
      SELECT * FROM abcc_product_classification WHERE is_active = true
    `;
    if (beverageType && beverageType !== "all") {
      query = sql`${query} AND beverage_type = ${beverageType as string}`;
    }
    if (search) {
      query = sql`${query} AND item_name ILIKE ${'%' + (search as string) + '%'}`;
    }
    query = sql`${query} ORDER BY beverage_type, item_name`;
    const result = await db.execute(query);
    res.json(result.rows);
  } catch (err: any) {
    console.error("[ABCC] Classifications error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put("/classifications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { beverageType, servingSizeOz, containerType, isActive } = req.body;
    await db.execute(sql`
      UPDATE abcc_product_classification 
      SET beverage_type = ${beverageType}, 
          serving_size_oz = ${servingSizeOz.toString()},
          container_type = ${containerType || null},
          is_active = ${isActive !== false},
          auto_classified = false,
          updated_at = NOW()
      WHERE id = ${parseInt(id)}
    `);
    res.json({ success: true });
  } catch (err: any) {
    console.error("[ABCC] Update classification error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/classifications", async (req, res) => {
  try {
    const { itemName, itemGuid, beverageType, servingSizeOz, containerType, menuGroupGuid, menuGroupName } = req.body;
    const result = await db.execute(sql`
      INSERT INTO abcc_product_classification 
      (item_guid, item_name, menu_group_guid, menu_group_name, beverage_type, serving_size_oz, container_type, auto_classified)
      VALUES (${itemGuid || null}, ${itemName}, ${menuGroupGuid || null}, ${menuGroupName || null}, ${beverageType}, ${servingSizeOz.toString()}, ${containerType || null}, false)
      RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error("[ABCC] Create classification error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/classifications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute(sql`DELETE FROM abcc_product_classification WHERE id = ${parseInt(id)}`);
    res.json({ success: true });
  } catch (err: any) {
    console.error("[ABCC] Delete classification error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/monthly-report", async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year) return res.status(400).json({ error: "year required" });

    let dateFilter;
    if (month) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endMonth = parseInt(month as string);
      const endYear = parseInt(year as string);
      const lastDay = new Date(endYear, endMonth, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
      dateFilter = sql`s.date >= ${startDate} AND s.date <= ${endDate}`;
    } else {
      dateFilter = sql`s.date >= ${year + '-01-01'} AND s.date <= ${year + '-12-31'}`;
    }

    const result = await db.execute(sql`
      SELECT 
        TO_CHAR(s.date::date, 'YYYY-MM') as month,
        COALESCE(c.beverage_type, 'unclassified') as beverage_type,
        SUM(s.quantity) as total_units,
        SUM(s.net_sales::numeric) as total_sales,
        SUM(
          CASE WHEN c.serving_size_oz IS NOT NULL AND c.serving_size_oz > 0
            THEN (s.quantity * c.serving_size_oz::numeric) / 128.0
            ELSE 0
          END
        ) as total_gallons,
        COUNT(DISTINCT s.item_name) as unique_items
      FROM rcc_daily_item_sales s
      LEFT JOIN abcc_product_classification c ON (
        (c.item_guid IS NOT NULL AND s.item_guid = c.item_guid)
        OR (c.item_guid IS NULL AND s.item_name = c.item_name)
      ) AND c.is_active = true
      WHERE ${dateFilter} AND s.source = 'toast'
      GROUP BY TO_CHAR(s.date::date, 'YYYY-MM'), COALESCE(c.beverage_type, 'unclassified')
      ORDER BY month, beverage_type
    `);

    const summary = await db.execute(sql`
      SELECT 
        COALESCE(c.beverage_type, 'unclassified') as beverage_type,
        SUM(s.quantity) as total_units,
        SUM(s.net_sales::numeric) as total_sales,
        SUM(
          CASE WHEN c.serving_size_oz IS NOT NULL AND c.serving_size_oz > 0
            THEN (s.quantity * c.serving_size_oz::numeric) / 128.0
            ELSE 0
          END
        ) as total_gallons
      FROM rcc_daily_item_sales s
      LEFT JOIN abcc_product_classification c ON (
        (c.item_guid IS NOT NULL AND s.item_guid = c.item_guid)
        OR (c.item_guid IS NULL AND s.item_name = c.item_name)
      ) AND c.is_active = true
      WHERE ${dateFilter} AND s.source = 'toast'
      GROUP BY COALESCE(c.beverage_type, 'unclassified')
      ORDER BY beverage_type
    `);

    res.json({
      monthly: result.rows,
      summary: summary.rows,
      year: parseInt(year as string),
      month: month ? parseInt(month as string) : null,
    });
  } catch (err: any) {
    console.error("[ABCC] Monthly report error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/unclassified-items", async (req, res) => {
  try {
    const { year } = req.query;
    const yearFilter = year ? sql`AND s.date >= ${year + '-01-01'} AND s.date <= ${year + '-12-31'}` : sql``;

    const result = await db.execute(sql`
      SELECT s.item_name, s.item_guid, s.sales_category_name,
             SUM(s.quantity) as total_qty, SUM(s.net_sales::numeric) as total_sales,
             COUNT(DISTINCT s.date) as days_sold
      FROM rcc_daily_item_sales s
      LEFT JOIN abcc_product_classification c ON (
        (c.item_guid IS NOT NULL AND s.item_guid = c.item_guid)
        OR (c.item_guid IS NULL AND s.item_name = c.item_name)
      )
      WHERE c.id IS NULL AND s.source = 'toast' ${yearFilter}
      GROUP BY s.item_name, s.item_guid, s.sales_category_name
      ORDER BY total_qty DESC
      LIMIT 200
    `);

    res.json(result.rows);
  } catch (err: any) {
    console.error("[ABCC] Unclassified items error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/classification-stats", async (req, res) => {
  try {
    const stats = await db.execute(sql`
      SELECT 
        beverage_type, 
        COUNT(*) as item_count,
        SUM(CASE WHEN auto_classified THEN 1 ELSE 0 END) as auto_count,
        SUM(CASE WHEN NOT auto_classified THEN 1 ELSE 0 END) as manual_count
      FROM abcc_product_classification
      WHERE is_active = true
      GROUP BY beverage_type
      ORDER BY item_count DESC
    `);

    const totalItems = await db.execute(sql`SELECT COUNT(DISTINCT item_name) as total FROM rcc_daily_item_sales WHERE source = 'toast'`);
    const classifiedItems = await db.execute(sql`SELECT COUNT(*) as total FROM abcc_product_classification WHERE is_active = true`);

    res.json({
      byType: stats.rows,
      totalSoldItems: parseInt((totalItems.rows[0] as any)?.total || '0'),
      totalClassified: parseInt((classifiedItems.rows[0] as any)?.total || '0'),
    });
  } catch (err: any) {
    console.error("[ABCC] Stats error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
