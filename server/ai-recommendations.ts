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
    wineColor: f.product.wineColor,
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
    p => !favoritedIds.has(p.id) && !cartIds.has(p.id) && p.stock === 'in-stock'
  );

  const productList = availableProducts.map(p => ({
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    description: p.description,
    tastingNotes: p.tastingNotes,
    wineColor: p.wineColor,
    sweetness: p.sweetness,
    body: p.body,
  }));

  // Build stated preferences section if available
  let statedPreferencesText = "";
  if (statedPreferences && statedPreferences.beverageTypes.length > 0) {
    statedPreferencesText = `
Guest's Stated Preferences:
- Preferred Beverage Types: ${statedPreferences.beverageTypes.join(", ")}
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

Consider:
${statedPreferences ? "- Their stated beverage type and flavor preferences\n" : ""}- Wine characteristics they've shown interest in (color, sweetness, body)
- Tasting note patterns
- Their notes on favorites
- Price range they're comfortable with
- Category preferences
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

    // Map recommendations to products
    const recommendedProducts = recommendations
      .map((rec: { productId: string; reason: string }) => {
        const product = availableProducts.find(p => p.id === rec.productId);
        if (!product) return null;
        return {
          product,
          reason: rec.reason,
        };
      })
      .filter((rec): rec is { product: Product; reason: string } => rec !== null)
      .slice(0, 6);

    console.log("[AI Recommendations] Generated", recommendedProducts.length, "recommendations");
    return recommendedProducts;
  } catch (error) {
    console.error("[AI Recommendations] Error generating AI recommendations, using fallback:", error);
    
    // Fallback: Simple rule-based recommendations if AI fails
    // Try to match categories first
    const favoriteCategories = favorites.map(f => f.product.category);
    const categoryMatches = availableProducts.filter(p => 
      favoriteCategories.includes(p.category)
    );

    // If we have category matches, use them
    if (categoryMatches.length > 0) {
      console.log("[AI Recommendations] Fallback: Using", categoryMatches.length, "category matches");
      return categoryMatches
        .slice(0, 4)
        .map(product => ({
          product,
          reason: `Similar to products you've enjoyed in the ${product.category} category.`,
        }));
    }

    // Otherwise, use stated preferences if available
    if (statedPreferences && statedPreferences.beverageTypes.length > 0) {
      const preferenceMatches = availableProducts.filter(p =>
        statedPreferences.beverageTypes.some(type => 
          p.category.toLowerCase().includes(type.toLowerCase())
        )
      );
      console.log("[AI Recommendations] Fallback: Using", preferenceMatches.length, "preference matches for", statedPreferences.beverageTypes.join(", "));
      return preferenceMatches
        .slice(0, 4)
        .map(product => ({
          product,
          reason: `Based on your interest in ${statedPreferences.beverageTypes.join(" and ")}, this ${product.category} is a great choice.`,
        }));
    }

    // Last resort: just recommend any available products
    console.log("[AI Recommendations] Fallback: Using any available products");
    return availableProducts
      .slice(0, 4)
      .map(product => ({
        product,
        reason: `We think you'll enjoy this ${product.category}.`,
      }));
  }
}
