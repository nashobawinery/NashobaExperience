import { db } from "./db";
import { eq, and, or } from "drizzle-orm";
import { resyReservations, resyExperiences, resyCustomers } from "@shared/schema";
import { generateReservationReminderEmail, sendEmail } from "./email";
import { sendSMS, generateReservationReminderSMS, isSmsConfigured } from "./sms";
import { format } from "date-fns";

async function sendDailyReminders() {
  const today = format(new Date(), "yyyy-MM-dd");
  
  console.log(`[Reservation Reminders] Starting daily reminder job for ${today}`);
  
  try {
    // Get both "booked" and "confirmed" reservations - "booked" will get confirmation links
    const reservations = await db
      .select()
      .from(resyReservations)
      .where(
        and(
          eq(resyReservations.reservationDate, today),
          or(
            eq(resyReservations.status, "confirmed"),
            eq(resyReservations.status, "booked")
          )
        )
      );
    
    console.log(`[Reservation Reminders] Found ${reservations.length} reservations for today`);
    
    let sentCount = 0;
    let errorCount = 0;
    
    for (const reservation of reservations) {
      try {
        const [experience] = await db
          .select()
          .from(resyExperiences)
          .where(eq(resyExperiences.id, reservation.experienceId));
        
        if (!experience) {
          console.warn(`[Reservation Reminders] Experience not found for reservation ${reservation.id}`);
          continue;
        }
        
        // Get customer preferences
        let notificationPreference = "email";
        if (reservation.customerEmail) {
          const [customer] = await db
            .select()
            .from(resyCustomers)
            .where(eq(resyCustomers.email, reservation.customerEmail));
          if (customer?.notificationPreference) {
            notificationPreference = customer.notificationPreference;
          }
        }
        
        const shouldSendEmail = notificationPreference === "email" || notificationPreference === "both";
        const shouldSendSMS = (notificationPreference === "text" || notificationPreference === "both") && reservation.customerPhone;
        
        // Send email reminder
        if (shouldSendEmail) {
          const emailData = {
            customerName: reservation.customerName,
            customerEmail: reservation.customerEmail,
            experienceName: experience.name,
            reservationDate: reservation.reservationDate,
            reservationTime: reservation.reservationTime || "TBD",
            ticketQuantity: reservation.ticketQuantity || undefined,
            partySize: reservation.partySize || undefined,
            specialRequests: reservation.specialRequests || undefined,
            confirmationToken: reservation.confirmationToken || undefined,
            status: reservation.status,
          };
          
          const { subject, html, text } = generateReservationReminderEmail(emailData);
          await sendEmail(reservation.customerEmail, subject, html, text);
          console.log(`[Reservation Reminders] Sent email reminder to ${reservation.customerEmail} for ${experience.name} (status: ${reservation.status})`);
        }
        
        // Send SMS reminder
        if (shouldSendSMS && isSmsConfigured()) {
          const smsMessage = generateReservationReminderSMS({
            customerName: reservation.customerName,
            experienceName: experience.name,
            reservationTime: reservation.reservationTime || "TBD",
            confirmationToken: reservation.confirmationToken || undefined,
            status: reservation.status,
          });
          await sendSMS(reservation.customerPhone!, smsMessage);
          console.log(`[Reservation Reminders] Sent SMS reminder to ${reservation.customerPhone} for ${experience.name} (status: ${reservation.status})`);
        }
        
        sentCount++;
      } catch (reminderError) {
        console.error(`[Reservation Reminders] Failed to send reminder for reservation ${reservation.id}:`, reminderError);
        errorCount++;
      }
    }
    
    console.log(`[Reservation Reminders] Completed: ${sentCount} sent, ${errorCount} errors`);
    return { sent: sentCount, errors: errorCount, total: reservations.length };
  } catch (error) {
    console.error("[Reservation Reminders] Fatal error in reminder job:", error);
    throw error;
  }
}

function scheduleReminders() {
  const runAt8AM = () => {
    const now = new Date();
    const target = new Date();
    target.setHours(8, 0, 0, 0);
    
    if (now >= target) {
      target.setDate(target.getDate() + 1);
    }
    
    const msUntil8AM = target.getTime() - now.getTime();
    
    console.log(`[Reservation Reminders] Next reminder run scheduled for ${target.toLocaleString()} (in ${Math.round(msUntil8AM / 60000)} minutes)`);
    
    setTimeout(() => {
      sendDailyReminders()
        .then(() => runAt8AM())
        .catch((error) => {
          console.error("[Reservation Reminders] Error in scheduled run:", error);
          runAt8AM();
        });
    }, msUntil8AM);
  };
  
  runAt8AM();
  console.log("[Reservation Reminders] Scheduler initialized");
}

export { sendDailyReminders, scheduleReminders };
