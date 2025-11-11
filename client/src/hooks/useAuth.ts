import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 0, // Always consider data stale
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes but always refetch
    refetchOnMount: true, // Always verify auth on mount
    refetchOnWindowFocus: true, // Verify auth when window regains focus
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
  };
}
