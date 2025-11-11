# Nashoba Tasting Experience App

## Overview

The Nashoba Tasting Experience App is a mobile-first digital companion designed to enrich the wine tasting experience for winery guests. It provides product education, personalized AI-powered recommendations, engaging trivia, and a streamlined purchasing process, while also collecting valuable guest feedback. The app aims to be a sophisticated, elegant, and practical tool that complements the physical wine tasting journey. Key capabilities include a dynamic product catalog, interactive welcome experience, progressive educational popups, and comprehensive administrative tools for managing products, filters, and app content.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript (Vite).
- **UI**: shadcn/ui (Radix UI) and Tailwind CSS with custom theming. Mobile-first responsive design featuring bottom navigation, card-based layouts, and an interactive slideshow welcome experience.
- **State Management**: TanStack Query for server state, `useState` for UI state.

### Backend
- **Server**: Express.js with TypeScript, implementing a RESTful API.
- **Data Layer**: Drizzle ORM for type-safe PostgreSQL queries (Neon serverless driver).
- **Database Schema**: Comprehensive schema including `users` (authentication), `sessions` (auth sessions), `products` (32+ fields, `ignoreInventory`, `sweetness`, `body` search fields), `guest_sessions` (preferences), `favorites`, `view_history`, `cart_items`, `product_notes`, `trivia_questions`, `trivia_scores`, `app_settings`, `surveys`, `filter_options` (dynamic filter management), `slideshow_images`, `videos`, and `media_library`.
- **Business Logic**: Automatic tier-based discount calculation, trivia credit rewards, and a multi-algorithm product recommendation engine.
- **Dynamic Filtering**: Database-driven system supporting 5 customizable filter types with CRUD operations.

### AI Integration
- **OpenAI**: Utilizes GPT-4o-mini for a recommendation engine that analyzes guest preferences (favorites, view history, cart, stated preferences) to provide sommelier-style product matching with natural language explanations.
- **Preference Questionnaire**: Prompts guests with fewer than two interactions to complete a questionnaire on beverage type, wine color (conditionally shown for wine), and flavor preferences to drive initial AI recommendations.
- **Wine Color Selection**: When "wine" is selected as a beverage type, additional wine color options appear (red, white, rosé, sparkling) for more refined matching.
- **STRICT Wine Color Filtering**: Both AI and fallback recommendation systems enforce strict wine color filtering:
  - When wine colors are specified (e.g., "white"), ONLY products matching those colors are recommended
  - Beverage type match: REQUIRED filter (must match selected category)
  - Wine color match: REQUIRED filter when specified (must match, parsed from product tags)
  - Sweetness/dryness match: +2 points (preference-based scoring)
  - Body match (bold/light): +2 points (preference-based scoring)
  - Flavor keyword matches: +1 point each (preference-based scoring)
  - Tag parsing handles malformed JSON format: extracts color values from `{"{\"color\":\"red\"}"}` format
- **Recommendation Strategies**: Includes characteristic-based, favorites-based, stated-preference-based, AI-powered advanced analysis, and intelligent fallback scoring with strict beverage type and wine color filtering.

### Email System
- **Email Service**: SendGrid API for transactional emails
- **Authentication**: SendGrid API key stored in environment secret (SENDGRID_API_KEY). SendGrid integration configured outside of Replit's integration system due to user preference for manual setup.
- **Templates**: Server-side HTML email templates for sending cart orders and favorites summaries, including guest notes and discount breakdowns
- **From Address**: Uses verified sender `email@nashobawinery.com` (must be verified in SendGrid dashboard)
- **Note**: Sender email address must be verified in SendGrid's "Sender Authentication" before emails can be sent

