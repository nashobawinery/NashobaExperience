# Nashoba Tasting Experience App

## Overview
The Nashoba Tasting Experience App is a mobile-first digital companion designed to enrich the wine tasting experience for winery guests. It offers product education, personalized AI-powered recommendations, engaging trivia, and a streamlined purchasing process, while also collecting valuable guest feedback. The app aims to be a sophisticated, elegant, and practical tool that complements the physical wine tasting journey. Key capabilities include a dynamic product catalog, interactive welcome experience, progressive educational popups, and comprehensive administrative tools. The project's ambition is to enhance guest engagement and provide valuable data for the winery.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Fixes (November 23, 2025)
**B2B Order Status & Commission Display Cache Issues**
- Fixed cache key mismatch in TasksPage: Changed query key from `['/api/b2b/admin/orders']` to `["b2b", "admin", "orders"]` to match AdminDashboard query key
- Fixed cache invalidation in TasksPage order status updates to use matching query key
- Added explicit `queryFn` to AdminDashboard commission query with correct endpoint URL
- Fixed commission cache key format from mixed `['/api/b2b/admin/sales-reps', id, 'commissions']` to consistent array format `["b2b", "admin", "sales-reps", id, "commissions"]`
- Fixed commission cache invalidation mutation to use matching query key
- **Result**: Order status updates in TasksPage now properly invalidate AdminDashboard cache; commission lists now refresh correctly after status changes

**B2B Manual Order Tier Pricing Bug**
- Fixed critical issue where manual orders created by admins were showing Tier 1 pricing instead of customer's actual tier (e.g., Tier 4)
- Root cause: Manual order endpoint was fetching tier discount without filtering by product category, ignoring that tiers are category-specific
- Solution: Refactored manual order pricing to calculate discount per-product based on both tier name AND product category, matching the customer catalog endpoint logic
- **Result**: Manual orders now correctly apply category-specific tier discounts for each product in the order
- Added missing `desc` import in b2b-routes.ts for proper compilation

## System Architecture

### Frontend
- **Framework**: React with TypeScript (Vite).
- **UI**: shadcn/ui (Radix UI) and Tailwind CSS with custom theming, featuring a mobile-first responsive design, bottom navigation, card-based layouts, and an interactive slideshow welcome experience.
- **State Management**: TanStack Query for server state, `useState` for UI state.

### Backend
- **Server**: Express.js with TypeScript, implementing a RESTful API.
- **Data Layer**: Drizzle ORM for type-safe PostgreSQL queries (Neon serverless driver).
- **Database Schema**: Includes tables for `users`, `sessions`, `products`, `guest_sessions`, `favorites`, `view_history`, `cart_items`, `product_notes`, `trivia_questions`, `trivia_scores`, `app_settings`, `surveys`, `filter_options`, `slideshow_images`, `videos`, `media_library`, and several dedicated B2B tables.
- **Business Logic**: Tier-based discount calculation, trivia credit rewards, and a multi-algorithm product recommendation engine.
- **Dynamic Filtering**: Database-driven system supporting 5 customizable filter types with CRUD operations.

### AI Integration
- **OpenAI**: Utilizes GPT-4o-mini for a recommendation engine that analyzes guest preferences to provide sommelier-style product matching with natural language explanations.
- **Preference Questionnaire**: Prompts guests with fewer than two interactions to complete a questionnaire on beverage type, wine color, and flavor preferences.
- **Recommendation Strategies**: Includes characteristic-based, favorites-based, stated-preference-based, AI-powered advanced analysis, and intelligent fallback scoring with strict beverage type and wine color filtering.

### Email System
- **Email Service**: SendGrid API for transactional emails (cart orders, favorites summaries).
- **Templates**: Server-side HTML email templates with branding.

### Key Features
- **Guest Experience**: Interactive slideshow, product browsing with filtering, product detail modals, educational videos and popups, auto-popup trivia with rewards, shopping cart with tier-based discounts, AI recommendations, pre-survey dialog for checkout actions, comprehensive tasting survey, and email functionalities.
- **Admin Dashboard**: Comprehensive CRUD for products, inventory, dynamic filter and slideshow image management, video management, trivia, QR code generator, media library, settings, and bulk product import/export. Bulk delete functionality with checkboxes for efficient cleanup of slideshow images, commercials, and media library files.

### Media Library (Cloud Storage)
- **Storage**: Replit App Storage (Google Cloud Storage backend).
- **Functionality**: Upload, organize, add metadata, copy public URLs, edit, and delete files. Files are served through Express proxy endpoints.
- **Bulk Operations**: Checkbox-based selection for deleting multiple files simultaneously with automatic state synchronization to prevent stale selections.
- **Object Storage Manager**: Direct access to the Google Cloud Storage bucket via the Admin Dashboard "Object Storage" tab. Allows administrators to browse all files in the bucket, upload new files to custom folders, delete files, and view file metadata (size, type, upload date). Files are organized by folder and searchable by filename.

