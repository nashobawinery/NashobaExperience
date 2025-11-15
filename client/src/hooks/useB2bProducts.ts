import { useQuery } from "@tanstack/react-query";

export interface B2bProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  tierPrice?: number;
  caseSize: number;
  currentStock: number;
  imageUrl?: string;
  description?: string;
}

export function useB2bProducts() {
  return useQuery<{ products: B2bProduct[]; tier: string }>({
    queryKey: ["b2b", "products"],
    queryFn: async () => {
      const response = await fetch("/api/b2b/customer/products");
      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }
      return response.json();
    },
  });
}

export function useB2bPreviousProducts() {
  return useQuery<{ products: B2bProduct[]; tier: string }>({
    queryKey: ["b2b", "previous-products"],
    queryFn: async () => {
      const response = await fetch("/api/b2b/customer/previous-products");
      if (!response.ok) {
        throw new Error("Failed to fetch previous products");
      }
      return response.json();
    },
  });
}

export interface TierPricing {
  id: string;
  tierName: string;
  description?: string;
  discountPercentage: string;
  active: boolean;
  minOrderQuantity?: number;
}

// Fetch active tiers only (public - for pricing page and approval dialog)
export function useB2bPublicTiers() {
  return useQuery<TierPricing[]>({
    queryKey: ["b2b", "public", "tiers"],
    queryFn: async () => {
      const response = await fetch("/api/b2b/pricing");
      if (!response.ok) {
        throw new Error("Failed to fetch public pricing");
      }
      const data = await response.json();
      return data.tiers; // Extract tiers from { products, tiers } response
    },
  });
}
