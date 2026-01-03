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
import { ReservationCartProvider } from "@/contexts/reservation-cart-context";

// Lazy load heavy admin/module pages for better initial load performance
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminHub = lazy(() => import("@/pages/AdminHub"));
const DatabaseSync = lazy(() => import("@/pages/DatabaseSync"));
const ModuleDirectory = lazy(() => import("@/pages/ModuleDirectory"));
const AccessControl = lazy(() => import("@/pages/AccessControl"));
const ModuleManagement = lazy(() => import("@/pages/ModuleManagement"));
const ProceduresComingSoon = lazy(() => import("@/pages/ComingSoon").then(m => ({ default: m.ProceduresComingSoon })));
const SupportComingSoon = lazy(() => import("@/pages/ComingSoon").then(m => ({ default: m.SupportComingSoon })));
const AppleGameComingSoon = lazy(() => import("@/pages/ComingSoon").then(m => ({ default: m.AppleGameComingSoon })));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const FutureConcepts = lazy(() => import("@/pages/FutureConcepts"));
const CompanyInfo = lazy(() => import("@/pages/CompanyInfo"));

// Lazy load LMS module
const LmsAdminDashboard = lazy(() => import("@/pages/lms/LmsAdminDashboard"));
const LmsLearnerPortal = lazy(() => import("@/pages/lms/LmsLearnerPortal"));
const ExternalTrainingPage = lazy(() => import("@/pages/lms/ExternalTrainingPage"));

// Lazy load Compliance module
const ComplianceAdminDashboard = lazy(() => import("@/pages/compliance/ComplianceAdminDashboard"));

// Lazy load Department Calendar module
const DepartmentCalendarDashboard = lazy(() => import("@/pages/department-calendar/DepartmentCalendarDashboard"));

// Lazy load Daily Reports module
const DailyReportsAdminDashboard = lazy(() => import("@/pages/daily-reports/DailyReportsAdminDashboard"));
const PublicDailyReportForm = lazy(() => import("@/pages/daily-reports/PublicDailyReportForm"));

// Lazy load Daily Procedures module
const ProceduresAdminDashboard = lazy(() => import("@/pages/procedures/ProceduresAdminDashboard"));
const ProcedureTemplateEditor = lazy(() => import("@/pages/procedures/ProcedureTemplateEditor"));
const ProceduresUsers = lazy(() => import("@/pages/procedures/ProceduresUsers"));
const ProceduresSubmissions = lazy(() => import("@/pages/procedures/ProceduresSubmissions"));
const PublicProceduresForm = lazy(() => import("@/pages/procedures/PublicProceduresForm"));
const StaffProceduresForm = lazy(() => import("@/pages/procedures/StaffProceduresForm"));
const StaffPortal = lazy(() => import("@/pages/staff/StaffPortal"));

// Lazy load Maintenance module
const MaintenanceDashboard = lazy(() => import("@/pages/maintenance/MaintenanceDashboard"));
const TechnicianWorkOrders = lazy(() => import("@/pages/maintenance/TechnicianWorkOrders"));

// Lazy load Spot Inventory module
const SpotInventoryAdminDashboard = lazy(() => import("@/pages/spot-inventory/SpotInventoryAdminDashboard"));
const SpotInventoryStaffApp = lazy(() => import("@/pages/spot-inventory/SpotInventoryStaffApp"));

// Lazy load Staff Dashboard
const StaffDashboard = lazy(() => import("@/pages/StaffDashboard"));
const StaffDashboardAdmin = lazy(() => import("@/pages/StaffDashboardAdmin"));

// Lazy load Reservations module - Customer facing
const ResyLanding = lazy(() => import("@/pages/reservations/landing"));
const ResyBooking = lazy(() => import("@/pages/reservations/booking"));
const ResyCart = lazy(() => import("@/pages/reservations/cart"));
const ResyCheckout = lazy(() => import("@/pages/reservations/checkout"));
const ResyConfirmation = lazy(() => import("@/pages/reservations/confirmation"));
const ResyConfirmReservation = lazy(() => import("@/pages/reservations/confirm"));

