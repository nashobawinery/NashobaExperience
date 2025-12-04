import { useState, lazy, Suspense } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import GuestApp from "@/pages/GuestApp";
import Landing from "@/pages/Landing";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

// Lazy load heavy admin/module pages for better initial load performance
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminHub = lazy(() => import("@/pages/AdminHub"));
const DatabaseSync = lazy(() => import("@/pages/DatabaseSync"));
const ModuleDirectory = lazy(() => import("@/pages/ModuleDirectory"));
const AccessControl = lazy(() => import("@/pages/AccessControl"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));

// Lazy load LMS module
const LmsAdminDashboard = lazy(() => import("@/pages/lms/LmsAdminDashboard"));
const LmsLearnerPortal = lazy(() => import("@/pages/lms/LmsLearnerPortal"));

// Lazy load Compliance module
const ComplianceAdminDashboard = lazy(() => import("@/pages/compliance/ComplianceAdminDashboard"));

// Lazy load Daily Reports module
const DailyReportsAdminDashboard = lazy(() => import("@/pages/daily-reports/DailyReportsAdminDashboard"));
const PublicDailyReportForm = lazy(() => import("@/pages/daily-reports/PublicDailyReportForm"));

// Lazy load B2B module components
const B2bAuthProvider = lazy(() => import("@/contexts/B2bAuthContext").then(m => ({ default: m.B2bAuthProvider })));
const B2bLayout = lazy(() => import("@/components/b2b/B2bLayout").then(m => ({ default: m.B2bLayout })));
const B2bPricingPage = lazy(() => import("@/pages/b2b/PricingPage"));
const B2bPricingSheetPage = lazy(() => import("@/pages/b2b/PricingSheetPage"));
const B2bRegistrationPage = lazy(() => import("@/pages/b2b/RegistrationPage"));
const B2bApplicationThankYouPage = lazy(() => import("@/pages/b2b/ApplicationThankYouPage"));
const B2bLoginPage = lazy(() => import("@/pages/b2b/LoginPage"));
const B2bForgotPasswordPage = lazy(() => import("@/pages/b2b/ForgotPasswordPage"));
const B2bResetPasswordPage = lazy(() => import("@/pages/b2b/ResetPasswordPage"));
const B2bSetupPage = lazy(() => import("@/pages/b2b/SetupPage"));
const B2bCatalogPage = lazy(() => import("@/pages/b2b/CatalogPage"));
const B2bCartPage = lazy(() => import("@/pages/b2b/CartPage"));
const B2bCheckoutPage = lazy(() => import("@/pages/b2b/CheckoutPage"));
const B2bOrdersPage = lazy(() => import("@/pages/b2b/OrdersPage"));
const B2bReorderPage = lazy(() => import("@/pages/b2b/ReorderPage"));
const B2bAdminDashboard = lazy(() => import("@/pages/b2b/AdminDashboard"));
const B2bWhereToBuyPage = lazy(() => import("@/pages/b2b/WhereToBuyPage"));
const B2bSalesRepDashboard = lazy(() => import("@/pages/b2b/SalesRepDashboard"));
const B2bCustomerDataPage = lazy(() => import("@/pages/b2b/CustomerDataPage"));

// Import B2B ProtectedRoute synchronously since it's a wrapper component
import { ProtectedRoute } from "@/components/b2b/ProtectedRoute";
import { B2bAuthProvider as B2bAuthProviderSync } from "@/contexts/B2bAuthContext";
import { B2bLayout as B2bLayoutSync } from "@/components/b2b/B2bLayout";

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function AdminRoute() {
  const [, setLocation] = useLocation();
  const { isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAdmin) {
    return <Redirect to="/" />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <AdminDashboard onBackToGuest={() => setLocation("/")} />
    </Suspense>
  );
}

function DatabaseSyncRoute() {
  const [, setLocation] = useLocation();
  const { isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return <PageLoader />;
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
      <Suspense fallback={<PageLoader />}>
        <DatabaseSync />
      </Suspense>
    </div>
  );
}

function AdminHubRoute() {
  const [, setLocation] = useLocation();
  const { isLoading, user, rbac, isAdmin } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  // Not authenticated - show login page
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-serif font-semibold mb-2">Nashoba Operations Hub</h1>
            <p className="text-muted-foreground">Sign in to access the operations platform</p>
          </div>
          <div className="bg-card border rounded-lg p-6 space-y-4">
            <Button 
              className="w-full" 
              onClick={() => window.location.href = '/api/login?returnTo=/hub'}
              data-testid="button-login"
            >
              Sign in with Replit
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              You must have an authorized platform account to access the Hub.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated - pass to AdminHub which will handle RBAC filtering
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminHub onBackToGuest={() => setLocation("/")} user={user} rbac={rbac} isAdmin={isAdmin} />
    </Suspense>
  );
}

function LmsAdminRoute() {
  const { isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAdmin) {
    return <Redirect to="/" />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <LmsAdminDashboard />
    </Suspense>
  );
}

function LmsLearnerRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <LmsLearnerPortal />
    </Suspense>
  );
}

function ModuleDirectoryRoute() {
  const { isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAdmin) {
    return <Redirect to="/" />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <ModuleDirectory />
    </Suspense>
  );
}