### Key Features
- **Guest Experience**: Interactive slideshow introduction, product browsing with advanced filtering, product detail modal with favorites and notes, educational videos, progressive educational popups, auto-popup trivia with rewards dialog (displays achievement and reward after completing all 10 questions), shopping cart with tier-based discounts, AI-powered recommendations, pre-survey dialog for checkout actions, comprehensive tasting survey, email functionalities, and mobile-first navigation.
- **Pre-Survey Dialog**: Presents guests with optional actions (order cart, email favorites) before the tasting survey, with error handling and retry capabilities.
- **Admin Dashboard**: Comprehensive CRUD for products, inventory control, dynamic filter and slideshow image management, video management, trivia management, QR code generator, media library for cloud file storage, settings, and bulk product import/export.

### Media Library (Cloud Storage)
- **Storage**: Replit App Storage (Google Cloud Storage backend) with environment-aware authentication.
- **Authentication**: Conditional setup - uses Replit sidecar (127.0.0.1:1106) in development, Application Default Credentials (metadata server) in production.
- **Image Serving**: Files served through Express proxy endpoints (`/api/media-library/{id}/file`) rather than direct GCS URLs. Direct URLs return 403 due to GCS bucket public access prevention policy.
- **Functionality**: Upload, organize by category, add metadata (description, alt text, tags), copy public URLs, edit, and delete files. Files are cross-environment, but metadata requires syncing.

### Videos Feature
- **Functionality**: Full CRUD management for educational videos. Guests can browse and watch videos directly within the app using embedded players (supports YouTube, Vimeo, and direct video files). Falls back to external links for non-embeddable formats. Supports custom thumbnails and customizable display order.

### Database Synchronization
- **Process**: Comprehensive export/import system using multi-sheet Excel workbooks to synchronize all database configuration (products, filter options, trivia, slideshow images, app settings, media library metadata) between separate preview and published environments.

## Authentication & Security

### Overview
The application uses **Replit Auth** (OpenID Connect) for secure user authentication. Users log in through Replit's authentication system (supporting Google, GitHub, Apple, X, and email/password), and the app receives verified user information without handling passwords directly.

### User Roles
Three role levels control access:
- **Guest**: Standard app access (browse products, get recommendations, use trivia, manage cart/favorites)
- **Admin**: Full access including admin dashboard for content management
- **Wholesale**: Reserved for future tier-based pricing portal expansion

### Auto-Admin Assignment
The email address `email@nashobawinery.com` is automatically granted admin role on first login. This is configured in `server/replitAuth.ts` in the `upsertUser()` function.

### Session Management
- **Storage**: PostgreSQL-backed sessions using `express-session` with `connect-pg-simple`
- **Security**: TLS-only cookies in production, secure session handling
- **Token Refresh**: Automatic token refresh for expired sessions
- **Database Tables**: `users` (id, email, firstName, lastName, profileImageUrl, role) and `sessions` (sid, sess, expire)

### Protected Endpoints
All admin operations require authentication and admin role verification via `isAdmin` middleware:
- Product management (create, update, delete)
- Trivia management (create, update, delete)
- Filter options (create, update, delete, reorder)
- Slideshow images (create, update, delete, reorder)
- Media library (upload, update, delete)
- Settings management (discount tiers, trivia interval, recipient emails)
- User role management (list users, update roles)

### Login Flow
1. Unauthenticated users see Landing page with app features and login button
2. Click "Sign In to Get Started" → Redirects to `/api/login` → Replit Auth login page
3. After successful authentication → Callback to `/api/callback` → Session created
4. User role determined: Guest sees app, Admin sees app + Admin button
5. Admins can toggle to Admin Dashboard to manage content and user roles

### User Management UI
Admins can manage user roles through the **Settings tab** in the Admin Dashboard:
- View all users who have logged in
- See current role assignments (displayed as badges)
- Change roles via dropdown (Guest/Admin/Wholesale)
- Changes apply immediately with optimistic UI updates

**Files**: `server/replitAuth.ts`, `server/routes.ts` (auth routes + isAdmin middleware), `shared/schema.ts` (users/sessions tables), `client/src/hooks/useAuth.ts`, `client/src/pages/Landing.tsx`, `client/src/components/UserRoleManager.tsx`

