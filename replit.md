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
- **Database Schema**: Includes `products` (with 32+ fields, `ignoreInventory`, dedicated `sweetness` and `body` search criteria fields), `guest_sessions`, `favorites`, `view_history`, `cart_items`, `product_notes`, `trivia_questions`, `trivia_scores`, `app_settings`, `surveys`, `filter_options` (for dynamic filter management), and `slideshow_images` (for welcome slideshows).
- **Business Logic**: Implements automatic tier-based discount calculation (5-24% off), trivia credit rewards ($5 for 10/10), and a multi-algorithm product recommendation engine.
- **Inventory Management**: Features a per-product `ignoreInventory` flag for fine-grained stock control.
- **Dynamic Filtering**: A database-driven system supports 5 customizable filter types (category, wine_color, sweetness, body, characteristics) with CRUD operations for options, sort orders, and active/inactive states.

### AI Integration

- **OpenAI**: Utilizes GPT-4o-mini for a recommendation engine that analyzes guest preferences (favorites, view history, cart) to provide sommelier-style product matching with natural language explanations. Requires a minimum of 2 guest interactions.
- **Recommendation Strategies**: Includes characteristic-based, favorites-based, and AI-powered advanced analysis.

### Email System

- Server-side HTML email templates are used for sending cart orders and favorites summaries, including guest notes and discount breakdowns.

### Key Features

- **Guest Experience**: Interactive slideshow introduction, product browsing with advanced filtering, product detail modal with favorites and notes, progressive educational popups, auto-popup trivia with rewards, shopping cart with tier-based discounts, AI-powered recommendations, comprehensive tasting survey, email functionalities, and mobile-first navigation. Notes can be added to any product.
- **Admin Dashboard**: Comprehensive CRUD operations for products, per-product inventory control, dynamic filter and slideshow image management (upload, edit, delete, reorder, activate/deactivate), trivia management, a QR code generator for guest app access, settings, and bulk product import.

## Email System Status

**Current State**: Email functionality is **OPERATIONAL** using Resend API.

**Technical Details**:
- Email service: Resend (via `resend` npm package)
- API Key: Stored securely in `RESEND_API_KEY` environment secret
- Email templates: Fully functional HTML emails for cart orders and favorites
- Routes: `/api/sessions/:id/email/cart` and `/api/sessions/:id/email/favorites`
- Email recipients:
  - Cart orders → `onsiteorder@nashobawinery.com`
  - Favorites → User-provided email address

**Current Setup**:
- From address: `Nashoba Winery <onboarding@resend.dev>` (Resend's test domain)
- Status: Fully functional for testing and development

**IMPORTANT - Test Mode Restriction**:
When using Resend's test domain (`onboarding@resend.dev`), you can ONLY send emails to the email address you used to sign up for Resend. To send to other addresses, you must verify your domain.

**Production Setup**:
1. Go to https://resend.com/domains
2. Add and verify your domain (nashobawinery.com)
3. Once verified, add a secret `RESEND_FROM_EMAIL` with value like:
   - `Nashoba Winery <orders@nashobawinery.com>` or
   - `Nashoba Winery <noreply@nashobawinery.com>`
4. After this, you can send emails to any address!

## External Dependencies

- **Core**: `react`, `react-dom`, `express`, `vite`, `typescript`, `drizzle-orm`, `@neondatabase/serverless`, `@tanstack/react-query`.
- **UI**: `@radix-ui/*`, `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `cmdk`, `embla-carousel-react`, `react-day-picker`, `framer-motion`.
- **Form Handling**: `react-hook-form`, `@hookform/resolvers`, `zod`, `drizzle-zod`.
- **Utilities**: `date-fns`, `wouter`, `nanoid`, `ws`, `qrcode`.
- **AI/ML**: `openai`.
- **Database**: PostgreSQL (via Neon serverless), `connect-pg-simple`.