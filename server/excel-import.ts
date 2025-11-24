import * as XLSX from 'xlsx';
import type { InsertProduct } from '@shared/schema';
import { 
  insertProductSchema,
  insertFilterOptionSchema,
  insertTriviaQuestionSchema,
  insertSlideshowImageSchema,
  insertAppSettingSchema,
  insertMediaLibrarySchema,
  insertWhitelistedEmailSchema,
  insertCommercialSchema,
  insertVideoSchema,
  insertTriviaAchievementSchema,
  insertTierPricingSchema,
  insertSalesRepSchema,
  insertB2bCustomerSchema,
  insertB2bOrderSchema,
  insertB2bOrderItemSchema
} from '@shared/schema';
import { z, ZodError } from 'zod';

// Shared normalization utilities
function normalizeBool(val: string | boolean | undefined): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const lower = val.toLowerCase().trim();
    return lower === 'yes' || lower === 'true' || lower === '1';
  }
  return false;
}

function toCurrencyString(val: number | string | undefined | null): string | null {
  if (val === undefined || val === null || val === '') return null;
  const num = Number(val);
  return isNaN(num) ? null : String(num.toFixed(2));
}

function toDecimal(val: number | string | undefined | null): number | null {
  if (val === undefined || val === null || val === '') return null;
  const num = Number(val);
  return isNaN(num) ? null : Number(num.toFixed(2));
}

function toNumber(val: number | string | undefined | null, defaultValue: number = 0): number {
  if (val === undefined || val === null || val === '') return defaultValue;
  const num = Number(val);
  return isNaN(num) ? defaultValue : num;
}

function splitTags(val: string | undefined | null): string[] | null {
  if (!val || !val.trim()) return null;
  return val.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
}

function parseDate(val: Date | string | undefined | null): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

// Format Zod validation errors for actionable messages
function formatZodError(sheetName: string, rowNum: number, error: ZodError): string {
  const issues = error.errors.map(issue => {
    const field = issue.path.join('.');
    return `${field}: ${issue.message}`;
  }).join('; ');
  return `${sheetName} Row ${rowNum} - ${issues}`;
}

// Generic sheet validation helper
interface ValidateSheetResult<T> {
  records: T[];
  errors: string[];
  skipped: number;
}

