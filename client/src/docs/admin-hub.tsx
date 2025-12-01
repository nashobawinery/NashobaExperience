import { registerModuleDocs } from "./index";

registerModuleDocs({
  moduleKey: "admin-hub",
  moduleName: "Admin Hub & Access Control",
  description: "Platform administration, user management, and role-based access control",
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
            and monitor platform-wide operations. The Role-Based Access Control (RBAC) system provides 
            granular permission management through User Groups and Global Roles.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Module Directory</h4>
              <p className="text-sm text-muted-foreground">
                View all platform modules, their status (active, coming soon, planned), and 
                quick-access links to module dashboards.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">User Management</h4>
              <p className="text-sm text-muted-foreground">
                Manage platform users, assign global roles, and configure group memberships.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Permission Control</h4>
              <p className="text-sm text-muted-foreground">
                Configure User Groups with module access and granular feature permissions.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "rbac-overview",
      title: "Understanding RBAC",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The platform uses a dual-layer permission system combining Global Roles and User Groups:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Global Role</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Determines platform-level access. Each user has exactly one Global Role:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Controls Admin Hub access</li>
                <li>• Determines who can manage users</li>
                <li>• Sets administrative capability level</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">User Groups</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Determines module-level access. Users can belong to multiple groups:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Controls which modules users can access</li>
                <li>• Sets feature-level permissions within modules</li>
                <li>• Permissions combine from all group memberships</li>
              </ul>
            </div>
          </div>
          <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
            <h4 className="font-medium mb-2">How They Work Together</h4>
            <p className="text-sm text-muted-foreground">
              A user with <strong>Staff</strong> global role and membership in the <strong>Sales Representatives</strong> 
              group can access sales-related modules but cannot access Admin Hub or manage other users. 
              An <strong>Admin</strong> with the same group membership has all sales permissions plus 
              Admin Hub access and user management capabilities.
            </p>
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
                User Groups, can manage team-level operations within permitted modules.
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
                Read-only access, can view content in assigned modules but cannot create, edit, 
                or delete anything. Useful for stakeholders who need visibility.
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
            <h4 className="font-medium mb-3">Default Groups (Seeded on Startup)</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-medium text-foreground min-w-[160px]">Global Admin (system)</span>
                <span>Full access to all modules and features at admin level</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-foreground min-w-[160px]">Director (system)</span>
                <span>Management-level access across modules</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-foreground min-w-[160px]">Manager</span>
                <span>Operational management access within specific modules</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-foreground min-w-[160px]">Staff</span>
                <span>Standard staff access for daily operations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-foreground min-w-[160px]">Viewer (system)</span>
                <span>Read-only access to assigned modules</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-foreground min-w-[160px]">Sales Representatives</span>
                <span>Access to sales and B2B-related modules</span>
              </li>
            </ul>
          </div>
          <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
            <h4 className="font-medium mb-2">Creating Custom Groups</h4>
            <p className="text-sm text-muted-foreground">
              Create custom groups for specific teams or roles (e.g., "Compliance Team", "Training Managers"). 
              Configure module access and feature permissions to match the group's responsibilities.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "permissions",
      title: "Permission Levels",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Each feature within a module can have one of four permission levels:
          </p>
          <div className="grid md:grid-cols-4 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <h5 className="font-medium text-sm">None</h5>
              <p className="text-xs text-muted-foreground">No access to this feature</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <h5 className="font-medium text-sm">View</h5>
              <p className="text-xs text-muted-foreground">Can see but not modify</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <h5 className="font-medium text-sm">Edit</h5>
              <p className="text-xs text-muted-foreground">Can view and modify</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <h5 className="font-medium text-sm">Admin</h5>
              <p className="text-xs text-muted-foreground">Full control including delete</p>
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Module Access Toggle</h4>
            <p className="text-sm text-muted-foreground">
              Each group has a module access toggle (on/off) for every module. If access is off, 
              the user cannot see or access the module regardless of feature permissions. This 
              provides a quick way to grant or revoke entire module access.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "managing-users",
      title: "Managing Users",
      content: (
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Setting a User's Global Role</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Go to the <strong className="text-foreground">Access Control</strong> page (from Admin Hub)</li>
              <li>Find the user in the <strong className="text-foreground">Platform Users</strong> table</li>
              <li>Click the <strong className="text-foreground">Edit</strong> (pencil) icon in the Actions column</li>
              <li>Select the appropriate <strong className="text-foreground">Global Role</strong> from the dropdown</li>
              <li>Click <strong className="text-foreground">Save Changes</strong></li>
            </ol>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Adding Users to Groups</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Go to the Access Control page</li>
              <li>Click the <strong className="text-foreground">Groups</strong> icon next to a user in the table</li>
              <li>Toggle groups on/off in the dialog that appears</li>
              <li>Changes save automatically when you close the dialog</li>
            </ol>
          </div>
          <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
            <h4 className="font-medium mb-2">Authentication Methods</h4>
            <p className="text-sm text-muted-foreground">
              Users authenticate via Replit SSO (OpenID Connect) for the main platform. B2B users 
              have separate email/password authentication for the wholesale portal.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "configuring-groups",
      title: "Configuring Group Permissions",
      content: (
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Steps to Configure</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Go to the Access Control page</li>
              <li>Select a group from the <strong className="text-foreground">Groups</strong> panel on the left</li>
              <li>The right panel shows module access toggles and feature permissions</li>
              <li>Toggle module access on/off using the switches</li>
              <li>For each enabled module, set feature permission levels (None, View, Edit, Admin)</li>
              <li>Changes apply immediately to all group members</li>
            </ol>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Best Practices</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Start with minimal permissions and add as needed</li>
                <li>• Use groups for job functions, not individuals</li>
                <li>• Review permissions quarterly</li>
                <li>• Document custom group purposes</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Common Patterns</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Create department-specific groups</li>
                <li>• Use "Viewer" groups for stakeholders</li>
                <li>• Assign multiple groups for cross-functional roles</li>
                <li>• Keep system groups unchanged</li>
              </ul>
            </div>
          </div>
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
            have complete permission entries for every module and feature in the platform.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">When to Use</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• After new modules or features are added to the platform</li>
                <li>• When the status shows "X missing entries" (amber warning)</li>
                <li>• After database updates or migrations</li>
                <li>• After republishing the application</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">What It Does</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Scans all groups for missing module access entries</li>
                <li>• Scans all groups for missing feature permission entries</li>
                <li>• Creates missing entries with default values (access=off, permission=none)</li>
                <li>• Shows count of entries created</li>
              </ul>
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Status Indicators</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li><span className="text-green-600 font-medium">Green checkmark with "Synced"</span> = All groups have complete permission entries</li>
              <li><span className="text-amber-600 font-medium">Amber warning with "X missing entries"</span> = Some entries need to be created (click Sync Security to fix)</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "platform-modules",
      title: "Platform Modules",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The platform includes active modules and planned future modules:
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="border-l-4 border-green-500 pl-4">
              <h5 className="font-medium">Tasting Experience</h5>
              <p className="text-sm text-muted-foreground">Guest-facing wine tasting app with AI recommendations</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h5 className="font-medium">B2B Wholesale</h5>
              <p className="text-sm text-muted-foreground">Wholesale customer and order management</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h5 className="font-medium">LMS</h5>
              <p className="text-sm text-muted-foreground">Staff training and certification</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h5 className="font-medium">Compliance</h5>
              <p className="text-sm text-muted-foreground">Regulatory deadline and task tracking</p>
            </div>
            <div className="border-l-4 border-amber-500 pl-4">
              <h5 className="font-medium">SOP</h5>
              <p className="text-sm text-muted-foreground">Standard operating procedures (Coming Soon)</p>
            </div>
            <div className="border-l-4 border-amber-500 pl-4">
              <h5 className="font-medium">Operations</h5>
              <p className="text-sm text-muted-foreground">Daily operations dashboard (Coming Soon)</p>
            </div>
            <div className="border-l-4 border-amber-500 pl-4">
              <h5 className="font-medium">Maintenance</h5>
              <p className="text-sm text-muted-foreground">Equipment and asset maintenance (Coming Soon)</p>
            </div>
            <div className="border-l-4 border-amber-500 pl-4">
              <h5 className="font-medium">Experience Library</h5>
              <p className="text-sm text-muted-foreground">Customer experience management (Coming Soon)</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "environment-sync",
      title: "Environment Sync",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The platform includes tools for syncing data between environments (development to production):
          </p>
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Sync Capabilities</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Export Data</strong>: Download configuration data as Excel files</li>
              <li>• <strong>Import Data</strong>: Upload and apply configuration changes</li>
              <li>• <strong>Object Storage Sync</strong>: Synchronize media files between environments</li>
              <li>• <strong>Business Key Resolution</strong>: Smart matching using natural keys instead of IDs</li>
              <li>• <strong>Validation</strong>: Zod schema validation before import</li>
            </ul>
          </div>
          <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
            <h4 className="font-medium mb-2">Super Admin Only</h4>
            <p className="text-sm text-muted-foreground">
              Environment sync tools are only available to Super Admins due to their potential 
              impact on platform data.
            </p>
          </div>
        </div>
      ),
    },
  ],
});
