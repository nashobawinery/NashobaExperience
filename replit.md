# Nashoba Tasting Experience App

## Overview
The Nashoba Tasting Experience App is a mobile-first digital companion designed to enrich the wine tasting experience for winery guests. It provides product education, personalized AI-powered recommendations, engaging trivia, and a streamlined purchasing process, while collecting valuable guest feedback. The app aims to be a sophisticated, elegant, and practical tool that complements the physical wine tasting journey, enhancing guest engagement and providing valuable data for the winery.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript (Vite).
- **UI**: shadcn/ui (Radix UI) and Tailwind CSS for a mobile-first, responsive design with custom theming.
- **State Management**: TanStack Query for server state, `useState` for UI state.

### Backend
- **Server**: Express.js with TypeScript, implementing a RESTful API.
- **Data Layer**: Drizzle ORM for type-safe PostgreSQL queries (Neon serverless driver).
- **Database Schema**: Comprehensive schema including users, products, guest sessions, orders, and dedicated B2B tables.
- **Business Logic**: Tier-based discount calculation, trivia credit rewards, and a multi-algorithm product recommendation engine.
- **Dynamic Filtering**: Database-driven system supporting 5 customizable filter types.

### AI Integration
- **OpenAI**: Utilizes GPT-4o-mini for a recommendation engine that provides sommelier-style product matching with natural language explanations based on guest preferences and a preference questionnaire.

### Email System
- **Email Service**: SendGrid API for transactional emails (order confirmations, notifications, password resets).
- **Templates**: Server-side HTML email templates with branding.

### Key Features
- **Guest Experience**: Interactive slideshow, product browsing, educational content, AI recommendations, shopping cart with tier-based discounts, and comprehensive tasting surveys.
- **Admin Dashboard**: Comprehensive CRUD operations for products, inventory, dynamic content, trivia, QR code generation, media library, and bulk import/export.
- **Media Library**: Cloud-based storage (Replit App Storage/Google Cloud Storage) for managing and serving media files, with bulk operations and an Object Storage Manager for direct bucket access.

### Authentication & Security
- **Authentication**: Replit Auth (OpenID Connect) for the tasting app; separate email/password authentication for the B2B platform.
- **User Roles**: Viewer, Admin (tasting app); B2B Admins, Sales Representatives, B2B Customers (B2B platform).
- **Session Management**: PostgreSQL-backed sessions using `express-session` with isolated session cookies.
- **Protected Endpoints**: All admin and sensitive operations require authentication and role verification.

### B2B Wholesale Platform
- **Architecture**: A separate full-stack platform with its own authentication, sessions, and routes (`/b2b/*`).
- **Landing Page**: Features dynamic slideshow, pricing information, and account setup options.
- **User Types**: Dedicated roles for B2B Admins, Sales Representatives, and B2B Customers.
- **Category-Specific Tier Pricing**: Independent tier pricing (24%-60% wholesale discounts) for 6 beverage categories, with active/inactive toggles and editable details.
- **Pricing Sheet**: Comprehensive wholesale pricing display by category with profit margin calculations.
- **Customer Workflow**: Self-service registration with admin approval, or direct admin-created accounts, both with email notifications and password setup.
- **Case Pricing**: All orders calculated by case with tier-based discounts.
- **Admin Dashboard**: 6-tab dashboard for managing customers, orders, tier commitments, sales reps, slideshow, and settings. Includes admin impersonation for placing customer orders.
- **Multi-Location Support**: 
  - Each B2B customer account can have multiple store locations (e.g., a restaurant chain with 5 locations)
  - Locations stored in `b2bCustomerLocations` table with: storeName, storeAddress, storeCity, storeState, storeZipCode, storePhone, storeEmail
  - Each location has its own phone number and email address for location-specific contact information
  - "Copy from Main Address" button in location form to quickly populate address, phone, and email from the customer's main contact info
  - All locations share the parent customer's pricing tier and product purchase history
  - Admin can add/edit/delete locations via the Edit Customer dialog's "Store Locations" section
  - Each location can be individually toggled to show/hide on the Where to Buy page (showOnWhereToBuy field)
