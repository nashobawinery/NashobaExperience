import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface B2bOrder {
  id: string;
  orderNumber: string;
  orderDate: string;
  status: string;
  totalAmount: number;
  totalCases: number;
  items: B2bOrderItem[];
}

export interface B2bOrderItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export function useB2bOrders() {
  return useQuery<B2bOrder[]>({
    queryKey: ["b2b", "orders"],
    queryFn: async () => {
      const response = await fetch("/api/b2b/customer/orders");
      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }
      return response.json();
    },
  });
}

export function useB2bCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderData: { items: { productId: string; quantity: number }[] }) => {
      return apiRequest("/api/b2b/customer/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b", "orders"] });
    },
  });
}
