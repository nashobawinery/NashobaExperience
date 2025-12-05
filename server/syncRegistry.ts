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
  insertPlatformUserSchema,
  insertGroupModuleAccessSchema,
  insertGroupFeaturePermissionSchema,
  insertDailyReportTemplateSchema,
  insertDailyReportSchema,
  insertDailyReportIncidentSchema,
  insertDailyReportAccessCodeSchema,
  insertDailyProcedureTemplateSchema,
  insertDailyProcedureCompletionSchema,
  insertDailyReportEmailRecipientSchema,
  insertDailyReportFieldDefinitionSchema,
  insertDepartmentFieldAssignmentSchema,
  insertComplianceTaskHistorySchema,
  insertComplianceReminderSchema,
  insertComplianceAttachmentSchema,
  insertCharacteristicSchema,
  insertProductCharacteristicSchema,
  insertProductMediaSchema,
  insertSharedLocationSchema,
  insertSharedEquipmentSchema,
  insertSharedDocumentSchema,
  insertGroupMembershipSchema,
  insertResyUserSchema,
  insertResyLocationSchema,
  insertResyExperienceSchema,
  insertResyClubSchema,
  insertResyCustomerSchema,
  insertResyReservationSchema,
  insertResyTimeSlotSchema,
  insertResyWaitlistSchema,
  insertResyCustomerVisitSchema,
  insertResyMealPeriodSchema,
  insertResyOperatingHoursSchema,
  insertResySpecialDateSchema,
  insertResyLocationTableSchema,
  insertResyFlowControlSchema,
  insertResyTurnTimeSettingSchema,
  insertResyExperienceDiscountSchema,
  insertResyClubExperienceDiscountSchema,
  insertResyPrivateEventSchema,
  insertResySiteSettingSchema,
  insertResyFooterLinkSchema,
} from '@shared/schema';

export type SyncModule = 'tasting' | 'b2b' | 'lms' | 'compliance' | 'rbac' | 'platform' | 'daily_reports' | 'reservation';

// Data type classification for sync safety
export type DataType = 
  | 'reference'        // Configuration/template data - safe to sync between environments
  | 'user_generated'   // Data created by users - protect in production, never overwrite
  | 'configuration'    // System settings - sync with caution
  | 'transactional';   // Orders, reports, logs - never sync from dev to prod

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
  confirmationMessage?: string;
  sensitiveFields?: string[];
  // NEW: Data type classification for sync safety
  dataType: DataType;
  // NEW: Whether this table supports backup/restore
  supportsBackup?: boolean;
  // NEW: Warning message for production imports
  productionWarning?: string;
}

