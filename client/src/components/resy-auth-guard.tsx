import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/resy-sidebar";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, hasModuleAccess } = useAuth();
  const redirectAttempted = useRef(false);
  const [, setLocation] = useLocation();

  const hasResyAccess = hasModuleAccess('reservations');

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !redirectAttempted.current) {
      redirectAttempted.current = true;
      window.location.href = "/api/login";
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !hasResyAccess && !redirectAttempted.current) {
      redirectAttempted.current = true;
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, hasResyAccess, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" data-testid="auth-loading">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!hasResyAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4" data-testid="no-module-access">
        <p className="text-muted-foreground">You don't have access to the Reservations module.</p>
        <p className="text-sm text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b px-6">
          <SidebarTrigger data-testid="button-sidebar-toggle" />
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
