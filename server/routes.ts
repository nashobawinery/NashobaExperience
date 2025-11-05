import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertProductSchema, 
  insertGuestSessionSchema,
  insertFavoriteSchema,
  insertCartItemSchema,
  insertTriviaQuestionSchema,
  insertTriviaScoreSchema,
  insertSurveySchema,
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

  // Products
  app.get("/api/products", async (req, res) => {
    const filters = {
      search: req.query.search as string,
      category: req.query.category as string,
      wineColor: req.query.wineColor as string,
      sweetness: req.query.sweetness as string,
      stock: req.query.stock as string,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
    };

    const products = await storage.getProducts(filters);
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
      const product = await storage.updateProduct(req.params.id, req.body);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
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
    const nextQuestion = allQuestions.find(q => !askedQuestions.includes(q.id));
    
    if (!nextQuestion) {
      return res.status(404).json({ message: "No more questions available" });
    }
    
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
    const setting = await storage.setSetting(req.body.key, req.body.value);
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
      const [favorites, viewHistory, cartItems, allProducts] = await Promise.all([
        storage.getFavorites(req.params.sessionId),
        storage.getViewHistory(req.params.sessionId),
        storage.getCartItems(req.params.sessionId),
        storage.getProducts(),
      ]);

      const { generateRecommendations } = await import("./ai-recommendations");
      
      const recommendations = await generateRecommendations(allProducts, {
        favorites,
        viewHistory,
        cartItems,
      });

      res.json(recommendations);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