// Lazy load Reservations module - Admin
const ResyAdminHome = lazy(() => import("@/pages/reservations/admin-home"));
const ResyAdminCalendar = lazy(() => import("@/pages/reservations/admin-calendar"));
const ResyAdminExperiences = lazy(() => import("@/pages/reservations/admin-experiences"));
const ResyAdminReservations = lazy(() => import("@/pages/reservations/admin-reservations"));
const ResyAdminLocations = lazy(() => import("@/pages/reservations/admin-locations"));
const ResyAdminLocationDetail = lazy(() => import("@/pages/reservations/admin-location-detail"));
const ResyAdminCustomers = lazy(() => import("@/pages/reservations/admin-customers"));
const ResyAdminCustomerDetail = lazy(() => import("@/pages/reservations/admin-customer-detail"));
const ResyAdminClubs = lazy(() => import("@/pages/reservations/admin-clubs"));
const ResyAdminSpecialDates = lazy(() => import("@/pages/reservations/admin-special-dates"));
const ResyAdminHolidays = lazy(() => import("@/pages/reservations/admin-holidays"));
const ResyAdminPrivateEvents = lazy(() => import("@/pages/reservations/admin-private-events"));
const ResyAdminFlowSettings = lazy(() => import("@/pages/reservations/admin-flow-settings"));
const ResyAdminSettings = lazy(() => import("@/pages/reservations/admin-settings"));
const ResyAdminDocumentation = lazy(() => import("@/pages/reservations/admin-documentation"));

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
const B2bTierAgreementPage = lazy(() => import("@/pages/b2b/TierAgreementPage"));
const B2bViewSignedAgreementPage = lazy(() => import("@/pages/b2b/ViewSignedAgreementPage"));
const B2bOrderDeliveryDatePage = lazy(() => import("@/pages/b2b/OrderDeliveryDatePage"));
const B2bOrderApprovalPage = lazy(() => import("@/pages/b2b/OrderApprovalPage"));
const B2bOrderDeliveryConfirmPage = lazy(() => import("@/pages/b2b/OrderDeliveryConfirmPage"));

// Import B2B ProtectedRoute synchronously since it's a wrapper component
import { ProtectedRoute } from "@/components/b2b/ProtectedRoute";
import { B2bAuthProvider as B2bAuthProviderSync } from "@/contexts/B2bAuthContext";
import { B2bLayout as B2bLayoutSync } from "@/components/b2b/B2bLayout";

// Import Reservations AuthGuard synchronously for proper layout wrapping
import { AuthGuard as ResyAuthGuard } from "@/components/resy-auth-guard";

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
      <AdminDashboard onBackToGuest={() => setLocation("/tasting")} />
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
              onClick={() => window.location.href = '/api/login?returnTo=/'}
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
      <AdminHub onBackToGuest={() => setLocation("/tasting")} user={user} rbac={rbac} isAdmin={isAdmin} />
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

function ExternalTrainingRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ExternalTrainingPage />
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

function ModuleManagementRoute() {
  const { isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAdmin) {
    return <Redirect to="/" />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <ModuleManagement />
    </Suspense>
  );
}

function ProceduresComingSoonRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProceduresComingSoon />
    </Suspense>
  );
}

function ProceduresAdminRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProceduresAdminDashboard />
    </Suspense>
  );
}

function ProcedureTemplateEditorRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProcedureTemplateEditor />
    </Suspense>
  );
}

function ProceduresUsersRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProceduresUsers />
    </Suspense>
  );
}

function ProceduresSubmissionsRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProceduresSubmissions />
    </Suspense>
  );
}

function PublicProceduresRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <PublicProceduresForm />
    </Suspense>
  );
}

function StaffProceduresRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <StaffProceduresForm />
    </Suspense>
  );
}

function StaffPortalRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <StaffPortal />
    </Suspense>
  );
}

function SupportComingSoonRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <SupportComingSoon />
    </Suspense>
  );
}

function AppleGameComingSoonRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AppleGameComingSoon />
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

function DepartmentCalendarRoute() {
  const { isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAdmin) {
    return <Redirect to="/" />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <DepartmentCalendarDashboard />
    </Suspense>
  );
}

function MaintenanceAdminRoute() {
  const { isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAdmin) {
    return <Redirect to="/" />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <MaintenanceDashboard />
    </Suspense>
  );
}

function TechnicianWorkOrdersRoute() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Redirect to="/" />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <TechnicianWorkOrders />
    </Suspense>
  );
}

function SpotInventoryAdminRoute() {
  const { isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAdmin) {
    return <Redirect to="/" />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <SpotInventoryAdminDashboard />
    </Suspense>
  );
}

function SpotInventoryStaffRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <SpotInventoryStaffApp />
    </Suspense>
  );
}

function StaffDashboardRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <StaffDashboard />
    </Suspense>
  );
}

function StaffDashboardAdminRoute() {
  const { isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAdmin) {
    return <Redirect to="/" />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <StaffDashboardAdmin />
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

function FutureConceptsRoute() {
  const { isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAdmin) {
    return <Redirect to="/" />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <FutureConcepts />
    </Suspense>
  );
}

function CompanyInfoRoute() {
  const { isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAdmin) {
    return <Redirect to="/" />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <CompanyInfo />
    </Suspense>
  );
}

// Reservation Routes - Customer facing (public)
function ResyLandingRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ResyLanding />
    </Suspense>
  );
}

function ResyBookingRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ResyBooking />
    </Suspense>
  );
}

function ResyCartRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ResyCart />
    </Suspense>
  );
}

function ResyCheckoutRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ResyCheckout />
    </Suspense>
  );
}

function ResyConfirmationRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ResyConfirmation />
    </Suspense>
  );
}

function ResyConfirmReservationRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ResyConfirmReservation />
    </Suspense>
  );
}

// Reservation Routes - Admin (protected with sidebar layout)
function ResyAdminHomeRoute() {
  return (
    <ResyAuthGuard>
      <Suspense fallback={<PageLoader />}><ResyAdminHome /></Suspense>
    </ResyAuthGuard>
  );
}

function ResyAdminCalendarRoute() {
  return (
    <ResyAuthGuard>
      <Suspense fallback={<PageLoader />}><ResyAdminCalendar /></Suspense>
    </ResyAuthGuard>
  );
}

function ResyAdminExperiencesRoute() {
  return (
    <ResyAuthGuard>
      <Suspense fallback={<PageLoader />}><ResyAdminExperiences /></Suspense>
    </ResyAuthGuard>
  );
}

function ResyAdminReservationsRoute() {
  return (
    <ResyAuthGuard>
      <Suspense fallback={<PageLoader />}><ResyAdminReservations /></Suspense>
    </ResyAuthGuard>
  );
}

function ResyAdminLocationsRoute() {
  return (
    <ResyAuthGuard>
      <Suspense fallback={<PageLoader />}><ResyAdminLocations /></Suspense>
    </ResyAuthGuard>
  );
}

function ResyAdminLocationDetailRoute() {
  return (
    <ResyAuthGuard>
      <Suspense fallback={<PageLoader />}><ResyAdminLocationDetail /></Suspense>
    </ResyAuthGuard>
  );
}

function ResyAdminCustomersRoute() {
  return (
    <ResyAuthGuard>
      <Suspense fallback={<PageLoader />}><ResyAdminCustomers /></Suspense>
    </ResyAuthGuard>
  );
}

function ResyAdminCustomerDetailRoute() {
  return (
    <ResyAuthGuard>
      <Suspense fallback={<PageLoader />}><ResyAdminCustomerDetail /></Suspense>
    </ResyAuthGuard>
  );
}

