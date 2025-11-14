import { db } from "./db";
import { eq, and, desc, ilike, or, sql, inArray, type SQL } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";
import {
  products,
  users,
  guestSessions,
  favorites,
  viewHistory,
  cartItems,
  triviaQuestions,
  triviaScores,
  triviaAchievements,
  triviaAttempts,
  cartDiscounts,
  achievementRedemptions,
  appSettings,
  surveys,
  productNotes,
  filterOptions,
  slideshowImages,
  mediaLibrary,
  videos,
  commercials,
  whitelistedEmails,
  characteristics,
  productCharacteristics,
  type InsertProduct,
  type Product,
  type ProductWithCharacteristics,
  type InsertUser,
  type UpsertUser,
  type User,
  type InsertGuestSession,
  type GuestSession,
  type InsertFavorite,
  type Favorite,
  type InsertViewHistory,
  type ViewHistory,
  type InsertCartItem,
  type CartItem,
  type InsertTriviaQuestion,
  type TriviaQuestion,
  type InsertTriviaScore,
  type TriviaScore,
  type InsertTriviaAchievement,
  type TriviaAchievement,
  type InsertTriviaAttempt,
  type TriviaAttempt,
  type InsertCartDiscount,
  type CartDiscount,
  type InsertAchievementRedemption,
  type AchievementRedemption,
  type InsertAppSetting,
  type AppSetting,
  type InsertSurvey,
  type Survey,
  type InsertProductNote,
  type ProductNote,
  type InsertFilterOption,
  type FilterOption,
  type InsertSlideshowImage,
  type SlideshowImage,
  type InsertMediaLibrary,
  type MediaLibrary,
  type InsertVideo,
  type Video,
  type InsertCommercial,
  type Commercial,
  type InsertWhitelistedEmail,
  type WhitelistedEmail,
  type InsertCharacteristic,
  type Characteristic,
  type InsertProductCharacteristic,
  type ProductCharacteristic,
  tierPricing,
  salesReps,
  b2bAdmins,
  b2bCustomers,
  b2bOrders,
  b2bOrderItems,
  b2bSettings,
  type InsertTierPricing,
  type TierPricing,
  type InsertSalesRep,
  type SalesRep,
  type InsertB2bAdmin,
  type B2bAdmin,
  type InsertB2bCustomer,
  type B2bCustomer,
  type InsertB2bOrder,
  type B2bOrder,
  type InsertB2bOrderItem,
  type B2bOrderItem,
  type InsertB2bSetting,
  type B2bSetting,
} from "@shared/schema";

// Helper function for case-insensitive comparisons
function lower(column: AnyColumn): SQL {
  return sql`lower(${column})`;
}

export interface IStorage {
  // Users (for authentication)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUserRole(id: string, role: "viewer" | "admin"): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Whitelisted Emails
  getAllWhitelistedEmails(): Promise<WhitelistedEmail[]>;
  getWhitelistedEmail(email: string): Promise<WhitelistedEmail | undefined>;
  addWhitelistedEmail(data: InsertWhitelistedEmail): Promise<WhitelistedEmail>;
  upsertWhitelistedEmail(data: InsertWhitelistedEmail & { id?: string }): Promise<{ email: WhitelistedEmail; action: 'created' | 'updated' }>;
  deleteWhitelistedEmail(id: string): Promise<boolean>;

