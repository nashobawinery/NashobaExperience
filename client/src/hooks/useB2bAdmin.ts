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
  orderType?: 'order' | 'return';
  items?: B2bOrderItem[];
  customer?: {
    id: string;
    accountName: string;
    primaryContactName?: string;
    emailAddress: string;
    salesRepId?: string | null;
  } | null;
}

export interface B2bOrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productSku?: string;
  sku?: string;
  quantity: number;
  caseSize?: number;
  unitPrice: string;
  totalPrice?: string;
  lineTotal?: string;
  retailPrice?: string;
}

export interface SalesRep {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  territory?: string;
  commissionPercentage?: number;
  active: boolean;
}

export interface B2bAdmin {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  active: boolean;
  receiveOrderEmails?: boolean;
  receiveContractNotifications?: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TierPricing {
  id: string;
  tierName: string;
  description?: string;
  discountPercentage: string;
  active: boolean;
  minOrderQuantity?: number;
  category?: string;
  commitmentCases?: number;
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

// Fetch all admins
export function useB2bAdmins() {
  return useQuery<B2bAdmin[]>({
    queryKey: ["b2b", "admin", "admins"],
    queryFn: async () => {
      const response = await fetch("/api/b2b/admin/admins");
      if (!response.ok) {
        throw new Error("Failed to fetch admins");
      }
      return response.json();
    },
  });
}

// Fetch all tiers (admin - shows all tiers including inactive for management)
export function useB2bAdminTiers(category?: string) {
  return useQuery<TierPricing[]>({
    queryKey: category ? ["b2b", "admin", "tiers", category] : ["b2b", "admin", "tiers"],
    queryFn: async () => {
      const url = category 
        ? `/api/b2b/admin/tiers?category=${encodeURIComponent(category)}`
        : "/api/b2b/admin/tiers";
      const response = await fetch(url);
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
      commissionType?: string;
      commissionPercentage?: number;
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
      commissionType?: string;
      commissionPercentage?: number;
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

// Create admin
export function useCreateAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
    }) => {
      return apiRequest("POST", "/api/b2b/admin/admins", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b", "admin", "admins"] });
    },
  });
}

// Update admin
export function useUpdateAdmin() {
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
      password?: string;
      active?: boolean;
    }) => {
      return apiRequest("PATCH", `/api/b2b/admin/admins/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b", "admin", "admins"] });
    },
  });
}

// Delete admin
export function useDeleteAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/b2b/admin/admins/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b", "admin", "admins"] });
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

// Update tier details (discount percentage, description, and commitment cases)
export function useUpdateTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tierId, discountPercentage, description, commitmentCases }: { 
      tierId: string; 
      discountPercentage?: number; 
      description?: string;
      commitmentCases?: number;
    }) => {
      return apiRequest("PATCH", `/api/b2b/admin/tiers/${tierId}`, { discountPercentage, description, commitmentCases });
    },
    onSuccess: () => {
      // Invalidate both admin tiers (for Settings tab) and public tiers (for pricing/approval)
      queryClient.invalidateQueries({ queryKey: ["b2b", "admin", "tiers"] });
      queryClient.invalidateQueries({ queryKey: ["b2b", "public", "tiers"] });
      // Also invalidate tier commitment report since it depends on commitmentCases
      queryClient.invalidateQueries({ queryKey: ["b2b", "admin", "tier-commitment-report"] });
    },
  });
}

// Fetch all products for manual order entry
export interface B2bAdminProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: string;
  caseSize: number;
  currentStock: number;
}

export function useB2bAdminProducts() {
  return useQuery<B2bAdminProduct[]>({
    queryKey: ["b2b", "admin", "products"],
    queryFn: async () => {
      const response = await fetch("/api/b2b/admin/products");
      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }
      return response.json();
    },
  });
}

// Create manual order or return
export function useCreateManualOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { 
      customerId: string; 
      items: Array<{ productId: string; quantity: number }>; 
      notes?: string;
      orderType?: 'order' | 'return';
    }) => {
      return apiRequest("POST", "/api/b2b/admin/orders/manual", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b", "admin", "orders"] });
    },
  });
}

// Delete order (cascades to commissions)
export function useDeleteB2bOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      return apiRequest("DELETE", `/api/b2b/admin/orders/${orderId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b", "admin", "orders"] });
    },
  });
}

// Change customer password (admin only)
export function useChangeCustomerPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      customerId: string;
      newPassword: string;
    }) => {
      return apiRequest("POST", `/api/b2b/admin/customers/${data.customerId}/change-password`, { newPassword: data.newPassword });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b", "admin", "customers"] });
    },
  });
}
