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
- **Reservations Module**: Complete dining reservation system including customer-facing booking flow with experience selection, time slot booking, Stripe payments, and confirmation. Admin dashboard for managing experiences, locations, reservations, customers, clubs, special dates, and settings.
- **Daily Reports Module**: Department managers log incidents and track procedure completion. Features include customizable department templates, incident logging, department-level email notifications via SendGrid, public access via QR codes for staff submission, procedure templates, dual save options (draft/submit), and a status-based report review workflow.
- **Role-Based Access Control (RBAC)**: Comprehensive system for managing user permissions across modules with user groups, module access toggles, granular feature permissions (none/view/edit/admin), and auto-sync for security entries. The system distinguishes between User Groups (for granular, module-level permissions) and a Global Role (for platform-level access like Admin Hub).
- **Module Management**: Admin UI for managing platform module metadata (name, description, icon, color, status, sort order). Module registry is code-defined in server/rbac.ts (16 modules) with automatic seeding on startup. Global Admin access is automatically synchronized for all modules.

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