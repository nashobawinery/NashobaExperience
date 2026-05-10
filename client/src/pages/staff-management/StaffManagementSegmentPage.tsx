import { Redirect, useParams } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StaffManagementLayout } from "@/pages/staff-management/StaffManagementLayout";
import { getStaffSegment } from "@/pages/staff-management/staffSegments";
import { Construction, Wrench } from "lucide-react";

export default function StaffManagementSegmentPage() {
  const params = useParams<{ segment: string }>();
  const segment = params.segment ? getStaffSegment(params.segment) : undefined;

  if (!segment) {
    return <Redirect to="/staff-dashboard" />;
  }

  return (
    <StaffManagementLayout>
      <div className="max-w-2xl space-y-6" data-testid={`staff-segment-${segment.slug}`}>
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                Under construction
              </Badge>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Construction className="h-6 w-6 text-amber-600 dark:text-amber-500" />
              </div>
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-xl leading-snug">{segment.title}</CardTitle>
                <CardDescription className="text-sm">{segment.shortDescription}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-4 border-t pt-6">
            <p>
              This workspace is scaffolded for <span className="font-medium text-foreground">{segment.title}</span>.
              Implementation details, forms, and data flows can be added in this route without changing the shared layout
              or sidebar.
            </p>
            <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-3 text-xs">
              <Wrench className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
              <p>
                Tip: keep using the labels and slugs in <code className="rounded bg-muted px-1 py-0.5 text-[0.8rem]">staffSegments.ts</code>{" "}
                so the sidebar, cards, and URLs stay in sync.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </StaffManagementLayout>
  );
}
