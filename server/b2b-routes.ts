import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from './storage';
import { db } from './db';
import {
  createB2bSessionMiddleware,
  requireB2bAuth,
  requireB2bCustomer,
  requireB2bSalesRep,
  requireB2bAdmin,
  requireB2bAdminOrSalesRep,
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
  insertB2bSlideshowSlideSchema,
  insertB2bEmailTemplateSchema,
  b2bPasswordResetTokens,
  b2bAdmins,
  b2bCustomers,
  b2bSettings,
  salesReps,
  products,
  tierPricing,
  b2bSlideshowSlides,
  b2bOrders,
  b2bOrderItems,
  b2bCommissions,
} from '@shared/schema';
import sendgrid from '@sendgrid/mail';
import { generatePasswordResetEmail, generateAccessRequestEmail, sendEmail } from './email';
import { substituteVariables, calculateSavingsVsTier1, calculateCommitmentProgress } from './email-template-variables';
import { eq, and, gt, inArray, desc } from 'drizzle-orm';
import { randomBytes } from 'crypto';

const router = Router();

// Initialize SendGrid if API key is available
if (process.env.SENDGRID_API_KEY) {
  sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
}

// Apply B2B session middleware to all B2B routes
router.use(createB2bSessionMiddleware());

// Helper function to prevent manual assignment of Tier 2 (auto-cart-upgrade only)
// Returns an error message if tierId is Tier 2, otherwise returns null
// 
// Note: This validation should be used in all manual tier assignment endpoints.
// The automatic cart-upgrade logic (Task 9) will bypass this validation by calling
// storage.updateB2bCustomer() directly with the Tier 2 ID when cart reaches 5+ cases.
async function validateTierAssignment(tierId: string | undefined): Promise<string | null> {
  if (!tierId) return null;
  
  const tier = await db.select().from(tierPricing).where(eq(tierPricing.id, tierId)).limit(1);
  if (tier.length > 0 && tier[0].tierName === 'Tier 2') {
    return 'Tier 2 cannot be manually assigned. It is automatically applied when cart reaches 5+ cases.';
  }
  
  return null;
}

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

// Public route: Get where to buy locations (customers with recent purchases)
router.get('/api/b2b/where-to-buy', async (req: Request, res: Response) => {
  try {
    const locations = await storage.getWhereToBuyLocations();
    res.json(locations);
  } catch (error) {
    console.error('Error fetching where to buy locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Public route: Request wholesale access code
router.post('/api/b2b/request-access', async (req: Request, res: Response) => {
  try {
    const { name, businessName, email } = req.body;

    if (!name || !businessName || !email) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Generate email content
    const emailContent = generateAccessRequestEmail(name, businessName, email);
    
    // Send to support email
    const supportEmail = process.env.RESEND_FROM_EMAIL || 'support@nashobawinery.com';
    await sendEmail(supportEmail, emailContent.subject, emailContent.html, emailContent.text);

    res.json({ success: true });
  } catch (error) {
    console.error('Request access error:', error);
    res.status(500).json({ error: 'Failed to send access request' });
  }
});

// Public route: Get all products for pricing sheet
router.get('/api/b2b/pricing/products', async (req: Request, res: Response) => {
  try {
    const allProducts = await db.select().from(products).where(eq(products.available, true));
    res.json(allProducts);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Public route: Get all tiers for pricing sheet
router.get('/api/b2b/pricing/tiers', async (req: Request, res: Response) => {
  try {
    const allTiers = await db.select().from(tierPricing).where(eq(tierPricing.active, true)).orderBy(tierPricing.sortOrder);
    res.json(allTiers);
  } catch (error) {
    console.error('Get tiers error:', error);
    res.status(500).json({ error: 'Failed to fetch tiers' });
  }
});

// Admin route: Get media library items
router.get('/api/b2b/admin/media-library', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { mediaLibrary } = await import('@shared/schema');
    const items = await db.select().from(mediaLibrary).orderBy(mediaLibrary.createdAt);
    res.json(items);
  } catch (error) {
    console.error('Error fetching media library:', error);
    res.status(500).json({ error: 'Failed to fetch media library' });
  }
});

// Admin route: Get videos
router.get('/api/b2b/admin/videos', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { videos } = await import('@shared/schema');
    const videoList = await db.select().from(videos).where(eq(videos.isActive, true)).orderBy(videos.sortOrder);
    res.json(videoList);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// Public route: Get active B2B slideshow slides
router.get('/api/b2b/slideshow/slides', async (req: Request, res: Response) => {
  try {
    // Simple approach matching tasting app - just return the slides with their stored mediaUrl
    const slides = await db.select().from(b2bSlideshowSlides).where(eq(b2bSlideshowSlides.active, true)).orderBy(b2bSlideshowSlides.sortOrder);
    res.json(slides);
  } catch (error) {
    console.error('Get slides error:', error);
    res.status(500).json({ error: 'Failed to fetch slides' });
  }
});

// Admin route: Get all B2B slideshow slides (including inactive)
router.get('/api/b2b/admin/slideshow/slides', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    // Simple approach matching tasting app - just return the slides with their stored mediaUrl
    const slides = await db.select().from(b2bSlideshowSlides).orderBy(b2bSlideshowSlides.sortOrder);
    res.json(slides);
  } catch (error) {
    console.error('Get all slides error:', error);
    res.status(500).json({ error: 'Failed to fetch slides' });
  }
});

// Admin route: Create B2B slideshow slide
router.post('/api/b2b/admin/slideshow/slides', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const validatedData = insertB2bSlideshowSlideSchema.parse(req.body);
    const [newSlide] = await db.insert(b2bSlideshowSlides).values(validatedData).returning();
    res.json(newSlide);
  } catch (error) {
    console.error('Create slide error:', error);
    res.status(500).json({ error: 'Failed to create slide' });
  }
});

// Admin route: Update B2B slideshow slide
router.patch('/api/b2b/admin/slideshow/slides/:id', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = insertB2bSlideshowSlideSchema.partial().parse(req.body);
    const [updatedSlide] = await db
      .update(b2bSlideshowSlides)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(b2bSlideshowSlides.id, id))
      .returning();
    
    if (!updatedSlide) {
      return res.status(404).json({ error: 'Slide not found' });
    }
    
    res.json(updatedSlide);
  } catch (error) {
    console.error('Update slide error:', error);
    res.status(500).json({ error: 'Failed to update slide' });
  }
});