export const SYNC_MODULES: Record<SyncModule, { name: string; description: string; icon: string }> = {
  tasting: { name: 'Tasting Experience', description: 'Guest-facing wine tasting app', icon: 'Wine' },
  b2b: { name: 'B2B Wholesale', description: 'Wholesale customer and order management', icon: 'Building2' },
  lms: { name: 'LMS', description: 'Employee training and certification', icon: 'GraduationCap' },
  compliance: { name: 'Compliance', description: 'Regulatory and tax compliance tracking', icon: 'Shield' },
  daily_reports: { name: 'Daily Reports', description: 'Department daily reporting system', icon: 'ClipboardList' },
  rbac: { name: 'Access Control', description: 'Role-based access control configuration', icon: 'Lock' },
  platform: { name: 'Platform', description: 'Core platform configuration', icon: 'Settings' },
  reservation: { name: 'Reservations', description: 'Guest reservation and booking system', icon: 'Calendar' },
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
    dataType: 'reference',
    supportsBackup: true,
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
    dataType: 'reference',
    supportsBackup: true,
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
    dataType: 'reference',
    supportsBackup: true,
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
    dataType: 'reference',
    supportsBackup: true,
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
    dataType: 'configuration',
    supportsBackup: true,
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
    dataType: 'reference',
    supportsBackup: true,
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
    dataType: 'configuration',
    supportsBackup: true,
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
    dataType: 'reference',
    supportsBackup: true,
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
    dataType: 'reference',
    supportsBackup: true,
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
    dataType: 'reference',
    supportsBackup: true,
  },
  {
    id: 'characteristics',
    name: 'Product Characteristics',
    description: 'Tasting characteristic definitions',
    module: 'tasting',
    sheetName: 'Characteristics',
    businessKey: ['name', 'category'],
    schema: insertCharacteristicSchema,
    exportFields: ['name', 'category', 'description', 'color', 'icon', 'isActive', 'sortOrder'],
    dataType: 'reference',
    supportsBackup: true,
  },
  {
    id: 'productCharacteristics',
    name: 'Product Characteristic Assignments',
    description: 'Product-characteristic relationships',
    module: 'tasting',
    sheetName: 'ProductCharacteristics',
    businessKey: [],
    parentTables: ['products', 'characteristics'],
    schema: insertProductCharacteristicSchema,
    exportFields: ['intensity'],
    dataType: 'reference',
    supportsBackup: true,
  },
  {
    id: 'productMedia',
    name: 'Product Media',
    description: 'Product images and media files',
    module: 'tasting',
    sheetName: 'ProductMedia',
    businessKey: ['objectPath'],
    parentTables: ['products'],
    schema: insertProductMediaSchema,
    exportFields: ['role', 'objectPath', 'originalFilename', 'mimeType', 'fileSize', 'altText', 'caption', 'sortOrder', 'isActive'],
    dataType: 'reference',
    supportsBackup: true,
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
    dataType: 'reference',
    supportsBackup: true,
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
    dataType: 'user_generated',
    supportsBackup: true,
    productionWarning: 'Sales rep accounts may have production passwords - import will NOT overwrite passwords',
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
    dataType: 'user_generated',
    supportsBackup: true,
    productionWarning: 'Customer accounts contain production data - syncing will merge by customer number',
  },
  {
    id: 'b2bCustomerLocations',
    name: 'Customer Locations',
    description: 'Store locations',
    module: 'b2b',
    sheetName: 'B2bCustomerLocations',
    businessKey: ['customerNumber', 'locationName'],
    parentTables: ['b2bCustomers'],
    schema: insertB2bCustomerLocationSchema,
    exportFields: ['customerNumber', 'locationName', 'address', 'city', 'state', 'zipCode', 'phone', 'isDefault', 'isActive'],
    dataType: 'user_generated',
    supportsBackup: true,
  },
  {
    id: 'b2bCustomerManualProducts',
    name: 'Featured Products',
    description: 'Manual product assignments',
    module: 'b2b',
    sheetName: 'B2bManualProducts',
    businessKey: ['customerNumber', 'productSku'],
    parentTables: ['b2bCustomers', 'products'],
    schema: insertB2bCustomerManualProductSchema,
    exportFields: ['customerNumber', 'productSku', 'displayOrder'],
    dataType: 'user_generated',
    supportsBackup: true,
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
    exportFields: ['orderNumber', 'customerNumber', 'status', 'subtotal', 'discountAmount', 'taxAmount', 'totalAmount', 'notes', 'internalNotes', 'shippingAddress', 'shippingCity', 'shippingState', 'shippingZipCode'],
    dataType: 'transactional',
    supportsBackup: true,
    excludeFromSync: true,
    productionWarning: 'Orders are transactional data - NEVER sync from dev to production',
  },
  {
    id: 'b2bOrderItems',
    name: 'Order Items',
    description: 'Order line items',
    module: 'b2b',
    sheetName: 'B2bOrderItems',
    businessKey: ['orderNumber', 'productSku'],
    parentTables: ['b2bOrders', 'products'],
    schema: insertB2bOrderItemSchema,
    exportFields: ['orderNumber', 'productSku', 'quantity', 'unitPrice', 'discount', 'total'],
    dataType: 'transactional',
    supportsBackup: true,
    excludeFromSync: true,
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
    dataType: 'reference',
    supportsBackup: true,
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
    dataType: 'user_generated',
    supportsBackup: true,
    productionWarning: 'Admin accounts have production passwords - import will NOT overwrite passwords',
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
    dataType: 'configuration',
    supportsBackup: true,
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
    dataType: 'reference',
    supportsBackup: true,
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
    dataType: 'reference',
    supportsBackup: true,
  },
  {
    id: 'lessons',
    name: 'Lessons',
    description: 'Course lessons',
    module: 'lms',
    sheetName: 'Lessons',
    businessKey: ['courseTitle', 'title'],
    parentTables: ['courses'],
    schema: insertLmsLessonSchema,
    exportFields: ['courseTitle', 'title', 'description', 'content', 'videoUrl', 'thumbnailUrl', 'duration', 'sortOrder', 'isActive', 'isPublished'],
    dataType: 'reference',
    supportsBackup: true,
  },
  {
    id: 'quizQuestions',
    name: 'Quiz Questions',
    description: 'Quiz questions attached to courses or lessons',
    module: 'lms',
    sheetName: 'QuizQuestions',
    businessKey: ['courseTitle', 'question'],
    parentTables: ['courses', 'lessons'],
    schema: insertLmsQuizQuestionSchema,
    exportFields: ['courseTitle', 'lessonTitle', 'question', 'questionType', 'options', 'correctAnswer', 'explanation', 'points', 'sortOrder', 'isActive'],
    dataType: 'reference',
    supportsBackup: true,
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
    dataType: 'transactional',
    supportsBackup: true,
    productionWarning: 'Certificates are issued to real users - do not sync from dev',
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
    dataType: 'transactional',
    supportsBackup: true,
    productionWarning: 'Enrollments track user progress - do not sync from dev',
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
    dataType: 'transactional',
    supportsBackup: true,
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
    dataType: 'transactional',
    supportsBackup: true,
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
    dataType: 'user_generated',
    supportsBackup: true,
    productionWarning: 'Compliance tasks may have production completion dates and costs',
  },
  {
    id: 'complianceTaskHistory',
    name: 'Compliance Task History',
    description: 'Audit history for compliance tasks',
    module: 'compliance',
    sheetName: 'ComplianceTaskHistory',
    businessKey: [],
    parentTables: ['complianceTasks'],
    schema: insertComplianceTaskHistorySchema,
    exportFields: ['action', 'previousStatus', 'newStatus', 'notes', 'cost', 'performedBy'],
    dataType: 'transactional',
    supportsBackup: true,
    excludeFromSync: true,
  },
  {
    id: 'complianceReminders',
    name: 'Compliance Reminders',
    description: 'Email reminders for compliance tasks',
    module: 'compliance',
    sheetName: 'ComplianceReminders',
    businessKey: [],
    parentTables: ['complianceTasks'],
    schema: insertComplianceReminderSchema,
    exportFields: ['reminderType', 'scheduledFor', 'sentAt', 'email'],
    dataType: 'transactional',
    supportsBackup: true,
    excludeFromSync: true,
  },
  {
    id: 'complianceAttachments',
    name: 'Compliance Attachments',
    description: 'File attachments for compliance tasks',
    module: 'compliance',
    sheetName: 'ComplianceAttachments',
    businessKey: [],
    parentTables: ['complianceTasks'],
    schema: insertComplianceAttachmentSchema,
    exportFields: ['filename', 'mimeType', 'fileSize', 'objectPath', 'description', 'uploadedBy'],
    dataType: 'transactional',
    supportsBackup: true,
    excludeFromSync: true,
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
    dataType: 'reference',
    supportsBackup: true,
  },
  {
    id: 'platformUsers',
    name: 'Platform Users',
    description: 'Platform user accounts',
    module: 'rbac',
    sheetName: 'PlatformUsers',
    businessKey: ['email'],
    schema: insertPlatformUserSchema,
    exportFields: ['email', 'displayName', 'firstName', 'lastName', 'role', 'isActive'],
    requiresConfirmation: true,
    sensitiveFields: ['passwordHash'],
    dataType: 'user_generated',
    supportsBackup: true,
    productionWarning: 'Platform users have production login credentials - passwords will NOT be overwritten',
  },
  {
    id: 'groupModuleAccess',
    name: 'Group Module Access',
    description: 'Module access permissions for groups',
    module: 'rbac',
    sheetName: 'GroupModuleAccess',
    businessKey: ['groupName', 'moduleKey'],
    parentTables: ['userGroups', 'platformModules'],
    schema: insertGroupModuleAccessSchema,
    exportFields: ['groupName', 'moduleKey', 'hasAccess'],
    dataType: 'reference',
    supportsBackup: true,
  },
  {
    id: 'groupFeaturePermissions',
    name: 'Group Feature Permissions',
    description: 'Feature-level permissions for groups',
    module: 'rbac',
    sheetName: 'GroupFeaturePermissions',
    businessKey: ['groupName', 'featureKey'],
    parentTables: ['userGroups', 'moduleFeatures'],
    schema: insertGroupFeaturePermissionSchema,
    exportFields: ['groupName', 'moduleKey', 'featureKey', 'permissionLevel'],
    dataType: 'reference',
    supportsBackup: true,
  },
  {
    id: 'groupMemberships',
    name: 'Group Memberships',
    description: 'User assignments to groups',
    module: 'rbac',
    sheetName: 'GroupMemberships',
    businessKey: ['userEmail', 'groupName'],
    parentTables: ['userGroups', 'platformUsers'],
    schema: insertGroupMembershipSchema,
    exportFields: ['userEmail', 'groupName'],
    dataType: 'user_generated',
    supportsBackup: true,
    productionWarning: 'Group memberships affect user access - verify before syncing',
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
    dataType: 'reference',
    supportsBackup: true,
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
    dataType: 'reference',
    supportsBackup: true,
  },
  {
    id: 'sharedLocations',
    name: 'Shared Locations',
    description: 'Business locations shared across modules',
    module: 'platform',
    sheetName: 'SharedLocations',
    businessKey: ['name'],
    schema: insertSharedLocationSchema,
    exportFields: ['name', 'type', 'address', 'city', 'state', 'zipCode', 'phone', 'email', 'coordinates', 'isActive', 'notes'],
    dataType: 'reference',
    supportsBackup: true,
  },
  {
    id: 'sharedEquipment',
    name: 'Shared Equipment',
    description: 'Equipment registry shared across modules',
    module: 'platform',
    sheetName: 'SharedEquipment',
    businessKey: ['serialNumber'],
    parentTables: ['sharedLocations'],
    schema: insertSharedEquipmentSchema,
    exportFields: ['name', 'serialNumber', 'manufacturer', 'model', 'category', 'purchaseDate', 'warrantyExpiration', 'status', 'notes'],
    dataType: 'reference',
    supportsBackup: true,
  },
  {
    id: 'sharedDocuments',
    name: 'Shared Documents',
    description: 'Document storage shared across modules',
    module: 'platform',
    sheetName: 'SharedDocuments',
    businessKey: ['title', 'documentType'],
    schema: insertSharedDocumentSchema,
    exportFields: ['title', 'description', 'documentType', 'objectPath', 'version', 'status', 'effectiveDate', 'expirationDate', 'tags'],
    dataType: 'reference',
    supportsBackup: true,
  },

  // ============ DAILY REPORTS MODULE ============
  {
    id: 'dailyReportTemplates',
    name: 'Department Templates',
    description: 'Department configuration and enabled fields',
    module: 'daily_reports',
    sheetName: 'DepartmentTemplates',
    businessKey: ['department'],
    schema: insertDailyReportTemplateSchema,
    exportFields: ['department', 'departmentLabel', 'description', 'enabledFields', 'procedureTemplates', 'notificationEmails', 'isActive'],
    dataType: 'reference',
    supportsBackup: true,
  },
  {
    id: 'dailyReportAccessCodes',
    name: 'Staff Access Codes',
    description: 'Staff access codes for report submission',
    module: 'daily_reports',
    sheetName: 'AccessCodes',
    businessKey: ['code'],
    schema: insertDailyReportAccessCodeSchema,
    exportFields: ['staffName', 'department', 'code', 'isActive'],
    dataType: 'reference',
    supportsBackup: true,
  },
  {
    id: 'dailyReports',
    name: 'Daily Reports',
    description: 'Submitted daily reports',
    module: 'daily_reports',
    sheetName: 'DailyReports',
    businessKey: ['department', 'reportDate'],
    parentTables: ['dailyReportTemplates'],
    schema: insertDailyReportSchema,
    exportFields: ['department', 'reportDate', 'submittedBy', 'performanceSummary', 'overallRating', 'hasCustomerConcerns', 'customerConcernsSummary', 'metricsData', 'procedureCompletions', 'status'],
    dataType: 'transactional',
    supportsBackup: true,
    excludeFromSync: true,
    productionWarning: 'Daily reports are staff-submitted data - NEVER sync from dev to production',
  },
  {
    id: 'dailyReportIncidents',
    name: 'Report Incidents',
    description: 'Incidents attached to daily reports',
    module: 'daily_reports',
    sheetName: 'DailyReportIncidents',
    businessKey: [],
    parentTables: ['dailyReports'],
    schema: insertDailyReportIncidentSchema,
    exportFields: ['incidentType', 'severity', 'description', 'actionTaken', 'involvedPersons', 'followUpRequired', 'followUpNotes'],
    dataType: 'transactional',
    supportsBackup: true,
    excludeFromSync: true,
  },
  {
    id: 'dailyProcedureTemplates',
    name: 'Procedure Templates',
    description: 'Opening/closing procedure checklists',
    module: 'daily_reports',
    sheetName: 'ProcedureTemplates',
    businessKey: ['name', 'department'],
    parentTables: ['dailyReportTemplates'],
    schema: insertDailyProcedureTemplateSchema,
    exportFields: ['name', 'department', 'description', 'category', 'sortOrder', 'isRequired', 'isActive'],
    dataType: 'reference',
    supportsBackup: true,
  },
  {
    id: 'dailyProcedureCompletions',
    name: 'Procedure Completions',
    description: 'Completed procedures per report',
    module: 'daily_reports',
    sheetName: 'ProcedureCompletions',
    businessKey: [],
    parentTables: ['dailyReports', 'dailyProcedureTemplates'],
    schema: insertDailyProcedureCompletionSchema,
    exportFields: ['completedAt', 'notes'],
    dataType: 'transactional',
    supportsBackup: true,
    excludeFromSync: true,
  },
  {
    id: 'dailyReportEmailRecipients',
    name: 'Email Recipients',
    description: 'Notification recipients per department',
    module: 'daily_reports',
    sheetName: 'EmailRecipients',
    businessKey: ['email', 'department'],
    parentTables: ['dailyReportTemplates'],
    schema: insertDailyReportEmailRecipientSchema,
    exportFields: ['email', 'department', 'isActive'],
    dataType: 'reference',
    supportsBackup: true,
  },
  {
    id: 'dailyReportFieldDefinitions',
    name: 'Field Definitions',
    description: 'Generic report field configurations',
    module: 'daily_reports',
    sheetName: 'FieldDefinitions',
    businessKey: ['fieldKey'],
    schema: insertDailyReportFieldDefinitionSchema,
    exportFields: ['fieldKey', 'fieldLabel', 'fieldType', 'description', 'placeholder', 'options', 'minValue', 'maxValue', 'validationRules', 'defaultValue', 'sortOrder', 'isSystemField', 'isActive'],
    dataType: 'reference',
    supportsBackup: true,
  },
  {
    id: 'departmentFieldAssignments',
    name: 'Department Field Assignments',
    description: 'Which fields are enabled for each department',
    module: 'daily_reports',
    sheetName: 'DepartmentFieldAssignments',
    businessKey: ['department', 'fieldKey'],
    parentTables: ['dailyReportTemplates', 'dailyReportFieldDefinitions'],
    schema: insertDepartmentFieldAssignmentSchema,
    exportFields: ['department', 'fieldKey', 'isRequired', 'sortOrder', 'customLabel'],
    dataType: 'reference',
    supportsBackup: true,
  },

  // ============ RESERVATION MODULE ============
  {
    id: 'resyUsers',
    name: 'Reservation Staff',
    description: 'Staff users for reservation system',
    module: 'reservation',
    sheetName: 'ResyUsers',
    businessKey: ['email'],
    schema: insertResyUserSchema,
    exportFields: ['email', 'name', 'role', 'isActive'],
    sensitiveFields: ['passwordHash'],
    dataType: 'user_generated',
    supportsBackup: true,
    productionWarning: 'Staff accounts have production passwords - passwords will NOT be overwritten',
  },
  {
    id: 'resyLocations',
    name: 'Reservation Locations',
    description: 'Venue locations for reservations',
    module: 'reservation',
    sheetName: 'ResyLocations',
    businessKey: ['name'],
    schema: insertResyLocationSchema,
    exportFields: ['name', 'address', 'city', 'state', 'zipCode', 'phone', 'email', 'timezone', 'isActive'],
    dataType: 'reference',
    supportsBackup: true,
  },
  {
    id: 'resyExperiences',
    name: 'Tasting Experiences',
    description: 'Bookable tasting experiences',
    module: 'reservation',
    sheetName: 'ResyExperiences',
    businessKey: ['name'],
    parentTables: ['resyLocations'],
    schema: insertResyExperienceSchema,
    exportFields: ['name', 'description', 'duration', 'price', 'capacity', 'minGuests', 'maxGuests', 'imageUrl', 'isActive', 'requiresDeposit', 'depositAmount'],
    dataType: 'reference',
    supportsBackup: true,
  },
  {
    id: 'resyClubs',
    name: 'Membership Clubs',
    description: 'Wine club memberships',
    module: 'reservation',
    sheetName: 'ResyClubs',
    businessKey: ['name'],
    schema: insertResyClubSchema,
    exportFields: ['name', 'description', 'monthlyFee', 'annualFee', 'discountPercentage', 'isActive'],
    dataType: 'reference',
    supportsBackup: true,
  },
  {
    id: 'resyCustomers',
    name: 'Reservation Customers',
    description: 'Customer records for reservations',
    module: 'reservation',
    sheetName: 'ResyCustomers',
    businessKey: ['email'],
    parentTables: ['resyClubs'],
    schema: insertResyCustomerSchema,
    exportFields: ['firstName', 'lastName', 'email', 'phone', 'notes', 'vipStatus', 'totalVisits', 'totalSpend'],
    dataType: 'user_generated',
    supportsBackup: true,
    productionWarning: 'Customer data is production data - verify before syncing',
  },
  {
    id: 'resyReservations',
    name: 'Reservations',
    description: 'Guest reservation bookings',
    module: 'reservation',
    sheetName: 'ResyReservations',
    businessKey: ['confirmationCode'],
    parentTables: ['resyExperiences', 'resyCustomers'],
    schema: insertResyReservationSchema,
    exportFields: ['confirmationCode', 'reservationDate', 'reservationTime', 'partySize', 'status', 'customerName', 'customerEmail', 'customerPhone', 'specialRequests', 'notes'],
    dataType: 'transactional',
    supportsBackup: true,
    excludeFromSync: true,
    productionWarning: 'Reservations are transactional data - NEVER sync from dev to production',
  },
  {
    id: 'resyTimeSlots',
    name: 'Time Slots',
    description: 'Available booking time slots',
    module: 'reservation',
    sheetName: 'ResyTimeSlots',
    businessKey: ['experienceId', 'dayOfWeek', 'startTime'],
    parentTables: ['resyExperiences'],
    schema: insertResyTimeSlotSchema,
    exportFields: ['dayOfWeek', 'startTime', 'endTime', 'capacity', 'isActive'],
    dataType: 'reference',
    supportsBackup: true,
  },
  {
    id: 'resyWaitlist',
    name: 'Waitlist',
    description: 'Waitlist entries for full slots',
    module: 'reservation',
    sheetName: 'ResyWaitlist',
    businessKey: [],
    parentTables: ['resyExperiences', 'resyCustomers'],
    schema: insertResyWaitlistSchema,
    exportFields: ['requestedDate', 'requestedTime', 'partySize', 'status', 'notes'],
    dataType: 'transactional',
    supportsBackup: true,
    excludeFromSync: true,
  },
  {
    id: 'resyCustomerVisits',
    name: 'Customer Visits',
    description: 'Customer visit history',
    module: 'reservation',
    sheetName: 'ResyCustomerVisits',
    businessKey: [],
    parentTables: ['resyCustomers', 'resyReservations'],
    schema: insertResyCustomerVisitSchema,
    exportFields: ['visitDate', 'partySize', 'totalSpend', 'notes', 'rating'],
    dataType: 'transactional',
    supportsBackup: true,
    excludeFromSync: true,
  },
  {
    id: 'resyMealPeriods',
    name: 'Meal Periods',
    description: 'Meal period definitions',
    module: 'reservation',
    sheetName: 'ResyMealPeriods',
    businessKey: ['name'],
    parentTables: ['resyLocations'],
    schema: insertResyMealPeriodSchema,
    exportFields: ['name', 'startTime', 'endTime', 'isActive'],
    dataType: 'reference',
    supportsBackup: true,
  },
  {
    id: 'resyOperatingHours',
    name: 'Operating Hours',
    description: 'Location operating hours',
    module: 'reservation',
    sheetName: 'ResyOperatingHours',
    businessKey: ['locationId', 'dayOfWeek'],
    parentTables: ['resyLocations'],
    schema: insertResyOperatingHoursSchema,
    exportFields: ['dayOfWeek', 'openTime', 'closeTime', 'isClosed'],
    dataType: 'reference',
    supportsBackup: true,
  },
  {
    id: 'resySpecialDates',
    name: 'Special Dates',
    description: 'Holidays and special closures',
    module: 'reservation',
    sheetName: 'ResySpecialDates',
    businessKey: ['date', 'name'],
    parentTables: ['resyLocations'],
    schema: insertResySpecialDateSchema,
    exportFields: ['date', 'name', 'isClosed', 'openTime', 'closeTime', 'notes'],
    dataType: 'reference',
    supportsBackup: true,
  },
  {
    id: 'resyLocationTables',
    name: 'Venue Tables',
    description: 'Physical tables at venues',
    module: 'reservation',
    sheetName: 'ResyLocationTables',
    businessKey: ['locationId', 'tableName'],
    parentTables: ['resyLocations'],
    schema: insertResyLocationTableSchema,
    exportFields: ['tableName', 'capacity', 'minCapacity', 'maxCapacity', 'section', 'isActive'],
    dataType: 'reference',
    supportsBackup: true,
  },
  {
    id: 'resyFlowControls',
    name: 'Flow Controls',
    description: 'Reservation flow management',
    module: 'reservation',
    sheetName: 'ResyFlowControls',
    businessKey: ['name'],
    parentTables: ['resyLocations'],
    schema: insertResyFlowControlSchema,
    exportFields: ['name', 'maxCovers', 'intervalMinutes', 'isActive'],
    dataType: 'reference',
    supportsBackup: true,
  },
  {
    id: 'resyTurnTimeSettings',
    name: 'Turn Time Settings',
    description: 'Table turn time configuration',
    module: 'reservation',
    sheetName: 'ResyTurnTimeSettings',
    businessKey: ['partySize'],
    parentTables: ['resyLocations', 'resyMealPeriods'],
    schema: insertResyTurnTimeSettingSchema,
    exportFields: ['partySize', 'turnTimeMinutes'],
    dataType: 'reference',
    supportsBackup: true,
  },
  {
    id: 'resyExperienceDiscounts',
    name: 'Experience Discounts',
    description: 'Discount codes for experiences',
    module: 'reservation',
    sheetName: 'ResyExperienceDiscounts',
    businessKey: ['code'],
    parentTables: ['resyExperiences'],
    schema: insertResyExperienceDiscountSchema,
    exportFields: ['code', 'description', 'discountType', 'discountValue', 'validFrom', 'validTo', 'maxUses', 'usedCount', 'isActive'],
    dataType: 'reference',
    supportsBackup: true,
  },
  {
    id: 'resyClubExperienceDiscounts',
    name: 'Club Discounts',
    description: 'Club member discounts',
    module: 'reservation',
    sheetName: 'ResyClubExperienceDiscounts',
    businessKey: ['clubId', 'experienceId'],
    parentTables: ['resyClubs', 'resyExperiences'],
    schema: insertResyClubExperienceDiscountSchema,
    exportFields: ['discountPercentage', 'isActive'],
    dataType: 'reference',
    supportsBackup: true,
  },
  {
    id: 'resyPrivateEvents',
    name: 'Private Events',
    description: 'Private event bookings',
    module: 'reservation',
    sheetName: 'ResyPrivateEvents',
    businessKey: ['confirmationCode'],
    parentTables: ['resyLocations', 'resyExperiences'],
    schema: insertResyPrivateEventSchema,
    exportFields: ['confirmationCode', 'eventDate', 'startTime', 'endTime', 'partySize', 'customerName', 'customerEmail', 'customerPhone', 'eventType', 'status', 'totalAmount', 'depositAmount', 'notes'],
    dataType: 'transactional',
    supportsBackup: true,
    excludeFromSync: true,
    productionWarning: 'Private events are transactional data - NEVER sync from dev to production',
  },
  {
    id: 'resySiteSettings',
    name: 'Site Settings',
    description: 'Reservation system settings',
    module: 'reservation',
    sheetName: 'ResySiteSettings',
    businessKey: ['id'],
    schema: insertResySiteSettingSchema,
    exportFields: ['siteName', 'siteDescription', 'logoUrl', 'primaryColor', 'accentColor', 'contactEmail', 'contactPhone', 'address', 'timezone'],
    dataType: 'configuration',
    supportsBackup: true,
  },
  {
    id: 'resyFooterLinks',
    name: 'Footer Links',
    description: 'Website footer links',
    module: 'reservation',
    sheetName: 'ResyFooterLinks',
    businessKey: ['label', 'url'],
    schema: insertResyFooterLinkSchema,
    exportFields: ['label', 'url', 'sortOrder', 'isActive'],
    dataType: 'reference',
    supportsBackup: true,
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

export interface RegistryMetadata {
  modules: Array<{
    id: SyncModule;
    name: string;
    description: string;
    icon: string;
    tables: Array<{
      id: string;
      name: string;
      description: string;
      sheetName: string;
      businessKey: string[];
      exportFields: string[];
      parentTables: string[];
      excludeFromSync: boolean;
      requiresConfirmation: boolean;
      confirmationMessage?: string;
      dataType: DataType;
      supportsBackup: boolean;
      productionWarning?: string;
    }>;
  }>;
  stats: Record<SyncModule, { total: number; syncable: number }>;
}

export function getRegistryMetadata(): RegistryMetadata {
  const modules = Object.entries(SYNC_MODULES).map(([id, meta]) => ({
    id: id as SyncModule,
    name: meta.name,
    description: meta.description,
    icon: meta.icon,
    tables: SYNC_TABLES
      .filter(t => t.module === id)
      .map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        sheetName: t.sheetName,
        businessKey: t.businessKey,
        exportFields: t.exportFields,
        parentTables: t.parentTables || [],
        excludeFromSync: t.excludeFromSync || false,
        requiresConfirmation: t.requiresConfirmation || false,
        confirmationMessage: t.confirmationMessage,
        dataType: t.dataType,
        supportsBackup: t.supportsBackup || false,
        productionWarning: t.productionWarning,
      })),
  }));

  return {
    modules,
    stats: getModuleStats(),
  };
}

