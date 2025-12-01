# Nashoba Valley Operations Platform

## Overview
The Nashoba Valley Operations Platform is a modular monolith designed to unify various business operations within the adult beverage industry. It integrates a guest-facing Tasting Experience App, a B2B Wholesale Platform, and an LMS (Learning Management System), with a foundation to support future modules like SOP, Experience, Maintenance, Operations, and Procedures. The platform aims to centralize administrative functions, streamline operations, enhance user experience for staff and customers, and provide a scalable foundation for business growth.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform uses React with TypeScript, `shadcn/ui` (Radix UI), and Tailwind CSS for a mobile-first, responsive design with custom theming. A Central Admin Hub provides unified navigation, while the LMS module offers a mobile-first microlearning experience inspired by Opus.so with swipeable lesson cards.

### Technical Implementations
- **Frontend**: React with TypeScript, Vite, TanStack Query.
- **Backend**: Express.js with TypeScript, RESTful API.
- **Database**: PostgreSQL with Drizzle ORM (using Neon serverless driver).
- **Authentication**: Replit Auth (OpenID Connect) for guest apps and platform users; separate email/password for B2B. PostgreSQL-backed sessions.
- **Modularity**: Designed as a modular monolith with clear boundaries for independent module development.
- **Data Synchronization**: An environment sync tool facilitates selective data export/import and object storage synchronization using business keys and Zod validation.

### Feature Specifications
- **Central Admin Hub**: Unified entry point for all modules with KPIs and quick actions.
- **Platform Foundation**: Shared tables for module registry, unified user management with global and module-specific roles, cross-module audit logging, shared locations, equipment, and document storage.
- **LMS Module**: Mobile-first microlearning with course catalog, lesson viewing, quizzes, progress tracking, and certification. Admin dashboard for course management.
- **Tasting Experience Module**: Interactive guest experience with product browsing, AI recommendations (GPT-4o-mini), shopping cart with discounts, and tasting surveys. Admin dashboard for CRUD, QR codes, and media.
- **B2B Wholesale Platform**: Customer and order management with dedicated authentication, category-specific pricing, multi-location support, and advanced features like "Where to Buy" visibility. Admin dashboard for customer, order, tier, and sales rep management.
- **Compliance Module**: Calendar-based task management for regulatory deadlines with recurrence, email reminders, audit history, portal integration, and cost tracking.
- **Daily Reports Module**: Department managers log incidents, performance summaries, and track procedure completion. Features include:
  - 10 department templates with customizable metrics
  - Incident logging with severity levels and follow-up tracking
  - **Department-level Email Notifications**: Each department template has its own notification email list (stored as JSONB array). Admins configure recipients in the Departments tab by clicking the edit button on any department card. Recipients receive emails via SendGrid when reports are submitted.
  - **Public Access via QR Codes**: Staff can submit reports without logging in using 6-digit access codes. Admins create codes in Settings tab, generate QR codes, and staff scan to access a mobile-friendly submission form at `/daily-report/:code`.
  - **Procedure Templates**: Can be categorized as 'opening', 'closing', or 'general' to track procedure completion status in daily reports.
- **Role-Based Access Control (RBAC)**: Comprehensive system for managing user permissions across modules with user groups, module access toggles, granular feature permissions (none/view/edit/admin), and auto-sync for security entries.

## RBAC: User Groups vs Global Role

### User Groups (Recommended for Permissions)
User Groups are the primary mechanism for managing permissions in the platform:

- **Multiple Group Membership**: Users can belong to multiple groups simultaneously (e.g., "Staff" + "Sales Representatives")
- **Granular Control**: Each group defines:
  - Module access (which modules users can access)
  - Feature permissions (none/view/edit/admin for each feature within a module)
- **Effective Permissions**: A user's permissions = combination of all their group memberships
- **Default Groups**: The system seeds 5 default groups on startup:
  - Global Admin (system) - Full access to all modules and features
  - Director (system) - Management-level access across modules
  - Manager - Operational management access
  - Staff - Standard staff access for daily operations
  - Viewer (system) - Read-only access to assigned modules

### Global Role (Legacy Field)
Global Role is a simple single-value field on the user profile:

- **Values**: super_admin, admin, manager, staff, viewer
- **Purpose**: Primarily used for platform-level access control (e.g., who can access Admin Hub, Access Control page)
- **Note**: This is a legacy field from before User Groups existed; User Groups now provide more flexible permission management

