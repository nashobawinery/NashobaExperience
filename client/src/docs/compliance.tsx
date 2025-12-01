import { registerModuleDocs } from "./index";

registerModuleDocs({
  moduleKey: "compliance",
  moduleName: "Compliance Management",
  description: "Regulatory deadline tracking and audit management",
  lastUpdated: "2024-12-01",
  sections: [
    {
      id: "overview",
      title: "Overview",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            The Compliance Management module helps track regulatory deadlines, manage recurring tasks, 
            and maintain audit history. It ensures your organization stays compliant with all 
            required filings, renewals, and regulatory obligations.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Calendar View</h4>
              <p className="text-sm text-muted-foreground">
                Visual calendar showing all upcoming compliance deadlines and tasks.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Task Management</h4>
              <p className="text-sm text-muted-foreground">
                Create, assign, and track compliance tasks with due dates and reminders.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "task-management",
      title: "Compliance Tasks",
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Creating Tasks</h5>
              <p className="text-sm text-muted-foreground">
                Add compliance tasks with title, description, due date, priority level, 
                assigned owner, and related regulatory body or portal.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Recurring Tasks</h5>
              <p className="text-sm text-muted-foreground">
                Set up recurring schedules for tasks that repeat (monthly, quarterly, annually). 
                The system automatically creates new instances based on your schedule.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Email Reminders</h5>
              <p className="text-sm text-muted-foreground">
                Configure email reminders to notify assigned owners before deadlines. 
                Set multiple reminder intervals (e.g., 30 days, 7 days, 1 day before).
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "calendar",
      title: "Calendar View",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The calendar provides a visual overview of all compliance deadlines and tasks.
          </p>
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-3">Calendar Features</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• <strong>Monthly View</strong> - See all tasks for the current month</li>
              <li>• <strong>Color Coding</strong> - Tasks colored by status (pending, overdue, complete)</li>
              <li>• <strong>Quick Actions</strong> - Click tasks to view details or mark complete</li>
              <li>• <strong>Filter by Type</strong> - Show only specific task categories</li>
              <li>• <strong>Export</strong> - Export calendar to external calendar apps</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "audit-history",
      title: "Audit History",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Maintain a complete audit trail of all compliance activities for regulatory review.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">What's Tracked</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Task creation and modifications</li>
                <li>• Completion timestamps</li>
                <li>• Who completed each task</li>
                <li>• Attached documentation</li>
                <li>• Notes and comments</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Reports</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Compliance status summary</li>
                <li>• Overdue task reports</li>
                <li>• Completion rate metrics</li>
                <li>• Audit-ready documentation</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "cost-tracking",
      title: "Cost Tracking",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Track costs associated with compliance activities such as license fees, filing costs, 
            and renewal charges.
          </p>
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-3">Cost Management</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Add cost estimates to tasks during creation</li>
              <li>• Record actual costs upon completion</li>
              <li>• Generate annual cost reports by category</li>
              <li>• Budget planning based on historical data</li>
              <li>• Track cost variances from estimates</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "portal-integration",
      title: "Portal Links",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Link tasks to external regulatory portals for quick access during task completion.
          </p>
          <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
            <h4 className="font-medium mb-2">Setting Up Portal Links</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>When creating a task, add the portal URL</li>
              <li>Optionally save login credentials (securely stored)</li>
              <li>Click the portal link from the task to open directly</li>
              <li>Mark task complete after filing</li>
            </ol>
          </div>
        </div>
      ),
    },
  ],
});
