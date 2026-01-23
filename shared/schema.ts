import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, boolean, timestamp, jsonb, unique, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define enums for consistent data
export const categoryEnum = pgEnum("category", ["wine", "spirits", "beer", "canned_cocktail", "canned_wine", "cider"]);
export const wineColorEnum = pgEnum("wine_color", ["red", "white", "rosé", "sparkling", "dessert"]);
export const sweetnessEnum = pgEnum("sweetness", ["dry", "off-dry", "semi-sweet", "sweet"]);
export const bodyEnum = pgEnum("body", ["light", "medium", "full"]);
export const userRoleEnum = pgEnum("user_role", ["viewer", "admin"]);
export const rewardTypeEnum = pgEnum("reward_type", ["discount", "token"]);
export const redemptionStatusEnum = pgEnum("redemption_status", ["pending", "applied", "void"]);
export const accountStatusEnum = pgEnum("account_status", ["active", "pending_approval", "inactive", "suspended", "archived"]);
export const customerTypeEnum = pgEnum("customer_type", ["retail_liquor", "restaurant", "private_club", "other"]);
export const b2bUserTypeEnum = pgEnum("b2b_user_type", ["customer", "sales_rep", "admin"]);
export const productMediaRoleEnum = pgEnum("product_media_role", ["primary", "label", "lifestyle", "gallery"]);

// Beer-specific enums
export const beerStyleEnum = pgEnum("beer_style", ["ipa", "lager", "stout", "porter", "ale", "wheat_beer", "pilsner", "sour", "amber", "pale_ale", "saison", "belgian"]);
export const beerColorEnum = pgEnum("beer_color", ["pale", "amber", "dark"]);
export const beerBitternessEnum = pgEnum("beer_bitterness", ["mild", "moderate", "hoppy", "very_hoppy"]);

// Spirits-specific enums
export const spiritTypeEnum = pgEnum("spirit_type", ["whiskey", "vodka", "gin", "rum", "tequila", "brandy", "cognac", "liqueur", "mezcal", "bourbon", "scotch", "rye"]);
export const spiritAgingEnum = pgEnum("spirit_aging", ["unaged", "young", "aged", "extra_aged"]);
export const spiritFlavorEnum = pgEnum("spirit_flavor", ["smooth", "bold", "sweet", "spicy", "fruity", "smoky", "herbal", "citrus"]);

// Compliance module enums
export const complianceCategoryEnum = pgEnum("compliance_category", [
  "tax",
  "licensing",
  "payroll",
  "privacy",
  "security",
  "environmental",
  "health_safety",
  "regulatory",
  "administrative",
  "insurance",
  "other"
]);

export const complianceRecurrenceEnum = pgEnum("compliance_recurrence", [
  "one_time",
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "semi_annual",
  "annual",
  "custom"
]);

export const compliancePriorityEnum = pgEnum("compliance_priority", ["low", "medium", "high", "critical"]);

export const complianceStatusEnum = pgEnum("compliance_status", ["pending", "in_progress", "completed", "overdue", "cancelled"]);

// Department Calendar enums
export const departmentRecurrenceEnum = pgEnum("department_recurrence", [
  "one_time",
  "daily",
  "weekly",
  "bi_weekly",
  "monthly",
  "bi_monthly",
  "quarterly",
  "annual"
]);

export const departmentTaskStatusEnum = pgEnum("department_task_status", ["pending", "in_progress", "completed", "overdue", "cancelled"]);

export const departmentTaskPriorityEnum = pgEnum("department_task_priority", ["low", "medium", "high", "critical"]);

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").notNull().default("viewer"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Whitelist table for pre-approved users
export const whitelistedEmails = pgTable("whitelisted_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  role: userRoleEnum("role").notNull().default("viewer"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: categoryEnum("category").notNull(),
  type: text("type"),
  varietal: text("varietal"),
  vintageYear: text("vintage_year"),
  region: text("region"),
  description: text("description").notNull(),
  tastingNotes: text("tasting_notes"),
  foodPairings: text("food_pairings"),
  servingTemp: text("serving_temp"),
  alcoholContent: text("alcohol_content"),
  bottleSize: text("bottle_size"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  wholesalePricing: decimal("wholesale_pricing", { precision: 10, scale: 2 }),
  sku: text("sku").unique(),
  stockQuantity: integer("stock_quantity").default(0),
  lowStockThreshold: integer("low_stock_threshold").default(10),
  ignoreInventory: boolean("ignore_inventory").notNull().default(true),
  imageUrl: text("image_url"),
  labelImageUrl: text("label_image_url"),
  lifestyleImageUrl: text("lifestyle_image_url"),
  characteristics: text("characteristics"),
  wineColor: wineColorEnum("wine_color"),
  sweetness: text("sweetness"), // Dry, Off-Dry, Semi-Sweet, Sweet, Dessert Wine, N/A
  body: text("body"), // Light-Bodied, Medium-Bodied, Full-Bodied, Light, Medium, Full, N/A
  // Beer-specific fields
  beerStyle: beerStyleEnum("beer_style"),
  beerColor: beerColorEnum("beer_color"),
  beerBitterness: beerBitternessEnum("beer_bitterness"),
  // Spirits-specific fields
  spiritType: spiritTypeEnum("spirit_type"),
  spiritAging: spiritAgingEnum("spirit_aging"),
  spiritFlavor: spiritFlavorEnum("spirit_flavor"),
  productionMethod: text("production_method"),
  agingProcess: text("aging_process"),
  awards: text("awards"),
  rating: decimal("rating", { precision: 3, scale: 1 }),
  available: boolean("available").notNull().default(true),
  featured: boolean("featured").notNull().default(false),
  newArrival: boolean("new_arrival").notNull().default(false),
  staffPick: boolean("staff_pick").notNull().default(false),
  wineOfMonth: boolean("wine_of_month").notNull().default(false),
  tags: text("tags").array(),
  caseSize: integer("case_size").notNull().default(12),
  isArchived: boolean("is_archived").notNull().default(false),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_products_category").on(table.category),
  index("idx_products_wine_color").on(table.wineColor),
  index("idx_products_available").on(table.available),
  index("idx_products_category_available").on(table.category, table.available),
  index("idx_products_archived").on(table.isArchived),
]);

export const guestSessions = pgTable("guest_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  guestName: text("guest_name").notNull(),
  preferredBeverageTypes: text("preferred_beverage_types").array(),
  wineColors: text("wine_colors").array(),
  flavorPreferences: text("flavor_preferences").array(),
  occasion: text("occasion"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastActiveAt: timestamp("last_active_at").notNull().defaultNow(),
});

export const favorites = pgTable("favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => guestSessions.id, { onDelete: 'cascade' }),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const viewHistory = pgTable("view_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => guestSessions.id, { onDelete: 'cascade' }),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  viewCount: integer("view_count").notNull().default(1),
  lastViewedAt: timestamp("last_viewed_at").notNull().defaultNow(),
});

export const cartItems = pgTable("cart_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => guestSessions.id, { onDelete: 'cascade' }),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  quantity: integer("quantity").notNull().default(1),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const triviaQuestions = pgTable("trivia_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  question: text("question").notNull(),
  answers: jsonb("answers").notNull().$type<string[]>(),
  correctIndex: integer("correct_index").notNull(),
  explanation: text("explanation").notNull(),
  image: text("image"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const triviaAchievements = pgTable("trivia_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scoreThreshold: integer("score_threshold").notNull().unique(),
  rewardType: rewardTypeEnum("reward_type").notNull(),
  rewardValue: decimal("reward_value", { precision: 10, scale: 2 }).notNull(),
  achievementMessage: text("achievement_message").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const triviaAttempts = pgTable("trivia_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => guestSessions.id, { onDelete: 'cascade' }),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  totalQuestions: integer("total_questions").notNull(),
  correctAnswers: integer("correct_answers").notNull().default(0),
  achievementId: varchar("achievement_id").references(() => triviaAchievements.id),
  discountAppliedAt: timestamp("discount_applied_at"),
  tokenVerifiedAt: timestamp("token_verified_at"),
  staffVerifier: text("staff_verifier"),
  notes: text("notes"),
  locked: boolean("locked").notNull().default(false),
});

export const triviaScores = pgTable("trivia_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => guestSessions.id, { onDelete: 'cascade' }),
  attemptId: varchar("attempt_id").references(() => triviaAttempts.id, { onDelete: 'cascade' }),
  questionId: varchar("question_id").notNull().references(() => triviaQuestions.id, { onDelete: 'cascade' }),
  isCorrect: boolean("is_correct").notNull(),
  answeredAt: timestamp("answered_at").notNull().defaultNow(),
});

export const achievementRedemptions = pgTable("achievement_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  attemptId: varchar("attempt_id").notNull().references(() => triviaAttempts.id, { onDelete: 'cascade' }),
  rewardType: rewardTypeEnum("reward_type").notNull(),
  status: redemptionStatusEnum("status").notNull().default("pending"),
  appliedAmount: decimal("applied_amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const cartDiscounts = pgTable("cart_discounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => guestSessions.id, { onDelete: 'cascade' }),
  source: text("source").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  label: text("label").notNull(),
  appliedAt: timestamp("applied_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const appSettings = pgTable("app_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const surveys = pgTable("surveys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => guestSessions.id, { onDelete: 'cascade' }),
  easeOfUse: integer("ease_of_use"),
  helpfulness: integer("helpfulness"),
  staffReplacement: integer("staff_replacement"),
  recommendation: integer("recommendation"),
  favoriteFeature: text("favorite_feature"),
  improvements: text("improvements"),
  additionalComments: text("additional_comments"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const productNotes = pgTable("product_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => guestSessions.id, { onDelete: 'cascade' }),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  uniqueSessionProduct: unique().on(table.sessionId, table.productId),
}));

export const filterOptions = pgTable("filter_options", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fieldType: text("field_type").notNull(), // 'category', 'wine_color', 'sweetness', 'body', 'characteristics'
  optionValue: text("option_value").notNull(), // The actual value stored in the database (e.g., 'spirits', 'red')
  displayLabel: text("display_label").notNull(), // What users see (e.g., 'Spirits', 'Red Wine')
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  uniqueFieldValue: unique().on(table.fieldType, table.optionValue),
}));

export const slideshowImages = pgTable("slideshow_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename"),
  imageUrl: text("image_url"),
  title: text("title"),
  contentHtml: text("content_html"),
  caption: text("caption"),
  description: text("description"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  isRequired: boolean("is_required").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const b2bSlideshowSlides = pgTable("b2b_slideshow_slides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  highlight: text("highlight"),
  mediaType: text("media_type").notNull(),
  mediaUrl: text("media_url"), // Direct URL (e.g., /api/media-library/{id}/file) - like tasting app
  mediaLibraryId: varchar("media_library_id").references(() => mediaLibrary.id, { onDelete: "set null" }),
  videoId: varchar("video_id").references(() => videos.id, { onDelete: "set null" }),
  additionalMediaIds: text("additional_media_ids").array(), // Array of media library IDs for stacking images
  iconName: text("icon_name"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const mediaLibrary = pgTable("media_library", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  objectPath: text("object_path").notNull(),
  publicUrl: text("public_url").notNull(),
  category: text("category").notNull().default('uncategorized'),
  description: text("description"),
  altText: text("alt_text"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const productMedia = pgTable("product_media", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  mediaId: varchar("media_id").notNull().references(() => mediaLibrary.id, { onDelete: "cascade" }),
  role: productMediaRoleEnum("role").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  unique("product_media_unique").on(table.productId, table.role, table.mediaId),
]);

export const videos = pgTable("videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  duration: text("duration"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const commercials = pgTable("commercials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const characteristics = pgTable("characteristics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  productTypes: categoryEnum("product_types").array().notNull(),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_characteristics_product_types").using("gin", table.productTypes),
]);

export const productCharacteristics = pgTable("product_characteristics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  characteristicId: varchar("characteristic_id").notNull().references(() => characteristics.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueProductCharacteristic: unique().on(table.productId, table.characteristicId),
}));

// B2B Platform Tables
export const tierPricing = pgTable("tier_pricing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tierName: text("tier_name").notNull(),
  category: categoryEnum("category").notNull().default("wine"),
  description: text("description"),
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }).notNull(),
  commitmentCases: integer("commitment_cases").default(0),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  uniqueTierNameCategory: unique().on(table.tierName, table.category),
}));

