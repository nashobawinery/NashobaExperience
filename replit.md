# Nashoba Tasting Experience App

## Overview
The Nashoba Tasting Experience App is a mobile-first digital companion designed to enrich the wine tasting experience for winery guests. It offers product education, personalized AI-powered recommendations, engaging trivia, and a streamlined purchasing process, while also collecting valuable guest feedback. The app aims to be a sophisticated, elegant, and practical tool that complements the physical wine tasting journey. Key capabilities include a dynamic product catalog, interactive welcome experience, progressive educational popups, and comprehensive administrative tools. The project's ambition is to enhance guest engagement and provide valuable data for the winery.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (November 14, 2025)
**B2B Admin Dashboard Enhancement - COMPLETE:**
- **Comprehensive Admin Tools**: Enhanced B2B admin dashboard with 4 main tabs - Customers, Orders, Sales Reps, and Account Settings
- **Password Management**: Added password change functionality for B2B admins at `/api/b2b/admin/change-password` endpoint with secure validation
- **Order Viewing**: Complete order history with customer details, order numbers, totals, and order dates visible to admins
- **Sales Rep Management**: Full CRUD for sales representatives - create, edit, assign territories, set passwords, activate/deactivate accounts
- **Enhanced UI**: Tabbed interface with clear navigation, comprehensive data display, and streamlined workflows
- **Account Setup**: One-time admin account setup page at `/b2b/setup` for production deployment (creates default admin@nashobawinery.com)
- **Status**: ✅ All admin features tested and functional

**B2B Database Synchronization System - COMPLETE:**
- **Cross-Environment Export/Import**: Excel-based database synchronization using portable business keys instead of environment-specific UUIDs
- **Business Keys Implementation**: 
  - TierPricing: `tier_name` (e.g., "Tier 1")
  - SalesReps: `email` (e.g., "rep@nashobawinery.com")
  - B2bCustomers: `email_address` with FK references via `pricing_tier_name`, `sales_rep_email`
  - B2bOrders: `order_number` (e.g., "ORD-001") with `customer_email` FK
  - B2bOrderItems: Composite of `order_number` + `product_sku`
  - Products: `case_size` field added to support B2B case-based pricing
- **Storage Layer Enhancements**: 4 new upsert methods (upsertTierPricing, upsertSalesRep, upsertB2bCustomer, upsertB2bOrder) with:
  - Decimal handling: Parse strings to numbers for calculations, convert back for storage
  - Password preservation: Existing hashes preserved during customer updates
  - FK resolution: Cross-sheet lookup using case-insensitive business key matching
  - Transactional order updates: Delete+recreate items, recalculate totals from quantities/prices
- **Export Endpoint**: `GET /api/admin/data/export-all` updated to include 5 B2B sheets with business keys instead of UUIDs
- **Import Endpoint**: `POST /api/admin/data/import-all` enhanced with FK resolution logic using buildLowerTrimEquals for normalized lookups
- **Security**: Password fields excluded from exports; admins must reset passwords after cross-environment imports
- **Validation**: Schema alignment - insertB2bOrderItemSchema properly omits orderId (assigned by storage layer)
- **Status**: ✅ Tested and verified - Export confirmed working with TierPricing and B2bCustomers sheets using correct business keys

**B2B Wholesale Platform - PRODUCTION READY (COMPLETE):**
- **Full-Stack Implementation**: Complete B2B wholesale platform with backend APIs and frontend UI at `/b2b/*` routes
- **Access Control**: Pricing presentation page with access code gate ('WHOLESALE2025')
- **Frontend Pages**: Registration, login (admin/customer/sales rep), product catalog with tier pricing, shopping cart, checkout, order history, reorder functionality, admin dashboard
- **Backend APIs**: Complete RESTful API at `/api/b2b/*` with tier-based pricing calculations, customer approval workflow, order management
- **Session Isolation**: Dedicated `b2b.sid` session cookie completely separate from tasting app (`connect.sid`)
- **Database**: 7 B2B tables seeded with tier_pricing data (tier1-tier6: 10%-60% discounts)
- **Critical Fixes Applied**:
  - Access code corrected to 'WHOLESALE2025'
  - Registration schema aligned with backend (accountName, primaryContactName, billingAddress)
  - API request signature fixed throughout (apiRequest(method, url, data))
  - Tier seeding implemented in seed.ts (idempotent, runs before other data)
  - Loading states fixed in cart/checkout to prevent premature redirects
