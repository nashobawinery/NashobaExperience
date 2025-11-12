import { parse } from 'csv-parse/sync';
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
  category: 'wine' | 'spirits' | 'beer' | 'canned_cocktail' | 'canned_wine';
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

function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&euro;': '€',
    '&pound;': '£',
    '&yen;': '¥',
    '&cent;': '¢',
    '&mdash;': '—',
    '&ndash;': '–',
    '&hellip;': '…',
    '&bull;': '•',
    '&lsquo;': ''',
    '&rsquo;': ''',
    '&ldquo;': '"',
    '&rdquo;': '"',
  };
  
  let decoded = text;
  
  // Replace named entities
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  }
  
  // Replace numeric entities (&#123; or &#xAB;)
  decoded = decoded.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
  decoded = decoded.replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  
  return decoded;
}

function stripHtml(html: string): string {
  if (!html) return '';
  
  // Remove HTML tags first
  let text = html.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  text = decodeHtmlEntities(text);
  
  // Clean up multiple spaces and newlines
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

function mapShopifyCategory(shopifyType: string, shopifyCategory: string): 'wine' | 'spirits' | 'beer' | 'canned_cocktail' | 'canned_wine' {
  const lowerType = shopifyType?.toLowerCase() || '';
  const lowerCategory = shopifyCategory?.toLowerCase() || '';
  
  // Check for canned products first (more specific)
  if (lowerType.includes('canned') || lowerCategory.includes('canned')) {
    if (lowerType.includes('wine') || lowerCategory.includes('wine')) return 'canned_wine';
    if (lowerType.includes('cocktail') || lowerCategory.includes('cocktail')) return 'canned_cocktail';
  }
  
  // Check category field
  if (lowerCategory.includes('wine')) return 'wine';
  if (lowerCategory.includes('liquor') || lowerCategory.includes('spirits') || lowerCategory.includes('distilled')) return 'spirits';
  if (lowerCategory.includes('beer')) return 'beer';
  if (lowerCategory.includes('cocktail')) return 'canned_cocktail';
  
  // Check type field
  if (lowerType.includes('wine')) return 'wine';
  if (lowerType.includes('spirit') || lowerType.includes('liquor') || lowerType.includes('distilled')) return 'spirits';
  if (lowerType.includes('beer')) return 'beer';
  if (lowerType.includes('cider')) return 'canned_cocktail'; // Map cider to canned_cocktail
  if (lowerType.includes('cocktail')) return 'canned_cocktail';
  if (lowerType.includes('seasonal')) return 'wine'; // Default seasonal to wine
  
  // Default fallback to wine
  return 'wine';
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