export const salesReps = pgTable("sales_reps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").notNull().unique(),
  passwordHash: varchar("password_hash").notNull(),
  phoneNumber: varchar("phone_number"),
  territory: varchar("territory"),
  commissionPercentage: decimal("commission_percentage", { precision: 5, scale: 2 }).notNull().default('0'),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const b2bAdmins = pgTable("b2b_admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").notNull().unique(),
  passwordHash: varchar("password_hash").notNull(),
  active: boolean("active").notNull().default(true),
  receiveOrderEmails: boolean("receive_order_emails").notNull().default(false),
  receiveContractNotifications: boolean("receive_contract_notifications").notNull().default(false),
  notes: varchar("notes", { length: 500 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const b2bCustomers = pgTable("b2b_customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountName: varchar("account_name").notNull(),
  accountStatus: accountStatusEnum("account_status").notNull().default("pending_approval"),
  customerType: customerTypeEnum("customer_type"),
  pricingTierId: varchar("pricing_tier_id").references(() => tierPricing.id),
  licenseNumber: varchar("license_number"),
  taxId: varchar("tax_id"),
  creditTerms: varchar("credit_terms"),
  creditLimit: decimal("credit_limit", { precision: 10, scale: 2 }),
  primaryContactName: varchar("primary_contact_name").notNull(),
  primaryContactRole: varchar("primary_contact_role"),
  customerNumber: varchar("customer_number").notNull().unique(),
  emailAddress: varchar("email_address").notNull(),
  passwordHash: varchar("password_hash"),
  phoneNumber: varchar("phone_number").notNull(),
  altPhoneNumber: varchar("alt_phone_number"),
  billingAddress: text("billing_address"),
  billingCity: varchar("billing_city"),
  billingState: varchar("billing_state"),
  billingZipCode: varchar("billing_zip_code"),
  shippingAddress: text("shipping_address"),
  shippingCity: varchar("shipping_city"),
  shippingState: varchar("shipping_state"),
  shippingZipCode: varchar("shipping_zip_code"),
  salesRepId: varchar("sales_rep_id").references(() => salesReps.id),
  approvedAt: timestamp("approved_at"),
  approvedByAdminId: varchar("approved_by_admin_id").references(() => b2bAdmins.id),
  signupDate: timestamp("signup_date").notNull().defaultNow(),
  lastOrderDate: timestamp("last_order_date"),
  totalPurchaseValue: decimal("total_purchase_value", { precision: 10, scale: 2 }).default('0'),
  commitmentStartDate: timestamp("commitment_start_date"),
  notes: text("notes"),
  acceptsMarketing: boolean("accepts_marketing").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_b2b_customers_status").on(table.accountStatus),
  index("idx_b2b_customers_type").on(table.customerType),
  index("idx_b2b_customers_sales_rep").on(table.salesRepId),
]);

export const customerRequestStatusEnum = pgEnum("customer_request_status", ["pending", "approved", "rejected"]);

export const b2bCustomerRequests = pgTable("b2b_customer_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountName: varchar("account_name").notNull(),
  customerType: customerTypeEnum("customer_type"),
  licenseNumber: varchar("license_number"),
  taxId: varchar("tax_id"),
  primaryContactName: varchar("primary_contact_name").notNull(),
  primaryContactRole: varchar("primary_contact_role"),
  emailAddress: varchar("email_address").notNull(),
  phoneNumber: varchar("phone_number").notNull(),
  altPhoneNumber: varchar("alt_phone_number"),
  billingAddress: text("billing_address"),
  billingCity: varchar("billing_city"),
  billingState: varchar("billing_state"),
  billingZipCode: varchar("billing_zip_code"),
  shippingAddress: text("shipping_address"),
  shippingCity: varchar("shipping_city"),
  shippingState: varchar("shipping_state"),
  shippingZipCode: varchar("shipping_zip_code"),
  pricingTierId: varchar("pricing_tier_id").references(() => tierPricing.id),
  notes: text("notes"),
  status: customerRequestStatusEnum("status").notNull().default("pending"),
  submittedBySalesRepId: varchar("submitted_by_sales_rep_id").notNull().references(() => salesReps.id),
  reviewedByAdminId: varchar("reviewed_by_admin_id").references(() => b2bAdmins.id),
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"),
  createdCustomerId: varchar("created_customer_id").references(() => b2bCustomers.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_b2b_customer_requests_status").on(table.status),
  index("idx_b2b_customer_requests_sales_rep").on(table.submittedBySalesRepId),
]);

export const b2bCustomerLocations = pgTable("b2b_customer_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => b2bCustomers.id, { onDelete: 'cascade' }),
  storeName: varchar("store_name").notNull(),
  storeAddress: text("store_address").notNull(),
  storeCity: varchar("store_city").notNull(),
  storeState: varchar("store_state").notNull(),
  storeZipCode: varchar("store_zip_code").notNull(),
  storePhone: varchar("store_phone"),
  storeEmail: varchar("store_email"),
  website: text("website"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  isPrimary: boolean("is_primary").notNull().default(false),
  showOnWhereToBuy: boolean("show_on_where_to_buy").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const b2bCustomerManualProducts = pgTable("b2b_customer_manual_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => b2bCustomers.id, { onDelete: 'cascade' }),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Tier Agreements - Required for Tier 3 and Tier 4 assignment
export const b2bTierAgreements = pgTable("b2b_tier_agreements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => b2bCustomers.id, { onDelete: 'cascade' }),
  tierId: varchar("tier_id").references(() => tierPricing.id), // Nullable until customer selects tier
  // Agreement token for secure access
  token: varchar("token").notNull().unique(),
  tokenExpiresAt: timestamp("token_expires_at").notNull(),
  // Snapshot of customer info at time of agreement
  businessName: varchar("business_name").notNull(),
  contactName: varchar("contact_name").notNull(),
  address: text("address").notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone").notNull(),
  // Signature info (null until signed)
  signatureName: varchar("signature_name"),
  signedAt: timestamp("signed_at"),
  // Agreement status
  status: varchar("status").notNull().default("active"), // active, superseded, voided
  // Fiscal year info
  fiscalYearStart: timestamp("fiscal_year_start").notNull(),
  fiscalYearEnd: timestamp("fiscal_year_end").notNull(),
  // Admin/rep who sent the agreement
  sentByAdminId: varchar("sent_by_admin_id").references(() => b2bAdmins.id),
  sentBySalesRepId: varchar("sent_by_sales_rep_id").references(() => salesReps.id),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_b2b_tier_agreements_customer").on(table.customerId),
  index("idx_b2b_tier_agreements_token").on(table.token),
  index("idx_b2b_tier_agreements_status").on(table.status),
]);

export const b2bSessions = pgTable(
  "b2b_sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_b2b_session_expire").on(table.expire)],
);

export const b2bOrders = pgTable("b2b_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => b2bCustomers.id),
  orderNumber: varchar("order_number").notNull().unique(),
  invoiceNumber: varchar("invoice_number"),
  orderType: varchar("order_type").notNull().default("order"), // 'order' or 'return'
  orderDate: timestamp("order_date").notNull().defaultNow(),
  status: varchar("status").notNull().default("pending_delivery_date"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).default('0'),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  shippingAddress: text("shipping_address"),
  shippingCity: varchar("shipping_city"),
  shippingState: varchar("shipping_state"),
  shippingZipCode: varchar("shipping_zip_code"),
  // Delivery date workflow
  scheduledDeliveryDate: timestamp("scheduled_delivery_date"),
  deliveryDateToken: varchar("delivery_date_token"),
  deliveryDateTokenExpiresAt: timestamp("delivery_date_token_expires_at"),
  // Admin approval workflow
  approvalToken: varchar("approval_token"),
  approvalTokenExpiresAt: timestamp("approval_token_expires_at"),
  approvedAt: timestamp("approved_at"),
  approvedByAdminId: varchar("approved_by_admin_id").references(() => b2bAdmins.id),
  rejectedAt: timestamp("rejected_at"),
  rejectedByAdminId: varchar("rejected_by_admin_id").references(() => b2bAdmins.id),
  rejectionReason: text("rejection_reason"),
  // Delivery confirmation workflow
  deliveryConfirmationToken: varchar("delivery_confirmation_token"),
  deliveryConfirmationTokenExpiresAt: timestamp("delivery_confirmation_token_expires_at"),
  deliveredAt: timestamp("delivered_at"),
  deliveryConfirmedBySalesRepId: varchar("delivery_confirmed_by_sales_rep_id").references(() => salesReps.id),
  // Payment tracking
  paidAt: timestamp("paid_at"),
  paymentMethod: varchar("payment_method"),
  paymentReference: varchar("payment_reference"),
  paymentNotes: text("payment_notes"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const b2bOrderItems = pgTable("b2b_order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => b2bOrders.id, { onDelete: 'cascade' }),
  productId: varchar("product_id").notNull().references(() => products.id),
  productName: text("product_name").notNull(),
  sku: text("sku"),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  retailPrice: decimal("retail_price", { precision: 10, scale: 2 }).notNull(),
  lineTotal: decimal("line_total", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const b2bCommissions = pgTable("b2b_commissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => b2bOrders.id, { onDelete: 'cascade' }),
  salesRepId: varchar("sales_rep_id").notNull().references(() => salesReps.id),
  orderTotal: decimal("order_total", { precision: 10, scale: 2 }).notNull(),
  commissionPercentage: decimal("commission_percentage", { precision: 5, scale: 2 }).notNull(),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status").notNull().default("pending"),
  paidToSalesRep: boolean("paid_to_sales_rep").notNull().default(false),
  paidToSalesRepAt: timestamp("paid_to_sales_rep_at"),
  payPeriod: varchar("pay_period"), // e.g., "2024-01", "Jan 2024"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const b2bSettings = pgTable("b2b_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  settingKey: varchar("setting_key").notNull().unique(),
  settingValue: text("setting_value"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Role-based permissions for B2B users (admin, sales_rep, power_user, view_only)
export const b2bRolePermissions = pgTable("b2b_role_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roleName: varchar("role_name").notNull().unique(), // admin, sales_rep, power_user, view_only
  roleDisplayName: varchar("role_display_name").notNull(), // Admin, Sales Rep, Power User, View Only
  roleDescription: text("role_description"),
  tabPermissions: jsonb("tab_permissions").notNull(), // JSON object with tab permission config
  specialPermissions: jsonb("special_permissions").notNull(), // JSON object with special ability flags
  isDefault: boolean("is_default").notNull().default(false), // True for system-defined roles
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedByAdminId: varchar("updated_by_admin_id").references(() => b2bAdmins.id),
});

export const b2bPasswordResetTokens = pgTable("b2b_password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  userType: b2bUserTypeEnum("user_type").notNull(),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const b2bEmailTemplates = pgTable("b2b_email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  triggerType: varchar("trigger_type").notNull(), // 'first_order', 'overdue_payment', 'tier_renewal', 'manual'
  tierFilter: text("tier_filter"), // JSON array of tier names: ["Tier 3", "Tier 4"] or null for all
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text").notNull(),
  daysBeforeEvent: integer("days_before_event"), // For renewal reminders (e.g., 30 days before)
  active: boolean("active").notNull().default(true),
  createdByAdminId: varchar("created_by_admin_id").references(() => b2bAdmins.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const b2bEmailAutomationLogs = pgTable("b2b_email_automation_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").references(() => b2bEmailTemplates.id, { onDelete: 'set null' }),
  customerId: varchar("customer_id").references(() => b2bCustomers.id, { onDelete: 'cascade' }),
  recipientEmail: varchar("recipient_email").notNull(),
  subject: text("subject").notNull(),
  triggerType: varchar("trigger_type").notNull(),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  success: boolean("success").notNull().default(true),
  errorMessage: text("error_message"),
});

// System email template customizations - allows editing hardcoded template text
export const b2bSystemTemplateCustomizations = pgTable("b2b_system_template_customizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateKey: varchar("template_key").notNull().unique(), // e.g., 'order_delivery_date', 'password_reset'
  customSubject: text("custom_subject"), // Custom subject line (null = use default)
  customIntroText: text("custom_intro_text"), // Custom intro/greeting text
  customBodyText: text("custom_body_text"), // Custom main body text
  customClosingText: text("custom_closing_text"), // Custom closing/signature text
  active: boolean("active").notNull().default(true), // Whether customizations are active
  updatedByAdminId: varchar("updated_by_admin_id").references(() => b2bAdmins.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertB2bSystemTemplateCustomizationSchema = createInsertSchema(b2bSystemTemplateCustomizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertB2bSystemTemplateCustomization = z.infer<typeof insertB2bSystemTemplateCustomizationSchema>;
export type B2bSystemTemplateCustomization = typeof b2bSystemTemplateCustomizations.$inferSelect;

export const improvementNotes = pgTable("improvement_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  noteNumber: integer("note_number").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  pageReference: text("page_reference").notNull(),
  appType: varchar("app_type").notNull(), // 'base' or 'b2b'
  status: varchar("status").notNull().default("active"), // 'active' or 'completed'
  priority: varchar("priority").default("medium"), // 'low', 'medium', 'high'
  createdBy: varchar("created_by"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================================================
// PLATFORM FOUNDATION TABLES
// Central infrastructure for multi-module operations platform
// ============================================================================

// Module status enum for tracking module lifecycle
export const moduleStatusEnum = pgEnum("module_status", ["active", "development", "planned", "inactive"]);

// Module progress enum for tracking development progress
export const moduleProgressEnum = pgEnum("module_progress", ["not_started", "in_progress", "in_beta", "launched", "complete"]);

// Global role enum for platform-wide access control
export const globalRoleEnum = pgEnum("global_role", ["super_admin", "admin", "manager", "staff", "viewer"]);

// Module Registry - tracks all platform modules and their status
export const platformModules = pgTable("platform_modules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  moduleKey: varchar("module_key").notNull().unique(), // e.g., 'tasting', 'b2b', 'lms', 'sop'
  moduleName: varchar("module_name").notNull(), // e.g., 'Tasting Experience', 'B2B Wholesale'
  description: text("description"),
  icon: varchar("icon"), // Lucide icon name
  color: varchar("color"), // Tailwind color class
  routePrefix: varchar("route_prefix").notNull(), // e.g., '/app', '/b2b', '/lms'
  status: moduleStatusEnum("status").notNull().default("planned"),
  progress: moduleProgressEnum("progress").notNull().default("not_started"), // Development progress tracking
  sortOrder: integer("sort_order").notNull().default(0),
  launchDate: timestamp("launch_date"),
  settings: jsonb("settings"), // Module-specific configuration
  notes: text("notes"), // Admin notes and ideas for this module
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Staff Dashboard Module Configuration - controls which modules appear on the staff-facing dashboard
export const staffDashboardModules = pgTable("staff_dashboard_modules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  moduleId: varchar("module_id").notNull().references(() => platformModules.id, { onDelete: 'cascade' }),
  isEnabled: boolean("is_enabled").notNull().default(false),
  linkUrl: varchar("link_url").notNull(), // The customer/staff-facing URL (e.g., '/reservations', '/daily-report')
  customLabel: varchar("custom_label"), // Optional custom label for the staff dashboard
  customDescription: text("custom_description"), // Optional custom description
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  unique().on(table.moduleId),
]);

// Platform Users - unified user management across all modules
export const platformUsers = pgTable("platform_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  passwordHash: varchar("password_hash"),
  profileImageUrl: varchar("profile_image_url"),
  globalRole: globalRoleEnum("global_role").notNull().default("viewer"),
  department: varchar("department"),
  jobTitle: varchar("job_title"),
  phoneNumber: varchar("phone_number"),
  active: boolean("active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Platform User Module Access - maps users to specific modules with roles
export const platformUserModuleAccess = pgTable("platform_user_module_access", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => platformUsers.id, { onDelete: 'cascade' }),
  moduleId: varchar("module_id").notNull().references(() => platformModules.id, { onDelete: 'cascade' }),
  moduleRole: varchar("module_role").notNull(), // Module-specific role (e.g., 'trainer', 'technician')
  permissions: jsonb("permissions"), // Fine-grained permission overrides
  grantedAt: timestamp("granted_at").notNull().defaultNow(),
  grantedBy: varchar("granted_by").references(() => platformUsers.id),
}, (table) => [
  unique().on(table.userId, table.moduleId),
  index("idx_user_module_user").on(table.userId),
  index("idx_user_module_module").on(table.moduleId),
]);

// Shared Locations - physical locations used across modules
export const sharedLocations = pgTable("shared_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationName: varchar("location_name").notNull(),
  locationType: varchar("location_type").notNull(), // 'winery', 'tasting_room', 'warehouse', 'office'
  address: text("address"),
  city: varchar("city"),
  state: varchar("state"),
  zipCode: varchar("zip_code"),
  phoneNumber: varchar("phone_number"),
  managerUserId: varchar("manager_user_id").references(() => platformUsers.id),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Shared Equipment - assets tracked across operations and maintenance modules
export const sharedEquipment = pgTable("shared_equipment", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  equipmentName: varchar("equipment_name").notNull(),
  equipmentType: varchar("equipment_type").notNull(), // 'fermenter', 'press', 'bottler', 'forklift', etc.
  manufacturer: varchar("manufacturer"),
  model: varchar("model"),
  serialNumber: varchar("serial_number"),
  locationId: varchar("location_id").references(() => sharedLocations.id),
  purchaseDate: timestamp("purchase_date"),
  warrantyExpiry: timestamp("warranty_expiry"),
  status: varchar("status").notNull().default("operational"), // 'operational', 'maintenance', 'retired'
  maintenanceSchedule: jsonb("maintenance_schedule"), // Recurring maintenance config
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Shared Documents - SOPs, manuals, guides used across modules
export const sharedDocuments = pgTable("shared_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  documentType: varchar("document_type").notNull(), // 'sop', 'manual', 'guide', 'policy', 'checklist'
  category: varchar("category"), // e.g., 'safety', 'quality', 'operations', 'hr'
  version: varchar("version").notNull().default("1.0"),
  content: text("content"), // Markdown or HTML content
  fileUrl: text("file_url"), // URL to attached file
  moduleId: varchar("module_id").references(() => platformModules.id), // Optional: module-specific doc
  locationId: varchar("location_id").references(() => sharedLocations.id), // Optional: location-specific
  authorId: varchar("author_id").references(() => platformUsers.id),
  approvedById: varchar("approved_by_id").references(() => platformUsers.id),
  approvedAt: timestamp("approved_at"),
  effectiveDate: timestamp("effective_date"),
  reviewDate: timestamp("review_date"), // Next review due date
  status: varchar("status").notNull().default("draft"), // 'draft', 'pending_review', 'approved', 'archived'
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Audit Log - tracks important actions across all modules
export const platformAuditLog = pgTable("platform_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => platformUsers.id),
  moduleId: varchar("module_id").references(() => platformModules.id),
  action: varchar("action").notNull(), // 'create', 'update', 'delete', 'login', 'logout', etc.
  entityType: varchar("entity_type").notNull(), // Table/entity name
  entityId: varchar("entity_id"), // ID of affected record
  changes: jsonb("changes"), // Before/after values for updates
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_audit_user").on(table.userId),
  index("idx_audit_module").on(table.moduleId),
  index("idx_audit_created").on(table.createdAt),
  index("idx_audit_module_action").on(table.moduleId, table.action),
  index("idx_audit_module_created").on(table.moduleId, table.createdAt),
]);

// Password Reset Tokens - for platform user password recovery
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => platformUsers.id, { onDelete: 'cascade' }),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_reset_token_user").on(table.userId),
  index("idx_reset_token_token").on(table.token),
  index("idx_reset_token_expires").on(table.expiresAt),
]);

// ============================================================================
// ROLE-BASED ACCESS CONTROL (RBAC) TABLES
// User groups with granular permissions per module and feature
// ============================================================================

// Permission level enum - defines access levels for features
export const permissionLevelEnum = pgEnum("permission_level", ["none", "view", "edit", "admin"]);

// User Groups - role-based groupings (e.g., "Director", "Staff", "Maintenance")
export const userGroups = pgTable("user_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  color: varchar("color"), // For UI display
  isSystemGroup: boolean("is_system_group").notNull().default(false), // Prevents deletion of built-in groups
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Group Memberships - links users to groups (many-to-many)
export const groupMemberships = pgTable("group_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => platformUsers.id, { onDelete: 'cascade' }),
  groupId: varchar("group_id").notNull().references(() => userGroups.id, { onDelete: 'cascade' }),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  assignedBy: varchar("assigned_by").references(() => platformUsers.id),
}, (table) => [
  unique().on(table.userId, table.groupId),
  index("idx_group_membership_user").on(table.userId),
  index("idx_group_membership_group").on(table.groupId),
]);

// Module Features - catalog of features within each module
export const moduleFeatures = pgTable("module_features", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  moduleId: varchar("module_id").notNull().references(() => platformModules.id, { onDelete: 'cascade' }),
  featureKey: varchar("feature_key").notNull(), // e.g., 'tasks', 'archive', 'reports'
  featureName: varchar("feature_name").notNull(), // e.g., 'Manage Tasks', 'Archive Tasks'
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique().on(table.moduleId, table.featureKey),
  index("idx_module_feature_module").on(table.moduleId),
]);

// Group Module Access - controls whether a group can access a module at all
export const groupModuleAccess = pgTable("group_module_access", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => userGroups.id, { onDelete: 'cascade' }),
  moduleId: varchar("module_id").notNull().references(() => platformModules.id, { onDelete: 'cascade' }),
  hasAccess: boolean("has_access").notNull().default(false), // ON/OFF toggle for module
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  unique().on(table.groupId, table.moduleId),
  index("idx_group_module_group").on(table.groupId),
  index("idx_group_module_module").on(table.moduleId),
]);

// Group Feature Permissions - granular permissions per feature within a module
export const groupFeaturePermissions = pgTable("group_feature_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => userGroups.id, { onDelete: 'cascade' }),
  featureId: varchar("feature_id").notNull().references(() => moduleFeatures.id, { onDelete: 'cascade' }),
  permissionLevel: permissionLevelEnum("permission_level").notNull().default("none"), // none, view, edit, admin
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  unique().on(table.groupId, table.featureId),
  index("idx_group_feature_group").on(table.groupId),
  index("idx_group_feature_feature").on(table.featureId),
]);

// User Permission Overrides - allows individual user overrides (optional, for exceptions)
export const userPermissionOverrides = pgTable("user_permission_overrides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => platformUsers.id, { onDelete: 'cascade' }),
  featureId: varchar("feature_id").notNull().references(() => moduleFeatures.id, { onDelete: 'cascade' }),
  permissionLevel: permissionLevelEnum("permission_level").notNull(),
  reason: text("reason"), // Why this override exists
  grantedBy: varchar("granted_by").references(() => platformUsers.id),
  expiresAt: timestamp("expires_at"), // Optional expiration for temporary access
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique().on(table.userId, table.featureId),
  index("idx_user_override_user").on(table.userId),
]);

// ============================================================================
// LMS (LEARNING MANAGEMENT SYSTEM) TABLES
// Mobile-first, microlearning-focused training platform
// Inspired by hospitality LMS platforms like Opus.so
// ============================================================================

// Course status enum
export const lmsCourseStatusEnum = pgEnum("lms_course_status", ["draft", "published", "archived"]);

// Lesson content type enum
export const lmsLessonTypeEnum = pgEnum("lms_lesson_type", ["video", "text", "quiz", "interactive", "document"]);

// Enrollment status enum
export const lmsEnrollmentStatusEnum = pgEnum("lms_enrollment_status", ["enrolled", "in_progress", "completed", "expired"]);

// LMS Categories - grouping for courses (e.g., "Onboarding", "Wine Knowledge", "Safety")
export const lmsCategories = pgTable("lms_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  icon: varchar("icon"), // Lucide icon name
  color: varchar("color"), // Tailwind color class
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// LMS Courses - training courses/paths
export const lmsCourses = pgTable("lms_courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  categoryId: varchar("category_id").references(() => lmsCategories.id),
  status: lmsCourseStatusEnum("status").notNull().default("draft"),
  difficulty: varchar("difficulty").notNull().default("beginner"), // beginner, intermediate, advanced
  estimatedMinutes: integer("estimated_minutes").notNull().default(15),
  requiredForRoles: text("required_for_roles").array(), // Roles that must complete this course
  prerequisiteCourseIds: text("prerequisite_course_ids").array(), // Courses that must be completed first
  passingScore: integer("passing_score").notNull().default(80), // Minimum quiz score to pass
  certificateEnabled: boolean("certificate_enabled").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdBy: varchar("created_by").references(() => platformUsers.id),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_lms_courses_category").on(table.categoryId),
  index("idx_lms_courses_status").on(table.status),
]);

// LMS Lessons - individual learning units within courses
export const lmsLessons = pgTable("lms_lessons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => lmsCourses.id, { onDelete: 'cascade' }),
  title: varchar("title").notNull(),
  description: text("description"),
  lessonType: lmsLessonTypeEnum("lesson_type").notNull().default("text"),
  content: text("content"), // Markdown/HTML for text lessons
  videoUrl: text("video_url"), // For video lessons
  documentUrl: text("document_url"), // For document lessons
  estimatedMinutes: integer("estimated_minutes").notNull().default(5),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_lms_lessons_course").on(table.courseId),
]);

// LMS Quiz Questions - questions attached to lessons or courses
export const lmsQuizQuestions = pgTable("lms_quiz_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => lmsCourses.id, { onDelete: 'cascade' }),
  lessonId: varchar("lesson_id").references(() => lmsLessons.id, { onDelete: 'cascade' }), // Optional: attach to specific lesson
  question: text("question").notNull(),
  questionType: varchar("question_type").notNull().default("multiple_choice"), // multiple_choice, true_false, multi_select
  options: jsonb("options").notNull(), // Array of {id, text, isCorrect}
  explanation: text("explanation"), // Explanation shown after answering
  points: integer("points").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_lms_quiz_course").on(table.courseId),
  index("idx_lms_quiz_lesson").on(table.lessonId),
]);

// LMS Enrollments - user enrollment in courses
export const lmsEnrollments = pgTable("lms_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => platformUsers.id, { onDelete: 'cascade' }),
  courseId: varchar("course_id").notNull().references(() => lmsCourses.id, { onDelete: 'cascade' }),
  status: lmsEnrollmentStatusEnum("status").notNull().default("enrolled"),
  enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  dueDate: timestamp("due_date"), // Optional deadline
  assignedBy: varchar("assigned_by").references(() => platformUsers.id), // Manager who assigned
  finalScore: integer("final_score"), // Quiz score if applicable
  certificateId: varchar("certificate_id"), // Reference to generated certificate
}, (table) => [
  unique().on(table.userId, table.courseId),
  index("idx_lms_enrollments_user").on(table.userId),
  index("idx_lms_enrollments_course").on(table.courseId),
  index("idx_lms_enrollments_status").on(table.status),
]);

// LMS Lesson Progress - tracking user progress through lessons
export const lmsLessonProgress = pgTable("lms_lesson_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => platformUsers.id, { onDelete: 'cascade' }),
  lessonId: varchar("lesson_id").notNull().references(() => lmsLessons.id, { onDelete: 'cascade' }),
  enrollmentId: varchar("enrollment_id").notNull().references(() => lmsEnrollments.id, { onDelete: 'cascade' }),
  completed: boolean("completed").notNull().default(false),
  timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
  videoProgress: integer("video_progress"), // Percentage for video lessons
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  unique().on(table.userId, table.lessonId),
  index("idx_lms_progress_user").on(table.userId),
  index("idx_lms_progress_lesson").on(table.lessonId),
  index("idx_lms_progress_enrollment").on(table.enrollmentId),
]);

// LMS Quiz Attempts - tracking quiz attempts and answers
export const lmsQuizAttempts = pgTable("lms_quiz_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => platformUsers.id, { onDelete: 'cascade' }),
  courseId: varchar("course_id").notNull().references(() => lmsCourses.id, { onDelete: 'cascade' }),
  enrollmentId: varchar("enrollment_id").notNull().references(() => lmsEnrollments.id, { onDelete: 'cascade' }),
  attemptNumber: integer("attempt_number").notNull().default(1),
  score: integer("score").notNull().default(0),
  maxScore: integer("max_score").notNull().default(0),
  passed: boolean("passed").notNull().default(false),
  answers: jsonb("answers"), // Array of {questionId, selectedOptionIds, correct, pointsEarned}
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_lms_attempts_user").on(table.userId),
  index("idx_lms_attempts_course").on(table.courseId),
  index("idx_lms_attempts_enrollment").on(table.enrollmentId),
]);

// LMS Certificates - generated certificates for completed courses
export const lmsCertificates = pgTable("lms_certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => platformUsers.id, { onDelete: 'cascade' }),
  courseId: varchar("course_id").notNull().references(() => lmsCourses.id, { onDelete: 'cascade' }),
  enrollmentId: varchar("enrollment_id").notNull().references(() => lmsEnrollments.id, { onDelete: 'cascade' }),
  certificateNumber: varchar("certificate_number").notNull().unique(),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"), // Optional expiration for certifications
  pdfUrl: text("pdf_url"), // Generated PDF URL
}, (table) => [
  index("idx_lms_certs_user").on(table.userId),
  index("idx_lms_certs_course").on(table.courseId),
]);

// ============================================
// LMS ENHANCED - Lesson Pages & Content Blocks
// ============================================

// LMS Lesson Pages - sub-sections within a lesson (e.g., 1.1, 1.2, 1.3)
export const lmsLessonPages = pgTable("lms_lesson_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id").notNull().references(() => lmsLessons.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  pageNumber: integer("page_number").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
  estimatedMinutes: integer("estimated_minutes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_lms_pages_lesson").on(table.lessonId),
]);