## External Dependencies

- **Core**: `react`, `react-dom`, `express`, `vite`, `typescript`, `drizzle-orm`, `@neondatabase/serverless`, `@tanstack/react-query`.
- **UI**: `@radix-ui/*`, `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `cmdk`, `embla-carousel-react`, `react-day-picker`, `framer-motion`.
- **Form Handling**: `react-hook-form`, `@hookform/resolvers`, `zod`, `drizzle-zod`.
- **Utilities**: `date-fns`, `wouter`, `nanoid`, `ws`, `qrcode`, `xlsx`.
- **AI/ML**: `openai`.
- **Email Service**: `@sendgrid/mail`.
- **Authentication**: `openid-client` (Replit Auth), `express-session`, `connect-pg-simple` (session store).
- **Database**: PostgreSQL (via Neon serverless).
- **File Storage**: `@google-cloud/storage`, `@uppy/core`, `@uppy/dashboard`, `@uppy/react`, `@uppy/aws-s3`.

## Recent Updates (November 2025)

### Role-Based Authentication (NEW)
Implemented comprehensive authentication system using Replit Auth (OpenID Connect):
- **User Roles**: Guest, Admin, Wholesale (future expansion)
- **Auto-Admin**: `email@nashobawinery.com` automatically receives admin role on first login
- **Protected Admin Portal**: All admin endpoints secured with role-based middleware
- **User Management UI**: Admins can grant/revoke roles through Settings tab
- **Session Storage**: PostgreSQL-backed secure sessions with automatic token refresh
- See "Authentication & Security" section above for complete details

### Email System (SendGrid)
The application uses SendGrid API for sending transactional emails (cart orders and favorites summaries).

#### Setup Instructions
1. **Create SendGrid Account**
   - Sign up at [sendgrid.com](https://sendgrid.com)
   - Free tier: 100 emails/day (sufficient for most wineries)

2. **Verify Sender Email**
   - Navigate to **Settings > Sender Authentication** in SendGrid dashboard
   - Click **Verify a Single Sender**
   - Enter sender email: `email@nashobawinery.com` (or your preferred email)
   - Complete verification process via email confirmation
   - **Important**: Emails will NOT send until sender is verified

3. **Generate API Key**
   - Go to **Settings > API Keys** in SendGrid dashboard
   - Click **Create API Key**
   - Name: `Nashoba Tasting App` (or similar)
   - Permission: **Full Access** (or at minimum: Mail Send)
   - Copy the generated API key (you won't see it again!)

4. **Add to Replit Secrets**
   - In Replit, go to **Tools > Secrets**
   - Add secret: `SENDGRID_API_KEY` = `[paste your API key]`
   - The app automatically loads this from environment variables

5. **Configure Sender Email in Code**
   - Update `server/email.ts` if using a different sender email
   - Default: `email@nashobawinery.com`

#### Migration History
- **Previous System**: Microsoft 365 SMTP (had authentication failures)
- **Current System**: SendGrid API (stable and reliable)
- **Active Secrets**: `SENDGRID_API_KEY`, `RESEND_FROM_EMAIL` (legacy, can be removed)
- **Deprecated Secrets**: SMTP_* secrets (removed)

#### Email Features
- **Cart Orders**: Sends order details to configurable recipient emails (Settings tab)
- **Favorites Summary**: Sends guest favorites list with tasting notes
- **Template Format**: HTML + Plain text for maximum compatibility
- **Styling**: Branded with winery colors (gold accents, serif fonts)

### Bug Fixes
1. **Favorites Notes Not Saving**
   - **Issue**: 500ms debounce timer cancelled when closing product detail modal too quickly
   - **Fix**: Added `handleDialogOpenChange` to flush pending notes on all close events (Save button, overlay click, Escape key)
   - **Files**: `client/src/components/ProductDetailModal.tsx`
   - **UX**: Changed "Close" button to "Save" with updated helper text

2. **Cart Discounts Not Displaying**
   - **Issue**: Case-sensitive category filter using `['Wine', 'Spirits']` didn't match lowercase database values `['wine', 'spirits']`
   - **Fix**: Updated category filters to lowercase in 3 locations
   - **Files**: `client/src/components/ShoppingCartPanel.tsx`, `client/src/pages/GuestApp.tsx`
   - **Impact**: Tier-based discounts now calculate and display correctly (3+ bottles: 5%, 6+: 10%, 12+: 15%, 24+: 24%)

3. **Notes Not Appearing in Emailed Favorites**
   - **Issue**: When emailing favorites, the email didn't include tasting notes
   - **Root Cause**: `getFavorites()` function only read from old `favorites.note` column, but notes are now stored in `product_notes` table
   - **Fix**: Updated `getFavorites()` to left join with `product_notes` table and use `COALESCE(product_notes.note, favorites.note)` to prioritize new storage while maintaining legacy data access
   - **Files**: `server/storage.ts`
   - **Impact**: Emailed favorites now include all tasting notes with styled formatting

### New Features
1. **Configurable Order Recipient Emails**
   - **Feature**: Admin can now configure multiple email addresses to receive guest cart orders through the Settings tab
   - **Implementation**: 
     - New `OrderRecipientEmailsManager` component in Admin Dashboard Settings
     - Supports up to 10 comma-separated email addresses
     - Validates email format, trims whitespace, and removes duplicates
     - Backend fetches recipients from `app_settings` table and sends emails to all configured addresses
   - **Files**: `client/src/components/OrderRecipientEmailsManager.tsx`, `client/src/pages/AdminDashboard.tsx`, `server/routes.ts`
   - **Default**: Falls back to `onsiteorder@nashobawinery.com` if not configured

2. **Unified Notes System**
   - **Issue Fixed**: Notes added in Product Detail Modal weren't showing in Favorites Panel (dual storage problem)
   - **Root Cause**: Product Detail saved to `product_notes` table, Favorites read from `favorites.note` column
   - **Solution**: Unified both panels to use `product_notes` table as single source of truth
   - **Implementation**:
     - Read path: `note: productNotesMap[fav.productId] || fav.note || undefined` (primary + fallback)
     - Write path: Both panels save via `saveProductNoteMutation` to `product_notes` table
     - Migration endpoint: POST `/api/migrate/favorites-notes` for one-time legacy data migration
     - Migration logic: `migrateFavoritesNotesToProductNotes()` - idempotent, only migrates if product_notes is empty
   - **Data Safety**: Fallback protects existing `favorites.note` data from disappearing
   - **Files**: `client/src/pages/GuestApp.tsx`, `server/routes.ts`, `server/storage.ts`
   - **Deployment Plan**: Code deployed with fallback → Manual migration via API → Monitor → Future cleanup of `favorites.note` column

3. **Save and Return to Products Button**
   - **Feature**: Added "Save and Return to Products" button in Favorites panel for improved navigation
   - **Functionality**: 
     - Flushes any pending debounced notes immediately (no 500ms wait)
     - Navigates back to Browse/Products tab
     - Ensures all notes are saved before returning to browsing
   - **UX**: Outline button with left arrow icon, positioned above "Email My Favorites & Notes" button
   - **Files**: `client/src/components/FavoritesPanel.tsx`, `client/src/pages/GuestApp.tsx`
   - **Testing**: Verified notes save correctly and navigation works as expected

4. **Trivia Results User Control**
   - **Feature**: Trivia results now stay on screen until user clicks "Continue" button
   - **Previous Behavior**: Results auto-dismissed after 2.5 seconds (too fast to read explanations)
   - **New Behavior**: 
     - Result displays with correct/incorrect indicator and explanation
     - Full-width "Continue" button appears below explanation
     - User reads at their own pace
     - Click "Continue" when ready for next question
   - **UX Improvement**: Gives users time to understand why an answer was correct/incorrect
   - **Files**: `client/src/components/TriviaPopup.tsx`