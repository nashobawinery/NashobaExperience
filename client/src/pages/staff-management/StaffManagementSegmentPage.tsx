import { Redirect, Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Home, LayoutGrid } from "lucide-react";
import { getStaffSegment } from "./staffSegments";

export default function StaffManagementSegmentPage() {
  const params = useParams<{ segment: string }>();
  const segment = params.segment ? getStaffSegment(params.segment) : undefined;

  if (!segment) {
    return <Redirect to="/staff-dashboard" />;
  }

  const Icon = segment.icon;

  return (
    <div className="min-h-screen bg-background" data-testid={`staff-segment-${segment.slug}`}>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/staff-dashboard">
              <Button variant="ghost" size="icon" data-testid="button-back-staff-landing" aria-label="Back to Staff Management">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold truncate">{segment.title}</h1>
              <p className="text-xs text-muted-foreground truncate">Staff Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/staff-dashboard">
              <Button variant="outline" size="sm" data-testid="button-all-areas">
                <LayoutGrid className="h-4 w-4 mr-2" />
                All areas
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm" data-testid="button-home">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container py-10 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Coming soon</CardTitle>
            <CardDescription>{segment.shortDescription}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              This area is reserved for <span className="font-medium text-foreground">{segment.title}</span>. Build out
              the feature here when you are ready.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
