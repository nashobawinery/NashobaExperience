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

    // Check if admin OR sales rep is impersonating a customer
    const isImpersonating = (isAdmin || isSalesRep) && localStorage.getItem('admin_impersonating');

    // Check if authentication is required but user is not logged in
    if (requireAuth && !user) {
      // Redirect to the appropriate login page based on required role
      if (requireAdmin) {
        setLocation("/b2b/login/admin");
      } else if (requireSalesRep) {
        setLocation("/b2b/login/sales-rep");
      } else {
        setLocation("/b2b/login/customer");
      }
      return;
    }

    // Check role-specific requirements
    // Allow admin or sales rep impersonation to bypass customer-only checks
    if (requireCustomer && !isCustomer && !isImpersonating) {
      setLocation("/b2b/login/customer");
      return;
    }

    // Allow both admins and sales reps to access admin dashboard
    // Sales reps have restricted functionality within the dashboard
    if (requireAdmin && !isAdmin && !isSalesRep) {
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

  // Check if admin OR sales rep is impersonating a customer
  const isImpersonating = (isAdmin || isSalesRep) && localStorage.getItem('admin_impersonating');

  // Allow admin or sales rep impersonation to bypass customer-only checks
  if (requireCustomer && !isCustomer && !isImpersonating) {
    return null;
  }

  // Allow both admins and sales reps to access admin dashboard
  if (requireAdmin && !isAdmin && !isSalesRep) {
    return null;
  }

  if (requireSalesRep && !isSalesRep) {
    return null;
  }

  return <>{children}</>;
}
