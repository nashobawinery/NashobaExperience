import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, boolean, timestamp, jsonb, unique, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define enums for consistent data
export const categoryEnum = pgEnum("category", ["wine", "spirits", "beer", "canned_cocktail", "canned_wine"]);
export const wineColorEnum = pgEnum("wine_color", ["red", "white", "rosé", "sparkling", "dessert"]);
export const sweetnessEnum = pgEnum("sweetness", ["dry", "off-dry", "semi-sweet", "sweet"]);
export const bodyEnum = pgEnum("body", ["light", "medium", "full"]);
export const userRoleEnum = pgEnum("user_role", ["viewer", "admin"]);
export const rewardTypeEnum = pgEnum("reward_type", ["discount", "token"]);
export const redemptionStatusEnum = pgEnum("redemption_status", ["pending", "applied", "void"]);
export const accountStatusEnum = pgEnum("account_status", ["active", "pending_approval", "inactive", "suspended"]);
export const b2bUserTypeEnum = pgEnum("b2b_user_type", ["customer", "sales_rep", "admin"]);

// Beer-specific enums
export const beerStyleEnum = pgEnum("beer_style", ["ipa", "lager", "stout", "porter", "ale", "wheat_beer", "pilsner", "sour", "amber", "pale_ale", "saison", "belgian"]);
export const beerColorEnum = pgEnum("beer_color", ["pale", "amber", "dark"]);
export const beerBitternessEnum = pgEnum("beer_bitterness", ["mild", "moderate", "hoppy", "very_hoppy"]);

// Spirits-specific enums
export const spiritTypeEnum = pgEnum("spirit_type", ["whiskey", "vodka", "gin", "rum", "tequila", "brandy", "cognac", "liqueur", "mezcal", "bourbon", "scotch", "rye"]);
export const spiritAgingEnum = pgEnum("spirit_aging", ["unaged", "young", "aged", "extra_aged"]);
export const spiritFlavorEnum = pgEnum("spirit_flavor", ["smooth", "bold", "sweet", "spicy", "fruity", "smoky", "herbal", "citrus"]);

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
  tierName: text("tier_name").notNull().unique(),
  description: text("description"),
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }).notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const salesReps = pgTable("sales_reps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").notNull().unique(),
  passwordHash: varchar("password_hash").notNull(),
  phoneNumber: varchar("phone_number"),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const b2bCustomers = pgTable("b2b_customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountName: varchar("account_name").notNull(),
  accountStatus: accountStatusEnum("account_status").notNull().default("pending_approval"),
  pricingTierId: varchar("pricing_tier_id").references(() => tierPricing.id),
  licenseNumber: varchar("license_number"),
  taxId: varchar("tax_id"),
  creditTerms: varchar("credit_terms"),
  creditLimit: decimal("credit_limit", { precision: 10, scale: 2 }),
  primaryContactName: varchar("primary_contact_name").notNull(),
  primaryContactRole: varchar("primary_contact_role"),
  emailAddress: varchar("email_address").notNull().unique(),
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
  notes: text("notes"),
  acceptsMarketing: boolean("accepts_marketing").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
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
  status: varchar("status").notNull().default("pending"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).default('0'),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  shippingAddress: text("shipping_address"),
  shippingCity: varchar("shipping_city"),
  shippingState: varchar("shipping_state"),
  shippingZipCode: varchar("shipping_zip_code"),
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

export const b2bSettings = pgTable("b2b_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  settingKey: varchar("setting_key").notNull().unique(),
  settingValue: text("setting_value"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
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
export const insertVideoSchema = createInsertSchema(videos).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCommercialSchema = createInsertSchema(commercials).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCharacteristicSchema = createInsertSchema(characteristics).omit({ id: true, createdAt: true, updatedAt: true, usageCount: true });
export const insertProductCharacteristicSchema = createInsertSchema(productCharacteristics).omit({ id: true, createdAt: true });

// B2B Insert schemas
export const insertTierPricingSchema = createInsertSchema(tierPricing).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSalesRepSchema = createInsertSchema(salesReps).omit({ id: true, createdAt: true, updatedAt: true });
export const insertB2bAdminSchema = createInsertSchema(b2bAdmins).omit({ id: true, createdAt: true, updatedAt: true });
export const insertB2bCustomerSchema = createInsertSchema(b2bCustomers).omit({ id: true, createdAt: true, updatedAt: true, signupDate: true, lastOrderDate: true, totalPurchaseValue: true, passwordHash: true, approvedAt: true, approvedByAdminId: true });
export const insertB2bOrderSchema = createInsertSchema(b2bOrders).omit({ id: true, createdAt: true, updatedAt: true, orderDate: true });
export const insertB2bOrderItemSchema = createInsertSchema(b2bOrderItems).omit({ id: true, createdAt: true, orderId: true });
export const insertB2bSettingSchema = createInsertSchema(b2bSettings).omit({ id: true, updatedAt: true });
export const insertB2bPasswordResetTokenSchema = createInsertSchema(b2bPasswordResetTokens).omit({ id: true, createdAt: true, used: true });

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

export type InsertB2bOrder = z.infer<typeof insertB2bOrderSchema>;
export type B2bOrder = typeof b2bOrders.$inferSelect;

export type InsertB2bOrderItem = z.infer<typeof insertB2bOrderItemSchema>;
export type B2bOrderItem = typeof b2bOrderItems.$inferSelect;

export type InsertB2bSetting = z.infer<typeof insertB2bSettingSchema>;
export type B2bSetting = typeof b2bSettings.$inferSelect;

export type InsertB2bPasswordResetToken = z.infer<typeof insertB2bPasswordResetTokenSchema>;
export type B2bPasswordResetToken = typeof b2bPasswordResetTokens.$inferSelect;