// Admin route: Delete B2B slideshow slide
router.delete('/api/b2b/admin/slideshow/slides/:id', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(b2bSlideshowSlides).where(eq(b2bSlideshowSlides.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('Delete slide error:', error);
    res.status(500).json({ error: 'Failed to delete slide' });
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

// Customer routes - support both customer login and admin impersonation
router.get('/api/b2b/customer/products', requireB2bAuth, async (req: Request, res: Response) => {
  try {
    // Support admin impersonation via customerId query parameter
    let customerId = req.session.b2bUserId!;
    const isAdmin = req.session.b2bUserType === 'admin';
    
    if (isAdmin && req.query.customerId) {
      customerId = req.query.customerId as string;
    } else if (!isAdmin && req.session.b2bUserType !== 'customer') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const customer = await storage.getB2bCustomer(customerId);
    if (!customer || !customer.tier) {
      return res.status(400).json({ error: 'Customer tier not assigned' });
    }

    const allProducts = await storage.getProducts();
    const allTiers = await storage.getAllTierPricing();
    const customerTierName = customer.tier.tierName; // Extract tier name from tier object
    
    // Calculate tier pricing for each product based on customer's tier and product category
    const productsWithTierPricing = allProducts.map(product => {
      // Find the tier that matches both the customer's tier name AND the product's category
      const effectiveTier = allTiers.find(t => 
        t.tierName === customerTierName && 
        t.category === product.category &&
        t.active
      );
      
      if (effectiveTier) {
        const tierDiscount = parseFloat(effectiveTier.discountPercentage) / 100;
        const tierPrice = parseFloat(product.price) * (1 - tierDiscount);
        return {
          ...product,
          tierPrice: tierPrice.toFixed(2)
        };
      }
      
      // No tier pricing found for this category - return retail price
      return product;
    });
    
    res.json({ products: productsWithTierPricing, tier: customerTierName }); // Send tier name, not tier object
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get customer's previous products (for reorder page) - support admin impersonation
router.get('/api/b2b/customer/previous-products', requireB2bAuth, async (req: Request, res: Response) => {
  try {
    // Support admin impersonation via customerId query parameter
    let customerId = req.session.b2bUserId!;
    const isAdmin = req.session.b2bUserType === 'admin';
    
    if (isAdmin && req.query.customerId) {
      customerId = req.query.customerId as string;
    } else if (!isAdmin && req.session.b2bUserType !== 'customer') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const previousProducts = await storage.getCustomerPreviousProducts(customerId);
    const customer = await storage.getB2bCustomer(customerId);
    
    if (!customer || !customer.tier) {
      return res.json({ products: previousProducts, tier: null });
    }
    
    const allTiers = await storage.getAllTierPricing();
    const customerTierName = customer.tier.tierName; // Extract tier name from tier object
    
    // Calculate tier pricing for previously ordered products
    const productsWithTierPricing = previousProducts.map(product => {
      const effectiveTier = allTiers.find(t => 
        t.tierName === customerTierName && 
        t.category === product.category &&
        t.active
      );
      
      if (effectiveTier) {
        const tierDiscount = parseFloat(effectiveTier.discountPercentage) / 100;
        const tierPrice = parseFloat(product.price) * (1 - tierDiscount);
        return {
          ...product,
          tierPrice: tierPrice.toFixed(2)
        };
      }
      
      return product;
    });
    
    res.json({ products: productsWithTierPricing, tier: customerTierName }); // Send tier name, not tier object
  } catch (error) {
    console.error('Error fetching previous products:', error);
    res.status(500).json({ error: 'Failed to fetch previous products' });
  }
});

// Get customer order history - support admin impersonation
router.get('/api/b2b/customer/orders', requireB2bAuth, async (req: Request, res: Response) => {
  try {
    // Support admin impersonation via customerId query parameter
    let customerId = req.session.b2bUserId!;
    const isAdmin = req.session.b2bUserType === 'admin';
    
    if (isAdmin && req.query.customerId) {
      customerId = req.query.customerId as string;
    } else if (!isAdmin && req.session.b2bUserType !== 'customer') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const orders = await storage.getB2bOrders(customerId);
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get specific order details - support admin impersonation
router.get('/api/b2b/customer/orders/:id', requireB2bAuth, async (req: Request, res: Response) => {
  try {
    // Support admin impersonation via customerId query parameter
    let customerId = req.session.b2bUserId!;
    const isAdmin = req.session.b2bUserType === 'admin';
    
    if (isAdmin && req.query.customerId) {
      customerId = req.query.customerId as string;
    } else if (!isAdmin && req.session.b2bUserType !== 'customer') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const order = await storage.getB2bOrder(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify order belongs to customer (or admin is accessing it)
    if (order.customerId !== customerId && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Place order (supports admin impersonation via customerId parameter)
router.post('/api/b2b/customer/orders', requireB2bAuth, async (req: Request, res: Response) => {
  try {
    const { items, notes, shippingAddress, customerId } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    // Determine which customer to place order for (admin can specify customerId)
    let targetCustomerId = req.session.b2bUserId!;
    
    // If customerId is provided, verify user is admin
    if (customerId) {
      const currentAdmin = await storage.getB2bAdmin(req.session.b2bUserId!);
      if (!currentAdmin) {
        return res.status(403).json({ error: 'Only admins can place orders for other customers' });
      }
      targetCustomerId = customerId;
    }

    const customer = await storage.getB2bCustomer(targetCustomerId);
    if (!customer || !customer.tier) {
      return res.status(400).json({ error: 'Customer tier not assigned' });
    }

    // Get customer's tier name for category-specific matching
    const customerTierName = customer.tier.tierName;
    
    // Fetch all tiers for category-specific lookups
    const allTiers = await storage.getAllTierPricing();
    
    // Fetch product details and calculate total cases across ALL categories
    const productDetails: Record<string, any> = {};
    let totalCases = 0;
    
    for (const item of items) {
      const product = await storage.getProduct(item.productId);
      if (!product) {
        return res.status(400).json({ error: `Product not found: ${item.productId}` });
      }
      productDetails[item.productId] = product;
      totalCases += item.quantity;
    }
    
    // Check if cart qualifies for Tier 2 (5+ cases across ALL categories)
    // NOTE: Tier 2 auto-upgrade only applies to Tier 1 customers!
    // Tier 3 and Tier 4 customers always use their annual commitment tier, regardless of cart size
    const qualifiesForTier2 = totalCases >= 5 && customerTierName === 'Tier 1';

    // Calculate order totals with category-specific tier pricing
    let subtotal = 0;
    const orderItems: Array<{
      productId: string;
      productName: string;
      sku: string;
      quantity: number;
      unitPrice: string;
      retailPrice: string;
      lineTotal: string;
    }> = [];

    for (const item of items) {
      const product = productDetails[item.productId];
      const productCategory = product.category;
      
      // Determine effective tier for this product's category
      let effectiveTier = null;
      
      // Check if cart qualifies for Tier 2 auto-upgrade (5+ total cases across all categories)
      if (qualifiesForTier2) {
        const tier2ForCategory = allTiers.find(
          (t: any) => t.tierName === 'Tier 2' && t.category === productCategory && t.active
        );
        if (tier2ForCategory) {
          effectiveTier = tier2ForCategory;
        }
      }
      
      // If no Tier 2 upgrade, use customer's tier name to find the matching tier for this product's category
      if (!effectiveTier) {
        const tierForCategory = allTiers.find(
          (t: any) => t.tierName === customerTierName && t.category === productCategory && t.active
        );
        if (tierForCategory) {
          effectiveTier = tierForCategory;
        }
      }

      // Calculate price: use tier discount if found, otherwise use retail price (no discount)
      if (!effectiveTier) {
        console.warn(`[Tier Config Gap] No active ${customerTierName} tier found for category "${productCategory}" on product "${product.name}" (${product.id}). Using retail price.`);
      }
      const tierDiscount = effectiveTier ? parseFloat(effectiveTier.discountPercentage) / 100 : 0;
      // unitPrice is per case: retail bottle price × case size × (1 - tier discount)
      const unitPrice = parseFloat(product.price) * product.caseSize * (1 - tierDiscount);
      const lineTotal = unitPrice * item.quantity;
      
      subtotal += lineTotal;

      orderItems.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku || '',
        quantity: item.quantity,
        unitPrice: unitPrice.toFixed(2),
        retailPrice: product.price,
        lineTotal: lineTotal.toFixed(2),
      });
    }

    // Generate order number (simple timestamp-based)
    const orderNumber = `B2B-${Date.now()}`;

    const orderData = {
      customerId: targetCustomerId,
      orderNumber,
      status: 'pending_approval',
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

    // Create commission record if customer has a sales rep
    if (customer.salesRepId) {
      try {
        const salesRep = await storage.getSalesRep(customer.salesRepId);
        if (salesRep) {
          const commissionPercentage = parseFloat(salesRep.commissionPercentage);
          const commissionAmount = (subtotal * commissionPercentage) / 100;
          
          await storage.createCommission({
            orderId: order.id,
            salesRepId: customer.salesRepId,
            orderTotal: subtotal.toFixed(2),
            commissionPercentage: commissionPercentage.toFixed(2),
            commissionAmount: commissionAmount.toFixed(2),
            status: 'pending',
          });
        }
      } catch (commissionError) {
        console.error('Failed to create commission record:', commissionError);
      }
    }

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

router.get('/api/b2b/sales-rep/commissions', requireB2bSalesRep, async (req: Request, res: Response) => {
  try {
    const commissions = await storage.getCommissionsBySalesRep(req.session.b2bUserId!);
    res.json(commissions);
  } catch (error) {
    console.error('Error fetching commissions:', error);
    res.status(500).json({ error: 'Failed to fetch commissions' });
  }
});

// Customer: Get past order items (items previously ordered by customer)
router.get('/api/b2b/customer/past-orders', requireB2bCustomer, async (req: Request, res: Response) => {
  try {
    const customerId = req.session.b2bUserId;
    if (!customerId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const pastOrderItems = await db
      .select({
        productId: b2bOrderItems.productId,
        productName: b2bOrderItems.productName,
        sku: b2bOrderItems.sku,
        quantity: b2bOrderItems.quantity,
        unitPrice: b2bOrderItems.unitPrice,
        lineTotal: b2bOrderItems.lineTotal,
        caseSize: products.caseSize,
        price: products.price,
        imageUrl: products.imageUrl,
        category: products.category,
      })
      .from(b2bOrderItems)
      .innerJoin(b2bOrders, eq(b2bOrderItems.orderId, b2bOrders.id))
      .innerJoin(products, eq(b2bOrderItems.productId, products.id))
      .where(
        and(
          eq(b2bOrders.customerId, customerId),
          eq(b2bOrders.status, 'completed')
        )
      )
      .orderBy(desc(b2bOrders.orderDate));

    // Group by product ID to get unique items with their details
    const uniqueItems = Array.from(
      new Map(pastOrderItems.map(item => [item.productId, item])).values()
    );

    res.json(uniqueItems);
  } catch (error) {
    console.error('Error fetching past orders:', error);
    res.status(500).json({ error: 'Failed to fetch past orders' });
  }
});

router.get('/api/b2b/admin/sales-reps/:id/commissions', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const commissions = await storage.getCommissionsBySalesRep(id);
    res.json(commissions);
  } catch (error) {
    console.error('Error fetching commissions:', error);
    res.status(500).json({ error: 'Failed to fetch commissions' });
  }
});

// Admin: Mark commission as paid to sales rep
router.patch('/api/b2b/admin/commissions/:id/paid', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const commission = await storage.markCommissionAsPaid(id);
    
    if (!commission) {
      return res.status(404).json({ error: 'Commission not found' });
    }

    res.json(commission);
  } catch (error) {
    console.error('Error marking commission as paid:', error);
    res.status(500).json({ error: 'Failed to mark commission as paid' });
  }
});

// Helper function to send order notifications
async function sendOrderNotifications(order: any, customer: any, items: any[]) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SendGrid not configured, skipping order notifications');
    return;
  }

  const { sendEmail } = await import('./email');

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

  const emailText = `
New B2B Order Received

Order Number: ${order.orderNumber}
Customer: ${customer.accountName}
Contact: ${customer.primaryContactName} (${customer.emailAddress})

Order Details:
${items.map(item => `${item.productName} - Qty: ${item.quantity} × $${item.unitPrice} = $${item.lineTotal}`).join('\n')}

Order Total: $${order.total}

${order.shippingAddress ? `Shipping Address:\n${order.shippingAddress}\n${order.shippingCity}, ${order.shippingState} ${order.shippingZipCode}\n` : ''}
${order.notes ? `Order Notes:\n${order.notes}\n` : ''}
  `.trim();

  // Get notification recipients from settings
  const recipients = [];
  
  // Add sales rep if assigned
  if (customer.salesRep) {
    recipients.push(customer.salesRep.email);
  }

  // Add additional recipients from settings
  const settingValue = await storage.getB2bSetting('order_notification_emails');
  if (settingValue?.settingValue) {
    const additionalEmails = settingValue.settingValue.split(',').map((e: string) => e.trim());
    recipients.push(...additionalEmails);
  }

  // Send to all recipients
  for (const recipient of recipients) {
    await sendEmail(
      recipient,
      `New B2B Order: ${order.orderNumber}`,
      emailHtml,
      emailText
    );
  }

  // Also send confirmation to customer
  await sendEmail(
    customer.emailAddress,
    `Order Confirmation: ${order.orderNumber}`,
    emailHtml.replace('New B2B Order Received', 'Order Confirmation'),
    emailText.replace('New B2B Order Received', 'Order Confirmation')
  );
}

// ===== ADMIN ROUTES =====

// Admin login with email/password
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

// Admin/Sales Rep: Get all customers (any status)
router.get('/api/b2b/admin/customers', requireB2bAdminOrSalesRep, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const customers = await storage.getAllB2bCustomers(status as string);
    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Admin: Create new customer
router.post('/api/b2b/admin/customers', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { tierId, salesRepId, autoApprove, autoGeneratePassword = true, customPassword, ...customerData } = req.body;
    
    // Validate customer data
    const validatedData = insertB2bCustomerSchema.parse(customerData);
    
    // Check if email already exists
    const existing = await storage.getB2bCustomerByEmail(validatedData.emailAddress);
    if (existing) {
      return res.status(400).json({ error: 'Email address already registered' });
    }

    // Create customer with pending_approval status initially
    const customer = await storage.createB2bCustomer(validatedData);
    
    // If auto-approve is requested and tier is provided, approve immediately
    if (autoApprove && tierId) {
      // Prevent manual assignment of Tier 2 (auto-cart-upgrade only)
      const tierError = await validateTierAssignment(tierId);
      if (tierError) {
        return res.status(400).json({ error: tierError });
      }

      // Determine password - use custom if provided, otherwise auto-generate
      let tempPassword: string;
      if (autoGeneratePassword || !customPassword) {
        tempPassword = generatePasswordFromPhone(customer.phoneNumber);
      } else {
        tempPassword = customPassword;
      }
      const passwordHash = await hashPassword(tempPassword);
      
      const adminId = (req.session as any).b2bUserId;
      
      // Update customer with sales rep if provided
      if (salesRepId) {
        await storage.updateB2bCustomer(customer.id, { salesRepId });
      }
      
      // Approve customer
      const approvedCustomer = await storage.approveB2bCustomer(
        customer.id,
        tierId,
        passwordHash,
        adminId
      );
      
      if (!approvedCustomer) {
        return res.status(500).json({ error: 'Customer created but approval failed' });
      }
      
      // Send approval email with login credentials
      try {
        if (process.env.SENDGRID_API_KEY && process.env.RESEND_FROM_EMAIL) {
          const tier = await storage.getTierPricing(tierId);
          const emailHtml = `
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #2c3e50;">Welcome to Nashoba B2B</h2>
                <p>Dear ${customer.primaryContactName},</p>
                <p>Your B2B account has been created and approved! You can now log in and start placing orders.</p>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0;">
                  <h3 style="margin-top: 0;">Login Credentials</h3>
                  <p><strong>Email:</strong> ${customer.emailAddress}</p>
                  <p><strong>Temporary Password:</strong> ${tempPassword}</p>
                  <p style="margin-bottom: 0;"><em>Please change your password after your first login.</em></p>
                </div>
                
                <div style="background-color: #e8f4f8; padding: 15px; border-radius: 4px; margin: 20px 0;">
                  <h3 style="margin-top: 0;">Your Pricing Tier</h3>
                  <p><strong>${tier?.tierName || 'Tier'}</strong></p>
                  <p>${tier?.description || ''}</p>
                  <p><strong>Discount:</strong> ${tier?.discountPercentage}% off retail prices</p>
                </div>
                
                <p>To access your account, visit our B2B portal and log in with the credentials above.</p>
                
                <p>If you have any questions, please don't hesitate to contact us.</p>
                
                <p>Best regards,<br>Nashoba Valley Winery Team</p>
              </body>
            </html>
          `;

          await sendgrid.send({
            to: customer.emailAddress,
            from: process.env.RESEND_FROM_EMAIL,
            subject: 'Your Nashoba B2B Account is Ready',
            html: emailHtml,
          });
        }
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
      }
      
      res.json({ 
        success: true,
        customer: approvedCustomer,
        approved: true,
        tempPassword
      });
    } else {
      // Customer created but not auto-approved
      res.json({ 
        success: true,
        customer,
        approved: false,
        message: 'Customer created. Approval required before they can log in.'
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid customer data', details: error.errors });
    }
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Admin: Update customer
router.put('/api/b2b/admin/customers/:id', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Get existing customer
    const existingCustomer = await storage.getB2bCustomer(id);
    if (!existingCustomer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // If email is being changed, check if new email is already in use
    if (updateData.emailAddress && updateData.emailAddress !== existingCustomer.emailAddress) {
      const emailExists = await storage.getB2bCustomerByEmail(updateData.emailAddress);
      if (emailExists) {
        return res.status(400).json({ error: 'Email address already in use' });
      }
    }

    // Prevent manual assignment of Tier 2 (auto-cart-upgrade only)
    const tierError = await validateTierAssignment(updateData.tierId);
    if (tierError) {
      return res.status(400).json({ error: tierError });
    }

    // Update customer
    const updatedCustomer = await storage.updateB2bCustomer(id, updateData);

    if (!updatedCustomer) {
      return res.status(500).json({ error: 'Failed to update customer' });
    }

    res.json({ success: true, customer: updatedCustomer });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid customer data', details: error.errors });
    }
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Admin: Reset customer password
router.post('/api/b2b/admin/customers/:id/reset-password', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get customer
    const customer = await storage.getB2bCustomer(id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Generate new password from phone number
    const tempPassword = generatePasswordFromPhone(customer.phoneNumber);
    const newPasswordHash = await hashPassword(tempPassword);

    // Update customer password directly in database (passwordHash not in updateB2bCustomer type)
    const result = await db.update(b2bCustomers).set({ passwordHash: newPasswordHash, updatedAt: new Date() }).where(eq(b2bCustomers.id, id)).returning();
    
    if (!result || result.length === 0) {
      return res.status(500).json({ error: 'Failed to reset password - customer may have been deleted' });
    }
    
    const updatedCustomer = result[0];

    // Send email with new credentials
    try {
      if (process.env.SENDGRID_API_KEY && process.env.RESEND_FROM_EMAIL) {
        const emailHtml = `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <h2 style="color: #2c3e50;">Password Reset - Nashoba B2B</h2>
              <p>Dear ${customer.primaryContactName},</p>
              <p>Your B2B account password has been reset by an administrator.</p>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <h3 style="margin-top: 0;">New Login Credentials</h3>
                <p><strong>Email:</strong> ${customer.emailAddress}</p>
                <p><strong>New Password:</strong> ${tempPassword}</p>
                <p style="margin-bottom: 0;"><em>Please change your password after logging in.</em></p>
              </div>
              
              <p>To access your account, visit our B2B portal and log in with these credentials.</p>
              
              <p>If you did not request this password reset, please contact us immediately.</p>
              
              <p>Best regards,<br>Nashoba Valley Winery Team</p>
            </body>
          </html>
        `;

        await sendgrid.send({
          to: customer.emailAddress,
          from: process.env.RESEND_FROM_EMAIL,
          subject: 'Your Nashoba B2B Password Has Been Reset',
          html: emailHtml,
        });
      }
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
    }

    res.json({ success: true, tempPassword });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
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

    // Prevent manual assignment of Tier 2 (auto-cart-upgrade only)
    const tierError = await validateTierAssignment(tierId);
    if (tierError) {
      return res.status(400).json({ error: tierError });
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

// Admin: Get all tier pricing (optionally filtered by category)
router.get('/api/b2b/admin/tiers', requireB2bAdminOrSalesRep, async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const tiers = await storage.getAllTierPricing(category);
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
router.get('/api/b2b/admin/sales-reps', requireB2bAdminOrSalesRep, async (req: Request, res: Response) => {
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

// Admin/Sales Rep: Get all products for manual order entry
router.get('/api/b2b/admin/products', requireB2bAdminOrSalesRep, async (req: Request, res: Response) => {
  try {
    const allProducts = await db.select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      category: products.category,
      price: products.price,
      caseSize: products.caseSize,
    }).from(products).where(eq(products.available, true));
    res.json(allProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Admin/Sales Rep: Create manual order
router.post('/api/b2b/admin/orders/manual', requireB2bAdminOrSalesRep, async (req: Request, res: Response) => {
  try {
    const { customerId, items, notes } = req.body;

    // Validate input
    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Customer and at least one item are required' });
    }

    // Fetch customer
    const customer = await storage.getB2bCustomer(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get customer's tier name (handle both tier object from join and missing tier)
    let customerTierName = '';
    if (customer.tier && typeof customer.tier === 'object' && 'tierName' in customer.tier) {
      customerTierName = (customer.tier as any).tierName;
    }
    
    if (!customerTierName && customer.pricingTierId) {
      const tierData = await db.select().from(tierPricing).where(eq(tierPricing.id, customer.pricingTierId));
      if (tierData.length > 0) {
        customerTierName = tierData[0].tierName;
      }
    }

    // Fetch products and all tiers for category-specific pricing
    const productIds = items.map((item: any) => item.productId);
    const productsData = await db.select().from(products).where(inArray(products.id, productIds));
    const allTiers = await db.select().from(tierPricing);

    // Calculate totals with category-specific tier pricing
    let subtotal = 0;
    let totalDiscount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = productsData.find((p: any) => p.id === item.productId);
      if (!product) {
        return res.status(404).json({ error: `Product ${item.productId} not found` });
      }

      // Find the tier that matches both customer's tier name AND product category
      let discountPercentage = 0;
      if (customerTierName) {
        const matchingTier = allTiers.find((t: any) => 
          t.tierName === customerTierName && 
          t.category === product.category && 
          t.active
        );
        if (matchingTier) {
          discountPercentage = parseFloat(matchingTier.discountPercentage);
        }
      }

      const retailPrice = parseFloat(product.price);
      const unitPrice = retailPrice * (1 - discountPercentage / 100);
      const lineTotal = unitPrice * item.quantity;
      const lineDiscount = (retailPrice - unitPrice) * item.quantity;
      
      subtotal += lineTotal;
      totalDiscount += lineDiscount;

      orderItems.push({
        productId: product.id,
        productName: product.name,
        productSku: product.sku || '',
        quantity: item.quantity,
        caseSize: product.caseSize || 12,
        unitPrice: unitPrice.toFixed(2),
        retailPrice: retailPrice.toFixed(2),
        totalPrice: lineTotal.toFixed(2),
      });
    }

    // Create order with items using createB2bOrder which handles both
    const orderNumber = `MO-${Date.now()}`;
    const order = await storage.createB2bOrder({
      customerId,
      orderNumber,
      status: 'pending_approval',
      subtotal: (subtotal + totalDiscount).toFixed(2),
      tax: '0',
      total: subtotal.toFixed(2),
      notes: notes || '',
      shippingAddress: customer.shippingAddress || '',
      shippingCity: customer.shippingCity || '',
      shippingState: customer.shippingState || '',
      shippingZipCode: customer.shippingZipCode || '',
    }, orderItems.map(item => ({
      productId: item.productId,
      productName: item.productName,
      sku: item.productSku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      retailPrice: item.retailPrice,
      lineTotal: item.totalPrice,
    })));

    // Create commission record if customer has sales rep
    if (customer.salesRepId) {
      const salesRep = await storage.getSalesRep(customer.salesRepId);
      if (salesRep && salesRep.commissionPercentage) {
        const commissionPercentage = parseFloat(salesRep.commissionPercentage.toString());
        const commissionAmount = (subtotal * commissionPercentage) / 100;
        
        await storage.createCommission({
          orderId: order.id,
          salesRepId: customer.salesRepId,
          orderTotal: subtotal.toFixed(2),
          commissionPercentage: commissionPercentage.toString(),
          commissionAmount: commissionAmount.toFixed(2),
          status: 'pending',
        });
      }
    }

    res.json({ success: true, orderId: order.id });
  } catch (error) {
    console.error('Error creating manual order:', error);
    res.status(500).json({ error: 'Failed to create manual order' });
  }
});

// Admin: Get all orders
router.get('/api/b2b/admin/orders', requireB2bAdminOrSalesRep, async (req: Request, res: Response) => {
  try {
    const orders = await storage.getAllB2bOrders();
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Admin: Get single order with items
router.get('/api/b2b/admin/orders/:id', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const order = await storage.getB2bOrder(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Admin: Update order status
router.patch('/api/b2b/admin/orders/:id/status', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['pending_approval', 'awaiting_delivery', 'awaiting_payment', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const order = await storage.updateB2bOrderStatus(id, status);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // If order is marked as completed/paid, update related commission status
    if (status === 'completed') {
      const commissions = await storage.getCommissionsByOrderId(id);
      for (const commission of commissions) {
        await storage.updateCommissionStatus(commission.id, 'earned');
      }
    }

    res.json(order);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Admin: Delete order (cascades to commissions)
router.delete('/api/b2b/admin/orders/:id', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Verify order exists first
    const order = await storage.getB2bOrder(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Delete order (will cascade delete commissions due to schema)
    const success = await storage.deleteB2bOrder(id);
    
    if (success) {
      res.json({ success: true, message: 'Order and associated commissions deleted' });
    } else {
      res.status(500).json({ error: 'Failed to delete order' });
    }
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// Admin: Update order with items
router.patch('/api/b2b/admin/orders/:id', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { items, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one order item is required' });
    }

    // Get the existing order
    const existingOrder = await storage.getB2bOrder(id);
    if (!existingOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get customer to determine tier
    const customer = await storage.getB2bCustomer(existingOrder.customerId);
    if (!customer || !customer.tier) {
      return res.status(400).json({ error: 'Customer tier not assigned' });
    }

    // Get customer's tier name for category-specific matching
    const customerTierName = customer.tier.tierName;
    
    // Fetch all tiers for category-specific lookups
    const allTiers = await storage.getAllTierPricing();
    
    // Fetch product details and calculate total cases across ALL categories
    const productDetails: Record<string, any> = {};
    let totalCases = 0;
    
    for (const item of items) {
      const product = await storage.getProduct(item.productId);
      if (!product) {
        return res.status(400).json({ error: `Product not found: ${item.productId}` });
      }
      productDetails[item.productId] = product;
      totalCases += item.quantity;
    }
    
    // Check if cart qualifies for Tier 2 (5+ cases across ALL categories)
    // NOTE: Tier 2 auto-upgrade only applies to Tier 1 customers!
    // Tier 3 and Tier 4 customers always use their annual commitment tier, regardless of cart size
    const qualifiesForTier2 = totalCases >= 5 && customerTierName === 'Tier 1';

    // Calculate order totals with category-specific tier pricing
    let subtotal = 0;
    const orderItems: Array<{
      productId: string;
      productName: string;
      sku: string;
      quantity: number;
      unitPrice: string;
      retailPrice: string;
      lineTotal: string;
    }> = [];

    for (const item of items) {
      const product = productDetails[item.productId];
      const productCategory = product.category;
      
      // Determine effective tier for this product's category
      let effectiveTier = null;
      
      // Check if cart qualifies for Tier 2 auto-upgrade (5+ total cases across all categories)
      if (qualifiesForTier2) {
        const tier2ForCategory = allTiers.find(
          (t: any) => t.tierName === 'Tier 2' && t.category === productCategory && t.active
        );
        if (tier2ForCategory) {
          effectiveTier = tier2ForCategory;
        }
      }
      
      // If no Tier 2 upgrade, use customer's tier name to find the matching tier for this product's category
      if (!effectiveTier) {
        const tierForCategory = allTiers.find(
          (t: any) => t.tierName === customerTierName && t.category === productCategory && t.active
        );
        if (tierForCategory) {
          effectiveTier = tierForCategory;
        }
      }

      const retailPrice = parseFloat(product.price);
      // Calculate price: use tier discount if found, otherwise use retail price (no discount)
      if (!effectiveTier) {
        console.warn(`[Tier Config Gap] No active ${customerTierName} tier found for category "${productCategory}" on product "${product.name}" (${product.id}). Using retail price.`);
      }
      const discountDecimal = effectiveTier ? parseFloat(effectiveTier.discountPercentage) / 100 : 0;
      const unitPrice = retailPrice * (1 - discountDecimal);
      const lineTotal = unitPrice * item.quantity;

      subtotal += lineTotal;

      orderItems.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku || '',
        quantity: item.quantity,
        unitPrice: unitPrice.toFixed(2),
        retailPrice: retailPrice.toFixed(2),
        lineTotal: lineTotal.toFixed(2),
      });
    }

    const tax = 0;
    const total = subtotal + tax;

    // Update order with transactional item updates
    await db.transaction(async (tx) => {
      // 1. Delete existing items
      await tx.delete(b2bOrderItems).where(eq(b2bOrderItems.orderId, id));
      
      // 2. Insert new items
      if (orderItems.length > 0) {
        await tx.insert(b2bOrderItems).values(
          orderItems.map(item => ({
            orderId: id,
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            retailPrice: item.retailPrice,
            lineTotal: item.lineTotal,
          }))
        );
      }
      
      // 3. Update order totals
      await tx.update(b2bOrders)
        .set({
          subtotal: subtotal.toFixed(2),
          tax: tax.toFixed(2),
          total: total.toFixed(2),
          notes: notes || existingOrder.notes,
          updatedAt: new Date(),
        })
        .where(eq(b2bOrders.id, id));
    });

    // 4. Recalculate commissions if customer has sales rep
    const oldTotal = parseFloat(existingOrder.total);
    const newTotal = total;
    
    if (customer.salesRepId) {
      const salesRep = await storage.getSalesRep(customer.salesRepId);
      if (salesRep && salesRep.commissionPercentage) {
        const commissionPercentage = parseFloat(salesRep.commissionPercentage.toString());
        const newCommissionAmount = (newTotal * commissionPercentage) / 100;
        
        // Get existing commission records
        const commissions = await storage.getCommissionsByOrderId(id);
        
        if (commissions.length > 0) {
          // Update existing commission
          const commission = commissions[0];
          await db.update(b2bCommissions)
            .set({
              orderTotal: total.toFixed(2),
              commissionAmount: newCommissionAmount.toFixed(2),
              updatedAt: new Date(),
            })
            .where(eq(b2bCommissions.id, commission.id));
        } else {
          // Create new commission if none exists
          await storage.createCommission({
            orderId: id,
            salesRepId: customer.salesRepId,
            orderTotal: total.toFixed(2),
            commissionPercentage: commissionPercentage.toString(),
            commissionAmount: newCommissionAmount.toFixed(2),
            status: 'pending',
          });
        }
      }
    }

    // 5. Fetch updated order
    const updatedOrder = await storage.getB2bOrder(id);
    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Admin: Delete order
router.delete('/api/b2b/admin/orders/:id', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await storage.deleteB2bOrder(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
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

// Admin: Get tier commitment report
router.get('/api/b2b/admin/tier-commitment-report', requireB2bAdminOrSalesRep, async (req: Request, res: Response) => {
  try {
    const report = await storage.getTierCommitmentReport();
    res.json(report);
  } catch (error) {
    console.error('Error fetching tier commitment report:', error);
    res.status(500).json({ error: 'Failed to fetch tier commitment report' });
  }
});

// Admin: Update customer commitment start date
router.patch('/api/b2b/admin/customers/:id/commitment-start', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { commitmentStartDate } = req.body;

    if (!commitmentStartDate) {
      return res.status(400).json({ error: 'Commitment start date is required' });
    }

    const updated = await storage.updateCustomerCommitmentStartDate(id, new Date(commitmentStartDate));
    
    if (!updated) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating commitment start date:', error);
    res.status(500).json({ error: 'Failed to update commitment start date' });
  }
});

// Admin: Get customers needing renewal reminders
router.get('/api/b2b/admin/renewal-reminders', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const daysBeforeRenewal = parseInt(req.query.days as string) || 60;
    const customers = await storage.getCustomersNeedingRenewalReminders(daysBeforeRenewal);
    res.json(customers);
  } catch (error) {
    console.error('Error fetching renewal reminders:', error);
    res.status(500).json({ error: 'Failed to fetch renewal reminders' });
  }
});

// Admin: Send renewal reminder emails
router.post('/api/b2b/admin/send-renewal-reminders', requireB2bAdmin, async (req: Request, res: Response) => {
  const sendReminderSchema = z.object({
    customerIds: z.array(z.string()).min(1, 'At least one customer ID is required'),
    daysBeforeRenewal: z.number().positive().optional(),
  });

  const parseResult = sendReminderSchema.safeParse(req.body);
  
  if (!parseResult.success) {
    return res.status(400).json({ 
      error: 'Invalid request body',
      details: parseResult.error.errors,
    });
  }

  const { customerIds, daysBeforeRenewal } = parseResult.data;
  const days = daysBeforeRenewal ?? 60;

  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  try {
    const allCustomers = await storage.getCustomersNeedingRenewalReminders(days);
    const customersToEmail = allCustomers.filter(c => customerIds.includes(c.id));

    if (customersToEmail.length === 0) {
      return res.status(404).json({ error: 'No valid customers found for the provided IDs' });
    }

    const emailResults = await Promise.allSettled(
      customersToEmail.map(async (customer) => {
        const { generateTierRenewalEmail } = await import('./email');
        const emailContent = generateTierRenewalEmail(
          customer.accountName,
          customer.tierName || 'Wholesale',
          customer.casesPurchased,
          customer.casesRemaining,
          customer.commitmentCases || 0,
          customer.daysUntilRenewal,
          customer.commitmentEndDate
        );

        const { sendEmail } = await import('./email');
        await sendEmail(
          customer.emailAddress,
          emailContent.subject,
          emailContent.html,
          emailContent.text
        );

        return {
          customerId: customer.id,
          customerName: customer.accountName,
          email: customer.emailAddress,
        };
      })
    );

    const successful: { customerId: string; customerName: string; email: string }[] = [];
    const failed: { customerId: string; customerName: string; email: string; error: string; errorDetails?: any }[] = [];

    emailResults.forEach((result, index) => {
      const customer = customersToEmail[index];
      if (result.status === 'fulfilled') {
        successful.push(result.value);
      } else {
        const errorInfo: any = {
          customerId: customer.id,
          customerName: customer.accountName,
          email: customer.emailAddress,
          error: result.reason?.message || String(result.reason) || 'Unknown error',
        };
        
        if (result.reason && typeof result.reason === 'object') {
          errorInfo.errorDetails = {
            code: result.reason.code,
            response: result.reason.response,
            statusCode: result.reason.statusCode,
          };
        }
        
        failed.push(errorInfo);
      }
    });

    res.json({
      success: true,
      daysBeforeRenewal: days,
      totalSent: successful.length,
      totalFailed: failed.length,
      successful,
      failed,
    });
  } catch (error) {
    console.error('Error sending renewal reminders:', error);
    res.status(500).json({ error: 'Failed to send renewal reminders' });
  }
});

// Email Template Management Routes

// Admin: Get all email templates
router.get('/api/b2b/admin/email-templates', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { active } = req.query;
    const templates = await storage.getEmailTemplates(active === 'true');
    res.json(templates);
  } catch (error) {
    console.error('Error fetching email templates:', error);
    res.status(500).json({ error: 'Failed to fetch email templates' });
  }
});

// Admin: Get single email template
router.get('/api/b2b/admin/email-templates/:id', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const template = await storage.getEmailTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    console.error('Error fetching email template:', error);
    res.status(500).json({ error: 'Failed to fetch email template' });
  }
});

// Admin: Create email template
router.post('/api/b2b/admin/email-templates', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const validatedData = insertB2bEmailTemplateSchema.parse({
      ...req.body,
      createdByAdminId: (req.session as any).b2bUserId,
    });
    
    const template = await storage.createEmailTemplate(validatedData);
    res.json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating email template:', error);
    res.status(500).json({ error: 'Failed to create email template' });
  }
});

// Admin: Update email template
router.patch('/api/b2b/admin/email-templates/:id', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const validatedData = insertB2bEmailTemplateSchema.partial().parse(req.body);
    const template = await storage.updateEmailTemplate(req.params.id, validatedData);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating email template:', error);
    res.status(500).json({ error: 'Failed to update email template' });
  }
});

// Admin: Delete email template
router.delete('/api/b2b/admin/email-templates/:id', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const deleted = await storage.deleteEmailTemplate(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting email template:', error);
    res.status(500).json({ error: 'Failed to delete email template' });
  }
});

// Admin: Preview email template with sample customer data
router.post('/api/b2b/admin/email-templates/:id/preview', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const template = await storage.getEmailTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    const { customerId } = req.body;
    
    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required for preview' });
    }
    
    const customer = await storage.getB2bCustomer(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const subject = await substituteVariables(template.subject, { customer });
    const bodyHtml = await substituteVariables(template.bodyHtml, { customer });
    const bodyText = await substituteVariables(template.bodyText, { customer });
    
    res.json({
      subject,
      bodyHtml,
      bodyText,
    });
  } catch (error) {
    console.error('Error previewing email template:', error);
    res.status(500).json({ error: 'Failed to preview email template' });
  }
});

// Admin: Send email manually using template
router.post('/api/b2b/admin/email-templates/:id/send', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const template = await storage.getEmailTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    const { customerIds } = req.body;
    
    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return res.status(400).json({ error: 'At least one customer ID is required' });
    }
    
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
      return res.status(500).json({ error: 'Email service not configured' });
    }
    
    const results = await Promise.allSettled(
      customerIds.map(async (customerId: string) => {
        const customer = await storage.getB2bCustomer(customerId);
        if (!customer) {
          throw new Error(`Customer ${customerId} not found`);
        }
        
        const subject = await substituteVariables(template.subject, { customer });
        const bodyHtml = await substituteVariables(template.bodyHtml, { customer });
        const bodyText = await substituteVariables(template.bodyText, { customer });
        
        await sendEmail(customer.emailAddress, subject, bodyHtml, bodyText);
        
        await storage.logEmailAutomation({
          templateId: template.id,
          customerId: customer.id,
          recipientEmail: customer.emailAddress,
          subject,
          triggerType: 'manual',
          success: true,
          errorMessage: null,
        });
        
        return {
          customerId: customer.id,
          email: customer.emailAddress,
          success: true,
        };
      })
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<any>).value);
    const failed = results
      .filter(r => r.status === 'rejected')
      .map(r => ({
        error: (r as PromiseRejectedResult).reason?.message || 'Unknown error',
      }));
    
    res.json({
      success: true,
      totalSent: successful.length,
      totalFailed: failed.length,
      successful,
      failed,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Admin: Get email automation logs
router.get('/api/b2b/admin/email-automation-logs', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { customerId, limit } = req.query;
    const logs = await storage.getEmailAutomationLogs(
      customerId as string | undefined,
      limit ? parseInt(limit as string) : 100
    );
    res.json(logs);
  } catch (error) {
    console.error('Error fetching email automation logs:', error);
    res.status(500).json({ error: 'Failed to fetch email automation logs' });
  }
});

// Admin: Backfill missing commissions for existing orders
router.post('/api/b2b/admin/backfill-commissions', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const allOrders = await storage.getAllB2bOrders();
    let createdCount = 0;
    let skippedCount = 0;

    for (const order of allOrders) {
      // Skip if order doesn't have completed/payment status or has no customer
      if (!order.customerId || !order.customer) continue;

      // Check if commission already exists
      const existingCommissions = await storage.getCommissionsByOrderId(order.id);
      if (existingCommissions.length > 0) {
        skippedCount++;
        continue;
      }

      // Get customer and verify they have a sales rep
      const customer = await storage.getB2bCustomer(order.customerId);
      if (!customer || !customer.salesRepId) continue;

      // Get sales rep commission percentage
      const salesRep = await storage.getSalesRep(customer.salesRepId);
      if (!salesRep) continue;

      // Calculate commission amount
      const subtotal = parseFloat(order.subtotal);
      const commissionPercentage = parseFloat(salesRep.commissionPercentage);
      const commissionAmount = (subtotal * commissionPercentage) / 100;

      // Create commission
      await storage.createCommission({
        orderId: order.id,
        salesRepId: customer.salesRepId,
        orderTotal: order.subtotal,
        commissionPercentage: commissionPercentage.toFixed(2),
        commissionAmount: commissionAmount.toFixed(2),
        status: order.status === 'completed' ? 'earned' : 'pending',
      });

      createdCount++;
    }

    res.json({
      success: true,
      message: `Backfill complete. Created ${createdCount} commissions, skipped ${skippedCount} (already had commissions)`,
      created: createdCount,
      skipped: skippedCount,
    });
  } catch (error) {
    console.error('Error backfilling commissions:', error);
    res.status(500).json({ error: 'Failed to backfill commissions' });
  }
});

// Customer: Get customer info (account name) - supports admin impersonation and regular customers
router.get('/api/b2b/customer/info', async (req: Request, res: Response) => {
  try {
    // Try to get customerId from session (for logged-in customers) or query param (for admin impersonation)
    let customerId = (req.session as any).b2bCustomerId;
    
    // Support admin impersonation via customerId query parameter
    if (req.query.customerId) {
      customerId = req.query.customerId as string;
    }

    // If no customerId found in either place, return error
    if (!customerId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const customer = await storage.getB2bCustomer(customerId);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({
      accountName: customer.accountName,
    });
  } catch (error) {
    console.error('Error fetching customer info:', error);
    res.status(500).json({ error: 'Failed to fetch customer info' });
  }
});

// Public/Customer: Get welcome statement setting
router.get('/api/b2b/settings/welcome', async (req: Request, res: Response) => {
  try {
    const setting = await db
      .select()
      .from(b2bSettings)
      .where(eq(b2bSettings.settingKey, 'welcome_statement'))
      .limit(1);

    const welcomeStatement = setting.length > 0 
      ? setting[0].settingValue 
      : 'Great Pricing With Supporting Local Agriculture - Thank you';

    res.json({
      welcomeStatement,
    });
  } catch (error) {
    console.error('Error fetching welcome statement:', error);
    res.status(500).json({ error: 'Failed to fetch welcome statement' });
  }
});

// Admin: Save welcome statement setting
router.post('/api/b2b/admin/settings/welcome', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { welcomeStatement } = req.body;

    if (!welcomeStatement || typeof welcomeStatement !== 'string') {
      return res.status(400).json({ error: 'Welcome statement is required' });
    }

    // Upsert the setting
    const existing = await db
      .select()
      .from(b2bSettings)
      .where(eq(b2bSettings.settingKey, 'welcome_statement'))
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      await db
        .update(b2bSettings)
        .set({ settingValue: welcomeStatement, updatedAt: new Date() })
        .where(eq(b2bSettings.settingKey, 'welcome_statement'));
    } else {
      // Create new
      await db.insert(b2bSettings).values({
        settingKey: 'welcome_statement',
        settingValue: welcomeStatement,
      });
    }

    res.json({
      success: true,
      message: 'Welcome statement saved',
      welcomeStatement,
    });
  } catch (error) {
    console.error('Error saving welcome statement:', error);
    res.status(500).json({ error: 'Failed to save welcome statement' });
  }
});

export default router;
