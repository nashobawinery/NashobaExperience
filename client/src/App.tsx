import { useState, useEffect } from "react";
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

  // Force exit admin mode when user is not authenticated or not admin
  useEffect(() => {
    if (showAdmin && (!user || user.role !== "admin")) {
      setShowAdmin(false);
    }
  }, [user, showAdmin]);

  // Handle admin button click
  const handleAdminClick = () => {
    if (!user) {
      // Not logged in - redirect to login
      window.location.href = "/api/login";
      return;
    }
    
    if (!isAdmin) {
      // Logged in but not admin - show error
      alert("Access denied. Only administrators can access this area.");
      return;
    }
    
    // Logged in as admin - show dashboard
    setShowAdmin(true);
  };

  // Show admin dashboard if requested and user is admin
  if (showAdmin && isAdmin) {
    return <AdminDashboard onBackToGuest={() => setShowAdmin(false)} />;
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
