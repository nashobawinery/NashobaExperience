import { registerModuleDocs } from "./index";

registerModuleDocs({
  moduleKey: "compliance",
  moduleName: "Compliance Management",
  description: "Regulatory deadline tracking, task management, and audit documentation",
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
            required filings, renewals, license applications, and regulatory obligations across 
            federal, state, and local jurisdictions.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Calendar View</h4>
              <p className="text-sm text-muted-foreground">
                Visual calendar showing all upcoming compliance deadlines with color-coded status indicators.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Task Management</h4>
              <p className="text-sm text-muted-foreground">
                Create, assign, and track compliance tasks with automated reminders and recurrence.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Audit Trail</h4>
              <p className="text-sm text-muted-foreground">
                Complete history of all task changes, completions, and attachments for regulatory review.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "task-categories",
      title: "Task Categories",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Compliance tasks are organized by category for better organization and filtering:
          </p>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <h5 className="font-medium text-sm">Tax</h5>
              <p className="text-xs text-muted-foreground">Sales tax, excise tax, federal returns</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <h5 className="font-medium text-sm">Licensing</h5>
              <p className="text-xs text-muted-foreground">Permits, renewals, applications</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <h5 className="font-medium text-sm">Regulatory</h5>
              <p className="text-xs text-muted-foreground">TTB, ABC, FDA requirements</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <h5 className="font-medium text-sm">Insurance</h5>
              <p className="text-xs text-muted-foreground">Policy renewals, claims, certificates</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <h5 className="font-medium text-sm">Environmental</h5>
              <p className="text-xs text-muted-foreground">EPA, waste disposal, permits</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <h5 className="font-medium text-sm">Health & Safety</h5>
              <p className="text-xs text-muted-foreground">OSHA, inspections, certifications</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <h5 className="font-medium text-sm">Payroll</h5>
              <p className="text-xs text-muted-foreground">Tax deposits, W-2s, 1099s</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <h5 className="font-medium text-sm">Privacy</h5>
              <p className="text-xs text-muted-foreground">Data protection, policies</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <h5 className="font-medium text-sm">Administrative</h5>
              <p className="text-xs text-muted-foreground">General business compliance</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "task-management",
      title: "Creating & Managing Tasks",
      content: (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Task Properties</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Task Name</strong>: Clear, descriptive title</li>
                <li>• <strong>Description</strong>: Detailed instructions</li>
                <li>• <strong>Category</strong>: Tax, Licensing, Regulatory, etc.</li>
                <li>• <strong>Subcategory</strong>: More specific classification</li>
                <li>• <strong>Jurisdiction</strong>: Federal, State, Local</li>
                <li>• <strong>Regulatory Body</strong>: IRS, TTB, State ABC, etc.</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Priority Levels</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <span className="text-green-600 font-medium">Low</span>: Routine tasks with flexibility</li>
                <li>• <span className="text-amber-600 font-medium">Medium</span>: Standard compliance items</li>
                <li>• <span className="text-orange-600 font-medium">High</span>: Important deadlines approaching</li>
                <li>• <span className="text-red-600 font-medium">Critical</span>: Urgent, risk of penalties</li>
              </ul>
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Task Statuses</h4>
            <div className="grid grid-cols-5 gap-2 text-sm">
              <div className="text-center p-2 rounded bg-slate-100 dark:bg-slate-800">
                <div className="font-medium">Pending</div>
                <div className="text-xs text-muted-foreground">Not started</div>
              </div>
              <div className="text-center p-2 rounded bg-blue-100 dark:bg-blue-900/30">
                <div className="font-medium text-blue-800 dark:text-blue-300">In Progress</div>
                <div className="text-xs text-muted-foreground">Being worked on</div>
              </div>
              <div className="text-center p-2 rounded bg-green-100 dark:bg-green-900/30">
                <div className="font-medium text-green-800 dark:text-green-300">Completed</div>
                <div className="text-xs text-muted-foreground">Successfully done</div>
              </div>
              <div className="text-center p-2 rounded bg-red-100 dark:bg-red-900/30">
                <div className="font-medium text-red-800 dark:text-red-300">Overdue</div>
                <div className="text-xs text-muted-foreground">Past deadline</div>
              </div>
              <div className="text-center p-2 rounded bg-gray-100 dark:bg-gray-800">
                <div className="font-medium">Cancelled</div>
                <div className="text-xs text-muted-foreground">No longer needed</div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "recurrence",
      title: "Recurring Tasks",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Set up recurring schedules for tasks that repeat on regular intervals:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Recurrence Options</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>One Time</strong>: Single occurrence task</li>
                <li>• <strong>Daily</strong>: Every day</li>
                <li>• <strong>Weekly</strong>: Every week</li>
                <li>• <strong>Monthly</strong>: Once per month</li>
                <li>• <strong>Quarterly</strong>: Every 3 months</li>
                <li>• <strong>Semi-Annual</strong>: Every 6 months</li>
                <li>• <strong>Annual</strong>: Once per year</li>
                <li>• <strong>Custom</strong>: Specify days between occurrences</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">How Recurrence Works</h4>
              <p className="text-sm text-muted-foreground">
                When a recurring task is completed, the system automatically creates the next 
                occurrence based on the schedule. The new task inherits all properties from the 
                original with an updated due date.
              </p>
            </div>
          </div>
          <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
            <h4 className="font-medium mb-2">Archiving Recurring Tasks</h4>
            <p className="text-sm text-muted-foreground">
              Archiving a recurring task stops future occurrences from being created. Use this 
              when a compliance requirement is no longer applicable.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "reminders",
      title: "Email Reminders",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure automated email reminders to notify assigned owners before deadlines:
          </p>
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-3">Reminder Configuration</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• <strong>Multiple Intervals</strong>: Set reminders at 30, 14, 7, and 1 days before due date</li>
              <li>• <strong>Assigned Owner</strong>: Reminders sent to the task's assigned email</li>
              <li>• <strong>Manual Send</strong>: Send reminders manually at any time</li>
              <li>• <strong>Reminder Tracking</strong>: View history of sent reminders per task</li>
            </ul>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Reminder Email Contains</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Task name and description</li>
                <li>• Due date and days remaining</li>
                <li>• Priority level</li>
                <li>• Category and regulatory body</li>
                <li>• Link to portal (if configured)</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Best Practices</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Set earlier reminders for complex tasks</li>
                <li>• Use 30-day reminder for annual renewals</li>
                <li>• Critical tasks should have multiple reminders</li>
                <li>• Verify assigned email is current</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "portal-integration",
      title: "Portal Integration",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Link tasks to external regulatory portals for quick access during task completion:
          </p>
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-3">Portal Information</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• <strong>Portal URL</strong>: Direct link to the regulatory portal or filing system</li>
              <li>• <strong>Username</strong>: Account username for the portal</li>
              <li>• <strong>Password</strong>: Account password (securely stored)</li>
              <li>• <strong>Portal Notes</strong>: Instructions for navigating the portal, finding forms, etc.</li>
            </ul>
          </div>
          <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
            <h4 className="font-medium mb-2">Quick Access</h4>
            <p className="text-sm text-muted-foreground">
              Click the portal link directly from the task view to open the regulatory site. 
              Credentials are displayed for easy copy/paste during login.
            </p>
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
            Track costs associated with compliance activities for budgeting and reporting:
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Estimated Cost</h4>
              <p className="text-sm text-muted-foreground">
                Budget amount when creating the task. Used for forecasting and budget planning.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Actual Cost</h4>
              <p className="text-sm text-muted-foreground">
                Real cost recorded upon completion. Includes filing fees, professional services, etc.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Penalty Amount</h4>
              <p className="text-sm text-muted-foreground">
                Track any penalties incurred for late filings or violations.
              </p>
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Cost Reports</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Annual cost summaries by category</li>
              <li>• Budget vs. actual variance analysis</li>
              <li>• Penalty tracking and trends</li>
              <li>• Export for accounting integration</li>
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
            Maintain a complete audit trail of all compliance activities for regulatory review:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">What's Tracked</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Task creation with creator info</li>
                <li>• All field modifications with old/new values</li>
                <li>• Status changes with timestamps</li>
                <li>• Completion details and who completed</li>
                <li>• Attachment uploads</li>
                <li>• Reminder sends</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Completion Documentation</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Completion Notes</strong>: Details about how task was completed</li>
                <li>• <strong>Confirmation Number</strong>: Filing confirmation or receipt number</li>
                <li>• <strong>Attachments</strong>: Supporting documents, receipts, confirmations</li>
                <li>• <strong>Completed By</strong>: User who marked task complete</li>
                <li>• <strong>Completion Date</strong>: When task was marked complete</li>
              </ul>
            </div>
          </div>
          <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
            <h4 className="font-medium mb-2">Audit-Ready Documentation</h4>
            <p className="text-sm text-muted-foreground">
              Export complete audit history for any task or time period. Documentation includes 
              all changes, attachments, and completion records needed for regulatory audits.
            </p>
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
            The calendar provides a visual overview of all compliance deadlines:
          </p>
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-3">Calendar Features</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• <strong>Monthly View</strong>: See all tasks for the current month at a glance</li>
              <li>• <strong>Color Coding</strong>: Tasks colored by status (pending=gray, in progress=blue, overdue=red, completed=green)</li>
              <li>• <strong>Quick Actions</strong>: Click any task to view details or update status</li>
              <li>• <strong>Priority Indicators</strong>: Visual markers for high-priority items</li>
              <li>• <strong>Filter by Category</strong>: Show only specific task categories</li>
              <li>• <strong>Today Indicator</strong>: Current date highlighted for reference</li>
            </ul>
          </div>
          <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
            <h4 className="font-medium mb-2">Due Date Indicators</h4>
            <p className="text-sm text-muted-foreground">
              Tasks show days until due with color-coded urgency: green for plenty of time, 
              amber for approaching, red for urgent or overdue.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "admin-tabs",
      title: "Admin Dashboard Tabs",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            The Compliance Admin Dashboard provides three main views:
          </p>
          <div className="space-y-3">
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Overview Tab</h5>
              <p className="text-sm text-muted-foreground">
                Dashboard with key metrics: tasks due soon, overdue count, completed this month, 
                upcoming by category, and recent activity feed.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">All Tasks Tab</h5>
              <p className="text-sm text-muted-foreground">
                Complete list of all compliance tasks with filtering by category, status, priority, 
                and search. Create, edit, view details, and manage tasks from this view.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Calendar Tab</h5>
              <p className="text-sm text-muted-foreground">
                Visual calendar showing tasks by due date. Click dates to see tasks due, 
                navigate months, and get a timeline view of compliance deadlines.
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ],
});
