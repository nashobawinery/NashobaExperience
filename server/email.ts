import type { Product, CartItem, Favorite } from "@shared/schema";
import sgMail from "@sendgrid/mail";

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

  const subject = `${guestName}'s Tasting Favorites - Nashoba Winery`;
  
  const text = `
Your Tasting Favorites - ${guestName}

${favorites.map(fav => `
${fav.product.name} (${fav.product.category}) - $${parseFloat(fav.product.price).toFixed(2)}
${fav.product.description}
${fav.note ? `Your notes: ${fav.note}` : ''}
`).join('\n---\n')}

Thank you for visiting Nashoba Winery!
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: #5C2535; color: #F5F5F0; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .favorite { border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 15px 0; }
    .favorite h3 { color: #5C2535; margin-top: 0; }
    .price { color: #C9A961; font-weight: bold; }
    .notes { background-color: #f9f9f9; padding: 10px; border-left: 3px solid #C9A961; margin-top: 10px; font-style: italic; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Your Tasting Favorites</h1>
    <p>${guestName}</p>
  </div>
  <div class="content">
    ${favorites.map(fav => `
      <div class="favorite">
        <h3>${fav.product.name}</h3>
        <p><strong>Category:</strong> ${fav.product.category} | <span class="price">$${parseFloat(fav.product.price).toFixed(2)}</span></p>
        <p>${fav.product.description}</p>
        ${fav.note ? `<div class="notes">Your notes: ${fav.note}</div>` : ''}
      </div>
    `).join('')}
    
    <p style="text-align: center; margin-top: 30px; color: #666;">
      Thank you for visiting Nashoba Winery!
    </p>
  </div>
</body>
</html>
  `.trim();

  return { subject, html, text };
}

export function generatePasswordResetEmail(resetLink: string, userType: string): { subject: string; html: string; text: string } {
  const roleDisplay = userType === "sales_rep" ? "Sales Representative" : userType.charAt(0).toUpperCase() + userType.slice(1);

  const subject = `Password Reset Request - Nashoba Winery B2B`;
  
  const text = `
Password Reset Request

Hello,

We received a request to reset your password for your ${roleDisplay} account at Nashoba Valley Winery B2B Portal.

Click the link below to reset your password:
${resetLink}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, you can safely ignore this email.

Best regards,
Nashoba Valley Winery Team
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: #5C2535; color: #F5F5F0; padding: 20px; text-align: center; }
    .content { padding: 30px 20px; max-width: 600px; margin: 0 auto; }
    .button { 
      display: inline-block;
      background-color: #5C2535; 
      color: #F5F5F0 !important; 
      padding: 14px 28px; 
      text-decoration: none; 
      border-radius: 4px; 
      margin: 20px 0;
      font-weight: bold;
    }
    .warning { 
      background-color: #FEF3C7; 
      border-left: 4px solid #F59E0B; 
      padding: 12px 16px; 
      margin: 20px 0;
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
    <h1>Password Reset Request</h1>
  </div>
  <div class="content">
    <p>Hello,</p>
    
    <p>We received a request to reset your password for your <strong>${roleDisplay}</strong> account at Nashoba Valley Winery B2B Portal.</p>
    
    <p style="text-align: center;">
      <a href="${resetLink}" class="button">Reset Your Password</a>
    </p>
    
    <div class="warning">
      <strong>⏰ Important:</strong> This link will expire in 1 hour for security reasons.
    </div>
    
    <p>If the button above doesn't work, copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #5C2535;">${resetLink}</p>
    
    <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} Nashoba Valley Winery. All rights reserved.</p>
      <p>This is an automated message, please do not reply to this email.</p>
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