// LMS Content Blocks - rich content within lessons or pages
export const lmsContentBlocks = pgTable("lms_content_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id").notNull().references(() => lmsLessons.id, { onDelete: "cascade" }),
  pageId: varchar("page_id").references(() => lmsLessonPages.id, { onDelete: "cascade" }),
  blockType: text("block_type").notNull(), // text, video, image, file, embed, divider
  content: text("content"), // For text blocks - HTML/rich text
  videoUrl: text("video_url"),
  imageUrl: text("image_url"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  embedCode: text("embed_code"),
  layout: text("layout").default("full_width"), // full_width, text_left_image_right, etc.
  imageSize: text("image_size").default("medium"), // small, medium, large, full
  caption: text("caption"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_lms_blocks_lesson").on(table.lessonId),
  index("idx_lms_blocks_page").on(table.pageId),
]);

// ============================================
// LMS ENHANCED - Question Banks & Quizzes
// ============================================

// LMS Question Banks - reusable question pools
export const lmsQuestionBanks = pgTable("lms_question_banks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").references(() => platformUsers.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// LMS Questions - individual quiz questions (can belong to question bank)
export const lmsQuestions = pgTable("lms_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  questionBankId: varchar("question_bank_id").references(() => lmsQuestionBanks.id, { onDelete: "set null" }),
  questionType: text("question_type").notNull(), // multiple_choice, true_false, multiple_select, short_answer, matching
  questionText: text("question_text").notNull(),
  questionExplanation: text("question_explanation"),
  answerOptions: jsonb("answer_options"), // [{id, text, isCorrect}] for multiple choice
  correctAnswers: text("correct_answers").array(), // For short_answer questions
  points: integer("points").notNull().default(1),
  difficulty: text("difficulty"), // easy, medium, hard
  tags: text("tags").array(),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").references(() => platformUsers.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_lms_questions_bank").on(table.questionBankId),
]);

// LMS Quizzes - assessments attached to courses or lessons
export const lmsQuizzes = pgTable("lms_quizzes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => lmsCourses.id, { onDelete: "cascade" }),
  lessonId: varchar("lesson_id").references(() => lmsLessons.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  instructions: text("instructions"),
  passingScore: integer("passing_score").notNull().default(70),
  timeLimitMinutes: integer("time_limit_minutes"),
  maxAttempts: integer("max_attempts"),
  shuffleQuestions: boolean("shuffle_questions").notNull().default(false),
  shuffleAnswers: boolean("shuffle_answers").notNull().default(false),
  questionsToShow: integer("questions_to_show"),
  showCorrectAnswers: boolean("show_correct_answers").notNull().default(true),
  showExplanations: boolean("show_explanations").notNull().default(true),
  showScoreImmediately: boolean("show_score_immediately").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  isFinalExam: boolean("is_final_exam").notNull().default(false),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_lms_quizzes_course").on(table.courseId),
  index("idx_lms_quizzes_lesson").on(table.lessonId),
]);

// LMS Quiz Question Links - links questions to quizzes
export const lmsQuizQuestionLinks = pgTable("lms_quiz_question_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quizId: varchar("quiz_id").notNull().references(() => lmsQuizzes.id, { onDelete: "cascade" }),
  questionId: varchar("question_id").notNull().references(() => lmsQuestions.id, { onDelete: "cascade" }),
  pointsOverride: integer("points_override"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_lms_quiz_links_quiz").on(table.quizId),
]);

// LMS Question Responses - individual answers in an attempt
export const lmsQuestionResponses = pgTable("lms_question_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  attemptId: varchar("attempt_id").notNull().references(() => lmsQuizAttempts.id, { onDelete: "cascade" }),
  questionId: varchar("question_id").notNull().references(() => lmsQuestions.id),
  responseValue: text("response_value"),
  responseJson: jsonb("response_json"),
  isCorrect: boolean("is_correct"),
  pointsEarned: integer("points_earned"),
  pointsPossible: integer("points_possible"),
  needsManualGrading: boolean("needs_manual_grading").notNull().default(false),
  manualScore: integer("manual_score"),
  graderFeedback: text("grader_feedback"),
  answeredAt: timestamp("answered_at").notNull().defaultNow(),
}, (table) => [
  index("idx_lms_responses_attempt").on(table.attemptId),
]);

// ============================================
// LMS ENHANCED - Badges & Gamification
// ============================================

// LMS Badges - achievement definitions
export const lmsBadges = pgTable("lms_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  iconName: text("icon_name"), // Lucide icon name
  iconColor: text("icon_color"),
  criteriaType: text("criteria_type").notNull(), // course_completion, courses_count, quiz_score, streak, custom
  criteriaValue: jsonb("criteria_value"),
  tier: text("tier").notNull().default("bronze"), // bronze, silver, gold, platinum
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// LMS User Badges - earned badges
export const lmsUserBadges = pgTable("lms_user_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => platformUsers.id, { onDelete: "cascade" }),
  badgeId: varchar("badge_id").notNull().references(() => lmsBadges.id, { onDelete: "cascade" }),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
  earnedReason: text("earned_reason"),
  courseId: varchar("course_id").references(() => lmsCourses.id),
  enrollmentId: varchar("enrollment_id").references(() => lmsEnrollments.id),
}, (table) => [
  index("idx_lms_user_badges_user").on(table.userId),
]);

// LMS Course Ratings - user feedback on courses
export const lmsCourseRatings = pgTable("lms_course_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => lmsCourses.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => platformUsers.id, { onDelete: "cascade" }),
  enrollmentId: varchar("enrollment_id").references(() => lmsEnrollments.id),
  rating: integer("rating").notNull(), // 1-5 stars
  review: text("review"),
  wouldRecommend: boolean("would_recommend"),
  difficultyRating: integer("difficulty_rating"), // 1-5
  isApproved: boolean("is_approved").notNull().default(true),
  moderatedBy: varchar("moderated_by").references(() => platformUsers.id),
  moderatedAt: timestamp("moderated_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_lms_ratings_course").on(table.courseId),
  index("idx_lms_ratings_user").on(table.userId),
]);

// ============================================
// LMS ENHANCED - External Training Access
// ============================================

// LMS External Training Tokens - For email-based training access without login
export const lmsExternalTokens = pgTable("lms_external_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => platformUsers.id, { onDelete: "cascade" }),
  courseId: varchar("course_id").notNull().references(() => lmsCourses.id, { onDelete: "cascade" }),
  quizId: varchar("quiz_id").references(() => lmsQuizzes.id, { onDelete: "set null" }),
  token: varchar("token").notNull().unique(),
  recipientEmail: text("recipient_email").notNull(),
  recipientName: text("recipient_name").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  lastAccessedAt: timestamp("last_accessed_at"),
  attemptsRemaining: integer("attempts_remaining").notNull().default(3),
  status: text("status").notNull().default("pending"), // pending, accessed, completed, expired, revoked
  isActive: boolean("is_active").notNull().default(true),
  sentAt: timestamp("sent_at"),
  sentBy: varchar("sent_by").references(() => platformUsers.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_lms_ext_tokens_user").on(table.userId),
  index("idx_lms_ext_tokens_course").on(table.courseId),
  index("idx_lms_ext_tokens_token").on(table.token),
]);

// LMS External Lesson Progress - tracks lesson progress for external training
export const lmsExternalProgress = pgTable("lms_external_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  externalTokenId: varchar("external_token_id").notNull().references(() => lmsExternalTokens.id, { onDelete: "cascade" }),
  lessonId: varchar("lesson_id").notNull().references(() => lmsLessons.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("not_started"), // not_started, in_progress, quiz_required, completed
  contentViewed: boolean("content_viewed").default(false),
  quizPassed: boolean("quiz_passed").default(false),
  quizScore: integer("quiz_score"),
  quizAttempts: integer("quiz_attempts").default(0),
  lastQuizAttemptAt: timestamp("last_quiz_attempt_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_lms_ext_progress_token").on(table.externalTokenId),
  index("idx_lms_ext_progress_lesson").on(table.lessonId),
]);

// ============================================
// COMPLIANCE MODULE TABLES
// ============================================

// Compliance Tasks - Main table for tracking compliance obligations
// Step attachment type for compliance task steps
export interface ComplianceStepAttachment {
  id: string;
  fileName: string;
  storageKey: string;
  contentType: string;
  size: number;
  uploadedAt: string;
  publicUrl?: string;
}

// Step type for compliance tasks
export interface ComplianceStep {
  id: string;
  order: number;
  instruction: string;
  attachments: ComplianceStepAttachment[];
}

export const complianceTasks = pgTable("compliance_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskName: text("task_name").notNull(),
  description: text("description"),
  steps: jsonb("steps").$type<ComplianceStep[]>(), // Step-by-step directions with attachments
  category: complianceCategoryEnum("category").notNull(),
  subcategory: text("subcategory"),
  jurisdiction: text("jurisdiction"), // e.g., "Federal", "Massachusetts", "Local"
  regulatoryBody: text("regulatory_body"), // e.g., "IRS", "TTB", "State ABC"
  
  // Recurrence settings
  recurrence: complianceRecurrenceEnum("recurrence").notNull().default("one_time"),
  customRecurrenceDays: integer("custom_recurrence_days"), // For custom recurrence patterns
  
  // Deadline management
  dueDate: timestamp("due_date"),
  reminderDays: integer("reminder_days").array(), // e.g., [30, 14, 7, 1] days before
  lastReminderSent: timestamp("last_reminder_sent"),
  
  // Assignment
  assignedToName: text("assigned_to_name"),
  assignedToEmail: text("assigned_to_email"),
  assignedById: varchar("assigned_by_id").references(() => users.id),
  
  // Status and priority
  status: complianceStatusEnum("status").notNull().default("pending"),
  priority: compliancePriorityEnum("priority").notNull().default("medium"),
  
  // Portal/credential info (encrypted in practice)
  portalUrl: text("portal_url"),
  portalUsername: text("portal_username"),
  portalPassword: text("portal_password"),
  portalNotes: text("portal_notes"), // General notes about accessing the portal
  
  // Financial tracking
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 10, scale: 2 }),
  penaltyAmount: decimal("penalty_amount", { precision: 10, scale: 2 }),
  
  // Completion tracking
  completedAt: timestamp("completed_at"),
  completedById: varchar("completed_by_id").references(() => users.id),
  completionNotes: text("completion_notes"),
  confirmationNumber: text("confirmation_number"),
  
  // Tags for flexible categorization
  tags: text("tags").array(),
  
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdById: varchar("created_by_id").references(() => users.id),
  isActive: boolean("is_active").notNull().default(true),
  archivedAt: timestamp("archived_at"), // When task was archived (stops recurrence)
}, (table) => [
  index("idx_compliance_category").on(table.category),
  index("idx_compliance_status").on(table.status),
  index("idx_compliance_due_date").on(table.dueDate),
  index("idx_compliance_assigned").on(table.assignedToEmail),
]);

// Compliance Task History - Audit log for changes
export const complianceTaskHistory = pgTable("compliance_task_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => complianceTasks.id, { onDelete: 'cascade' }),
  changedById: varchar("changed_by_id").references(() => users.id),
  changedByName: text("changed_by_name"),
  action: text("action").notNull(), // e.g., "created", "updated", "completed", "status_changed"
  fieldChanged: text("field_changed"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_compliance_history_task").on(table.taskId),
  index("idx_compliance_history_date").on(table.createdAt),
]);

// Compliance Reminders - Log of sent reminders
export const complianceReminders = pgTable("compliance_reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => complianceTasks.id, { onDelete: 'cascade' }),
  sentToEmail: text("sent_to_email").notNull(),
  sentToName: text("sent_to_name"),
  method: text("method").notNull().default("email"), // email, calendar_invite, push
  subject: text("subject"),
  status: text("status").notNull().default("sent"), // sent, failed, opened
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  daysBeforeDue: integer("days_before_due"),
}, (table) => [
  index("idx_compliance_reminders_task").on(table.taskId),
  index("idx_compliance_reminders_date").on(table.sentAt),
]);

// Compliance Attachments - Documents attached to tasks
export const complianceAttachments = pgTable("compliance_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => complianceTasks.id, { onDelete: 'cascade' }),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type"),
  fileSize: integer("file_size"),
  uploadedById: varchar("uploaded_by_id").references(() => users.id),
  uploadedByName: text("uploaded_by_name"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_compliance_attachments_task").on(table.taskId),
]);

// Compliance Action Tokens - Secure one-time tokens for email-based task completion
export const complianceActionTokens = pgTable("compliance_action_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => complianceTasks.id, { onDelete: 'cascade' }),
  token: varchar("token", { length: 64 }).notNull().unique(),
  action: text("action").notNull().default("complete"), // complete, acknowledge, etc.
  recipientEmail: text("recipient_email").notNull(),
  recipientName: text("recipient_name"),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  usedByName: text("used_by_name"),
  usedByEmail: text("used_by_email"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_compliance_action_tokens_task").on(table.taskId),
  index("idx_compliance_action_tokens_token").on(table.token),
]);

// ============================================
// DEPARTMENT CALENDAR MODULE TABLES
// ============================================

// Departments - list of company departments
export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color"), // Color for calendar display
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_departments_active").on(table.isActive),
]);

// Department Tasks - tasks assigned to departments with recurrence
export const departmentTasks = pgTable("department_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  departmentId: varchar("department_id").notNull().references(() => departments.id, { onDelete: 'cascade' }),
  taskName: text("task_name").notNull(),
  description: text("description"),
  
  // Recurrence settings
  recurrence: departmentRecurrenceEnum("recurrence").notNull().default("one_time"),
  
  // Deadline management
  dueDate: timestamp("due_date"),
  reminderDays: integer("reminder_days").array(), // e.g., [14, 7, 1] days before
  lastReminderSent: timestamp("last_reminder_sent"),
  
  // Assignment - supports multiple assignees
  assignedToName: text("assigned_to_name"), // Legacy single assignee
  assignedToEmail: text("assigned_to_email"), // Legacy single assignee
  assignees: jsonb("assignees").$type<Array<{name: string; email: string}>>(), // Multiple assignees
  assignedById: varchar("assigned_by_id").references(() => users.id),
  
  // Manager for escalations and delinquent notifications - supports multiple managers
  managerName: text("manager_name"), // Legacy single manager
  managerEmail: text("manager_email"), // Legacy single manager
  managers: jsonb("managers").$type<Array<{name: string; email: string}>>(), // Multiple managers
  
  // Status and priority
  status: departmentTaskStatusEnum("status").notNull().default("pending"),
  priority: departmentTaskPriorityEnum("priority").notNull().default("medium"),
  
  // Completion tracking
  completedAt: timestamp("completed_at"),
  completedById: varchar("completed_by_id").references(() => users.id),
  completionNotes: text("completion_notes"),
  
  // Tags for flexible categorization
  tags: text("tags").array(),
  
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdById: varchar("created_by_id").references(() => users.id),
  isActive: boolean("is_active").notNull().default(true),
  archivedAt: timestamp("archived_at"),
}, (table) => [
  index("idx_dept_tasks_department").on(table.departmentId),
  index("idx_dept_tasks_status").on(table.status),
  index("idx_dept_tasks_due_date").on(table.dueDate),
  index("idx_dept_tasks_assigned").on(table.assignedToEmail),
]);

// Department Task Reminders - Log of sent reminders
export const departmentTaskReminders = pgTable("department_task_reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => departmentTasks.id, { onDelete: 'cascade' }),
  sentToEmail: text("sent_to_email").notNull(),
  sentToName: text("sent_to_name"),
  subject: text("subject"),
  status: text("status").notNull().default("sent"), // sent, failed
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  daysBeforeDue: integer("days_before_due"),
}, (table) => [
  index("idx_dept_task_reminders_task").on(table.taskId),
  index("idx_dept_task_reminders_date").on(table.sentAt),
]);

