# Nashoba Valley Operations Platform

## Overview
The Nashoba Valley Operations Platform is a modular monolith designed to centralize and streamline business operations within the adult beverage industry. It integrates a guest-facing Tasting Experience App, a B2B Wholesale Platform, and an LMS, with a foundation for future modules like SOP, Experience, Maintenance, Operations, and Procedures. The platform aims to enhance user experience for staff and customers, centralize administrative functions, and provide a scalable foundation for business growth.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform utilizes React with TypeScript, `shadcn/ui` (Radix UI), and Tailwind CSS for a mobile-first, responsive design with custom theming. A Central Admin Hub provides unified navigation, and the LMS module offers a mobile-first microlearning experience.

### Technical Implementations
- **Frontend**: React with TypeScript, Vite, TanStack Query.
- **Backend**: Express.js with TypeScript, RESTful API.
- **Database**: PostgreSQL with Drizzle ORM (using Neon serverless driver).
- **Authentication**: Replit Auth (OpenID Connect) for guest apps and platform users; separate email/password for B2B. PostgreSQL-backed sessions.
- **Modularity**: Designed as a modular monolith with clear boundaries for independent module development.
- **Data Synchronization**: An environment sync tool for selective data export/import and object storage synchronization.

### Feature Specifications
- **Central Admin Hub**: Unified entry point with KPIs and quick actions.
- **Platform Foundation**: Shared tables for module registry, user management with global and module-specific roles, cross-module audit logging, shared locations, equipment, and document storage.
- **LMS Module**: Mobile-first microlearning with course catalog, lessons, quizzes, progress tracking, and certification.
- **Tasting Experience Module**: Interactive guest experience with product browsing, AI recommendations, shopping cart, and tasting surveys.
- **B2B Wholesale Platform**: Customer and order management with dedicated authentication, category-specific pricing, multi-location support, and a multi-step email-based sales order workflow with secure token links. This workflow includes order creation, delivery date setting, admin approval/rejection, delivery confirmation, and payment recording. Also includes a commission system for sales reps and payroll integration.
- **Compliance Module**: Calendar-based task management for regulatory deadlines with recurrence, reminders, audit history, cost tracking, step-by-step directions, portal credentials with password visibility toggle, and launch/copy functionality for quick portal access.
- **Reservations Module**: Complete dining reservation system with customer-facing booking flow, experience selection, time slot booking, Stripe payments, and comprehensive availability management.
- **Daily Reports Module**: Managers log incidents and track procedure completion using customizable templates, email notifications, and a status-based review workflow.
- **Daily Procedures Module**: Mobile-first checklist completion system with opening/closing procedures, draft saving, late submission tracking, and comprehensive submissions management.
- **Unified Staff Portal**: Single entry point at `/staff` where staff enter their access code once to see both Daily Reports and Daily Procedures they have access to. Validates against both `daily_report_access_codes` and `procedures_staff` tables. Includes staff-accessible Maintenance Work Order submission (`/staff/work-order`) integrated with Daily Reports departments.
- **Spot Inventory Check Module**: Mobile-first inventory counting system with location/area hierarchy, product lookup, barcode scanning, and consolidated reporting with export capabilities.
- **Role-Based Access Control (RBAC)**: Comprehensive system for managing user permissions across modules with user groups, module access toggles, and granular feature permissions.
- **Module Management**: Admin UI for managing platform module metadata.
- **Customer Support Module**: AI-powered customer support chatbot with knowledge base management. Features include: public chat widget for customers, admin dashboard for managing support requests, canned responses and web sources for training the AI, OpenAI GPT-4o-mini integration for intelligent responses, conversation history and status tracking, Social Review Monitoring for Google/Facebook/Yelp/TripAdvisor reviews with AI draft generation, Email Inbound Integration via SendGrid Inbound Parse webhook, and Support Agent Management with email notifications featuring secure quick-access links.
  - **Support Agent Management**: Agents are linked to platform users and assigned to support categories with lead designation. When new tickets arrive, agents receive email notifications with secure, time-limited access tokens (24-hour expiry, cryptographically secure using crypto.randomBytes). Email links allow agents to view tickets, forward to other agents, or mark as spam without requiring admin session login. Tokens are single-use for destructive actions (forward/spam) but allow repeated view access.
  - **Manual Agent Assignment**: Admins can manually assign specific agents to tickets via the Support Admin Dashboard. Assignment triggers immediate email notification with secure access token. UI displays current assignment badge, agent dropdown with loading/empty states, and tracks assignment in `assignedAgentId` field.
  - **Automated Reminder System**: Daily 8 AM Eastern (DST-aware) scheduler sends reminders for tickets with "new" or "pending" status. Uses `getNextEasternTime8AM()` for timezone-correct scheduling. Reminders are sent to all active agents and include quick-action links.
  - **48-Hour Escalation**: Tickets unanswered for 48+ hours trigger escalation emails to ALL active agents with urgent warning banner. Escalation tracking via `escalatedAt` and `escalationCount` fields on support requests.

### System Design Choices
- **Microservices-inspired Modularity**: Independent module concerns within a monolithic structure.
- **API-First Approach**: All functionalities exposed via RESTful APIs.
- **Security**: Robust authentication and authorization with role-based access control.
- **Scalability**: Utilizes serverless PostgreSQL (Neon) and cloud-based object storage.
- **AI Integration**: OpenAI's GPT-4o-mini for sommelier-style product recommendations.

### Database Naming Conventions
- **Module-Prefixed Tables**: Module-specific tables use module name prefixes (e.g., `maintenance_technicians`, `reservation_experiences`).
- **Shared Platform Tables**: Core tables without module prefix are shared (e.g., `users`, `locations`).
- **Foreign Key References**: Module tables reference shared tables for cross-module data relationships.
- **Status Fields**: Use VARCHAR columns for flexible status values.

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

## Email Inbound Integration Setup

The platform supports receiving emails as support requests via SendGrid Inbound Parse. This allows forwarding emails from `support@nashobawinery.com` to be processed automatically as support tickets.

### Setup Steps

1. **Configure SendGrid Inbound Parse**
   - Log into SendGrid dashboard
   - Navigate to Settings > Inbound Parse
   - Add a new host/URL configuration:
     - Hostname: `inbound.nashobawinery.com` (or your subdomain)
     - URL: `https://your-replit-app.replit.app/api/webhooks/inbound-email`
     - Check "POST the raw, full MIME message" (optional)

2. **Configure DNS**
   - Add an MX record for your inbound subdomain pointing to SendGrid:
     - Host: `inbound` (creates `inbound.nashobawinery.com`)
     - Priority: 10
     - Value: `mx.sendgrid.net`

3. **Set up Email Forwarding**
   - Configure your email provider to forward `support@nashobawinery.com` to `support@inbound.nashobawinery.com`

### Webhook Endpoint

- **URL**: `POST /api/webhooks/inbound-email`
- **Features**:
  - Parses multipart/form-data from SendGrid
  - Extracts sender name, email, subject, and body
  - Detects email threads via Message-ID, In-Reply-To, and References headers
  - Creates new support requests or appends to existing threads
  - Deduplicates by Message-ID to prevent duplicate processing
- **Email Indicators**: Email-originated requests display a blue mail icon in the support dashboard