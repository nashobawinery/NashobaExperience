# Nashoba Valley Operations Platform

## Overview
The Nashoba Valley Operations Platform is a modular monolith designed to unify various business operations, including a guest-facing Tasting Experience App, a B2B Wholesale Platform, and an LMS (Learning Management System). The platform is built to support future modules such as SOP, Experience, Maintenance, Operations, and Procedures, centralizing administrative functions and data. Its purpose is to streamline operations, enhance user experience for both internal staff and external customers, and provide a scalable foundation for growth within the adult beverage industry.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform utilizes React with TypeScript, `shadcn/ui` (Radix UI), and Tailwind CSS for a mobile-first, responsive design with custom theming. The Central Admin Hub provides a unified navigation point with module tiles, status indicators, and cross-module KPIs. The LMS module specifically focuses on a mobile-first microlearning experience inspired by Opus.so, featuring swipeable lesson cards and media-rich content.

### Technical Implementations
- **Frontend**: React with TypeScript, Vite, TanStack Query for server state management.
- **Backend**: Express.js with TypeScript, RESTful API.
- **Database**: PostgreSQL with Drizzle ORM for type-safe queries (using Neon serverless driver).
- **Authentication**: Replit Auth (OpenID Connect) for the tasting app and platform users; separate email/password authentication for the B2B platform. PostgreSQL-backed sessions using `express-session`.
- **Modularity**: Designed as a modular monolith, allowing independent development and deployment of modules within a shared codebase and infrastructure.
- **Data Synchronization**: An environment sync tool supports selective export/import of database tables and synchronization of object storage between development and production environments, using business keys for cross-environment portability and Zod-based validation.

### Feature Specifications
- **Central Admin Hub**: Unified entry point for all modules with cross-module KPIs and quick actions.
- **Platform Foundation**: Shared tables for module registry, unified user management with global roles, module-specific access controls, cross-module audit logging, shared locations, equipment, and document storage.
- **LMS Module**: Mobile-first microlearning platform with course catalog, lesson viewing, quiz taking, progress tracking, and certification. Admin dashboard for course creation, content management, and enrollment monitoring.
- **Tasting Experience Module**: Interactive guest experience with product browsing, AI recommendations (sommelier-style via GPT-4o-mini), shopping cart with tier-based discounts, and comprehensive tasting surveys. Admin dashboard for CRUD operations, QR code generation, and media management.
- **B2B Wholesale Platform**: Customer and order management with dedicated authentication, category-specific tier pricing, multi-location support for customers, and advanced features like "Where to Buy" visibility controls and featured product management. Admin dashboard includes customer, order, tier commitment, and sales rep management with impersonation capabilities.

### System Design Choices
- **Microservices-inspired Modularity**: While a monolith, each module is designed with clear boundaries and independent concerns.
- **API-First Approach**: All functionalities are exposed via RESTful APIs.
- **Security**: Robust authentication and authorization with role-based access control, protected endpoints, and secure password management.
- **Scalability**: Utilizing serverless PostgreSQL (Neon) and cloud-based object storage for media.
- **AI Integration**: OpenAI's GPT-4o-mini powers the sommelier-style product recommendation engine in the Tasting Experience app.

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

## Module Directory

### Overview
Central dashboard for tracking all platform modules and their development progress. Accessible at `/modules` by admins.

### Features
- **Progress Tracking**: Five status levels - Not Started, In Progress, In Beta, Launched, Complete
- **Editable Notes**: Admin can add notes, ideas, and thoughts for each module
- **Quick Navigation**: Click module title to access admin dashboard (when module is started)
- **Access Point**: Module Directory button in Admin Hub header

### Database Schema
Added to `platform_modules` table:
- `progress` - Enum: not_started, in_progress, in_beta, launched, complete
- `notes` - Text field for admin notes

