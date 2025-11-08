# Nashoba Tasting Experience App

## Overview

The Nashoba Tasting Experience App is a mobile-first digital companion designed to enrich the wine tasting experience for winery guests. It provides product education, personalized AI-powered recommendations, engaging trivia, and a streamlined purchasing process, while also collecting valuable guest feedback. The app aims to be a sophisticated, elegant, and practical tool that complements the physical wine tasting journey. Key capabilities include a dynamic product catalog, interactive welcome experience, progressive educational popups, and comprehensive administrative tools for managing products, filters, and app content.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

- **Framework**: React with TypeScript, using Vite.
- **UI**: shadcn/ui (built on Radix UI) and Tailwind CSS for styling, with custom theming for light/dark modes. Typography uses Cormorant Garamond for headers and Inter for body text.
- **State Management**: TanStack Query for server state, `useState` for UI state.
- **Design**: Mobile-first responsive design with bottom navigation, card-based layouts, and an aesthetic inspired by Airbnb and Apple. Features an interactive slideshow welcome experience with animations and dynamically managed images.

### Backend

- **Server**: Express.js with TypeScript, implementing a RESTful API. Handles session tracking without authentication.
- **Data Layer**: Drizzle ORM for type-safe PostgreSQL queries (via Neon serverless driver) and schema management.
- **Database Schema**: Includes `products` (with 32+ fields, `ignoreInventory`, dedicated `sweetness` and `body` search criteria fields), `guest_sessions` (with preference fields: `preferredBeverageTypes`, `flavorPreferences`, `occasion`), `favorites`, `view_history`, `cart_items`, `product_notes`, `trivia_questions`, `trivia_scores`, `app_settings`, `surveys`, `filter_options` (for dynamic filter management), `slideshow_images` (for welcome slideshows), and `media_library` (for cloud-stored image/file management).
- **Business Logic**: Implements automatic tier-based discount calculation (5-24% off), trivia credit rewards ($5 for 10/10), and a multi-algorithm product recommendation engine.
- **Inventory Management**: Features a per-product `ignoreInventory` flag for fine-grained stock control.
- **Dynamic Filtering**: A database-driven system supports 5 customizable filter types (category, wine_color, sweetness, body, characteristics) with CRUD operations for options, sort orders, and active/inactive states.

### AI Integration

- **OpenAI**: Utilizes GPT-4o-mini for a recommendation engine that analyzes guest preferences (favorites, view history, cart, stated preferences) to provide sommelier-style product matching with natural language explanations.
- **Preference Questionnaire**: When guests have fewer than 2 interactions and no stated preferences, they're prompted to complete a questionnaire selecting their preferred beverage types (Wine, Beer, Spirits, Cider, etc.) and flavor preferences (Sweet, Dry, Fruity, Balanced, etc.). These stated preferences are stored in the database and used to generate AI recommendations even without browsing history.
- **Recommendation Strategies**: Includes characteristic-based, favorites-based, stated-preference-based, and AI-powered advanced analysis with intelligent fallback logic.

### Email System

- Server-side HTML email templates are used for sending cart orders and favorites summaries, including guest notes and discount breakdowns.

### Key Features

- **Guest Experience**: Interactive slideshow introduction, product browsing with advanced filtering, product detail modal with favorites and notes, progressive educational popups, auto-popup trivia with rewards, shopping cart with tier-based discounts, AI-powered recommendations, comprehensive tasting survey, email functionalities, and mobile-first navigation. Notes can be added to any product.
- **Admin Dashboard**: Comprehensive CRUD operations for products, per-product inventory control, dynamic filter and slideshow image management (upload, edit, delete, reorder, activate/deactivate), trivia management, a QR code generator for guest app access, media library for cloud file storage, settings, bulk product import/export.

## Email System Status

**Current State**: Email functionality is **FULLY OPERATIONAL** with verified domain.

**Technical Details**:
- Email service: Resend (via `resend` npm package)
- API Key: Stored securely in `RESEND_API_KEY` environment secret
- From Address: `Nashoba Winery <info@nashobawinery.info>` (stored in `RESEND_FROM_EMAIL`)
- Domain: nashobawinery.info (verified ✓)
- Email templates: Fully functional HTML emails for cart orders and favorites
- Routes: `/api/sessions/:id/email/cart` and `/api/sessions/:id/email/favorites`
- Email recipients:
  - Cart orders → `onsiteorder@nashobawinery.com`
  - Favorites → User-provided email address

**Production Status**: ✓ Ready - Can send to any email address

## Database Synchronization Between Environments

**IMPORTANT**: Replit's preview and published deployments use **completely separate databases**.

**Environment Overview**:
- **Preview Environment** (development): Uses development database with all your test data
- **Published Environment** (production): Starts with an empty database

