import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { STAFF_MANAGEMENT_SEGMENTS, getStaffSegment } from "@/pages/staff-management/staffSegments";
import { useStaffManagementRoute } from "@/pages/staff-management/useStaffManagementRoute";
import {
  ArrowLeft,
  ExternalLink,
  Home,
  Menu,
  LayoutGrid,
  Settings,
  Users,
} from "lucide-react";

type StaffManagementLayoutProps = {
  children: React.ReactNode;
};

function SidebarNav({
  activeSlug,
  isAdminPage,
  onNavigate,
  className,
}: {
  activeSlug: string | null;
  isAdminPage: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const { isAdmin } = useAuth();

  return (
    <nav className={cn("flex flex-col gap-0.5 p-2", className)} aria-label="Staff Management sections">
      <div className="px-2 py-2 mb-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Staff Management</p>
      </div>
      <Link
        href="/staff-dashboard"
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors",
          activeSlug === null && !isAdminPage
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        data-testid="nav-staff-landing"
      >
        <LayoutGrid className="h-4 w-4 shrink-0 opacity-80" />
        Overview
      </Link>
      {STAFF_MANAGEMENT_SEGMENTS.map((segment) => {
        const Icon = segment.icon;
        const isActive = !isAdminPage && activeSlug === segment.slug;
        return (
          <Link
            key={segment.slug}
            href={`/staff-dashboard/${segment.slug}`}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
              isActive ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            data-testid={`nav-staff-${segment.slug}`}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-90" />
            <span className="truncate">{segment.title}</span>
          </Link>
        );
      })}
      {isAdmin && (
        <div className="mt-4 pt-4 border-t border-border/60 px-2">
          <Link
            href="/staff-dashboard/admin"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
              isAdminPage ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            data-testid="nav-staff-admin"
          >
            <Settings className="h-4 w-4 shrink-0 opacity-90" />
            Module admin
          </Link>
        </div>
      )}
    </nav>
  );
}

export function StaffManagementLayout({ children }: StaffManagementLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { activeSlug, view } = useStaffManagementRoute();
  const segment = activeSlug ? getStaffSegment(activeSlug) : undefined;

  const isAdminPage = view === "admin";
  const headerTitle = isAdminPage ? "Staff Management (admin)" : segment ? segment.title : "Staff Management";
  const headerSubtitle = isAdminPage
    ? "Configuration and previews for this module"
    : segment
      ? "Staff Management"
      : "Directory, HR workflows, reports, broadcasts, and benefits";

  const HeaderIcon = isAdminPage ? Settings : segment ? segment.icon : Users;

  return (
    <div className="min-h-screen flex flex-col bg-background" data-testid="staff-management-layout">
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 sm:gap-3 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-4 md:px-6">
        {isAdminPage ? (
          <Link href="/hub" className="shrink-0 md:hidden">
            <Button variant="ghost" size="icon" data-testid="button-back-hub-mobile" aria-label="Back to hub">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
        ) : null}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden shrink-0" aria-label="Open section menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(100vw-2rem,18rem)] p-0">
            <div className="flex flex-col h-full border-r bg-muted/20">
              <div className="p-4 border-b">
                <p className="font-semibold text-sm">Staff Management</p>
                <p className="text-xs text-muted-foreground">Jump to a section</p>
              </div>
              <ScrollArea className="flex-1">
                <SidebarNav activeSlug={activeSlug} isAdminPage={isAdminPage} onNavigate={() => setMobileOpen(false)} />
              </ScrollArea>
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          {isAdminPage ? (
            <Link href="/hub" className="shrink-0 hidden md:inline-flex">
              <Button variant="ghost" size="icon" data-testid="button-back-hub" aria-label="Back to hub">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
          ) : null}

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HeaderIcon className="h-[1.15rem] w-[1.15rem]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold leading-tight truncate">{headerTitle}</h1>
            <p className="text-xs text-muted-foreground truncate">{headerSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isAdminPage ? (
            <Link href="/staff-dashboard">
              <Button variant="outline" size="sm" data-testid="button-preview">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open module
              </Button>
            </Link>
          ) : null}
          <Link href="/">
            <Button variant="outline" size="sm" data-testid="button-back-home">
              <Home className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Home</span>
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className="hidden md:flex w-56 shrink-0 flex-col border-r bg-muted/20">
          <ScrollArea className="flex-1">
            <SidebarNav activeSlug={activeSlug} isAdminPage={isAdminPage} />
          </ScrollArea>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="container max-w-6xl py-6 md:py-8 px-4 md:px-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
