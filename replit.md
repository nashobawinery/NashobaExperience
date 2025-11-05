# Nashoba Tasting Experience App

## Overview

The Nashoba Tasting Experience App is an interactive digital companion for winery tasting room guests. It provides a sophisticated mobile-first experience that educates guests about products, offers personalized AI-powered recommendations, engages users with trivia challenges, and facilitates purchases while collecting valuable feedback. The app combines elegant design with practical functionality to enhance the physical wine tasting experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build Tools**
- React with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR and optimized production builds
- Wouter for lightweight client-side routing

**UI Component System**
- shadcn/ui component library built on Radix UI primitives for accessible, customizable components
- Tailwind CSS for utility-first styling with custom design tokens
- Custom theming system with CSS variables supporting light/dark modes
- Typography hierarchy: Cormorant Garamond (serif) for headers and elegant moments, Inter (sans-serif) for body text and UI elements

**State Management**
- TanStack Query (React Query) for server state management, caching, and data synchronization
- Local React state (useState) for UI state and user interactions
- Session-based architecture tracking guest activity throughout their tasting experience

**Design Approach**
- Mobile-first responsive design optimized for one-handed thumb reach
- Bottom navigation pattern for primary app sections (Browse, Favorites, AI Picks, Cart, Profile)
- Card-based layout system with consistent spacing using Tailwind's 4/6/8/12/16/24 unit scale
- Premium hospitality aesthetic inspired by Airbnb's warmth and Apple's sophistication

### Backend Architecture

**Server Framework**
- Express.js server with TypeScript
- RESTful API design pattern
- Session-based guest tracking without authentication requirements
- Middleware for request logging, JSON parsing, and CORS handling

**Data Layer**
- Drizzle ORM for type-safe database queries and schema management
- PostgreSQL database via Neon serverless driver
- Connection pooling for efficient database resource management
- Schema-first approach with automatic TypeScript type generation

**Database Schema Design**
- `products`: Wine, spirits, beer, and cocktail inventory with detailed attributes (wine color, sweetness, body, ABV, tasting notes, food pairings)
- `guest_sessions`: Temporary user sessions tracking individual tasting experiences
- `favorites`: Guest-saved products with optional personal notes
- `view_history`: Automatic tracking of product views for preference learning
- `cart_items`: Shopping cart with quantity and custom notes per item
- `trivia_questions`: Interactive quiz content with multiple choice answers and explanations
- `trivia_scores`: Guest performance tracking for gamification
- `app_settings`: Configurable system parameters (trivia timing, discounts)
- `surveys`: Post-tasting feedback collection

**Business Logic Patterns**
- Automatic discount calculation based on quantity tiers (3/6/12/24 bottles)
- Trivia credit rewards system integrated with checkout
- Product recommendation engine using multiple algorithms (similarity-based, favorites-based, AI-powered)
- Session activity tracking with automatic timeout handling

### AI Integration

**OpenAI Integration**
- GPT-powered recommendation engine analyzing guest preferences
- Context building from favorites, view history, and cart items
- Natural language explanations for each recommendation
- Sommelier-style product matching based on taste profiles and characteristics
- Minimum 2 interactions required before activating AI recommendations

**Recommendation Strategies**
1. Similar Products: Characteristic-based matching (wine color, sweetness, body, flavor notes)
2. Based on Favorites: Pattern recognition from saved items
3. AI-Powered: Advanced machine learning analysis with personalized reasoning

### Email System

**Email Generation**
- Server-side HTML email templates for cart orders and favorites summaries
- Structured data formatting for tasting room staff
- Guest preference notes included in order communications
- Discount and trivia credit breakdown in checkout emails

## External Dependencies

**Core Framework Dependencies**
- `react` & `react-dom`: Frontend framework (v18+)
- `express`: Backend web server
- `vite`: Build tool and development server
- `typescript`: Type checking and compilation
- `drizzle-orm`: Database ORM
- `@neondatabase/serverless`: PostgreSQL serverless driver
- `@tanstack/react-query`: Data fetching and caching

**UI Component Libraries**
- `@radix-ui/*`: Accessible headless UI primitives (accordion, alert-dialog, avatar, checkbox, dialog, dropdown-menu, label, popover, radio-group, scroll-area, select, separator, slider, switch, tabs, toast, tooltip)
- `tailwindcss`: Utility-first CSS framework
- `class-variance-authority`: Component variant management
- `clsx` & `tailwind-merge`: Class name utilities
- `lucide-react`: Icon library
- `cmdk`: Command palette component
- `embla-carousel-react`: Carousel/slider functionality
- `react-day-picker`: Date picker component

**Form Handling**
- `react-hook-form`: Form state management and validation
- `@hookform/resolvers`: Validation schema resolvers
- `zod`: Schema validation
- `drizzle-zod`: Drizzle schema to Zod conversion

**Additional Utilities**
- `date-fns`: Date manipulation and formatting
- `wouter`: Lightweight routing
- `nanoid`: Unique ID generation
- `ws`: WebSocket support for Neon database

**Development Tools**
- `@replit/vite-plugin-*`: Replit-specific development enhancements
- `drizzle-kit`: Database migration tool
- `esbuild`: JavaScript bundler for production builds
- `tsx`: TypeScript execution for development server

**AI/ML Services**
- `openai`: GPT API integration for personalized recommendations (requires OPENAI_API_KEY environment variable)

**Database**
- PostgreSQL (via Neon serverless) - requires DATABASE_URL environment variable
- Connection pooling via `@neondatabase/serverless`
- Schema management via Drizzle migrations

**Session Management**
- `connect-pg-simple`: PostgreSQL session store for Express
- Session data persisted to database for guest continuity