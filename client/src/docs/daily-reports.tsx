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
    {
      id: "report-history",
      title: "Report History & Filtering",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Reports tab provides comprehensive filtering and sorting capabilities for management review and historical analysis.
          </p>
          
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium">Filter Options</h4>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <h5 className="text-sm font-medium mb-1">Date Range</h5>
                <p className="text-xs text-muted-foreground">
                  Filter reports by From and To dates to view reports within a specific period.
                </p>
              </div>
              <div>
                <h5 className="text-sm font-medium mb-1">Department</h5>
                <p className="text-xs text-muted-foreground">
                  Select a specific department or view all departments at once.
                </p>
              </div>
              <div>
                <h5 className="text-sm font-medium mb-1">Staff Member</h5>
                <p className="text-xs text-muted-foreground">
                  Filter by the person who submitted the report (populated from report history).
                </p>
              </div>
              <div>
                <h5 className="text-sm font-medium mb-1">Search</h5>
                <p className="text-xs text-muted-foreground">
                  Free-text search across department names, notes, and staff names.
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium">Sortable Columns</h4>
            <p className="text-sm text-muted-foreground">
              Click on any column header to sort the report list. Click again to toggle between ascending and descending order.
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li><strong>Department:</strong> Sort alphabetically by department name</li>
              <li><strong>Date:</strong> Sort by report date (default: newest first)</li>
              <li><strong>Status:</strong> Sort by draft, submitted, or reviewed status</li>
              <li><strong>Incidents:</strong> Sort by number of incidents logged</li>
              <li><strong>Procedures:</strong> Sort by procedures completed count</li>
              <li><strong>Submitted By:</strong> Sort alphabetically by staff member name</li>
            </ul>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium">Export to Excel</h4>
            <p className="text-sm text-muted-foreground">
              Export filtered reports to an Excel spreadsheet for offline analysis or sharing with stakeholders.
              The export includes all visible columns plus additional details like performance summary and customer concerns.
            </p>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Clear Filters</h4>
            <p className="text-sm text-muted-foreground">
              When filters are active, a "Clear Filters" button appears allowing you to reset all filters 
              and return to viewing all reports with the default sort order.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "eldercare-comply-spec",
      title: "ElderCare Comply - Daily Reports Specification",
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">AI Agent Implementation Guide</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              The following specification can be copied and provided to another AI coding agent to implement the Daily Reports feature in the ElderCare Comply application.
            </p>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4 space-y-4">
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-x-auto font-mono bg-background p-4 rounded border">
{`# Daily Reports Module - Feature Specification

## Overview
Build a Daily Reports module that enables department managers to log daily operations, track performance metrics, report incidents, and complete procedure checklists. The module provides operational visibility across departments with comprehensive filtering and export capabilities.

## Core Data Models

### 1. Daily Report Template (per department)
- department: string (enum of department types)
- departmentLabel: string (display name)
- metrics: JSON array of {key, label, type, required}
- notificationEmails: JSON array of {email, name?, role?}
- isActive: boolean

### 2. Daily Report
- id: UUID primary key
- department: enum (references template)
- templateId: reference to template
- reportDate: timestamp
- submittedById: reference to user (nullable for public access)
- submittedByName: text
- performanceSummary: text
- overallRating: integer (1-5 scale)
- metricsData: JSON (key-value pairs matching template metrics)
- proceduresCompleted: boolean
- proceduresCompletedCount: integer
- proceduresTotalCount: integer
- hasCustomerConcerns: boolean
- customerConcernsSummary: text
- status: enum (draft, submitted, reviewed)
- submittedAt: timestamp
- reviewedById: reference to user
- reviewedByName: text
- reviewedAt: timestamp
- reviewNotes: text
- incidentsCount: integer (computed)
- createdAt/updatedAt: timestamps

### 3. Daily Report Incident
- id: UUID primary key
- reportId: reference to daily report
- incidentType: enum (customer_complaint, equipment_issue, safety_concern, staffing_issue, inventory_shortage, quality_issue, policy_violation, positive_feedback, other)
- severity: enum (low, medium, high, critical)
- description: text
- actionTaken: text
- followUpRequired: boolean
- followUpNotes: text
- resolved: boolean
- resolvedById: reference to user
- resolvedAt: timestamp
- occurredAt: timestamp

### 4. Daily Report Procedure
- id: UUID primary key
- templateId: reference to template
- name: text
- description: text
- procedureType: enum (opening, closing, general)
- isRequired: boolean
- isActive: boolean
- sortOrder: integer

### 5. Daily Report Access Code (for public QR code access)
- id: UUID primary key
- code: varchar(4) unique (4-digit code, range 1000-9999)
- staffName: text
- department: enum
- isActive: boolean
- expiresAt: timestamp (optional)
- createdAt: timestamp

## Features to Implement

### Admin Dashboard (authenticated users)
1. **Overview Tab**
   - Department cards showing today's reports
   - Quick stats: total reports, submitted today, unresolved incidents
   - Date picker for historical view

2. **Reports Tab with Filtering**
   - Search box (searches department, notes, staff name)
   - Department dropdown filter
   - Staff member dropdown filter (populated from unique submitters)
   - Date range filters (From/To date inputs)
   - Sortable table columns (click header to toggle asc/desc):
     - Department, Date, Status, Incidents, Procedures, Submitted By
   - Clear Filters button (appears when filters active)
   - Export to Excel button (exports filtered results)
   - Count display: "Showing X of Y reports (filtered)"

3. **Departments Tab**
   - Edit department templates
   - Configure notification email lists (JSONB array with email, name, role)
   - Manage procedures per department (add/edit/delete)
   - Procedure types: opening, closing, general

4. **Settings Tab**
   - Manage access codes for public/QR code submission
   - 4-digit codes (1000-9999), auto-generated or manual entry
   - Editable code values with uniqueness validation
   - Generate QR codes linking to /daily-report/:code
   - Copy URL functionality

### Public Report Form (/daily-report/:code)
- No authentication required
- Validates access code and fetches department template
- Mobile-friendly form with:
  - Staff name display (from access code)
  - Department display
  - Date picker (defaults to today)
  - Dynamic metrics fields based on template
  - Procedure checklists (opening/closing/general sections)
  - Incidents section (add/remove incidents)
  - Performance summary textarea
  - Overall rating (1-5)
  - Customer concerns toggle and notes
  - Submit button
- On submit: creates report with status "submitted"
- Success confirmation screen

### Report Form Features
- **Clear All Fields button**: Resets all metric values, notes, and text fields while preserving department and date selection
- Cancel and Save buttons in dialog footer

### Email Notifications
- Send email via SendGrid when report is submitted
- Recipients from template's notificationEmails array
- Email includes: department, date, submitter name, key metrics, incident count

### Report Workflow
1. Draft - editable, can add/edit incidents
2. Submitted - locked, awaiting review
3. Reviewed - approved by management

## API Endpoints Needed

GET /api/daily-report-templates - List all templates
GET /api/daily-report-templates/:id - Get single template
PATCH /api/daily-report-templates/:id - Update template (metrics, emails, procedures)

GET /api/daily-reports - List reports with optional filters (department, startDate, endDate, status)
GET /api/daily-reports/:id - Get single report with incidents
POST /api/daily-reports - Create new report
PATCH /api/daily-reports/:id - Update report
DELETE /api/daily-reports/:id - Delete report
POST /api/daily-reports/:id/submit - Change status to submitted
POST /api/daily-reports/:id/review - Change status to reviewed

GET /api/daily-reports/:id/incidents - Get incidents for report
POST /api/daily-reports/:id/incidents - Add incident to report
PATCH /api/daily-report-incidents/:id - Update incident
DELETE /api/daily-report-incidents/:id - Delete incident

GET /api/daily-report-access-codes - List access codes
POST /api/daily-report-access-codes - Create access code
PATCH /api/daily-report-access-codes/:id - Update access code
DELETE /api/daily-report-access-codes/:id - Delete access code
GET /api/daily-report-access-codes/validate/:code - Validate code (public endpoint)

POST /api/daily-reports/public - Create report via access code (public endpoint)

## Tech Stack Recommendations
- React with TypeScript frontend
- Express.js backend
- PostgreSQL database with Drizzle ORM
- TanStack Query for data fetching
- shadcn/ui components (Card, Table, Select, Input, Button, Tabs, Badge, Dialog)
- lucide-react icons
- date-fns for date formatting
- xlsx library for Excel export
- qrcode library for QR code generation
- SendGrid for email notifications

## UI Components Needed
- Sortable table with column headers that toggle sort direction
- Filter card with grid layout for filter controls
- Date range picker (two date inputs)
- Department/Staff select dropdowns
- QR code display and download
- Incident form dialog
- Procedure checklist with type groupings
- Status badges (draft=yellow, submitted=blue, reviewed=green)
- Severity badges (low=gray, medium=yellow, high=orange, critical=red)

## Key Implementation Notes
1. Access codes must be unique 4-digit numbers (1000-9999)
2. Reports are unique per department per day (database constraint)
3. Incident counts are denormalized on the report for query performance
4. Procedure completion tracking updates report totals on save
5. All filters work client-side after initial data fetch
6. Excel export includes all filtered data plus additional fields
7. QR codes encode the full URL to the public form`}
            </pre>
          </div>
        </div>
      ),
    },
  ],
});
