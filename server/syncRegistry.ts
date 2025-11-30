import { z } from 'zod';
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
  insertB2bOrderItemSchema,
  insertB2bCustomerLocationSchema,
  insertB2bCustomerManualProductSchema,
  insertB2bSlideshowSlideSchema,
  insertB2bAdminSchema,
  insertB2bSettingSchema,
  insertLmsCourseSchema,
  insertLmsCategorySchema,
  insertLmsLessonSchema,
  insertLmsQuizQuestionSchema,
  insertLmsEnrollmentSchema,
  insertLmsLessonProgressSchema,
  insertLmsQuizAttemptSchema,
  insertLmsCertificateSchema,
  insertComplianceTaskSchema,
  insertUserGroupSchema,
  insertPlatformModuleSchema,
  insertModuleFeatureSchema,
} from '@shared/schema';

export type SyncModule = 'tasting' | 'b2b' | 'lms' | 'compliance' | 'rbac' | 'platform';

export interface SyncTableConfig {
  id: string;
  name: string;
  description: string;
  module: SyncModule;
  sheetName: string;
  businessKey: string[];
  parentTables?: string[];
  schema: z.ZodType<any>;
  exportFields: string[];
  excludeFromSync?: boolean;
  requiresConfirmation?: boolean;
  sensitiveFields?: string[];
}

export const SYNC_MODULES: Record<SyncModule, { name: string; description: string; icon: string }> = {
  tasting: { name: 'Tasting Experience', description: 'Guest-facing wine tasting app', icon: 'Wine' },
  b2b: { name: 'B2B Wholesale', description: 'Wholesale customer and order management', icon: 'Building2' },
  lms: { name: 'LMS', description: 'Employee training and certification', icon: 'GraduationCap' },
  compliance: { name: 'Compliance', description: 'Regulatory and tax compliance tracking', icon: 'Shield' },
  rbac: { name: 'Access Control', description: 'Role-based access control configuration', icon: 'Lock' },
  platform: { name: 'Platform', description: 'Core platform configuration', icon: 'Settings' },
};

