import { useState } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import GuestApp from "@/pages/GuestApp";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminHub from "@/pages/AdminHub";
import DatabaseSync from "@/pages/DatabaseSync";
import Landing from "@/pages/Landing";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

// B2B Imports
import { B2bAuthProvider } from "@/contexts/B2bAuthContext";
import { B2bLayout } from "@/components/b2b/B2bLayout";
import { ProtectedRoute } from "@/components/b2b/ProtectedRoute";
import B2bPricingPage from "@/pages/b2b/PricingPage";
import B2bPricingSheetPage from "@/pages/b2b/PricingSheetPage";
import B2bRegistrationPage from "@/pages/b2b/RegistrationPage";
import B2bApplicationThankYouPage from "@/pages/b2b/ApplicationThankYouPage";
import B2bLoginPage from "@/pages/b2b/LoginPage";
import B2bForgotPasswordPage from "@/pages/b2b/ForgotPasswordPage";
import B2bResetPasswordPage from "@/pages/b2b/ResetPasswordPage";
import B2bSetupPage from "@/pages/b2b/SetupPage";
import B2bCatalogPage from "@/pages/b2b/CatalogPage";
import B2bCartPage from "@/pages/b2b/CartPage";
import B2bCheckoutPage from "@/pages/b2b/CheckoutPage";
import B2bOrdersPage from "@/pages/b2b/OrdersPage";
import B2bReorderPage from "@/pages/b2b/ReorderPage";
import B2bAdminDashboard from "@/pages/b2b/AdminDashboard";
import B2bWhereToBuyPage from "@/pages/b2b/WhereToBuyPage";
import B2bSalesRepDashboard from "@/pages/b2b/SalesRepDashboard";
import B2bCustomerDataPage from "@/pages/b2b/CustomerDataPage";

// LMS Imports
import LmsAdminDashboard from "@/pages/lms/LmsAdminDashboard";
import LmsLearnerPortal from "@/pages/lms/LmsLearnerPortal";

// Compliance Imports
import ComplianceAdminDashboard from "@/pages/compliance/ComplianceAdminDashboard";

// Platform Management Imports
import ModuleDirectory from "@/pages/ModuleDirectory";
import AccessControl from "@/pages/AccessControl";

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

function DatabaseSyncRoute() {
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b p-4">
        <Button variant="outline" onClick={() => setLocation("/admin")}>
          Back to Admin
        </Button>
      </header>
      <DatabaseSync />
    </div>
  );
}

function AdminHubRoute() {
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

  return <AdminHub onBackToGuest={() => setLocation("/")} />;
}

function LmsAdminRoute() {
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

  return <LmsAdminDashboard />;
}

function ModuleDirectoryRoute() {
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

  return <ModuleDirectory />;
}

function AccessControlRoute() {
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

  return <AccessControl />;
}

function ComplianceAdminRoute() {
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

  return <ComplianceAdminDashboard />;
}

// B2B Routes Component
function B2bRoutes() {
  return (
    <B2bAuthProvider>
      <B2bLayout>
        <Switch>
          {/* Public B2B Routes */}
          <Route path="/b2b" component={B2bPricingPage} />
          <Route path="/b2b/pricing-sheet" component={B2bPricingSheetPage} />
          <Route path="/b2b/where-to-buy" component={B2bWhereToBuyPage} />
          <Route path="/b2b/register" component={B2bRegistrationPage} />
          <Route path="/b2b/application-submitted" component={B2bApplicationThankYouPage} />
          <Route path="/b2b/login/:role" component={B2bLoginPage} />
          <Route path="/b2b/forgot-password" component={B2bForgotPasswordPage} />
          <Route path="/b2b/reset-password" component={B2bResetPasswordPage} />
          <Route path="/b2b/setup" component={B2bSetupPage} />

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
          <Route path="/b2b/customer-data">
            <ProtectedRoute requireCustomer>
              <B2bCustomerDataPage />
            </ProtectedRoute>
          </Route>

          {/* Protected Admin Routes */}
          <Route path="/b2b/admin">
            <ProtectedRoute requireAdmin>
              <B2bAdminDashboard />
            </ProtectedRoute>
          </Route>

          {/* Protected Sales Rep Routes */}
          <Route path="/b2b/commissions">
            <ProtectedRoute requireSalesRep>
              <B2bSalesRepDashboard />
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
        <Route path="/admin-hub" component={AdminHubRoute} />
        <Route path="/admin" component={AdminRoute} />
        <Route path="/admin/database-sync" component={DatabaseSyncRoute} />
        <Route path="/modules" component={ModuleDirectoryRoute} />
        <Route path="/access-control" component={AccessControlRoute} />
        <Route path="/lms" component={LmsLearnerPortal} />
        <Route path="/lms/admin" component={LmsAdminRoute} />
        <Route path="/compliance/admin" component={ComplianceAdminRoute} />
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
