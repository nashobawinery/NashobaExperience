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
    errors: [],
    warnings: [],
  };

  // Parse Products sheet
  if (workbook.SheetNames.includes('Products')) {
    const productsSheet = workbook.Sheets['Products'];
    const productsData: ExcelProductRow[] = XLSX.utils.sheet_to_json(productsSheet);
    
    productsData.forEach((row, index) => {
      const rowNum = index + 2;
      
      if (!row.name || !row.name.trim()) {
        return;
      }

      if (!row.price || isNaN(Number(row.price))) {
        result.errors.push(`Products Row ${rowNum}: Invalid or missing price for "${row.name}"`);
        return;
      }

      if (!row.description || !row.description.trim()) {
        result.errors.push(`Products Row ${rowNum}: Missing description for "${row.name}"`);
        return;
      }

      const normalizeBool = (val: string | boolean | undefined): boolean => {
        if (typeof val === 'boolean') return val;
        if (typeof val === 'string') {
          const lower = val.toLowerCase().trim();
          return lower === 'yes' || lower === 'true' || lower === '1';
        }
        return false;
      };

      result.products.push({
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
        sku: row.sku ? String(row.sku).trim() : null,
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
        tags: row.tags ? row.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0) : null,
      });
    });
  } else {
    result.warnings.push('No Products sheet found in the Excel file');
  }

  // Parse Filter Options sheet
  if (workbook.SheetNames.includes('FilterOptions')) {
    const filterSheet = workbook.Sheets['FilterOptions'];
    const filterData: any[] = XLSX.utils.sheet_to_json(filterSheet);
    
    filterData.forEach((row, index) => {
      const rowNum = index + 2;
      
      if (!row.field_type || !row.option_value || !row.display_label) {
        result.errors.push(`FilterOptions Row ${rowNum}: Missing required fields`);
        return;
      }

      result.filterOptions.push({
        fieldType: row.field_type.trim(),
        optionValue: row.option_value.trim(),
        displayLabel: row.display_label.trim(),
        sortOrder: row.sort_order ? Number(row.sort_order) : 0,
        isActive: row.is_active ? (typeof row.is_active === 'string' ? row.is_active.toLowerCase() === 'yes' : row.is_active) : true,
      });
    });
  }

  // Parse Trivia Questions sheet
  if (workbook.SheetNames.includes('TriviaQuestions')) {
    const triviaSheet = workbook.Sheets['TriviaQuestions'];
    const triviaData: any[] = XLSX.utils.sheet_to_json(triviaSheet);
    
    triviaData.forEach((row, index) => {
      const rowNum = index + 2;
      
      if (!row.question || !row.answer_1 || !row.answer_2) {
        result.errors.push(`TriviaQuestions Row ${rowNum}: Missing required fields`);
        return;
      }

      const answers = [
        row.answer_1?.trim(),
        row.answer_2?.trim(),
        row.answer_3?.trim() || null,
        row.answer_4?.trim() || null,
      ].filter(a => a !== null);

      result.triviaQuestions.push({
        question: row.question.trim(),
        answers,
        correctIndex: row.correct_index !== undefined ? Number(row.correct_index) : 0,
        explanation: row.explanation?.trim() || '',
        image: row.image?.trim() || null,
        isActive: row.is_active ? (typeof row.is_active === 'string' ? row.is_active.toLowerCase() === 'yes' : row.is_active) : true,
      });
    });
  }

  // Parse Slideshow Images sheet
  if (workbook.SheetNames.includes('SlideshowImages')) {
    const slideshowSheet = workbook.Sheets['SlideshowImages'];
    const slideshowData: any[] = XLSX.utils.sheet_to_json(slideshowSheet);
    
    slideshowData.forEach((row, index) => {
      const rowNum = index + 2;
      
      if (!row.filename) {
        result.errors.push(`SlideshowImages Row ${rowNum}: Missing filename`);
        return;
      }

      result.slideshowImages.push({
        filename: row.filename.trim(),
        caption: row.caption?.trim() || null,
        description: row.description?.trim() || null,
        displayOrder: row.display_order ? Number(row.display_order) : 0,
        isActive: row.is_active ? (typeof row.is_active === 'string' ? row.is_active.toLowerCase() === 'yes' : row.is_active) : true,
      });
    });
  }

  // Parse App Settings sheet
  if (workbook.SheetNames.includes('AppSettings')) {
    const settingsSheet = workbook.Sheets['AppSettings'];
    const settingsData: any[] = XLSX.utils.sheet_to_json(settingsSheet);
    
    settingsData.forEach((row, index) => {
      const rowNum = index + 2;
      
      if (!row.key || !row.value) {
        result.errors.push(`AppSettings Row ${rowNum}: Missing key or value`);
        return;
      }

      try {
        const parsedValue = JSON.parse(row.value);
        result.appSettings.push({
          key: row.key.trim(),
          value: parsedValue,
        });
      } catch (e) {
        result.errors.push(`AppSettings Row ${rowNum}: Invalid JSON value for key "${row.key}"`);
      }
    });
  }

  // Parse Media Library sheet
  if (workbook.SheetNames.includes('MediaLibrary')) {
    const mediaSheet = workbook.Sheets['MediaLibrary'];
    const mediaData: any[] = XLSX.utils.sheet_to_json(mediaSheet);
    
    mediaData.forEach((row, index) => {
      const rowNum = index + 2;
      
      if (!row.filename || !row.object_path || !row.public_url) {
        result.errors.push(`MediaLibrary Row ${rowNum}: Missing required fields (filename, object_path, public_url)`);
        return;
      }

      result.mediaLibrary.push({
        filename: row.filename.trim(),
        originalFilename: row.original_filename?.trim() || row.filename.trim(),
        mimeType: row.mime_type?.trim() || 'application/octet-stream',
        fileSize: row.file_size ? Number(row.file_size) : 0,
        objectPath: row.object_path.trim(),
        publicUrl: row.public_url.trim(),
        category: row.category?.trim() || 'uncategorized',
        description: row.description?.trim() || null,
        altText: row.alt_text?.trim() || null,
        tags: row.tags ? row.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0) : null,
      });
    });
  }

  return result;
}