export const SYNC_TABLES: SyncTableConfig[] = [
  // ============ TASTING EXPERIENCE MODULE ============
  {
    id: 'products',
    name: 'Products',
    description: 'Wine and beverage products',
    module: 'tasting',
    sheetName: 'Products',
    businessKey: ['sku', 'name'],
    schema: insertProductSchema,
    exportFields: ['name', 'category', 'type', 'varietal', 'vintageYear', 'region', 'description', 'tastingNotes', 'foodPairings', 'servingTemp', 'alcoholContent', 'bottleSize', 'price', 'cost', 'wholesalePricing', 'sku', 'stockQuantity', 'lowStockThreshold', 'imageUrl', 'labelImageUrl', 'lifestyleImageUrl', 'characteristics', 'productionMethod', 'agingProcess', 'awards', 'rating', 'available', 'featured', 'newArrival', 'staffPick', 'wineOfMonth', 'tags', 'caseSize'],
  },
  {
    id: 'filterOptions',
    name: 'Filter Options',
    description: 'Dynamic filter configuration',
    module: 'tasting',
    sheetName: 'FilterOptions',
    businessKey: ['fieldType', 'optionValue'],
    schema: insertFilterOptionSchema,
    exportFields: ['fieldType', 'optionValue', 'displayLabel', 'sortOrder', 'isActive'],
  },
  {
    id: 'triviaQuestions',
    name: 'Trivia Questions',
    description: 'Tasting trivia game',
    module: 'tasting',
    sheetName: 'TriviaQuestions',
    businessKey: ['question'],
    schema: insertTriviaQuestionSchema,
    exportFields: ['question', 'answers', 'correctIndex', 'explanation', 'image', 'isActive'],
  },
  {
    id: 'slideshowImages',
    name: 'Slideshow Images',
    description: 'Guest experience slideshow',
    module: 'tasting',
    sheetName: 'SlideshowImages',
    businessKey: ['filename'],
    schema: insertSlideshowImageSchema,
    exportFields: ['filename', 'caption', 'description', 'displayOrder', 'isActive'],
  },
  {
    id: 'appSettings',
    name: 'App Settings',
    description: 'Application configuration',
    module: 'tasting',
    sheetName: 'AppSettings',
    businessKey: ['key'],
    schema: insertAppSettingSchema,
    exportFields: ['key', 'value'],
  },
  {
    id: 'mediaLibrary',
    name: 'Media Library',
    description: 'Uploaded images and files',
    module: 'tasting',
    sheetName: 'MediaLibrary',
    businessKey: ['objectPath'],
    schema: insertMediaLibrarySchema,
    exportFields: ['filename', 'originalFilename', 'mimeType', 'fileSize', 'objectPath', 'publicUrl', 'category', 'description', 'altText', 'tags'],
  },
  {
    id: 'whitelistedEmails',
    name: 'Whitelisted Emails',
    description: 'Admin access list',
    module: 'tasting',
    sheetName: 'WhitelistedEmails',
    businessKey: ['email'],
    schema: insertWhitelistedEmailSchema,
    exportFields: ['email', 'role'],
  },
  {
    id: 'commercials',
    name: 'Commercials',
    description: 'Video commercials',
    module: 'tasting',
    sheetName: 'Commercials',
    businessKey: ['title'],
    schema: insertCommercialSchema,
    exportFields: ['title', 'description', 'imageUrl', 'sortOrder', 'isActive'],
  },
  {
    id: 'videos',
    name: 'Videos',
    description: 'Educational videos',
    module: 'tasting',
    sheetName: 'Videos',
    businessKey: ['name', 'videoUrl'],
    schema: insertVideoSchema,
    exportFields: ['name', 'description', 'videoUrl', 'thumbnailUrl', 'category', 'isActive', 'sortOrder'],
  },
  {
    id: 'triviaAchievements',
    name: 'Trivia Achievements',
    description: 'Guest achievements',
    module: 'tasting',
    sheetName: 'TriviaAchievements',
    businessKey: ['scoreThreshold', 'rewardType'],
    schema: insertTriviaAchievementSchema,
    exportFields: ['scoreThreshold', 'rewardType', 'rewardValue', 'rewardLabel', 'message', 'isActive'],
  },

  // ============ B2B WHOLESALE MODULE ============
  {
    id: 'tierPricing',
    name: 'Tier Pricing',
    description: 'Wholesale pricing tiers',
    module: 'b2b',
    sheetName: 'TierPricing',
    businessKey: ['tierName'],
    schema: insertTierPricingSchema,
    exportFields: ['tierName', 'description', 'discountPercentage', 'volumeRequirement', 'paymentTerms', 'isActive', 'sortOrder', 'wineDiscount', 'spiritsDiscount', 'beerDiscount', 'cannedCocktailDiscount', 'cannedWineDiscount', 'ciderDiscount'],
  },
  {
    id: 'salesReps',
    name: 'Sales Reps',
    description: 'Sales representative accounts',
    module: 'b2b',
    sheetName: 'SalesReps',
    businessKey: ['email'],
    schema: insertSalesRepSchema,
    exportFields: ['email', 'firstName', 'lastName', 'phone', 'territory', 'commissionRate', 'isActive'],
    sensitiveFields: ['passwordHash'],
  },
  {
    id: 'b2bCustomers',
    name: 'B2B Customers',
    description: 'Wholesale customer accounts',
    module: 'b2b',
    sheetName: 'B2bCustomers',
    businessKey: ['customerNumber', 'emailAddress'],
    parentTables: ['tierPricing', 'salesReps'],
    schema: insertB2bCustomerSchema,
    exportFields: ['customerNumber', 'accountName', 'primaryContactName', 'customerType', 'emailAddress', 'phoneNumber', 'billingAddress', 'billingCity', 'billingState', 'billingZipCode', 'licenseNumber', 'taxId', 'shippingAddress', 'shippingCity', 'shippingState', 'shippingZipCode', 'accountStatus', 'notes'],
    sensitiveFields: ['passwordHash'],
  },
  {
    id: 'b2bCustomerLocations',
    name: 'Customer Locations',
    description: 'Store locations',
    module: 'b2b',
    sheetName: 'B2bCustomerLocations',
    businessKey: ['locationName'],
    parentTables: ['b2bCustomers'],
    schema: insertB2bCustomerLocationSchema,
    exportFields: ['locationName', 'address', 'city', 'state', 'zipCode', 'phone', 'isDefault', 'isActive'],
  },
  {
    id: 'b2bCustomerManualProducts',
    name: 'Featured Products',
    description: 'Manual product assignments',
    module: 'b2b',
    sheetName: 'B2bManualProducts',
    businessKey: [],
    parentTables: ['b2bCustomers', 'products'],
    schema: insertB2bCustomerManualProductSchema,
    exportFields: ['displayOrder'],
  },
  {
    id: 'b2bOrders',
    name: 'B2B Orders',
    description: 'Wholesale orders',
    module: 'b2b',
    sheetName: 'B2bOrders',
    businessKey: ['orderNumber'],
    parentTables: ['b2bCustomers', 'salesReps'],
    schema: insertB2bOrderSchema,
    exportFields: ['orderNumber', 'status', 'subtotal', 'discountAmount', 'taxAmount', 'totalAmount', 'notes', 'internalNotes', 'shippingAddress', 'shippingCity', 'shippingState', 'shippingZipCode'],
  },
  {
    id: 'b2bOrderItems',
    name: 'Order Items',
    description: 'Order line items',
    module: 'b2b',
    sheetName: 'B2bOrderItems',
    businessKey: [],
    parentTables: ['b2bOrders', 'products'],
    schema: insertB2bOrderItemSchema,
    exportFields: ['quantity', 'unitPrice', 'discount', 'total'],
  },
  {
    id: 'b2bSlideshowSlides',
    name: 'B2B Slideshow',
    description: 'B2B landing page slides',
    module: 'b2b',
    sheetName: 'B2bSlideshowSlides',
    businessKey: ['title'],
    schema: insertB2bSlideshowSlideSchema,
    exportFields: ['title', 'subtitle', 'imageUrl', 'linkUrl', 'linkText', 'displayOrder', 'isActive'],
  },
  {
    id: 'b2bAdmins',
    name: 'B2B Admins',
    description: 'B2B administrator accounts',
    module: 'b2b',
    sheetName: 'B2bAdmins',
    businessKey: ['email'],
    schema: insertB2bAdminSchema,
    exportFields: ['email', 'firstName', 'lastName', 'role', 'isActive'],
    sensitiveFields: ['passwordHash'],
    requiresConfirmation: true,
  },
  {
    id: 'b2bSettings',
    name: 'B2B Settings',
    description: 'B2B platform configuration',
    module: 'b2b',
    sheetName: 'B2bSettings',
    businessKey: ['key'],
    schema: insertB2bSettingSchema,
    exportFields: ['key', 'value', 'description'],
  },

  // ============ LMS MODULE ============
  {
    id: 'courseCategories',
    name: 'Course Categories',
    description: 'Categories for organizing courses',
    module: 'lms',
    sheetName: 'CourseCategories',
    businessKey: ['name'],
    schema: insertLmsCategorySchema,
    exportFields: ['name', 'description', 'sortOrder', 'isActive'],
  },
  {
    id: 'courses',
    name: 'Courses',
    description: 'Training courses',
    module: 'lms',
    sheetName: 'Courses',
    businessKey: ['title'],
    parentTables: ['courseCategories'],
    schema: insertLmsCourseSchema,
    exportFields: ['title', 'description', 'thumbnailUrl', 'duration', 'difficulty', 'isActive', 'isPublished', 'sortOrder', 'passingScore', 'requiresQuiz', 'certificateTemplate'],
  },
  {
    id: 'lessons',
    name: 'Lessons',
    description: 'Course lessons',
    module: 'lms',
    sheetName: 'Lessons',
    businessKey: ['title'],
    parentTables: ['courses'],
    schema: insertLmsLessonSchema,
    exportFields: ['title', 'description', 'content', 'videoUrl', 'thumbnailUrl', 'duration', 'sortOrder', 'isActive', 'isPublished'],
  },
  {
    id: 'quizQuestions',
    name: 'Quiz Questions',
    description: 'Quiz questions attached to courses or lessons',
    module: 'lms',
    sheetName: 'QuizQuestions',
    businessKey: ['question'],
    parentTables: ['courses', 'lessons'],
    schema: insertLmsQuizQuestionSchema,
    exportFields: ['question', 'questionType', 'options', 'correctAnswer', 'explanation', 'points', 'sortOrder', 'isActive'],
  },
  {
    id: 'certificates',
    name: 'Certificates',
    description: 'Completion certificates',
    module: 'lms',
    sheetName: 'Certificates',
    businessKey: ['certificateNumber'],
    parentTables: ['courses'],
    schema: insertLmsCertificateSchema,
    exportFields: ['certificateNumber', 'courseName', 'recipientName', 'recipientEmail', 'issueDate', 'expirationDate', 'score', 'pdfUrl'],
    excludeFromSync: true,
  },
  {
    id: 'enrollments',
    name: 'Enrollments',
    description: 'User course enrollments',
    module: 'lms',
    sheetName: 'Enrollments',
    businessKey: [],
    parentTables: ['courses'],
    schema: insertLmsEnrollmentSchema,
    exportFields: ['status', 'progress', 'enrolledAt', 'completedAt', 'dueDate'],
    excludeFromSync: true,
  },
  {
    id: 'lessonProgress',
    name: 'Lesson Progress',
    description: 'User lesson progress',
    module: 'lms',
    sheetName: 'LessonProgress',
    businessKey: [],
    parentTables: ['lessons', 'enrollments'],
    schema: insertLmsLessonProgressSchema,
    exportFields: ['status', 'progress', 'startedAt', 'completedAt', 'timeSpent'],
    excludeFromSync: true,
  },
  {
    id: 'quizAttempts',
    name: 'Quiz Attempts',
    description: 'User quiz attempts',
    module: 'lms',
    sheetName: 'QuizAttempts',
    businessKey: [],
    parentTables: ['courses', 'enrollments'],
    schema: insertLmsQuizAttemptSchema,
    exportFields: ['score', 'passed', 'startedAt', 'completedAt', 'answers'],
    excludeFromSync: true,
  },

  // ============ COMPLIANCE MODULE ============
  {
    id: 'complianceTasks',
    name: 'Compliance Tasks',
    description: 'Tax filings, licensing, and regulatory tasks',
    module: 'compliance',
    sheetName: 'ComplianceTasks',
    businessKey: ['title', 'category'],
    schema: insertComplianceTaskSchema,
    exportFields: ['title', 'description', 'category', 'status', 'priority', 'dueDate', 'completedDate', 'recurrencePattern', 'recurrenceInterval', 'recurrenceEndDate', 'estimatedCost', 'actualCost', 'penaltyAmount', 'portalUrl', 'portalUsername', 'notes', 'isArchived'],
    sensitiveFields: ['portalPassword'],
  },

  // ============ RBAC MODULE ============
  {
    id: 'userGroups',
    name: 'User Groups',
    description: 'Permission groups',
    module: 'rbac',
    sheetName: 'UserGroups',
    businessKey: ['name'],
    schema: insertUserGroupSchema,
    exportFields: ['name', 'description', 'color', 'isSystem'],
    requiresConfirmation: true,
  },
  {
    id: 'moduleFeatures',
    name: 'Module Features',
    description: 'Feature definitions for modules',
    module: 'rbac',
    sheetName: 'ModuleFeatures',
    businessKey: ['featureKey'],
    parentTables: ['platformModules'],
    schema: insertModuleFeatureSchema,
    exportFields: ['featureKey', 'featureName', 'description'],
  },

  // ============ PLATFORM MODULE ============
  {
    id: 'platformModules',
    name: 'Platform Modules',
    description: 'Registered platform modules',
    module: 'platform',
    sheetName: 'PlatformModules',
    businessKey: ['moduleKey'],
    schema: insertPlatformModuleSchema,
    exportFields: ['moduleKey', 'moduleName', 'description', 'icon', 'route', 'sortOrder', 'isActive', 'progress', 'notes'],
  },
];