### Current Modules
1. **Tasting Experience** - Guest-facing wine tasting app (Launched)
2. **B2B Wholesale** - Wholesale customer and order management (Launched)
3. **LMS** - Employee training and certification system (Launched)
4. **Compliance** - Business compliance calendar for tax filings, licensing renewals, and regulatory requirements (Launched)
5. **SOP** - Standard operating procedures documentation (Not Started)
6. **Experience Library** - Case studies and best practices (Not Started)
7. **Maintenance & Requests** - Equipment maintenance and work orders (Not Started)
8. **Operations** - Adult beverage manufacturing tracking (Not Started)
9. **Daily Procedures** - Opening/closing checklists (Not Started)
10. **Customer Support** - Email ticketing with AI responses and social media management (Not Started)
11. **Apple Game** - Interactive apple picking experience with orchard exploration and mystery hunt adventures (Not Started)

## Compliance Module

### Overview
The Compliance module is a calendar-based task management system for tracking tax filings, licensing renewals, regulatory requirements, and administrative deadlines. Accessible at `/compliance/admin` by admins.

### Features
- **Dashboard Overview**: Stats cards showing total tasks, overdue items, due this week/month, and completed tasks
- **Task Management**: Full CRUD operations for compliance tasks with filtering by category, status, and priority
- **Calendar View**: Visual timeline of overdue, due this week, and due this month tasks
- **Email Reminders**: SendGrid-powered email notifications sent to assigned team members with configurable reminder days
- **Recurrence Patterns**: Support for one-time, daily, weekly, monthly, quarterly, semi-annual, annual, and custom recurrence
- **Audit History**: Complete history tracking of all task changes with timestamps and user attribution
- **Portal Integration**: Store portal URLs, usernames, and encrypted passwords for quick access to filing systems
- **Cost Tracking**: Track estimated vs actual costs and potential penalties for compliance tasks
- **Task Actions**:
  - **Archive**: Stop a recurring task from generating new instances
  - **Complete & Next Cycle**: Mark a task complete and automatically schedule the next occurrence based on recurrence pattern
  - **Duplicate**: Create a copy of an existing task for similar compliance requirements (useful for multiple licenses)

### Database Schema
- `compliance_tasks`: Main table for compliance task records with all task details
- `compliance_task_history`: Audit log of all changes made to tasks
- `compliance_reminders`: Log of sent reminder notifications
- `compliance_attachments`: Document attachments for tasks (filing confirmations, etc.)

### Categories
Tax, Licensing, Regulatory, Insurance, Environmental, Health & Safety, Payroll, Privacy, Security, Administrative, Other

### API Endpoints
- `GET /api/compliance/tasks` - List all tasks with optional filters
- `GET /api/compliance/tasks/:id` - Get task details with history and reminders
- `POST /api/compliance/tasks` - Create new task
- `PATCH /api/compliance/tasks/:id` - Update task
- `DELETE /api/compliance/tasks/:id` - Soft delete task
- `POST /api/compliance/tasks/:id/send-reminder` - Send reminder email
- `POST /api/compliance/tasks/:id/archive` - Archive task (stops recurrence)
- `POST /api/compliance/tasks/:id/complete` - Complete task and move to next cycle
- `POST /api/compliance/tasks/:id/duplicate` - Duplicate task for similar requirements
- `GET /api/compliance/stats` - Get dashboard statistics
- `GET /api/compliance/upcoming` - Get upcoming deadlines

## Role-Based Access Control (RBAC)

### Overview
The platform features a comprehensive Role-Based Access Control system for managing user permissions across all modules. Accessible at `/access-control` by admins, with a link from the Module Directory header.

### Features
- **User Groups**: Create and manage groups with custom names, descriptions, and colors
- **Module Access**: Toggle access to entire modules per group
- **Feature Permissions**: Granular permission levels (none/view/edit/admin) for individual features within modules
- **User Management**: View all platform users and their group memberships
- **Default Groups**: Pre-seeded groups include Global Admin, Director, Manager, Staff, and Viewer

### Permission Levels
- **none**: No access to the feature
- **view**: Read-only access
- **edit**: Can modify data
- **admin**: Full control including management functions