- **Security**: Bcrypt password hashing, role-based middleware, protected routes
- **Default Admin**: admin@nashobawinery.com / admin123 (CHANGE IMMEDIATELY)
- **Status**: ✅ Production-ready - All features tested and functional

**Trivia Management Enhancements:**
- **Bulk Deletion**: Added checkbox selection on each trivia question with "Select All" toggle and "Delete Selected (N)" button for efficient duplicate removal
- **Character Counter**: Live character counter on explanation field showing X/200 characters with visual warnings (orange at 181+, red at 200, blocks typing at 200)
- **Validation**: Enhanced explanation field validation using `z.preprocess` to trim whitespace before checking min(1) max(200) length constraints
- **Backend**: New POST `/api/trivia/questions/bulk-delete` endpoint with Zod validation requiring array of UUID strings with minimum 1 ID
- **UX**: Selection state clears automatically after successful bulk delete operation

## System Architecture

### Frontend
- **Framework**: React with TypeScript (Vite).
- **UI**: shadcn/ui (Radix UI) and Tailwind CSS with custom theming, featuring a mobile-first responsive design, bottom navigation, card-based layouts, and an interactive slideshow welcome experience.
- **State Management**: TanStack Query for server state, `useState` for UI state.

### Backend
- **Server**: Express.js with TypeScript, implementing a RESTful API.
- **Data Layer**: Drizzle ORM for type-safe PostgreSQL queries (Neon serverless driver).
- **Database Schema**: Includes tables for `users`, `sessions`, `products`, `guest_sessions`, `favorites`, `view_history`, `cart_items`, `product_notes`, `trivia_questions`, `trivia_scores`, `app_settings`, `surveys`, `filter_options`, `slideshow_images`, `videos`, and `media_library`.
- **Business Logic**: Tier-based discount calculation, trivia credit rewards, and a multi-algorithm product recommendation engine.
- **Dynamic Filtering**: Database-driven system supporting 5 customizable filter types with CRUD operations.

### AI Integration
- **OpenAI**: Utilizes GPT-4o-mini for a recommendation engine that analyzes guest preferences (favorites, view history, cart, stated preferences) to provide sommelier-style product matching with natural language explanations.
- **Preference Questionnaire**: Prompts guests with fewer than two interactions to complete a questionnaire on beverage type, wine color, and flavor preferences.
- **Recommendation Strategies**: Includes characteristic-based, favorites-based, stated-preference-based, AI-powered advanced analysis, and intelligent fallback scoring with strict beverage type and wine color filtering.

### Email System
- **Email Service**: SendGrid API for transactional emails (cart orders, favorites summaries).
- **Templates**: Server-side HTML email templates with branding.

### Key Features
- **Guest Experience**: Interactive slideshow, product browsing with filtering, product detail modals, educational videos and popups, auto-popup trivia with rewards, shopping cart with tier-based discounts, AI recommendations, pre-survey dialog for checkout actions, comprehensive tasting survey, and email functionalities.
- **Admin Dashboard**: Comprehensive CRUD for products, inventory, dynamic filter and slideshow image management, video management, trivia, QR code generator, media library, settings, and bulk product import/export.

### Media Library (Cloud Storage)
- **Storage**: Replit App Storage (Google Cloud Storage backend).
- **Functionality**: Upload, organize, add metadata, copy public URLs, edit, and delete files. Files are served through Express proxy endpoints.

### Authentication & Security
- **Authentication**: Replit Auth (OpenID Connect) for secure user authentication.
- **User Roles**: Viewer, Admin, with `email@nashobawinery.com` automatically assigned Admin role on first login.
- **Session Management**: PostgreSQL-backed sessions using `express-session` with TLS-only cookies in production.
- **Protected Endpoints**: All admin operations require authentication and admin role verification via `isAdmin` middleware.
- **User Management UI**: Admins can manage user roles through the Settings tab in the Admin Dashboard.

