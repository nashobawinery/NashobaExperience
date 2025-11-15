import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from './storage';
import { db } from '@db';
import {
  createB2bSessionMiddleware,
  requireB2bAuth,
  requireB2bCustomer,
  requireB2bSalesRep,
  requireB2bAdmin,
  authenticateB2bCustomer,
  authenticateB2bSalesRep,
  authenticateB2bAdmin,
  hashPassword,
  generatePasswordFromPhone,
} from './b2b-auth';
import {
  insertB2bCustomerSchema,
  insertB2bOrderSchema,
  insertB2bOrderItemSchema,
  b2bPasswordResetTokens,
  b2bAdmins,
  b2bCustomers,
  salesReps,
} from '@shared/schema';
import sendgrid from '@sendgrid/mail';
import { generatePasswordResetEmail, sendEmail } from './email';
import { eq, and, gt } from 'drizzle-orm';
import { randomBytes } from 'crypto';

const router = Router();

// Initialize SendGrid if API key is available
if (process.env.SENDGRID_API_KEY) {
  sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
}

// Apply B2B session middleware to all B2B routes
router.use(createB2bSessionMiddleware());

// Public route: Check pricing page access code
router.post('/api/b2b/verify-code', async (req: Request, res: Response) => {
  const { code } = req.body;
  
  // Accept WHOLESALE2025 as the valid access code
  if (code === 'WHOLESALE2025') {
    res.json({ valid: true });
  } else {
    res.json({ valid: false });
  }
});

// Public route: One-time admin setup (creates default admin if none exists)
router.post('/api/b2b/setup-admin', async (req: Request, res: Response) => {
  try {
    // Check if any admin already exists
    const admins = await storage.getAllB2bAdmins();
    
    if (admins.length > 0) {
      return res.status(400).json({ 
        error: 'Admin account already exists',
        message: 'An admin account has already been created. Please use the login page.'
      });
    }

    // Create the default admin
    const passwordHash = await hashPassword('admin123');
    const admin = await storage.createB2bAdmin({
      firstName: 'B2B',
      lastName: 'Admin',
      email: 'admin@nashobawinery.com',
      passwordHash,
      active: true,
    });

    res.json({ 
      success: true,
      message: 'Admin account created successfully!',
      credentials: {
        email: 'admin@nashobawinery.com',
        password: 'admin123',
        warning: 'Please change this password immediately after logging in!'
      }
    });
  } catch (error) {
    console.error('Setup admin error:', error);
    res.status(500).json({ error: 'Failed to create admin account' });
  }
});

// Public route: Request password reset
router.post('/api/b2b/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email, userType } = req.body;

    if (!email || !userType) {
      return res.status(400).json({ error: 'Email and user type are required' });
    }

    // Validate user type
    if (!['customer', 'sales_rep', 'admin'].includes(userType)) {
      return res.status(400).json({ error: 'Invalid user type' });
    }

    // Check if user exists
    let userExists = false;
    if (userType === 'customer') {
      const customer = await storage.getB2bCustomerByEmail(email);
      userExists = !!customer;
    } else if (userType === 'sales_rep') {
      const salesRep = await db.select().from(salesReps).where(eq(salesReps.email, email)).limit(1);
      userExists = salesRep.length > 0;
    } else if (userType === 'admin') {
      const admin = await db.select().from(b2bAdmins).where(eq(b2bAdmins.email, email)).limit(1);
      userExists = admin.length > 0;
    }

    // For security, always return success even if user doesn't exist
    // This prevents email enumeration
    if (!userExists) {
      console.log(`Password reset requested for non-existent ${userType}: ${email}`);
      return res.json({ success: true });
    }

    // Generate secure random token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Store token in database
    await db.insert(b2bPasswordResetTokens).values({
      email,
      userType: userType as 'customer' | 'sales_rep' | 'admin',
      token,
      expiresAt,
    });

    // Send password reset email
    const resetLink = `${req.protocol}://${req.get('host')}/b2b/reset-password?token=${token}`;
    const emailContent = generatePasswordResetEmail(resetLink, userType);
    
    await sendEmail(email, emailContent.subject, emailContent.html, emailContent.text);

    res.json({ success: true });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Public route: Verify reset token
router.get('/api/b2b/verify-reset-token', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ valid: false, error: 'Token is required' });
    }

    const resetToken = await db
      .select()
      .from(b2bPasswordResetTokens)
      .where(
        and(
          eq(b2bPasswordResetTokens.token, token),
          eq(b2bPasswordResetTokens.used, false),
          gt(b2bPasswordResetTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (resetToken.length === 0) {
      return res.json({ valid: false });
    }

    res.json({ valid: true, userType: resetToken[0].userType });
  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({ valid: false, error: 'Failed to verify token' });
  }
});

