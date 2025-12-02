import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface B2bUser {
  id: string;
  email: string;
  type: "customer" | "sales_rep" | "admin";
  name?: string;
  accountName?: string;
  tier?: string;
  salesRep?: string;
}

interface B2bAuthContextType {
  user: B2bUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isCustomer: boolean;
  isSalesRep: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
  refetch: () => void;
}

const B2bAuthContext = createContext<B2bAuthContextType | undefined>(undefined);

export function B2bAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user, isLoading, refetch } = useQuery<B2bUser | null>({
    queryKey: ["b2b", "me"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/b2b/me", {
          credentials: "include",
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 404) {
            return null;
          }
          throw new Error("Failed to fetch user");
        }
        return response.json();
      } catch (error) {
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const logout = async () => {
    try {
      await fetch("/api/b2b/logout", { method: "POST", credentials: "include" });
      queryClient.setQueryData(["b2b", "me"], null);
      queryClient.clear();
      sessionStorage.removeItem("b2b_verified");
      localStorage.removeItem("admin_impersonating"); // Clear impersonation flag
      window.location.href = "/b2b";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const value = {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    isCustomer: user?.type === "customer",
    isSalesRep: user?.type === "sales_rep",
    isAdmin: user?.type === "admin",
    logout,
    refetch,
  };

  return <B2bAuthContext.Provider value={value}>{children}</B2bAuthContext.Provider>;
}

export function useB2bAuth() {
  const context = useContext(B2bAuthContext);
  if (context === undefined) {
    throw new Error("useB2bAuth must be used within B2bAuthProvider");
  }
  return context;
}
