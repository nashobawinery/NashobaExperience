import type { Product, GuestSession, Favorite, CartItem, ViewHistory, TriviaQuestion, TriviaScore } from "@shared/schema";

export async function createSession(guestName: string): Promise<GuestSession> {
  const response = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guestName }),
  });
  if (!response.ok) throw new Error("Failed to create session");
  return response.json();
}

export async function updateSessionActivity(sessionId: string): Promise<void> {
  await fetch(`/api/sessions/${sessionId}/activity`, {
    method: "POST",
  });
}

export async function getProducts(filters?: {
  search?: string;
  category?: string;
  wineColor?: string;
  sweetness?: string;
  minPrice?: number;
  maxPrice?: number;
}): Promise<Product[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.category && filters.category !== 'all') params.set("category", filters.category);
  if (filters?.wineColor && filters.wineColor !== 'all') params.set("wineColor", filters.wineColor);
  if (filters?.sweetness && filters.sweetness !== 'all') params.set("sweetness", filters.sweetness);
  if (filters?.minPrice) params.set("minPrice", filters.minPrice.toString());
  if (filters?.maxPrice) params.set("maxPrice", filters.maxPrice.toString());
  
  const response = await fetch(`/api/products?${params}`);
  if (!response.ok) throw new Error("Failed to fetch products");
  return response.json();
}

export async function getFavorites(sessionId: string): Promise<Array<Favorite & { product: Product }>> {
  const response = await fetch(`/api/sessions/${sessionId}/favorites`);
  if (!response.ok) throw new Error("Failed to fetch favorites");
  return response.json();
}

export async function addFavorite(sessionId: string, productId: string): Promise<Favorite> {
  const response = await fetch(`/api/sessions/${sessionId}/favorites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId }),
  });
  if (!response.ok) throw new Error("Failed to add favorite");
  return response.json();
}

export async function removeFavorite(sessionId: string, productId: string): Promise<void> {
  const response = await fetch(`/api/sessions/${sessionId}/favorites/${productId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to remove favorite");
}

export async function updateFavoriteNote(favoriteId: string, note: string): Promise<Favorite> {
  const response = await fetch(`/api/favorites/${favoriteId}/note`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note }),
  });
  if (!response.ok) throw new Error("Failed to update note");
  return response.json();
}

export async function recordView(sessionId: string, productId: string): Promise<void> {
  await fetch(`/api/sessions/${sessionId}/views`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId }),
  });
}

export async function getViewHistory(sessionId: string): Promise<Array<ViewHistory & { product: Product }>> {
  const response = await fetch(`/api/sessions/${sessionId}/views`);
  if (!response.ok) throw new Error("Failed to fetch view history");
  return response.json();
}

export async function getCartItems(sessionId: string): Promise<Array<CartItem & { product: Product }>> {
  const response = await fetch(`/api/sessions/${sessionId}/cart`);
  if (!response.ok) throw new Error("Failed to fetch cart");
  return response.json();
}

export async function addToCart(sessionId: string, productId: string, quantity = 1): Promise<CartItem> {
  const response = await fetch(`/api/sessions/${sessionId}/cart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, quantity }),
  });
  if (!response.ok) throw new Error("Failed to add to cart");
  return response.json();
}

export async function updateCartQuantity(cartItemId: string, quantity: number): Promise<CartItem> {
  const response = await fetch(`/api/cart/${cartItemId}/quantity`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity }),
  });
  if (!response.ok) throw new Error("Failed to update quantity");
  return response.json();
}

export async function removeFromCart(cartItemId: string): Promise<void> {
  const response = await fetch(`/api/cart/${cartItemId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to remove from cart");
}

export async function getTriviaQuestions(activeOnly = true): Promise<TriviaQuestion[]> {
  const params = new URLSearchParams();
  if (activeOnly) params.set("activeOnly", "true");
  
  const response = await fetch(`/api/trivia/questions?${params}`);
  if (!response.ok) throw new Error("Failed to fetch trivia questions");
  return response.json();
}

export async function getNextTriviaQuestion(sessionId: string): Promise<TriviaQuestion | null> {
  const response = await fetch(`/api/sessions/${sessionId}/trivia/next`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Failed to fetch next question");
  return response.json();
}

export async function recordTriviaAnswer(sessionId: string, questionId: string, isCorrect: boolean): Promise<TriviaScore> {
  const response = await fetch(`/api/sessions/${sessionId}/trivia/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId, isCorrect }),
  });
  if (!response.ok) throw new Error("Failed to record answer");
  return response.json();
}

export async function getTriviaScores(sessionId: string): Promise<TriviaScore[]> {
  const response = await fetch(`/api/sessions/${sessionId}/trivia/scores`);
  if (!response.ok) throw new Error("Failed to fetch scores");
  return response.json();
}

export async function createTriviaQuestion(question: any): Promise<TriviaQuestion> {
  const response = await fetch("/api/trivia/questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(question),
  });
  if (!response.ok) throw new Error("Failed to create trivia question");
  return response.json();
}

export async function updateTriviaQuestion(id: string, question: any): Promise<TriviaQuestion> {
  const response = await fetch(`/api/trivia/questions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(question),
  });
  if (!response.ok) throw new Error("Failed to update trivia question");
  return response.json();
}

export async function deleteTriviaQuestion(id: string): Promise<void> {
  const response = await fetch(`/api/trivia/questions/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete trivia question");
}

export async function createProduct(product: any): Promise<Product> {
  const response = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
  if (!response.ok) throw new Error("Failed to create product");
  return response.json();
}

export async function updateProduct(id: string, product: any): Promise<Product> {
  const response = await fetch(`/api/products/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
  if (!response.ok) throw new Error("Failed to update product");
  return response.json();
}

export async function deleteProduct(id: string): Promise<void> {
  const response = await fetch(`/api/products/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete product");
}

export async function getRecommendations(sessionId: string): Promise<Array<{ product: Product; reason: string }>> {
  const response = await fetch(`/api/sessions/${sessionId}/recommendations`);
  if (!response.ok) throw new Error("Failed to fetch recommendations");
  return response.json();
}

export async function emailCart(sessionId: string, cartData: { subtotal: number; discount: number; triviaCredit: number; total: number }): Promise<void> {
  const response = await fetch(`/api/sessions/${sessionId}/email/cart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cartData),
  });
  if (!response.ok) throw new Error("Failed to email cart");
}

export async function emailFavorites(sessionId: string, email: string): Promise<void> {
  const response = await fetch(`/api/sessions/${sessionId}/email/favorites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) throw new Error("Failed to email favorites");
}

export async function downloadProductTemplate(): Promise<void> {
  const response = await fetch("/api/admin/products/template");
  if (!response.ok) throw new Error("Failed to download template");
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "product-template.xlsx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function uploadProducts(file: File): Promise<{ success: number; failed: number; errors?: string[] }> {
  const formData = new FormData();
  formData.append("file", file);
  
  const response = await fetch("/api/admin/products/import", {
    method: "POST",
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to upload products" }));
    throw new Error(errorData.message || "Failed to upload products");
  }
  
  return response.json();
}

export async function submitSurvey(sessionId: string, surveyData: {
  easeOfUse: number | null;
  helpfulness: number | null;
  staffReplacement: number | null;
  recommendation: number | null;
  favoriteFeature: string;
  improvements: string;
  additionalComments: string;
}): Promise<void> {
  const response = await fetch(`/api/sessions/${sessionId}/survey`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(surveyData),
  });
  if (!response.ok) throw new Error("Failed to submit survey");
}