// Public route: Reset password with token
router.post('/api/b2b/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Find valid token
    const resetToken = await db
      .select()
      .from(b2bPasswordResetTokens)
      .where(
        and(
          eq(b2bPasswordResetTokens.token, token),
          eq(b2bPasswordResetTokens.used, false),
          gt(b2bPasswordResetTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (resetToken.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const { email, userType } = resetToken[0];

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password based on user type
    if (userType === 'customer') {
      await db
        .update(b2bCustomers)
        .set({ passwordHash })
        .where(eq(b2bCustomers.emailAddress, email));
    } else if (userType === 'sales_rep') {
      await db
        .update(salesReps)
        .set({ passwordHash })
        .where(eq(salesReps.email, email));
    } else if (userType === 'admin') {
      await db
        .update(b2bAdmins)
        .set({ passwordHash })
        .where(eq(b2bAdmins.email, email));
    }

    // Mark token as used
    await db
      .update(b2bPasswordResetTokens)
      .set({ used: true })
      .where(eq(b2bPasswordResetTokens.token, token));

    res.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Public route: Get all products with active tier pricing only
router.get('/api/b2b/pricing', async (req: Request, res: Response) => {
  try {
    const [products, allTiers] = await Promise.all([
      storage.getProducts(),
      storage.getAllTierPricing(),
    ]);

    // Filter for active tiers only for public visibility
    const activeTiers = allTiers.filter(tier => tier.active);

    res.json({ products, tiers: activeTiers });
  } catch (error) {
    console.error('Error fetching B2B pricing:', error);
    res.status(500).json({ error: 'Failed to fetch pricing data' });
  }
});

// Public route: Customer registration
router.post('/api/b2b/register', async (req: Request, res: Response) => {
  try {
    const validatedData = insertB2bCustomerSchema.parse(req.body);
    
    // Check if email already exists
    const existing = await storage.getB2bCustomerByEmail(validatedData.emailAddress);
    if (existing) {
      return res.status(400).json({ error: 'Email address already registered' });
    }

    const customer = await storage.createB2bCustomer(validatedData);
    
    res.json({ 
      success: true,
      message: 'Registration submitted successfully. You will be notified once your account is approved.',
      customerId: customer.id 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid registration data', details: error.errors });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to process registration' });
  }
});

// Public route: Customer login
router.post('/api/b2b/login/customer', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const customer = await authenticateB2bCustomer(email, password);

    if (!customer) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    req.session.b2bUserId = customer.id;
    req.session.b2bUserType = 'customer';
    req.session.b2bUserEmail = customer.emailAddress;

    res.json({
      success: true,
      user: {
        id: customer.id,
        accountName: customer.accountName,
        email: customer.emailAddress,
        type: 'customer',
      },
    });
  } catch (error: any) {
    console.error('Customer login error:', error);
    res.status(401).json({ error: error.message || 'Login failed' });
  }
});

// Public route: Sales rep login
router.post('/api/b2b/login/sales-rep', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const salesRep = await authenticateB2bSalesRep(email, password);

    if (!salesRep) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    req.session.b2bUserId = salesRep.id;
    req.session.b2bUserType = 'sales_rep';
    req.session.b2bUserEmail = salesRep.email;

    res.json({
      success: true,
      user: {
        id: salesRep.id,
        name: `${salesRep.firstName} ${salesRep.lastName}`,
        email: salesRep.email,
        type: 'sales_rep',
      },
    });
  } catch (error: any) {
    console.error('Sales rep login error:', error);
    res.status(401).json({ error: error.message || 'Login failed' });
  }
});

// Logout
router.post('/api/b2b/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true });
  });
});