### Authentication & Security
- **Authentication**: Replit Auth (OpenID Connect) for secure user authentication in the tasting app. Separate email/password authentication for the B2B platform.
- **User Roles**: Viewer, Admin for the tasting app. B2B Admins, Sales Representatives, and B2B Customers for the B2B platform.
- **Session Management**: PostgreSQL-backed sessions using `express-session` with isolated session cookies for the tasting app (`connect.sid`) and B2B platform (`b2b.sid`).
- **Protected Endpoints**: All admin operations require authentication and role verification via middleware.

### B2B Wholesale Platform
- **Architecture**: A completely separate full-stack platform from the tasting app with its own authentication, sessions, and routes (`/b2b/*`).
- **Landing Page**: Features tasting app-style aesthetic with winery aerial background image and gradient overlay. Access code WHOLESALE2025 grants view of wholesale pricing tiers without requiring account creation. Database-driven slideshow system with admin management. Includes persistent "Proceed to Pricing Sheet" button at bottom of slideshow card for direct navigation. Below slideshow: 2-column responsive layout (left: Additional Services + Pricing Tiers, right: Ready to Get Started).
- **B2B Slideshow System**: Dynamic slideshow on landing page with database-backed content management integrated with existing media_library and videos tables. Both admin (`/api/b2b/admin/slideshow/slides`) and public (`/api/b2b/slideshow/slides`) endpoints resolve media URLs via JOIN queries. Admin dashboard displays 48x48px image/video thumbnails in the Media column. Supports 2-column slide layout (1/3 media, 2/3 content), image/video media from centralized library, icons (Sprout, Users, Award, Wine, Package, TrendingDown, Shield, Heart, Star), active/inactive states, and custom ordering.
- **User Types**: B2B Admins, Sales Representatives, and B2B Customers with dedicated login endpoints and permissions.
- **Database**: 8 dedicated B2B tables including `b2b_password_reset_tokens` and `case_size` field on products.
- **Category-Specific Tier Pricing**: Each of 6 beverage categories (Wine, Spirits, Beer, Canned Cocktails, Canned Wine, Cider) has independent tier pricing (Tier 1-6, 24%-60% wholesale discounts) with active/inactive toggle and editable discount percentage/description. Strict category-based tier filtering prevents cross-category discount leaks in product tables, detail modals, and pricing sheet.
- **Pricing Sheet**: Comprehensive wholesale pricing display organized by 6 product category tabs (Wine, Spirits, Beer, Cocktails, Canned Wine, Cider) with category-specific tier columns, profit margin calculations, and product detail modals. Product tabs automatically sync with tier footer tabs (1:1 mapping) to ensure tier information always corresponds to the selected product category. Strict category filtering prevents cross-category discount leaks in all views.
- **Tier Management**: Admins can edit tier details (discount percentage, description), toggle active/inactive status. Inactive tiers hidden from public pricing and approval workflows while existing customers retain their pricing.
- **Customer Workflow**: Self-service registration via "Set Up Account" button requiring admin approval, or direct admin-created accounts with instant activation. Both methods include email notification and password setup. Manual admin creation features full form validation, auto-approval toggle, tier assignment, and automatic password generation from phone number.
- **Case Pricing**: All orders calculated by case with tier-based discounts.
- **Admin Dashboard**: Comprehensive 6-tab dashboard for managing customers, orders, tier commitments, sales reps, slideshow, and settings with full administrator management (create, edit, delete admins with security safeguards).
- **Admin Impersonation**: Admins can place orders for customers without requiring customer login. Clicking "Place Order" in the Customers tab stores impersonation context in localStorage, allowing admins to access customer-only routes (catalog, cart, checkout). ProtectedRoute component recognizes admin sessions with impersonation data and bypasses customer-only checks. All customer endpoints support admin impersonation via `customerId` query parameter. Backend validates admin session and uses provided customerId for data operations. Tier-based pricing automatically applies based on impersonated customer's tier. Impersonation flag cleared on logout and when admin clicks "Return to Admin Dashboard" button.
- **Tier Commitment Tracking**: Monitors annual case commitments for Tier 3 (10 cases/year) and Tier 4 (30 cases/year) customers. Tracks cases purchased during each customer's fiscal year (starting from commitment start date), calculates remaining commitments, and provides 60-day renewal reminder email functionality. Admin interface displays commitment progress with status indicators (on track, behind schedule, completed) and allows updating commitment start dates.
- **Where to Buy**: Public page (`/b2b/where-to-buy`) displaying B2B customers who have purchased in the past 12 months. Shows business name, shipping address, phone number, and products carried. Features ZIP code proximity search to help consumers find the nearest retail locations carrying Nashoba Valley Winery products.
- **Password Management**: All B2B login pages feature password visibility toggle and "Forgot Password?" functionality. Self-service password reset via email with secure one-time tokens (1-hour expiration) for admins, sales reps, and customers.

### Database Synchronization
- **Process**: Export/import system using multi-sheet Excel workbooks to synchronize database configuration between environments.
- **Cross-Environment Portability**: B2B data exports use portable business keys (tier_name, email, order_number, sku) instead of UUIDs for seamless synchronization.
- **Upsert Logic**: ID-first upsert strategy with natural business key fallback for updating existing records or creating new ones.
- **FK Resolution**: Cross-sheet lookup dictionaries built during import using case-insensitive matching to resolve business keys to database IDs.
- **Validation**: Comprehensive Zod-based validation pipeline for each row during import.

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