// Department Task History - Audit log
export const departmentTaskHistory = pgTable("department_task_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => departmentTasks.id, { onDelete: 'cascade' }),
  changedById: varchar("changed_by_id").references(() => users.id),
  changedByName: text("changed_by_name"),
  action: text("action").notNull(),
  fieldChanged: text("field_changed"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_dept_task_history_task").on(table.taskId),
  index("idx_dept_task_history_date").on(table.createdAt),
]);

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWhitelistedEmailSchema = createInsertSchema(whitelistedEmails).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const updateProductSchema = insertProductSchema.partial(); // All fields optional for updates
export const insertGuestSessionSchema = createInsertSchema(guestSessions).omit({ id: true, createdAt: true, lastActiveAt: true });
export const insertFavoriteSchema = createInsertSchema(favorites).omit({ id: true, createdAt: true });
export const insertViewHistorySchema = createInsertSchema(viewHistory).omit({ id: true, lastViewedAt: true });
export const insertCartItemSchema = createInsertSchema(cartItems).omit({ id: true, createdAt: true });
export const insertTriviaQuestionSchema = createInsertSchema(triviaQuestions).omit({ id: true, createdAt: true }).extend({
  explanation: z.preprocess(
    (val) => typeof val === 'string' ? val.trim() : val,
    z.string().min(1, "Explanation is required").max(200, "Explanation must be 200 characters or less")
  )
});
export const insertTriviaAchievementSchema = createInsertSchema(triviaAchievements).omit({ id: true, createdAt: true });
export const insertTriviaAttemptSchema = createInsertSchema(triviaAttempts).omit({ id: true, startedAt: true, correctAnswers: true }).extend({
  correctAnswers: z.number().int().min(0).default(0)
});
export const insertTriviaScoreSchema = createInsertSchema(triviaScores).omit({ id: true, answeredAt: true });
export const insertAchievementRedemptionSchema = createInsertSchema(achievementRedemptions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCartDiscountSchema = createInsertSchema(cartDiscounts).omit({ id: true, appliedAt: true });
export const insertAppSettingSchema = createInsertSchema(appSettings).omit({ id: true, updatedAt: true });
export const insertSurveySchema = createInsertSchema(surveys).omit({ id: true, createdAt: true });
export const insertProductNoteSchema = createInsertSchema(productNotes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFilterOptionSchema = createInsertSchema(filterOptions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSlideshowImageSchema = createInsertSchema(slideshowImages).omit({ id: true, createdAt: true, updatedAt: true });
export const insertB2bSlideshowSlideSchema = createInsertSchema(b2bSlideshowSlides).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMediaLibrarySchema = createInsertSchema(mediaLibrary).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProductMediaSchema = createInsertSchema(productMedia).omit({ id: true, createdAt: true, updatedAt: true });
export const insertVideoSchema = createInsertSchema(videos).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCommercialSchema = createInsertSchema(commercials).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCharacteristicSchema = createInsertSchema(characteristics).omit({ id: true, createdAt: true, updatedAt: true, usageCount: true });
export const insertProductCharacteristicSchema = createInsertSchema(productCharacteristics).omit({ id: true, createdAt: true });

// B2B Insert schemas
export const insertTierPricingSchema = createInsertSchema(tierPricing).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSalesRepSchema = createInsertSchema(salesReps).omit({ id: true, createdAt: true, updatedAt: true });
export const insertB2bAdminSchema = createInsertSchema(b2bAdmins).omit({ id: true, createdAt: true, updatedAt: true });
export const insertB2bCustomerSchema = createInsertSchema(b2bCustomers).omit({ id: true, createdAt: true, updatedAt: true, signupDate: true, lastOrderDate: true, totalPurchaseValue: true, passwordHash: true, approvedAt: true, approvedByAdminId: true });
export const insertB2bCustomerRequestSchema = createInsertSchema(b2bCustomerRequests).omit({ id: true, createdAt: true, updatedAt: true, reviewedByAdminId: true, reviewedAt: true, rejectionReason: true, createdCustomerId: true });
export const insertB2bCustomerLocationSchema = createInsertSchema(b2bCustomerLocations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertB2bCustomerManualProductSchema = createInsertSchema(b2bCustomerManualProducts).omit({ id: true, createdAt: true });
export const insertB2bTierAgreementSchema = createInsertSchema(b2bTierAgreements).omit({ id: true, createdAt: true, updatedAt: true, sentAt: true });
export const insertB2bOrderSchema = createInsertSchema(b2bOrders).omit({ id: true, createdAt: true, updatedAt: true, orderDate: true });
export const insertB2bOrderItemSchema = createInsertSchema(b2bOrderItems).omit({ id: true, createdAt: true, orderId: true });
export const insertB2bCommissionSchema = createInsertSchema(b2bCommissions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertB2bSettingSchema = createInsertSchema(b2bSettings).omit({ id: true, updatedAt: true });
export const insertB2bRolePermissionSchema = createInsertSchema(b2bRolePermissions).omit({ id: true, updatedAt: true });
export const insertB2bPasswordResetTokenSchema = createInsertSchema(b2bPasswordResetTokens).omit({ id: true, createdAt: true, used: true });
export const insertB2bEmailTemplateSchema = createInsertSchema(b2bEmailTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertB2bEmailAutomationLogSchema = createInsertSchema(b2bEmailAutomationLogs).omit({ id: true, sentAt: true });
export const insertImprovementNoteSchema = createInsertSchema(improvementNotes).omit({ id: true, createdAt: true, updatedAt: true, completedAt: true });

// Platform Foundation Insert schemas
export const insertPlatformModuleSchema = createInsertSchema(platformModules).omit({ id: true, createdAt: true, updatedAt: true });
export const insertStaffDashboardModuleSchema = createInsertSchema(staffDashboardModules).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPlatformUserSchema = createInsertSchema(platformUsers).omit({ id: true, createdAt: true, updatedAt: true, lastLoginAt: true });
export const insertPlatformUserModuleAccessSchema = createInsertSchema(platformUserModuleAccess).omit({ id: true, grantedAt: true });
export const insertSharedLocationSchema = createInsertSchema(sharedLocations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSharedEquipmentSchema = createInsertSchema(sharedEquipment).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSharedDocumentSchema = createInsertSchema(sharedDocuments).omit({ id: true, createdAt: true, updatedAt: true, approvedAt: true });
export const insertPlatformAuditLogSchema = createInsertSchema(platformAuditLog).omit({ id: true, createdAt: true });
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({ id: true, createdAt: true, usedAt: true });

// RBAC Insert schemas
export const insertUserGroupSchema = createInsertSchema(userGroups).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGroupMembershipSchema = createInsertSchema(groupMemberships).omit({ id: true, assignedAt: true });
export const insertModuleFeatureSchema = createInsertSchema(moduleFeatures).omit({ id: true, createdAt: true });
export const insertGroupModuleAccessSchema = createInsertSchema(groupModuleAccess).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGroupFeaturePermissionSchema = createInsertSchema(groupFeaturePermissions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserPermissionOverrideSchema = createInsertSchema(userPermissionOverrides).omit({ id: true, createdAt: true });

// LMS Insert schemas
export const insertLmsCategorySchema = createInsertSchema(lmsCategories).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLmsCourseSchema = createInsertSchema(lmsCourses).omit({ id: true, createdAt: true, updatedAt: true, publishedAt: true });
export const insertLmsLessonSchema = createInsertSchema(lmsLessons).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLmsQuizQuestionSchema = createInsertSchema(lmsQuizQuestions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLmsEnrollmentSchema = createInsertSchema(lmsEnrollments).omit({ id: true, enrolledAt: true, startedAt: true, completedAt: true });
export const insertLmsLessonProgressSchema = createInsertSchema(lmsLessonProgress).omit({ id: true, startedAt: true, completedAt: true });
export const insertLmsQuizAttemptSchema = createInsertSchema(lmsQuizAttempts).omit({ id: true, startedAt: true, completedAt: true });
export const insertLmsCertificateSchema = createInsertSchema(lmsCertificates).omit({ id: true, issuedAt: true });

// LMS Enhanced Insert schemas
export const insertLmsLessonPageSchema = createInsertSchema(lmsLessonPages).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLmsContentBlockSchema = createInsertSchema(lmsContentBlocks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLmsQuestionBankSchema = createInsertSchema(lmsQuestionBanks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLmsQuestionSchema = createInsertSchema(lmsQuestions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLmsQuizSchema = createInsertSchema(lmsQuizzes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLmsQuizQuestionLinkSchema = createInsertSchema(lmsQuizQuestionLinks).omit({ id: true, createdAt: true });
export const insertLmsQuestionResponseSchema = createInsertSchema(lmsQuestionResponses).omit({ id: true, answeredAt: true });
export const insertLmsBadgeSchema = createInsertSchema(lmsBadges).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLmsUserBadgeSchema = createInsertSchema(lmsUserBadges).omit({ id: true, earnedAt: true });
export const insertLmsCourseRatingSchema = createInsertSchema(lmsCourseRatings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLmsExternalTokenSchema = createInsertSchema(lmsExternalTokens).omit({ id: true, createdAt: true });
export const insertLmsExternalProgressSchema = createInsertSchema(lmsExternalProgress).omit({ id: true, createdAt: true, updatedAt: true });

// Compliance Insert schemas
export const insertComplianceTaskSchema = createInsertSchema(complianceTasks).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  completedAt: true,
  lastReminderSent: true,
  archivedAt: true
});
export const insertComplianceTaskHistorySchema = createInsertSchema(complianceTaskHistory).omit({ id: true, createdAt: true });
export const insertComplianceReminderSchema = createInsertSchema(complianceReminders).omit({ id: true, sentAt: true });
export const insertComplianceAttachmentSchema = createInsertSchema(complianceAttachments).omit({ id: true, createdAt: true });

// Department Calendar Insert schemas
export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDepartmentTaskSchema = createInsertSchema(departmentTasks).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  completedAt: true,
  lastReminderSent: true,
  archivedAt: true
});
export const insertDepartmentTaskReminderSchema = createInsertSchema(departmentTaskReminders).omit({ id: true, sentAt: true });
export const insertDepartmentTaskHistorySchema = createInsertSchema(departmentTaskHistory).omit({ id: true, createdAt: true });

// Types
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export type InsertGuestSession = z.infer<typeof insertGuestSessionSchema>;
export type GuestSession = typeof guestSessions.$inferSelect;

export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favorites.$inferSelect;

export type InsertViewHistory = z.infer<typeof insertViewHistorySchema>;
export type ViewHistory = typeof viewHistory.$inferSelect;

export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItems.$inferSelect;

export type InsertTriviaQuestion = z.infer<typeof insertTriviaQuestionSchema>;
export type TriviaQuestion = typeof triviaQuestions.$inferSelect;

export type InsertTriviaAchievement = z.infer<typeof insertTriviaAchievementSchema>;
export type TriviaAchievement = typeof triviaAchievements.$inferSelect;

export type InsertTriviaAttempt = z.infer<typeof insertTriviaAttemptSchema>;
export type TriviaAttempt = typeof triviaAttempts.$inferSelect;

export type InsertTriviaScore = z.infer<typeof insertTriviaScoreSchema>;
export type TriviaScore = typeof triviaScores.$inferSelect;

export type InsertAchievementRedemption = z.infer<typeof insertAchievementRedemptionSchema>;
export type AchievementRedemption = typeof achievementRedemptions.$inferSelect;

export type InsertCartDiscount = z.infer<typeof insertCartDiscountSchema>;
export type CartDiscount = typeof cartDiscounts.$inferSelect;

export type InsertAppSetting = z.infer<typeof insertAppSettingSchema>;
export type AppSetting = typeof appSettings.$inferSelect;

export type InsertSurvey = z.infer<typeof insertSurveySchema>;
export type Survey = typeof surveys.$inferSelect;

export type InsertProductNote = z.infer<typeof insertProductNoteSchema>;
export type ProductNote = typeof productNotes.$inferSelect;

export type InsertFilterOption = z.infer<typeof insertFilterOptionSchema>;
export type FilterOption = typeof filterOptions.$inferSelect;

export type InsertSlideshowImage = z.infer<typeof insertSlideshowImageSchema>;
export type SlideshowImage = typeof slideshowImages.$inferSelect;

export type InsertB2bSlideshowSlide = z.infer<typeof insertB2bSlideshowSlideSchema>;
export type B2bSlideshowSlide = typeof b2bSlideshowSlides.$inferSelect;

export type InsertMediaLibrary = z.infer<typeof insertMediaLibrarySchema>;
export type MediaLibrary = typeof mediaLibrary.$inferSelect;

export type InsertProductMedia = z.infer<typeof insertProductMediaSchema>;
export type ProductMedia = typeof productMedia.$inferSelect;

export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;

export type InsertCommercial = z.infer<typeof insertCommercialSchema>;
export type Commercial = typeof commercials.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertWhitelistedEmail = z.infer<typeof insertWhitelistedEmailSchema>;
export type WhitelistedEmail = typeof whitelistedEmails.$inferSelect;

export type InsertCharacteristic = z.infer<typeof insertCharacteristicSchema>;
export type Characteristic = typeof characteristics.$inferSelect;

export type InsertProductCharacteristic = z.infer<typeof insertProductCharacteristicSchema>;
export type ProductCharacteristic = typeof productCharacteristics.$inferSelect;

export type ProductWithCharacteristics = Product & {
  characteristics: Array<{
    id: string;
    name: string;
    productTypes: string[];
  }>;
};

// B2B Types
export type InsertTierPricing = z.infer<typeof insertTierPricingSchema>;
export type TierPricing = typeof tierPricing.$inferSelect;

export type InsertSalesRep = z.infer<typeof insertSalesRepSchema>;
export type SalesRep = typeof salesReps.$inferSelect;

export type InsertB2bAdmin = z.infer<typeof insertB2bAdminSchema>;
export type B2bAdmin = typeof b2bAdmins.$inferSelect;

export type InsertB2bCustomer = z.infer<typeof insertB2bCustomerSchema>;
export type B2bCustomer = typeof b2bCustomers.$inferSelect;

export type InsertB2bCustomerRequest = z.infer<typeof insertB2bCustomerRequestSchema>;
export type B2bCustomerRequest = typeof b2bCustomerRequests.$inferSelect;

export type InsertB2bCustomerLocation = z.infer<typeof insertB2bCustomerLocationSchema>;
export type B2bCustomerLocation = typeof b2bCustomerLocations.$inferSelect;

export type InsertB2bCustomerManualProduct = z.infer<typeof insertB2bCustomerManualProductSchema>;
export type B2bCustomerManualProduct = typeof b2bCustomerManualProducts.$inferSelect;

export type InsertB2bTierAgreement = z.infer<typeof insertB2bTierAgreementSchema>;
export type B2bTierAgreement = typeof b2bTierAgreements.$inferSelect;

export type InsertB2bOrder = z.infer<typeof insertB2bOrderSchema>;
export type B2bOrder = typeof b2bOrders.$inferSelect;

export type InsertB2bOrderItem = z.infer<typeof insertB2bOrderItemSchema>;
export type B2bOrderItem = typeof b2bOrderItems.$inferSelect;

export type InsertB2bCommission = z.infer<typeof insertB2bCommissionSchema>;
export type B2bCommission = typeof b2bCommissions.$inferSelect;

export type InsertB2bSetting = z.infer<typeof insertB2bSettingSchema>;
export type B2bSetting = typeof b2bSettings.$inferSelect;

export type InsertB2bRolePermission = z.infer<typeof insertB2bRolePermissionSchema>;
export type B2bRolePermission = typeof b2bRolePermissions.$inferSelect;

export type InsertB2bPasswordResetToken = z.infer<typeof insertB2bPasswordResetTokenSchema>;
export type B2bPasswordResetToken = typeof b2bPasswordResetTokens.$inferSelect;

export type InsertB2bEmailTemplate = z.infer<typeof insertB2bEmailTemplateSchema>;
export type B2bEmailTemplate = typeof b2bEmailTemplates.$inferSelect;

export type InsertB2bEmailAutomationLog = z.infer<typeof insertB2bEmailAutomationLogSchema>;
export type B2bEmailAutomationLog = typeof b2bEmailAutomationLogs.$inferSelect;

export type InsertImprovementNote = z.infer<typeof insertImprovementNoteSchema>;
export type ImprovementNote = typeof improvementNotes.$inferSelect;

// Platform Foundation Types
export type InsertPlatformModule = z.infer<typeof insertPlatformModuleSchema>;
export type PlatformModule = typeof platformModules.$inferSelect;

export type InsertStaffDashboardModule = z.infer<typeof insertStaffDashboardModuleSchema>;
export type StaffDashboardModule = typeof staffDashboardModules.$inferSelect;

export type InsertPlatformUser = z.infer<typeof insertPlatformUserSchema>;
export type PlatformUser = typeof platformUsers.$inferSelect;

export type InsertPlatformUserModuleAccess = z.infer<typeof insertPlatformUserModuleAccessSchema>;
export type PlatformUserModuleAccess = typeof platformUserModuleAccess.$inferSelect;

export type InsertSharedLocation = z.infer<typeof insertSharedLocationSchema>;
export type SharedLocation = typeof sharedLocations.$inferSelect;

export type InsertSharedEquipment = z.infer<typeof insertSharedEquipmentSchema>;
export type SharedEquipment = typeof sharedEquipment.$inferSelect;

export type InsertSharedDocument = z.infer<typeof insertSharedDocumentSchema>;
export type SharedDocument = typeof sharedDocuments.$inferSelect;

export type InsertPlatformAuditLog = z.infer<typeof insertPlatformAuditLogSchema>;
export type PlatformAuditLog = typeof platformAuditLog.$inferSelect;

export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// RBAC Types
export type InsertUserGroup = z.infer<typeof insertUserGroupSchema>;
export type UserGroup = typeof userGroups.$inferSelect;

export type InsertGroupMembership = z.infer<typeof insertGroupMembershipSchema>;
export type GroupMembership = typeof groupMemberships.$inferSelect;

export type InsertModuleFeature = z.infer<typeof insertModuleFeatureSchema>;
export type ModuleFeature = typeof moduleFeatures.$inferSelect;

export type InsertGroupModuleAccess = z.infer<typeof insertGroupModuleAccessSchema>;
export type GroupModuleAccess = typeof groupModuleAccess.$inferSelect;

export type InsertGroupFeaturePermission = z.infer<typeof insertGroupFeaturePermissionSchema>;
export type GroupFeaturePermission = typeof groupFeaturePermissions.$inferSelect;

export type InsertUserPermissionOverride = z.infer<typeof insertUserPermissionOverrideSchema>;
export type UserPermissionOverride = typeof userPermissionOverrides.$inferSelect;

// LMS Types
export type InsertLmsCategory = z.infer<typeof insertLmsCategorySchema>;
export type LmsCategory = typeof lmsCategories.$inferSelect;

export type InsertLmsCourse = z.infer<typeof insertLmsCourseSchema>;
export type LmsCourse = typeof lmsCourses.$inferSelect;

export type InsertLmsLesson = z.infer<typeof insertLmsLessonSchema>;
export type LmsLesson = typeof lmsLessons.$inferSelect;

export type InsertLmsQuizQuestion = z.infer<typeof insertLmsQuizQuestionSchema>;
export type LmsQuizQuestion = typeof lmsQuizQuestions.$inferSelect;

export type InsertLmsEnrollment = z.infer<typeof insertLmsEnrollmentSchema>;
export type LmsEnrollment = typeof lmsEnrollments.$inferSelect;

export type InsertLmsLessonProgress = z.infer<typeof insertLmsLessonProgressSchema>;
export type LmsLessonProgress = typeof lmsLessonProgress.$inferSelect;

export type InsertLmsQuizAttempt = z.infer<typeof insertLmsQuizAttemptSchema>;
export type LmsQuizAttempt = typeof lmsQuizAttempts.$inferSelect;

export type InsertLmsCertificate = z.infer<typeof insertLmsCertificateSchema>;
export type LmsCertificate = typeof lmsCertificates.$inferSelect;

// LMS Enhanced Types
export type InsertLmsLessonPage = z.infer<typeof insertLmsLessonPageSchema>;
export type LmsLessonPage = typeof lmsLessonPages.$inferSelect;

export type InsertLmsContentBlock = z.infer<typeof insertLmsContentBlockSchema>;
export type LmsContentBlock = typeof lmsContentBlocks.$inferSelect;

export type InsertLmsQuestionBank = z.infer<typeof insertLmsQuestionBankSchema>;
export type LmsQuestionBank = typeof lmsQuestionBanks.$inferSelect;

export type InsertLmsQuestion = z.infer<typeof insertLmsQuestionSchema>;
export type LmsQuestion = typeof lmsQuestions.$inferSelect;

export type InsertLmsQuiz = z.infer<typeof insertLmsQuizSchema>;
export type LmsQuiz = typeof lmsQuizzes.$inferSelect;

export type InsertLmsQuizQuestionLink = z.infer<typeof insertLmsQuizQuestionLinkSchema>;
export type LmsQuizQuestionLink = typeof lmsQuizQuestionLinks.$inferSelect;

export type InsertLmsQuestionResponse = z.infer<typeof insertLmsQuestionResponseSchema>;
export type LmsQuestionResponse = typeof lmsQuestionResponses.$inferSelect;

export type InsertLmsBadge = z.infer<typeof insertLmsBadgeSchema>;
export type LmsBadge = typeof lmsBadges.$inferSelect;

export type InsertLmsUserBadge = z.infer<typeof insertLmsUserBadgeSchema>;
export type LmsUserBadge = typeof lmsUserBadges.$inferSelect;

export type InsertLmsCourseRating = z.infer<typeof insertLmsCourseRatingSchema>;
export type LmsCourseRating = typeof lmsCourseRatings.$inferSelect;

export type InsertLmsExternalToken = z.infer<typeof insertLmsExternalTokenSchema>;
export type LmsExternalToken = typeof lmsExternalTokens.$inferSelect;

export type InsertLmsExternalProgress = z.infer<typeof insertLmsExternalProgressSchema>;
export type LmsExternalProgress = typeof lmsExternalProgress.$inferSelect;

// Extended LMS types with relations
export type LmsCourseWithDetails = LmsCourse & {
  category?: LmsCategory | null;
  lessons: LmsLesson[];
  quizQuestions: LmsQuizQuestion[];
};

export type LmsEnrollmentWithDetails = LmsEnrollment & {
  course: LmsCourse;
  progress: LmsLessonProgress[];
  quizAttempts: LmsQuizAttempt[];
};

// Compliance Types
export type InsertComplianceTask = z.infer<typeof insertComplianceTaskSchema>;
export type ComplianceTask = typeof complianceTasks.$inferSelect;

export type InsertComplianceTaskHistory = z.infer<typeof insertComplianceTaskHistorySchema>;
export type ComplianceTaskHistory = typeof complianceTaskHistory.$inferSelect;

export type InsertComplianceReminder = z.infer<typeof insertComplianceReminderSchema>;
export type ComplianceReminder = typeof complianceReminders.$inferSelect;

export type InsertComplianceAttachment = z.infer<typeof insertComplianceAttachmentSchema>;
export type ComplianceAttachment = typeof complianceAttachments.$inferSelect;

export type ComplianceActionToken = typeof complianceActionTokens.$inferSelect;

export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;

export type InsertDepartmentTask = z.infer<typeof insertDepartmentTaskSchema>;
export type DepartmentTask = typeof departmentTasks.$inferSelect;

export type InsertDepartmentTaskReminder = z.infer<typeof insertDepartmentTaskReminderSchema>;
export type DepartmentTaskReminder = typeof departmentTaskReminders.$inferSelect;

export type InsertDepartmentTaskHistory = z.infer<typeof insertDepartmentTaskHistorySchema>;
export type DepartmentTaskHistory = typeof departmentTaskHistory.$inferSelect;

// Extended Compliance types with relations
export type ComplianceTaskWithDetails = ComplianceTask & {
  history?: ComplianceTaskHistory[];
  reminders?: ComplianceReminder[];
  attachments?: ComplianceAttachment[];
};

// ============================================
// DAILY REPORTS MODULE
// ============================================

// Department type for Daily Reports (using varchar for flexibility)
// Previously was an enum, now allows dynamic department creation

// Incident severity enum
export const incidentSeverityEnum = pgEnum("incident_severity", [
  "low",
  "medium",
  "high",
  "critical"
]);

// Procedure type enum - opening, closing, or general procedures
export const procedureTypeEnum = pgEnum("procedure_type", [
  "opening",
  "closing",
  "general"
]);

// Daily Report Templates - Defines department-specific metrics
export const dailyReportTemplates = pgTable("daily_report_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  department: varchar("department").notNull().unique(),
  departmentLabel: text("department_label").notNull(),
  metrics: jsonb("metrics").notNull(), // Array of { key, label, type: 'count'|'decimal'|'text', required, description }
  notificationEmails: jsonb("notification_emails").default([]), // Array of { email, name?, role? }
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Daily Procedure Templates - Checklist items per department
export const dailyProcedureTemplates = pgTable("daily_procedure_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  department: varchar("department").notNull(),
  procedureName: text("procedure_name").notNull(),
  description: text("description"),
  procedureType: procedureTypeEnum("procedure_type").notNull().default("general"), // opening, closing, or general
  sortOrder: integer("sort_order").notNull().default(0),
  isRequired: boolean("is_required").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_daily_procedure_templates_dept").on(table.department),
]);

// Daily Reports - Main report table (one per department per day)
export const dailyReports = pgTable("daily_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  department: varchar("department").notNull(),
  reportDate: timestamp("report_date").notNull(),
  submittedById: varchar("submitted_by_id").references(() => platformUsers.id),
  submittedByName: text("submitted_by_name"),
  
  // Source tracking - where the report was submitted from
  source: varchar("source").default("admin"), // 'qr_form', 'admin', 'api'
  
  // Performance summary
  performanceSummary: text("performance_summary"),
  overallRating: integer("overall_rating"), // 1-5 scale
  
  // Metrics data stored as JSON (validated against template)
  metricsData: jsonb("metrics_data"), // { metricKey: value, ... }
  
  // Procedure completion status
  proceduresCompleted: boolean("procedures_completed").notNull().default(false),
  proceduresCompletedCount: integer("procedures_completed_count").default(0),
  proceduresTotalCount: integer("procedures_total_count").default(0),
  
  // Customer service focus
  hasCustomerConcerns: boolean("has_customer_concerns").notNull().default(false),
  customerConcernsSummary: text("customer_concerns_summary"),
  
  // Status tracking
  status: text("status").notNull().default("draft"), // draft, submitted, reviewed
  submittedAt: timestamp("submitted_at"), // When the report was submitted
  reviewedById: varchar("reviewed_by_id").references(() => platformUsers.id),
  reviewedByName: text("reviewed_by_name"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_daily_reports_dept_date").on(table.department, table.reportDate),
  index("idx_daily_reports_date").on(table.reportDate),
  index("idx_daily_reports_status").on(table.status),
  unique("uq_daily_reports_dept_date").on(table.department, table.reportDate),
]);

// Daily Report Incidents - Detailed incident logs
export const dailyReportIncidents = pgTable("daily_report_incidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportId: varchar("report_id").notNull().references(() => dailyReports.id, { onDelete: 'cascade' }),
  
  incidentType: varchar("incident_type").notNull().default("other"), // customer_complaint, equipment_issue, safety, staffing, inventory, policy_violation, other
  incidentTime: timestamp("incident_time"),
  severity: incidentSeverityEnum("severity").notNull().default("low"),
  description: text("description").notNull(),
  
  // Customer impact tracking
  isCustomerRelated: boolean("is_customer_related").notNull().default(false),
  customerName: text("customer_name"),
  customerContact: text("customer_contact"),
  
  // Resolution tracking
  actionTaken: text("action_taken"),
  resolved: boolean("resolved").notNull().default(false),
  requiresFollowUp: boolean("requires_follow_up").notNull().default(false),
  followUpNotes: text("follow_up_notes"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_daily_incidents_report").on(table.reportId),
  index("idx_daily_incidents_customer").on(table.isCustomerRelated),
  index("idx_daily_incidents_severity").on(table.severity),
]);

// Daily Report Incident Notes - Tracks notes/updates on incidents until resolved
export const dailyReportIncidentNotes = pgTable("daily_report_incident_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  incidentId: varchar("incident_id").notNull().references(() => dailyReportIncidents.id, { onDelete: 'cascade' }),
  note: text("note").notNull(),
  addedById: varchar("added_by_id"),
  addedByName: varchar("added_by_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_incident_notes_incident").on(table.incidentId),
]);

// Daily Procedure Completions - Tracks which procedures were completed
export const dailyProcedureCompletions = pgTable("daily_procedure_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportId: varchar("report_id").notNull().references(() => dailyReports.id, { onDelete: 'cascade' }),
  procedureTemplateId: varchar("procedure_template_id").notNull().references(() => dailyProcedureTemplates.id),
  
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  completedById: varchar("completed_by_id").references(() => platformUsers.id),
  completedByName: text("completed_by_name"),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_daily_procedure_completions_report").on(table.reportId),
  unique("uq_daily_procedure_completion").on(table.reportId, table.procedureTemplateId),
]);

// Daily Report Email Recipients - who receives notifications for each department
export const dailyReportEmailRecipients = pgTable("daily_report_email_recipients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  department: varchar("department").notNull(),
  email: varchar("email").notNull(),
  recipientName: varchar("recipient_name"),
  role: varchar("role"), // e.g., 'Director', 'Manager', 'Owner'
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_daily_email_recipients_dept").on(table.department),
  index("idx_daily_email_recipients_active").on(table.active),
  unique("uq_daily_email_recipient").on(table.department, table.email),
]);

// Insert schemas for Daily Reports
export const insertDailyReportTemplateSchema = createInsertSchema(dailyReportTemplates).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const insertDailyProcedureTemplateSchema = createInsertSchema(dailyProcedureTemplates).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const insertDailyReportSchema = createInsertSchema(dailyReports).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  reviewedAt: true
});
export const insertDailyReportIncidentSchema = createInsertSchema(dailyReportIncidents).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const insertDailyProcedureCompletionSchema = createInsertSchema(dailyProcedureCompletions).omit({ 
  id: true, 
  createdAt: true,
  completedAt: true
});
export const insertDailyReportIncidentNoteSchema = createInsertSchema(dailyReportIncidentNotes).omit({ 
  id: true, 
  createdAt: true
});

// Daily Reports Types
export type InsertDailyReportTemplate = z.infer<typeof insertDailyReportTemplateSchema>;
export type DailyReportTemplate = typeof dailyReportTemplates.$inferSelect;

export type InsertDailyProcedureTemplate = z.infer<typeof insertDailyProcedureTemplateSchema>;
export type DailyProcedureTemplate = typeof dailyProcedureTemplates.$inferSelect;

export type InsertDailyReport = z.infer<typeof insertDailyReportSchema>;
export type DailyReport = typeof dailyReports.$inferSelect;

export type InsertDailyReportIncident = z.infer<typeof insertDailyReportIncidentSchema>;
export type DailyReportIncident = typeof dailyReportIncidents.$inferSelect;

export type InsertDailyReportIncidentNote = z.infer<typeof insertDailyReportIncidentNoteSchema>;
export type DailyReportIncidentNote = typeof dailyReportIncidentNotes.$inferSelect;

export type InsertDailyProcedureCompletion = z.infer<typeof insertDailyProcedureCompletionSchema>;
export type DailyProcedureCompletion = typeof dailyProcedureCompletions.$inferSelect;

export const insertDailyReportEmailRecipientSchema = createInsertSchema(dailyReportEmailRecipients).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertDailyReportEmailRecipient = z.infer<typeof insertDailyReportEmailRecipientSchema>;
export type DailyReportEmailRecipient = typeof dailyReportEmailRecipients.$inferSelect;

// Daily Report Access Codes - for public form access via QR code
// Note: Same code can be used for multiple departments (staff managing multiple areas)
export const dailyReportAccessCodes = pgTable("daily_report_access_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 4 }).notNull(),
  staffName: varchar("staff_name").notNull(),
  department: varchar("department").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdById: varchar("created_by_id"),
  createdByName: varchar("created_by_name"),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_access_codes_code").on(table.code),
  index("idx_access_codes_dept").on(table.department),
  index("idx_access_codes_active").on(table.isActive),
  unique("uq_access_codes_code_dept").on(table.code, table.department),
]);

export const insertDailyReportAccessCodeSchema = createInsertSchema(dailyReportAccessCodes).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  lastUsedAt: true
});
export type InsertDailyReportAccessCode = z.infer<typeof insertDailyReportAccessCodeSchema>;
export type DailyReportAccessCode = typeof dailyReportAccessCodes.$inferSelect;

// Extended Daily Report type with relations
export type DailyReportWithDetails = DailyReport & {
  incidents?: DailyReportIncident[];
  procedureCompletions?: (DailyProcedureCompletion & { template?: DailyProcedureTemplate })[];
  template?: DailyReportTemplate;
};

// Daily Report Field Definitions - Master list of fields used across all departments
export const dailyReportFieldTypeEnum = pgEnum("daily_report_field_type", [
  "number",
  "currency",
  "text",
  "checkbox",
  "dropdown"
]);

export const dailyReportFieldDefinitions = pgTable("daily_report_field_definitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).notNull().unique(),
  label: varchar("label", { length: 200 }).notNull(),
  type: dailyReportFieldTypeEnum("type").notNull().default("text"),
  description: text("description"),
  options: jsonb("options"), // For dropdown field type - array of {value: string, label: string}
  notificationEmails: jsonb("notification_emails"), // Array of {email: string, name?: string} for field-specific email notifications
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_field_definitions_key").on(table.key),
  index("idx_field_definitions_active").on(table.isActive),
  index("idx_field_definitions_sort").on(table.sortOrder),
]);

export const insertDailyReportFieldDefinitionSchema = createInsertSchema(dailyReportFieldDefinitions).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertDailyReportFieldDefinition = z.infer<typeof insertDailyReportFieldDefinitionSchema>;
export type DailyReportFieldDefinition = typeof dailyReportFieldDefinitions.$inferSelect;

// Junction table linking departments to their enabled fields
export const departmentFieldAssignments = pgTable("department_field_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => dailyReportTemplates.id, { onDelete: "cascade" }),
  fieldDefinitionId: varchar("field_definition_id").notNull().references(() => dailyReportFieldDefinitions.id, { onDelete: "cascade" }),
  isEnabled: boolean("is_enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_dept_field_template").on(table.templateId),
  index("idx_dept_field_definition").on(table.fieldDefinitionId),
]);