export function getTablesByModule(module: SyncModule): SyncTableConfig[] {
  return SYNC_TABLES.filter(t => t.module === module && !t.excludeFromSync);
}

export function getSyncableTableIds(): string[] {
  return SYNC_TABLES.filter(t => !t.excludeFromSync).map(t => t.id);
}

export function getTableConfig(tableId: string): SyncTableConfig | undefined {
  return SYNC_TABLES.find(t => t.id === tableId);
}

export function getTableDependencies(tableId: string): string[] {
  const table = getTableConfig(tableId);
  return table?.parentTables || [];
}

export function getTablesByDependencyOrder(): SyncTableConfig[] {
  const visited = new Set<string>();
  const result: SyncTableConfig[] = [];
  
  function visit(tableId: string) {
    if (visited.has(tableId)) return;
    visited.add(tableId);
    
    const table = getTableConfig(tableId);
    if (!table) return;
    
    for (const depId of table.parentTables || []) {
      visit(depId);
    }
    
    result.push(table);
  }
  
  for (const table of SYNC_TABLES) {
    if (!table.excludeFromSync) {
      visit(table.id);
    }
  }
  
  return result;
}

export function getModuleStats(): Record<SyncModule, { total: number; syncable: number }> {
  const stats: Record<SyncModule, { total: number; syncable: number }> = {} as any;
  
  for (const module of Object.keys(SYNC_MODULES) as SyncModule[]) {
    const tables = SYNC_TABLES.filter(t => t.module === module);
    stats[module] = {
      total: tables.length,
      syncable: tables.filter(t => !t.excludeFromSync).length,
    };
  }
  
  return stats;
}
