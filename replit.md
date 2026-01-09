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