export const insertDepartmentFieldAssignmentSchema = createInsertSchema(departmentFieldAssignments).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertDepartmentFieldAssignment = z.infer<typeof insertDepartmentFieldAssignmentSchema>;
export type DepartmentFieldAssignment = typeof departmentFieldAssignments.$inferSelect;

// Extended type for field assignments with field definition details
export type DepartmentFieldAssignmentWithDefinition = DepartmentFieldAssignment & {
  fieldDefinition?: DailyReportFieldDefinition;
};

// Daily Report Revision Requests - Track requests for clarification/revision on reports
export const dailyReportRevisionRequests = pgTable("daily_report_revision_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportId: varchar("report_id").notNull().references(() => dailyReports.id, { onDelete: "cascade" }),
  requestedById: varchar("requested_by_id"),
  requestedByName: varchar("requested_by_name"),
  requestMessage: text("request_message").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("open"), // 'open' or 'resolved'
  responseMessage: text("response_message"),
  respondedById: varchar("responded_by_id"),
  respondedByName: varchar("responded_by_name"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_revision_requests_report").on(table.reportId),
  index("idx_revision_requests_status").on(table.status),
]);

export const insertDailyReportRevisionRequestSchema = createInsertSchema(dailyReportRevisionRequests).omit({
  id: true,
  createdAt: true,
});
export type InsertDailyReportRevisionRequest = z.infer<typeof insertDailyReportRevisionRequestSchema>;
export type DailyReportRevisionRequest = typeof dailyReportRevisionRequests.$inferSelect;

// ============================================
// RESERVATION MODULE (resy_*) TABLES
// ============================================

// Resy Users - Staff and admin users for reservation system
export const resyUsers = pgTable("resy_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("viewer"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertResyUserSchema = createInsertSchema(resyUsers).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResyUser = z.infer<typeof insertResyUserSchema>;
export type ResyUser = typeof resyUsers.$inferSelect;

// Resy Sessions - Session management for reservation system
export const resySessions = pgTable("resy_sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
}, (table) => [
  index("idx_resy_session_expire").on(table.expire),
]);

