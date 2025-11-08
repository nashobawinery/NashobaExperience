import OpenAI from "openai";
import type { Product } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GuestPreferenceData {
  favorites: Array<{ product: Product; note?: string | null }>;
  viewHistory: Array<{ product: Product; viewCount: number }>;
  cartItems: Array<{ product: Product; quantity: number }>;
  statedPreferences?: {
    beverageTypes: string[];
    wineColors?: string[];
    flavorPreferences: string[];
    occasion?: string;
  };
}

export async function generateRecommendations(
  allProducts: Product[],
  preferenceData: GuestPreferenceData
): Promise<Array<{ product: Product; reason: string }>> {
  const { favorites, viewHistory, cartItems, statedPreferences } = preferenceData;

  console.log("[AI Recommendations] Generating recommendations with:", {
    favoritesCount: favorites.length,
    viewHistoryCount: viewHistory.length,
    cartItemsCount: cartItems.length,
    statedPreferences,
  });

  // If no preference data at all, return empty recommendations
  if (
    favorites.length === 0 && 
    viewHistory.length === 0 && 
    cartItems.length === 0 &&
    (!statedPreferences || statedPreferences.beverageTypes.length === 0)
  ) {
    console.log("[AI Recommendations] Returning empty - no preference data");
    return [];
  }

  // Build context for AI
  const favoritedProducts = favorites.map(f => ({
    name: f.product.name,
    category: f.product.category,
    description: f.product.description,
    tastingNotes: f.product.tastingNotes,
    sweetness: f.product.sweetness,
    body: f.product.body,
    guestNote: f.note,
  }));

  const viewedProducts = viewHistory
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 5)
    .map(v => ({
      name: v.product.name,
      category: v.product.category,
      description: v.product.description,
      viewCount: v.viewCount,
    }));

  const cartProducts = cartItems.map(c => ({
    name: c.product.name,
    category: c.product.category,
    quantity: c.quantity,
  }));

  // Filter out products already favorited or in cart
  const favoritedIds = new Set(favorites.map(f => f.product.id));
  const cartIds = new Set(cartItems.map(c => c.product.id));
  const availableProducts = allProducts.filter(
    p => !favoritedIds.has(p.id) && !cartIds.has(p.id) && p.available
  );

  const productList = availableProducts.map(p => ({
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    description: p.description,
    tags: p.tags,
    sweetness: p.sweetness,
    body: p.body,
  }));


  // Build stated preferences section if available
  let statedPreferencesText = "";
  if (statedPreferences && statedPreferences.beverageTypes.length > 0) {
    statedPreferencesText = `
Guest's Stated Preferences:
- Preferred Beverage Types: ${statedPreferences.beverageTypes.join(", ")}
${statedPreferences.wineColors && statedPreferences.wineColors.length > 0 ? `- Wine Color Preferences: ${statedPreferences.wineColors.join(", ")}` : ""}
${statedPreferences.flavorPreferences.length > 0 ? `- Flavor Preferences: ${statedPreferences.flavorPreferences.join(", ")}` : ""}
${statedPreferences.occasion ? `- Occasion: ${statedPreferences.occasion}` : ""}
`;
  }

  const prompt = `You are an expert sommelier at Nashoba Winery helping a guest discover new products based on their preferences.
${statedPreferencesText}
${favoritedProducts.length > 0 ? `Guest's Favorited Products:
${JSON.stringify(favoritedProducts, null, 2)}
` : ""}
${viewedProducts.length > 0 ? `Products Guest Viewed:
${JSON.stringify(viewedProducts, null, 2)}
` : ""}
${cartProducts.length > 0 ? `Products in Cart:
${JSON.stringify(cartProducts, null, 2)}
` : ""}
Available Products to Recommend From:
${JSON.stringify(productList, null, 2)}

Based on the guest's preferences, recommend 4-6 products from the available list that would suit their taste profile. For each recommendation, provide:
1. The product ID
2. A brief, personalized reason why this product matches their preferences (1-2 sentences, written in friendly sommelier tone)

CRITICAL FILTERING RULES:
1. Search through the description and tags fields to find matches
2. STRICT CATEGORY: Only recommend products from the guest's selected beverage type(s)
3. STRICT WINE COLOR: If wine colors are specified (red, white, rosé, sparkling), ONLY recommend wines of those colors - find color info in description/tags
4. Other preferences (sweetness, body, flavors) are secondary considerations

Consider:
${statedPreferences ? "- Beverage type (REQUIRED - only from selected categories)\n" : ""}${statedPreferences?.wineColors && statedPreferences.wineColors.length > 0 ? "- Wine color (REQUIRED - must match selected colors)\n" : ""}- Flavor characteristics (sweetness, body) from description and tags
- Their notes on favorites
- Price range they're comfortable with
- Complementary pairings

Respond in JSON format:
{
  "recommendations": [
    {
      "productId": "product-id-here",
      "reason": "Based on your love for the bold Cabernet, this Pinot Noir offers similar earthy notes with a lighter body that's perfect for exploring new varietals."
    }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert sommelier providing personalized wine and spirits recommendations. Be friendly, knowledgeable, and concise.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    const recommendations = result.recommendations || [];

    // Map recommendations to products and apply STRICT filtering
    type RecommendedProduct = { product: Product; reason: string };
    const mappedRecommendations = recommendations
      .map((rec: { productId: string; reason: string }): RecommendedProduct | null => {
        const product = availableProducts.find(p => p.id === rec.productId);
        if (!product) return null;
        return {
          product,
          reason: rec.reason,
        };
      })
      .filter((rec: RecommendedProduct | null): rec is RecommendedProduct => rec !== null);

    // CRITICAL: Apply strict filtering to AI recommendations (AI doesn't always follow rules)
    const filteredRecommendations = mappedRecommendations.filter(rec => {
      const product = rec.product;
      
      // STRICT beverage type filtering
      if (statedPreferences?.beverageTypes && statedPreferences.beverageTypes.length > 0) {
        const matchesBeverageType = statedPreferences.beverageTypes.some(type =>
          product.category.toLowerCase() === type.toLowerCase() ||
          product.category.toLowerCase().includes(type.toLowerCase())
        );
        if (!matchesBeverageType) {
          console.log(`[AI Filter] Excluding ${product.name} - category ${product.category} doesn't match ${statedPreferences.beverageTypes}`);
          return false;
        }
      }
      
      // STRICT wine color filtering
      if (statedPreferences?.wineColors && statedPreferences.wineColors.length > 0) {
        // Parse tags to extract color - tags are split across array elements with escaped quotes
        let extractedColor = '';
        if (product.tags && Array.isArray(product.tags)) {
          // Join all tag fragments with commas, remove escaped quotes, and parse as JSON
          const joinedTags = product.tags.join(',')  // Add commas between array elements
            .replace(/^{/, '')        // Remove leading {
            .replace(/}$/, '')        // Remove trailing }
            .replace(/\\"/g, '"');    // Unescape quotes
          try {
            const parsed = JSON.parse(`{${joinedTags}}`);
            extractedColor = parsed.color || '';
          } catch (e) {
            // Fallback: search raw tags for color keywords
            extractedColor = product.tags.join(' ');
          }
        }
        
        const searchableText = `${product.description || ''} ${extractedColor}`.toLowerCase();
        const matchesWineColor = statedPreferences.wineColors.some(color => 
          searchableText.includes(color.toLowerCase())
        );
        
        if (!matchesWineColor) {
          console.log(`[AI Filter] Excluding ${product.name} (color: "${extractedColor}") - doesn't match wine colors [${statedPreferences.wineColors}]`);
          return false;
        }
      }
      
      return true;
    }).slice(0, 6);

    console.log("[AI Recommendations] Generated", filteredRecommendations.length, "recommendations after strict filtering");
    return filteredRecommendations;
  } catch (error) {
    console.error("[AI Recommendations] Error generating AI recommendations, using fallback:", error);
    
    // Fallback: Scoring-based recommendations with STRICT filtering
    // Helper function to score products based on preferences
    const scoreProduct = (product: Product): number => {
      let score = 0;

      // STRICT beverage type filtering - product MUST match selected categories
      if (statedPreferences?.beverageTypes && statedPreferences.beverageTypes.length > 0) {
        const matchesBeverageType = statedPreferences.beverageTypes.some(type =>
          product.category.toLowerCase() === type.toLowerCase() ||
          product.category.toLowerCase().includes(type.toLowerCase())
        );
        if (!matchesBeverageType) {
          return 0; // Exclude products that don't match any selected beverage type
        }
        score += 1; // Base score for matching beverage type
      }

      // STRICT wine color filtering - product MUST match if wine colors specified
      if (statedPreferences?.wineColors && statedPreferences.wineColors.length > 0) {
        // Parse tags to extract color - tags are split across array elements with escaped quotes
        let extractedColor = '';
        if (product.tags && Array.isArray(product.tags)) {
          // Join all tag fragments with commas, remove escaped quotes, and parse as JSON
          const joinedTags = product.tags.join(',')  // Add commas between array elements
            .replace(/^{/, '')        // Remove leading {
            .replace(/}$/, '')        // Remove trailing }
            .replace(/\\"/g, '"');    // Unescape quotes
          try {
            const parsed = JSON.parse(`{${joinedTags}}`);
            extractedColor = parsed.color || '';
          } catch {
            // Fallback: search raw tags for color keywords
            extractedColor = product.tags.join(' ');
          }
        }
        
        const searchableText = `${product.description || ''} ${extractedColor}`.toLowerCase();
        
        const matchesWineColor = statedPreferences.wineColors.some(color => 
          searchableText.includes(color.toLowerCase())
        );
        
        if (!matchesWineColor) {
          return 0; // Exclude products that don't match any selected wine color
        }
        score += 3; // High weight for wine color match
      }

      // Score flavor preference matches by searching description and tags
      if (statedPreferences?.flavorPreferences && statedPreferences.flavorPreferences.length > 0) {
        for (const flavor of statedPreferences.flavorPreferences) {
          const flavorLower = flavor.toLowerCase();
          
          // Match dry/sweet to sweetness field
          if (flavorLower === 'dry' && product.sweetness?.toLowerCase().includes('dry')) {
            score += 2;
          }
          if (flavorLower === 'sweet' && product.sweetness?.toLowerCase().includes('sweet')) {
            score += 2;
          }
          
          // Match bold/light to body field
          if (flavorLower === 'bold' && product.body?.toLowerCase().includes('full')) {
            score += 2;
          }
          if (flavorLower === 'light' && product.body?.toLowerCase().includes('light')) {
            score += 2;
          }
          
          // Match keywords in description and tags
          const searchText = `${product.description || ''} ${(product.tags || []).join(' ')}`.toLowerCase();
          if (searchText.includes(flavorLower)) {
            score += 1;
          }
        }
      }

      // Boost favorites categories
      const favoriteCategories = favorites.map(f => f.product.category);
      if (favoriteCategories.includes(product.category)) {
        score += 1;
      }

      return score;
    };

    // Score all products and sort by score
    const scoredProducts = availableProducts
      .map(product => ({ product, score: scoreProduct(product) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    if (scoredProducts.length > 0) {
      console.log("[AI Recommendations] Fallback: Using", scoredProducts.length, "scored matches");
      return scoredProducts
        .slice(0, 6)
        .map(({ product }) => ({
          product,
          reason: `Based on your preferences, this ${product.category} is a great match.`,
        }));
    }

    // If still no matches, just use any available products
    console.log("[AI Recommendations] Fallback: Using any available products");
    return availableProducts
      .slice(0, 4)
      .map(product => ({
        product,
        reason: `We think you'll enjoy this ${product.category}.`,
      }));
  }
}
