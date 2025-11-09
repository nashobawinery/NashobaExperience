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
- **Database Schema**: Comprehensive schema including `products` (32+ fields, `ignoreInventory`, `sweetness`, `body` search fields), `guest_sessions` (preferences), `favorites`, `view_history`, `cart_items`, `product_notes`, `trivia_questions`, `trivia_scores`, `app_settings`, `surveys`, `filter_options` (dynamic filter management), `slideshow_images`, `videos`, and `media_library`.
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
- Server-side HTML email templates for sending cart orders and favorites summaries, including guest notes and discount breakdowns. Features a robust fallback mechanism for domain verification issues.

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

## External Dependencies

- **Core**: `react`, `react-dom`, `express`, `vite`, `typescript`, `drizzle-orm`, `@neondatabase/serverless`, `@tanstack/react-query`.
- **UI**: `@radix-ui/*`, `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `cmdk`, `embla-carousel-react`, `react-day-picker`, `framer-motion`.
- **Form Handling**: `react-hook-form`, `@hookform/resolvers`, `zod`, `drizzle-zod`.
- **Utilities**: `date-fns`, `wouter`, `nanoid`, `ws`, `qrcode`, `xlsx`.
- **AI/ML**: `openai`.
- **Email Service**: `resend`.
- **Database**: PostgreSQL (via Neon serverless), `connect-pg-simple`.
- **File Storage**: `@google-cloud/storage`, `@uppy/core`, `@uppy/dashboard`, `@uppy/react`, `@uppy/aws-s3`.