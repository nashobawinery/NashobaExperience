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