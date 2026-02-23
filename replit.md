# Nashoba Valley Operations Platform

## Overview
The Nashoba Valley Operations Platform is a modular monolith designed to centralize and streamline business operations in the adult beverage industry. It integrates a guest-facing Tasting Experience App, a B2B Wholesale Platform, and an LMS, with a foundation for future modules. The platform aims to enhance staff and customer experience, centralize administrative functions, and provide a scalable foundation for business growth.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform utilizes React with TypeScript, `shadcn/ui` (Radix UI), and Tailwind CSS for a mobile-first, responsive design with custom theming. It features a Central Admin Hub for unified navigation and a mobile-first microlearning experience for the LMS module.

### Technical Implementations
- **Frontend**: React with TypeScript, Vite, TanStack Query.
- **Backend**: Express.js with TypeScript, RESTful API.
- **Database**: PostgreSQL with Drizzle ORM (using Neon serverless driver), adhering to a schema-first workflow for migrations (`shared/schema.ts` and `npm run db:push`). Development and production databases are separate.
- **Authentication**: Replit Auth (OpenID Connect) for guest apps and platform users; separate email/password for B2B, backed by PostgreSQL sessions.
- **Modularity**: Designed as a modular monolith with clear boundaries for independent module development.
- **Data Synchronization**: An environment sync tool for selective data export/import and object storage synchronization.

### Feature Specifications
- **Central Admin Hub**: Unified entry point with KPIs, quick actions, and AI-powered feature search. The feature search (in header) uses OpenAI to intelligently match user queries against a 67+ feature catalog covering all platform pages, with debounced input, keyboard navigation, and fallback text matching. Backend: `POST /api/platform/feature-search`, Frontend: `client/src/components/FeatureSearch.tsx`.
- **Platform Foundation**: Shared tables for module registry, user management with global and module-specific roles, cross-module audit logging, shared locations, equipment, and document storage.
- **LMS Module**: Mobile-first microlearning with course catalog, lessons, quizzes, progress tracking, and certification.
- **Tasting Experience Module**: Interactive guest experience with product browsing, AI recommendations, shopping cart, and tasting surveys.
- **B2B Wholesale Platform**: Customer and order management, category-specific pricing, multi-location support, multi-step email-based sales order workflow, and a tiered commission system. **Wholesale Override Price**: Products have a `wholesaleOverridePrice` field (DB column: `wholesale_pricing`) that serves as the base price for all B2B tier discount calculations instead of the retail price. This allows setting a higher base so B2B discounts don't undercut distributor pricing. Initially populated from retail price; editable per product in Admin Dashboard. **Distributor Customer Type**: Special customer type with unit price overrides per line item (bypasses tier pricing), no portal login access, restricted visibility (admin + assigned sales rep only), and purchase order upload/download capability via object storage.
- **Compliance Module**: Calendar-based task management for regulatory deadlines with recurrence, reminders, audit history, and portal credential management. Includes **ABCC Gallons Report** for Massachusetts regulatory reporting - tracks monthly gallons sold of wine, spirits, beer, and cider using Toast POS item sales data with auto-classification from menu groups and manual classification editing. Located in Command Center under Compliance section.
- **Reservations Module**: Complete dining reservation system with customer-facing booking, experience selection, time slot booking, Stripe payments, and availability management.
- **Daily Reports Module**: Managers log incidents and track procedure completion using customizable templates and a status-based review workflow.
- **Daily Procedures Module**: Mobile-first checklist completion system with opening/closing procedures, draft saving, and submissions management.
- **Unified Staff Portal**: Single entry point (`/staff`) for staff to access Daily Reports, Daily Procedures, and Maintenance Work Order submission via an access code.
- **Maintenance Module**: CMMS with work orders, preventive maintenance, asset management, technician management, and automated email notifications.
- **Spot Inventory Check Module**: Mobile-first inventory counting with location hierarchy, product lookup, barcode scanning, and reporting.
- **Contracts & Tracking Module**: Contract lifecycle management with document upload, AI-powered extraction (GPT-4o-mini), expiration notifications, renewal workflow, and multi-user responsibility assignment.
- **Role-Based Access Control (RBAC)**: Comprehensive system for managing user permissions with user groups, module access toggles, and granular feature permissions.
- **Module Management**: Admin UI for managing platform module metadata.
- **Customer Support Module**: AI-powered customer support system with intelligent ticket routing, automated responses, agent management (email-based responses), public chat widget, Cody AI Assistant, knowledge base, social review monitoring, SendGrid Inbound Parse integration, and automated reminders/escalations.
- **Data & Marketing Command Center** (`/command-center`): Unified hub combining revenue tracking, customer insights, marketing campaigns, and AI-powered recommendations. Includes:
    - **Revenue Features**: Weekly Focus, Tasks, Campaign Tracker, Daily Revenue Entry with prior year comparison and AI Advisor recommendations. Integrates Toast POS and Shopify data.
    - **Revenue Detail Drilldown**: Provides detailed breakdown of Toast POS and Shopify revenue by centers, categories, and top-selling items.
    - **Customer Features**: Customer segmentation (Active/At Risk/Lapsed/Dormant/Lost), RFM Analysis, Loyalty Program, Referral Program, Automation triggers, Toast API and Shopify customer sync.
    - **AI Targeting Engine**: Smart customer reactivation system using RFM data to generate weekly target lists with offer recommendations, projected conversions, and campaign tracking.
    - **SMS Campaigns**: Twilio-powered SMS marketing with personalized messages, segment targeting, batch sending, and delivery tracking.
    - **Growth Studio**: AI-powered marketing toolkit including AI Content Studio, Content Calendar, Campaign Builder, Marketing Scorecard, and Quick Promotions.
