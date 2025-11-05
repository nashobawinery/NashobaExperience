import * as XLSX from 'xlsx';
import type { InsertProduct } from '@shared/schema';

export interface ExcelProductRow {
  name?: string;
  category?: string;
  type?: string;
  varietal?: string;
  vintage_year?: string;
  region?: string;
  description?: string;
  tasting_notes?: string;
  food_pairings?: string;
  serving_temp?: string;
  alcohol_content?: string;
  bottle_size?: string;
  price?: number | string;
  cost?: number | string;
  wholesale_pricing?: number | string;
  sku?: string;
  stock_quantity?: number | string;
  low_stock_threshold?: number | string;
  image_url?: string;
  label_image_url?: string;
  lifestyle_image_url?: string;
  characteristics?: string;
  production_method?: string;
  aging_process?: string;
  awards?: string;
  rating?: number | string;
  available?: string | boolean;
  featured?: string | boolean;
  new_arrival?: string | boolean;
  staff_pick?: string | boolean;
  wine_of_month?: string | boolean;
  tags?: string;
}

export interface ParseResult {
  products: InsertProduct[];
  errors: string[];
  skipped: number;
}

export function parseExcelFile(buffer: Buffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const jsonData: ExcelProductRow[] = XLSX.utils.sheet_to_json(worksheet);
  
  const products: InsertProduct[] = [];
  const errors: string[] = [];
  let skipped = 0;

  jsonData.forEach((row, index) => {
    const rowNum = index + 2; // Excel row number (header is row 1)

    // Validate required fields
    if (!row.name || !row.name.trim()) {
      skipped++;
      return; // Skip blank rows
    }

    if (!row.price || isNaN(Number(row.price))) {
      errors.push(`Row ${rowNum}: Invalid or missing price for "${row.name}"`);
      return;
    }

    if (!row.description || !row.description.trim()) {
      errors.push(`Row ${rowNum}: Missing description for "${row.name}"`);
      return;
    }

    // Normalize boolean values
    const normalizeBool = (val: string | boolean | undefined): boolean => {
      if (typeof val === 'boolean') return val;
      if (typeof val === 'string') {
        const lower = val.toLowerCase().trim();
        return lower === 'yes' || lower === 'true' || lower === '1';
      }
      return false;
    };

    // Parse tags (comma-separated string to array)
    const parseTags = (val: string | undefined): string[] | null => {
      if (!val || !val.trim()) return null;
      return val.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    };

    products.push({
      name: row.name.trim(),
      category: row.category?.trim() || 'Wine',
      type: row.type?.trim() || null,
      varietal: row.varietal?.trim() || null,
      vintageYear: row.vintage_year?.trim() || null,
      region: row.region?.trim() || null,
      description: row.description.trim(),
      tastingNotes: row.tasting_notes?.trim() || null,
      foodPairings: row.food_pairings?.trim() || null,
      servingTemp: row.serving_temp?.trim() || null,
      alcoholContent: row.alcohol_content?.trim() || null,
      bottleSize: row.bottle_size?.trim() || null,
      price: String(Number(row.price).toFixed(2)),
      cost: row.cost ? String(Number(row.cost).toFixed(2)) : null,
      wholesalePricing: row.wholesale_pricing ? String(Number(row.wholesale_pricing).toFixed(2)) : null,
      sku: row.sku?.trim() || null,
      stockQuantity: row.stock_quantity ? Number(row.stock_quantity) : 0,
      lowStockThreshold: row.low_stock_threshold ? Number(row.low_stock_threshold) : 10,
      imageUrl: row.image_url?.trim() || null,
      labelImageUrl: row.label_image_url?.trim() || null,
      lifestyleImageUrl: row.lifestyle_image_url?.trim() || null,
      characteristics: row.characteristics?.trim() || null,
      productionMethod: row.production_method?.trim() || null,
      agingProcess: row.aging_process?.trim() || null,
      awards: row.awards?.trim() || null,
      rating: row.rating ? String(Number(row.rating).toFixed(1)) : null,
      available: normalizeBool(row.available !== undefined ? row.available : true),
      featured: normalizeBool(row.featured),
      newArrival: normalizeBool(row.new_arrival),
      staffPick: normalizeBool(row.staff_pick),
      wineOfMonth: normalizeBool(row.wine_of_month),
      tags: parseTags(row.tags),
    });
  });

  return { products, errors, skipped };
}

export function generateExcelTemplate(): Buffer {
  const templateData: ExcelProductRow[] = [
    {
      name: 'Reserve Cabernet Sauvignon',
      category: 'Wine',
      type: 'Red Wine',
      varietal: 'Cabernet Sauvignon',
      vintage_year: '2020',
      region: 'Napa Valley, California',
      description: 'A rich, full-bodied Cabernet Sauvignon with complex layers of dark fruit',
      tasting_notes: 'Dark cherry, blackberry, vanilla, tobacco, oak',
      food_pairings: 'Grilled steak, roasted lamb, aged cheeses',
      serving_temp: '60-65°F',
      alcohol_content: '13.5%',
      bottle_size: '750ml',
      price: 34.99,
      cost: 15.00,
      wholesale_pricing: 24.99,
      sku: 'WINE-CAB-2020',
      stock_quantity: 48,
      low_stock_threshold: 12,
      image_url: '',
      label_image_url: '',
      lifestyle_image_url: '',
      characteristics: 'Full-bodied, dry, complex, balanced',
      production_method: 'Estate-grown grapes, stainless steel fermentation',
      aging_process: 'Aged 18 months in French oak barrels',
      awards: 'Gold Medal - 2023 Wine Competition',
      rating: 4.5,
      available: 'Yes',
      featured: 'Yes',
      new_arrival: 'No',
      staff_pick: 'Yes',
      wine_of_month: 'No',
      tags: 'red wine, cabernet, premium, award-winning',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
