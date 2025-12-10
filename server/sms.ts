// Twilio SMS Service for sending text messages
import twilio from 'twilio';

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;

let twilioClient: twilio.Twilio | null = null;

if (accountSid && authToken) {
  twilioClient = twilio(accountSid, authToken);
  console.log("[SMS] Twilio client initialized");
} else {
  console.warn("[SMS] Twilio credentials not configured - SMS will be disabled");
}

export function isSmsConfigured(): boolean {
  const configured = !!(twilioClient && fromPhone);
  if (!configured) {
    console.log("[SMS] isSmsConfigured check:", {
      hasTwilioClient: !!twilioClient,
      hasFromPhone: !!fromPhone,
      fromPhonePrefix: fromPhone ? fromPhone.substring(0, 4) + '...' : 'none'
    });
  }
  return configured;
}

export async function sendSMS(to: string, message: string): Promise<SMSResult> {
  console.log("[SMS] Attempting to send SMS to:", to);
  
  if (!twilioClient || !fromPhone) {
    console.warn("[SMS] Twilio not configured - skipping SMS", {
      hasTwilioClient: !!twilioClient,
      hasFromPhone: !!fromPhone
    });
    return { success: false, error: "SMS not configured" };
  }

  // Format phone number if needed
  const formattedPhone = formatPhoneNumber(to);
  if (!formattedPhone) {
    console.warn("[SMS] Invalid phone number format:", to);
    return { success: false, error: "Invalid phone number format" };
  }

  try {
    console.log("[SMS] Sending message from", fromPhone?.substring(0, 4) + '...', "to", formattedPhone);
    const result = await twilioClient.messages.create({
      body: message,
      from: fromPhone,
      to: formattedPhone,
    });

    console.log(`[SMS] Message sent successfully to ${formattedPhone}: ${result.sid}`);
    return { success: true, messageId: result.sid };
  } catch (error: any) {
    console.error("[SMS] Failed to send message:", error.message, "Code:", error.code);
    return { success: false, error: error.message };
  }
}

function formatPhoneNumber(phone: string): string | null {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Handle US phone numbers
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  } else if (cleaned.startsWith('+')) {
    return phone;
  }
  
  return null;
}

// Reservation confirmation SMS
export function generateReservationConfirmationSMS(data: {
  customerName: string;
  experienceName: string;
  reservationDate: string;
  reservationTime: string;
  ticketQuantity?: number;
  partySize?: number;
}): string {
  const { customerName, experienceName, reservationDate, reservationTime, ticketQuantity, partySize } = data;
  const guests = ticketQuantity || partySize || 1;
  
  return `Hi ${customerName.split(' ')[0]}! Your reservation at Nashoba Valley Winery is confirmed.

${experienceName}
${reservationDate} at ${reservationTime}
${guests} ${guests === 1 ? 'guest' : 'guests'}

Questions? Call (978) 779-5521

See you soon!`;
}

// Day-of reminder SMS
export function generateReservationReminderSMS(data: {
  customerName: string;
  experienceName: string;
  reservationTime: string;
}): string {
  const { customerName, experienceName, reservationTime } = data;
  
  return `Hi ${customerName.split(' ')[0]}! Reminder: Your ${experienceName} at Nashoba Valley Winery is TODAY at ${reservationTime}.

Please arrive 10-15 min early. We're excited to see you!

Questions? (978) 779-5521`;
}
