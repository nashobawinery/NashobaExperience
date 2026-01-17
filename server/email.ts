import type { Product, CartItem, Favorite, B2bSystemTemplateCustomization } from "@shared/schema";
import sgMail from "@sendgrid/mail";
import crypto from "crypto";
import { storage } from "./storage";

interface EmailCustomization {
  subject?: string | null;
  introText?: string | null;
  bodyText?: string | null;
  closingText?: string | null;
}

async function getEmailCustomization(templateKey: string): Promise<EmailCustomization | null> {
  try {
    const customization = await storage.getSystemTemplateCustomization(templateKey);
    if (customization && customization.active) {
      return {
        subject: customization.customSubject,
        introText: customization.customIntroText,
        bodyText: customization.customBodyText,
        closingText: customization.customClosingText,
      };
    }
    return null;
  } catch (error) {
    console.error(`Failed to load email customization for ${templateKey}:`, error);
    return null;
  }
}

// ============= BRANDED EMAIL COMPONENTS =============
// Reusable branded header and wrapper for customer-facing emails

const BRAND_COLORS = {
  burgundy: '#5C2535',
  gold: '#C9A961',
  cream: '#F5F5F0',
  text: '#333333',
};

/**
 * Gets the base URL for the application
 */
function getBaseUrl(): string {
  if (process.env.REPLIT_DOMAINS) {
    return `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return 'http://localhost:5000';
}

/**
 * Generates branded email header with Nashoba Valley Winery logo and name
 * Used for customer-facing emails to build trust and recognition
 */
export function generateBrandedEmailHeader(title: string, subtitle?: string): string {
  const baseUrl = getBaseUrl();
  const logoUrl = `${baseUrl}/attached_assets/NVW%20logo%20no%20background_1762469370864.png`;
  
  return `
    <div style="background-color: ${BRAND_COLORS.burgundy}; padding: 30px 20px; text-align: center;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td align="center">
            <div style="margin-bottom: 15px;">
              <img src="${logoUrl}" alt="Nashoba Valley Winery" style="max-width: 180px; height: auto;" />
            </div>
            <p style="margin: 8px 0 0; font-size: 13px; color: ${BRAND_COLORS.gold}; letter-spacing: 2px; text-transform: uppercase;">
              Farm Winery &bull; Distillery &bull; Restaurant
            </p>
          </td>
        </tr>
      </table>
      <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid rgba(201, 169, 97, 0.3);">
        <h2 style="margin: 0; font-size: 22px; color: ${BRAND_COLORS.cream}; font-weight: bold;">${title}</h2>
        ${subtitle ? `<p style="margin: 10px 0 0; color: rgba(245, 245, 240, 0.9); font-size: 15px;">${subtitle}</p>` : ''}
      </div>
    </div>
  `;
}

/**
 * Generates branded email footer with contact info and warm closing
 */
export function generateBrandedEmailFooter(includeContact: boolean = true): string {
  return `
    <div style="background-color: ${BRAND_COLORS.cream}; padding: 30px 20px; text-align: center; border-top: 3px solid ${BRAND_COLORS.gold};">
      <p style="margin: 0 0 15px; font-family: Georgia, 'Times New Roman', serif; font-size: 18px; color: ${BRAND_COLORS.burgundy};">
        Thank you for being part of the Nashoba Valley family!
      </p>
      ${includeContact ? `
      <div style="margin: 20px 0; padding: 15px; background-color: white; border-radius: 8px; display: inline-block;">
        <p style="margin: 0 0 5px; font-size: 14px; color: ${BRAND_COLORS.text};">
          <strong>Questions?</strong> We're here to help!
        </p>
        <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.text};">
          <a href="mailto:support@nashobawinery.com" style="color: ${BRAND_COLORS.burgundy};">support@nashobawinery.com</a> | 
          <a href="tel:+19787795521" style="color: ${BRAND_COLORS.burgundy};">(978) 779-5521</a>
        </p>
      </div>
      ` : ''}
      <p style="margin: 20px 0 0; font-size: 12px; color: #666;">
        Nashoba Valley Winery | 100 Wattaquadock Hill Road, Bolton, MA 01740
      </p>
      <p style="margin: 5px 0 0; font-size: 11px; color: #999;">
        &copy; ${new Date().getFullYear()} Nashoba Valley Winery. All rights reserved.
      </p>
    </div>
  `;
}

/**
 * Common CSS styles for branded emails
 */
export function getBrandedEmailStyles(): string {
  return `
    body { 
      font-family: Arial, sans-serif; 
      line-height: 1.6; 
      color: ${BRAND_COLORS.text}; 
      margin: 0; 
      padding: 0; 
      background-color: #f5f5f5; 
    }
    .email-container { 
      max-width: 600px; 
      margin: 0 auto; 
      background-color: white; 
    }
    .content { 
      padding: 30px 25px; 
    }
    .button { 
      display: inline-block;
      background-color: ${BRAND_COLORS.burgundy}; 
      color: ${BRAND_COLORS.cream} !important; 
      padding: 14px 28px; 
      text-decoration: none; 
      border-radius: 4px; 
      font-weight: bold;
    }
    .button:hover {
      background-color: #7a3346;
    }
    .info-box { 
      background-color: ${BRAND_COLORS.cream}; 
      border-left: 4px solid ${BRAND_COLORS.gold}; 
      padding: 16px; 
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    .warning-box { 
      background-color: #FEF3C7; 
      border-left: 4px solid #F59E0B; 
      padding: 12px 16px; 
      margin: 20px 0;
    }
    .success-box {
      background-color: #D1FAE5;
      border-left: 4px solid #22c55e;
      padding: 12px 16px;
      margin: 20px 0;
    }
  `;
}

interface EmailCartData {
  guestName: string;
  items: Array<CartItem & { product: Product }>;
  subtotal: number;
  discount?: number;
  bottleDiscount?: number;
  cannedDiscount?: number;
  triviaCredit: number;
  total: number;
}

interface EmailFavoritesData {
  guestName: string;
  favorites: Array<Favorite & { product: Product }>;
}

export function generateCartEmail(data: EmailCartData): { subject: string; html: string; text: string } {
  const { guestName, items, subtotal, discount, bottleDiscount, cannedDiscount, triviaCredit, total } = data;

  const subject = `Tasting Order from ${guestName} - Nashoba Winery`;
  
  const text = `
Tasting Room Order - ${guestName}

Items:
${items.map(item => `- ${item.product.name} (${item.product.category}) x${item.quantity} - $${(parseFloat(item.product.price) * item.quantity).toFixed(2)}${item.note ? `\n  Note: ${item.note}` : ''}`).join('\n')}

Subtotal: $${subtotal.toFixed(2)}
${bottleDiscount && bottleDiscount > 0 ? `Bottle Discount: -$${bottleDiscount.toFixed(2)}` : ''}
${cannedDiscount && cannedDiscount > 0 ? `Canned Discount: -$${cannedDiscount.toFixed(2)}` : ''}
${discount && discount > 0 && !bottleDiscount && !cannedDiscount ? `Discount: -$${discount.toFixed(2)}` : ''}
${triviaCredit > 0 ? `Trivia Reward: -$${triviaCredit.toFixed(2)}` : ''}
Total: $${total.toFixed(2)}

Please prepare this order for the guest.
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: #5C2535; color: #F5F5F0; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .item { border-bottom: 1px solid #eee; padding: 10px 0; }
    .item-note { font-style: italic; color: #666; margin-left: 20px; }
    .totals { margin-top: 20px; padding-top: 20px; border-top: 2px solid #5C2535; }
    .total-row { display: flex; justify-content: space-between; margin: 8px 0; }
    .total-row.final { font-weight: bold; font-size: 1.2em; color: #5C2535; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Tasting Room Order</h1>
    <p>Guest: ${guestName}</p>
  </div>
  <div class="content">
    <h2>Order Items</h2>
    ${items.map(item => `
      <div class="item">
        <strong>${item.product.name}</strong> (${item.product.category})<br>
        Quantity: ${item.quantity} × $${parseFloat(item.product.price).toFixed(2)} = $${(parseFloat(item.product.price) * item.quantity).toFixed(2)}
        ${item.note ? `<div class="item-note">Note: ${item.note}</div>` : ''}
      </div>
    `).join('')}
    
    <div class="totals">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>$${subtotal.toFixed(2)}</span>
      </div>
      ${bottleDiscount && bottleDiscount > 0 ? `
        <div class="total-row">
          <span>Bottle Discount:</span>
          <span style="color: green;">-$${bottleDiscount.toFixed(2)}</span>
        </div>
      ` : ''}
      ${cannedDiscount && cannedDiscount > 0 ? `
        <div class="total-row">
          <span>Canned Discount:</span>
          <span style="color: green;">-$${cannedDiscount.toFixed(2)}</span>
        </div>
      ` : ''}
      ${discount && discount > 0 && !bottleDiscount && !cannedDiscount ? `
        <div class="total-row">
          <span>Discount:</span>
          <span style="color: green;">-$${discount.toFixed(2)}</span>
        </div>
      ` : ''}
      ${triviaCredit > 0 ? `
        <div class="total-row">
          <span>Trivia Reward:</span>
          <span style="color: green;">-$${triviaCredit.toFixed(2)}</span>
        </div>
      ` : ''}
      <div class="total-row final">
        <span>Total:</span>
        <span>$${total.toFixed(2)}</span>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, html, text };
}

export function generateFavoritesEmail(data: EmailFavoritesData): { subject: string; html: string; text: string } {
  const { guestName, favorites } = data;

  const subject = `Your Tasting Favorites - Nashoba Valley Winery`;
  
  const text = `
Your Tasting Favorites

Hi ${guestName},

Thank you for visiting Nashoba Valley Winery! We're delighted that you found some favorites during your tasting experience.

Here are the products you loved:

${favorites.map(fav => `
${fav.product.name} (${fav.product.category}) - $${parseFloat(fav.product.price).toFixed(2)}
${fav.product.description}
${fav.note ? `Your notes: ${fav.note}` : ''}
`).join('\n---\n')}

We hope to see you again soon!

Cheers,
The Nashoba Valley Winery Team

Questions? Contact us at support@nashobawinery.com or (978) 779-5521
100 Wattaquadock Hill Road, Bolton, MA 01740
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    ${getBrandedEmailStyles()}
    .favorite { 
      border: 1px solid #e0e0e0; 
      border-radius: 8px; 
      padding: 20px; 
      margin: 15px 0;
      background-color: white;
    }
    .favorite h3 { color: #5C2535; margin-top: 0; margin-bottom: 10px; }
    .price { color: #C9A961; font-weight: bold; font-size: 18px; }
    .notes { 
      background-color: #F5F5F0; 
      padding: 12px 15px; 
      border-left: 3px solid #C9A961; 
      margin-top: 15px; 
      font-style: italic;
      border-radius: 0 8px 8px 0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    ${generateBrandedEmailHeader('Your Tasting Favorites', 'A keepsake from your visit')}
    <div class="content">
      <p>Hi <strong>${guestName}</strong>,</p>
      
      <p>Thank you for visiting Nashoba Valley Winery! We're delighted that you found some favorites during your tasting experience.</p>
      
      <p>Here are the products you loved:</p>
      
      ${favorites.map(fav => `
        <div class="favorite">
          <h3>${fav.product.name}</h3>
          <p><strong>Category:</strong> ${fav.product.category}</p>
          <p class="price">$${parseFloat(fav.product.price).toFixed(2)}</p>
          <p>${fav.product.description}</p>
          ${fav.note ? `<div class="notes"><strong>Your notes:</strong> ${fav.note}</div>` : ''}
        </div>
      `).join('')}
      
      <div class="info-box">
        <p style="margin: 0;"><strong>Want to order more?</strong> Visit our tasting room or contact us anytime. We'd love to help you stock up on your favorites!</p>
      </div>
      
      <p style="margin-top: 25px;">We hope to see you again soon!</p>
      <p>Cheers,<br><strong>The Nashoba Valley Winery Team</strong></p>
    </div>
    ${generateBrandedEmailFooter()}
  </div>
</body>
</html>
  `.trim();

  return { subject, html, text };
}

export async function generatePasswordResetEmail(resetLink: string, userType: string): Promise<{ subject: string; html: string; text: string }> {
  const roleDisplay = userType === "sales_rep" ? "Sales Representative" : userType.charAt(0).toUpperCase() + userType.slice(1);
  const customization = await getEmailCustomization('password_reset');

  const defaultSubject = `Password Reset Request - Nashoba Winery B2B`;
  const defaultIntro = `We received a request to reset your password for your ${roleDisplay} account at Nashoba Valley Winery B2B Portal.`;
  const defaultClosing = `Best regards,\nNashoba Valley Winery Team`;

  const subject = customization?.subject || defaultSubject;
  const introText = customization?.introText || defaultIntro;
  const closingText = customization?.closingText || defaultClosing;
  
  const text = `
Password Reset Request

Hello,

${introText}

Click the link below to reset your password:
${resetLink}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, you can safely ignore this email.

${closingText}
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    ${getBrandedEmailStyles()}
    .warning { 
      background-color: #FEF3C7; 
      border-left: 4px solid #F59E0B; 
      padding: 12px 16px; 
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    ${generateBrandedEmailHeader('Password Reset Request', 'Secure account recovery')}
    <div class="content">
      <p>Hello,</p>
      
      <p>${introText}</p>
      
      <p style="text-align: center;">
        <a href="${resetLink}" class="button">Reset Your Password</a>
      </p>
      
      <div class="warning">
        <strong>Important:</strong> This link will expire in 1 hour for security reasons.
      </div>
      
      <p>If the button above doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #5C2535;">${resetLink}</p>
      
      <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
      
      <p style="margin-top: 20px; white-space: pre-line;">${closingText}</p>
    </div>
    ${generateBrandedEmailFooter()}
  </div>
</body>
</html>
  `.trim();

  return { subject, html, text };
}

export function generateAccessRequestEmail(name: string, businessName: string, email: string): { subject: string; html: string; text: string } {
  const subject = `Wholesale Access Code Request - ${businessName}`;
  
  const text = `
Wholesale Access Code Request

Name: ${name}
Business: ${businessName}
Email: ${email}

This request was submitted through the B2B wholesale pricing landing page.

Please provide them with the wholesale access code: WHOLESALE2025
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: #5C2535; color: #F5F5F0; padding: 20px; text-align: center; }
    .content { padding: 30px 20px; max-width: 600px; margin: 0 auto; }
    .info-box { 
      background-color: #F5F5F0; 
      border-left: 4px solid #5C2535; 
      padding: 16px; 
      margin: 20px 0;
    }
    .info-row {
      margin: 8px 0;
      padding: 4px 0;
    }
    .label {
      font-weight: bold;
      color: #5C2535;
      display: inline-block;
      min-width: 100px;
    }
    .access-code {
      background-color: #5C2535;
      color: #F5F5F0;
      padding: 12px 20px;
      font-size: 18px;
      font-weight: bold;
      letter-spacing: 2px;
      text-align: center;
      margin: 20px 0;
      font-family: monospace;
    }
    .footer { 
      text-align: center; 
      color: #666; 
      font-size: 12px; 
      margin-top: 30px; 
      padding-top: 20px; 
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Wholesale Access Code Request</h1>
  </div>
  <div class="content">
    <p>A new request for wholesale access has been submitted:</p>
    
    <div class="info-box">
      <div class="info-row">
        <span class="label">Name:</span>
        <span>${name}</span>
      </div>
      <div class="info-row">
        <span class="label">Business:</span>
        <span>${businessName}</span>
      </div>
      <div class="info-row">
        <span class="label">Email:</span>
        <span>${email}</span>
      </div>
    </div>
    
    <p>Please provide them with the wholesale access code:</p>
    
    <div class="access-code">
      WHOLESALE2025
    </div>
    
    <p><strong>Note:</strong> This request was submitted through the B2B wholesale pricing landing page.</p>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} Nashoba Valley Winery. All rights reserved.</p>
      <p>This is an automated notification from the B2B wholesale platform.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, html, text };
}

export async function generateTierRenewalEmail(
  customerName: string,
  tierName: string,
  casesPurchased: number,
  casesRemaining: number,
  commitmentCases: number,
  daysUntilRenewal: number,
  commitmentEndDate: Date
): Promise<{ subject: string; html: string; text: string }> {
  const customization = await getEmailCustomization('tier_renewal');

  const defaultSubject = `Your ${tierName} Tier Renewal - Nashoba Valley Winery`;
  const defaultIntro = `Thank you for being a valued wholesale partner with Nashoba Valley Winery! We appreciate your continued business.`;
  const defaultClosingText = `Warm regards,\nThe Nashoba Valley Winery Team`;
  const defaultClosingHtml = `Warm regards,<br><strong>The Nashoba Valley Winery Team</strong>`;

  const subject = customization?.subject || defaultSubject;
  const introText = customization?.introText || defaultIntro;
  const closingText = customization?.closingText || defaultClosingText;
  const closingHtml = customization?.closingText ? customization.closingText.replace(/\n/g, '<br>') : defaultClosingHtml;
  
  const text = `
Your Tier Commitment Update

Dear ${customerName},

${introText}

Your ${tierName} tier commitment period ends in ${daysUntilRenewal} days on ${commitmentEndDate.toLocaleDateString()}.

Commitment Summary:
- Tier: ${tierName}
- Required Cases: ${commitmentCases} cases per year
- Cases Purchased: ${casesPurchased} cases
- Cases Remaining: ${casesRemaining} cases

${casesRemaining > 0 
  ? `To maintain your ${tierName} pricing, please order ${casesRemaining} more case${casesRemaining > 1 ? 's' : ''} before ${commitmentEndDate.toLocaleDateString()}.` 
  : 'Congratulations! You have met your commitment requirement for this period.'}

Your commitment will automatically renew for another year, and we look forward to continuing to serve you.

If you have any questions about your commitment or would like to discuss your account, please don't hesitate to reach out - we're always here to help!

Thank you for your continued partnership!

${closingText}

Questions? Contact us at support@nashobawinery.com or (978) 779-5521
100 Wattaquadock Hill Road, Bolton, MA 01740
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    ${getBrandedEmailStyles()}
    .commitment-box { 
      background-color: #F5F5F0; 
      border-left: 4px solid #C9A961; 
      padding: 20px; 
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    .stat-row {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
      padding: 8px 0;
      border-bottom: 1px solid #ddd;
    }
    .stat-label {
      font-weight: bold;
      color: #5C2535;
    }
    .stat-value {
      color: #333;
    }
    .progress-bar {
      background-color: #e0e0e0;
      border-radius: 10px;
      height: 20px;
      margin: 15px 0;
      overflow: hidden;
    }
    .progress-fill {
      background-color: ${casesRemaining === 0 ? '#22c55e' : '#C9A961'};
      height: 100%;
      transition: width 0.3s ease;
    }
  </style>
</head>
<body>
  <div class="email-container">
    ${generateBrandedEmailHeader('Tier Commitment Update', `${daysUntilRenewal} days until renewal`)}
    <div class="content">
      <p>Dear <strong>${customerName}</strong>,</p>
      
      <p>${introText}</p>
      
      <p>Your <strong>${tierName}</strong> tier commitment period ends on <strong>${commitmentEndDate.toLocaleDateString()}</strong>.</p>
      
      <div class="commitment-box">
        <h3 style="margin-top: 0; color: #5C2535;">Your Progress</h3>
        
        <div class="stat-row">
          <span class="stat-label">Tier:</span>
          <span class="stat-value">${tierName}</span>
        </div>
        
        <div class="stat-row">
          <span class="stat-label">Required Cases:</span>
          <span class="stat-value">${commitmentCases} cases per year</span>
        </div>
        
        <div class="stat-row">
          <span class="stat-label">Cases Purchased:</span>
          <span class="stat-value">${casesPurchased} cases</span>
        </div>
        
        <div class="stat-row" style="border-bottom: none;">
          <span class="stat-label">Cases Remaining:</span>
          <span class="stat-value" style="font-weight: bold; color: ${casesRemaining === 0 ? '#22c55e' : '#F59E0B'};">
            ${casesRemaining} cases
          </span>
        </div>
        
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${Math.min(100, (casesPurchased / commitmentCases) * 100)}%"></div>
        </div>
        <p style="text-align: center; font-size: 14px; margin: 5px 0; color: #666;">
          ${Math.min(100, Math.round((casesPurchased / commitmentCases) * 100))}% Complete
        </p>
      </div>
      
      <div class="${casesRemaining > 0 ? 'warning-box' : 'success-box'}">
        ${casesRemaining > 0 
          ? `<strong>Next Steps:</strong> To keep your ${tierName} pricing benefits, please order <strong>${casesRemaining} more case${casesRemaining > 1 ? 's' : ''}</strong> before ${commitmentEndDate.toLocaleDateString()}. We're happy to help with your order!`
          : '<strong>Great news!</strong> You\'ve met your commitment for this period. Thank you for your loyalty!'}
      </div>
      
      <p>Your commitment will automatically renew for another year, and we look forward to continuing to serve you.</p>
      
      <p>If you have any questions about your commitment or would like to discuss your account, please don't hesitate to reach out - we're always here to help!</p>
      
      <p style="margin-top: 25px;">Thank you for your continued partnership!</p>
      <p>${closingHtml}</p>
    </div>
    ${generateBrandedEmailFooter()}
  </div>
</body>
</html>
  `.trim();

  return { subject, html, text };
}

// Generate wholesale account application notification email
interface WholesaleApplicationData {
  accountName: string;
  customerType: string;
  customerNumber: string;
  primaryContactName: string;
  primaryContactRole?: string;
  emailAddress: string;
  phoneNumber: string;
  altPhoneNumber?: string;
  licenseNumber?: string;
  taxId?: string;
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingZipCode: string;
  storeLocationSameAsBusiness: string;
  hasMultipleLocations?: string;
  notes?: string;
  acceptsMarketing: boolean;
  submittedAt: Date;
}

export function generateWholesaleApplicationEmail(data: WholesaleApplicationData): { subject: string; html: string; text: string } {
  const customerTypeLabels: Record<string, string> = {
    retail_liquor: 'Retail Liquor Store',
    restaurant: 'Restaurant / Bar',
    private_club: 'Private Club',
    other: 'Other',
  };

  const subject = `New Wholesale Account Application: ${data.accountName}`;

  const text = `
New Wholesale Account Application

Application submitted: ${data.submittedAt.toLocaleString()}
Customer Number: ${data.customerNumber}

BUSINESS INFORMATION
Business Name: ${data.accountName}
Business Type: ${customerTypeLabels[data.customerType] || data.customerType}
${data.licenseNumber ? `License Number: ${data.licenseNumber}` : ''}
${data.taxId ? `Tax ID: ${data.taxId}` : ''}

CONTACT INFORMATION
Contact Name: ${data.primaryContactName}
${data.primaryContactRole ? `Role: ${data.primaryContactRole}` : ''}
Email: ${data.emailAddress}
Phone: ${data.phoneNumber}
${data.altPhoneNumber ? `Alt Phone: ${data.altPhoneNumber}` : ''}

BUSINESS ADDRESS
${data.billingAddress}
${data.billingCity}, ${data.billingState} ${data.billingZipCode}

STORE LOCATION
Same as business address: ${data.storeLocationSameAsBusiness === 'yes' ? 'Yes' : 'No'}
${data.hasMultipleLocations ? `Multiple locations: ${data.hasMultipleLocations === 'yes' ? 'Yes' : 'No'}` : ''}

ADDITIONAL INFORMATION
Marketing emails: ${data.acceptsMarketing ? 'Yes' : 'No'}
${data.notes ? `Notes: ${data.notes}` : ''}

---
Please review this application in the B2B Admin Dashboard.
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background-color: #5C2535; color: #F5F5F0; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .content { padding: 25px; background-color: #f9f9f9; }
    .section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e0e0e0; }
    .section-title { color: #5C2535; font-size: 16px; font-weight: bold; margin: 0 0 15px; padding-bottom: 10px; border-bottom: 2px solid #5C2535; }
    .field { margin-bottom: 10px; }
    .field-label { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; }
    .field-value { color: #333; font-size: 14px; margin-top: 2px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
    .badge-pending { background-color: #FFF3CD; color: #856404; }
    .badge-type { background-color: #E8F4FD; color: #0066CC; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .cta-button { display: inline-block; padding: 12px 24px; background-color: #5C2535; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>New Wholesale Application</h1>
    <p>${data.accountName}</p>
  </div>
  
  <div class="content">
    <div style="text-align: center; margin-bottom: 20px;">
      <span class="badge badge-pending">Pending Approval</span>
      <span class="badge badge-type">${customerTypeLabels[data.customerType] || data.customerType}</span>
    </div>
    
    <p style="text-align: center; color: #666; margin-bottom: 20px;">
      Submitted on ${data.submittedAt.toLocaleDateString()} at ${data.submittedAt.toLocaleTimeString()}<br>
      <strong>Customer #:</strong> ${data.customerNumber}
    </p>
    
    <div class="section">
      <h3 class="section-title">Business Information</h3>
      <div class="field">
        <div class="field-label">Business Name</div>
        <div class="field-value">${data.accountName}</div>
      </div>
      ${data.licenseNumber ? `
      <div class="field">
        <div class="field-label">License Number</div>
        <div class="field-value">${data.licenseNumber}</div>
      </div>
      ` : ''}
      ${data.taxId ? `
      <div class="field">
        <div class="field-label">Tax ID</div>
        <div class="field-value">${data.taxId}</div>
      </div>
      ` : ''}
    </div>
    
    <div class="section">
      <h3 class="section-title">Contact Information</h3>
      <div class="field">
        <div class="field-label">Primary Contact</div>
        <div class="field-value">${data.primaryContactName}${data.primaryContactRole ? ` (${data.primaryContactRole})` : ''}</div>
      </div>
      <div class="field">
        <div class="field-label">Email</div>
        <div class="field-value"><a href="mailto:${data.emailAddress}">${data.emailAddress}</a></div>
      </div>
      <div class="field">
        <div class="field-label">Phone</div>
        <div class="field-value">${data.phoneNumber}${data.altPhoneNumber ? ` / ${data.altPhoneNumber}` : ''}</div>
      </div>
    </div>
    
    <div class="section">
      <h3 class="section-title">Business Address</h3>
      <div class="field-value">
        ${data.billingAddress}<br>
        ${data.billingCity}, ${data.billingState} ${data.billingZipCode}
      </div>
    </div>
    
    <div class="section">
      <h3 class="section-title">Store Location</h3>
      <div class="field">
        <div class="field-label">Same as Business Address?</div>
        <div class="field-value">${data.storeLocationSameAsBusiness === 'yes' ? 'Yes' : 'No'}</div>
      </div>
      ${data.hasMultipleLocations ? `
      <div class="field">
        <div class="field-label">Multiple Locations?</div>
        <div class="field-value">${data.hasMultipleLocations === 'yes' ? 'Yes - Admin to add after approval' : 'No'}</div>
      </div>
      ` : ''}
    </div>
    
    ${data.notes ? `
    <div class="section">
      <h3 class="section-title">Notes</h3>
      <div class="field-value">${data.notes}</div>
    </div>
    ` : ''}
    
    <div style="text-align: center;">
      <p>Please review this application in the B2B Admin Dashboard and approve or contact the applicant.</p>
    </div>
  </div>
  
  <div class="footer">
    <p><strong>Nashoba Valley Winery</strong></p>
    <p>© ${new Date().getFullYear()} Nashoba Valley Winery. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();

  return { subject, html, text };
}

// Daily Report email data interface
interface DailyReportEmailData {
  department: string;
  departmentLabel: string;
  reportDate: string;
  submitterName: string;
  submitterEmail?: string;
  performanceSummary?: string;
  overallRating?: number;
  hasCustomerConcerns: boolean;
  customerConcernsSummary?: string;
  metricsData?: Record<string, any>;
  metricsConfig?: Array<{ key: string; label: string; unit?: string }>;
  incidentCount: number;
  proceduresCompletedCount: number;
  proceduresTotalCount: number;
}

export function generateDailyReportEmail(data: DailyReportEmailData): { subject: string; html: string; text: string } {
  const { 
    department, 
    departmentLabel, 
    reportDate, 
    submitterName, 
    performanceSummary, 
    overallRating,
    hasCustomerConcerns, 
    customerConcernsSummary, 
    metricsData,
    metricsConfig,
    incidentCount,
    proceduresCompletedCount,
    proceduresTotalCount
  } = data;

  const ratingStars = overallRating ? '★'.repeat(overallRating) + '☆'.repeat(5 - overallRating) : 'Not rated';
  const procedureStatus = proceduresTotalCount > 0 
    ? `${proceduresCompletedCount}/${proceduresTotalCount} completed`
    : 'No procedures defined';

  const subject = `Daily Report: ${departmentLabel} - ${reportDate}${hasCustomerConcerns ? ' ⚠️ Customer Concerns' : ''}`;
  
  const metricsText = metricsConfig && metricsData 
    ? metricsConfig.map(m => `${m.label}: ${metricsData[m.key] ?? 'N/A'}${m.unit ? ` ${m.unit}` : ''}`).join('\n')
    : 'No metrics recorded';

  const text = `
Daily Report - ${departmentLabel}
Date: ${reportDate}
Submitted by: ${submitterName}

Overall Rating: ${ratingStars}
Procedures: ${procedureStatus}
Incidents: ${incidentCount}

Performance Summary:
${performanceSummary || 'No summary provided'}

${hasCustomerConcerns ? `
⚠️ CUSTOMER CONCERNS:
${customerConcernsSummary || 'No details provided'}
` : ''}

Metrics:
${metricsText}

---
This is an automated notification from the Nashoba Valley Daily Reports system.
  `.trim();

  const metricsHtml = metricsConfig && metricsData 
    ? metricsConfig.map(m => `
      <div class="metric-item">
        <span class="metric-label">${m.label}:</span>
        <span class="metric-value">${metricsData[m.key] ?? 'N/A'}${m.unit ? ` ${m.unit}` : ''}</span>
      </div>
    `).join('')
    : '<p>No metrics recorded</p>';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .header { background-color: #5C2535; color: #F5F5F0; padding: 20px; text-align: center; }
    .header h1 { margin: 0 0 10px 0; font-size: 24px; }
    .header p { margin: 0; opacity: 0.9; }
    .content { padding: 20px; max-width: 600px; margin: 0 auto; }
    .submitter-info { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #5C2535; }
    .submitter-info h3 { margin: 0 0 10px 0; color: #5C2535; }
    .section { margin-bottom: 25px; }
    .section-title { color: #5C2535; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #5C2535; padding-bottom: 5px; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
    .stat-box { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; color: #5C2535; }
    .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .customer-concerns { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .customer-concerns h4 { color: #856404; margin: 0 0 10px 0; }
    .summary-box { background: #f8f9fa; padding: 15px; border-radius: 8px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .metric-item { display: flex; justify-content: space-between; padding: 8px 12px; background: #f8f9fa; border-radius: 4px; }
    .metric-label { color: #666; }
    .metric-value { font-weight: bold; color: #333; }
    .rating { font-size: 20px; color: #ffc107; }
    .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Daily Report: ${departmentLabel}</h1>
    <p>${reportDate}</p>
  </div>
  
  <div class="content">
    <div class="submitter-info">
      <h3>Submitted By</h3>
      <strong>${submitterName}</strong>
    </div>

    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-value rating">${ratingStars}</div>
        <div class="stat-label">Overall Rating</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${procedureStatus}</div>
        <div class="stat-label">Procedures</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${incidentCount}</div>
        <div class="stat-label">Incidents</div>
      </div>
    </div>

    ${hasCustomerConcerns ? `
    <div class="customer-concerns">
      <h4>⚠️ Customer Concerns Reported</h4>
      <p>${customerConcernsSummary || 'No details provided'}</p>
    </div>
    ` : ''}

    <div class="section">
      <h3 class="section-title">Performance Summary</h3>
      <div class="summary-box">
        <p>${performanceSummary || 'No summary provided'}</p>
      </div>
    </div>

    <div class="section">
      <h3 class="section-title">Metrics</h3>
      <div class="metrics-grid">
        ${metricsHtml}
      </div>
    </div>
  </div>
  
  <div class="footer">
    <p><strong>Nashoba Valley Winery</strong></p>
    <p>This is an automated notification from the Daily Reports system.</p>
    <p>© ${new Date().getFullYear()} Nashoba Valley Winery. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();

  return { subject, html, text };
}

// Field-specific daily report email data interface
interface FieldSpecificEmailData {
  department: string;
  departmentLabel: string;
  reportDate: string;
  submitterName: string;
  fieldLabel: string;
  fieldValue: string | number | boolean | null;
  fieldUnit?: string;
  fieldDescription?: string;
}

export function generateFieldSpecificEmail(data: FieldSpecificEmailData): { subject: string; html: string; text: string } {
  const { 
    departmentLabel, 
    reportDate, 
    submitterName,
    fieldLabel,
    fieldValue,
    fieldUnit,
    fieldDescription
  } = data;

  const formattedValue = fieldValue !== null && fieldValue !== undefined 
    ? `${fieldValue}${fieldUnit ? ` ${fieldUnit}` : ''}` 
    : 'Not provided';

  const subject = `Daily Report Update: ${fieldLabel} - ${departmentLabel} - ${reportDate}`;
  
  const text = `
Daily Report Field Update
=========================

Department: ${departmentLabel}
Date: ${reportDate}
Submitted by: ${submitterName}

${fieldLabel}: ${formattedValue}
${fieldDescription ? `\nDescription: ${fieldDescription}` : ''}

---
This is an automated notification from the Nashoba Valley Daily Reports system.
You are receiving this email because you are subscribed to updates for this specific field.
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header { background-color: #5C2535; color: #F5F5F0; padding: 25px; text-align: center; }
    .header h1 { margin: 0 0 8px 0; font-size: 22px; }
    .header p { margin: 0; opacity: 0.9; font-size: 14px; }
    .content { padding: 30px 25px; }
    .field-highlight { 
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); 
      padding: 25px; 
      border-radius: 12px; 
      margin: 20px 0;
      border-left: 5px solid #C9A961;
    }
    .field-label { 
      font-size: 14px; 
      color: #666; 
      text-transform: uppercase; 
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .field-value { 
      font-size: 32px; 
      font-weight: bold; 
      color: #5C2535;
    }
    .field-description {
      font-size: 13px;
      color: #666;
      margin-top: 12px;
      font-style: italic;
    }
    .meta-info { 
      background: #f8f9fa; 
      padding: 15px 20px; 
      border-radius: 8px; 
      margin-bottom: 20px;
      border-left: 4px solid #5C2535;
    }
    .meta-row { display: flex; justify-content: space-between; margin: 5px 0; }
    .meta-label { color: #666; }
    .meta-value { font-weight: 600; color: #333; }
    .footer { 
      background: #f8f9fa; 
      padding: 20px; 
      text-align: center; 
      font-size: 12px; 
      color: #666; 
      border-top: 1px solid #e0e0e0;
    }
    .footer p { margin: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Daily Report Update</h1>
      <p>${departmentLabel} - ${reportDate}</p>
    </div>
    
    <div class="content">
      <div class="meta-info">
        <div class="meta-row">
          <span class="meta-label">Department:</span>
          <span class="meta-value">${departmentLabel}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Report Date:</span>
          <span class="meta-value">${reportDate}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Submitted by:</span>
          <span class="meta-value">${submitterName}</span>
        </div>
      </div>

      <div class="field-highlight">
        <div class="field-label">${fieldLabel}</div>
        <div class="field-value">${formattedValue}</div>
        ${fieldDescription ? `<div class="field-description">${fieldDescription}</div>` : ''}
      </div>
    </div>
    
    <div class="footer">
      <p><strong>Nashoba Valley Winery</strong></p>
      <p>This is an automated notification from the Daily Reports system.</p>
      <p>You are receiving this email because you are subscribed to updates for this specific field.</p>
      <p>&copy; ${new Date().getFullYear()} Nashoba Valley Winery. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, html, text };
}

// Helper to format 24-hour time to 12-hour AM/PM format
function formatTo12Hour(timeStr: string): string {
  // If already in 12-hour format (contains AM/PM), return as-is
  if (timeStr.includes('AM') || timeStr.includes('PM') || timeStr.includes('am') || timeStr.includes('pm')) {
    return timeStr;
  }
  
  const [hourStr, minuteStr] = timeStr.split(':');
  let hour = parseInt(hourStr, 10);
  const minute = minuteStr || '00';
  
  if (isNaN(hour)) return timeStr;
  
  const period = hour >= 12 ? 'PM' : 'AM';
  
  if (hour === 0) {
    hour = 12;
  } else if (hour > 12) {
    hour = hour - 12;
  }
  
  return `${hour}:${minute} ${period}`;
}

// Reservation confirmation email for ticketed events and table reservations
export interface ReservationConfirmationData {
  customerName: string;
  customerEmail: string;
  experienceName: string;
  reservationDate: string;
  reservationTime: string;
  ticketQuantity?: number;
  partySize?: number;
  totalAmount?: string;
  confirmationCode?: string;
  specialRequests?: string;
}

export function generateReservationConfirmationEmail(data: ReservationConfirmationData): { subject: string; html: string; text: string } {
  const {
    customerName,
    experienceName,
    reservationDate,
    reservationTime,
    ticketQuantity,
    partySize,
    totalAmount,
    confirmationCode,
    specialRequests
  } = data;

  const isTicketed = ticketQuantity && ticketQuantity > 0;
  const guestCount = isTicketed ? ticketQuantity : (partySize || 1);
  const formattedDate = new Date(reservationDate + 'T00:00:00').toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const formattedTime = formatTo12Hour(reservationTime);

  const subject = `You're All Set! ${experienceName} - ${formattedDate}`;
  
  const text = `
Your Reservation is Confirmed!

Hi ${customerName},

Great news - your reservation at Nashoba Valley Winery is confirmed! We can't wait to welcome you.

RESERVATION DETAILS
Experience: ${experienceName}
Date: ${formattedDate}
Time: ${formattedTime}
${isTicketed ? `Tickets: ${ticketQuantity}` : `Party Size: ${partySize}`}
${totalAmount && parseFloat(totalAmount) > 0 ? `Amount: $${parseFloat(totalAmount).toFixed(2)}` : ''}
${confirmationCode ? `Confirmation #: ${confirmationCode}` : ''}
${specialRequests ? `Special Requests: ${specialRequests}` : ''}

NEED TO MAKE CHANGES?
To modify or cancel your reservation, please contact us at:
Email: support@nashobawinery.com
Phone: (978) 779-5521

We look forward to seeing you soon!

Cheers,
The Nashoba Valley Winery Team

100 Wattaquadock Hill Road, Bolton, MA 01740
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    ${getBrandedEmailStyles()}
    .confirmation-box { 
      background: linear-gradient(135deg, #5C2535 0%, #7a3346 100%);
      color: white;
      padding: 25px;
      border-radius: 12px;
      margin: 25px 0;
    }
    .confirmation-box h2 { margin: 0 0 20px 0; font-size: 20px; border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 10px; }
    .detail-row { display: flex; justify-content: space-between; margin: 12px 0; padding: 8px 0; }
    .detail-label { opacity: 0.85; }
    .detail-value { font-weight: bold; }
    ${confirmationCode ? `
    .confirmation-code { 
      background: rgba(255,255,255,0.15); 
      padding: 15px; 
      border-radius: 8px; 
      text-align: center; 
      margin-top: 20px;
    }
    .confirmation-code .label { font-size: 12px; text-transform: uppercase; opacity: 0.8; }
    .confirmation-code .code { font-size: 24px; font-weight: bold; letter-spacing: 2px; margin-top: 5px; }
    ` : ''}
    ${specialRequests ? `
    .special-requests { 
      background-color: #fff8e7; 
      border: 1px solid #f0e4c8; 
      padding: 15px; 
      border-radius: 8px; 
      margin: 20px 0;
    }
    .special-requests h4 { margin: 0 0 10px 0; color: #856404; }
    ` : ''}
  </style>
</head>
<body>
  <div class="email-container">
    ${generateBrandedEmailHeader('Reservation Confirmed!', 'We can\'t wait to see you')}
    <div class="content">
      <p>Hi <strong>${customerName}</strong>,</p>
      
      <p>Great news - your reservation at Nashoba Valley Winery is confirmed! We're excited to welcome you for a wonderful experience.</p>
      
      <div class="confirmation-box">
        <h2>Your Reservation Details</h2>
        <div class="detail-row">
          <span class="detail-label">Experience</span>
          <span class="detail-value">${experienceName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${formattedDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time</span>
          <span class="detail-value">${formattedTime}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">${isTicketed ? 'Tickets' : 'Party Size'}</span>
          <span class="detail-value">${guestCount} ${isTicketed ? (guestCount === 1 ? 'ticket' : 'tickets') : (guestCount === 1 ? 'guest' : 'guests')}</span>
        </div>
        ${totalAmount && parseFloat(totalAmount) > 0 ? `
        <div class="detail-row">
          <span class="detail-label">Amount Charged</span>
          <span class="detail-value">$${parseFloat(totalAmount).toFixed(2)}</span>
        </div>
        ` : ''}
        ${confirmationCode ? `
        <div class="confirmation-code">
          <div class="label">Confirmation Number</div>
          <div class="code">${confirmationCode}</div>
        </div>
        ` : ''}
      </div>
      
      ${specialRequests ? `
      <div class="special-requests">
        <h4>Your Special Requests</h4>
        <p>${specialRequests}</p>
      </div>
      ` : ''}
      
      <div class="info-box">
        <h3 style="margin: 0 0 15px 0; color: #5C2535;">Need to Make Changes?</h3>
        <p style="margin: 0;">To modify or cancel your reservation, please contact us:</p>
        <p style="margin: 8px 0 0;"><strong>Email:</strong> <a href="mailto:support@nashobawinery.com" style="color: #5C2535;">support@nashobawinery.com</a></p>
        <p style="margin: 8px 0 0;"><strong>Phone:</strong> (978) 779-5521</p>
      </div>
      
      <p style="margin-top: 25px;">We look forward to seeing you soon!</p>
      <p>Cheers,<br><strong>The Nashoba Valley Winery Team</strong></p>
    </div>
    ${generateBrandedEmailFooter()}
  </div>
</body>
</html>
  `.trim();

  return { subject, html, text };
}

// Reservation reminder email - sent morning of the reservation
export interface ReservationReminderData {
  customerName: string;
  customerEmail: string;
  experienceName: string;
  reservationDate: string;
  reservationTime: string;
  ticketQuantity?: number;
  partySize?: number;
  specialRequests?: string;
  confirmationToken?: string; // For confirm/cancel links
  status?: string; // Current reservation status
}

export function generateReservationReminderEmail(data: ReservationReminderData): { subject: string; html: string; text: string } {
  const {
    customerName,
    experienceName,
    reservationTime,
    ticketQuantity,
    partySize,
    specialRequests,
    confirmationToken,
    status
  } = data;

  const isTicketed = ticketQuantity && ticketQuantity > 0;
  const guestCount = isTicketed ? ticketQuantity : (partySize || 1);
  const formattedTime = formatTo12Hour(reservationTime);
  
  // Generate confirmation/cancel URLs if token is provided
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
    : (process.env.PUBLIC_URL || 'https://nashobawinery.com');
  const confirmUrl = confirmationToken ? `${baseUrl}/reservations/confirm/${confirmationToken}` : null;
  const cancelUrl = confirmationToken ? `${baseUrl}/reservations/cancel/${confirmationToken}` : null;
  const needsConfirmation = status === 'booked' && confirmationToken;

  const subject = `Today's the Day! Your ${experienceName} Awaits`;
  
  const text = `
YOUR EXPERIENCE AWAITS TODAY!

Hi ${customerName},

Today is the day! We're thrilled to welcome you to Nashoba Valley Winery for your ${experienceName} experience.

YOUR RESERVATION
Experience: ${experienceName}
Time: ${formattedTime}
${isTicketed ? `Tickets: ${ticketQuantity}` : `Party Size: ${partySize}`}
${specialRequests ? `Special Requests: ${specialRequests}` : ''}

${needsConfirmation ? `
PLEASE CONFIRM YOUR RESERVATION
Click this link to confirm you're coming: ${confirmUrl}

Need to cancel? Click here: ${cancelUrl}
` : ''}

ARRIVAL TIPS
- Please arrive 10-15 minutes before your scheduled time
- Check in at our welcome desk when you arrive
- Comfortable shoes are recommended for walking tours

We've been preparing for your visit and can't wait to share our passion for winemaking with you!

Questions? Contact us:
Email: support@nashobawinery.com
Phone: (978) 779-5521

See you soon!

Nashoba Valley Winery
100 Wattaquadock Hill Road
Bolton, MA 01740
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header { 
      background: linear-gradient(135deg, #5C2535 0%, #7a3346 50%, #5C2535 100%);
      color: #F5F5F0; 
      padding: 40px 20px; 
      text-align: center; 
    }
    .header h1 { margin: 0; font-size: 32px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
    .header .subtitle { margin: 15px 0 0; font-size: 18px; opacity: 0.95; font-style: italic; }
    .celebration-banner {
      background: linear-gradient(90deg, #C9A961 0%, #E8D4A8 50%, #C9A961 100%);
      color: #5C2535;
      padding: 15px;
      text-align: center;
      font-size: 14px;
      font-weight: bold;
      letter-spacing: 1px;
    }
    .content { padding: 30px 25px; }
    .greeting { font-size: 18px; margin-bottom: 20px; }
    .intro-text { font-size: 16px; line-height: 1.8; margin-bottom: 25px; }
    .reservation-card { 
      background: #F5F5F0;
      border: 2px solid #C9A961;
      border-radius: 12px;
      padding: 25px;
      margin: 25px 0;
    }
    .reservation-card h2 { 
      margin: 0 0 20px 0; 
      color: #5C2535; 
      font-size: 20px;
      border-bottom: 2px solid #C9A961;
      padding-bottom: 10px;
    }
    .detail-row { display: flex; justify-content: space-between; margin: 12px 0; padding: 8px 0; }
    .detail-label { color: #666; }
    .detail-value { font-weight: bold; color: #5C2535; }
    .tips-section {
      background-color: #fff8e7;
      border-left: 4px solid #C9A961;
      padding: 20px;
      margin: 25px 0;
      border-radius: 0 8px 8px 0;
    }
    .tips-section h3 { margin: 0 0 15px 0; color: #5C2535; }
    .tips-section ul { margin: 0; padding-left: 20px; }
    .tips-section li { margin: 8px 0; color: #555; }
    ${specialRequests ? `
    .special-requests { 
      background-color: #e8f4fd; 
      border: 1px solid #b8d4e8; 
      padding: 15px; 
      border-radius: 8px; 
      margin: 20px 0;
    }
    .special-requests h4 { margin: 0 0 10px 0; color: #0066cc; }
    ` : ''}
    .excitement-box {
      background: linear-gradient(135deg, #5C2535 0%, #7a3346 100%);
      color: white;
      padding: 25px;
      border-radius: 12px;
      text-align: center;
      margin: 25px 0;
    }
    .excitement-box p { margin: 0; font-size: 18px; font-style: italic; }
    .contact-box { 
      background-color: #f8f8f8; 
      padding: 20px; 
      margin: 25px 0;
      border-radius: 8px;
      text-align: center;
    }
    .contact-box h3 { margin: 0 0 15px 0; color: #5C2535; }
    .contact-box p { margin: 5px 0; }
    .contact-box a { color: #5C2535; font-weight: bold; }
    .action-buttons {
      text-align: center;
      margin: 30px 0;
      padding: 25px;
      background: linear-gradient(135deg, #f8f4e8 0%, #fff 100%);
      border: 2px solid #C9A961;
      border-radius: 12px;
    }
    .action-buttons h3 { margin: 0 0 15px 0; color: #5C2535; }
    .action-buttons p { margin: 0 0 20px 0; color: #666; }
    .btn {
      display: inline-block;
      padding: 14px 35px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
      font-size: 16px;
      margin: 0 8px;
    }
    .btn-confirm {
      background-color: #16A34A;
      color: white;
    }
    .btn-cancel {
      background-color: #DC2626;
      color: white;
    }
    .footer { 
      background-color: #5C2535; 
      padding: 25px; 
      text-align: center; 
      color: #F5F5F0;
    }
    .footer p { margin: 5px 0; font-size: 14px; }
    .footer .brand { font-weight: bold; font-size: 18px; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Today's the Day!</h1>
      <p class="subtitle">Your Experience Awaits</p>
    </div>
    
    <div class="celebration-banner">
      YOUR ${experienceName.toUpperCase()} IS TODAY
    </div>
    
    <div class="content">
      <p class="greeting">Hi ${customerName},</p>
      
      <p class="intro-text">
        Today is the day! We're absolutely thrilled to welcome you to Nashoba Valley Winery. 
        Our team has been preparing for your visit, and we can't wait to share an unforgettable experience with you.
      </p>
      
      <div class="reservation-card">
        <h2>Your Reservation Details</h2>
        <div class="detail-row">
          <span class="detail-label">Experience</span>
          <span class="detail-value">${experienceName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time</span>
          <span class="detail-value">${formattedTime}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">${isTicketed ? 'Tickets' : 'Party Size'}</span>
          <span class="detail-value">${guestCount} ${isTicketed ? (guestCount === 1 ? 'ticket' : 'tickets') : (guestCount === 1 ? 'guest' : 'guests')}</span>
        </div>
      </div>
      
      ${specialRequests ? `
      <div class="special-requests">
        <h4>Your Special Requests</h4>
        <p>${specialRequests}</p>
      </div>
      ` : ''}
      
      ${needsConfirmation ? `
      <div class="action-buttons">
        <h3>Please Confirm Your Reservation</h3>
        <p>Let us know you're still coming so we can prepare for your visit!</p>
        <a href="${confirmUrl}" class="btn btn-confirm">Yes, I'm Coming!</a>
        <a href="${cancelUrl}" class="btn btn-cancel">Cancel Reservation</a>
      </div>
      ` : ''}
      
      <div class="tips-section">
        <h3>Arrival Tips</h3>
        <ul>
          <li>Please arrive 10-15 minutes before your scheduled time</li>
          <li>Check in at our welcome desk when you arrive</li>
          <li>Comfortable shoes are recommended for walking tours</li>
          <li>Feel free to explore our beautiful grounds before or after your experience</li>
        </ul>
      </div>
      
      <div class="excitement-box">
        <p>We've been preparing for your visit and can't wait to share our passion for winemaking with you!</p>
      </div>
      
      <div class="contact-box">
        <h3>Questions or Running Late?</h3>
        <p><strong>Email:</strong> <a href="mailto:support@nashobawinery.com">support@nashobawinery.com</a></p>
        <p><strong>Phone:</strong> (978) 779-5521</p>
      </div>
      
      <p style="text-align: center; font-size: 18px; font-weight: bold; color: #5C2535;">See you soon!</p>
    </div>
    
    <div class="footer">
      <p class="brand">Nashoba Valley Winery</p>
      <p>100 Wattaquadock Hill Road, Bolton, MA 01740</p>
      <p>© ${new Date().getFullYear()} Nashoba Valley Winery. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, html, text };
}

// Work Order Notification Email
interface WorkOrderEmailData {
  workOrderNumber: string;
  title: string;
  description?: string;
  assetName?: string;
  locationName?: string;
  priority: string;
  status: string;
  dueDate?: Date | string;
  assigneeName?: string;
  requestedByName?: string;
  instructions?: string;
}

export function generateWorkOrderNotificationEmail(data: WorkOrderEmailData): { subject: string; html: string; text: string } {
  const { workOrderNumber, title, description, assetName, locationName, priority, status, dueDate, assigneeName, requestedByName, instructions } = data;
  
  const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }) : 'Not specified';
  
  const priorityColors: Record<string, string> = {
    critical: '#DC2626',
    high: '#EA580C',
    medium: '#CA8A04',
    low: '#16A34A'
  };
  const priorityColor = priorityColors[priority.toLowerCase()] || '#6B7280';

  const subject = `Work Order Assigned: ${workOrderNumber} - ${title}`;
  
  const text = `
Work Order Notification - ${workOrderNumber}

Title: ${title}
${description ? `Description: ${description}` : ''}
${assetName ? `Asset: ${assetName}` : ''}
${locationName ? `Location: ${locationName}` : ''}
Priority: ${priority.toUpperCase()}
Status: ${status}
Due Date: ${formattedDueDate}
${assigneeName ? `Assigned To: ${assigneeName}` : ''}
${requestedByName ? `Requested By: ${requestedByName}` : ''}
${instructions ? `\nInstructions:\n${instructions}` : ''}

Please review and complete this work order as scheduled.
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; background-color: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background-color: #1e3a5f; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .header .wo-number { font-size: 14px; opacity: 0.9; margin-top: 8px; }
    .content { padding: 24px; }
    .title { font-size: 20px; font-weight: 600; color: #1e3a5f; margin-bottom: 16px; }
    .detail-row { display: flex; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; }
    .detail-label { font-weight: 600; color: #6b7280; width: 120px; flex-shrink: 0; }
    .detail-value { color: #1a1a1a; }
    .priority-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; color: #ffffff; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; background-color: #e5e7eb; color: #374151; }
    .instructions { background-color: #f8fafc; border-left: 4px solid #1e3a5f; padding: 16px; margin-top: 16px; border-radius: 0 8px 8px 0; }
    .instructions-label { font-weight: 600; color: #1e3a5f; margin-bottom: 8px; }
    .footer { background-color: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Work Order Notification</h1>
      <div class="wo-number">${workOrderNumber}</div>
    </div>
    <div class="content">
      <div class="title">${title}</div>
      
      ${description ? `
        <div class="detail-row">
          <span class="detail-label">Description</span>
          <span class="detail-value">${description}</span>
        </div>
      ` : ''}
      
      <div class="detail-row">
        <span class="detail-label">Priority</span>
        <span class="detail-value">
          <span class="priority-badge" style="background-color: ${priorityColor};">${priority.toUpperCase()}</span>
        </span>
      </div>
      
      <div class="detail-row">
        <span class="detail-label">Status</span>
        <span class="detail-value">
          <span class="status-badge">${status.replace('_', ' ').toUpperCase()}</span>
        </span>
      </div>
      
      ${assetName ? `
        <div class="detail-row">
          <span class="detail-label">Asset</span>
          <span class="detail-value">${assetName}</span>
        </div>
      ` : ''}
      
      ${locationName ? `
        <div class="detail-row">
          <span class="detail-label">Location</span>
          <span class="detail-value">${locationName}</span>
        </div>
      ` : ''}
      
      <div class="detail-row">
        <span class="detail-label">Due Date</span>
        <span class="detail-value">${formattedDueDate}</span>
      </div>
      
      ${assigneeName ? `
        <div class="detail-row">
          <span class="detail-label">Assigned To</span>
          <span class="detail-value">${assigneeName}</span>
        </div>
      ` : ''}
      
      ${requestedByName ? `
        <div class="detail-row">
          <span class="detail-label">Requested By</span>
          <span class="detail-value">${requestedByName}</span>
        </div>
      ` : ''}
      
      ${instructions ? `
        <div class="instructions">
          <div class="instructions-label">Instructions</div>
          <div>${instructions.replace(/\n/g, '<br>')}</div>
        </div>
      ` : ''}
    </div>
    <div class="footer">
      <p>This is an automated notification from the Nashoba Valley Operations Platform.</p>
      <p>Please log in to the platform to view full work order details and updates.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, html, text };
}

// Initialize SendGrid
const apiKey = process.env.SENDGRID_API_KEY;
if (!apiKey) {
  console.error("SENDGRID_API_KEY environment variable is not set");
} else {
  sgMail.setApiKey(apiKey);
}

// ============= SUPPORT AGENT NOTIFICATION EMAILS =============

interface SupportAgentNotificationData {
  agentName: string;
  agentEmail: string;
  agentId: string;
  ticketId: string;
  ticketSubject: string;
  customerName: string | null;
  customerEmail: string | null;
  message: string;
  category: string | null;
  source: 'chat' | 'email' | 'form';
}

/**
 * Generates an email notification for support agents when a new ticket arrives
 * Includes action buttons for View, Forward, and Mark Spam
 * The accessToken parameter provides secure, time-limited access to actions
 */
export function generateSupportAgentNotificationEmail(data: SupportAgentNotificationData & { accessToken: string }): { subject: string; html: string; text: string } {
  const baseUrl = getBaseUrl();
  
  const subject = `New Support Ticket: ${data.ticketSubject}`;
  
  // Action URLs with encoded token for secure access
  const viewUrl = `${baseUrl}/support/agent/ticket/${data.ticketId}?token=${data.accessToken}&action=view`;
  const forwardUrl = `${baseUrl}/support/agent/ticket/${data.ticketId}?token=${data.accessToken}&action=forward`;
  const spamUrl = `${baseUrl}/support/agent/ticket/${data.ticketId}?token=${data.accessToken}&action=spam`;
  
  const sourceLabel = data.source === 'email' ? 'Email' : data.source === 'form' ? 'Contact Form' : 'Chat Widget';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>${getBrandedEmailStyles()}</style>
    </head>
    <body>
      <div class="email-container">
        ${generateBrandedEmailHeader('New Support Ticket', 'Action required')}
        
        <div class="content">
          <p style="margin: 0 0 20px;">Hi ${data.agentName},</p>
          
          <p style="margin: 0 0 20px;">A new support ticket has been assigned to you:</p>
          
          <div class="info-box">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="padding: 5px 0;"><strong>Ticket ID:</strong></td>
                <td style="padding: 5px 0;">#${data.ticketId.substring(0, 8)}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0;"><strong>Subject:</strong></td>
                <td style="padding: 5px 0;">${data.ticketSubject}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0;"><strong>From:</strong></td>
                <td style="padding: 5px 0;">${data.customerName || 'Anonymous'} ${data.customerEmail ? `(${data.customerEmail})` : ''}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0;"><strong>Source:</strong></td>
                <td style="padding: 5px 0;">${sourceLabel}</td>
              </tr>
              ${data.category ? `
              <tr>
                <td style="padding: 5px 0;"><strong>Category:</strong></td>
                <td style="padding: 5px 0;">${data.category}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 10px; font-weight: bold; color: ${BRAND_COLORS.burgundy};">Message:</p>
            <p style="margin: 0; white-space: pre-wrap;">${data.message.length > 500 ? data.message.substring(0, 500) + '...' : data.message}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="margin: 0 0 15px; color: #666; font-size: 14px;">Quick Actions:</p>
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 400px; margin: 0 auto;">
              <tr>
                <td style="padding: 5px; text-align: center;">
                  <a href="${viewUrl}" class="button" style="display: inline-block; background-color: ${BRAND_COLORS.burgundy}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                    View Ticket
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding: 5px; text-align: center;">
                  <a href="${forwardUrl}" style="display: inline-block; background-color: #2563EB; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-size: 14px;">
                    Forward to Agent
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding: 5px; text-align: center;">
                  <a href="${spamUrl}" style="display: inline-block; background-color: #DC2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-size: 14px;">
                    Mark as Spam
                  </a>
                </td>
              </tr>
            </table>
          </div>
          
          <p style="margin: 20px 0 0; color: #666; font-size: 13px; text-align: center;">
            These secure links are valid for 24 hours.
          </p>
        </div>
        
        ${generateBrandedEmailFooter(false)}
      </div>
    </body>
    </html>
  `;
  
  const text = `
New Support Ticket Notification

Hi ${data.agentName},

A new support ticket has been assigned to you:

Ticket ID: #${data.ticketId.substring(0, 8)}
Subject: ${data.ticketSubject}
From: ${data.customerName || 'Anonymous'} ${data.customerEmail ? `(${data.customerEmail})` : ''}
Source: ${sourceLabel}
${data.category ? `Category: ${data.category}` : ''}

Message:
${data.message.length > 500 ? data.message.substring(0, 500) + '...' : data.message}

Quick Actions:
- View Ticket: ${viewUrl}
- Forward to Agent: ${forwardUrl}
- Mark as Spam: ${spamUrl}

These secure links are valid for 24 hours.

---
Nashoba Valley Winery
100 Wattaquadock Hill Road, Bolton, MA 01740
  `;
  
  return { subject, html, text };
}

/**
 * Sends notification emails to all relevant support agents for a new ticket
 * Creates time-limited access tokens for secure quick actions from email links
 */
export async function notifySupportAgents(
  ticketId: string,
  ticketSubject: string,
  message: string,
  customerName: string | null,
  customerEmail: string | null,
  category: string | null,
  source: 'chat' | 'email' | 'form'
): Promise<void> {
  try {
    // Get agents to notify based on category or default agent
    const agents = await storage.getSupportAgentsForNotification(category);
    
    if (agents.length === 0) {
      console.log('[Support Email] No agents configured for notification');
      return;
    }
    
    console.log(`[Support Email] Notifying ${agents.length} agent(s) for ticket ${ticketId}`);
    
    for (const agent of agents) {
      if (!agent.email || !agent.receiveEmailNotifications) {
        continue;
      }
      
      // Create a cryptographically secure, time-limited access token (24 hours for email links)
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await storage.createAgentAccessToken({
        agentId: agent.id,
        requestId: ticketId,
        token,
        action: 'email_link',
        expiresAt
      });
      
      const emailData = generateSupportAgentNotificationEmail({
        agentName: agent.displayName,
        agentEmail: agent.email,
        agentId: agent.id,
        ticketId,
        ticketSubject,
        customerName,
        customerEmail,
        message,
        category,
        source,
        accessToken: token
      });
      
      try {
        await sendEmail(agent.email, emailData.subject, emailData.html, emailData.text);
        console.log(`[Support Email] Notification sent to ${agent.email}`);
      } catch (emailError) {
        console.error(`[Support Email] Failed to send to ${agent.email}:`, emailError);
      }
    }
  } catch (error) {
    console.error('[Support Email] Error notifying agents:', error);
  }
}

// Email sending function using SendGrid
export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<void> {
  const from = process.env.SENDGRID_FROM_EMAIL || 'email@nashobawinery.com';
  
  console.log(`Attempting to send email to ${to} via SendGrid`);
  
  try {
    const msg = {
      to,
      from,
      subject,
      text,
      html,
    };

    await sgMail.send(msg);
    console.log(`Email sent successfully to ${to} via SendGrid`);
  } catch (error) {
    console.error("SendGrid error:", error);
    if (error && typeof error === 'object' && 'response' in error) {
      const sgError = error as any;
      console.error("SendGrid error details:", sgError.response?.body);
    }
    throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
