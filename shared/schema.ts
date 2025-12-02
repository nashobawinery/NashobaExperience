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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

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
});

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
  orderDate: timestamp("order_date").notNull().defaultNow(),
  status: varchar("status").notNull().default("pending_approval"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).default('0'),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  shippingAddress: text("shipping_address"),
  shippingCity: varchar("shipping_city"),
  shippingState: varchar("shipping_state"),
  shippingZipCode: varchar("shipping_zip_code"),
  deliveredAt: timestamp("delivered_at"),
  paidAt: timestamp("paid_at"),
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
// COMPLIANCE MODULE TABLES
// ============================================

// Compliance Tasks - Main table for tracking compliance obligations
export const complianceTasks = pgTable("compliance_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskName: text("task_name").notNull(),
  description: text("description"),
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
export const insertB2bCustomerLocationSchema = createInsertSchema(b2bCustomerLocations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertB2bCustomerManualProductSchema = createInsertSchema(b2bCustomerManualProducts).omit({ id: true, createdAt: true });
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

export type InsertB2bCustomerLocation = z.infer<typeof insertB2bCustomerLocationSchema>;
export type B2bCustomerLocation = typeof b2bCustomerLocations.$inferSelect;

export type InsertB2bCustomerManualProduct = z.infer<typeof insertB2bCustomerManualProductSchema>;
export type B2bCustomerManualProduct = typeof b2bCustomerManualProducts.$inferSelect;

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

// Extended Compliance types with relations
export type ComplianceTaskWithDetails = ComplianceTask & {
  history?: ComplianceTaskHistory[];
  reminders?: ComplianceReminder[];
  attachments?: ComplianceAttachment[];
};

// ============================================
// DAILY REPORTS MODULE
// ============================================

// Department enum for Daily Reports
export const dailyReportDepartmentEnum = pgEnum("daily_report_department", [
  "tasting_room",
  "retail",
  "the_knoll",
  "pavilion",
  "js_restaurant",
  "production",
  "events",
  "maintenance",
  "orchard",
  "food_operations"
]);

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
  department: dailyReportDepartmentEnum("department").notNull().unique(),
  departmentLabel: text("department_label").notNull(),
  metrics: jsonb("metrics").notNull(), // Array of { key, label, type: 'count'|'decimal'|'text', required, description }
  notificationEmails: jsonb("notification_emails").default([]), // Array of { email, name?, role? }
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Daily Procedure Templates - Checklist items per department
export const dailyProcedureTemplates = pgTable("daily_procedure_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  department: dailyReportDepartmentEnum("department").notNull(),
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
  department: dailyReportDepartmentEnum("department").notNull(),
  reportDate: timestamp("report_date").notNull(),
  submittedById: varchar("submitted_by_id").references(() => platformUsers.id),
  submittedByName: text("submitted_by_name"),
  
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
  department: dailyReportDepartmentEnum("department").notNull(),
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

// Daily Reports Types
export type InsertDailyReportTemplate = z.infer<typeof insertDailyReportTemplateSchema>;
export type DailyReportTemplate = typeof dailyReportTemplates.$inferSelect;

export type InsertDailyProcedureTemplate = z.infer<typeof insertDailyProcedureTemplateSchema>;
export type DailyProcedureTemplate = typeof dailyProcedureTemplates.$inferSelect;

export type InsertDailyReport = z.infer<typeof insertDailyReportSchema>;
export type DailyReport = typeof dailyReports.$inferSelect;

export type InsertDailyReportIncident = z.infer<typeof insertDailyReportIncidentSchema>;
export type DailyReportIncident = typeof dailyReportIncidents.$inferSelect;

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
export const dailyReportAccessCodes = pgTable("daily_report_access_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 4 }).notNull().unique(),
  staffName: varchar("staff_name").notNull(),
  department: dailyReportDepartmentEnum("department").notNull(),
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
  "text"
]);

export const dailyReportFieldDefinitions = pgTable("daily_report_field_definitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).notNull().unique(),
  label: varchar("label", { length: 200 }).notNull(),
  type: dailyReportFieldTypeEnum("type").notNull().default("text"),
  description: text("description"),
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
