# Nashoba Tasting Experience App - Design Guidelines

## Design Approach
**Reference-Based: Premium Hospitality & Boutique Retail**
Drawing inspiration from Airbnb's warmth, Apple's sophistication, and premium wine apps (Vivino, Wine-Searcher). This experience-focused app prioritizes elegance, ease of use while holding a wine glass, and creating an elevated tasting room companion.

## Core Design Principles
1. **Sophisticated Simplicity** - Refined, uncluttered interfaces that feel premium without complexity
2. **One-Handed Mobile First** - All interactions optimized for thumb reach on mobile devices
3. **Gentle Guidance** - Subtle animations and micro-interactions that guide without distracting from the wine
4. **Sensory Connection** - Visual design that complements the physical tasting experience

## Typography System
**Primary Font:** Cormorant Garamond (serif) - Headers, product names, elegant moments
**Secondary Font:** Inter (sans-serif) - Body text, UI elements, data

**Hierarchy:**
- Hero/Welcome: 48px Cormorant, light weight
- Section Headers: 32px Cormorant, regular
- Product Names: 24px Cormorant, medium
- Subheadings: 18px Inter, semibold
- Body Text: 16px Inter, regular
- Small Text/Labels: 14px Inter, medium
- Micro Copy: 12px Inter, regular

## Layout & Spacing System
**Tailwind Units:** Consistent use of 4, 6, 8, 12, 16, 24 for spacing
- Card padding: p-6
- Section spacing: py-12 (mobile), py-16 (desktop)
- Element gaps: gap-4 (tight), gap-6 (standard), gap-8 (generous)
- Container max-width: max-w-7xl with px-4 (mobile), px-6 (tablet), px-8 (desktop)

**Grid System:**
- Product Cards: grid-cols-1 (mobile), grid-cols-2 (tablet), grid-cols-3 (desktop)
- Admin Dashboard: grid-cols-1 (mobile), grid-cols-2 (large screens for side-by-side panels)

## Component Library

### Navigation
**Mobile App Navigation (Primary):**
- Bottom tab bar with 4-5 large touch targets (min 56px height)
- Icons with labels: Browse, Favorites, Cart, Trivia, Profile
- Active state with burgundy accent and subtle elevation

**Admin Navigation:**
- Side drawer on mobile, persistent sidebar on desktop (280px width)
- Collapsible sections: Products, Import/Export, Fun Facts, Settings

### Product Cards
- Rounded corners (rounded-xl)
- Elevated cards with subtle shadow (shadow-md on hover: shadow-lg)
- Product image: 16:9 aspect ratio, object-cover
- Heart icon (favorite) positioned top-right with backdrop blur
- Price badge: gold background, absolute positioned bottom-right
- Card content: p-4 with product name, category, quick descriptor
- View count indicator: small badge, cream background

### Buttons & CTAs
**Primary Actions:** Burgundy background, cream text, rounded-lg, py-3 px-6, font-medium
**Secondary Actions:** Cream background, burgundy text, border-2 burgundy, rounded-lg
**Tertiary/Text:** Burgundy text, underline on hover
**Icon Buttons:** 44px minimum touch target, rounded-full, burgundy hover background with opacity
**Floating Action:** Fixed bottom-right (desktop) or bottom center (mobile), rounded-full, shadow-xl, burgundy

### Forms & Inputs
- Rounded inputs (rounded-lg), border-2 cream, focus:border-burgundy
- Large touch targets: py-3 px-4, text-16px minimum
- Labels above inputs: text-14px, font-medium, mb-2
- Error states: border-red with red text below
- Success states: border-green with checkmark icon

### Cards & Containers
**Product Detail Card:** Full-width mobile, max-w-4xl desktop, p-8, rounded-2xl
**Trivia Popup:** Modal overlay with blur backdrop, centered card, rounded-2xl, p-6, max-w-lg
**Cart Summary:** Sticky bottom on mobile, sidebar on desktop, elevated with shadow-xl
**Admin Panels:** White background, rounded-xl, p-6, shadow-sm

### Modals & Overlays
- Backdrop: bg-dark/70 with backdrop-blur-sm
- Modal: max-w-2xl, rounded-2xl, p-8, centered
- Close button: top-right, 44px touch target
- Smooth entrance: fade + scale animation (duration-300)

### Badges & Tags
- Wine Type: Small rounded-full badges, 8px height indicator bar in wine color
- Price Tier: Gold background, burgundy text, rounded-full, px-3 py-1
- Discount Applied: Green background, white text, rounded-md
- Staff Pick: Gold star icon + "Staff Pick" label

### Data Display
**Stats Dashboard (Admin):**
- Large numbers: 36px Cormorant
- Grid of stat cards: p-6, rounded-lg, border cream
- Trend indicators: arrows with green/burgundy

**Product Details:**
- Two-column layout on desktop (image left, details right)
- Characteristics grid: 2 columns, icon + label + value
- Tasting notes: blockquote style, italic, cream background, p-4, rounded-lg

## Images
**Hero Section (Welcome Screen):**
- Full-screen video background (aerial winery footage)
- Overlay gradient: dark burgundy to transparent (top to bottom)
- Centered welcome message and name input over video
- Video should autoplay, loop, muted

**Product Images:**
- High-quality bottle photography on neutral backgrounds
- 1:1 aspect ratio for grid thumbnails
- 3:4 or 4:5 for detail pages
- Placeholder for missing images: cream background with bottle icon

**Trivia Questions:**
- Optional accompanying images (landscape 16:9)
- Rounded corners, positioned above question text
- Related to wine/winery facts visually

**Admin Interface:**
- Product upload: drag-drop area with preview thumbnails
- Icon-based empty states for no data scenarios

## Animations & Interactions
**Minimal & Purposeful:**
- Card hover: subtle lift (translateY -2px, shadow increase)
- Button press: slight scale (0.98)
- Page transitions: smooth fade, duration-200
- Heart favorite: scale pulse + color change
- Trivia popup: fade + scale entrance
- Cart count badge: pulse animation when items added
- AI recommendations reveal: stagger fade-in for each product (100ms delay between)
- Success states: subtle confetti for trivia perfect score
- **No scroll-triggered animations** - keeps focus on wine tasting

## Mobile-Specific Considerations
- Bottom navigation always visible and accessible
- Thumb-zone optimization: primary actions in bottom 2/3 of screen
- Generous tap targets: minimum 44px x 44px
- Sticky cart summary at bottom with swipe-up to expand
- Pull-to-refresh on product lists
- Haptic feedback for favorites/cart additions (if supported)

## Admin Dashboard Specifics
- Desktop-first for admin tasks
- Data tables: striped rows, hover states, sortable headers
- Bulk action toolbar appears when items selected
- Import preview: side-by-side comparison (current vs. new)
- Settings: live preview pane showing changes before save
- Form validation: inline, real-time for better UX

This design creates a refined, tactile digital experience that enhances rather than distracts from the physical wine tasting, while maintaining professionalism and ease of use for staff administration.