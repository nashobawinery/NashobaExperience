# Nashoba Tasting Experience App

## Overview

The Nashoba Tasting Experience App is a mobile-first digital companion for winery guests, enhancing their tasting experience. It offers product education, personalized AI-powered recommendations, engaging trivia, and streamlined purchasing, while also collecting valuable feedback. The app aims to provide a sophisticated, elegant, and practical tool to enrich the physical wine tasting journey.

**Status**: ✅ Fully functional and tested

**Recent Updates**: November 6, 2025
- ✅ **Custom welcome screen background**: Replaced generic stock photo with actual Nashoba Valley Winery aerial photograph showing winery building, vineyards, and pond with kayaks
- ✅ **Product-agnostic language**: All hardcoded "wine" references replaced with generic "product" terminology to support spirits, beers, and other non-wine items; works equally well for all 5 product categories
- ✅ **Sonoma-Cutrer-style product detail modal**: Two-column layout with large bottle image (left 50%) and elegant details (right 50%), serif typography, quantity selector (1-12 bottles), clean technical specs grid, professional winery aesthetic matching high-end tasting room sites
- ✅ **Compact list view**: Guest product browsing redesigned as elegant single-column list (wine menu style) showing 5+ products on screen vs previous 3-4, with small thumbnails, category badges, and characteristics; prices/cart buttons hidden until product clicked
- ✅ **Comprehensive product editor**: Admin can now edit ALL 32+ database fields via organized edit dialog (basic info, wine details, tasting/serving, production, pricing/inventory, images, recognition, flags/tags)
- ✅ **Out-of-stock display**: Products show red "Out of Stock" badge and disabled cart button when ignoreInventory=false and stockQuantity=0
- ✅ **Per-product inventory control**: New `ignoreInventory` boolean field (default: true) allows fine-grained stock management
- ✅ **Inventory toggle UI**: Admin dashboard displays clickable badge ("Ignored" or "Tracked") per product for instant inventory mode switching
- ✅ **Smart filtering**: Products with ignoreInventory=true always appear in guest view regardless of stock; tracked products only show if in stock
- ✅ **Fixed schema bugs**: PostgreSQL enum casting and filter option validation issues resolved
- ✅ **Dynamic filter management**: Admins can add, edit, delete filter options via admin dashboard
- ✅ **Database-driven filters**: All filter options (categories, wine colors, sweetness, body, characteristics) managed in `filter_options` table
- ✅ **5 filter types**: category, wine_color, sweetness, body, characteristics - each fully customizable
- ✅ **Admin UI**: New "Filters" tab in admin dashboard with inline editing, sort order management, and active/inactive toggling
- ✅ **Guest experience**: ProductFilters component dynamically loads options from API, ensuring real-time updates
- ✅ **24 seeded options**: Pre-populated with all existing filter values for immediate use
- ✅ **Auto-popup trivia**: Trivia questions automatically appear every 4 minutes (no manual button)
- ✅ **10 random questions per session**: $5 credit awarded for perfect score (10/10 correct)
- ✅ **Heart icon in header**: Replaces "Try Trivia" button, opens favorites panel with count badge
- ✅ **Notes on ALL products**: New `product_notes` table enables tasting notes on any product, not just favorites
- ✅ **Enhanced thank you page**: Profile tab shows prominent thank you message before survey
- ✅ Welcome message modal after name entry explaining app purpose and emphasizing staff complement role
- ✅ Comprehensive 7-question tasting survey (4 rating scales + 3 text fields) for guest feedback
- ✅ 28 Nashoba-specific trivia questions (winery history, location, products, heritage)
- ✅ Product detail modal with favorites, notes, and add-to-cart
- ✅ Professional wine filtering (type, sweetness, body, characteristics)
- ✅ Category switching bug fix (wine filters isolated to Wine category)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

