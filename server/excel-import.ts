import * as XLSX from 'xlsx';
import type { InsertProduct } from '@shared/schema';

export interface ExcelProductRow {
  Name?: string;
  Category?: string;
  Price?: number | string;
  Description?: string;
  Stock?: string;
  'Wine Color'?: string;
  Sweetness?: string;
  Body?: string;
  ABV?: string;
  'Serving Temp'?: string;
  'Tasting Notes'?: string;
  'Food Pairings'?: string;
  'Fun Facts'?: string;
  'Staff Pick'?: string | boolean;
  Featured?: string | boolean;
  SKU?: string;
  Image?: string;
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
    if (!row.Name || !row.Name.trim()) {
      skipped++;
      return; // Skip blank rows
    }

    if (!row.Price || isNaN(Number(row.Price))) {
      errors.push(`Row ${rowNum}: Invalid or missing price for "${row.Name}"`);
      return;
    }

    if (!row.Description || !row.Description.trim()) {
      errors.push(`Row ${rowNum}: Missing description for "${row.Name}"`);
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

    // Normalize stock status
    const normalizeStock = (val: string | undefined): 'in-stock' | 'low-stock' | 'out-of-stock' => {
      if (!val) return 'in-stock';
      const normalized = val.toLowerCase().replace(/[^a-z-]/g, ''); // Remove spaces and special chars
      if (normalized === 'lowstock' || normalized === 'low-stock') return 'low-stock';
      if (normalized === 'outofstock' || normalized === 'out-of-stock') return 'out-of-stock';
      return 'in-stock';
    };

    products.push({
      name: row.Name.trim(),
      category: row.Category?.trim() || 'Wine',
      price: String(Number(row.Price).toFixed(2)),
      description: row.Description.trim(),
      stock: normalizeStock(row.Stock),
      wineColor: row['Wine Color']?.trim() || null,
      sweetness: row.Sweetness?.trim() || null,
      body: row.Body?.trim() || null,
      abv: row.ABV?.trim() || null,
      servingTemp: row['Serving Temp']?.trim() || null,
      tastingNotes: row['Tasting Notes']?.trim() || null,
      foodPairings: row['Food Pairings']?.trim() || null,
      funFacts: row['Fun Facts']?.trim() || null,
      isStaffPick: normalizeBool(row['Staff Pick']),
      isFeatured: normalizeBool(row.Featured),
      sku: row.SKU?.trim() || null,
      image: row.Image?.trim() || null,
    });
  });

  return { products, errors, skipped };
}

export function generateExcelTemplate(): Buffer {
  const templateData: ExcelProductRow[] = [
    {
      Name: 'Example Wine Name',
      Category: 'Wine',
      Price: 29.99,
      Description: 'A delightful wine with complex flavors',
      Stock: 'in-stock',
      'Wine Color': 'red',
      Sweetness: 'dry',
      Body: 'full',
      ABV: '13.5%',
      'Serving Temp': '60-65°F',
      'Tasting Notes': 'Cherry, oak, vanilla',
      'Food Pairings': 'Steak, lamb, aged cheeses',
      'Fun Facts': 'This wine won a gold medal at the 2023 Wine Competition!',
      'Staff Pick': 'Yes',
      Featured: 'No',
      SKU: 'WINE-001',
      Image: '',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
