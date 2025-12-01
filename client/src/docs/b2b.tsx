import { registerModuleDocs } from "./index";

registerModuleDocs({
  moduleKey: "b2b",
  moduleName: "B2B Wholesale Platform",
  description: "Business-to-business wholesale ordering, customer management, and sales operations",
  lastUpdated: "2024-12-01",
  sections: [
    {
      id: "overview",
      title: "Overview",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            The B2B Wholesale Platform enables wholesale customers to browse products, place orders, 
            and manage their accounts. It includes separate portals for customers, sales representatives, 
            and administrators with role-based access control for all features.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Customer Portal</h4>
              <p className="text-sm text-muted-foreground">
                Wholesale customers browse products, view tier-specific pricing, place orders, 
                and track order history.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Sales Rep Portal</h4>
              <p className="text-sm text-muted-foreground">
                Sales reps manage assigned customers, place orders on their behalf, and track commissions.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Admin Dashboard</h4>
              <p className="text-sm text-muted-foreground">
                Full control over customers, orders, pricing tiers, sales team, payroll, and marketing.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "customer-types",
      title: "Customer Types & Registration",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The platform supports different wholesale customer types, each with specific registration requirements:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Customer Types</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Retail Liquor</strong>: Package stores and liquor retailers</li>
                <li>• <strong>Restaurant</strong>: Restaurants and dining establishments</li>
                <li>• <strong>Private Club</strong>: Country clubs and private venues</li>
                <li>• <strong>Other</strong>: Other wholesale business types</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Registration Fields</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Business name and type</li>
                <li>• License number and Tax ID</li>
                <li>• Primary contact information</li>
                <li>• Billing and shipping addresses</li>
                <li>• Multiple location support</li>
              </ul>
            </div>
          </div>
          <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
            <h4 className="font-medium mb-2">Approval Workflow</h4>
            <p className="text-sm text-muted-foreground">
              New registrations go to "Pending" status and require admin approval. Admins can approve, 
              reject, or request additional information. Approved customers receive login credentials via email.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "pricing-tiers",
      title: "Pricing Tiers",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pricing tiers allow you to offer different discount levels to different customer segments, 
            with category-specific pricing for maximum flexibility:
          </p>
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-3">How Tiers Work</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Create a tier with a descriptive name (e.g., "Premium", "Standard", "Basic")</li>
              <li>Set discount percentages for each product category (Wine, Spirits, Beer, etc.)</li>
              <li>Assign customers to the appropriate tier</li>
              <li>Customers see their tier-specific pricing automatically when browsing</li>
            </ol>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Category-Specific Discounts</h4>
              <p className="text-sm text-muted-foreground">
                Each tier can have different discount percentages per category. A "Premium" tier might 
                offer 20% off wines, 15% off spirits, and 10% off canned products.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Profit Margin Display</h4>
              <p className="text-sm text-muted-foreground">
                The pricing sheet shows customers their potential profit margins based on suggested 
                retail prices and their tier discounts.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "order-management",
      title: "Order Management",
      content: (
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-3">Order Workflow</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Customer or sales rep creates order with product selections</li>
              <li>System calculates pricing based on customer's tier discounts</li>
              <li>Order submitted with status "Pending"</li>
              <li>Admin reviews and updates status (Confirmed → Shipped → Delivered)</li>
              <li>Order history maintained for reporting and reordering</li>
            </ol>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Order Statuses</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Pending</strong>: Awaiting admin review</li>
                <li>• <strong>Confirmed</strong>: Order accepted, preparing</li>
                <li>• <strong>Shipped</strong>: In transit to customer</li>
                <li>• <strong>Delivered</strong>: Successfully delivered</li>
                <li>• <strong>Cancelled</strong>: Order cancelled</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Order Features</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Multi-location delivery support</li>
                <li>• Order notes and special instructions</li>
                <li>• Quick reorder from order history</li>
                <li>• Order confirmation emails</li>
                <li>• PDF invoice generation</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "sales-reps",
      title: "Sales Representatives",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sales representatives have their own portal to manage assigned customers and earn commissions:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Sales Rep Capabilities</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• View and manage assigned customers only</li>
                <li>• Place orders on behalf of customers</li>
                <li>• View order history for their accounts</li>
                <li>• Access customer contact information</li>
                <li>• Add notes to customer accounts</li>
                <li>• Track personal commissions</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Assignment & Territories</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Assign sales reps to customers from admin</li>
                <li>• Each customer can have one assigned rep</li>
                <li>• Sales reps can have multiple customers</li>
                <li>• Territory-based assignment optional</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "commissions",
      title: "Commissions & Payroll",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Track and manage sales rep commissions with flexible calculation and payout options:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Commission Tracking</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Automatic commission calculation on orders</li>
                <li>• Configurable commission percentages</li>
                <li>• Track earned vs. paid commissions</li>
                <li>• Commission history by period</li>
                <li>• Backfill missing commissions tool</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Payroll Management</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Configure pay periods</li>
                <li>• Generate payroll reports</li>
                <li>• Mark commissions as paid</li>
                <li>• Export for accounting integration</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "admin-tabs",
      title: "Admin Dashboard Tabs",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            The B2B Admin Dashboard is organized into categorized sections for efficient management:
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Customers Tab</h5>
              <p className="text-sm text-muted-foreground">
                Manage pending, active, and inactive customers. Approve registrations, edit details, 
                assign pricing tiers, manage locations, and set sales rep assignments.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Orders Tab</h5>
              <p className="text-sm text-muted-foreground">
                View and manage all orders. Update statuses, add notes, view order details, 
                and create orders on behalf of customers.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Tasks Tab</h5>
              <p className="text-sm text-muted-foreground">
                Track operational tasks and follow-ups related to customer management and orders.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Data (Export/Import) Tab</h5>
              <p className="text-sm text-muted-foreground">
                Bulk export and import customer data via Excel. Download templates, import new 
                customers, and update existing records.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Marketing Tab</h5>
              <p className="text-sm text-muted-foreground">
                Manage B2B-specific email templates and marketing campaigns. Configure automated 
                emails for order confirmations, approvals, and promotions.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Commitments Tab</h5>
              <p className="text-sm text-muted-foreground">
                Track customer commitment progress toward tier requirements. Monitor annual volumes 
                and commitment fulfillment.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">QR Codes Tab</h5>
              <p className="text-sm text-muted-foreground">
                Generate QR codes for various B2B portal entry points and marketing materials.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Slideshow Tab</h5>
              <p className="text-sm text-muted-foreground">
                Manage promotional slideshow images displayed on the B2B portal.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Sales Reps Tab</h5>
              <p className="text-sm text-muted-foreground">
                Manage sales representative accounts, territories, and commission settings.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Settings Tab</h5>
              <p className="text-sm text-muted-foreground">
                Configure pricing tiers, welcome statements, and platform-wide B2B settings.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Payroll Tab</h5>
              <p className="text-sm text-muted-foreground">
                Configure payroll settings, pay periods, and manage commission payouts.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Commissions Tab</h5>
              <p className="text-sm text-muted-foreground">
                View and manage all commission records, backfill missing entries, and export reports.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "customer-portal",
      title: "Customer Portal Features",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Features available to approved wholesale customers in their portal:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Product Catalog</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Browse products with search and filters</li>
                <li>• View tier-specific wholesale pricing</li>
                <li>• See profit margin calculations</li>
                <li>• Product detail views with images</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Ordering</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Add items to cart</li>
                <li>• Select delivery location</li>
                <li>• Add order notes</li>
                <li>• View order history</li>
                <li>• Quick reorder past orders</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Account Management</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Update business information</li>
                <li>• Manage multiple locations</li>
                <li>• Change password</li>
                <li>• View assigned sales rep</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Where to Buy</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Opt-in to appear on public locator</li>
                <li>• Display store location on map</li>
                <li>• Help consumers find your store</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "authentication",
      title: "Authentication & Security",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The B2B platform uses separate email/password authentication (distinct from platform SSO):
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Login Types</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Customer Login</strong>: For approved wholesale customers</li>
                <li>• <strong>Sales Rep Login</strong>: For sales representatives</li>
                <li>• <strong>Admin Login</strong>: For platform administrators</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Security Features</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Password reset via email</li>
                <li>• Session-based authentication</li>
                <li>• Role-based access control</li>
                <li>• Secure password hashing</li>
              </ul>
            </div>
          </div>
          <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
            <h4 className="font-medium mb-2">Access Code for Pricing</h4>
            <p className="text-sm text-muted-foreground">
              The public pricing page requires an access code to view wholesale pricing details. 
              This allows prospective customers to see pricing before registering.
            </p>
          </div>
        </div>
      ),
    },
  ],
});
