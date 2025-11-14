import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface B2bOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  status: string;
  subtotal: string;
  discount: string;
  total: string;
  orderDate: string;
  items?: B2bOrderItem[];
}

export interface B2bOrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  caseSize: number;
  unitPrice: string;
  totalPrice: string;
}

export interface SalesRep {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  territory?: string;
  active: boolean;
}

export interface TierPricing {
  id: string;
  tierName: string;
  discountPercentage: string;
  active: boolean;
  minOrderQuantity?: number;
}

// Fetch all orders
export function useB2bAdminOrders() {
  return useQuery<B2bOrder[]>({
    queryKey: ["b2b", "admin", "orders"],
    queryFn: async () => {
      const response = await fetch("/api/b2b/admin/orders");
      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }
      return response.json();
    },
  });
}

// Fetch all sales reps
export function useB2bAdminSalesReps() {
  return useQuery<SalesRep[]>({
    queryKey: ["b2b", "admin", "sales-reps"],
    queryFn: async () => {
      const response = await fetch("/api/b2b/admin/sales-reps");
      if (!response.ok) {
        throw new Error("Failed to fetch sales reps");
      }
      return response.json();
    },
  });
}

// Fetch all tiers (admin - shows all tiers including inactive for management)
export function useB2bAdminTiers() {
  return useQuery<TierPricing[]>({
    queryKey: ["b2b", "admin", "tiers"],
    queryFn: async () => {
      const response = await fetch("/api/b2b/admin/tiers");
      if (!response.ok) {
        throw new Error("Failed to fetch tiers");
      }
      return response.json();
    },
  });
}

// Create sales rep
export function useCreateSalesRep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      firstName: string;
      lastName: string;
      email: string;
      phoneNumber?: string;
      territory?: string;
      password: string;
    }) => {
      return apiRequest("POST", "/api/b2b/admin/sales-reps", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b", "admin", "sales-reps"] });
    },
  });
}

// Update sales rep
export function useUpdateSalesRep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      phoneNumber?: string;
      territory?: string;
      password?: string;
      active?: boolean;
    }) => {
      return apiRequest("PATCH", `/api/b2b/admin/sales-reps/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b", "admin", "sales-reps"] });
    },
  });
}

// Change admin password
export function useChangeAdminPassword() {
  return useMutation({
    mutationFn: async (data: {
      currentPassword: string;
      newPassword: string;
    }) => {
      return apiRequest("POST", "/api/b2b/admin/change-password", data);
    },
  });
}

// Toggle tier active status
export function useToggleTierActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tierId, active }: { tierId: string; active: boolean }) => {
      return apiRequest("PATCH", `/api/b2b/admin/tiers/${tierId}/toggle-active`, { active });
    },
    onSuccess: () => {
      // Invalidate both admin tiers (for Settings tab) and public tiers (for pricing/approval)
      queryClient.invalidateQueries({ queryKey: ["b2b", "admin", "tiers"] });
      queryClient.invalidateQueries({ queryKey: ["b2b", "public", "tiers"] });
    },
  });
}