  // Products
  getProducts(filters?: ProductFilters): Promise<Product[]>;
  getProductsWithCharacteristics(beverageTypes?: string[]): Promise<ProductWithCharacteristics[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductBySku(sku: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  upsertProductBySku(product: InsertProduct): Promise<{ product: Product; action: 'created' | 'updated' }>;
  deleteProduct(id: string): Promise<boolean>;
  incrementProductViews(productId: string): Promise<void>;

  // Guest Sessions
  createGuestSession(session: InsertGuestSession): Promise<GuestSession>;
  getGuestSession(id: string): Promise<GuestSession | undefined>;
  updateSessionActivity(id: string): Promise<void>;
  updateGuestPreferences(
    id: string,
    beverageTypes: string[],
    flavorPreferences: string[],
    wineColors?: string[],
    occasion?: string
  ): Promise<GuestSession>;

  // Favorites
  getFavorites(sessionId: string): Promise<(Favorite & { product: Product })[]>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  updateFavoriteNote(id: string, note: string): Promise<Favorite | undefined>;
  removeFavorite(sessionId: string, productId: string): Promise<boolean>;

  // View History
  getViewHistory(sessionId: string): Promise<(ViewHistory & { product: Product })[]>;
  recordView(sessionId: string, productId: string): Promise<void>;

  // Cart
  getCartItems(sessionId: string): Promise<(CartItem & { product: Product })[]>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItemQuantity(id: string, quantity: number): Promise<CartItem | undefined>;
  removeFromCart(id: string): Promise<boolean>;
  clearCart(sessionId: string): Promise<void>;

  // Trivia
  getTriviaQuestions(activeOnly?: boolean): Promise<TriviaQuestion[]>;
  getTriviaQuestion(id: string): Promise<TriviaQuestion | undefined>;
  createTriviaQuestion(question: InsertTriviaQuestion): Promise<TriviaQuestion>;
  updateTriviaQuestion(id: string, question: Partial<InsertTriviaQuestion>): Promise<TriviaQuestion | undefined>;
  upsertTriviaQuestion(question: InsertTriviaQuestion & { id?: string }): Promise<{ question: TriviaQuestion; action: 'created' | 'updated' }>;
  deleteTriviaQuestion(id: string): Promise<boolean>;
  
  getTriviaScores(sessionId: string): Promise<TriviaScore[]>;
  recordTriviaAnswer(score: InsertTriviaScore): Promise<TriviaScore>;
  getAskedQuestions(sessionId: string): Promise<string[]>;

  // Trivia Achievements
  getTriviaAchievements(): Promise<TriviaAchievement[]>;
  createTriviaAchievement(data: InsertTriviaAchievement): Promise<TriviaAchievement>;
  updateTriviaAchievement(id: string, data: Partial<InsertTriviaAchievement>): Promise<TriviaAchievement | undefined>;
  upsertTriviaAchievement(data: InsertTriviaAchievement & { id?: string }): Promise<{ achievement: TriviaAchievement; action: 'created' | 'updated' }>;
  deleteTriviaAchievement(id: string): Promise<boolean>;

  // Trivia Attempts
  getTriviaAttempt(sessionId: string): Promise<TriviaAttempt | undefined>;
  createTriviaAttempt(data: InsertTriviaAttempt): Promise<TriviaAttempt>;
  updateTriviaAttempt(id: string, data: Partial<InsertTriviaAttempt>): Promise<TriviaAttempt | undefined>;

  // Cart Discounts
  getCartDiscounts(sessionId: string): Promise<CartDiscount[]>;
  createCartDiscount(data: InsertCartDiscount): Promise<CartDiscount>;

  // Achievement Redemptions
  createAchievementRedemption(data: InsertAchievementRedemption): Promise<AchievementRedemption>;
  updateAchievementRedemption(id: string, data: Partial<InsertAchievementRedemption>): Promise<AchievementRedemption | undefined>;

  // Settings
  getSetting(key: string): Promise<AppSetting | undefined>;
  setSetting(key: string, value: any): Promise<AppSetting>;

  // Surveys
  createSurvey(survey: InsertSurvey): Promise<Survey>;

  // Product Notes
  getProductNotes(sessionId: string): Promise<ProductNote[]>;
  getProductNote(sessionId: string, productId: string): Promise<ProductNote | undefined>;
  saveProductNote(note: InsertProductNote): Promise<ProductNote>;
  deleteProductNote(sessionId: string, productId: string): Promise<boolean>;
  migrateFavoritesNotesToProductNotes(): Promise<number>;

  // Filter Options
  getFilterOptions(fieldType?: string): Promise<FilterOption[]>;
  getFilterOption(id: string): Promise<FilterOption | undefined>;
  createFilterOption(option: InsertFilterOption): Promise<FilterOption>;
  updateFilterOption(id: string, option: Partial<InsertFilterOption>): Promise<FilterOption | undefined>;
  upsertFilterOption(option: InsertFilterOption & { id?: string }): Promise<{ filterOption: FilterOption; action: 'created' | 'updated' }>;
  deleteFilterOption(id: string): Promise<boolean>;
  updateFilterOptionOrder(updates: { id: string; sortOrder: number }[]): Promise<void>;

  // Slideshow Images
  getSlideshowImages(activeOnly?: boolean): Promise<SlideshowImage[]>;
  getSlideshowImage(id: string): Promise<SlideshowImage | undefined>;
  createSlideshowImage(image: InsertSlideshowImage): Promise<SlideshowImage>;
  updateSlideshowImage(id: string, image: Partial<InsertSlideshowImage>): Promise<SlideshowImage | undefined>;
  upsertSlideshowImage(image: InsertSlideshowImage & { id?: string }): Promise<{ image: SlideshowImage; action: 'created' | 'updated' }>;
  deleteSlideshowImage(id: string): Promise<boolean>;
  updateSlideshowImageOrder(updates: { id: string; displayOrder: number }[]): Promise<void>;

  // Media Library
  getMediaLibraryFiles(category?: string): Promise<MediaLibrary[]>;
  getMediaLibraryFile(id: string): Promise<MediaLibrary | undefined>;
  createMediaLibraryFile(file: InsertMediaLibrary): Promise<MediaLibrary>;
  updateMediaLibraryFile(id: string, file: Partial<InsertMediaLibrary>): Promise<MediaLibrary | undefined>;
  upsertMediaLibraryFile(file: InsertMediaLibrary & { id?: string }): Promise<{ file: MediaLibrary; action: 'created' | 'updated' }>;
  deleteMediaLibraryFile(id: string): Promise<boolean>;

  // Videos
  getVideos(activeOnly?: boolean): Promise<Video[]>;
  getVideo(id: string): Promise<Video | undefined>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: string, video: Partial<InsertVideo>): Promise<Video | undefined>;
  upsertVideo(video: InsertVideo & { id?: string }): Promise<{ video: Video; action: 'created' | 'updated' }>;
  deleteVideo(id: string): Promise<boolean>;
  updateVideoOrder(updates: { id: string; sortOrder: number }[]): Promise<void>;

  // Commercials
  getCommercials(activeOnly?: boolean): Promise<Commercial[]>;
  getCommercial(id: string): Promise<Commercial | undefined>;
  createCommercial(commercial: InsertCommercial): Promise<Commercial>;
  updateCommercial(id: string, commercial: Partial<InsertCommercial>): Promise<Commercial | undefined>;
  upsertCommercial(commercial: InsertCommercial & { id?: string }): Promise<{ commercial: Commercial; action: 'created' | 'updated' }>;
  deleteCommercial(id: string): Promise<boolean>;
  updateCommercialOrder(updates: { id: string; sortOrder: number }[]): Promise<void>;

  // Characteristics
  searchCharacteristics(query?: string, category?: string): Promise<Characteristic[]>;
  getCharacteristic(id: string): Promise<Characteristic | undefined>;
  getCharacteristicByName(name: string): Promise<Characteristic | undefined>;
  createCharacteristic(name: string, productTypes?: string[]): Promise<Characteristic>;
  getProductCharacteristics(productId: string): Promise<Characteristic[]>;
  setProductCharacteristics(productId: string, characteristicNames: string[], category?: string): Promise<void>;

  // B2B - Tier Pricing
  getAllTierPricing(): Promise<TierPricing[]>;
  getTierPricing(id: string): Promise<TierPricing | undefined>;
  createTierPricing(data: InsertTierPricing): Promise<TierPricing>;
  updateTierPricing(id: string, data: Partial<InsertTierPricing>): Promise<TierPricing | undefined>;
  deleteTierPricing(id: string): Promise<boolean>;

  // B2B - Sales Reps
  getAllSalesReps(activeOnly?: boolean): Promise<SalesRep[]>;
  getSalesRep(id: string): Promise<SalesRep | undefined>;
  getSalesRepByEmail(email: string): Promise<SalesRep | undefined>;
  createSalesRep(data: InsertSalesRep): Promise<SalesRep>;
  updateSalesRep(id: string, data: Partial<InsertSalesRep>): Promise<SalesRep | undefined>;
  deleteSalesRep(id: string): Promise<boolean>;

  // B2B - Admins
  getAllB2bAdmins(activeOnly?: boolean): Promise<B2bAdmin[]>;
  getB2bAdmin(id: string): Promise<B2bAdmin | undefined>;
  getB2bAdminByEmail(email: string): Promise<B2bAdmin | undefined>;
  createB2bAdmin(data: InsertB2bAdmin): Promise<B2bAdmin>;
  updateB2bAdmin(id: string, data: Partial<InsertB2bAdmin>): Promise<B2bAdmin | undefined>;
  deleteB2bAdmin(id: string): Promise<boolean>;

  // B2B - Customers
  getAllB2bCustomers(status?: string): Promise<(B2bCustomer & { tier?: TierPricing | null; salesRep?: SalesRep | null })[]>;
  getB2bCustomer(id: string): Promise<(B2bCustomer & { tier?: TierPricing | null; salesRep?: SalesRep | null }) | undefined>;
  getB2bCustomerByEmail(email: string): Promise<(B2bCustomer & { tier?: TierPricing | null; salesRep?: SalesRep | null }) | undefined>;
  createB2bCustomer(data: InsertB2bCustomer): Promise<B2bCustomer>;
  updateB2bCustomer(id: string, data: Partial<InsertB2bCustomer>): Promise<B2bCustomer | undefined>;
  deleteB2bCustomer(id: string): Promise<boolean>;
  approveB2bCustomer(id: string, tierId: string, passwordHash: string, approvedByAdminId: string): Promise<B2bCustomer | undefined>;

  // B2B - Orders
  getAllB2bOrders(): Promise<(B2bOrder & { customer: B2bCustomer })[]>;
  getB2bOrders(customerId: string): Promise<(B2bOrder & { items: (B2bOrderItem & { product: Product })[] })[]>;
  getB2bOrder(id: string): Promise<(B2bOrder & { customer: B2bCustomer; items: (B2bOrderItem & { product: Product })[] }) | undefined>;
  createB2bOrder(orderData: InsertB2bOrder, items: InsertB2bOrderItem[]): Promise<B2bOrder>;
  updateB2bOrder(id: string, data: Partial<InsertB2bOrder>): Promise<B2bOrder | undefined>;
  deleteB2bOrder(id: string): Promise<boolean>;
  getCustomerPreviousProducts(customerId: string): Promise<Product[]>;

  // B2B - Settings
  getB2bSetting(key: string): Promise<B2bSetting | undefined>;
  setB2bSetting(key: string, value: string): Promise<B2bSetting>;
  getAllB2bSettings(): Promise<B2bSetting[]>;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  // Wine filters
  wineColor?: string;
  sweetness?: string;
  body?: string;
  characteristics?: string;
  // Beer filters
  beerStyle?: string;
  beerColor?: string;
  beerBitterness?: string;
  // Spirits filters
  spiritType?: string;
  spiritAging?: string;
  spiritFlavor?: string;
  minPrice?: number;
  maxPrice?: number;
  stock?: string;
}

export class DatabaseStorage implements IStorage {
  // User operations (for authentication)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          role: userData.role,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updateUserRole(id: string, role: "viewer" | "admin"): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getAllWhitelistedEmails(): Promise<WhitelistedEmail[]> {
    return await db.select().from(whitelistedEmails).orderBy(desc(whitelistedEmails.createdAt));
  }

  async getWhitelistedEmail(email: string): Promise<WhitelistedEmail | undefined> {
    const [whitelisted] = await db.select().from(whitelistedEmails).where(eq(whitelistedEmails.email, email));
    return whitelisted;
  }

  async addWhitelistedEmail(data: InsertWhitelistedEmail): Promise<WhitelistedEmail> {
    const [whitelisted] = await db.insert(whitelistedEmails).values(data).returning();
    return whitelisted;
  }

