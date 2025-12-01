import { registerModuleDocs } from "./index";

registerModuleDocs({
  moduleKey: "daily-reports",
  moduleName: "Daily Reports",
  description: "Department daily reporting with incidents, procedures, and performance tracking",
  lastUpdated: "2024-12-01",
  sections: [
    {
      id: "overview",
      title: "Overview",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            The Daily Reports module enables department managers to log daily operations, 
            track performance metrics, report incidents, and complete procedure checklists. 
            This module helps maintain operational visibility across all departments and 
            ensures consistent reporting for management review.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Department Metrics</h4>
              <p className="text-sm text-muted-foreground">
                Track department-specific KPIs like guest counts, sales figures, and operational data.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Incident Logging</h4>
              <p className="text-sm text-muted-foreground">
                Record customer complaints, equipment issues, safety concerns, and other notable events.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Procedure Tracking</h4>
              <p className="text-sm text-muted-foreground">
                Complete daily procedure checklists linked to compliance tasks for accountability.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "departments",
      title: "Departments",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Each department has customized metrics and procedures tailored to their operations:
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <h5 className="font-medium text-sm">Tasting Room</h5>
              <p className="text-xs text-muted-foreground">Guest counts, tastings, bottles sold, club sign-ups</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <h5 className="font-medium text-sm">Retail</h5>
              <p className="text-xs text-muted-foreground">Transactions, total sales, items sold, returns</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <h5 className="font-medium text-sm">The Knoll</h5>
              <p className="text-xs text-muted-foreground">Covers, reservations, walk-ins, special events</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <h5 className="font-medium text-sm">Pavilion</h5>
              <p className="text-xs text-muted-foreground">Events hosted, attendees, setup hours</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <h5 className="font-medium text-sm">J's Restaurant</h5>
              <p className="text-xs text-muted-foreground">Covers, bar sales, food sales, wait times</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <h5 className="font-medium text-sm">Production</h5>
              <p className="text-xs text-muted-foreground">Batches, bottles produced, quality issues</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <h5 className="font-medium text-sm">Events</h5>
              <p className="text-xs text-muted-foreground">Daily events, guests, inquiries, bookings</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <h5 className="font-medium text-sm">Maintenance</h5>
              <p className="text-xs text-muted-foreground">Work orders, preventive tasks, emergency calls</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <h5 className="font-medium text-sm">Orchard</h5>
              <p className="text-xs text-muted-foreground">Acres worked, harvest bins, spray applications</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <h5 className="font-medium text-sm">Food Operations</h5>
              <p className="text-xs text-muted-foreground">Meals prepared, prep hours, waste percentage</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "incidents",
      title: "Incident Types",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Log incidents with appropriate severity levels for proper escalation and follow-up:
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <h5 className="font-medium text-sm">Customer Complaint</h5>
              <p className="text-xs text-muted-foreground">Guest feedback requiring attention or resolution</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <h5 className="font-medium text-sm">Equipment Issue</h5>
              <p className="text-xs text-muted-foreground">Malfunctioning or broken equipment</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <h5 className="font-medium text-sm">Safety Concern</h5>
              <p className="text-xs text-muted-foreground">Hazards, injuries, or safety-related incidents</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <h5 className="font-medium text-sm">Staffing Issue</h5>
              <p className="text-xs text-muted-foreground">Callouts, shortages, or scheduling conflicts</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <h5 className="font-medium text-sm">Inventory Shortage</h5>
              <p className="text-xs text-muted-foreground">Out-of-stock items affecting operations</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <h5 className="font-medium text-sm">Quality Issue</h5>
              <p className="text-xs text-muted-foreground">Product or service quality concerns</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <h5 className="font-medium text-sm">Policy Violation</h5>
              <p className="text-xs text-muted-foreground">Staff policy or procedure breaches</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <h5 className="font-medium text-sm">Positive Feedback</h5>
              <p className="text-xs text-muted-foreground">Commendations and positive guest experiences</p>
            </div>
          </div>
          <div className="mt-4">
            <h5 className="font-medium text-sm mb-2">Severity Levels</h5>
            <div className="flex gap-2 flex-wrap">
              <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">Low</span>
              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">Medium</span>
              <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">High</span>
              <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Critical</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "workflow",
      title: "Report Workflow",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Daily reports follow a structured workflow for quality assurance:
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-muted/50 rounded-lg p-3">
              <div className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-medium">Draft</div>
              <div>
                <h5 className="font-medium text-sm">Report Created</h5>
                <p className="text-xs text-muted-foreground">
                  Department manager enters daily metrics, notes, and any incidents. Can be edited until submitted.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-muted/50 rounded-lg p-3">
              <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-medium">Submitted</div>
              <div>
                <h5 className="font-medium text-sm">Awaiting Review</h5>
                <p className="text-xs text-muted-foreground">
                  Report locked for editing and waiting for management review. Incidents and procedures still accessible.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-muted/50 rounded-lg p-3">
              <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-medium">Reviewed</div>
              <div>
                <h5 className="font-medium text-sm">Approved</h5>
                <p className="text-xs text-muted-foreground">
                  Report reviewed and approved by management. Stored for historical analysis and compliance.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "best-practices",
      title: "Best Practices",
      content: (
        <div className="space-y-4">
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li><strong>Submit reports by end of shift:</strong> Ensure accurate data capture while details are fresh</li>
            <li><strong>Document all incidents:</strong> Even minor issues help identify patterns and prevent escalation</li>
            <li><strong>Complete procedure checklists:</strong> Verify all required procedures before submitting</li>
            <li><strong>Include customer service notes:</strong> Highlight both positive feedback and areas for improvement</li>
            <li><strong>Be specific with metrics:</strong> Accurate counts enable meaningful trend analysis</li>
            <li><strong>Use follow-up flags:</strong> Mark incidents requiring management attention</li>
            <li><strong>Review historical reports:</strong> Compare current performance to past periods</li>
          </ul>
        </div>
      ),
    },
    {
      id: "customization",
      title: "Customizing Department Forms",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Each department's daily report form can be customized with specific metrics, procedures, and notification settings.
          </p>
          
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium">Accessing Department Settings</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Navigate to the <strong>Departments</strong> tab in the Daily Reports dashboard</li>
              <li>Find the department you want to customize</li>
              <li>Click the <strong>Edit</strong> button (pencil icon) on the department card</li>
            </ol>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Email Notifications</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Configure who receives email notifications when reports are submitted:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Add recipient email addresses</li>
                <li>Optionally include recipient name and role</li>
                <li>Multiple recipients can be added per department</li>
              </ul>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Procedure Checklists</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Create procedure checklists with three types:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li><span className="bg-green-100 text-green-800 px-1 rounded text-xs">Opening</span> - Tasks for start of shift</li>
                <li><span className="bg-purple-100 text-purple-800 px-1 rounded text-xs">Closing</span> - Tasks for end of shift</li>
                <li><span className="bg-blue-100 text-blue-800 px-1 rounded text-xs">General</span> - Tasks throughout the day</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Managing Procedures</h4>
            <p className="text-sm text-muted-foreground mb-2">
              For each department, you can:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li><strong>Add Procedure:</strong> Click "Add Procedure" within the department card</li>
              <li><strong>Set Procedure Type:</strong> Choose Opening, Closing, or General</li>
              <li><strong>Mark as Required:</strong> Required procedures must be completed before submission</li>
              <li><strong>Set Sort Order:</strong> Control the order procedures appear in the checklist</li>
              <li><strong>Activate/Deactivate:</strong> Temporarily disable procedures without deleting</li>
            </ul>
          </div>
          
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">Note on Metrics</h4>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Department metrics (KPIs) are currently configured at the system level. 
              Contact your administrator if you need to add, modify, or remove metrics for a department.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "public-access",
      title: "Staff Access Codes",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Staff can submit daily reports without logging in using access codes and QR codes.
          </p>
          
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium">Creating Access Codes</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Go to the <strong>Settings</strong> tab</li>
              <li>Click <strong>Add Access Code</strong></li>
              <li>Enter the staff member's name</li>
              <li>Select the department they're reporting for</li>
              <li>A 4-digit code is generated (you can customize it)</li>
            </ol>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">QR Code Access</h4>
              <p className="text-sm text-muted-foreground">
                Each access code has a QR code that staff can scan to quickly access the report form.
                Print QR codes for posting in department areas.
              </p>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Direct URL Access</h4>
              <p className="text-sm text-muted-foreground">
                Staff can also access the form directly using the URL with their code.
                Share the URL via text or email for remote access.
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ],
});