// Helper functions for backup/restore feature
export function getBackupableTables(): SyncTableConfig[] {
  return SYNC_TABLES.filter(t => t.supportsBackup);
}

export function getTablesByDataType(dataType: DataType): SyncTableConfig[] {
  return SYNC_TABLES.filter(t => t.dataType === dataType);
}

export function getSafeToSyncTables(): SyncTableConfig[] {
  // Reference and configuration data are generally safe to sync
  return SYNC_TABLES.filter(t => 
    (t.dataType === 'reference' || t.dataType === 'configuration') && 
    !t.excludeFromSync
  );
}

export function getProductionProtectedTables(): SyncTableConfig[] {
  // User-generated and transactional data should be protected in production
  return SYNC_TABLES.filter(t => 
    t.dataType === 'user_generated' || t.dataType === 'transactional'
  );
}

// ============ SYNC REGISTRY VALIDATION ============
// Tables that should NOT be in sync registry (session/transient data)
const EXCLUDED_TABLES = new Set([
  'sessions',           // Authentication sessions
  'b2bSessions',        // B2B customer sessions
  'guestSessions',      // Guest sessions
  'passwordResetTokens', // Password reset tokens
  'b2bPasswordResetTokens', // B2B password resets
  'users',              // Replit auth users (managed by OIDC)
  'cartItems',          // Shopping cart items (transient)
  'cartDiscounts',      // Cart discounts (transient)
  'favorites',          // Guest favorites (transient)
  'viewHistory',        // View history (transient)
  'triviaAttempts',     // Trivia attempts (per session)
  'triviaScores',       // Trivia scores (per session)
  'achievementRedemptions', // Redemptions (per session)
  'surveys',            // Guest surveys (transient)
  'improvementNotes',   // Internal notes
  'productNotes',       // Internal product notes
  'platformAuditLog',   // Audit log (transactional, auto-generated)
  'platformUserModuleAccess', // Deprecated/auto-generated
  'userPermissionOverrides',  // Per-user overrides (special case)
  'b2bRolePermissions', // B2B role permissions (separate auth system)
  'b2bCommissions',     // Commission tracking (transactional)
  'b2bEmailTemplates',  // Email templates (not yet ready for sync)
  'b2bEmailAutomationLogs', // Email logs (transactional)
  // LMS table aliases (schema uses lms prefix, syncRegistry uses short names)
  'lmsCategories',      // -> courseCategories
  'lmsCourses',         // -> courses
  'lmsLessons',         // -> lessons
  'lmsQuizQuestions',   // -> quizQuestions
  'lmsCertificates',    // -> certificates
  'lmsEnrollments',     // -> enrollments
  'lmsLessonProgress',  // -> lessonProgress
  'lmsQuizAttempts',    // -> quizAttempts
  // Reservation module sessions
  'resySessions',       // Reservation system sessions (transient)
]);