  async deleteWhitelistedEmail(id: string): Promise<boolean> {
    const result = await db.delete(whitelistedEmails).where(eq(whitelistedEmails.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async upsertWhitelistedEmail(data: InsertWhitelistedEmail & { id?: string }): Promise<{ email: WhitelistedEmail; action: 'created' | 'updated' }> {
    // Try to find by ID first
    if (data.id) {
      const result = await db.select().from(whitelistedEmails).where(eq(whitelistedEmails.id, data.id)).limit(1);
      if (result.length > 0) {
        const updated = await db
          .update(whitelistedEmails)
          .set({ role: data.role })
          .where(eq(whitelistedEmails.id, data.id))
          .returning();
        return { email: updated[0], action: 'updated' };
      }
    }
    
    // Try to find by email (natural key)
    const existing = await this.getWhitelistedEmail(data.email);
    if (existing) {
      const updated = await db
        .update(whitelistedEmails)
        .set({ role: data.role })
        .where(eq(whitelistedEmails.id, existing.id))
        .returning();
      return { email: updated[0], action: 'updated' };
    }
    
    // Create new
    const created = await this.addWhitelistedEmail(data);
    return { email: created, action: 'created' };
  }

  async getProducts(filters?: ProductFilters): Promise<Product[]> {
    let query = db.select().from(products);
    
    const conditions = [];
    if (filters?.search) {
      // Keep original substring search for text fields to support phrases like "ice wine"
      conditions.push(
        or(
          ilike(products.name, `%${filters.search}%`),
          ilike(products.description, `%${filters.search}%`),
          ilike(products.tastingNotes, `%${filters.search}%`)
        )
      );
    }
    if (filters?.category) {
      // Cast enum to text before using lower() to avoid PostgreSQL enum comparison errors
      conditions.push(sql`lower(${products.category}::text) = ${filters.category.toLowerCase()}`);
    }
    if (filters?.wineColor) {
      // Filter by the 'type' field which contains wine types like "Red Wine", "White Wine", etc.
      conditions.push(ilike(products.type, `%${filters.wineColor}%`));
    }
    if (filters?.sweetness) {
      // EXACT match on sweetness field to prevent "dry" matching "off-dry"
      // Use case-insensitive exact comparison
      conditions.push(sql`lower(${products.sweetness}) = ${filters.sweetness.toLowerCase()}`);
    }
    if (filters?.body) {
      // EXACT match on body field for consistency
      conditions.push(sql`lower(${products.body}) = ${filters.body.toLowerCase()}`);
    }
    if (filters?.characteristics) {
      // Filter by characteristics field for specific traits like "Crisp", "Rich", etc.
      conditions.push(ilike(products.characteristics, `%${filters.characteristics}%`));
    }
    // Beer filters
    if (filters?.beerStyle && filters.beerStyle !== 'all') {
      conditions.push(sql`${products.beerStyle}::text = ${filters.beerStyle}`);
    }
    if (filters?.beerColor && filters.beerColor !== 'all') {
      conditions.push(sql`${products.beerColor}::text = ${filters.beerColor}`);
    }
    if (filters?.beerBitterness && filters.beerBitterness !== 'all') {
      conditions.push(sql`${products.beerBitterness}::text = ${filters.beerBitterness}`);
    }
    // Spirits filters
    if (filters?.spiritType && filters.spiritType !== 'all') {
      conditions.push(sql`${products.spiritType}::text = ${filters.spiritType}`);
    }
    if (filters?.spiritAging && filters.spiritAging !== 'all') {
      conditions.push(sql`${products.spiritAging}::text = ${filters.spiritAging}`);
    }
    if (filters?.spiritFlavor && filters.spiritFlavor !== 'all') {
      conditions.push(sql`${products.spiritFlavor}::text = ${filters.spiritFlavor}`);
    }
    if (filters?.stock) {
      // When filtering for in-stock items, include products with ignoreInventory=true OR stock > 0
      // When filtering for out-of-stock items, only show products that are tracked (ignoreInventory=false) AND have 0 stock
      if (filters.stock === 'in-stock' || filters.stock === 'true') {
        conditions.push(sql`(${products.ignoreInventory} = true OR ${products.stockQuantity} > 0)`);
      } else if (filters.stock === 'out-of-stock' || filters.stock === 'false') {
        conditions.push(sql`(${products.ignoreInventory} = false AND ${products.stockQuantity} = 0)`);
      }
    }
    if (filters?.minPrice !== undefined) {
      conditions.push(sql`${products.price}::numeric >= ${filters.minPrice}`);
    }
    if (filters?.maxPrice !== undefined) {
      conditions.push(sql`${products.price}::numeric <= ${filters.maxPrice}`);
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query;
  }

  async getProductsWithCharacteristics(beverageTypes?: string[]): Promise<ProductWithCharacteristics[]> {
    // Build SQL query with LEFT JOIN and array_agg to aggregate characteristics per product
    const filterClause = beverageTypes && beverageTypes.length > 0
      ? sql`AND c.product_types && ARRAY[${sql.join(beverageTypes.map(t => sql`${t}`), sql`, `)}]::category[]`
      : sql``;

    const result = await db.execute<Product & { characteristics: string | null }>(sql`
      SELECT 
        p.id,
        p.name,
        p.category,
        p.type,
        p.varietal,
        p.vintage_year AS "vintageYear",
        p.region,
        p.description,
        p.tasting_notes AS "tastingNotes",
        p.food_pairings AS "foodPairings",
        p.serving_temp AS "servingTemp",
        p.alcohol_content AS "alcoholContent",
        p.bottle_size AS "bottleSize",
        p.price,
        p.cost,
        p.wholesale_pricing AS "wholesalePricing",
        p.sku,
        p.stock_quantity AS "stockQuantity",
        p.low_stock_threshold AS "lowStockThreshold",
        p.ignore_inventory AS "ignoreInventory",
        p.image_url AS "imageUrl",
        p.label_image_url AS "labelImageUrl",
        p.lifestyle_image_url AS "lifestyleImageUrl",
        p.characteristics AS "characteristicsRaw",
        p.wine_color AS "wineColor",
        p.sweetness,
        p.body,
        p.beer_style AS "beerStyle",
        p.beer_color AS "beerColor",
        p.beer_bitterness AS "beerBitterness",
        p.spirit_type AS "spiritType",
        p.spirit_aging AS "spiritAging",
        p.spirit_flavor AS "spiritFlavor",
        p.production_method AS "productionMethod",
        p.aging_process AS "agingProcess",
        p.awards,
        p.rating,
        p.available,
        p.featured,
        p.new_arrival AS "newArrival",
        p.staff_pick AS "staffPick",
        p.wine_of_month AS "wineOfMonth",
        p.tags,
        p.created_at AS "createdAt",
        COALESCE(
          json_agg(
            json_build_object(
              'id', c.id,
              'name', c.name,
              'productTypes', c.product_types
            )
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'
        )::text as characteristics
      FROM products p
      LEFT JOIN product_characteristics pc ON p.id = pc.product_id
      LEFT JOIN characteristics c ON pc.characteristic_id = c.id ${filterClause}
      WHERE p.available = true
      GROUP BY p.id
      ORDER BY p.name
    `);

    // Parse the JSON characteristics string and transform rows
    return result.rows.map(row => ({
      ...row,
      characteristics: row.characteristics ? JSON.parse(row.characteristics) : [],
    })) as ProductWithCharacteristics[];
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.id, id));
    return result[0];
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const result = await db.insert(products).values(product).returning();
    return result[0];
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const result = await db.update(products).set(product).where(eq(products.id, id)).returning();
    return result[0];
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async incrementProductViews(productId: string): Promise<void> {
    await db.execute(sql`
      UPDATE ${products} 
      SET view_count = COALESCE(view_count, 0) + 1 
      WHERE id = ${productId}
    `);
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    if (!sku) return undefined;
    const normalizedSku = sku.trim().toUpperCase();
    const result = await db.select().from(products).where(sql`UPPER(TRIM(${products.sku})) = ${normalizedSku}`);
    return result[0];
  }

  async upsertProductBySku(product: InsertProduct): Promise<{ product: Product; action: 'created' | 'updated' }> {
    if (!product.sku) {
      throw new Error("SKU is required for upsert operation");
    }

    const existingProduct = await this.getProductBySku(product.sku);
    
    if (existingProduct) {
      const updated = await this.updateProduct(existingProduct.id, product);
      if (!updated) {
        throw new Error("Failed to update product");
      }
      return { product: updated, action: 'updated' };
    } else {
      const created = await this.createProduct(product);
      return { product: created, action: 'created' };
    }
  }

  async createGuestSession(session: InsertGuestSession): Promise<GuestSession> {
    const result = await db.insert(guestSessions).values(session).returning();
    return result[0];
  }

  async getGuestSession(id: string): Promise<GuestSession | undefined> {
    const result = await db.select().from(guestSessions).where(eq(guestSessions.id, id));
    return result[0];
  }

  async updateSessionActivity(id: string): Promise<void> {
    await db.update(guestSessions).set({ lastActiveAt: new Date() }).where(eq(guestSessions.id, id));
  }

  async updateGuestPreferences(
    id: string,
    beverageTypes: string[],
    flavorPreferences: string[],
    wineColors?: string[],
    occasion?: string
  ): Promise<GuestSession> {
    const result = await db
      .update(guestSessions)
      .set({
        preferredBeverageTypes: beverageTypes,
        flavorPreferences: flavorPreferences,
        wineColors: wineColors || null,
        occasion: occasion || null,
      })
      .where(eq(guestSessions.id, id))
      .returning();
    return result[0];
  }

  async getFavorites(sessionId: string): Promise<(Favorite & { product: Product })[]> {
    const result = await db
      .select({
        id: favorites.id,
        sessionId: favorites.sessionId,
        productId: favorites.productId,
        note: sql<string | null>`COALESCE(${productNotes.note}, ${favorites.note})`.as('note'),
        createdAt: favorites.createdAt,
        product: products,
      })
      .from(favorites)
      .innerJoin(products, eq(favorites.productId, products.id))
      .leftJoin(productNotes, and(
        eq(productNotes.sessionId, favorites.sessionId),
        eq(productNotes.productId, favorites.productId)
      ))
      .where(eq(favorites.sessionId, sessionId))
      .orderBy(desc(favorites.createdAt));
    
    return result as any;
  }

  async addFavorite(favorite: InsertFavorite): Promise<Favorite> {
    const existing = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.sessionId, favorite.sessionId), eq(favorites.productId, favorite.productId)));
    
    if (existing.length > 0) {
      return existing[0];
    }

    const result = await db.insert(favorites).values(favorite).returning();
    return result[0];
  }

