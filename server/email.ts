import type { Product, CartItem, Favorite } from "@shared/schema";
import { Resend } from "resend";

interface EmailCartData {
  guestName: string;
  items: Array<CartItem & { product: Product }>;
  subtotal: number;
  discount: number;
  triviaCredit: number;
  total: number;
}

interface EmailFavoritesData {
  guestName: string;
  favorites: Array<Favorite & { product: Product }>;
}

export function generateCartEmail(data: EmailCartData): { subject: string; html: string; text: string } {
  const { guestName, items, subtotal, discount, triviaCredit, total } = data;

  const subject = `Tasting Order from ${guestName} - Nashoba Winery`;
  
  const text = `
Tasting Room Order - ${guestName}

Items:
${items.map(item => `- ${item.product.name} (${item.product.category}) x${item.quantity} - $${(parseFloat(item.product.price) * item.quantity).toFixed(2)}${item.note ? `\n  Note: ${item.note}` : ''}`).join('\n')}

Subtotal: $${subtotal.toFixed(2)}
${discount > 0 ? `Discount: -$${discount.toFixed(2)}` : ''}
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
      ${discount > 0 ? `
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

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Email sending function using Resend
export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<void> {
  // Try using configured domain first, fall back to onboarding email if domain not verified
  const configuredFrom = process.env.RESEND_FROM_EMAIL;
  const fallbackFrom = "Nashoba Winery <onboarding@resend.dev>";
  
  let from = configuredFrom || fallbackFrom;
  
  // Log email attempt (don't log 'from' as it might expose secrets if misconfigured)
  console.log(`Attempting to send email to ${to}`);
  
  let { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    text,
  });

  // If domain verification failed and we have a configured domain, retry with onboarding email
  if (error && configuredFrom && from === configuredFrom) {
    const errorMessage = (error.message || '').toLowerCase();
    if (errorMessage.includes("not verified") || errorMessage.includes("domain") || errorMessage.includes("verify")) {
      console.log(`Domain verification issue detected: ${error.message}`);
      console.log(`Retrying with Resend onboarding email...`);
      
      from = fallbackFrom;
      const retry = await resend.emails.send({
        from,
        to,
        subject,
        html,
        text,
      });
      
      data = retry.data;
      error = retry.error;
      
      if (!error) {
        console.log(`Retry successful with ${from}`);
      }
    }
  }

  if (error) {
    console.error("Resend API error:", error);
    throw new Error(`Failed to send email: ${error.message || 'Unknown error'}`);
  }

  console.log(`Email sent successfully to ${to}:`, data?.id);
}
