# Nashoba Valley Operations Platform

## Overview
The Nashoba Valley Operations Platform is a modular monolith designed to centralize and streamline business operations within the adult beverage industry. It integrates a guest-facing Tasting Experience App, a B2B Wholesale Platform, and an LMS, with a foundation for future modules like SOP, Experience, Maintenance, Operations, and Procedures. The platform aims to enhance user experience for staff and customers, centralize administrative functions, and provide a scalable foundation for business growth and market potential.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform uses React with TypeScript, `shadcn/ui` (Radix UI), and Tailwind CSS for a mobile-first, responsive design with custom theming. A Central Admin Hub provides unified navigation, and the LMS module offers a mobile-first microlearning experience.

### Technical Implementations
- **Frontend**: React with TypeScript, Vite, TanStack Query.
- **Backend**: Express.js with TypeScript, RESTful API.
- **Database**: PostgreSQL with Drizzle ORM (using Neon serverless driver).
  - **Critical Note**: Development and production use SEPARATE Neon databases. Schema changes must follow a schema-first workflow using `shared/schema.ts` and Drizzle migrations to prevent data loss.
  
  **🚨 SCHEMA-FIRST WORKFLOW:**
  1. NEVER use raw SQL (ALTER TABLE, CREATE TABLE) for schema changes
  2. ALWAYS update `shared/schema.ts` FIRST when adding columns/tables
  3. Let Drizzle handle migrations via `npm run db:push`
  4. Only use SQL for data operations (INSERT, UPDATE, SELECT, DELETE)
  
  **🔍 PRE-PUBLISH VALIDATION:**
  Before publishing, run: `npx tsx scripts/validate-schema.ts`
  This shows mismatches between database and schema that would cause deletions.
  
  **⚡ AFTER EVERY SCHEMA CHANGE:**
  1. Edit `shared/schema.ts` with new columns/tables
  2. Run `npm run db:push` to sync development database
  3. Verify changes applied with SQL query
  4. Then publish to sync production
  
- **Authentication**: Replit Auth (OpenID Connect) for guest apps and platform users; separate email/password for B2B. PostgreSQL-backed sessions.
- **Modularity**: Designed as a modular monolith with clear boundaries for independent module development.
- **Data Synchronization**: An environment sync tool for selective data export/import and object storage synchronization.

### Feature Specifications
- **Central Admin Hub**: Unified entry point with KPIs and quick actions.
- **Platform Foundation**: Shared tables for module registry, user management with global and module-specific roles, cross-module audit logging, shared locations, equipment, and document storage.
- **LMS Module**: Mobile-first microlearning with course catalog, lessons, quizzes, progress tracking, and certification.
- **Tasting Experience Module**: Interactive guest experience with product browsing, AI recommendations, shopping cart, and tasting surveys.
- **B2B Wholesale Platform**: Customer and order management, category-specific pricing, multi-location support, multi-step email-based sales order workflow, and tiered commission system with marginal brackets (like tax brackets) based on YTD collected revenue. Admin-manageable commission tiers stored in `b2b_commission_tiers` table. Commission calculator preview for admin. Falls back to flat rate from sales rep if no tiers configured.
- **Compliance Module**: Calendar-based task management for regulatory deadlines with recurrence, reminders, audit history, and portal credential management.
- **Reservations Module**: Complete dining reservation system with customer-facing booking, experience selection, time slot booking, Stripe payments, and availability management.
- **Daily Reports Module**: Managers log incidents and track procedure completion using customizable templates and a status-based review workflow.
- **Daily Procedures Module**: Mobile-first checklist completion system with opening/closing procedures, draft saving, and submissions management.
- **Unified Staff Portal**: Single entry point (`/staff`) for staff to access Daily Reports and Daily Procedures using an access code, including Maintenance Work Order submission.
- **Maintenance Module**: CMMS with work orders, preventive maintenance, asset management, technician management (including supervisor flag for notifications), and automated email notifications for work orders (new, assigned, and daily reminders for overdue).
- **Spot Inventory Check Module**: Mobile-first inventory counting with location hierarchy, product lookup, barcode scanning, and reporting.
- **Contracts & Tracking Module**: Contract lifecycle management with document upload, AI-powered extraction (GPT-4o-mini parses uploaded PDFs to extract vendor, dates, amounts, terms), expiration notifications at 60/45/30/15 days via email to responsible parties, renewal workflow (creates new contract while preserving previous documents for history), multi-user responsibility assignment. Tables: `contract_contracts`, `contract_documents`, `contract_responsibles`. Routes in `server/contract-routes.ts`. Reminders in `server/contractReminders.ts`. UI at `client/src/pages/contracts/ContractsDashboard.tsx`. API: `/api/contracts/*`.
- **Role-Based Access Control (RBAC)**: Comprehensive system for managing user permissions with user groups, module access toggles, and granular feature permissions.
- **Module Management**: Admin UI for managing platform module metadata.
- **Customer Support Module**: AI-powered customer support system with intelligent ticket routing, automated responses, and comprehensive agent management. Agents can respond to tickets via email using secure, token-based access, without needing to log in. Features include a public chat widget, admin dashboard, Cody AI Assistant (for categorization, assignment, and draft responses), knowledge base, social review monitoring, SendGrid Inbound Parse integration, and automated reminder/escalation system.
- **Data & Marketing Command Center** (unified module at `/command-center`, merging former RCC and Boomerang): Unified hub combining revenue tracking, customer insights, marketing campaigns, and AI-powered recommendations. Left sidebar navigation with expandable sections: Dashboard (combined KPIs), Revenue (Weekly Focus, Daily Revenue, Tasks, Revenue Campaigns), Customers (Segments Overview, Customer Browser, High Value Targets, RFM Analysis), Marketing (Campaigns, Automations, Loyalty Program, Referral Program), Insights (Analytics, AI Advisor), Settings (Integrations, Documentation). Old routes `/rcc` and `/boomerang` redirect to `/command-center`. Components are exported from `client/src/pages/rcc/RccDashboard.tsx` and `client/src/pages/reactivation/BoomerangDashboard.tsx`, composed in `client/src/pages/command-center/CommandCenter.tsx`.
  - **Revenue features**: Weekly Focus (theme/hook/goal), Tasks with owners and due dates, Campaign Tracker (email/website/social/on-site), Daily Revenue Entry (Toast + Shopify + Wholesale + Other per day with notes and weather), prior year day-of-week comparison, Learnings (wins/losses/ideas), AI Advisor for weekly recommendations. Historical Toast POS data in `rcc_toast_historical_revenue` table. Daily revenue in `rcc_daily_revenue` table with weather from Open-Meteo API. Pre-generated weeks system. Export/Import feature. Toast API Auto-Sync and Shopify Auto-Sync. Tables use `rcc_` prefix.
  - **Customer features**: 107,827+ customers imported and segmented (Active/At Risk/Lapsed/Dormant/Lost). Customer source tracking (Toast/Shopify) with automatic email-based merging via `customer_identities` and `customer_identity_links` tables. RFM Analysis, Loyalty Program, Referral Program, Automation triggers. Toast API Integration with webhook at `/api/toast/webhook`. Shopify customer sync with duplicate detection.
  - **AI Targeting Engine**: Smart customer reactivation system that scores customers using RFM data (recency, frequency, monetary value) and generates weekly target lists of top N customers ranked by expected ROI. Features: configurable target count (100-2000), segment filtering, multi-offer type recommendations (percentage discounts, free tastings, BOGO, loyalty bonuses, seasonal specials, free appetizers), projected conversion rates and revenue, campaign tracking with actual vs projected comparison, AI-powered strategy insights via OpenAI, and offer performance analytics. Tables: `targeting_campaigns`, `targeting_list_members`, `offer_performance`. Routes in `server/reactivation/targeting-routes.ts`. UI components in `client/src/pages/command-center/TargetingDashboard.tsx`. Accessible under Targeting section in Command Center sidebar.
  - **SMS Campaigns**: Twilio-powered SMS marketing system integrated into Command Center under Marketing section. Create campaigns with personalized messages ({first_name} placeholder), target by customer segment (active/at_risk/lapsed/dormant/lost), respects opt-out preferences (phone1_marketing_preference). Features: test send before blast, configurable batch sizes (10-500), cumulative multi-batch sending with "partial" status, delivery tracking. Sorted by highest lifetime spend first. Tables: `sms_campaigns`, `sms_messages`. Routes in `server/sms-campaign-routes.ts`. UI in `client/src/pages/command-center/SmsCampaigns.tsx`. Core SMS service in `server/sms.ts` (also used for reservation confirmations/reminders).
  - **APIs**: `/api/rcc/*`, `/api/reactivation/*`, `/api/boomerang/*`, `/api/toast/*`, `/api/shopify/*`, `/api/targeting/*`, `/api/sms/*`.