- **Customer Privacy Controls**: 
  - **Archive Status**: Customers can be marked as "Archived" (in addition to Active, Pending Approval, and Inactive) to preserve records while removing them from active lists
  - **Where to Buy Visibility**: Individual location-level toggle to hide specific store locations from the public Where to Buy page
- **Tier Commitment Tracking**: Monitors annual case commitments, calculates progress, and provides renewal reminders.
- **Where to Buy**: Public page displaying individual store locations for consumers with ZIP code proximity search and product name search. Features storeName prominently with accountName as subtitle. Shows products purchased in the last 12 months. Includes celebratory header with animated fireworks and community appreciation messaging.
- **Featured Products System**: 
  - Allows admins to manually assign products to customers for the "Where to Buy" page before actual orders exist
  - Useful for launch day when customers carry products but haven't ordered through B2B yet
  - Separate from actual orders - does not affect sales data, invoicing, or commission tracking
  - Stored in `b2bCustomerManualProducts` table with automatic 12-month expiration
  - Products from both orders and manual assignments are merged and deduplicated on Where to Buy page
  - UI in Edit Customer dialog under "Featured Products" section (only shown for retail_liquor and restaurant customers)
  - Multi-select dropdown for quick product assignment with badge-based display
- **Password Management**: "Forgot Password?" functionality with secure one-time tokens for all B2B user types.

### Database Synchronization
- **Process**: Comprehensive Excel-based export/import system for synchronizing ALL database data between environments using multi-sheet workbooks.
- **Complete Data Coverage**: 
  - **Core Tables**: Products, Filter Options, Trivia, Slideshow, App Settings, Media Library, Whitelisted Emails, Commercials, Videos, Achievements
  - **B2B Tables**: Tier Pricing, Sales Reps, Customers, Customer Locations, Customer Manual Products (Featured Products), Orders, Order Items, Slideshow Slides, Admins, Settings, Commissions (with order_total, commission_percentage), Email Templates (with description, tier_filter, body_html, body_text, days_before_event), Email Automation Logs (with template_id, trigger_type, success, error_message)
  - **All Fields Exported**: Every field in every table is captured during export to ensure complete data fidelity
- **Cross-Environment Portability**: Uses portable business keys (email, order_number, etc.) instead of UUIDs for seamless data synchronization.
- **Upsert Logic**: ID-first upsert strategy with natural business key fallback; handles partial updates correctly.
- **FK Resolution**: Cross-sheet lookup dictionaries for resolving business keys to database IDs.
- **Validation**: Zod-based validation pipeline with detailed error/warning reporting for data import.
- **Sales Rep Import**: Only updates existing sales reps (preserves passwords); new sales reps must be created via admin UI since passwords are not exported for security.
- **Commissions**: Full sync including order_total, commission_percentage, status, pay_period, paid_to_sales_rep tracking, and timestamps
- **Email System**: Complete sync of email templates and automation logs with all content, trigger types, and delivery status
- **Deployment Note**: After code changes, the app must be republished for changes to take effect in production. Complete synchronization ensures development database fully mirrors production after export/import cycle.

## External Dependencies
- **Core**: `react`, `react-dom`, `express`, `vite`, `typescript`, `drizzle-orm`, `@neondatabase/serverless`, `@tanstack/react-query`.
- **UI**: `@radix-ui/*`, `tailwindcss`, `shadcn/ui`, `lucide-react`, `embla-carousel-react`, `framer-motion`.
- **Form Handling**: `react-hook-form`, `@hookform/resolvers`, `zod`, `drizzle-zod`.
- **Utilities**: `date-fns`, `wouter`, `nanoid`, `ws`, `qrcode`, `xlsx`.
- **AI/ML**: `openai`.
- **Email Service**: `@sendgrid/mail`.
- **Authentication**: `openid-client`, `express-session`, `connect-pg-simple`.
- **Database**: PostgreSQL (via Neon serverless).
- **File Storage**: `@google-cloud/storage`, `@uppy/core`, `@uppy/dashboard`, `@uppy/react`, `@uppy/aws-s3`.