- **CellarTraks Module** (`/cellartraks`): Comprehensive production management platform for Winery, Distillery, and Brewery operations. Manages production activities, inventory transfers between divisions, and generates Federal (TTB) and Massachusetts State (ABCC) compliance reports. Currently in early development with a Temporary section containing the Wine Sales Report (formerly ABCC Gallons Report from Command Center). **Product Classifications**: Dedicated Classifications section with "Federal & State" (TTB wine/spirits/beer classifications and MA AB-1 state tax classifications per product, stored in `cellartraks_product_classifications` table) and "Toast Item Mapping" (legacy Toast menu item classification). Federal enums cover TTB Forms 5120.17 (wine), 5110.40 (spirits), 5130.9 (beer); state enums cover MA Form AB-1 excise tax classes. Routes in `server/cellartraks-routes.ts`, UI in `client/src/pages/cellartraks/CellarTraksClassifications.tsx`. **Knowledge Base**: A comprehensive domain reference is maintained at `.agents/skills/cellartraks-knowledge-base/SKILL.md` covering production workflows, measurements (TA, pH, RS, Brix, SO2), regulatory forms, tax classifications, and glossary. Uploaded regulatory form details are tracked in `.agents/skills/cellartraks-knowledge-base/reference/uploaded-forms.md`.
- **Toast Connect Module** (`/toast-connect`): Manages Toast POS menu integration, including menu display, embeddable widget/iframe generator, and print-ready menu templates. **Multi-Menu Print**: Print section supports selecting multiple menus and combining them into a single printable document with reorderable menu sequence, custom title, and all existing print options (template, scale, pages, footer, page breaks, hide descriptions). Backend endpoint: `GET /api/toast/public/menus/embed?menus=guid1,guid2&template=...`.
- **Enhancement Requests** (`/enhancement-requests`): User-submitted feature requests with voting, status tracking (New/Reviewing/In Progress/Completed/Declined), admin editing, completion workflow with branded email notification via SendGrid. Routes in `server/enhancement-routes.ts`, page in `client/src/pages/EnhancementRequests.tsx`.
- **Media Center Module** (`/media-center`): Multi-channel digital signage management system with two main sections: **NashobaTV** (digital signage) and **Toast Menu Printer** (menu printing). NashobaTV supports multiple independent channels (e.g., Tasting Room, Pavilion, Knoll, Apple Picking). Each channel has its own display settings, slides, events, announcements, photos, and specials. Channel types: TV Display, Info Board, Website Embed. Channels can be marked as embeddable for iframe integration on website. Public display at `/display/:slug` (e.g., `/display/tasting-room`) with embed support via `?embed=1`. Legacy `/display` URL redirects to default channel. Admin page with channel management (create, edit, delete channels), channel selector, and per-channel content tabs (Settings, Slides, Events, Announcements, Photos, Specials). **Toast Menu Printer**: Reusable component (`client/src/components/ToastMenuPrinter.tsx`) providing Toast POS menu printing with single/multi-menu selection, 3 templates (fine-dining, modern, beverage), font scaling, page count targeting, custom footer, page breaks between courses, hide descriptions option, and live print preview. Available in both Media Center and Toast Connect module. Database tables: `nashobatv_channels` (id, name, slug unique, description, channel_type, location, is_active, is_embeddable), plus existing tables with added `channel_id` FK: `nashobatv_slides`, `nashobatv_events`, `nashobatv_announcements`, `nashobatv_photos`, `nashobatv_display_settings`, `nashobatv_daily_specials`. Auto-seeds default display settings per channel. Routes in `server/nashobatv-routes.ts`, display page in `client/src/pages/NashobatvDisplay.tsx`, admin page in `client/src/pages/MediaCenter.tsx`, content admin in `client/src/components/NashobatvAdmin.tsx`.

### System Design Choices
- **Microservices-inspired Modularity**: Independent module concerns within a monolithic structure.
- **API-First Approach**: All functionalities exposed via RESTful APIs.
- **Security**: Robust authentication and authorization with role-based access control.
- **Scalability**: Utilizes serverless PostgreSQL (Neon) and cloud-based object storage.
- **AI Integration**: OpenAI's GPT-4o-mini for recommendations and customer support.
- **Database Naming Conventions**: Module-prefixed tables and shared platform tables.

## External Dependencies
- **Core Technologies**: React, Express, Vite, TypeScript, Drizzle ORM, Neon serverless driver, TanStack Query.
- **UI/Styling**: Radix UI, Tailwind CSS, shadcn/ui, Lucide React, Embla Carousel, Framer Motion.
- **Form Management**: React Hook Form, Zod.
- **Utilities**: Date-fns, Wouter, Nano ID, WebSockets, QR Code generation, XLSX.
- **Artificial Intelligence**: OpenAI (GPT-4o-mini).
- **Email Service**: SendGrid.
- **SMS Service**: Twilio.
- **Authentication**: OpenID Connect, Express Session, Connect PG Simple.
- **Database**: PostgreSQL (via Neon).
- **File Storage**: Google Cloud Storage, Uppy (with AWS S3 plugin).