function ResyAdminClubsRoute() {
  return (
    <ResyAuthGuard>
      <Suspense fallback={<PageLoader />}><ResyAdminClubs /></Suspense>
    </ResyAuthGuard>
  );
}

function ResyAdminSpecialDatesRoute() {
  return (
    <ResyAuthGuard>
      <Suspense fallback={<PageLoader />}><ResyAdminSpecialDates /></Suspense>
    </ResyAuthGuard>
  );
}

function ResyAdminHolidaysRoute() {
  return (
    <ResyAuthGuard>
      <Suspense fallback={<PageLoader />}><ResyAdminHolidays /></Suspense>
    </ResyAuthGuard>
  );
}

function ResyAdminPrivateEventsRoute() {
  return (
    <ResyAuthGuard>
      <Suspense fallback={<PageLoader />}><ResyAdminPrivateEvents /></Suspense>
    </ResyAuthGuard>
  );
}

function ResyAdminFlowSettingsRoute() {
  return (
    <ResyAuthGuard>
      <Suspense fallback={<PageLoader />}><ResyAdminFlowSettings /></Suspense>
    </ResyAuthGuard>
  );
}

function ResyAdminSettingsRoute() {
  return (
    <ResyAuthGuard>
      <Suspense fallback={<PageLoader />}><ResyAdminSettings /></Suspense>
    </ResyAuthGuard>
  );
}