// Resy Locations - Venue locations
export const resyLocations = pgTable("resy_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  address: text("address"),
  imageUrl: text("image_url"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  isTicketedEventLocation: boolean("is_ticketed_event_location").notNull().default(false),
  isReservationLocation: boolean("is_reservation_location").notNull().default(false),
  timezone: varchar("timezone").default("America/New_York"),
  reservationCloseTime: varchar("reservation_close_time", { length: 5 }),
  advanceBookingDays: integer("advance_booking_days"),
  maxReservationSize: integer("max_reservation_size").default(10),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertResyLocationSchema = createInsertSchema(resyLocations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResyLocation = z.infer<typeof insertResyLocationSchema>;
export type ResyLocation = typeof resyLocations.$inferSelect;

// Resy Experiences - Tasting experiences/activities
export const resyExperiences = pgTable("resy_experiences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  shortDescription: varchar("short_description", { length: 200 }),
  longDescription: varchar("long_description", { length: 1000 }),
  imageUrl: text("image_url"),
  primaryImageKey: text("primary_image_key"),
  secondaryImageKey: text("secondary_image_key"),
  isExternal: boolean("is_external").notNull().default(false),
  externalUrl: text("external_url"),
  reservationType: text("reservation_type"),
  price: decimal("price", { precision: 10, scale: 2 }),
  showPrice: boolean("show_price").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  location: text("location"),
  locationId: varchar("location_id"),
  showWaitlist: boolean("show_waitlist").notNull().default(false),
  closedMessage: text("closed_message"),
  fullyBookedMessage: text("fully_booked_message"),
  privateEventMessage: text("private_event_message"),
  pointsEarned: integer("points_earned").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertResyExperienceSchema = createInsertSchema(resyExperiences).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResyExperience = z.infer<typeof insertResyExperienceSchema>;
export type ResyExperience = typeof resyExperiences.$inferSelect;

// Resy Clubs - Membership clubs
export const resyClubs = pgTable("resy_clubs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertResyClubSchema = createInsertSchema(resyClubs).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResyClub = z.infer<typeof insertResyClubSchema>;
export type ResyClub = typeof resyClubs.$inferSelect;

// Resy Customers - Guest/customer records
export const resyCustomers = pgTable("resy_customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  clubStatus: text("club_status").notNull().default("none"),
  clubId: varchar("club_id"),
  notes: text("notes"),
  notificationPreference: text("notification_preference").notNull().default("email"),
  newsletterOptIn: boolean("newsletter_opt_in").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertResyCustomerSchema = createInsertSchema(resyCustomers).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResyCustomer = z.infer<typeof insertResyCustomerSchema>;
export type ResyCustomer = typeof resyCustomers.$inferSelect;

// Update customer schema for partial updates
export const updateResyCustomerSchema = insertResyCustomerSchema.partial();
export type UpdateResyCustomer = z.infer<typeof updateResyCustomerSchema>;

// Resy Reservations - Booking records
export const resyReservations = pgTable("resy_reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  experienceId: varchar("experience_id").notNull(),
  locationId: varchar("location_id"),
  customerId: varchar("customer_id"),
  timeSlotId: varchar("time_slot_id"),
  tableId: varchar("table_id"),
  reservationDate: varchar("reservation_date", { length: 10 }).notNull(),
  reservationTime: text("reservation_time").notNull(),
  partySize: integer("party_size").notNull(),
  ticketQuantity: integer("ticket_quantity"),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone"),
  status: text("status").notNull().default("booked"), // booked -> confirmed -> cancelled
  notes: text("notes"),
  specialRequests: text("special_requests"),
  tableAssignment: text("table_assignment"),
  confirmationCode: varchar("confirmation_code"),
  confirmationToken: varchar("confirmation_token"), // Secure token for email confirm/cancel links
  paymentIntentId: text("payment_intent_id"),
  totalAmount: text("total_amount"),
  assignedTableId: varchar("assigned_table_id"), // The table assigned via availability algorithm
  holdStart: varchar("hold_start", { length: 5 }), // Time when table hold starts (HH:MM)
  holdEnd: varchar("hold_end", { length: 5 }), // Time when table hold ends (HH:MM based on turn time)
  turnDuration: integer("turn_duration"), // Duration in minutes for this reservation
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_resy_reservations_date").on(table.reservationDate),
  index("idx_resy_reservations_experience").on(table.experienceId),
  index("idx_resy_reservations_customer").on(table.customerId),
  index("idx_resy_reservations_assigned_table").on(table.assignedTableId),
]);

export const insertResyReservationSchema = createInsertSchema(resyReservations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResyReservation = z.infer<typeof insertResyReservationSchema>;
export type ResyReservation = typeof resyReservations.$inferSelect;

// Resy Time Slots - Available booking time slots
export const resyTimeSlots = pgTable("resy_time_slots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  experienceId: varchar("experience_id").notNull(),
  locationId: varchar("location_id"),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  maxPartySize: integer("max_party_size").notNull(),
  maxReservations: integer("max_reservations"),
  capacity: integer("capacity").notNull().default(10),
  time: text("time"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_resy_time_slots_experience").on(table.experienceId),
  index("idx_resy_time_slots_day").on(table.dayOfWeek),
]);

export const insertResyTimeSlotSchema = createInsertSchema(resyTimeSlots).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResyTimeSlot = z.infer<typeof insertResyTimeSlotSchema>;
export type ResyTimeSlot = typeof resyTimeSlots.$inferSelect;

// Resy Waitlist - Waitlist entries
export const resyWaitlist = pgTable("resy_waitlist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  experienceId: varchar("experience_id").notNull(),
  locationId: varchar("location_id"),
  requestedDate: timestamp("requested_date").notNull(),
  partySize: integer("party_size").notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone"),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertResyWaitlistSchema = createInsertSchema(resyWaitlist).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResyWaitlist = z.infer<typeof insertResyWaitlistSchema>;
export type ResyWaitlist = typeof resyWaitlist.$inferSelect;

// Resy Customer Visits - Track customer visit history
export const resyCustomerVisits = pgTable("resy_customer_visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  reservationId: varchar("reservation_id"),
  experienceId: varchar("experience_id").notNull(),
  visitDate: varchar("visit_date", { length: 10 }).notNull(),
  visitTime: text("visit_time"),
  partySize: integer("party_size"),
  status: text("status").notNull().default("completed"),
  totalSpent: decimal("total_spent", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertResyCustomerVisitSchema = createInsertSchema(resyCustomerVisits).omit({ id: true, createdAt: true });
export type InsertResyCustomerVisit = z.infer<typeof insertResyCustomerVisitSchema>;
export type ResyCustomerVisit = typeof resyCustomerVisits.$inferSelect;

// Resy Meal Periods - Breakfast, Lunch, Dinner, etc.
export const resyMealPeriods = pgTable("resy_meal_periods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id"),
  name: text("name").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  lastReservationTime: text("last_reservation_time"), // Optional: latest time guests can book (if different from endTime)
  daysAvailable: integer("days_available").array(), // Array of day numbers (0=Sun, 1=Mon, ... 6=Sat)
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertResyMealPeriodSchema = createInsertSchema(resyMealPeriods).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResyMealPeriod = z.infer<typeof insertResyMealPeriodSchema>;
export type ResyMealPeriod = typeof resyMealPeriods.$inferSelect;

// Resy Operating Hours - Location operating hours
export const resyOperatingHours = pgTable("resy_operating_hours", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull(),
  mealPeriodId: varchar("meal_period_id"),
  dayOfWeek: integer("day_of_week").notNull(),
  openTime: text("open_time"),
  closeTime: text("close_time"),
  isOpen: boolean("is_open").notNull().default(true),
  isClosed: boolean("is_closed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertResyOperatingHoursSchema = createInsertSchema(resyOperatingHours).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResyOperatingHours = z.infer<typeof insertResyOperatingHoursSchema>;
export type ResyOperatingHours = typeof resyOperatingHours.$inferSelect;

// Resy Special Dates - Special events that take precedence over regular experiences
// When a special date is created, it automatically blocks that time slot for other experiences at the location
export const resySpecialDates = pgTable("resy_special_dates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  name: text("name"),
  description: text("description"),
  isClosed: boolean("is_closed").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertResySpecialDateSchema = createInsertSchema(resySpecialDates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResySpecialDate = z.infer<typeof insertResySpecialDateSchema>;
export type ResySpecialDate = typeof resySpecialDates.$inferSelect;

// Resy Location Holidays - Recurring annual holidays for each location
// These holidays automatically apply every year without needing to recreate
export const resyLocationHolidays = pgTable("resy_location_holidays", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull(),
  holidayKey: varchar("holiday_key", { length: 50 }).notNull(),
  isClosed: boolean("is_closed").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertResyLocationHolidaySchema = createInsertSchema(resyLocationHolidays).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResyLocationHoliday = z.infer<typeof insertResyLocationHolidaySchema>;
export type ResyLocationHoliday = typeof resyLocationHolidays.$inferSelect;

// Predefined holidays list with date calculation logic
export const RECURRING_HOLIDAYS = [
  { key: "new_years_day", name: "New Year's Day", getDate: (year: number) => `${year}-01-01` },
  { key: "mlk_day", name: "Martin Luther King Jr. Day", getDate: (year: number) => getThirdMonday(year, 1) },
  { key: "presidents_day", name: "Presidents' Day", getDate: (year: number) => getThirdMonday(year, 2) },
  { key: "easter_sunday", name: "Easter Sunday", getDate: (year: number) => getEasterDate(year) },
  { key: "memorial_day", name: "Memorial Day", getDate: (year: number) => getLastMonday(year, 5) },
  { key: "july_4th", name: "Independence Day (July 4th)", getDate: (year: number) => `${year}-07-04` },
  { key: "labor_day", name: "Labor Day", getDate: (year: number) => getFirstMonday(year, 9) },
  { key: "columbus_day", name: "Columbus Day", getDate: (year: number) => getSecondMonday(year, 10) },
  { key: "veterans_day", name: "Veterans Day", getDate: (year: number) => `${year}-11-11` },
  { key: "thanksgiving", name: "Thanksgiving", getDate: (year: number) => getFourthThursday(year, 11) },
  { key: "thanksgiving_friday", name: "Day After Thanksgiving", getDate: (year: number) => getDayAfterThanksgiving(year) },
  { key: "christmas_eve", name: "Christmas Eve", getDate: (year: number) => `${year}-12-24` },
  { key: "christmas_day", name: "Christmas Day", getDate: (year: number) => `${year}-12-25` },
  { key: "new_years_eve", name: "New Year's Eve", getDate: (year: number) => `${year}-12-31` },
] as const;

// Helper functions for calculating holiday dates
function getFirstMonday(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  const day = date.getDay();
  const diff = day === 0 ? 1 : (day === 1 ? 0 : 8 - day);
  date.setDate(date.getDate() + diff);
  return date.toISOString().split("T")[0];
}

function getSecondMonday(year: number, month: number): string {
  const first = new Date(getFirstMonday(year, month));
  first.setDate(first.getDate() + 7);
  return first.toISOString().split("T")[0];
}

function getThirdMonday(year: number, month: number): string {
  const first = new Date(getFirstMonday(year, month));
  first.setDate(first.getDate() + 14);
  return first.toISOString().split("T")[0];
}

function getLastMonday(year: number, month: number): string {
  const date = new Date(year, month, 0);
  const day = date.getDay();
  const diff = day >= 1 ? day - 1 : 6;
  date.setDate(date.getDate() - diff);
  return date.toISOString().split("T")[0];
}

function getFourthThursday(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  const day = date.getDay();
  const diff = day <= 4 ? 4 - day : 11 - day;
  date.setDate(date.getDate() + diff + 21);
  return date.toISOString().split("T")[0];
}

function getDayAfterThanksgiving(year: number): string {
  const thanksgiving = new Date(getFourthThursday(year, 11));
  thanksgiving.setDate(thanksgiving.getDate() + 1);
  return thanksgiving.toISOString().split("T")[0];
}

function getEasterDate(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Resy Location Tables - Physical tables at locations
export const resyLocationTables = pgTable("resy_location_tables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull(),
  tableLabel: varchar("table_label", { length: 5 }).notNull(),
  minCapacity: integer("min_capacity").notNull(),
  maxCapacity: integer("max_capacity").notNull(),
  combinableWith: text("combinable_with").array().default(sql`'{}'::text[]`),
  priority: integer("priority").notNull().default(0),
  isCommunal: boolean("is_communal").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  isPaused: boolean("is_paused").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertResyLocationTableSchema = createInsertSchema(resyLocationTables).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResyLocationTable = z.infer<typeof insertResyLocationTableSchema>;
export type ResyLocationTable = typeof resyLocationTables.$inferSelect;

// Resy Flow Controls - Reservation flow management
export const resyFlowControls = pgTable("resy_flow_controls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull(),
  mealPeriodId: varchar("meal_period_id"),
  intervalMinutes: integer("interval_minutes").notNull().default(15),
  maxCoversPerInterval: integer("max_covers_per_interval").notNull(),
  maxDailyCovers: integer("max_daily_covers"),
  flowMode: varchar("flow_mode", { length: 20 }).notNull().default("global"), // 'global' or 'controlled'
  intervalOverrides: jsonb("interval_overrides"), // Array of {time: string, maxCovers: number} for controlled mode
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertResyFlowControlSchema = createInsertSchema(resyFlowControls).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResyFlowControl = z.infer<typeof insertResyFlowControlSchema>;
export type ResyFlowControl = typeof resyFlowControls.$inferSelect;

// Resy Turn Time Settings - Table turn time configuration
export const resyTurnTimeSettings = pgTable("resy_turn_time_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull(),
  mealPeriodId: varchar("meal_period_id"),
  minPartySize: integer("min_party_size").notNull(),
  maxPartySize: integer("max_party_size").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertResyTurnTimeSettingSchema = createInsertSchema(resyTurnTimeSettings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResyTurnTimeSetting = z.infer<typeof insertResyTurnTimeSettingSchema>;
export type ResyTurnTimeSetting = typeof resyTurnTimeSettings.$inferSelect;

// Resy Experience Discounts - Discount codes for experiences
export const resyExperienceDiscounts = pgTable("resy_experience_discounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  experienceId: varchar("experience_id").notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  discountType: text("discount_type").notNull(),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  validFrom: varchar("valid_from", { length: 10 }),
  validUntil: varchar("valid_until", { length: 10 }),
  isAutomatic: boolean("is_automatic").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertResyExperienceDiscountSchema = createInsertSchema(resyExperienceDiscounts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResyExperienceDiscount = z.infer<typeof insertResyExperienceDiscountSchema>;
export type ResyExperienceDiscount = typeof resyExperienceDiscounts.$inferSelect;

// Resy Club Experience Discounts - Club member discounts
export const resyClubExperienceDiscounts = pgTable("resy_club_experience_discounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clubId: varchar("club_id").notNull(),
  experienceId: varchar("experience_id").notNull(),
  discountType: text("discount_type").notNull(),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertResyClubExperienceDiscountSchema = createInsertSchema(resyClubExperienceDiscounts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResyClubExperienceDiscount = z.infer<typeof insertResyClubExperienceDiscountSchema>;
export type ResyClubExperienceDiscount = typeof resyClubExperienceDiscounts.$inferSelect;

// Resy Private Events - Private event bookings
export const resyPrivateEvents = pgTable("resy_private_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  experienceId: varchar("experience_id").notNull(),
  locationId: varchar("location_id"),
  eventDate: varchar("event_date", { length: 10 }).notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone"),
  partySize: integer("party_size").notNull(),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertResyPrivateEventSchema = createInsertSchema(resyPrivateEvents).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResyPrivateEvent = z.infer<typeof insertResyPrivateEventSchema>;
export type ResyPrivateEvent = typeof resyPrivateEvents.$inferSelect;

// Resy Ticketed Event Definitions - Defines single or recurring ticketed events for locations
export const resyTicketedEventDefinitions = pgTable("resy_ticketed_event_definitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull(),
  experienceId: varchar("experience_id"),
  name: text("name").notNull(),
  description: text("description"),
  eventType: text("event_type").notNull().default("single"), // 'single' or 'recurring'
  // For single events
  singleEventDate: varchar("single_event_date", { length: 10 }), // YYYY-MM-DD
  singleEventTime: text("single_event_time"), // HH:MM
  singleEventCapacity: integer("single_event_capacity"),
  // For recurring events
  frequency: text("frequency"), // 'daily', 'weekly', 'monthly', 'yearly'
  daysOfWeek: integer("days_of_week").array().default(sql`'{}'::integer[]`), // 0=Sun, 1=Mon, ..., 6=Sat
  startDate: varchar("start_date", { length: 10 }), // When recurring event schedule starts
  endDate: varchar("end_date", { length: 10 }), // Optional end date for recurring schedule
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_resy_ticketed_events_location").on(table.locationId),
  index("idx_resy_ticketed_events_experience").on(table.experienceId),
]);

export const insertResyTicketedEventDefinitionSchema = createInsertSchema(resyTicketedEventDefinitions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResyTicketedEventDefinition = z.infer<typeof insertResyTicketedEventDefinitionSchema>;
export type ResyTicketedEventDefinition = typeof resyTicketedEventDefinitions.$inferSelect;

// Resy Ticketed Event Timeslots - Time slots with capacity for recurring events
// For recurring events, each day of week can have multiple time slots
export const resyTicketedEventTimeslots = pgTable("resy_ticketed_event_timeslots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  definitionId: varchar("definition_id").notNull(),
  dayOfWeek: integer("day_of_week"), // 0=Sun, 1=Mon, ..., 6=Sat (null for single events or all-days)
  startTime: text("start_time").notNull(), // HH:MM
  capacity: integer("capacity").notNull().default(20),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_resy_ticketed_timeslots_definition").on(table.definitionId),
  index("idx_resy_ticketed_timeslots_day").on(table.dayOfWeek),
]);

export const insertResyTicketedEventTimeslotSchema = createInsertSchema(resyTicketedEventTimeslots).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResyTicketedEventTimeslot = z.infer<typeof insertResyTicketedEventTimeslotSchema>;
export type ResyTicketedEventTimeslot = typeof resyTicketedEventTimeslots.$inferSelect;

// Resy Site Settings - Global configuration (single row per site)
export const resySiteSettings = pgTable("resy_site_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  value: text("value"),
  description: text("description"),
  headerTitle: text("header_title"),
  headerSubtitle: text("header_subtitle"),
  logoUrl: text("logo_url"),
  accentColor: text("accent_color"),
  backgroundImageUrl: text("background_image_url"),
  headerImageUrl: text("header_image_url"),
  companyName: text("company_name"),
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
  companyAddress: text("company_address"),
  companyPhone: text("company_phone"),
  companyEmail: text("company_email"),
  companyCity: text("company_city"),
  companyState: text("company_state"),
  companyZip: text("company_zip"),
  companyZipCode: text("company_zip_code"),
  companyWebsite: text("company_website"),
  showPoweredBy: boolean("show_powered_by").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertResySiteSettingSchema = createInsertSchema(resySiteSettings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResySiteSetting = z.infer<typeof insertResySiteSettingSchema>;
export type ResySiteSetting = typeof resySiteSettings.$inferSelect;

// Resy Footer Links - Website footer links
export const resyFooterLinks = pgTable("resy_footer_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  url: text("url").notNull(),
  iconUrl: text("icon_url"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertResyFooterLinkSchema = createInsertSchema(resyFooterLinks).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResyFooterLink = z.infer<typeof insertResyFooterLinkSchema>;
export type ResyFooterLink = typeof resyFooterLinks.$inferSelect;

// Type aliases for backward compatibility with migrated reservation pages
export type Location = ResyLocation;
export type InsertLocation = InsertResyLocation;
export type Experience = ResyExperience;
export type InsertExperience = InsertResyExperience;
export type Reservation = ResyReservation;
export type InsertReservation = InsertResyReservation;
export type Customer = ResyCustomer;
export type InsertCustomer = InsertResyCustomer;
export type Club = ResyClub;
export type InsertClub = InsertResyClub;
export type TimeSlot = ResyTimeSlot;
export type InsertTimeSlot = InsertResyTimeSlot;
export type WaitlistEntry = ResyWaitlist;
export type InsertWaitlistEntry = InsertResyWaitlist;
export type CustomerVisit = ResyCustomerVisit;
export type InsertCustomerVisit = InsertResyCustomerVisit;
export type MealPeriod = ResyMealPeriod;
export type InsertMealPeriod = InsertResyMealPeriod;
export type OperatingHours = ResyOperatingHours;
export type InsertOperatingHours = InsertResyOperatingHours;
export type SpecialDate = ResySpecialDate;
export type InsertSpecialDate = InsertResySpecialDate;
export type LocationTable = ResyLocationTable;
export type InsertLocationTable = InsertResyLocationTable;
export type FlowControl = ResyFlowControl;
export type InsertFlowControl = InsertResyFlowControl;
export type TurnTimeSettings = ResyTurnTimeSetting;
export type InsertTurnTimeSettings = InsertResyTurnTimeSetting;
export type ExperienceDiscount = ResyExperienceDiscount;
export type InsertExperienceDiscount = InsertResyExperienceDiscount;
export type ClubExperienceDiscount = ResyClubExperienceDiscount;
export type InsertClubExperienceDiscount = InsertResyClubExperienceDiscount;
export type PrivateEvent = ResyPrivateEvent;
export type InsertPrivateEvent = InsertResyPrivateEvent;
export type TicketedEventDefinition = ResyTicketedEventDefinition;
export type InsertTicketedEventDefinition = InsertResyTicketedEventDefinition;
export type TicketedEventTimeslot = ResyTicketedEventTimeslot;
export type InsertTicketedEventTimeslot = InsertResyTicketedEventTimeslot;
export type SiteSetting = ResySiteSetting;
export type InsertSiteSetting = InsertResySiteSetting;
export type FooterLink = ResyFooterLink;
export type InsertFooterLink = InsertResyFooterLink;
export type ResyUserType = ResyUser;
export type InsertResyUserType = InsertResyUser;

// Platform Future Concepts - Ideas and roadmap items
export const platformFutureConcepts = pgTable("platform_future_concepts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull().default("general"),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("idea"),
  notes: text("notes"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPlatformFutureConceptSchema = createInsertSchema(platformFutureConcepts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlatformFutureConcept = z.infer<typeof insertPlatformFutureConceptSchema>;
export type PlatformFutureConcept = typeof platformFutureConcepts.$inferSelect;

// Platform Company Information - Company details and settings
export const platformCompanyInfo = pgTable("platform_company_info", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull().default("Nashoba Valley Winery"),
  tagline: text("tagline"),
  description: text("description"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  phone: text("phone"),
  email: text("email"),
  supportEmail: text("support_email"),
  website: text("website"),
  mailingListUrl: text("mailing_list_url"),
  facebookUrl: text("facebook_url"),
  instagramUrl: text("instagram_url"),
  twitterUrl: text("twitter_url"),
  linkedinUrl: text("linkedin_url"),
  yelpUrl: text("yelp_url"),
  tripAdvisorUrl: text("trip_advisor_url"),
  googleMapsUrl: text("google_maps_url"),
  hoursOfOperation: text("hours_of_operation"),
  additionalInfo: text("additional_info"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPlatformCompanyInfoSchema = createInsertSchema(platformCompanyInfo).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlatformCompanyInfo = z.infer<typeof insertPlatformCompanyInfoSchema>;
export type PlatformCompanyInfo = typeof platformCompanyInfo.$inferSelect;

// ============================================================================
// LMS VERIFICATION TABLES
// Manager/peer sign-off for hands-on skills verification
// ============================================================================

// Verification request status enum
export const lmsVerificationStatusEnum = pgEnum("lms_verification_status", ["pending", "approved", "rejected", "expired"]);

// LMS Skill Verifications - hands-on task verification by manager/peer
export const lmsSkillVerifications = pgTable("lms_skill_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => platformUsers.id, { onDelete: 'cascade' }),
  courseId: varchar("course_id").notNull().references(() => lmsCourses.id, { onDelete: 'cascade' }),
  lessonId: varchar("lesson_id").references(() => lmsLessons.id, { onDelete: 'cascade' }),
  enrollmentId: varchar("enrollment_id").notNull().references(() => lmsEnrollments.id, { onDelete: 'cascade' }),
  skillName: varchar("skill_name").notNull(), // e.g., "Correct Pour Technique"
  description: text("description"), // What needs to be demonstrated
  status: lmsVerificationStatusEnum("status").notNull().default("pending"),
  evidenceUrl: text("evidence_url"), // Photo/video evidence URL
  evidenceType: varchar("evidence_type"), // 'photo', 'video', 'checklist'
  checklistItems: jsonb("checklist_items"), // Array of {item: string, checked: boolean}
  reviewerId: varchar("reviewer_id").references(() => platformUsers.id),
  reviewerNotes: text("reviewer_notes"),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  expiresAt: timestamp("expires_at"),
  locationId: varchar("location_id").references(() => sharedLocations.id),
}, (table) => [
  index("idx_lms_verify_user").on(table.userId),
  index("idx_lms_verify_course").on(table.courseId),
  index("idx_lms_verify_status").on(table.status),
  index("idx_lms_verify_reviewer").on(table.reviewerId),
]);

export const insertLmsSkillVerificationSchema = createInsertSchema(lmsSkillVerifications).omit({ id: true, requestedAt: true });
export type InsertLmsSkillVerification = z.infer<typeof insertLmsSkillVerificationSchema>;
export type LmsSkillVerification = typeof lmsSkillVerifications.$inferSelect;

// ============================================================================
// CMMS (COMPUTERIZED MAINTENANCE MANAGEMENT SYSTEM) TABLES
// Work orders, preventive maintenance, parts inventory, technician management
// ============================================================================

// Work order priority enum
export const workOrderPriorityEnum = pgEnum("work_order_priority", ["low", "medium", "high", "critical"]);

// Work order status enum  
export const workOrderStatusEnum = pgEnum("work_order_status", [
  "new",           // Newly created, not yet started
  "in_progress",   // Work is actively being done
  "waiting_parts", // Work paused - waiting for parts
  "waiting_tech",  // Work paused - waiting for technician availability
  "on_hold",       // Work paused - other reason
  "completed",     // Work finished successfully
  "cancelled"      // Work order cancelled
]);

// Work order type enum
export const workOrderTypeEnum = pgEnum("work_order_type", ["corrective", "preventive", "inspection", "emergency", "project", "repair"]);

// Maintenance frequency enum
export const maintenanceFrequencyEnum = pgEnum("maintenance_frequency", ["daily", "weekly", "biweekly", "monthly", "quarterly", "semiannual", "annual", "custom"]);

// Asset categories for organization
export const maintenanceAssetCategories = pgTable("maintenance_asset_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  icon: varchar("icon"), // Lucide icon name
  color: varchar("color"), // Tailwind color
  parentId: varchar("parent_id"), // For hierarchical categories
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMaintenanceAssetCategorySchema = createInsertSchema(maintenanceAssetCategories).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMaintenanceAssetCategory = z.infer<typeof insertMaintenanceAssetCategorySchema>;
export type MaintenanceAssetCategory = typeof maintenanceAssetCategories.$inferSelect;

// Assets - equipment and facilities tracked for maintenance
export const maintenanceAssets = pgTable("maintenance_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetNumber: varchar("asset_number").notNull().unique(), // Internal tracking number
  name: varchar("name").notNull(),
  description: text("description"),
  categoryId: varchar("category_id").references(() => maintenanceAssetCategories.id),
  locationId: varchar("location_id").references(() => sharedLocations.id),
  manufacturer: varchar("manufacturer"),
  model: varchar("model"),
  serialNumber: varchar("serial_number"),
  purchaseDate: timestamp("purchase_date"),
  purchaseCost: decimal("purchase_cost", { precision: 10, scale: 2 }),
  warrantyExpires: timestamp("warranty_expires"),
  expectedLifeYears: integer("expected_life_years"),
  status: varchar("status").notNull().default("operational"), // operational, maintenance, retired, disposed
  criticality: varchar("criticality").notNull().default("medium"), // low, medium, high, critical
  imageUrl: text("image_url"),
  qrCode: varchar("qr_code"), // For mobile scanning
  specifications: jsonb("specifications"), // Technical specs
  documentUrls: text("document_urls").array(), // Manuals, SOPs
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_maint_asset_category").on(table.categoryId),
  index("idx_maint_asset_location").on(table.locationId),
  index("idx_maint_asset_status").on(table.status),
  index("idx_maint_asset_number").on(table.assetNumber),
]);

export const insertMaintenanceAssetSchema = createInsertSchema(maintenanceAssets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMaintenanceAsset = z.infer<typeof insertMaintenanceAssetSchema>;
export type MaintenanceAsset = typeof maintenanceAssets.$inferSelect;

// Maintenance Locations - dedicated locations for maintenance work
export const maintenanceLocations = pgTable("maintenance_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  locationType: varchar("location_type"), // building, room, area, floor, zone
  building: varchar("building"),
  floor: varchar("floor"),
  room: varchar("room"),
  address: text("address"),
  contactName: varchar("contact_name"),
  contactPhone: varchar("contact_phone"),
  contactEmail: varchar("contact_email"),
  parentLocationId: varchar("parent_location_id"), // For hierarchical locations
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_maint_loc_name").on(table.name),
  index("idx_maint_loc_active").on(table.isActive),
]);

export const insertMaintenanceLocationSchema = createInsertSchema(maintenanceLocations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMaintenanceLocation = z.infer<typeof insertMaintenanceLocationSchema>;
export type MaintenanceLocation = typeof maintenanceLocations.$inferSelect;

// Technicians - maintenance staff with skills (internal or external contractors)
export const maintenanceTechnicians = pgTable("maintenance_technicians", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Internal employee link (optional for external contractors)
  userId: varchar("user_id").references(() => platformUsers.id, { onDelete: 'set null' }),
  
  // Basic info (used for external or when not linked to platform user)
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  employeeNumber: varchar("employee_number"),
  
  // Is this an internal employee or external contractor?
  isExternal: boolean("is_external").notNull().default(false),
  
  // Company info (for external contractors)
  companyName: varchar("company_name"),
  companyAddress: text("company_address"),
  companyCity: varchar("company_city"),
  companyState: varchar("company_state"),
  companyZip: varchar("company_zip"),
  companyPhone: varchar("company_phone"),
  
  // Contact information
  email: varchar("email"),
  cellPhone: varchar("cell_phone"),
  workPhone: varchar("work_phone"),
  
  // Professional info
  skills: text("skills").array(), // e.g., ['electrical', 'plumbing', 'hvac']
  certifications: jsonb("certifications"), // Array of {name, issuedDate, expiresDate}
  specialties: text("specialties"), // Free text for specialty areas
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  shiftSchedule: varchar("shift_schedule"), // day, night, rotating
  primaryLocationId: varchar("primary_location_id").references(() => maintenanceLocations.id), // Primary location
  
  // Status
  available: boolean("available").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  isSupervisor: boolean("is_supervisor").notNull().default(false),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_tech_user").on(table.userId),
  index("idx_tech_location").on(table.primaryLocationId),
  index("idx_tech_external").on(table.isExternal),
  index("idx_tech_active").on(table.isActive),
  index("idx_tech_supervisor").on(table.isSupervisor),
]);

export const insertMaintenanceTechnicianSchema = createInsertSchema(maintenanceTechnicians).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMaintenanceTechnician = z.infer<typeof insertMaintenanceTechnicianSchema>;
export type MaintenanceTechnician = typeof maintenanceTechnicians.$inferSelect;

// Work Orders - maintenance tasks and repairs
export const maintenanceWorkOrders = pgTable("maintenance_work_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workOrderNumber: varchar("work_order_number").notNull().unique(),
  title: varchar("title").notNull(),
  description: text("description"),
  assetId: varchar("asset_id").references(() => maintenanceAssets.id),
  locationId: varchar("location_id").references(() => sharedLocations.id),
  maintenanceLocationId: varchar("maintenance_location_id").references(() => maintenanceLocations.id),
  department: varchar("department"), // Department (linked to daily reports departments)
  workOrderType: workOrderTypeEnum("work_order_type").notNull().default("corrective"),
  priority: workOrderPriorityEnum("priority").notNull().default("medium"),
  status: workOrderStatusEnum("status").notNull().default("new"),
  
  // Assignment
  requestedById: varchar("requested_by_id").references(() => platformUsers.id),
  assignedToId: varchar("assigned_to_id").references(() => platformUsers.id),
  maintenanceTechnicianId: varchar("maintenance_technician_id").references(() => maintenanceTechnicians.id),
  assignedTeam: varchar("assigned_team"), // For team assignments
  
  // Notification settings
  notificationEmail: varchar("notification_email"), // Email to send work order notification
  notificationSent: boolean("notification_sent").notNull().default(false),
  notificationSentAt: timestamp("notification_sent_at"),
  
  // Scheduling
  dueDate: timestamp("due_date"),
  scheduledStart: timestamp("scheduled_start"),
  scheduledEnd: timestamp("scheduled_end"),
  actualStart: timestamp("actual_start"),
  actualEnd: timestamp("actual_end"),
  estimatedHours: decimal("estimated_hours", { precision: 6, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 6, scale: 2 }),
  
  // Costs
  laborCost: decimal("labor_cost", { precision: 10, scale: 2 }),
  partsCost: decimal("parts_cost", { precision: 10, scale: 2 }),
  externalCost: decimal("external_cost", { precision: 10, scale: 2 }),
  
  // Completion
  completedById: varchar("completed_by_id").references(() => platformUsers.id),
  completionNotes: text("completion_notes"),
  failureReason: text("failure_reason"),
  
  // Checklists and procedures
  checklistItems: jsonb("checklist_items"), // Array of {item, checked, notes}
  instructions: text("instructions"),
  attachmentUrls: text("attachment_urls").array(),
  
  // Preventive maintenance link
  preventiveMaintenanceId: varchar("preventive_maintenance_id"), // Links to PM schedule
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_wo_asset").on(table.assetId),
  index("idx_wo_status").on(table.status),
  index("idx_wo_priority").on(table.priority),
  index("idx_wo_assigned").on(table.assignedToId),
  index("idx_wo_due_date").on(table.dueDate),
  index("idx_wo_number").on(table.workOrderNumber),
]);

export const insertMaintenanceWorkOrderSchema = createInsertSchema(maintenanceWorkOrders).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMaintenanceWorkOrder = z.infer<typeof insertMaintenanceWorkOrderSchema>;
export type MaintenanceWorkOrder = typeof maintenanceWorkOrders.$inferSelect;

// Work Order Progress Notes - detailed tracking of work progress and status changes
export const maintenanceWorkOrderNotes = pgTable("maintenance_work_order_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workOrderId: varchar("work_order_id").notNull().references(() => maintenanceWorkOrders.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").references(() => platformUsers.id),
  technicianId: varchar("technician_id").references(() => maintenanceTechnicians.id),
  
  // Note type for filtering/categorization
  noteType: varchar("note_type").notNull().default("progress"), // progress, status_change, action_taken, parts_used, issue_found
  
  // Content
  title: varchar("title"), // Brief summary
  content: text("content").notNull(), // Detailed note
  
  // Status change tracking
  previousStatus: workOrderStatusEnum("previous_status"),
  newStatus: workOrderStatusEnum("new_status"),
  
  // Time tracking for this entry
  hoursWorked: decimal("hours_worked", { precision: 6, scale: 2 }),
  
  // Attachments (photos of work, receipts, etc.)
  attachmentUrls: text("attachment_urls").array(),
  
  isSystemGenerated: boolean("is_system_generated").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_wo_note_wo").on(table.workOrderId),
  index("idx_wo_note_type").on(table.noteType),
  index("idx_wo_note_tech").on(table.technicianId),
]);

export const insertMaintenanceWorkOrderNoteSchema = createInsertSchema(maintenanceWorkOrderNotes).omit({ id: true, createdAt: true });
export type InsertMaintenanceWorkOrderNote = z.infer<typeof insertMaintenanceWorkOrderNoteSchema>;
export type MaintenanceWorkOrderNote = typeof maintenanceWorkOrderNotes.$inferSelect;

// Work Order Comments - activity log and communication (legacy, kept for compatibility)
export const maintenanceWorkOrderComments = pgTable("maintenance_work_order_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workOrderId: varchar("work_order_id").notNull().references(() => maintenanceWorkOrders.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").references(() => platformUsers.id),
  comment: text("comment").notNull(),
  isSystemGenerated: boolean("is_system_generated").notNull().default(false),
  attachmentUrls: text("attachment_urls").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_wo_comment_wo").on(table.workOrderId),
]);

export const insertMaintenanceWorkOrderCommentSchema = createInsertSchema(maintenanceWorkOrderComments).omit({ id: true, createdAt: true });
export type InsertMaintenanceWorkOrderComment = z.infer<typeof insertMaintenanceWorkOrderCommentSchema>;
export type MaintenanceWorkOrderComment = typeof maintenanceWorkOrderComments.$inferSelect;

// Preventive Maintenance Schedules - recurring maintenance tasks
export const maintenancePreventiveSchedules = pgTable("maintenance_preventive_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  assetId: varchar("asset_id").references(() => maintenanceAssets.id),
  categoryId: varchar("category_id").references(() => maintenanceAssetCategories.id), // Or apply to category
  
  // Schedule settings
  frequency: maintenanceFrequencyEnum("frequency").notNull().default("monthly"),
  customDays: integer("custom_days"), // For custom frequency
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"), // Optional end date
  lastGenerated: timestamp("last_generated"),
  nextDue: timestamp("next_due"),
  
  // Work order template
  workOrderTitle: varchar("work_order_title").notNull(),
  workOrderDescription: text("work_order_description"),
  workOrderPriority: workOrderPriorityEnum("work_order_priority").notNull().default("medium"),
  estimatedHours: decimal("estimated_hours", { precision: 6, scale: 2 }),
  assignedToId: varchar("assigned_to_id").references(() => platformUsers.id),
  maintenanceTechnicianId: varchar("maintenance_technician_id").references(() => maintenanceTechnicians.id),
  maintenanceLocationId: varchar("maintenance_location_id").references(() => maintenanceLocations.id),
  assignedTeam: varchar("assigned_team"),
  checklistItems: jsonb("checklist_items"),
  instructions: text("instructions"),
  
  // Settings
  generateDaysAhead: integer("generate_days_ahead").notNull().default(7), // Create WO X days before due
  active: boolean("active").notNull().default(true),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_pm_asset").on(table.assetId),
  index("idx_pm_next_due").on(table.nextDue),
  index("idx_pm_active").on(table.active),
]);

export const insertMaintenancePreventiveScheduleSchema = createInsertSchema(maintenancePreventiveSchedules).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMaintenancePreventiveSchedule = z.infer<typeof insertMaintenancePreventiveScheduleSchema>;
export type MaintenancePreventiveSchedule = typeof maintenancePreventiveSchedules.$inferSelect;

// Parts/Inventory - spare parts tracking
export const maintenanceParts = pgTable("maintenance_parts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partNumber: varchar("part_number").notNull().unique(),
  name: varchar("name").notNull(),
  description: text("description"),
  category: varchar("category"),
  locationId: varchar("location_id").references(() => sharedLocations.id), // Storage location
  binLocation: varchar("bin_location"), // Specific storage bin/shelf
  
  // Stock levels
  quantityOnHand: integer("quantity_on_hand").notNull().default(0),
  minimumStock: integer("minimum_stock").notNull().default(0),
  reorderPoint: integer("reorder_point").notNull().default(0),
  reorderQuantity: integer("reorder_quantity").notNull().default(1),
  
  // Costs
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }),
  totalValue: decimal("total_value", { precision: 10, scale: 2 }), // Computed
  
  // Supplier info
  preferredVendor: varchar("preferred_vendor"),
  vendorPartNumber: varchar("vendor_part_number"),
  leadTimeDays: integer("lead_time_days"),
  
  // Tracking
  lastRestocked: timestamp("last_restocked"),
  lastUsed: timestamp("last_used"),
  imageUrl: text("image_url"),
  active: boolean("active").notNull().default(true),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_part_number").on(table.partNumber),
  index("idx_part_category").on(table.category),
  index("idx_part_location").on(table.locationId),
]);

export const insertMaintenancePartSchema = createInsertSchema(maintenanceParts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMaintenancePart = z.infer<typeof insertMaintenancePartSchema>;
export type MaintenancePart = typeof maintenanceParts.$inferSelect;

// Parts Usage - tracking parts used in work orders
export const maintenancePartsUsage = pgTable("maintenance_parts_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workOrderId: varchar("work_order_id").notNull().references(() => maintenanceWorkOrders.id, { onDelete: 'cascade' }),
  partId: varchar("part_id").notNull().references(() => maintenanceParts.id),
  quantity: integer("quantity").notNull().default(1),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }),
  usedById: varchar("used_by_id").references(() => platformUsers.id),
  usedAt: timestamp("used_at").notNull().defaultNow(),
  notes: text("notes"),
}, (table) => [
  index("idx_parts_usage_wo").on(table.workOrderId),
  index("idx_parts_usage_part").on(table.partId),
]);

export const insertMaintenancePartsUsageSchema = createInsertSchema(maintenancePartsUsage).omit({ id: true, usedAt: true });
export type InsertMaintenancePartsUsage = z.infer<typeof insertMaintenancePartsUsageSchema>;
export type MaintenancePartsUsage = typeof maintenancePartsUsage.$inferSelect;

// Asset-Part Links - which parts are used for which assets
export const maintenanceAssetParts = pgTable("maintenance_asset_parts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").notNull().references(() => maintenanceAssets.id, { onDelete: 'cascade' }),
  partId: varchar("part_id").notNull().references(() => maintenanceParts.id, { onDelete: 'cascade' }),
  recommendedQuantity: integer("recommended_quantity").notNull().default(1),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique().on(table.assetId, table.partId),
  index("idx_asset_parts_asset").on(table.assetId),
  index("idx_asset_parts_part").on(table.partId),
]);

export const insertMaintenanceAssetPartSchema = createInsertSchema(maintenanceAssetParts).omit({ id: true, createdAt: true });
export type InsertMaintenanceAssetPart = z.infer<typeof insertMaintenanceAssetPartSchema>;
export type MaintenanceAssetPart = typeof maintenanceAssetParts.$inferSelect;

// Maintenance Meters - for tracking usage-based maintenance (hours, miles, etc.)
export const maintenanceMeters = pgTable("maintenance_meters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").notNull().references(() => maintenanceAssets.id, { onDelete: 'cascade' }),
  name: varchar("name").notNull(), // e.g., "Operating Hours", "Miles", "Cycles"
  unit: varchar("unit").notNull(), // hours, miles, km, cycles
  currentReading: decimal("current_reading", { precision: 12, scale: 2 }).notNull().default("0"),
  lastReadingDate: timestamp("last_reading_date"),
  averageDailyUsage: decimal("average_daily_usage", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_meter_asset").on(table.assetId),
]);

export const insertMaintenanceMeterSchema = createInsertSchema(maintenanceMeters).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMaintenanceMeter = z.infer<typeof insertMaintenanceMeterSchema>;
export type MaintenanceMeter = typeof maintenanceMeters.$inferSelect;

// Meter Readings - historical meter reading log
export const maintenanceMeterReadings = pgTable("maintenance_meter_readings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meterId: varchar("meter_id").notNull().references(() => maintenanceMeters.id, { onDelete: 'cascade' }),
  reading: decimal("reading", { precision: 12, scale: 2 }).notNull(),
  readingDate: timestamp("reading_date").notNull().defaultNow(),
  recordedById: varchar("recorded_by_id").references(() => platformUsers.id),
  notes: text("notes"),
}, (table) => [
  index("idx_meter_reading_meter").on(table.meterId),
  index("idx_meter_reading_date").on(table.readingDate),
]);

export const insertMaintenanceMeterReadingSchema = createInsertSchema(maintenanceMeterReadings).omit({ id: true, readingDate: true });
export type InsertMaintenanceMeterReading = z.infer<typeof insertMaintenanceMeterReadingSchema>;
export type MaintenanceMeterReading = typeof maintenanceMeterReadings.$inferSelect;

// ==========================================
// DAILY PROCEDURES MODULE
// ==========================================

// Response types for procedure items
export const procedureResponseTypeEnum = pgEnum("procedure_response_type", [
  "checkbox",
  "text",
  "number",
  "yes_no",
  "dropdown"
]);

// Day of week flags for procedure scheduling
export const procedureDayOfWeekType = z.object({
  monday: z.boolean().default(true),
  tuesday: z.boolean().default(true),
  wednesday: z.boolean().default(true),
  thursday: z.boolean().default(true),
  friday: z.boolean().default(true),
  saturday: z.boolean().default(true),
  sunday: z.boolean().default(true),
});

// Procedure Templates - The main procedure definition
export const proceduresTemplates = pgTable("procedures_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  procedureCode: varchar("procedure_code", { length: 50 }).notNull().unique(), // e.g., RET_OPEN, RET_CLOSE
  procedureName: text("procedure_name").notNull(), // e.g., "Retail Opening"
  department: varchar("department").notNull(), // Links to daily report departments
  procedureType: varchar("procedure_type").notNull().default("general"), // opening, closing, general
  description: text("description"),
  daysOfWeek: jsonb("days_of_week").notNull().default({}), // { monday: true, tuesday: true, ... }
  emailRecipientsTo: text("email_recipients_to").array(), // Array of email addresses
  emailRecipientsCc: text("email_recipients_cc").array(), // Optional CC recipients
  assignedStaffIds: text("assigned_staff_ids").array(), // Array of procedures_staff IDs
  completionTime: varchar("completion_time", { length: 5 }), // Optional deadline time in "HH:MM" format (e.g., "08:00")
  isMandatory: boolean("is_mandatory").notNull().default(false), // If true, missing submissions trigger email alerts
  isActive: boolean("is_active").notNull().default(true),
  createdById: varchar("created_by_id").references(() => platformUsers.id),
  createdByName: text("created_by_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_proc_templates_dept").on(table.department),
  index("idx_proc_templates_type").on(table.procedureType),
  index("idx_proc_templates_active").on(table.isActive),
]);

export const insertProceduresTemplateSchema = createInsertSchema(proceduresTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProceduresTemplate = z.infer<typeof insertProceduresTemplateSchema>;
export type ProceduresTemplate = typeof proceduresTemplates.$inferSelect;

// Procedure Items - Checklist tasks within a procedure template
export const proceduresItems = pgTable("procedures_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => proceduresTemplates.id, { onDelete: 'cascade' }),
  label: text("label").notNull(), // e.g., "Turn on lights"
  description: text("description"), // Optional instructions
  sortOrder: integer("sort_order").notNull().default(0),
  isRequired: boolean("is_required").notNull().default(true),
  requireInitials: boolean("require_initials").notNull().default(false),
  requireComment: boolean("require_comment").notNull().default(false),
  responseType: varchar("response_type").notNull().default("checkbox"), // checkbox, text, number, yes_no, dropdown
  dropdownOptions: text("dropdown_options").array(), // Options if responseType is dropdown
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_proc_items_template").on(table.templateId),
  index("idx_proc_items_order").on(table.sortOrder),
]);

export const insertProceduresItemSchema = createInsertSchema(proceduresItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProceduresItem = z.infer<typeof insertProceduresItemSchema>;
export type ProceduresItem = typeof proceduresItems.$inferSelect;

// Procedure Users - PIN-based user assignments
export const proceduresUsers = pgTable("procedures_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  displayName: text("display_name").notNull(),
  pinCode: varchar("pin_code", { length: 10 }).notNull(), // e.g., 1111
  assignedProcedureCodes: text("assigned_procedure_codes").array(), // Array of procedure codes
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdById: varchar("created_by_id").references(() => platformUsers.id),
  createdByName: text("created_by_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_proc_users_pin").on(table.pinCode),
  index("idx_proc_users_active").on(table.isActive),
  unique("uq_proc_users_pin").on(table.pinCode), // PIN must be unique
]);

export const insertProceduresUserSchema = createInsertSchema(proceduresUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
});
export type InsertProceduresUser = z.infer<typeof insertProceduresUserSchema>;
export type ProceduresUser = typeof proceduresUsers.$inferSelect;

// Procedure Submissions - Completed procedure records
export const proceduresSubmissions = pgTable("procedures_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => proceduresTemplates.id),
  procedureCode: varchar("procedure_code", { length: 50 }).notNull(), // Denormalized for reporting
  department: varchar("department").notNull(), // Denormalized for reporting
  submittedByUserId: varchar("submitted_by_user_id").references(() => proceduresUsers.id),
  submittedByName: text("submitted_by_name").notNull(),
  submissionDate: timestamp("submission_date").notNull().defaultNow(), // Date the procedure was for
  dateTimeStarted: timestamp("datetime_started"),
  dateTimeSubmitted: timestamp("datetime_submitted").notNull().defaultNow(),
  status: varchar("status").notNull().default("submitted"), // draft, submitted
  answers: jsonb("answers").notNull().default({}), // { itemId: { value, initials, comment } }
  notes: text("notes"), // Optional overall notes
  lateReason: text("late_reason"), // Explanation if submitted after completion time deadline
  emailSentStatus: varchar("email_sent_status").default("pending"), // pending, success, failed
  emailSentAt: timestamp("email_sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_proc_submissions_template").on(table.templateId),
  index("idx_proc_submissions_dept").on(table.department),
  index("idx_proc_submissions_date").on(table.submissionDate),
  index("idx_proc_submissions_user").on(table.submittedByUserId),
  index("idx_proc_submissions_status").on(table.status),
]);

export const insertProceduresSubmissionSchema = createInsertSchema(proceduresSubmissions).omit({
  id: true,
  createdAt: true,
  emailSentAt: true,
});
export type InsertProceduresSubmission = z.infer<typeof insertProceduresSubmissionSchema>;
export type ProceduresSubmission = typeof proceduresSubmissions.$inferSelect;

// Procedures Staff - Staff members who can complete procedures (separate from Daily Reports staff)
export const proceduresStaff = pgTable("procedures_staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffName: varchar("staff_name").notNull(),
  code: varchar("code", { length: 10 }).notNull(), // Staff access code
  department: varchar("department"), // Optional department association
  isActive: boolean("is_active").notNull().default(true),
  createdById: varchar("created_by_id"),
  createdByName: varchar("created_by_name"),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_proc_staff_code").on(table.code),
  index("idx_proc_staff_active").on(table.isActive),
  unique("uq_proc_staff_code").on(table.code),
]);

export const insertProceduresStaffSchema = createInsertSchema(proceduresStaff).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  lastUsedAt: true
});
export type InsertProceduresStaff = z.infer<typeof insertProceduresStaffSchema>;
export type ProceduresStaff = typeof proceduresStaff.$inferSelect;

// Type for procedure template with items and staff
export type ProceduresTemplateWithItems = ProceduresTemplate & {
  items: ProceduresItem[];
  assignedStaff?: ProceduresStaff[];
};

// ============================================
// SPOT INVENTORY CHECK MODULE
// ============================================

// Spot Inventory Locations - Physical locations for inventory counts
export const spotInventoryLocations = pgTable("spot_inventory_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  address: text("address"),
  accessCode: varchar("access_code"), // Unique code for staff to access this location
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_spot_inv_loc_active").on(table.isActive),
]);

export const insertSpotInventoryLocationSchema = createInsertSchema(spotInventoryLocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSpotInventoryLocation = z.infer<typeof insertSpotInventoryLocationSchema>;
export type SpotInventoryLocation = typeof spotInventoryLocations.$inferSelect;

// Spot Inventory Areas - Areas within locations (e.g., "Front Shelf", "Wine Wall")
export const spotInventoryAreas = pgTable("spot_inventory_areas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull().references(() => spotInventoryLocations.id, { onDelete: 'cascade' }),
  name: varchar("name").notNull(),
  description: text("description"),
  photoUrl: text("photo_url"), // Photo of the area for clarity
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_spot_inv_area_location").on(table.locationId),
  index("idx_spot_inv_area_active").on(table.isActive),
]);

export const insertSpotInventoryAreaSchema = createInsertSchema(spotInventoryAreas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSpotInventoryArea = z.infer<typeof insertSpotInventoryAreaSchema>;
export type SpotInventoryArea = typeof spotInventoryAreas.$inferSelect;

// Spot Inventory Sessions - Individual counting sessions by staff
export const spotInventorySessions = pgTable("spot_inventory_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  areaId: varchar("area_id").notNull().references(() => spotInventoryAreas.id, { onDelete: 'cascade' }),
  locationId: varchar("location_id").notNull().references(() => spotInventoryLocations.id),
  staffName: varchar("staff_name").notNull(), // Name entered by staff (no foreign key, location-code based auth)
  status: varchar("status").notNull().default("in_progress"), // in_progress, completed, cancelled
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_spot_inv_session_area").on(table.areaId),
  index("idx_spot_inv_session_location").on(table.locationId),
  index("idx_spot_inv_session_status").on(table.status),
  index("idx_spot_inv_session_completed").on(table.completedAt),
]);

export const insertSpotInventorySessionSchema = createInsertSchema(spotInventorySessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSpotInventorySession = z.infer<typeof insertSpotInventorySessionSchema>;
export type SpotInventorySession = typeof spotInventorySessions.$inferSelect;

// Spot Inventory Counts - Individual product counts within a session
export const spotInventoryCounts = pgTable("spot_inventory_counts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => spotInventorySessions.id, { onDelete: 'cascade' }),
  productId: varchar("product_id").notNull().references(() => products.id),
  productName: varchar("product_name").notNull(), // Denormalized for reporting
  sku: varchar("sku"), // Denormalized for reporting
  quantity: integer("quantity").notNull(),
  scannedAt: timestamp("scanned_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_spot_inv_count_session").on(table.sessionId),
  index("idx_spot_inv_count_product").on(table.productId),
]);

export const insertSpotInventoryCountSchema = createInsertSchema(spotInventoryCounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSpotInventoryCount = z.infer<typeof insertSpotInventoryCountSchema>;
export type SpotInventoryCount = typeof spotInventoryCounts.$inferSelect;

// Type for session with counts
export type SpotInventorySessionWithCounts = SpotInventorySession & {
  counts: SpotInventoryCount[];
  area?: SpotInventoryArea;
};

// Type for area with location
export type SpotInventoryAreaWithLocation = SpotInventoryArea & {
  location?: SpotInventoryLocation;
};

// ============================================
// CUSTOMER SUPPORT MODULE
// ============================================

// Support Requests - Customer inquiries submitted via the support widget
export const supportRequests = pgTable("support_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerName: varchar("customer_name"),
  customerEmail: varchar("customer_email"),
  customerPhone: varchar("customer_phone"),
  subject: text("subject"),
  initialMessage: text("initial_message").notNull(),
  status: varchar("status").notNull().default("new"), // new, bot_responded, human_responded, closed
  priority: varchar("priority").default("normal"), // low, normal, high, urgent
  assignedToId: varchar("assigned_to_id"),
  assignedToName: varchar("assigned_to_name"),
  botResponseConfidence: decimal("bot_response_confidence", { precision: 5, scale: 2 }), // 0-100
  sourcesUsed: jsonb("sources_used").default([]), // Array of source IDs/URLs used for bot response
  tags: text("tags").array().default([]),
  source: varchar("source").notNull().default("widget"), // widget, email, api
  emailMessageId: varchar("email_message_id"), // For email thread tracking
  emailThreadId: varchar("email_thread_id"), // Groups related emails
  aiDraft: text("ai_draft"), // Auto-generated AI draft response
  aiDraftGeneratedAt: timestamp("ai_draft_generated_at"), // When the AI draft was generated
  closedAt: timestamp("closed_at"),
  closedById: varchar("closed_by_id"),
  closedByName: varchar("closed_by_name"),
  assignedAgentId: varchar("assigned_agent_id"),
  agentNotificationSentAt: timestamp("agent_notification_sent_at"), // When email notification was sent to assigned agent
  lastReminderSentAt: timestamp("last_reminder_sent_at"),
  reminderCount: integer("reminder_count").notNull().default(0),
  escalatedAt: timestamp("escalated_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_support_req_status").on(table.status),
  index("idx_support_req_email").on(table.customerEmail),
  index("idx_support_req_created").on(table.createdAt),
  index("idx_support_req_assigned").on(table.assignedToId),
  index("idx_support_req_email_msg").on(table.emailMessageId),
  index("idx_support_req_email_thread").on(table.emailThreadId),
]);

export const insertSupportRequestSchema = createInsertSchema(supportRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  closedAt: true,
});
export type InsertSupportRequest = z.infer<typeof insertSupportRequestSchema>;
export type SupportRequest = typeof supportRequests.$inferSelect;

// Support Messages - Thread of messages for each request (bot + human responses)
export const supportMessages = pgTable("support_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").notNull().references(() => supportRequests.id, { onDelete: 'cascade' }),
  senderType: varchar("sender_type").notNull(), // customer, bot, agent
  senderName: varchar("sender_name"),
  senderId: varchar("sender_id"), // User ID if agent
  content: text("content").notNull(),
  isInternal: boolean("is_internal").notNull().default(false), // Internal notes not visible to customer
  metadata: jsonb("metadata").default({}), // Additional data like confidence scores, sources
  emailMessageId: varchar("email_message_id"), // Message-ID header for email dedup
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_support_msg_request").on(table.requestId),
  index("idx_support_msg_created").on(table.createdAt),
  index("idx_support_msg_email").on(table.emailMessageId),
]);

export const insertSupportMessageSchema = createInsertSchema(supportMessages).omit({
  id: true,
  createdAt: true,
});
export type InsertSupportMessage = z.infer<typeof insertSupportMessageSchema>;
export type SupportMessage = typeof supportMessages.$inferSelect;

// Support Attachments - Files attached to support messages (from emails or uploads)
// Note: File content is stored as data URL in storageUrl field (data:mime;base64,content)
export const supportAttachments = pgTable("support_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull().references(() => supportMessages.id, { onDelete: 'cascade' }),
  requestId: varchar("request_id").notNull().references(() => supportRequests.id, { onDelete: 'cascade' }),
  fileName: varchar("file_name").notNull(),
  mimeType: varchar("mime_type").notNull(),
  fileSize: integer("file_size").notNull(), // bytes
  storageUrl: text("storage_url").notNull(), // URL to object storage OR data URL with base64 content
  storageKey: varchar("storage_key"), // Object storage key for deletion
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_support_attach_msg").on(table.messageId),
  index("idx_support_attach_req").on(table.requestId),
]);


export const insertSupportAttachmentSchema = createInsertSchema(supportAttachments).omit({
  id: true,
  createdAt: true,
});
export type InsertSupportAttachment = z.infer<typeof insertSupportAttachmentSchema>;
export type SupportAttachment = typeof supportAttachments.$inferSelect;

// Support Canned Responses - Pre-written Q&A pairs for the bot
export const supportCannedResponses = pgTable("support_canned_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(), // Short title for admin reference
  keywords: text("keywords").array().default([]), // Keywords to match against
  questionPatterns: text("question_patterns").array().default([]), // Example questions this answers
  answer: text("answer").notNull(), // The response content
  category: varchar("category"), // Optional category grouping
  priority: integer("priority").notNull().default(0), // Higher = more likely to be used
  isActive: boolean("is_active").notNull().default(true),
  usageCount: integer("usage_count").notNull().default(0),
  lastUsedAt: timestamp("last_used_at"),
  createdById: varchar("created_by_id"),
  createdByName: varchar("created_by_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_support_canned_active").on(table.isActive),
  index("idx_support_canned_category").on(table.category),
]);

export const insertSupportCannedResponseSchema = createInsertSchema(supportCannedResponses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  usageCount: true,
  lastUsedAt: true,
});
export type InsertSupportCannedResponse = z.infer<typeof insertSupportCannedResponseSchema>;
export type SupportCannedResponse = typeof supportCannedResponses.$inferSelect;

// Support Web Sources - Website URLs/content for the bot to reference
export const supportWebSources = pgTable("support_web_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  url: text("url"), // Website URL to reference
  content: text("content"), // Manual content/snippet (for when URL isn't available)
  summary: text("summary"), // Brief summary for quick matching
  category: varchar("category"),
  isActive: boolean("is_active").notNull().default(true),
  lastFetchedAt: timestamp("last_fetched_at"),
  createdById: varchar("created_by_id"),
  createdByName: varchar("created_by_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_support_web_active").on(table.isActive),
  index("idx_support_web_category").on(table.category),
]);

export const insertSupportWebSourceSchema = createInsertSchema(supportWebSources).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastFetchedAt: true,
});
export type InsertSupportWebSource = z.infer<typeof insertSupportWebSourceSchema>;
export type SupportWebSource = typeof supportWebSources.$inferSelect;

// Support Settings - Module configuration
export const supportSettings = pgTable("support_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  settingKey: varchar("setting_key").notNull().unique(),
  settingValue: text("setting_value"),
  description: text("description"),
  updatedById: varchar("updated_by_id"),
  updatedByName: varchar("updated_by_name"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSupportSettingSchema = createInsertSchema(supportSettings).omit({
  id: true,
  updatedAt: true,
});
export type InsertSupportSetting = z.infer<typeof insertSupportSettingSchema>;
export type SupportSetting = typeof supportSettings.$inferSelect;

// Type for request with messages
export type SupportRequestWithMessages = SupportRequest & {
  messages: SupportMessage[];
};

// Support Categories (used for ticket routing, AI categorization, and knowledge base organization)
export const supportCategories = pgTable("support_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 100 }), // Lucide icon name
  color: varchar("color", { length: 50 }), // Tailwind color class
  tags: text("tags").array().default([]), // Keywords/phrases to help AI categorize incoming requests
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_support_categories_active").on(table.isActive),
  index("idx_support_categories_slug").on(table.slug),
]);

export const insertSupportCategorySchema = createInsertSchema(supportCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSupportCategory = z.infer<typeof insertSupportCategorySchema>;
export type SupportCategory = typeof supportCategories.$inferSelect;

// Knowledge Base Articles
export const supportArticles = pgTable("support_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 500 }).notNull().unique(),
  summary: text("summary"), // Brief excerpt for previews
  content: text("content").notNull(), // Full article content (markdown or HTML)
  categoryId: varchar("category_id").references(() => supportCategories.id, { onDelete: "set null" }),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, published, archived
  isFeatured: boolean("is_featured").notNull().default(false),
  isPublic: boolean("is_public").notNull().default(true), // Show on public FAQ
  searchKeywords: text("search_keywords").array().default([]), // Keywords for AI search
  priority: integer("priority").notNull().default(0), // Higher = more likely to be used by AI
  viewCount: integer("view_count").notNull().default(0),
  helpfulCount: integer("helpful_count").notNull().default(0),
  notHelpfulCount: integer("not_helpful_count").notNull().default(0),
  createdById: varchar("created_by_id"),
  createdByName: varchar("created_by_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  publishedAt: timestamp("published_at"),
}, (table) => [
  index("idx_support_articles_status").on(table.status),
  index("idx_support_articles_category").on(table.categoryId),
  index("idx_support_articles_slug").on(table.slug),
  index("idx_support_articles_featured").on(table.isFeatured),
]);

export const insertSupportArticleSchema = createInsertSchema(supportArticles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  viewCount: true,
  helpfulCount: true,
  notHelpfulCount: true,
});
export type InsertSupportArticle = z.infer<typeof insertSupportArticleSchema>;
export type SupportArticle = typeof supportArticles.$inferSelect;

// Knowledge Base Tags
export const supportTags = pgTable("support_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  color: varchar("color", { length: 50 }), // Optional color for display
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_support_tags_slug").on(table.slug),
]);

export const insertSupportTagSchema = createInsertSchema(supportTags).omit({
  id: true,
  createdAt: true,
});
export type InsertSupportTag = z.infer<typeof insertSupportTagSchema>;
export type SupportTag = typeof supportTags.$inferSelect;

// Article-Tag Junction Table
export const supportArticleTags = pgTable("support_article_tags", {
  articleId: varchar("article_id").notNull().references(() => supportArticles.id, { onDelete: "cascade" }),
  tagId: varchar("tag_id").notNull().references(() => supportTags.id, { onDelete: "cascade" }),
}, (table) => [
  index("idx_support_article_tags_article").on(table.articleId),
  index("idx_support_article_tags_tag").on(table.tagId),
]);

// Article with category and tags for frontend
export type SupportArticleWithRelations = SupportArticle & {
  category?: SupportCategory | null;
  tags?: SupportTag[];
};

// ============ Social Review Monitoring ============

// Social Channels - Connected platform accounts for review monitoring
export const socialChannels = pgTable("social_channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platform: varchar("platform").notNull(), // google, facebook, yelp, tripadvisor
  accountName: varchar("account_name").notNull(), // Display name of the connected account
  externalAccountId: varchar("external_account_id"), // Platform-specific ID
  locationId: varchar("location_id"), // Optional link to locations table
  authStatus: varchar("auth_status").notNull().default("pending"), // pending, connected, expired, error
  accessToken: text("access_token"), // Encrypted OAuth access token
  refreshToken: text("refresh_token"), // Encrypted OAuth refresh token
  tokenExpiresAt: timestamp("token_expires_at"),
  settings: jsonb("settings").default({}), // Platform-specific settings
  lastSyncAt: timestamp("last_sync_at"),
  syncError: text("sync_error"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_social_channels_platform").on(table.platform),
  index("idx_social_channels_status").on(table.authStatus),
]);

export const insertSocialChannelSchema = createInsertSchema(socialChannels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSyncAt: true,
});
export type InsertSocialChannel = z.infer<typeof insertSocialChannelSchema>;
export type SocialChannel = typeof socialChannels.$inferSelect;

