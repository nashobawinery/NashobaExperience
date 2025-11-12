import { parse } from 'csv-parse/sync';
import { decode } from 'he';
import type { InsertProduct } from "@shared/schema";

export interface ShopifyRow {
  Handle: string;
  Title: string;
  'Body (HTML)': string;
  'Variant SKU': string;
  'Variant Price': string;
  'Image Src': string;
  Type: string;
  Tags: string;
  'Product Category': string;
  Published: string;
}

export interface ParsedShopifyProduct {
  sku: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  category: 'Wine' | 'Distilled Spirits' | 'Beer' | 'Hard Cider' | 'Non-Alcoholic' | 'Merchandise';
  type?: string;
  characteristics?: string;
  rawRow: ShopifyRow;
}

export interface ShopifyImportPreview {
  products: Array<{
    product: ParsedShopifyProduct;
    action: 'create' | 'update' | 'skip';
    reason?: string;
    existingProduct?: {
      id: string;
      name: string;
      price: string;
      sku: string;
    };
  }>;
  summary: {
    total: number;
    toCreate: number;
    toUpdate: number;
    toSkip: number;
  };
  errors: string[];
}

function stripHtml(html: string): string {
  if (!html) return '';
  
  // Decode HTML entities first
  let text = decode(html);
  
  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, '');
  
  // Clean up multiple spaces and newlines
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

function mapShopifyCategory(shopifyType: string, shopifyCategory: string): 'Wine' | 'Distilled Spirits' | 'Beer' | 'Hard Cider' | 'Non-Alcoholic' | 'Merchandise' {
  const lowerType = shopifyType?.toLowerCase() || '';
  const lowerCategory = shopifyCategory?.toLowerCase() || '';
  
  // Check category field first
  if (lowerCategory.includes('wine')) return 'Wine';
  if (lowerCategory.includes('liquor') || lowerCategory.includes('spirits')) return 'Distilled Spirits';
  if (lowerCategory.includes('beer')) return 'Beer';
  
  // Then check type field
  if (lowerType.includes('wine')) return 'Wine';
  if (lowerType.includes('spirit') || lowerType.includes('distilled')) return 'Distilled Spirits';
  if (lowerType.includes('beer')) return 'Beer';
  if (lowerType.includes('cider')) return 'Hard Cider';
  if (lowerType.includes('seasonal')) return 'Wine'; // Default seasonal to Wine
  
  // Default
  return 'Wine';
}

export function parseShopifyCsv(buffer: Buffer): { products: ParsedShopifyProduct[]; errors: string[] } {
  const errors: string[] = [];
  const products: ParsedShopifyProduct[] = [];
  
  try {
    const csvContent = buffer.toString('utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as ShopifyRow[];
    
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2; // +2 because of header row and 0-indexing
      
      // Skip if no SKU
      if (!row['Variant SKU'] || row['Variant SKU'].trim() === '') {
        errors.push(`Row ${rowNum}: Skipped - No SKU provided (Title: "${row.Title || 'Unknown'}")`);
        continue;
      }
      
      // Skip if not published
      if (row.Published !== 'TRUE') {
        continue; // Silently skip unpublished products
      }
      
      // Parse price
      const priceStr = row['Variant Price']?.trim() || '0';
      const price = parseFloat(priceStr);
      if (isNaN(price) || price < 0) {
        errors.push(`Row ${rowNum}: Invalid price "${priceStr}" for SKU ${row['Variant SKU']}`);
        continue;
      }
      
      // Required fields
      const name = row.Title?.trim();
      if (!name) {
        errors.push(`Row ${rowNum}: Missing product title for SKU ${row['Variant SKU']}`);
        continue;
      }
      
      const description = stripHtml(row['Body (HTML)'] || '');
      if (!description) {
        errors.push(`Row ${rowNum}: Missing description for SKU ${row['Variant SKU']}`);
        continue;
      }
      
      const category = mapShopifyCategory(row.Type, row['Product Category']);
      
      const product: ParsedShopifyProduct = {
        sku: row['Variant SKU'].trim().toUpperCase(),
        name,
        description,
        price,
        category,
        type: row.Type?.trim() || undefined,
        imageUrl: row['Image Src']?.trim() || undefined,
        characteristics: row.Tags?.trim() || undefined,
        rawRow: row,
      };
      
      products.push(product);
    }
    
    return { products, errors };
  } catch (error) {
    errors.push(`CSV parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { products, errors };
  }
}
