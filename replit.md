# Nashoba Valley Operations Platform

## Overview
The Nashoba Valley Operations Platform is a modular monolith designed to centralize and streamline business operations in the adult beverage industry. It integrates a guest-facing Tasting Experience App, a B2B Wholesale Platform, and an LMS, with a foundation for future modules. The platform aims to enhance staff and customer experience, centralize administrative functions, and provide a scalable foundation for business growth.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform uses React with TypeScript, `shadcn/ui` (Radix UI), and Tailwind CSS for a mobile-first, responsive design with custom theming. It features a Central Admin Hub for unified navigation and a mobile-first microlearning experience for the LMS module.

### Technical Implementations
- **Frontend**: React with TypeScript, Vite, TanStack Query.
- **Backend**: Express.js with TypeScript, RESTful API.
- **Database**: PostgreSQL with Drizzle ORM (using Neon serverless driver), adhering to a schema-first workflow.
- **Authentication**: Replit Auth (OpenID Connect) for guest apps and platform users; separate email/password for B2B, backed by PostgreSQL sessions.
- **Modularity**: Designed as a modular monolith with clear boundaries.
- **Data Synchronization**: An environment sync tool for selective data export/import and object storage synchronization.

### Feature Specifications
- **Central Admin Hub**: Unified entry point with KPIs, quick actions, and AI-powered feature search.
- **Platform Foundation**: Shared tables for module registry, user management with global and module-specific roles, cross-module audit logging, shared locations, equipment, and document storage.
- **LMS Module**: Mobile-first microlearning with course catalog, lessons, quizzes, progress tracking, and certification.
- **Tasting Experience Module**: Interactive guest experience with product browsing, AI recommendations, shopping cart, and tasting surveys.
- **B2B Wholesale Platform**: Customer and order management, category-specific pricing, multi-location support, multi-step email-based sales order workflow, and a tiered commission system. Includes `wholesaleOverridePrice` for B2B pricing and `Distributor Customer Type` with unit price overrides and restricted access.
- **Compliance Module**: Calendar-based task management for regulatory deadlines with recurrence, reminders, audit history, and portal credential management. Includes ABCC Gallons Report for Massachusetts regulatory reporting based on Toast POS data.
- **Reservations Module**: Complete dining reservation system with customer-facing booking, experience selection, time slot booking, Stripe payments, and availability management. Includes Private Event Registration.
- **Daily Reports Module**: Managers log incidents and track procedure completion using customizable templates.
- **Daily Procedures Module**: Mobile-first checklist completion system with opening/closing procedures, draft saving, and submissions management.
- **Unified Staff Portal**: Single entry point (`/staff`) for staff to access Daily Reports, Daily Procedures, and Maintenance Work Order submission via an access code.
- **Maintenance Module**: CMMS with work orders, preventive maintenance, asset management, technician management, and automated email notifications.
- **Spot Inventory Check Module**: Mobile-first inventory counting with location hierarchy, product lookup, barcode scanning, and reporting.
- **Contracts & Tracking Module**: Contract lifecycle management with document upload, AI-powered extraction, expiration notifications, renewal workflow, and multi-user responsibility assignment.
- **Role-Based Access Control (RBAC)**: Comprehensive system for managing user permissions with user groups, module access toggles, and granular feature permissions.
- **Module Management**: Admin UI for managing platform module metadata.
- **Customer Support Module**: AI-powered customer support system with intelligent ticket routing, automated responses, agent management, public chat widget, Cody AI Assistant, knowledge base, social review monitoring, SendGrid Inbound Parse integration, and automated reminders/escalations.
- **Data & Marketing Command Center** (`/command-center`): Unified hub combining revenue tracking, customer insights, marketing campaigns, and AI-powered recommendations. Includes Revenue Features (integrating Toast POS and Shopify data), Customer Features (segmentation, RFM, Loyalty, Referral, Automation), an AI Targeting Engine, SMS Campaigns, and Growth Studio (AI-powered marketing toolkit).
- **CellarTraks Module** (`/cellartraks`): Production management platform for Winery, Distillery, and Brewery operations. Manages production activities, inventory transfers, and generates Federal (TTB) and Massachusetts State (ABCC) compliance reports. Includes dedicated Product Classifications for TTB and MA AB-1.
- **Toast Connect Module** (`/toast-connect`): Manages Toast POS menu integration, including menu display, embeddable widget/iframe generator, and print-ready menu templates. Supports Multi-Menu Print. Includes a **Saved Menus** library (`toastMenuEmbedConfigs` table) where configured menus (template, groups, header/footer, font sizes, etc.) can be saved, edited, printed, shared via permanent URL, and toggled visible on the Staff Print Board. The Staff Print Board aggregates all saved menus with `showOnStaffBoard = true`.
- **Enhancement Requests** (`/enhancement-requests`): User-submitted feature requests with voting, status tracking, admin editing, and completion workflow.
- **Media Center Module** (`/media-center`): Multi-channel digital signage management system with sections for NashobaTV (digital signage with various slide types, including Trivia and Historical Facts), Toast Menu Printer, Live Music (musician management, schedule, public submission form), **Food Trucks** (vendor management, schedule, public application form with Nashoba Board of Health permit requirement — stored in `media_food_trucks`, `media_food_truck_events`, `media_food_truck_submissions` tables; public page at `/food-trucks`), Special Events (event management with Shopify ticket links), Flyer Printer, Shelf Talkers (printable product tags), and **Flight Cards** (printable tasting flight cards pulled from the internal product catalog — multi-category filtering, ordered product selection 1–8+, 3 templates: Classic Winery/Modern Clean/Rustic Craft, 6 paper sizes: A6/3×5/4×6/A5/5×7/Half Sheet (+2.5×3.5 compact), field toggles, header/footer, save/load named configs, Staff Print Board toggle; server renders via `/api/media/flight-cards/print`, configs stored in `flight_card_configs` table).

### System Design Choices
- **Microservices-inspired Modularity**: Independent module concerns within a monolithic structure.
- **API-First Approach**: All functionalities exposed via RESTful APIs.
- **Security**: Robust authentication and authorization with role-based access control.
- **Scalability**: Utilizes serverless PostgreSQL and cloud-based object storage.
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