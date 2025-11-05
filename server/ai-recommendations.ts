import OpenAI from "openai";
import type { Product } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GuestPreferenceData {
  favorites: Array<{ product: Product; note?: string | null }>;
  viewHistory: Array<{ product: Product; viewCount: number }>;
  cartItems: Array<{ product: Product; quantity: number }>;
}

export async function generateRecommendations(
  allProducts: Product[],
  preferenceData: GuestPreferenceData
): Promise<Array<{ product: Product; reason: string }>> {
  const { favorites, viewHistory, cartItems } = preferenceData;

  // If no preference data, return empty recommendations
  if (favorites.length === 0 && viewHistory.length === 0 && cartItems.length === 0) {
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

  const prompt = `You are an expert sommelier at Nashoba Winery helping a guest discover new products based on their preferences.

Guest's Favorited Products:
${JSON.stringify(favoritedProducts, null, 2)}

Products Guest Viewed:
${JSON.stringify(viewedProducts, null, 2)}

Products in Cart:
${JSON.stringify(cartProducts, null, 2)}

Available Products to Recommend From:
${JSON.stringify(productList, null, 2)}

Based on the guest's preferences, recommend 4-6 products from the available list that would suit their taste profile. For each recommendation, provide:
1. The product ID
2. A brief, personalized reason why this product matches their preferences (1-2 sentences, written in friendly sommelier tone)

Consider:
- Wine characteristics they've shown interest in (color, sweetness, body)
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

    return recommendedProducts;
  } catch (error) {
    console.error("Error generating AI recommendations:", error);
    
    // Fallback: Simple rule-based recommendations if AI fails
    const fallbackRecs = availableProducts
      .filter(p => {
        // Recommend products in same categories as favorites
        const favoriteCategories = favorites.map(f => f.product.category);
        return favoriteCategories.includes(p.category);
      })
      .slice(0, 4)
      .map(product => ({
        product,
        reason: `Similar to products you've enjoyed in the ${product.category} category.`,
      }));

    return fallbackRecs;
  }
}
