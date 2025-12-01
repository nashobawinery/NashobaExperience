import { registerModuleDocs } from "./index";

registerModuleDocs({
  moduleKey: "admin-hub",
  moduleName: "Admin Hub",
  description: "Platform administration and access control documentation",
  lastUpdated: "2024-12-01",
  sections: [
    {
      id: "overview",
      title: "Overview",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            The Admin Hub is the central command center for the Nashoba Valley Operations Platform. 
            From here, administrators can access all platform modules, manage users and permissions, 
            and monitor platform-wide operations.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Quick Access</h4>
              <p className="text-sm text-muted-foreground">
                Navigate to any active module directly from the dashboard cards.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Module Directory</h4>
              <p className="text-sm text-muted-foreground">
                View all platform modules, their status, and development progress.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "global-roles",
      title: "Global Role Levels",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Each platform user has a Global Role that determines their overall platform access level:
          </p>
          <div className="space-y-3">
            <div className="border-l-4 border-red-500 pl-4">
              <h5 className="font-medium">Super Admin</h5>
              <p className="text-sm text-muted-foreground">
                Full platform access: Admin Hub, Access Control (create/edit/delete users), all modules, 
                system settings, environment sync tools, and ability to assign any role to others.
              </p>
            </div>
            <div className="border-l-4 border-orange-500 pl-4">
              <h5 className="font-medium">Admin</h5>
              <p className="text-sm text-muted-foreground">
                Admin Hub access, Access Control page, can manage users and groups, access to all active 
                modules, can perform administrative actions within modules.
              </p>
            </div>
            <div className="border-l-4 border-yellow-500 pl-4">
              <h5 className="font-medium">Manager</h5>
              <p className="text-sm text-muted-foreground">
                Limited admin access, can view Admin Hub dashboard, access to assigned modules based on 
                User Groups, can manage team-level operations.
              </p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4">
              <h5 className="font-medium">Staff</h5>
              <p className="text-sm text-muted-foreground">
                Regular platform user, access to modules based on User Groups only, can perform 
                day-to-day operations, no administrative capabilities.
              </p>
            </div>
            <div className="border-l-4 border-gray-500 pl-4">
              <h5 className="font-medium">Viewer</h5>
              <p className="text-sm text-muted-foreground">
                Read-only access, can view content in assigned modules but cannot create, edit, or delete anything.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "user-groups",
      title: "User Groups",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground mb-3">
            User Groups provide granular permission control. Users can belong to multiple groups, 
            and their effective permissions combine from all group memberships.
          </p>
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-3">Default Groups</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-medium text-foreground min-w-[140px]">Global Admin</span>
                <span>Full access to all modules and features</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-foreground min-w-[140px]">Director</span>
                <span>Management-level access across modules</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-foreground min-w-[140px]">Manager</span>
                <span>Operational management access</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-foreground min-w-[140px]">Staff</span>
                <span>Standard staff access for daily operations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-foreground min-w-[140px]">Viewer</span>
                <span>Read-only access to assigned modules</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-foreground min-w-[140px]">Sales Representatives</span>
                <span>Access to sales-related modules</span>
              </li>
            </ul>
          </div>
          <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
            <h4 className="font-medium mb-2">How It Works</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Global Role</strong> determines platform-level access (who can see Admin Hub, manage users)</li>
              <li>• <strong>User Groups</strong> determine module-level access (which modules and features)</li>
              <li>• Both work together: A staff member in "Sales Representatives" can access sales modules but not Admin Hub</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "setting-global-role",
      title: "Setting a User's Global Role",
      content: (
        <div className="space-y-4">
          <ol className="text-sm text-muted-foreground space-y-3 list-decimal list-inside">
            <li className="pl-2">Go to the <strong className="text-foreground">Access Control</strong> page (from Admin Hub)</li>
            <li className="pl-2">Find the user in the <strong className="text-foreground">Platform Users</strong> table</li>
            <li className="pl-2">Click the <strong className="text-foreground">Edit</strong> (pencil) icon in the Actions column</li>
            <li className="pl-2">Select the appropriate <strong className="text-foreground">Global Role</strong> from the dropdown</li>
            <li className="pl-2">Click <strong className="text-foreground">Save Changes</strong></li>
          </ol>
        </div>
      ),
    },
    {
      id: "sync-security",
      title: "Sync Security Button",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The <strong>Sync Security</strong> button on the Access Control page ensures all User Groups 
            have complete permission entries for every module and feature.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">When to Use</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• After new modules or features are added</li>
                <li>• When status shows "X missing entries"</li>
                <li>• After database updates or republishing</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Status Indicators</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li><span className="text-green-600 font-medium">Green checkmark</span> = Fully synced</li>
                <li><span className="text-amber-600 font-medium">Amber warning</span> = Missing entries (click to fix)</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "managing-groups",
      title: "Managing User Groups",
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Adding Users to Groups</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Go to Access Control page</li>
                <li>Click the "Groups" icon next to a user</li>
                <li>Toggle groups on/off in the dialog</li>
                <li>Changes save automatically</li>
              </ol>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Configuring Group Permissions</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Select a group from the Groups panel</li>
                <li>Toggle module access on/off</li>
                <li>Set feature permission levels (None, View, Edit, Admin)</li>
                <li>Changes apply immediately to all group members</li>
              </ol>
            </div>
          </div>
        </div>
      ),
    },
  ],
});
