import { db } from "./db";
import { eq, and, desc, ilike, or, sql, type SQL } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";
import {
  products,
  guestSessions,
  favorites,
  viewHistory,
  cartItems,
  triviaQuestions,
  triviaScores,
  appSettings,
  surveys,
  productNotes,
  filterOptions,
  type InsertProduct,
  type Product,
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
  type InsertAppSetting,
  type AppSetting,
  type InsertSurvey,
  type Survey,
  type InsertProductNote,
  type ProductNote,
  type InsertFilterOption,
  type FilterOption,
} from "@shared/schema";

// Helper function for case-insensitive comparisons
function lower(column: AnyColumn): SQL {
  return sql`lower(${column})`;
}

export interface IStorage {
  // Products
  getProducts(filters?: ProductFilters): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;
  incrementProductViews(productId: string): Promise<void>;

  // Guest Sessions
  createGuestSession(session: InsertGuestSession): Promise<GuestSession>;
  getGuestSession(id: string): Promise<GuestSession | undefined>;
  updateSessionActivity(id: string): Promise<void>;

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
  deleteTriviaQuestion(id: string): Promise<boolean>;
  
  getTriviaScores(sessionId: string): Promise<TriviaScore[]>;
  recordTriviaAnswer(score: InsertTriviaScore): Promise<TriviaScore>;
  getAskedQuestions(sessionId: string): Promise<string[]>;

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

  // Filter Options
  getFilterOptions(fieldType?: string): Promise<FilterOption[]>;
  getFilterOption(id: string): Promise<FilterOption | undefined>;
  createFilterOption(option: InsertFilterOption): Promise<FilterOption>;
  updateFilterOption(id: string, option: Partial<InsertFilterOption>): Promise<FilterOption | undefined>;
  deleteFilterOption(id: string): Promise<boolean>;
  updateFilterOptionOrder(updates: { id: string; sortOrder: number }[]): Promise<void>;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  wineColor?: string;
  sweetness?: string;
  body?: string;
  characteristics?: string;
  minPrice?: number;
  maxPrice?: number;
  stock?: string;
}

export class DatabaseStorage implements IStorage {
  async getProducts(filters?: ProductFilters): Promise<Product[]> {
    let query = db.select().from(products);
    
    const conditions = [];
    if (filters?.search) {
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
      // Filter by dedicated sweetness field
      conditions.push(ilike(products.sweetness, `%${filters.sweetness}%`));
    }
    if (filters?.body) {
      // Filter by dedicated body field
      conditions.push(ilike(products.body, `%${filters.body}%`));
    }
    if (filters?.characteristics) {
      // Filter by characteristics field for specific traits like "Crisp", "Rich", etc.
      conditions.push(ilike(products.characteristics, `%${filters.characteristics}%`));
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

  async getFavorites(sessionId: string): Promise<(Favorite & { product: Product })[]> {
    const result = await db
      .select({
        id: favorites.id,
        sessionId: favorites.sessionId,
        productId: favorites.productId,
        note: favorites.note,
        createdAt: favorites.createdAt,
        product: products,
      })
      .from(favorites)
      .innerJoin(products, eq(favorites.productId, products.id))
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
    const result = await db.insert(triviaQuestions).values(question).returning();
    return result[0];
  }

  async updateTriviaQuestion(id: string, question: Partial<InsertTriviaQuestion>): Promise<TriviaQuestion | undefined> {
    const result = await db.update(triviaQuestions).set(question).where(eq(triviaQuestions.id, id)).returning();
    return result[0];
  }

  async deleteTriviaQuestion(id: string): Promise<boolean> {
    const result = await db.delete(triviaQuestions).where(eq(triviaQuestions.id, id));
    return result.rowCount !== null && result.rowCount > 0;
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
}

export const storage = new DatabaseStorage();
