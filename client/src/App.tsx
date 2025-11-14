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

function Router() {
  const [showAdmin, setShowAdmin] = useState(false);
  const { user, isAdmin } = useAuth();

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
