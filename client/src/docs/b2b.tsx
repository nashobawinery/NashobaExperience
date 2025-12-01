import { registerModuleDocs } from "./index";

registerModuleDocs({
  moduleKey: "b2b",
  moduleName: "B2B Wholesale Platform",
  description: "Business-to-business wholesale ordering and customer management",
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
            and administrators.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Customer Portal</h4>
              <p className="text-sm text-muted-foreground">
                Wholesale customers can browse products, view pricing, and place orders.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Sales Rep Portal</h4>
              <p className="text-sm text-muted-foreground">
                Sales reps can manage assigned customers and place orders on their behalf.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Admin Dashboard</h4>
              <p className="text-sm text-muted-foreground">
                Full control over customers, orders, pricing tiers, and sales team.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "customer-management",
      title: "Customer Management",
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Creating Customers</h5>
              <p className="text-sm text-muted-foreground">
                Add wholesale customers with business details, contact information, assigned pricing tier, 
                and optional sales rep assignment.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Pricing Tiers</h5>
              <p className="text-sm text-muted-foreground">
                Assign customers to pricing tiers for category-specific discounts. Each tier can have 
                different discount percentages per product category.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Multi-Location Support</h5>
              <p className="text-sm text-muted-foreground">
                Customers can have multiple shipping locations. Orders can be placed for any registered location.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Where to Buy Visibility</h5>
              <p className="text-sm text-muted-foreground">
                Toggle whether a customer appears on the public "Where to Buy" page with their location.
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
              <li>Admin reviews and updates status (Confirmed, Shipped, Delivered, Cancelled)</li>
              <li>Order history maintained for reporting</li>
            </ol>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Order Statuses</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Pending</strong> - Awaiting review</li>
                <li>• <strong>Confirmed</strong> - Order accepted</li>
                <li>• <strong>Shipped</strong> - In transit</li>
                <li>• <strong>Delivered</strong> - Complete</li>
                <li>• <strong>Cancelled</strong> - Order cancelled</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Pricing Calculation</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Base price from product catalog</li>
                <li>• Tier discount by category applied</li>
                <li>• Volume discounts (if configured)</li>
                <li>• Final price shown to customer</li>
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
            Sales representatives can be assigned to customers and have their own portal to manage accounts.
          </p>
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Sales Rep Capabilities</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• View assigned customers only</li>
                <li>• Place orders on behalf of customers</li>
                <li>• View order history for their accounts</li>
                <li>• Access customer contact information</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Assignment</h4>
              <p className="text-sm text-muted-foreground">
                Assign sales reps to customers from the customer edit screen. Each customer can have 
                one assigned sales rep, and sales reps can have multiple customers.
              </p>
            </div>
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
            Pricing tiers allow you to offer different discount levels to different customer segments.
          </p>
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-3">Setting Up Tiers</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Go to the <strong>Pricing Tiers</strong> tab in B2B Admin</li>
              <li>Create a new tier with a name (e.g., "Premium", "Standard")</li>
              <li>Set discount percentages for each product category</li>
              <li>Assign customers to the appropriate tier</li>
            </ol>
          </div>
          <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
            <h4 className="font-medium mb-2">Example</h4>
            <p className="text-sm text-muted-foreground">
              A "Premium" tier might offer 20% off wines and 15% off spirits, while a "Standard" tier 
              offers 10% off wines and 5% off spirits. When a customer in the Premium tier views products, 
              they see their discounted prices automatically.
            </p>
          </div>
        </div>
      ),
    },
  ],
});