#### Global Role Levels and Rights

| Role | Access Level | Rights Granted |
|------|--------------|----------------|
| **super_admin** | Highest | Full platform access including: Admin Hub, Access Control (create/edit/delete users), all modules, system settings, environment sync tools, and the ability to assign any role to other users |
| **admin** | High | Admin Hub access, Access Control page, can manage users and groups, access to all active modules, can perform administrative actions within modules |
| **manager** | Medium | Limited administrative access, can view Admin Hub dashboard, access to assigned modules based on User Groups, can manage team-level operations |
| **staff** | Standard | Regular platform user, access to modules based on User Groups only, can perform day-to-day operations, no administrative capabilities |
| **viewer** | Lowest | Read-only access, can view content in assigned modules but cannot create, edit, or delete anything |

#### How Global Role Works with User Groups

- **Global Role determines platform-level access**: Who can see Admin Hub, who can manage users
- **User Groups determine module-level access**: Which modules a user can access and what features they can use within those modules
- **Both work together**: A user with `staff` global role and membership in "Sales Representatives" group can access sales-related modules but cannot access Admin Hub or manage other users

#### Setting Global Role

1. Go to **Access Control** page
2. Find the user in the **Platform Users** table  
3. Click the **Edit** (pencil) icon
4. Select the appropriate **Global Role** from the dropdown
5. Click **Save Changes**

### Best Practices
1. **Use User Groups** for day-to-day permission management - they're more flexible and granular
2. **Set Global Role** based on platform access needs:
   - "admin"/"super_admin" = Can access Admin Hub, Access Control, and administrative features
   - "manager"/"staff"/"viewer" = Regular platform users
3. **Assign Multiple Groups** when users have cross-functional responsibilities
4. **Create Custom Groups** for specific teams or roles (e.g., "Sales Representatives", "Compliance Team")

### Sync Security Button

The **Sync Security** button on the Access Control page ensures all User Groups have complete permission entries for every module and feature in the platform.

#### What It Does
When new modules or features are added to the platform, each User Group needs corresponding permission entries (module access on/off, feature permission levels). The Sync Security button automatically creates any missing entries with default values (access=off, permission=none).

#### When to Use It
- After new modules or features are added to the platform
- When the status indicator shows "X missing entries" (amber warning)
- After database updates or migrations
- After republishing the application

#### Status Indicator
- **Green checkmark with "Synced"** = All groups have complete permission entries
- **Amber warning with "X missing entries"** = Some entries need to be created (click Sync Security to fix)

#### What Happens When Clicked
1. Scans all User Groups for missing module access entries
2. Scans all User Groups for missing feature permission entries
3. Creates the missing entries with default values
4. Shows a success message with the count of entries created

### System Design Choices
- **Microservices-inspired Modularity**: Modules are designed with independent concerns within a monolithic structure.
- **API-First Approach**: All functionalities exposed via RESTful APIs.
- **Security**: Robust authentication and authorization with role-based access control.
- **Scalability**: Utilizes serverless PostgreSQL (Neon) and cloud-based object storage.
- **AI Integration**: OpenAI's GPT-4o-mini for sommelier-style product recommendations.

## External Dependencies
- **Core Technologies**: `react`, `react-dom`, `express`, `vite`, `typescript`, `drizzle-orm`, `@neondatabase/serverless`, `@tanstack/react-query`.
- **UI/Styling**: `@radix-ui/*`, `tailwindcss`, `shadcn/ui`, `lucide-react`, `embla-carousel-react`, `framer-motion`.
- **Form Management**: `react-hook-form`, `@hookform/resolvers`, `zod`, `drizzle-zod`.
- **Utilities**: `date-fns`, `wouter`, `nanoid`, `ws`, `qrcode`, `xlsx`.
- **Artificial Intelligence**: `openai` (for GPT-4o-mini).
- **Email Service**: `@sendgrid/mail`.
- **Authentication**: `openid-client`, `express-session`, `connect-pg-simple`.
- **Database**: PostgreSQL (via Neon serverless).
- **File Storage**: `@google-cloud/storage`, `@uppy/core`, `@uppy/dashboard`, `@uppy/react`, `@uppy/aws-s3`.