function ResyAdminDocumentationRoute() {
  return (
    <ResyAuthGuard>
      <Suspense fallback={<PageLoader />}><ResyAdminDocumentation /></Suspense>
    </ResyAuthGuard>
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
            <Route path="/b2b/tier-agreement/:token" component={() => <Suspense fallback={<PageLoader />}><B2bTierAgreementPage /></Suspense>} />
            <Route path="/b2b/order-delivery/:token" component={() => <Suspense fallback={<PageLoader />}><B2bOrderDeliveryDatePage /></Suspense>} />
            <Route path="/b2b/order-approval/:token" component={() => <Suspense fallback={<PageLoader />}><B2bOrderApprovalPage /></Suspense>} />
            <Route path="/b2b/order-confirm-delivery/:token" component={() => <Suspense fallback={<PageLoader />}><B2bOrderDeliveryConfirmPage /></Suspense>} />

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
            <Route path="/b2b/admin/agreements/:agreementId">
              <ProtectedRoute requireAdmin>
                <Suspense fallback={<PageLoader />}><B2bViewSignedAgreementPage /></Suspense>
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
      <Switch>
        <Route path="/" component={AdminHubRoute} />
        <Route path="/tasting" component={GuestApp} />
        <Route path="/daily-report/:code" component={PublicDailyReportRoute} />
        <Route path="/daily-report" component={PublicDailyReportRoute} />
        <Route path="/hub">{() => <Redirect to="/" />}</Route>
        <Route path="/admin-hub">{() => <Redirect to="/" />}</Route>
        <Route path="/admin" component={AdminRoute} />
        <Route path="/admin/database-sync" component={DatabaseSyncRoute} />
        <Route path="/modules" component={ModuleDirectoryRoute} />
        <Route path="/access-control" component={AccessControlRoute} />
        <Route path="/module-management" component={ModuleManagementRoute} />
        <Route path="/procedures" component={ProceduresAdminRoute} />
        <Route path="/procedures/admin" component={ProceduresAdminRoute} />
        <Route path="/procedures/templates/new" component={ProcedureTemplateEditorRoute} />
        <Route path="/procedures/templates/:id" component={ProcedureTemplateEditorRoute} />
        <Route path="/procedures/users" component={ProceduresUsersRoute} />
        <Route path="/procedures/submissions" component={ProceduresSubmissionsRoute} />
        <Route path="/procedures/public" component={PublicProceduresRoute} />
        <Route path="/procedures/staff" component={StaffProceduresRoute} />
        <Route path="/staff" component={StaffPortalRoute} />
        <Route path="/support" component={SupportComingSoonRoute} />
        <Route path="/support/admin" component={SupportComingSoonRoute} />
        <Route path="/apple-game" component={AppleGameComingSoonRoute} />
        <Route path="/reset-password" component={ResetPasswordRoute} />
        <Route path="/future-concepts" component={FutureConceptsRoute} />
        <Route path="/company-info" component={CompanyInfoRoute} />
        <Route path="/lms" component={LmsLearnerRoute} />
        <Route path="/lms/admin" component={LmsAdminRoute} />
        <Route path="/training/:token" component={ExternalTrainingRoute} />
        <Route path="/compliance/admin" component={ComplianceAdminRoute} />
        <Route path="/department-calendar" component={DepartmentCalendarRoute} />
        <Route path="/department-calendar/admin" component={DepartmentCalendarRoute} />
        <Route path="/maintenance" component={MaintenanceAdminRoute} />
        <Route path="/maintenance/admin" component={MaintenanceAdminRoute} />
        <Route path="/maintenance/work-orders" component={TechnicianWorkOrdersRoute} />
        <Route path="/spot-inventory" component={SpotInventoryAdminRoute} />
        <Route path="/spot-inventory/admin" component={SpotInventoryAdminRoute} />
        <Route path="/spot-inventory/staff" component={SpotInventoryStaffRoute} />
        <Route path="/staff-dashboard" component={StaffDashboardRoute} />
        <Route path="/staff-dashboard/admin" component={StaffDashboardAdminRoute} />
        <Route path="/daily-reports" component={DailyReportsAdminRoute} />
        <Route path="/daily-reports/admin" component={DailyReportsAdminRoute} />
        {/* Reservation Routes - Customer facing */}
        <Route path="/reservations" component={ResyLandingRoute} />
        <Route path="/reservations/booking/:id" component={ResyBookingRoute} />
        <Route path="/reservations/cart" component={ResyCartRoute} />
        <Route path="/book/:id" component={ResyBookingRoute} />
        <Route path="/checkout/:id" component={ResyCheckoutRoute} />
        <Route path="/confirmation/:id" component={ResyConfirmationRoute} />
        <Route path="/reservations/checkout" component={ResyCheckoutRoute} />
        <Route path="/reservations/confirmation" component={ResyConfirmationRoute} />
        <Route path="/reservations/confirm/:token" component={ResyConfirmReservationRoute} />
        <Route path="/reservations/cancel/:token" component={ResyConfirmReservationRoute} />
        {/* Reservation Routes - Admin */}
        <Route path="/reservations/admin" component={ResyAdminHomeRoute} />
        <Route path="/reservations/admin/calendar" component={ResyAdminCalendarRoute} />
        <Route path="/reservations/admin/experiences" component={ResyAdminExperiencesRoute} />
        <Route path="/reservations/admin/reservations" component={ResyAdminReservationsRoute} />
        <Route path="/reservations/admin/locations" component={ResyAdminLocationsRoute} />
        <Route path="/reservations/admin/locations/:id" component={ResyAdminLocationDetailRoute} />
        <Route path="/reservations/admin/customers" component={ResyAdminCustomersRoute} />
        <Route path="/reservations/admin/customers/:id" component={ResyAdminCustomerDetailRoute} />
        <Route path="/reservations/admin/clubs" component={ResyAdminClubsRoute} />
        <Route path="/reservations/admin/special-dates" component={ResyAdminSpecialDatesRoute} />
        <Route path="/reservations/admin/holidays" component={ResyAdminHolidaysRoute} />
        <Route path="/reservations/admin/private-events" component={ResyAdminPrivateEventsRoute} />
        <Route path="/reservations/admin/flow-settings" component={ResyAdminFlowSettingsRoute} />
        <Route path="/reservations/admin/settings" component={ResyAdminSettingsRoute} />
        <Route path="/reservations/admin/documentation" component={ResyAdminDocumentationRoute} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ReservationCartProvider>
          <Toaster />
          <Router />
        </ReservationCartProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
