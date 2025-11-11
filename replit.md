# Nashoba Tasting Experience App

## Overview
The Nashoba Tasting Experience App is a mobile-first digital companion designed to enrich the wine tasting experience for winery guests. It offers product education, personalized AI-powered recommendations, engaging trivia, and a streamlined purchasing process, while also collecting valuable guest feedback. The app aims to be a sophisticated, elegant, and practical tool that complements the physical wine tasting journey. Key capabilities include a dynamic product catalog, interactive welcome experience, progressive educational popups, and comprehensive administrative tools. The project's ambition is to enhance guest engagement and provide valuable data for the winery.

## User Preferences
Preferred communication style: Simple, everyday language.

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

### Database Synchronization
- **Process**: Export/import system using multi-sheet Excel workbooks to synchronize database configuration between environments.

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