// Get current user session
router.get('/api/b2b/me', requireB2bAuth, async (req: Request, res: Response) => {
  try {
    const { b2bUserId, b2bUserType } = req.session;

    if (b2bUserType === 'customer') {
      const customer = await storage.getB2bCustomer(b2bUserId!);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      res.json({
        id: customer.id,
        accountName: customer.accountName,
        email: customer.emailAddress,
        type: 'customer',
        tier: customer.tier,
        salesRep: customer.salesRep,
      });
    } else if (b2bUserType === 'sales_rep') {
      const salesRep = await storage.getSalesRep(b2bUserId!);
      if (!salesRep) {
        return res.status(404).json({ error: 'Sales rep not found' });
      }
      
      res.json({
        id: salesRep.id,
        name: `${salesRep.firstName} ${salesRep.lastName}`,
        email: salesRep.email,
        type: 'sales_rep',
      });
    } else if (b2bUserType === 'admin') {
      const admin = await storage.getB2bAdmin(b2bUserId!);
      if (!admin) {
        return res.status(404).json({ error: 'Admin not found' });
      }
      
      res.json({
        id: admin.id,
        name: `${admin.firstName} ${admin.lastName}`,
        email: admin.email,
        type: 'admin',
      });
    } else {
      return res.status(400).json({ error: 'Invalid user type' });
    }
  } catch (error) {
    console.error('Error fetching user session:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// Customer routes - require customer authentication
router.get('/api/b2b/customer/products', requireB2bCustomer, async (req: Request, res: Response) => {
  try {
    const customer = await storage.getB2bCustomer(req.session.b2bUserId!);
    if (!customer || !customer.tier) {
      return res.status(400).json({ error: 'Customer tier not assigned' });
    }

    const products = await storage.getProducts();
    
    res.json({ products, tier: customer.tier });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get customer's previous products (for reorder page)
router.get('/api/b2b/customer/previous-products', requireB2bCustomer, async (req: Request, res: Response) => {
  try {
    const products = await storage.getCustomerPreviousProducts(req.session.b2bUserId!);
    const customer = await storage.getB2bCustomer(req.session.b2bUserId!);
    
    res.json({ products, tier: customer?.tier });
  } catch (error) {
    console.error('Error fetching previous products:', error);
    res.status(500).json({ error: 'Failed to fetch previous products' });
  }
});

// Get customer order history
router.get('/api/b2b/customer/orders', requireB2bCustomer, async (req: Request, res: Response) => {
  try {
    const orders = await storage.getB2bOrders(req.session.b2bUserId!);
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get specific order details
router.get('/api/b2b/customer/orders/:id', requireB2bCustomer, async (req: Request, res: Response) => {
  try {
    const order = await storage.getB2bOrder(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify order belongs to customer
    if (order.customerId !== req.session.b2bUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Place order
router.post('/api/b2b/customer/orders', requireB2bCustomer, async (req: Request, res: Response) => {
  try {
    const { items, notes, shippingAddress } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    const customer = await storage.getB2bCustomer(req.session.b2bUserId!);
    if (!customer || !customer.tier) {
      return res.status(400).json({ error: 'Customer tier not assigned' });
    }

    // Calculate order totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await storage.getProduct(item.productId);
      if (!product) {
        return res.status(400).json({ error: `Product not found: ${item.productId}` });
      }

      const tierDiscount = parseFloat(customer.tier.discountPercentage) / 100;
      const unitPrice = parseFloat(product.price) * (1 - tierDiscount);
      const lineTotal = unitPrice * item.quantity;
      
      subtotal += lineTotal;

      orderItems.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity: item.quantity,
        unitPrice: unitPrice.toFixed(2),
        retailPrice: product.price,
        lineTotal: lineTotal.toFixed(2),
      });
    }

    // Generate order number (simple timestamp-based)
    const orderNumber = `B2B-${Date.now()}`;

    const orderData = {
      customerId: req.session.b2bUserId!,
      orderNumber,
      status: 'pending',
      subtotal: subtotal.toFixed(2),
      tax: '0.00',
      total: subtotal.toFixed(2),
      notes: notes || null,
      shippingAddress: shippingAddress?.address || customer.shippingAddress,
      shippingCity: shippingAddress?.city || customer.shippingCity,
      shippingState: shippingAddress?.state || customer.shippingState,
      shippingZipCode: shippingAddress?.zipCode || customer.shippingZipCode,
    };

    const order = await storage.createB2bOrder(orderData as any, orderItems as any);

    // Send order notifications
    try {
      await sendOrderNotifications(order, customer, orderItems);
    } catch (emailError) {
      console.error('Failed to send order notifications:', emailError);
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Sales rep routes
router.get('/api/b2b/sales-rep/customers', requireB2bSalesRep, async (req: Request, res: Response) => {
  try {
    const customers = await storage.getAllB2bCustomers('active');
    
    // Filter to only show customers assigned to this sales rep
    const salesRepCustomers = customers.filter(c => c.salesRepId === req.session.b2bUserId);
    
    res.json(salesRepCustomers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

router.get('/api/b2b/sales-rep/orders', requireB2bSalesRep, async (req: Request, res: Response) => {
  try {
    const allOrders = await storage.getAllB2bOrders();
    
    // Filter to only show orders from customers assigned to this sales rep
    const salesRepOrders = allOrders.filter(o => o.customer.salesRepId === req.session.b2bUserId);
    
    res.json(salesRepOrders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Helper function to send order notifications
async function sendOrderNotifications(order: any, customer: any, items: any[]) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    console.warn('SendGrid not configured, skipping order notifications');
    return;
  }

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.productName}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${item.unitPrice}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${item.lineTotal}</td>
    </tr>
  `).join('');

  const emailHtml = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #2c3e50;">New B2B Order Received</h2>
        <p><strong>Order Number:</strong> ${order.orderNumber}</p>
        <p><strong>Customer:</strong> ${customer.accountName}</p>
        <p><strong>Contact:</strong> ${customer.primaryContactName} (${customer.emailAddress})</p>
        
        <h3 style="margin-top: 20px;">Order Details</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 12px 8px; border-bottom: 2px solid #ddd; text-align: left;">Product</th>
              <th style="padding: 12px 8px; border-bottom: 2px solid #ddd; text-align: center;">Quantity</th>
              <th style="padding: 12px 8px; border-bottom: 2px solid #ddd; text-align: right;">Unit Price</th>
              <th style="padding: 12px 8px; border-bottom: 2px solid #ddd; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 12px 8px; text-align: right; font-weight: bold;">Order Total:</td>
              <td style="padding: 12px 8px; text-align: right; font-weight: bold;">$${order.total}</td>
            </tr>
          </tfoot>
        </table>
        
        ${order.shippingAddress ? `
          <h3 style="margin-top: 20px;">Shipping Address</h3>
          <p>
            ${order.shippingAddress}<br>
            ${order.shippingCity}, ${order.shippingState} ${order.shippingZipCode}
          </p>
        ` : ''}
        
        ${order.notes ? `
          <h3 style="margin-top: 20px;">Order Notes</h3>
          <p style="background-color: #f8f9fa; padding: 15px; border-radius: 4px;">${order.notes}</p>
        ` : ''}
      </body>
    </html>
  `;

  // Get notification recipients from settings
  const recipients = [];
  
  // Add sales rep if assigned
  if (customer.salesRep) {
    recipients.push(customer.salesRep.email);
  }

  // Add additional recipients from settings
  const settingValue = await storage.getB2bSetting('order_notification_emails');
  if (settingValue?.settingValue) {
    const additionalEmails = settingValue.settingValue.split(',').map(e => e.trim());
    recipients.push(...additionalEmails);
  }

  // Send to all recipients
  const messages = recipients.map(email => ({
    to: email,
    from: process.env.RESEND_FROM_EMAIL!,
    subject: `New B2B Order: ${order.orderNumber}`,
    html: emailHtml,
  }));

  // Also send confirmation to customer
  messages.push({
    to: customer.emailAddress,
    from: process.env.RESEND_FROM_EMAIL!,
    subject: `Order Confirmation: ${order.orderNumber}`,
    html: emailHtml.replace('New B2B Order Received', 'Order Confirmation'),
  });

  await sendgrid.send(messages);
}

// ===== ADMIN ROUTES =====

// Admin login
router.post('/api/b2b/login/admin', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const admin = await authenticateB2bAdmin(email, password);

    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    req.session.b2bUserId = admin.id;
    req.session.b2bUserType = 'admin';
    req.session.b2bUserEmail = admin.email;

    res.json({
      success: true,
      user: {
        id: admin.id,
        name: `${admin.firstName} ${admin.lastName}`,
        email: admin.email,
        type: 'admin',
      },
    });
  } catch (error: any) {
    console.error('Admin login error:', error);
    res.status(401).json({ error: error.message || 'Login failed' });
  }
});

// Admin: Get all pending customer registrations
router.get('/api/b2b/admin/customers/pending', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const customers = await storage.getAllB2bCustomers('pending_approval');
    res.json(customers);
  } catch (error) {
    console.error('Error fetching pending customers:', error);
    res.status(500).json({ error: 'Failed to fetch pending customers' });
  }
});

// Admin: Get all customers (any status)
router.get('/api/b2b/admin/customers', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const customers = await storage.getAllB2bCustomers(status as string);
    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Admin: Approve customer registration
router.post('/api/b2b/admin/customers/:id/approve', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tierId, salesRepId } = req.body;

    if (!tierId) {
      return res.status(400).json({ error: 'Tier ID is required' });
    }

    // Get customer to generate password from phone
    const customer = await storage.getB2bCustomer(id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (customer.accountStatus !== 'pending_approval') {
      return res.status(400).json({ error: 'Customer is not pending approval' });
    }

    // Generate password from last 6 digits of phone
    const tempPassword = generatePasswordFromPhone(customer.phoneNumber);
    
    // Hash the password before storing
    const passwordHash = await hashPassword(tempPassword);

    // Update customer with sales rep if provided
    if (salesRepId) {
      await storage.updateB2bCustomer(id, { salesRepId });
    }

    // Approve customer with hashed password
    const adminId = (req.session as any).b2bUserId;
    console.log('[Approve] Admin ID from session:', adminId);
    console.log('[Approve] Approving customer:', id, 'with tier:', tierId);
    
    const approvedCustomer = await storage.approveB2bCustomer(
      id,
      tierId,
      passwordHash,
      adminId
    );

    console.log('[Approve] Result:', approvedCustomer ? 'SUCCESS' : 'FAILED');

    if (!approvedCustomer) {
      console.error('[Approve] approveB2bCustomer returned null - this means the update failed');
      return res.status(500).json({ error: 'Failed to approve customer - database update failed' });
    }

    // Send approval email with login credentials
    try {
      if (process.env.SENDGRID_API_KEY && process.env.RESEND_FROM_EMAIL) {
        const emailHtml = `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <h2 style="color: #2c3e50;">Welcome to Nashoba B2B</h2>
              <p>Dear ${customer.primaryContactName},</p>
              <p>Your B2B account has been approved! You can now log in and start placing orders.</p>
              
              <h3 style="margin-top: 20px;">Login Credentials</h3>
              <p style="background-color: #f8f9fa; padding: 15px; border-radius: 4px;">
                <strong>Email:</strong> ${customer.emailAddress}<br>
                <strong>Password:</strong> ${tempPassword}
              </p>
              
              <p style="color: #dc3545; font-weight: bold;">
                Please change your password after your first login.
              </p>
              
              <p style="margin-top: 20px;">
                <a href="${process.env.REPLIT_DOMAINS?.split(',')[0]}/b2b/login" 
                   style="background-color: #2c3e50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
                  Log In Now
                </a>
              </p>
            </body>
          </html>
        `;

        await sendgrid.send({
          to: customer.emailAddress,
          from: process.env.RESEND_FROM_EMAIL,
          subject: 'Your Nashoba B2B Account Has Been Approved',
          html: emailHtml,
        });
      }
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
    }

    res.json({ success: true, customer: approvedCustomer });
  } catch (error) {
    console.error('Error approving customer:', error);
    res.status(500).json({ error: 'Failed to approve customer' });
  }
});

// Admin: Reject customer registration
router.post('/api/b2b/admin/customers/:id/reject', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const customer = await storage.updateB2bCustomer(id, { accountStatus: 'inactive' });
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ success: true, customer });
  } catch (error) {
    console.error('Error rejecting customer:', error);
    res.status(500).json({ error: 'Failed to reject customer' });
  }
});

// Admin: Get all tier pricing
router.get('/api/b2b/admin/tiers', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const tiers = await storage.getAllTierPricing();
    res.json(tiers);
  } catch (error) {
    console.error('Error fetching tiers:', error);
    res.status(500).json({ error: 'Failed to fetch tiers' });
  }
});

// Admin: Create tier pricing
router.post('/api/b2b/admin/tiers', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const tier = await storage.createTierPricing(req.body);
    res.json(tier);
  } catch (error) {
    console.error('Error creating tier:', error);
    res.status(500).json({ error: 'Failed to create tier' });
  }
});

// Admin: Update tier pricing
router.patch('/api/b2b/admin/tiers/:id', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const updateSchema = z.object({
      discountPercentage: z.number().min(0).max(100).optional(),
      description: z.string().max(500).optional(),
    });

    const validated = updateSchema.parse(req.body);
    
    // Convert discountPercentage to string for storage (decimal type) with fixed precision
    const updateData: Partial<{ discountPercentage: string; description: string }> = {
      ...(validated.description !== undefined && { description: validated.description }),
      ...(validated.discountPercentage !== undefined && { discountPercentage: validated.discountPercentage.toFixed(2) }),
    };
    
    const tier = await storage.updateTierPricing(req.params.id, updateData);
    if (!tier) {
      return res.status(404).json({ error: 'Tier not found' });
    }
    res.json(tier);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating tier:', error);
    res.status(500).json({ error: 'Failed to update tier' });
  }
});

// Admin: Toggle tier active status
router.patch('/api/b2b/admin/tiers/:id/toggle-active', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { active } = req.body;
    
    if (typeof active !== 'boolean') {
      return res.status(400).json({ error: 'Active must be a boolean value' });
    }
    
    const tier = await storage.toggleTierActive(req.params.id, active);
    if (!tier) {
      return res.status(404).json({ error: 'Tier not found' });
    }
    res.json(tier);
  } catch (error) {
    console.error('Error toggling tier active status:', error);
    res.status(500).json({ error: 'Failed to toggle tier active status' });
  }
});

// Admin: Delete tier pricing
router.delete('/api/b2b/admin/tiers/:id', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const success = await storage.deleteTierPricing(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Tier not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting tier:', error);
    res.status(500).json({ error: 'Failed to delete tier' });
  }
});

// Admin: Get all sales reps
router.get('/api/b2b/admin/sales-reps', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const salesReps = await storage.getAllSalesReps();
    res.json(salesReps);
  } catch (error) {
    console.error('Error fetching sales reps:', error);
    res.status(500).json({ error: 'Failed to fetch sales reps' });
  }
});

// Admin: Create sales rep
router.post('/api/b2b/admin/sales-reps', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { password, ...data } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const passwordHash = await hashPassword(password);
    const salesRep = await storage.createSalesRep({ ...data, passwordHash });
    
    res.json(salesRep);
  } catch (error) {
    console.error('Error creating sales rep:', error);
    res.status(500).json({ error: 'Failed to create sales rep' });
  }
});

