import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface B2bCustomer {
  id: string;
  accountName: string;
  emailAddress: string;
  phoneNumber: string;
  accountStatus: string;
  tier?: {
    id: string;
    tierName: string;
    discountPercentage?: string;
    commitmentCases?: number;
  } | null;
  salesRep?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  salesRepId?: string | null;
  businessAddress?: string;
  businessType?: string;
  taxId?: string;
  approvedAt?: string;
}

export function useB2bAdminCustomers(status?: string) {
  return useQuery<B2bCustomer[]>({
    queryKey: ["b2b", "admin", "customers", status],
    queryFn: async () => {
      const url = status 
        ? `/api/b2b/admin/customers?status=${status}`
        : "/api/b2b/admin/customers";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch customers");
      }
      return response.json();
    },
  });
}

export function useB2bApproveCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      customerId,
      tierId,
      salesRepId,
    }: {
      customerId: string;
      tierId: string;
      salesRepId?: string;
    }) => {
      return apiRequest(
        "POST",
        `/api/b2b/admin/customers/${customerId}/approve`,
        { tierId, salesRepId }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b", "admin", "customers"] });
    },
  });
}

export function useB2bRejectCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      customerId,
      reason,
    }: {
      customerId: string;
      reason: string;
    }) => {
      return apiRequest(
        "POST",
        `/api/b2b/admin/customers/${customerId}/reject`,
        { reason }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b", "admin", "customers"] });
    },
  });
}

export function useCreateB2bCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      accountName: string;
      primaryContactName: string;
      emailAddress: string;
      phoneNumber: string;
      licenseNumber?: string;
      taxId?: string;
      billingAddress?: string;
      billingCity?: string;
      billingState?: string;
      billingZipCode?: string;
      shippingAddress?: string;
      shippingCity?: string;
      shippingState?: string;
      shippingZipCode?: string;
      tierId?: string;
      salesRepId?: string;
      autoApprove?: boolean;
      autoGeneratePassword?: boolean;
      customPassword?: string;
      notes?: string;
    }) => {
      return apiRequest("POST", "/api/b2b/admin/customers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b", "admin", "customers"] });
    },
  });
}

export function useUpdateB2bCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      customerId,
      data,
      userType = "admin",
    }: {
      customerId: string;
      data: {
        accountName?: string;
        primaryContactName?: string;
        emailAddress?: string;
        phoneNumber?: string;
        licenseNumber?: string;
        taxId?: string;
        billingAddress?: string;
        billingCity?: string;
        billingState?: string;
        billingZipCode?: string;
        shippingAddress?: string;
        shippingCity?: string;
        shippingState?: string;
        shippingZipCode?: string;
        tierId?: string;
        salesRepId?: string;
        accountStatus?: string;
        notes?: string;
      };
      userType?: "admin" | "sales_rep";
    }) => {
      // Use the appropriate endpoint based on user type
      const endpoint = userType === "sales_rep" 
        ? `/api/b2b/sales-rep/customers/${customerId}`
        : `/api/b2b/admin/customers/${customerId}`;
      return apiRequest("PUT", endpoint, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b", "admin", "customers"] });
      queryClient.invalidateQueries({ queryKey: ["b2b", "sales-rep", "customers"] });
      queryClient.invalidateQueries({ queryKey: ["b2b", "admin", "tier-commitments"] });
    },
  });
}
