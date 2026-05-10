import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Settings } from "lucide-react";
import { Link } from "wouter";

export default function StaffDashboardAdmin() {
  return (
    <div className="min-h-screen bg-background" data-testid="staff-dashboard-admin-page">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/hub">
              <Button variant="ghost" size="icon" data-testid="button-back-hub" aria-label="Back to hub">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Staff Management (admin)</h1>
              <p className="text-xs text-muted-foreground">Module configuration will return as features are built</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/staff-dashboard">
              <Button variant="outline" size="sm" data-testid="button-preview">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open module
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container py-10 max-w-2xl">
        <Card data-testid="staff-dashboard-admin-placeholder">
          <CardHeader>
            <CardTitle>Dashboard layout reset</CardTitle>
            <CardDescription>
              The staff landing page now uses fixed navigation cards for each functional area. Per-area settings and
              integrations can be added here later.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              The previous dynamic &ldquo;available resources&rdquo; grid and Toast print menus were removed from the
              Staff Management home page so development can focus on the segments shown on the landing screen.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
