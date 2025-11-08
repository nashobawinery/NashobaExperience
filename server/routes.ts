import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ObjectStorageService } from "./objectStorage";
import { z } from "zod";
import { 
  insertProductSchema,
  updateProductSchema,
  insertGuestSessionSchema,
  insertFavoriteSchema,
  insertCartItemSchema,
  insertTriviaQuestionSchema,
  insertTriviaScoreSchema,
  insertSurveySchema,
  insertProductNoteSchema,
  insertFilterOptionSchema,
  insertSlideshowImageSchema,
  insertMediaLibrarySchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  
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
    const products = await storage.getProducts(filters);
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

  app.post("/api/products", async (req, res) => {
    try {
      const data = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(data);
      res.json(product);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
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

  app.delete("/api/products/:id", async (req, res) => {
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

  app.post("/api/trivia/questions", async (req, res) => {
    try {
      const data = insertTriviaQuestionSchema.parse(req.body);
      const question = await storage.createTriviaQuestion(data);
      res.json(question);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.patch("/api/trivia/questions/:id", async (req, res) => {
    try {
      const question = await storage.updateTriviaQuestion(req.params.id, req.body);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      res.json(question);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.delete("/api/trivia/questions/:id", async (req, res) => {
    const success = await storage.deleteTriviaQuestion(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Question not found" });
    }
    res.json({ success: true });
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

  app.post("/api/settings", async (req, res) => {
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
        rating: req.body.rating,
        feedback: req.body.feedback,
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

      await sendEmail(
        "onsiteorder@nashobawinery.com",
        emailData.subject,
        emailData.html,
        emailData.text
      );

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
      const [session, favorites, viewHistory, cartItems, allProducts] = await Promise.all([
        storage.getGuestSession(req.params.sessionId),
        storage.getFavorites(req.params.sessionId),
        storage.getViewHistory(req.params.sessionId),
        storage.getCartItems(req.params.sessionId),
        storage.getProducts(),
      ]);

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const { generateRecommendations } = await import("./ai-recommendations");
      
      // Build stated preferences if available
      const statedPreferences = (session.preferredBeverageTypes?.length || session.flavorPreferences?.length || session.occasion)
        ? {
            beverageTypes: session.preferredBeverageTypes || [],
            flavorPreferences: session.flavorPreferences || [],
            occasion: session.occasion || undefined,
          }
        : undefined;

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
      const [products, filterOptions, triviaQuestions, slideshowImages, mediaLibrary] = await Promise.all([
        storage.getProducts({}),
        storage.getFilterOptions(),
        storage.getTriviaQuestions(false),
        storage.getSlideshowImages(),
        storage.getMediaLibraryFiles(),
      ]);

      const appSettingsData: any[] = [];
      try {
        const discounts = await storage.getSetting('discountTiers');
        if (discounts) {
          appSettingsData.push(discounts);
        }
      } catch (e) {
        // Ignore if settings don't exist
      }

      const { exportAllDataToExcel } = await import("./excel-import");
      const buffer = exportAllDataToExcel({
        products,
        filterOptions,
        triviaQuestions,
        slideshowImages,
        appSettings: appSettingsData,
        mediaLibrary,
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
        errors: [...parseResult.errors],
        warnings: [...parseResult.warnings],
      };

      // Import products
      for (const product of parseResult.products) {
        try {
          await storage.createProduct(product);
          results.products.success++;
        } catch (error) {
          results.products.failed++;
          results.errors.push(`Product "${product.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Import filter options
      for (const filter of parseResult.filterOptions) {
        try {
          await storage.createFilterOption(filter);
          results.filterOptions.success++;
        } catch (error) {
          results.filterOptions.failed++;
          results.errors.push(`Filter "${filter.displayLabel}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Import trivia questions
      for (const trivia of parseResult.triviaQuestions) {
        try {
          await storage.createTriviaQuestion(trivia);
          results.triviaQuestions.success++;
        } catch (error) {
          results.triviaQuestions.failed++;
          results.errors.push(`Trivia: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Import slideshow images
      for (const image of parseResult.slideshowImages) {
        try {
          await storage.createSlideshowImage(image);
          results.slideshowImages.success++;
        } catch (error) {
          results.slideshowImages.failed++;
          results.errors.push(`Slideshow Image "${image.filename}": ${error instanceof Error ? error.message : 'Unknown error'}`);
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

      // Import media library
      for (const media of parseResult.mediaLibrary) {
        try {
          await storage.createMediaLibraryFile(media);
          results.mediaLibrary.success++;
        } catch (error) {
          results.mediaLibrary.failed++;
          results.errors.push(`Media file "${media.filename}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      const totalSuccess = results.products.success + results.filterOptions.success + 
        results.triviaQuestions.success + results.slideshowImages.success + results.appSettings.success + 
        results.mediaLibrary.success;
      const totalFailed = results.products.failed + results.filterOptions.failed + 
        results.triviaQuestions.failed + results.slideshowImages.failed + results.appSettings.failed + 
        results.mediaLibrary.failed;

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

  app.post("/api/filter-options", async (req, res) => {
    try {
      const data = insertFilterOptionSchema.parse(req.body);
      const option = await storage.createFilterOption(data);
      res.json(option);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.patch("/api/filter-options/:id", async (req, res) => {
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

  app.delete("/api/filter-options/:id", async (req, res) => {
    const success = await storage.deleteFilterOption(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Filter option not found" });
    }
    res.json({ success: true });
  });

  app.post("/api/filter-options/reorder", async (req, res) => {
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

  app.post("/api/slideshow-images", async (req, res) => {
    try {
      const data = insertSlideshowImageSchema.parse(req.body);
      const image = await storage.createSlideshowImage(data);
      res.json(image);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  app.patch("/api/slideshow-images/:id", async (req, res) => {
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

  app.delete("/api/slideshow-images/:id", async (req, res) => {
    const success = await storage.deleteSlideshowImage(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Slideshow image not found" });
    }
    res.json({ success: true });
  });

  app.post("/api/slideshow-images/reorder", async (req, res) => {
    try {
      await storage.updateSlideshowImageOrder(req.body.updates);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  // Media Library Management
  app.post("/api/media-library/upload-url", async (req, res) => {
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

  app.post("/api/media-library", async (req, res) => {
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

  app.patch("/api/media-library/:id", async (req, res) => {
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

  app.delete("/api/media-library/:id", async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
