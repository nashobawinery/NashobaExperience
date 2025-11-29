import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import { db } from "./db";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
import { ObjectStorageService, objectStorageClient } from "./objectStorage";
import b2bRouter from "./b2b-routes";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { triviaAttempts, achievementRedemptions } from "@shared/schema";
import { migrateProductImages } from "./migrate-product-images";
import { 
  insertProductSchema,
  updateProductSchema,
  insertGuestSessionSchema,
  insertFavoriteSchema,
  insertCartItemSchema,
  insertTriviaQuestionSchema,
  insertTriviaScoreSchema,
  insertTriviaAchievementSchema,
  insertTriviaAttemptSchema,
  insertCartDiscountSchema,
  insertAchievementRedemptionSchema,
  insertSurveySchema,
  insertProductNoteSchema,
  insertFilterOptionSchema,
  insertSlideshowImageSchema,
  insertMediaLibrarySchema,
  insertProductMediaSchema,
  insertVideoSchema,
  insertCommercialSchema,
  categoryEnum,
  insertLmsCategorySchema,
  insertLmsCourseSchema,
  insertLmsLessonSchema,
  insertLmsQuizQuestionSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Mount B2B routes FIRST (before main session middleware) to ensure session isolation
  app.use(b2bRouter);

  // Setup authentication (provides /api/login, /api/logout, /api/callback routes)
  // This applies session middleware to all non-B2B routes
  await setupAuth(app);

  // Authentication routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Bridge login for base app admins - auto-login to B2B without password
  app.post('/api/b2b/bridge-login', isAuthenticated, async (req: any, res) => {
    try {
      // Get email from authenticated base app session
      const userEmail = req.user?.claims?.email;
      
      if (!userEmail) {
        return res.status(401).json({ error: 'Not authenticated in base app' });
      }

      // Look up B2B admin by email
      const admin = await storage.getB2bAdminByEmail(userEmail);

      if (!admin) {
        return res.status(403).json({ error: 'No B2B admin account found for this email' });
      }

      // Create B2B session
      req.session.b2bUserId = admin.id;
      req.session.b2bUserType = 'admin';
      req.session.b2bUserEmail = admin.email;

      res.json({
        success: true,
        user: {
          id: admin.id,
          name: `${admin.firstName} ${admin.lastName}`,
          email: admin.email,
          type: 'admin',
        },
      });
    } catch (error: any) {
      console.error('Bridge login error:', error);
      res.status(500).json({ error: error.message || 'Bridge login failed' });
    }
  });
  
  // Guest Session Management
  app.post("/api/sessions", async (req, res) => {
    try {
      const data = insertGuestSessionSchema.parse(req.body);
      const session = await storage.createGuestSession(data);
      res.json(session);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.get("/api/sessions/:id", async (req, res) => {
    const session = await storage.getGuestSession(req.params.id);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    res.json(session);
  });

  app.post("/api/sessions/:id/activity", async (req, res) => {
    await storage.updateSessionActivity(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/sessions/:id/preferences", async (req, res) => {
    try {
      const session = await storage.updateGuestPreferences(
        req.params.id,
        req.body.beverageTypes,
        req.body.flavorPreferences,
        req.body.wineColors,
        req.body.occasion
      );
      res.json(session);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  // Products
  app.get("/api/products", async (req, res) => {
    const filters = {
      search: req.query.search as string,
      category: req.query.category as string,
      wineColor: req.query.wineColor as string,
      sweetness: req.query.sweetness as string,
      body: req.query.body as string,
      characteristics: req.query.characteristics as string,
      stock: req.query.stock as string,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
    };

    console.log('Product filters received:', JSON.stringify(filters));
    const products = await storage.getProductsWithMedia(filters);
    console.log(`Returned ${products.length} products`);
    res.json(products);
  });

  app.get("/api/products/:id", async (req, res) => {
    const product = await storage.getProduct(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  });

  app.post("/api/products", isAdmin, async (req, res) => {
    try {
      const data = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(data);
      res.json(product);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.patch("/api/products/:id", isAdmin, async (req, res) => {
    try {
      // Validate the update data
      const validatedData = updateProductSchema.parse(req.body);
      const product = await storage.updateProduct(req.params.id, validatedData);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.post("/api/admin/products/bulk-update", isAdmin, async (req, res) => {
    try {
      const { products } = req.body;
      
      if (!Array.isArray(products)) {
        return res.status(400).json({ message: "Products must be an array" });
      }

      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const productData of products) {
        try {
          const { id, ...updateData } = productData;
          if (!id) {
            results.failed++;
            results.errors.push("Missing product ID");
            continue;
          }

          const validatedData = updateProductSchema.parse(updateData);
          const updated = await storage.updateProduct(id, validatedData);
          
          if (!updated) {
            results.failed++;
            results.errors.push(`Product not found: ${id}`);
          } else {
            results.success++;
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`Failed to update product: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      res.json({
        message: `Updated ${results.success} products${results.failed > 0 ? `, ${results.failed} failed` : ''}`,
        ...results,
      });
    } catch (error) {
      console.error("Error in bulk update:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to bulk update products" });
    }
  });

  app.delete("/api/products/:id", isAdmin, async (req, res) => {
    const success = await storage.deleteProduct(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json({ success: true });
  });

  // Favorites
  app.get("/api/sessions/:sessionId/favorites", async (req, res) => {
    const favorites = await storage.getFavorites(req.params.sessionId);
    res.json(favorites);
  });

  app.post("/api/sessions/:sessionId/favorites", async (req, res) => {
    try {
      const data = insertFavoriteSchema.parse({
        sessionId: req.params.sessionId,
        productId: req.body.productId,
        note: req.body.note,
      });
      const favorite = await storage.addFavorite(data);
      res.json(favorite);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.patch("/api/favorites/:id/note", async (req, res) => {
    const favorite = await storage.updateFavoriteNote(req.params.id, req.body.note);
    if (!favorite) {
      return res.status(404).json({ message: "Favorite not found" });
    }
    res.json(favorite);
  });

  app.delete("/api/sessions/:sessionId/favorites/:productId", async (req, res) => {
    const success = await storage.removeFavorite(req.params.sessionId, req.params.productId);
    if (!success) {
      return res.status(404).json({ message: "Favorite not found" });
    }
    res.json({ success: true });
  });

  // Migrate favorites notes to product_notes (one-time migration)
  app.post("/api/migrate/favorites-notes", async (req, res) => {
    try {
      const migratedCount = await storage.migrateFavoritesNotesToProductNotes();
      res.json({ success: true, migratedCount });
    } catch (error) {
      console.error("Migration error:", error);
      res.status(500).json({ message: "Failed to migrate notes" });
    }
  });

  // Product Notes
  app.get("/api/sessions/:sessionId/notes", async (req, res) => {
    const notes = await storage.getProductNotes(req.params.sessionId);
    res.json(notes);
  });

  app.get("/api/sessions/:sessionId/notes/:productId", async (req, res) => {
    const note = await storage.getProductNote(req.params.sessionId, req.params.productId);
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }
    res.json(note);
  });

  app.post("/api/sessions/:sessionId/notes", async (req, res) => {
    try {
      const data = insertProductNoteSchema.parse({
        sessionId: req.params.sessionId,
        productId: req.body.productId,
        note: req.body.note,
      });
      const note = await storage.saveProductNote(data);
      res.json(note);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.delete("/api/sessions/:sessionId/notes/:productId", async (req, res) => {
    const success = await storage.deleteProductNote(req.params.sessionId, req.params.productId);
    if (!success) {
      return res.status(404).json({ message: "Note not found" });
    }
    res.json({ success: true });
  });

  // View History
  app.get("/api/sessions/:sessionId/views", async (req, res) => {
    const views = await storage.getViewHistory(req.params.sessionId);
    res.json(views);
  });

  app.post("/api/sessions/:sessionId/views", async (req, res) => {
    await storage.recordView(req.params.sessionId, req.body.productId);
    res.json({ success: true });
  });

  // Shopping Cart
  app.get("/api/sessions/:sessionId/cart", async (req, res) => {
    const items = await storage.getCartItems(req.params.sessionId);
    res.json(items);
  });

  app.post("/api/sessions/:sessionId/cart", async (req, res) => {
    try {
      const data = insertCartItemSchema.parse({
        sessionId: req.params.sessionId,
        productId: req.body.productId,
        quantity: req.body.quantity || 1,
        note: req.body.note,
      });
      const item = await storage.addToCart(data);
      res.json(item);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.patch("/api/cart/:id/quantity", async (req, res) => {
    const item = await storage.updateCartItemQuantity(req.params.id, req.body.quantity);
    if (!item) {
      return res.status(404).json({ message: "Cart item not found" });
    }
    res.json(item);
  });

  app.delete("/api/cart/:id", async (req, res) => {
    const success = await storage.removeFromCart(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Cart item not found" });
    }
    res.json({ success: true });
  });

  app.delete("/api/sessions/:sessionId/cart", async (req, res) => {
    await storage.clearCart(req.params.sessionId);
    res.json({ success: true });
  });

  // Trivia Questions
  app.get("/api/trivia/questions", async (req, res) => {
    const activeOnly = req.query.activeOnly === 'true';
    const questions = await storage.getTriviaQuestions(activeOnly);
    res.json(questions);
  });

  app.get("/api/trivia/questions/:id", async (req, res) => {
    const question = await storage.getTriviaQuestion(req.params.id);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }
    res.json(question);
  });

  app.post("/api/trivia/questions", isAdmin, async (req, res) => {
    try {
      const data = insertTriviaQuestionSchema.parse(req.body);
      const question = await storage.createTriviaQuestion(data);
      res.json(question);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.patch("/api/trivia/questions/:id", isAdmin, async (req, res) => {
    try {
      const data = insertTriviaQuestionSchema.partial().parse(req.body);
      const question = await storage.updateTriviaQuestion(req.params.id, data);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      res.json(question);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.delete("/api/trivia/questions/:id", isAdmin, async (req, res) => {
    const success = await storage.deleteTriviaQuestion(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Question not found" });
    }
    res.json({ success: true });
  });

  app.post("/api/trivia/questions/bulk-delete", isAdmin, async (req, res) => {
    try {
      const bulkDeleteSchema = z.object({
        ids: z.array(z.string().uuid()).min(1, "At least one ID is required")
      });
      const { ids } = bulkDeleteSchema.parse(req.body);
      const deletedCount = await storage.deleteTriviaQuestions(ids);
      res.json({ success: true, deletedCount });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to delete questions" });
    }
  });

  // Trivia Scores
  app.get("/api/sessions/:sessionId/trivia/scores", async (req, res) => {
    const scores = await storage.getTriviaScores(req.params.sessionId);
    res.json(scores);
  });

  app.post("/api/sessions/:sessionId/trivia/scores", async (req, res) => {
    try {
      const data = insertTriviaScoreSchema.parse({
        sessionId: req.params.sessionId,
        questionId: req.body.questionId,
        isCorrect: req.body.isCorrect,
        attemptId: req.body.attemptId || null,
      });
      const score = await storage.recordTriviaAnswer(data);
      res.json(score);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.get("/api/sessions/:sessionId/trivia/asked", async (req, res) => {
    const askedQuestions = await storage.getAskedQuestions(req.params.sessionId);
    res.json(askedQuestions);
  });

  // Trivia Achievements (Admin)
  app.get("/api/admin/trivia-achievements", isAdmin, async (req, res) => {
    const achievements = await storage.getTriviaAchievements();
    res.json(achievements);
  });

  app.post("/api/admin/trivia-achievements", isAdmin, async (req, res) => {
    try {
      const data = insertTriviaAchievementSchema.parse(req.body);
      const achievement = await storage.createTriviaAchievement(data);
      res.json(achievement);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.put("/api/admin/trivia-achievements/:id", isAdmin, async (req, res) => {
    try {
      const data = insertTriviaAchievementSchema.partial().parse(req.body);
      const achievement = await storage.updateTriviaAchievement(req.params.id, data);
      if (!achievement) {
        return res.status(404).json({ message: "Achievement not found" });
      }
      res.json(achievement);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.delete("/api/admin/trivia-achievements/:id", isAdmin, async (req, res) => {
    const success = await storage.deleteTriviaAchievement(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Achievement not found" });
    }
    res.json({ success: true });
  });

  // Trivia Attempts
  app.get("/api/trivia-attempt/:sessionId", async (req, res) => {
    const attempt = await storage.getTriviaAttempt(req.params.sessionId);
    if (!attempt) {
      return res.status(404).json({ message: "No attempt found for this session" });
    }
    
    let achievement = null;
    if (attempt.achievementId) {
      const achievements = await storage.getTriviaAchievements();
      achievement = achievements.find(a => a.id === attempt.achievementId);
    }
    
    res.json({ ...attempt, achievement });
  });

  app.post("/api/trivia-attempt/start", async (req, res) => {
    try {
      const { sessionId, totalQuestions } = req.body;
      
      // Check for existing attempt that is completed or locked
      const existingAttempt = await storage.getTriviaAttempt(sessionId);
      if (existingAttempt && (existingAttempt.completedAt || existingAttempt.locked)) {
        return res.status(400).json({ 
          message: "This session already has a completed or locked trivia attempt" 
        });
      }

      const data = insertTriviaAttemptSchema.parse({
        sessionId,
        totalQuestions,
      });
      
      const attempt = await storage.createTriviaAttempt(data);
      res.json(attempt);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.post("/api/trivia-attempt/complete", async (req, res) => {
    try {
      const { attemptId, correctAnswers } = req.body;
      
      if (!attemptId || typeof correctAnswers !== 'number') {
        return res.status(400).json({ message: "attemptId and correctAnswers are required" });
      }

      // Get the attempt
      const attempts = await db.select().from(triviaAttempts).where(eq(triviaAttempts.id, attemptId));
      const attempt = attempts[0];
      
      if (!attempt) {
        return res.status(404).json({ message: "Attempt not found" });
      }

      if (attempt.completedAt) {
        return res.status(400).json({ message: "Attempt already completed" });
      }

      // Get all enabled achievements ordered by threshold
      const achievements = await storage.getTriviaAchievements();
      const enabledAchievements = achievements.filter(a => a.enabled);
      
      // Find the highest achievement the user qualifies for
      let earnedAchievement = null;
      for (let i = enabledAchievements.length - 1; i >= 0; i--) {
        if (correctAnswers >= enabledAchievements[i].scoreThreshold) {
          earnedAchievement = enabledAchievements[i];
          break;
        }
      }

      // Update the attempt
      const updateData: any = {
        correctAnswers,
        completedAt: new Date(),
        achievementId: earnedAchievement?.id || null,
        locked: true,
      };

      await storage.updateTriviaAttempt(attemptId, updateData);

      // Apply reward if achievement was earned
      if (earnedAchievement) {
        if (earnedAchievement.rewardType === 'discount') {
          // Create cart discount automatically
          await storage.createCartDiscount({
            sessionId: attempt.sessionId,
            source: `trivia_achievement_${earnedAchievement.id}`,
            amount: earnedAchievement.rewardValue.toString(),
            label: `Trivia Achievement: ${earnedAchievement.achievementMessage}`,
          });

          await storage.updateTriviaAttempt(attemptId, {
            discountAppliedAt: new Date(),
          });
        } else if (earnedAchievement.rewardType === 'token') {
          // Create redemption record with pending status
          await storage.createAchievementRedemption({
            attemptId,
            rewardType: 'token',
            status: 'pending',
            appliedAmount: earnedAchievement.rewardValue.toString(),
          });
        }
      }

      const updatedAttempt = await storage.getTriviaAttempt(attempt.sessionId);
      res.json({ 
        attempt: updatedAttempt, 
        achievement: earnedAchievement 
      });
    } catch (error) {
      console.error("Error completing trivia attempt:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to complete attempt" });
    }
  });

  app.post("/api/trivia-attempt/verify-token", isAdmin, async (req: any, res) => {
    try {
      const { attemptId, staffVerifier, notes } = req.body;
      
      if (!attemptId) {
        return res.status(400).json({ message: "attemptId is required" });
      }

      // Get the attempt
      const attempts = await db.select().from(triviaAttempts).where(eq(triviaAttempts.id, attemptId));
      const attempt = attempts[0];
      
      if (!attempt) {
        return res.status(404).json({ message: "Attempt not found" });
      }

      if (attempt.tokenVerifiedAt) {
        return res.status(400).json({ message: "Token already verified" });
      }

      // Get redemption record
      const redemptions = await db.select().from(achievementRedemptions).where(eq(achievementRedemptions.attemptId, attemptId));
      const redemption = redemptions[0];

      if (!redemption) {
        return res.status(404).json({ message: "Redemption record not found" });
      }

      // Update attempt with verification
      await storage.updateTriviaAttempt(attemptId, {
        tokenVerifiedAt: new Date(),
        staffVerifier: staffVerifier || req.user?.email || 'Unknown',
        notes: notes || null,
      });

      // Update redemption status to applied
      await storage.updateAchievementRedemption(redemption.id, {
        status: 'applied',
      });

      const updatedAttempt = await storage.getTriviaAttempt(attempt.sessionId);
      res.json(updatedAttempt);
    } catch (error) {
      console.error("Error verifying token:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to verify token" });
    }
  });

  // Cart Discounts
  app.get("/api/cart-discounts/:sessionId", async (req, res) => {
    const discounts = await storage.getCartDiscounts(req.params.sessionId);
    res.json(discounts);
  });

  // Get next trivia question (not yet asked)
  app.get("/api/sessions/:sessionId/trivia/next", async (req, res) => {
    const askedQuestions = await storage.getAskedQuestions(req.params.sessionId);
    const allQuestions = await storage.getTriviaQuestions(true);
    
    // First question: Always show the "You are currently at?" question
    if (askedQuestions.length === 0) {
      const firstQuestion = allQuestions.find(q => 
        q.question.includes("You are currently at") || 
        q.question.includes("currently located")
      );
      
      if (firstQuestion) {
        return res.json(firstQuestion);
      }
    }
    
    // Subsequent questions: Randomize from remaining questions
    const remainingQuestions = allQuestions.filter(q => !askedQuestions.includes(q.id));
    
    if (remainingQuestions.length === 0) {
      return res.status(404).json({ message: "No more questions available" });
    }
    
    // Randomly select from remaining questions
    const randomIndex = Math.floor(Math.random() * remainingQuestions.length);
    const nextQuestion = remainingQuestions[randomIndex];
    
    res.json(nextQuestion);
  });

  // Settings
  app.get("/api/settings/:key", async (req, res) => {
    const setting = await storage.getSetting(req.params.key);
    if (!setting) {
      return res.status(404).json({ message: "Setting not found" });
    }
    res.json(setting);
  });

  app.post("/api/settings", isAdmin, async (req, res) => {
    const { key, value } = req.body;
    
    if (key === "trivia_interval_seconds") {
      const numValue = typeof value === 'number' ? value : parseInt(value);
      
      if (isNaN(numValue)) {
        return res.status(400).json({ 
          message: "Trivia interval must be a valid number" 
        });
      }
      
      if (!Number.isInteger(numValue)) {
        return res.status(400).json({ 
          message: "Trivia interval must be a whole number (no decimals)" 
        });
      }
      
      if (numValue < 30 || numValue > 600) {
        return res.status(400).json({ 
          message: "Trivia interval must be between 30 and 600 seconds" 
        });
      }
    }
    
    const setting = await storage.setSetting(key, value);
    res.json(setting);
  });

  // Surveys
  app.post("/api/sessions/:sessionId/survey", async (req, res) => {
    try {
      const data = insertSurveySchema.parse({
        sessionId: req.params.sessionId,
        easeOfUse: req.body.easeOfUse,
        helpfulness: req.body.helpfulness,
        staffReplacement: req.body.staffReplacement,
        recommendation: req.body.recommendation,
        favoriteFeature: req.body.favoriteFeature,
        improvements: req.body.improvements,
        additionalComments: req.body.additionalComments,
      });
      const survey = await storage.createSurvey(data);
      res.json(survey);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  // Email endpoints
  app.post("/api/sessions/:sessionId/email/cart", async (req, res) => {
    try {
      const { generateCartEmail, sendEmail } = await import("./email");
      const session = await storage.getGuestSession(req.params.sessionId);
      const cartItems = await storage.getCartItems(req.params.sessionId);
      
      if (!session || cartItems.length === 0) {
        return res.status(400).json({ message: "No cart items to email" });
      }

      const { subtotal, discount, triviaCredit, total } = req.body;
      
      const emailData = generateCartEmail({
        guestName: session.guestName,
        items: cartItems,
        subtotal,
        discount,
        triviaCredit,
        total,
      });

      // Get order recipient emails from settings
      const recipientSetting = await storage.getSetting('order_recipient_emails');
      const recipientEmails = (recipientSetting?.value as string) || 'onsiteorder@nashobawinery.com';
      
      // Parse comma-separated emails
      const recipients = recipientEmails
        .split(',')
        .map((email: string) => email.trim())
        .filter((email: string) => email.length > 0);
      
      if (recipients.length === 0) {
        return res.status(500).json({ message: "No recipient email addresses configured" });
      }

      // Send email to all recipients
      for (const recipient of recipients) {
        await sendEmail(
          recipient,
          emailData.subject,
          emailData.html,
          emailData.text
        );
      }

      res.json({ success: true, message: "Order sent to staff" });
    } catch (error) {
      console.error("Error sending cart email:", error);
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  app.post("/api/sessions/:sessionId/email/favorites", async (req, res) => {
    try {
      const { generateFavoritesEmail, sendEmail } = await import("./email");
      const session = await storage.getGuestSession(req.params.sessionId);
      const favorites = await storage.getFavorites(req.params.sessionId);
      
      if (!session || favorites.length === 0) {
        return res.status(400).json({ message: "No favorites to email" });
      }

      const emailData = generateFavoritesEmail({
        guestName: session.guestName,
        favorites,
      });

      const guestEmail = req.body.email;
      if (!guestEmail) {
        return res.status(400).json({ message: "Email address required" });
      }

      await sendEmail(
        guestEmail,
        emailData.subject,
        emailData.html,
        emailData.text
      );

      res.json({ success: true, message: "Favorites sent to your email" });
    } catch (error) {
      console.error("Error sending favorites email:", error);
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  // AI Recommendations endpoint
  app.get("/api/sessions/:sessionId/recommendations", async (req, res) => {
    try {
      const [session, favorites, viewHistory, cartItems] = await Promise.all([
        storage.getGuestSession(req.params.sessionId),
        storage.getFavorites(req.params.sessionId),
        storage.getViewHistory(req.params.sessionId),
        storage.getCartItems(req.params.sessionId),
      ]);

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const { generateRecommendations } = await import("./ai-recommendations");
      
      // Build stated preferences if available from questionnaire
      let statedPreferences = (session.preferredBeverageTypes?.length || session.wineColors?.length || session.flavorPreferences?.length || session.occasion)
        ? {
            beverageTypes: session.preferredBeverageTypes || [],
            wineColors: session.wineColors || undefined,
            flavorPreferences: session.flavorPreferences || [],
            occasion: session.occasion || undefined,
          }
        : undefined;

      // INFER preferences from cart and favorites if no questionnaire data
      if (!statedPreferences || statedPreferences.beverageTypes.length === 0) {
        const inferredBeverageTypes = new Set<string>();
        const inferredWineColors = new Set<string>();

        // Infer from cart items
        for (const item of cartItems) {
          const category = item.product.category.toLowerCase();
          inferredBeverageTypes.add(category);
          
          // Extract wine color from type field (e.g., "Red Wine" -> "red")
          if (category === 'wine' && item.product.type) {
            const colorMatch = item.product.type.toLowerCase().match(/^(red|white|ros[eé]|sparkling|dessert)/);
            if (colorMatch) {
              inferredWineColors.add(colorMatch[1]);
            }
          }
        }

        // Also infer from favorites
        for (const fav of favorites) {
          const category = fav.product.category.toLowerCase();
          inferredBeverageTypes.add(category);
          
          if (category === 'wine' && fav.product.type) {
            const colorMatch = fav.product.type.toLowerCase().match(/^(red|white|ros[eé]|sparkling|dessert)/);
            if (colorMatch) {
              inferredWineColors.add(colorMatch[1]);
            }
          }
        }

        // Build inferred preferences if we found any
        if (inferredBeverageTypes.size > 0 || inferredWineColors.size > 0) {
          statedPreferences = {
            beverageTypes: Array.from(inferredBeverageTypes),
            wineColors: inferredWineColors.size > 0 ? Array.from(inferredWineColors) : undefined,
            flavorPreferences: [],
            occasion: undefined,
          };
          console.log("[AI Recommendations] Inferred preferences from cart/favorites:", statedPreferences);
        }
      }

      // Fetch products with characteristics, filtered by beverage types if available
      const allProducts = await storage.getProductsWithCharacteristics(
        statedPreferences?.beverageTypes
      );

      const recommendations = await generateRecommendations(allProducts, {
        favorites,
        viewHistory,
        cartItems,
        statedPreferences,
      });

      res.json(recommendations);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });

  // Excel Import/Export endpoints
  const multer = (await import("multer")).default;
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
      ];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
      }
    },
  });

  app.post("/api/admin/products/delete-duplicates", isAdmin, async (req, res) => {
    try {
      const allProducts = await storage.getProducts({});
      
      // Group products by SKU
      const productsBySku = new Map<string, typeof allProducts>();
      for (const product of allProducts) {
        if (!productsBySku.has(product.sku)) {
          productsBySku.set(product.sku, []);
        }
        productsBySku.get(product.sku)!.push(product);
      }
      
      let duplicatesDeleted = 0;
      const errors: string[] = [];
      
      // For each SKU with duplicates, keep the first one and delete the rest
      for (const [sku, products] of productsBySku) {
        if (products.length > 1) {
          // Sort by createdAt to keep the oldest
          products.sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          
          // Delete all but the first one
          for (let i = 1; i < products.length; i++) {
            try {
              await storage.deleteProduct(products[i].id);
              duplicatesDeleted++;
            } catch (error) {
              errors.push(`Failed to delete duplicate for SKU ${sku}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }
      }
      
      res.json({
        message: `Successfully deleted ${duplicatesDeleted} duplicate product${duplicatesDeleted !== 1 ? 's' : ''}`,
        duplicatesDeleted,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error("Error deleting duplicates:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to delete duplicates" });
    }
  });

  app.get("/api/admin/products/template", async (req, res) => {
    try {
      const { generateExcelTemplate } = await import("./excel-import");
      const buffer = generateExcelTemplate();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=product-template.xlsx');
      res.send(buffer);
    } catch (error) {
      console.error("Error generating template:", error);
      res.status(500).json({ message: "Failed to generate template" });
    }
  });

  app.get("/api/admin/products/export", async (req, res) => {
    try {
      const products = await storage.getProducts({});
      const { exportProductsToExcel } = await import("./excel-import");
      const buffer = exportProductsToExcel(products);
      
      const timestamp = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=products-export-${timestamp}.xlsx`);
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting products:", error);
      res.status(500).json({ message: "Failed to export products" });
    }
  });

  // Database Analysis Endpoint - Shows complete export analysis
  app.get("/api/admin/data/analyze", async (req, res) => {
    try {
      const [products, filterOptions, triviaQuestions, slideshowImages, mediaLibrary, whitelistedEmails, commercials, videos, triviaAchievements, tierPricing, salesReps, b2bCustomers, b2bSlideshowSlides, b2bAdmins, b2bSettings, b2bCommissions, b2bEmailTemplates, b2bEmailAutomationLogs] = await Promise.all([
        storage.getProducts({}),
        storage.getFilterOptions(),
        storage.getTriviaQuestions(false),
        storage.getSlideshowImages(),
        storage.getMediaLibraryFiles(),
        storage.getAllWhitelistedEmails(),
        storage.getCommercials(),
        storage.getVideos(),
        storage.getTriviaAchievements(),
        // B2B data
        storage.getAllTierPricing(),
        storage.getAllSalesReps(),
        storage.getAllB2bCustomers(),
        storage.getAllB2bSlideshowSlides(),
        storage.getAllB2bAdmins(),
        storage.getAllB2bSettings(),
        storage.getAllB2bCommissions(),
        storage.getEmailTemplates(),
        storage.getEmailAutomationLogs(undefined, 10000),
      ]);

      // Get B2B orders
      const allOrders = await storage.getAllB2bOrders();
      const b2bOrdersData: any[] = [];
      const b2bOrderItemsData: any[] = [];
      for (const orderWithCustomer of allOrders) {
        const fullOrder = await storage.getB2bOrder(orderWithCustomer.id);
        if (fullOrder) {
          const { customer, items, ...coreOrder } = fullOrder;
          b2bOrdersData.push(coreOrder);
          b2bOrderItemsData.push(...items);
        }
      }

      // Build summary analysis
      const analysis = {
        timestamp: new Date().toISOString(),
        databases: {
          development: {
            core_app: {
              products: { count: products.length, sample: products.slice(0, 2).map(p => ({ id: p.id, name: p.name, sku: p.sku })) },
              filterOptions: { count: filterOptions.length },
              triviaQuestions: { count: triviaQuestions.length },
              slideshowImages: { count: slideshowImages.length },
              mediaLibrary: { count: mediaLibrary.length },
              whitelistedEmails: { count: whitelistedEmails.length, sample: whitelistedEmails.slice(0, 2).map(e => ({ email: e.email })) },
              commercials: { count: commercials.length },
              videos: { count: videos.length },
              triviaAchievements: { count: triviaAchievements.length },
            },
            b2b: {
              tierPricing: { count: tierPricing.length, sample: tierPricing.slice(0, 2).map(t => ({ id: t.id, tierName: t.tierName, category: t.category })) },
              salesReps: { count: salesReps.length, sample: salesReps.slice(0, 2).map(r => ({ id: r.id, email: r.email, firstName: r.firstName, lastName: r.lastName })) },
              b2bCustomers: { 
                count: b2bCustomers.length, 
                sample: b2bCustomers.slice(0, 3).map(c => ({ 
                  id: c.id, 
                  emailAddress: c.emailAddress, 
                  accountName: c.accountName,
                  accountStatus: c.accountStatus,
                  pricingTierName: (c as any).tier?.tierName || 'N/A',
                  hasPassword: !!(c as any).passwordHash,
                }))
              },
              b2bOrders: { 
                count: b2bOrdersData.length, 
                sample: b2bOrdersData.slice(0, 3).map(o => ({ 
                  id: o.id, 
                  orderNumber: o.orderNumber, 
                  customerId: o.customerId,
                  status: o.status,
                  total: o.total,
                }))
              },
              b2bOrderItems: { count: b2bOrderItemsData.length },
              b2bAdmins: { count: b2bAdmins.length, sample: b2bAdmins.slice(0, 2).map(a => ({ id: a.id, email: a.email, role: a.role })) },
              b2bSettings: { count: b2bSettings.length },
              b2bCommissions: { 
                count: b2bCommissions.length, 
                sample: b2bCommissions.slice(0, 3).map(c => ({ 
                  id: c.id, 
                  orderId: c.orderId,
                  salesRepId: c.salesRepId,
                  orderTotal: c.orderTotal,
                  commissionPercentage: c.commissionPercentage,
                  commissionAmount: c.commissionAmount,
                  status: c.status,
                }))
              },
              b2bSlideshowSlides: { count: b2bSlideshowSlides.length },
              b2bEmailTemplates: { count: b2bEmailTemplates.length, sample: b2bEmailTemplates.slice(0, 2).map(t => ({ id: t.id, name: t.name, triggerType: t.triggerType })) },
              b2bEmailAutomationLogs: { count: b2bEmailAutomationLogs.length },
            },
          },
        },
        syncStatus: {
          readyForExport: true,
          missingPasswords: {
            salesReps: 'NOT_EXPORTED (security)',
            b2bAdmins: 'NOT_EXPORTED (security)',
            b2bCustomers: 'NOT_EXPORTED (security)',
            note: 'Passwords are intentionally not exported for security. Existing records will update without password changes. New records created without password can use password reset.',
          },
          fieldsExported: {
            b2bCustomers: ['emailAddress', 'accountName', 'accountStatus', 'pricingTierName', 'salesRepEmail', 'licenseNumber', 'taxId', 'creditTerms', 'creditLimit', 'primaryContactName', 'primaryContactRole', 'phoneNumber', 'altPhoneNumber', 'billingAddress', 'billingCity', 'billingState', 'billingZipCode', 'shippingAddress', 'shippingCity', 'shippingState', 'shippingZipCode', 'approvedAt', 'notes', 'acceptsMarketing'],
            b2bOrders: ['orderNumber', 'customerEmail', 'orderDate', 'status', 'subtotal', 'tax', 'total', 'notes', 'shippingAddress', 'shippingCity', 'shippingState', 'shippingZipCode'],
            b2bOrderItems: ['orderNumber', 'productSku', 'productName', 'quantity', 'unitPrice', 'retailPrice', 'lineTotal'],
            b2bCommissions: ['orderId', 'salesRepId', 'orderTotal', 'commissionPercentage', 'commissionAmount', 'status', 'payPeriod', 'paidToSalesRep', 'createdAt', 'updatedAt'],
          },
        },
      };

      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing data:", error);
      res.status(500).json({ message: "Failed to analyze data", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.get("/api/admin/data/export-all", async (req, res) => {
    try {
      const [products, filterOptions, triviaQuestions, slideshowImages, mediaLibrary, whitelistedEmails, commercials, videos, triviaAchievements, tierPricing, salesReps, b2bCustomers, b2bSlideshowSlides, b2bAdmins, b2bSettings, b2bCommissions, b2bEmailTemplates, b2bEmailAutomationLogs, b2bCustomerLocations] = await Promise.all([
        storage.getProducts({}),
        storage.getFilterOptions(),
        storage.getTriviaQuestions(false),
        storage.getSlideshowImages(),
        storage.getMediaLibraryFiles(),
        storage.getAllWhitelistedEmails(),
        storage.getCommercials(),
        storage.getVideos(),
        storage.getTriviaAchievements(),
        // B2B data
        storage.getAllTierPricing(),
        storage.getAllSalesReps(),
        storage.getAllB2bCustomers(),
        storage.getAllB2bSlideshowSlides(),
        storage.getAllB2bAdmins(),
        storage.getAllB2bSettings(),
        storage.getAllB2bCommissions(),
        storage.getEmailTemplates(),
        storage.getEmailAutomationLogs(undefined, 10000),
        storage.getAllB2bCustomerLocations(),
      ]);

      // Fetch all manual products (Featured Products) for export
      // storage.getCustomerManualProducts returns { ...manualProduct, product: Product }
      // so mp IS the manualProduct directly (with product joined), not mp.manualProduct
      const b2bCustomerManualProducts: any[] = [];
      for (const customer of b2bCustomers) {
        const manualProducts = await storage.getCustomerManualProducts(customer.id);
        b2bCustomerManualProducts.push(...manualProducts.map(mp => {
          // Destructure to remove the joined product and keep core manualProduct fields
          const { product, ...manualProductCore } = mp;
          return {
            ...manualProductCore,
            customerId: customer.id,
          };
        }));
      }

      const appSettingsData: any[] = [];
      try {
        const discounts = await storage.getSetting('discount_tiers');
        if (discounts) {
          appSettingsData.push(discounts);
        }
        const cannedDiscounts = await storage.getSetting('canned_discount_tiers');
        if (cannedDiscounts) {
          appSettingsData.push(cannedDiscounts);
        }
      } catch (e) {
        // Ignore if settings don't exist
      }

      // Fetch B2B orders with items (getAllB2bOrders returns orders with customer but not items)
      const allOrders = await storage.getAllB2bOrders();
      const b2bOrders: any[] = [];
      const b2bOrderItems: any[] = [];
      
      for (const orderWithCustomer of allOrders) {
        const fullOrder = await storage.getB2bOrder(orderWithCustomer.id);
        if (fullOrder) {
          // Extract core order fields (exclude customer and items from the order object)
          const { customer, items, ...coreOrder } = fullOrder;
          b2bOrders.push(coreOrder);
          b2bOrderItems.push(...items);
        }
      }

      const { exportAllDataToExcel } = await import("./excel-import");
      const buffer = exportAllDataToExcel({
        products,
        filterOptions,
        triviaQuestions,
        slideshowImages,
        appSettings: appSettingsData,
        mediaLibrary,
        whitelistedEmails,
        commercials,
        videos,
        triviaAchievements,
        // B2B data
        tierPricing,
        salesReps,
        b2bCustomers: b2bCustomers.map(c => c), // Already has tier and salesRep joined
        b2bCustomerLocations,
        b2bCustomerManualProducts,
        b2bOrders,
        b2bOrderItems,
        b2bSlideshowSlides,
        b2bAdmins,
        b2bSettings,
        b2bCommissions,
        b2bEmailTemplates,
        b2bEmailAutomationLogs,
      });
      
      const timestamp = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=nashoba-all-data-${timestamp}.xlsx`);
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting all data:", error);
      res.status(500).json({ message: "Failed to export all data" });
    }
  });

  // Selective export - export only specified tables
  app.post("/api/admin/data/export-selective", isAdmin, async (req, res) => {
    try {
      const { tables } = req.body;
      if (!tables || !Array.isArray(tables) || tables.length === 0) {
        return res.status(400).json({ message: "No tables specified" });
      }

      const tableSet = new Set(tables);
      
      // Fetch data for each selected table
      const data: any = {
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
        b2bCustomerLocations: [],
        b2bCustomerManualProducts: [],
        b2bOrders: [],
        b2bOrderItems: [],
        b2bSlideshowSlides: [],
        b2bAdmins: [],
        b2bSettings: [],
        b2bCommissions: [],
        b2bEmailTemplates: [],
        b2bEmailAutomationLogs: [],
      };

      // Base app tables
      if (tableSet.has('products')) {
        data.products = await storage.getProducts({});
      }
      if (tableSet.has('filterOptions')) {
        data.filterOptions = await storage.getFilterOptions();
      }
      if (tableSet.has('triviaQuestions')) {
        data.triviaQuestions = await storage.getTriviaQuestions(false);
      }
      if (tableSet.has('slideshowImages')) {
        data.slideshowImages = await storage.getSlideshowImages();
      }
      if (tableSet.has('appSettings')) {
        try {
          const discounts = await storage.getSetting('discount_tiers');
          if (discounts) data.appSettings.push(discounts);
          const cannedDiscounts = await storage.getSetting('canned_discount_tiers');
          if (cannedDiscounts) data.appSettings.push(cannedDiscounts);
        } catch (e) {}
      }
      if (tableSet.has('mediaLibrary')) {
        data.mediaLibrary = await storage.getMediaLibraryFiles();
      }
      if (tableSet.has('whitelistedEmails')) {
        data.whitelistedEmails = await storage.getAllWhitelistedEmails();
      }
      if (tableSet.has('commercials')) {
        data.commercials = await storage.getCommercials();
      }
      if (tableSet.has('videos')) {
        data.videos = await storage.getVideos();
      }
      if (tableSet.has('triviaAchievements')) {
        data.triviaAchievements = await storage.getTriviaAchievements();
      }

      // B2B tables
      if (tableSet.has('tierPricing')) {
        data.tierPricing = await storage.getAllTierPricing();
      }
      if (tableSet.has('salesReps')) {
        data.salesReps = await storage.getAllSalesReps();
      }
      if (tableSet.has('b2bCustomers')) {
        data.b2bCustomers = await storage.getAllB2bCustomers();
      }
      if (tableSet.has('b2bCustomerLocations')) {
        data.b2bCustomerLocations = await storage.getAllB2bCustomerLocations();
      }
      if (tableSet.has('b2bCustomerManualProducts')) {
        const b2bCustomers = await storage.getAllB2bCustomers();
        for (const customer of b2bCustomers) {
          const manualProducts = await storage.getCustomerManualProducts(customer.id);
          data.b2bCustomerManualProducts.push(...manualProducts.map(mp => {
            const { product, ...core } = mp;
            return { ...core, customerId: customer.id };
          }));
        }
      }
      if (tableSet.has('b2bOrders') || tableSet.has('b2bOrderItems')) {
        const allOrders = await storage.getAllB2bOrders();
        for (const orderWithCustomer of allOrders) {
          const fullOrder = await storage.getB2bOrder(orderWithCustomer.id);
          if (fullOrder) {
            const { customer, items, ...coreOrder } = fullOrder;
            if (tableSet.has('b2bOrders')) {
              data.b2bOrders.push(coreOrder);
            }
            if (tableSet.has('b2bOrderItems')) {
              data.b2bOrderItems.push(...items);
            }
          }
        }
      }
      if (tableSet.has('b2bSlideshowSlides')) {
        data.b2bSlideshowSlides = await storage.getAllB2bSlideshowSlides();
      }
      if (tableSet.has('b2bAdmins')) {
        data.b2bAdmins = await storage.getAllB2bAdmins();
      }
      if (tableSet.has('b2bSettings')) {
        data.b2bSettings = await storage.getAllB2bSettings();
      }
      if (tableSet.has('b2bCommissions')) {
        data.b2bCommissions = await storage.getAllB2bCommissions();
      }
      if (tableSet.has('b2bEmailTemplates')) {
        data.b2bEmailTemplates = await storage.getEmailTemplates();
      }
      if (tableSet.has('b2bEmailAutomationLogs')) {
        data.b2bEmailAutomationLogs = await storage.getEmailAutomationLogs(undefined, 10000);
      }

      const { exportAllDataToExcel } = await import("./excel-import");
      const buffer = exportAllDataToExcel(data);
      
      const timestamp = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=nashoba-selective-${timestamp}.xlsx`);
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting selective data:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // Selective import - import only specified tables from Excel file
  app.post("/api/admin/data/import-selective", upload.single('file'), isAdmin, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const tables = req.body.tables ? JSON.parse(req.body.tables) : [];
      if (!Array.isArray(tables) || tables.length === 0) {
        return res.status(400).json({ message: "No tables specified" });
      }

      const tableSet = new Set(tables);
      const { parseAllDataExcelFile } = await import("./excel-import");
      const parseResult = parseAllDataExcelFile(req.file.buffer);

      const results: any = {
        summary: {},
        errors: [...parseResult.errors],
        warnings: [...parseResult.warnings],
      };

      // BASE APP TABLES
      if (tableSet.has('products')) {
        let success = 0, failed = 0;
        for (const product of parseResult.products) {
          try {
            const existing = await storage.getProductBySku(product.sku);
            if (existing) {
              await storage.updateProduct(existing.id, product);
            } else {
              await storage.createProduct(product);
            }
            success++;
          } catch (error) {
            failed++;
            results.errors.push(`Product "${product.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        results.summary.products = success;
      }

      if (tableSet.has('filterOptions')) {
        let success = 0;
        for (const filter of parseResult.filterOptions) {
          try {
            await storage.upsertFilterOption(filter);
            success++;
          } catch (error) {
            results.errors.push(`Filter "${filter.displayLabel}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        results.summary.filterOptions = success;
      }

      if (tableSet.has('triviaQuestions')) {
        let success = 0;
        for (const trivia of parseResult.triviaQuestions) {
          try {
            await storage.upsertTriviaQuestion(trivia);
            success++;
          } catch (error) {
            results.errors.push(`Trivia: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        results.summary.triviaQuestions = success;
      }

      if (tableSet.has('slideshowImages')) {
        let success = 0;
        for (const image of parseResult.slideshowImages) {
          try {
            await storage.upsertSlideshowImage(image);
            success++;
          } catch (error) {
            results.errors.push(`Slideshow "${image.filename}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        results.summary.slideshowImages = success;
      }

      if (tableSet.has('appSettings')) {
        let success = 0;
        for (const setting of parseResult.appSettings) {
          try {
            await storage.setSetting(setting.key, setting.value);
            success++;
          } catch (error) {
            results.errors.push(`Setting "${setting.key}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        results.summary.appSettings = success;
      }

      if (tableSet.has('mediaLibrary')) {
        let success = 0;
        for (const media of parseResult.mediaLibrary) {
          try {
            await storage.upsertMediaLibraryFile(media);
            success++;
          } catch (error) {
            results.errors.push(`Media "${media.filename}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        results.summary.mediaLibrary = success;
      }

      if (tableSet.has('whitelistedEmails')) {
        let success = 0;
        for (const email of parseResult.whitelistedEmails) {
          try {
            await storage.upsertWhitelistedEmail(email);
            success++;
          } catch (error) {
            results.errors.push(`Whitelisted email "${email.email}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        results.summary.whitelistedEmails = success;
      }

      if (tableSet.has('commercials')) {
        let success = 0;
        for (const commercial of parseResult.commercials) {
          try {
            await storage.upsertCommercial(commercial);
            success++;
          } catch (error) {
            results.errors.push(`Commercial "${commercial.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        results.summary.commercials = success;
      }

      if (tableSet.has('videos')) {
        let success = 0;
        for (const video of parseResult.videos) {
          try {
            await storage.upsertVideo(video);
            success++;
          } catch (error) {
            results.errors.push(`Video "${video.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        results.summary.videos = success;
      }

      if (tableSet.has('triviaAchievements')) {
        let success = 0;
        for (const achievement of parseResult.triviaAchievements) {
          try {
            await storage.upsertTriviaAchievement(achievement);
            success++;
          } catch (error) {
            results.errors.push(`Achievement: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        results.summary.triviaAchievements = success;
      }

      // B2B TABLES - Process in dependency order
      const tierNameToId = new Map<string, string>();
      const salesRepEmailToId = new Map<string, string>();
      const productSkuToId = new Map<string, string>();

      // Build lookups if needed
      if (tableSet.has('b2bCustomers') || tableSet.has('b2bOrders') || tableSet.has('b2bCustomerManualProducts')) {
        const allProducts = await storage.getProducts({});
        for (const prod of allProducts) {
          if (prod.sku) productSkuToId.set(prod.sku.toLowerCase().trim(), prod.id);
        }
      }

      if (tableSet.has('tierPricing')) {
        let success = 0;
        for (const tier of parseResult.tierPricing) {
          try {
            const { tierPricing: upserted } = await storage.upsertTierPricing(tier);
            tierNameToId.set(tier.tierName.toLowerCase().trim(), upserted.id);
            success++;
          } catch (error) {
            results.errors.push(`Tier "${tier.tierName}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        results.summary.tierPricing = success;
      } else {
        // Load existing tiers for FK resolution
        const existingTiers = await storage.getAllTierPricing();
        for (const tier of existingTiers) {
          tierNameToId.set(tier.tierName.toLowerCase().trim(), tier.id);
        }
      }

      if (tableSet.has('salesReps')) {
        let success = 0;
        for (const rep of parseResult.salesReps) {
          try {
            const existing = await storage.getSalesRepByEmailNormalized(rep.email);
            if (existing) {
              await storage.updateSalesRep(existing.id, {
                firstName: rep.firstName,
                lastName: rep.lastName,
                phoneNumber: rep.phoneNumber || null,
                active: rep.active !== undefined ? rep.active : true,
              });
              salesRepEmailToId.set(rep.email.toLowerCase().trim(), existing.id);
              success++;
            } else {
              results.warnings.push(`Sales Rep "${rep.email}": New rep - create via admin UI`);
            }
          } catch (error) {
            results.errors.push(`Sales Rep "${rep.email}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        results.summary.salesReps = success;
      } else {
        // Load existing sales reps for FK resolution
        const existingReps = await storage.getAllSalesReps();
        for (const rep of existingReps) {
          salesRepEmailToId.set(rep.email.toLowerCase().trim(), rep.id);
        }
      }

      if (tableSet.has('b2bCustomers')) {
        let success = 0;
        for (const customer of parseResult.b2bCustomers) {
          try {
            let pricingTierId: string | null = null;
            if (customer.pricingTierName) {
              const tierId = tierNameToId.get(customer.pricingTierName.toLowerCase().trim());
              if (tierId) pricingTierId = tierId;
            }
            let salesRepId: string | null = null;
            if (customer.salesRepEmail) {
              const repId = salesRepEmailToId.get(customer.salesRepEmail.toLowerCase().trim());
              if (repId) salesRepId = repId;
            }
            const customerData = { ...customer, pricingTierId, salesRepId };
            delete (customerData as any).pricingTierName;
            delete (customerData as any).salesRepEmail;
            await storage.upsertB2bCustomer(customerData);
            success++;
          } catch (error) {
            results.errors.push(`B2B Customer "${customer.emailAddress}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        results.summary.b2bCustomers = success;
      }

      if (tableSet.has('b2bCustomerLocations')) {
        let success = 0;
        for (const location of parseResult.b2bCustomerLocations) {
          try {
            const customer = await storage.getB2bCustomerByEmail(location.customerEmail);
            if (!customer) {
              results.warnings.push(`Location "${location.storeName}": Customer not found`);
              continue;
            }
            const existingLocations = await storage.getCustomerLocations(customer.id);
            const existing = existingLocations.find(l => l.storeName?.toLowerCase().trim() === location.storeName?.toLowerCase().trim());
            const locationData = { ...location, customerId: customer.id };
            delete (locationData as any).customerEmail;
            if (existing) {
              await storage.updateCustomerLocation(existing.id, locationData);
            } else {
              await storage.createCustomerLocation(locationData);
            }
            success++;
          } catch (error) {
            results.errors.push(`Location "${location.storeName}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        results.summary.b2bCustomerLocations = success;
      }

      if (tableSet.has('b2bCustomerManualProducts')) {
        let success = 0;
        for (const mp of parseResult.b2bCustomerManualProducts) {
          try {
            const customer = await storage.getB2bCustomerByEmail(mp.customerEmail);
            if (!customer) continue;
            const productId = productSkuToId.get(mp.productSku?.toLowerCase().trim());
            if (!productId) continue;
            const expiresAt = mp.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
            await storage.addCustomerManualProduct(customer.id, productId, expiresAt);
            success++;
          } catch (error) {
            results.errors.push(`Featured Product: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        results.summary.b2bCustomerManualProducts = success;
      }

      if (tableSet.has('b2bOrders') || tableSet.has('b2bOrderItems')) {
        const itemsByOrder = new Map<string, any[]>();
        for (const item of parseResult.b2bOrderItems) {
          const key = item.orderNumber.toLowerCase().trim();
          if (!itemsByOrder.has(key)) itemsByOrder.set(key, []);
          itemsByOrder.get(key)!.push(item);
        }

        let orderSuccess = 0, itemSuccess = 0;
        const allProducts = await storage.getProducts({});
        
        for (const order of parseResult.b2bOrders) {
          try {
            const customer = await storage.getB2bCustomerByEmail(order.customerEmail);
            if (!customer) {
              results.warnings.push(`Order "${order.orderNumber}": Customer not found`);
              continue;
            }
            const orderData = { ...order, customerId: customer.id };
            delete (orderData as any).customerEmail;

            const rawItems = itemsByOrder.get(order.orderNumber.toLowerCase().trim()) || [];
            const resolvedItems = [];
            for (const item of rawItems) {
              const productId = productSkuToId.get(item.productSku.toLowerCase().trim());
              if (!productId) continue;
              const product = allProducts.find(p => p.id === productId);
              if (!product) continue;
              resolvedItems.push({
                productId,
                productName: product.name,
                sku: product.sku,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                retailPrice: item.retailPrice,
                lineTotal: item.lineTotal,
              });
              itemSuccess++;
            }

            if (tableSet.has('b2bOrders')) {
              await storage.upsertB2bOrder(orderData, resolvedItems);
              orderSuccess++;
            }
          } catch (error) {
            results.errors.push(`Order "${order.orderNumber}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        if (tableSet.has('b2bOrders')) results.summary.b2bOrders = orderSuccess;
        if (tableSet.has('b2bOrderItems')) results.summary.b2bOrderItems = itemSuccess;
      }

      if (tableSet.has('b2bSlideshowSlides')) {
        let success = 0;
        for (const slide of parseResult.b2bSlideshowSlides) {
          try {
            await storage.upsertB2bSlideshowSlide(slide);
            success++;
          } catch (error) {
            results.errors.push(`B2B Slide: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        results.summary.b2bSlideshowSlides = success;
      }

      if (tableSet.has('b2bAdmins')) {
        let success = 0;
        for (const admin of parseResult.b2bAdmins) {
          try {
            await storage.upsertB2bAdmin(admin);
            success++;
          } catch (error) {
            results.errors.push(`B2B Admin "${admin.email}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        results.summary.b2bAdmins = success;
      }

      if (tableSet.has('b2bSettings')) {
        let success = 0;
        for (const setting of parseResult.b2bSettings) {
          try {
            await storage.setB2bSetting(setting.key, setting.value);
            success++;
          } catch (error) {
            results.errors.push(`B2B Setting "${setting.key}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        results.summary.b2bSettings = success;
      }

      if (tableSet.has('b2bCommissions')) {
        let success = 0;
        for (const commission of parseResult.b2bCommissions) {
          try {
            await storage.upsertB2bCommission(commission);
            success++;
          } catch (error) {
            results.errors.push(`Commission: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        results.summary.b2bCommissions = success;
      }

      if (tableSet.has('b2bEmailTemplates')) {
        let success = 0;
        for (const template of parseResult.b2bEmailTemplates) {
          try {
            await storage.upsertEmailTemplate(template);
            success++;
          } catch (error) {
            results.errors.push(`Email Template: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        results.summary.b2bEmailTemplates = success;
      }

      if (tableSet.has('b2bEmailAutomationLogs')) {
        let success = 0;
        for (const log of parseResult.b2bEmailAutomationLogs) {
          try {
            await storage.createEmailAutomationLog(log);
            success++;
          } catch (error) {
            results.errors.push(`Email Log: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        results.summary.b2bEmailAutomationLogs = success;
      }

      res.json(results);
    } catch (error) {
      console.error("Error importing selective data:", error);
      res.status(500).json({ message: "Failed to import data", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/admin/products/import", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { parseExcelFile } = await import("./excel-import");
      const parseResult = parseExcelFile(req.file.buffer);

      // Import all valid products
      const results = {
        success: 0,
        failed: 0,
        skipped: parseResult.skipped,
        errors: [...parseResult.errors], // Include parsing errors
      };

      for (const product of parseResult.products) {
        try {
          await storage.createProduct(product);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Failed to import "${product.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      const message = results.success > 0
        ? `Import completed: ${results.success} products added${results.failed > 0 ? `, ${results.failed} failed` : ''}${results.skipped > 0 ? `, ${results.skipped} blank rows skipped` : ''}`
        : 'No products imported';

      res.json({
        message,
        ...results,
      });
    } catch (error) {
      console.error("Error importing Excel file:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to import Excel file" });
    }
  });

  app.post("/api/admin/data/import-all", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { parseAllDataExcelFile } = await import("./excel-import");
      const parseResult = parseAllDataExcelFile(req.file.buffer);

      const results = {
        products: { success: 0, failed: 0 },
        filterOptions: { success: 0, failed: 0 },
        triviaQuestions: { success: 0, failed: 0 },
        slideshowImages: { success: 0, failed: 0 },
        appSettings: { success: 0, failed: 0 },
        mediaLibrary: { success: 0, failed: 0 },
        whitelistedEmails: { success: 0, failed: 0 },
        commercials: { success: 0, failed: 0 },
        videos: { success: 0, failed: 0 },
        triviaAchievements: { success: 0, failed: 0 },
        tierPricing: { success: 0, failed: 0 },
        salesReps: { success: 0, failed: 0 },
        b2bCustomers: { success: 0, failed: 0 },
        b2bCustomerLocations: { success: 0, failed: 0 },
        b2bCustomerManualProducts: { success: 0, failed: 0 },
        b2bOrders: { success: 0, failed: 0 },
        b2bOrderItems: { success: 0, failed: 0 },
        b2bSlideshowSlides: { success: 0, failed: 0 },
        b2bAdmins: { success: 0, failed: 0 },
        b2bSettings: { success: 0, failed: 0 },
        b2bCommissions: { success: 0, failed: 0 },
        b2bEmailTemplates: { success: 0, failed: 0 },
        b2bEmailAutomationLogs: { success: 0, failed: 0 },
        errors: [...parseResult.errors],
        warnings: [...parseResult.warnings],
      };

      // Import products (update existing or create new based on SKU)
      for (const product of parseResult.products) {
        try {
          const existingProduct = await storage.getProductBySku(product.sku);
          if (existingProduct) {
            // Update existing product
            await storage.updateProduct(existingProduct.id, product);
          } else {
            // Create new product
            await storage.createProduct(product);
          }
          results.products.success++;
        } catch (error) {
          results.products.failed++;
          results.errors.push(`Product "${product.name}" (SKU: ${product.sku}): ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Import filter options (upsert: update if exists, create if new)
      for (const filter of parseResult.filterOptions) {
        try {
          await storage.upsertFilterOption(filter);
          results.filterOptions.success++;
        } catch (error) {
          results.filterOptions.failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push(`Filter "${filter.displayLabel}": ${errorMsg}`);
        }
      }

      // Import trivia questions (upsert: update if exists, create if new)
      for (const trivia of parseResult.triviaQuestions) {
        try {
          await storage.upsertTriviaQuestion(trivia);
          results.triviaQuestions.success++;
        } catch (error) {
          results.triviaQuestions.failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push(`Trivia: ${errorMsg}`);
        }
      }

      // Import slideshow images (upsert: update if exists, create if new)
      for (const image of parseResult.slideshowImages) {
        try {
          await storage.upsertSlideshowImage(image);
          results.slideshowImages.success++;
        } catch (error) {
          results.slideshowImages.failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push(`Slideshow Image "${image.filename}": ${errorMsg}`);
        }
      }

      // Import app settings
      for (const setting of parseResult.appSettings) {
        try {
          await storage.setSetting(setting.key, setting.value);
          results.appSettings.success++;
        } catch (error) {
          results.appSettings.failed++;
          results.errors.push(`Setting "${setting.key}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Import media library (upsert: update if exists, create if new)
      for (const media of parseResult.mediaLibrary) {
        try {
          await storage.upsertMediaLibraryFile(media);
          results.mediaLibrary.success++;
        } catch (error) {
          results.mediaLibrary.failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push(`Media file "${media.filename}": ${errorMsg}`);
        }
      }

      // Import whitelisted emails (upsert: update if exists, create if new)
      for (const email of parseResult.whitelistedEmails) {
        try {
          await storage.upsertWhitelistedEmail(email);
          results.whitelistedEmails.success++;
        } catch (error) {
          results.whitelistedEmails.failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push(`Whitelisted email "${email.email}": ${errorMsg}`);
        }
      }

      // Import commercials (upsert: update if exists, create if new)
      for (const commercial of parseResult.commercials) {
        try {
          await storage.upsertCommercial(commercial);
          results.commercials.success++;
        } catch (error) {
          results.commercials.failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push(`Commercial "${commercial.title}": ${errorMsg}`);
        }
      }

      // Import videos (upsert: update if exists, create if new)
      for (const video of parseResult.videos) {
        try {
          await storage.upsertVideo(video);
          results.videos.success++;
        } catch (error) {
          results.videos.failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push(`Video "${video.name}": ${errorMsg}`);
        }
      }

      // Import trivia achievements (upsert: update if exists, create if new)
      for (const achievement of parseResult.triviaAchievements) {
        try {
          await storage.upsertTriviaAchievement(achievement);
          results.triviaAchievements.success++;
        } catch (error) {
          results.triviaAchievements.failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push(`Trivia achievement (${achievement.scoreThreshold} points): ${errorMsg}`);
        }
      }

      // B2B DATA IMPORT - Process in dependency order
      // 1. Import tier pricing (independent)
      const tierNameToId = new Map<string, string>();
      for (const tier of parseResult.tierPricing) {
        try {
          const { tierPricing: upserted } = await storage.upsertTierPricing(tier);
          tierNameToId.set(tier.tierName.toLowerCase().trim(), upserted.id);
          results.tierPricing.success++;
        } catch (error) {
          results.tierPricing.failed++;
          results.errors.push(`Tier "${tier.tierName}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // 2. Import sales reps (independent)
      // NOTE: Only updates existing sales reps. New sales reps must be created separately via the admin UI
      // Passwords are not exported for security, so new reps cannot be created during import
      const salesRepEmailToId = new Map<string, string>();
      
      for (const rep of parseResult.salesReps) {
        try {
          // Check if sales rep exists
          const existing = await storage.getSalesRepByEmailNormalized(rep.email);
          
          if (existing) {
            // Update existing sales rep (preserves password)
            const repData = {
              firstName: rep.firstName,
              lastName: rep.lastName,
              phoneNumber: rep.phoneNumber || null,
              active: rep.active !== undefined ? rep.active : true,
            };
            await storage.updateSalesRep(existing.id, repData);
            salesRepEmailToId.set(rep.email.toLowerCase().trim(), existing.id);
            results.salesReps.success++;
          } else {
            // Skip new sales reps - they must be created via admin UI
            results.warnings.push(`Sales Rep "${rep.email}": Skipped (new record - create via admin UI, passwords are not exported for security)`);
          }
        } catch (error) {
          results.salesReps.failed++;
          results.errors.push(`Sales Rep "${rep.email}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Build product SKU lookup map for order items
      const productSkuToId = new Map<string, string>();
      const allProducts = await storage.getProducts({});
      for (const prod of allProducts) {
        if (prod.sku) {
          productSkuToId.set(prod.sku.toLowerCase().trim(), prod.id);
        }
      }

      // 3. Import B2B customers (depends on tiers and sales reps)
      for (const customer of parseResult.b2bCustomers) {
        try {
          // Check if customer already exists
          const existingCustomer = await storage.getB2bCustomerCoreByEmail(customer.emailAddress);
          
          // NOTE: Passwords are not exported for security. New customers will be created without
          // passwords and will need to use password reset to set one, or admin can set it.
          
          // Resolve FK: tier name → tier ID
          let pricingTierId: string | null = null;
          if (customer.pricingTierName) {
            const tierId = tierNameToId.get(customer.pricingTierName.toLowerCase().trim());
            if (!tierId) {
              throw new Error(`Tier "${customer.pricingTierName}" not found`);
            }
            pricingTierId = tierId;
          }

          // Resolve FK: sales rep email → sales rep ID
          let salesRepId: string | null = null;
          if (customer.salesRepEmail) {
            const repId = salesRepEmailToId.get(customer.salesRepEmail.toLowerCase().trim());
            if (repId) {
              salesRepId = repId;
            } else {
              // Sales rep not found, skip this reference (will be null)
              results.warnings.push(`B2B Customer "${customer.emailAddress}": Sales rep "${customer.salesRepEmail}" not found, continuing without sales rep assignment`);
            }
          }

          // Prepare customer data with resolved FKs
          const customerData = {
            ...customer,
            pricingTierId,
            salesRepId,
          };
          delete (customerData as any).pricingTierName;
          delete (customerData as any).salesRepEmail;

          const upserted = await storage.upsertB2bCustomer(customerData);
          results.b2bCustomers.success++;
        } catch (error) {
          results.b2bCustomers.failed++;
          results.errors.push(`B2B Customer "${customer.emailAddress}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // 3.1. Import B2B customer locations (depends on customers)
      for (const location of parseResult.b2bCustomerLocations) {
        try {
          // Resolve FK: customer email → customer ID
          const customer = await storage.getB2bCustomerByEmail(location.customerEmail);
          if (!customer) {
            results.warnings.push(`B2B Location "${location.storeName}": Customer "${location.customerEmail}" not found, skipping location`);
            results.b2bCustomerLocations.failed++;
            continue;
          }

          // Check if location already exists for this customer with this store name
          const existingLocations = await storage.getCustomerLocations(customer.id);
          const existingLocation = existingLocations.find(
            l => l.storeName?.toLowerCase().trim() === location.storeName?.toLowerCase().trim()
          );

          const locationData = {
            ...location,
            customerId: customer.id,
          };
          delete (locationData as any).customerEmail;

          if (existingLocation) {
            await storage.updateCustomerLocation(existingLocation.id, locationData);
          } else {
            await storage.createCustomerLocation(locationData);
          }
          results.b2bCustomerLocations.success++;
        } catch (error) {
          results.b2bCustomerLocations.failed++;
          results.errors.push(`B2B Location "${location.storeName}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // 3.2. Import B2B customer manual products / Featured Products (depends on customers and products)
      for (const manualProduct of parseResult.b2bCustomerManualProducts) {
        try {
          // Resolve FK: customer email → customer ID
          const customer = await storage.getB2bCustomerByEmail(manualProduct.customerEmail);
          if (!customer) {
            results.warnings.push(`B2B Featured Product: Customer "${manualProduct.customerEmail}" not found, skipping`);
            results.b2bCustomerManualProducts.failed++;
            continue;
          }

          // Resolve FK: product SKU → product ID
          const productId = productSkuToId.get(manualProduct.productSku?.toLowerCase().trim());
          if (!productId) {
            results.warnings.push(`B2B Featured Product: Product SKU "${manualProduct.productSku}" not found, skipping`);
            results.b2bCustomerManualProducts.failed++;
            continue;
          }

          // Calculate expires_at: if not provided, default to 12 months from now
          const expiresAt = manualProduct.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

          await storage.addCustomerManualProduct(customer.id, productId, expiresAt);
          results.b2bCustomerManualProducts.success++;
        } catch (error) {
          results.b2bCustomerManualProducts.failed++;
          results.errors.push(`B2B Featured Product for "${manualProduct.customerEmail}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // 4. Import B2B orders with their items (depends on customers and products)
      // Group items by order number first
      const itemsByOrderNumber = new Map<string, any[]>();
      for (const item of parseResult.b2bOrderItems) {
        const orderKey = item.orderNumber.toLowerCase().trim();
        if (!itemsByOrderNumber.has(orderKey)) {
          itemsByOrderNumber.set(orderKey, []);
        }
        itemsByOrderNumber.get(orderKey)!.push(item);
      }

      const orderNumberToId = new Map<string, string>();
      for (const order of parseResult.b2bOrders) {
        try {
          // Resolve FK: customer email → customer ID
          const customer = await storage.getB2bCustomerByEmail(order.customerEmail);
          if (!customer) {
            // Customer not found, skip this order
            results.warnings.push(`B2B Order "${order.orderNumber}": Customer "${order.customerEmail}" not found, skipping order`);
            results.b2bOrders.failed++;
            continue;
          }

          // Prepare order data with resolved FK
          const orderData = {
            ...order,
            customerId: customer.id,
          };
          delete (orderData as any).customerEmail;

          // Get items for this order and resolve their FKs
          const rawItems = itemsByOrderNumber.get(order.orderNumber.toLowerCase().trim()) || [];
          const resolvedItems = [];
          
          for (const item of rawItems) {
            // Resolve FK: product SKU → product ID
            const productId = productSkuToId.get(item.productSku.toLowerCase().trim());
            if (!productId) {
              throw new Error(`Product SKU "${item.productSku}" not found`);
            }

            // Find product to get name
            const product = allProducts.find(p => p.id === productId);
            if (!product) {
              throw new Error(`Product ID "${productId}" not found in product list`);
            }

            const itemData = {
              productId,
              productName: product.name,
              sku: product.sku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              retailPrice: item.retailPrice,
              lineTotal: item.lineTotal,
            };
            resolvedItems.push(itemData);
            results.b2bOrderItems.success++;
          }

          // Upsert order with items (orderId will be added by storage layer)
          const { order: upserted } = await storage.upsertB2bOrder(orderData, resolvedItems);
          orderNumberToId.set(order.orderNumber.toLowerCase().trim(), upserted.id);
          results.b2bOrders.success++;
        } catch (error) {
          results.b2bOrders.failed++;
          results.errors.push(`B2B Order "${order.orderNumber}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // 5. Import B2B slideshow slides (may have FK references to media library/videos)
      // Build lookup dictionaries for FK resolution
      const allMediaLibrary = await storage.getMediaLibraryFiles();
      const allVideos = await storage.getVideos();
      const mediaFilenameToId = new Map<string, string>(allMediaLibrary.map(m => [m.filename.toLowerCase(), m.id]));
      const videoTitleToId = new Map<string, string>(allVideos.map(v => [v.title.toLowerCase(), v.id]));
      
      for (const slide of parseResult.b2bSlideshowSlides) {
        try {
          // Resolve FK business keys to IDs
          let resolvedMediaLibraryId: string | undefined = undefined;
          let resolvedVideoId: string | undefined = undefined;
          let resolvedAdditionalMediaIds: string[] | null = null;
          
          if (slide.mediaLibraryFilename && slide.mediaLibraryFilename.trim()) {
            resolvedMediaLibraryId = mediaFilenameToId.get(slide.mediaLibraryFilename.toLowerCase().trim());
            if (!resolvedMediaLibraryId) {
              results.warnings.push(`B2B Slideshow Slide "${slide.title}": Media library file "${slide.mediaLibraryFilename}" not found`);
            }
          }
          
          if (slide.videoName && slide.videoName.trim()) {
            resolvedVideoId = videoTitleToId.get(slide.videoName.toLowerCase().trim());
            if (!resolvedVideoId) {
              results.warnings.push(`B2B Slideshow Slide "${slide.title}": Video "${slide.videoName}" not found`);
            }
          }
          
          // Resolve additional media filenames to IDs (if provided as filenames)
          if (slide.additionalMediaFilenames && slide.additionalMediaFilenames.length > 0) {
            resolvedAdditionalMediaIds = [];
            for (const filename of slide.additionalMediaFilenames) {
              const mediaId = mediaFilenameToId.get(filename.toLowerCase().trim());
              if (mediaId) {
                resolvedAdditionalMediaIds.push(mediaId);
              } else {
                results.warnings.push(`B2B Slideshow Slide "${slide.title}": Additional media file "${filename}" not found`);
              }
            }
            if (resolvedAdditionalMediaIds.length === 0) {
              resolvedAdditionalMediaIds = null;
            }
          } else if (slide.additionalMediaIds && slide.additionalMediaIds.length > 0) {
            // Use direct IDs if provided (and no filenames)
            resolvedAdditionalMediaIds = slide.additionalMediaIds;
          }
          
          // Create slide data with resolved FKs
          const slideData = {
            title: slide.title,
            content: slide.content,
            highlight: slide.highlight,
            mediaType: slide.mediaType,
            mediaUrl: slide.mediaUrl,
            mediaLibraryId: resolvedMediaLibraryId || null,
            videoId: resolvedVideoId || null,
            additionalMediaIds: resolvedAdditionalMediaIds,
            iconName: slide.iconName,
            sortOrder: slide.sortOrder,
            active: slide.active,
          };
          
          await storage.upsertB2bSlideshowSlide(slideData);
          results.b2bSlideshowSlides.success++;
        } catch (error) {
          results.b2bSlideshowSlides.failed++;
          results.errors.push(`B2B Slideshow Slide "${slide.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // 6. Import B2B admins (independent - no FK dependencies)
      for (const admin of parseResult.b2bAdmins) {
        try {
          // Check if admin already exists
          const existingAdmin = await storage.getB2bAdminByEmail(admin.email);
          
          if (existingAdmin) {
            // Update existing admin (password will be preserved)
            const upserted = await storage.upsertB2bAdmin(admin);
            results.b2bAdmins.success++;
          } else if (admin.passwordHash && admin.passwordHash.trim()) {
            // Create new admin only if password is provided
            const upserted = await storage.upsertB2bAdmin(admin);
            results.b2bAdmins.success++;
          } else {
            // Skip new admin without password
            results.warnings.push(`B2B Admin "${admin.email}": Skipped (new record without password - passwords are not exported for security)`);
          }
        } catch (error) {
          results.b2bAdmins.failed++;
          results.errors.push(`B2B Admin "${admin.email}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // 7. Import B2B settings (independent - no FK dependencies)
      for (const setting of parseResult.b2bSettings) {
        try {
          await storage.setB2bSetting(setting.key, setting.value);
          results.b2bSettings.success++;
        } catch (error) {
          results.b2bSettings.failed++;
          results.errors.push(`B2B Setting "${setting.key}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // 8. Import B2B commissions (upsert by orderId + salesRepId combination)
      results.b2bCommissions = { success: 0, failed: 0 };
      for (const commission of parseResult.b2bCommissions) {
        try {
          if (!commission.orderId || !commission.salesRepId) {
            results.warnings.push(`Commission: Missing order or sales rep ID, skipping`);
            continue;
          }
          const data = {
            orderId: commission.orderId,
            salesRepId: commission.salesRepId,
            orderTotal: commission.orderTotal || 0,
            commissionPercentage: commission.commissionPercentage || 0,
            commissionAmount: commission.commissionAmount || 0,
            status: commission.status || 'pending',
            payPeriod: commission.payPeriod || null,
            paidToSalesRep: commission.paidToSalesRep || false,
            paidToSalesRepAt: commission.paidToSalesRepAt || null,
          };
          // Upsert: check if exists by order+salesRep combination (natural business key)
          // This prevents duplicates on re-import
          await storage.upsertCommissionByOrderAndSalesRep(data);
          results.b2bCommissions.success++;
        } catch (error) {
          results.b2bCommissions.failed++;
          results.errors.push(`Commission: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // 9. Import B2B email templates (upsert by ID)
      results.b2bEmailTemplates = { success: 0, failed: 0 };
      for (const template of parseResult.b2bEmailTemplates) {
        try {
          const data = {
            name: template.name || '',
            description: template.description || '',
            triggerType: template.triggerType || '',
            tierFilter: template.tierFilter || null,
            subject: template.subject || '',
            bodyHtml: template.bodyHtml || '',
            bodyText: template.bodyText || '',
            daysBeforeEvent: template.daysBeforeEvent || null,
            active: template.active !== undefined ? template.active : true,
            createdByAdminId: template.createdByAdminId || null,
          };
          const existing = await storage.getEmailTemplate(template.id);
          if (existing) {
            await storage.updateEmailTemplate(template.id, data);
          } else {
            // Create with auto-generated ID (can't preserve original ID from import)
            await storage.createEmailTemplate(data);
          }
          results.b2bEmailTemplates.success++;
        } catch (error) {
          results.b2bEmailTemplates.failed++;
          results.errors.push(`Email Template "${template.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // 10. Import B2B email automation logs (create only)
      results.b2bEmailAutomationLogs = { success: 0, failed: 0 };
      for (const log of parseResult.b2bEmailAutomationLogs) {
        try {
          if (!log.customerId) {
            results.warnings.push(`Email Log: Missing customer ID, skipping`);
            continue;
          }
          const data = {
            templateId: log.templateId || null,
            customerId: log.customerId,
            recipientEmail: log.recipientEmail,
            subject: log.subject,
            triggerType: log.triggerType,
            sentAt: log.sentAt || new Date(),
            success: log.success !== undefined ? log.success : true,
            errorMessage: log.errorMessage || null,
          };
          await storage.logEmailAutomation(data);
          results.b2bEmailAutomationLogs.success++;
        } catch (error) {
          results.b2bEmailAutomationLogs.failed++;
          results.errors.push(`Email Log: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      const totalSuccess = results.products.success + results.filterOptions.success + 
        results.triviaQuestions.success + results.slideshowImages.success + results.appSettings.success + 
        results.mediaLibrary.success + results.whitelistedEmails.success + results.commercials.success + 
        results.videos.success + results.triviaAchievements.success + results.tierPricing.success + 
        results.salesReps.success + results.b2bCustomers.success + results.b2bOrders.success + results.b2bOrderItems.success +
        results.b2bSlideshowSlides.success + results.b2bAdmins.success + results.b2bSettings.success +
        results.b2bCommissions.success + results.b2bEmailTemplates.success + results.b2bEmailAutomationLogs.success;
      const totalFailed = results.products.failed + results.filterOptions.failed + 
        results.triviaQuestions.failed + results.slideshowImages.failed + results.appSettings.failed + 
        results.mediaLibrary.failed + results.whitelistedEmails.failed + results.commercials.failed + 
        results.videos.failed + results.triviaAchievements.failed + results.tierPricing.failed + 
        results.salesReps.failed + results.b2bCustomers.failed + results.b2bOrders.failed + results.b2bOrderItems.failed +
        results.b2bSlideshowSlides.failed + results.b2bAdmins.failed + results.b2bSettings.failed +
        results.b2bCommissions.failed + results.b2bEmailTemplates.failed + results.b2bEmailAutomationLogs.failed;

      const message = totalSuccess > 0
        ? `Import completed: ${totalSuccess} items imported${totalFailed > 0 ? `, ${totalFailed} failed` : ''}`
        : 'No data imported';

      res.json({
        message,
        ...results,
      });
    } catch (error) {
      console.error("Error importing all data:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to import data" });
    }
  });

  // Shopify CSV Import
  const csvUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        cb(null, true);
      } else {
        cb(new Error('Only CSV files are allowed'));
      }
    },
  });

  app.post("/api/admin/shopify/preview", isAdmin, csvUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { parseShopifyCsv } = await import("./shopify-import");
      const parseResult = parseShopifyCsv(req.file.buffer);

      const preview = {
        products: [] as any[],
        summary: {
          total: parseResult.products.length,
          toCreate: 0,
          toUpdate: 0,
          toSkip: 0,
        },
        errors: parseResult.errors,
      };

      // Check each product to see if it exists
      for (const parsedProduct of parseResult.products) {
        const existing = await storage.getProductBySku(parsedProduct.sku);
        
        if (existing) {
          preview.products.push({
            product: parsedProduct,
            action: 'update',
            existingProduct: {
              id: existing.id,
              name: existing.name,
              price: existing.price,
              sku: existing.sku,
            },
          });
          preview.summary.toUpdate++;
        } else {
          preview.products.push({
            product: parsedProduct,
            action: 'create',
          });
          preview.summary.toCreate++;
        }
      }

      res.json(preview);
    } catch (error) {
      console.error("Error previewing Shopify import:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to preview import" });
    }
  });

  app.post("/api/admin/shopify/import", isAdmin, csvUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { parseShopifyCsv } = await import("./shopify-import");
      const parseResult = parseShopifyCsv(req.file.buffer);

      const results = {
        created: 0,
        updated: 0,
        failed: 0,
        errors: [...parseResult.errors],
      };

      // Import each product
      for (const parsedProduct of parseResult.products) {
        try {
          const productData = {
            name: parsedProduct.name,
            description: parsedProduct.description,
            price: parsedProduct.price.toString(),
            sku: parsedProduct.sku,
            category: parsedProduct.category,
            type: parsedProduct.type,
            imageUrl: parsedProduct.imageUrl,
            characteristics: parsedProduct.characteristics,
            stockQuantity: parsedProduct.stockQuantity,
          };

          const { action } = await storage.upsertProductBySku(productData);
          
          if (action === 'created') {
            results.created++;
          } else {
            results.updated++;
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`Failed to import SKU ${parsedProduct.sku}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      const message = `Import completed: ${results.created} products created, ${results.updated} updated${results.failed > 0 ? `, ${results.failed} failed` : ''}`;

      res.json({
        message,
        ...results,
      });
    } catch (error) {
      console.error("Error importing Shopify CSV:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to import products" });
    }
  });

  // Filter Options Management
  app.get("/api/filter-options", async (req, res) => {
    const fieldType = req.query.fieldType as string | undefined;
    const options = await storage.getFilterOptions(fieldType);
    res.json(options);
  });

  app.get("/api/filter-options/:id", async (req, res) => {
    const option = await storage.getFilterOption(req.params.id);
    if (!option) {
      return res.status(404).json({ message: "Filter option not found" });
    }
    res.json(option);
  });

  app.post("/api/filter-options", isAdmin, async (req, res) => {
    try {
      const data = insertFilterOptionSchema.parse(req.body);
      const option = await storage.createFilterOption(data);
      res.json(option);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.patch("/api/filter-options/:id", isAdmin, async (req, res) => {
    try {
      const option = await storage.updateFilterOption(req.params.id, req.body);
      if (!option) {
        return res.status(404).json({ message: "Filter option not found" });
      }
      res.json(option);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.delete("/api/filter-options/:id", isAdmin, async (req, res) => {
    const success = await storage.deleteFilterOption(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Filter option not found" });
    }
    res.json({ success: true });
  });

  app.post("/api/filter-options/reorder", isAdmin, async (req, res) => {
    try {
      await storage.updateFilterOptionOrder(req.body.updates);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  // Slideshow Images Management
  app.get("/api/slideshow-images", async (req, res) => {
    const activeOnly = req.query.activeOnly === 'true';
    const images = await storage.getSlideshowImages(activeOnly);
    res.json(images);
  });

  app.get("/api/slideshow-images/:id", async (req, res) => {
    const image = await storage.getSlideshowImage(req.params.id);
    if (!image) {
      return res.status(404).json({ message: "Slideshow image not found" });
    }
    res.json(image);
  });

  app.post("/api/slideshow-images", isAdmin, async (req, res) => {
    try {
      const data = insertSlideshowImageSchema.parse(req.body);
      const image = await storage.createSlideshowImage(data);
      res.json(image);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.patch("/api/slideshow-images/:id", isAdmin, async (req, res) => {
    try {
      const image = await storage.updateSlideshowImage(req.params.id, req.body);
      if (!image) {
        return res.status(404).json({ message: "Slideshow image not found" });
      }
      res.json(image);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.delete("/api/slideshow-images/:id", isAdmin, async (req, res) => {
    const success = await storage.deleteSlideshowImage(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Slideshow image not found" });
    }
    res.json({ success: true });
  });

  app.post("/api/slideshow-images/reorder", isAdmin, async (req, res) => {
    try {
      await storage.updateSlideshowImageOrder(req.body.updates);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  // Media Library Management
  app.post("/api/media-library/upload-url", isAdmin, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadUrl = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadUrl });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to generate upload URL" });
    }
  });

  app.get("/api/media-library", async (req, res) => {
    const category = req.query.category as string | undefined;
    const files = await storage.getMediaLibraryFiles(category);
    res.json(files);
  });

  app.get("/api/media-library/:id", async (req, res) => {
    const file = await storage.getMediaLibraryFile(req.params.id);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }
    res.json(file);
  });

  app.get("/api/media-library/:id/file", async (req, res) => {
    try {
      const file = await storage.getMediaLibraryFile(req.params.id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(file.objectPath);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error('Error serving media file:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Error loading file" });
      }
    }
  });

  app.post("/api/media-library", isAdmin, async (req, res) => {
    try {
      const data = insertMediaLibrarySchema.parse(req.body);
      
      const objectStorageService = new ObjectStorageService();
      
      const normalizedPath = await objectStorageService.trySetObjectEntityAclPolicy(data.objectPath, {
        owner: 'system',
        visibility: 'public',
      });
      
      const fileToCreate = {
        ...data,
        objectPath: normalizedPath,
      };
      
      const file = await storage.createMediaLibraryFile(fileToCreate);
      res.json(file);
    } catch (error) {
      console.error('Error creating media library file:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.patch("/api/media-library/:id", isAdmin, async (req, res) => {
    try {
      const file = await storage.updateMediaLibraryFile(req.params.id, req.body);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      res.json(file);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.delete("/api/media-library/:id", isAdmin, async (req, res) => {
    try {
      const file = await storage.getMediaLibraryFile(req.params.id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      const objectStorageService = new ObjectStorageService();
      try {
        const objectFile = await objectStorageService.getObjectEntityFile(file.objectPath);
        await objectFile.delete();
      } catch (error) {
        console.error('Failed to delete file from storage:', error);
      }

      const success = await storage.deleteMediaLibraryFile(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "File not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to delete file" });
    }
  });

  // Get product media files (only media associated with products via product_media table)
  app.get("/api/product-media", isAdmin, async (req, res) => {
    try {
      const productMediaFiles = await storage.getProductMediaFiles();
      res.json(productMediaFiles);
    } catch (error) {
      console.error('Error fetching product media:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch product media" });
    }
  });

  // Media Library Sync - Download from external URLs and re-upload to current environment's Object Storage
  app.post("/api/admin/media-library/sync", isAdmin, async (req, res) => {
    try {
      const { dryRun = false, mediaIds } = req.body;
      const objectStorageService = new ObjectStorageService();
      const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      
      if (!bucketId) {
        return res.status(500).json({ error: "Object storage not configured" });
      }

      // Get all media library files (or specific ones if mediaIds provided)
      const allMedia = await storage.getMediaLibraryFiles();
      const mediaToSync = mediaIds 
        ? allMedia.filter(m => mediaIds.includes(m.id))
        : allMedia;

      console.log(`Media sync: Processing ${mediaToSync.length} files (dryRun: ${dryRun})`);

      const results: Array<{
        id: string;
        filename: string;
        status: 'synced' | 'skipped' | 'failed';
        message: string;
        newUrl?: string;
      }> = [];

      for (const media of mediaToSync) {
        try {
          // Check if file already exists in current bucket
          const objectPath = media.objectPath;
          let fileExists = false;
          
          try {
            const bucket = objectStorageClient.bucket(bucketId);
            const [exists] = await bucket.file(objectPath).exists();
            fileExists = exists;
          } catch {
            fileExists = false;
          }

          if (fileExists) {
            // File exists, just update the URL to point to current bucket
            const newPublicUrl = `https://storage.googleapis.com/${bucketId}/${objectPath}`;
            
            if (media.publicUrl !== newPublicUrl) {
              if (!dryRun) {
                await storage.updateMediaLibraryFile(media.id, { publicUrl: newPublicUrl });
              }
              results.push({
                id: media.id,
                filename: media.filename,
                status: 'synced',
                message: 'URL updated to current bucket',
                newUrl: newPublicUrl,
              });
            } else {
              results.push({
                id: media.id,
                filename: media.filename,
                status: 'skipped',
                message: 'File already exists with correct URL',
              });
            }
            continue;
          }

          // File doesn't exist - try to download from original URL
          if (!media.publicUrl) {
            results.push({
              id: media.id,
              filename: media.filename,
              status: 'failed',
              message: 'No source URL available',
            });
            continue;
          }

          if (dryRun) {
            results.push({
              id: media.id,
              filename: media.filename,
              status: 'synced',
              message: `[DRY RUN] Would download from ${media.publicUrl}`,
            });
            continue;
          }

          // Download the file from the source URL
          console.log(`  Downloading: ${media.filename} from ${media.publicUrl}`);
          const response = await fetch(media.publicUrl);
          
          if (!response.ok) {
            results.push({
              id: media.id,
              filename: media.filename,
              status: 'failed',
              message: `Download failed: ${response.status} ${response.statusText}`,
            });
            continue;
          }

          const fileBuffer = Buffer.from(await response.arrayBuffer());
          const contentType = response.headers.get('content-type') || media.mimeType;

          // Upload to current bucket
          const bucket = objectStorageClient.bucket(bucketId);
          const file = bucket.file(objectPath);
          
          await file.save(fileBuffer, {
            metadata: { contentType },
          });

          // Set public ACL
          const normalizedPath = await objectStorageService.trySetObjectEntityAclPolicy(objectPath, {
            owner: 'system',
            visibility: 'public',
          });

          // Update the media library record with new URL
          const newPublicUrl = `https://storage.googleapis.com/${bucketId}/${normalizedPath}`;
          await storage.updateMediaLibraryFile(media.id, { 
            publicUrl: newPublicUrl,
            objectPath: normalizedPath,
          });

          console.log(`  ✓ Synced: ${media.filename}`);
          results.push({
            id: media.id,
            filename: media.filename,
            status: 'synced',
            message: 'Downloaded and uploaded successfully',
            newUrl: newPublicUrl,
          });

        } catch (error) {
          console.error(`  ✗ Failed: ${media.filename}`, error);
          results.push({
            id: media.id,
            filename: media.filename,
            status: 'failed',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      const summary = {
        total: results.length,
        synced: results.filter(r => r.status === 'synced').length,
        skipped: results.filter(r => r.status === 'skipped').length,
        failed: results.filter(r => r.status === 'failed').length,
      };

      console.log(`Media sync complete: ${summary.synced} synced, ${summary.skipped} skipped, ${summary.failed} failed`);

      res.json({ 
        success: true, 
        dryRun,
        summary,
        results 
      });
    } catch (error) {
      console.error('Media sync error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Media sync failed' 
      });
    }
  });

  // Check media library sync status - shows which files are missing from current bucket
  app.get("/api/admin/media-library/sync-status", isAdmin, async (req, res) => {
    try {
      const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      
      if (!bucketId) {
        return res.status(500).json({ error: "Object storage not configured" });
      }

      const allMedia = await storage.getMediaLibraryFiles();
      
      const statusResults: Array<{
        id: string;
        filename: string;
        objectPath: string;
        publicUrl: string;
        existsInBucket: boolean;
        urlMatchesBucket: boolean;
      }> = [];

      for (const media of allMedia) {
        let existsInBucket = false;
        
        try {
          const bucket = objectStorageClient.bucket(bucketId);
          const [exists] = await bucket.file(media.objectPath).exists();
          existsInBucket = exists;
        } catch {
          existsInBucket = false;
        }

        const expectedUrl = `https://storage.googleapis.com/${bucketId}/${media.objectPath}`;
        const urlMatchesBucket = media.publicUrl === expectedUrl;

        statusResults.push({
          id: media.id,
          filename: media.filename,
          objectPath: media.objectPath,
          publicUrl: media.publicUrl,
          existsInBucket,
          urlMatchesBucket,
        });
      }

      const summary = {
        total: statusResults.length,
        existingInBucket: statusResults.filter(r => r.existsInBucket).length,
        missingFromBucket: statusResults.filter(r => !r.existsInBucket).length,
        urlMismatch: statusResults.filter(r => !r.urlMatchesBucket).length,
      };

      res.json({
        bucketId,
        summary,
        files: statusResults,
      });
    } catch (error) {
      console.error('Media sync status error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to check sync status' 
      });
    }
  });

  // Product Image Migration
  app.post("/api/admin/migrate-product-images", isAdmin, async (req, res) => {
    try {
      const options = {
        dryRun: req.body.dryRun === true,
        productIds: req.body.productIds,
        skipExisting: req.body.skipExisting !== false,
      };

      console.log("Starting product image migration with options:", options);
      const results = await migrateProductImages(storage, options);

      res.json({
        success: true,
        results,
        summary: {
          total: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          totalImagesMigrated: results.reduce((sum, r) => sum + r.imagesMigrated, 0),
        },
      });
    } catch (error) {
      console.error("Migration error:", error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : "Migration failed" 
      });
    }
  });

  // Product Media Management
  app.get("/api/admin/products-with-media", isAdmin, async (req, res) => {
    try {
      const products = await storage.getProductsWithMedia();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products with media:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/admin/product-media/upload", isAdmin, async (req, res) => {
    try {
      const multer = (await import("multer")).default;
      const upload = multer({ storage: multer.memoryStorage() });

      upload.single('file')(req, res, async (err) => {
        if (err) {
          return res.status(400).json({ message: "File upload failed" });
        }

        const file = (req as any).file;
        if (!file) {
          return res.status(400).json({ message: "No file provided" });
        }

        // Magic-byte validation - verify actual file type from buffer
        const fileTypeModule = await import("file-type");
        const fileTypeFromBuffer = fileTypeModule.fileTypeFromBuffer;
        const detectedType = await fileTypeFromBuffer(file.buffer);
        
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!detectedType || !allowedMimeTypes.includes(detectedType.mime)) {
          return res.status(400).json({ 
            message: "Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed" 
          });
        }

        const maxSizeBytes = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSizeBytes) {
          return res.status(400).json({ 
            message: "File too large. Maximum size is 10MB" 
          });
        }

        const { productId, role } = req.body;
        if (!productId || !role) {
          return res.status(400).json({ message: "Product ID and role are required" });
        }

        // Validate productId is a valid UUID to prevent path traversal
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(productId)) {
          return res.status(400).json({ message: "Invalid product ID format" });
        }

        const validRoles = ['primary', 'label', 'lifestyle', 'gallery'];
        if (!validRoles.includes(role)) {
          return res.status(400).json({ message: "Invalid role" });
        }

        // Upload to object storage
        const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
        if (!bucketId) {
          return res.status(500).json({ message: "Object storage not configured" });
        }

        // Sanitize filename - extract extension safely
        const originalExt = file.originalname.split('.').pop() || 'jpg';
        const safeExt = originalExt.toLowerCase().replace(/[^a-z0-9]/g, '');
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
        const extension = allowedExtensions.includes(safeExt) ? safeExt : 'jpg';
        
        // Generate safe filename with timestamp and random component
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const filename = `product-${productId}-${role}-${timestamp}-${random}.${extension}`;
        const objectPath = `public/products/${filename}`;

        // Upload using objectStorageClient (same pattern as migration script)
        const bucket = objectStorageClient.bucket(bucketId);
        const bucketFile = bucket.file(objectPath);

        await bucketFile.save(file.buffer, {
          metadata: {
            contentType: file.mimetype,
          },
        });

        // Set public ACL using ObjectStorageService
        const objectStorageService = new ObjectStorageService();
        const normalizedPath = await objectStorageService.trySetObjectEntityAclPolicy(objectPath, {
          owner: 'system',
          visibility: 'public',
        });

        // Construct the public URL
        const publicUrl = `https://storage.googleapis.com/${bucketId}/${normalizedPath}`;

        // Create media library record
        const mediaData = {
          filename,
          originalFilename: file.originalname,
          objectPath,
          publicUrl,
          mimeType: file.mimetype,
          fileSize: file.size,
          category: "product-images" as any,
        };

        const mediaRecord = await storage.createMediaLibraryFile(mediaData);

        // Create product_media link
        const productMediaData = {
          productId,
          mediaId: mediaRecord.id,
          role: role as "primary" | "label" | "lifestyle" | "gallery",
          sortOrder: 0,
        };

        const productMedia = await storage.createProductMedia(productMediaData);

        res.json({
          success: true,
          media: mediaRecord,
          productMedia,
        });
      });
    } catch (error) {
      console.error("Error uploading product media:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Upload failed" });
    }
  });

  app.delete("/api/admin/product-media/:id", isAdmin, async (req, res) => {
    try {
      const success = await storage.deleteProductMedia(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Product media not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting product media:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Delete failed" });
    }
  });

  app.post("/api/admin/product-media/associate", isAdmin, async (req, res) => {
    try {
      const { productId, mediaId, role, sortOrder } = req.body;
      
      if (!productId || !mediaId || !role) {
        return res.status(400).json({ message: "Missing required fields: productId, mediaId, role" });
      }

      // First, delete any existing product_media entry for this product and role
      await storage.deleteProductMediaByProductAndRole(productId, role);

      // Create new product_media entry
      const productMedia = await storage.createProductMedia({
        productId,
        mediaId,
        role: role as "primary" | "label" | "lifestyle" | "gallery",
        sortOrder: sortOrder || 0,
      });

      res.json({ success: true, productMedia });
    } catch (error) {
      console.error("Error associating product media:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Association failed" });
    }
  });

  app.delete("/api/admin/product-media/by-role", isAdmin, async (req, res) => {
    try {
      const { productId, role } = req.query;
      
      if (!productId || !role) {
        return res.status(400).json({ message: "Missing required query parameters: productId, role" });
      }

      const success = await storage.deleteProductMediaByProductAndRole(productId as string, role as string);
      res.json({ success });
    } catch (error) {
      console.error("Error deleting product media by role:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Deletion failed" });
    }
  });

  // Videos Management
  app.get("/api/videos", async (req, res) => {
    const activeOnly = req.query.activeOnly === 'true';
    const videos = await storage.getVideos(activeOnly);
    res.json(videos);
  });

  app.get("/api/videos/:id", async (req, res) => {
    const video = await storage.getVideo(req.params.id);
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }
    res.json(video);
  });

  app.post("/api/videos", async (req, res) => {
    try {
      const data = insertVideoSchema.parse(req.body);
      const video = await storage.createVideo(data);
      res.json(video);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.patch("/api/videos/:id", async (req, res) => {
    try {
      const video = await storage.updateVideo(req.params.id, req.body);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      res.json(video);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.delete("/api/videos/:id", async (req, res) => {
    const success = await storage.deleteVideo(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Video not found" });
    }
    res.json({ success: true });
  });

  app.post("/api/videos/reorder", async (req, res) => {
    try {
      await storage.updateVideoOrder(req.body.updates);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  // Commercials Management
  app.get("/api/commercials", async (req, res) => {
    const activeOnly = req.query.activeOnly === 'true';
    const commercials = await storage.getCommercials(activeOnly);
    res.json(commercials);
  });

  app.get("/api/commercials/:id", async (req, res) => {
    const commercial = await storage.getCommercial(req.params.id);
    if (!commercial) {
      return res.status(404).json({ message: "Commercial not found" });
    }
    res.json(commercial);
  });

  app.post("/api/commercials", isAdmin, async (req, res) => {
    try {
      const data = insertCommercialSchema.parse(req.body);
      const commercial = await storage.createCommercial(data);
      res.json(commercial);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.patch("/api/commercials/:id", isAdmin, async (req, res) => {
    try {
      const commercial = await storage.updateCommercial(req.params.id, req.body);
      if (!commercial) {
        return res.status(404).json({ message: "Commercial not found" });
      }
      res.json(commercial);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.delete("/api/commercials/:id", isAdmin, async (req, res) => {
    const success = await storage.deleteCommercial(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Commercial not found" });
    }
    res.json({ success: true });
  });

  app.post("/api/commercials/reorder", isAdmin, async (req, res) => {
    try {
      await storage.updateCommercialOrder(req.body.updates);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  // Characteristics
  app.get("/api/characteristics", async (req, res) => {
    try {
      const query = req.query.q as string | undefined;
      const categoryParam = req.query.category as string | undefined;
      
      // Validate category parameter using shared enum
      const validCategories = categoryEnum.enumValues;
      if (categoryParam && !validCategories.includes(categoryParam as any)) {
        return res.status(400).json({ 
          message: `Invalid category. Must be one of: ${validCategories.join(', ')}` 
        });
      }
      
      const category = categoryParam || undefined;
      const characteristics = await storage.searchCharacteristics(query, category);
      res.json(characteristics);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch characteristics" });
    }
  });

  app.get("/api/products/:productId/characteristics", async (req, res) => {
    try {
      const characteristics = await storage.getProductCharacteristics(req.params.productId);
      res.json(characteristics);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch product characteristics" });
    }
  });

  app.post("/api/products/:productId/characteristics", isAdmin, async (req, res) => {
    try {
      const { characteristics } = req.body;
      if (!Array.isArray(characteristics)) {
        return res.status(400).json({ message: "characteristics must be an array of strings" });
      }
      const product = await storage.getProduct(req.params.productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      await storage.setProductCharacteristics(req.params.productId, characteristics, product.category);
      const updated = await storage.getProductCharacteristics(req.params.productId);
      res.json(updated);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update characteristics" });
    }
  });

  // User Management (Admin only)
  app.get("/api/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch users" });
    }
  });

  app.patch("/api/users/:id/role", isAdmin, async (req, res) => {
    try {
      const { role } = req.body;
      if (!role || !['viewer', 'admin'].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be viewer or admin" });
      }
      const user = await storage.updateUserRole(req.params.id, role as 'viewer' | 'admin');
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update user role" });
    }
  });

  // Whitelist Management (Admin only)
  app.get("/api/whitelist", isAdmin, async (req, res) => {
    try {
      const whitelistedEmails = await storage.getAllWhitelistedEmails();
      res.json(whitelistedEmails);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch whitelist" });
    }
  });

  app.post("/api/whitelist", isAdmin, async (req, res) => {
    try {
      const { email, role } = req.body;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Valid email is required" });
      }
      
      if (!role || !['viewer', 'admin'].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be viewer or admin" });
      }
      
      const whitelisted = await storage.addWhitelistedEmail({ email, role });
      res.json(whitelisted);
    } catch (error) {
      if (error instanceof Error && error.message.includes('unique')) {
        return res.status(409).json({ message: "Email is already whitelisted" });
      }
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to add email to whitelist" });
    }
  });

  app.delete("/api/whitelist/:id", isAdmin, async (req, res) => {
    try {
      const success = await storage.deleteWhitelistedEmail(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Email not found in whitelist" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to remove email from whitelist" });
    }
  });

  // Object Storage Management (Admin only)
  app.get("/api/admin/object-storage/files", isAdmin, async (req, res) => {
    try {
      const prefix = (req.query.prefix as string) || 'public/';
      const objectStorageService = new ObjectStorageService();
      const publicPaths = objectStorageService.getPublicObjectSearchPaths();
      
      if (publicPaths.length === 0) {
        return res.json({ files: [], bucketName: null });
      }

      const firstPath = publicPaths[0];
      const { bucketName, objectName: basePath } = parseObjectPath(firstPath);
      const bucket = objectStorageClient.bucket(bucketName);
      
      const fullPrefix = prefix.startsWith(basePath) ? prefix : `${basePath}/${prefix}`;
      const [files] = await bucket.getFiles({ prefix: fullPrefix });
      
      const fileList = await Promise.all(
        files.map(async (file) => {
          const [metadata] = await file.getMetadata();
          
          // Use proxy URL instead of signed URL
          const publicUrl = `/api/admin/object-storage/proxy/${encodeURIComponent(bucketName)}/${encodeURIComponent(file.name)}`;
          
          return {
            name: file.name,
            size: parseInt(metadata.size || '0'),
            contentType: metadata.contentType || 'application/octet-stream',
            updated: metadata.updated,
            publicUrl,
          };
        })
      );

      res.json({ files: fileList, bucketName });
    } catch (error) {
      console.error('Error listing files:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to list files" });
    }
  });

  app.post("/api/admin/object-storage/upload", isAdmin, async (req, res) => {
    try {
      const { filename, folder } = req.body;
      
      if (!filename) {
        return res.status(400).json({ message: "Filename is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const publicPaths = objectStorageService.getPublicObjectSearchPaths();
      const publicObjectDir = publicPaths[0];
      
      const targetFolder = folder || 'products';
      const objectId = randomUUID();
      const fileExtension = filename.split('.').pop();
      const fullPath = `${publicObjectDir}/${targetFolder}/${objectId}.${fileExtension}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);

      const signedUrl = await signObjectURL({
        bucketName,
        objectName,
        method: "PUT",
        ttlSec: 900,
      });

      const publicUrl = `https://storage.googleapis.com/${bucketName}/${objectName}`;

      res.json({ 
        signedUrl, 
        publicUrl,
        objectPath: objectName,
      });
    } catch (error) {
      console.error('Error generating upload URL:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to generate upload URL" });
    }
  });

  app.get("/api/admin/object-storage/proxy/:bucketName/:objectPath(*)", isAdmin, async (req, res) => {
    try {
      const { bucketName, objectPath } = req.params;
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(decodeURIComponent(objectPath));
      
      const [metadata] = await file.getMetadata();
      const [fileContents] = await file.download();
      
      res.setHeader('Content-Type', metadata.contentType || 'application/octet-stream');
      res.setHeader('Content-Length', metadata.size);
      res.send(fileContents);
    } catch (error) {
      console.error('Error serving file:', error);
      res.status(404).json({ message: 'File not found' });
    }
  });

  app.delete("/api/admin/object-storage/files/:bucketName/:objectPath(*)", isAdmin, async (req, res) => {
    try {
      const { bucketName, objectPath } = req.params;
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectPath);
      
      await file.delete();
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to delete file" });
    }
  });

  // Improvement Notes API
  app.get("/api/admin/improvement-notes", isAdmin, async (req, res) => {
    try {
      const { appType, status } = req.query;
      const notes = await storage.getImprovementNotes(appType as string | undefined, status as string | undefined);
      res.json(notes);
    } catch (error) {
      console.error('Error fetching notes:', error);
      res.status(500).json({ message: 'Failed to fetch notes' });
    }
  });

  app.post("/api/admin/improvement-notes", isAdmin, async (req, res) => {
    try {
      const { title, description, pageReference, appType, priority } = req.body;
      const nextNumber = await storage.getNextNoteNumber();
      
      const note = await storage.createImprovementNote({
        noteNumber: nextNumber,
        title,
        description,
        pageReference,
        appType,
        priority: priority || 'medium',
        createdBy: (req as any).user?.claims?.sub || 'unknown',
      });
      
      res.json(note);
    } catch (error) {
      console.error('Error creating note:', error);
      res.status(500).json({ message: 'Failed to create note' });
    }
  });

  app.patch("/api/admin/improvement-notes/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, pageReference, priority } = req.body;
      
      const note = await storage.updateImprovementNote(id, {
        title,
        description,
        pageReference,
        priority,
      });
      
      if (!note) {
        return res.status(404).json({ message: 'Note not found' });
      }
      
      res.json(note);
    } catch (error) {
      console.error('Error updating note:', error);
      res.status(500).json({ message: 'Failed to update note' });
    }
  });

  app.patch("/api/admin/improvement-notes/:id/complete", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const note = await storage.markNoteComplete(id);
      
      if (!note) {
        return res.status(404).json({ message: 'Note not found' });
      }
      
      res.json(note);
    } catch (error) {
      console.error('Error completing note:', error);
      res.status(500).json({ message: 'Failed to complete note' });
    }
  });

  app.delete("/api/admin/improvement-notes/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteImprovementNote(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Note not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting note:', error);
      res.status(500).json({ message: 'Failed to delete note' });
    }
  });

  // =====================================================
  // PLATFORM MODULE MANAGEMENT ROUTES
  // =====================================================

  // Get all platform modules
  app.get('/api/platform/modules', async (req, res) => {
    try {
      const modules = await db.execute(sql`
        SELECT 
          id,
          module_key as "moduleKey",
          module_name as "moduleName",
          description,
          icon,
          color,
          route_prefix as "routePrefix",
          status,
          sort_order as "sortOrder",
          launch_date as "launchDate"
        FROM platform_modules
        ORDER BY sort_order ASC
      `);
      res.json(modules.rows);
    } catch (error) {
      console.error('Error fetching platform modules:', error);
      res.status(500).json({ message: 'Failed to fetch modules' });
    }
  });

  // Get platform KPIs (cross-module metrics)
  app.get('/api/platform/kpis', async (req, res) => {
    try {
      // Get total guest sessions (today)
      const guestResult = await db.execute(sql`
        SELECT COUNT(*)::integer as count 
        FROM guest_sessions
        WHERE DATE(created_at) = CURRENT_DATE
      `);
      const totalGuests = Number(guestResult.rows[0]?.count || 0);

      // Get today's orders (tasting app orders from carts that are checked out)
      const ordersResult = await db.execute(sql`
        SELECT COUNT(DISTINCT session_id)::integer as count 
        FROM cart_items
        WHERE DATE(created_at) = CURRENT_DATE
      `);
      const todayOrders = Number(ordersResult.rows[0]?.count || 0);

      // Get active products count (available and in stock)
      const productsResult = await db.execute(sql`
        SELECT COUNT(*)::integer as count 
        FROM products
        WHERE available = true AND stock_quantity > 0
      `);
      const activeProducts = Number(productsResult.rows[0]?.count || 0);

      // Get B2B customers count (active ones)
      const b2bResult = await db.execute(sql`
        SELECT COUNT(*)::integer as count 
        FROM b2b_customers
        WHERE account_status = 'active'
      `);
      const b2bCustomers = Number(b2bResult.rows[0]?.count || 0);

      // Get pending approvals (B2B customers awaiting approval)
      const pendingResult = await db.execute(sql`
        SELECT COUNT(*)::integer as count 
        FROM b2b_customers
        WHERE account_status = 'pending_approval'
      `);
      const pendingApprovals = Number(pendingResult.rows[0]?.count || 0);

      // Get recent activity (24h - sessions and cart items)
      const activityResult = await db.execute(sql`
        SELECT 
          (
            (SELECT COUNT(*) FROM guest_sessions WHERE created_at > NOW() - INTERVAL '24 hours') +
            (SELECT COUNT(*) FROM cart_items WHERE created_at > NOW() - INTERVAL '24 hours')
          )::integer as count
      `);
      const recentActivity = Number(activityResult.rows[0]?.count || 0);

      res.json({
        totalGuests,
        todayOrders,
        activeProducts,
        b2bCustomers,
        pendingApprovals,
        recentActivity,
      });
    } catch (error) {
      console.error('Error fetching platform KPIs:', error);
      res.status(500).json({ message: 'Failed to fetch KPIs' });
    }
  });

  // =====================================================
  // LMS (LEARNING MANAGEMENT SYSTEM) ROUTES
  // =====================================================

  // --- LMS Categories ---
  app.get('/api/lms/categories', async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT * FROM lms_categories 
        WHERE active = true
        ORDER BY sort_order ASC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching LMS categories:', error);
      res.status(500).json({ message: 'Failed to fetch categories' });
    }
  });

  app.get('/api/lms/admin/categories', isAdmin, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT * FROM lms_categories 
        ORDER BY sort_order ASC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching LMS categories:', error);
      res.status(500).json({ message: 'Failed to fetch categories' });
    }
  });

  app.post('/api/lms/admin/categories', isAdmin, async (req, res) => {
    try {
      const { name, description, icon, color, sortOrder } = req.body;
      const result = await db.execute(sql`
        INSERT INTO lms_categories (name, description, icon, color, sort_order)
        VALUES (${name}, ${description}, ${icon}, ${color}, ${sortOrder || 0})
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error creating LMS category:', error);
      res.status(500).json({ message: 'Failed to create category' });
    }
  });

  app.put('/api/lms/admin/categories/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, icon, color, sortOrder, active } = req.body;
      const result = await db.execute(sql`
        UPDATE lms_categories 
        SET name = ${name}, description = ${description}, icon = ${icon}, 
            color = ${color}, sort_order = ${sortOrder || 0}, active = ${active ?? true},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating LMS category:', error);
      res.status(500).json({ message: 'Failed to update category' });
    }
  });

  app.delete('/api/lms/admin/categories/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await db.execute(sql`DELETE FROM lms_categories WHERE id = ${id}`);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting LMS category:', error);
      res.status(500).json({ message: 'Failed to delete category' });
    }
  });

  // --- LMS Courses ---
  app.get('/api/lms/courses', async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT c.*, cat.name as category_name, cat.icon as category_icon, cat.color as category_color,
               (SELECT COUNT(*) FROM lms_lessons WHERE course_id = c.id AND active = true) as lesson_count,
               (SELECT COUNT(*) FROM lms_quiz_questions WHERE course_id = c.id AND active = true) as question_count
        FROM lms_courses c
        LEFT JOIN lms_categories cat ON c.category_id = cat.id
        WHERE c.status = 'published'
        ORDER BY c.sort_order ASC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching LMS courses:', error);
      res.status(500).json({ message: 'Failed to fetch courses' });
    }
  });

  app.get('/api/lms/admin/courses', isAdmin, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT c.*, cat.name as category_name, cat.icon as category_icon, cat.color as category_color,
               (SELECT COUNT(*) FROM lms_lessons WHERE course_id = c.id) as lesson_count,
               (SELECT COUNT(*) FROM lms_quiz_questions WHERE course_id = c.id) as question_count,
               (SELECT COUNT(*) FROM lms_enrollments WHERE course_id = c.id) as enrollment_count
        FROM lms_courses c
        LEFT JOIN lms_categories cat ON c.category_id = cat.id
        ORDER BY c.sort_order ASC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching LMS courses:', error);
      res.status(500).json({ message: 'Failed to fetch courses' });
    }
  });

  app.get('/api/lms/courses/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const courseResult = await db.execute(sql`
        SELECT c.*, cat.name as category_name, cat.icon as category_icon
        FROM lms_courses c
        LEFT JOIN lms_categories cat ON c.category_id = cat.id
        WHERE c.id = ${id}
      `);
      if (courseResult.rows.length === 0) {
        return res.status(404).json({ message: 'Course not found' });
      }
      
      const lessonsResult = await db.execute(sql`
        SELECT * FROM lms_lessons WHERE course_id = ${id} AND active = true ORDER BY sort_order ASC
      `);
      
      const quizResult = await db.execute(sql`
        SELECT * FROM lms_quiz_questions WHERE course_id = ${id} AND active = true ORDER BY sort_order ASC
      `);

      res.json({
        ...courseResult.rows[0],
        lessons: lessonsResult.rows,
        quizQuestions: quizResult.rows
      });
    } catch (error) {
      console.error('Error fetching LMS course:', error);
      res.status(500).json({ message: 'Failed to fetch course' });
    }
  });

  app.post('/api/lms/admin/courses', isAdmin, async (req, res) => {
    try {
      const { title, description, thumbnailUrl, categoryId, difficulty, estimatedMinutes, 
              requiredForRoles, prerequisiteCourseIds, passingScore, certificateEnabled, sortOrder } = req.body;
      const result = await db.execute(sql`
        INSERT INTO lms_courses (
          title, description, thumbnail_url, category_id, difficulty, estimated_minutes,
          required_for_roles, prerequisite_course_ids, passing_score, certificate_enabled, sort_order
        )
        VALUES (
          ${title}, ${description}, ${thumbnailUrl}, ${categoryId}, ${difficulty || 'beginner'}, 
          ${estimatedMinutes || 15}, ${requiredForRoles || null}, ${prerequisiteCourseIds || null},
          ${passingScore || 80}, ${certificateEnabled ?? false}, ${sortOrder || 0}
        )
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error creating LMS course:', error);
      res.status(500).json({ message: 'Failed to create course' });
    }
  });

  app.put('/api/lms/admin/courses/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, thumbnailUrl, categoryId, status, difficulty, estimatedMinutes,
              requiredForRoles, prerequisiteCourseIds, passingScore, certificateEnabled, sortOrder } = req.body;
      
      let publishedAt = null;
      if (status === 'published') {
        const existingCourse = await db.execute(sql`SELECT published_at FROM lms_courses WHERE id = ${id}`);
        publishedAt = existingCourse.rows[0]?.published_at || new Date().toISOString();
      }
      
      const result = await db.execute(sql`
        UPDATE lms_courses SET
          title = ${title}, description = ${description}, thumbnail_url = ${thumbnailUrl},
          category_id = ${categoryId}, status = ${status || 'draft'}, difficulty = ${difficulty || 'beginner'},
          estimated_minutes = ${estimatedMinutes || 15}, required_for_roles = ${requiredForRoles || null},
          prerequisite_course_ids = ${prerequisiteCourseIds || null}, passing_score = ${passingScore || 80},
          certificate_enabled = ${certificateEnabled ?? false}, sort_order = ${sortOrder || 0},
          published_at = ${publishedAt}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating LMS course:', error);
      res.status(500).json({ message: 'Failed to update course' });
    }
  });

  app.delete('/api/lms/admin/courses/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await db.execute(sql`DELETE FROM lms_courses WHERE id = ${id}`);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting LMS course:', error);
      res.status(500).json({ message: 'Failed to delete course' });
    }
  });

  // --- LMS Lessons ---
  app.get('/api/lms/courses/:courseId/lessons', async (req, res) => {
    try {
      const { courseId } = req.params;
      const result = await db.execute(sql`
        SELECT * FROM lms_lessons WHERE course_id = ${courseId} AND active = true ORDER BY sort_order ASC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching LMS lessons:', error);
      res.status(500).json({ message: 'Failed to fetch lessons' });
    }
  });

  app.post('/api/lms/admin/courses/:courseId/lessons', isAdmin, async (req, res) => {
    try {
      const { courseId } = req.params;
      const { title, description, lessonType, content, videoUrl, documentUrl, estimatedMinutes, sortOrder } = req.body;
      const result = await db.execute(sql`
        INSERT INTO lms_lessons (course_id, title, description, lesson_type, content, video_url, document_url, estimated_minutes, sort_order)
        VALUES (${courseId}, ${title}, ${description}, ${lessonType || 'text'}, ${content}, ${videoUrl}, ${documentUrl}, ${estimatedMinutes || 5}, ${sortOrder || 0})
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error creating LMS lesson:', error);
      res.status(500).json({ message: 'Failed to create lesson' });
    }
  });

  app.put('/api/lms/admin/lessons/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, lessonType, content, videoUrl, documentUrl, estimatedMinutes, sortOrder, active } = req.body;
      const result = await db.execute(sql`
        UPDATE lms_lessons SET
          title = ${title}, description = ${description}, lesson_type = ${lessonType || 'text'},
          content = ${content}, video_url = ${videoUrl}, document_url = ${documentUrl},
          estimated_minutes = ${estimatedMinutes || 5}, sort_order = ${sortOrder || 0},
          active = ${active ?? true}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating LMS lesson:', error);
      res.status(500).json({ message: 'Failed to update lesson' });
    }
  });

  app.delete('/api/lms/admin/lessons/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await db.execute(sql`DELETE FROM lms_lessons WHERE id = ${id}`);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting LMS lesson:', error);
      res.status(500).json({ message: 'Failed to delete lesson' });
    }
  });

  // --- LMS Quiz Questions ---
  app.get('/api/lms/courses/:courseId/quiz', async (req, res) => {
    try {
      const { courseId } = req.params;
      const result = await db.execute(sql`
        SELECT * FROM lms_quiz_questions WHERE course_id = ${courseId} AND active = true ORDER BY sort_order ASC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching LMS quiz questions:', error);
      res.status(500).json({ message: 'Failed to fetch quiz questions' });
    }
  });

  app.post('/api/lms/admin/courses/:courseId/quiz', isAdmin, async (req, res) => {
    try {
      const { courseId } = req.params;
      const { lessonId, question, questionType, options, explanation, points, sortOrder } = req.body;
      const result = await db.execute(sql`
        INSERT INTO lms_quiz_questions (course_id, lesson_id, question, question_type, options, explanation, points, sort_order)
        VALUES (${courseId}, ${lessonId || null}, ${question}, ${questionType || 'multiple_choice'}, 
                ${JSON.stringify(options)}, ${explanation}, ${points || 1}, ${sortOrder || 0})
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error creating LMS quiz question:', error);
      res.status(500).json({ message: 'Failed to create quiz question' });
    }
  });

  app.put('/api/lms/admin/quiz/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { lessonId, question, questionType, options, explanation, points, sortOrder, active } = req.body;
      const result = await db.execute(sql`
        UPDATE lms_quiz_questions SET
          lesson_id = ${lessonId || null}, question = ${question}, question_type = ${questionType || 'multiple_choice'},
          options = ${JSON.stringify(options)}, explanation = ${explanation}, points = ${points || 1},
          sort_order = ${sortOrder || 0}, active = ${active ?? true}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating LMS quiz question:', error);
      res.status(500).json({ message: 'Failed to update quiz question' });
    }
  });

  app.delete('/api/lms/admin/quiz/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await db.execute(sql`DELETE FROM lms_quiz_questions WHERE id = ${id}`);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting LMS quiz question:', error);
      res.status(500).json({ message: 'Failed to delete quiz question' });
    }
  });

  // --- LMS Enrollments ---
  app.get('/api/lms/enrollments', isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user?.claims?.email;
      if (!userEmail) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      // Get platform user by email
      const userResult = await db.execute(sql`
        SELECT id FROM platform_users WHERE email = ${userEmail}
      `);
      if (userResult.rows.length === 0) {
        return res.json([]);
      }
      const userId = userResult.rows[0].id;
      
      const result = await db.execute(sql`
        SELECT e.*, c.title as course_title, c.thumbnail_url as course_thumbnail,
               c.estimated_minutes as course_minutes, c.difficulty as course_difficulty,
               cat.name as category_name, cat.icon as category_icon,
               (SELECT COUNT(*) FROM lms_lessons WHERE course_id = c.id AND active = true) as total_lessons,
               (SELECT COUNT(*) FROM lms_lesson_progress lp 
                WHERE lp.enrollment_id = e.id AND lp.completed = true) as completed_lessons
        FROM lms_enrollments e
        JOIN lms_courses c ON e.course_id = c.id
        LEFT JOIN lms_categories cat ON c.category_id = cat.id
        WHERE e.user_id = ${userId}
        ORDER BY e.enrolled_at DESC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching LMS enrollments:', error);
      res.status(500).json({ message: 'Failed to fetch enrollments' });
    }
  });

  app.post('/api/lms/enroll/:courseId', isAuthenticated, async (req: any, res) => {
    try {
      const { courseId } = req.params;
      const userEmail = req.user?.claims?.email;
      
      if (!userEmail) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      // Get or create platform user
      let userResult = await db.execute(sql`
        SELECT id FROM platform_users WHERE email = ${userEmail}
      `);
      
      let userId;
      if (userResult.rows.length === 0) {
        // Create platform user from Replit auth
        const firstName = req.user?.claims?.first_name || 'User';
        const lastName = req.user?.claims?.last_name || '';
        const newUser = await db.execute(sql`
          INSERT INTO platform_users (email, first_name, last_name, global_role)
          VALUES (${userEmail}, ${firstName}, ${lastName}, 'staff')
          RETURNING id
        `);
        userId = newUser.rows[0].id;
      } else {
        userId = userResult.rows[0].id;
      }
      
      // Check if already enrolled
      const existingEnrollment = await db.execute(sql`
        SELECT id FROM lms_enrollments WHERE user_id = ${userId} AND course_id = ${courseId}
      `);
      if (existingEnrollment.rows.length > 0) {
        return res.status(400).json({ message: 'Already enrolled in this course' });
      }
      
      const result = await db.execute(sql`
        INSERT INTO lms_enrollments (user_id, course_id, status)
        VALUES (${userId}, ${courseId}, 'enrolled')
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error enrolling in LMS course:', error);
      res.status(500).json({ message: 'Failed to enroll in course' });
    }
  });

  // --- LMS Progress Tracking ---
  app.get('/api/lms/enrollments/:enrollmentId/progress', isAuthenticated, async (req: any, res) => {
    try {
      const { enrollmentId } = req.params;
      
      const result = await db.execute(sql`
        SELECT lp.*, l.title as lesson_title, l.lesson_type, l.estimated_minutes
        FROM lms_lesson_progress lp
        JOIN lms_lessons l ON lp.lesson_id = l.id
        WHERE lp.enrollment_id = ${enrollmentId}
        ORDER BY l.sort_order ASC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching LMS progress:', error);
      res.status(500).json({ message: 'Failed to fetch progress' });
    }
  });

  app.post('/api/lms/progress', isAuthenticated, async (req: any, res) => {
    try {
      const { enrollmentId, lessonId, completed, timeSpentSeconds, videoProgress } = req.body;
      const userEmail = req.user?.claims?.email;
      
      if (!userEmail) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      // Get user ID
      const userResult = await db.execute(sql`
        SELECT id FROM platform_users WHERE email = ${userEmail}
      `);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      const userId = userResult.rows[0].id;
      
      // Upsert progress
      const result = await db.execute(sql`
        INSERT INTO lms_lesson_progress (user_id, lesson_id, enrollment_id, completed, time_spent_seconds, video_progress, completed_at)
        VALUES (${userId}, ${lessonId}, ${enrollmentId}, ${completed ?? false}, ${timeSpentSeconds || 0}, ${videoProgress || null},
                ${completed ? new Date().toISOString() : null})
        ON CONFLICT (user_id, lesson_id) DO UPDATE SET
          completed = ${completed ?? false},
          time_spent_seconds = lms_lesson_progress.time_spent_seconds + ${timeSpentSeconds || 0},
          video_progress = COALESCE(${videoProgress}, lms_lesson_progress.video_progress),
          completed_at = CASE WHEN ${completed} THEN NOW() ELSE lms_lesson_progress.completed_at END
        RETURNING *
      `);
      
      // Update enrollment status if started
      if (!completed) {
        await db.execute(sql`
          UPDATE lms_enrollments SET status = 'in_progress', started_at = COALESCE(started_at, NOW())
          WHERE id = ${enrollmentId} AND status = 'enrolled'
        `);
      }
      
      // Check if all lessons completed
      if (completed) {
        const completionCheck = await db.execute(sql`
          SELECT 
            (SELECT COUNT(*) FROM lms_lessons WHERE course_id = e.course_id AND active = true) as total,
            (SELECT COUNT(*) FROM lms_lesson_progress lp 
             JOIN lms_lessons l ON lp.lesson_id = l.id 
             WHERE lp.enrollment_id = ${enrollmentId} AND lp.completed = true AND l.active = true) as completed
          FROM lms_enrollments e WHERE e.id = ${enrollmentId}
        `);
        
        if (completionCheck.rows[0]?.total === completionCheck.rows[0]?.completed) {
          await db.execute(sql`
            UPDATE lms_enrollments SET status = 'completed', completed_at = NOW()
            WHERE id = ${enrollmentId}
          `);
        }
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating LMS progress:', error);
      res.status(500).json({ message: 'Failed to update progress' });
    }
  });

  // --- LMS Quiz Attempts ---
  app.post('/api/lms/quiz/submit', isAuthenticated, async (req: any, res) => {
    try {
      const { enrollmentId, courseId, answers } = req.body;
      const userEmail = req.user?.claims?.email;
      
      if (!userEmail) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      // Get user ID
      const userResult = await db.execute(sql`
        SELECT id FROM platform_users WHERE email = ${userEmail}
      `);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      const userId = userResult.rows[0].id;
      
      // Get quiz questions for scoring
      const questionsResult = await db.execute(sql`
        SELECT id, options, points FROM lms_quiz_questions WHERE course_id = ${courseId} AND active = true
      `);
      
      let score = 0;
      let maxScore = 0;
      const gradedAnswers = answers.map((answer: any) => {
        const question = questionsResult.rows.find((q: any) => q.id === answer.questionId);
        if (!question) return { ...answer, correct: false, pointsEarned: 0 };
        
        const options = question.options as any[];
        maxScore += question.points;
        
        const correctOptionIds = options.filter((o: any) => o.isCorrect).map((o: any) => o.id);
        const isCorrect = JSON.stringify(answer.selectedOptionIds?.sort()) === JSON.stringify(correctOptionIds.sort());
        
        if (isCorrect) score += question.points;
        
        return { ...answer, correct: isCorrect, pointsEarned: isCorrect ? question.points : 0 };
      });
      
      // Get course passing score
      const courseResult = await db.execute(sql`
        SELECT passing_score FROM lms_courses WHERE id = ${courseId}
      `);
      const passingScore = courseResult.rows[0]?.passing_score || 80;
      const scorePercent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
      const passed = scorePercent >= passingScore;
      
      // Get attempt number
      const attemptCountResult = await db.execute(sql`
        SELECT COUNT(*)::integer as count FROM lms_quiz_attempts WHERE enrollment_id = ${enrollmentId}
      `);
      const attemptNumber = (attemptCountResult.rows[0]?.count || 0) + 1;
      
      // Save attempt
      const result = await db.execute(sql`
        INSERT INTO lms_quiz_attempts (user_id, course_id, enrollment_id, attempt_number, score, max_score, passed, answers, completed_at)
        VALUES (${userId}, ${courseId}, ${enrollmentId}, ${attemptNumber}, ${score}, ${maxScore}, ${passed}, ${JSON.stringify(gradedAnswers)}, NOW())
        RETURNING *
      `);
      
      // Update enrollment final score if passed
      if (passed) {
        await db.execute(sql`
          UPDATE lms_enrollments SET final_score = ${scorePercent}, status = 'completed', completed_at = NOW()
          WHERE id = ${enrollmentId}
        `);
      }
      
      res.json({
        ...result.rows[0],
        scorePercent,
        passed,
        passingScore
      });
    } catch (error) {
      console.error('Error submitting LMS quiz:', error);
      res.status(500).json({ message: 'Failed to submit quiz' });
    }
  });

  // --- LMS Admin Stats ---
  app.get('/api/lms/admin/stats', isAdmin, async (req, res) => {
    try {
      const stats = await db.execute(sql`
        SELECT 
          (SELECT COUNT(*)::integer FROM lms_courses WHERE status = 'published') as published_courses,
          (SELECT COUNT(*)::integer FROM lms_courses WHERE status = 'draft') as draft_courses,
          (SELECT COUNT(*)::integer FROM lms_enrollments) as total_enrollments,
          (SELECT COUNT(*)::integer FROM lms_enrollments WHERE status = 'completed') as completed_enrollments,
          (SELECT COUNT(*)::integer FROM lms_enrollments WHERE status = 'in_progress') as in_progress_enrollments,
          (SELECT COUNT(*)::integer FROM lms_quiz_attempts WHERE passed = true) as passed_quizzes,
          (SELECT COUNT(*)::integer FROM lms_certificates) as certificates_issued
      `);
      res.json(stats.rows[0]);
    } catch (error) {
      console.error('Error fetching LMS stats:', error);
      res.status(500).json({ message: 'Failed to fetch stats' });
    }
  });

  // --- LMS Admin Enrollments Management ---
  app.get('/api/lms/admin/enrollments', isAdmin, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT e.*, 
               c.title as course_title,
               pu.email as user_email, pu.first_name, pu.last_name,
               (SELECT COUNT(*) FROM lms_lessons WHERE course_id = c.id AND active = true) as total_lessons,
               (SELECT COUNT(*) FROM lms_lesson_progress lp WHERE lp.enrollment_id = e.id AND lp.completed = true) as completed_lessons
        FROM lms_enrollments e
        JOIN lms_courses c ON e.course_id = c.id
        JOIN platform_users pu ON e.user_id = pu.id
        ORDER BY e.enrolled_at DESC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching LMS enrollments:', error);
      res.status(500).json({ message: 'Failed to fetch enrollments' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (path.startsWith("https://storage.googleapis.com/")) {
    const url = new URL(path);
    const pathnameParts = url.pathname.split("/").filter(p => p);
    if (pathnameParts.length < 2) {
      throw new Error("Invalid storage URL: must contain bucket and object name");
    }
    return {
      bucketName: pathnameParts[0],
      objectName: pathnameParts.slice(1).join("/"),
    };
  }
  
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`
    );
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}
