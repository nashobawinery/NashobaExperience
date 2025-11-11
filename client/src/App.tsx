import { useState } from "react";
import { Switch, Route } from "wouter";
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

function Router() {
  const [showAdmin, setShowAdmin] = useState(false);
  const { user, isLoading, isAdmin } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show landing page if not authenticated
  if (!user) {
    return <Landing />;
  }

  // Show admin dashboard if requested and user is admin
  if (showAdmin) {
    if (!isAdmin) {
      setShowAdmin(false);
      return null;
    }
    return <AdminDashboard onBackToGuest={() => setShowAdmin(false)} />;
  }

  return (
    <div className="relative">
      {isAdmin && (
        <div className="fixed top-4 right-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdmin(true)}
            data-testid="button-admin-mode"
          >
            Admin
          </Button>
        </div>
      )}
      <Switch>
        <Route path="/" component={GuestApp} />
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