  async updateFavoriteNote(id: string, note: string): Promise<Favorite | undefined> {
    const result = await db.update(favorites).set({ note }).where(eq(favorites.id, id)).returning();
    return result[0];
  }

  async removeFavorite(sessionId: string, productId: string): Promise<boolean> {
    const result = await db
      .delete(favorites)
      .where(and(eq(favorites.sessionId, sessionId), eq(favorites.productId, productId)));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getViewHistory(sessionId: string): Promise<(ViewHistory & { product: Product })[]> {
    const result = await db
      .select({
        id: viewHistory.id,
        sessionId: viewHistory.sessionId,
        productId: viewHistory.productId,
        viewCount: viewHistory.viewCount,
        lastViewedAt: viewHistory.lastViewedAt,
        product: products,
      })
      .from(viewHistory)
      .innerJoin(products, eq(viewHistory.productId, products.id))
      .where(eq(viewHistory.sessionId, sessionId))
      .orderBy(desc(viewHistory.lastViewedAt));
    
    return result as any;
  }

  async recordView(sessionId: string, productId: string): Promise<void> {
    const existing = await db
      .select()
      .from(viewHistory)
      .where(and(eq(viewHistory.sessionId, sessionId), eq(viewHistory.productId, productId)));
    
    if (existing.length > 0) {
      await db
        .update(viewHistory)
        .set({ 
          viewCount: sql`${viewHistory.viewCount} + 1`,
          lastViewedAt: new Date(),
        })
        .where(eq(viewHistory.id, existing[0].id));
    } else {
      await db.insert(viewHistory).values({ sessionId, productId });
    }
  }

  async getCartItems(sessionId: string): Promise<(CartItem & { product: Product })[]> {
    const result = await db
      .select({
        id: cartItems.id,
        sessionId: cartItems.sessionId,
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        note: cartItems.note,
        createdAt: cartItems.createdAt,
        product: products,
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.sessionId, sessionId))
      .orderBy(desc(cartItems.createdAt));
    
    return result as any;
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    const existing = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.sessionId, item.sessionId), eq(cartItems.productId, item.productId)));
    
    if (existing.length > 0) {
      const result = await db
        .update(cartItems)
        .set({ quantity: sql`${cartItems.quantity} + ${item.quantity}` })
        .where(eq(cartItems.id, existing[0].id))
        .returning();
      return result[0];
    }

    const result = await db.insert(cartItems).values(item).returning();
    return result[0];
  }

  async updateCartItemQuantity(id: string, quantity: number): Promise<CartItem | undefined> {
    const result = await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, id)).returning();
    return result[0];
  }

  async removeFromCart(id: string): Promise<boolean> {
    const result = await db.delete(cartItems).where(eq(cartItems.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async clearCart(sessionId: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.sessionId, sessionId));
  }

  async getTriviaQuestions(activeOnly = false): Promise<TriviaQuestion[]> {
    let query = db.select().from(triviaQuestions);
    if (activeOnly) {
      query = query.where(eq(triviaQuestions.isActive, true)) as any;
    }
    return await query.orderBy(desc(triviaQuestions.createdAt));
  }

  async getTriviaQuestion(id: string): Promise<TriviaQuestion | undefined> {
    const result = await db.select().from(triviaQuestions).where(eq(triviaQuestions.id, id));
    return result[0];
  }

  async createTriviaQuestion(question: InsertTriviaQuestion): Promise<TriviaQuestion> {
    const values = { ...question, answers: question.answers as string[] };
    const result = await db.insert(triviaQuestions).values(values).returning();
    return result[0];
  }

  async updateTriviaQuestion(id: string, question: Partial<InsertTriviaQuestion>): Promise<TriviaQuestion | undefined> {
    const updates: any = question.answers 
      ? { ...question, answers: question.answers as string[] }
      : question;
    const result = await db.update(triviaQuestions).set(updates).where(eq(triviaQuestions.id, id)).returning();
    return result[0];
  }

  async deleteTriviaQuestion(id: string): Promise<boolean> {
    const result = await db.delete(triviaQuestions).where(eq(triviaQuestions.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteTriviaQuestions(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db.delete(triviaQuestions).where(inArray(triviaQuestions.id, ids));
    return result.rowCount || 0;
  }

  async upsertTriviaQuestion(question: InsertTriviaQuestion & { id?: string }): Promise<{ question: TriviaQuestion; action: 'created' | 'updated' }> {
    // Try to find by ID first
    if (question.id) {
      const existing = await this.getTriviaQuestion(question.id);
      if (existing) {
        const updated = await this.updateTriviaQuestion(existing.id, question);
        if (!updated) throw new Error("Failed to update trivia question");
        return { question: updated, action: 'updated' };
      }
    }
    
    // Try to find by question text (natural key)
    const existingByQuestion = await db
      .select()
      .from(triviaQuestions)
      .where(sql`LOWER(TRIM(${triviaQuestions.question})) = LOWER(TRIM(${question.question}))`)
      .limit(1);
    
    if (existingByQuestion.length > 0) {
      const updated = await this.updateTriviaQuestion(existingByQuestion[0].id, question);
      if (!updated) throw new Error("Failed to update trivia question");
      return { question: updated, action: 'updated' };
    }
    
    // Create new
    const created = await this.createTriviaQuestion(question);
    return { question: created, action: 'created' };
  }

  async getTriviaScores(sessionId: string): Promise<TriviaScore[]> {
    return await db
      .select()
      .from(triviaScores)
      .where(eq(triviaScores.sessionId, sessionId))
      .orderBy(desc(triviaScores.answeredAt));
  }

  async recordTriviaAnswer(score: InsertTriviaScore): Promise<TriviaScore> {
    const result = await db.insert(triviaScores).values(score).returning();
    return result[0];
  }

  async getAskedQuestions(sessionId: string): Promise<string[]> {
    const scores = await this.getTriviaScores(sessionId);
    return scores.map(s => s.questionId);
  }

  async getTriviaAchievements(): Promise<TriviaAchievement[]> {
    return await db
      .select()
      .from(triviaAchievements)
      .orderBy(triviaAchievements.scoreThreshold);
  }

  async createTriviaAchievement(data: InsertTriviaAchievement): Promise<TriviaAchievement> {
    const result = await db.insert(triviaAchievements).values(data).returning();
    return result[0];
  }

  async updateTriviaAchievement(id: string, data: Partial<InsertTriviaAchievement>): Promise<TriviaAchievement | undefined> {
    const result = await db
      .update(triviaAchievements)
      .set(data)
      .where(eq(triviaAchievements.id, id))
      .returning();
    return result[0];
  }

  async deleteTriviaAchievement(id: string): Promise<boolean> {
    const result = await db.delete(triviaAchievements).where(eq(triviaAchievements.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async upsertTriviaAchievement(data: InsertTriviaAchievement & { id?: string }): Promise<{ achievement: TriviaAchievement; action: 'created' | 'updated' }> {
    // Try to find by ID first
    if (data.id) {
      const result = await db.select().from(triviaAchievements).where(eq(triviaAchievements.id, data.id)).limit(1);
      if (result.length > 0) {
        const updated = await this.updateTriviaAchievement(result[0].id, data);
        if (!updated) throw new Error("Failed to update achievement");
        return { achievement: updated, action: 'updated' };
      }
    }
    
    // Try to find by scoreThreshold (natural key - unique)
    const existing = await db
      .select()
      .from(triviaAchievements)
      .where(eq(triviaAchievements.scoreThreshold, data.scoreThreshold))
      .limit(1);
    
    if (existing.length > 0) {
      const updated = await this.updateTriviaAchievement(existing[0].id, data);
      if (!updated) throw new Error("Failed to update achievement");
      return { achievement: updated, action: 'updated' };
    }
    
    // Create new
    const created = await this.createTriviaAchievement(data);
    return { achievement: created, action: 'created' };
  }

  async getTriviaAttempt(sessionId: string): Promise<TriviaAttempt | undefined> {
    const result = await db
      .select()
      .from(triviaAttempts)
      .where(eq(triviaAttempts.sessionId, sessionId))
      .orderBy(desc(triviaAttempts.startedAt))
      .limit(1);
    return result[0];
  }

  async createTriviaAttempt(data: InsertTriviaAttempt): Promise<TriviaAttempt> {
    const result = await db.insert(triviaAttempts).values(data).returning();
    return result[0];
  }

  async updateTriviaAttempt(id: string, data: Partial<InsertTriviaAttempt>): Promise<TriviaAttempt | undefined> {
    const result = await db
      .update(triviaAttempts)
      .set(data)
      .where(eq(triviaAttempts.id, id))
      .returning();
    return result[0];
  }

  async getCartDiscounts(sessionId: string): Promise<CartDiscount[]> {
    return await db
      .select()
      .from(cartDiscounts)
      .where(eq(cartDiscounts.sessionId, sessionId))
      .orderBy(desc(cartDiscounts.appliedAt));
  }

  async createCartDiscount(data: InsertCartDiscount): Promise<CartDiscount> {
    const result = await db.insert(cartDiscounts).values(data).returning();
    return result[0];
  }

  async createAchievementRedemption(data: InsertAchievementRedemption): Promise<AchievementRedemption> {
    const result = await db.insert(achievementRedemptions).values(data).returning();
    return result[0];
  }

  async updateAchievementRedemption(id: string, data: Partial<InsertAchievementRedemption>): Promise<AchievementRedemption | undefined> {
    const result = await db
      .update(achievementRedemptions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(achievementRedemptions.id, id))
      .returning();
    return result[0];
  }

  async getSetting(key: string): Promise<AppSetting | undefined> {
    const result = await db.select().from(appSettings).where(eq(appSettings.key, key));
    return result[0];
  }

  async setSetting(key: string, value: any): Promise<AppSetting> {
    const existing = await this.getSetting(key);
    
    if (existing) {
      const result = await db
        .update(appSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(appSettings.key, key))
        .returning();
      return result[0];
    }

    const result = await db.insert(appSettings).values({ key, value }).returning();
    return result[0];
  }

  async createSurvey(survey: InsertSurvey): Promise<Survey> {
    const result = await db.insert(surveys).values(survey).returning();
    return result[0];
  }

  async getProductNotes(sessionId: string): Promise<ProductNote[]> {
    return await db
      .select()
      .from(productNotes)
      .where(eq(productNotes.sessionId, sessionId))
      .orderBy(desc(productNotes.updatedAt));
  }

  async getProductNote(sessionId: string, productId: string): Promise<ProductNote | undefined> {
    const result = await db
      .select()
      .from(productNotes)
      .where(and(eq(productNotes.sessionId, sessionId), eq(productNotes.productId, productId)));
    return result[0];
  }

  async saveProductNote(note: InsertProductNote): Promise<ProductNote> {
    const existing = await this.getProductNote(note.sessionId, note.productId);
    
    if (existing) {
      const result = await db
        .update(productNotes)
        .set({ note: note.note, updatedAt: new Date() })
        .where(and(eq(productNotes.sessionId, note.sessionId), eq(productNotes.productId, note.productId)))
        .returning();
      return result[0];
    }

    const result = await db.insert(productNotes).values(note).returning();
    return result[0];
  }

  async deleteProductNote(sessionId: string, productId: string): Promise<boolean> {
    const result = await db
      .delete(productNotes)
      .where(and(eq(productNotes.sessionId, sessionId), eq(productNotes.productId, productId)));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async migrateFavoritesNotesToProductNotes(): Promise<number> {
    // Get all favorites with non-empty notes
    const favoritesWithNotes = await db
      .select()
      .from(favorites)
      .where(and(sql`${favorites.note} IS NOT NULL`, sql`${favorites.note} != ''`));
    
    let migratedCount = 0;
    
    for (const fav of favoritesWithNotes) {
      // Check if product_notes already exists for this sessionId/productId
      const existingNote = await this.getProductNote(fav.sessionId, fav.productId);
      
      // Only migrate if product_notes doesn't exist or is empty
      if (!existingNote || !existingNote.note) {
        await this.saveProductNote({
          sessionId: fav.sessionId,
          productId: fav.productId,
          note: fav.note!,
        });
        migratedCount++;
      }
    }
    
    return migratedCount;
  }

  async getFilterOptions(fieldType?: string): Promise<FilterOption[]> {
    let query = db.select().from(filterOptions).orderBy(filterOptions.fieldType, filterOptions.sortOrder);
    
    if (fieldType) {
      query = query.where(eq(filterOptions.fieldType, fieldType)) as any;
    }
    
    return await query;
  }

  async getFilterOption(id: string): Promise<FilterOption | undefined> {
    const result = await db.select().from(filterOptions).where(eq(filterOptions.id, id));
    return result[0];
  }

  async createFilterOption(option: InsertFilterOption): Promise<FilterOption> {
    const result = await db.insert(filterOptions).values(option).returning();
    return result[0];
  }

  async updateFilterOption(id: string, option: Partial<InsertFilterOption>): Promise<FilterOption | undefined> {
    const result = await db
      .update(filterOptions)
      .set({ ...option, updatedAt: new Date() })
      .where(eq(filterOptions.id, id))
      .returning();
    return result[0];
  }

  async deleteFilterOption(id: string): Promise<boolean> {
    const result = await db.delete(filterOptions).where(eq(filterOptions.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async updateFilterOptionOrder(updates: { id: string; sortOrder: number }[]): Promise<void> {
    for (const update of updates) {
      await db
        .update(filterOptions)
        .set({ sortOrder: update.sortOrder, updatedAt: new Date() })
        .where(eq(filterOptions.id, update.id));
    }
  }

  async upsertFilterOption(option: InsertFilterOption & { id?: string }): Promise<{ filterOption: FilterOption; action: 'created' | 'updated' }> {
    // Try to find by ID first if provided
    if (option.id) {
      const existing = await this.getFilterOption(option.id);
      if (existing) {
        const updated = await this.updateFilterOption(existing.id, option);
        if (!updated) throw new Error("Failed to update filter option");
        return { filterOption: updated, action: 'updated' };
      }
    }
    
    // Try to find by fieldType + optionValue (natural key)
    const existingByKey = await db
      .select()
      .from(filterOptions)
      .where(and(
        eq(filterOptions.fieldType, option.fieldType),
        eq(filterOptions.optionValue, option.optionValue)
      ))
      .limit(1);
    
    if (existingByKey.length > 0) {
      const updated = await this.updateFilterOption(existingByKey[0].id, option);
      if (!updated) throw new Error("Failed to update filter option");
      return { filterOption: updated, action: 'updated' };
    }
    
    // Create new
    const created = await this.createFilterOption(option);
    return { filterOption: created, action: 'created' };
  }

  // Slideshow Images
  async getSlideshowImages(activeOnly?: boolean): Promise<SlideshowImage[]> {
    let query = db.select().from(slideshowImages).orderBy(slideshowImages.displayOrder);
    
    if (activeOnly) {
      query = query.where(eq(slideshowImages.isActive, true)) as any;
    }
    
    return await query;
  }

  async getSlideshowImage(id: string): Promise<SlideshowImage | undefined> {
    const result = await db.select().from(slideshowImages).where(eq(slideshowImages.id, id));
    return result[0];
  }

  async createSlideshowImage(image: InsertSlideshowImage): Promise<SlideshowImage> {
    const result = await db.insert(slideshowImages).values(image).returning();
    return result[0];
  }

  async updateSlideshowImage(id: string, image: Partial<InsertSlideshowImage>): Promise<SlideshowImage | undefined> {
    const result = await db
      .update(slideshowImages)
      .set({ ...image, updatedAt: new Date() })
      .where(eq(slideshowImages.id, id))
      .returning();
    return result[0];
  }

  async deleteSlideshowImage(id: string): Promise<boolean> {
    const result = await db.delete(slideshowImages).where(eq(slideshowImages.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async updateSlideshowImageOrder(updates: { id: string; displayOrder: number }[]): Promise<void> {
    for (const update of updates) {
      await db
        .update(slideshowImages)
        .set({ displayOrder: update.displayOrder, updatedAt: new Date() })
        .where(eq(slideshowImages.id, update.id));
    }
  }

  async upsertSlideshowImage(image: InsertSlideshowImage & { id?: string }): Promise<{ image: SlideshowImage; action: 'created' | 'updated' }> {
    // Try to find by ID first
    if (image.id) {
      const existing = await this.getSlideshowImage(image.id);
      if (existing) {
        const updated = await this.updateSlideshowImage(existing.id, image);
        if (!updated) throw new Error("Failed to update slideshow image");
        return { image: updated, action: 'updated' };
      }
    }
    
    // Try to find by imageUrl or filename (natural key)
    const naturalKey = image.imageUrl || image.filename;
    if (naturalKey) {
      const existing = await db
        .select()
        .from(slideshowImages)
        .where(
          or(
            eq(slideshowImages.imageUrl, naturalKey),
            eq(slideshowImages.filename, naturalKey)
          )
        )
        .limit(1);
      
      if (existing.length > 0) {
        const updated = await this.updateSlideshowImage(existing[0].id, image);
        if (!updated) throw new Error("Failed to update slideshow image");
        return { image: updated, action: 'updated' };
      }
    }
    
    // Create new
    const created = await this.createSlideshowImage(image);
    return { image: created, action: 'created' };
  }

  async getMediaLibraryFiles(category?: string): Promise<MediaLibrary[]> {
    let query = db.select().from(mediaLibrary).orderBy(desc(mediaLibrary.createdAt));
    
    if (category && category !== 'all') {
      query = query.where(eq(mediaLibrary.category, category)) as any;
    }
    
    return await query;
  }

  async getMediaLibraryFile(id: string): Promise<MediaLibrary | undefined> {
    const result = await db.select().from(mediaLibrary).where(eq(mediaLibrary.id, id));
    return result[0];
  }

  async createMediaLibraryFile(file: InsertMediaLibrary): Promise<MediaLibrary> {
    const result = await db.insert(mediaLibrary).values(file).returning();
    return result[0];
  }

  async updateMediaLibraryFile(id: string, file: Partial<InsertMediaLibrary>): Promise<MediaLibrary | undefined> {
    const result = await db
      .update(mediaLibrary)
      .set({ ...file, updatedAt: new Date() })
      .where(eq(mediaLibrary.id, id))
      .returning();
    return result[0];
  }

  async deleteMediaLibraryFile(id: string): Promise<boolean> {
    const result = await db.delete(mediaLibrary).where(eq(mediaLibrary.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async upsertMediaLibraryFile(file: InsertMediaLibrary & { id?: string }): Promise<{ file: MediaLibrary; action: 'created' | 'updated' }> {
    // Try to find by ID first
    if (file.id) {
      const existing = await this.getMediaLibraryFile(file.id);
      if (existing) {
        const updated = await this.updateMediaLibraryFile(existing.id, file);
        if (!updated) throw new Error("Failed to update media library file");
        return { file: updated, action: 'updated' };
      }
    }
    
    // Try to find by objectPath (natural key - unique)
    const existing = await db
      .select()
      .from(mediaLibrary)
      .where(eq(mediaLibrary.objectPath, file.objectPath))
      .limit(1);
    
    if (existing.length > 0) {
      const updated = await this.updateMediaLibraryFile(existing[0].id, file);
      if (!updated) throw new Error("Failed to update media library file");
      return { file: updated, action: 'updated' };
    }
    
    // Create new
    const created = await this.createMediaLibraryFile(file);
    return { file: created, action: 'created' };
  }

  // Videos
  async getVideos(activeOnly?: boolean): Promise<Video[]> {
    let query = db.select().from(videos).orderBy(videos.sortOrder);
    
    if (activeOnly) {
      query = query.where(eq(videos.isActive, true)) as any;
    }
    
    return await query;
  }

  async getVideo(id: string): Promise<Video | undefined> {
    const result = await db.select().from(videos).where(eq(videos.id, id));
    return result[0];
  }

  async createVideo(video: InsertVideo): Promise<Video> {
    const result = await db.insert(videos).values(video).returning();
    return result[0];
  }

  async updateVideo(id: string, video: Partial<InsertVideo>): Promise<Video | undefined> {
    const result = await db
      .update(videos)
      .set({ ...video, updatedAt: new Date() })
      .where(eq(videos.id, id))
      .returning();
    return result[0];
  }

  async deleteVideo(id: string): Promise<boolean> {
    const result = await db.delete(videos).where(eq(videos.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async updateVideoOrder(updates: { id: string; sortOrder: number }[]): Promise<void> {
    for (const update of updates) {
      await db
        .update(videos)
        .set({ sortOrder: update.sortOrder, updatedAt: new Date() })
        .where(eq(videos.id, update.id));
    }
  }

  async upsertVideo(video: InsertVideo & { id?: string }): Promise<{ video: Video; action: 'created' | 'updated' }> {
    // Try to find by ID first
    if (video.id) {
      const existing = await this.getVideo(video.id);
      if (existing) {
        const updated = await this.updateVideo(existing.id, video);
        if (!updated) throw new Error("Failed to update video");
        return { video: updated, action: 'updated' };
      }
    }
    
    // Try to find by title + videoUrl combination (natural key)
    const existing = await db
      .select()
      .from(videos)
      .where(and(
        eq(videos.title, video.title),
        eq(videos.videoUrl, video.videoUrl)
      ))
      .limit(1);
    
    if (existing.length > 0) {
      const updated = await this.updateVideo(existing[0].id, video);
      if (!updated) throw new Error("Failed to update video");
      return { video: updated, action: 'updated' };
    }
    
    // Create new
    const created = await this.createVideo(video);
    return { video: created, action: 'created' };
  }

  // Commercials
  async getCommercials(activeOnly?: boolean): Promise<Commercial[]> {
    let query = db.select().from(commercials).orderBy(commercials.sortOrder);
    
    if (activeOnly) {
      query = query.where(eq(commercials.isActive, true)) as any;
    }
    
    return await query;
  }

  async getCommercial(id: string): Promise<Commercial | undefined> {
    const result = await db.select().from(commercials).where(eq(commercials.id, id));
    return result[0];
  }

  async createCommercial(commercial: InsertCommercial): Promise<Commercial> {
    const result = await db.insert(commercials).values(commercial).returning();
    return result[0];
  }

  async updateCommercial(id: string, commercial: Partial<InsertCommercial>): Promise<Commercial | undefined> {
    const result = await db
      .update(commercials)
      .set({ ...commercial, updatedAt: new Date() })
      .where(eq(commercials.id, id))
      .returning();
    return result[0];
  }

  async deleteCommercial(id: string): Promise<boolean> {
    const result = await db.delete(commercials).where(eq(commercials.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async updateCommercialOrder(updates: { id: string; sortOrder: number }[]): Promise<void> {
    for (const update of updates) {
      await db
        .update(commercials)
        .set({ sortOrder: update.sortOrder, updatedAt: new Date() })
        .where(eq(commercials.id, update.id));
    }
  }

  async upsertCommercial(commercial: InsertCommercial & { id?: string }): Promise<{ commercial: Commercial; action: 'created' | 'updated' }> {
    // Try to find by ID first
    if (commercial.id) {
      const existing = await this.getCommercial(commercial.id);
      if (existing) {
        const updated = await this.updateCommercial(existing.id, commercial);
        if (!updated) throw new Error("Failed to update commercial");
        return { commercial: updated, action: 'updated' };
      }
    }
    
    // Try to find by title + imageUrl combination (natural key)
    const existing = await db
      .select()
      .from(commercials)
      .where(and(
        eq(commercials.title, commercial.title),
        eq(commercials.imageUrl, commercial.imageUrl)
      ))
      .limit(1);
    
    if (existing.length > 0) {
      const updated = await this.updateCommercial(existing[0].id, commercial);
      if (!updated) throw new Error("Failed to update commercial");
      return { commercial: updated, action: 'updated' };
    }
    
    // Create new
    const created = await this.createCommercial(commercial);
    return { commercial: created, action: 'created' };
  }

  // Characteristics
  async searchCharacteristics(query?: string, category?: string): Promise<Characteristic[]> {
    let dbQuery = db.select().from(characteristics).orderBy(desc(characteristics.usageCount), characteristics.name);
    
    const conditions = [];
    
    // Filter by search query
    if (query) {
      conditions.push(ilike(characteristics.name, `%${query}%`));
    }
    
    // Filter by product category using array containment
    if (category) {
      conditions.push(sql`${characteristics.productTypes} @> ARRAY[${category}]::"category"[]`);
    }
    
    if (conditions.length > 0) {
      dbQuery = dbQuery.where(and(...conditions)) as any;
    }
    
    return await dbQuery;
  }

  async getCharacteristic(id: string): Promise<Characteristic | undefined> {
    const result = await db.select().from(characteristics).where(eq(characteristics.id, id));
    return result[0];
  }

  async getCharacteristicByName(name: string): Promise<Characteristic | undefined> {
    const result = await db.select().from(characteristics).where(eq(lower(characteristics.name), name.toLowerCase()));
    return result[0];
  }

  async createCharacteristic(name: string, productTypes?: string[]): Promise<Characteristic> {
    const values: any = { name };
    if (productTypes && productTypes.length > 0) {
      values.productTypes = productTypes;
    }
    const result = await db.insert(characteristics).values(values).returning();
    return result[0];
  }

  async getProductCharacteristics(productId: string): Promise<Characteristic[]> {
    const result = await db
      .select({
        id: characteristics.id,
        name: characteristics.name,
        productTypes: characteristics.productTypes,
        usageCount: characteristics.usageCount,
        createdAt: characteristics.createdAt,
        updatedAt: characteristics.updatedAt,
      })
      .from(productCharacteristics)
      .innerJoin(characteristics, eq(productCharacteristics.characteristicId, characteristics.id))
      .where(eq(productCharacteristics.productId, productId))
      .orderBy(characteristics.name);
    
    return result;
  }

  async setProductCharacteristics(productId: string, characteristicNames: string[], category?: string): Promise<void> {
    // Deduplicate names (case-insensitive)
    const uniqueNames = Array.from(
      new Map(characteristicNames.map(name => [name.toLowerCase().trim(), name.trim()])).values()
    ).filter(name => name.length > 0);
    
    // Get current characteristics for this product
    const currentCharacteristics = await this.getProductCharacteristics(productId);
    const currentNames = new Set(currentCharacteristics.map(c => c.name.toLowerCase()));
    
    // Calculate what to add and remove
    const newNames = new Set(uniqueNames.map(n => n.toLowerCase()));
    const toAdd = uniqueNames.filter(name => !currentNames.has(name.toLowerCase()));
    const toRemove = currentCharacteristics.filter(c => !newNames.has(c.name.toLowerCase()));
    
    // Remove characteristics that are no longer needed
    for (const characteristic of toRemove) {
      // Delete the link
      await db
        .delete(productCharacteristics)
        .where(
          and(
            eq(productCharacteristics.productId, productId),
            eq(productCharacteristics.characteristicId, characteristic.id)
          )
        );
      
      // Decrement usage count
      await db
        .update(characteristics)
        .set({ 
          usageCount: sql`GREATEST(0, ${characteristics.usageCount} - 1)`,
          updatedAt: new Date()
        })
        .where(eq(characteristics.id, characteristic.id));
    }
    
    // Add new characteristics
    for (const name of toAdd) {
      // Find or create characteristic
      let characteristic = await this.getCharacteristicByName(name);
      
      if (!characteristic) {
        // Create with category if provided, otherwise defaults to all types
        const productTypes = category ? [category] : undefined;
        characteristic = await this.createCharacteristic(name, productTypes);
      } else if (category && characteristic.productTypes) {
        // For existing characteristics, ensure current category is in productTypes
        if (!characteristic.productTypes.includes(category)) {
          const updatedProductTypes = [...characteristic.productTypes, category];
          await db
            .update(characteristics)
            .set({ 
              productTypes: updatedProductTypes,
              updatedAt: new Date()
            })
            .where(eq(characteristics.id, characteristic.id));
          
          // Update local object to reflect the change
          characteristic.productTypes = updatedProductTypes;
        }
      }
      
      // Link to product
      await db.insert(productCharacteristics).values({
        productId,
        characteristicId: characteristic.id,
      });
      
      // Increment usage count
      await db
        .update(characteristics)
        .set({ 
          usageCount: sql`${characteristics.usageCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(characteristics.id, characteristic.id));
    }
    
    // Clean up unused characteristics (usage count = 0)
    await db.delete(characteristics).where(eq(characteristics.usageCount, 0));
  }

  // B2B - Tier Pricing implementations
  async getAllTierPricing(): Promise<TierPricing[]> {
    return db.select().from(tierPricing).orderBy(tierPricing.sortOrder);
  }

  async getTierPricing(id: string): Promise<TierPricing | undefined> {
    const [tier] = await db.select().from(tierPricing).where(eq(tierPricing.id, id));
    return tier;
  }

  async createTierPricing(data: InsertTierPricing): Promise<TierPricing> {
    const [tier] = await db.insert(tierPricing).values(data).returning();
    return tier;
  }

  async updateTierPricing(id: string, data: Partial<InsertTierPricing>): Promise<TierPricing | undefined> {
    const [tier] = await db
      .update(tierPricing)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tierPricing.id, id))
      .returning();
    return tier;
  }

  async deleteTierPricing(id: string): Promise<boolean> {
    const result = await db.delete(tierPricing).where(eq(tierPricing.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // B2B - Sales Reps implementations
  async getAllSalesReps(activeOnly = false): Promise<SalesRep[]> {
    if (activeOnly) {
      return db.select().from(salesReps).where(eq(salesReps.active, true));
    }
    return db.select().from(salesReps);
  }

  async getSalesRep(id: string): Promise<SalesRep | undefined> {
    const [rep] = await db.select().from(salesReps).where(eq(salesReps.id, id));
    return rep;
  }

  async getSalesRepByEmail(email: string): Promise<SalesRep | undefined> {
    const [rep] = await db.select().from(salesReps).where(eq(salesReps.email, email));
    return rep;
  }

  async createSalesRep(data: InsertSalesRep): Promise<SalesRep> {
    const [rep] = await db.insert(salesReps).values(data).returning();
    return rep;
  }

  async updateSalesRep(id: string, data: Partial<InsertSalesRep>): Promise<SalesRep | undefined> {
    const [rep] = await db
      .update(salesReps)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(salesReps.id, id))
      .returning();
    return rep;
  }

  async deleteSalesRep(id: string): Promise<boolean> {
    const result = await db.delete(salesReps).where(eq(salesReps.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // B2B - Admins implementations
  async getAllB2bAdmins(activeOnly = false): Promise<B2bAdmin[]> {
    if (activeOnly) {
      return db.select().from(b2bAdmins).where(eq(b2bAdmins.active, true));
    }
    return db.select().from(b2bAdmins);
  }

  async getB2bAdmin(id: string): Promise<B2bAdmin | undefined> {
    const [admin] = await db.select().from(b2bAdmins).where(eq(b2bAdmins.id, id));
    return admin;
  }

  async getB2bAdminByEmail(email: string): Promise<B2bAdmin | undefined> {
    const [admin] = await db.select().from(b2bAdmins).where(eq(b2bAdmins.email, email));
    return admin;
  }

  async createB2bAdmin(data: InsertB2bAdmin): Promise<B2bAdmin> {
    const [admin] = await db.insert(b2bAdmins).values(data).returning();
    return admin;
  }

  async updateB2bAdmin(id: string, data: Partial<InsertB2bAdmin>): Promise<B2bAdmin | undefined> {
    const [admin] = await db
      .update(b2bAdmins)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(b2bAdmins.id, id))
      .returning();
    return admin;
  }

  async deleteB2bAdmin(id: string): Promise<boolean> {
    const result = await db.delete(b2bAdmins).where(eq(b2bAdmins.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // B2B - Customers implementations
  async getAllB2bCustomers(status?: string): Promise<(B2bCustomer & { tier?: TierPricing | null; salesRep?: SalesRep | null })[]> {
    const query = db
      .select({
        customer: b2bCustomers,
        tier: tierPricing,
        salesRep: salesReps,
      })
      .from(b2bCustomers)
      .leftJoin(tierPricing, eq(b2bCustomers.pricingTierId, tierPricing.id))
      .leftJoin(salesReps, eq(b2bCustomers.salesRepId, salesReps.id));

    const results = status
      ? await query.where(eq(b2bCustomers.accountStatus, status as any))
      : await query;

    return results.map(r => ({ ...r.customer, tier: r.tier, salesRep: r.salesRep }));
  }

  async getB2bCustomer(id: string): Promise<(B2bCustomer & { tier?: TierPricing | null; salesRep?: SalesRep | null }) | undefined> {
    const [result] = await db
      .select({
        customer: b2bCustomers,
        tier: tierPricing,
        salesRep: salesReps,
      })
      .from(b2bCustomers)
      .leftJoin(tierPricing, eq(b2bCustomers.pricingTierId, tierPricing.id))
      .leftJoin(salesReps, eq(b2bCustomers.salesRepId, salesReps.id))
      .where(eq(b2bCustomers.id, id));

    if (!result) return undefined;
    return { ...result.customer, tier: result.tier, salesRep: result.salesRep };
  }

  async getB2bCustomerByEmail(email: string): Promise<(B2bCustomer & { tier?: TierPricing | null; salesRep?: SalesRep | null }) | undefined> {
    const [result] = await db
      .select({
        customer: b2bCustomers,
        tier: tierPricing,
        salesRep: salesReps,
      })
      .from(b2bCustomers)
      .leftJoin(tierPricing, eq(b2bCustomers.pricingTierId, tierPricing.id))
      .leftJoin(salesReps, eq(b2bCustomers.salesRepId, salesReps.id))
      .where(eq(b2bCustomers.emailAddress, email));

    if (!result) return undefined;
    return { ...result.customer, tier: result.tier, salesRep: result.salesRep };
  }

  async createB2bCustomer(data: InsertB2bCustomer): Promise<B2bCustomer> {
    const [customer] = await db.insert(b2bCustomers).values(data).returning();
    return customer;
  }

  async updateB2bCustomer(id: string, data: Partial<InsertB2bCustomer>): Promise<B2bCustomer | undefined> {
    const [customer] = await db
      .update(b2bCustomers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(b2bCustomers.id, id))
      .returning();
    return customer;
  }

  async deleteB2bCustomer(id: string): Promise<boolean> {
    const result = await db.delete(b2bCustomers).where(eq(b2bCustomers.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async approveB2bCustomer(id: string, tierId: string, passwordHash: string, approvedByAdminId: string): Promise<B2bCustomer | undefined> {
    const [customer] = await db
      .update(b2bCustomers)
      .set({
        accountStatus: 'active' as any,
        pricingTierId: tierId,
        passwordHash,
        approvedAt: new Date(),
        approvedByAdminId,
        updatedAt: new Date(),
      })
      .where(eq(b2bCustomers.id, id))
      .returning();
    return customer;
  }

  // B2B - Orders implementations
  async getAllB2bOrders(): Promise<(B2bOrder & { customer: B2bCustomer })[]> {
    const results = await db
      .select({
        order: b2bOrders,
        customer: b2bCustomers,
      })
      .from(b2bOrders)
      .innerJoin(b2bCustomers, eq(b2bOrders.customerId, b2bCustomers.id))
      .orderBy(desc(b2bOrders.orderDate));

    return results.map(r => ({ ...r.order, customer: r.customer }));
  }

  async getB2bOrders(customerId: string): Promise<(B2bOrder & { items: (B2bOrderItem & { product: Product })[] })[]> {
    const orders = await db
      .select()
      .from(b2bOrders)
      .where(eq(b2bOrders.customerId, customerId))
      .orderBy(desc(b2bOrders.orderDate));

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await db
          .select({
            item: b2bOrderItems,
            product: products,
          })
          .from(b2bOrderItems)
          .innerJoin(products, eq(b2bOrderItems.productId, products.id))
          .where(eq(b2bOrderItems.orderId, order.id));

        return {
          ...order,
          items: items.map(i => ({ ...i.item, product: i.product })),
        };
      })
    );

    return ordersWithItems;
  }

  async getB2bOrder(id: string): Promise<(B2bOrder & { customer: B2bCustomer; items: (B2bOrderItem & { product: Product })[] }) | undefined> {
    const [result] = await db
      .select({
        order: b2bOrders,
        customer: b2bCustomers,
      })
      .from(b2bOrders)
      .innerJoin(b2bCustomers, eq(b2bOrders.customerId, b2bCustomers.id))
      .where(eq(b2bOrders.id, id));

    if (!result) return undefined;

    const items = await db
      .select({
        item: b2bOrderItems,
        product: products,
      })
      .from(b2bOrderItems)
      .innerJoin(products, eq(b2bOrderItems.productId, products.id))
      .where(eq(b2bOrderItems.orderId, id));

    return {
      ...result.order,
      customer: result.customer,
      items: items.map(i => ({ ...i.item, product: i.product })),
    };
  }

  async createB2bOrder(orderData: InsertB2bOrder, items: InsertB2bOrderItem[]): Promise<B2bOrder> {
    const [order] = await db.insert(b2bOrders).values(orderData).returning();

    if (items.length > 0) {
      const itemsWithOrderId = items.map(item => ({ ...item, orderId: order.id }));
      await db.insert(b2bOrderItems).values(itemsWithOrderId);
    }

    // Update customer's last order date and total purchase value
    await db
      .update(b2bCustomers)
      .set({
        lastOrderDate: new Date(),
        totalPurchaseValue: sql`${b2bCustomers.totalPurchaseValue} + ${orderData.total}`,
        updatedAt: new Date(),
      })
      .where(eq(b2bCustomers.id, orderData.customerId));

    return order;
  }

  async updateB2bOrder(id: string, data: Partial<InsertB2bOrder>): Promise<B2bOrder | undefined> {
    const [order] = await db
      .update(b2bOrders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(b2bOrders.id, id))
      .returning();
    return order;
  }

  async deleteB2bOrder(id: string): Promise<boolean> {
    const result = await db.delete(b2bOrders).where(eq(b2bOrders.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getCustomerPreviousProducts(customerId: string): Promise<Product[]> {
    const items = await db
      .selectDistinct({ product: products })
      .from(b2bOrderItems)
      .innerJoin(b2bOrders, eq(b2bOrderItems.orderId, b2bOrders.id))
      .innerJoin(products, eq(b2bOrderItems.productId, products.id))
      .where(eq(b2bOrders.customerId, customerId));

    return items.map(i => i.product);
  }

  // B2B - Settings implementations
  async getB2bSetting(key: string): Promise<B2bSetting | undefined> {
    const [setting] = await db
      .select()
      .from(b2bSettings)
      .where(eq(b2bSettings.settingKey, key));
    return setting;
  }

  async setB2bSetting(key: string, value: string): Promise<B2bSetting> {
    const [setting] = await db
      .insert(b2bSettings)
      .values({ settingKey: key, settingValue: value })
      .onConflictDoUpdate({
        target: b2bSettings.settingKey,
        set: { settingValue: value, updatedAt: new Date() },
      })
      .returning();
    return setting;
  }

  async getAllB2bSettings(): Promise<B2bSetting[]> {
    return db.select().from(b2bSettings);
  }
}

export const storage = new DatabaseStorage();