export interface SyncRegistryValidation {
  isValid: boolean;
  registeredTables: number;
  missingTables: string[];
  excludedTables: string[];
}

export function validateSyncRegistry(schemaTables: string[]): SyncRegistryValidation {
  const registeredTableIds = new Set(SYNC_TABLES.map(t => t.id));
  const missingTables: string[] = [];
  const excludedTables: string[] = [];
  
  for (const tableName of schemaTables) {
    if (EXCLUDED_TABLES.has(tableName)) {
      excludedTables.push(tableName);
      continue;
    }
    
    // Check if table is registered (using camelCase table name as ID)
    if (!registeredTableIds.has(tableName)) {
      missingTables.push(tableName);
    }
  }
  
  return {
    isValid: missingTables.length === 0,
    registeredTables: SYNC_TABLES.length,
    missingTables,
    excludedTables,
  };
}

export function logSyncRegistryStatus(validation: SyncRegistryValidation): void {
  console.log(`[Sync Registry] ${validation.registeredTables} tables registered`);
  
  if (validation.missingTables.length > 0) {
    console.warn(`[Sync Registry] ⚠️  WARNING: ${validation.missingTables.length} tables NOT in sync registry:`);
    validation.missingTables.forEach(t => console.warn(`  - ${t}`));
    console.warn(`[Sync Registry] Add these tables to server/syncRegistry.ts to enable syncing`);
  } else {
    console.log(`[Sync Registry] ✓ All syncable tables registered`);
  }
}