### B2B Wholesale Platform
**COMPLETELY SEPARATE PLATFORM** from the tasting app with its own authentication, sessions, and routes:
- **Authentication**: Email/password authentication with bcrypt password hashing, completely isolated from tasting app (uses `b2b.sid` session cookie vs `connect.sid`)
- **User Types**: Three separate roles - B2B Admins, Sales Representatives, and B2B Customers - each with dedicated login endpoints and permissions
- **Database Tables**: 7 dedicated B2B tables (b2bAdmins, b2bSessions, salesReps, tier_pricing, b2bCustomers, b2bOrders, b2bOrderItems, b2bSettings) plus case_size field on products
- **Tier-Based Pricing**: 6 pricing tiers (10%-60% wholesale discounts) with tier-specific pricing stored in dedicated tier_pricing table, seeded automatically in seed.ts
- **Customer Workflow**: Registration → Admin approval (generates temporary password from phone) → Email notification → Customer login → Order placement
- **Case Pricing**: All orders calculated by case (default 12 bottles) with tier-based discounts applied automatically
- **Order Management**: Complete order history, reorder functionality, email notifications via SendGrid
- **Admin Dashboard**: Comprehensive 4-tab dashboard with:
  - **Customers Tab**: Pending/active customer lists, approve/reject workflows, tier assignment
  - **Orders Tab**: Complete order history with customer details, order numbers, totals, dates
  - **Sales Reps Tab**: Create/edit sales representatives, assign territories, manage passwords and activation
  - **Settings Tab**: Change admin password with validation (minimum 6 characters, current password verification)
- **Session Isolation**: B2B routes mounted BEFORE main session middleware in server/routes.ts to ensure complete authentication separation
- **API Routes**: All B2B endpoints at `/api/b2b/*` with role-based middleware protection (requireB2bAuth, requireB2bCustomer, requireB2bSalesRep, requireB2bAdmin)
- **Default Admin**: Initial admin seeded at admin@nashobawinery.com / admin123 (change via Settings tab or setup page)
- **Access Gate**: Public pricing presentation page at /b2b requires access code 'WHOLESALE2025'
- **Frontend Routes**: Complete UI at /b2b/* (pricing, register, setup, login/admin, login/customer, login/sales, catalog, cart, checkout, orders, admin with 4 tabs)
- **Status**: ✅ PRODUCTION READY - Complete full-stack platform with all features functional

### Database Synchronization
- **Process**: Export/import system using multi-sheet Excel workbooks to synchronize database configuration between environments.
- **Cross-Environment Portability**: B2B data exports use portable business keys (tier_name, email, order_number, sku) instead of UUIDs for seamless synchronization across dev/staging/prod environments.
- **B2B Export Sheets**: TierPricing, SalesReps, B2bCustomers, B2bOrders, B2bOrderItems with foreign key references resolved via business keys (e.g., pricing_tier_name, sales_rep_email, customer_email, product_sku).
- **Upsert Logic**: Import system uses ID-first upsert strategy - if record ID exists, update it; otherwise check natural business key (SKU, email, question text, tier_name, order_number, etc.); if found, update; if not, create new. Enables workflows like exporting data, modifying prices in Excel, and re-importing to update existing records.
- **FK Resolution**: Cross-sheet lookup dictionaries built during import using case-insensitive matching (buildLowerTrimEquals) to resolve business keys to database IDs.
- **Security**: Password fields excluded from B2B exports; admins must manually reset customer passwords after cross-environment imports.
- **Validation**: Comprehensive Zod-based validation pipeline checks each row before database insertion, capturing detailed errors (sheet name, row number, field name, error reason) displayed in admin UI with 50-error display limit.

## External Dependencies
- **Core**: `react`, `react-dom`, `express`, `vite`, `typescript`, `drizzle-orm`, `@neondatabase/serverless`, `@tanstack/react-query`.
- **UI**: `@radix-ui/*`, `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `cmdk`, `embla-carousel-react`, `react-day-picker`, `framer-motion`.
- **Form Handling**: `react-hook-form`, `@hookform/resolvers`, `zod`, `drizzle-zod`.
- **Utilities**: `date-fns`, `wouter`, `nanoid`, `ws`, `qrcode`, `xlsx`.
- **AI/ML**: `openai`.
- **Email Service**: `@sendgrid/mail`.
- **Authentication**: `openid-client`, `express-session`, `connect-pg-simple`.
- **Database**: PostgreSQL (via Neon serverless).
- **File Storage**: `@google-cloud/storage`, `@uppy/core`, `@uppy/dashboard`, `@uppy/react`, `@uppy/aws-s3`.