// Admin: Update sales rep
router.patch('/api/b2b/admin/sales-reps/:id', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { password, ...data } = req.body;
    
    const updateData: any = data;
    if (password) {
      updateData.passwordHash = await hashPassword(password);
    }

    const salesRep = await storage.updateSalesRep(req.params.id, updateData);
    if (!salesRep) {
      return res.status(404).json({ error: 'Sales rep not found' });
    }
    res.json(salesRep);
  } catch (error) {
    console.error('Error updating sales rep:', error);
    res.status(500).json({ error: 'Failed to update sales rep' });
  }
});

// Admin: Delete sales rep
router.delete('/api/b2b/admin/sales-reps/:id', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const success = await storage.deleteSalesRep(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Sales rep not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting sales rep:', error);
    res.status(500).json({ error: 'Failed to delete sales rep' });
  }
});

// Admin: Get all admins
router.get('/api/b2b/admin/admins', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const admins = await storage.getAllB2bAdmins();
    res.json(admins);
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
});

// Admin: Create admin
router.post('/api/b2b/admin/admins', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { password, ...data } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const passwordHash = await hashPassword(password);
    const admin = await storage.createB2bAdmin({ ...data, passwordHash });
    
    res.json(admin);
  } catch (error: any) {
    console.error('Error creating admin:', error);
    
    // Check for unique constraint violation (duplicate email)
    if (error.code === '23505' && error.constraint?.includes('email')) {
      return res.status(400).json({ error: 'An admin with this email already exists' });
    }
    
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

// Admin: Update admin
router.patch('/api/b2b/admin/admins/:id', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { password, ...data } = req.body;
    
    const updateData: any = data;
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      updateData.passwordHash = await hashPassword(password);
    }

    const admin = await storage.updateB2bAdmin(req.params.id, updateData);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    res.json(admin);
  } catch (error) {
    console.error('Error updating admin:', error);
    res.status(500).json({ error: 'Failed to update admin' });
  }
});

