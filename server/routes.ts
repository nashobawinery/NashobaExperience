import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import { db } from "./db";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
import { ObjectStorageService, objectStorageClient } from "./objectStorage";
import b2bRouter from "./b2b-routes";
import { z } from "zod";
import { eq } from "drizzle-orm";
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

  app.get("/api/admin/data/export-all", async (req, res) => {
    try {
      const [products, filterOptions, triviaQuestions, slideshowImages, mediaLibrary, whitelistedEmails, commercials, videos, triviaAchievements, tierPricing, salesReps, b2bCustomers, b2bSlideshowSlides, b2bAdmins, b2bSettings] = await Promise.all([
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
      ]);

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
        b2bOrders,
        b2bOrderItems,
        b2bSlideshowSlides,
        b2bAdmins,
        b2bSettings,
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
        b2bOrders: { success: 0, failed: 0 },
        b2bOrderItems: { success: 0, failed: 0 },
        b2bSlideshowSlides: { success: 0, failed: 0 },
        b2bAdmins: { success: 0, failed: 0 },
        b2bSettings: { success: 0, failed: 0 },
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
      const salesRepEmailToId = new Map<string, string>();
      const bcrypt = require('bcrypt');
      const SALT_ROUNDS = 10;
      
      for (const rep of parseResult.salesReps) {
        try {
          // Generate password for sales reps (passwords not exported for security)
          const defaultPassword = rep.firstName.charAt(0).toLowerCase() + rep.lastName.toLowerCase() + '123';
          const passwordHash = await bcrypt.hash(defaultPassword, SALT_ROUNDS);
          
          const repData: any = {
            email: rep.email,
            firstName: rep.firstName,
            lastName: rep.lastName,
            phoneNumber: rep.phoneNumber || null,
            active: rep.active !== undefined ? rep.active : true,
            passwordHash: passwordHash,
          };
          
          console.error('DEBUG: Importing rep', rep.email, 'with hash length:', passwordHash?.length, 'repData keys:', Object.keys(repData));
          
          const { salesRep: upserted } = await storage.upsertSalesRep(repData);
          salesRepEmailToId.set(rep.email.toLowerCase().trim(), upserted.id);
          results.salesReps.success++;
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
          
          // Skip new customers without passwords (passwords are not exported)
          if (!existingCustomer && (!customer.passwordHash || !customer.passwordHash.trim())) {
            results.warnings.push(`B2B Customer "${customer.emailAddress}": Skipped (new record without password - passwords are not exported for security)`);
            continue;
          }
          
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

      // 5. Import B2B slideshow slides (independent - no FK dependencies)
      for (const slide of parseResult.b2bSlideshowSlides) {
        try {
          await storage.upsertB2bSlideshowSlide(slide);
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
          await storage.setB2bSetting(setting.settingKey, setting.settingValue);
          results.b2bSettings.success++;
        } catch (error) {
          results.b2bSettings.failed++;
          results.errors.push(`B2B Setting "${setting.settingKey}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      const totalSuccess = results.products.success + results.filterOptions.success + 
        results.triviaQuestions.success + results.slideshowImages.success + results.appSettings.success + 
        results.mediaLibrary.success + results.whitelistedEmails.success + results.commercials.success + 
        results.videos.success + results.triviaAchievements.success + results.tierPricing.success + 
        results.salesReps.success + results.b2bCustomers.success + results.b2bOrders.success + results.b2bOrderItems.success +
        results.b2bSlideshowSlides.success + results.b2bAdmins.success + results.b2bSettings.success;
      const totalFailed = results.products.failed + results.filterOptions.failed + 
        results.triviaQuestions.failed + results.slideshowImages.failed + results.appSettings.failed + 
        results.mediaLibrary.failed + results.whitelistedEmails.failed + results.commercials.failed + 
        results.videos.failed + results.triviaAchievements.failed + results.tierPricing.failed + 
        results.salesReps.failed + results.b2bCustomers.failed + results.b2bOrders.failed + results.b2bOrderItems.failed +
        results.b2bSlideshowSlides.failed + results.b2bAdmins.failed + results.b2bSettings.failed;

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
