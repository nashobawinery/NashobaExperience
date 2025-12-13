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
  b2bTierAgreements,
} from '@shared/schema';
import sendgrid from '@sendgrid/mail';
import { generatePasswordResetEmail, generateAccessRequestEmail, generateWholesaleApplicationEmail, sendEmail, generateBrandedEmailHeader, generateBrandedEmailFooter } from './email';
import { substituteVariables, calculateSavingsVsTier1, calculateCommitmentProgress } from './email-template-variables';
import { eq, and, gt, inArray, desc, sql } from 'drizzle-orm';
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

// Helper function to send email notifications to all B2B admins when sales reps create/edit customers
async function notifyAdminsOfCustomerChange(
  action: 'created' | 'updated',
  customer: any,
  salesRep: any,
  changes?: { field: string; oldValue: any; newValue: any }[]
): Promise<void> {
  if (!process.env.SENDGRID_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    console.log('SendGrid not configured - skipping admin notification email');
    return;
  }

  try {
    // Get all active B2B admins
    const admins = await storage.getAllB2bAdmins(true);
    if (admins.length === 0) {
      console.log('No active B2B admins found - skipping notification');
      return;
    }

    const adminEmails = admins.map(a => a.email);
    const actionText = action === 'created' ? 'Created New Customer' : 'Updated Customer';
    const actionVerb = action === 'created' ? 'created' : 'updated';
    
    // Build changes summary for updates
    let changesHtml = '';
    let changesText = '';
    if (action === 'updated' && changes && changes.length > 0) {
      changesHtml = `
        <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #92400E;">Changes Made</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background-color: #FDE68A;">
              <th style="text-align: left; padding: 8px; border: 1px solid #D97706;">Field</th>
              <th style="text-align: left; padding: 8px; border: 1px solid #D97706;">Previous Value</th>
              <th style="text-align: left; padding: 8px; border: 1px solid #D97706;">New Value</th>
            </tr>
            ${changes.map(c => `
              <tr>
                <td style="padding: 8px; border: 1px solid #D97706;">${c.field}</td>
                <td style="padding: 8px; border: 1px solid #D97706;">${c.oldValue || '(empty)'}</td>
                <td style="padding: 8px; border: 1px solid #D97706;">${c.newValue || '(empty)'}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      `;
      changesText = '\n\nChanges Made:\n' + changes.map(c => 
        `- ${c.field}: "${c.oldValue || '(empty)'}" → "${c.newValue || '(empty)'}"`
      ).join('\n');
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background-color: #5C2535; color: #F5F5F0; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; max-width: 600px; margin: 0 auto; }
          .info-box { background-color: #F5F5F0; border-left: 4px solid #5C2535; padding: 16px; margin: 20px 0; }
          .info-row { margin: 8px 0; padding: 4px 0; }
          .label { font-weight: bold; color: #5C2535; display: inline-block; min-width: 140px; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
          .badge-action { background-color: ${action === 'created' ? '#D1FAE5' : '#FEF3C7'}; color: ${action === 'created' ? '#065F46' : '#92400E'}; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>B2B Customer ${actionText}</h1>
          <p>Review Required</p>
        </div>
        <div class="content">
          <p style="text-align: center;">
            <span class="badge badge-action">${action === 'created' ? 'NEW CUSTOMER' : 'CUSTOMER UPDATED'}</span>
          </p>
          
          <p>Sales Representative <strong>${salesRep?.firstName || ''} ${salesRep?.lastName || ''}</strong> (${salesRep?.email || 'Unknown'}) has ${actionVerb} a customer account.</p>
          
          <div class="info-box">
            <h3 style="margin-top: 0; color: #5C2535;">Customer Details</h3>
            <div class="info-row">
              <span class="label">Account Name:</span>
              <span>${customer.accountName || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Customer Number:</span>
              <span>${customer.customerNumber || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Contact Name:</span>
              <span>${customer.primaryContactName || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Email:</span>
              <span>${customer.emailAddress || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Phone:</span>
              <span>${customer.phoneNumber || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Customer Type:</span>
              <span>${customer.customerType || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Account Status:</span>
              <span>${customer.accountStatus || 'N/A'}</span>
            </div>
            ${customer.licenseNumber ? `
            <div class="info-row">
              <span class="label">License Number:</span>
              <span>${customer.licenseNumber}</span>
            </div>
            ` : ''}
            ${customer.taxId ? `
            <div class="info-row">
              <span class="label">Tax ID:</span>
              <span>${customer.taxId}</span>
            </div>
            ` : ''}
          </div>
          
          ${changesHtml}
          
          <p style="text-align: center; margin-top: 30px;">
            <em>Please review this customer in the B2B Admin Dashboard.</em>
          </p>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Nashoba Valley Winery. All rights reserved.</p>
            <p>This is an automated notification from the B2B wholesale platform.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
B2B Customer ${actionText} - Review Required

Sales Representative ${salesRep?.firstName || ''} ${salesRep?.lastName || ''} (${salesRep?.email || 'Unknown'}) has ${actionVerb} a customer account.

Customer Details:
- Account Name: ${customer.accountName || 'N/A'}
- Customer Number: ${customer.customerNumber || 'N/A'}
- Contact Name: ${customer.primaryContactName || 'N/A'}
- Email: ${customer.emailAddress || 'N/A'}
- Phone: ${customer.phoneNumber || 'N/A'}
- Customer Type: ${customer.customerType || 'N/A'}
- Account Status: ${customer.accountStatus || 'N/A'}
${customer.licenseNumber ? `- License Number: ${customer.licenseNumber}` : ''}
${customer.taxId ? `- Tax ID: ${customer.taxId}` : ''}
${changesText}

Please review this customer in the B2B Admin Dashboard.
    `.trim();

    // Send to all admins
    await sendgrid.send({
      to: adminEmails,
      from: process.env.RESEND_FROM_EMAIL,
      subject: `[Review Required] Sales Rep ${actionText}: ${customer.accountName || customer.emailAddress}`,
      html: emailHtml,
      text: emailText,
    });

    console.log(`Admin notification sent to ${adminEmails.length} admins for customer ${action}: ${customer.accountName}`);
  } catch (error) {
    console.error('Failed to send admin notification email:', error);
    // Don't throw - email failure shouldn't block the main operation
  }
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
    const { zip } = req.query;
    const { getZipCoordinates, calculateDistance } = await import('./zip-coordinates');
    
    // Always include coordinates for map display (use centroid fallback if no precise coords)
    const locationsWithCoords = locations.map((loc: any) => {
      let mapLat = loc.latitude ? Number(loc.latitude) : null;
      let mapLng = loc.longitude ? Number(loc.longitude) : null;
      let coordsPrecise = !!(loc.latitude && loc.longitude);
      
      // Fallback to zip code centroid if no precise coordinates
      if (!coordsPrecise && loc.storeZipCode) {
        const centroid = getZipCoordinates(loc.storeZipCode);
        if (centroid) {
          mapLat = centroid.lat;
          mapLng = centroid.lng;
        }
      }
      
      return {
        ...loc,
        mapLat,
        mapLng,
        coordsPrecise,
      };
    });
    
    // If a zip code is provided, calculate distances
    if (zip && typeof zip === 'string') {
      const userCoords = getZipCoordinates(zip);
      
      if (userCoords) {
        const locationsWithDistance = locationsWithCoords.map((loc: any) => {
          let distanceMiles: number | null = null;
          
          if (loc.mapLat && loc.mapLng) {
            distanceMiles = calculateDistance(
              userCoords.lat, 
              userCoords.lng, 
              loc.mapLat, 
              loc.mapLng
            );
          }
          
          return {
            ...loc,
            distanceMiles: distanceMiles !== null ? Math.round(distanceMiles * 10) / 10 : null,
          };
        });
        
        return res.json(locationsWithDistance);
      }
    }
    
    res.json(locationsWithCoords);
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
    console.log(`[Password Reset] Request received for ${userType}: ${email}`);

    if (!email || !userType) {
      console.log('[Password Reset] Missing email or userType');
      return res.status(400).json({ error: 'Email and user type are required' });
    }

    // Validate user type
    if (!['customer', 'sales_rep', 'admin'].includes(userType)) {
      console.log(`[Password Reset] Invalid user type: ${userType}`);
      return res.status(400).json({ error: 'Invalid user type' });
    }

    // Check if user exists
    let userExists = false;
    if (userType === 'customer') {
      const customer = await storage.getB2bCustomerByEmail(email);
      userExists = !!customer;
      console.log(`[Password Reset] Customer lookup for ${email}: ${userExists ? 'FOUND' : 'NOT FOUND'}`);
    } else if (userType === 'sales_rep') {
      const salesRep = await db.select().from(salesReps).where(eq(salesReps.email, email)).limit(1);
      userExists = salesRep.length > 0;
      console.log(`[Password Reset] Sales rep lookup for ${email}: ${userExists ? 'FOUND' : 'NOT FOUND'}`);
    } else if (userType === 'admin') {
      const admin = await db.select().from(b2bAdmins).where(eq(b2bAdmins.email, email)).limit(1);
      userExists = admin.length > 0;
      console.log(`[Password Reset] Admin lookup for ${email}: ${userExists ? 'FOUND' : 'NOT FOUND'}`);
    }

    // For security, always return success even if user doesn't exist
    // This prevents email enumeration
    if (!userExists) {
      console.log(`[Password Reset] User not found, returning success (for security): ${email}`);
      return res.json({ success: true });
    }

    // Generate secure random token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Store token in database
    console.log(`[Password Reset] Storing token in database for ${email}`);
    await db.insert(b2bPasswordResetTokens).values({
      email,
      userType: userType as 'customer' | 'sales_rep' | 'admin',
      token,
      expiresAt,
    });
    console.log(`[Password Reset] Token stored successfully`);

    // Send password reset email
    const resetLink = `${req.protocol}://${req.get('host')}/b2b/reset-password?token=${token}`;
    const emailContent = generatePasswordResetEmail(resetLink, userType);
    
    console.log(`[Password Reset] Sending password reset email to ${email}`);
    await sendEmail(email, emailContent.subject, emailContent.html, emailContent.text);
    console.log(`[Password Reset] Email sent successfully to ${email}`);

    res.json({ success: true });
  } catch (error) {
    console.error('[Password Reset] Error:', error);
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
        .where(eq(b2bCustomers.email_address, email));
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

// Public route: Customer registration (comprehensive application form)
router.post('/api/b2b/register', async (req: Request, res: Response) => {
  try {
    const {
      // Business Info
      accountName,
      customerType,
      licenseNumber,
      taxId,
      // Contact Info
      primaryContactName,
      primaryContactRole,
      emailAddress,
      phoneNumber,
      altPhoneNumber,
      // Business Address
      billingAddress,
      billingCity,
      billingState,
      billingZipCode,
      // Location questions
      storeLocationSameAsBusiness,
      hasMultipleLocations,
      // Single store location (if different)
      storeName,
      storeAddress,
      storeCity,
      storeState,
      storeZipCode,
      storePhone,
      storeEmail,
      // Multiple locations note
      multipleLocationsNote,
      // Additional
      notes,
      acceptsMarketing,
    } = req.body;

    // Validate required fields
    if (!accountName || !primaryContactName || !emailAddress || !phoneNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!billingAddress || !billingCity || !billingState || !billingZipCode) {
      return res.status(400).json({ error: 'Business address is required' });
    }
    if (!customerType) {
      return res.status(400).json({ error: 'Business type is required' });
    }
    
    // Check if email already exists
    const existing = await storage.getB2bCustomerByEmail(emailAddress);
    if (existing) {
      return res.status(400).json({ error: 'Email address already registered' });
    }

    // Build notes with location info
    let fullNotes = notes || '';
    if (multipleLocationsNote) {
      fullNotes = fullNotes 
        ? `${fullNotes}\n\nMultiple Locations: ${multipleLocationsNote}`
        : `Multiple Locations: ${multipleLocationsNote}`;
    }
    if (storeLocationSameAsBusiness === 'no' && hasMultipleLocations === 'yes') {
      fullNotes = fullNotes
        ? `${fullNotes}\n\n[Customer has multiple locations - admin to add after approval]`
        : '[Customer has multiple locations - admin to add after approval]';
    }

    // Generate a unique customer number
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const customerNumber = `NVW-${timestamp}-${randomPart}`;

    // Create the customer with all fields
    const customerData = {
      accountName,
      customerType: customerType as any,
      customerNumber,
      licenseNumber: licenseNumber || null,
      taxId: taxId || null,
      primaryContactName,
      primaryContactRole: primaryContactRole || null,
      emailAddress,
      phoneNumber,
      altPhoneNumber: altPhoneNumber || null,
      billingAddress,
      billingCity,
      billingState,
      billingZipCode,
      // Set shipping same as billing by default
      shippingAddress: billingAddress,
      shippingCity: billingCity,
      shippingState: billingState,
      shippingZipCode: billingZipCode,
      notes: fullNotes || null,
      acceptsMarketing: acceptsMarketing || false,
      accountStatus: 'pending_approval' as const,
    };

    const customer = await storage.createB2bCustomer(customerData);

    // If store location is same as business, create a location from business address
    if (storeLocationSameAsBusiness === 'yes') {
      // Create location from business address
      await storage.createCustomerLocation({
        customerId: customer.id,
        storeName: accountName,
        storeAddress: billingAddress,
        storeCity: billingCity,
        storeState: billingState,
        storeZipCode: billingZipCode,
        storePhone: phoneNumber,
        storeEmail: emailAddress,
        isPrimary: true,
        showOnWhereToBuy: true,
      });
    } 
    // If single different location provided, create it
    else if (storeLocationSameAsBusiness === 'no' && hasMultipleLocations === 'no' && storeName && storeAddress) {
      await storage.createCustomerLocation({
        customerId: customer.id,
        storeName,
        storeAddress,
        storeCity: storeCity || billingCity,
        storeState: storeState || billingState,
        storeZipCode: storeZipCode || billingZipCode,
        storePhone: storePhone || null,
        storeEmail: storeEmail || null,
        isPrimary: true,
        showOnWhereToBuy: true,
      });
    }
    // For multiple locations, admin will add them after approval
    
    // Send notification email to support
    try {
      const emailData = {
        accountName,
        customerType,
        customerNumber,
        primaryContactName,
        primaryContactRole,
        emailAddress,
        phoneNumber,
        altPhoneNumber,
        licenseNumber,
        taxId,
        billingAddress,
        billingCity,
        billingState,
        billingZipCode,
        storeLocationSameAsBusiness,
        hasMultipleLocations,
        notes: fullNotes,
        acceptsMarketing: acceptsMarketing || false,
        submittedAt: new Date(),
      };
      
      const { subject, html, text } = generateWholesaleApplicationEmail(emailData);
      await sendEmail('support@nashobawinery.com', subject, html, text);
      console.log('Wholesale application notification sent to support@nashobawinery.com');
    } catch (emailError) {
      // Log email error but don't fail the registration
      console.error('Failed to send wholesale application notification email:', emailError);
    }
    
    res.json({ 
      success: true,
      message: 'Application submitted successfully. You will be notified once your account is approved.',
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

    // Explicitly save session before sending response to ensure it's persisted
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Failed to save session' });
      }
      
      res.json({
        success: true,
        user: {
          id: customer.id,
          accountName: customer.accountName,
          email: customer.emailAddress,
          type: 'customer',
        },
      });
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

    // Explicitly save session before sending response to ensure it's persisted
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Failed to save session' });
      }
      
      res.json({
        success: true,
        user: {
          id: salesRep.id,
          name: `${salesRep.firstName} ${salesRep.lastName}`,
          email: salesRep.email,
          type: 'sales_rep',
        },
      });
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
    // Support admin and sales rep impersonation via customerId query parameter
    let customerId = req.session.b2bUserId!;
    const isAdmin = req.session.b2bUserType === 'admin';
    const isSalesRep = req.session.b2bUserType === 'sales_rep';
    
    if ((isAdmin || isSalesRep) && req.query.customerId) {
      customerId = req.query.customerId as string;
      
      // Sales reps can only impersonate their assigned customers
      if (isSalesRep) {
        const customer = await storage.getB2bCustomer(customerId);
        if (!customer || customer.salesRepId !== req.session.b2bUserId) {
          return res.status(403).json({ error: 'You can only view products for customers assigned to you' });
        }
      }
    } else if (!isAdmin && !isSalesRep && req.session.b2bUserType !== 'customer') {
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

// Get customer's previous products (for reorder page) - support admin/sales rep impersonation
router.get('/api/b2b/customer/previous-products', requireB2bAuth, async (req: Request, res: Response) => {
  try {
    // Support admin and sales rep impersonation via customerId query parameter
    let customerId = req.session.b2bUserId!;
    const isAdmin = req.session.b2bUserType === 'admin';
    const isSalesRep = req.session.b2bUserType === 'sales_rep';
    
    if ((isAdmin || isSalesRep) && req.query.customerId) {
      customerId = req.query.customerId as string;
      
      // Sales reps can only impersonate their assigned customers
      if (isSalesRep) {
        const customer = await storage.getB2bCustomer(customerId);
        if (!customer || customer.salesRepId !== req.session.b2bUserId) {
          return res.status(403).json({ error: 'You can only view products for customers assigned to you' });
        }
      }
    } else if (!isAdmin && !isSalesRep && req.session.b2bUserType !== 'customer') {
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

// Get customer order history - support admin/sales rep impersonation
router.get('/api/b2b/customer/orders', requireB2bAuth, async (req: Request, res: Response) => {
  try {
    // Support admin and sales rep impersonation via customerId query parameter
    let customerId = req.session.b2bUserId!;
    const isAdmin = req.session.b2bUserType === 'admin';
    const isSalesRep = req.session.b2bUserType === 'sales_rep';
    
    if ((isAdmin || isSalesRep) && req.query.customerId) {
      customerId = req.query.customerId as string;
      
      // Sales reps can only impersonate their assigned customers
      if (isSalesRep) {
        const customer = await storage.getB2bCustomer(customerId);
        if (!customer || customer.salesRepId !== req.session.b2bUserId) {
          return res.status(403).json({ error: 'You can only view orders for customers assigned to you' });
        }
      }
    } else if (!isAdmin && !isSalesRep && req.session.b2bUserType !== 'customer') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const orders = await storage.getB2bOrders(customerId);
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get specific order details - support admin/sales rep impersonation
router.get('/api/b2b/customer/orders/:id', requireB2bAuth, async (req: Request, res: Response) => {
  try {
    // Support admin and sales rep impersonation via customerId query parameter
    let customerId = req.session.b2bUserId!;
    const isAdmin = req.session.b2bUserType === 'admin';
    const isSalesRep = req.session.b2bUserType === 'sales_rep';
    
    if ((isAdmin || isSalesRep) && req.query.customerId) {
      customerId = req.query.customerId as string;
      
      // Sales reps can only impersonate their assigned customers
      if (isSalesRep) {
        const customer = await storage.getB2bCustomer(customerId);
        if (!customer || customer.salesRepId !== req.session.b2bUserId) {
          return res.status(403).json({ error: 'You can only view orders for customers assigned to you' });
        }
      }
    } else if (!isAdmin && !isSalesRep && req.session.b2bUserType !== 'customer') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const order = await storage.getB2bOrder(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify order belongs to customer (or admin/sales rep is accessing it)
    if (order.customerId !== customerId && !isAdmin && !isSalesRep) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Place order (supports admin/sales rep impersonation via customerId parameter)
router.post('/api/b2b/customer/orders', requireB2bAuth, async (req: Request, res: Response) => {
  try {
    const { items, notes, shippingAddress, customerId } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    // Determine which customer to place order for (admin/sales rep can specify customerId)
    let targetCustomerId = req.session.b2bUserId!;
    const isAdmin = req.session.b2bUserType === 'admin';
    const isSalesRep = req.session.b2bUserType === 'sales_rep';
    
    // If customerId is provided, verify user is admin or sales rep
    if (customerId) {
      if (isAdmin) {
        // Admin can place order for any customer
        targetCustomerId = customerId;
      } else if (isSalesRep) {
        // Sales rep can only place orders for their assigned customers
        const customer = await storage.getB2bCustomer(customerId);
        if (!customer || customer.salesRepId !== req.session.b2bUserId) {
          return res.status(403).json({ error: 'You can only place orders for customers assigned to you' });
        }
        targetCustomerId = customerId;
      } else {
        return res.status(403).json({ error: 'Only admins and sales reps can place orders for other customers' });
      }
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
    
    // Generate delivery date token for sales rep workflow (7-day expiration for security)
    const deliveryDateToken = randomBytes(32).toString('hex');
    const deliveryDateTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const orderData = {
      customerId: targetCustomerId,
      orderNumber,
      status: 'pending_delivery_date',
      subtotal: subtotal.toFixed(2),
      tax: '0.00',
      total: subtotal.toFixed(2),
      notes: notes || null,
      shippingAddress: shippingAddress?.address || customer.shippingAddress,
      shippingCity: shippingAddress?.city || customer.shippingCity,
      shippingState: shippingAddress?.state || customer.shippingState,
      shippingZipCode: shippingAddress?.zipCode || customer.shippingZipCode,
      deliveryDateToken,
      deliveryDateTokenExpiresAt,
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

// Sales Rep: Create a new customer (auto-assigned to this sales rep)
router.post('/api/b2b/sales-rep/customers', requireB2bSalesRep, async (req: Request, res: Response) => {
  try {
    const { tierId, autoApprove, autoGeneratePassword = true, customPassword, salesRepId: _ignored, ...customerData } = req.body;
    // Always use the session salesRepId, never trust client-provided salesRepId
    const salesRepId = req.session.b2bUserId;
    
    // Generate a unique customer number (same format as registration)
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const customerNumber = `NVW-${timestamp}-${randomPart}`;
    
    // Validate customer data with generated customer number
    const validatedData = insertB2bCustomerSchema.parse({
      ...customerData,
      customerNumber,
    });
    
    // Check if email already exists
    const existing = await storage.getB2bCustomerByEmail(validatedData.emailAddress);
    if (existing) {
      return res.status(400).json({ error: 'Email address already registered' });
    }

    // Create customer with pending_approval status initially
    const customer = await storage.createB2bCustomer(validatedData);
    
    // Always assign to this sales rep
    await storage.updateB2bCustomer(customer.id, { salesRepId });
    
    // Get sales rep info for notification
    const salesRep = await storage.getSalesRep(salesRepId!);
    
    // Notify all admins about the new customer (async, non-blocking)
    notifyAdminsOfCustomerChange('created', { ...customer, salesRepId }, salesRep).catch(err => {
      console.error('Background admin notification failed:', err);
    });
    
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
      
      // Approve customer (sales rep acts as approver - pass null for approvedByAdminId since sales reps aren't admins)
      const approvedCustomer = await storage.approveB2bCustomer(
        customer.id,
        tierId,
        passwordHash,
        null
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
    console.error('Sales rep create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Sales Rep: Update a customer they are assigned to
router.put('/api/b2b/sales-rep/customers/:id', requireB2bSalesRep, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const salesRepId = req.session.b2bUserId;
    const updateData = req.body;

    // Get existing customer
    const existingCustomer = await storage.getB2bCustomer(id);
    if (!existingCustomer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check if this sales rep is assigned to this customer
    if (existingCustomer.salesRepId !== salesRepId) {
      return res.status(403).json({ error: 'You can only edit customers assigned to you' });
    }

    // If email is being changed, check if new email is already in use
    if (updateData.emailAddress && updateData.emailAddress !== existingCustomer.emailAddress) {
      const emailExists = await storage.getB2bCustomerByEmail(updateData.emailAddress);
      if (emailExists) {
        return res.status(400).json({ error: 'Duplicate Email' });
      }
    }

    // Prevent manual assignment of Tier 2 (auto-cart-upgrade only)
    // Check both tierId and pricingTierId for compatibility with different field names
    const tierIdToValidate = updateData.tierId || updateData.pricingTierId;
    if (tierIdToValidate) {
      const tierError = await validateTierAssignment(tierIdToValidate);
      if (tierError) {
        return res.status(400).json({ error: tierError });
      }
    }

    // Sales reps cannot change the sales rep assignment or account status (admin-only fields)
    delete updateData.salesRepId;
    delete updateData.accountStatus;

    // Track what fields are being changed for the notification
    const fieldLabels: Record<string, string> = {
      accountName: 'Account Name',
      primaryContactName: 'Contact Name',
      primaryContactRole: 'Contact Role',
      emailAddress: 'Email',
      phoneNumber: 'Phone',
      altPhoneNumber: 'Alt Phone',
      licenseNumber: 'License Number',
      taxId: 'Tax ID',
      customerType: 'Customer Type',
      billingAddress: 'Billing Address',
      billingCity: 'Billing City',
      billingState: 'Billing State',
      billingZipCode: 'Billing Zip',
      shippingAddress: 'Shipping Address',
      shippingCity: 'Shipping City',
      shippingState: 'Shipping State',
      shippingZipCode: 'Shipping Zip',
      notes: 'Notes',
      acceptsMarketing: 'Marketing Opt-in',
    };
    
    const changes: { field: string; oldValue: any; newValue: any }[] = [];
    for (const [key, value] of Object.entries(updateData)) {
      if (key in fieldLabels && (existingCustomer as any)[key] !== value) {
        changes.push({
          field: fieldLabels[key] || key,
          oldValue: (existingCustomer as any)[key],
          newValue: value,
        });
      }
    }

    // Update customer
    const updatedCustomer = await storage.updateB2bCustomer(id, updateData);

    if (!updatedCustomer) {
      return res.status(500).json({ error: 'Failed to update customer' });
    }

    // If changes were made, notify admins
    if (changes.length > 0) {
      const salesRep = await storage.getSalesRep(salesRepId!);
      notifyAdminsOfCustomerChange('updated', updatedCustomer, salesRep, changes).catch(err => {
        console.error('Background admin notification failed:', err);
      });
    }

    res.json({ success: true, customer: updatedCustomer });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid customer data', details: error.errors });
    }
    console.error('Sales rep update customer error:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Sales Rep: Get customer locations (for customers assigned to them)
router.get('/api/b2b/sales-rep/customers/:id/locations', requireB2bSalesRep, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const salesRepId = req.session.b2bUserId;

    // Get customer to verify assignment
    const customer = await storage.getB2bCustomer(id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check if this sales rep is assigned to this customer
    if (customer.salesRepId !== salesRepId) {
      return res.status(403).json({ error: 'You can only view locations for customers assigned to you' });
    }

    const locations = await storage.getCustomerLocations(id);
    res.json(locations);
  } catch (error) {
    console.error('Sales rep get customer locations error:', error);
    res.status(500).json({ error: 'Failed to get customer locations' });
  }
});

// Sales Rep: Create customer location (for customers assigned to them)
router.post('/api/b2b/sales-rep/customers/:id/locations', requireB2bSalesRep, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const salesRepId = req.session.b2bUserId;
    const locationData = req.body;

    // Verify customer exists and is assigned to this sales rep
    const customer = await storage.getB2bCustomer(id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (customer.salesRepId !== salesRepId) {
      return res.status(403).json({ error: 'You can only add locations for customers assigned to you' });
    }

    const location = await storage.createCustomerLocation({
      ...locationData,
      customerId: id,
    });

    res.status(201).json(location);
  } catch (error) {
    console.error('Sales rep create customer location error:', error);
    res.status(500).json({ error: 'Failed to create customer location' });
  }
});

// Sales Rep: Update customer location (for customers assigned to them)
router.put('/api/b2b/sales-rep/customers/:customerId/locations/:locationId', requireB2bSalesRep, async (req: Request, res: Response) => {
  try {
    const { customerId, locationId } = req.params;
    const salesRepId = req.session.b2bUserId;
    const updateData = req.body;

    // Verify customer exists and is assigned to this sales rep
    const customer = await storage.getB2bCustomer(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (customer.salesRepId !== salesRepId) {
      return res.status(403).json({ error: 'You can only update locations for customers assigned to you' });
    }

    // Verify location exists and belongs to customer
    const locations = await storage.getCustomerLocations(customerId);
    const location = locations.find((l: any) => l.id === locationId);
    if (!location) {
      return res.status(404).json({ error: 'Location not found for this customer' });
    }

    const updatedLocation = await storage.updateCustomerLocation(locationId, updateData);
    res.json(updatedLocation);
  } catch (error) {
    console.error('Sales rep update customer location error:', error);
    res.status(500).json({ error: 'Failed to update customer location' });
  }
});

// Sales Rep: Delete customer location (for customers assigned to them)
router.delete('/api/b2b/sales-rep/customers/:customerId/locations/:locationId', requireB2bSalesRep, async (req: Request, res: Response) => {
  try {
    const { customerId, locationId } = req.params;
    const salesRepId = req.session.b2bUserId;

    // Verify customer exists and is assigned to this sales rep
    const customer = await storage.getB2bCustomer(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (customer.salesRepId !== salesRepId) {
      return res.status(403).json({ error: 'You can only delete locations for customers assigned to you' });
    }

    // Verify location exists and belongs to customer
    const locations = await storage.getCustomerLocations(customerId);
    const location = locations.find((l: any) => l.id === locationId);
    if (!location) {
      return res.status(404).json({ error: 'Location not found for this customer' });
    }

    await storage.deleteCustomerLocation(locationId);
    res.json({ success: true });
  } catch (error) {
    console.error('Sales rep delete customer location error:', error);
    res.status(500).json({ error: 'Failed to delete customer location' });
  }
});

// Sales Rep: Place order for a customer assigned to them  
router.post('/api/b2b/sales-rep/orders/place', requireB2bSalesRep, async (req: Request, res: Response) => {
  try {
    const { customerId, items, notes } = req.body;
    const salesRepId = req.session.b2bUserId;

    // Validate input
    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Customer and at least one item are required' });
    }

    // Fetch customer and verify assignment
    const customer = await storage.getB2bCustomer(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (customer.salesRepId !== salesRepId) {
      return res.status(403).json({ error: 'You can only place orders for customers assigned to you' });
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
    const orderNumber = `SR-${Date.now()}`;
    
    // Generate delivery date token for sales rep workflow (7-day expiration for security)
    const deliveryDateToken = randomBytes(32).toString('hex');
    const deliveryDateTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    const order = await storage.createB2bOrder({
      customerId,
      orderNumber,
      status: 'pending_delivery_date',
      subtotal: (subtotal + totalDiscount).toFixed(2),
      tax: '0',
      total: subtotal.toFixed(2),
      notes: notes || '',
      shippingAddress: customer.shippingAddress || '',
      shippingCity: customer.shippingCity || '',
      shippingState: customer.shippingState || '',
      shippingZipCode: customer.shippingZipCode || '',
      deliveryDateToken,
      deliveryDateTokenExpiresAt,
    }, orderItems.map(item => ({
      productId: item.productId,
      productName: item.productName,
      sku: item.productSku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      retailPrice: item.retailPrice,
      lineTotal: item.totalPrice,
    })));

    // Create commission record for the sales rep
    const salesRep = await storage.getSalesRep(salesRepId!);
    if (salesRep && salesRep.commissionPercentage) {
      const commissionPercentage = parseFloat(salesRep.commissionPercentage.toString());
      const commissionAmount = (subtotal * commissionPercentage) / 100;
      
      await storage.createCommission({
        orderId: order.id,
        salesRepId: salesRepId!,
        orderTotal: subtotal.toFixed(2),
        commissionPercentage: commissionPercentage.toString(),
        commissionAmount: commissionAmount.toFixed(2),
        status: 'pending',
      });
    }

    // Send order notifications (delivery date workflow email to sales rep)
    try {
      await sendOrderNotifications(order, customer, orderItems.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.totalPrice,
      })));
    } catch (emailError) {
      console.error('Failed to send order notifications:', emailError);
    }

    res.json({ success: true, orderId: order.id });
  } catch (error) {
    console.error('Sales rep place order error:', error);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// Customer: Get past order items (items previously ordered by customer)
router.get('/api/b2b/customer/past-orders', requireB2bAuth, async (req: Request, res: Response) => {
  try {
    // Support admin and sales rep impersonation via customerId query parameter
    let customerId = req.session.b2bUserId;
    const isAdmin = req.session.b2bUserType === 'admin';
    const isSalesRep = req.session.b2bUserType === 'sales_rep';
    
    if ((isAdmin || isSalesRep) && req.query.customerId) {
      customerId = req.query.customerId as string;
      
      // Sales reps can only impersonate their assigned customers
      if (isSalesRep) {
        const customer = await storage.getB2bCustomer(customerId);
        if (!customer || customer.salesRepId !== req.session.b2bUserId) {
          return res.status(403).json({ error: 'You can only view past orders for customers assigned to you' });
        }
      }
    } else if (!isAdmin && !isSalesRep && req.session.b2bUserType !== 'customer') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
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

// Helper function to get the application domain
function getAppDomain(): string {
  return process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
}

// Helper function to send order notifications
async function sendOrderNotifications(order: any, customer: any, items: any[]) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SendGrid not configured, skipping order notifications');
    return;
  }

  const { sendEmail } = await import('./email');
  const domain = getAppDomain();

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

  // Send delivery date request email to sales rep if assigned
  if (customer.salesRep && order.deliveryDateToken) {
    const deliveryDateUrl = `https://${domain}/b2b/order-delivery/${order.deliveryDateToken}`;
    
    const salesRepEmailHtml = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #5C2535; color: #F5F5F0; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0;">New Order - Action Required</h1>
            <p style="margin: 10px 0 0;">Please set delivery date</p>
          </div>
          <div style="padding: 30px 20px;">
            <p>Dear ${customer.salesRep.firstName},</p>
            
            <p>A new B2B order has been placed and requires your attention. Please set the delivery date to proceed with processing.</p>
            
            <div style="background-color: #F5F5F0; border-left: 4px solid #5C2535; padding: 16px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
              <p style="margin: 8px 0;"><strong>Customer:</strong> ${customer.accountName}</p>
              <p style="margin: 8px 0;"><strong>Contact:</strong> ${customer.primaryContactName}</p>
              <p style="margin: 0;"><strong>Order Total:</strong> $${order.total}</p>
            </div>
            
            <h3 style="color: #5C2535;">Order Items</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background-color: #f8f9fa;">
                  <th style="padding: 12px 8px; border-bottom: 2px solid #ddd; text-align: left;">Product</th>
                  <th style="padding: 12px 8px; border-bottom: 2px solid #ddd; text-align: center;">Qty</th>
                  <th style="padding: 12px 8px; border-bottom: 2px solid #ddd; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(item => `
                  <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.productName}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${item.lineTotal}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <p style="text-align: center; margin: 30px 0;">
              <a href="${deliveryDateUrl}" style="display: inline-block; background-color: #5C2535; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: bold;">Set Delivery Date</a>
            </p>
            
            <p style="color: #666; font-size: 14px;">After you set the delivery date, the order will be sent to an administrator for approval before the invoice is generated and sent to the customer.</p>
            
            <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p>Nashoba Valley Winery - B2B Wholesale Portal</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    await sendEmail(
      customer.salesRep.email,
      `Action Required: Set Delivery Date - Order ${order.orderNumber}`,
      salesRepEmailHtml,
      `New order ${order.orderNumber} requires delivery date. Customer: ${customer.accountName}. Total: $${order.total}. Set delivery date: ${deliveryDateUrl}`
    );
  }

  // Send order received confirmation to customer (they will get invoice after approval)
  const customerConfirmationHtml = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
          .email-container { max-width: 600px; margin: 0 auto; background-color: white; }
          .content { padding: 30px 25px; }
        </style>
      </head>
      <body>
        <div class="email-container">
          ${generateBrandedEmailHeader('Order Received', 'Thank you for your order!')}
          <div class="content">
            <p>Dear ${customer.primaryContactName},</p>
            
            <p>We're delighted to confirm that we've received your order! Your order is now being processed by our team, and you'll receive an invoice with your scheduled delivery date once it's been approved.</p>
            
            <div style="background-color: #F5F5F0; border-left: 4px solid #C9A961; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <p style="margin: 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
              <p style="margin: 0;"><strong>Order Total:</strong> $${order.total}</p>
            </div>
            
            <h3 style="color: #5C2535;">Order Summary</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background-color: #f8f9fa;">
                  <th style="padding: 12px 8px; border-bottom: 2px solid #ddd; text-align: left;">Product</th>
                  <th style="padding: 12px 8px; border-bottom: 2px solid #ddd; text-align: center;">Qty</th>
                  <th style="padding: 12px 8px; border-bottom: 2px solid #ddd; text-align: right;">Price</th>
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
            
            <p>We truly appreciate your business and partnership with Nashoba Valley Winery!</p>
          </div>
          ${generateBrandedEmailFooter()}
        </div>
      </body>
    </html>
  `;

  await sendEmail(
    customer.emailAddress,
    `Order Received: ${order.orderNumber}`,
    customerConfirmationHtml,
    `Thank you for your order ${order.orderNumber}. Total: $${order.total}. You will receive an invoice with your delivery date once approved.`
  );

  // Send notification to managers/additional recipients
  const managerEmailsSetting = await storage.getB2bSetting('manager_emails');
  if (managerEmailsSetting?.settingValue) {
    const managerEmails = managerEmailsSetting.settingValue.split(',').map((e: string) => e.trim()).filter(e => e);
    for (const managerEmail of managerEmails) {
      await sendEmail(
        managerEmail,
        `New B2B Order - ${order.orderNumber}`,
        emailHtml,
        emailText
      );
    }
  }
}

// ============= ORDER WORKFLOW ENDPOINTS =============

// Get order details for delivery date entry page (via token from email)
router.get('/api/b2b/order-workflow/delivery-date/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    const orders = await db.select()
      .from(b2bOrders)
      .where(eq(b2bOrders.deliveryDateToken, token));
    
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found or link has expired' });
    }
    
    const order = orders[0];
    
    // Check if token has expired
    if (order.deliveryDateTokenExpiresAt && new Date() > new Date(order.deliveryDateTokenExpiresAt)) {
      return res.status(400).json({ error: 'This link has expired. Please contact an administrator.' });
    }
    
    // Check if delivery date has already been set
    if (order.scheduledDeliveryDate) {
      return res.status(400).json({ 
        error: 'Delivery date has already been set for this order.',
        alreadySet: true,
        deliveryDate: order.scheduledDeliveryDate
      });
    }
    
    // Get customer info
    const customer = await storage.getB2bCustomer(order.customerId);
    
    // Get order items
    const items = await db.select()
      .from(b2bOrderItems)
      .where(eq(b2bOrderItems.orderId, order.id));
    
    res.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        orderDate: order.orderDate,
        total: order.total,
        subtotal: order.subtotal,
        status: order.status,
        notes: order.notes,
        shippingAddress: order.shippingAddress,
        shippingCity: order.shippingCity,
        shippingState: order.shippingState,
        shippingZipCode: order.shippingZipCode,
      },
      customer: customer ? {
        accountName: customer.accountName,
        primaryContactName: customer.primaryContactName,
        emailAddress: customer.emailAddress,
        phoneNumber: customer.phoneNumber,
      } : null,
      items,
    });
  } catch (error) {
    console.error('Error fetching order for delivery date:', error);
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

// Set delivery date for an order (via token from email)
router.post('/api/b2b/order-workflow/delivery-date/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { deliveryDate } = req.body;
    
    if (!deliveryDate) {
      return res.status(400).json({ error: 'Delivery date is required' });
    }
    
    const parsedDate = new Date(deliveryDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: 'Invalid delivery date format' });
    }
    
    // Validate delivery date is in the future
    if (parsedDate < new Date()) {
      return res.status(400).json({ error: 'Delivery date must be in the future' });
    }
    
    const orders = await db.select()
      .from(b2bOrders)
      .where(eq(b2bOrders.deliveryDateToken, token));
    
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found or link has expired' });
    }
    
    const order = orders[0];
    
    // Check if token has expired
    if (order.deliveryDateTokenExpiresAt && new Date() > new Date(order.deliveryDateTokenExpiresAt)) {
      return res.status(400).json({ error: 'This link has expired. Please contact an administrator.' });
    }
    
    // Check if delivery date has already been set
    if (order.scheduledDeliveryDate) {
      return res.status(400).json({ error: 'Delivery date has already been set for this order.' });
    }
    
    // Generate approval token for admin
    const approvalToken = randomBytes(32).toString('hex');
    const approvalTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days for security
    
    // Update order with delivery date and approval token
    await db.update(b2bOrders)
      .set({
        scheduledDeliveryDate: parsedDate,
        status: 'pending_approval',
        approvalToken,
        approvalTokenExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(b2bOrders.id, order.id));
    
    // Get customer and items for email
    const customer = await storage.getB2bCustomer(order.customerId);
    const items = await db.select().from(b2bOrderItems).where(eq(b2bOrderItems.orderId, order.id));
    
    // Send approval request email to all B2B admins
    if (process.env.SENDGRID_API_KEY && customer) {
      const { sendEmail } = await import('./email');
      const domain = getAppDomain();
      const approvalUrl = `https://${domain}/b2b/order-approval/${approvalToken}`;
      
      // Get all active admins
      const admins = await storage.getAllB2bAdmins(true);
      
      const itemsHtml = items.map(item => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.productName}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${item.unitPrice}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${item.lineTotal}</td>
        </tr>
      `).join('');
      
      const approvalEmailHtml = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #5C2535; color: #F5F5F0; padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0;">Order Approval Required</h1>
              <p style="margin: 10px 0 0;">Please review and approve this order</p>
            </div>
            <div style="padding: 30px 20px;">
              <p>A B2B order is ready for your approval. The sales representative has set a delivery date and the order is waiting for final approval before the invoice is sent to the customer.</p>
              
              <div style="background-color: #F5F5F0; border-left: 4px solid #5C2535; padding: 16px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
                <p style="margin: 8px 0;"><strong>Customer:</strong> ${customer.accountName}</p>
                <p style="margin: 8px 0;"><strong>Contact:</strong> ${customer.primaryContactName}</p>
                <p style="margin: 8px 0;"><strong>Scheduled Delivery:</strong> ${parsedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p style="margin: 0;"><strong>Order Total:</strong> $${order.total}</p>
              </div>
              
              <h3 style="color: #5C2535;">Invoice Preview</h3>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                  <tr style="background-color: #f8f9fa;">
                    <th style="padding: 12px 8px; border-bottom: 2px solid #ddd; text-align: left;">Product</th>
                    <th style="padding: 12px 8px; border-bottom: 2px solid #ddd; text-align: center;">Qty</th>
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
              
              <p style="text-align: center; margin: 30px 0;">
                <a href="${approvalUrl}" style="display: inline-block; background-color: #5C2535; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: bold;">Review & Approve Order</a>
              </p>
              
              <p style="color: #666; font-size: 14px;">Once approved, an invoice will be generated and sent to the customer with the scheduled delivery date.</p>
              
              <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p>Nashoba Valley Winery - B2B Wholesale Portal</p>
              </div>
            </div>
          </body>
        </html>
      `;
      
      for (const admin of admins) {
        await sendEmail(
          admin.email,
          `Approval Required: Order ${order.orderNumber}`,
          approvalEmailHtml,
          `Order ${order.orderNumber} from ${customer.accountName} is ready for approval. Delivery: ${parsedDate.toLocaleDateString()}. Total: $${order.total}. Review: ${approvalUrl}`
        );
      }
    }
    
    res.json({ success: true, message: 'Delivery date set successfully. Order sent for approval.' });
  } catch (error) {
    console.error('Error setting delivery date:', error);
    res.status(500).json({ error: 'Failed to set delivery date' });
  }
});

// Get order details for approval page (via token from email)
router.get('/api/b2b/order-workflow/approval/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    const orders = await db.select()
      .from(b2bOrders)
      .where(eq(b2bOrders.approvalToken, token));
    
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found or link has expired' });
    }
    
    const order = orders[0];
    
    // Check if token has expired
    if (order.approvalTokenExpiresAt && new Date() > new Date(order.approvalTokenExpiresAt)) {
      return res.status(400).json({ error: 'This link has expired. Please use the admin dashboard.' });
    }
    
    // Check if order has already been approved or rejected
    if (order.approvedAt) {
      return res.status(400).json({ 
        error: 'This order has already been approved.',
        alreadyProcessed: true,
        status: order.status
      });
    }
    if (order.rejectedAt) {
      return res.status(400).json({ 
        error: 'This order has been rejected.',
        alreadyProcessed: true,
        status: order.status
      });
    }
    
    // Get customer info
    const customer = await storage.getB2bCustomer(order.customerId);
    
    // Get order items
    const items = await db.select()
      .from(b2bOrderItems)
      .where(eq(b2bOrderItems.orderId, order.id));
    
    res.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        orderDate: order.orderDate,
        scheduledDeliveryDate: order.scheduledDeliveryDate,
        total: order.total,
        subtotal: order.subtotal,
        status: order.status,
        notes: order.notes,
        shippingAddress: order.shippingAddress,
        shippingCity: order.shippingCity,
        shippingState: order.shippingState,
        shippingZipCode: order.shippingZipCode,
      },
      customer: customer ? {
        accountName: customer.accountName,
        primaryContactName: customer.primaryContactName,
        emailAddress: customer.emailAddress,
        phoneNumber: customer.phoneNumber,
      } : null,
      items,
    });
  } catch (error) {
    console.error('Error fetching order for approval:', error);
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

// Approve or reject an order (via token from email)
router.post('/api/b2b/order-workflow/approval/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { action, rejectionReason } = req.body;
    
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be "approve" or "reject".' });
    }
    
    const orders = await db.select()
      .from(b2bOrders)
      .where(eq(b2bOrders.approvalToken, token));
    
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found or link has expired' });
    }
    
    const order = orders[0];
    
    // Check if token has expired
    if (order.approvalTokenExpiresAt && new Date() > new Date(order.approvalTokenExpiresAt)) {
      return res.status(400).json({ error: 'This link has expired. Please use the admin dashboard.' });
    }
    
    // Check if order has already been processed
    if (order.approvedAt || order.rejectedAt) {
      return res.status(400).json({ error: 'This order has already been processed.' });
    }
    
    const customer = await storage.getB2bCustomer(order.customerId);
    const items = await db.select().from(b2bOrderItems).where(eq(b2bOrderItems.orderId, order.id));
    
    if (action === 'approve') {
      // Generate invoice number and delivery confirmation token
      const invoiceNumber = `INV-${Date.now()}`;
      const deliveryConfirmationToken = randomBytes(32).toString('hex');
      const deliveryConfirmationTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days for security
      
      await db.update(b2bOrders)
        .set({
          status: 'approved_delivery_pending',
          invoiceNumber,
          approvedAt: new Date(),
          deliveryConfirmationToken,
          deliveryConfirmationTokenExpiresAt,
          updatedAt: new Date(),
        })
        .where(eq(b2bOrders.id, order.id));
      
      // Send invoice to customer and sales rep
      if (process.env.SENDGRID_API_KEY && customer) {
        const { sendEmail } = await import('./email');
        
        const itemsHtml = items.map(item => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.productName}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${item.unitPrice}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${item.lineTotal}</td>
          </tr>
        `).join('');
        
        const deliveryDateStr = order.scheduledDeliveryDate 
          ? new Date(order.scheduledDeliveryDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
          : 'To be determined';
        
        const invoiceHtml = `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #5C2535; color: #F5F5F0; padding: 30px 20px; text-align: center;">
                <h1 style="margin: 0;">Invoice</h1>
                <p style="margin: 10px 0 0;">Order Approved</p>
              </div>
              <div style="padding: 30px 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                  <div>
                    <h3 style="color: #5C2535; margin: 0 0 10px;">Nashoba Valley Winery</h3>
                    <p style="margin: 0; color: #666;">100 Wattaquadock Hill Road<br>Bolton, MA 01740</p>
                  </div>
                  <div style="text-align: right;">
                    <p style="margin: 0;"><strong>Invoice #:</strong> ${invoiceNumber}</p>
                    <p style="margin: 0;"><strong>Order #:</strong> ${order.orderNumber}</p>
                    <p style="margin: 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div style="background-color: #F5F5F0; padding: 16px; margin: 20px 0; border-radius: 4px;">
                  <h4 style="margin: 0 0 10px; color: #5C2535;">Bill To:</h4>
                  <p style="margin: 0;"><strong>${customer.accountName}</strong></p>
                  <p style="margin: 0;">${customer.primaryContactName}</p>
                  <p style="margin: 0;">${customer.emailAddress}</p>
                  ${customer.phoneNumber ? `<p style="margin: 0;">${customer.phoneNumber}</p>` : ''}
                </div>
                
                <div style="background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 16px; margin: 20px 0;">
                  <p style="margin: 0;"><strong>Scheduled Delivery Date:</strong> ${deliveryDateStr}</p>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                  <thead>
                    <tr style="background-color: #f8f9fa;">
                      <th style="padding: 12px 8px; border-bottom: 2px solid #ddd; text-align: left;">Product</th>
                      <th style="padding: 12px 8px; border-bottom: 2px solid #ddd; text-align: center;">Qty</th>
                      <th style="padding: 12px 8px; border-bottom: 2px solid #ddd; text-align: right;">Unit Price</th>
                      <th style="padding: 12px 8px; border-bottom: 2px solid #ddd; text-align: right;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="3" style="padding: 12px 8px; text-align: right; font-weight: bold; border-top: 2px solid #ddd;">Total Due:</td>
                      <td style="padding: 12px 8px; text-align: right; font-weight: bold; font-size: 18px; border-top: 2px solid #ddd;">$${order.total}</td>
                    </tr>
                  </tfoot>
                </table>
                
                <div style="background-color: #F5F5F0; padding: 16px; margin: 20px 0; border-radius: 4px;">
                  <h4 style="margin: 0 0 10px; color: #5C2535;">Payment Terms</h4>
                  <p style="margin: 0;">Payment is due upon delivery. Please make checks payable to Nashoba Valley Winery.</p>
                </div>
                
                <p>Thank you for your business!</p>
                
                <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                  <p>Nashoba Valley Winery - B2B Wholesale Portal</p>
                </div>
              </div>
            </body>
          </html>
        `;
        
        // Send invoice to customer
        await sendEmail(
          customer.emailAddress,
          `Invoice ${invoiceNumber} - Order ${order.orderNumber}`,
          invoiceHtml,
          `Invoice ${invoiceNumber} for order ${order.orderNumber}. Delivery: ${deliveryDateStr}. Total: $${order.total}`
        );
        
        // Send invoice to sales rep if assigned
        if (customer.salesRepId) {
          const salesRep = await storage.getSalesRep(customer.salesRepId);
          if (salesRep) {
            await sendEmail(
              salesRep.email,
              `Invoice Sent: ${invoiceNumber} - ${customer.accountName}`,
              invoiceHtml,
              `Invoice ${invoiceNumber} sent to ${customer.accountName}. Delivery: ${deliveryDateStr}. Total: $${order.total}`
            );
          }
        }
      }
      
      res.json({ success: true, message: 'Order approved. Invoice sent to customer.' });
    } else {
      // Reject the order
      await db.update(b2bOrders)
        .set({
          status: 'rejected',
          rejectedAt: new Date(),
          rejectionReason: rejectionReason || null,
          updatedAt: new Date(),
        })
        .where(eq(b2bOrders.id, order.id));
      
      // Notify customer and sales rep of rejection
      if (process.env.SENDGRID_API_KEY && customer) {
        const { sendEmail } = await import('./email');
        
        const rejectionEmailHtml = `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #c62828; color: white; padding: 30px 20px; text-align: center;">
                <h1 style="margin: 0;">Order Update</h1>
              </div>
              <div style="padding: 30px 20px;">
                <p>Dear ${customer.primaryContactName},</p>
                
                <p>We regret to inform you that your order ${order.orderNumber} could not be processed at this time.</p>
                
                ${rejectionReason ? `
                  <div style="background-color: #ffebee; border-left: 4px solid #c62828; padding: 16px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Reason:</strong> ${rejectionReason}</p>
                  </div>
                ` : ''}
                
                <p>If you have any questions, please contact us.</p>
                
                <p>Best regards,<br>Nashoba Valley Winery Team</p>
              </div>
            </body>
          </html>
        `;
        
        await sendEmail(
          customer.emailAddress,
          `Order ${order.orderNumber} Update`,
          rejectionEmailHtml,
          `Your order ${order.orderNumber} could not be processed. ${rejectionReason || ''}`
        );
        
        // Notify sales rep
        if (customer.salesRepId) {
          const salesRep = await storage.getSalesRep(customer.salesRepId);
          if (salesRep) {
            await sendEmail(
              salesRep.email,
              `Order Rejected: ${order.orderNumber} - ${customer.accountName}`,
              rejectionEmailHtml.replace(customer.primaryContactName, salesRep.firstName),
              `Order ${order.orderNumber} from ${customer.accountName} was rejected. ${rejectionReason || ''}`
            );
          }
        }
      }
      
      res.json({ success: true, message: 'Order rejected. Customer has been notified.' });
    }
  } catch (error) {
    console.error('Error processing order approval:', error);
    res.status(500).json({ error: 'Failed to process order' });
  }
});

// Get order details for delivery confirmation page (via token from email)
router.get('/api/b2b/order-workflow/delivery-confirm/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    const orders = await db.select()
      .from(b2bOrders)
      .where(eq(b2bOrders.deliveryConfirmationToken, token));
    
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found or link has expired' });
    }
    
    const order = orders[0];
    
    // Check if token has expired
    if (order.deliveryConfirmationTokenExpiresAt && new Date() > new Date(order.deliveryConfirmationTokenExpiresAt)) {
      return res.status(400).json({ error: 'This link has expired. Please use the admin dashboard.' });
    }
    
    // Check if delivery has already been confirmed
    if (order.deliveredAt) {
      return res.status(400).json({ 
        error: 'Delivery has already been confirmed for this order.',
        alreadyConfirmed: true,
        deliveredAt: order.deliveredAt
      });
    }
    
    // Get customer info
    const customer = await storage.getB2bCustomer(order.customerId);
    
    // Get order items
    const items = await db.select()
      .from(b2bOrderItems)
      .where(eq(b2bOrderItems.orderId, order.id));
    
    res.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        invoiceNumber: order.invoiceNumber,
        orderDate: order.orderDate,
        scheduledDeliveryDate: order.scheduledDeliveryDate,
        total: order.total,
        subtotal: order.subtotal,
        status: order.status,
      },
      customer: customer ? {
        accountName: customer.accountName,
        primaryContactName: customer.primaryContactName,
        emailAddress: customer.emailAddress,
      } : null,
      items,
    });
  } catch (error) {
    console.error('Error fetching order for delivery confirmation:', error);
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

// Confirm delivery of an order (via token from email)
router.post('/api/b2b/order-workflow/delivery-confirm/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    const orders = await db.select()
      .from(b2bOrders)
      .where(eq(b2bOrders.deliveryConfirmationToken, token));
    
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found or link has expired' });
    }
    
    const order = orders[0];
    
    // Check if token has expired
    if (order.deliveryConfirmationTokenExpiresAt && new Date() > new Date(order.deliveryConfirmationTokenExpiresAt)) {
      return res.status(400).json({ error: 'This link has expired. Please use the admin dashboard.' });
    }
    
    // Check if delivery has already been confirmed
    if (order.deliveredAt) {
      return res.status(400).json({ error: 'Delivery has already been confirmed for this order.' });
    }
    
    // Update order status
    await db.update(b2bOrders)
      .set({
        status: 'delivered_pending_payment',
        deliveredAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(b2bOrders.id, order.id));
    
    res.json({ success: true, message: 'Delivery confirmed. Order status updated to Delivered - Pending Payment.' });
  } catch (error) {
    console.error('Error confirming delivery:', error);
    res.status(500).json({ error: 'Failed to confirm delivery' });
  }
});

// Admin: Record payment for an order
router.post('/api/b2b/admin/orders/:id/record-payment', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentMethod, paymentReference, paymentNotes } = req.body;
    
    const order = await storage.getB2bOrder(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Update order with payment info
    await db.update(b2bOrders)
      .set({
        status: 'completed',
        paidAt: new Date(),
        completedAt: new Date(),
        paymentMethod: paymentMethod || null,
        paymentReference: paymentReference || null,
        paymentNotes: paymentNotes || null,
        updatedAt: new Date(),
      })
      .where(eq(b2bOrders.id, id));
    
    // Update commission status to earned
    try {
      const commissions = await storage.getCommissionsByOrderId(id);
      for (const commission of commissions) {
        await storage.updateCommissionStatus(commission.id, 'earned');
      }
    } catch (commissionError) {
      console.error('Error updating commissions:', commissionError);
    }
    
    res.json({ success: true, message: 'Payment recorded successfully.' });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

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

    // Explicitly save session before sending response to ensure it's persisted
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Failed to save session' });
      }
      
      res.json({
        success: true,
        user: {
          id: admin.id,
          name: `${admin.firstName} ${admin.lastName}`,
          email: admin.email,
          type: 'admin',
        },
      });
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
// Sales reps only see their assigned customers (server-side filtering)
router.get('/api/b2b/admin/customers', requireB2bAdminOrSalesRep, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    
    // For sales reps, use SQL-scoped query to only return their assigned customers
    if ((req.session as any).b2bUserType === 'sales_rep') {
      const salesRepId = (req.session as any).b2bUserId;
      const customers = await storage.getB2bCustomersBySalesRep(salesRepId, status as string);
      return res.json(customers);
    }
    
    // For admins, return all customers
    const customers = await storage.getAllB2bCustomers(status as string);
    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Admin/Sales Rep: Create new customer
// Sales reps can create customers that are auto-assigned to them (pending approval only)
router.post('/api/b2b/admin/customers', requireB2bAdminOrSalesRep, async (req: Request, res: Response) => {
  try {
    const isSalesRep = (req.session as any).b2bUserType === 'sales_rep';
    
    // Extract and sanitize input based on role
    const requestBody = req.body;
    let effectiveSalesRepId = requestBody.salesRepId;
    let effectiveAutoApprove = requestBody.autoApprove || false;
    let effectiveTierId = requestBody.tierId;
    const autoGeneratePassword = requestBody.autoGeneratePassword ?? true;
    const customPassword = requestBody.customPassword;
    const { tierId: _, salesRepId: __, autoApprove: ___, autoGeneratePassword: ____, customPassword: _____, ...customerData } = requestBody;
    
    // Sales rep authorization rules:
    // 1. Can only assign customers to themselves
    // 2. Cannot approve customers (only create pending accounts)
    if (isSalesRep) {
      // Force assignment to self
      effectiveSalesRepId = (req.session as any).b2bUserId;
      
      // Reject any attempt to auto-approve
      if (requestBody.autoApprove === true) {
        return res.status(403).json({ error: 'Sales reps cannot approve customers. Create pending customers and an admin will review them.' });
      }
      effectiveAutoApprove = false;
      effectiveTierId = undefined;
      
      // Reject attempt to assign to different sales rep
      if (requestBody.salesRepId && requestBody.salesRepId !== (req.session as any).b2bUserId) {
        return res.status(403).json({ error: 'You can only create customers assigned to yourself' });
      }
    }
    
    // Generate a unique customer number (same format as registration)
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const customerNumber = `NVW-${timestamp}-${randomPart}`;
    
    // Validate customer data with generated customer number
    const validatedData = insertB2bCustomerSchema.parse({
      ...customerData,
      customerNumber,
    });
    
    // Check if email already exists
    const existing = await storage.getB2bCustomerByEmail(validatedData.emailAddress);
    if (existing) {
      return res.status(400).json({ error: 'Email address already registered' });
    }

    // Create customer with pending_approval status initially
    const customer = await storage.createB2bCustomer(validatedData);
    
    // Immediately assign to sales rep if provided (before approval process)
    if (effectiveSalesRepId) {
      await storage.updateB2bCustomer(customer.id, { salesRepId: effectiveSalesRepId });
    }
    
    // If auto-approve is requested and tier is provided, approve immediately
    // Note: Sales reps cannot reach this block due to guard clauses above
    if (effectiveAutoApprove && effectiveTierId) {
      // Prevent manual assignment of Tier 2 (auto-cart-upgrade only)
      const tierError = await validateTierAssignment(effectiveTierId);
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
      
      // Approve customer
      const approvedCustomer = await storage.approveB2bCustomer(
        customer.id,
        effectiveTierId,
        passwordHash,
        adminId
      );
      
      if (!approvedCustomer) {
        return res.status(500).json({ error: 'Customer created but approval failed' });
      }
      
      // Send approval email with login credentials
      try {
        if (process.env.SENDGRID_API_KEY && process.env.RESEND_FROM_EMAIL) {
          const tier = await storage.getTierPricing(effectiveTierId);
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
router.put('/api/b2b/admin/customers/:id', requireB2bAdminOrSalesRep, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    // Get existing customer
    const existingCustomer = await storage.getB2bCustomer(id);
    if (!existingCustomer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Authorization: Sales reps can only update their assigned customers
    if ((req.session as any).b2bUserType === 'sales_rep') {
      const salesRepId = (req.session as any).b2bUserId;
      if (existingCustomer.salesRepId !== salesRepId) {
        return res.status(403).json({ error: 'You can only update customers assigned to you' });
      }
      // Sales reps cannot change the salesRepId (reassign customers)
      if (updateData.salesRepId && updateData.salesRepId !== salesRepId) {
        return res.status(403).json({ error: 'You cannot reassign customers to other sales reps' });
      }
    }

    // If email is being changed, check if new email is already in use
    if (updateData.emailAddress && updateData.emailAddress !== existingCustomer.emailAddress) {
      const emailExists = await storage.getB2bCustomerByEmail(updateData.emailAddress);
      if (emailExists) {
        return res.status(400).json({ error: 'Duplicate Email' });
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

// Admin: Get customer locations
router.get('/api/b2b/admin/customers/:id/locations', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const locations = await storage.getCustomerLocations(id);
    res.json(locations);
  } catch (error) {
    console.error('Get customer locations error:', error);
    res.status(500).json({ error: 'Failed to get customer locations' });
  }
});

// Admin: Create customer location
router.post('/api/b2b/admin/customers/:id/locations', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const locationData = req.body;

    // Verify customer exists
    const customer = await storage.getB2bCustomer(id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const location = await storage.createCustomerLocation({
      ...locationData,
      customerId: id,
    });

    res.status(201).json(location);
  } catch (error) {
    console.error('Create customer location error:', error);
    res.status(500).json({ error: 'Failed to create customer location' });
  }
});

// Admin: Update customer location
router.put('/api/b2b/admin/customers/:customerId/locations/:locationId', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { customerId, locationId } = req.params;
    const updateData = req.body;

    // Verify location exists and belongs to customer
    const location = await storage.getCustomerLocation(locationId);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    if (location.customerId !== customerId) {
      return res.status(400).json({ error: 'Location does not belong to this customer' });
    }

    const updatedLocation = await storage.updateCustomerLocation(locationId, updateData);
    res.json(updatedLocation);
  } catch (error) {
    console.error('Update customer location error:', error);
    res.status(500).json({ error: 'Failed to update customer location' });
  }
});

// Admin: Delete customer location
router.delete('/api/b2b/admin/customers/:customerId/locations/:locationId', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { customerId, locationId } = req.params;

    // Verify location exists and belongs to customer
    const location = await storage.getCustomerLocation(locationId);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    if (location.customerId !== customerId) {
      return res.status(400).json({ error: 'Location does not belong to this customer' });
    }

    await storage.deleteCustomerLocation(locationId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete customer location error:', error);
    res.status(500).json({ error: 'Failed to delete customer location' });
  }
});

// Admin: Get customer manual products (Featured Products for Where to Buy)
router.get('/api/b2b/admin/customers/:id/manual-products', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const manualProducts = await storage.getCustomerManualProducts(id);
    res.json(manualProducts);
  } catch (error) {
    console.error('Get customer manual products error:', error);
    res.status(500).json({ error: 'Failed to get customer manual products' });
  }
});

// Admin: Add manual products to customer (Featured Products for Where to Buy)
router.post('/api/b2b/admin/customers/:id/manual-products', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { productIds, expiresInMonths = 12 } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'productIds array is required' });
    }

    // Verify customer exists
    const customer = await storage.getB2bCustomer(id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + parseInt(expiresInMonths));

    const manualProducts = await storage.addCustomerManualProducts(id, productIds, expiresAt);
    res.json(manualProducts);
  } catch (error) {
    console.error('Add customer manual products error:', error);
    res.status(500).json({ error: 'Failed to add customer manual products' });
  }
});

// Admin: Remove a manual product from customer
router.delete('/api/b2b/admin/customers/:customerId/manual-products/:manualProductId', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { customerId, manualProductId } = req.params;

    // Verify customer exists
    const customer = await storage.getB2bCustomer(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    await storage.removeCustomerManualProduct(manualProductId);
    res.json({ success: true });
  } catch (error) {
    console.error('Remove customer manual product error:', error);
    res.status(500).json({ error: 'Failed to remove customer manual product' });
  }
});

// Admin: Remove all manual products from customer
router.delete('/api/b2b/admin/customers/:id/manual-products', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verify customer exists
    const customer = await storage.getB2bCustomer(id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    await storage.removeAllCustomerManualProducts(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Remove all customer manual products error:', error);
    res.status(500).json({ error: 'Failed to remove all customer manual products' });
  }
});

// Admin: Cleanup orphaned manual products (ghost records where product no longer exists)
router.post('/api/b2b/admin/customers/:id/manual-products/cleanup', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verify customer exists
    const customer = await storage.getB2bCustomer(id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get raw records first to report what will be cleaned up
    const rawRecords = await storage.getCustomerManualProductsRaw(id);
    const validRecords = await storage.getCustomerManualProducts(id);
    const orphanedCount = rawRecords.length - validRecords.length;

    // Cleanup orphaned records
    const deletedCount = await storage.cleanupOrphanedManualProducts(id);

    res.json({ 
      success: true, 
      message: deletedCount > 0 
        ? `Cleaned up ${deletedCount} orphaned Featured Product record(s)` 
        : 'No orphaned records found',
      deletedCount,
      rawRecordsBefore: rawRecords.length,
      validRecordsBefore: validRecords.length,
      orphanedRecords: orphanedCount
    });
  } catch (error) {
    console.error('Cleanup orphaned manual products error:', error);
    res.status(500).json({ error: 'Failed to cleanup orphaned manual products' });
  }
});

// Admin: Bulk cleanup ALL orphaned manual products across ALL customers
router.post('/api/b2b/admin/manual-products/cleanup-all', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    // Get all customers
    const customers = await storage.getAllB2bCustomers();
    
    let totalDeleted = 0;
    const affectedCustomers: { accountName: string; deletedCount: number }[] = [];

    for (const customer of customers) {
      const deletedCount = await storage.cleanupOrphanedManualProducts(customer.id);
      if (deletedCount > 0) {
        totalDeleted += deletedCount;
        affectedCustomers.push({
          accountName: customer.accountName,
          deletedCount
        });
      }
    }

    res.json({ 
      success: true, 
      message: totalDeleted > 0 
        ? `Cleaned up ${totalDeleted} orphaned Featured Product record(s) across ${affectedCustomers.length} customer(s)` 
        : 'No orphaned records found across any customers',
      totalDeleted,
      customersProcessed: customers.length,
      affectedCustomers
    });
  } catch (error) {
    console.error('Bulk cleanup orphaned manual products error:', error);
    res.status(500).json({ error: 'Failed to cleanup orphaned manual products' });
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

// ============= TIER AGREEMENT ENDPOINTS =============

// Admin/Sales Rep: Send tier agreement email to customer
router.post('/api/b2b/admin/customers/:id/send-tier-agreement', requireB2bAdminOrSalesRep, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get customer details
    const customer = await storage.getB2bCustomer(id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Check if customer already has Tier 3 or Tier 4
    if (customer.pricingTierId) {
      const currentTier = await storage.getTierPricing(customer.pricingTierId);
      if (currentTier && (currentTier.tierName === 'Tier 3' || currentTier.tierName === 'Tier 4')) {
        return res.status(400).json({ 
          error: `Customer already has ${currentTier.tierName} pricing. No agreement needed.` 
        });
      }
    }
    
    // Check for existing pending (unexpired, unsigned) agreements
    const existingAgreements = await db.select()
      .from(b2bTierAgreements)
      .where(and(
        eq(b2bTierAgreements.customerId, id),
        eq(b2bTierAgreements.status, 'pending')
      ));
    
    // Block if there's an unexpired pending agreement
    const activePendingAgreement = existingAgreements.find(
      agreement => new Date() < new Date(agreement.tokenExpiresAt)
    );
    
    if (activePendingAgreement) {
      const expiresAt = new Date(activePendingAgreement.tokenExpiresAt);
      const sentAt = activePendingAgreement.sentAt ? new Date(activePendingAgreement.sentAt) : null;
      return res.status(409).json({ 
        error: 'A pending contract already exists for this customer.',
        message: `A contract was sent${sentAt ? ` on ${sentAt.toLocaleDateString()}` : ''} and expires on ${expiresAt.toLocaleDateString()}. Please cancel the existing contract before sending a new one.`,
        existingAgreementId: activePendingAgreement.id,
        sentAt: activePendingAgreement.sentAt,
        expiresAt: activePendingAgreement.tokenExpiresAt,
      });
    }
    
    // Auto-expire any old pending agreements that have passed their expiration date
    for (const agreement of existingAgreements) {
      if (new Date() >= new Date(agreement.tokenExpiresAt)) {
        await db.update(b2bTierAgreements)
          .set({ status: 'expired', updatedAt: new Date() })
          .where(eq(b2bTierAgreements.id, agreement.id));
      }
    }
    
    // Generate secure token (64 bytes hex = 128 chars)
    const token = randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Calculate fiscal year (assume fiscal year matches calendar year)
    const now = new Date();
    const fiscalYearStart = new Date(now.getFullYear(), 0, 1); // Jan 1
    const fiscalYearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59); // Dec 31
    
    // Get sender info
    const session = req.session as any;
    const sentByAdminId = session.b2bUserRole === 'admin' ? session.b2bUserId : null;
    const sentBySalesRepId = session.b2bUserRole === 'sales_rep' ? session.b2bUserId : null;
    
    // Create pending agreement record (tierId, signatureName, signedAt are null until customer signs)
    await db.insert(b2bTierAgreements).values({
      customerId: customer.id,
      token,
      tokenExpiresAt,
      businessName: customer.accountName,
      contactName: customer.primaryContactName,
      address: [customer.billingAddress, customer.billingCity, customer.billingState, customer.billingZipCode].filter(Boolean).join(', ') || 'Not provided',
      email: customer.emailAddress,
      phone: customer.phoneNumber || 'Not provided',
      status: 'pending',
      fiscalYearStart,
      fiscalYearEnd,
      sentByAdminId,
      sentBySalesRepId,
      sentAt: new Date(),
    });
    
    // Build agreement URL
    const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
    const agreementUrl = `https://${domain}/b2b/tier-agreement/${token}`;
    
    // Send email to customer
    if (process.env.SENDGRID_API_KEY && process.env.RESEND_FROM_EMAIL) {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
            .header { background-color: #5C2535; color: #F5F5F0; padding: 30px 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .info-box { background-color: #F5F5F0; border-left: 4px solid #5C2535; padding: 16px; margin: 20px 0; }
            .cta-button { display: inline-block; background-color: #5C2535; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Wholesale Tier Agreement</h1>
            <p>Nashoba Valley Winery</p>
          </div>
          <div class="content">
            <p>Dear ${customer.primaryContactName},</p>
            
            <p>Thank you for your interest in our wholesale tier program. To receive enhanced wholesale pricing, please review and sign the Tier Agreement.</p>
            
            <div class="info-box">
              <h3 style="margin-top: 0; color: #5C2535;">Tier Benefits</h3>
              <p><strong>Tier 3:</strong> Commit to 10+ cases annually for enhanced pricing</p>
              <p><strong>Tier 4:</strong> Commit to 30+ cases annually for maximum savings</p>
            </div>
            
            <p><a href="https://nashoba-tasting-experience-email136.replit.app/b2b/pricing-sheet" style="color: #5C2535; font-weight: bold;">To see the savings associated with Tier pricing, click here</a></p>
            
            <p>Click the button below to review the agreement. The form will be pre-filled with your account information.</p>
            
            <p style="text-align: center;">
              <a href="${agreementUrl}" class="cta-button">Review & Sign Agreement</a>
            </p>
            
            <p><strong>This link will expire in 7 days.</strong></p>
            
            <p>If you have any questions about the tier program, please contact us.</p>
            
            <p>Best regards,<br>Nashoba Valley Winery Team</p>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} Nashoba Valley Winery. All rights reserved.</p>
              <p>This email was sent regarding your wholesale account.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      await sendgrid.send({
        to: customer.emailAddress,
        from: process.env.SENDGRID_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'noreply@nashobawinery.com',
        subject: 'Nashoba Valley Winery - Wholesale Tier Agreement',
        html: emailHtml,
      });
    }
    
    res.json({ success: true, message: 'Tier agreement email sent successfully' });
  } catch (error) {
    console.error('Error sending tier agreement:', error);
    res.status(500).json({ error: 'Failed to send tier agreement email' });
  }
});

// Admin: Get tier agreements for a customer
router.get('/api/b2b/admin/customers/:id/tier-agreements', requireB2bAdminOrSalesRep, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const agreements = await db.select()
      .from(b2bTierAgreements)
      .where(eq(b2bTierAgreements.customerId, id))
      .orderBy(desc(b2bTierAgreements.createdAt));
    
    // Get tier info for each agreement
    const agreementsWithTiers = await Promise.all(agreements.map(async (agreement) => {
      if (agreement.tierId && agreement.tierId !== 'placeholder') {
        const tier = await storage.getTierPricing(agreement.tierId);
        return { ...agreement, tier };
      }
      return { ...agreement, tier: null };
    }));
    
    res.json(agreementsWithTiers);
  } catch (error) {
    console.error('Error fetching tier agreements:', error);
    res.status(500).json({ error: 'Failed to fetch tier agreements' });
  }
});

// Admin: Get single tier agreement by ID (for viewing signed agreements)
router.get('/api/b2b/admin/tier-agreements/:agreementId', requireB2bAdminOrSalesRep, async (req: Request, res: Response) => {
  try {
    const { agreementId } = req.params;
    
    const agreements = await db.select()
      .from(b2bTierAgreements)
      .where(eq(b2bTierAgreements.id, agreementId))
      .limit(1);
    
    if (agreements.length === 0) {
      return res.status(404).json({ error: 'Agreement not found' });
    }
    
    const agreement = agreements[0];
    
    // Get tier info
    let tier = null;
    if (agreement.tierId) {
      tier = await storage.getTierPricing(agreement.tierId);
    }
    
    res.json({ ...agreement, tier });
  } catch (error) {
    console.error('Error fetching tier agreement:', error);
    res.status(500).json({ error: 'Failed to fetch tier agreement' });
  }
});

// Admin: Cancel/terminate a tier agreement
router.post('/api/b2b/admin/tier-agreements/:agreementId/cancel', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { agreementId } = req.params;
    const { reason } = req.body;
    
    // Find the agreement
    const agreements = await db.select()
      .from(b2bTierAgreements)
      .where(eq(b2bTierAgreements.id, agreementId))
      .limit(1);
    
    if (agreements.length === 0) {
      return res.status(404).json({ error: 'Agreement not found' });
    }
    
    const agreement = agreements[0];
    
    if (agreement.status !== 'active' && agreement.status !== 'pending') {
      return res.status(400).json({ error: 'Only active or pending agreements can be cancelled' });
    }
    
    // Get Tier 1 pricing for billing difference calculation
    const tier1Results = await db.select().from(tierPricing).where(eq(tierPricing.tierName, 'Tier 1'));
    const tier1ByCategory = new Map(tier1Results.map(t => [t.category, t]));
    
    // Get orders within the agreement period (signedAt to now or fiscalYearEnd)
    const startDate = agreement.signedAt || agreement.createdAt;
    const endDate = new Date(); // Use current date as cancellation date
    
    // Fetch all orders for this customer within the agreement period
    const orders = await db.select()
      .from(b2bOrders)
      .where(
        and(
          eq(b2bOrders.customerId, agreement.customerId),
          sql`${b2bOrders.orderDate} >= ${startDate}`,
          sql`${b2bOrders.orderDate} <= ${endDate}`,
          sql`${b2bOrders.status} != 'cancelled'`
        )
      );
    
    // Build billing report with product-level details
    const billingReport: {
      items: Array<{
        orderNumber: string;
        orderDate: string;
        productName: string;
        sku: string | null;
        quantity: number;
        unitPricePaid: number;
        unitTier1Price: number;
        pricePaid: number;
        tier1Price: number;
        difference: number;
      }>;
      totalPaid: number;
      totalTier1: number;
      totalDifference: number;
    } = {
      items: [],
      totalPaid: 0,
      totalTier1: 0,
      totalDifference: 0,
    };
    
    for (const order of orders) {
      // Get order items
      const orderItems = await db.select({
        productId: b2bOrderItems.productId,
        productName: b2bOrderItems.productName,
        sku: b2bOrderItems.sku,
        quantity: b2bOrderItems.quantity,
        unitPrice: b2bOrderItems.unitPrice,
      })
        .from(b2bOrderItems)
        .where(eq(b2bOrderItems.orderId, order.id));
      
      for (const item of orderItems) {
        // Get product details (for category and base price)
        const productResults = await db.select()
          .from(products)
          .where(eq(products.id, item.productId))
          .limit(1);
        
        if (productResults.length === 0) continue;
        
        const product = productResults[0];
        const basePrice = parseFloat(product.wholesalePricing || product.price || '0');
        
        // Calculate Tier 1 price (base price with Tier 1 discount)
        const tier1 = tier1ByCategory.get(product.category);
        const tier1Discount = tier1 ? parseFloat(tier1.discountPercentage || '0') : 0;
        const tier1UnitPrice = basePrice * (1 - tier1Discount / 100);
        
        const pricePaid = parseFloat(item.unitPrice || '0');
        const quantity = item.quantity || 0;
        const tier1Total = tier1UnitPrice * quantity;
        const paidTotal = pricePaid * quantity;
        const difference = tier1Total - paidTotal;
        
        billingReport.items.push({
          orderNumber: order.orderNumber,
          orderDate: new Date(order.orderDate).toISOString().split('T')[0],
          productName: item.productName,
          sku: item.sku,
          quantity,
          unitPricePaid: pricePaid,
          unitTier1Price: tier1UnitPrice,
          pricePaid: paidTotal,
          tier1Price: tier1Total,
          difference: difference,
        });
        
        billingReport.totalPaid += paidTotal;
        billingReport.totalTier1 += tier1Total;
        billingReport.totalDifference += difference;
      }
    }
    
    // Update agreement status to cancelled
    await db.update(b2bTierAgreements)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(b2bTierAgreements.id, agreementId));
    
    // Reset customer's tier to Tier 1 (default) and clear commitment start date
    const tier1Default = tier1Results.length > 0 ? tier1Results[0] : null;
    if (tier1Default) {
      await storage.updateB2bCustomer(agreement.customerId, {
        pricingTierId: tier1Default.id,
        commitmentStartDate: null,
      });
    }
    
    // Generate billing report HTML table
    const billingReportHtml = billingReport.items.length > 0 ? `
      <h3 style="margin-top: 30px;">Early Termination Billing Report</h3>
      <p>The following is an itemized summary of discounted purchases during the agreement period:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
        <thead>
          <tr style="background-color: #5C2535; color: white;">
            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Order</th>
            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Date</th>
            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Product</th>
            <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Qty</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Unit Paid</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Unit Tier 1</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Total Paid</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Total Tier 1</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Difference</th>
          </tr>
        </thead>
        <tbody>
          ${billingReport.items.map((item, i) => `
            <tr style="background-color: ${i % 2 === 0 ? '#f9f9f9' : 'white'};">
              <td style="padding: 8px; border: 1px solid #ddd;">${item.orderNumber}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${item.orderDate}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${item.productName}</td>
              <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${item.quantity}</td>
              <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">$${item.unitPricePaid.toFixed(2)}</td>
              <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">$${item.unitTier1Price.toFixed(2)}</td>
              <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">$${item.pricePaid.toFixed(2)}</td>
              <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">$${item.tier1Price.toFixed(2)}</td>
              <td style="padding: 8px; text-align: right; border: 1px solid #ddd; color: ${item.difference > 0 ? '#DC2626' : '#059669'};">$${item.difference.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="background-color: #f3f4f6; font-weight: bold;">
            <td colspan="6" style="padding: 10px; text-align: right; border: 1px solid #ddd;">TOTALS:</td>
            <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">$${billingReport.totalPaid.toFixed(2)}</td>
            <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">$${billingReport.totalTier1.toFixed(2)}</td>
            <td style="padding: 10px; text-align: right; border: 1px solid #ddd; color: #DC2626;">$${billingReport.totalDifference.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
      <div style="background-color: #FEE2E2; border-left: 4px solid #DC2626; padding: 16px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Amount Due for Early Termination: $${billingReport.totalDifference.toFixed(2)}</strong></p>
        <p style="margin: 8px 0 0 0; font-size: 13px;">This represents the difference between discounted pricing received and standard Tier 1 pricing due to early contract termination.</p>
      </div>
    ` : '<p>No orders were placed during the agreement period.</p>';
    
    // Send cancellation notification email with billing report
    if (process.env.SENDGRID_API_KEY && (process.env.SENDGRID_FROM_EMAIL || process.env.RESEND_FROM_EMAIL)) {
      const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.RESEND_FROM_EMAIL;
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; }
            .header { background-color: #5C2535; color: #F5F5F0; padding: 30px 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .info-box { background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Tier Agreement Cancelled</h1>
            <p>Nashoba Valley Winery</p>
          </div>
          <div class="content">
            <p>Dear ${agreement.contactName},</p>
            
            <div class="info-box">
              <p><strong>Your tier agreement has been cancelled.</strong></p>
              <p>Your pricing has been reset to standard Tier 1 rates.</p>
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            </div>
            
            ${billingReportHtml}
            
            <p>If you have any questions about this billing statement or would like to discuss payment arrangements, please contact your sales representative.</p>
            
            <p>Thank you for your business.</p>
          </div>
          <div class="footer">
            <p>Nashoba Valley Winery | Bolton, MA</p>
          </div>
        </body>
        </html>
      `;
      
      try {
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        await sgMail.send({
          to: agreement.email,
          from: fromEmail,
          subject: 'Tier Agreement Cancelled - Early Termination Notice - Nashoba Valley Winery',
          html: emailHtml,
        });
        console.log('[Tier Agreement] Cancellation email with billing report sent to:', agreement.email);
      } catch (emailError) {
        console.error('[Tier Agreement] Failed to send cancellation email:', emailError);
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Agreement cancelled successfully',
      billingReport 
    });
  } catch (error) {
    console.error('Error cancelling tier agreement:', error);
    res.status(500).json({ error: 'Failed to cancel agreement' });
  }
});

// Admin: Get customer's active tier agreement status (active, expired, or none)
router.get('/api/b2b/admin/customers/:id/agreement-status', requireB2bAdminOrSalesRep, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get the most recent signed (active) agreement for this customer
    const agreements = await db.select()
      .from(b2bTierAgreements)
      .where(and(
        eq(b2bTierAgreements.customerId, id),
        eq(b2bTierAgreements.status, 'active')
      ))
      .orderBy(desc(b2bTierAgreements.signedAt))
      .limit(1);
    
    if (agreements.length === 0) {
      return res.json({ status: 'none', agreement: null });
    }
    
    const agreement = agreements[0];
    const now = new Date();
    const fiscalYearEnd = new Date(agreement.fiscalYearEnd);
    
    // Check if agreement is expired
    const isExpired = now > fiscalYearEnd;
    
    // Get tier info
    let tier = null;
    if (agreement.tierId) {
      tier = await storage.getTierPricing(agreement.tierId);
    }
    
    res.json({
      status: isExpired ? 'expired' : 'active',
      agreement: {
        ...agreement,
        tier,
      }
    });
  } catch (error) {
    console.error('Error fetching agreement status:', error);
    res.status(500).json({ error: 'Failed to fetch agreement status' });
  }
});

// Admin: Renew an expired tier agreement (extends dates by 1 year without customer signature)
router.post('/api/b2b/admin/tier-agreements/:agreementId/renew', requireB2bAdminOrSalesRep, async (req: Request, res: Response) => {
  try {
    const { agreementId } = req.params;
    
    // Find the agreement
    const agreements = await db.select()
      .from(b2bTierAgreements)
      .where(eq(b2bTierAgreements.id, agreementId))
      .limit(1);
    
    if (agreements.length === 0) {
      return res.status(404).json({ error: 'Agreement not found' });
    }
    
    const agreement = agreements[0];
    
    // Verify agreement is signed/active
    if (agreement.status !== 'active') {
      return res.status(400).json({ error: 'Only active agreements can be renewed' });
    }
    
    // Calculate new dates (extend by 1 year from current end date)
    const oldFiscalYearEnd = new Date(agreement.fiscalYearEnd);
    const newFiscalYearStart = new Date(oldFiscalYearEnd);
    newFiscalYearStart.setDate(newFiscalYearStart.getDate() + 1); // Day after old end
    const newFiscalYearEnd = new Date(newFiscalYearStart);
    newFiscalYearEnd.setFullYear(newFiscalYearEnd.getFullYear() + 1);
    newFiscalYearEnd.setDate(newFiscalYearEnd.getDate() - 1); // End of year
    
    // Get sender info
    const session = req.session as any;
    const renewedByAdminId = session.b2bUserRole === 'admin' ? session.b2bUserId : null;
    const renewedBySalesRepId = session.b2bUserRole === 'sales_rep' ? session.b2bUserId : null;
    
    // Update agreement with new dates
    await db.update(b2bTierAgreements)
      .set({
        fiscalYearStart: newFiscalYearStart,
        fiscalYearEnd: newFiscalYearEnd,
        updatedAt: new Date(),
      })
      .where(eq(b2bTierAgreements.id, agreementId));
    
    // Get customer info for notifications
    const customer = await storage.getB2bCustomer(agreement.customerId);
    
    // Send renewal confirmation email to customer
    if (process.env.SENDGRID_API_KEY && process.env.RESEND_FROM_EMAIL && customer) {
      const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.RESEND_FROM_EMAIL;
      
      // Get tier info
      let tierName = 'Tier 3/4';
      if (agreement.tierId) {
        const tier = await storage.getTierPricing(agreement.tierId);
        if (tier) tierName = tier.tierName;
      }
      
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
            .header { background-color: #5C2535; color: #F5F5F0; padding: 30px 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .info-box { background-color: #D1FAE5; border-left: 4px solid #10B981; padding: 16px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Tier Agreement Renewed</h1>
            <p>Nashoba Valley Winery</p>
          </div>
          <div class="content">
            <p>Dear ${customer.primaryContactName},</p>
            
            <div class="info-box">
              <p><strong>Great news!</strong> Your ${tierName} wholesale tier agreement has been renewed.</p>
            </div>
            
            <p><strong>New Agreement Period:</strong></p>
            <p>From: ${newFiscalYearStart.toLocaleDateString()}<br>
            To: ${newFiscalYearEnd.toLocaleDateString()}</p>
            
            <p>Your ${tierName} pricing benefits will continue during this period. Thank you for your continued partnership!</p>
            
            <p>If you have any questions, please contact your sales representative.</p>
            
            <p>Best regards,<br>Nashoba Valley Winery Team</p>
          </div>
          <div class="footer">
            <p>Nashoba Valley Winery | Bolton, MA</p>
          </div>
        </body>
        </html>
      `;
      
      try {
        await sendgrid.send({
          to: customer.emailAddress,
          from: fromEmail,
          subject: 'Your Tier Agreement Has Been Renewed - Nashoba Valley Winery',
          html: emailHtml,
        });
        console.log('[Tier Agreement] Renewal confirmation sent to:', customer.emailAddress);
      } catch (emailError) {
        console.error('[Tier Agreement] Failed to send renewal email:', emailError);
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Agreement renewed successfully',
      newFiscalYearStart,
      newFiscalYearEnd,
    });
  } catch (error) {
    console.error('Error renewing tier agreement:', error);
    res.status(500).json({ error: 'Failed to renew agreement' });
  }
});

// Admin: Check for expired tier agreements and send notifications
router.post('/api/b2b/admin/tier-agreements/check-expired', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const now = new Date();
    
    // Find all active agreements where fiscalYearEnd has passed
    const expiredAgreements = await db.select()
      .from(b2bTierAgreements)
      .where(and(
        eq(b2bTierAgreements.status, 'active'),
        sql`${b2bTierAgreements.fiscalYearEnd} < ${now}`
      ));
    
    if (expiredAgreements.length === 0) {
      return res.json({ success: true, message: 'No expired agreements found', count: 0 });
    }
    
    // Get all B2B admins who want contract notifications
    const admins = await db.select()
      .from(b2bAdmins)
      .where(and(
        eq(b2bAdmins.active, true),
        eq(b2bAdmins.receiveContractNotifications, true)
      ));
    
    const notifications: string[] = [];
    
    for (const agreement of expiredAgreements) {
      // Get customer info
      const customer = await storage.getB2bCustomer(agreement.customerId);
      if (!customer) continue;
      
      // Get tier info
      let tierName = 'Tier 3/4';
      if (agreement.tierId) {
        const tier = await storage.getTierPricing(agreement.tierId);
        if (tier) tierName = tier.tierName;
      }
      
      // Get sales rep info if assigned
      let salesRep = null;
      if (agreement.sentBySalesRepId) {
        const reps = await db.select().from(salesReps).where(eq(salesReps.id, agreement.sentBySalesRepId)).limit(1);
        if (reps.length > 0) salesRep = reps[0];
      } else if (customer.salesRepId) {
        const reps = await db.select().from(salesReps).where(eq(salesReps.id, customer.salesRepId)).limit(1);
        if (reps.length > 0) salesRep = reps[0];
      }
      
      if (!process.env.SENDGRID_API_KEY || !process.env.RESEND_FROM_EMAIL) continue;
      
      const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.RESEND_FROM_EMAIL;
      const expiredDate = new Date(agreement.fiscalYearEnd).toLocaleDateString();
      
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
            .header { background-color: #DC2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .info-box { background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Tier Agreement Expired</h1>
          </div>
          <div class="content">
            <div class="info-box">
              <p><strong>Action Required:</strong> A tier agreement has expired and needs renewal.</p>
            </div>
            
            <p><strong>Customer:</strong> ${customer.accountName}</p>
            <p><strong>Tier:</strong> ${tierName}</p>
            <p><strong>Expired On:</strong> ${expiredDate}</p>
            ${salesRep ? `<p><strong>Sales Rep:</strong> ${salesRep.firstName} ${salesRep.lastName}</p>` : ''}
            
            <p>Please log into the B2B Admin Dashboard to renew this agreement or contact the customer.</p>
          </div>
          <div class="footer">
            <p>Nashoba Valley Winery B2B Platform</p>
          </div>
        </body>
        </html>
      `;
      
      // Send to sales rep if assigned
      if (salesRep && salesRep.email) {
        try {
          await sendgrid.send({
            to: salesRep.email,
            from: fromEmail,
            subject: `[Action Required] Tier Agreement Expired: ${customer.accountName}`,
            html: emailHtml,
          });
          notifications.push(`Sent to sales rep: ${salesRep.email}`);
        } catch (e) {
          console.error('Failed to send to sales rep:', e);
        }
      }
      
      // Send to admins who want notifications
      for (const admin of admins) {
        try {
          await sendgrid.send({
            to: admin.email,
            from: fromEmail,
            subject: `[Action Required] Tier Agreement Expired: ${customer.accountName}`,
            html: emailHtml,
          });
          notifications.push(`Sent to admin: ${admin.email}`);
        } catch (e) {
          console.error('Failed to send to admin:', e);
        }
      }
    }
    
    res.json({ 
      success: true, 
      message: `Found ${expiredAgreements.length} expired agreements`,
      count: expiredAgreements.length,
      notifications,
    });
  } catch (error) {
    console.error('Error checking expired agreements:', error);
    res.status(500).json({ error: 'Failed to check expired agreements' });
  }
});

// PUBLIC: Get tier agreement form data by token (no auth required)
router.get('/api/b2b/tier-agreement/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    // Find agreement by token
    const agreements = await db.select()
      .from(b2bTierAgreements)
      .where(eq(b2bTierAgreements.token, token))
      .limit(1);
    
    if (agreements.length === 0) {
      return res.status(404).json({ error: 'Agreement not found or invalid token' });
    }
    
    const agreement = agreements[0];
    
    // Check if token is expired
    if (new Date() > new Date(agreement.tokenExpiresAt)) {
      return res.status(410).json({ error: 'This agreement link has expired. Please contact your sales representative for a new link.' });
    }
    
    // Check if already signed
    if (agreement.status === 'active' && agreement.signatureName !== 'PENDING') {
      return res.status(400).json({ error: 'This agreement has already been signed.', alreadySigned: true });
    }
    
    // Get available Tier 3 and Tier 4 options (deduplicated by tier name)
    const allTiers = await storage.getAllTierPricing();
    const eligibleTiers = allTiers.filter(t => t.tierName === 'Tier 3' || t.tierName === 'Tier 4');
    
    // Deduplicate tiers by name - show only one Tier 3 and one Tier 4 option
    const uniqueTiersMap = new Map<string, typeof eligibleTiers[0]>();
    for (const tier of eligibleTiers) {
      if (!uniqueTiersMap.has(tier.tierName)) {
        uniqueTiersMap.set(tier.tierName, tier);
      }
    }
    const uniqueTiers = Array.from(uniqueTiersMap.values());
    
    // Return agreement data for form pre-fill
    res.json({
      agreement: {
        id: agreement.id,
        businessName: agreement.businessName,
        contactName: agreement.contactName,
        address: agreement.address,
        email: agreement.email,
        phone: agreement.phone,
        fiscalYearStart: agreement.fiscalYearStart,
        fiscalYearEnd: agreement.fiscalYearEnd,
      },
      tiers: uniqueTiers.map(t => ({
        id: t.id,
        name: t.tierName,
        description: t.description,
        discountPercentage: t.discountPercentage,
        minimumCases: t.commitmentCases || (t.tierName === 'Tier 3' ? 10 : 30),
      })),
    });
  } catch (error) {
    console.error('Error fetching tier agreement:', error);
    res.status(500).json({ error: 'Failed to fetch agreement' });
  }
});

// PUBLIC: Submit signed tier agreement (no auth required)
router.post('/api/b2b/tier-agreement/:token/submit', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { tierId, signatureName } = req.body;
    
    if (!tierId || !signatureName) {
      return res.status(400).json({ error: 'Please select a tier and provide your signature' });
    }
    
    // Validate tier is Tier 3 or Tier 4
    const selectedTier = await storage.getTierPricing(tierId);
    if (!selectedTier || (selectedTier.tierName !== 'Tier 3' && selectedTier.tierName !== 'Tier 4')) {
      return res.status(400).json({ error: 'Invalid tier selection. Only Tier 3 and Tier 4 are available.' });
    }
    
    // Find agreement by token
    const agreements = await db.select()
      .from(b2bTierAgreements)
      .where(eq(b2bTierAgreements.token, token))
      .limit(1);
    
    if (agreements.length === 0) {
      return res.status(404).json({ error: 'Agreement not found or invalid token' });
    }
    
    const agreement = agreements[0];
    
    // Check if token is expired
    if (new Date() > new Date(agreement.tokenExpiresAt)) {
      return res.status(410).json({ error: 'This agreement link has expired. Please contact your sales representative for a new link.' });
    }
    
    // Check if already signed
    if (agreement.status === 'active' && agreement.signatureName !== 'PENDING') {
      return res.status(400).json({ error: 'This agreement has already been signed.' });
    }
    
    // Mark any previous active agreements as superseded
    await db.update(b2bTierAgreements)
      .set({ status: 'superseded', updatedAt: new Date() })
      .where(and(
        eq(b2bTierAgreements.customerId, agreement.customerId),
        eq(b2bTierAgreements.status, 'active')
      ));
    
    // Update agreement with signature and tier selection
    // Also invalidate token by setting expiry to now to prevent resubmission
    const now = new Date();
    // Fiscal year starts when signed and ends 365 days later
    const fiscalYearStart = new Date(now);
    const fiscalYearEnd = new Date(now);
    fiscalYearEnd.setDate(fiscalYearEnd.getDate() + 365);
    
    await db.update(b2bTierAgreements)
      .set({
        tierId,
        signatureName,
        signedAt: now,
        status: 'active',
        tokenExpiresAt: now, // Invalidate token immediately after signing
        fiscalYearStart,
        fiscalYearEnd,
        updatedAt: now,
      })
      .where(eq(b2bTierAgreements.id, agreement.id));
    
    // Update customer's tier with commitment period
    await storage.updateB2bCustomer(agreement.customerId, { 
      pricingTierId: tierId,
      commitmentStartDate: fiscalYearStart,
    });
    
    // Send confirmation email to customer with full agreement copy
    if (process.env.SENDGRID_API_KEY && (process.env.SENDGRID_FROM_EMAIL || process.env.RESEND_FROM_EMAIL)) {
      const minCases = selectedTier.tierName === 'Tier 3' ? '10' : '30';
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; }
            .header { background-color: #5C2535; color: #F5F5F0; padding: 30px 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .success-box { background-color: #D1FAE5; border-left: 4px solid #10B981; padding: 16px; margin: 20px 0; }
            .info-box { background-color: #F5F5F0; border-left: 4px solid #5C2535; padding: 16px; margin: 20px 0; }
            .agreement-section { margin: 20px 0; padding: 20px; border: 1px solid #ddd; background: #fff; }
            .agreement-section h3 { color: #5C2535; margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 8px; }
            .agreement-section h4 { color: #333; margin: 16px 0 8px 0; }
            .agreement-section p { margin: 8px 0; font-size: 14px; }
            .signature-block { background: #f9f9f9; padding: 16px; margin-top: 20px; border: 1px solid #ddd; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Signed Tier Agreement</h1>
            <p>Nashoba Valley Winery</p>
          </div>
          <div class="content">
            <div class="success-box">
              <h3 style="margin-top: 0; color: #065F46;">Agreement Confirmed</h3>
              <p>Your account has been upgraded to <strong>${selectedTier.tierName}</strong> with a ${selectedTier.discountPercentage}% wholesale discount.</p>
            </div>
            
            <p>Please keep this email as your copy of the signed agreement.</p>
            
            <div class="agreement-section">
              <h3>WHOLESALE TIER AGREEMENT</h3>
              <p><em>Between Nashoba Valley Winery ("Nashoba") and Customer</em></p>
              
              <div class="info-box">
                <p><strong>Business Name:</strong> ${agreement.businessName}</p>
                <p><strong>Contact:</strong> ${agreement.contactName}</p>
                <p><strong>Address:</strong> ${agreement.address}</p>
                <p><strong>Email:</strong> ${agreement.email}</p>
                <p><strong>Phone:</strong> ${agreement.phone}</p>
              </div>
              
              <h4>1. Tier Selection & Case Commitment</h4>
              <p><strong>Selected Tier:</strong> ${selectedTier.tierName} - ${selectedTier.discountPercentage}% Discount</p>
              <p>Customer agrees to purchase a minimum of <strong>${minCases} cases</strong> during the fiscal year for this agreement. In return, Customer will receive the wholesale discount associated with the selected Tier for all qualifying purchases during the fiscal year.</p>
              
              <h4>2. Term and Renewal</h4>
              <p>This Agreement begins on the date signed and continues for 12 consecutive months which will be the fiscal year for this agreement. The Agreement will automatically renew at the end of each fiscal year unless terminated by either party.</p>
              <p><strong>Agreement Period:</strong> ${fiscalYearStart.toLocaleDateString()} to ${fiscalYearEnd.toLocaleDateString()}</p>
              
              <h4>3. Failure to Meet Minimum Case Commitment</h4>
              <p>If Customer does not meet the minimum case requirement by the end of the fiscal year—or by the termination date if Customer ends the Agreement early—Customer agrees to pay the difference between the Tier discount received and the price Customer would have paid under Tier 1 or Tier 2, depending on eligibility. Nashoba will calculate the shortfall and issue an invoice for the difference. Customer agrees to pay this invoice in full within 30 days.</p>
              
              <h4>4. Early Termination</h4>
              <p>Customer may terminate this Agreement at any time by providing written notice. If Customer terminates early and has not yet met the required case minimum, Section 3 above applies.</p>
              
              <h4>5. Eligibility and Compliance</h4>
              <p>Customer affirms that they hold all licenses required to purchase and resell alcoholic beverages. Nashoba reserves the right to suspend or terminate this Agreement if Customer violates program terms or applicable regulations.</p>
              
              <h4>6. Entire Agreement</h4>
              <p>This document represents the full Agreement between Nashoba and Customer regarding wholesale tier participation. Changes must be made in writing and agreed to by both parties.</p>
              
              <div class="signature-block">
                <p><strong>Signature:</strong> ${signatureName}</p>
                <p><strong>Date Signed:</strong> ${now.toLocaleDateString()}</p>
              </div>
            </div>
            
            <p>If you have any questions about your agreement, please contact us.</p>
            
            <p>Best regards,<br>Nashoba Valley Winery Team</p>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} Nashoba Valley Winery. All rights reserved.</p>
              <p>This email serves as your official copy of the signed Tier Agreement.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      await sendgrid.send({
        to: agreement.email,
        from: process.env.SENDGRID_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'noreply@nashobawinery.com',
        subject: 'Your Signed Tier Agreement - Nashoba Valley Winery',
        html: emailHtml,
      });
    }
    
    // Notify designated admins about the signed agreement (only those with receiveContractNotifications enabled)
    try {
      const allAdmins = await storage.getAllB2bAdmins(true);
      // Filter to only admins who have opted in to receive contract notifications
      const contractNotifyAdmins = allAdmins.filter(a => a.receiveContractNotifications);
      
      if (contractNotifyAdmins.length > 0 && process.env.SENDGRID_API_KEY && (process.env.SENDGRID_FROM_EMAIL || process.env.RESEND_FROM_EMAIL)) {
        const adminEmails = contractNotifyAdmins.map(a => a.email);
        const minCasesAdmin = selectedTier.tierName === 'Tier 3' ? '10' : '30';
        const notifyHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
              .header { background-color: #5C2535; color: #F5F5F0; padding: 20px; text-align: center; }
              .content { padding: 20px; }
              .success-box { background-color: #D1FAE5; border-left: 4px solid #10B981; padding: 16px; margin: 16px 0; }
              .info-box { background-color: #F5F5F0; border-left: 4px solid #5C2535; padding: 16px; margin: 16px 0; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2 style="margin: 0;">B2B Contract Received</h2>
            </div>
            <div class="content">
              <div class="success-box">
                <h3 style="margin-top: 0; color: #065F46;">New Tier Agreement Signed</h3>
                <p>A customer has signed a tier agreement.</p>
              </div>
              
              <div class="info-box">
                <p><strong>Business Name:</strong> ${agreement.businessName}</p>
                <p><strong>Signed By:</strong> ${signatureName}</p>
                <p><strong>Selected Tier:</strong> ${selectedTier.tierName}</p>
                <p><strong>Discount:</strong> ${selectedTier.discountPercentage}%</p>
                <p><strong>Case Commitment:</strong> ${minCasesAdmin} cases minimum annually</p>
                <p><strong>Date Signed:</strong> ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}</p>
                <p><strong>Agreement Period:</strong> ${fiscalYearStart.toLocaleDateString()} to ${fiscalYearEnd.toLocaleDateString()}</p>
              </div>
              
              <p>Please log into the B2B Admin Dashboard to view the full agreement details.</p>
            </div>
          </body>
          </html>
        `;
        
        await sendgrid.send({
          to: adminEmails,
          from: process.env.SENDGRID_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'noreply@nashobawinery.com',
          subject: `[B2B Contract Received] ${agreement.businessName} signed ${selectedTier.tierName} agreement`,
          html: notifyHtml,
        });
        console.log(`Contract notification email sent to ${adminEmails.length} admin(s): ${adminEmails.join(', ')}`);
      } else {
        console.log('No admins configured to receive contract notifications');
      }
    } catch (notifyError) {
      console.error('Failed to notify admins:', notifyError);
    }
    
    res.json({ 
      success: true, 
      message: 'Agreement signed successfully. Your tier has been updated.',
      tier: selectedTier.tierName,
    });
  } catch (error) {
    console.error('Error submitting tier agreement:', error);
    res.status(500).json({ error: 'Failed to submit agreement' });
  }
});

// ============= END TIER AGREEMENT ENDPOINTS =============

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
    const { customerId, items, notes, orderType = 'order' } = req.body;

    // Validate input
    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Customer and at least one item are required' });
    }
    
    // Returns can only be created by admins
    if (orderType === 'return' && (req.session as any).b2bUserType !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can create returns' });
    }

    // Fetch customer
    const customer = await storage.getB2bCustomer(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Authorization: Sales reps can only create orders for their assigned customers
    if ((req.session as any).b2bUserType === 'sales_rep') {
      const salesRepId = (req.session as any).b2bUserId;
      if (customer.salesRepId !== salesRepId) {
        return res.status(403).json({ error: 'You can only create orders for customers assigned to you' });
      }
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

      const retailCasePrice = parseFloat(product.price);
      const casePriceWithDiscount = retailCasePrice * (1 - discountPercentage / 100);
      const caseSize = product.caseSize || 12;
      
      // Check if this item is priced per bottle or per case
      const unitType = item.unitType || 'cases';
      let unitPrice: number;
      let retailPrice: number;
      let lineTotal: number;
      let lineDiscount: number;
      
      if (unitType === 'bottles') {
        // Calculate bottle price from case price
        retailPrice = retailCasePrice / caseSize;
        unitPrice = casePriceWithDiscount / caseSize;
        lineTotal = unitPrice * item.quantity;
        lineDiscount = (retailPrice - unitPrice) * item.quantity;
      } else {
        // Standard case pricing
        retailPrice = retailCasePrice;
        unitPrice = casePriceWithDiscount;
        lineTotal = unitPrice * item.quantity;
        lineDiscount = (retailPrice - unitPrice) * item.quantity;
      }
      
      subtotal += lineTotal;
      totalDiscount += lineDiscount;

      orderItems.push({
        productId: product.id,
        productName: product.name,
        productSku: product.sku || '',
        quantity: item.quantity,
        caseSize: caseSize,
        unitType: unitType,
        unitPrice: unitPrice.toFixed(2),
        retailPrice: retailPrice.toFixed(2),
        totalPrice: lineTotal.toFixed(2),
      });
    }

    // Create order with items using createB2bOrder which handles both
    const isReturn = orderType === 'return';
    const orderNumber = isReturn ? `RET-${Date.now()}` : `MO-${Date.now()}`;
    
    // Generate delivery date token for sales rep workflow (7-day expiration for security)
    // Returns skip the workflow and go directly to completed
    const deliveryDateToken = isReturn ? null : randomBytes(32).toString('hex');
    const deliveryDateTokenExpiresAt = isReturn ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // For returns: negative totals, completed status, credit invoice
    const finalSubtotal = isReturn ? -subtotal : subtotal;
    const finalTotal = isReturn ? -subtotal : subtotal;
    const finalDiscount = isReturn ? -totalDiscount : totalDiscount;
    
    const order = await storage.createB2bOrder({
      customerId,
      orderNumber,
      orderType: orderType,
      status: isReturn ? 'completed' : 'pending_delivery_date',
      subtotal: (Math.abs(finalSubtotal) + Math.abs(finalDiscount)).toFixed(2),
      tax: '0',
      total: finalTotal.toFixed(2),
      notes: isReturn ? `CREDIT MEMO - ${notes || 'Return processed'}` : (notes || ''),
      shippingAddress: customer.shippingAddress || '',
      shippingCity: customer.shippingCity || '',
      shippingState: customer.shippingState || '',
      shippingZipCode: customer.shippingZipCode || '',
      deliveryDateToken,
      deliveryDateTokenExpiresAt,
      completedAt: isReturn ? new Date() : null,
    }, orderItems.map(item => ({
      productId: item.productId,
      productName: item.productName,
      sku: item.productSku,
      quantity: isReturn ? -item.quantity : item.quantity,
      unitPrice: item.unitPrice,
      retailPrice: item.retailPrice,
      lineTotal: isReturn ? (-parseFloat(item.totalPrice)).toFixed(2) : item.totalPrice,
    })));

    // Create commission record if customer has sales rep
    // For returns, create a negative commission adjustment
    if (customer.salesRepId) {
      const salesRep = await storage.getSalesRep(customer.salesRepId);
      if (salesRep && salesRep.commissionPercentage) {
        const commissionPercentage = parseFloat(salesRep.commissionPercentage.toString());
        const commissionAmount = (subtotal * commissionPercentage) / 100;
        
        await storage.createCommission({
          orderId: order.id,
          salesRepId: customer.salesRepId,
          orderTotal: isReturn ? (-subtotal).toFixed(2) : subtotal.toFixed(2),
          commissionPercentage: commissionPercentage.toString(),
          commissionAmount: isReturn ? (-commissionAmount).toFixed(2) : commissionAmount.toFixed(2),
          status: isReturn ? 'earned' : 'pending', // Returns are immediately applied
        });
      }
    }

    // Send order notifications (delivery date workflow email to sales rep)
    // Skip notifications for returns - they're processed immediately
    if (!isReturn) {
      try {
        await sendOrderNotifications(order, customer, orderItems.map(item => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.totalPrice,
        })));
      } catch (emailError) {
        console.error('Failed to send order notifications:', emailError);
      }
    }

    res.json({ success: true, orderId: order.id });
  } catch (error) {
    console.error('Error creating manual order:', error);
    res.status(500).json({ error: 'Failed to create manual order' });
  }
});

// Admin/Sales Rep: Get all orders
// Sales reps only see orders from their assigned customers (server-side filtering)
router.get('/api/b2b/admin/orders', requireB2bAdminOrSalesRep, async (req: Request, res: Response) => {
  try {
    // For sales reps, use SQL-scoped query to only return orders from their assigned customers
    if ((req.session as any).b2bUserType === 'sales_rep') {
      const salesRepId = (req.session as any).b2bUserId;
      const orders = await storage.getB2bOrdersBySalesRep(salesRepId);
      return res.json(orders);
    }
    
    // For admins, return all orders
    const orders = await storage.getAllB2bOrders();
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Admin/Sales Rep: Get single order with items
router.get('/api/b2b/admin/orders/:id', requireB2bAdminOrSalesRep, async (req: Request, res: Response) => {
  try {
    const order = await storage.getB2bOrder(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Authorization: Sales reps can only view orders for their assigned customers
    if ((req.session as any).b2bUserType === 'sales_rep') {
      const salesRepId = (req.session as any).b2bUserId;
      if (order.customer?.salesRepId !== salesRepId) {
        return res.status(403).json({ error: 'You can only view orders for your assigned customers' });
      }
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

    const validStatuses = ['pending_delivery_date', 'pending_approval', 'awaiting_delivery', 'awaiting_payment', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const order = await storage.updateB2bOrderStatus(id, status);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // If order is marked as completed/paid, update related commission status
    if (status === 'completed') {
      try {
        const commissions = await storage.getCommissionsByOrderId(id);
        for (const commission of commissions) {
          try {
            await storage.updateCommissionStatus(commission.id, 'earned');
          } catch (commissionError) {
            console.error(`Error updating commission ${commission.id}:`, commissionError);
            // Continue updating other commissions even if one fails
          }
        }
      } catch (commissionsError) {
        console.error(`Error getting commissions for order ${id}:`, commissionsError);
        // Don't fail the order status update if commission operations fail
      }
    }

    // Send manager notification about status change
    try {
      const managerEmailsSetting = await storage.getB2bSetting('manager_emails');
      if (managerEmailsSetting?.settingValue) {
        const { sendEmail } = await import('./email');
        const managerEmails = managerEmailsSetting.settingValue.split(',').map((e: string) => e.trim()).filter(e => e);
        
        const statusLabels: Record<string, string> = {
          'pending_approval': 'Pending Approval',
          'awaiting_delivery': 'Awaiting Delivery',
          'awaiting_payment': 'Awaiting Payment',
          'completed': 'Completed'
        };
        
        const statusLabel = statusLabels[status] || status;
        const emailHtml = `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <h2 style="color: #2c3e50;">B2B Order Status Updated</h2>
              <p><strong>Order Number:</strong> ${order.orderNumber}</p>
              <p><strong>New Status:</strong> <strong style="color: #27ae60;">${statusLabel}</strong></p>
              <p><strong>Order Total:</strong> $${order.total}</p>
              <p>The status for this order has been updated in the system.</p>
            </body>
          </html>
        `;
        
        const emailText = `
B2B Order Status Updated

Order Number: ${order.orderNumber}
New Status: ${statusLabel}
Order Total: $${order.total}

The status for this order has been updated in the system.
        `.trim();
        
        for (const managerEmail of managerEmails) {
          await sendEmail(
            managerEmail,
            `Order Status Update: ${order.orderNumber} - ${statusLabel}`,
            emailHtml,
            emailText
          ).catch(err => console.error('Failed to send manager notification:', err));
        }
      }
    } catch (emailError) {
      console.error('Failed to send manager status notification:', emailError);
    }

    res.json(order);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Admin: Set delivery date for order (manual workflow action)
router.post('/api/b2b/admin/orders/:id/set-delivery-date', requireB2bAdminOrSalesRep, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { deliveryDate } = req.body;
    
    if (!deliveryDate) {
      return res.status(400).json({ error: 'Delivery date is required' });
    }
    
    const order = await storage.getB2bOrder(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Update order with delivery date and advance status to pending_approval
    await db.update(b2bOrders)
      .set({
        scheduledDeliveryDate: new Date(deliveryDate),
        status: 'pending_approval',
        updatedAt: new Date(),
      })
      .where(eq(b2bOrders.id, id));
    
    const updatedOrder = await storage.getB2bOrder(id);
    res.json({ success: true, message: 'Delivery date set. Order moved to pending approval.', order: updatedOrder });
  } catch (error) {
    console.error('Error setting delivery date:', error);
    res.status(500).json({ error: 'Failed to set delivery date' });
  }
});

// Admin: Approve order (manual workflow action)
router.post('/api/b2b/admin/orders/:id/approve', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = (req.session as any).b2bUserId;
    
    const order = await storage.getB2bOrder(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Update order with approval and advance status to awaiting_delivery
    await db.update(b2bOrders)
      .set({
        approvedAt: new Date(),
        approvedByAdminId: adminId,
        status: 'awaiting_delivery',
        updatedAt: new Date(),
      })
      .where(eq(b2bOrders.id, id));
    
    const updatedOrder = await storage.getB2bOrder(id);
    res.json({ success: true, message: 'Order approved. Ready for delivery.', order: updatedOrder });
  } catch (error) {
    console.error('Error approving order:', error);
    res.status(500).json({ error: 'Failed to approve order' });
  }
});

// Admin: Confirm delivery (manual workflow action)
router.post('/api/b2b/admin/orders/:id/confirm-delivery', requireB2bAdminOrSalesRep, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.session as any).b2bUserId;
    const userType = (req.session as any).b2bUserType;
    
    const order = await storage.getB2bOrder(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Update order with delivery confirmation and advance status to awaiting_payment
    const updateData: any = {
      deliveredAt: new Date(),
      status: 'awaiting_payment',
      updatedAt: new Date(),
    };
    
    if (userType === 'sales_rep') {
      updateData.deliveryConfirmedBySalesRepId = userId;
    }
    
    await db.update(b2bOrders)
      .set(updateData)
      .where(eq(b2bOrders.id, id));
    
    const updatedOrder = await storage.getB2bOrder(id);
    res.json({ success: true, message: 'Delivery confirmed. Order awaiting payment.', order: updatedOrder });
  } catch (error) {
    console.error('Error confirming delivery:', error);
    res.status(500).json({ error: 'Failed to confirm delivery' });
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

// Admin: Change customer password
router.post('/api/b2b/admin/customers/:id/change-password', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Get customer
    const customer = await storage.getB2bCustomer(id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);
    
    // Update customer password
    await storage.updateB2bCustomer(id, { passwordHash: newPasswordHash });

    res.json({ success: true, message: `Password updated for ${customer.accountName}` });
  } catch (error) {
    console.error('Error changing customer password:', error);
    res.status(500).json({ error: 'Failed to change customer password' });
  }
});

// Admin: Get tier commitment report
router.get('/api/b2b/admin/tier-commitment-report', requireB2bAdminOrSalesRep, async (req: Request, res: Response) => {
  try {
    const report = await storage.getTierCommitmentReport();
    console.log('[Tier Commitment Report] Returning', report.length, 'customers');
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

// Admin: Get system email template preview with sample data
router.get('/api/b2b/admin/system-templates/preview/:templateKey', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { templateKey } = req.params;
    
    // Import email generation functions
    const {
      generatePasswordResetEmail,
      generateAccessRequestEmail,
      generateWholesaleApplicationEmail,
      generateTierRenewalEmail,
      generateFavoritesEmail,
      generateCartEmail,
      generateBrandedEmailHeader,
      generateBrandedEmailFooter,
      getBrandedEmailStyles,
    } = await import('./email');
    
    // Generate preview with sample data based on template key
    let previewHtml = '';
    let previewSubject = '';
    
    switch (templateKey) {
      case 'order_delivery_date':
        previewSubject = 'Action Required: Set Delivery Date for Order #12345';
        previewHtml = `
<!DOCTYPE html>
<html>
<head><style>${getBrandedEmailStyles()}</style></head>
<body>
<div class="email-container">
  ${generateBrandedEmailHeader('Delivery Date Request', 'Action required for Order #12345')}
  <div class="content">
    <p>Hello <strong>John Smith (Sales Rep)</strong>,</p>
    <p>A new order has been created for <strong>Sample Restaurant</strong> and requires a delivery date to be set.</p>
    <div class="info-box">
      <p><strong>Order #12345</strong></p>
      <p>Customer: Sample Restaurant</p>
      <p>Items: 3 cases of Chardonnay, 2 cases of Merlot</p>
      <p>Total: $450.00</p>
    </div>
    <p style="text-align: center;">
      <a href="#" class="button">Set Delivery Date</a>
    </p>
    <p class="warning-box"><strong>Note:</strong> This link is secure and expires after use.</p>
  </div>
  ${generateBrandedEmailFooter()}
</div>
</body>
</html>`;
        break;
        
      case 'order_approval_request':
        previewSubject = 'Order Approval Required: Order #12345';
        previewHtml = `
<!DOCTYPE html>
<html>
<head><style>${getBrandedEmailStyles()}</style></head>
<body>
<div class="email-container">
  ${generateBrandedEmailHeader('Order Approval Request', 'Review and approve order')}
  <div class="content">
    <p>Hello <strong>Admin</strong>,</p>
    <p>An order is ready for your approval.</p>
    <div class="info-box">
      <p><strong>Order #12345</strong></p>
      <p>Customer: Sample Restaurant</p>
      <p>Delivery Date: December 20, 2025</p>
      <p>Total: $450.00</p>
    </div>
    <p style="text-align: center;">
      <a href="#" class="button">Review & Approve</a>
    </p>
  </div>
  ${generateBrandedEmailFooter()}
</div>
</body>
</html>`;
        break;
        
      case 'delivery_confirmation_request':
        previewSubject = 'Confirm Delivery: Order #12345';
        previewHtml = `
<!DOCTYPE html>
<html>
<head><style>${getBrandedEmailStyles()}</style></head>
<body>
<div class="email-container">
  ${generateBrandedEmailHeader('Delivery Confirmation', 'Confirm order delivery')}
  <div class="content">
    <p>Hello,</p>
    <p>Please confirm delivery of the following order:</p>
    <div class="info-box">
      <p><strong>Order #12345</strong></p>
      <p>Customer: Sample Restaurant</p>
      <p>Scheduled Delivery: December 20, 2025</p>
    </div>
    <p style="text-align: center;">
      <a href="#" class="button">Confirm Delivery</a>
    </p>
  </div>
  ${generateBrandedEmailFooter()}
</div>
</body>
</html>`;
        break;
        
      case 'payment_confirmation_request':
        previewSubject = 'Record Payment: Order #12345';
        previewHtml = `
<!DOCTYPE html>
<html>
<head><style>${getBrandedEmailStyles()}</style></head>
<body>
<div class="email-container">
  ${generateBrandedEmailHeader('Payment Confirmation', 'Record payment for delivered order')}
  <div class="content">
    <p>Hello,</p>
    <p>Order #12345 has been delivered. Please record the payment details.</p>
    <div class="info-box">
      <p><strong>Order #12345</strong></p>
      <p>Customer: Sample Restaurant</p>
      <p>Amount Due: $450.00</p>
    </div>
    <p style="text-align: center;">
      <a href="#" class="button">Record Payment</a>
    </p>
  </div>
  ${generateBrandedEmailFooter()}
</div>
</body>
</html>`;
        break;
        
      case 'password_reset':
        const resetEmail = generatePasswordResetEmail('https://example.com/reset?token=sample', 'customer');
        previewSubject = resetEmail.subject;
        previewHtml = resetEmail.html;
        break;
        
      case 'access_request':
        const accessEmail = generateAccessRequestEmail('John Doe', 'Sample Business', 'john@example.com');
        previewSubject = accessEmail.subject;
        previewHtml = accessEmail.html;
        break;
        
      case 'wholesale_application':
        const appEmail = generateWholesaleApplicationEmail({
          accountName: 'Sample Restaurant',
          customerType: 'restaurant',
          customerNumber: 'CUST-001',
          primaryContactName: 'John Smith',
          primaryContactRole: 'Owner',
          emailAddress: 'john@samplerestaurant.com',
          phoneNumber: '555-123-4567',
          licenseNumber: 'LIC-12345',
          taxId: '12-3456789',
          billingAddress: '123 Main St',
          billingCity: 'Boston',
          billingState: 'MA',
          billingZipCode: '02101',
          storeLocationSameAsBusiness: 'yes',
          acceptsMarketing: true,
          submittedAt: new Date(),
        });
        previewSubject = appEmail.subject;
        previewHtml = appEmail.html;
        break;
        
      case 'tier_renewal':
        const tierEmail = generateTierRenewalEmail(
          'Sample Restaurant',
          'Tier 3',
          25,
          5,
          30,
          30,
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        );
        previewSubject = tierEmail.subject;
        previewHtml = tierEmail.html;
        break;
        
      case 'favorites_email':
        const favEmail = generateFavoritesEmail({
          guestName: 'Sample Guest',
          favorites: [
            {
              id: '1',
              guestId: '1',
              productId: '1',
              note: 'Really enjoyed this one!',
              createdAt: new Date(),
              product: {
                id: '1',
                name: 'Nashoba Valley Chardonnay',
                category: 'Wine',
                description: 'A crisp, refreshing white wine with notes of apple and citrus.',
                price: '18.99',
                enabled: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                abvMin: null,
                abvMax: null,
                quantity: null,
                sortOrder: null,
                imageId: null,
                unitCount: null,
                unitVolume: null,
              }
            }
          ]
        });
        previewSubject = favEmail.subject;
        previewHtml = favEmail.html;
        break;
        
      case 'cart_order_email':
        const cartEmail = generateCartEmail({
          guestName: 'Sample Guest',
          items: [
            {
              id: '1',
              guestId: '1',
              productId: '1',
              quantity: 2,
              note: null,
              createdAt: new Date(),
              product: {
                id: '1',
                name: 'Nashoba Valley Chardonnay',
                category: 'Wine',
                description: 'A crisp white wine',
                price: '18.99',
                enabled: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                abvMin: null,
                abvMax: null,
                quantity: null,
                sortOrder: null,
                imageId: null,
                unitCount: null,
                unitVolume: null,
              }
            }
          ],
          subtotal: 37.98,
          discount: 0,
          triviaCredit: 0,
          total: 37.98,
        });
        previewSubject = cartEmail.subject;
        previewHtml = cartEmail.html;
        break;
        
      default:
        return res.status(404).json({ error: 'Unknown template key' });
    }
    
    res.json({
      templateKey,
      subject: previewSubject,
      html: previewHtml,
    });
  } catch (error) {
    console.error('Error generating system template preview:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

// Admin: Get system template customization
router.get('/api/b2b/admin/system-templates/customization/:templateKey', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { templateKey } = req.params;
    const customization = await storage.getSystemTemplateCustomization(templateKey);
    if (!customization) {
      return res.status(404).json({ error: 'No customization found' });
    }
    res.json(customization);
  } catch (error) {
    console.error('Error fetching system template customization:', error);
    res.status(500).json({ error: 'Failed to fetch customization' });
  }
});

// Admin: Save/update system template customization
router.post('/api/b2b/admin/system-templates/customization', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { templateKey, customSubject, customIntroText, customBodyText, customClosingText, active } = req.body;
    
    if (!templateKey) {
      return res.status(400).json({ error: 'Template key is required' });
    }
    
    const admin = (req as any).b2bAdmin;
    const customization = await storage.upsertSystemTemplateCustomization({
      templateKey,
      customSubject: customSubject || null,
      customIntroText: customIntroText || null,
      customBodyText: customBodyText || null,
      customClosingText: customClosingText || null,
      active: active ?? true,
      updatedByAdminId: admin?.id || null,
    });
    
    res.json(customization);
  } catch (error) {
    console.error('Error saving system template customization:', error);
    res.status(500).json({ error: 'Failed to save customization' });
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

// Admin: Get earned commissions not yet paid
router.get('/api/b2b/admin/payroll/commissions', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const commissions = await storage.getEarnedCommissionsNotPaid();
    res.json(commissions);
  } catch (error) {
    console.error('Error fetching payroll commissions:', error);
    res.status(500).json({ error: 'Failed to fetch commissions' });
  }
});

// Admin: Mark commission as paid with pay period
router.patch('/api/b2b/admin/payroll/commissions/:id/pay', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { payPeriod } = req.body;
    
    if (!payPeriod) {
      return res.status(400).json({ error: 'Pay period is required' });
    }

    const commission = await storage.updateCommissionPayPeriod(id, payPeriod);
    
    if (!commission) {
      return res.status(404).json({ error: 'Commission not found' });
    }

    res.json(commission);
  } catch (error) {
    console.error('Error updating commission:', error);
    res.status(500).json({ error: 'Failed to update commission' });
  }
});

// Admin: Get payroll settings
router.get('/api/b2b/admin/payroll/settings', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const payday = await storage.getB2bSetting('payroll_payday');
    const frequency = await storage.getB2bSetting('payroll_frequency');
    const payrollAdminName = await storage.getB2bSetting('payroll_admin_name');
    const payrollAdminEmail = await storage.getB2bSetting('payroll_admin_email');
    const managerEmails = await storage.getB2bSetting('manager_emails');
    
    res.json({
      payday: payday ? payday.settingValue : null,
      frequency: frequency ? frequency.settingValue : 'monthly',
      payrollAdminName: payrollAdminName ? payrollAdminName.settingValue : '',
      payrollAdminEmail: payrollAdminEmail ? payrollAdminEmail.settingValue : '',
      managerEmails: managerEmails ? managerEmails.settingValue : '',
    });
  } catch (error) {
    console.error('Error fetching payroll settings:', error);
    res.status(500).json({ error: 'Failed to fetch payroll settings' });
  }
});

// Admin: Save payroll settings
router.post('/api/b2b/admin/payroll/settings', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { payday, frequency, payrollAdminName, payrollAdminEmail, managerEmails } = req.body;
    
    if (!payday || !frequency || !payrollAdminEmail) {
      return res.status(400).json({ error: 'Payday, frequency, and payroll admin email are required' });
    }

    await storage.setB2bSetting('payroll_payday', payday);
    await storage.setB2bSetting('payroll_frequency', frequency);
    await storage.setB2bSetting('payroll_admin_name', payrollAdminName || '');
    await storage.setB2bSetting('payroll_admin_email', payrollAdminEmail);
    await storage.setB2bSetting('manager_emails', managerEmails || '');

    res.json({
      success: true,
      payday,
      frequency,
      payrollAdminName,
      payrollAdminEmail,
      managerEmails,
    });
  } catch (error) {
    console.error('Error saving payroll settings:', error);
    res.status(500).json({ error: 'Failed to save payroll settings' });
  }
});

// Admin: Send payroll email and mark commissions as paid
router.post('/api/b2b/admin/payroll/send-email', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { sendEmail } = await import('./email');
    const { commissionIds, payPeriod } = req.body;
    
    if (!commissionIds || !Array.isArray(commissionIds) || commissionIds.length === 0) {
      return res.status(400).json({ error: 'Commission IDs are required' });
    }

    // Get payroll admin email from settings
    const payrollAdminEmailSetting = await storage.getB2bSetting('payroll_admin_email');
    const payrollAdminNameSetting = await storage.getB2bSetting('payroll_admin_name');
    
    if (!payrollAdminEmailSetting || !payrollAdminEmailSetting.settingValue) {
      return res.status(400).json({ error: 'Payroll administrator email not configured' });
    }

    const payrollAdminEmail = payrollAdminEmailSetting.settingValue;
    const payrollAdminName = payrollAdminNameSetting?.settingValue || 'Payroll Administrator';

    // Fetch commission details and group by sales rep
    interface CommissionGroup {
      [key: string]: {
        salesRepName: string;
        salesRepEmail: string;
        commissions: any[];
        totalAmount: number;
      };
    }
    
    const commissionsByRep: CommissionGroup = {};
    let grandTotal = 0;

    for (const commissionId of commissionIds) {
      // Get commission details with related data
      const result = await db
        .select({
          commission: b2bCommissions,
          order: b2bOrders,
          customer: b2bCustomers,
          salesRep: salesReps,
        })
        .from(b2bCommissions)
        .innerJoin(b2bOrders, eq(b2bCommissions.orderId, b2bOrders.id))
        .innerJoin(b2bCustomers, eq(b2bOrders.customerId, b2bCustomers.id))
        .innerJoin(salesReps, eq(b2bCommissions.salesRepId, salesReps.id))
        .where(eq(b2bCommissions.id, commissionId))
        .limit(1);

      if (result.length === 0) continue;

      const { commission, order, customer, salesRep } = result[0];
      const repKey = salesRep.id;
      const commissionAmount = Number(commission.commissionAmount);

      if (!commissionsByRep[repKey]) {
        commissionsByRep[repKey] = {
          salesRepName: `${salesRep.firstName} ${salesRep.lastName}`,
          salesRepEmail: salesRep.email,
          commissions: [],
          totalAmount: 0,
        };
      }

      commissionsByRep[repKey].commissions.push({
        orderNumber: order.orderNumber,
        customerName: customer.accountName,
        amount: commissionAmount,
        date: commission.createdAt,
      });
      commissionsByRep[repKey].totalAmount += commissionAmount;
      grandTotal += commissionAmount;
    }

    // Create email content
    let emailBody = `<h2>Payroll Commission Report</h2>`;
    emailBody += `<p><strong>Pay Period:</strong> ${payPeriod}</p>`;
    emailBody += `<p><strong>Total Commissions:</strong> $${grandTotal.toFixed(2)}</p>`;
    emailBody += `<h3>Commission Breakdown by Sales Rep:</h3>`;

    for (const [repId, repData] of Object.entries(commissionsByRep)) {
      emailBody += `<h4>${repData.salesRepName} - $${repData.totalAmount.toFixed(2)}</h4>`;
      emailBody += `<table border="1" cellpadding="10">`;
      emailBody += `<tr><th>Order #</th><th>Customer</th><th>Amount</th></tr>`;
      for (const commission of repData.commissions) {
        emailBody += `<tr><td>#${commission.orderNumber}</td><td>${commission.customerName}</td><td>$${commission.amount.toFixed(2)}</td></tr>`;
      }
      emailBody += `</table>`;
    }

    // Send email to payroll admin
    await sendEmail(
      payrollAdminEmail,
      `Payroll Commission Report - ${payPeriod}`,
      emailBody,
      emailBody
    );

    // Send copy to each sales rep
    for (const [repId, repData] of Object.entries(commissionsByRep)) {
      const repEmailHtml = `<p>Hi ${repData.salesRepName},</p>
        <p>Your commissions for ${payPeriod} have been submitted to payroll.</p>
        <p><strong>Total Amount:</strong> $${repData.totalAmount.toFixed(2)}</p>
        <p>Commission details have been sent to our payroll department for processing.</p>`;
      
      const repEmailText = `Hi ${repData.salesRepName},\n\nYour commissions for ${payPeriod} have been submitted to payroll.\n\nTotal Amount: $${repData.totalAmount.toFixed(2)}\n\nCommission details have been sent to our payroll department for processing.`;
      
      await sendEmail(
        repData.salesRepEmail,
        `Your Commissions - ${payPeriod}`,
        repEmailHtml,
        repEmailText
      );
    }

    // Send notification to managers
    try {
      const managerEmailsSetting = await storage.getB2bSetting('manager_emails');
      if (managerEmailsSetting?.settingValue) {
        const managerEmails = managerEmailsSetting.settingValue.split(',').map((e: string) => e.trim()).filter(e => e);
        const managerEmailBody = `<html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <h2 style="color: #2c3e50;">Payroll Email Sent</h2>
              <p><strong>Pay Period:</strong> ${payPeriod}</p>
              <p><strong>Total Commissions:</strong> $${grandTotal.toFixed(2)}</p>
              <p><strong>Number of Sales Reps:</strong> ${Object.keys(commissionsByRep).length}</p>
              <p><strong>Number of Commissions:</strong> ${commissionIds.length}</p>
              <p>Payroll emails have been sent to the payroll administrator and all affected sales representatives.</p>
            </body>
          </html>`;
        
        const managerEmailText = `Payroll Email Sent\n\nPay Period: ${payPeriod}\nTotal Commissions: $${grandTotal.toFixed(2)}\nNumber of Sales Reps: ${Object.keys(commissionsByRep).length}\nNumber of Commissions: ${commissionIds.length}\n\nPayroll emails have been sent to the payroll administrator and all affected sales representatives.`;
        
        for (const managerEmail of managerEmails) {
          await sendEmail(
            managerEmail,
            `Payroll Email Sent - ${payPeriod}`,
            managerEmailBody,
            managerEmailText
          ).catch(err => console.error('Failed to send manager payroll notification:', err));
        }
      }
    } catch (emailError) {
      console.error('Failed to send manager payroll notifications:', emailError);
    }

    // Update all commissions as paid with pay period
    for (const commissionId of commissionIds) {
      await storage.updateCommissionPayPeriod(commissionId, payPeriod);
    }

    res.json({
      success: true,
      message: `Payroll email sent to ${payrollAdminName} and ${Object.keys(commissionsByRep).length} sales rep(s)`,
      totalAmount: grandTotal.toFixed(2),
      commissionsProcessed: commissionIds.length,
    });
  } catch (error) {
    console.error('Error sending payroll email:', error);
    res.status(500).json({ error: 'Failed to send payroll email' });
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

// ======= ROLE PERMISSIONS API =======

// Get all role permissions (accessible to all authenticated B2B users)
router.get('/api/b2b/role-permissions', requireB2bAuth, async (req: Request, res: Response) => {
  try {
    const permissions = await storage.getAllB2bRolePermissions();
    
    // If no permissions exist yet, initialize defaults
    if (permissions.length === 0) {
      await storage.initializeDefaultRolePermissions();
      const initializedPermissions = await storage.getAllB2bRolePermissions();
      return res.json(initializedPermissions);
    }
    
    res.json(permissions);
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    res.status(500).json({ error: 'Failed to fetch role permissions' });
  }
});

// Get single role permission (accessible to all authenticated B2B users)
router.get('/api/b2b/role-permissions/:roleName', requireB2bAuth, async (req: Request, res: Response) => {
  try {
    const { roleName } = req.params;
    const permission = await storage.getB2bRolePermission(roleName);
    
    if (!permission) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    res.json(permission);
  } catch (error) {
    console.error('Error fetching role permission:', error);
    res.status(500).json({ error: 'Failed to fetch role permission' });
  }
});

// Update role permissions (admin only)
router.put('/api/b2b/role-permissions/:roleName', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { roleName } = req.params;
    const { tabPermissions, specialPermissions, roleDisplayName, roleDescription } = req.body;
    
    // Validate that the role exists
    const existing = await storage.getB2bRolePermission(roleName);
    if (!existing) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    // Get admin ID from session
    const adminId = (req.session as any)?.b2bUser?.id;
    
    const updated = await storage.upsertB2bRolePermission({
      roleName,
      roleDisplayName: roleDisplayName ?? existing.roleDisplayName,
      roleDescription: roleDescription ?? existing.roleDescription,
      tabPermissions: tabPermissions ?? existing.tabPermissions,
      specialPermissions: specialPermissions ?? existing.specialPermissions,
      updatedByAdminId: adminId,
      isDefault: false, // Mark as customized
    });
    
    res.json({
      success: true,
      message: `Permissions updated for role: ${roleName}`,
      permission: updated,
    });
  } catch (error) {
    console.error('Error updating role permissions:', error);
    res.status(500).json({ error: 'Failed to update role permissions' });
  }
});

// Reset a role to default permissions (admin only)
router.post('/api/b2b/role-permissions/:roleName/reset', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { roleName } = req.params;
    
    // Get the default permissions for this role from storage initialization
    await storage.initializeDefaultRolePermissions();
    const resetPermission = await storage.getB2bRolePermission(roleName);
    
    if (!resetPermission) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    res.json({
      success: true,
      message: `Permissions reset to default for role: ${roleName}`,
      permission: resetPermission,
    });
  } catch (error) {
    console.error('Error resetting role permissions:', error);
    res.status(500).json({ error: 'Failed to reset role permissions' });
  }
});

// Initialize all default permissions (admin only - for setup/reset)
router.post('/api/b2b/role-permissions/initialize', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    await storage.initializeDefaultRolePermissions();
    const permissions = await storage.getAllB2bRolePermissions();
    
    res.json({
      success: true,
      message: 'Default role permissions initialized',
      permissions,
    });
  } catch (error) {
    console.error('Error initializing role permissions:', error);
    res.status(500).json({ error: 'Failed to initialize role permissions' });
  }
});

// ======= END ROLE PERMISSIONS API =======

// Admin: Export all customers to Excel
router.get('/api/b2b/admin/customer/export', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const { exportB2bCustomersToExcel } = await import('./excel-import');
    
    const allCustomers = await storage.getAllB2bCustomers();
    const allTiers = await storage.getAllTierPricing();
    const allSalesReps = await storage.getAllSalesReps();
    
    const buffer = exportB2bCustomersToExcel(allCustomers, allTiers, allSalesReps);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="customers-${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting customers:', error);
    res.status(500).json({ error: 'Failed to export customers' });
  }
});

// Admin: Import customers from Excel
router.post('/api/b2b/admin/customer/import', requireB2bAdmin, async (req: Request, res: Response) => {
  try {
    const multer = (await import('multer')).default;
    const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
    
    // Use multer middleware directly
    return upload.single('file')(req, res, async () => {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { parseB2bCustomersExcelFile } = await import('./excel-import');
      
      const allTiers = await storage.getAllTierPricing();
      const allSalesReps = await storage.getAllSalesReps();
      const parseResult = parseB2bCustomersExcelFile(req.file.buffer, allTiers, allSalesReps);

      if (parseResult.errors.length > 0) {
        return res.status(400).json({
          error: 'Import failed due to validation errors',
          errors: parseResult.errors,
          warnings: parseResult.warnings,
        });
      }

      let imported = 0;
      const errors: string[] = [];

      console.log(`[ADMIN IMPORT DEBUG] Starting import of ${parseResult.customers.length} customers`);

      for (const customerData of parseResult.customers) {
        try {
          console.log(`[ADMIN IMPORT] Processing: ${customerData.customerNumber} (${customerData.emailAddress})`);
          
          const existing = await db
            .select()
            .from(b2bCustomers)
            .where(eq(b2bCustomers.customerNumber, customerData.customerNumber))
            .limit(1);

          if (existing.length > 0) {
            console.log(`[ADMIN IMPORT] Updating existing: ${customerData.customerNumber}`);
            const result = await storage.updateB2bCustomer(existing[0].id, customerData);
            console.log(`[ADMIN IMPORT] Update result:`, result?.id ? 'success' : 'failed');
          } else {
            console.log(`[ADMIN IMPORT] Creating new: ${customerData.customerNumber}`);
            const result = await storage.createB2bCustomer({
              ...customerData,
              passwordHash: null,
            });
            console.log(`[ADMIN IMPORT] Create result:`, result?.id ? `success (${result.id})` : 'failed');
          }
          imported++;
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          console.error(`[ADMIN IMPORT ERROR] ${customerData.customerNumber}:`, errMsg);
          errors.push(`Failed to import ${customerData.customerNumber}: ${errMsg}`);
        }
      }

      console.log(`[ADMIN IMPORT DEBUG] Complete: imported=${imported}, errors=${errors.length}`);

      res.json({
        success: true,
        imported,
        errors,
      });
    });
  } catch (error) {
    console.error('Error importing customers:', error);
    res.status(500).json({ error: 'Failed to import customers' });
  }
});

// Customer: Export customers to Excel (for customer-facing page)
router.get('/api/b2b/customer/export', requireB2bCustomer, async (req: Request, res: Response) => {
  try {
    const { exportB2bCustomersToExcel } = await import('./excel-import');
    
    const allCustomers = await storage.getAllB2bCustomers();
    const allTiers = await storage.getAllTierPricing();
    const allSalesReps = await storage.getAllSalesReps();
    
    const buffer = exportB2bCustomersToExcel(allCustomers, allTiers, allSalesReps);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="customers-${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting customers:', error);
    res.status(500).json({ error: 'Failed to export customers' });
  }
});

// Customer: Import customers from Excel (for customer-facing page)
router.post('/api/b2b/customer/import', requireB2bCustomer, async (req: Request, res: Response) => {
  try {
    const multer = (await import('multer')).default;
    const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
    
    // Use multer middleware directly
    return upload.single('file')(req, res, async () => {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { parseB2bCustomersExcelFile } = await import('./excel-import');
      
      const allTiers = await storage.getAllTierPricing();
      const allSalesReps = await storage.getAllSalesReps();
      const parseResult = parseB2bCustomersExcelFile(req.file.buffer, allTiers, allSalesReps);

      if (parseResult.errors.length > 0) {
        return res.status(400).json({
          error: 'Import failed due to validation errors',
          errors: parseResult.errors,
          warnings: parseResult.warnings,
        });
      }

      let imported = 0;
      const errors: string[] = [];

      for (const customerData of parseResult.customers) {
        try {
          const existing = await db
            .select()
            .from(b2bCustomers)
            .where(eq(b2bCustomers.emailAddress, customerData.emailAddress))
            .limit(1);

          if (existing.length > 0) {
            await storage.updateB2bCustomer(existing[0].id, customerData);
          } else {
            await storage.createB2bCustomer({
              ...customerData,
              passwordHash: null,
            });
          }
          imported++;
        } catch (error) {
          errors.push(`Failed to import ${customerData.emailAddress}: ${error}`);
        }
      }

      res.json({
        success: true,
        imported,
        errors,
      });
    });
  } catch (error) {
    console.error('Error importing customers:', error);
    res.status(500).json({ error: 'Failed to import customers' });
  }
});

// Customer: Get customer count
router.get('/api/b2b/customer/count', requireB2bCustomer, async (req: Request, res: Response) => {
  try {
    const customers = await storage.getAllB2bCustomers();
    res.json(customers.length);
  } catch (error) {
    console.error('Error fetching customer count:', error);
    res.status(500).json({ error: 'Failed to fetch customer count' });
  }
});

export default router;
