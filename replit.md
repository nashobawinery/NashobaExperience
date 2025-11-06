# Nashoba Tasting Experience App

## Overview

The Nashoba Tasting Experience App is a mobile-first digital companion for winery guests, enhancing their tasting experience. It offers product education, personalized AI-powered recommendations, engaging trivia, and streamlined purchasing, while also collecting valuable feedback. The app aims to provide a sophisticated, elegant, and practical tool to enrich the physical wine tasting journey.

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
- **Database Schema**: Includes `products` (detailed inventory with 31 fields), `guest_sessions`, `favorites`, `view_history`, `cart_items`, `trivia_questions`, `trivia_scores`, `app_settings`, and `surveys`.
- **Business Logic**: Automatic tier-based discount calculation (5-24% off for 3/6/12/24 bottles), trivia credit rewards, and a multi-algorithm product recommendation engine.

### AI Integration

- **OpenAI**: GPT-powered recommendation engine (GPT-4o-mini) that analyzes guest preferences (favorites, view history, cart) to provide sommelier-style product matching with natural language explanations. Requires a minimum of 2 guest interactions to activate.
- **Recommendation Strategies**: Similar products (characteristic-based), favorites-based, and AI-powered advanced analysis.

### Email System

- Server-side HTML email templates for cart orders and favorites summaries, including guest notes and discount breakdowns.

### Key Features

- **Guest Experience**: Welcome screen, product browsing with advanced filtering (including professional wine classification by type, sweetness, body, characteristics), product detail modal, favorites with notes, view history, shopping cart with discounts, AI recommendations, 10-question trivia with rewards, email order/favorites summary, mobile-first navigation.
- **Admin Dashboard**: Product CRUD, stock toggling, trivia management, settings, bulk product import via Excel with template download, "Fun Facts" field for products.

## External Dependencies

- **Core**: `react`, `react-dom`, `express`, `vite`, `typescript`, `drizzle-orm`, `@neondatabase/serverless`, `@tanstack/react-query`.
- **UI**: `@radix-ui/*`, `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `cmdk`, `embla-carousel-react`, `react-day-picker`.
- **Form Handling**: `react-hook-form`, `@hookform/resolvers`, `zod`, `drizzle-zod`.
- **Utilities**: `date-fns`, `wouter`, `nanoid`, `ws`.
- **Development Tools**: `@replit/vite-plugin-*`, `drizzle-kit`, `esbuild`, `tsx`.
- **AI/ML**: `openai` (requires `OPENAI_API_KEY`).
- **Database**: PostgreSQL (via Neon serverless, requires `DATABASE_URL`), `connect-pg-simple` for session persistence.