// Admin: Delete admin
router.delete('/api/b2b/admin/admins/:id', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    // Prevent deleting self
    const currentAdminId = (req.session as any).b2bUserId;
    if (!currentAdminId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (req.params.id === currentAdminId) {
      return res.status(400).json({ error: 'Cannot delete your own admin account' });
    }

    // Get the admin being deleted to check if they're active
    const adminToDelete = await storage.getB2bAdmin(req.params.id);
    if (!adminToDelete) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Only enforce "last admin" check if the admin being deleted is active
    if (adminToDelete.active) {
      const allActiveAdmins = await storage.getAllB2bAdmins(true); // active only
      if (allActiveAdmins.length <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last active admin account' });
      }
    }

    const success = await storage.deleteB2bAdmin(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting admin:', error);
    res.status(500).json({ error: 'Failed to delete admin' });
  }
});

// Admin: Get all orders
router.get('/api/b2b/admin/orders', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const orders = await storage.getAllB2bOrders();
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Admin: Get B2B settings
router.get('/api/b2b/admin/settings', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const settings = await storage.getAllB2bSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Admin: Update B2B setting
router.post('/api/b2b/admin/settings', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { key, value } = req.body;
    const setting = await storage.setB2bSetting(key, value);
    res.json(setting);
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// Admin: Change password
router.post('/api/b2b/admin/change-password', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Get current admin from session
    const adminId = (req.session as any).b2bUserId;
    if (!adminId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const admin = await storage.getB2bAdmin(adminId);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Verify current password
    const authenticated = await authenticateB2bAdmin(admin.email, currentPassword);
    if (!authenticated) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);
    
    // Update password
    await storage.updateB2bAdmin(adminId, { passwordHash: newPasswordHash });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