function AccessControlRoute() {
  const { isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAdmin) {
    return <Redirect to="/" />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <AccessControl />
    </Suspense>
  );
}

function ComplianceAdminRoute() {
  const { isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAdmin) {
    return <Redirect to="/" />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <ComplianceAdminDashboard />
    </Suspense>
  );
}

function DailyReportsAdminRoute() {
  const { isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAdmin) {
    return <Redirect to="/" />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <DailyReportsAdminDashboard />
    </Suspense>
  );
}

function PublicDailyReportRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <PublicDailyReportForm />
    </Suspense>
  );
}

function ResetPasswordRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ResetPassword />
    </Suspense>
  );
}

// B2B Routes Component with lazy loaded pages
function B2bRoutes() {
  return (
    <B2bAuthProviderSync>
      <B2bLayoutSync>
        <Suspense fallback={<PageLoader />}>
          <Switch>
            {/* Public B2B Routes */}
            <Route path="/b2b" component={() => <Suspense fallback={<PageLoader />}><B2bPricingPage /></Suspense>} />
            <Route path="/b2b/pricing-sheet" component={() => <Suspense fallback={<PageLoader />}><B2bPricingSheetPage /></Suspense>} />
            <Route path="/b2b/where-to-buy" component={() => <Suspense fallback={<PageLoader />}><B2bWhereToBuyPage /></Suspense>} />
            <Route path="/b2b/register" component={() => <Suspense fallback={<PageLoader />}><B2bRegistrationPage /></Suspense>} />
            <Route path="/b2b/application-submitted" component={() => <Suspense fallback={<PageLoader />}><B2bApplicationThankYouPage /></Suspense>} />
            <Route path="/b2b/login/:role" component={() => <Suspense fallback={<PageLoader />}><B2bLoginPage /></Suspense>} />
            <Route path="/b2b/forgot-password" component={() => <Suspense fallback={<PageLoader />}><B2bForgotPasswordPage /></Suspense>} />
            <Route path="/b2b/reset-password" component={() => <Suspense fallback={<PageLoader />}><B2bResetPasswordPage /></Suspense>} />
            <Route path="/b2b/setup" component={() => <Suspense fallback={<PageLoader />}><B2bSetupPage /></Suspense>} />

            {/* Protected Customer Routes */}
            <Route path="/b2b/catalog">
              <ProtectedRoute requireCustomer>
                <Suspense fallback={<PageLoader />}><B2bCatalogPage /></Suspense>
              </ProtectedRoute>
            </Route>
            <Route path="/b2b/cart">
              <ProtectedRoute requireCustomer>
                <Suspense fallback={<PageLoader />}><B2bCartPage /></Suspense>
              </ProtectedRoute>
            </Route>
            <Route path="/b2b/checkout">
              <ProtectedRoute requireCustomer>
                <Suspense fallback={<PageLoader />}><B2bCheckoutPage /></Suspense>
              </ProtectedRoute>
            </Route>
            <Route path="/b2b/orders">
              <ProtectedRoute requireCustomer>
                <Suspense fallback={<PageLoader />}><B2bOrdersPage /></Suspense>
              </ProtectedRoute>
            </Route>
            <Route path="/b2b/reorder">
              <ProtectedRoute requireCustomer>
                <Suspense fallback={<PageLoader />}><B2bReorderPage /></Suspense>
              </ProtectedRoute>
            </Route>
            <Route path="/b2b/customer-data">
              <ProtectedRoute requireCustomer>
                <Suspense fallback={<PageLoader />}><B2bCustomerDataPage /></Suspense>
              </ProtectedRoute>
            </Route>

            {/* Protected Admin Routes */}
            <Route path="/b2b/admin">
              <ProtectedRoute requireAdmin>
                <Suspense fallback={<PageLoader />}><B2bAdminDashboard /></Suspense>
              </ProtectedRoute>
            </Route>

            {/* Protected Sales Rep Routes */}
            <Route path="/b2b/commissions">
              <ProtectedRoute requireSalesRep>
                <Suspense fallback={<PageLoader />}><B2bSalesRepDashboard /></Suspense>
              </ProtectedRoute>
            </Route>

            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </B2bLayoutSync>
    </B2bAuthProviderSync>
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
    return (
      <Suspense fallback={<PageLoader />}>
        <AdminDashboard onBackToGuest={() => setShowAdmin(false)} />
      </Suspense>
    );
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
        <Route path="/daily-report/:code" component={PublicDailyReportRoute} />
        <Route path="/daily-report" component={PublicDailyReportRoute} />
        <Route path="/hub" component={AdminHubRoute} />
        <Route path="/admin-hub" component={AdminHubRoute} />
        <Route path="/admin" component={AdminRoute} />
        <Route path="/admin/database-sync" component={DatabaseSyncRoute} />
        <Route path="/modules" component={ModuleDirectoryRoute} />
        <Route path="/access-control" component={AccessControlRoute} />
        <Route path="/reset-password" component={ResetPasswordRoute} />
        <Route path="/lms" component={LmsLearnerRoute} />
        <Route path="/lms/admin" component={LmsAdminRoute} />
        <Route path="/compliance/admin" component={ComplianceAdminRoute} />
        <Route path="/daily-reports" component={DailyReportsAdminRoute} />
        <Route path="/daily-reports/admin" component={DailyReportsAdminRoute} />
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
