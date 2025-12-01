import { registerModuleDocs } from "./index";

registerModuleDocs({
  moduleKey: "tasting",
  moduleName: "Tasting Experience App",
  description: "Guest-facing digital tasting companion",
  lastUpdated: "2024-12-01",
  sections: [
    {
      id: "overview",
      title: "Overview",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            The Nashoba Tasting Experience App is a mobile-first digital companion designed to enhance 
            the guest experience during wine tastings. The app provides product education, personalized 
            AI-powered recommendations, engaging trivia, streamlined purchasing, and valuable feedback 
            collection. It complements—never replaces—the expertise and personal touch of our staff.
          </p>
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
                a beautiful 4-slide introduction featuring winery photos.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">2</span>
                Product Discovery
              </h4>
              <p className="text-sm text-muted-foreground ml-8">
                Browse products with powerful filtering (category, color, sweetness, body, characteristics). 
                View detailed product cards with images, descriptions, and tasting notes.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">3</span>
                AI Recommendations
              </h4>
              <p className="text-sm text-muted-foreground ml-8">
                After 2+ interactions, GPT-4 analyzes preferences and provides sommelier-style 
                recommendations with natural language explanations.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">4</span>
                Cart & Checkout
              </h4>
              <p className="text-sm text-muted-foreground ml-8">
                Add products to cart with automatic discount calculations. Email cart as an order 
                for staff to process.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "admin-tools",
      title: "Admin Dashboard Tools",
      content: (
        <div className="space-y-3">
          <div className="border-l-4 border-primary pl-4">
            <h5 className="font-medium">Products Tab</h5>
            <p className="text-sm text-muted-foreground">
              Full CRUD operations for managing product inventory. Edit all 32+ fields including 
              descriptions, images, pricing, stock levels, wine details, and tasting notes.
            </p>
          </div>
          <div className="border-l-4 border-primary pl-4">
            <h5 className="font-medium">Import/Export Tab</h5>
            <p className="text-sm text-muted-foreground">
              Bulk import/update products via Excel file. Download a template with proper column 
              structure, fill it in, and upload to create or update multiple products at once.
            </p>
          </div>
          <div className="border-l-4 border-primary pl-4">
            <h5 className="font-medium">Filters Tab</h5>
            <p className="text-sm text-muted-foreground">
              Manage all filter options (categories, wine colors, sweetness, body, characteristics). 
              Add, edit, delete, reorder, and activate/deactivate options.
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
            <h5 className="font-medium">Fun Facts Tab</h5>
            <p className="text-sm text-muted-foreground">
              Create and manage trivia questions that appear to guests every 4 minutes. Each 
              question includes 4 possible answers, explanation, and difficulty level.
            </p>
          </div>
          <div className="border-l-4 border-primary pl-4">
            <h5 className="font-medium">QR Code Tab</h5>
            <p className="text-sm text-muted-foreground">
              Generate a QR code that guests can scan to access the app. Download as PNG for 
              digital signage or print directly for physical display.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "key-features",
      title: "Key Features",
      content: (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Product-Agnostic Language</h4>
            <p className="text-sm text-muted-foreground">
              Uses generic "product" terminology, suitable for wines, spirits, beers, canned 
              cocktails, and ciders.
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Mobile-First Design</h4>
            <p className="text-sm text-muted-foreground">
              Optimized for smartphones with bottom navigation, elegant card layouts, and 
              burgundy/gold color scheme.
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Session-Based Tracking</h4>
            <p className="text-sm text-muted-foreground">
              No login required. Each guest's preferences, favorites, cart, and notes are 
              tracked throughout their visit.
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Inventory Control</h4>
            <p className="text-sm text-muted-foreground">
              Per-product toggle: "Ignored" products always appear; "Tracked" products only 
              show when in stock.
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Favorites & Notes</h4>
            <p className="text-sm text-muted-foreground">
              Guests can favorite products and add personal tasting notes, creating a 
              personalized tasting journal.
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">AI Recommendations</h4>
            <p className="text-sm text-muted-foreground">
              GPT-4 powered recommendation engine analyzes guest preferences to suggest 
              products with natural language explanations.
            </p>
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
          <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
            <h4 className="font-medium mb-2">How to Introduce the App</h4>
            <p className="text-sm text-muted-foreground italic">
              "We have a digital companion app you can access by scanning this QR code. It has 
              product details, tasting notes, and fun trivia about Nashoba. Feel free to use it 
              during your visit, and don't hesitate to ask me any questions!"
            </p>
          </div>
          <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
            <h4 className="font-medium mb-2">Handling Orders</h4>
            <p className="text-sm text-muted-foreground">
              When guests email their cart, the order arrives at onsiteorder@nashobawinery.com 
              with full details, guest notes, and discount calculations.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "technical-info",
      title: "Technical Information",
      content: (
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Email Configuration</h4>
              <p className="text-sm text-muted-foreground">
                Orders sent to: <span className="font-mono">onsiteorder@nashobawinery.com</span>
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Trivia Timing</h4>
              <p className="text-sm text-muted-foreground">
                Auto-popup every 4 minutes with 10 random questions
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">AI Requirements</h4>
              <p className="text-sm text-muted-foreground">
                Minimum 2 guest interactions to activate recommendations
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Database</h4>
              <p className="text-sm text-muted-foreground">
                PostgreSQL with real-time updates across all features
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ],
});