// Social Reviews - Reviews imported from connected platforms or email notifications
export const socialReviews = pgTable("social_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id").references(() => socialChannels.id, { onDelete: 'set null' }), // Optional - null for email imports
  platform: varchar("platform").notNull(), // google, facebook, yelp, tripadvisor
  source: varchar("source").notNull().default("manual"), // manual, email, api - how the review was imported
  externalReviewId: varchar("external_review_id"), // Platform-specific review ID
  authorName: varchar("author_name"),
  authorProfileUrl: text("author_profile_url"),
  authorAvatarUrl: text("author_avatar_url"),
  rating: integer("rating"), // 1-5 stars (null if not applicable)
  content: text("content"), // Review text
  reviewUrl: text("review_url"), // Direct link to review on platform
  reviewCreatedAt: timestamp("review_created_at"), // When review was posted on platform
  status: varchar("status").notNull().default("new"), // new, read, responded, archived, flagged
  sentiment: varchar("sentiment"), // positive, neutral, negative (AI-detected)
  requiresResponse: boolean("requires_response").notNull().default(true),
  linkedRequestId: varchar("linked_request_id"), // Link to support_requests if converted
  rawPayload: jsonb("raw_payload").default({}), // Full API response for reference
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_social_reviews_channel").on(table.channelId),
  index("idx_social_reviews_platform").on(table.platform),
  index("idx_social_reviews_status").on(table.status),
  index("idx_social_reviews_created").on(table.reviewCreatedAt),
  index("idx_social_reviews_external").on(table.externalReviewId),
]);

