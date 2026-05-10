import { StaffManagementLayout } from "@/pages/staff-management/StaffManagementLayout";
import { StaffSegmentCardGrid } from "@/pages/staff-management/StaffSegmentCardGrid";

export default function StaffDashboard() {
  return (
    <StaffManagementLayout>
      <div className="space-y-6" data-testid="staff-dashboard-page">
        <div className="max-w-2xl space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Choose an area</h2>
          <p className="text-sm text-muted-foreground">
            Use the sidebar or the cards below to open a workspace. Every section is marked{" "}
            <span className="font-medium text-foreground">under construction</span> until its feature set is built out.
          </p>
        </div>
        <StaffSegmentCardGrid />
      </div>
    </StaffManagementLayout>
  );
}
