import { useEffect } from "react";
import { useLocation } from "wouter";
import { useB2bAuth } from "@/contexts/B2bAuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireCustomer?: boolean;
  requireAdmin?: boolean;
  requireSalesRep?: boolean;
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  requireCustomer = false,
  requireAdmin = false,
  requireSalesRep = false,
}: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  const { user, isLoading, isCustomer, isAdmin, isSalesRep } = useB2bAuth();

  useEffect(() => {
    if (isLoading) return;

    // Check if admin is impersonating a customer
    const isAdminImpersonating = isAdmin && localStorage.getItem('admin_impersonating');

    // Check if authentication is required but user is not logged in
    if (requireAuth && !user) {
      setLocation("/b2b/login/customer");
      return;
    }

    // Check role-specific requirements
    // Allow admin impersonation to bypass customer-only checks
    if (requireCustomer && !isCustomer && !isAdminImpersonating) {
      setLocation("/b2b/login/customer");
      return;
    }

    if (requireAdmin && !isAdmin) {
      setLocation("/b2b/login/admin");
      return;
    }

    if (requireSalesRep && !isSalesRep) {
      setLocation("/b2b/login/sales-rep");
      return;
    }
  }, [isLoading, user, isCustomer, isAdmin, isSalesRep, requireAuth, requireCustomer, requireAdmin, requireSalesRep, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (requireAuth && !user) {
    return null;
  }

  // Check if admin is impersonating a customer
  const isAdminImpersonating = isAdmin && localStorage.getItem('admin_impersonating');

  // Allow admin impersonation to bypass customer-only checks
  if (requireCustomer && !isCustomer && !isAdminImpersonating) {
    return null;
  }

  if (requireAdmin && !isAdmin) {
    return null;
  }

  if (requireSalesRep && !isSalesRep) {
    return null;
  }

  return <>{children}</>;
}