export const insertSocialReviewSchema = createInsertSchema(socialReviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSocialReview = z.infer<typeof insertSocialReviewSchema>;
export type SocialReview = typeof socialReviews.$inferSelect;

// Support Agents - Authorized staff who can review and respond to support tickets
export const supportAgents = pgTable("support_agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platformUserId: varchar("platform_user_id").notNull().references(() => platformUsers.id, { onDelete: 'cascade' }),
  email: varchar("email").notNull(), // Cached from platform user for quick access
  displayName: varchar("display_name").notNull(), // Cached for display
  pinCode: varchar("pin_code", { length: 4 }).notNull(), // 4-digit quick access code
  pinCodeHash: varchar("pin_code_hash"), // Hashed version for security (optional, can be added later)
  isActive: boolean("is_active").notNull().default(true),
  receiveEmailNotifications: boolean("receive_email_notifications").notNull().default(true),
  isDefaultAgent: boolean("is_default_agent").notNull().default(false), // Receives all uncategorized tickets
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_support_agents_user").on(table.platformUserId),
  index("idx_support_agents_active").on(table.isActive),
  index("idx_support_agents_pin").on(table.pinCode),
  unique("uq_support_agents_user").on(table.platformUserId),
  unique("uq_support_agents_pin").on(table.pinCode),
]);

export const insertSupportAgentSchema = createInsertSchema(supportAgents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSupportAgent = z.infer<typeof insertSupportAgentSchema>;
export type SupportAgent = typeof supportAgents.$inferSelect;

// Support Agent Categories - Maps agents to the categories they are leads for
export const supportAgentCategories = pgTable("support_agent_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => supportAgents.id, { onDelete: 'cascade' }),
  categoryId: varchar("category_id").notNull().references(() => supportCategories.id, { onDelete: 'cascade' }),
  isLead: boolean("is_lead").notNull().default(false), // Whether this agent is the lead for this category
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_support_agent_cat_agent").on(table.agentId),
  index("idx_support_agent_cat_category").on(table.categoryId),
  unique("uq_support_agent_category").on(table.agentId, table.categoryId),
]);

export const insertSupportAgentCategorySchema = createInsertSchema(supportAgentCategories).omit({
  id: true,
  createdAt: true,
});
export type InsertSupportAgentCategory = z.infer<typeof insertSupportAgentCategorySchema>;
export type SupportAgentCategory = typeof supportAgentCategories.$inferSelect;

// Support Agent Access Tokens - Short-lived tokens for email link access
export const supportAgentAccessTokens = pgTable("support_agent_access_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => supportAgents.id, { onDelete: 'cascade' }),
  requestId: varchar("request_id").notNull().references(() => supportRequests.id, { onDelete: 'cascade' }),
  token: varchar("token").notNull().unique(), // Signed token for email links
  action: varchar("action").notNull(), // view, forward, spam
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_support_access_token").on(table.token),
  index("idx_support_access_expires").on(table.expiresAt),
]);

// Social Review Responses - Responses sent to reviews
export const socialReviewResponses = pgTable("social_review_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reviewId: varchar("review_id").notNull().references(() => socialReviews.id, { onDelete: 'cascade' }),
  responderUserId: varchar("responder_user_id"),
  responderName: varchar("responder_name"),
  content: text("content").notNull(),
  status: varchar("status").notNull().default("draft"), // draft, pending, sent, failed
  externalResponseId: varchar("external_response_id"), // Platform's ID for the response
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  isAiGenerated: boolean("is_ai_generated").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_social_responses_review").on(table.reviewId),
  index("idx_social_responses_status").on(table.status),
]);

export const insertSocialReviewResponseSchema = createInsertSchema(socialReviewResponses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  sentAt: true,
});
export type InsertSocialReviewResponse = z.infer<typeof insertSocialReviewResponseSchema>;
export type SocialReviewResponse = typeof socialReviewResponses.$inferSelect;

// Social Review with channel info for frontend
export type SocialReviewWithChannel = SocialReview & {
  channel?: SocialChannel | null;
  responses?: SocialReviewResponse[];
};

// Schema aliases for backward compatibility
export const insertLocationSchema = insertResyLocationSchema;
export const insertExperienceSchema = insertResyExperienceSchema;
export const insertReservationSchema = insertResyReservationSchema;
export const insertCustomerSchema = insertResyCustomerSchema;
export const insertClubSchema = insertResyClubSchema;
export const insertTimeSlotSchema = insertResyTimeSlotSchema;
export const insertWaitlistSchema = insertResyWaitlistSchema;
export const insertCustomerVisitSchema = insertResyCustomerVisitSchema;
export const insertMealPeriodSchema = insertResyMealPeriodSchema;
export const insertOperatingHoursSchema = insertResyOperatingHoursSchema;
export const insertSpecialDateSchema = insertResySpecialDateSchema;
export const insertLocationTableSchema = insertResyLocationTableSchema;
export const insertFlowControlSchema = insertResyFlowControlSchema;
export const insertTurnTimeSettingsSchema = insertResyTurnTimeSettingSchema;
export const insertExperienceDiscountSchema = insertResyExperienceDiscountSchema;
export const insertClubExperienceDiscountSchema = insertResyClubExperienceDiscountSchema;
export const insertPrivateEventSchema = insertResyPrivateEventSchema;
export const insertTicketedEventDefinitionSchema = insertResyTicketedEventDefinitionSchema;
export const insertTicketedEventTimeslotSchema = insertResyTicketedEventTimeslotSchema;
export const insertSiteSettingSchema = insertResySiteSettingSchema;
export const insertFooterLinkSchema = insertResyFooterLinkSchema;
export const updateCustomerSchema = updateResyCustomerSchema;
export type UpdateCustomer = UpdateResyCustomer;