function validateSheet<T>(
  sheetName: string,
  rawRows: any[],
  schema: z.ZodType<T>,
  transformer: (row: any) => any
): ValidateSheetResult<T> {
  const records: T[] = [];
  const errors: string[] = [];
  let skipped = 0;

  rawRows.forEach((row, index) => {
    const rowNum = index + 2; // Excel row number (header is row 1)
    
    try {
      const transformed = transformer(row);
      const result = schema.safeParse(transformed);
      
      if (result.success) {
        records.push(result.data);
      } else {
        errors.push(formatZodError(sheetName, rowNum, result.error));
      }
    } catch (error) {
      errors.push(`${sheetName} Row ${rowNum} - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  return { records, errors, skipped };
}

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
  case_size?: number | string;
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
      category: (row.category?.trim() || 'wine') as any,
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
      caseSize: row.case_size ? Number(row.case_size) : 12,
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
      case_size: 12,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

export function exportProductsToExcel(products: any[]): Buffer {
  const exportData: ExcelProductRow[] = products.map(product => ({
    name: product.name,
    category: product.category || 'wine',
    type: product.type || '',
    varietal: product.varietal || '',
    vintage_year: product.vintageYear || '',
    region: product.region || '',
    description: product.description || '',
    tasting_notes: product.tastingNotes || '',
    food_pairings: product.foodPairings || '',
    serving_temp: product.servingTemp || '',
    alcohol_content: product.alcoholContent || '',
    bottle_size: product.bottleSize || '',
    price: product.price ? parseFloat(product.price) : 0,
    cost: product.cost ? parseFloat(product.cost) : undefined,
    wholesale_pricing: product.wholesalePricing ? parseFloat(product.wholesalePricing) : undefined,
    sku: product.sku || '',
    stock_quantity: product.stockQuantity || 0,
    low_stock_threshold: product.lowStockThreshold || 10,
    image_url: product.imageUrl || '',
    label_image_url: product.labelImageUrl || '',
    lifestyle_image_url: product.lifestyleImageUrl || '',
    characteristics: product.characteristics || '',
    production_method: product.productionMethod || '',
    aging_process: product.agingProcess || '',
    awards: product.awards || '',
    rating: product.rating ? parseFloat(product.rating) : undefined,
    available: product.available ? 'Yes' : 'No',
    featured: product.featured ? 'Yes' : 'No',
    new_arrival: product.newArrival ? 'Yes' : 'No',
    staff_pick: product.staffPick ? 'Yes' : 'No',
    wine_of_month: product.wineOfMonth ? 'Yes' : 'No',
    tags: product.tags ? product.tags.join(', ') : '',
    case_size: product.caseSize || 12,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

// Export all database data to a multi-sheet Excel workbook
export function exportAllDataToExcel(data: {
  products: any[];
  filterOptions: any[];
  triviaQuestions: any[];
  slideshowImages: any[];
  appSettings: any[];
  mediaLibrary: any[];
  whitelistedEmails: any[];
  commercials: any[];
  videos: any[];
  triviaAchievements: any[];
  tierPricing?: any[];
  salesReps?: any[];
  b2bCustomers?: any[];
  b2bOrders?: any[];
  b2bOrderItems?: any[];
  b2bSlideshowSlides?: any[];
  b2bAdmins?: any[];
  b2bSettings?: any[];
  b2bCommissions?: any[];
  b2bEmailTemplates?: any[];
  b2bEmailAutomationLogs?: any[];
}): Buffer {
  const workbook = XLSX.utils.book_new();

  // Products sheet
  const productData = data.products.map(product => ({
    name: product.name,
    category: product.category || 'wine',
    type: product.type || '',
    varietal: product.varietal || '',
    vintage_year: product.vintageYear || '',
    region: product.region || '',
    description: product.description || '',
    tasting_notes: product.tastingNotes || '',
    food_pairings: product.foodPairings || '',
    serving_temp: product.servingTemp || '',
    alcohol_content: product.alcoholContent || '',
    bottle_size: product.bottleSize || '',
    price: product.price ? parseFloat(product.price) : 0,
    cost: product.cost ? parseFloat(product.cost) : undefined,
    wholesale_pricing: product.wholesalePricing ? parseFloat(product.wholesalePricing) : undefined,
    sku: product.sku || '',
    stock_quantity: product.stockQuantity || 0,
    low_stock_threshold: product.lowStockThreshold || 10,
    image_url: product.imageUrl || '',
    label_image_url: product.labelImageUrl || '',
    lifestyle_image_url: product.lifestyleImageUrl || '',
    characteristics: product.characteristics || '',
    production_method: product.productionMethod || '',
    aging_process: product.agingProcess || '',
    awards: product.awards || '',
    rating: product.rating ? parseFloat(product.rating) : undefined,
    available: product.available ? 'Yes' : 'No',
    featured: product.featured ? 'Yes' : 'No',
    new_arrival: product.newArrival ? 'Yes' : 'No',
    staff_pick: product.staffPick ? 'Yes' : 'No',
    wine_of_month: product.wineOfMonth ? 'Yes' : 'No',
    tags: product.tags ? product.tags.join(', ') : '',
    case_size: product.caseSize || 12,
  }));
  const productsSheet = XLSX.utils.json_to_sheet(productData);
  XLSX.utils.book_append_sheet(workbook, productsSheet, 'Products');

  // Filter Options sheet
  const filterData = data.filterOptions.map(filter => ({
    field_type: filter.fieldType,
    option_value: filter.optionValue,
    display_label: filter.displayLabel,
    sort_order: filter.sortOrder,
    is_active: filter.isActive ? 'Yes' : 'No',
  }));
  const filterSheet = XLSX.utils.json_to_sheet(filterData);
  XLSX.utils.book_append_sheet(workbook, filterSheet, 'FilterOptions');

  // Trivia Questions sheet
  const triviaData = data.triviaQuestions.map(trivia => ({
    question: trivia.question,
    answer_1: trivia.answers[0] || '',
    answer_2: trivia.answers[1] || '',
    answer_3: trivia.answers[2] || '',
    answer_4: trivia.answers[3] || '',
    correct_index: trivia.correctIndex,
    explanation: trivia.explanation,
    image: trivia.image || '',
    is_active: trivia.isActive ? 'Yes' : 'No',
  }));
  const triviaSheet = XLSX.utils.json_to_sheet(triviaData);
  XLSX.utils.book_append_sheet(workbook, triviaSheet, 'TriviaQuestions');

  // Slideshow Images sheet
  const slideshowData = data.slideshowImages.map(image => ({
    filename: image.filename,
    caption: image.caption || '',
    description: image.description || '',
    display_order: image.displayOrder,
    is_active: image.isActive ? 'Yes' : 'No',
  }));
  const slideshowSheet = XLSX.utils.json_to_sheet(slideshowData);
  XLSX.utils.book_append_sheet(workbook, slideshowSheet, 'SlideshowImages');

  // App Settings sheet
  const settingsData = data.appSettings.map(setting => ({
    key: setting.key,
    value: JSON.stringify(setting.value),
  }));
  const settingsSheet = XLSX.utils.json_to_sheet(settingsData);
  XLSX.utils.book_append_sheet(workbook, settingsSheet, 'AppSettings');

  // Media Library sheet
  const mediaData = data.mediaLibrary.map(media => ({
    filename: media.filename,
    original_filename: media.originalFilename,
    mime_type: media.mimeType,
    file_size: media.fileSize,
    object_path: media.objectPath,
    public_url: media.publicUrl,
    category: media.category || 'uncategorized',
    description: media.description || '',
    alt_text: media.altText || '',
    tags: media.tags ? media.tags.join(', ') : '',
  }));
  const mediaSheet = XLSX.utils.json_to_sheet(mediaData);
  XLSX.utils.book_append_sheet(workbook, mediaSheet, 'MediaLibrary');

  // Whitelisted Emails sheet
  const whitelistData = data.whitelistedEmails.map(email => ({
    email: email.email,
    role: email.role,
  }));
  const whitelistSheet = XLSX.utils.json_to_sheet(whitelistData);
  XLSX.utils.book_append_sheet(workbook, whitelistSheet, 'WhitelistedEmails');

  // Commercials sheet
  const commercialsData = data.commercials.map(commercial => ({
    title: commercial.title,
    description: commercial.description || '',
    imageUrl: commercial.imageUrl || '',
    sortOrder: commercial.sortOrder,
    isActive: commercial.isActive ? 'Yes' : 'No',
  }));
  const commercialsSheet = XLSX.utils.json_to_sheet(commercialsData);
  XLSX.utils.book_append_sheet(workbook, commercialsSheet, 'Commercials');

  // Videos sheet
  const videosData = data.videos.map(video => ({
    name: video.name,
    description: video.description || '',
    videoUrl: video.videoUrl,
    thumbnailUrl: video.thumbnailUrl || '',
    category: video.category,
    isActive: video.isActive ? 'Yes' : 'No',
    sortOrder: video.sortOrder,
  }));
  const videosSheet = XLSX.utils.json_to_sheet(videosData);
  XLSX.utils.book_append_sheet(workbook, videosSheet, 'Videos');

  // Trivia Achievements sheet
  const achievementsData = data.triviaAchievements.map(achievement => ({
    scoreThreshold: achievement.scoreThreshold,
    rewardType: achievement.rewardType,
    rewardValue: achievement.rewardValue,
    rewardLabel: achievement.rewardLabel,
    message: achievement.message || '',
    isActive: achievement.isActive ? 'Yes' : 'No',
  }));
  const achievementsSheet = XLSX.utils.json_to_sheet(achievementsData);
  XLSX.utils.book_append_sheet(workbook, achievementsSheet, 'TriviaAchievements');

  // B2B Tier Pricing sheet (if provided) - NO ID export, tierName is business key
  if (data.tierPricing && data.tierPricing.length > 0) {
    const tierData = data.tierPricing.map(tier => ({
      tier_name: tier.tierName, // Business key for upsert
      description: tier.description || '',
      discount_percentage: tier.discountPercentage ? parseFloat(tier.discountPercentage) : 0,
      sort_order: tier.sortOrder,
    }));
    const tierSheet = XLSX.utils.json_to_sheet(tierData);
    XLSX.utils.book_append_sheet(workbook, tierSheet, 'TierPricing');
  }

  // B2B Sales Reps sheet (if provided) - EXCLUDE password_hash, email is business key
  if (data.salesReps && data.salesReps.length > 0) {
    const salesRepData = data.salesReps.map(rep => ({
      email: rep.email, // Business key for upsert
      first_name: rep.firstName,
      last_name: rep.lastName,
      password_hash: '', // NEVER export passwords
      phone_number: rep.phoneNumber || '',
      active: rep.active ? 'Yes' : 'No',
    }));
    const salesRepSheet = XLSX.utils.json_to_sheet(salesRepData);
    XLSX.utils.book_append_sheet(workbook, salesRepSheet, 'SalesReps');
  }

  // B2B Customers sheet (if provided) - Use business keys for FKs
  if (data.b2bCustomers && data.b2bCustomers.length > 0) {
    const customerData = data.b2bCustomers.map(customer => {
      // Find tier name from tierPricing data
      const tier = data.tierPricing?.find(t => t.id === customer.pricingTierId);
      // Find sales rep email from salesReps data
      const salesRep = data.salesReps?.find(r => r.id === customer.salesRepId);
      
      return {
        email_address: customer.emailAddress, // Business key for upsert
        account_name: customer.accountName,
        account_status: customer.accountStatus,
        pricing_tier_name: tier?.tierName || '', // Business key instead of UUID
        license_number: customer.licenseNumber || '',
        tax_id: customer.taxId || '',
        credit_terms: customer.creditTerms || '',
        credit_limit: customer.creditLimit ? parseFloat(customer.creditLimit) : undefined,
        primary_contact_name: customer.primaryContactName,
        primary_contact_role: customer.primaryContactRole || '',
        password_hash: '', // NEVER export passwords
        phone_number: customer.phoneNumber,
        alt_phone_number: customer.altPhoneNumber || '',
        billing_address: customer.billingAddress || '',
        billing_city: customer.billingCity || '',
        billing_state: customer.billingState || '',
        billing_zip_code: customer.billingZipCode || '',
        shipping_address: customer.shippingAddress || '',
        shipping_city: customer.shippingCity || '',
        shipping_state: customer.shippingState || '',
        shipping_zip_code: customer.shippingZipCode || '',
        sales_rep_email: salesRep?.email || '', // Business key instead of UUID
        approved_at: customer.approvedAt || '',
        notes: customer.notes || '',
        accepts_marketing: customer.acceptsMarketing ? 'Yes' : 'No',
      };
    });
    const customerSheet = XLSX.utils.json_to_sheet(customerData);
    XLSX.utils.book_append_sheet(workbook, customerSheet, 'B2bCustomers');
  }

  // B2B Orders sheet (OPTIONAL - only if provided) - Use business keys for FKs
  if (data.b2bOrders && data.b2bOrders.length > 0) {
    const orderData = data.b2bOrders.map(order => {
      // Find customer email from b2bCustomers data
      const customer = data.b2bCustomers?.find(c => c.id === order.customerId);
      
      return {
        order_number: order.orderNumber, // Business key for upsert
        customer_email: customer?.emailAddress || '', // Business key instead of UUID
        order_date: order.orderDate,
        status: order.status,
        subtotal: order.subtotal ? parseFloat(order.subtotal) : 0,
        tax: order.tax ? parseFloat(order.tax) : 0,
        total: order.total ? parseFloat(order.total) : 0,
        notes: order.notes || '',
        shipping_address: order.shippingAddress || '',
        shipping_city: order.shippingCity || '',
        shipping_state: order.shippingState || '',
        shipping_zip_code: order.shippingZipCode || '',
      };
    });
    const orderSheet = XLSX.utils.json_to_sheet(orderData);
    XLSX.utils.book_append_sheet(workbook, orderSheet, 'B2bOrders');
  }

  // B2B Order Items sheet (OPTIONAL - only if provided) - Use business keys for FKs
  if (data.b2bOrderItems && data.b2bOrderItems.length > 0) {
    const orderItemData = data.b2bOrderItems.map(item => {
      // Find order number from b2bOrders data
      const order = data.b2bOrders?.find(o => o.id === item.orderId);
      // Find product SKU from products data
      const product = data.products?.find(p => p.id === item.productId);
      
      return {
        order_number: order?.orderNumber || '', // Business key instead of UUID
        product_sku: product?.sku || item.sku || '', // Business key instead of UUID
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice ? parseFloat(item.unitPrice) : 0,
        retail_price: item.retailPrice ? parseFloat(item.retailPrice) : 0,
        line_total: item.lineTotal ? parseFloat(item.lineTotal) : 0,
      };
    });
    const orderItemSheet = XLSX.utils.json_to_sheet(orderItemData);
    XLSX.utils.book_append_sheet(workbook, orderItemSheet, 'B2bOrderItems');
  }

  // B2B Slideshow Slides sheet (if provided)
  if (data.b2bSlideshowSlides && data.b2bSlideshowSlides.length > 0) {
    const slideshowData = data.b2bSlideshowSlides.map(slide => ({
      title: slide.title,
      content: slide.content || '',
      highlight: slide.highlight || '',
      media_type: slide.mediaType || 'none',
      media_url: slide.mediaUrl || '',
      icon_name: slide.iconName || '',
      sort_order: slide.sortOrder,
      active: slide.active ? 'Yes' : 'No',
    }));
    const slideshowSheet = XLSX.utils.json_to_sheet(slideshowData);
    XLSX.utils.book_append_sheet(workbook, slideshowSheet, 'B2bSlideshowSlides');
  }

  // B2B Admins sheet (if provided) - EXCLUDE password_hash, email is business key
  if (data.b2bAdmins && data.b2bAdmins.length > 0) {
    const adminData = data.b2bAdmins.map(admin => ({
      email: admin.email, // Business key for upsert
      name: admin.name,
      password_hash: '', // NEVER export passwords
      active: admin.active ? 'Yes' : 'No',
    }));
    const adminSheet = XLSX.utils.json_to_sheet(adminData);
    XLSX.utils.book_append_sheet(workbook, adminSheet, 'B2bAdmins');
  }

  // B2B Settings sheet (if provided)
  if (data.b2bSettings && data.b2bSettings.length > 0) {
    const settingsData = data.b2bSettings.map(setting => ({
      key: setting.key, // Business key for upsert
      value: JSON.stringify(setting.value),
    }));
    const settingsSheet = XLSX.utils.json_to_sheet(settingsData);
    XLSX.utils.book_append_sheet(workbook, settingsSheet, 'B2bSettings');
  }

  // B2B Commissions sheet (if provided)
  if (data.b2bCommissions && data.b2bCommissions.length > 0) {
    const commissionData = data.b2bCommissions.map(commission => ({
      id: commission.id,
      order_id: commission.orderId,
      sales_rep_id: commission.salesRepId,
      commission_amount: commission.commissionAmount ? parseFloat(commission.commissionAmount) : 0,
      status: commission.status,
      pay_period: commission.payPeriod || '',
      paid_to_sales_rep: commission.paidToSalesRep ? 'Yes' : 'No',
      paid_to_sales_rep_at: commission.paidToSalesRepAt ? new Date(commission.paidToSalesRepAt).toISOString() : '',
      created_at: commission.createdAt ? new Date(commission.createdAt).toISOString() : '',
    }));
    const commissionSheet = XLSX.utils.json_to_sheet(commissionData);
    XLSX.utils.book_append_sheet(workbook, commissionSheet, 'B2bCommissions');
  }

  // B2B Email Templates sheet (if provided)
  if (data.b2bEmailTemplates && data.b2bEmailTemplates.length > 0) {
    const templateData = data.b2bEmailTemplates.map(template => ({
      id: template.id,
      name: template.name,
      subject: template.subject,
      html_content: template.htmlContent || '',
      trigger_type: template.triggerType || '',
      active: template.active ? 'Yes' : 'No',
      created_at: template.createdAt ? new Date(template.createdAt).toISOString() : '',
    }));
    const templateSheet = XLSX.utils.json_to_sheet(templateData);
    XLSX.utils.book_append_sheet(workbook, templateSheet, 'B2bEmailTemplates');
  }

  // B2B Email Automation Logs sheet (if provided)
  if (data.b2bEmailAutomationLogs && data.b2bEmailAutomationLogs.length > 0) {
    const logData = data.b2bEmailAutomationLogs.map(log => ({
      id: log.id,
      customer_id: log.customerId,
      email_type: log.emailType,
      recipient_email: log.recipientEmail,
      subject: log.subject,
      sent_at: log.sentAt ? new Date(log.sentAt).toISOString() : '',
      status: log.status || 'sent',
    }));
    const logSheet = XLSX.utils.json_to_sheet(logData);
    XLSX.utils.book_append_sheet(workbook, logSheet, 'B2bEmailAutomationLogs');
  }

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

// Parse comprehensive Excel file with all data types
export interface ParseAllDataResult {
  products: InsertProduct[];
  filterOptions: any[];
  triviaQuestions: any[];
  slideshowImages: any[];
  appSettings: any[];
  mediaLibrary: any[];
  whitelistedEmails: any[];
  commercials: any[];
  videos: any[];
  triviaAchievements: any[];
  tierPricing: any[];
  salesReps: any[];
  b2bCustomers: any[];
  b2bOrders: any[];
  b2bOrderItems: any[];
  b2bSlideshowSlides: any[];
  b2bAdmins: any[];
  b2bSettings: any[];
  b2bCommissions: any[];
  b2bEmailTemplates: any[];
  b2bEmailAutomationLogs: any[];
  errors: string[];
  warnings: string[];
}

export function parseAllDataExcelFile(buffer: Buffer): ParseAllDataResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const result: ParseAllDataResult = {
    products: [],
    filterOptions: [],
    triviaQuestions: [],
    slideshowImages: [],
    appSettings: [],
    mediaLibrary: [],
    whitelistedEmails: [],
    commercials: [],
    videos: [],
    triviaAchievements: [],
    tierPricing: [],
    salesReps: [],
    b2bCustomers: [],
    b2bOrders: [],
    b2bOrderItems: [],
    b2bSlideshowSlides: [],
    b2bAdmins: [],
    b2bSettings: [],
    b2bCommissions: [],
    b2bEmailTemplates: [],
    b2bEmailAutomationLogs: [],
    errors: [],
    warnings: [],
  };

  // Parse Products sheet with validation
  if (workbook.SheetNames.includes('Products')) {
    const productsSheet = workbook.Sheets['Products'];
    const rawProductsData: ExcelProductRow[] = XLSX.utils.sheet_to_json(productsSheet);
    
    const validationResult = validateSheet('Products', rawProductsData, insertProductSchema, (row: ExcelProductRow) => {
      // Skip completely blank rows
      if (!row.name || !row.name.trim()) {
        throw new Error('Blank row - skipping');
      }

      return {
        name: row.name.trim(),
        category: row.category?.trim() || 'wine',
        type: row.type?.trim() || null,
        varietal: row.varietal?.trim() || null,
        vintageYear: row.vintage_year?.trim() || null,
        region: row.region?.trim() || null,
        description: row.description?.trim() || '',
        tastingNotes: row.tasting_notes?.trim() || null,
        foodPairings: row.food_pairings?.trim() || null,
        servingTemp: row.serving_temp?.trim() || null,
        alcoholContent: row.alcohol_content?.trim() || null,
        bottleSize: row.bottle_size?.trim() || null,
        price: toCurrencyString(row.price),
        cost: toCurrencyString(row.cost),
        wholesalePricing: toCurrencyString(row.wholesale_pricing),
        sku: row.sku ? String(row.sku).trim() : null,
        stockQuantity: toNumber(row.stock_quantity, 0),
        lowStockThreshold: toNumber(row.low_stock_threshold, 10),
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
        tags: splitTags(row.tags),
      };
    });

    result.products = validationResult.records;
    result.errors.push(...validationResult.errors);
  } else {
    result.warnings.push('No Products sheet found in the Excel file');
  }

  // Parse Filter Options sheet
  if (workbook.SheetNames.includes('FilterOptions')) {
    const filterSheet = workbook.Sheets['FilterOptions'];
    const rawFilterData: any[] = XLSX.utils.sheet_to_json(filterSheet);
    
    const validationResult = validateSheet('FilterOptions', rawFilterData, insertFilterOptionSchema, (row: any) => {
      return {
        fieldType: row.field_type?.trim() || '',
        optionValue: row.option_value?.trim() || '',
        displayLabel: row.display_label?.trim() || '',
        sortOrder: toNumber(row.sort_order, 0),
        isActive: normalizeBool(row.is_active !== undefined ? row.is_active : true),
      };
    });

    result.filterOptions = validationResult.records;
    result.errors.push(...validationResult.errors);
  } else {
    result.warnings.push('No FilterOptions sheet found in the Excel file');
  }

  // Parse Trivia Questions sheet
  if (workbook.SheetNames.includes('TriviaQuestions')) {
    const triviaSheet = workbook.Sheets['TriviaQuestions'];
    const rawTriviaData: any[] = XLSX.utils.sheet_to_json(triviaSheet);
    
    const validationResult = validateSheet('TriviaQuestions', rawTriviaData, insertTriviaQuestionSchema, (row: any) => {
      const answers = [
        row.answer_1?.trim(),
        row.answer_2?.trim(),
        row.answer_3?.trim(),
        row.answer_4?.trim(),
      ].filter((a: any) => a && a.length > 0);

      return {
        question: row.question?.trim() || '',
        answers,
        correctIndex: toNumber(row.correct_index, 0),
        explanation: row.explanation?.trim() || '',
        image: row.image?.trim() || null,
        isActive: normalizeBool(row.is_active !== undefined ? row.is_active : true),
      };
    });

    result.triviaQuestions = validationResult.records;
    result.errors.push(...validationResult.errors);
  } else {
    result.warnings.push('No TriviaQuestions sheet found in the Excel file');
  }

  // Parse Slideshow Images sheet
  if (workbook.SheetNames.includes('SlideshowImages')) {
    const slideshowSheet = workbook.Sheets['SlideshowImages'];
    const rawSlideshowData: any[] = XLSX.utils.sheet_to_json(slideshowSheet);
    
    const validationResult = validateSheet('SlideshowImages', rawSlideshowData, insertSlideshowImageSchema, (row: any) => {
      return {
        filename: row.filename?.trim() || null,
        imageUrl: row.image_url?.trim() || null,
        title: row.title?.trim() || null,
        contentHtml: row.content_html?.trim() || null,
        caption: row.caption?.trim() || null,
        description: row.description?.trim() || null,
        displayOrder: toNumber(row.display_order, 0),
        isActive: normalizeBool(row.is_active !== undefined ? row.is_active : true),
        isRequired: normalizeBool(row.is_required),
      };
    });

    result.slideshowImages = validationResult.records;
    result.errors.push(...validationResult.errors);
  } else {
    result.warnings.push('No SlideshowImages sheet found in the Excel file');
  }

  // Parse App Settings sheet
  if (workbook.SheetNames.includes('AppSettings')) {
    const settingsSheet = workbook.Sheets['AppSettings'];
    const rawSettingsData: any[] = XLSX.utils.sheet_to_json(settingsSheet);
    
    const validationResult = validateSheet('AppSettings', rawSettingsData, insertAppSettingSchema, (row: any) => {
      let parsedValue;
      try {
        parsedValue = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
      } catch (e) {
        throw new Error(`Invalid JSON value for key "${row.key}"`);
      }

      return {
        key: row.key?.trim() || '',
        value: parsedValue,
      };
    });

    result.appSettings = validationResult.records;
    result.errors.push(...validationResult.errors);
  } else {
    result.warnings.push('No AppSettings sheet found in the Excel file');
  }

  // Parse Media Library sheet
  if (workbook.SheetNames.includes('MediaLibrary')) {
    const mediaSheet = workbook.Sheets['MediaLibrary'];
    const rawMediaData: any[] = XLSX.utils.sheet_to_json(mediaSheet);
    
    const validationResult = validateSheet('MediaLibrary', rawMediaData, insertMediaLibrarySchema, (row: any) => {
      return {
        filename: row.filename?.trim() || '',
        originalFilename: row.original_filename?.trim() || row.filename?.trim() || '',
        mimeType: row.mime_type?.trim() || 'application/octet-stream',
        fileSize: toNumber(row.file_size, 0),
        objectPath: row.object_path?.trim() || '',
        publicUrl: row.public_url?.trim() || '',
        category: row.category?.trim() || 'uncategorized',
        description: row.description?.trim() || null,
        altText: row.alt_text?.trim() || null,
        tags: splitTags(row.tags),
      };
    });

    result.mediaLibrary = validationResult.records;
    result.errors.push(...validationResult.errors);
  } else {
    result.warnings.push('No MediaLibrary sheet found in the Excel file');
  }

  // Parse Whitelisted Emails sheet
  if (workbook.SheetNames.includes('WhitelistedEmails')) {
    const whitelistSheet = workbook.Sheets['WhitelistedEmails'];
    const rawWhitelistData: any[] = XLSX.utils.sheet_to_json(whitelistSheet);
    
    const validationResult = validateSheet('WhitelistedEmails', rawWhitelistData, insertWhitelistedEmailSchema, (row: any) => {
      return {
        email: row.email?.trim() || '',
        role: row.role?.trim() || 'viewer',
      };
    });

    result.whitelistedEmails = validationResult.records;
    result.errors.push(...validationResult.errors);
  } else {
    result.warnings.push('No WhitelistedEmails sheet found in the Excel file');
  }

  // Parse Commercials sheet
  if (workbook.SheetNames.includes('Commercials')) {
    const commercialsSheet = workbook.Sheets['Commercials'];
    const rawCommercialsData: any[] = XLSX.utils.sheet_to_json(commercialsSheet);
    
    const validationResult = validateSheet('Commercials', rawCommercialsData, insertCommercialSchema, (row: any) => {
      return {
        title: row.title?.trim() || '',
        description: row.description?.trim() || null,
        imageUrl: row.image_url?.trim() || row.imageUrl?.trim() || '',
        sortOrder: toNumber(row.sort_order || row.sortOrder, 0),
        isActive: normalizeBool(row.is_active !== undefined ? row.is_active : (row.isActive !== undefined ? row.isActive : true)),
      };
    });

    result.commercials = validationResult.records;
    result.errors.push(...validationResult.errors);
  } else {
    result.warnings.push('No Commercials sheet found in the Excel file');
  }

  // Parse Videos sheet
  if (workbook.SheetNames.includes('Videos')) {
    const videosSheet = workbook.Sheets['Videos'];
    const rawVideosData: any[] = XLSX.utils.sheet_to_json(videosSheet);
    
    const validationResult = validateSheet('Videos', rawVideosData, insertVideoSchema, (row: any) => {
      return {
        title: row.title?.trim() || row.name?.trim() || '',
        description: row.description?.trim() || null,
        videoUrl: row.video_url?.trim() || row.videoUrl?.trim() || '',
        thumbnailUrl: row.thumbnail_url?.trim() || row.thumbnailUrl?.trim() || null,
        duration: row.duration?.trim() || null,
        sortOrder: toNumber(row.sort_order || row.sortOrder, 0),
        isActive: normalizeBool(row.is_active !== undefined ? row.is_active : (row.isActive !== undefined ? row.isActive : true)),
      };
    });

    result.videos = validationResult.records;
    result.errors.push(...validationResult.errors);
  } else {
    result.warnings.push('No Videos sheet found in the Excel file');
  }

  // Parse Trivia Achievements sheet
  if (workbook.SheetNames.includes('TriviaAchievements')) {
    const achievementsSheet = workbook.Sheets['TriviaAchievements'];
    const rawAchievementsData: any[] = XLSX.utils.sheet_to_json(achievementsSheet);
    
    const validationResult = validateSheet('TriviaAchievements', rawAchievementsData, insertTriviaAchievementSchema, (row: any) => {
      return {
        scoreThreshold: toNumber(row.score_threshold || row.scoreThreshold),
        rewardType: (row.reward_type?.trim() || row.rewardType?.trim() || '') as any,
        rewardValue: toCurrencyString(row.reward_value || row.rewardValue) || '0',
        achievementMessage: row.achievement_message?.trim() || row.achievementMessage?.trim() || row.message?.trim() || '',
        enabled: normalizeBool(row.enabled !== undefined ? row.enabled : (row.is_active !== undefined ? row.is_active : (row.isActive !== undefined ? row.isActive : true))),
        displayOrder: toNumber(row.display_order || row.displayOrder, 0),
      };
    });

    result.triviaAchievements = validationResult.records;
    result.errors.push(...validationResult.errors);
  } else {
    result.warnings.push('No TriviaAchievements sheet found in the Excel file');
  }

  // Parse B2B Tier Pricing sheet (validated - independent entity)
  if (workbook.SheetNames.includes('TierPricing')) {
    const tierSheet = workbook.Sheets['TierPricing'];
    const rawTierData: any[] = XLSX.utils.sheet_to_json(tierSheet);
    
    // Inline schema to avoid .omit() type inference issues
    const tierPricingSchema = z.object({
      tierName: z.string().min(1),
      description: z.string().nullable(),
      discountPercentage: z.number(),
      sortOrder: z.number(),
    });

    const validationResult = validateSheet('TierPricing', rawTierData, tierPricingSchema, (row: any) => ({
      tierName: row.tier_name?.trim() || '',
      description: row.description?.trim() || null,
      discountPercentage: toDecimal(row.discount_percentage),  // No || 0 default
      sortOrder: toNumber(row.sort_order, 0),
    }));

    result.tierPricing = validationResult.records;
    result.errors.push(...validationResult.errors);
  }

  // Parse B2B Sales Reps sheet (validated - independent entity, password excluded)
  if (workbook.SheetNames.includes('SalesReps')) {
    const salesRepSheet = workbook.Sheets['SalesReps'];
    const rawSalesRepData: any[] = XLSX.utils.sheet_to_json(salesRepSheet);
    
    // Inline schema to avoid .omit() type inference issues
    const salesRepSchema = z.object({
      email: z.string().email(),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      phoneNumber: z.string().nullable(),
      active: z.boolean(),
    });

    const validationResult = validateSheet('SalesReps', rawSalesRepData, salesRepSchema, (row: any) => ({
      email: row.email?.trim() || '',
      firstName: row.first_name?.trim() || '',
      lastName: row.last_name?.trim() || '',
      phoneNumber: row.phone_number?.trim() || null,
      active: normalizeBool(row.active !== undefined ? row.active : true),
    }));

    result.salesReps = validationResult.records;
    result.errors.push(...validationResult.errors);
  }

  // Parse B2B Customers sheet (business keys for FKs, password excluded)
  if (workbook.SheetNames.includes('B2bCustomers')) {
    const customerSheet = workbook.Sheets['B2bCustomers'];
    const rawCustomerData: any[] = XLSX.utils.sheet_to_json(customerSheet);
    
    // Parse with business keys, FK resolution happens in routes.ts
    result.b2bCustomers = rawCustomerData.map((row: any) => ({
      emailAddress: row.email_address?.trim() || '',
      accountName: row.account_name?.trim() || '',
      accountStatus: row.account_status?.trim() || 'pending',
      pricingTierName: row.pricing_tier_name?.trim() || null, // Business key for FK
      salesRepEmail: row.sales_rep_email?.trim() || null, // Business key for FK
      licenseNumber: row.license_number?.trim() || null,
      taxId: row.tax_id?.trim() || null,
      creditTerms: row.credit_terms?.trim() || null,
      creditLimit: toDecimal(row.credit_limit),
      primaryContactName: row.primary_contact_name?.trim() || '',
      primaryContactRole: row.primary_contact_role?.trim() || null,
      phoneNumber: row.phone_number?.trim() || '',
      altPhoneNumber: row.alt_phone_number?.trim() || null,
      billingAddress: row.billing_address?.trim() || null,
      billingCity: row.billing_city?.trim() || null,
      billingState: row.billing_state?.trim() || null,
      billingZipCode: row.billing_zip_code?.trim() || null,
      shippingAddress: row.shipping_address?.trim() || null,
      shippingCity: row.shipping_city?.trim() || null,
      shippingState: row.shipping_state?.trim() || null,
      shippingZipCode: row.shipping_zip_code?.trim() || null,
      approvedAt: parseDate(row.approved_at),
      notes: row.notes?.trim() || null,
      acceptsMarketing: normalizeBool(row.accepts_marketing),
    }));
  }

  // Parse B2B Orders sheet (OPTIONAL - business keys for FKs, validation in routes.ts)
  if (workbook.SheetNames.includes('B2bOrders')) {
    const orderSheet = workbook.Sheets['B2bOrders'];
    const rawOrderData: any[] = XLSX.utils.sheet_to_json(orderSheet);
    
    // Parse with business keys, FK resolution happens in routes.ts
    result.b2bOrders = rawOrderData.map((row: any) => ({
      orderNumber: row.order_number?.trim() || '',
      customerEmail: row.customer_email?.trim() || '', // Business key for FK
      orderDate: parseDate(row.order_date) || new Date(),
      status: row.status?.trim() || 'pending',
      subtotal: toDecimal(row.subtotal),  // No || 0 default
      tax: toDecimal(row.tax),
      total: toDecimal(row.total),
      notes: row.notes?.trim() || null,
      shippingAddress: row.shipping_address?.trim() || null,
      shippingCity: row.shipping_city?.trim() || null,
      shippingState: row.shipping_state?.trim() || null,
      shippingZipCode: row.shipping_zip_code?.trim() || null,
    }));
  }

  // Parse B2B Order Items sheet (OPTIONAL - business keys for FKs, validation in routes.ts)
  if (workbook.SheetNames.includes('B2bOrderItems')) {
    const orderItemSheet = workbook.Sheets['B2bOrderItems'];
    const rawOrderItemData: any[] = XLSX.utils.sheet_to_json(orderItemSheet);
    
    // Parse with business keys, FK resolution happens in routes.ts
    result.b2bOrderItems = rawOrderItemData.map((row: any) => ({
      orderNumber: row.order_number?.trim() || '', // Business key for FK
      productSku: row.product_sku?.trim() || '', // Business key for FK
      productName: row.product_name?.trim() || '',
      sku: row.sku?.trim() || row.product_sku?.trim() || '',
      quantity: toNumber(row.quantity, 1),
      unitPrice: toDecimal(row.unit_price),  // No || 0 default
      retailPrice: toDecimal(row.retail_price),
      lineTotal: toDecimal(row.line_total),
    }));
  }

  // Parse B2B Slideshow Slides sheet
  if (workbook.SheetNames.includes('B2bSlideshowSlides')) {
    const slideSheet = workbook.Sheets['B2bSlideshowSlides'];
    const rawSlideData: any[] = XLSX.utils.sheet_to_json(slideSheet);
    
    result.b2bSlideshowSlides = rawSlideData.map((row: any) => ({
      title: row.title?.trim() || '',
      content: row.content?.trim() || '',
      highlight: row.highlight?.trim() || '',
      mediaType: row.media_type?.trim() || 'none',
      mediaUrl: row.media_url?.trim() || '',
      iconName: row.icon_name?.trim() || '',
      sortOrder: toNumber(row.sort_order, 0),
      active: normalizeBool(row.active),
    }));
  }

  // Parse B2B Admins sheet (email is business key)
  if (workbook.SheetNames.includes('B2bAdmins')) {
    const adminSheet = workbook.Sheets['B2bAdmins'];
    const rawAdminData: any[] = XLSX.utils.sheet_to_json(adminSheet);
    
    result.b2bAdmins = rawAdminData.map((row: any) => ({
      email: row.email?.trim() || '', // Business key for upsert
      name: row.name?.trim() || '',
      passwordHash: row.password_hash?.trim() || '', // Will be empty from export, handle in routes
      active: normalizeBool(row.active !== undefined ? row.active : true),
    }));
  }

  // Parse B2B Settings sheet (key is business key)
  if (workbook.SheetNames.includes('B2bSettings')) {
    const settingsSheet = workbook.Sheets['B2bSettings'];
    const rawSettingsData: any[] = XLSX.utils.sheet_to_json(settingsSheet);
    
    result.b2bSettings = rawSettingsData.map((row: any) => ({
      key: row.key?.trim() || '', // Business key for upsert
      value: row.value ? JSON.parse(row.value) : {},
    }));
  }

  // Parse B2B Commissions sheet (OPTIONAL)
  if (workbook.SheetNames.includes('B2bCommissions')) {
    const commissionSheet = workbook.Sheets['B2bCommissions'];
    const rawCommissionData: any[] = XLSX.utils.sheet_to_json(commissionSheet);
    
    result.b2bCommissions = rawCommissionData.map((row: any) => ({
      id: row.id?.trim() || '',
      orderId: row.order_id?.trim() || '',
      salesRepId: row.sales_rep_id?.trim() || '',
      commissionAmount: toDecimal(row.commission_amount),
      status: row.status?.trim() || 'earned',
      payPeriod: row.pay_period?.trim() || null,
      paidToSalesRep: normalizeBool(row.paid_to_sales_rep),
      paidToSalesRepAt: parseDate(row.paid_to_sales_rep_at),
      createdAt: parseDate(row.created_at),
    }));
  }

  // Parse B2B Email Templates sheet (OPTIONAL)
  if (workbook.SheetNames.includes('B2bEmailTemplates')) {
    const templateSheet = workbook.Sheets['B2bEmailTemplates'];
    const rawTemplateData: any[] = XLSX.utils.sheet_to_json(templateSheet);
    
    result.b2bEmailTemplates = rawTemplateData.map((row: any) => ({
      id: row.id?.trim() || '',
      name: row.name?.trim() || '',
      subject: row.subject?.trim() || '',
      htmlContent: row.html_content?.trim() || '',
      triggerType: row.trigger_type?.trim() || '',
      active: normalizeBool(row.active !== undefined ? row.active : true),
      createdAt: parseDate(row.created_at),
    }));
  }

  // Parse B2B Email Automation Logs sheet (OPTIONAL)
  if (workbook.SheetNames.includes('B2bEmailAutomationLogs')) {
    const logSheet = workbook.Sheets['B2bEmailAutomationLogs'];
    const rawLogData: any[] = XLSX.utils.sheet_to_json(logSheet);
    
    result.b2bEmailAutomationLogs = rawLogData.map((row: any) => ({
      id: row.id?.trim() || '',
      customerId: row.customer_id?.trim() || '',
      emailType: row.email_type?.trim() || '',
      recipientEmail: row.recipient_email?.trim() || '',
      subject: row.subject?.trim() || '',
      sentAt: parseDate(row.sent_at),
      status: row.status?.trim() || 'sent',
    }));
  }

  return result;
}
