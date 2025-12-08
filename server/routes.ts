import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import { db } from "./db";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
import { encryptPassword, decryptPassword } from "./crypto";
import { ObjectStorageService, objectStorageClient } from "./objectStorage";
import b2bRouter from "./b2b-routes";
import resyRouter from "./resy-routes";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import { 
  getUserPermissions, 
  isGlobalAdmin,
  hasModuleAccess,
  hasFeaturePermission,
  requireModuleAccess as rbacRequireModule,
  requireFeaturePermission as rbacRequireFeature,
  seedPlatformModules,
  seedUserGroups,
  type UserPermissions,
  type PermissionLevel
} from "./rbac";
import { validateSyncRegistry, logSyncRegistryStatus } from "./syncRegistry";
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
  insertComplianceTaskSchema,
  complianceTasks,
  complianceTaskHistory,
  complianceReminders,
  complianceAttachments,
  insertDailyReportTemplateSchema,
  insertDailyProcedureTemplateSchema,
  insertDailyReportSchema,
  insertDailyReportEmailRecipientSchema,
  insertDailyReportIncidentSchema,
  insertDailyProcedureCompletionSchema,
  insertDailyReportFieldDefinitionSchema,
} from "@shared/schema";
import sgMail from "@sendgrid/mail";
import { generateWorkOrderNotificationEmail, sendEmail } from "./email";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for deployment verification (responds immediately)
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Mount B2B routes FIRST (before main session middleware) to ensure session isolation
  app.use(b2bRouter);

  // Setup authentication (provides /api/login, /api/logout, /api/callback routes)
  // This applies session middleware to all routes that follow
  await setupAuth(app);
  
  // Mount Reservation (resy) routes AFTER setupAuth so session middleware is applied
  app.use(resyRouter);

  // Seed platform modules and user groups (ensures production database has core data)
  await seedPlatformModules();
  await seedUserGroups();
  
  // Seed Daily Reports department templates
  await seedDailyReportTemplates();

  // Validate sync registry against schema tables
  // Note: syncRegistry uses short IDs (e.g., 'courses' instead of 'lmsCourses')
  const schemaTables = [
    'products', 'filterOptions', 'triviaQuestions', 'slideshowImages', 'appSettings',
    'mediaLibrary', 'whitelistedEmails', 'commercials', 'videos', 'triviaAchievements',
    'characteristics', 'productCharacteristics', 'productMedia',
    'tierPricing', 'salesReps', 'b2bCustomers', 'b2bCustomerLocations', 'b2bCustomerManualProducts',
    'b2bOrders', 'b2bOrderItems', 'b2bSlideshowSlides', 'b2bAdmins', 'b2bSettings',
    'courseCategories', 'courses', 'lessons', 'quizQuestions', 'certificates',
    'enrollments', 'lessonProgress', 'quizAttempts',
    'complianceTasks', 'complianceTaskHistory', 'complianceReminders', 'complianceAttachments',
    'userGroups', 'platformUsers', 'groupModuleAccess', 'groupFeaturePermissions', 'groupMemberships', 'moduleFeatures',
    'platformModules', 'sharedLocations', 'sharedEquipment', 'sharedDocuments',
    'dailyReportTemplates', 'dailyReportAccessCodes', 'dailyReports', 'dailyReportIncidents',
    'dailyProcedureTemplates', 'dailyProcedureCompletions', 'dailyReportEmailRecipients',
    'dailyReportFieldDefinitions', 'departmentFieldAssignments',
    // Excluded tables (session/transient) - these are intentionally excluded from sync
    'sessions', 'b2bSessions', 'guestSessions', 'passwordResetTokens', 'b2bPasswordResetTokens',
    'users', 'cartItems', 'cartDiscounts', 'favorites', 'viewHistory', 'triviaAttempts', 'triviaScores',
    'achievementRedemptions', 'surveys', 'improvementNotes', 'productNotes', 'platformAuditLog',
    'platformUserModuleAccess', 'userPermissionOverrides', 'b2bRolePermissions', 'b2bCommissions',
    'b2bEmailTemplates', 'b2bEmailAutomationLogs',
    // LMS table aliases (schema uses lms prefix, syncRegistry uses short names)
    'lmsCategories', 'lmsCourses', 'lmsLessons', 'lmsQuizQuestions', 'lmsCertificates',
    'lmsEnrollments', 'lmsLessonProgress', 'lmsQuizAttempts'
  ];
  const syncValidation = validateSyncRegistry(schemaTables);
  logSyncRegistryStatus(syncValidation);

  // Authentication routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Get RBAC permissions for the user
      const permissions = await getUserPermissions(req);
      
      // Return user with RBAC permissions
      res.json({
        ...user,
        rbac: permissions ? {
          groups: permissions.groups,
          moduleAccess: permissions.moduleAccess,
          featurePermissions: permissions.featurePermissions,
          isGlobalAdmin: isGlobalAdmin(permissions)
        } : null
      });
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

  // Sync Registry API - Returns metadata about all syncable tables
  app.get("/api/admin/sync/registry", isAdmin, async (req, res) => {
    try {
      const { getRegistryMetadata } = await import("./syncRegistry");
      const metadata = getRegistryMetadata();
      res.json(metadata);
    } catch (error) {
      console.error("Error fetching sync registry:", error);
      res.status(500).json({ message: "Failed to fetch sync registry" });
    }
  });

  // ============ BIDIRECTIONAL SYNC API ============
  
  // Test connection to production database
  app.post("/api/admin/sync/test-connection", isAdmin, async (req, res) => {
    try {
      const { prodDatabaseUrl } = req.body;
      
      if (!prodDatabaseUrl) {
        return res.status(400).json({ message: "Production database URL is required" });
      }
      
      const { connectToProductionDatabase } = await import("./bidirectionalSync");
      const connected = await connectToProductionDatabase(prodDatabaseUrl);
      
      if (connected) {
        res.json({ success: true, message: "Successfully connected to production database" });
      } else {
        res.status(400).json({ success: false, message: "Failed to connect to production database" });
      }
    } catch (error: any) {
      console.error("Error testing connection:", error);
      res.status(500).json({ message: error.message || "Connection test failed" });
    }
  });
  
  // Scan for differences between dev and prod (local dev scan only)
  app.get("/api/admin/sync/scan-dev", isAdmin, async (req, res) => {
    try {
      const tableIds = req.query.tableIds ? (req.query.tableIds as string).split(',') : undefined;
      
      const { scanForDifferences } = await import("./bidirectionalSync");
      const result = await scanForDifferences(tableIds);
      
      res.json(result);
    } catch (error: any) {
      console.error("Error scanning dev database:", error);
      res.status(500).json({ message: error.message || "Scan failed" });
    }
  });
  
  // Scan bidirectionally comparing dev and prod databases
  app.post("/api/admin/sync/scan-bidirectional", isAdmin, async (req, res) => {
    try {
      const { prodDatabaseUrl, tableIds } = req.body;
      
      console.log(`[Sync] Bidirectional scan requested with ${tableIds?.length || 'all'} tables`);
      if (tableIds) {
        console.log(`[Sync] Tables requested:`, tableIds.slice(0, 10), tableIds.length > 10 ? `... and ${tableIds.length - 10} more` : '');
      }
      
      if (!prodDatabaseUrl) {
        console.error('[Sync] Error: Production database URL is missing');
        return res.status(400).json({ message: "Production database URL is required" });
      }
      
      // Validate connection string format
      if (!prodDatabaseUrl.startsWith('postgres://') && !prodDatabaseUrl.startsWith('postgresql://')) {
        console.error('[Sync] Error: Invalid database URL format');
        return res.status(400).json({ message: "Invalid database URL format. Must start with postgres:// or postgresql://" });
      }
      
      console.log(`[Sync] Starting scan with prod URL (first 40 chars): ${prodDatabaseUrl.substring(0, 40)}...`);
      
      const { scanBidirectional } = await import("./bidirectionalSync");
      const result = await scanBidirectional({
        prodDatabaseUrl,
        direction: 'bidirectional',
        tableIds,
      });
      
      console.log(`[Sync] Scan complete: ${result.tables.length} tables scanned`);
      const tablesWithDiffs = result.tables.filter(t => t.devCount !== t.prodCount || t.records.length > 0);
      console.log(`[Sync] Tables with differences: ${tablesWithDiffs.length}`);
      
      res.json(result);
    } catch (error: any) {
      console.error("[Sync] Error scanning databases:", error.message);
      if (error.stack) {
        console.error("[Sync] Stack trace:", error.stack);
      }
      res.status(500).json({ message: error.message || "Bidirectional scan failed" });
    }
  });
  
  // Get table preview with comparison data
  app.get("/api/admin/sync/table-preview/:tableId", isAdmin, async (req, res) => {
    try {
      const { tableId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      
      const { getTablePreview } = await import("./bidirectionalSync");
      const result = await getTablePreview(tableId, limit);
      
      if (!result.tableConfig) {
        return res.status(404).json({ message: "Table not found in sync registry" });
      }
      
      res.json(result);
    } catch (error: any) {
      console.error("Error getting table preview:", error);
      res.status(500).json({ message: error.message || "Failed to get table preview" });
    }
  });
  
  // Get sync summary from a scan result
  app.post("/api/admin/sync/summary", isAdmin, async (req, res) => {
    try {
      const { scanResult } = req.body;
      
      if (!scanResult) {
        return res.status(400).json({ message: "Scan result is required" });
      }
      
      const { getSyncSummary } = await import("./bidirectionalSync");
      const summary = getSyncSummary(scanResult);
      
      res.json(summary);
    } catch (error: any) {
      console.error("Error getting sync summary:", error);
      res.status(500).json({ message: error.message || "Failed to get sync summary" });
    }
  });
  
  // Apply sync selections (dry run or actual)
  app.post("/api/admin/sync/apply", isAdmin, async (req, res) => {
    try {
      const { prodDbUrl, operations, dryRun = false } = req.body;
      
      if (!prodDbUrl) {
        return res.status(400).json({ error: "Production database URL is required" });
      }
      
      if (!operations || !Array.isArray(operations)) {
        return res.status(400).json({ error: "Operations array is required" });
      }
      
      const { applySyncOperations } = await import("./bidirectionalSync");
      const result = await applySyncOperations(prodDbUrl, operations, dryRun);
      
      res.json(result);
    } catch (error: any) {
      console.error("Error applying sync:", error);
      res.status(500).json({ error: error.message || "Failed to apply sync" });
    }
  });

  // Push schema to production database
  app.post("/api/admin/sync/push-schema", isAdmin, async (req, res) => {
    try {
      const prodDbUrl = process.env.PROD_DATABASE_URL;
      
      if (!prodDbUrl) {
        return res.status(400).json({ 
          success: false, 
          error: "PROD_DATABASE_URL secret is not configured. Please add it in Replit Secrets." 
        });
      }
      
      // Use pg_dump to get schema from dev and apply to prod
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);
      
      // Get current dev database URL
      const devDbUrl = process.env.DATABASE_URL;
      if (!devDbUrl) {
        return res.status(500).json({ success: false, error: "Development database not configured" });
      }
      
      // Export schema from dev (schema only, no data, using CREATE IF NOT EXISTS style)
      const { stdout: schema } = await execAsync(
        `pg_dump --schema-only --no-owner --no-acl "${devDbUrl}"`,
        { maxBuffer: 50 * 1024 * 1024 }
      );
      
      // Parse and filter to safe statements only (CREATE TABLE, CREATE INDEX, CREATE TYPE, CREATE SEQUENCE)
      // This prevents any ALTER, DROP, or other destructive operations
      const safeStatements: string[] = [];
      const lines = schema.split('\n');
      let currentStatement = '';
      let inSafeStatement = false;
      
      for (const line of lines) {
        // Skip psql commands and comments
        if (line.startsWith('\\') || line.startsWith('--') || line.trim() === '') {
          continue;
        }
        
        // Check if starting a safe statement type
        const upperLine = line.toUpperCase().trim();
        if (upperLine.startsWith('CREATE TABLE') || 
            upperLine.startsWith('CREATE INDEX') || 
            upperLine.startsWith('CREATE UNIQUE INDEX') ||
            upperLine.startsWith('CREATE TYPE') ||
            upperLine.startsWith('CREATE SEQUENCE')) {
          inSafeStatement = true;
          currentStatement = line;
        } else if (inSafeStatement) {
          currentStatement += '\n' + line;
        }
        
        // Check if statement is complete (ends with semicolon)
        if (inSafeStatement && line.trim().endsWith(';')) {
          // Convert CREATE TABLE to CREATE TABLE IF NOT EXISTS
          let safeStatement = currentStatement;
          if (safeStatement.toUpperCase().includes('CREATE TABLE ') && 
              !safeStatement.toUpperCase().includes('IF NOT EXISTS')) {
            safeStatement = safeStatement.replace(/CREATE TABLE /i, 'CREATE TABLE IF NOT EXISTS ');
          }
          if (safeStatement.toUpperCase().includes('CREATE INDEX ') && 
              !safeStatement.toUpperCase().includes('IF NOT EXISTS')) {
            safeStatement = safeStatement.replace(/CREATE INDEX /i, 'CREATE INDEX IF NOT EXISTS ');
          }
          if (safeStatement.toUpperCase().includes('CREATE UNIQUE INDEX ') && 
              !safeStatement.toUpperCase().includes('IF NOT EXISTS')) {
            safeStatement = safeStatement.replace(/CREATE UNIQUE INDEX /i, 'CREATE UNIQUE INDEX IF NOT EXISTS ');
          }
          if (safeStatement.toUpperCase().includes('CREATE SEQUENCE ') && 
              !safeStatement.toUpperCase().includes('IF NOT EXISTS')) {
            safeStatement = safeStatement.replace(/CREATE SEQUENCE /i, 'CREATE SEQUENCE IF NOT EXISTS ');
          }
          
          safeStatements.push(safeStatement);
          currentStatement = '';
          inSafeStatement = false;
        }
      }
      
      // Also handle CREATE TYPE with DO block for safe creation
      const typeStatements = safeStatements.filter(s => s.toUpperCase().includes('CREATE TYPE'));
      const otherStatements = safeStatements.filter(s => !s.toUpperCase().includes('CREATE TYPE'));
      
      // Wrap types in DO blocks for IF NOT EXISTS behavior
      const safeTypeStatements = typeStatements.map(stmt => {
        const typeMatch = stmt.match(/CREATE TYPE\s+(\S+)/i);
        if (typeMatch) {
          const typeName = typeMatch[1];
          return `DO $$ BEGIN ${stmt.replace(/;$/, '')}; EXCEPTION WHEN duplicate_object THEN null; END $$;`;
        }
        return stmt;
      });
      
      const finalSchema = [...safeTypeStatements, ...otherStatements].join('\n\n');
      
      // Write to temp file
      const fs = await import("fs/promises");
      const tempFile = '/tmp/schema_push.sql';
      await fs.writeFile(tempFile, finalSchema);
      
      // Apply to production (will show errors for existing objects, that's OK)
      const { stdout, stderr } = await execAsync(
        `psql "${prodDbUrl}" -f ${tempFile} 2>&1 || true`,
        { maxBuffer: 50 * 1024 * 1024 }
      );
      
      // Count results
      const outputLines = (stdout + stderr).split('\n');
      const created = outputLines.filter(l => l.includes('CREATE')).length;
      const errors = outputLines.filter(l => l.includes('ERROR') && l.includes('already exists')).length;
      const otherErrors = outputLines.filter(l => l.includes('ERROR') && !l.includes('already exists'));
      
      res.json({
        success: true,
        message: `Schema push complete. ${created} objects processed, ${errors} already existed.`,
        details: {
          objectsProcessed: created,
          alreadyExisted: errors,
          warnings: otherErrors.slice(0, 5)
        }
      });
    } catch (error: any) {
      console.error("Error pushing schema to production:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to push schema" 
      });
    }
  });

  // Sync platform modules to production database
  app.post("/api/admin/sync/push-modules", isAdmin, async (req, res) => {
    try {
      const prodDbUrl = process.env.PROD_DATABASE_URL;
      
      if (!prodDbUrl) {
        return res.status(400).json({ 
          success: false, 
          error: "PROD_DATABASE_URL secret is not configured. Please add it in Replit Secrets." 
        });
      }
      
      // Get all modules from development
      const rbac = await import('./rbac');
      const devModules = await rbac.getAllPlatformModules();
      
      // Connect to production and insert/update modules
      const { neon } = await import('@neondatabase/serverless');
      const prodSql = neon(prodDbUrl);
      
      let inserted = 0;
      let updated = 0;
      
      for (const mod of devModules) {
        // Handle both camelCase (from Drizzle) and snake_case (from raw SQL)
        const moduleKey = mod.moduleKey || mod.module_key;
        const moduleName = mod.moduleName || mod.module_name;
        const routePrefix = mod.routePrefix || mod.route_prefix;
        const sortOrder = mod.sortOrder || mod.sort_order || 0;
        
        if (!moduleKey) {
          console.log('Skipping module with no key:', mod);
          continue;
        }
        
        // Check if module exists in production
        const existing = await prodSql`
          SELECT id FROM platform_modules WHERE module_key = ${moduleKey}
        `;
        
        if (existing.length === 0) {
          // Insert new module
          await prodSql`
            INSERT INTO platform_modules (id, module_key, module_name, description, icon, color, route_prefix, status, progress, sort_order, notes, created_at, updated_at)
            VALUES (
              gen_random_uuid(),
              ${moduleKey},
              ${moduleName},
              ${mod.description || null},
              ${mod.icon || null},
              ${mod.color || null},
              ${routePrefix},
              ${mod.status},
              ${mod.progress},
              ${sortOrder},
              ${mod.notes || null},
              NOW(),
              NOW()
            )
          `;
          inserted++;
        } else {
          // Update existing module
          await prodSql`
            UPDATE platform_modules 
            SET module_name = ${moduleName},
                description = ${mod.description || null},
                icon = ${mod.icon || null},
                color = ${mod.color || null},
                route_prefix = ${routePrefix},
                status = ${mod.status},
                progress = ${mod.progress},
                sort_order = ${sortOrder},
                notes = ${mod.notes || null},
                updated_at = NOW()
            WHERE module_key = ${moduleKey}
          `;
          updated++;
        }
      }
      
      // Now sync security entries - create module access for all groups
      // First get all user groups from production
      const prodGroups = await prodSql`SELECT id, name FROM user_groups WHERE active = true`;
      
      // Get all modules from production
      const prodModules = await prodSql`SELECT id, module_key FROM platform_modules`;
      
      // Create missing module access entries
      let accessCreated = 0;
      for (const group of prodGroups) {
        const groupName = group.name as string;
        const isGlobalAdmin = groupName === 'Global Admin';
        
        for (const pMod of prodModules) {
          // Check if access entry exists
          const existing = await prodSql`
            SELECT id FROM group_module_access 
            WHERE group_id = ${group.id} AND module_id = ${pMod.id}
          `;
          
          if (existing.length === 0) {
            // Create entry - Global Admin gets access, others don't
            await prodSql`
              INSERT INTO group_module_access (group_id, module_id, has_access)
              VALUES (${group.id}, ${pMod.id}, ${isGlobalAdmin})
            `;
            accessCreated++;
          }
        }
      }
      
      res.json({
        success: true,
        message: `Synced ${devModules.length} modules to production. ${inserted} inserted, ${updated} updated. ${accessCreated} access entries created.`,
        details: {
          total: devModules.length,
          inserted,
          updated,
          accessCreated
        }
      });
    } catch (error: any) {
      console.error("Error syncing modules to production:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to sync modules" 
      });
    }
  });

  // Diagnostic endpoint to check production database
  app.get("/api/admin/sync/prod-check", async (req, res) => {
    try {
      const prodUrl = process.env.PROD_DATABASE_URL;
      if (!prodUrl) {
        return res.status(400).json({ error: "PROD_DATABASE_URL not configured" });
      }
      
      const { neon } = await import('@neondatabase/serverless');
      const prodSql = neon(prodUrl);
      
      const modules = await prodSql`SELECT module_key, module_name, status FROM platform_modules ORDER BY sort_order`;
      const groups = await prodSql`SELECT id, name FROM user_groups WHERE active = true`;
      const accessCount = await prodSql`SELECT COUNT(*) as count FROM group_module_access`;
      const accessWithTrue = await prodSql`SELECT COUNT(*) as count FROM group_module_access WHERE has_access = true`;
      
      // Check Global Admin access specifically
      const globalAdminGroup = await prodSql`SELECT id FROM user_groups WHERE name = 'Global Admin' LIMIT 1`;
      let globalAdminAccess: any[] = [];
      if (globalAdminGroup.length > 0) {
        globalAdminAccess = await prodSql`
          SELECT pm.module_key, gma.has_access 
          FROM group_module_access gma
          JOIN platform_modules pm ON pm.id = gma.module_id
          WHERE gma.group_id = ${globalAdminGroup[0].id}
          ORDER BY pm.sort_order
        `;
      }
      
      // Check module_features count
      const featureCount = await prodSql`SELECT COUNT(*) as count FROM module_features`;
      const featuresByModule = await prodSql`
        SELECT pm.module_key, COUNT(mf.id) as feature_count 
        FROM platform_modules pm
        LEFT JOIN module_features mf ON mf.module_id = pm.id
        GROUP BY pm.module_key, pm.sort_order
        ORDER BY pm.sort_order
      `;
      
      res.json({
        moduleCount: modules.length,
        modules: modules.map((m: any) => ({ key: m.module_key, name: m.module_name, status: m.status })),
        groupCount: groups.length,
        groups: groups.map((g: any) => g.name),
        totalAccessEntries: accessCount[0]?.count || 0,
        accessEntriesWithTrue: accessWithTrue[0]?.count || 0,
        globalAdminAccess: globalAdminAccess.map((a: any) => ({ module: a.module_key, hasAccess: a.has_access })),
        totalFeatures: featureCount[0]?.count || 0,
        featuresByModule: featuresByModule.map((f: any) => ({ module: f.module_key, features: parseInt(f.feature_count) }))
      });
    } catch (error: any) {
      console.error("Error checking production:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Add missing modules to the local database (call from production to fix production)
  app.post("/api/admin/add-missing-modules", async (req, res) => {
    try {
      const missingModules = [
        { key: 'reservations', name: 'Reservations', icon: 'Calendar', status: 'active', sortOrder: 7, description: 'Dining reservation system' },
        { key: 'procedures', name: 'Daily Procedures', icon: 'ClipboardCheck', status: 'active', sortOrder: 9, description: 'Daily task procedures' },
        { key: 'support', name: 'Customer Support', icon: 'Headphones', status: 'development', sortOrder: 10, description: 'Customer support ticketing' },
        { key: 'apple_game', name: 'Apple Game', icon: 'Gamepad2', status: 'active', sortOrder: 14, description: 'Interactive apple picking game' },
      ];
      
      const results = [];
      for (const mod of missingModules) {
        // Check if module exists
        const existing = await db.execute(sql`
          SELECT id FROM platform_modules WHERE module_key = ${mod.key}
        `);
        
        if (existing.rows.length === 0) {
          // Insert the module
          const inserted = await db.execute(sql`
            INSERT INTO platform_modules (module_key, module_name, icon, status, sort_order, description)
            VALUES (${mod.key}, ${mod.name}, ${mod.icon}, ${mod.status}, ${mod.sortOrder}, ${mod.description})
            RETURNING id, module_key
          `);
          results.push({ module: mod.key, action: 'inserted', id: (inserted.rows[0] as any)?.id });
          
          // Also add access entries for all groups
          const groups = await db.execute(sql`SELECT id FROM user_groups WHERE active = true`);
          const moduleId = (inserted.rows[0] as any)?.id;
          
          for (const group of groups.rows) {
            const groupId = (group as any).id;
            // Global Admin gets access, others don't by default
            const hasAccess = (await db.execute(sql`
              SELECT name FROM user_groups WHERE id = ${groupId}
            `)).rows[0];
            const isGlobalAdmin = (hasAccess as any)?.name === 'Global Admin';
            
            await db.execute(sql`
              INSERT INTO group_module_access (group_id, module_id, has_access)
              VALUES (${groupId}, ${moduleId}, ${isGlobalAdmin})
              ON CONFLICT (group_id, module_id) DO NOTHING
            `);
          }
        } else {
          results.push({ module: mod.key, action: 'already exists' });
        }
      }
      
      // Get final count
      const finalCount = await db.execute(sql`SELECT COUNT(*) as count FROM platform_modules`);
      
      res.json({
        success: true,
        results,
        totalModules: (finalCount.rows[0] as any)?.count
      });
    } catch (error: any) {
      console.error("Error adding missing modules:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Diagnostic endpoint that runs on ANY environment to show local db state
  // Call this on production site to see what production database contains
  app.get("/api/admin/db-diagnostic", async (req, res) => {
    try {
      const modules = await db.execute(sql`
        SELECT module_key, module_name, status FROM platform_modules ORDER BY sort_order
      `);
      const groups = await db.execute(sql`
        SELECT id, name FROM user_groups WHERE active = true
      `);
      const accessCount = await db.execute(sql`
        SELECT COUNT(*) as count FROM group_module_access
      `);
      const accessWithTrue = await db.execute(sql`
        SELECT COUNT(*) as count FROM group_module_access WHERE has_access = true
      `);
      
      res.json({
        environment: process.env.NODE_ENV || 'unknown',
        databaseHost: process.env.PGHOST || 'unknown',
        moduleCount: modules.rows.length,
        modules: modules.rows,
        groupCount: groups.rows.length,
        groups: groups.rows,
        totalAccessEntries: (accessCount.rows[0] as any)?.count || 0,
        accessEntriesWithTrue: (accessWithTrue.rows[0] as any)?.count || 0
      });
    } catch (error: any) {
      console.error("Error in db diagnostic:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Fix Global Admin access in production
  app.post("/api/admin/sync/fix-admin-access", async (req, res) => {
    try {
      const prodUrl = process.env.PROD_DATABASE_URL;
      if (!prodUrl) {
        return res.status(400).json({ error: "PROD_DATABASE_URL not configured" });
      }
      
      const { neon } = await import('@neondatabase/serverless');
      const prodSql = neon(prodUrl);
      
      // Get Global Admin group
      const globalAdminGroup = await prodSql`SELECT id FROM user_groups WHERE name = 'Global Admin' LIMIT 1`;
      if (globalAdminGroup.length === 0) {
        return res.status(404).json({ error: "Global Admin group not found" });
      }
      
      // Update all module access entries to true for Global Admin
      const result = await prodSql`
        UPDATE group_module_access 
        SET has_access = true 
        WHERE group_id = ${globalAdminGroup[0].id}
      `;
      
      res.json({
        success: true,
        message: `Updated Global Admin access for all modules`
      });
    } catch (error: any) {
      console.error("Error fixing admin access:", error);
      res.status(500).json({ error: error.message });
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

      // RBAC tables - need lookups for natural key resolution
      // CRITICAL: Auto-include parent tables when child tables are selected for proper import
      const rbac = await import('./rbac');
      let rbacLookups: any = {};
      
      // Check if we need to auto-include parent tables
      const needsModules = tableSet.has('moduleFeatures') || tableSet.has('groupModuleAccess') || tableSet.has('groupFeaturePermissions');
      const needsGroups = tableSet.has('groupModuleAccess') || tableSet.has('groupFeaturePermissions');
      const needsFeatures = tableSet.has('groupFeaturePermissions');
      
      // Always load lookups if any RBAC permission tables are requested
      if (needsModules || needsGroups || needsFeatures) {
        rbacLookups.userGroups = await rbac.getAllUserGroups();
        rbacLookups.platformModules = await rbac.getAllPlatformModules();
        rbacLookups.moduleFeatures = await rbac.getAllModuleFeatures();
      }
      
      // Auto-include platformModules if any dependent table is selected
      if (needsModules || tableSet.has('platformModules')) {
        data.platformModules = rbacLookups.platformModules || await rbac.getAllPlatformModules();
      }
      
      // Auto-include userGroups if any dependent table is selected
      if (needsGroups || tableSet.has('userGroups')) {
        data.userGroups = rbacLookups.userGroups || await rbac.getAllUserGroups();
      }
      
      if (tableSet.has('platformUsers')) {
        data.platformUsers = await rbac.getAllPlatformUsers();
      }
      
      // Auto-include moduleFeatures if groupFeaturePermissions is selected
      if (needsFeatures || tableSet.has('moduleFeatures')) {
        data.moduleFeatures = rbacLookups.moduleFeatures || await rbac.getAllModuleFeatures();
        data._lookups = { ...data._lookups, platformModules: rbacLookups.platformModules };
      }
      
      if (tableSet.has('groupModuleAccess')) {
        const allModuleAccess = await rbac.getAllGroupModuleAccess();
        data.groupModuleAccess = allModuleAccess;
        data._lookups = { 
          ...data._lookups, 
          userGroups: rbacLookups.userGroups,
          platformModules: rbacLookups.platformModules 
        };
      }
      if (tableSet.has('groupFeaturePermissions')) {
        const allFeaturePerms = await rbac.getAllGroupFeaturePermissions();
        data.groupFeaturePermissions = allFeaturePerms;
        data._lookups = { 
          ...data._lookups, 
          userGroups: rbacLookups.userGroups,
          platformModules: rbacLookups.platformModules,
          moduleFeatures: rbacLookups.moduleFeatures
        };
      }

      const { exportAllDataToExcel } = await import("./excel-import");
      const buffer = exportAllDataToExcel(data, data._lookups);
      
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

      // RBAC TABLES - Import with natural key resolution
      // CRITICAL: We must import base tables first AND load existing data for FK resolution
      const rbacImport = await import('./rbac');
      
      // Check if any RBAC tables are selected
      const hasRbacTables = tableSet.has('platformModules') || tableSet.has('userGroups') || 
                            tableSet.has('platformUsers') || tableSet.has('moduleFeatures') || 
                            tableSet.has('groupModuleAccess') || tableSet.has('groupFeaturePermissions');

      if (hasRbacTables) {
        // STEP 1: Import platform modules first (base table for features)
        // Even if not explicitly selected, we need modules to exist for feature FK resolution
        if (parseResult.platformModules && parseResult.platformModules.length > 0) {
          let success = 0;
          for (const mod of parseResult.platformModules) {
            try {
              await rbacImport.upsertPlatformModuleByKey(mod);
              success++;
            } catch (error) {
              results.errors.push(`Module "${mod.moduleKey}": ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
          if (tableSet.has('platformModules')) {
            results.summary.platformModules = success;
          }
        }

        // STEP 2: Import user groups (base table for access/permissions)
        if (parseResult.userGroups && parseResult.userGroups.length > 0) {
          let success = 0;
          for (const group of parseResult.userGroups) {
            try {
              await rbacImport.upsertUserGroupByName(group);
              success++;
            } catch (error) {
              results.errors.push(`Group "${group.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
          if (tableSet.has('userGroups')) {
            results.summary.userGroups = success;
          }
        }

        // STEP 3: Import platform users
        if (tableSet.has('platformUsers') && parseResult.platformUsers && parseResult.platformUsers.length > 0) {
          let success = 0;
          for (const user of parseResult.platformUsers) {
            try {
              await rbacImport.upsertPlatformUserByEmail(user);
              success++;
            } catch (error) {
              results.errors.push(`User "${user.email}": ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
          results.summary.platformUsers = success;
        }

        // STEP 4: Import module features (depends on platformModules)
        if (parseResult.moduleFeatures && parseResult.moduleFeatures.length > 0) {
          let success = 0;
          for (const feature of parseResult.moduleFeatures) {
            try {
              const moduleId = await rbacImport.getModuleIdByKey(feature.moduleKey);
              if (!moduleId) {
                results.warnings.push(`Feature "${feature.featureKey}": Module "${feature.moduleKey}" not found`);
                continue;
              }
              await rbacImport.upsertModuleFeatureByKey(moduleId, feature);
              success++;
            } catch (error) {
              results.errors.push(`Feature "${feature.featureKey}": ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
          if (tableSet.has('moduleFeatures')) {
            results.summary.moduleFeatures = success;
          }
        }

        // STEP 5: Import group module access (depends on userGroups + platformModules)
        if (tableSet.has('groupModuleAccess') && parseResult.groupModuleAccess && parseResult.groupModuleAccess.length > 0) {
          let success = 0;
          for (const access of parseResult.groupModuleAccess) {
            try {
              const groupId = await rbacImport.getGroupIdByName(access.groupName);
              const moduleId = await rbacImport.getModuleIdByKey(access.moduleKey);
              if (!groupId) {
                results.warnings.push(`Module Access: Group "${access.groupName}" not found`);
                continue;
              }
              if (!moduleId) {
                results.warnings.push(`Module Access: Module "${access.moduleKey}" not found`);
                continue;
              }
              await rbacImport.upsertGroupModuleAccessByKeys(groupId, moduleId, access.hasAccess);
              success++;
            } catch (error) {
              results.errors.push(`Module Access for "${access.groupName}": ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
          results.summary.groupModuleAccess = success;
        }

        // STEP 6: Import group feature permissions (depends on userGroups + moduleFeatures)
        if (tableSet.has('groupFeaturePermissions') && parseResult.groupFeaturePermissions && parseResult.groupFeaturePermissions.length > 0) {
          let success = 0;
          for (const perm of parseResult.groupFeaturePermissions) {
            try {
              const groupId = await rbacImport.getGroupIdByName(perm.groupName);
              const featureId = await rbacImport.getFeatureIdByKey(perm.featureKey);
              if (!groupId) {
                results.warnings.push(`Feature Permission: Group "${perm.groupName}" not found`);
                continue;
              }
              if (!featureId) {
                results.warnings.push(`Feature Permission: Feature "${perm.featureKey}" not found`);
                continue;
              }
              await rbacImport.upsertGroupFeaturePermissionByKeys(groupId, featureId, perm.permissionLevel);
              success++;
            } catch (error) {
              results.errors.push(`Feature Permission for "${perm.groupName}": ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
          results.summary.groupFeaturePermissions = success;
        }
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
  // PLATFORM FUTURE CONCEPTS ROUTES
  // =====================================================

  // Get all future concepts
  app.get('/api/platform/future-concepts', isAuthenticated, async (req, res) => {
    try {
      const concepts = await db.execute(sql`
        SELECT 
          id,
          title,
          description,
          category,
          priority,
          status,
          notes,
          created_by as "createdBy",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM platform_future_concepts
        ORDER BY created_at DESC
      `);
      res.json(concepts.rows);
    } catch (error) {
      console.error('Error fetching future concepts:', error);
      res.status(500).json({ message: 'Failed to fetch future concepts' });
    }
  });

  // Create a future concept
  app.post('/api/platform/future-concepts', isAdmin, async (req, res) => {
    try {
      const { title, description, category, priority, status, notes, createdBy } = req.body;
      
      const result = await db.execute(sql`
        INSERT INTO platform_future_concepts (title, description, category, priority, status, notes, created_by)
        VALUES (${title}, ${description || null}, ${category || 'general'}, ${priority || 'medium'}, ${status || 'idea'}, ${notes || null}, ${createdBy || null})
        RETURNING *
      `);
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating future concept:', error);
      res.status(500).json({ message: 'Failed to create future concept' });
    }
  });

  // Update a future concept
  app.patch('/api/platform/future-concepts/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, category, priority, status, notes } = req.body;
      
      const result = await db.execute(sql`
        UPDATE platform_future_concepts 
        SET 
          title = COALESCE(${title}, title),
          description = COALESCE(${description}, description),
          category = COALESCE(${category}, category),
          priority = COALESCE(${priority}, priority),
          status = COALESCE(${status}, status),
          notes = COALESCE(${notes}, notes),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Concept not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating future concept:', error);
      res.status(500).json({ message: 'Failed to update future concept' });
    }
  });

  // Delete a future concept
  app.delete('/api/platform/future-concepts/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await db.execute(sql`
        DELETE FROM platform_future_concepts WHERE id = ${id}
        RETURNING id
      `);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Concept not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting future concept:', error);
      res.status(500).json({ message: 'Failed to delete future concept' });
    }
  });

  // =====================================================
  // PLATFORM COMPANY INFO ROUTES
  // =====================================================

  // Get company info
  app.get('/api/platform/company-info', async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT 
          id,
          company_name as "companyName",
          tagline,
          description,
          address,
          city,
          state,
          zip_code as "zipCode",
          phone,
          email,
          support_email as "supportEmail",
          website,
          mailing_list_url as "mailingListUrl",
          facebook_url as "facebookUrl",
          instagram_url as "instagramUrl",
          twitter_url as "twitterUrl",
          linkedin_url as "linkedinUrl",
          yelp_url as "yelpUrl",
          trip_advisor_url as "tripAdvisorUrl",
          google_maps_url as "googleMapsUrl",
          hours_of_operation as "hoursOfOperation",
          additional_info as "additionalInfo",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM platform_company_info
        LIMIT 1
      `);
      
      if (result.rows.length === 0) {
        return res.json(null);
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching company info:', error);
      res.status(500).json({ message: 'Failed to fetch company info' });
    }
  });

  // Update company info
  app.put('/api/platform/company-info', isAdmin, async (req, res) => {
    try {
      const data = req.body;
      
      // Check if record exists
      const existing = await db.execute(sql`SELECT id FROM platform_company_info LIMIT 1`);
      
      if (existing.rows.length === 0) {
        // Create new record
        const result = await db.execute(sql`
          INSERT INTO platform_company_info (
            company_name, tagline, description, address, city, state, zip_code,
            phone, email, support_email, website, mailing_list_url,
            facebook_url, instagram_url, twitter_url, linkedin_url,
            yelp_url, trip_advisor_url, google_maps_url, hours_of_operation, additional_info
          ) VALUES (
            ${data.companyName || 'Nashoba Valley Winery'},
            ${data.tagline || null},
            ${data.description || null},
            ${data.address || null},
            ${data.city || null},
            ${data.state || null},
            ${data.zipCode || null},
            ${data.phone || null},
            ${data.email || null},
            ${data.supportEmail || null},
            ${data.website || null},
            ${data.mailingListUrl || null},
            ${data.facebookUrl || null},
            ${data.instagramUrl || null},
            ${data.twitterUrl || null},
            ${data.linkedinUrl || null},
            ${data.yelpUrl || null},
            ${data.tripAdvisorUrl || null},
            ${data.googleMapsUrl || null},
            ${data.hoursOfOperation || null},
            ${data.additionalInfo || null}
          )
          RETURNING *
        `);
        return res.status(201).json(result.rows[0]);
      }
      
      // Update existing record
      const result = await db.execute(sql`
        UPDATE platform_company_info SET
          company_name = ${data.companyName || 'Nashoba Valley Winery'},
          tagline = ${data.tagline || null},
          description = ${data.description || null},
          address = ${data.address || null},
          city = ${data.city || null},
          state = ${data.state || null},
          zip_code = ${data.zipCode || null},
          phone = ${data.phone || null},
          email = ${data.email || null},
          support_email = ${data.supportEmail || null},
          website = ${data.website || null},
          mailing_list_url = ${data.mailingListUrl || null},
          facebook_url = ${data.facebookUrl || null},
          instagram_url = ${data.instagramUrl || null},
          twitter_url = ${data.twitterUrl || null},
          linkedin_url = ${data.linkedinUrl || null},
          yelp_url = ${data.yelpUrl || null},
          trip_advisor_url = ${data.tripAdvisorUrl || null},
          google_maps_url = ${data.googleMapsUrl || null},
          hours_of_operation = ${data.hoursOfOperation || null},
          additional_info = ${data.additionalInfo || null},
          updated_at = NOW()
        WHERE id = ${existing.rows[0].id}
        RETURNING *
      `);
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating company info:', error);
      res.status(500).json({ message: 'Failed to update company info' });
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
          progress,
          sort_order as "sortOrder",
          launch_date as "launchDate",
          notes
        FROM platform_modules
        ORDER BY sort_order ASC
      `);
      res.json(modules.rows);
    } catch (error) {
      console.error('Error fetching platform modules:', error);
      res.status(500).json({ message: 'Failed to fetch modules' });
    }
  });

  // Update a platform module (notes, progress)
  app.patch('/api/platform/modules/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { notes, progress } = req.body;

      if (notes === undefined && progress === undefined) {
        return res.status(400).json({ message: 'No updates provided' });
      }

      // Build dynamic update based on what's provided
      let result;
      if (notes !== undefined && progress !== undefined) {
        result = await db.execute(sql`
          UPDATE platform_modules 
          SET notes = ${notes}, progress = ${progress}, updated_at = NOW()
          WHERE id = ${id}
          RETURNING *
        `);
      } else if (notes !== undefined) {
        result = await db.execute(sql`
          UPDATE platform_modules 
          SET notes = ${notes}, updated_at = NOW()
          WHERE id = ${id}
          RETURNING *
        `);
      } else {
        result = await db.execute(sql`
          UPDATE platform_modules 
          SET progress = ${progress}, updated_at = NOW()
          WHERE id = ${id}
          RETURNING *
        `);
      }
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Module not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating module:', error);
      res.status(500).json({ message: 'Failed to update module' });
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
  // MODULE MANAGEMENT ROUTES (Admin)
  // =====================================================

  // Get all modules with full details for admin management
  app.get('/api/admin/modules', isAdmin, async (req, res) => {
    try {
      const modules = await db.execute(sql`
        SELECT 
          id,
          module_key,
          module_name,
          description,
          icon,
          color,
          route_prefix,
          status,
          sort_order,
          launch_date,
          created_at,
          updated_at
        FROM platform_modules
        ORDER BY sort_order ASC
      `);
      res.json(modules.rows);
    } catch (error) {
      console.error('Error fetching admin modules:', error);
      res.status(500).json({ message: 'Failed to fetch modules' });
    }
  });

  // Update a module's metadata
  app.patch('/api/admin/modules/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { module_name, description, icon, color, status, sort_order } = req.body;
      
      // Validate status if provided
      const validStatuses = ['active', 'development', 'planned', 'inactive'];
      if (status !== undefined && !validStatuses.includes(status)) {
        return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      }
      
      // Validate sort_order if provided
      if (sort_order !== undefined && (typeof sort_order !== 'number' || sort_order < 0)) {
        return res.status(400).json({ message: 'Sort order must be a non-negative number' });
      }
      
      // Validate module_name if provided
      if (module_name !== undefined && (typeof module_name !== 'string' || module_name.trim().length === 0)) {
        return res.status(400).json({ message: 'Module name must be a non-empty string' });
      }
      
      const result = await db.execute(sql`
        UPDATE platform_modules
        SET 
          module_name = COALESCE(${module_name}, module_name),
          description = COALESCE(${description}, description),
          icon = COALESCE(${icon}, icon),
          color = COALESCE(${color}, color),
          status = COALESCE(${status}, status),
          sort_order = COALESCE(${sort_order}, sort_order),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Module not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating module:', error);
      res.status(500).json({ message: 'Failed to update module' });
    }
  });

  // =====================================================
  // RBAC (ROLE-BASED ACCESS CONTROL) ROUTES
  // =====================================================
  
  const rbac = await import('./rbac');

  // Get all user groups
  app.get('/api/rbac/groups', isAdmin, async (req, res) => {
    try {
      const groups = await rbac.getAllUserGroups();
      res.json(groups);
    } catch (error) {
      console.error('Error fetching user groups:', error);
      res.status(500).json({ message: 'Failed to fetch user groups' });
    }
  });

  // Get a single group with all its permissions
  app.get('/api/rbac/groups/:id', isAdmin, async (req, res) => {
    try {
      const group = await rbac.getGroupWithPermissions(req.params.id);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      res.json(group);
    } catch (error) {
      console.error('Error fetching group:', error);
      res.status(500).json({ message: 'Failed to fetch group' });
    }
  });

  // Create a new user group
  app.post('/api/rbac/groups', isAdmin, async (req, res) => {
    try {
      const { name, description, color } = req.body;
      if (!name) {
        return res.status(400).json({ message: 'Group name is required' });
      }
      const group = await rbac.createUserGroup({ name, description, color });
      res.status(201).json(group);
    } catch (error: any) {
      console.error('Error creating group:', error);
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({ message: 'A group with this name already exists' });
      }
      res.status(500).json({ message: 'Failed to create group' });
    }
  });

  // Update a user group
  app.patch('/api/rbac/groups/:id', isAdmin, async (req, res) => {
    try {
      const { name, description, color, sortOrder } = req.body;
      const group = await rbac.updateUserGroup(req.params.id, { name, description, color, sortOrder });
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      res.json(group);
    } catch (error: any) {
      console.error('Error updating group:', error);
      if (error.code === '23505') {
        return res.status(400).json({ message: 'A group with this name already exists' });
      }
      res.status(500).json({ message: 'Failed to update group' });
    }
  });

  // Delete a user group
  app.delete('/api/rbac/groups/:id', isAdmin, async (req, res) => {
    try {
      const deleted = await rbac.deleteUserGroup(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: 'Group not found' });
      }
      res.json({ message: 'Group deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting group:', error);
      if (error.message === 'Cannot delete system groups') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: 'Failed to delete group' });
    }
  });

  // Get group members
  app.get('/api/rbac/groups/:id/members', isAdmin, async (req, res) => {
    try {
      const members = await rbac.getGroupMembers(req.params.id);
      res.json(members);
    } catch (error) {
      console.error('Error fetching group members:', error);
      res.status(500).json({ message: 'Failed to fetch group members' });
    }
  });

  // Update group module access
  app.put('/api/rbac/groups/:groupId/modules/:moduleId', isAdmin, async (req, res) => {
    try {
      const { hasAccess } = req.body;
      await rbac.updateGroupModuleAccess(req.params.groupId, req.params.moduleId, hasAccess);
      res.json({ message: 'Module access updated' });
    } catch (error) {
      console.error('Error updating module access:', error);
      res.status(500).json({ message: 'Failed to update module access' });
    }
  });

  // Update group feature permission
  app.put('/api/rbac/groups/:groupId/features/:featureId', isAdmin, async (req, res) => {
    try {
      const { permissionLevel } = req.body;
      if (!['none', 'view', 'edit', 'admin'].includes(permissionLevel)) {
        return res.status(400).json({ message: 'Invalid permission level' });
      }
      await rbac.updateGroupFeaturePermission(req.params.groupId, req.params.featureId, permissionLevel);
      res.json({ message: 'Feature permission updated' });
    } catch (error) {
      console.error('Error updating feature permission:', error);
      res.status(500).json({ message: 'Failed to update feature permission' });
    }
  });

  // Get all platform users with their group memberships
  app.get('/api/rbac/users', isAdmin, async (req, res) => {
    try {
      const users = await rbac.getAllPlatformUsers();
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // Get user's group memberships
  app.get('/api/rbac/users/:userId/groups', isAdmin, async (req, res) => {
    try {
      const groups = await rbac.getUserGroupMemberships(req.params.userId);
      res.json(groups);
    } catch (error) {
      console.error('Error fetching user groups:', error);
      res.status(500).json({ message: 'Failed to fetch user groups' });
    }
  });

  // Add user to group
  app.post('/api/rbac/users/:userId/groups/:groupId', isAdmin, async (req: any, res) => {
    try {
      const assignedBy = req.user?.claims?.sub;
      await rbac.addUserToGroup(req.params.userId, req.params.groupId, assignedBy);
      res.json({ message: 'User added to group' });
    } catch (error: any) {
      console.error('Error adding user to group:', error);
      const message = error.message || 'Failed to add user to group';
      res.status(500).json({ message });
    }
  });

  // Remove user from group
  app.delete('/api/rbac/users/:userId/groups/:groupId', isAdmin, async (req, res) => {
    try {
      await rbac.removeUserFromGroup(req.params.userId, req.params.groupId);
      res.json({ message: 'User removed from group' });
    } catch (error) {
      console.error('Error removing user from group:', error);
      res.status(500).json({ message: 'Failed to remove user from group' });
    }
  });

  // Create a new platform user
  app.post('/api/rbac/users', isAdmin, async (req, res) => {
    try {
      const { email, firstName, lastName, globalRole, department, jobTitle, phoneNumber } = req.body;
      
      if (!email || !firstName || !lastName) {
        return res.status(400).json({ message: 'Email, first name, and last name are required' });
      }

      // Check if user already exists
      const existingUser = await db.execute(sql`
        SELECT id FROM platform_users WHERE email = ${email}
      `);
      
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ message: 'A user with this email already exists' });
      }

      const result = await db.execute(sql`
        INSERT INTO platform_users (email, first_name, last_name, global_role, department, job_title, phone_number)
        VALUES (${email}, ${firstName}, ${lastName}, ${globalRole || 'viewer'}, ${department || null}, ${jobTitle || null}, ${phoneNumber || null})
        RETURNING *
      `);

      res.status(201).json(result.rows[0]);
    } catch (error: any) {
      console.error('Error creating user:', error);
      if (error.code === '23505') {
        return res.status(400).json({ message: 'A user with this email already exists' });
      }
      res.status(500).json({ message: 'Failed to create user' });
    }
  });

  // Update a platform user
  app.patch('/api/rbac/users/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { email, firstName, lastName, globalRole, department, jobTitle, phoneNumber, active } = req.body;

      // Check if user exists
      const existingUser = await db.execute(sql`
        SELECT * FROM platform_users WHERE id = ${id}
      `);
      
      if (existingUser.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const current = existingUser.rows[0] as any;
      
      // Convert empty strings to null for optional fields, use current value if undefined
      const safeEmail = email || current.email;
      const safeFirstName = firstName || current.first_name;
      const safeLastName = lastName || current.last_name;
      const safeGlobalRole = globalRole || current.global_role;
      const safeDepartment = department === '' ? null : (department !== undefined ? department : current.department);
      const safeJobTitle = jobTitle === '' ? null : (jobTitle !== undefined ? jobTitle : current.job_title);
      const safePhoneNumber = phoneNumber === '' ? null : (phoneNumber !== undefined ? phoneNumber : current.phone_number);
      const safeActive = active !== undefined ? active : current.active;

      const result = await db.execute(sql`
        UPDATE platform_users
        SET 
          email = ${safeEmail},
          first_name = ${safeFirstName},
          last_name = ${safeLastName},
          global_role = ${safeGlobalRole},
          department = ${safeDepartment},
          job_title = ${safeJobTitle},
          phone_number = ${safePhoneNumber},
          active = ${safeActive},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `);

      res.json(result.rows[0]);
    } catch (error: any) {
      console.error('Error updating user:', error);
      if (error.code === '23505') {
        return res.status(400).json({ message: 'A user with this email already exists' });
      }
      res.status(500).json({ message: 'Failed to update user' });
    }
  });

  // Delete a platform user
  app.delete('/api/rbac/users/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      // Check if user exists
      const existingUser = await db.execute(sql`
        SELECT id FROM platform_users WHERE id = ${id}
      `);
      
      if (existingUser.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Delete user (cascades to group memberships)
      await db.execute(sql`
        DELETE FROM platform_users WHERE id = ${id}
      `);

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Failed to delete user' });
    }
  });

  // Get a single platform user with their groups
  app.get('/api/rbac/users/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      const result = await db.execute(sql`
        SELECT 
          pu.*,
          COALESCE(
            json_agg(
              json_build_object('id', ug.id, 'name', ug.name, 'color', ug.color)
            ) FILTER (WHERE ug.id IS NOT NULL),
            '[]'
          ) as groups
        FROM platform_users pu
        LEFT JOIN group_memberships gm ON pu.id = gm.user_id
        LEFT JOIN user_groups ug ON gm.group_id = ug.id
        WHERE pu.id = ${id}
        GROUP BY pu.id
      `);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // Set password for a platform user (admin only)
  app.post('/api/rbac/users/:id/set-password', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { password } = req.body;

      if (!password || password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long' });
      }

      // Check if user exists
      const existingUser = await db.execute(sql`
        SELECT id, email FROM platform_users WHERE id = ${id}
      `);
      
      if (existingUser.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Hash the password
      const passwordHash = await bcrypt.hash(password, 10);

      await db.execute(sql`
        UPDATE platform_users
        SET password_hash = ${passwordHash}, updated_at = NOW()
        WHERE id = ${id}
      `);

      res.json({ message: 'Password set successfully' });
    } catch (error) {
      console.error('Error setting password:', error);
      res.status(500).json({ message: 'Failed to set password' });
    }
  });

  // Request password reset (public endpoint)
  app.post('/api/auth/request-password-reset', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Check if user exists
      const userResult = await db.execute(sql`
        SELECT id, email, first_name FROM platform_users WHERE email = ${email}
      `);
      
      if (userResult.rows.length === 0) {
        // Don't reveal if user exists - always return success
        return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
      }

      const user = userResult.rows[0] as { id: string; email: string; first_name: string };

      // Generate a secure random token
      const token = crypto.randomUUID() + '-' + crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Delete any existing tokens for this user
      await db.execute(sql`
        DELETE FROM password_reset_tokens WHERE user_id = ${user.id}
      `);

      // Create new token
      await db.execute(sql`
        INSERT INTO password_reset_tokens (user_id, token, expires_at)
        VALUES (${user.id}, ${token}, ${expiresAt})
      `);

      // Send email with reset link
      const resetUrl = `${process.env.REPLIT_DEV_DOMAIN ? 'https://' + process.env.REPLIT_DEV_DOMAIN : 'http://localhost:5000'}/reset-password?token=${token}`;
      
      if (process.env.SENDGRID_API_KEY) {
        const sgMail = await import('@sendgrid/mail');
        sgMail.default.setApiKey(process.env.SENDGRID_API_KEY);
        
        const msg = {
          to: user.email,
          from: process.env.SENDGRID_FROM_EMAIL || 'noreply@nashobawinery.com',
          subject: 'Password Reset Request - Nashoba Valley Operations',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #7c2d12;">Password Reset Request</h2>
              <p>Hello ${user.first_name},</p>
              <p>You requested to reset your password for the Nashoba Valley Operations Platform.</p>
              <p>Click the button below to set a new password:</p>
              <a href="${resetUrl}" style="display: inline-block; background-color: #7c2d12; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Reset Password</a>
              <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
              <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
              <p style="color: #999; font-size: 12px;">Nashoba Valley Operations Platform</p>
            </div>
          `,
        };

        await sgMail.default.send(msg);
        console.log('Password reset email sent to:', user.email);
      } else {
        console.log('SendGrid not configured. Reset URL:', resetUrl);
      }

      res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    } catch (error) {
      console.error('Error requesting password reset:', error);
      res.status(500).json({ message: 'Failed to process password reset request' });
    }
  });

  // Verify password reset token
  app.get('/api/auth/verify-reset-token', async (req, res) => {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({ valid: false, message: 'Token is required' });
      }

      const result = await db.execute(sql`
        SELECT prt.*, pu.email, pu.first_name
        FROM password_reset_tokens prt
        JOIN platform_users pu ON prt.user_id = pu.id
        WHERE prt.token = ${token as string}
          AND prt.expires_at > NOW()
          AND prt.used_at IS NULL
      `);

      if (result.rows.length === 0) {
        return res.json({ valid: false, message: 'Invalid or expired token' });
      }

      const tokenData = result.rows[0] as { email: string; first_name: string };
      res.json({ valid: true, email: tokenData.email, firstName: tokenData.first_name });
    } catch (error) {
      console.error('Error verifying reset token:', error);
      res.status(500).json({ valid: false, message: 'Failed to verify token' });
    }
  });

  // Reset password with token (public endpoint)
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ message: 'Token and password are required' });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long' });
      }

      // Find valid token
      const tokenResult = await db.execute(sql`
        SELECT * FROM password_reset_tokens
        WHERE token = ${token}
          AND expires_at > NOW()
          AND used_at IS NULL
      `);

      if (tokenResult.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      const resetToken = tokenResult.rows[0] as { id: string; user_id: string };

      // Hash the new password
      const passwordHash = await bcrypt.hash(password, 10);

      // Update user's password
      await db.execute(sql`
        UPDATE platform_users
        SET password_hash = ${passwordHash}, updated_at = NOW()
        WHERE id = ${resetToken.user_id}
      `);

      // Mark token as used
      await db.execute(sql`
        UPDATE password_reset_tokens
        SET used_at = NOW()
        WHERE id = ${resetToken.id}
      `);

      res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({ message: 'Failed to reset password' });
    }
  });

  // Check if user has password set
  app.get('/api/rbac/users/:id/has-password', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      const result = await db.execute(sql`
        SELECT password_hash IS NOT NULL as has_password
        FROM platform_users
        WHERE id = ${id}
      `);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ hasPassword: (result.rows[0] as any).has_password });
    } catch (error) {
      console.error('Error checking password status:', error);
      res.status(500).json({ message: 'Failed to check password status' });
    }
  });

  // Get current user's permissions (for frontend to check access)
  app.get('/api/rbac/my-permissions', isAuthenticated, async (req: any, res) => {
    try {
      const permissions = await rbac.getUserPermissions(req);
      res.json(permissions || { groups: [], moduleAccess: {}, featurePermissions: {} });
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      res.status(500).json({ message: 'Failed to fetch permissions' });
    }
  });

  // Get all module features (for permission matrix UI)
  app.get('/api/rbac/features', isAdmin, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT 
          mf.id,
          mf.module_id,
          mf.feature_key,
          mf.feature_name,
          mf.description,
          mf.sort_order,
          pm.module_key,
          pm.module_name
        FROM module_features mf
        INNER JOIN platform_modules pm ON mf.module_id = pm.id
        WHERE mf.active = true
        ORDER BY pm.sort_order, mf.sort_order
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching features:', error);
      res.status(500).json({ message: 'Failed to fetch features' });
    }
  });

  // Get security sync status
  app.get('/api/rbac/sync-status', isAdmin, async (req, res) => {
    try {
      const status = await rbac.getSecuritySyncStatus();
      res.json(status);
    } catch (error) {
      console.error('Error fetching sync status:', error);
      res.status(500).json({ message: 'Failed to fetch sync status' });
    }
  });

  // Sync all security entries (fill in missing module access and feature permissions)
  app.post('/api/rbac/sync', isAdmin, async (req, res) => {
    try {
      const result = await rbac.syncAllSecurityEntries();
      console.log(`[RBAC Sync] Created ${result.moduleAccessCreated} module access entries, ${result.featurePermissionsCreated} feature permission entries`);
      res.json({
        message: 'Security entries synchronized successfully',
        ...result
      });
    } catch (error) {
      console.error('Error syncing security entries:', error);
      res.status(500).json({ message: 'Failed to sync security entries' });
    }
  });

  // Add a new module with auto-generated security entries
  app.post('/api/rbac/modules', isAdmin, async (req, res) => {
    try {
      const { moduleKey, moduleName, description, icon, color, routePrefix, status } = req.body;
      
      if (!moduleKey || !moduleName) {
        return res.status(400).json({ message: 'moduleKey and moduleName are required' });
      }

      const newModule = await rbac.addModuleWithSecurity({
        moduleKey,
        moduleName,
        description,
        icon,
        color,
        routePrefix,
        status
      });

      res.status(201).json(newModule);
    } catch (error) {
      console.error('Error creating module:', error);
      res.status(500).json({ message: 'Failed to create module' });
    }
  });

  // Add a new feature with auto-generated security entries
  app.post('/api/rbac/features', isAdmin, async (req, res) => {
    try {
      const { moduleId, featureKey, featureName, description } = req.body;
      
      if (!moduleId || !featureKey || !featureName) {
        return res.status(400).json({ message: 'moduleId, featureKey, and featureName are required' });
      }

      const newFeature = await rbac.addFeatureWithSecurity({
        moduleId,
        featureKey,
        featureName,
        description
      });

      res.status(201).json(newFeature);
    } catch (error) {
      console.error('Error creating feature:', error);
      res.status(500).json({ message: 'Failed to create feature' });
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

  // ============================================
  // COMPLIANCE MODULE ROUTES
  // ============================================

  // Initialize SendGrid for compliance emails
  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }

  // Get all compliance tasks
  app.get('/api/compliance/tasks', isAdmin, async (req, res) => {
    try {
      const { status, category, priority } = req.query;
      let query = sql`
        SELECT * FROM compliance_tasks 
        WHERE is_active = true
        ${status ? sql` AND status = ${status}` : sql``}
        ${category ? sql` AND category = ${category}` : sql``}
        ${priority ? sql` AND priority = ${priority}` : sql``}
        ORDER BY 
          CASE WHEN status = 'overdue' THEN 1
               WHEN status = 'pending' AND due_date < NOW() THEN 2
               WHEN status = 'in_progress' THEN 3
               WHEN status = 'pending' THEN 4
               ELSE 5 END,
          due_date ASC NULLS LAST
      `;
      const result = await db.execute(query);
      const tasksWithDecryptedPasswords = result.rows.map((task: any) => ({
        ...task,
        portal_password: task.portal_password ? decryptPassword(task.portal_password) : null
      }));
      res.json(tasksWithDecryptedPasswords);
    } catch (error) {
      console.error('Error fetching compliance tasks:', error);
      res.status(500).json({ message: 'Failed to fetch compliance tasks' });
    }
  });

  // Get single compliance task with details
  app.get('/api/compliance/tasks/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const taskResult = await db.execute(sql`
        SELECT * FROM compliance_tasks WHERE id = ${id}
      `);
      
      if (taskResult.rows.length === 0) {
        return res.status(404).json({ message: 'Task not found' });
      }

      const task = taskResult.rows[0] as any;
      if (task.portal_password) {
        task.portal_password = decryptPassword(task.portal_password);
      }

      const historyResult = await db.execute(sql`
        SELECT * FROM compliance_task_history 
        WHERE task_id = ${id} 
        ORDER BY created_at DESC
      `);

      const remindersResult = await db.execute(sql`
        SELECT * FROM compliance_reminders 
        WHERE task_id = ${id} 
        ORDER BY sent_at DESC
      `);

      const attachmentsResult = await db.execute(sql`
        SELECT * FROM compliance_attachments 
        WHERE task_id = ${id} 
        ORDER BY created_at DESC
      `);

      res.json({
        ...task,
        history: historyResult.rows,
        reminders: remindersResult.rows,
        attachments: attachmentsResult.rows
      });
    } catch (error) {
      console.error('Error fetching compliance task:', error);
      res.status(500).json({ message: 'Failed to fetch compliance task' });
    }
  });

  // Create compliance task
  app.post('/api/compliance/tasks', isAdmin, async (req: any, res) => {
    try {
      const parsed = insertComplianceTaskSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid task data', errors: parsed.error.errors });
      }

      const userId = req.user?.claims?.sub;
      const userName = req.user?.claims?.email || 'Admin';
      
      const result = await db.execute(sql`
        INSERT INTO compliance_tasks (
          task_name, description, category, subcategory, jurisdiction, regulatory_body,
          recurrence, custom_recurrence_days, due_date, reminder_days,
          assigned_to_name, assigned_to_email, assigned_by_id,
          status, priority, portal_url, portal_username, portal_password, portal_notes,
          estimated_cost, actual_cost, penalty_amount, tags, created_by_id
        ) VALUES (
          ${parsed.data.taskName},
          ${parsed.data.description || null},
          ${parsed.data.category},
          ${parsed.data.subcategory || null},
          ${parsed.data.jurisdiction || null},
          ${parsed.data.regulatoryBody || null},
          ${parsed.data.recurrence || 'one_time'},
          ${parsed.data.customRecurrenceDays || null},
          ${parsed.data.dueDate || null},
          ${parsed.data.reminderDays || null},
          ${parsed.data.assignedToName || null},
          ${parsed.data.assignedToEmail || null},
          ${userId || null},
          ${parsed.data.status || 'pending'},
          ${parsed.data.priority || 'medium'},
          ${parsed.data.portalUrl || null},
          ${parsed.data.portalUsername || null},
          ${parsed.data.portalPassword ? encryptPassword(parsed.data.portalPassword) : null},
          ${parsed.data.portalNotes || null},
          ${parsed.data.estimatedCost || null},
          ${parsed.data.actualCost || null},
          ${parsed.data.penaltyAmount || null},
          ${parsed.data.tags || null},
          ${userId || null}
        ) RETURNING *
      `);

      // Log creation in history
      const task = result.rows[0];
      await db.execute(sql`
        INSERT INTO compliance_task_history (task_id, changed_by_id, changed_by_name, action, new_value)
        VALUES (${task.id}, ${userId || null}, ${userName}, 'created', ${parsed.data.taskName})
      `);

      res.status(201).json(task);
    } catch (error) {
      console.error('Error creating compliance task:', error);
      res.status(500).json({ message: 'Failed to create compliance task' });
    }
  });

  // Update compliance task
  app.patch('/api/compliance/tasks/:id', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const userId = req.user?.claims?.sub;
      const userName = req.user?.claims?.email || 'Admin';

      // Get existing task
      const existingResult = await db.execute(sql`
        SELECT * FROM compliance_tasks WHERE id = ${id}
      `);
      
      if (existingResult.rows.length === 0) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      const existing = existingResult.rows[0] as any;

      // Build dynamic update
      const updateFields: string[] = [];
      const logEntries: Array<{field: string, oldValue: any, newValue: any}> = [];

      const fieldMapping: Record<string, string> = {
        taskName: 'task_name',
        description: 'description',
        category: 'category',
        subcategory: 'subcategory',
        jurisdiction: 'jurisdiction',
        regulatoryBody: 'regulatory_body',
        recurrence: 'recurrence',
        customRecurrenceDays: 'custom_recurrence_days',
        dueDate: 'due_date',
        reminderDays: 'reminder_days',
        assignedToName: 'assigned_to_name',
        assignedToEmail: 'assigned_to_email',
        status: 'status',
        priority: 'priority',
        portalUrl: 'portal_url',
        portalUsername: 'portal_username',
        portalPassword: 'portal_password',
        portalNotes: 'portal_notes',
        estimatedCost: 'estimated_cost',
        actualCost: 'actual_cost',
        penaltyAmount: 'penalty_amount',
        completionNotes: 'completion_notes',
        confirmationNumber: 'confirmation_number',
        tags: 'tags',
        isActive: 'is_active'
      };

      // Track changes for history
      for (const [key, dbField] of Object.entries(fieldMapping)) {
        if (updates[key] !== undefined) {
          const camelKey = dbField.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
          if (existing[camelKey] !== updates[key]) {
            logEntries.push({
              field: key,
              oldValue: existing[camelKey],
              newValue: updates[key]
            });
          }
        }
      }

      // Handle status change to completed
      let completedAt = null;
      let completedById = null;
      if (updates.status === 'completed' && existing.status !== 'completed') {
        completedAt = new Date();
        completedById = userId;
      }

      // Handle portal password encryption if provided
      let encryptedPassword: string | null = null;
      if (updates.portalPassword !== undefined && updates.portalPassword !== null && updates.portalPassword !== '') {
        try {
          encryptedPassword = encryptPassword(updates.portalPassword);
        } catch (e) {
          console.error('Password encryption failed:', e);
        }
      }

      // Helper to convert empty strings to null
      const nullIfEmpty = (val: any) => (val === '' || val === undefined) ? null : val;
      const numericOrNull = (val: any) => (val === '' || val === undefined || val === null) ? null : Number(val);
      // Note: numericOrNull kept for potential future use with customRecurrenceDays

      // Build dynamic update using SQL fragments
      const setFragments: ReturnType<typeof sql>[] = [];

      if (updates.taskName !== undefined) setFragments.push(sql`task_name = ${nullIfEmpty(updates.taskName)}`);
      if (updates.description !== undefined) setFragments.push(sql`description = ${nullIfEmpty(updates.description)}`);
      if (updates.category !== undefined) setFragments.push(sql`category = ${nullIfEmpty(updates.category)}`);
      if (updates.subcategory !== undefined) setFragments.push(sql`subcategory = ${nullIfEmpty(updates.subcategory)}`);
      if (updates.jurisdiction !== undefined) setFragments.push(sql`jurisdiction = ${nullIfEmpty(updates.jurisdiction)}`);
      if (updates.regulatoryBody !== undefined) setFragments.push(sql`regulatory_body = ${nullIfEmpty(updates.regulatoryBody)}`);
      if (updates.recurrence !== undefined) setFragments.push(sql`recurrence = ${nullIfEmpty(updates.recurrence)}`);
      if (updates.customRecurrenceDays !== undefined) setFragments.push(sql`custom_recurrence_days = ${numericOrNull(updates.customRecurrenceDays)}`);
      if (updates.dueDate !== undefined) setFragments.push(sql`due_date = ${nullIfEmpty(updates.dueDate)}`);
      if (updates.assignedToName !== undefined) setFragments.push(sql`assigned_to_name = ${nullIfEmpty(updates.assignedToName)}`);
      if (updates.assignedToEmail !== undefined) setFragments.push(sql`assigned_to_email = ${nullIfEmpty(updates.assignedToEmail)}`);
      if (updates.status !== undefined) setFragments.push(sql`status = ${nullIfEmpty(updates.status)}`);
      if (updates.priority !== undefined) setFragments.push(sql`priority = ${nullIfEmpty(updates.priority)}`);
      if (updates.portalUrl !== undefined) setFragments.push(sql`portal_url = ${nullIfEmpty(updates.portalUrl)}`);
      if (updates.portalUsername !== undefined) setFragments.push(sql`portal_username = ${nullIfEmpty(updates.portalUsername)}`);
      if (updates.portalNotes !== undefined) setFragments.push(sql`portal_notes = ${nullIfEmpty(updates.portalNotes)}`);
      if (updates.completionNotes !== undefined) setFragments.push(sql`completion_notes = ${nullIfEmpty(updates.completionNotes)}`);
      if (updates.confirmationNumber !== undefined) setFragments.push(sql`confirmation_number = ${nullIfEmpty(updates.confirmationNumber)}`);
      if (updates.isActive !== undefined) setFragments.push(sql`is_active = ${updates.isActive}`);

      // Handle encrypted password
      if (encryptedPassword) {
        setFragments.push(sql`portal_password = ${encryptedPassword}`);
      }

      // Handle completed status
      if (completedAt) {
        setFragments.push(sql`completed_at = ${completedAt}`);
        setFragments.push(sql`completed_by_id = ${completedById}`);
      }

      // Handle array fields - convert to PostgreSQL array format
      if (updates.reminderDays !== undefined && Array.isArray(updates.reminderDays)) {
        const arrayStr = `{${updates.reminderDays.join(',')}}`;
        setFragments.push(sql`reminder_days = ${arrayStr}::integer[]`);
      }

      if (updates.tags !== undefined && Array.isArray(updates.tags)) {
        const arrayStr = `{${updates.tags.map((t: string) => `"${t.replace(/"/g, '\\"')}"`).join(',')}}`;
        setFragments.push(sql`tags = ${arrayStr}::text[]`);
      }

      // Always update timestamp
      setFragments.push(sql`updated_at = NOW()`);

      // Build the complete query using sql.join
      const setClause = sql.join(setFragments, sql`, `);
      const result = await db.execute(sql`UPDATE compliance_tasks SET ${setClause} WHERE id = ${id} RETURNING *`);

      // Log changes to history
      for (const entry of logEntries) {
        await db.execute(sql`
          INSERT INTO compliance_task_history (
            task_id, changed_by_id, changed_by_name, action, field_changed, old_value, new_value
          ) VALUES (
            ${id}, ${userId || null}, ${userName}, 'updated', 
            ${entry.field}, ${String(entry.oldValue)}, ${String(entry.newValue)}
          )
        `);
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating compliance task:', error);
      res.status(500).json({ message: 'Failed to update compliance task' });
    }
  });

  // Delete compliance task (soft delete)
  app.delete('/api/compliance/tasks/:id', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub;
      const userName = req.user?.claims?.email || 'Admin';

      await db.execute(sql`
        UPDATE compliance_tasks SET is_active = false, updated_at = NOW() WHERE id = ${id}
      `);

      await db.execute(sql`
        INSERT INTO compliance_task_history (task_id, changed_by_id, changed_by_name, action)
        VALUES (${id}, ${userId || null}, ${userName}, 'deleted')
      `);

      res.json({ message: 'Task deleted successfully' });
    } catch (error) {
      console.error('Error deleting compliance task:', error);
      res.status(500).json({ message: 'Failed to delete compliance task' });
    }
  });

  // Send compliance reminder email
  app.post('/api/compliance/tasks/:id/send-reminder', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const taskResult = await db.execute(sql`
        SELECT * FROM compliance_tasks WHERE id = ${id}
      `);
      
      if (taskResult.rows.length === 0) {
        return res.status(404).json({ message: 'Task not found' });
      }

      const task = taskResult.rows[0] as any;

      if (!task.assigned_to_email) {
        return res.status(400).json({ message: 'No assignee email configured for this task' });
      }

      if (!process.env.SENDGRID_API_KEY) {
        return res.status(500).json({ message: 'Email service not configured' });
      }

      // Calculate days until due
      const dueDate = task.due_date ? new Date(task.due_date) : null;
      const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

      const subject = `Compliance Reminder: ${task.task_name}`;
      const html = generateComplianceReminderEmail(task, daysUntilDue);

      const msg = {
        to: task.assigned_to_email,
        from: 'support@nasobawinery.com',
        subject,
        html,
        text: `Compliance Reminder: ${task.task_name}\n\nDue Date: ${dueDate?.toLocaleDateString() || 'Not set'}\nCategory: ${task.category}\nPriority: ${task.priority}\n\nDescription: ${task.description || 'N/A'}`
      };

      await sgMail.send(msg);

      // Log the reminder
      await db.execute(sql`
        INSERT INTO compliance_reminders (task_id, sent_to_email, sent_to_name, method, subject, status, days_before_due)
        VALUES (${id}, ${task.assigned_to_email}, ${task.assigned_to_name || null}, 'email', ${subject}, 'sent', ${daysUntilDue || null})
      `);

      // Update last reminder sent
      await db.execute(sql`
        UPDATE compliance_tasks SET last_reminder_sent = NOW() WHERE id = ${id}
      `);

      res.json({ message: 'Reminder sent successfully' });
    } catch (error) {
      console.error('Error sending compliance reminder:', error);
      res.status(500).json({ message: 'Failed to send reminder' });
    }
  });

  // Archive compliance task (stops recurrence)
  app.post('/api/compliance/tasks/:id/archive', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub;
      const userName = req.user?.claims?.email || 'Admin';

      const taskResult = await db.execute(sql`
        SELECT * FROM compliance_tasks WHERE id = ${id}
      `);

      if (taskResult.rows.length === 0) {
        return res.status(404).json({ message: 'Task not found' });
      }

      await db.execute(sql`
        UPDATE compliance_tasks 
        SET is_active = false, 
            status = 'cancelled',
            archived_at = NOW(),
            updated_at = NOW() 
        WHERE id = ${id}
      `);

      await db.execute(sql`
        INSERT INTO compliance_task_history (task_id, changed_by_id, changed_by_name, action)
        VALUES (${id}, ${userId || null}, ${userName}, 'archived')
      `);

      res.json({ message: 'Task archived successfully' });
    } catch (error) {
      console.error('Error archiving compliance task:', error);
      res.status(500).json({ message: 'Failed to archive compliance task' });
    }
  });

  // Complete compliance task and move to next cycle
  app.post('/api/compliance/tasks/:id/complete', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { completionNotes, confirmationNumber, actualCost } = req.body;
      const userId = req.user?.claims?.sub;
      const userName = req.user?.claims?.email || 'Admin';

      const taskResult = await db.execute(sql`
        SELECT * FROM compliance_tasks WHERE id = ${id}
      `);

      if (taskResult.rows.length === 0) {
        return res.status(404).json({ message: 'Task not found' });
      }

      const task = taskResult.rows[0] as any;
      const currentDueDate = task.due_date ? new Date(task.due_date) : new Date();
      const recurrence = task.recurrence as string;
      const customRecurrenceDays = task.custom_recurrence_days;

      // Calculate next due date based on recurrence
      let nextDueDate: Date | null = null;
      switch (recurrence) {
        case "daily":
          nextDueDate = new Date(currentDueDate);
          nextDueDate.setDate(nextDueDate.getDate() + 1);
          break;
        case "weekly":
          nextDueDate = new Date(currentDueDate);
          nextDueDate.setDate(nextDueDate.getDate() + 7);
          break;
        case "monthly":
          nextDueDate = new Date(currentDueDate);
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          break;
        case "quarterly":
          nextDueDate = new Date(currentDueDate);
          nextDueDate.setMonth(nextDueDate.getMonth() + 3);
          break;
        case "semi_annual":
          nextDueDate = new Date(currentDueDate);
          nextDueDate.setMonth(nextDueDate.getMonth() + 6);
          break;
        case "annual":
          nextDueDate = new Date(currentDueDate);
          nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
          break;
        case "custom":
          if (customRecurrenceDays && customRecurrenceDays > 0) {
            nextDueDate = new Date(currentDueDate);
            nextDueDate.setDate(nextDueDate.getDate() + customRecurrenceDays);
          }
          break;
      }

      // Log completion to history
      await db.execute(sql`
        INSERT INTO compliance_task_history (
          task_id, changed_by_id, changed_by_name, action, 
          field_changed, old_value, new_value
        )
        VALUES (
          ${id}, ${userId || null}, ${userName}, 'completed',
          'completed_cycle', ${currentDueDate.toISOString()}, ${nextDueDate ? nextDueDate.toISOString() : 'one_time_completed'}
        )
      `);

      if (recurrence === "one_time" || !nextDueDate) {
        // One-time task: just mark as completed
        await db.execute(sql`
          UPDATE compliance_tasks 
          SET status = 'completed',
              completed_at = NOW(),
              completed_by_id = ${userId || null},
              completion_notes = ${completionNotes || null},
              confirmation_number = ${confirmationNumber || null},
              actual_cost = ${actualCost || null},
              updated_at = NOW()
          WHERE id = ${id}
        `);
        res.json({ message: 'Task completed successfully', nextCycle: false });
      } else {
        // Recurring task: reset for next cycle
        await db.execute(sql`
          UPDATE compliance_tasks 
          SET status = 'pending',
              due_date = ${nextDueDate},
              completed_at = NULL,
              completed_by_id = NULL,
              completion_notes = NULL,
              confirmation_number = NULL,
              actual_cost = NULL,
              last_reminder_sent = NULL,
              updated_at = NOW()
          WHERE id = ${id}
        `);
        res.json({ 
          message: 'Task completed and moved to next cycle', 
          nextCycle: true,
          nextDueDate: nextDueDate.toISOString()
        });
      }
    } catch (error) {
      console.error('Error completing compliance task:', error);
      res.status(500).json({ message: 'Failed to complete compliance task' });
    }
  });

  // Duplicate compliance task
  app.post('/api/compliance/tasks/:id/duplicate', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { taskName, jurisdiction, regulatoryBody } = req.body; // Optional overrides
      const userId = req.user?.claims?.sub;
      const userName = req.user?.claims?.email || 'Admin';

      const taskResult = await db.execute(sql`
        SELECT * FROM compliance_tasks WHERE id = ${id}
      `);

      if (taskResult.rows.length === 0) {
        return res.status(404).json({ message: 'Task not found' });
      }

      const originalTask = taskResult.rows[0] as any;

      // Create duplicate with optional overrides
      const newTaskName = taskName || `${originalTask.task_name} (Copy)`;
      const newJurisdiction = jurisdiction !== undefined ? jurisdiction : originalTask.jurisdiction;
      const newRegulatoryBody = regulatoryBody !== undefined ? regulatoryBody : originalTask.regulatory_body;

      // Format array fields for PostgreSQL
      const reminderDaysArray = originalTask.reminder_days 
        ? `{${Array.isArray(originalTask.reminder_days) ? originalTask.reminder_days.join(',') : originalTask.reminder_days}}`
        : null;
      const tagsArray = originalTask.tags 
        ? `{${Array.isArray(originalTask.tags) ? originalTask.tags.map((t: string) => `"${t.replace(/"/g, '\\"')}"`).join(',') : originalTask.tags}}`
        : null;

      const newTaskResult = await db.execute(sql`
        INSERT INTO compliance_tasks (
          task_name, description, category, subcategory, jurisdiction, regulatory_body,
          recurrence, custom_recurrence_days, due_date, reminder_days,
          assigned_to_name, assigned_to_email, status, priority,
          portal_url, portal_username, portal_password, portal_notes,
          estimated_cost, penalty_amount, tags, created_by_id, is_active
        ) VALUES (
          ${newTaskName},
          ${originalTask.description},
          ${originalTask.category},
          ${originalTask.subcategory},
          ${newJurisdiction},
          ${newRegulatoryBody},
          ${originalTask.recurrence},
          ${originalTask.custom_recurrence_days},
          ${originalTask.due_date},
          ${reminderDaysArray}::integer[],
          ${originalTask.assigned_to_name},
          ${originalTask.assigned_to_email},
          'pending',
          ${originalTask.priority},
          ${originalTask.portal_url},
          ${originalTask.portal_username},
          ${originalTask.portal_password},
          ${originalTask.portal_notes},
          ${originalTask.estimated_cost},
          ${originalTask.penalty_amount},
          ${tagsArray}::text[],
          ${userId || null},
          true
        )
        RETURNING *
      `);

      const newTask = newTaskResult.rows[0] as any;

      // Log the duplication
      await db.execute(sql`
        INSERT INTO compliance_task_history (task_id, changed_by_id, changed_by_name, action, field_changed, old_value, new_value)
        VALUES (${newTask.id}, ${userId || null}, ${userName}, 'created', 'duplicated_from', ${id}, ${newTask.id})
      `);

      res.json({ 
        message: 'Task duplicated successfully',
        task: newTask
      });
    } catch (error) {
      console.error('Error duplicating compliance task:', error);
      res.status(500).json({ message: 'Failed to duplicate compliance task' });
    }
  });

  // Get compliance dashboard stats
  app.get('/api/compliance/stats', isAdmin, async (req, res) => {
    try {
      const stats = await db.execute(sql`
        SELECT 
          COUNT(*) FILTER (WHERE is_active = true) as total_tasks,
          COUNT(*) FILTER (WHERE status = 'pending' AND is_active = true) as pending,
          COUNT(*) FILTER (WHERE status = 'in_progress' AND is_active = true) as in_progress,
          COUNT(*) FILTER (WHERE status = 'completed' AND is_active = true) as completed,
          COUNT(*) FILTER (WHERE status = 'overdue' AND is_active = true) as overdue,
          COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed', 'cancelled') AND is_active = true) as past_due,
          COUNT(*) FILTER (WHERE due_date BETWEEN NOW() AND NOW() + INTERVAL '7 days' AND status NOT IN ('completed', 'cancelled') AND is_active = true) as due_this_week,
          COUNT(*) FILTER (WHERE due_date BETWEEN NOW() AND NOW() + INTERVAL '30 days' AND status NOT IN ('completed', 'cancelled') AND is_active = true) as due_this_month
        FROM compliance_tasks
      `);
      res.json(stats.rows[0]);
    } catch (error) {
      console.error('Error fetching compliance stats:', error);
      res.status(500).json({ message: 'Failed to fetch compliance stats' });
    }
  });

  // Get upcoming deadlines
  app.get('/api/compliance/upcoming', isAdmin, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT * FROM compliance_tasks 
        WHERE is_active = true 
          AND status NOT IN ('completed', 'cancelled')
          AND due_date IS NOT NULL
          AND due_date >= NOW()
        ORDER BY due_date ASC
        LIMIT 10
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching upcoming deadlines:', error);
      res.status(500).json({ message: 'Failed to fetch upcoming deadlines' });
    }
  });

  // ============================================
  // LMS SKILL VERIFICATION ROUTES
  // Manager/peer sign-off for hands-on skills
  // ============================================

  // Get pending verification requests for managers
  app.get('/api/lms/verifications/pending', isAdmin, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT v.*, 
               pu.first_name as user_first_name, pu.last_name as user_last_name, pu.email as user_email,
               c.title as course_title, l.title as lesson_title
        FROM lms_skill_verifications v
        JOIN platform_users pu ON v.user_id = pu.id
        JOIN lms_courses c ON v.course_id = c.id
        LEFT JOIN lms_lessons l ON v.lesson_id = l.id
        WHERE v.status = 'pending'
        ORDER BY v.requested_at DESC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching pending verifications:', error);
      res.status(500).json({ message: 'Failed to fetch verifications' });
    }
  });

  // Request skill verification (learner)
  app.post('/api/lms/verifications/request', isAuthenticated, async (req: any, res) => {
    try {
      const { enrollmentId, courseId, lessonId, skillName, description, evidenceUrl, evidenceType, checklistItems } = req.body;
      const userEmail = req.user?.claims?.email;
      
      if (!userEmail) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const userResult = await db.execute(sql`SELECT id FROM platform_users WHERE email = ${userEmail}`);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      const userId = userResult.rows[0].id;
      
      const result = await db.execute(sql`
        INSERT INTO lms_skill_verifications (user_id, course_id, lesson_id, enrollment_id, skill_name, description, evidence_url, evidence_type, checklist_items)
        VALUES (${userId}, ${courseId}, ${lessonId || null}, ${enrollmentId}, ${skillName}, ${description}, ${evidenceUrl}, ${evidenceType}, ${checklistItems ? JSON.stringify(checklistItems) : null})
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error requesting verification:', error);
      res.status(500).json({ message: 'Failed to request verification' });
    }
  });

  // Approve or reject verification (manager)
  app.put('/api/lms/verifications/:id/review', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, reviewerNotes } = req.body;
      const reviewerEmail = req.user?.claims?.email;
      
      const reviewerResult = await db.execute(sql`SELECT id FROM platform_users WHERE email = ${reviewerEmail}`);
      const reviewerId = reviewerResult.rows[0]?.id;
      
      const result = await db.execute(sql`
        UPDATE lms_skill_verifications 
        SET status = ${status}, reviewer_id = ${reviewerId}, reviewer_notes = ${reviewerNotes}, reviewed_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Verification not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error reviewing verification:', error);
      res.status(500).json({ message: 'Failed to review verification' });
    }
  });

  // Get user's verification history
  app.get('/api/lms/verifications/my', isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user?.claims?.email;
      if (!userEmail) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const userResult = await db.execute(sql`SELECT id FROM platform_users WHERE email = ${userEmail}`);
      if (userResult.rows.length === 0) {
        return res.json([]);
      }
      const userId = userResult.rows[0].id;
      
      const result = await db.execute(sql`
        SELECT v.*, c.title as course_title, l.title as lesson_title,
               r.first_name as reviewer_first_name, r.last_name as reviewer_last_name
        FROM lms_skill_verifications v
        JOIN lms_courses c ON v.course_id = c.id
        LEFT JOIN lms_lessons l ON v.lesson_id = l.id
        LEFT JOIN platform_users r ON v.reviewer_id = r.id
        WHERE v.user_id = ${userId}
        ORDER BY v.requested_at DESC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching user verifications:', error);
      res.status(500).json({ message: 'Failed to fetch verifications' });
    }
  });

  // ============================================
  // SHARED LOCATIONS ROUTES
  // Platform-wide location management
  // ============================================

  app.get('/api/shared/locations', isAuthenticated, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT l.*, m.first_name as manager_first_name, m.last_name as manager_last_name
        FROM shared_locations l
        LEFT JOIN platform_users m ON l.manager_user_id = m.id
        WHERE l.active = true
        ORDER BY l.location_name ASC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching locations:', error);
      res.status(500).json({ message: 'Failed to fetch locations' });
    }
  });

  app.post('/api/shared/locations', isAdmin, async (req, res) => {
    try {
      const { locationName, locationType, address, city, state, zipCode, phoneNumber, managerUserId } = req.body;
      const result = await db.execute(sql`
        INSERT INTO shared_locations (location_name, location_type, address, city, state, zip_code, phone_number, manager_user_id)
        VALUES (${locationName}, ${locationType}, ${address || null}, ${city || null}, ${state || null}, ${zipCode || null}, ${phoneNumber || null}, ${managerUserId || null})
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error creating location:', error);
      res.status(500).json({ message: 'Failed to create location' });
    }
  });

  app.put('/api/shared/locations/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { locationName, locationType, address, city, state, zipCode, phoneNumber, managerUserId, active } = req.body;
      const result = await db.execute(sql`
        UPDATE shared_locations 
        SET location_name = ${locationName}, location_type = ${locationType}, address = ${address || null},
            city = ${city || null}, state = ${state || null}, zip_code = ${zipCode || null},
            phone_number = ${phoneNumber || null}, manager_user_id = ${managerUserId || null},
            active = ${active ?? true}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating location:', error);
      res.status(500).json({ message: 'Failed to update location' });
    }
  });

  app.delete('/api/shared/locations/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      // Soft delete by setting active = false
      await db.execute(sql`UPDATE shared_locations SET active = false, updated_at = NOW() WHERE id = ${id}`);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting location:', error);
      res.status(500).json({ message: 'Failed to delete location' });
    }
  });

  // ============================================
  // CMMS (MAINTENANCE) MODULE ROUTES
  // Work orders, assets, preventive maintenance
  // ============================================

  // Helper to generate work order numbers
  const generateWorkOrderNumber = async (): Promise<string> => {
    const prefix = 'WO';
    const year = new Date().getFullYear().toString().slice(-2);
    const result = await db.execute(sql`
      SELECT COUNT(*)::integer as count FROM maintenance_work_orders 
      WHERE work_order_number LIKE ${`${prefix}${year}%`}
    `);
    const count = (result.rows[0]?.count || 0) + 1;
    return `${prefix}${year}-${count.toString().padStart(5, '0')}`;
  };

  // Helper to generate asset numbers
  const generateAssetNumber = async (): Promise<string> => {
    const prefix = 'AST';
    const result = await db.execute(sql`
      SELECT COUNT(*)::integer as count FROM maintenance_assets
    `);
    const count = (result.rows[0]?.count || 0) + 1;
    return `${prefix}-${count.toString().padStart(6, '0')}`;
  };

  // --- Asset Categories ---
  app.get('/api/maintenance/categories', isAuthenticated, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT * FROM maintenance_asset_categories WHERE active = true ORDER BY sort_order ASC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching asset categories:', error);
      res.status(500).json({ message: 'Failed to fetch categories' });
    }
  });

  app.post('/api/maintenance/categories', isAdmin, async (req, res) => {
    try {
      const { name, description, icon, color, parentId, sortOrder } = req.body;
      const result = await db.execute(sql`
        INSERT INTO maintenance_asset_categories (name, description, icon, color, parent_id, sort_order)
        VALUES (${name}, ${description}, ${icon}, ${color}, ${parentId || null}, ${sortOrder || 0})
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error creating asset category:', error);
      res.status(500).json({ message: 'Failed to create category' });
    }
  });

  app.put('/api/maintenance/categories/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, icon, color, parentId, sortOrder, active } = req.body;
      const result = await db.execute(sql`
        UPDATE maintenance_asset_categories 
        SET name = ${name}, description = ${description}, icon = ${icon}, color = ${color},
            parent_id = ${parentId || null}, sort_order = ${sortOrder || 0}, active = ${active ?? true}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating asset category:', error);
      res.status(500).json({ message: 'Failed to update category' });
    }
  });

  // --- Assets ---
  app.get('/api/maintenance/assets', isAuthenticated, async (req, res) => {
    try {
      const { status, categoryId, locationId } = req.query;
      const result = await db.execute(sql`
        SELECT a.*, c.name as category_name, c.icon as category_icon, l.location_name
        FROM maintenance_assets a
        LEFT JOIN maintenance_asset_categories c ON a.category_id = c.id
        LEFT JOIN shared_locations l ON a.location_id = l.id
        WHERE 1=1
        ${status ? sql` AND a.status = ${status}` : sql``}
        ${categoryId ? sql` AND a.category_id = ${categoryId}` : sql``}
        ${locationId ? sql` AND a.location_id = ${locationId}` : sql``}
        ORDER BY a.name ASC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching assets:', error);
      res.status(500).json({ message: 'Failed to fetch assets' });
    }
  });

  app.get('/api/maintenance/assets/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await db.execute(sql`
        SELECT a.*, c.name as category_name, c.icon as category_icon, l.location_name
        FROM maintenance_assets a
        LEFT JOIN maintenance_asset_categories c ON a.category_id = c.id
        LEFT JOIN shared_locations l ON a.location_id = l.id
        WHERE a.id = ${id}
      `);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Asset not found' });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching asset:', error);
      res.status(500).json({ message: 'Failed to fetch asset' });
    }
  });

  app.post('/api/maintenance/assets', isAdmin, async (req, res) => {
    try {
      const { name, description, categoryId, locationId, manufacturer, model, serialNumber, purchaseDate, purchaseCost, warrantyExpires, expectedLifeYears, status, criticality, imageUrl, qrCode, specifications, documentUrls, notes } = req.body;
      const assetNumber = await generateAssetNumber();
      
      const result = await db.execute(sql`
        INSERT INTO maintenance_assets (asset_number, name, description, category_id, location_id, manufacturer, model, serial_number, purchase_date, purchase_cost, warranty_expires, expected_life_years, status, criticality, image_url, qr_code, specifications, document_urls, notes)
        VALUES (${assetNumber}, ${name}, ${description}, ${categoryId || null}, ${locationId || null}, ${manufacturer}, ${model}, ${serialNumber}, ${purchaseDate ? new Date(purchaseDate) : null}, ${purchaseCost}, ${warrantyExpires ? new Date(warrantyExpires) : null}, ${expectedLifeYears}, ${status || 'operational'}, ${criticality || 'medium'}, ${imageUrl}, ${qrCode}, ${specifications ? JSON.stringify(specifications) : null}, ${documentUrls || null}, ${notes})
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error creating asset:', error);
      res.status(500).json({ message: 'Failed to create asset' });
    }
  });

  app.put('/api/maintenance/assets/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, categoryId, locationId, manufacturer, model, serialNumber, purchaseDate, purchaseCost, warrantyExpires, expectedLifeYears, status, criticality, imageUrl, qrCode, specifications, documentUrls, notes } = req.body;
      
      const result = await db.execute(sql`
        UPDATE maintenance_assets SET
          name = ${name}, description = ${description}, category_id = ${categoryId || null}, location_id = ${locationId || null},
          manufacturer = ${manufacturer}, model = ${model}, serial_number = ${serialNumber},
          purchase_date = ${purchaseDate ? new Date(purchaseDate) : null}, purchase_cost = ${purchaseCost},
          warranty_expires = ${warrantyExpires ? new Date(warrantyExpires) : null}, expected_life_years = ${expectedLifeYears},
          status = ${status}, criticality = ${criticality}, image_url = ${imageUrl}, qr_code = ${qrCode},
          specifications = ${specifications ? JSON.stringify(specifications) : null}, document_urls = ${documentUrls || null},
          notes = ${notes}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating asset:', error);
      res.status(500).json({ message: 'Failed to update asset' });
    }
  });

  // --- Work Orders ---
  app.get('/api/maintenance/work-orders', isAuthenticated, async (req, res) => {
    try {
      const { status, priority, assignedToId, assetId } = req.query;
      const result = await db.execute(sql`
        SELECT wo.*, 
               a.name as asset_name, a.asset_number,
               l.location_name,
               req.first_name as requester_first_name, req.last_name as requester_last_name,
               asg.first_name as assignee_first_name, asg.last_name as assignee_last_name
        FROM maintenance_work_orders wo
        LEFT JOIN maintenance_assets a ON wo.asset_id = a.id
        LEFT JOIN shared_locations l ON wo.location_id = l.id
        LEFT JOIN platform_users req ON wo.requested_by_id = req.id
        LEFT JOIN platform_users asg ON wo.assigned_to_id = asg.id
        WHERE 1=1
        ${status ? sql` AND wo.status = ${status}` : sql``}
        ${priority ? sql` AND wo.priority = ${priority}` : sql``}
        ${assignedToId ? sql` AND wo.assigned_to_id = ${assignedToId}` : sql``}
        ${assetId ? sql` AND wo.asset_id = ${assetId}` : sql``}
        ORDER BY 
          CASE wo.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
          wo.due_date ASC NULLS LAST
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching work orders:', error);
      res.status(500).json({ message: 'Failed to fetch work orders' });
    }
  });

  app.get('/api/maintenance/work-orders/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await db.execute(sql`
        SELECT wo.*, 
               a.name as asset_name, a.asset_number, a.image_url as asset_image,
               l.location_name,
               req.first_name as requester_first_name, req.last_name as requester_last_name, req.email as requester_email,
               asg.first_name as assignee_first_name, asg.last_name as assignee_last_name, asg.email as assignee_email
        FROM maintenance_work_orders wo
        LEFT JOIN maintenance_assets a ON wo.asset_id = a.id
        LEFT JOIN shared_locations l ON wo.location_id = l.id
        LEFT JOIN platform_users req ON wo.requested_by_id = req.id
        LEFT JOIN platform_users asg ON wo.assigned_to_id = asg.id
        WHERE wo.id = ${id}
      `);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Work order not found' });
      }
      
      // Get comments
      const comments = await db.execute(sql`
        SELECT c.*, u.first_name, u.last_name
        FROM maintenance_work_order_comments c
        LEFT JOIN platform_users u ON c.user_id = u.id
        WHERE c.work_order_id = ${id}
        ORDER BY c.created_at ASC
      `);
      
      // Get parts usage
      const partsUsage = await db.execute(sql`
        SELECT pu.*, p.name as part_name, p.part_number
        FROM maintenance_parts_usage pu
        JOIN maintenance_parts p ON pu.part_id = p.id
        WHERE pu.work_order_id = ${id}
      `);
      
      res.json({
        ...result.rows[0],
        comments: comments.rows,
        partsUsed: partsUsage.rows
      });
    } catch (error) {
      console.error('Error fetching work order:', error);
      res.status(500).json({ message: 'Failed to fetch work order' });
    }
  });

  app.post('/api/maintenance/work-orders', isAuthenticated, async (req: any, res) => {
    try {
      const { title, description, assetId, locationId, maintenanceLocationId, workOrderType, priority, assignedToId, maintenanceTechnicianId, assignedTeam, dueDate, scheduledStart, scheduledEnd, estimatedHours, checklistItems, instructions, attachmentUrls, notificationEmail, sendNotification } = req.body;
      
      const workOrderNumber = await generateWorkOrderNumber();
      const requestedById = req.user?.claims?.email ? 
        (await db.execute(sql`SELECT id FROM platform_users WHERE email = ${req.user.claims.email}`)).rows[0]?.id : null;
      
      const result = await db.execute(sql`
        INSERT INTO maintenance_work_orders (work_order_number, title, description, asset_id, location_id, maintenance_location_id, work_order_type, priority, status, requested_by_id, assigned_to_id, maintenance_technician_id, assigned_team, due_date, scheduled_start, scheduled_end, estimated_hours, checklist_items, instructions, attachment_urls, notification_email)
        VALUES (${workOrderNumber}, ${title}, ${description}, ${assetId || null}, ${locationId || null}, ${maintenanceLocationId || null}, ${workOrderType || 'corrective'}, ${priority || 'medium'}, 'open', ${requestedById}, ${assignedToId || null}, ${maintenanceTechnicianId || null}, ${assignedTeam}, ${dueDate ? new Date(dueDate) : null}, ${scheduledStart ? new Date(scheduledStart) : null}, ${scheduledEnd ? new Date(scheduledEnd) : null}, ${estimatedHours}, ${checklistItems ? JSON.stringify(checklistItems) : null}, ${instructions}, ${attachmentUrls || null}, ${notificationEmail || null})
        RETURNING *
      `);
      
      const workOrder = result.rows[0] as any;
      
      // Send notification if requested
      if (sendNotification && notificationEmail) {
        try {
          // Get related data for email
          const woResult = await db.execute(sql`
            SELECT wo.*, 
                   a.name as asset_name, a.asset_number,
                   ml.name as maint_location_name,
                   sl.location_name as shared_location_name,
                   t.first_name as tech_first_name, t.last_name as tech_last_name,
                   r.first_name as requester_first_name, r.last_name as requester_last_name
            FROM maintenance_work_orders wo
            LEFT JOIN maintenance_assets a ON wo.asset_id = a.id
            LEFT JOIN maintenance_locations ml ON wo.maintenance_location_id = ml.id
            LEFT JOIN shared_locations sl ON wo.location_id = sl.id
            LEFT JOIN maintenance_technicians t ON wo.maintenance_technician_id = t.id
            LEFT JOIN platform_users r ON wo.requested_by_id = r.id
            WHERE wo.id = ${workOrder.id}
          `);
          
          const wo = woResult.rows[0] as any;
          const locationName = wo.maint_location_name || wo.shared_location_name;
          const assigneeName = wo.tech_first_name ? `${wo.tech_first_name} ${wo.tech_last_name}` : undefined;
          const requestedByName = wo.requester_first_name ? `${wo.requester_first_name} ${wo.requester_last_name}` : undefined;
          
          const emailContent = generateWorkOrderNotificationEmail({
            workOrderNumber: wo.work_order_number,
            title: wo.title,
            description: wo.description,
            assetName: wo.asset_name ? `${wo.asset_name} (${wo.asset_number})` : undefined,
            locationName,
            priority: wo.priority || 'medium',
            status: wo.status || 'open',
            dueDate: wo.due_date,
            assigneeName,
            requestedByName,
            instructions: wo.instructions
          });
          
          await sendEmail(notificationEmail, emailContent.subject, emailContent.html, emailContent.text);
          
          // Update notification status
          await db.execute(sql`
            UPDATE maintenance_work_orders SET
              notification_sent = true,
              notification_sent_at = NOW()
            WHERE id = ${workOrder.id}
          `);
        } catch (emailError) {
          console.error('Failed to send notification email:', emailError);
          // Don't fail the work order creation if email fails
        }
      }
      
      res.json(workOrder);
    } catch (error) {
      console.error('Error creating work order:', error);
      res.status(500).json({ message: 'Failed to create work order' });
    }
  });

  app.put('/api/maintenance/work-orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { title, description, assetId, locationId, workOrderType, priority, status, assignedToId, assignedTeam, dueDate, scheduledStart, scheduledEnd, estimatedHours, actualHours, laborCost, partsCost, externalCost, completionNotes, failureReason, checklistItems, instructions, attachmentUrls } = req.body;
      
      let completedById = null;
      if (status === 'completed') {
        const userEmail = req.user?.claims?.email;
        if (userEmail) {
          const userResult = await db.execute(sql`SELECT id FROM platform_users WHERE email = ${userEmail}`);
          completedById = userResult.rows[0]?.id;
        }
      }
      
      const result = await db.execute(sql`
        UPDATE maintenance_work_orders SET
          title = ${title}, description = ${description}, asset_id = ${assetId || null}, location_id = ${locationId || null},
          work_order_type = ${workOrderType}, priority = ${priority}, status = ${status},
          assigned_to_id = ${assignedToId || null}, assigned_team = ${assignedTeam},
          due_date = ${dueDate ? new Date(dueDate) : null}, scheduled_start = ${scheduledStart ? new Date(scheduledStart) : null},
          scheduled_end = ${scheduledEnd ? new Date(scheduledEnd) : null}, estimated_hours = ${estimatedHours},
          actual_hours = ${actualHours}, labor_cost = ${laborCost}, parts_cost = ${partsCost}, external_cost = ${externalCost},
          completed_by_id = ${completedById}, completion_notes = ${completionNotes}, failure_reason = ${failureReason},
          checklist_items = ${checklistItems ? JSON.stringify(checklistItems) : null}, instructions = ${instructions},
          attachment_urls = ${attachmentUrls || null},
          actual_start = ${status === 'in_progress' ? sql`COALESCE(actual_start, NOW())` : sql`actual_start`},
          actual_end = ${status === 'completed' ? sql`NOW()` : sql`actual_end`},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating work order:', error);
      res.status(500).json({ message: 'Failed to update work order' });
    }
  });

  // Add comment to work order
  app.post('/api/maintenance/work-orders/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { comment, attachmentUrls } = req.body;
      const userEmail = req.user?.claims?.email;
      const userResult = await db.execute(sql`SELECT id FROM platform_users WHERE email = ${userEmail}`);
      const userId = userResult.rows[0]?.id;
      
      const result = await db.execute(sql`
        INSERT INTO maintenance_work_order_comments (work_order_id, user_id, comment, attachment_urls)
        VALUES (${id}, ${userId}, ${comment}, ${attachmentUrls || null})
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({ message: 'Failed to add comment' });
    }
  });

  // Send work order notification email
  app.post('/api/maintenance/work-orders/:id/send-notification', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email address is required' });
      }
      
      // Get work order with related data
      const woResult = await db.execute(sql`
        SELECT wo.*, 
               a.name as asset_name, a.asset_number,
               ml.name as maint_location_name,
               sl.location_name as shared_location_name,
               t.first_name as tech_first_name, t.last_name as tech_last_name,
               r.first_name as requester_first_name, r.last_name as requester_last_name
        FROM maintenance_work_orders wo
        LEFT JOIN maintenance_assets a ON wo.asset_id = a.id
        LEFT JOIN maintenance_locations ml ON wo.maintenance_location_id = ml.id
        LEFT JOIN shared_locations sl ON wo.location_id = sl.id
        LEFT JOIN maintenance_technicians t ON wo.maintenance_technician_id = t.id
        LEFT JOIN platform_users r ON wo.requested_by_id = r.id
        WHERE wo.id = ${id}
      `);
      
      if (woResult.rows.length === 0) {
        return res.status(404).json({ message: 'Work order not found' });
      }
      
      const wo = woResult.rows[0] as any;
      const locationName = wo.maint_location_name || wo.shared_location_name;
      const assigneeName = wo.tech_first_name ? `${wo.tech_first_name} ${wo.tech_last_name}` : undefined;
      const requestedByName = wo.requester_first_name ? `${wo.requester_first_name} ${wo.requester_last_name}` : undefined;
      
      // Generate email content
      const emailContent = generateWorkOrderNotificationEmail({
        workOrderNumber: wo.work_order_number,
        title: wo.title,
        description: wo.description,
        assetName: wo.asset_name ? `${wo.asset_name} (${wo.asset_number})` : undefined,
        locationName,
        priority: wo.priority || 'medium',
        status: wo.status || 'open',
        dueDate: wo.due_date,
        assigneeName,
        requestedByName,
        instructions: wo.instructions
      });
      
      // Send email
      await sendEmail(email, emailContent.subject, emailContent.html, emailContent.text);
      
      // Update work order with notification info
      await db.execute(sql`
        UPDATE maintenance_work_orders SET
          notification_email = ${email},
          notification_sent = true,
          notification_sent_at = NOW()
        WHERE id = ${id}
      `);
      
      res.json({ success: true, message: `Notification sent to ${email}` });
    } catch (error) {
      console.error('Error sending work order notification:', error);
      res.status(500).json({ message: 'Failed to send notification' });
    }
  });

  // --- Parts/Inventory ---
  app.get('/api/maintenance/parts', isAuthenticated, async (req, res) => {
    try {
      const { category, lowStock, locationId } = req.query;
      const result = await db.execute(sql`
        SELECT p.*, l.location_name
        FROM maintenance_parts p
        LEFT JOIN shared_locations l ON p.location_id = l.id
        WHERE p.active = true
        ${category ? sql` AND p.category = ${category}` : sql``}
        ${locationId ? sql` AND p.location_id = ${locationId}` : sql``}
        ${lowStock === 'true' ? sql` AND p.quantity_on_hand <= p.reorder_point` : sql``}
        ORDER BY p.name ASC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching parts:', error);
      res.status(500).json({ message: 'Failed to fetch parts' });
    }
  });

  app.post('/api/maintenance/parts', isAdmin, async (req, res) => {
    try {
      const { partNumber, name, description, category, locationId, binLocation, quantityOnHand, minimumStock, reorderPoint, reorderQuantity, unitCost, preferredVendor, vendorPartNumber, leadTimeDays, imageUrl } = req.body;
      
      const totalValue = (quantityOnHand || 0) * (unitCost || 0);
      
      const result = await db.execute(sql`
        INSERT INTO maintenance_parts (part_number, name, description, category, location_id, bin_location, quantity_on_hand, minimum_stock, reorder_point, reorder_quantity, unit_cost, total_value, preferred_vendor, vendor_part_number, lead_time_days, image_url)
        VALUES (${partNumber}, ${name}, ${description}, ${category}, ${locationId || null}, ${binLocation}, ${quantityOnHand || 0}, ${minimumStock || 0}, ${reorderPoint || 0}, ${reorderQuantity || 1}, ${unitCost}, ${totalValue}, ${preferredVendor}, ${vendorPartNumber}, ${leadTimeDays}, ${imageUrl})
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error creating part:', error);
      res.status(500).json({ message: 'Failed to create part' });
    }
  });

  app.put('/api/maintenance/parts/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { partNumber, name, description, category, locationId, binLocation, quantityOnHand, minimumStock, reorderPoint, reorderQuantity, unitCost, preferredVendor, vendorPartNumber, leadTimeDays, imageUrl, active } = req.body;
      
      const totalValue = (quantityOnHand || 0) * (unitCost || 0);
      
      const result = await db.execute(sql`
        UPDATE maintenance_parts SET
          part_number = ${partNumber}, name = ${name}, description = ${description}, category = ${category},
          location_id = ${locationId || null}, bin_location = ${binLocation}, quantity_on_hand = ${quantityOnHand || 0},
          minimum_stock = ${minimumStock || 0}, reorder_point = ${reorderPoint || 0}, reorder_quantity = ${reorderQuantity || 1},
          unit_cost = ${unitCost}, total_value = ${totalValue}, preferred_vendor = ${preferredVendor},
          vendor_part_number = ${vendorPartNumber}, lead_time_days = ${leadTimeDays}, image_url = ${imageUrl},
          active = ${active ?? true}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating part:', error);
      res.status(500).json({ message: 'Failed to update part' });
    }
  });

  // Record part usage on work order
  app.post('/api/maintenance/work-orders/:id/parts', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { partId, quantity, notes } = req.body;
      const userEmail = req.user?.claims?.email;
      const userResult = await db.execute(sql`SELECT id FROM platform_users WHERE email = ${userEmail}`);
      const usedById = userResult.rows[0]?.id;
      
      // Get part info
      const partResult = await db.execute(sql`SELECT unit_cost, quantity_on_hand FROM maintenance_parts WHERE id = ${partId}`);
      const part = partResult.rows[0] as any;
      const unitCost = part?.unit_cost || 0;
      const totalCost = quantity * unitCost;
      
      // Record usage
      const result = await db.execute(sql`
        INSERT INTO maintenance_parts_usage (work_order_id, part_id, quantity, unit_cost, total_cost, used_by_id, notes)
        VALUES (${id}, ${partId}, ${quantity}, ${unitCost}, ${totalCost}, ${usedById}, ${notes})
        RETURNING *
      `);
      
      // Update inventory
      await db.execute(sql`
        UPDATE maintenance_parts SET 
          quantity_on_hand = quantity_on_hand - ${quantity},
          last_used = NOW(),
          total_value = (quantity_on_hand - ${quantity}) * unit_cost,
          updated_at = NOW()
        WHERE id = ${partId}
      `);
      
      // Update work order parts cost
      await db.execute(sql`
        UPDATE maintenance_work_orders SET
          parts_cost = COALESCE(parts_cost, 0) + ${totalCost},
          updated_at = NOW()
        WHERE id = ${id}
      `);
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error recording part usage:', error);
      res.status(500).json({ message: 'Failed to record part usage' });
    }
  });

  // --- Preventive Maintenance Schedules ---
  app.get('/api/maintenance/pm-schedules', isAuthenticated, async (req, res) => {
    try {
      const { assetId, active } = req.query;
      const result = await db.execute(sql`
        SELECT pm.*, a.name as asset_name, a.asset_number, u.first_name as assignee_first_name, u.last_name as assignee_last_name
        FROM maintenance_preventive_schedules pm
        LEFT JOIN maintenance_assets a ON pm.asset_id = a.id
        LEFT JOIN platform_users u ON pm.assigned_to_id = u.id
        WHERE 1=1
        ${assetId ? sql` AND pm.asset_id = ${assetId}` : sql``}
        ${active === 'true' ? sql` AND pm.active = true` : sql``}
        ORDER BY pm.next_due ASC NULLS LAST
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching PM schedules:', error);
      res.status(500).json({ message: 'Failed to fetch PM schedules' });
    }
  });

  app.post('/api/maintenance/pm-schedules', isAdmin, async (req, res) => {
    try {
      const { name, description, assetId, categoryId, frequency, customDays, startDate, endDate, workOrderTitle, workOrderDescription, workOrderPriority, estimatedHours, assignedToId, assignedTeam, checklistItems, instructions, generateDaysAhead } = req.body;
      
      const result = await db.execute(sql`
        INSERT INTO maintenance_preventive_schedules (name, description, asset_id, category_id, frequency, custom_days, start_date, end_date, next_due, work_order_title, work_order_description, work_order_priority, estimated_hours, assigned_to_id, assigned_team, checklist_items, instructions, generate_days_ahead)
        VALUES (${name}, ${description}, ${assetId || null}, ${categoryId || null}, ${frequency || 'monthly'}, ${customDays}, ${new Date(startDate)}, ${endDate ? new Date(endDate) : null}, ${new Date(startDate)}, ${workOrderTitle}, ${workOrderDescription}, ${workOrderPriority || 'medium'}, ${estimatedHours}, ${assignedToId || null}, ${assignedTeam}, ${checklistItems ? JSON.stringify(checklistItems) : null}, ${instructions}, ${generateDaysAhead || 7})
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error creating PM schedule:', error);
      res.status(500).json({ message: 'Failed to create PM schedule' });
    }
  });

  app.put('/api/maintenance/pm-schedules/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, assetId, categoryId, frequency, customDays, startDate, endDate, workOrderTitle, workOrderDescription, workOrderPriority, estimatedHours, assignedToId, assignedTeam, checklistItems, instructions, generateDaysAhead, active } = req.body;
      
      const result = await db.execute(sql`
        UPDATE maintenance_preventive_schedules SET
          name = ${name}, description = ${description}, asset_id = ${assetId || null}, category_id = ${categoryId || null},
          frequency = ${frequency}, custom_days = ${customDays}, start_date = ${new Date(startDate)},
          end_date = ${endDate ? new Date(endDate) : null}, work_order_title = ${workOrderTitle},
          work_order_description = ${workOrderDescription}, work_order_priority = ${workOrderPriority},
          estimated_hours = ${estimatedHours}, assigned_to_id = ${assignedToId || null}, assigned_team = ${assignedTeam},
          checklist_items = ${checklistItems ? JSON.stringify(checklistItems) : null}, instructions = ${instructions},
          generate_days_ahead = ${generateDaysAhead || 7}, active = ${active ?? true}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating PM schedule:', error);
      res.status(500).json({ message: 'Failed to update PM schedule' });
    }
  });

  // --- Maintenance Locations ---
  app.get('/api/maintenance/locations', isAuthenticated, async (req, res) => {
    try {
      const { activeOnly } = req.query;
      const result = await db.execute(sql`
        SELECT ml.*, pl.name as parent_location_name
        FROM maintenance_locations ml
        LEFT JOIN maintenance_locations pl ON ml.parent_location_id = pl.id
        WHERE 1=1
        ${activeOnly === 'true' ? sql` AND ml.is_active = true` : sql``}
        ORDER BY ml.building, ml.floor, ml.name
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching maintenance locations:', error);
      res.status(500).json({ message: 'Failed to fetch locations' });
    }
  });

  app.get('/api/maintenance/locations/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await db.execute(sql`
        SELECT ml.*, pl.name as parent_location_name
        FROM maintenance_locations ml
        LEFT JOIN maintenance_locations pl ON ml.parent_location_id = pl.id
        WHERE ml.id = ${id}
      `);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Location not found' });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching maintenance location:', error);
      res.status(500).json({ message: 'Failed to fetch location' });
    }
  });

  app.post('/api/maintenance/locations', isAdmin, async (req, res) => {
    try {
      const { name, description, locationType, building, floor, room, address, contactName, contactPhone, contactEmail, parentLocationId, isActive, notes } = req.body;
      
      const result = await db.execute(sql`
        INSERT INTO maintenance_locations (name, description, location_type, building, floor, room, address, contact_name, contact_phone, contact_email, parent_location_id, is_active, notes)
        VALUES (${name}, ${description || null}, ${locationType || null}, ${building || null}, ${floor || null}, ${room || null}, ${address || null}, ${contactName || null}, ${contactPhone || null}, ${contactEmail || null}, ${parentLocationId || null}, ${isActive ?? true}, ${notes || null})
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error creating maintenance location:', error);
      res.status(500).json({ message: 'Failed to create location' });
    }
  });

  app.put('/api/maintenance/locations/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, locationType, building, floor, room, address, contactName, contactPhone, contactEmail, parentLocationId, isActive, notes } = req.body;
      
      const result = await db.execute(sql`
        UPDATE maintenance_locations SET
          name = ${name}, description = ${description || null}, location_type = ${locationType || null},
          building = ${building || null}, floor = ${floor || null}, room = ${room || null},
          address = ${address || null}, contact_name = ${contactName || null}, contact_phone = ${contactPhone || null},
          contact_email = ${contactEmail || null}, parent_location_id = ${parentLocationId || null},
          is_active = ${isActive ?? true}, notes = ${notes || null}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating maintenance location:', error);
      res.status(500).json({ message: 'Failed to update location' });
    }
  });

  app.delete('/api/maintenance/locations/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await db.execute(sql`DELETE FROM maintenance_locations WHERE id = ${id}`);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting maintenance location:', error);
      res.status(500).json({ message: 'Failed to delete location' });
    }
  });

  // --- Technicians (supports internal employees and external contractors) ---
  app.get('/api/maintenance/technicians', isAuthenticated, async (req, res) => {
    try {
      const { activeOnly, externalOnly } = req.query;
      const result = await db.execute(sql`
        SELECT t.*, u.first_name as linked_first_name, u.last_name as linked_last_name, 
               u.email as linked_email, ml.name as location_name
        FROM maintenance_technicians t
        LEFT JOIN platform_users u ON t.user_id = u.id
        LEFT JOIN maintenance_locations ml ON t.primary_location_id = ml.id
        WHERE 1=1
        ${activeOnly === 'true' ? sql` AND t.is_active = true` : sql``}
        ${externalOnly === 'true' ? sql` AND t.is_external = true` : sql``}
        ORDER BY t.first_name, t.last_name
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching technicians:', error);
      res.status(500).json({ message: 'Failed to fetch technicians' });
    }
  });

  app.get('/api/maintenance/technicians/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await db.execute(sql`
        SELECT t.*, u.first_name as linked_first_name, u.last_name as linked_last_name, 
               u.email as linked_email, ml.name as location_name
        FROM maintenance_technicians t
        LEFT JOIN platform_users u ON t.user_id = u.id
        LEFT JOIN maintenance_locations ml ON t.primary_location_id = ml.id
        WHERE t.id = ${id}
      `);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Technician not found' });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching technician:', error);
      res.status(500).json({ message: 'Failed to fetch technician' });
    }
  });

  app.post('/api/maintenance/technicians', isAdmin, async (req, res) => {
    try {
      const { 
        userId, firstName, lastName, employeeNumber, isExternal,
        companyName, companyAddress, companyCity, companyState, companyZip, companyPhone,
        email, cellPhone, workPhone, skills, certifications, specialties,
        hourlyRate, shiftSchedule, primaryLocationId, available, isActive, notes 
      } = req.body;
      
      const result = await db.execute(sql`
        INSERT INTO maintenance_technicians (
          user_id, first_name, last_name, employee_number, is_external,
          company_name, company_address, company_city, company_state, company_zip, company_phone,
          email, cell_phone, work_phone, skills, certifications, specialties,
          hourly_rate, shift_schedule, primary_location_id, available, is_active, notes
        )
        VALUES (
          ${userId || null}, ${firstName}, ${lastName}, ${employeeNumber || null}, ${isExternal ?? false},
          ${companyName || null}, ${companyAddress || null}, ${companyCity || null}, ${companyState || null}, ${companyZip || null}, ${companyPhone || null},
          ${email || null}, ${cellPhone || null}, ${workPhone || null}, 
          ${skills ? (Array.isArray(skills) ? skills : [skills]) : null}, 
          ${certifications ? JSON.stringify(certifications) : null}, ${specialties || null},
          ${hourlyRate || null}, ${shiftSchedule || null}, ${primaryLocationId || null}, ${available ?? true}, ${isActive ?? true}, ${notes || null}
        )
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error creating technician:', error);
      res.status(500).json({ message: 'Failed to create technician' });
    }
  });

  app.put('/api/maintenance/technicians/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        userId, firstName, lastName, employeeNumber, isExternal,
        companyName, companyAddress, companyCity, companyState, companyZip, companyPhone,
        email, cellPhone, workPhone, skills, certifications, specialties,
        hourlyRate, shiftSchedule, primaryLocationId, available, isActive, notes 
      } = req.body;
      
      const result = await db.execute(sql`
        UPDATE maintenance_technicians SET
          user_id = ${userId || null}, first_name = ${firstName}, last_name = ${lastName},
          employee_number = ${employeeNumber || null}, is_external = ${isExternal ?? false},
          company_name = ${companyName || null}, company_address = ${companyAddress || null},
          company_city = ${companyCity || null}, company_state = ${companyState || null},
          company_zip = ${companyZip || null}, company_phone = ${companyPhone || null},
          email = ${email || null}, cell_phone = ${cellPhone || null}, work_phone = ${workPhone || null},
          skills = ${skills ? (Array.isArray(skills) ? skills : [skills]) : null},
          certifications = ${certifications ? JSON.stringify(certifications) : null},
          specialties = ${specialties || null}, hourly_rate = ${hourlyRate || null},
          shift_schedule = ${shiftSchedule || null}, primary_location_id = ${primaryLocationId || null},
          available = ${available ?? true}, is_active = ${isActive ?? true}, notes = ${notes || null},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating technician:', error);
      res.status(500).json({ message: 'Failed to update technician' });
    }
  });

  app.delete('/api/maintenance/technicians/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await db.execute(sql`DELETE FROM maintenance_technicians WHERE id = ${id}`);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting technician:', error);
      res.status(500).json({ message: 'Failed to delete technician' });
    }
  });

  // --- Maintenance Dashboard Stats ---
  app.get('/api/maintenance/stats', isAuthenticated, async (req, res) => {
    try {
      const stats = await db.execute(sql`
        SELECT 
          (SELECT COUNT(*)::integer FROM maintenance_assets WHERE status = 'operational') as operational_assets,
          (SELECT COUNT(*)::integer FROM maintenance_assets WHERE status = 'maintenance') as assets_under_maintenance,
          (SELECT COUNT(*)::integer FROM maintenance_work_orders WHERE status = 'open') as open_work_orders,
          (SELECT COUNT(*)::integer FROM maintenance_work_orders WHERE status = 'in_progress') as in_progress_work_orders,
          (SELECT COUNT(*)::integer FROM maintenance_work_orders WHERE status = 'completed' AND actual_end >= NOW() - INTERVAL '30 days') as completed_this_month,
          (SELECT COUNT(*)::integer FROM maintenance_work_orders WHERE priority = 'critical' AND status NOT IN ('completed', 'cancelled')) as critical_work_orders,
          (SELECT COUNT(*)::integer FROM maintenance_parts WHERE quantity_on_hand <= reorder_point AND active = true) as low_stock_parts,
          (SELECT COUNT(*)::integer FROM maintenance_preventive_schedules WHERE next_due <= NOW() + INTERVAL '7 days' AND active = true) as upcoming_pm
      `);
      res.json(stats.rows[0]);
    } catch (error) {
      console.error('Error fetching maintenance stats:', error);
      res.status(500).json({ message: 'Failed to fetch stats' });
    }
  });

  // ============================================
  // DAILY REPORTS MODULE ROUTES
  // ============================================

  // Get all department templates
  app.get('/api/daily-reports/templates', isAuthenticated, async (req: any, res) => {
    try {
      const activeOnly = req.query.active === 'true';
      const templates = await storage.getDailyReportTemplates(activeOnly);
      res.json(templates);
    } catch (error) {
      console.error('Error fetching daily report templates:', error);
      res.status(500).json({ message: 'Failed to fetch templates' });
    }
  });

  // Get a single template by ID or department
  app.get('/api/daily-reports/templates/:identifier', isAuthenticated, async (req: any, res) => {
    try {
      const { identifier } = req.params;
      // Check if it's a department name or an ID
      let template = await storage.getDailyReportTemplateByDepartment(identifier);
      if (!template) {
        template = await storage.getDailyReportTemplate(identifier);
      }
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }
      res.json(template);
    } catch (error) {
      console.error('Error fetching daily report template:', error);
      res.status(500).json({ message: 'Failed to fetch template' });
    }
  });

  // Create or update a department template (admin only)
  app.post('/api/daily-reports/templates', isAdmin, async (req, res) => {
    try {
      const data = insertDailyReportTemplateSchema.parse(req.body);
      const template = await storage.upsertDailyReportTemplate(data);
      res.json(template);
    } catch (error) {
      console.error('Error creating daily report template:', error);
      res.status(500).json({ message: 'Failed to create template' });
    }
  });

  // Update a template
  app.patch('/api/daily-reports/templates/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertDailyReportTemplateSchema.partial().parse(req.body);
      const template = await storage.updateDailyReportTemplate(id, data);
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }
      res.json(template);
    } catch (error) {
      console.error('Error updating daily report template:', error);
      res.status(500).json({ message: 'Failed to update template' });
    }
  });

  // ============================================
  // DAILY REPORT FIELD DEFINITIONS
  // ============================================
  
  // Get all field definitions
  app.get('/api/daily-reports/field-definitions', isAuthenticated, async (req: any, res) => {
    try {
      const { active } = req.query;
      const fields = await storage.getDailyReportFieldDefinitions(active === 'true');
      res.json(fields);
    } catch (error) {
      console.error('Error fetching field definitions:', error);
      res.status(500).json({ message: 'Failed to fetch field definitions' });
    }
  });

  // Get a single field definition
  app.get('/api/daily-reports/field-definitions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const field = await storage.getDailyReportFieldDefinition(id);
      if (!field) {
        return res.status(404).json({ message: 'Field definition not found' });
      }
      res.json(field);
    } catch (error) {
      console.error('Error fetching field definition:', error);
      res.status(500).json({ message: 'Failed to fetch field definition' });
    }
  });

  // Create a new field definition (admin only)
  app.post('/api/daily-reports/field-definitions', isAdmin, async (req, res) => {
    try {
      const data = insertDailyReportFieldDefinitionSchema.parse(req.body);
      
      // Check if key already exists
      const existing = await storage.getDailyReportFieldDefinitionByKey(data.key);
      if (existing) {
        return res.status(400).json({ message: 'A field with this key already exists' });
      }
      
      const field = await storage.createDailyReportFieldDefinition(data);
      
      // Sync to all department templates
      await storage.syncFieldDefinitionsToTemplates();
      
      res.json(field);
    } catch (error) {
      console.error('Error creating field definition:', error);
      res.status(500).json({ message: 'Failed to create field definition' });
    }
  });

  // Update a field definition (admin only)
  app.patch('/api/daily-reports/field-definitions/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertDailyReportFieldDefinitionSchema.partial().parse(req.body);
      
      // Check if updating the key and if new key already exists
      if (data.key) {
        const existing = await storage.getDailyReportFieldDefinitionByKey(data.key);
        if (existing && existing.id !== id) {
          return res.status(400).json({ message: 'A field with this key already exists' });
        }
      }
      
      const field = await storage.updateDailyReportFieldDefinition(id, data);
      if (!field) {
        return res.status(404).json({ message: 'Field definition not found' });
      }
      
      // Sync to all department templates
      await storage.syncFieldDefinitionsToTemplates();
      
      res.json(field);
    } catch (error) {
      console.error('Error updating field definition:', error);
      res.status(500).json({ message: 'Failed to update field definition' });
    }
  });

  // Delete a field definition (admin only)
  app.delete('/api/daily-reports/field-definitions/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteDailyReportFieldDefinition(id);
      if (!deleted) {
        return res.status(404).json({ message: 'Field definition not found' });
      }
      
      // Sync to all department templates (removes the deleted field)
      await storage.syncFieldDefinitionsToTemplates();
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting field definition:', error);
      res.status(500).json({ message: 'Failed to delete field definition' });
    }
  });

  // Sync field definitions to all templates (admin only)
  app.post('/api/daily-reports/field-definitions/sync', isAdmin, async (req, res) => {
    try {
      await storage.syncFieldDefinitionsToTemplates();
      res.json({ success: true, message: 'Field definitions synced to all department templates' });
    } catch (error) {
      console.error('Error syncing field definitions:', error);
      res.status(500).json({ message: 'Failed to sync field definitions' });
    }
  });

  // ============================================
  // DEPARTMENT FIELD ASSIGNMENTS
  // ============================================

  // Get all field assignments for all templates (for admin dashboard)
  app.get('/api/daily-reports/field-assignments', isAuthenticated, async (req: any, res) => {
    try {
      const templates = await storage.getDailyReportTemplates();
      const allAssignments: Record<string, any[]> = {};
      
      for (const template of templates) {
        const assignments = await storage.getDepartmentFieldAssignmentsWithDefinitions(template.id);
        allAssignments[template.id] = assignments;
      }
      
      res.json(allAssignments);
    } catch (error) {
      console.error('Error fetching all field assignments:', error);
      res.status(500).json({ message: 'Failed to fetch field assignments' });
    }
  });

  // Get field assignments for a specific template
  app.get('/api/daily-reports/templates/:templateId/fields', isAuthenticated, async (req: any, res) => {
    try {
      const { templateId } = req.params;
      const assignments = await storage.getDepartmentFieldAssignmentsWithDefinitions(templateId);
      res.json(assignments);
    } catch (error) {
      console.error('Error fetching department field assignments:', error);
      res.status(500).json({ message: 'Failed to fetch field assignments' });
    }
  });

  // Update a single field assignment (toggle enabled status)
  app.patch('/api/daily-reports/templates/:templateId/fields/:fieldId', isAdmin, async (req, res) => {
    try {
      const { templateId, fieldId } = req.params;
      const { isEnabled } = req.body;
      
      const updated = await storage.updateDepartmentFieldEnabled(templateId, fieldId, isEnabled);
      if (!updated) {
        return res.status(404).json({ message: 'Field assignment not found' });
      }
      
      // Sync the inline metrics for backward compatibility
      await storage.syncFieldDefinitionsToTemplates();
      
      res.json(updated);
    } catch (error) {
      console.error('Error updating field assignment:', error);
      res.status(500).json({ message: 'Failed to update field assignment' });
    }
  });

  // Update field assignments for a template (supports single field, bulk array, or enable all)
  app.patch('/api/daily-reports/templates/:templateId/fields', isAdmin, async (req, res) => {
    try {
      const { templateId } = req.params;
      const { updates, fieldKey, isEnabled, enableAll } = req.body;
      
      // Handle single field toggle by key
      if (fieldKey && typeof isEnabled === 'boolean') {
        const assignments = await storage.getDepartmentFieldAssignmentsWithDefinitions(templateId);
        const assignment = assignments.find(a => a.fieldDefinition?.key === fieldKey);
        if (!assignment) {
          return res.status(404).json({ message: 'Field assignment not found' });
        }
        await storage.updateDepartmentFieldEnabled(templateId, assignment.fieldDefinitionId, isEnabled);
      }
      // Handle enable/disable all fields
      else if (typeof enableAll === 'boolean') {
        const assignments = await storage.getDepartmentFieldAssignments(templateId);
        const bulkUpdates = assignments.map(a => ({
          fieldDefinitionId: a.fieldDefinitionId,
          isEnabled: enableAll
        }));
        await storage.bulkUpdateDepartmentFieldAssignments(templateId, bulkUpdates);
      }
      // Handle bulk updates array
      else if (updates && Array.isArray(updates)) {
        await storage.bulkUpdateDepartmentFieldAssignments(templateId, updates);
      }
      else {
        return res.status(400).json({ message: 'Invalid request body' });
      }
      
      // Sync the inline metrics for backward compatibility
      await storage.syncFieldDefinitionsToTemplates();
      
      const resultAssignments = await storage.getDepartmentFieldAssignmentsWithDefinitions(templateId);
      res.json(resultAssignments);
    } catch (error) {
      console.error('Error updating field assignments:', error);
      res.status(500).json({ message: 'Failed to update field assignments' });
    }
  });

  // Get all procedure templates
  app.get('/api/daily-reports/procedures', isAuthenticated, async (req: any, res) => {
    try {
      const { department, active } = req.query;
      const procedures = await storage.getDailyProcedureTemplates(
        department as string | undefined,
        active === 'true'
      );
      res.json(procedures);
    } catch (error) {
      console.error('Error fetching procedure templates:', error);
      res.status(500).json({ message: 'Failed to fetch procedures' });
    }
  });

  // Create a procedure template (admin only)
  app.post('/api/daily-reports/procedures', isAdmin, async (req, res) => {
    try {
      const data = insertDailyProcedureTemplateSchema.parse(req.body);
      const procedure = await storage.createDailyProcedureTemplate(data);
      res.json(procedure);
    } catch (error) {
      console.error('Error creating procedure template:', error);
      res.status(500).json({ message: 'Failed to create procedure' });
    }
  });

  // Update a procedure template
  app.patch('/api/daily-reports/procedures/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertDailyProcedureTemplateSchema.partial().parse(req.body);
      const procedure = await storage.updateDailyProcedureTemplate(id, data);
      if (!procedure) {
        return res.status(404).json({ message: 'Procedure not found' });
      }
      res.json(procedure);
    } catch (error) {
      console.error('Error updating procedure template:', error);
      res.status(500).json({ message: 'Failed to update procedure' });
    }
  });

  // Delete a procedure template
  app.delete('/api/daily-reports/procedures/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteDailyProcedureTemplate(id);
      if (!deleted) {
        return res.status(404).json({ message: 'Procedure not found' });
      }
      res.json({ message: 'Procedure deleted successfully' });
    } catch (error) {
      console.error('Error deleting procedure template:', error);
      res.status(500).json({ message: 'Failed to delete procedure' });
    }
  });

  // Get daily reports with filters
  app.get('/api/daily-reports', isAuthenticated, async (req: any, res) => {
    try {
      const { department, startDate, endDate, status, hasCustomerConcerns } = req.query;
      
      const filters: any = {};
      // Only add department filter if it's not "all" (which means show all departments)
      if (department && department !== 'all') filters.department = department;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (status) filters.status = status;
      if (hasCustomerConcerns !== undefined) filters.hasCustomerConcerns = hasCustomerConcerns === 'true';
      
      const reports = await storage.getDailyReports(Object.keys(filters).length > 0 ? filters : undefined);
      res.json(reports);
    } catch (error) {
      console.error('Error fetching daily reports:', error);
      res.status(500).json({ message: 'Failed to fetch reports' });
    }
  });

  // Get report stats
  app.get('/api/daily-reports/stats', isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDailyReportsStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching daily report stats:', error);
      res.status(500).json({ message: 'Failed to fetch stats' });
    }
  });

  // Get unresolved incidents
  app.get('/api/daily-reports/incidents/unresolved', isAuthenticated, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const incidents = await storage.getUnresolvedIncidents(limit);
      res.json(incidents);
    } catch (error) {
      console.error('Error fetching unresolved incidents:', error);
      res.status(500).json({ message: 'Failed to fetch incidents' });
    }
  });

  // Get customer-related incidents
  app.get('/api/daily-reports/incidents/customer', isAuthenticated, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const incidents = await storage.getCustomerRelatedIncidents(limit);
      res.json(incidents);
    } catch (error) {
      console.error('Error fetching customer incidents:', error);
      res.status(500).json({ message: 'Failed to fetch incidents' });
    }
  });

  // ===============================
  // Daily Reports Access Codes (for public form via QR code)
  // IMPORTANT: These routes must be before /api/daily-reports/:id to avoid matching
  // ===============================

  // Get all access codes (admin)
  app.get('/api/daily-reports/access-codes', isAdmin, async (req, res) => {
    try {
      const { department } = req.query;
      const codes = await storage.getDailyReportAccessCodes(department as string | undefined);
      res.json(codes);
    } catch (error) {
      console.error('Error fetching access codes:', error);
      res.status(500).json({ message: 'Failed to fetch access codes' });
    }
  });

  // Create a new access code (admin)
  app.post('/api/daily-reports/access-codes', isAdmin, async (req: any, res) => {
    try {
      const { staffName, department, code: customCode } = req.body;
      if (!staffName || !department) {
        return res.status(400).json({ message: 'Staff name and department are required' });
      }

      let code: string;
      if (customCode) {
        if (!/^\d{4}$/.test(customCode)) {
          return res.status(400).json({ message: 'Code must be exactly 4 digits' });
        }
        const existing = await storage.getDailyReportAccessCodeByCode(customCode);
        if (existing) {
          return res.status(400).json({ message: 'This code is already in use' });
        }
        code = customCode;
      } else {
        code = await storage.generateUniqueAccessCode();
      }

      const userId = req.user?.claims?.sub;
      const userName = req.user?.claims?.name || req.user?.claims?.email || 'Unknown';

      const accessCode = await storage.createDailyReportAccessCode({
        code,
        staffName,
        department,
        isActive: true,
        createdById: userId,
        createdByName: userName
      });

      res.json(accessCode);
    } catch (error) {
      console.error('Error creating access code:', error);
      res.status(500).json({ message: 'Failed to create access code' });
    }
  });

  // Update an access code (admin)
  app.patch('/api/daily-reports/access-codes/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { staffName, department, isActive, code: customCode } = req.body;
      
      const updateData: any = { staffName, department, isActive };
      
      if (customCode) {
        if (!/^\d{4}$/.test(customCode)) {
          return res.status(400).json({ message: 'Code must be exactly 4 digits' });
        }
        const existing = await storage.getDailyReportAccessCodeByCode(customCode);
        if (existing && existing.id !== id) {
          return res.status(400).json({ message: 'This code is already in use' });
        }
        updateData.code = customCode;
      }
      
      const accessCode = await storage.updateDailyReportAccessCode(id, updateData);
      if (!accessCode) {
        return res.status(404).json({ message: 'Access code not found' });
      }
      res.json(accessCode);
    } catch (error) {
      console.error('Error updating access code:', error);
      res.status(500).json({ message: 'Failed to update access code' });
    }
  });

  // Delete an access code (admin)
  app.delete('/api/daily-reports/access-codes/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteDailyReportAccessCode(id);
      if (!deleted) {
        return res.status(404).json({ message: 'Access code not found' });
      }
      res.json({ message: 'Access code deleted successfully' });
    } catch (error) {
      console.error('Error deleting access code:', error);
      res.status(500).json({ message: 'Failed to delete access code' });
    }
  });

  // Get a single daily report with all details
  app.get('/api/daily-reports/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const report = await storage.getDailyReportWithDetails(id);
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }
      res.json(report);
    } catch (error) {
      console.error('Error fetching daily report:', error);
      res.status(500).json({ message: 'Failed to fetch report' });
    }
  });

  // Get or create today's report for a department
  app.get('/api/daily-reports/department/:department/today', isAuthenticated, async (req: any, res) => {
    try {
      const { department } = req.params;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let report = await storage.getDailyReportByDepartmentAndDate(department, today);
      
      if (!report) {
        // Create a new draft report for today
        const userId = req.user?.claims?.sub;
        const userName = req.user?.claims?.name || req.user?.claims?.email || 'Unknown';
        
        report = await storage.createDailyReport({
          department: department as any,
          reportDate: today,
          submittedById: userId,
          submittedByName: userName,
          status: 'draft'
        });
        
        // Initialize procedure completions
        await storage.initializeProcedureCompletionsForReport(report.id, department);
      }
      
      // Get full details
      const reportWithDetails = await storage.getDailyReportWithDetails(report.id);
      res.json(reportWithDetails);
    } catch (error) {
      console.error('Error fetching today\'s report:', error);
      res.status(500).json({ message: 'Failed to fetch today\'s report' });
    }
  });

  // Create a new daily report
  app.post('/api/daily-reports', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const userName = req.user?.claims?.name || req.user?.claims?.email || 'Unknown';
      
      // Convert reportDate string to Date object if needed
      const bodyData = {
        ...req.body,
        submittedById: userId,
        submittedByName: userName,
        reportDate: req.body.reportDate ? new Date(req.body.reportDate) : new Date()
      };
      
      const data = insertDailyReportSchema.parse(bodyData);
      
      const report = await storage.createDailyReport(data);
      
      // Initialize procedure completions
      await storage.initializeProcedureCompletionsForReport(report.id, data.department);
      
      // Send email notifications if report is being submitted (not draft)
      if (data.status === 'submitted') {
        try {
          const { generateDailyReportEmail, sendEmail } = await import("./email");
          
          // Get department template for metrics config and notification emails
          const template = await storage.getDailyReportTemplateByDepartment(data.department);
          
          // Get notification emails from template (new approach - department level)
          const notificationEmails = (template?.notificationEmails as Array<{ email: string; name?: string; role?: string }>) || [];
          
          if (notificationEmails.length > 0) {
            // Get incident count
            const incidents = await storage.getDailyReportIncidents(report.id);
            
            const emailData = generateDailyReportEmail({
              department: data.department,
              departmentLabel: template?.departmentLabel || data.department,
              reportDate: new Date(data.reportDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }),
              submitterName: userName,
              performanceSummary: data.performanceSummary || undefined,
              overallRating: data.overallRating || undefined,
              hasCustomerConcerns: data.hasCustomerConcerns || false,
              customerConcernsSummary: data.customerConcernsSummary || undefined,
              metricsData: (data.metricsData as Record<string, any>) || undefined,
              metricsConfig: template?.metrics as Array<{ key: string; label: string; unit?: string }> || undefined,
              incidentCount: incidents.length,
              proceduresCompletedCount: data.proceduresCompletedCount || 0,
              proceduresTotalCount: data.proceduresTotalCount || 0
            });
            
            // Send to all notification email recipients from template
            for (const recipient of notificationEmails) {
              try {
                await sendEmail(
                  recipient.email,
                  emailData.subject,
                  emailData.html,
                  emailData.text
                );
                console.log(`[Daily Reports] Email sent to ${recipient.email}`);
              } catch (emailError) {
                console.error(`[Daily Reports] Failed to send email to ${recipient.email}:`, emailError);
              }
            }
          }
        } catch (emailError) {
          console.error('[Daily Reports] Error sending email notifications:', emailError);
          // Don't fail the report creation if email fails
        }
      }
      
      res.json(report);
    } catch (error: any) {
      console.error('Error creating daily report:', error);
      // Check for duplicate key constraint (report already exists for department+date)
      if (error?.code === '23505' && error?.constraint === 'uq_daily_reports_dept_date') {
        return res.status(409).json({ 
          message: 'A report for this department on this date already exists. Please edit the existing report instead.' 
        });
      }
      res.status(500).json({ message: 'Failed to create report' });
    }
  });

  // Update a daily report
  app.patch('/api/daily-reports/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Convert reportDate string to Date object if provided
      const bodyData = { ...req.body };
      if (bodyData.reportDate && typeof bodyData.reportDate === 'string') {
        bodyData.reportDate = new Date(bodyData.reportDate);
      }
      
      const data = insertDailyReportSchema.partial().parse(bodyData);
      
      // If submitting, update status
      if (req.body.submit === true) {
        data.status = 'submitted';
      }
      
      const report = await storage.updateDailyReport(id, data);
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }
      res.json(report);
    } catch (error) {
      console.error('Error updating daily report:', error);
      res.status(500).json({ message: 'Failed to update report' });
    }
  });

  // Submit a daily report
  app.post('/api/daily-reports/:id/submit', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub;
      const userName = req.user?.claims?.name || req.user?.claims?.email || 'Unknown';
      
      const report = await storage.updateDailyReport(id, { 
        status: 'submitted',
        submittedById: userId,
        submittedByName: userName,
        submittedAt: new Date()
      });
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }
      
      // Send email notifications to configured recipients
      try {
        const { generateDailyReportEmail, sendEmail } = await import("./email");
        
        // Get department template for metrics config and notification emails
        const template = await storage.getDailyReportTemplateByDepartment(report.department);
        
        // Get notification emails from template (department level)
        const notificationEmails = (template?.notificationEmails as Array<{ email: string; name?: string; role?: string }>) || [];
        
        if (notificationEmails.length > 0) {
          // Get incident count
          const incidents = await storage.getDailyReportIncidents(report.id);
          
          const emailData = generateDailyReportEmail({
            department: report.department,
            departmentLabel: template?.departmentLabel || report.department,
            reportDate: new Date(report.reportDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            submitterName: userName,
            performanceSummary: report.performanceSummary || undefined,
            overallRating: report.overallRating || undefined,
            hasCustomerConcerns: report.hasCustomerConcerns || false,
            customerConcernsSummary: report.customerConcernsSummary || undefined,
            metricsData: (report.metricsData as Record<string, any>) || undefined,
            metricsConfig: template?.metrics as Array<{ key: string; label: string; unit?: string }> || undefined,
            incidentCount: incidents.length,
            proceduresCompletedCount: report.proceduresCompletedCount || 0,
            proceduresTotalCount: report.proceduresTotalCount || 0
          });
          
          // Send to all notification email recipients from template
          for (const recipient of notificationEmails) {
            try {
              await sendEmail(
                recipient.email,
                emailData.subject,
                emailData.html,
                emailData.text
              );
              console.log(`[Daily Reports] Email sent to ${recipient.email}`);
            } catch (emailError) {
              console.error(`[Daily Reports] Failed to send email to ${recipient.email}:`, emailError);
            }
          }
        }
      } catch (emailError) {
        console.error('[Daily Reports] Error sending email notifications:', emailError);
        // Don't fail the submission if email fails
      }
      
      res.json(report);
    } catch (error) {
      console.error('Error submitting daily report:', error);
      res.status(500).json({ message: 'Failed to submit report' });
    }
  });

  // Review a daily report (admin only)
  app.post('/api/daily-reports/:id/review', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub;
      const userName = req.user?.claims?.name || req.user?.claims?.email || 'Unknown';
      const { reviewNotes, approved } = req.body;
      
      const report = await storage.updateDailyReport(id, {
        status: approved ? 'reviewed' : 'needs_revision',
        reviewedById: userId,
        reviewedByName: userName,
        reviewedAt: new Date(),
        reviewNotes
      });
      
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }
      res.json(report);
    } catch (error) {
      console.error('Error reviewing daily report:', error);
      res.status(500).json({ message: 'Failed to review report' });
    }
  });

  // Delete a daily report (admin only)
  app.delete('/api/daily-reports/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteDailyReport(id);
      if (!deleted) {
        return res.status(404).json({ message: 'Report not found' });
      }
      res.json({ message: 'Report deleted successfully' });
    } catch (error) {
      console.error('Error deleting daily report:', error);
      res.status(500).json({ message: 'Failed to delete report' });
    }
  });

  // Add an incident to a report
  app.post('/api/daily-reports/:reportId/incidents', isAuthenticated, async (req: any, res) => {
    try {
      const { reportId } = req.params;
      const data = insertDailyReportIncidentSchema.parse({
        ...req.body,
        reportId
      });
      
      const incident = await storage.createDailyReportIncident(data);
      
      // Update report's customer concern flag if this is customer-related
      if (data.isCustomerRelated) {
        await storage.updateDailyReport(reportId, { hasCustomerConcerns: true });
      }
      
      res.json(incident);
    } catch (error) {
      console.error('Error creating incident:', error);
      res.status(500).json({ message: 'Failed to create incident' });
    }
  });

  // Update an incident
  app.patch('/api/daily-reports/incidents/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertDailyReportIncidentSchema.partial().parse(req.body);
      const incident = await storage.updateDailyReportIncident(id, data);
      if (!incident) {
        return res.status(404).json({ message: 'Incident not found' });
      }
      res.json(incident);
    } catch (error) {
      console.error('Error updating incident:', error);
      res.status(500).json({ message: 'Failed to update incident' });
    }
  });

  // Resolve an incident
  app.post('/api/daily-reports/incidents/:id/resolve', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { actionTaken, notes } = req.body;
      
      const incident = await storage.updateDailyReportIncident(id, {
        resolved: true,
        actionTaken,
        followUpNotes: notes
      });
      
      if (!incident) {
        return res.status(404).json({ message: 'Incident not found' });
      }
      res.json(incident);
    } catch (error) {
      console.error('Error resolving incident:', error);
      res.status(500).json({ message: 'Failed to resolve incident' });
    }
  });

  // Delete an incident
  app.delete('/api/daily-reports/incidents/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteDailyReportIncident(id);
      if (!deleted) {
        return res.status(404).json({ message: 'Incident not found' });
      }
      res.json({ message: 'Incident deleted successfully' });
    } catch (error) {
      console.error('Error deleting incident:', error);
      res.status(500).json({ message: 'Failed to delete incident' });
    }
  });

  // Update procedure completion status
  app.post('/api/daily-reports/:reportId/procedures/:procedureId/complete', isAuthenticated, async (req: any, res) => {
    try {
      const { reportId, procedureId } = req.params;
      const userId = req.user?.claims?.sub;
      const userName = req.user?.claims?.name || req.user?.claims?.email || 'Unknown';
      const { completed, notes } = req.body;
      
      const completion = await storage.upsertDailyProcedureCompletion({
        reportId,
        procedureTemplateId: procedureId,
        completed: completed === true,
        completedById: userId,
        completedByName: userName,
        notes
      });
      
      // Update the report's procedure completion stats
      const allCompletions = await storage.getDailyProcedureCompletions(reportId);
      const completedCount = allCompletions.filter(c => c.completed).length;
      const totalCount = allCompletions.length;
      
      await storage.updateDailyReport(reportId, {
        proceduresCompletedCount: completedCount,
        proceduresTotalCount: totalCount,
        proceduresCompleted: completedCount === totalCount && totalCount > 0
      });
      
      res.json(completion);
    } catch (error) {
      console.error('Error updating procedure completion:', error);
      res.status(500).json({ message: 'Failed to update procedure' });
    }
  });

  // Bulk update procedure completions
  app.post('/api/daily-reports/:reportId/procedures/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const { reportId } = req.params;
      const userId = req.user?.claims?.sub;
      const userName = req.user?.claims?.name || req.user?.claims?.email || 'Unknown';
      const { completions } = req.body; // Array of { procedureId, completed, notes }
      
      const results = [];
      for (const item of completions) {
        const completion = await storage.upsertDailyProcedureCompletion({
          reportId,
          procedureTemplateId: item.procedureId,
          completed: item.completed === true,
          completedById: userId,
          completedByName: userName,
          notes: item.notes
        });
        results.push(completion);
      }
      
      // Update the report's procedure completion stats
      const allCompletions = await storage.getDailyProcedureCompletions(reportId);
      const completedCount = allCompletions.filter(c => c.completed).length;
      const totalCount = allCompletions.length;
      
      await storage.updateDailyReport(reportId, {
        proceduresCompletedCount: completedCount,
        proceduresTotalCount: totalCount,
        proceduresCompleted: completedCount === totalCount && totalCount > 0
      });
      
      res.json(results);
    } catch (error) {
      console.error('Error bulk updating procedure completions:', error);
      res.status(500).json({ message: 'Failed to update procedures' });
    }
  });

  // ============================================================================
  // DAILY REPORT EMAIL RECIPIENTS ROUTES
  // ============================================================================

  // Get all email recipients (optionally filter by department)
  app.get('/api/daily-reports/email-recipients', isAdmin, async (req, res) => {
    try {
      const { department, active } = req.query;
      const activeOnly = active !== 'false';
      const recipients = await storage.getDailyReportEmailRecipients(
        department as string | undefined,
        activeOnly
      );
      res.json(recipients);
    } catch (error) {
      console.error('Error fetching email recipients:', error);
      res.status(500).json({ message: 'Failed to fetch email recipients' });
    }
  });

  // Get a single email recipient
  app.get('/api/daily-reports/email-recipients/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const recipient = await storage.getDailyReportEmailRecipientById(id);
      if (!recipient) {
        return res.status(404).json({ message: 'Recipient not found' });
      }
      res.json(recipient);
    } catch (error) {
      console.error('Error fetching email recipient:', error);
      res.status(500).json({ message: 'Failed to fetch email recipient' });
    }
  });

  // Create a new email recipient
  app.post('/api/daily-reports/email-recipients', isAdmin, async (req, res) => {
    try {
      const data = insertDailyReportEmailRecipientSchema.parse(req.body);
      const recipient = await storage.createDailyReportEmailRecipient(data);
      res.json(recipient);
    } catch (error) {
      console.error('Error creating email recipient:', error);
      res.status(500).json({ message: 'Failed to create email recipient' });
    }
  });

  // Update an email recipient
  app.patch('/api/daily-reports/email-recipients/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertDailyReportEmailRecipientSchema.partial().parse(req.body);
      const recipient = await storage.updateDailyReportEmailRecipient(id, data);
      if (!recipient) {
        return res.status(404).json({ message: 'Recipient not found' });
      }
      res.json(recipient);
    } catch (error) {
      console.error('Error updating email recipient:', error);
      res.status(500).json({ message: 'Failed to update email recipient' });
    }
  });

  // Delete an email recipient
  app.delete('/api/daily-reports/email-recipients/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteDailyReportEmailRecipient(id);
      if (!deleted) {
        return res.status(404).json({ message: 'Recipient not found' });
      }
      res.json({ message: 'Recipient deleted successfully' });
    } catch (error) {
      console.error('Error deleting email recipient:', error);
      res.status(500).json({ message: 'Failed to delete email recipient' });
    }
  });

  // ===============================
  // Public Form Endpoints (no auth required)
  // ===============================

  // Validate access code and get form data (public)
  app.get('/api/public/daily-reports/validate/:code', async (req, res) => {
    try {
      const { code } = req.params;
      const accessCode = await storage.getDailyReportAccessCodeByCode(code);

      if (!accessCode) {
        return res.status(404).json({ message: 'Invalid access code' });
      }

      if (!accessCode.isActive) {
        return res.status(403).json({ message: 'Access code is inactive' });
      }

      // Check if this staff member has access to multiple departments
      const allStaffCodes = await storage.getActiveAccessCodesByStaffName(accessCode.staffName);
      
      if (allStaffCodes.length > 1) {
        // Staff has multiple departments - return list for selection
        const availableDepartments = await Promise.all(
          allStaffCodes.map(async (ac) => {
            const template = await storage.getDailyReportTemplateByDepartment(ac.department);
            return {
              department: ac.department,
              departmentLabel: template?.departmentLabel || ac.department,
              code: ac.code
            };
          })
        );

        // Update last used timestamp
        await storage.updateDailyReportAccessCodeLastUsed(code);

        return res.json({
          staffName: accessCode.staffName,
          multipleDepartments: true,
          availableDepartments
        });
      }

      // Single department - return form data directly
      const template = await storage.getDailyReportTemplateByDepartment(accessCode.department);

      if (!template) {
        return res.status(404).json({ message: 'Department template not found' });
      }

      // Get active procedure templates for the department
      const procedures = await storage.getDailyProcedureTemplates(accessCode.department, true);

      // Update last used timestamp
      await storage.updateDailyReportAccessCodeLastUsed(code);

      // Get enabled fields from the junction table (authoritative source)
      const fieldAssignments = await storage.getDepartmentFieldAssignmentsWithDefinitions(template.id);
      const enabledMetrics = fieldAssignments
        .filter(a => a.isEnabled && a.fieldDefinition?.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(a => ({
          key: a.fieldDefinition?.key || '',
          label: a.fieldDefinition?.label || '',
          type: a.fieldDefinition?.type || 'text'
        }));

      res.json({
        staffName: accessCode.staffName,
        department: accessCode.department,
        departmentLabel: template?.departmentLabel || accessCode.department,
        multipleDepartments: false,
        metrics: enabledMetrics,
        procedures: procedures.map(p => ({
          id: p.id,
          name: p.procedureName,
          description: p.description,
          type: p.procedureType,
          isRequired: p.isRequired,
          sortOrder: p.sortOrder
        }))
      });
    } catch (error) {
      console.error('Error validating access code:', error);
      res.status(500).json({ message: 'Failed to validate access code' });
    }
  });

  // Get form data for a specific department (after department selection)
  app.get('/api/public/daily-reports/department/:department/form', async (req, res) => {
    try {
      const { department } = req.params;
      const { staffName } = req.query;

      if (!staffName || typeof staffName !== 'string') {
        return res.status(400).json({ message: 'Staff name is required' });
      }

      // Verify this staff member has access to this department
      const allStaffCodes = await storage.getActiveAccessCodesByStaffName(staffName);
      const departmentCode = allStaffCodes.find(ac => ac.department === department);

      if (!departmentCode) {
        return res.status(403).json({ message: 'Access denied to this department' });
      }

      const template = await storage.getDailyReportTemplateByDepartment(department as any);

      if (!template) {
        return res.status(404).json({ message: 'Department template not found' });
      }

      // Get active procedure templates for the department
      const procedures = await storage.getDailyProcedureTemplates(department as any, true);

      // Get enabled fields from the junction table (authoritative source)
      const fieldAssignments = await storage.getDepartmentFieldAssignmentsWithDefinitions(template.id);
      const enabledMetrics = fieldAssignments
        .filter(a => a.isEnabled && a.fieldDefinition?.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(a => ({
          key: a.fieldDefinition?.key || '',
          label: a.fieldDefinition?.label || '',
          type: a.fieldDefinition?.type || 'text'
        }));

      res.json({
        staffName: staffName,
        department: department,
        departmentLabel: template.departmentLabel || department,
        code: departmentCode.code,
        metrics: enabledMetrics,
        procedures: procedures.map(p => ({
          id: p.id,
          name: p.procedureName,
          description: p.description,
          type: p.procedureType,
          isRequired: p.isRequired,
          sortOrder: p.sortOrder
        }))
      });
    } catch (error) {
      console.error('Error getting department form:', error);
      res.status(500).json({ message: 'Failed to get department form' });
    }
  });

  // Submit a report via public form (no auth required)
  app.post('/api/public/daily-reports/submit', async (req, res) => {
    try {
      const { code, reportDate, performanceSummary, overallRating, hasCustomerConcerns, customerConcernsSummary, metricsData, incidents, procedureCompletions } = req.body;

      // Validate access code
      const accessCode = await storage.getDailyReportAccessCodeByCode(code);
      if (!accessCode || !accessCode.isActive) {
        return res.status(403).json({ message: 'Invalid or inactive access code' });
      }

      // Get procedure templates to calculate totals
      const procedures = await storage.getDailyProcedureTemplates(accessCode.department, true);
      const proceduresTotalCount = procedures.length;
      let proceduresCompletedCount = 0;

      // Count completed procedures
      if (procedureCompletions && typeof procedureCompletions === 'object') {
        proceduresCompletedCount = Object.values(procedureCompletions).filter(Boolean).length;
      }

      // Validate required procedures are completed (must be explicitly true)
      const requiredProcedures = procedures.filter(p => p.isRequired);
      if (requiredProcedures.length > 0) {
        const completions = procedureCompletions || {};
        const missingRequired = requiredProcedures.filter(p => completions[p.id] !== true);
        if (missingRequired.length > 0) {
          return res.status(400).json({ 
            message: `Please complete all required procedures before submitting. Missing: ${missingRequired.map(p => p.procedureName).join(', ')}`
          });
        }
      }

      // Create the report - convert reportDate string to Date object
      const reportDateValue = reportDate ? new Date(reportDate + 'T12:00:00Z') : new Date();
      
      const report = await storage.createDailyReport({
        department: accessCode.department,
        reportDate: reportDateValue,
        status: 'submitted',
        performanceSummary: performanceSummary || null,
        overallRating: overallRating || null,
        hasCustomerConcerns: hasCustomerConcerns || false,
        customerConcernsSummary: customerConcernsSummary || null,
        metricsData: metricsData || null,
        proceduresCompletedCount,
        proceduresTotalCount,
        proceduresCompleted: proceduresCompletedCount === proceduresTotalCount && proceduresTotalCount > 0,
        submittedById: `access_code_${accessCode.id}`,
        submittedByName: accessCode.staffName,
        submittedAt: new Date()
      });

      // Save procedure completions
      if (procedureCompletions && typeof procedureCompletions === 'object') {
        for (const [procedureId, completed] of Object.entries(procedureCompletions)) {
          await storage.upsertDailyProcedureCompletion({
            reportId: report.id,
            procedureTemplateId: procedureId,
            completed: completed === true,
            completedById: `access_code_${accessCode.id}`,
            completedByName: accessCode.staffName
          });
        }
      }

      // Create incidents if any
      if (incidents && Array.isArray(incidents)) {
        for (const incident of incidents) {
          await storage.createDailyReportIncident({
            reportId: report.id,
            ...incident
          });
        }
      }

      // Update last used
      await storage.updateDailyReportAccessCodeLastUsed(code);

      // Send email notifications
      try {
        const { generateDailyReportEmail, sendEmail } = await import("./email");
        const template = await storage.getDailyReportTemplateByDepartment(accessCode.department);
        
        // Get notification emails from template (department level)
        const notificationEmails = (template?.notificationEmails as Array<{ email: string; name?: string; role?: string }>) || [];

        if (notificationEmails.length > 0) {
          const reportIncidents = await storage.getDailyReportIncidents(report.id);

          const emailData = generateDailyReportEmail({
            department: report.department,
            departmentLabel: template?.departmentLabel || report.department,
            reportDate: new Date(report.reportDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            submitterName: accessCode.staffName,
            performanceSummary: report.performanceSummary || undefined,
            overallRating: report.overallRating || undefined,
            hasCustomerConcerns: report.hasCustomerConcerns || false,
            customerConcernsSummary: report.customerConcernsSummary || undefined,
            metricsData: (report.metricsData as Record<string, any>) || undefined,
            metricsConfig: template?.metrics as Array<{ key: string; label: string; unit?: string }> || undefined,
            incidentCount: reportIncidents.length,
            proceduresCompletedCount: report.proceduresCompletedCount || 0,
            proceduresTotalCount: report.proceduresTotalCount || 0
          });

          for (const recipient of notificationEmails) {
            try {
              await sendEmail(recipient.email, emailData.subject, emailData.html, emailData.text);
              console.log(`[Daily Reports] Email sent to ${recipient.email}`);
            } catch (emailError) {
              console.error(`[Daily Reports] Failed to send email to ${recipient.email}:`, emailError);
            }
          }
        }
      } catch (emailError) {
        console.error('[Daily Reports] Error sending email notifications:', emailError);
      }

      res.json({ success: true, reportId: report.id });
    } catch (error) {
      console.error('Error submitting public report:', error);
      res.status(500).json({ message: 'Failed to submit report' });
    }
  });

  // Save a draft report from public form (without submitting)
  app.post('/api/public/daily-reports/save-draft', async (req, res) => {
    try {
      const { code, reportDate, performanceSummary, overallRating, hasCustomerConcerns, customerConcernsSummary, metricsData, incidents, procedureCompletions } = req.body;

      // Validate access code
      const accessCode = await storage.getDailyReportAccessCodeByCode(code);
      if (!accessCode || !accessCode.isActive) {
        return res.status(403).json({ message: 'Invalid or inactive access code' });
      }

      // Get procedure templates to calculate totals
      const procedures = await storage.getDailyProcedureTemplates(accessCode.department, true);
      const proceduresTotalCount = procedures.length;
      let proceduresCompletedCount = 0;

      // Count completed procedures
      if (procedureCompletions && typeof procedureCompletions === 'object') {
        proceduresCompletedCount = Object.values(procedureCompletions).filter(Boolean).length;
      }

      // NO validation of required procedures for drafts - allow saving incomplete work

      // Create the report as draft
      const reportDateValue = reportDate ? new Date(reportDate + 'T12:00:00Z') : new Date();
      
      const report = await storage.createDailyReport({
        department: accessCode.department,
        reportDate: reportDateValue,
        status: 'draft',
        performanceSummary: performanceSummary || null,
        overallRating: overallRating || null,
        hasCustomerConcerns: hasCustomerConcerns || false,
        customerConcernsSummary: customerConcernsSummary || null,
        metricsData: metricsData || null,
        proceduresCompletedCount,
        proceduresTotalCount,
        proceduresCompleted: proceduresCompletedCount === proceduresTotalCount && proceduresTotalCount > 0,
        submittedById: `access_code_${accessCode.id}`,
        submittedByName: accessCode.staffName
        // Note: No submittedAt for drafts
      });

      // Save procedure completions
      if (procedureCompletions && typeof procedureCompletions === 'object') {
        for (const [procedureId, completed] of Object.entries(procedureCompletions)) {
          await storage.upsertDailyProcedureCompletion({
            reportId: report.id,
            procedureTemplateId: procedureId,
            completed: completed === true,
            completedById: `access_code_${accessCode.id}`,
            completedByName: accessCode.staffName
          });
        }
      }

      // Create incidents if any
      if (incidents && Array.isArray(incidents)) {
        for (const incident of incidents) {
          await storage.createDailyReportIncident({
            reportId: report.id,
            ...incident
          });
        }
      }

      // Update last used
      await storage.updateDailyReportAccessCodeLastUsed(code);

      // NO email notifications for drafts

      res.json({ success: true, reportId: report.id, status: 'draft' });
    } catch (error) {
      console.error('Error saving draft report:', error);
      res.status(500).json({ message: 'Failed to save draft' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Seed Daily Reports department templates
async function seedDailyReportTemplates(): Promise<void> {
  console.log('[Daily Reports] Checking department templates...');
  
  // Generic field definitions that apply to all departments
  const genericFieldDefs = [
    { key: 'total_reservations', label: 'Total Reservations', type: 'number' as const, description: 'Total number of reservations for the day', sortOrder: 1 },
    { key: 'no_shows', label: 'No Shows', type: 'number' as const, description: 'Number of no-show reservations', sortOrder: 2 },
    { key: 'walkins', label: 'Walk-ins', type: 'number' as const, description: 'Number of walk-in customers', sortOrder: 3 },
    { key: 'walkin_tasting_bar', label: 'Walk-in Tasting Bar', type: 'number' as const, description: 'Walk-ins for tasting bar', sortOrder: 4 },
    { key: 'walkin_tours', label: 'Walk-in Tours', type: 'number' as const, description: 'Walk-ins for tours', sortOrder: 5 },
    { key: 'low_inventory_items', label: 'Low Inventory Items (ASAP)', type: 'text' as const, description: 'Items that need immediate restocking', sortOrder: 6 },
    { key: 'items_86d', label: "Items 86'd", type: 'text' as const, description: 'Items that are no longer available', sortOrder: 7 },
    { key: 'customer_incident_reports', label: 'Customer Incident Reports', type: 'text' as const, description: 'Reports of customer incidents', sortOrder: 8 },
    { key: 'customer_comments', label: 'Customer Comments', type: 'text' as const, description: 'General customer feedback', sortOrder: 9 },
    { key: 'summary', label: 'Summary', type: 'text' as const, description: 'Daily summary notes', sortOrder: 10 },
    { key: 'voids_explanations', label: 'Voids and Explanations', type: 'text' as const, description: 'Voided transactions with explanations', sortOrder: 11 },
    { key: 'building_name', label: 'Building Name', type: 'text' as const, description: 'Name of building for maintenance', sortOrder: 12 },
    { key: 'equipment_name', label: 'Equipment Name', type: 'text' as const, description: 'Equipment that needs attention', sortOrder: 13 },
    { key: 'repair_maintenance_desc', label: 'Repair or Maintenance Description', type: 'text' as const, description: 'Description of repair or maintenance needed', sortOrder: 14 },
    { key: 'location', label: 'Location', type: 'text' as const, description: 'Specific location reference', sortOrder: 15 },
    { key: 'area_cleaned', label: 'Area Cleaned', type: 'text' as const, description: 'Areas that were cleaned', sortOrder: 16 },
    { key: 'product_required', label: 'Product Required', type: 'text' as const, description: 'Products needed for restocking', sortOrder: 17 },
    { key: 'incident_report', label: 'Incident Report', type: 'text' as const, description: 'General incident reporting', sortOrder: 18 }
  ];

  const departments = [
    { department: 'tasting_room', departmentLabel: 'Tasting Room' },
    { department: 'retail', departmentLabel: 'Retail' },
    { department: 'the_knoll', departmentLabel: 'The Knoll' },
    { department: 'pavilion', departmentLabel: 'Pavilion' },
    { department: 'js_restaurant', departmentLabel: "J's Restaurant" },
    { department: 'production', departmentLabel: 'Production' },
    { department: 'events', departmentLabel: 'Events' },
    { department: 'maintenance', departmentLabel: 'Maintenance' },
    { department: 'orchard', departmentLabel: 'Orchard' },
    { department: 'food_operations', departmentLabel: 'Food Operations' }
  ];

  try {
    // First, ensure field definitions exist
    const existingFields = await storage.getDailyReportFieldDefinitions(false);
    const fieldIdMap: Record<string, string> = {};
    
    for (const fieldDef of genericFieldDefs) {
      let existingField = existingFields.find(f => f.key === fieldDef.key);
      if (!existingField) {
        existingField = await storage.createDailyReportFieldDefinition(fieldDef);
      }
      fieldIdMap[fieldDef.key] = existingField.id;
    }
    
    // Create department templates with inline metrics for backward compatibility
    const genericMetrics = genericFieldDefs.map(f => ({
      key: f.key,
      label: f.label,
      type: f.type,
      isEnabled: true
    }));

    for (const dept of departments) {
      const template = await storage.upsertDailyReportTemplate({
        department: dept.department as any,
        departmentLabel: dept.departmentLabel,
        metrics: genericMetrics,
        isActive: true
      });
      
      // Ensure junction table entries exist for this template
      const existingAssignments = await storage.getDepartmentFieldAssignments(template.id);
      
      for (const fieldDef of genericFieldDefs) {
        const fieldId = fieldIdMap[fieldDef.key];
        const existing = existingAssignments.find(a => a.fieldDefinitionId === fieldId);
        if (!existing && fieldId) {
          await storage.createDepartmentFieldAssignment({
            templateId: template.id,
            fieldDefinitionId: fieldId,
            isEnabled: true,
            sortOrder: fieldDef.sortOrder
          });
        }
      }
    }
    
    const templates = await storage.getDailyReportTemplates();
    console.log(`[Daily Reports] Department templates: ${templates.length} total`);
  } catch (error) {
    console.error('[Daily Reports] Error seeding templates:', error);
  }
}

// Helper function to generate compliance reminder email
function generateComplianceReminderEmail(task: any, daysUntilDue: number | null): string {
  const priorityColors: Record<string, string> = {
    low: '#22c55e',
    medium: '#f59e0b',
    high: '#ef4444',
    critical: '#dc2626'
  };

  const priorityColor = priorityColors[task.priority] || '#6b7280';
  const dueDateDisplay = task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'Not set';

  const urgencyMessage = daysUntilDue !== null 
    ? daysUntilDue <= 0 
      ? '<p style="color: #dc2626; font-weight: bold;">This task is OVERDUE!</p>'
      : daysUntilDue <= 7 
        ? `<p style="color: #f59e0b; font-weight: bold;">Due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}</p>`
        : `<p style="color: #22c55e;">Due in ${daysUntilDue} days</p>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px 20px; max-width: 600px; margin: 0 auto; }
    .task-box { background-color: #f3f4f6; border-left: 4px solid ${priorityColor}; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .priority-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; background-color: ${priorityColor}; color: white; text-transform: uppercase; }
    .detail-row { margin: 10px 0; }
    .detail-label { font-weight: bold; color: #4f46e5; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Compliance Task Reminder</h1>
  </div>
  <div class="content">
    <p>Hello ${task.assigned_to_name || 'Team Member'},</p>
    
    <p>This is a reminder about an upcoming compliance task that requires your attention.</p>
    
    ${urgencyMessage}
    
    <div class="task-box">
      <h2 style="margin-top: 0;">${task.task_name}</h2>
      <span class="priority-badge">${task.priority} Priority</span>
      
      <div class="detail-row">
        <span class="detail-label">Category:</span> ${task.category.replace('_', ' ').toUpperCase()}
      </div>
      
      <div class="detail-row">
        <span class="detail-label">Due Date:</span> ${dueDateDisplay}
      </div>
      
      ${task.jurisdiction ? `<div class="detail-row"><span class="detail-label">Jurisdiction:</span> ${task.jurisdiction}</div>` : ''}
      
      ${task.regulatory_body ? `<div class="detail-row"><span class="detail-label">Regulatory Body:</span> ${task.regulatory_body}</div>` : ''}
      
      ${task.description ? `<div class="detail-row"><span class="detail-label">Description:</span><br>${task.description}</div>` : ''}
      
      ${task.portal_url ? `<div class="detail-row"><span class="detail-label">Portal URL:</span> <a href="${task.portal_url}">${task.portal_url}</a></div>` : ''}
      
      ${task.estimated_cost ? `<div class="detail-row"><span class="detail-label">Estimated Cost:</span> $${parseFloat(task.estimated_cost).toFixed(2)}</div>` : ''}
    </div>
    
    <p>Please ensure this task is completed before the deadline to maintain compliance.</p>
    
    <div class="footer">
      <p>Nashoba Valley Winery Compliance System</p>
      <p>This is an automated reminder. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
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