- **Framework**: React with TypeScript, using Vite for building.
- **UI**: shadcn/ui (built on Radix UI) and Tailwind CSS for styling. Custom theming supports light/dark modes. Typography uses Cormorant Garamond for headers and Inter for body text.
- **State Management**: TanStack Query for server state, `useState` for UI state. Session-based architecture tracks guest activity.
- **Design**: Mobile-first responsive design with bottom navigation. Card-based layouts with consistent spacing. Aesthetic inspired by Airbnb and Apple.

### Backend

- **Server**: Express.js with TypeScript, implementing a RESTful API. Handles session tracking without authentication.
- **Data Layer**: Drizzle ORM for type-safe PostgreSQL queries (via Neon serverless driver) and schema management.
- **Database Schema**: Includes `products` (detailed inventory with 32 fields including `ignoreInventory`), `guest_sessions`, `favorites`, `view_history`, `cart_items`, `product_notes` (notes on any product), `trivia_questions`, `trivia_scores`, `app_settings`, `surveys`, and `filter_options` (dynamic filter management).
- **Business Logic**: Automatic tier-based discount calculation (5-24% off for 3/6/12/24 bottles), trivia credit rewards ($5 for 10/10 trivia), and a multi-algorithm product recommendation engine.
- **Inventory Management**: Per-product `ignoreInventory` flag (default: true) allows products to always appear regardless of stock, or be tracked normally. Admin toggle UI provides instant control.
- **Dynamic Filtering**: Database-driven filter system with CRUD API endpoints, supporting 5 field types with customizable options, sort orders, and active/inactive states.

### AI Integration

- **OpenAI**: GPT-powered recommendation engine (GPT-4o-mini) that analyzes guest preferences (favorites, view history, cart) to provide sommelier-style product matching with natural language explanations. Requires a minimum of 2 guest interactions to activate.
- **Recommendation Strategies**: Similar products (characteristic-based), favorites-based, and AI-powered advanced analysis.

### Email System

- Server-side HTML email templates for cart orders and favorites summaries, including guest notes and discount breakdowns.

### Key Features

- **Guest Experience**: 
  - Welcome screen with name entry
  - Introduction modal explaining app purpose and staff complement role
  - Product browsing with advanced filtering (professional wine classification by type, sweetness, body, characteristics)
  - Product detail modal with favorites, notes (on ALL products), and add-to-cart
  - Favorites management accessible via heart icon in header with count badge
  - View history tracking
  - **Auto-popup trivia**: 10 random Nashoba-specific questions appear every 4 minutes
  - Shopping cart with tier-based discounts (5-24% off)
  - Trivia credit: $5 for perfect score (10/10 correct)
  - AI-powered recommendations (requires 2+ interactions)
  - **Tasting notes on any product**: Notes saved for all viewed products, not just favorites
  - Comprehensive 7-question tasting survey with prominent thank you message
  - Email order/favorites summary
  - Mobile-first bottom navigation
- **Admin Dashboard**: Product CRUD, stock toggling, **per-product inventory control** (toggle between "Ignored" and "Tracked" modes), filter options management, trivia management, settings, bulk product import via Excel with template download, "Fun Facts" field for products. Filter management allows adding/editing/deleting/reordering searchable options across 5 field types.

## External Dependencies

- **Core**: `react`, `react-dom`, `express`, `vite`, `typescript`, `drizzle-orm`, `@neondatabase/serverless`, `@tanstack/react-query`.
- **UI**: `@radix-ui/*`, `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `cmdk`, `embla-carousel-react`, `react-day-picker`.
- **Form Handling**: `react-hook-form`, `@hookform/resolvers`, `zod`, `drizzle-zod`.
- **Utilities**: `date-fns`, `wouter`, `nanoid`, `ws`.
- **Development Tools**: `@replit/vite-plugin-*`, `drizzle-kit`, `esbuild`, `tsx`.
- **AI/ML**: `openai` (requires `OPENAI_API_KEY`).
- **Database**: PostgreSQL (via Neon serverless, requires `DATABASE_URL`), `connect-pg-simple` for session persistence.