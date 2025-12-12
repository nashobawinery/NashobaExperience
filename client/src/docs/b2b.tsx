import { registerModuleDocs } from "./index";

registerModuleDocs({
  moduleKey: "b2b",
  moduleName: "B2B Wholesale Platform",
  description: "Business-to-business wholesale ordering, customer management, and sales operations",
  lastUpdated: "2024-12-12",
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
      id: "tier-agreements",
      title: "Tier Agreement & Contract Signing",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The tier agreement system allows B2B customers to digitally sign pricing agreements that 
            determine their wholesale discount rates.
          </p>
          
          <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
            <h4 className="font-medium mb-3">Digital Agreement Workflow</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li><strong>Admin Initiates:</strong> Admin selects a customer and generates a tier agreement link</li>
              <li><strong>Token Generation:</strong> System creates a secure token with 7-day expiration</li>
              <li><strong>Email Sent:</strong> Customer receives email with secure link to sign the agreement</li>
              <li><strong>Customer Signs:</strong> Customer reviews terms and provides digital signature</li>
              <li><strong>Agreement Stored:</strong> Signed agreement saved with signature data, timestamp, and IP address</li>
              <li><strong>Tier Activated:</strong> Customer's pricing tier is updated to the agreed tier</li>
            </ol>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Tier Structure</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Configurable tier names (e.g., "Tier 3", "Tier 4", "Premium")</li>
                <li>Category-specific pricing (Wine, Spirits, Beer, etc.)</li>
                <li>Different discount percentages per category per tier</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Agreement Data Stored</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Customer ID and tier name</li>
                <li>Secure token with expiration</li>
                <li>Signature data (drawn signature)</li>
                <li>Signer name and title</li>
                <li>IP address and timestamp</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Access URLs</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li><code className="bg-background px-1 rounded">/b2b/tier-agreement/:token</code> - Sign agreement</li>
              <li><code className="bg-background px-1 rounded">/b2b/tier-agreement/:token/view</code> - View signed agreement</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "order-workflow",
      title: "Sales Order Workflow",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The sales order workflow is a multi-step email-based process with secure token links 
            (7-day expiration for security).
          </p>
          
          <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary mb-4">
            <h4 className="font-medium mb-2">Order Status Flow</h4>
            <div className="text-sm font-mono text-center py-2">
              pending_delivery_date → pending_approval → approved_delivery_pending → delivered_pending_payment → completed
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="border-l-4 border-amber-500 pl-4 py-2">
              <h5 className="font-medium">Step 1: Order Creation</h5>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>Customer places order via B2B portal, or sales rep/admin creates order</li>
                <li>Order number generated: B2B-{'{timestamp}'}, SR-{'{timestamp}'}, or MO-{'{timestamp}'}</li>
                <li>Status: <code className="bg-muted px-1 rounded">pending_delivery_date</code></li>
                <li>Delivery date token generated (7-day expiry)</li>
                <li>Email sent to assigned sales rep with link to set delivery date</li>
              </ul>
            </div>
            
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h5 className="font-medium">Step 2: Delivery Date Entry</h5>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>Sales rep clicks link in email → <code className="bg-muted px-1 rounded">/b2b/order-delivery/:token</code></li>
                <li>Views order details, customer info, and line items</li>
                <li>Selects a future delivery date</li>
                <li>Status changes to <code className="bg-muted px-1 rounded">pending_approval</code></li>
                <li>Email sent to all B2B admins with invoice preview and approval link</li>
              </ul>
            </div>
            
            <div className="border-l-4 border-purple-500 pl-4 py-2">
              <h5 className="font-medium">Step 3: Order Approval</h5>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>Admin clicks link in email → <code className="bg-muted px-1 rounded">/b2b/order-approval/:token</code></li>
                <li>Reviews full invoice preview with customer details, delivery date, line items, and total</li>
                <li>Can <strong>Approve</strong> or <strong>Reject</strong> (with reason)</li>
                <li>On approval: Invoice number generated (<code className="bg-muted px-1 rounded">INV-{'{timestamp}'}</code>)</li>
                <li>Invoice email sent to customer and sales rep</li>
              </ul>
            </div>
            
            <div className="border-l-4 border-green-500 pl-4 py-2">
              <h5 className="font-medium">Step 4: Delivery Confirmation</h5>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>After physical delivery, access <code className="bg-muted px-1 rounded">/b2b/order-confirm-delivery/:token</code></li>
                <li>Confirm delivery completed</li>
                <li>Status changes to <code className="bg-muted px-1 rounded">delivered_pending_payment</code></li>
              </ul>
            </div>
            
            <div className="border-l-4 border-emerald-500 pl-4 py-2">
              <h5 className="font-medium">Step 5: Payment Recording</h5>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>Admin records payment via admin dashboard</li>
                <li>Payment details stored: method, reference, notes</li>
                <li>Status changes to <code className="bg-muted px-1 rounded">completed</code></li>
                <li>Commission status changes from <code className="bg-muted px-1 rounded">pending</code> to <code className="bg-muted px-1 rounded">earned</code></li>
              </ul>
            </div>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Key Database Fields</h4>
            <div className="text-sm text-muted-foreground font-mono space-y-1">
              <p>deliveryDateToken, deliveryDateTokenExpiresAt</p>
              <p>approvalToken, approvalTokenExpiresAt</p>
              <p>deliveryConfirmationToken, deliveryConfirmationTokenExpiresAt</p>
              <p>scheduledDeliveryDate, invoiceNumber</p>
              <p>approvedAt, rejectedAt, deliveredAt, paidAt, completedAt</p>
              <p>paymentMethod, paymentReference, paymentNotes</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "commissions",
      title: "Commission System",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Commissions are automatically calculated for sales representatives based on order totals.
          </p>
          
          <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary mb-4">
            <h4 className="font-medium mb-2">Commission Status Flow</h4>
            <div className="text-sm font-mono text-center py-2">
              pending → earned → paid
            </div>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
              <li><strong>Pending:</strong> Order placed but not yet paid by customer</li>
              <li><strong>Earned:</strong> Customer payment received (order completed)</li>
              <li><strong>Paid:</strong> Commission disbursed to sales rep</li>
            </ul>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Commission Calculation</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Each sales rep has a <code className="bg-background px-1 rounded">commissionPercentage</code> field (e.g., 5.00 = 5%)</li>
                <li>When an order is created for a customer assigned to a sales rep:</li>
                <li className="ml-4">Commission record created automatically</li>
                <li className="ml-4">Commission amount = order total x commission % / 100</li>
                <li className="ml-4">Initial status: <code className="bg-background px-1 rounded">pending</code></li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Commission Record Fields</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li><strong>orderId:</strong> Linked to the order</li>
                <li><strong>salesRepId:</strong> Who earns the commission</li>
                <li><strong>orderTotal:</strong> Basis for calculation</li>
                <li><strong>commissionPercentage:</strong> Rate at time of order</li>
                <li><strong>commissionAmount:</strong> Calculated value</li>
                <li><strong>status:</strong> pending / earned / paid</li>
                <li><strong>paidAt, paidByAdminId:</strong> When disbursed</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Admin Actions</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>View all commissions by sales rep</li>
              <li>Filter by status (pending, earned, paid)</li>
              <li>Mark individual commissions as paid</li>
              <li>Batch payment processing</li>
              <li>Backfill tool: Retroactively create commission records for historical orders</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "payroll",
      title: "Payroll Integration",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The payroll system integrates commission tracking with sales rep compensation.
          </p>
          
          <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary mb-4">
            <h4 className="font-medium mb-3">Payroll Workflow</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Orders are placed throughout the pay period</li>
              <li>As payments are received, commissions move from <code className="bg-background px-1 rounded">pending</code> → <code className="bg-background px-1 rounded">earned</code></li>
              <li>At payroll time, admin reviews all <code className="bg-background px-1 rounded">earned</code> commissions</li>
              <li>Admin marks commissions as <code className="bg-background px-1 rounded">paid</code> and records disbursement date</li>
              <li>Reports generated for payroll processing</li>
            </ol>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Payroll Configuration</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Admin sets payroll period settings (frequency, dates)</li>
                <li>Commission periods align with payroll cycles</li>
                <li>Settings stored in B2B settings table</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Payroll Features</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li><strong>Commission Summary:</strong> Total pending, earned, and paid amounts per sales rep</li>
                <li><strong>Payroll Reports:</strong> Filter by date range, sales rep, status</li>
                <li><strong>Export Capabilities:</strong> CSV/Excel export for external payroll systems</li>
                <li><strong>Backfill Tool:</strong> Retroactively create commission records for historical orders</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Key API Endpoints</h4>
            <ul className="text-sm text-muted-foreground font-mono space-y-1">
              <li>GET /api/b2b/admin/commissions - All commissions with filtering</li>
              <li>PATCH /api/b2b/admin/commissions/:id/paid - Mark as paid</li>
              <li>POST /api/b2b/admin/payroll/settings - Configure payroll settings</li>
              <li>POST /api/b2b/admin/backfill-commissions - Generate missing commission records</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "pricing-discounts",
      title: "Pricing & Discounts",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The platform uses category-specific tier pricing for maximum flexibility.
          </p>
          
          <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary mb-4">
            <h4 className="font-medium mb-2">Price Calculation Formula</h4>
            <div className="text-sm font-mono space-y-1 text-center">
              <p>unitPrice = retailPrice x (1 - discountPercentage / 100)</p>
              <p>lineTotal = unitPrice x quantity</p>
              <p>orderTotal = sum of all lineTotals</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Category-Specific Tier Pricing</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Discounts applied per product category based on customer's tier</li>
                <li>Example: Tier 3 customer gets 20% off Wine, 15% off Spirits</li>
                <li>Pricing calculated at order time and stored in order items</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Price Locking</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Once an order is created, prices are locked in order items</li>
                <li>Changes to tier pricing don't affect existing orders</li>
                <li>Stored fields: unitPrice, retailPrice, lineTotal</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Profit Margin Display</h4>
            <p className="text-sm text-muted-foreground">
              The pricing sheet shows customers their potential profit margins based on suggested 
              retail prices and their tier discounts, helping them understand their markup potential.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "email-notifications",
      title: "Email Notifications",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            All workflow emails are sent via SendGrid with branded HTML templates.
          </p>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Trigger</th>
                  <th className="text-left p-2 font-medium">Recipients</th>
                  <th className="text-left p-2 font-medium">Content</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b">
                  <td className="p-2">Order Created</td>
                  <td className="p-2">Sales Rep</td>
                  <td className="p-2">Order details + delivery date link</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Delivery Date Set</td>
                  <td className="p-2">All Admins</td>
                  <td className="p-2">Invoice preview + approval link</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Order Approved</td>
                  <td className="p-2">Customer, Sales Rep</td>
                  <td className="p-2">Full invoice with delivery date</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Order Rejected</td>
                  <td className="p-2">Customer, Sales Rep</td>
                  <td className="p-2">Rejection notice with reason</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Tier Agreement</td>
                  <td className="p-2">Customer</td>
                  <td className="p-2">Agreement link for signature</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
            <h4 className="font-medium mb-2">Email Security</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>All action links use secure random tokens (32 bytes, hex encoded)</li>
              <li>Tokens expire after 7 days</li>
              <li>Single-use for certain actions (signature, approval)</li>
            </ul>
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
                <li><strong>Retail Liquor:</strong> Package stores and liquor retailers</li>
                <li><strong>Restaurant:</strong> Restaurants and dining establishments</li>
                <li><strong>Private Club:</strong> Country clubs and private venues</li>
                <li><strong>Other:</strong> Other wholesale business types</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Registration Fields</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Business name and type</li>
                <li>License number and Tax ID</li>
                <li>Primary contact information</li>
                <li>Billing and shipping addresses</li>
                <li>Multiple location support</li>
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
              <h5 className="font-medium">Settings Tab</h5>
              <p className="text-sm text-muted-foreground">
                Configure pricing tiers, welcome statements, and platform-wide B2B settings.
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Sales Reps Tab</h5>
              <p className="text-sm text-muted-foreground">
                Manage sales representative accounts, territories, and commission settings.
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
            <div className="border-l-4 border-primary pl-4">
              <h5 className="font-medium">Documentation Tab</h5>
              <p className="text-sm text-muted-foreground">
                Access this comprehensive documentation about all B2B platform features.
              </p>
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
                <li>View and manage assigned customers only</li>
                <li>Place orders on behalf of customers</li>
                <li>Set delivery dates via email links</li>
                <li>View order history for their accounts</li>
                <li>Access customer contact information</li>
                <li>Add notes to customer accounts</li>
                <li>Track personal commissions</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Assignment & Territories</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Assign sales reps to customers from admin</li>
                <li>Each customer can have one assigned rep</li>
                <li>Sales reps can have multiple customers</li>
                <li>Territory-based assignment optional</li>
                <li>Commission percentage set per sales rep</li>
              </ul>
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
                <li>Browse products with search and filters</li>
                <li>View tier-specific wholesale pricing</li>
                <li>See profit margin calculations</li>
                <li>Product detail views with images</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Ordering</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Add items to cart</li>
                <li>Select delivery location</li>
                <li>Add order notes</li>
                <li>View order history</li>
                <li>Quick reorder past orders</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Account Management</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Update business information</li>
                <li>Manage multiple locations</li>
                <li>Change password</li>
                <li>View assigned sales rep</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Where to Buy</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Opt-in to appear on public locator</li>
                <li>Display store location on map</li>
                <li>Help consumers find your store</li>
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
                <li><strong>Customer Login:</strong> For approved wholesale customers</li>
                <li><strong>Sales Rep Login:</strong> For sales representatives</li>
                <li><strong>Admin Login:</strong> For platform administrators</li>
              </ul>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Security Features</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Password reset via email</li>
                <li>Session-based authentication</li>
                <li>Role-based access control</li>
                <li>Secure password hashing</li>
                <li>Token-based workflow links (7-day expiry)</li>
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
