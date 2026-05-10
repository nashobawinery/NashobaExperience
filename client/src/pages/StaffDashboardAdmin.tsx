import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StaffManagementLayout } from "@/pages/staff-management/StaffManagementLayout";
import { StaffSegmentCardGrid } from "@/pages/staff-management/StaffSegmentCardGrid";

export default function StaffDashboardAdmin() {
  return (
    <StaffManagementLayout>
      <div className="space-y-8" data-testid="staff-dashboard-admin-page">
        <div className="max-w-2xl space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Module admin</h2>
          <p className="text-sm text-muted-foreground">
            Preview the same navigation and cards as the staff-facing module. Per-area settings and integrations will
            replace this copy when each segment is implemented.
          </p>
        </div>

        <StaffSegmentCardGrid />

        <Card data-testid="staff-dashboard-admin-notes">
          <CardHeader>
            <CardTitle className="text-base">Admin tooling</CardTitle>
            <CardDescription>Reserved for future configuration panels</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Global module options, integrations, and segment-specific controls will live here. For now, use{" "}
              <span className="font-medium text-foreground">Open module</span> in the header to compare with the standard
              staff experience.
            </p>
          </CardContent>
        </Card>
      </div>
    </StaffManagementLayout>
  );
}
