import { useState } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import GuestApp from "@/pages/GuestApp";
import AdminDashboard from "@/pages/AdminDashboard";
import Landing from "@/pages/Landing";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

// B2B Imports
import { B2bAuthProvider } from "@/contexts/B2bAuthContext";
import { B2bLayout } from "@/components/b2b/B2bLayout";
import { ProtectedRoute } from "@/components/b2b/ProtectedRoute";
import B2bPricingPage from "@/pages/b2b/PricingPage";
import B2bRegistrationPage from "@/pages/b2b/RegistrationPage";
import B2bLoginPage from "@/pages/b2b/LoginPage";
import B2bCatalogPage from "@/pages/b2b/CatalogPage";
import B2bCartPage from "@/pages/b2b/CartPage";
import B2bCheckoutPage from "@/pages/b2b/CheckoutPage";
import B2bOrdersPage from "@/pages/b2b/OrdersPage";
import B2bReorderPage from "@/pages/b2b/ReorderPage";
import B2bAdminDashboard from "@/pages/b2b/AdminDashboard";

function AdminRoute() {
  const [, setLocation] = useLocation();
  const { isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Redirect to="/" />;
  }

  return <AdminDashboard onBackToGuest={() => setLocation("/")} />;
}

// B2B Routes Component
function B2bRoutes() {
  return (
    <B2bAuthProvider>
      <B2bLayout>
        <Switch>
          {/* Public B2B Routes */}
          <Route path="/b2b" component={B2bPricingPage} />
          <Route path="/b2b/register" component={B2bRegistrationPage} />
          <Route path="/b2b/login/:role" component={B2bLoginPage} />

          {/* Protected Customer Routes */}
          <Route path="/b2b/catalog">
            <ProtectedRoute requireCustomer>
              <B2bCatalogPage />
            </ProtectedRoute>
          </Route>
          <Route path="/b2b/cart">
            <ProtectedRoute requireCustomer>
              <B2bCartPage />
            </ProtectedRoute>
          </Route>
          <Route path="/b2b/checkout">
            <ProtectedRoute requireCustomer>
              <B2bCheckoutPage />
            </ProtectedRoute>
          </Route>
          <Route path="/b2b/orders">
            <ProtectedRoute requireCustomer>
              <B2bOrdersPage />
            </ProtectedRoute>
          </Route>
          <Route path="/b2b/reorder">
            <ProtectedRoute requireCustomer>
              <B2bReorderPage />
            </ProtectedRoute>
          </Route>

          {/* Protected Admin Routes */}
          <Route path="/b2b/admin">
            <ProtectedRoute requireAdmin>
              <B2bAdminDashboard />
            </ProtectedRoute>
          </Route>

          <Route component={NotFound} />
        </Switch>
      </B2bLayout>
    </B2bAuthProvider>
  );
}

function Router() {
  const [showAdmin, setShowAdmin] = useState(false);
  const { user, isAdmin } = useAuth();
  const [location] = useLocation();

  // Handle admin button click
  const handleAdminClick = () => {
    if (!user) {
      window.location.href = "/api/login";
      return;
    }
    
    if (!isAdmin) {
      alert("Access denied. Only administrators can access this area.");
      return;
    }
    
    setShowAdmin(true);
  };

  if (showAdmin && isAdmin) {
    return <AdminDashboard onBackToGuest={() => setShowAdmin(false)} />;
  }

  // B2B routes take priority
  if (location.startsWith("/b2b")) {
    return <B2bRoutes />;
  }

  return (
    <div className="relative">
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdminClick}
          data-testid="button-admin-mode"
        >
          Admin
        </Button>
      </div>
      <Switch>
        <Route path="/" component={GuestApp} />
        <Route path="/admin" component={AdminRoute} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
