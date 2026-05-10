import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Home, Users } from "lucide-react";
import { Link } from "wouter";
import { STAFF_MANAGEMENT_SEGMENTS } from "@/pages/staff-management/staffSegments";

export default function StaffDashboard() {
  return (
    <div className="min-h-screen bg-background" data-testid="staff-dashboard-page">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Staff Management</h1>
              <p className="text-xs text-muted-foreground">
                Directory, HR workflows, reports, broadcasts, and benefits
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="outline" size="sm" data-testid="button-back-home">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="mb-8 max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight">Choose an area</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Open a workspace below. Each card links to a dedicated section you can implement over time.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {STAFF_MANAGEMENT_SEGMENTS.map((segment) => {
            const Icon = segment.icon;
            const href = `/staff-dashboard/${segment.slug}`;

            return (
              <Link key={segment.slug} href={href} className="block group">
                <Card
                  className="h-full transition-all hover-elevate cursor-pointer border-border/80"
                  data-testid={`card-staff-segment-${segment.slug}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground">
                        <Icon className="h-5 w-5" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 mt-1 shrink-0" />
                    </div>
                    <CardTitle className="text-lg pt-1">{segment.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{segment.shortDescription}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
