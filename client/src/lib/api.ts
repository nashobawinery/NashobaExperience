import type { Product, GuestSession, Favorite, CartItem, ViewHistory, TriviaQuestion, TriviaScore, ProductNote, FilterOption, MediaLibrary, TriviaAchievement, TriviaAttempt, CartDiscount } from "@shared/schema";

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

export async function updateGuestPreferences(
  sessionId: string,
  beverageTypes: string[],
  flavorPreferences: string[],
  wineColors?: string[],
  occasion?: string
): Promise<GuestSession> {
  const response = await fetch(`/api/sessions/${sessionId}/preferences`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ beverageTypes, flavorPreferences, wineColors, occasion }),
  });
  if (!response.ok) throw new Error("Failed to update preferences");
  return response.json();
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

export async function getProductNotes(sessionId: string): Promise<ProductNote[]> {
  const response = await fetch(`/api/sessions/${sessionId}/notes`);
  if (!response.ok) throw new Error("Failed to fetch product notes");
  return response.json();
}

export async function saveProductNote(sessionId: string, productId: string, note: string): Promise<ProductNote> {
  const response = await fetch(`/api/sessions/${sessionId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, note }),
  });
  if (!response.ok) throw new Error("Failed to save note");
  return response.json();
}

export async function deleteProductNote(sessionId: string, productId: string): Promise<void> {
  const response = await fetch(`/api/sessions/${sessionId}/notes/${productId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete note");
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

export async function getCartDiscounts(sessionId: string): Promise<CartDiscount[]> {
  const response = await fetch(`/api/cart-discounts/${sessionId}`);
  if (!response.ok) throw new Error("Failed to fetch cart discounts");
  return response.json();
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

export async function recordTriviaAnswer(sessionId: string, questionId: string, isCorrect: boolean, attemptId?: string): Promise<TriviaScore> {
  const response = await fetch(`/api/sessions/${sessionId}/trivia/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId, isCorrect, attemptId }),
  });
  if (!response.ok) throw new Error("Failed to record answer");
  return response.json();
}

export async function getTriviaScores(sessionId: string): Promise<TriviaScore[]> {
  const response = await fetch(`/api/sessions/${sessionId}/trivia/scores`);
  if (!response.ok) throw new Error("Failed to fetch scores");
  return response.json();
}

export async function startTriviaAttempt(sessionId: string, totalQuestions: number): Promise<TriviaAttempt> {
  const response = await fetch("/api/trivia-attempt/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, totalQuestions }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to start trivia attempt");
  }
  return response.json();
}

export async function completeTriviaAttempt(attemptId: string, correctAnswers: number): Promise<TriviaAttempt & { achievement?: TriviaAchievement }> {
  const response = await fetch("/api/trivia-attempt/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attemptId, correctAnswers }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to complete trivia attempt");
  }
  return response.json();
}

export async function getTokenRedemption(sessionId: string): Promise<(TriviaAttempt & { achievement?: TriviaAchievement }) | null> {
  const response = await fetch(`/api/trivia-attempt/${sessionId}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Failed to fetch token redemption");
  const attempt = await response.json();
  
  if (!attempt.achievementId || attempt.tokenVerifiedAt) {
    return null;
  }
  
  return attempt;
}

export async function verifyTokenRedemption(attemptId: string, staffVerifier?: string, notes?: string): Promise<TriviaAttempt> {
  const response = await fetch("/api/trivia-attempt/verify-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attemptId, staffVerifier, notes }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to verify token");
  }
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

export async function bulkDeleteTriviaQuestions(ids: string[]): Promise<{ success: boolean; deletedCount: number }> {
  const response = await fetch('/api/trivia/questions/bulk-delete', { 
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  });
  if (!response.ok) throw new Error("Failed to delete questions");
  return response.json();
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

// Archive a product (soft delete)
export async function archiveProduct(id: string): Promise<Product> {
  const response = await fetch(`/api/products/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to archive product");
  const data = await response.json();
  return data.product;
}

// Alias for backward compatibility
export const deleteProduct = archiveProduct;

// Restore an archived product
export async function restoreProduct(id: string): Promise<Product> {
  const response = await fetch(`/api/products/${id}/restore`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to restore product");
  const data = await response.json();
  return data.product;
}

// Get all archived products
export async function getArchivedProducts(): Promise<Product[]> {
  const response = await fetch(`/api/products/archived`);
  if (!response.ok) throw new Error("Failed to fetch archived products");
  return response.json();
}

// Permanently delete a product
export async function permanentlyDeleteProduct(id: string): Promise<void> {
  const response = await fetch(`/api/products/${id}/permanent`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to permanently delete product");
}

export async function getRecommendations(sessionId: string): Promise<Array<{ product: Product; reason: string }>> {
  const response = await fetch(`/api/sessions/${sessionId}/recommendations`);
  if (!response.ok) throw new Error("Failed to fetch recommendations");
  return response.json();
}

export async function emailCart(sessionId: string, cartData: { subtotal: number; discount?: number; bottleDiscount?: number; cannedDiscount?: number; triviaCredit: number; total: number }): Promise<void> {
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

export async function exportProducts(): Promise<void> {
  const response = await fetch("/api/admin/products/export");
  if (!response.ok) throw new Error("Failed to export products");
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const timestamp = new Date().toISOString().split('T')[0];
  a.download = `products-export-${timestamp}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function exportAllData(): Promise<void> {
  const response = await fetch("/api/admin/data/export-all");
  if (!response.ok) throw new Error("Failed to export data");
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const timestamp = new Date().toISOString().split('T')[0];
  a.download = `nashoba-all-data-${timestamp}.xlsx`;
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

export async function importAllData(file: File): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);
  
  const response = await fetch("/api/admin/data/import-all", {
    method: "POST",
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to import data" }));
    throw new Error(errorData.message || "Failed to import data");
  }
  
  return response.json();
}

export async function deleteDuplicateProducts(): Promise<{ message: string; duplicatesDeleted: number }> {
  const response = await fetch("/api/admin/products/delete-duplicates", {
    method: "POST",
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to delete duplicates" }));
    throw new Error(errorData.message || "Failed to delete duplicates");
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

export async function getFilterOptions(fieldType?: string): Promise<FilterOption[]> {
  const params = fieldType ? `?fieldType=${fieldType}` : "";
  const response = await fetch(`/api/filter-options${params}`);
  if (!response.ok) throw new Error("Failed to fetch filter options");
  return response.json();
}

export async function createFilterOption(option: {
  fieldType: string;
  optionValue: string;
  displayLabel: string;
  sortOrder: number;
  isActive: boolean;
}): Promise<FilterOption> {
  const response = await fetch("/api/filter-options", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(option),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to create filter option" }));
    throw new Error(errorData.message || "Failed to create filter option");
  }
  return response.json();
}

export async function updateFilterOption(id: string, data: Partial<FilterOption>): Promise<FilterOption> {
  const response = await fetch(`/api/filter-options/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to update filter option" }));
    throw new Error(errorData.message || "Failed to update filter option");
  }
  return response.json();
}

export async function deleteFilterOption(id: string): Promise<void> {
  const response = await fetch(`/api/filter-options/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete filter option");
}

export async function updateFilterOptionOrder(updates: { id: string; sortOrder: number }[]): Promise<void> {
  const response = await fetch('/api/filter-options/reorder', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ updates }),
  });
  if (!response.ok) throw new Error('Failed to reorder filter options');
}

export interface DiscountTier {
  min: number;
  max: number;
  discount: number;
}

export interface DiscountTiers {
  tier1: DiscountTier;
  tier2: DiscountTier;
  tier3: DiscountTier;
  tier4: DiscountTier;
}

export async function getDiscountTiers(): Promise<DiscountTiers> {
  const response = await fetch('/api/settings/discount_tiers');
  if (!response.ok) throw new Error('Failed to fetch discount tiers');
  const setting = await response.json();
  return setting.value;
}

export async function updateDiscountTiers(tiers: DiscountTiers): Promise<void> {
  const response = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'discount_tiers', value: tiers }),
  });
  if (!response.ok) throw new Error('Failed to update discount tiers');
}

export async function getCannedDiscountTiers(): Promise<DiscountTiers> {
  const response = await fetch('/api/settings/canned_discount_tiers');
  if (!response.ok) throw new Error('Failed to fetch canned discount tiers');
  const setting = await response.json();
  return setting.value;
}

export async function updateCannedDiscountTiers(tiers: DiscountTiers): Promise<void> {
  const response = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'canned_discount_tiers', value: tiers }),
  });
  if (!response.ok) throw new Error('Failed to update canned discount tiers');
}

export async function getMediaLibraryUploadUrl(): Promise<string> {
  const response = await fetch('/api/media-library/upload-url', {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to get upload URL');
  const data = await response.json();
  return data.uploadUrl;
}

export async function getMediaLibraryFiles(category?: string): Promise<MediaLibrary[]> {
  const params = new URLSearchParams();
  if (category && category !== 'all') params.set('category', category);
  
  const response = await fetch(`/api/media-library?${params}`);
  if (!response.ok) throw new Error('Failed to fetch media library files');
  return response.json();
}

export async function createMediaLibraryFile(data: Omit<MediaLibrary, 'id' | 'createdAt' | 'updatedAt'>): Promise<MediaLibrary> {
  const response = await fetch('/api/media-library', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create media library file');
  return response.json();
}

export async function updateMediaLibraryFile(id: string, data: Partial<MediaLibrary>): Promise<MediaLibrary> {
  const response = await fetch(`/api/media-library/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update media library file');
  return response.json();
}

export async function deleteMediaLibraryFile(id: string): Promise<void> {
  const response = await fetch(`/api/media-library/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete media library file');
}

export async function getTriviaAchievements(): Promise<TriviaAchievement[]> {
  const response = await fetch('/api/admin/trivia-achievements');
  if (!response.ok) throw new Error('Failed to fetch trivia achievements');
  return response.json();
}

export async function createTriviaAchievement(achievement: any): Promise<TriviaAchievement> {
  const response = await fetch('/api/admin/trivia-achievements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(achievement),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to create trivia achievement' }));
    throw new Error(errorData.message || 'Failed to create trivia achievement');
  }
  return response.json();
}

export async function updateTriviaAchievement(id: string, achievement: any): Promise<TriviaAchievement> {
  const response = await fetch(`/api/admin/trivia-achievements/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(achievement),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to update trivia achievement' }));
    throw new Error(errorData.message || 'Failed to update trivia achievement');
  }
  return response.json();
}

export async function deleteTriviaAchievement(id: string): Promise<void> {
  const response = await fetch(`/api/admin/trivia-achievements/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete trivia achievement');
}