### Database Schema
- `user_groups`: User group definitions with name, description, color, and system flags
- `group_memberships`: Links users to groups (many-to-many)
- `group_module_access`: Module-level access grants per group
- `group_feature_permissions`: Feature-level permission assignments per group
- `module_features`: Catalog of all module features (35 features across 4 modules)

### Permission Computation
- Users inherit permissions from all groups they belong to
- When a user belongs to multiple groups, the highest permission level wins
- Global Admin group has admin access to all modules/features by default
- Session-based permission caching for performance

### Auto-Sync Security
The RBAC system automatically generates security entries when:
- **New Group Created**: Automatically creates module access (default: disabled) and feature permissions (default: none) for all existing modules and features
- **New Module Added**: Automatically creates module access entries for all existing groups (Global Admin gets enabled by default)
- **New Feature Added**: Automatically creates feature permission entries for all existing groups (Global Admin gets admin permission by default)

Admins can manually trigger a sync from the Access Control page if entries are missing.

### API Endpoints
- `GET /api/rbac/groups` - List all groups with member counts
- `GET /api/rbac/groups/:id` - Get group with module access and feature permissions
- `POST /api/rbac/groups` - Create new group (auto-generates security entries)
- `PATCH /api/rbac/groups/:id` - Update group details
- `DELETE /api/rbac/groups/:id` - Delete group (soft delete)
- `PUT /api/rbac/groups/:groupId/modules/:moduleId` - Set module access
- `PUT /api/rbac/groups/:groupId/features/:featureId` - Set feature permission
- `GET /api/rbac/users` - List all users with their groups
- `POST /api/rbac/users/:userId/groups/:groupId` - Add user to group
- `DELETE /api/rbac/users/:userId/groups/:groupId` - Remove user from group
- `GET /api/rbac/my-permissions` - Get current user's computed permissions
- `GET /api/rbac/features` - List all module features
- `GET /api/rbac/sync-status` - Check for missing security entries
- `POST /api/rbac/sync` - Sync all missing security entries
- `POST /api/rbac/modules` - Add module with auto-generated security
- `POST /api/rbac/features` - Add feature with auto-generated security

### Implementation Files
- `server/rbac.ts` - Permission computation service, database operations, and auto-sync functions
- `client/src/pages/AccessControl.tsx` - Admin UI for managing access control with sync status
- `client/src/hooks/useAuth.ts` - Authentication hook with RBAC integration (provides `hasModuleAccess`, `canView`, `canEdit`, `canAdmin`)
- `client/src/hooks/use-rbac.ts` - Standalone RBAC hook with module/feature key constants

### Frontend RBAC Integration
The RBAC system is now integrated into the frontend authentication:

**Usage in Components:**
```typescript
import { useAuth } from '@/hooks/useAuth';
import { MODULE_KEYS, FEATURE_KEYS } from '@/hooks/use-rbac';

function MyComponent() {
  const { hasModuleAccess, canView, canEdit, canAdmin, isAdmin } = useAuth();
  
  // Check module access
  if (hasModuleAccess('compliance')) { /* show module */ }
  
  // Check feature permissions
  if (canView('compliance', 'tasks')) { /* show tasks */ }
  if (canEdit('compliance', 'tasks_manage')) { /* allow editing */ }
  if (canAdmin('compliance', 'settings')) { /* show settings */ }
}
```

**Backward Compatibility:**
- Existing `isAdmin` checks continue to work
- Users with `role === 'admin'` bypass RBAC checks automatically
- RBAC permissions are additive - old admin role takes precedence
- Backend routes use `isAdmin` middleware; frontend uses RBAC for UI visibility

**Module Keys:** tasting, b2b, lms, compliance, sop, maintenance, operations, daily_procedures, customer_support, apple_game, experience_library

**Feature Key Format:** `{module}.{feature}` (e.g., `compliance.tasks_manage`, `tasting.products`)