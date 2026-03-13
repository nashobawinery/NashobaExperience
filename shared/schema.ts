import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, boolean, timestamp, jsonb, unique, pgEnum, index, serial, date, numeric, uniqueIndex, real } from "drizzle-orm/pg-core";
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
export const customerTypeEnum = pgEnum("customer_type", ["retail_liquor", "restaurant", "private_club", "other", "distributor"]);
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
  wholesaleOverridePrice: decimal("wholesale_pricing", { precision: 10, scale: 2 }),
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
  isDistributed: boolean("is_distributed").notNull().default(false),
  showOnB2b: boolean("show_on_b2b").notNull().default(true),
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
  commissionType: varchar("commission_type").notNull().default('tiered'),
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
  orderSource: varchar("order_source").default("manual"), // 'manual', 'quickbooks', 'shopify'
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
  productId: varchar("product_id").references(() => products.id),
  productName: text("product_name").notNull(),
  sku: text("sku"),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  unitPriceOverride: decimal("unit_price_override", { precision: 10, scale: 2 }),
  retailPrice: decimal("retail_price", { precision: 10, scale: 2 }).notNull(),
  lineTotal: decimal("line_total", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const b2bPurchaseOrders = pgTable("b2b_purchase_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => b2bCustomers.id),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  poNumber: text("po_number"),
  notes: text("notes"),
  orderId: varchar("order_id").references(() => b2bOrders.id),
  status: varchar("status").notNull().default("pending"),
  uploadedBy: varchar("uploaded_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
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

export const b2bCommissionTiers = pgTable("b2b_commission_tiers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tierName: varchar("tier_name").notNull(),
  minAnnualSales: decimal("min_annual_sales", { precision: 12, scale: 2 }).notNull().default('0'),
  maxAnnualSales: decimal("max_annual_sales", { precision: 12, scale: 2 }),
  ratePercent: decimal("rate_percent", { precision: 5, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
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
  // Compliance tracking fields
  renewalFrequencyDays: integer("renewal_frequency_days"), // How often course must be retaken (null = one-time)
  regulatoryBody: text("regulatory_body"), // e.g., "OSHA", "State Health Dept", "FDA"
  regulatoryReference: text("regulatory_reference"), // e.g., "29 CFR 1910.1030"
  complianceRequired: boolean("compliance_required").notNull().default(false), // Is this mandatory training
  expirationWarningDays: integer("expiration_warning_days").default(30), // Days before expiry to warn
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
// LMS ENHANCED - Training Portal & Department Targeting
// ============================================

// LMS Training Portal Sessions - Staff access via 4-digit codes
export const lmsTrainingPortalSessions = pgTable("lms_training_portal_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => platformUsers.id, { onDelete: "cascade" }),
  sessionToken: varchar("session_token").notNull().unique(),
  accessCode: varchar("access_code", { length: 4 }).notNull(), // 4-digit code used to login
  lastName: text("last_name").notNull(), // Staff last name for verification
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at").notNull(),
  lastActivityAt: timestamp("last_activity_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_lms_portal_sessions_user").on(table.userId),
  index("idx_lms_portal_sessions_token").on(table.sessionToken),
]);

// LMS Staff Training Codes - 4-digit access codes for staff training portal
export const lmsStaffTrainingCodes = pgTable("lms_staff_training_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => platformUsers.id, { onDelete: "cascade" }).unique(),
  accessCode: varchar("access_code", { length: 4 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_lms_staff_codes_user").on(table.userId),
  index("idx_lms_staff_codes_code").on(table.accessCode),
]);

// LMS Course Departments - Links courses to specific departments for targeting
export const lmsCourseDepartments = pgTable("lms_course_departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => lmsCourses.id, { onDelete: "cascade" }),
  department: text("department").notNull(), // Department name/key
  isRequired: boolean("is_required").notNull().default(false), // Is training mandatory for this dept
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique().on(table.courseId, table.department),
  index("idx_lms_course_depts_course").on(table.courseId),
  index("idx_lms_course_depts_dept").on(table.department),
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
export const insertB2bPurchaseOrderSchema = createInsertSchema(b2bPurchaseOrders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertB2bCommissionSchema = createInsertSchema(b2bCommissions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertB2bCommissionTierSchema = createInsertSchema(b2bCommissionTiers).omit({ id: true, createdAt: true, updatedAt: true });
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
export const insertLmsTrainingPortalSessionSchema = createInsertSchema(lmsTrainingPortalSessions).omit({ id: true, createdAt: true });
export const insertLmsStaffTrainingCodeSchema = createInsertSchema(lmsStaffTrainingCodes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLmsCourseDepartmentSchema = createInsertSchema(lmsCourseDepartments).omit({ id: true, createdAt: true });

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

export type InsertB2bPurchaseOrder = z.infer<typeof insertB2bPurchaseOrderSchema>;
export type B2bPurchaseOrder = typeof b2bPurchaseOrders.$inferSelect;

export type InsertB2bCommission = z.infer<typeof insertB2bCommissionSchema>;
export type B2bCommission = typeof b2bCommissions.$inferSelect;

export type InsertB2bCommissionTier = z.infer<typeof insertB2bCommissionTierSchema>;
export type B2bCommissionTier = typeof b2bCommissionTiers.$inferSelect;

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

export type InsertLmsTrainingPortalSession = z.infer<typeof insertLmsTrainingPortalSessionSchema>;
export type LmsTrainingPortalSession = typeof lmsTrainingPortalSessions.$inferSelect;

export type InsertLmsStaffTrainingCode = z.infer<typeof insertLmsStaffTrainingCodeSchema>;
export type LmsStaffTrainingCode = typeof lmsStaffTrainingCodes.$inferSelect;

export type InsertLmsCourseDepartment = z.infer<typeof insertLmsCourseDepartmentSchema>;
export type LmsCourseDepartment = typeof lmsCourseDepartments.$inferSelect;

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
  availableFromTime: varchar("available_from_time", { length: 5 }), // HH:MM format, e.g. "10:00"
  availableUntilTime: varchar("available_until_time", { length: 5 }), // HH:MM format, e.g. "17:00"
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
  bookedByStaffName: text("booked_by_staff_name"),
  specialDateId: varchar("special_date_id"),
  estimatedRevenue: integer("estimated_revenue"),
  actualRevenue: integer("actual_revenue"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertResyPrivateEventSchema = createInsertSchema(resyPrivateEvents).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResyPrivateEvent = z.infer<typeof insertResyPrivateEventSchema>;
export type ResyPrivateEvent = typeof resyPrivateEvents.$inferSelect;

// Resy Event Staff Codes - 4-digit access codes for private event registration portal
export const resyEventStaffCodes = pgTable("resy_event_staff_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 4 }).notNull(),
  staffName: varchar("staff_name").notNull(),
  email: varchar("email"),
  isActive: boolean("is_active").notNull().default(true),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_event_staff_code").on(table.code),
  index("idx_event_staff_active").on(table.isActive),
  unique("uq_event_staff_code").on(table.code),
]);

export const insertResyEventStaffCodeSchema = createInsertSchema(resyEventStaffCodes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUsedAt: true,
});
export type InsertResyEventStaffCode = z.infer<typeof insertResyEventStaffCodeSchema>;
export type ResyEventStaffCode = typeof resyEventStaffCodes.$inferSelect;

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

// Maintenance Locations - dedicated locations for maintenance work (defined before maintenanceAssets to avoid forward reference)
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

// Assets - equipment and facilities tracked for maintenance
export const maintenanceAssets = pgTable("maintenance_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetNumber: varchar("asset_number").notNull().unique(), // Internal tracking number
  name: varchar("name").notNull(),
  description: text("description"),
  categoryId: varchar("category_id").references(() => maintenanceAssetCategories.id),
  locationId: varchar("location_id").references(() => sharedLocations.id),
  maintenanceLocationId: varchar("maintenance_location_id").references(() => maintenanceLocations.id),
  manufacturer: varchar("manufacturer"),
  model: varchar("model"),
  serialNumber: varchar("serial_number"),
  purchaseDate: timestamp("purchase_date"),
  purchaseCost: decimal("purchase_cost", { precision: 10, scale: 2 }),
  warrantyExpires: timestamp("warranty_expires"),
  expectedLifeYears: integer("expected_life_years"),
  yearPurchased: varchar("year_purchased"),
  conditionAtPurchase: varchar("condition_at_purchase"),
  status: varchar("status").notNull().default("operational"), // operational, maintenance, retired, disposed
  criticality: varchar("criticality").notNull().default("medium"), // low, medium, high, critical
  imageUrl: text("image_url"),
  qrCode: varchar("qr_code"), // For mobile scanning
  specifications: jsonb("specifications"), // Technical specs
  documentUrls: text("document_urls").array(), // Manuals, SOPs
  notes: text("notes"),
  // Vendor info - where asset was purchased from
  vendorPurchasedFrom: varchar("vendor_purchased_from"),
  vendorPurchasedPhone: varchar("vendor_purchased_phone"),
  vendorPurchasedEmail: varchar("vendor_purchased_email"),
  // Service vendor info - who services this asset
  serviceVendorName: varchar("service_vendor_name"),
  serviceVendorPhone: varchar("service_vendor_phone"),
  serviceVendorEmail: varchar("service_vendor_email"),
  // Parts vendor info - where to get parts
  partsVendorName: varchar("parts_vendor_name"),
  partsVendorPhone: varchar("parts_vendor_phone"),
  partsVendorEmail: varchar("parts_vendor_email"),
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

// ========================================
// LMS (Learning Management System) Module

// ========================================
// RCC (Revenue Command Center) Module
// ========================================

// RCC Enums
export const rccTaskStatusEnum = pgEnum("rcc_task_status", ["idea", "open", "in_progress", "done", "cancelled"]);
export const rccCampaignStatusEnum = pgEnum("rcc_campaign_status", ["draft", "sent", "completed"]);

// RCC Teams - Groups like "Tasting Room", "Kitchen", "Marketing"
export const rccTeams = pgTable("rcc_teams", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }).default("#6366f1"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRccTeamSchema = createInsertSchema(rccTeams).omit({ id: true, createdAt: true });
export type InsertRccTeam = z.infer<typeof insertRccTeamSchema>;
export type RccTeam = typeof rccTeams.$inferSelect;

// RCC Weeks - The heart of the system: one focus/hook/goal per week
export const rccWeeks = pgTable("rcc_weeks", {
  id: serial("id").primaryKey(),
  weekStart: date("week_start").notNull(),
  weekEnd: date("week_end").notNull(),
  focusStatement: text("focus_statement"),
  hookAngle: text("hook_angle"),
  weeklyGoal: text("weekly_goal"),
  status: varchar("status", { length: 20 }).notNull().default("planning"),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_rcc_weeks_start").on(table.weekStart),
]);

export const insertRccWeekSchema = createInsertSchema(rccWeeks).omit({ id: true, createdAt: true, updatedAt: true, approvedAt: true });
export type InsertRccWeek = z.infer<typeof insertRccWeekSchema>;
export type RccWeek = typeof rccWeeks.$inferSelect;

// RCC Tasks - Ideas that become actionable tasks
export const rccTasks = pgTable("rcc_tasks", {
  id: serial("id").primaryKey(),
  weekId: integer("week_id").references(() => rccWeeks.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: rccTaskStatusEnum("status").notNull().default("idea"),
  ownerId: varchar("owner_id").references(() => users.id),
  teamId: integer("team_id").references(() => rccTeams.id),
  dueDate: date("due_date"),
  priority: integer("priority").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_rcc_tasks_week").on(table.weekId),
  index("idx_rcc_tasks_status").on(table.status),
  index("idx_rcc_tasks_owner").on(table.ownerId),
]);

export const insertRccTaskSchema = createInsertSchema(rccTasks).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRccTask = z.infer<typeof insertRccTaskSchema>;
export type RccTask = typeof rccTasks.$inferSelect;

// RCC Campaigns - Track marketing efforts (channel, message, result)
export const rccCampaigns = pgTable("rcc_campaigns", {
  id: serial("id").primaryKey(),
  weekId: integer("week_id").references(() => rccWeeks.id),
  taskId: integer("task_id").references(() => rccTasks.id),
  channel: varchar("channel", { length: 100 }).notNull(),
  message: text("message"),
  ownerId: varchar("owner_id").references(() => users.id),
  status: rccCampaignStatusEnum("status").notNull().default("draft"),
  sentAt: timestamp("sent_at"),
  result: text("result"),
  reachCount: integer("reach_count"),
  clickCount: integer("click_count"),
  conversionCount: integer("conversion_count"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_rcc_campaigns_week").on(table.weekId),
  index("idx_rcc_campaigns_status").on(table.status),
]);

export const insertRccCampaignSchema = createInsertSchema(rccCampaigns).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRccCampaign = z.infer<typeof insertRccCampaignSchema>;
export type RccCampaign = typeof rccCampaigns.$inferSelect;

// RCC Revenue - Weekly revenue entries (Toast + Shopify + notes)
export const rccRevenue = pgTable("rcc_revenue", {
  id: serial("id").primaryKey(),
  weekId: integer("week_id").notNull().references(() => rccWeeks.id),
  toastTotal: numeric("toast_total", { precision: 12, scale: 2 }),
  shopifyTotal: numeric("shopify_total", { precision: 12, scale: 2 }),
  otherTotal: numeric("other_total", { precision: 12, scale: 2 }),
  notes: text("notes"),
  whatWorked: text("what_worked"),
  whatFlopped: text("what_flopped"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_rcc_revenue_week").on(table.weekId),
]);

export const insertRccRevenueSchema = createInsertSchema(rccRevenue).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRccRevenue = z.infer<typeof insertRccRevenueSchema>;
export type RccRevenue = typeof rccRevenue.$inferSelect;

// RCC Learnings - Track wins and losses for AI learning
export const rccLearnings = pgTable("rcc_learnings", {
  id: serial("id").primaryKey(),
  weekId: integer("week_id").references(() => rccWeeks.id),
  campaignId: integer("campaign_id").references(() => rccCampaigns.id),
  learningType: varchar("learning_type", { length: 20 }).notNull(),
  summary: text("summary").notNull(),
  impact: varchar("impact", { length: 20 }),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_rcc_learnings_week").on(table.weekId),
  index("idx_rcc_learnings_type").on(table.learningType),
]);

export const insertRccLearningSchema = createInsertSchema(rccLearnings).omit({ id: true, createdAt: true });
export type InsertRccLearning = z.infer<typeof insertRccLearningSchema>;
export type RccLearning = typeof rccLearnings.$inferSelect;

// RCC AI Recommendations - Weekly AI-generated advice
export const rccAiRecommendations = pgTable("rcc_ai_recommendations", {
  id: serial("id").primaryKey(),
  weekId: integer("week_id").notNull().references(() => rccWeeks.id),
  prompt: text("prompt"),
  recommendation: text("recommendation").notNull(),
  model: varchar("model", { length: 50 }).default("gpt-4o-mini"),
  tokensUsed: integer("tokens_used"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_rcc_ai_week").on(table.weekId),
]);

export const insertRccAiRecommendationSchema = createInsertSchema(rccAiRecommendations).omit({ id: true, createdAt: true });
export type InsertRccAiRecommendation = z.infer<typeof insertRccAiRecommendationSchema>;
export type RccAiRecommendation = typeof rccAiRecommendations.$inferSelect;

// RCC Toast Historical Revenue - stores daily revenue for year-over-year comparison (Toast + Shopify)
export const rccToastHistoricalRevenue = pgTable("rcc_toast_historical_revenue", {
  id: serial("id").primaryKey(),
  revenueDate: date("revenue_date").notNull(),
  netRevenue: numeric("net_revenue", { precision: 12, scale: 2 }).notNull(),
  shopifyRevenue: numeric("shopify_revenue", { precision: 12, scale: 2 }),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 1=Monday, ..., 6=Saturday
  weekOfYear: integer("week_of_year").notNull(),
  year: integer("year").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_rcc_toast_historical_date").on(table.revenueDate),
  index("idx_rcc_toast_historical_dow_week").on(table.dayOfWeek, table.weekOfYear, table.year),
]);

export const insertRccToastHistoricalRevenueSchema = createInsertSchema(rccToastHistoricalRevenue).omit({ id: true, createdAt: true });
export type InsertRccToastHistoricalRevenue = z.infer<typeof insertRccToastHistoricalRevenueSchema>;
export type RccToastHistoricalRevenue = typeof rccToastHistoricalRevenue.$inferSelect;

// RCC Daily Revenue - stores daily revenue entries with notes and weather for analysis
export const rccDailyRevenue = pgTable("rcc_daily_revenue", {
  id: serial("id").primaryKey(),
  weekId: integer("week_id").notNull().references(() => rccWeeks.id),
  date: date("date").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  toastRevenue: numeric("toast_revenue", { precision: 12, scale: 2 }),
  shopifyRevenue: numeric("shopify_revenue", { precision: 12, scale: 2 }),
  otherRevenue: numeric("other_revenue", { precision: 12, scale: 2 }),
  otherRevenueSource: varchar("other_revenue_source", { length: 255 }),
  wholesaleRevenue: numeric("wholesale_revenue", { precision: 12, scale: 2 }),
  toastGrossSales: numeric("toast_gross_sales", { precision: 12, scale: 2 }),
  toastDiscountAmount: numeric("toast_discount_amount", { precision: 12, scale: 2 }),
  toastDiscountPct: numeric("toast_discount_pct", { precision: 5, scale: 2 }),
  toastVoidAmount: numeric("toast_void_amount", { precision: 12, scale: 2 }),
  toastVoidCount: integer("toast_void_count"),
  toastServiceCharges: numeric("toast_service_charges", { precision: 12, scale: 2 }),
  notes: text("notes"),
  weatherHigh: integer("weather_high"),
  weatherLow: integer("weather_low"),
  weatherCondition: varchar("weather_condition", { length: 50 }),
  weatherPrecipitation: numeric("weather_precipitation", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_rcc_daily_revenue_date").on(table.date),
  index("idx_rcc_daily_revenue_week").on(table.weekId),
]);

export const insertRccDailyRevenueSchema = createInsertSchema(rccDailyRevenue).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRccDailyRevenue = z.infer<typeof insertRccDailyRevenueSchema>;
export type RccDailyRevenue = typeof rccDailyRevenue.$inferSelect;

// Revenue Detail - Toast Revenue Centers (cached from Config API)
export const rccRevenueCenters = pgTable("rcc_revenue_centers", {
  id: serial("id").primaryKey(),
  guid: varchar("guid", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  restaurantGuid: varchar("restaurant_guid", { length: 64 }).notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_rcc_rev_center_guid").on(table.guid),
]);

export type RccRevenueCenter = typeof rccRevenueCenters.$inferSelect;

// Revenue Detail - Toast Sales Categories (cached from Config API)
export const rccSalesCategories = pgTable("rcc_sales_categories", {
  id: serial("id").primaryKey(),
  guid: varchar("guid", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  restaurantGuid: varchar("restaurant_guid", { length: 64 }).notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_rcc_sales_cat_guid").on(table.guid),
]);

export type RccSalesCategory = typeof rccSalesCategories.$inferSelect;

// Revenue Detail - Daily revenue breakdown by revenue center
export const rccDailyRevenueByCenter = pgTable("rcc_daily_revenue_by_center", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  source: varchar("source", { length: 20 }).notNull(),
  revenueCenterGuid: varchar("revenue_center_guid", { length: 64 }),
  revenueCenterName: varchar("revenue_center_name", { length: 255 }).notNull(),
  netSales: numeric("net_sales", { precision: 12, scale: 2 }).notNull().default("0"),
  grossSales: numeric("gross_sales", { precision: 12, scale: 2 }).notNull().default("0"),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  serviceChargeAmount: numeric("service_charge_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  orderCount: integer("order_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_rcc_rev_by_center_date_source_guid").on(table.date, table.source, table.revenueCenterGuid),
  index("idx_rcc_rev_by_center_date").on(table.date),
]);

export const insertRccDailyRevenueByCenterSchema = createInsertSchema(rccDailyRevenueByCenter).omit({ id: true, createdAt: true });
export type InsertRccDailyRevenueByCenter = z.infer<typeof insertRccDailyRevenueByCenterSchema>;
export type RccDailyRevenueByCenter = typeof rccDailyRevenueByCenter.$inferSelect;

// Revenue Detail - Daily revenue breakdown by sales category
export const rccDailyRevenueByCategory = pgTable("rcc_daily_revenue_by_category", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  source: varchar("source", { length: 20 }).notNull(),
  salesCategoryGuid: varchar("sales_category_guid", { length: 64 }),
  salesCategoryName: varchar("sales_category_name", { length: 255 }).notNull(),
  netSales: numeric("net_sales", { precision: 12, scale: 2 }).notNull().default("0"),
  grossSales: numeric("gross_sales", { precision: 12, scale: 2 }).notNull().default("0"),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  itemCount: integer("item_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_rcc_rev_by_cat_date_source_guid").on(table.date, table.source, table.salesCategoryGuid),
  index("idx_rcc_rev_by_cat_date").on(table.date),
]);

export const insertRccDailyRevenueByCategorySchema = createInsertSchema(rccDailyRevenueByCategory).omit({ id: true, createdAt: true });
export type InsertRccDailyRevenueByCategory = z.infer<typeof insertRccDailyRevenueByCategorySchema>;
export type RccDailyRevenueByCategory = typeof rccDailyRevenueByCategory.$inferSelect;

// Revenue Detail - Daily item-level sales
export const rccDailyItemSales = pgTable("rcc_daily_item_sales", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  source: varchar("source", { length: 20 }).notNull(),
  itemName: varchar("item_name", { length: 500 }).notNull(),
  itemGuid: varchar("item_guid", { length: 64 }),
  productId: varchar("product_id", { length: 64 }),
  variantId: varchar("variant_id", { length: 64 }),
  salesCategoryGuid: varchar("sales_category_guid", { length: 64 }),
  salesCategoryName: varchar("sales_category_name", { length: 255 }),
  revenueCenterGuid: varchar("revenue_center_guid", { length: 64 }),
  revenueCenterName: varchar("revenue_center_name", { length: 255 }),
  productType: varchar("product_type", { length: 255 }),
  vendor: varchar("vendor", { length: 255 }),
  quantity: integer("quantity").notNull().default(0),
  netSales: numeric("net_sales", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_rcc_item_sales_date").on(table.date),
  index("idx_rcc_item_sales_source").on(table.source),
  index("idx_rcc_item_sales_date_source").on(table.date, table.source),
]);

export const insertRccDailyItemSalesSchema = createInsertSchema(rccDailyItemSales).omit({ id: true, createdAt: true });
export type InsertRccDailyItemSales = z.infer<typeof insertRccDailyItemSalesSchema>;
export type RccDailyItemSales = typeof rccDailyItemSales.$inferSelect;

// Toast Void & Discount Details - individual void and discount records from Toast orders
export const toastVoidDiscountDetails = pgTable("toast_void_discount_details", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  recordType: varchar("record_type", { length: 20 }).notNull(), // 'void' or 'discount'
  level: varchar("level", { length: 20 }).notNull(), // 'order', 'check', 'item'
  orderGuid: varchar("order_guid", { length: 64 }),
  orderNumber: varchar("order_number", { length: 64 }),
  checkGuid: varchar("check_guid", { length: 64 }),
  itemName: varchar("item_name", { length: 500 }),
  itemGuid: varchar("item_guid", { length: 64 }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  discountName: varchar("discount_name", { length: 255 }),
  discountType: varchar("discount_type", { length: 50 }),
  discountReasonName: varchar("discount_reason_name", { length: 255 }),
  discountReasonComment: varchar("discount_reason_comment", { length: 500 }),
  voidReasonGuid: varchar("void_reason_guid", { length: 64 }),
  approverGuid: varchar("approver_guid", { length: 64 }),
  serverGuid: varchar("server_guid", { length: 64 }),
  revenueCenterName: varchar("revenue_center_name", { length: 255 }),
  restaurantGuid: varchar("restaurant_guid", { length: 64 }),
  restaurantName: varchar("restaurant_name", { length: 255 }),
  occurredAt: timestamp("occurred_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_toast_vd_date").on(table.date),
  index("idx_toast_vd_type").on(table.recordType),
  index("idx_toast_vd_date_type").on(table.date, table.recordType),
]);

export const insertToastVoidDiscountDetailSchema = createInsertSchema(toastVoidDiscountDetails).omit({ id: true, createdAt: true });
export type InsertToastVoidDiscountDetail = z.infer<typeof insertToastVoidDiscountDetailSchema>;
export type ToastVoidDiscountDetail = typeof toastVoidDiscountDetails.$inferSelect;

// Toast Void Explanations - staff explanations for voids shown in Daily Reports
export const toastVoidExplanations = pgTable("toast_void_explanations", {
  id: serial("id").primaryKey(),
  voidDetailId: integer("void_detail_id").notNull().references(() => toastVoidDiscountDetails.id, { onDelete: 'cascade' }),
  explanation: text("explanation").notNull(),
  explainedById: varchar("explained_by_id").references(() => platformUsers.id),
  explainedByName: varchar("explained_by_name", { length: 255 }),
  reportId: varchar("report_id").references(() => dailyReports.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_toast_ve_void_detail").on(table.voidDetailId),
  index("idx_toast_ve_report").on(table.reportId),
  uniqueIndex("idx_toast_ve_unique").on(table.voidDetailId),
]);

export const insertToastVoidExplanationSchema = createInsertSchema(toastVoidExplanations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertToastVoidExplanation = z.infer<typeof insertToastVoidExplanationSchema>;
export type ToastVoidExplanation = typeof toastVoidExplanations.$inferSelect;

// ABCC Product Classification - maps Toast items to beverage types for MA ABCC gallons reporting
export const abccProductClassification = pgTable("abcc_product_classification", {
  id: serial("id").primaryKey(),
  itemGuid: varchar("item_guid", { length: 64 }),
  itemName: varchar("item_name", { length: 500 }).notNull(),
  menuGroupGuid: varchar("menu_group_guid", { length: 64 }),
  menuGroupName: varchar("menu_group_name", { length: 255 }),
  beverageType: varchar("beverage_type", { length: 50 }).notNull(),
  servingSizeOz: numeric("serving_size_oz", { precision: 8, scale: 2 }).notNull().default("0"),
  containerType: varchar("container_type", { length: 50 }),
  isActive: boolean("is_active").notNull().default(true),
  autoClassified: boolean("auto_classified").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_abcc_item_guid").on(table.itemGuid),
  index("idx_abcc_item_name").on(table.itemName),
  index("idx_abcc_beverage_type").on(table.beverageType),
]);

export const insertAbccProductClassificationSchema = createInsertSchema(abccProductClassification).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAbccProductClassification = z.infer<typeof insertAbccProductClassificationSchema>;
export type AbccProductClassification = typeof abccProductClassification.$inferSelect;

// Shopify Product Cache - stores product metadata for enrichment
export const shopifyProductCache = pgTable("shopify_product_cache", {
  id: serial("id").primaryKey(),
  productId: varchar("product_id", { length: 64 }).notNull(),
  title: varchar("title", { length: 500 }),
  productType: varchar("product_type", { length: 255 }),
  vendor: varchar("vendor", { length: 255 }),
  collections: text("collections"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_shopify_product_cache_pid").on(table.productId),
]);

export type ShopifyProductCache = typeof shopifyProductCache.$inferSelect;

// Toast Guests - synced from Toast POS guest/loyalty data
export const toastGuests = pgTable("toast_guests", {
  id: serial("id").primaryKey(),
  guestGuid: varchar("guest_guid", { length: 64 }).notNull(),
  email1: varchar("email1", { length: 255 }),
  email1MarketingPreference: varchar("email1_marketing_preference", { length: 50 }),
  phone1: varchar("phone1", { length: 30 }),
  phone1MarketingPreference: varchar("phone1_marketing_preference", { length: 50 }),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  firstVisitDate: timestamp("first_visit_date"),
  lastVisitDate: timestamp("last_visit_date"),
  lastDiningBehavior: varchar("last_dining_behavior", { length: 50 }),
  totalVisits: integer("total_visits").default(0),
  diningBehaviors: varchar("dining_behaviors", { length: 255 }),
  averageSpend: numeric("average_spend", { precision: 12, scale: 2 }),
  averageTip: numeric("average_tip", { precision: 12, scale: 2 }),
  averageTipPercentage: numeric("average_tip_percentage", { precision: 8, scale: 6 }),
  lifetimeSpend: numeric("lifetime_spend", { precision: 14, scale: 2 }),
  email2: varchar("email2", { length: 255 }),
  email2MarketingPreference: varchar("email2_marketing_preference", { length: 50 }),
  phone2: varchar("phone2", { length: 30 }),
  phone2MarketingPreference: varchar("phone2_marketing_preference", { length: 50 }),
  email3: varchar("email3", { length: 255 }),
  email3MarketingPreference: varchar("email3_marketing_preference", { length: 50 }),
  phone3: varchar("phone3", { length: 30 }),
  phone3MarketingPreference: varchar("phone3_marketing_preference", { length: 50 }),
  email4: varchar("email4", { length: 255 }),
  email4MarketingPreference: varchar("email4_marketing_preference", { length: 50 }),
  phone4: varchar("phone4", { length: 30 }),
  phone4MarketingPreference: varchar("phone4_marketing_preference", { length: 50 }),
  email5: varchar("email5", { length: 255 }),
  email5MarketingPreference: varchar("email5_marketing_preference", { length: 50 }),
  phone5: varchar("phone5", { length: 30 }),
  phone5MarketingPreference: varchar("phone5_marketing_preference", { length: 50 }),
  daysSinceLastVisit: integer("days_since_last_visit"),
  reactivationSegment: varchar("reactivation_segment", { length: 50 }),
  activityCategories: text("activity_categories"),
  isStaff: boolean("is_staff").notNull().default(false),
  mergedIntoId: integer("merged_into_id"),
  source: varchar("source", { length: 20 }).notNull().default("toast"),
  importedAt: timestamp("imported_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_toast_guests_guid").on(table.guestGuid),
  index("idx_toast_guests_email1").on(table.email1),
  index("idx_toast_guests_last_visit").on(table.lastVisitDate),
  index("idx_toast_guests_segment").on(table.reactivationSegment),
  index("idx_toast_guests_lifetime_spend").on(table.lifetimeSpend),
  index("idx_toast_guests_source").on(table.source),
  index("idx_toast_guests_merged_into").on(table.mergedIntoId),
]);

export const rccSyncLog = pgTable("rcc_sync_log", {
  id: serial("id").primaryKey(),
  syncType: varchar("sync_type", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("running"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  toastSynced: integer("toast_synced").default(0),
  shopifySynced: integer("shopify_synced").default(0),
  segmentsRefreshed: integer("segments_refreshed").default(0),
});

export const insertToastGuestSchema = createInsertSchema(toastGuests).omit({ id: true, importedAt: true, updatedAt: true });
export type InsertToastGuest = z.infer<typeof insertToastGuestSchema>;
export type ToastGuest = typeof toastGuests.$inferSelect;

export const customerIdentities = pgTable("customer_identities", {
  id: serial("id").primaryKey(),
  primaryEmail: varchar("primary_email", { length: 255 }),
  primaryPhone: varchar("primary_phone", { length: 30 }),
  mergedFirstName: varchar("merged_first_name", { length: 100 }),
  mergedLastName: varchar("merged_last_name", { length: 100 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_customer_identities_email").on(table.primaryEmail),
  index("idx_customer_identities_phone").on(table.primaryPhone),
]);

export const insertCustomerIdentitySchema = createInsertSchema(customerIdentities).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomerIdentity = z.infer<typeof insertCustomerIdentitySchema>;
export type CustomerIdentity = typeof customerIdentities.$inferSelect;

export const customerIdentityLinks = pgTable("customer_identity_links", {
  id: serial("id").primaryKey(),
  canonicalId: integer("canonical_id").notNull(),
  guestId: integer("guest_id").notNull(),
  source: varchar("source", { length: 20 }).notNull(),
  linkedAt: timestamp("linked_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_identity_links_guest").on(table.guestId),
  index("idx_identity_links_canonical").on(table.canonicalId),
]);

export const insertCustomerIdentityLinkSchema = createInsertSchema(customerIdentityLinks).omit({ id: true, linkedAt: true });
export type InsertCustomerIdentityLink = z.infer<typeof insertCustomerIdentityLinkSchema>;
export type CustomerIdentityLink = typeof customerIdentityLinks.$inferSelect;

// ==========================================
// Boomerang Loyalty & Retention System
// ==========================================

export const boomerangRfmScores = pgTable("boomerang_rfm_scores", {
  id: serial("id").primaryKey(),
  toastGuestId: integer("toast_guest_id").notNull(),
  recencyScore: integer("recency_score").notNull(),
  frequencyScore: integer("frequency_score").notNull(),
  monetaryScore: integer("monetary_score").notNull(),
  rfmTotal: integer("rfm_total").notNull(),
  rfmSegment: varchar("rfm_segment", { length: 50 }).notNull(),
  computedAt: timestamp("computed_at").defaultNow(),
}, (table) => [
  index("idx_boomerang_rfm_guest").on(table.toastGuestId),
  index("idx_boomerang_rfm_segment").on(table.rfmSegment),
]);

export const insertBoomerangRfmScoreSchema = createInsertSchema(boomerangRfmScores).omit({ id: true, computedAt: true });
export type InsertBoomerangRfmScore = z.infer<typeof insertBoomerangRfmScoreSchema>;
export type BoomerangRfmScore = typeof boomerangRfmScores.$inferSelect;

export const boomerangLoyaltyTiers = pgTable("boomerang_loyalty_tiers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  minPoints: integer("min_points").notNull().default(0),
  pointsMultiplier: numeric("points_multiplier", { precision: 4, scale: 2 }).notNull().default("1.00"),
  benefits: jsonb("benefits").$type<string[]>().default([]),
  color: varchar("color", { length: 20 }).notNull().default("#94a3b8"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBoomerangLoyaltyTierSchema = createInsertSchema(boomerangLoyaltyTiers).omit({ id: true, createdAt: true });
export type InsertBoomerangLoyaltyTier = z.infer<typeof insertBoomerangLoyaltyTierSchema>;
export type BoomerangLoyaltyTier = typeof boomerangLoyaltyTiers.$inferSelect;

export const boomerangLoyaltyAccounts = pgTable("boomerang_loyalty_accounts", {
  id: serial("id").primaryKey(),
  toastGuestId: integer("toast_guest_id").notNull(),
  tierId: integer("tier_id"),
  pointsBalance: integer("points_balance").notNull().default(0),
  lifetimePoints: integer("lifetime_points").notNull().default(0),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  lastActivityAt: timestamp("last_activity_at"),
}, (table) => [
  uniqueIndex("idx_boomerang_loyalty_guest").on(table.toastGuestId),
]);

export const insertBoomerangLoyaltyAccountSchema = createInsertSchema(boomerangLoyaltyAccounts).omit({ id: true, enrolledAt: true });
export type InsertBoomerangLoyaltyAccount = z.infer<typeof insertBoomerangLoyaltyAccountSchema>;
export type BoomerangLoyaltyAccount = typeof boomerangLoyaltyAccounts.$inferSelect;

export const boomerangPointsLedger = pgTable("boomerang_points_ledger", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull(),
  points: integer("points").notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  source: varchar("source", { length: 50 }).notNull(),
  description: text("description"),
  referenceId: varchar("reference_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_boomerang_points_account").on(table.accountId),
]);

export const insertBoomerangPointsLedgerSchema = createInsertSchema(boomerangPointsLedger).omit({ id: true, createdAt: true });
export type InsertBoomerangPointsLedger = z.infer<typeof insertBoomerangPointsLedgerSchema>;
export type BoomerangPointsLedger = typeof boomerangPointsLedger.$inferSelect;

export const boomerangCampaigns = pgTable("boomerang_campaigns", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  targetSegment: varchar("target_segment", { length: 50 }),
  targetRfmSegment: varchar("target_rfm_segment", { length: 50 }),
  channel: varchar("channel", { length: 50 }).notNull().default("email"),
  budget: numeric("budget", { precision: 12, scale: 2 }),
  costPerSend: numeric("cost_per_send", { precision: 8, scale: 4 }),
  totalSent: integer("total_sent").notNull().default(0),
  totalOpened: integer("total_opened").notNull().default(0),
  totalClicked: integer("total_clicked").notNull().default(0),
  totalConverted: integer("total_converted").notNull().default(0),
  totalRevenue: numeric("total_revenue", { precision: 14, scale: 2 }).default("0"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBoomerangCampaignSchema = createInsertSchema(boomerangCampaigns).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBoomerangCampaign = z.infer<typeof insertBoomerangCampaignSchema>;
export type BoomerangCampaign = typeof boomerangCampaigns.$inferSelect;

export const boomerangOffers = pgTable("boomerang_offers", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id"),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  offerType: varchar("offer_type", { length: 30 }).notNull(),
  discountValue: numeric("discount_value", { precision: 10, scale: 2 }),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }),
  minPurchase: numeric("min_purchase", { precision: 10, scale: 2 }),
  couponCode: varchar("coupon_code", { length: 50 }),
  maxRedemptions: integer("max_redemptions"),
  currentRedemptions: integer("current_redemptions").notNull().default(0),
  pointsCost: integer("points_cost"),
  isActive: boolean("is_active").notNull().default(true),
  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_boomerang_offers_campaign").on(table.campaignId),
  index("idx_boomerang_offers_code").on(table.couponCode),
]);

export const insertBoomerangOfferSchema = createInsertSchema(boomerangOffers).omit({ id: true, currentRedemptions: true, createdAt: true });
export type InsertBoomerangOffer = z.infer<typeof insertBoomerangOfferSchema>;
export type BoomerangOffer = typeof boomerangOffers.$inferSelect;

export const boomerangRedemptions = pgTable("boomerang_redemptions", {
  id: serial("id").primaryKey(),
  offerId: integer("offer_id").notNull(),
  toastGuestId: integer("toast_guest_id"),
  campaignId: integer("campaign_id"),
  orderValue: numeric("order_value", { precision: 12, scale: 2 }),
  discountApplied: numeric("discount_applied", { precision: 10, scale: 2 }),
  channel: varchar("channel", { length: 50 }),
  redeemedAt: timestamp("redeemed_at").defaultNow(),
}, (table) => [
  index("idx_boomerang_redemptions_offer").on(table.offerId),
  index("idx_boomerang_redemptions_guest").on(table.toastGuestId),
]);

export const insertBoomerangRedemptionSchema = createInsertSchema(boomerangRedemptions).omit({ id: true, redeemedAt: true });
export type InsertBoomerangRedemption = z.infer<typeof insertBoomerangRedemptionSchema>;
export type BoomerangRedemption = typeof boomerangRedemptions.$inferSelect;

export const boomerangAutomationRules = pgTable("boomerang_automation_rules", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  triggerType: varchar("trigger_type", { length: 50 }).notNull(),
  conditions: jsonb("conditions").$type<Record<string, any>>().default({}),
  offerId: integer("offer_id"),
  actionType: varchar("action_type", { length: 50 }).notNull().default("send_offer"),
  actionConfig: jsonb("action_config").$type<Record<string, any>>().default({}),
  isActive: boolean("is_active").notNull().default(true),
  totalTriggered: integer("total_triggered").notNull().default(0),
  totalConverted: integer("total_converted").notNull().default(0),
  lastTriggeredAt: timestamp("last_triggered_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBoomerangAutomationRuleSchema = createInsertSchema(boomerangAutomationRules).omit({ id: true, totalTriggered: true, totalConverted: true, lastTriggeredAt: true, createdAt: true });
export type InsertBoomerangAutomationRule = z.infer<typeof insertBoomerangAutomationRuleSchema>;
export type BoomerangAutomationRule = typeof boomerangAutomationRules.$inferSelect;

export const boomerangAutomationExecutions = pgTable("boomerang_automation_executions", {
  id: serial("id").primaryKey(),
  ruleId: integer("rule_id").notNull(),
  toastGuestId: integer("toast_guest_id").notNull(),
  status: varchar("status", { length: 30 }).notNull().default("triggered"),
  convertedAt: timestamp("converted_at"),
  triggeredAt: timestamp("triggered_at").defaultNow(),
}, (table) => [
  index("idx_boomerang_auto_exec_rule").on(table.ruleId),
  index("idx_boomerang_auto_exec_guest").on(table.toastGuestId),
]);

export const insertBoomerangAutomationExecutionSchema = createInsertSchema(boomerangAutomationExecutions).omit({ id: true, triggeredAt: true });
export type InsertBoomerangAutomationExecution = z.infer<typeof insertBoomerangAutomationExecutionSchema>;
export type BoomerangAutomationExecution = typeof boomerangAutomationExecutions.$inferSelect;

export const boomerangReferralCodes = pgTable("boomerang_referral_codes", {
  id: serial("id").primaryKey(),
  toastGuestId: integer("toast_guest_id").notNull(),
  code: varchar("code", { length: 20 }).notNull(),
  totalReferrals: integer("total_referrals").notNull().default(0),
  totalConverted: integer("total_converted").notNull().default(0),
  totalPointsEarned: integer("total_points_earned").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_boomerang_referral_code").on(table.code),
  index("idx_boomerang_referral_guest").on(table.toastGuestId),
]);

export const insertBoomerangReferralCodeSchema = createInsertSchema(boomerangReferralCodes).omit({ id: true, totalReferrals: true, totalConverted: true, totalPointsEarned: true, createdAt: true });
export type InsertBoomerangReferralCode = z.infer<typeof insertBoomerangReferralCodeSchema>;
export type BoomerangReferralCode = typeof boomerangReferralCodes.$inferSelect;

export const boomerangReferrals = pgTable("boomerang_referrals", {
  id: serial("id").primaryKey(),
  referralCodeId: integer("referral_code_id").notNull(),
  referrerId: integer("referrer_id").notNull(),
  refereeId: integer("referee_id"),
  refereeName: varchar("referee_name", { length: 200 }),
  refereeEmail: varchar("referee_email", { length: 255 }),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  firstVisitAt: timestamp("first_visit_at"),
  pointsAwarded: integer("points_awarded").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_boomerang_referrals_code").on(table.referralCodeId),
  index("idx_boomerang_referrals_referrer").on(table.referrerId),
])

export const insertBoomerangReferralSchema = createInsertSchema(boomerangReferrals).omit({ id: true, createdAt: true });
export type InsertBoomerangReferral = z.infer<typeof insertBoomerangReferralSchema>;
export type BoomerangReferral = typeof boomerangReferrals.$inferSelect;

// ==========================================
// AI Targeting Engine
// ==========================================

export const targetingCampaigns = pgTable("targeting_campaigns", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  weekStart: timestamp("week_start").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  targetCount: integer("target_count").notNull().default(500),
  segments: jsonb("segments").$type<string[]>().default([]),
  offerTypes: jsonb("offer_types").$type<string[]>().default([]),
  channel: varchar("channel", { length: 20 }).notNull().default("email"),
  projectedConversionRate: numeric("projected_conversion_rate", { precision: 5, scale: 2 }),
  projectedRevenue: numeric("projected_revenue", { precision: 14, scale: 2 }),
  projectedRoi: numeric("projected_roi", { precision: 8, scale: 2 }),
  actualConversions: integer("actual_conversions").notNull().default(0),
  actualRevenue: numeric("actual_revenue", { precision: 14, scale: 2 }).default("0"),
  totalSent: integer("total_sent").notNull().default(0),
  totalOpened: integer("total_opened").notNull().default(0),
  totalClicked: integer("total_clicked").notNull().default(0),
  aiInsights: text("ai_insights"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTargetingCampaignSchema = createInsertSchema(targetingCampaigns).omit({ id: true, actualConversions: true, actualRevenue: true, totalSent: true, totalOpened: true, totalClicked: true, createdAt: true, updatedAt: true });
export type InsertTargetingCampaign = z.infer<typeof insertTargetingCampaignSchema>;
export type TargetingCampaign = typeof targetingCampaigns.$inferSelect;

export const targetingListMembers = pgTable("targeting_list_members", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  toastGuestId: integer("toast_guest_id").notNull(),
  reactivationScore: numeric("reactivation_score", { precision: 5, scale: 2 }).notNull(),
  expectedValue: numeric("expected_value", { precision: 12, scale: 2 }).notNull(),
  recencyScore: integer("recency_score").notNull(),
  frequencyScore: integer("frequency_score").notNull(),
  monetaryScore: integer("monetary_score").notNull(),
  segment: varchar("segment", { length: 50 }),
  assignedOfferType: varchar("assigned_offer_type", { length: 50 }),
  assignedOfferDetail: text("assigned_offer_detail"),
  aiReason: text("ai_reason"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  convertedAt: timestamp("converted_at"),
  conversionRevenue: numeric("conversion_revenue", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_targeting_members_campaign").on(table.campaignId),
  index("idx_targeting_members_guest").on(table.toastGuestId),
  index("idx_targeting_members_score").on(table.reactivationScore),
]);

export const insertTargetingListMemberSchema = createInsertSchema(targetingListMembers).omit({ id: true, sentAt: true, openedAt: true, clickedAt: true, convertedAt: true, conversionRevenue: true, createdAt: true });
export type InsertTargetingListMember = z.infer<typeof insertTargetingListMemberSchema>;
export type TargetingListMember = typeof targetingListMembers.$inferSelect;

export const offerPerformance = pgTable("offer_performance", {
  id: serial("id").primaryKey(),
  offerType: varchar("offer_type", { length: 50 }).notNull(),
  segment: varchar("segment", { length: 50 }).notNull(),
  totalSent: integer("total_sent").notNull().default(0),
  totalConverted: integer("total_converted").notNull().default(0),
  totalRevenue: numeric("total_revenue", { precision: 14, scale: 2 }).default("0"),
  avgConversionRate: numeric("avg_conversion_rate", { precision: 5, scale: 2 }),
  avgOrderValue: numeric("avg_order_value", { precision: 12, scale: 2 }),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_offer_perf_type_segment").on(table.offerType, table.segment),
]);

export const insertOfferPerformanceSchema = createInsertSchema(offerPerformance).omit({ id: true, updatedAt: true });
export type InsertOfferPerformance = z.infer<typeof insertOfferPerformanceSchema>;
export type OfferPerformance = typeof offerPerformance.$inferSelect;

export const smsCampaigns = pgTable("sms_campaigns", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  message: text("message").notNull(),
  segments: text("segments").array(),
  status: varchar("status", { length: 30 }).notNull().default("draft"),
  totalRecipients: integer("total_recipients").default(0),
  totalSent: integer("total_sent").default(0),
  totalDelivered: integer("total_delivered").default(0),
  totalFailed: integer("total_failed").default(0),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  completedAt: timestamp("completed_at"),
  createdBy: varchar("created_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSmsCampaignSchema = createInsertSchema(smsCampaigns).omit({ id: true, totalSent: true, totalDelivered: true, totalFailed: true, sentAt: true, completedAt: true, createdAt: true });
export type InsertSmsCampaign = z.infer<typeof insertSmsCampaignSchema>;
export type SmsCampaign = typeof smsCampaigns.$inferSelect;

export const smsMessages = pgTable("sms_messages", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => smsCampaigns.id),
  toastGuestId: integer("toast_guest_id"),
  recipientPhone: varchar("recipient_phone", { length: 30 }).notNull(),
  recipientName: varchar("recipient_name", { length: 200 }),
  messageBody: text("message_body").notNull(),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  twilioSid: varchar("twilio_sid", { length: 64 }),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_sms_messages_campaign").on(table.campaignId),
  index("idx_sms_messages_guest").on(table.toastGuestId),
])

export const insertSmsMessageSchema = createInsertSchema(smsMessages).omit({ id: true, twilioSid: true, errorMessage: true, sentAt: true, createdAt: true });
export type InsertSmsMessage = z.infer<typeof insertSmsMessageSchema>;
export type SmsMessage = typeof smsMessages.$inferSelect;

// ===================== Contracts & Tracking Module =====================

export const contractStatusEnum = pgEnum("contract_status", ["active", "expiring_soon", "expired", "renewed", "cancelled"]);
export const contractCategoryEnum = pgEnum("contract_category", ["insurance", "waste_disposal", "software", "equipment", "utilities", "maintenance", "professional_services", "lease", "licensing", "other"]);

export const contracts = pgTable("contract_contracts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 300 }).notNull(),
  category: contractCategoryEnum("category").notNull().default("other"),
  vendor: varchar("vendor", { length: 300 }).notNull(),
  description: text("description"),
  startDate: timestamp("start_date"),
  expirationDate: timestamp("expiration_date"),
  renewalTerms: text("renewal_terms"),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  paymentFrequency: varchar("payment_frequency", { length: 50 }),
  status: contractStatusEnum("status").notNull().default("active"),
  renewedFromId: integer("renewed_from_id"),
  notes: text("notes"),
  notificationSchedule: varchar("notification_schedule", { length: 100 }).default("60,45,30,15"),
  notificationsSent: text("notifications_sent").default("{}"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_contracts_status").on(table.status),
  index("idx_contracts_expiration").on(table.expirationDate),
]);

export const insertContractSchema = createInsertSchema(contracts).omit({ id: true, notificationsSent: true, createdAt: true, updatedAt: true });
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;

export const contractDocuments = pgTable("contract_documents", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => contracts.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 500 }).notNull(),
  objectPath: text("object_path").notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  extractedData: text("extracted_data"),
  aiSummary: text("ai_summary"),
  isCurrent: boolean("is_current").notNull().default(true),
  uploadedById: varchar("uploaded_by_id").references(() => platformUsers.id),
  uploadedByName: varchar("uploaded_by_name", { length: 200 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_contract_docs_contract").on(table.contractId),
]);

export const insertContractDocumentSchema = createInsertSchema(contractDocuments).omit({ id: true, createdAt: true });
export type InsertContractDocument = z.infer<typeof insertContractDocumentSchema>;
export type ContractDocument = typeof contractDocuments.$inferSelect;

export const contractResponsibles = pgTable("contract_responsibles", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => contracts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => platformUsers.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_contract_resp_contract").on(table.contractId),
  index("idx_contract_resp_user").on(table.userId),
]);

export const insertContractResponsibleSchema = createInsertSchema(contractResponsibles).omit({ id: true, createdAt: true });
export type InsertContractResponsible = z.infer<typeof insertContractResponsibleSchema>;
export type ContractResponsible = typeof contractResponsibles.$inferSelect;

// ===================== Toast Menu Items =====================

export const toastMenus = pgTable("toast_menus", {
  id: serial("id").primaryKey(),
  menuGuid: varchar("menu_guid", { length: 100 }).notNull(),
  restaurantGuid: varchar("restaurant_guid", { length: 100 }).notNull(),
  name: varchar("name", { length: 300 }).notNull(),
  description: text("description"),
  orderable: boolean("orderable").default(true),
  visibility: text("visibility"),
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
}, (table) => [
  index("idx_toast_menus_guid").on(table.menuGuid),
  index("idx_toast_menus_restaurant").on(table.restaurantGuid),
]);

export const insertToastMenuSchema = createInsertSchema(toastMenus).omit({ id: true, syncedAt: true });
export type InsertToastMenu = z.infer<typeof insertToastMenuSchema>;
export type ToastMenu = typeof toastMenus.$inferSelect;

export const toastMenuGroups = pgTable("toast_menu_groups", {
  id: serial("id").primaryKey(),
  groupGuid: varchar("group_guid", { length: 100 }).notNull(),
  menuGuid: varchar("menu_guid", { length: 100 }).notNull(),
  restaurantGuid: varchar("restaurant_guid", { length: 100 }).notNull(),
  name: varchar("name", { length: 300 }).notNull(),
  description: text("description"),
  displayOrder: integer("display_order"),
  visibility: text("visibility"),
  hidden: boolean("hidden").default(false),
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
}, (table) => [
  index("idx_toast_menu_groups_guid").on(table.groupGuid),
  index("idx_toast_menu_groups_menu").on(table.menuGuid),
  index("idx_toast_menu_groups_restaurant").on(table.restaurantGuid),
]);

export const insertToastMenuGroupSchema = createInsertSchema(toastMenuGroups).omit({ id: true, syncedAt: true });
export type InsertToastMenuGroup = z.infer<typeof insertToastMenuGroupSchema>;
export type ToastMenuGroup = typeof toastMenuGroups.$inferSelect;

export const toastMenuItems = pgTable("toast_menu_items", {
  id: serial("id").primaryKey(),
  itemGuid: varchar("item_guid", { length: 100 }).notNull(),
  groupGuid: varchar("group_guid", { length: 100 }),
  menuGuid: varchar("menu_guid", { length: 100 }),
  restaurantGuid: varchar("restaurant_guid", { length: 100 }).notNull(),
  name: varchar("name", { length: 500 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }),
  posName: varchar("pos_name", { length: 500 }),
  sku: varchar("sku", { length: 100 }),
  plu: varchar("plu", { length: 100 }),
  type: varchar("type", { length: 50 }),
  visibility: text("visibility"),
  imageUrl: text("image_url"),
  hidden: boolean("hidden").default(false),
  hidePrice: boolean("hide_price").default(false),
  isSpecial: boolean("is_special").default(false),
  sizePrices: text("size_prices"),
  suggestedPairing: text("suggested_pairing"),
  displayOrder: integer("display_order"),
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
}, (table) => [
  index("idx_toast_menu_items_guid").on(table.itemGuid),
  index("idx_toast_menu_items_group").on(table.groupGuid),
  index("idx_toast_menu_items_restaurant").on(table.restaurantGuid),
  index("idx_toast_menu_items_menu").on(table.menuGuid),
])

export const insertToastMenuItemSchema = createInsertSchema(toastMenuItems).omit({ id: true, syncedAt: true });
export type InsertToastMenuItem = z.infer<typeof insertToastMenuItemSchema>;
export type ToastMenuItem = typeof toastMenuItems.$inferSelect;

// ── Growth Studio / Zeely-inspired features ──────────────────────────

export const ccContentTypeEnum = pgEnum("cc_content_type", ["social_post", "email_subject", "ad_copy", "event_promo", "sms_blast"]);
export const ccContentStatusEnum = pgEnum("cc_content_status", ["draft", "saved", "published", "archived"]);
export const ccCalendarChannelEnum = pgEnum("cc_calendar_channel", ["email", "sms", "social", "on_site", "print"]);
export const ccCalendarStatusEnum = pgEnum("cc_calendar_status", ["planned", "published", "cancelled"]);
export const ccCampaignGoalEnum = pgEnum("cc_campaign_goal", ["traffic", "reactivation", "event_promotion", "new_product", "seasonal"]);
export const ccCampaignStatusEnum = pgEnum("cc_campaign_status", ["draft", "ready", "launched", "completed", "cancelled"]);
export const ccPromoTypeEnum = pgEnum("cc_promo_type", ["seasonal_special", "new_release", "weather_deal", "event_promo", "loyalty_reward", "flash_sale"]);

export const ccContentAssets = pgTable("cc_content_assets", {
  id: serial("id").primaryKey(),
  type: ccContentTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  context: text("context"),
  variations: text("variations").array(),
  selectedVariation: integer("selected_variation"),
  channel: varchar("channel", { length: 50 }),
  status: ccContentStatusEnum("status").default("draft").notNull(),
  targetSegment: varchar("target_segment", { length: 100 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCcContentAssetSchema = createInsertSchema(ccContentAssets).omit({ id: true, createdAt: true });
export type InsertCcContentAsset = z.infer<typeof insertCcContentAssetSchema>;
export type CcContentAsset = typeof ccContentAssets.$inferSelect;

export const ccContentCalendar = pgTable("cc_content_calendar", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  channel: ccCalendarChannelEnum("channel").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  notes: text("notes"),
  status: ccCalendarStatusEnum("status").default("planned").notNull(),
  contentAssetId: integer("content_asset_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCcContentCalendarSchema = createInsertSchema(ccContentCalendar).omit({ id: true, createdAt: true });
export type InsertCcContentCalendar = z.infer<typeof insertCcContentCalendarSchema>;
export type CcContentCalendarEntry = typeof ccContentCalendar.$inferSelect;

export const ccCampaignBuilder = pgTable("cc_campaign_builder", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  goal: ccCampaignGoalEnum("goal").notNull(),
  targetSegment: varchar("target_segment", { length: 100 }),
  strategy: text("strategy"),
  channels: text("channels").array(),
  generatedContent: text("generated_content"),
  status: ccCampaignStatusEnum("status").default("draft").notNull(),
  estimatedReach: integer("estimated_reach"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCcCampaignBuilderSchema = createInsertSchema(ccCampaignBuilder).omit({ id: true, createdAt: true });
export type InsertCcCampaignBuilder = z.infer<typeof insertCcCampaignBuilderSchema>;
export type CcCampaignBuilder = typeof ccCampaignBuilder.$inferSelect;

export const ccMarketingScorecards = pgTable("cc_marketing_scorecards", {
  id: serial("id").primaryKey(),
  periodLabel: varchar("period_label", { length: 100 }).notNull(),
  metrics: text("metrics"),
  insights: text("insights"),
  recommendations: text("recommendations"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCcMarketingScorecardSchema = createInsertSchema(ccMarketingScorecards).omit({ id: true, createdAt: true });
export type InsertCcMarketingScorecard = z.infer<typeof insertCcMarketingScorecardSchema>;
export type CcMarketingScorecard = typeof ccMarketingScorecards.$inferSelect;

export const ccQuickPromotions = pgTable("cc_quick_promotions", {
  id: serial("id").primaryKey(),
  type: ccPromoTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  generatedContent: text("generated_content"),
  channel: varchar("channel", { length: 50 }),
  targetSegment: varchar("target_segment", { length: 100 }),
  status: varchar("status", { length: 50 }).default("generated").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const insertCcQuickPromotionSchema = createInsertSchema(ccQuickPromotions).omit({ id: true, createdAt: true });
export type InsertCcQuickPromotion = z.infer<typeof insertCcQuickPromotionSchema>;
export type CcQuickPromotion = typeof ccQuickPromotions.$inferSelect;

// ============= Enhancement Requests Module =============
export const enhancementRequests = pgTable("enhancement_requests", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  module: varchar("module", { length: 100 }),
  submittedBy: varchar("submitted_by", { length: 255 }).notNull(),
  submitterEmail: varchar("submitter_email", { length: 255 }),
  status: varchar("status", { length: 50 }).default("new").notNull(),
  priority: integer("priority").default(0).notNull(),
  votes: integer("votes").default(0).notNull(),
  adminNotes: text("admin_notes"),
  changesDescription: text("changes_description"),
  responseMessage: text("response_message"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertEnhancementRequestSchema = createInsertSchema(enhancementRequests).omit({ id: true, createdAt: true, updatedAt: true, completedAt: true });
export type InsertEnhancementRequest = z.infer<typeof insertEnhancementRequestSchema>;
export type EnhancementRequest = typeof enhancementRequests.$inferSelect;

// ===== CellarTraks: Federal & State Alcohol Classification Enums =====

// TTB Wine Classifications (Form 5120.17) - reported in wine gallons
export const ttbWineClassEnum = pgEnum("ttb_wine_class", [
  "still_wine_14_or_less",         // Still Wine - not over 14% alcohol (Form col a)
  "still_wine_14_to_16",           // Still Wine - over 14% to 16% (Form col a)
  "still_wine_16_to_21",           // Still Wine - over 16% to 21% (Form col b)
  "still_wine_21_to_24",           // Still Wine - over 21% to 24% (Form col c) - fortified wines
  "hard_cider",                    // Hard Cider (0.5% to <8.5% ABV, apple/pear derived) (Form col f)
  "artificially_carbonated",       // Artificially Carbonated Wine (Form col d)
  "sparkling_bottle_fermented",    // Sparkling Wine - Bottle Fermented (Form col e BF)
  "sparkling_bulk_process",        // Sparkling Wine - Bulk Process (Form col e BP)
]);

// TTB Spirits Classifications (Form 5110.40) - reported in proof gallons
// Enum values match the form's reporting columns (b) through (l)
export const ttbSpiritsClassEnum = pgEnum("ttb_spirits_class", [
  "whisky_160_and_under",        // Whisky distilled at 160° and under (Form col b)
  "whisky_over_160",             // Whisky distilled at over 160° (Form col c)
  "brandy_170_and_under",        // Brandy distilled at 170° and under (Form col d)
  "brandy_over_170",             // Brandy distilled at over 170° (Form col e)
  "rum",                         // Rum (Form col f)
  "gin",                         // Gin (Form col g)
  "vodka",                       // Vodka (Form col h)
  "alcohol_spirits_190_over",    // Alcohol & Spirits 190° and over (Form col i)
  "alcohol_spirits_under_190",   // Alcohol & Spirits under 190° (Form col j)
  "other_spirits",               // Other - Identify (Form col k)
  "wine_proof_gallons",          // Wine in proof gallons (Form col l)
]);

// TTB Beer Classification (Form 5130.9) - single classification, reported in barrels (31 gallons)
export const ttbBeerClassEnum = pgEnum("ttb_beer_class", [
  "beer",                          // Beer (Form 5130.9 - single category)
]);

// Massachusetts AB-1 State Tax Classifications
export const maAb1ClassEnum = pgEnum("ma_ab1_class", [
  "malt_beverages",                // Beer/Malt - $3.30/barrel
  "hard_cider",                    // Hard Cider 3-6% ABV - $0.03/gal
  "still_wine",                    // Still Wine (incl. vermouth) - $0.55/gal
  "sparkling_wine",                // Sparkling Wine/Champagne - $0.70/gal
  "alcoholic_beverages_15_or_less",// Alcoholic Beverages ≤15% ABV - $1.10/gal
  "distilled_spirits_15_to_50",    // Distilled Spirits 15-50% ABV - $4.05/gal
  "distilled_spirits_over_50",     // Distilled Spirits >50% ABV - $4.05/proof gal
]);

// Federal reporting unit of measure
export const ttbReportingUomEnum = pgEnum("ttb_reporting_uom", [
  "wine_gallons",
  "proof_gallons",
  "barrels",
]);

// CellarTraks Product Classifications table - maps products to regulatory classifications
export const cellartraksProductClassifications = pgTable("cellartraks_product_classifications", {
  id: serial("id").primaryKey(),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  division: varchar("division", { length: 20 }).notNull(), // 'winery', 'distillery', 'brewery'
  ttbWineClass: ttbWineClassEnum("ttb_wine_class"),
  ttbSpiritsClass: ttbSpiritsClassEnum("ttb_spirits_class"),
  ttbBeerClass: ttbBeerClassEnum("ttb_beer_class"),
  maAb1Class: maAb1ClassEnum("ma_ab1_class"),
  reportingUom: ttbReportingUomEnum("reporting_uom"),
  abvPercent: numeric("abv_percent", { precision: 5, scale: 2 }),
  proofGallonFactor: numeric("proof_gallon_factor", { precision: 6, scale: 4 }),
  bottleSizeMl: numeric("bottle_size_ml", { precision: 8, scale: 2 }),
  federalTaxRateId: integer("federal_tax_rate_id"),
  isClassified: boolean("is_classified").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_ct_prod_class_product").on(table.productId),
  index("idx_ct_prod_class_division").on(table.division),
  index("idx_ct_prod_class_ma_ab1").on(table.maAb1Class),
]);

export const insertCellartraksProductClassificationSchema = createInsertSchema(cellartraksProductClassifications).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCellartraksProductClassification = z.infer<typeof insertCellartraksProductClassificationSchema>;
export type CellartraksProductClassification = typeof cellartraksProductClassifications.$inferSelect;

// CellarTraks Federal Tax Rates - TTB federal excise tax rate reference
export const cellartraksFederalTaxRates = pgTable("cellartraks_federal_tax_rates", {
  id: serial("id").primaryKey(),
  beverageType: varchar("beverage_type", { length: 20 }).notNull(), // 'beer', 'wine', 'spirits'
  rateKey: varchar("rate_key", { length: 80 }).notNull(),
  displayName: varchar("display_name", { length: 200 }).notNull(),
  description: text("description"),
  ratePerUnit: numeric("rate_per_unit", { precision: 10, scale: 4 }).notNull(),
  rateUnit: varchar("rate_unit", { length: 50 }).notNull(), // 'per barrel', 'per wine gallon', 'per proof gallon'
  volumeMin: numeric("volume_min", { precision: 15, scale: 2 }),
  volumeMax: numeric("volume_max", { precision: 15, scale: 2 }),
  volumeUnit: varchar("volume_unit", { length: 50 }),
  producerType: varchar("producer_type", { length: 50 }), // 'small', 'large', 'general', 'credit_tier'
  creditAmount: numeric("credit_amount", { precision: 10, scale: 4 }),
  effectiveRateAfterCredit: numeric("effective_rate_after_credit", { precision: 10, scale: 4 }),
  parentRateKey: varchar("parent_rate_key", { length: 80 }),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  isSelectedForOperation: boolean("is_selected_for_operation").notNull().default(false),
  effectiveDate: varchar("effective_date", { length: 20 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_ct_fed_rate_key").on(table.rateKey),
  index("idx_ct_fed_rate_bev_type").on(table.beverageType),
]);

export const insertCellartraksFederalTaxRateSchema = createInsertSchema(cellartraksFederalTaxRates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCellartraksFederalTaxRate = z.infer<typeof insertCellartraksFederalTaxRateSchema>;
export type CellartraksFederalTaxRate = typeof cellartraksFederalTaxRates.$inferSelect;

// CellarTraks State Tax Classes - editable state-level tax classifications
export const cellartraksStateTaxClasses = pgTable("cellartraks_state_tax_classes", {
  id: serial("id").primaryKey(),
  stateCode: varchar("state_code", { length: 2 }).notNull(),
  stateName: varchar("state_name", { length: 100 }).notNull(),
  classKey: varchar("class_key", { length: 80 }).notNull(),
  displayName: varchar("display_name", { length: 200 }).notNull(),
  taxRate: numeric("tax_rate", { precision: 10, scale: 4 }).notNull(),
  taxUnit: varchar("tax_unit", { length: 50 }).notNull(),
  description: text("description"),
  abvMin: numeric("abv_min", { precision: 5, scale: 2 }),
  abvMax: numeric("abv_max", { precision: 5, scale: 2 }),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_ct_state_tax_state_key").on(table.stateCode, table.classKey),
  index("idx_ct_state_tax_state").on(table.stateCode),
]);

export const insertCellartraksStateTaxClassSchema = createInsertSchema(cellartraksStateTaxClasses).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCellartraksStateTaxClass = z.infer<typeof insertCellartraksStateTaxClassSchema>;
export type CellartraksStateTaxClass = typeof cellartraksStateTaxClasses.$inferSelect;

// ==================== NashobaTV / Media Center ====================

export const nashobatvChannels = pgTable("nashobatv_channels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  channelType: text("channel_type").notNull().default("tv_display"),
  location: text("location"),
  isActive: boolean("is_active").notNull().default(true),
  isEmbeddable: boolean("is_embeddable").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const nashobatvSlideTypeEnum = pgEnum("nashobatv_slide_type", [
  "welcome", "events_today", "wine_list", "food_menu", "upcoming_events",
  "photo_gallery", "announcement", "weather", "wine_club", "daily_specials", "trivia", "custom"
]);

export const nashobatvSlides = pgTable("nashobatv_slides", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => nashobatvChannels.id, { onDelete: "cascade" }),
  slideType: nashobatvSlideTypeEnum("slide_type").notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  bodyText: text("body_text"),
  bodyHtml: text("body_html"),
  backgroundImageUrl: text("background_image_url"),
  mediaLibraryId: varchar("media_library_id").references(() => mediaLibrary.id, { onDelete: "set null" }),
  duration: integer("duration").notNull().default(12),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  startDate: text("start_date"),
  endDate: text("end_date"),
  location: text("location"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const nashobatvEvents = pgTable("nashobatv_events", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => nashobatvChannels.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  eventDate: text("event_date").notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  location: text("location"),
  category: text("category"),
  imageUrl: text("image_url"),
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurrenceRule: text("recurrence_rule"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const nashobatvAnnouncements = pgTable("nashobatv_announcements", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => nashobatvChannels.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  priority: integer("priority").notNull().default(0),
  startDate: text("start_date"),
  endDate: text("end_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const nashobatvPhotos = pgTable("nashobatv_photos", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => nashobatvChannels.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  mediaLibraryId: varchar("media_library_id").references(() => mediaLibrary.id, { onDelete: "set null" }),
  caption: text("caption"),
  category: text("category"),
  galleryName: text("gallery_name").notNull().default("Default"),
  sortOrder: integer("sort_order").notNull().default(0),
  isDisplayed: boolean("is_displayed").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const nashobatvDisplaySettings = pgTable("nashobatv_display_settings", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => nashobatvChannels.id, { onDelete: "cascade" }),
  slideType: text("slide_type").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  duration: integer("duration").notNull().default(12),
  sortOrder: integer("sort_order").notNull().default(0),
  backgroundImageUrl: text("background_image_url"),
  configData: jsonb("config_data"),
});

export const nashobatvHistoricalFacts = pgTable("nashobatv_historical_facts", {
  id: serial("id").primaryKey(),
  fact: text("fact").notNull(),
  year: integer("year"),
  month: integer("month"),
  day: integer("day"),
  category: text("category").notNull().default("winery"),
  isActive: boolean("is_active").notNull().default(true),
});

export const nashobatvDailySpecials = pgTable("nashobatv_daily_specials", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => nashobatvChannels.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  validDate: text("valid_date"),
  happyHourStart: text("happy_hour_start"),
  happyHourEnd: text("happy_hour_end"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNashobatvChannelSchema = createInsertSchema(nashobatvChannels).omit({ id: true, createdAt: true });
export type InsertNashobatvChannel = z.infer<typeof insertNashobatvChannelSchema>;
export type NashobatvChannel = typeof nashobatvChannels.$inferSelect;

export const insertNashobatvSlideSchema = createInsertSchema(nashobatvSlides).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertNashobatvSlide = z.infer<typeof insertNashobatvSlideSchema>;
export type NashobatvSlide = typeof nashobatvSlides.$inferSelect;

export const insertNashobatvEventSchema = createInsertSchema(nashobatvEvents).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertNashobatvEvent = z.infer<typeof insertNashobatvEventSchema>;
export type NashobatvEvent = typeof nashobatvEvents.$inferSelect;

export const insertNashobatvAnnouncementSchema = createInsertSchema(nashobatvAnnouncements).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertNashobatvAnnouncement = z.infer<typeof insertNashobatvAnnouncementSchema>;
export type NashobatvAnnouncement = typeof nashobatvAnnouncements.$inferSelect;

export const insertNashobatvPhotoSchema = createInsertSchema(nashobatvPhotos).omit({ id: true, createdAt: true });
export type InsertNashobatvPhoto = z.infer<typeof insertNashobatvPhotoSchema>;
export type NashobatvPhoto = typeof nashobatvPhotos.$inferSelect;

export const insertNashobatvDisplaySettingSchema = createInsertSchema(nashobatvDisplaySettings).omit({ id: true });
export type InsertNashobatvDisplaySetting = z.infer<typeof insertNashobatvDisplaySettingSchema>;
export type NashobatvDisplaySetting = typeof nashobatvDisplaySettings.$inferSelect;

export const insertNashobatvDailySpecialSchema = createInsertSchema(nashobatvDailySpecials).omit({ id: true, createdAt: true });
export type InsertNashobatvDailySpecial = z.infer<typeof insertNashobatvDailySpecialSchema>;
export type NashobatvDailySpecial = typeof nashobatvDailySpecials.$inferSelect;

export const insertNashobatvHistoricalFactSchema = createInsertSchema(nashobatvHistoricalFacts).omit({ id: true });
export type InsertNashobatvHistoricalFact = z.infer<typeof insertNashobatvHistoricalFactSchema>;
export type NashobatvHistoricalFact = typeof nashobatvHistoricalFacts.$inferSelect;

// ==================== QuickBooks Integration ====================

export const qbConnection = pgTable("qb_connection", {
  id: serial("id").primaryKey(),
  realmId: varchar("realm_id").notNull().unique(),
  companyName: varchar("company_name"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  accessTokenExpiresAt: timestamp("access_token_expires_at").notNull(),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  lastSyncAt: timestamp("last_sync_at"),
  connectedAt: timestamp("connected_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const qbCustomerMap = pgTable("qb_customer_map", {
  id: serial("id").primaryKey(),
  qbCustomerId: varchar("qb_customer_id").notNull(),
  qbCustomerName: varchar("qb_customer_name").notNull(),
  b2bCustomerId: varchar("b2b_customer_id").references(() => b2bCustomers.id),
  isAutoMatched: boolean("is_auto_matched").notNull().default(false),
  isIgnored: boolean("is_ignored").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_qb_customer_map_qb_id").on(table.qbCustomerId),
  index("idx_qb_customer_map_b2b_id").on(table.b2bCustomerId),
]);

export const qbItemMap = pgTable("qb_item_map", {
  id: serial("id").primaryKey(),
  qbItemId: varchar("qb_item_id").notNull(),
  qbItemName: varchar("qb_item_name").notNull(),
  productId: varchar("product_id").references(() => products.id),
  isAutoMatched: boolean("is_auto_matched").notNull().default(false),
  isIgnored: boolean("is_ignored").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_qb_item_map_qb_id").on(table.qbItemId),
  index("idx_qb_item_map_product_id").on(table.productId),
]);

export const qbSyncLog = pgTable("qb_sync_log", {
  id: serial("id").primaryKey(),
  syncType: varchar("sync_type").notNull(),
  status: varchar("status").notNull(),
  invoicesProcessed: integer("invoices_processed").default(0),
  invoicesCreated: integer("invoices_created").default(0),
  invoicesSkipped: integer("invoices_skipped").default(0),
  invoicesFailed: integer("invoices_failed").default(0),
  customersProcessed: integer("customers_processed").default(0),
  customersMapped: integer("customers_mapped").default(0),
  errorDetails: text("error_details"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const qbInvoiceMap = pgTable("qb_invoice_map", {
  id: serial("id").primaryKey(),
  qbInvoiceId: varchar("qb_invoice_id").notNull().unique(),
  qbDocNumber: varchar("qb_doc_number"),
  b2bOrderId: varchar("b2b_order_id").notNull().references(() => b2bOrders.id),
  qbLastUpdated: timestamp("qb_last_updated"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_qb_invoice_map_qb_id").on(table.qbInvoiceId),
  index("idx_qb_invoice_map_b2b_id").on(table.b2bOrderId),
]);

export const qbPaymentMap = pgTable("qb_payment_map", {
  id: serial("id").primaryKey(),
  qbPaymentId: varchar("qb_payment_id").notNull().unique(),
  qbInvoiceId: varchar("qb_invoice_id").notNull(),
  b2bOrderId: varchar("b2b_order_id").notNull().references(() => b2bOrders.id),
  amountApplied: decimal("amount_applied", { precision: 10, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  paymentMethod: varchar("payment_method"),
  paymentRefNum: varchar("payment_ref_num"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_qb_payment_map_qb_id").on(table.qbPaymentId),
  index("idx_qb_payment_map_b2b_id").on(table.b2bOrderId),
]);

export const qbDescriptionMap = pgTable("qb_description_map", {
  id: serial("id").primaryKey(),
  description: text("description").notNull().unique(),
  parsedName: varchar("parsed_name"),
  productId: varchar("product_id").references(() => products.id),
  isAutoMatched: boolean("is_auto_matched").notNull().default(false),
  isIgnored: boolean("is_ignored").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_qb_desc_map_product_id").on(table.productId),
]);

export type QbConnection = typeof qbConnection.$inferSelect;
export type QbCustomerMap = typeof qbCustomerMap.$inferSelect;
export type QbItemMap = typeof qbItemMap.$inferSelect;
export type QbDescriptionMap = typeof qbDescriptionMap.$inferSelect;
export type QbSyncLog = typeof qbSyncLog.$inferSelect;
export type QbInvoiceMap = typeof qbInvoiceMap.$inferSelect;
export type QbPaymentMap = typeof qbPaymentMap.$inferSelect;

export const toastProductMap = pgTable("toast_product_map", {
  id: serial("id").primaryKey(),
  itemGuid: varchar("item_guid", { length: 100 }).notNull(),
  itemName: varchar("item_name", { length: 500 }).notNull(),
  menuGuid: varchar("menu_guid", { length: 100 }),
  menuName: varchar("menu_name", { length: 255 }),
  menuGroupGuid: varchar("menu_group_guid", { length: 100 }),
  menuGroupName: varchar("menu_group_name", { length: 255 }),
  restaurantGuid: varchar("restaurant_guid", { length: 100 }),
  restaurantName: varchar("restaurant_name", { length: 255 }),
  productId: varchar("product_id").references(() => products.id),
  isAutoMatched: boolean("is_auto_matched").notNull().default(false),
  isIgnored: boolean("is_ignored").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_toast_product_map_item").on(table.itemGuid),
  index("idx_toast_product_map_product").on(table.productId),
  index("idx_toast_product_map_restaurant").on(table.restaurantGuid),
]);

export const shopifyProductMap = pgTable("shopify_product_map", {
  id: serial("id").primaryKey(),
  shopifyProductId: varchar("shopify_product_id", { length: 64 }).notNull(),
  shopifyTitle: varchar("shopify_title", { length: 500 }).notNull(),
  shopifyProductType: varchar("shopify_product_type", { length: 255 }),
  shopifyVendor: varchar("shopify_vendor", { length: 255 }),
  productId: varchar("product_id").references(() => products.id),
  isAutoMatched: boolean("is_auto_matched").notNull().default(false),
  isIgnored: boolean("is_ignored").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_shopify_product_map_shopify").on(table.shopifyProductId),
  index("idx_shopify_product_map_product").on(table.productId),
]);

export const insertToastProductMapSchema = createInsertSchema(toastProductMap).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertToastProductMap = z.infer<typeof insertToastProductMapSchema>;
export type ToastProductMap = typeof toastProductMap.$inferSelect;

export const insertShopifyProductMapSchema = createInsertSchema(shopifyProductMap).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertShopifyProductMap = z.infer<typeof insertShopifyProductMapSchema>;
export type ShopifyProductMap = typeof shopifyProductMap.$inferSelect;

export const meetingNotes = pgTable("meeting_notes", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  duration: integer("duration"),
  transcript: text("transcript"),
  summary: text("summary"),
  actionItems: text("action_items"),
  attendees: text("attendees"),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMeetingNoteSchema = createInsertSchema(meetingNotes).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMeetingNote = z.infer<typeof insertMeetingNoteSchema>;
export type MeetingNote = typeof meetingNotes.$inferSelect;

// ==================== Media Center — Live Music & Special Events ====================

export const mediaMusicians = pgTable("media_musicians", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  genre: varchar("genre", { length: 100 }),
  bio: text("bio"),
  imageUrl: text("image_url"),
  websiteUrl: text("website_url"),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  isApproved: boolean("is_approved").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const mediaMusicEvents = pgTable("media_music_events", {
  id: serial("id").primaryKey(),
  musicianId: integer("musician_id").references(() => mediaMusicians.id),
  title: varchar("title", { length: 255 }).notNull(),
  eventDate: varchar("event_date", { length: 10 }).notNull(),
  startTime: varchar("start_time", { length: 10 }).notNull(),
  endTime: varchar("end_time", { length: 10 }),
  location: varchar("location", { length: 255 }),
  description: text("description"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const mediaMusicianSubmissionStatusEnum = pgEnum("media_musician_submission_status", [
  "pending", "approved", "declined"
]);

export const mediaMusicianSubmissions = pgTable("media_musician_submissions", {
  id: serial("id").primaryKey(),
  musicianName: varchar("musician_name", { length: 255 }).notNull(),
  genre: varchar("genre", { length: 100 }),
  bio: text("bio"),
  websiteUrl: text("website_url"),
  contactEmail: varchar("contact_email", { length: 255 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 50 }),
  message: text("message"),
  songList: text("song_list").notNull(),
  proAcknowledged: boolean("pro_acknowledged").notNull().default(false),
  status: mediaMusicianSubmissionStatusEnum("status").notNull().default("pending"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

export const mediaSpecialEventCategoryEnum = pgEnum("media_special_event_category", [
  "workshop", "cooking-demo", "seasonal", "other"
]);

export const mediaSpecialEvents = pgTable("media_special_events", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  eventDate: varchar("event_date", { length: 10 }).notNull(),
  startTime: varchar("start_time", { length: 10 }).notNull(),
  endTime: varchar("end_time", { length: 10 }),
  location: varchar("location", { length: 255 }),
  imageUrl: text("image_url"),
  price: varchar("price", { length: 50 }),
  shopifyUrl: text("shopify_url"),
  category: mediaSpecialEventCategoryEnum("category").notNull().default("other"),
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMusicianSchema = createInsertSchema(mediaMusicians).omit({ id: true, createdAt: true });
export type InsertMusician = z.infer<typeof insertMusicianSchema>;
export type Musician = typeof mediaMusicians.$inferSelect;

export const insertMusicEventSchema = createInsertSchema(mediaMusicEvents).omit({ id: true, createdAt: true });
export type InsertMusicEvent = z.infer<typeof insertMusicEventSchema>;
export type MusicEvent = typeof mediaMusicEvents.$inferSelect;

export const insertMusicianSubmissionSchema = createInsertSchema(mediaMusicianSubmissions).omit({ id: true, createdAt: true, reviewedAt: true });
export type InsertMusicianSubmission = z.infer<typeof insertMusicianSubmissionSchema>;
export type MusicianSubmission = typeof mediaMusicianSubmissions.$inferSelect;

export const insertSpecialEventSchema = createInsertSchema(mediaSpecialEvents).omit({ id: true, createdAt: true });
export type InsertSpecialEvent = z.infer<typeof insertSpecialEventSchema>;
export type SpecialEvent = typeof mediaSpecialEvents.$inferSelect;

// ─── Food Trucks ────────────────────────────────────────────────────────────

export const mediaFoodTrucks = pgTable("media_food_trucks", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  cuisineType: varchar("cuisine_type", { length: 100 }),
  description: text("description"),
  imageUrl: text("image_url"),
  websiteUrl: text("website_url"),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  isApproved: boolean("is_approved").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  permitNumber: varchar("permit_number", { length: 100 }),
  permitExpiry: varchar("permit_expiry", { length: 10 }),
  permitImageUrl: text("permit_image_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const mediaFoodTruckEvents = pgTable("media_food_truck_events", {
  id: serial("id").primaryKey(),
  foodTruckId: integer("food_truck_id").references(() => mediaFoodTrucks.id),
  title: varchar("title", { length: 255 }).notNull(),
  eventDate: varchar("event_date", { length: 10 }).notNull(),
  startTime: varchar("start_time", { length: 10 }).notNull(),
  endTime: varchar("end_time", { length: 10 }),
  location: varchar("location", { length: 255 }),
  description: text("description"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  permitReminderSentAt: timestamp("permit_reminder_sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const mediaFoodTruckSubmissionStatusEnum = pgEnum("media_food_truck_submission_status", [
  "pending", "approved", "declined"
]);

export const mediaFoodTruckSubmissions = pgTable("media_food_truck_submissions", {
  id: serial("id").primaryKey(),
  truckName: varchar("truck_name", { length: 255 }).notNull(),
  cuisineType: varchar("cuisine_type", { length: 100 }),
  description: text("description"),
  websiteUrl: text("website_url"),
  contactEmail: varchar("contact_email", { length: 255 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 50 }),
  message: text("message"),
  menuDescription: text("menu_description").notNull(),
  healthLicenseAcknowledged: boolean("health_license_acknowledged").notNull().default(false),
  status: mediaFoodTruckSubmissionStatusEnum("status").notNull().default("pending"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

export const insertFoodTruckSchema = createInsertSchema(mediaFoodTrucks).omit({ id: true, createdAt: true });
export type InsertFoodTruck = z.infer<typeof insertFoodTruckSchema>;
export type FoodTruck = typeof mediaFoodTrucks.$inferSelect;

export const insertFoodTruckEventSchema = createInsertSchema(mediaFoodTruckEvents).omit({ id: true, createdAt: true });
export type InsertFoodTruckEvent = z.infer<typeof insertFoodTruckEventSchema>;
export type FoodTruckEvent = typeof mediaFoodTruckEvents.$inferSelect;

export const insertFoodTruckSubmissionSchema = createInsertSchema(mediaFoodTruckSubmissions).omit({ id: true, createdAt: true, reviewedAt: true });
export type InsertFoodTruckSubmission = z.infer<typeof insertFoodTruckSubmissionSchema>;
export type FoodTruckSubmission = typeof mediaFoodTruckSubmissions.$inferSelect;

export const staffPrintMenus = pgTable("staff_print_menus", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  printUrl: text("print_url").notNull(),
  menuGuid: varchar("menu_guid", { length: 100 }),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertStaffPrintMenuSchema = createInsertSchema(staffPrintMenus).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStaffPrintMenu = z.infer<typeof insertStaffPrintMenuSchema>;
export type StaffPrintMenu = typeof staffPrintMenus.$inferSelect;

export const toastMenuEmbedConfigs = pgTable("toast_menu_embed_configs", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  menuGuids: text("menu_guids").notNull(),
  template: varchar("template", { length: 50 }).default("fine-dining"),
  header: text("header"),
  footer: text("footer"),
  headerFontSize: real("header_font_size").default(1),
  footerFontSize: real("footer_font_size").default(1),
  itemFontSize: real("item_font_size").default(1),
  descFontSize: real("desc_font_size").default(1),
  scale: integer("scale").default(100),
  groupGuids: text("group_guids"),
  hideDescriptions: boolean("hide_descriptions").default(false),
  hidePricing: boolean("hide_pricing").default(false),
  hideWinePairing: boolean("hide_wine_pairing").default(false),
  showImages: boolean("show_images").default(false),
  pages: integer("pages").default(0),
  pageBreaks: text("page_breaks"),
  printAdditionalMenuGuids: text("print_additional_menu_guids"),
  customTitle: text("custom_title"),
  showOnStaffBoard: boolean("show_on_staff_board").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertToastMenuEmbedConfigSchema = createInsertSchema(toastMenuEmbedConfigs).omit({ id: true, slug: true, createdAt: true, updatedAt: true });
export type InsertToastMenuEmbedConfig = z.infer<typeof insertToastMenuEmbedConfigSchema>;
export type ToastMenuEmbedConfig = typeof toastMenuEmbedConfigs.$inferSelect;

// ─── Flight Card Configs ────────────────────────────────────────────────────
export const flightCardConfigs = pgTable("flight_card_configs", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  header: text("header"),
  footer: text("footer"),
  productIds: text("product_ids").notNull().default(""),
  template: varchar("template", { length: 50 }).default("classic"),
  paperSize: varchar("paper_size", { length: 20 }).default("a6"),
  showPrice: boolean("show_price").default(true),
  showDescription: boolean("show_description").default(true),
  showVintage: boolean("show_vintage").default(true),
  showVarietal: boolean("show_varietal").default(true),
  showAlcohol: boolean("show_alcohol").default(false),
  showTastingLines: boolean("show_tasting_lines").default(false),
  fontScale: integer("font_scale").default(100),
  showOnStaffBoard: boolean("show_on_staff_board").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFlightCardConfigSchema = createInsertSchema(flightCardConfigs).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFlightCardConfig = z.infer<typeof insertFlightCardConfigSchema>;
export type FlightCardConfig = typeof flightCardConfigs.$inferSelect;

// ─── Email Delivery Logs ─────────────────────────────────────────────────────
// Tracks outbound support emails and their SendGrid delivery events
export const emailDeliveryLogs = pgTable("email_delivery_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => supportRequests.id, { onDelete: 'cascade' }),
  messageId: varchar("message_id").references(() => supportMessages.id, { onDelete: 'set null' }),
  recipientEmail: varchar("recipient_email").notNull(),
  subject: text("subject"),
  sendgridMessageId: varchar("sendgrid_message_id"),
  status: varchar("status").notNull().default("sent"),
  statusDetail: text("status_detail"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  lastEventAt: timestamp("last_event_at"),
}, (table) => [
  index("idx_email_log_ticket").on(table.ticketId),
  index("idx_email_log_sendgrid").on(table.sendgridMessageId),
  index("idx_email_log_status").on(table.status),
]);

export const insertEmailDeliveryLogSchema = createInsertSchema(emailDeliveryLogs).omit({ id: true, sentAt: true });
export type InsertEmailDeliveryLog = z.infer<typeof insertEmailDeliveryLogSchema>;
export type EmailDeliveryLog = typeof emailDeliveryLogs.$inferSelect;