- **Toast Connect Module**: Standalone module at `/toast-connect` for managing Toast POS menu integration. Features: menu list/detail view with sync from Toast API, embeddable widget/iframe generator for external websites (public endpoint at `/api/toast/public/menu/:menuGuid/embed`), print-ready menu templates (Fine Dining dark/elegant, Modern clean/minimal). Sidebar navigation with Menus, Embed/Widget, Print Menus, and Reservations (coming soon) sections. Also accessible from Command Center Settings > Toast Menus tab. Tables: `toast_menus`, `toast_menu_groups`, `toast_menu_items`. Routes in `server/reactivation/toast-routes.ts`. UI in `client/src/pages/toast-connect/ToastConnect.tsx`. Public embed routes require no authentication for website embedding.

### System Design Choices
- **Microservices-inspired Modularity**: Independent module concerns within a monolithic structure.
- **API-First Approach**: All functionalities exposed via RESTful APIs.
- **Security**: Robust authentication and authorization with role-based access control.
- **Scalability**: Utilizes serverless PostgreSQL (Neon) and cloud-based object storage.
- **AI Integration**: OpenAI's GPT-4o-mini for recommendations and customer support.
- **Database Naming Conventions**: Module-prefixed tables (e.g., `maintenance_technicians`) and shared platform tables (e.g., `users`).

## External Dependencies
- **Core Technologies**: `react`, `react-dom`, `express`, `vite`, `typescript`, `drizzle-orm`, `@neondatabase/serverless`, `@tanstack/react-query`.
- **UI/Styling**: `@radix-ui/*`, `tailwindcss`, `shadcn/ui`, `lucide-react`, `embla-carousel-react`, `framer-motion`.
- **Form Management**: `react-hook-form`, `@hookform/resolvers`, `zod`, `drizzle-zod`.
- **Utilities**: `date-fns`, `wouter`, `nanoid`, `ws`, `qrcode`, `xlsx`.
- **Artificial Intelligence**: `openai` (for GPT-4o-mini).
- **Email Service**: `@sendgrid/mail`.
- **SMS Service**: `twilio` (for SMS campaigns and reservation notifications).
- **Authentication**: `openid-client`, `express-session`, `connect-pg-simple`.
- **Database**: PostgreSQL (via Neon serverless).
- **File Storage**: `@google-cloud/storage`, `@uppy/core`, `@uppy/dashboard`, `@uppy/react`, `@uppy/aws-s3`.