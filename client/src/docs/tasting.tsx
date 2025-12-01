import { registerModuleDocs } from "./index";

registerModuleDocs({
  moduleKey: "tasting",
  moduleName: "Tasting Experience App",
  description: "Guest-facing digital tasting companion for wine and beverage experiences",
  lastUpdated: "2024-12-01",
  sections: [
    {
      id: "overview",
      title: "Overview",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            The Nashoba Tasting Experience App is a mobile-first digital companion designed to enhance 
            the guest experience during wine and beverage tastings. The app provides product education, 
            personalized AI-powered recommendations, engaging trivia with rewards, streamlined purchasing, 
            and valuable feedback collection. It complements—never replaces—the expertise and personal touch of our staff.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Product Discovery</h4>
              <p className="text-sm text-muted-foreground">
                Browse wines, spirits, beers, and canned cocktails with powerful filtering and search.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">AI Recommendations</h4>
              <p className="text-sm text-muted-foreground">
                GPT-4 powered sommelier-style suggestions based on guest preferences and activity.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Trivia & Rewards</h4>
              <p className="text-sm text-muted-foreground">
                Fun wine trivia with achievement-based rewards like discounts and tasting tokens.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "guest-flow",
      title: "Guest Experience Flow",
      content: (
        <div className="space-y-4">
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">1</span>
                Welcome & Introduction
              </h4>
              <p className="text-sm text-muted-foreground ml-8">
                Guests scan a QR code to access the app. They enter their name and are greeted with 
                a beautiful 4-slide introduction featuring winery photos and welcome messaging.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">2</span>
                Product Discovery
              </h4>
              <p className="text-sm text-muted-foreground ml-8">
                Browse products with powerful filtering by category, price, and beverage-specific attributes 
                (wine color, sweetness, body for wines; style, bitterness for beers; type, aging for spirits). 
                View detailed product cards with images, descriptions, and tasting notes.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">3</span>
                Favorites & Notes
              </h4>
              <p className="text-sm text-muted-foreground ml-8">
                Guests can heart their favorite products and add personal tasting notes, creating a 
                personalized tasting journal they can reference throughout their visit.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">4</span>
                AI Recommendations
              </h4>
              <p className="text-sm text-muted-foreground ml-8">
                After 2+ interactions (favorites, cart adds, or notes), GPT-4 analyzes preferences and provides 
                sommelier-style recommendations with natural language explanations. Guests can also complete a 
                preference questionnaire for immediate personalized picks.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">5</span>
                Trivia Challenge
              </h4>
              <p className="text-sm text-muted-foreground ml-8">
                Every 4 minutes (configurable), a wine trivia popup appears with 10 random questions. 
                Guests can earn achievements based on their score, unlocking discounts or tasting tokens.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">6</span>
                Cart & Checkout
              </h4>
              <p className="text-sm text-muted-foreground ml-8">
                Add products to cart with automatic volume discount calculations. Email cart as an order 
                for staff to process. Discounts apply for bottle bundles and canned product bundles.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "product-categories",
      title: "Product Categories & Filters",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The app supports multiple beverage categories, each with specialized filtering options:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Wine</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Color</strong>: Red, White, Rosé, Sparkling</li>
                <li>• <strong>Sweetness</strong>: Dry to Sweet scale</li>
                <li>• <strong>Body</strong>: Light to Full</li>
                <li>• <strong>Characteristics</strong>: Fruity, Oaky, Tannic, etc.</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Beer</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Style</strong>: IPA, Lager, Stout, Wheat, etc.</li>
                <li>• <strong>Color</strong>: Pale to Dark</li>
                <li>• <strong>Bitterness</strong>: Low to High IBU</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Spirits</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Type</strong>: Whiskey, Vodka, Rum, Brandy, etc.</li>
                <li>• <strong>Aging</strong>: Unaged to Aged</li>
                <li>• <strong>Flavor Profile</strong>: Smooth, Bold, Spicy, etc.</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Canned Products</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Canned Cocktails</strong>: Ready-to-drink mixed drinks</li>
                <li>• <strong>Canned Wine</strong>: Single-serve wine options</li>
                <li>• <strong>Cider</strong>: Apple and fruit ciders</li>
              </ul>
            </div>
          </div>
          <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
            <h4 className="font-medium mb-2">Dynamic Filter Options</h4>
            <p className="text-sm text-muted-foreground">
              All filter options are configurable from the Admin Dashboard's Filters tab. You can add, edit, 
              reorder, and activate/deactivate any filter option without code changes.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "discounts",
      title: "Discount System",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The app applies automatic discounts based on quantity purchased and trivia achievements:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Bottle Discounts (Wine & Spirits)</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Volume-based discounts with configurable tiers:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Tier 1</strong>: 3-5 bottles = X% off</li>
                <li>• <strong>Tier 2</strong>: 6-8 bottles = X% off</li>
                <li>• <strong>Tier 3</strong>: 9-11 bottles = X% off</li>
                <li>• <strong>Tier 4</strong>: 12+ bottles = X% off</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Canned Product Discounts</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Separate tier structure for beer, canned cocktails, and canned wine:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Tier 1</strong>: 4-7 units = X% off</li>
                <li>• <strong>Tier 2</strong>: 8-11 units = X% off</li>
                <li>• <strong>Tier 3</strong>: 12-23 units = X% off</li>
                <li>• <strong>Tier 4</strong>: 24+ units = X% off</li>
              </ul>
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Trivia Achievements</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Guests can earn rewards based on their trivia score:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Discount Rewards</strong>: Dollar amount off their purchase (e.g., "Score 7+, get $5 off")</li>
              <li>• <strong>Tasting Token Rewards</strong>: Free tasting credits redeemable with staff</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              Achievement thresholds and rewards are fully configurable in Admin Settings.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "admin-tools",
      title: "Admin Dashboard Tools",
      content: (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground mb-4">
            The Tasting Experience Admin Dashboard provides comprehensive tools for managing all aspects of the guest app:
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Products Tab</h5>
              <p className="text-sm text-muted-foreground">
                Full CRUD operations for managing product inventory. Edit all 32+ fields including 
                descriptions, images, pricing, stock levels, wine details, tasting notes, and badges 
                (Staff Pick, Featured, New Arrival, Wine of Month).
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Product Media Tab</h5>
              <p className="text-sm text-muted-foreground">
                Manage product images with role assignments (primary, label, lifestyle, gallery). 
                Link media library items to products.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Import/Export Tab</h5>
              <p className="text-sm text-muted-foreground">
                Bulk import/update products via Excel file. Download templates with proper column 
                structure. Export all products or specific data for backup/analysis.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Filters Tab</h5>
              <p className="text-sm text-muted-foreground">
                Manage all filter options for each category (wine color, sweetness, body, beer style, etc.). 
                Add, edit, delete, reorder, and activate/deactivate options dynamically.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Slideshow Tab</h5>
              <p className="text-sm text-muted-foreground">
                Upload and manage winery photos for the welcome screen slideshow. Add captions, 
                descriptions, reorder slides, and activate/deactivate images.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Commercials Tab</h5>
              <p className="text-sm text-muted-foreground">
                Manage promotional video content that can be displayed during the tasting experience.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Media Library Tab</h5>
              <p className="text-sm text-muted-foreground">
                Central repository for all uploaded images and files. Organize by category, 
                add descriptions and alt text, manage file metadata.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Object Storage Tab</h5>
              <p className="text-sm text-muted-foreground">
                Manage cloud storage for media files. View storage usage, upload files directly, 
                and organize assets in public/private directories.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Videos Tab</h5>
              <p className="text-sm text-muted-foreground">
                Upload and manage video content including welcome videos and promotional content.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Fun Facts (Trivia) Tab</h5>
              <p className="text-sm text-muted-foreground">
                Create and manage trivia questions with 4 answer options, explanations, and optional images. 
                Bulk delete and activate/deactivate questions.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">QR Code Tab</h5>
              <p className="text-sm text-muted-foreground">
                Generate QR codes for guest app access. Download as PNG for digital signage 
                or print directly for physical display.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Settings Tab</h5>
              <p className="text-sm text-muted-foreground">
                Configure discount tiers, trivia timing, order recipient emails, user role management, 
                and email whitelist for admin access.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "inventory",
      title: "Inventory Management",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Each product has inventory tracking options to control visibility in the guest app:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Ignored Inventory</h4>
              <p className="text-sm text-muted-foreground">
                Products marked as "Ignore Inventory" always appear in the guest app regardless of 
                stock quantity. Use this for products that are always available.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Tracked Inventory</h4>
              <p className="text-sm text-muted-foreground">
                Products with tracked inventory only appear when stock quantity is greater than zero. 
                Set low stock thresholds for alerts.
              </p>
            </div>
          </div>
          <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
            <h4 className="font-medium mb-2">Product Badges</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Staff Pick</strong>: Highlight staff-recommended products</li>
              <li>• <strong>Featured</strong>: Showcase products prominently</li>
              <li>• <strong>New Arrival</strong>: Flag recently added products</li>
              <li>• <strong>Wine of Month</strong>: Monthly feature spotlight</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "staff-guidelines",
      title: "Staff Guidelines",
      content: (
        <div className="space-y-4">
          <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
            <h4 className="font-medium mb-2">The App Complements, Never Replaces</h4>
            <p className="text-sm text-muted-foreground mb-3">
              The app enhances the tasting experience, not replace staff expertise. Encourage guests to:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Use the app while waiting or between tastings</li>
              <li>• Reference product details during conversations</li>
              <li>• Share their favorites with staff for better recommendations</li>
              <li>• Ask staff questions beyond what the app provides</li>
            </ul>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">How to Introduce the App</h4>
            <p className="text-sm text-muted-foreground italic">
              "We have a digital companion app you can access by scanning this QR code. It has 
              product details, tasting notes, and fun trivia about Nashoba. Feel free to use it 
              during your visit, and don't hesitate to ask me any questions!"
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Handling Orders</h4>
            <p className="text-sm text-muted-foreground">
              When guests email their cart, the order arrives at the configured order recipient email(s) 
              with full details, guest notes, and discount calculations. Process as you would any order.
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Trivia Token Redemption</h4>
            <p className="text-sm text-muted-foreground">
              If a guest earns a tasting token through trivia, they'll show you their reward screen. 
              Verify the achievement and provide the complimentary tasting.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "technical-info",
      title: "Technical Information",
      content: (
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Session Tracking</h4>
                <p className="text-sm text-muted-foreground">
                  No login required. Each guest session tracks preferences, favorites, cart, and notes 
                  using browser session storage.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Trivia Timing</h4>
                <p className="text-sm text-muted-foreground">
                  Configurable popup interval (default: 4 minutes) with 10 random questions per session.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">AI Requirements</h4>
                <p className="text-sm text-muted-foreground">
                  Minimum 2 guest interactions to activate AI recommendations. Uses GPT-4 for natural 
                  language product suggestions.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Mobile-First Design</h4>
                <p className="text-sm text-muted-foreground">
                  Optimized for smartphones with bottom navigation, touch-friendly cards, and 
                  responsive layouts.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Order Emails</h4>
                <p className="text-sm text-muted-foreground">
                  Configure recipient emails in Settings. Orders include guest name, items, quantities, 
                  notes, and calculated discounts.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Database</h4>
                <p className="text-sm text-muted-foreground">
                  PostgreSQL with real-time updates across all features. Changes in admin dashboard 
                  reflect immediately in guest app.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ],
});