**Syncing All Data Between Environments**:
1. Navigate to preview admin panel by clicking the "Admin" button in the top-right corner
2. Click on "Import/Export" tab
3. Click "Export All Data" button
4. Save the downloaded `nashoba-all-data-[date].xlsx` file (contains all database configuration)
5. Navigate to published app and click "Admin" button
6. Click on "Import/Export" tab
7. Click "Import All Data" button and upload the exported Excel file
8. All database configuration now exists in both environments!

**Comprehensive Export/Import System**:
The "Export All Data" and "Import All Data" buttons provide one-click synchronization of all database configuration:

**Export All Data**:
- Downloads a single multi-sheet Excel workbook containing:
  - **Products**: All wine/spirits catalog data (32+ fields)
  - **FilterOptions**: Dynamic filter configuration (category, wine_color, sweetness, body, characteristics)
  - **TriviaQuestions**: Quiz questions, answers, and explanations
  - **SlideshowImages**: Welcome carousel images with titles, descriptions, and order
  - **AppSettings**: Application configuration (discount tiers, etc.)
  - **MediaLibrary**: Cloud storage file metadata (filename, URLs, categories, descriptions, tags)
- File naming: `nashoba-all-data-YYYY-MM-DD.xlsx`
- API endpoint: `GET /api/admin/data/export-all`

**Import All Data**:
- Accepts the multi-sheet Excel workbook
- Validates and imports all data types in one operation
- Provides detailed results showing success/failure counts for each data type
- Reuses existing CRUD operations to maintain data integrity
- API endpoint: `POST /api/admin/data/import-all`

**Legacy Single-Type Options** (still available):
- **Download Template**: Get an empty product template showing all available fields
- **Export Products**: Download products-only Excel file
- **Upload Excel**: Import products from an Excel file (supports .xlsx, .xls)

## Media Library (Cloud Storage)

**Status**: OPERATIONAL using Replit App Storage (Google Cloud Storage backend)

**Technical Details**:
- Storage: Replit App Storage (Google Cloud Storage)
- Files stored in cloud are accessible from BOTH preview and production environments
- Database metadata (category, description, alt text, tags) is environment-specific and must be synced separately
- Environment variables: `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR`

**Features**:
- Upload images and files directly to cloud storage with drag-and-drop support
- Organize files by category (products, slideshow, logos, uncategorized)
- Add metadata: description, alt text, tags for better organization and SEO
- Copy public URLs to clipboard for use in products, slideshow, or other content
- Edit file metadata after upload
- Delete files from cloud storage
- Filter files by category for easier browsing

**Admin Access**:
1. Navigate to admin dashboard
2. Click "Media Library" tab
3. Upload files, edit metadata, or copy URLs as needed

**File Storage Architecture**:
- Files: Stored in Google Cloud Storage (cross-environment)
- Metadata: Stored in PostgreSQL `media_library` table (needs sync between environments)
- Public URLs: Generated automatically and remain accessible across environments

**Syncing Media Library Between Environments**:
- Files in cloud storage are accessible from BOTH preview and production (cross-environment)
- Metadata (descriptions, alt text, tags, categories) is environment-specific
- Use Export All Data / Import All Data to sync metadata between environments
- After importing, all files will be accessible via their stored public URLs

**Best Practices**:
- Use descriptive filenames
- Add alt text for all images for accessibility
- Organize files into appropriate categories
- Use tags to make files easily searchable
- Copy URLs from media library instead of hardcoding paths
- Use Export/Import to sync metadata when moving between preview and production

**Database Schema** (`media_library` table):
- `id`: Unique identifier
- `filename`: Clean filename (sanitized)
- `originalFilename`: Original upload filename
- `mimeType`: File MIME type
- `fileSize`: Size in bytes
- `objectPath`: Internal cloud storage path
- `publicUrl`: Public-facing URL
- `category`: Organizational category
- `description`: Optional file description
- `altText`: Accessibility alt text
- `tags`: Array of searchable tags

## External Dependencies

- **Core**: `react`, `react-dom`, `express`, `vite`, `typescript`, `drizzle-orm`, `@neondatabase/serverless`, `@tanstack/react-query`.
- **UI**: `@radix-ui/*`, `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `cmdk`, `embla-carousel-react`, `react-day-picker`, `framer-motion`.
- **Form Handling**: `react-hook-form`, `@hookform/resolvers`, `zod`, `drizzle-zod`.
- **Utilities**: `date-fns`, `wouter`, `nanoid`, `ws`, `qrcode`, `xlsx`.
- **AI/ML**: `openai`.
- **Database**: PostgreSQL (via Neon serverless), `connect-pg-simple`.
- **File Storage**: `@google-cloud/storage`, `@uppy/core`, `@uppy/dashboard`, `@uppy/react`, `@uppy/aws-s3` for cloud file management.