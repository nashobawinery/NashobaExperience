import { Router } from "express";
import { db } from "./db";
import { eq, and, desc, sql, inArray, notInArray, not } from "drizzle-orm";
import { isAuthenticated } from "./replitAuth";
import { requireModuleAccess } from "./rbac";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { generateReservationConfirmationEmail, sendEmail } from "./email";
import { scheduleReminders, sendDailyReminders } from "./reservationReminders";
import { sendSMS, generateReservationConfirmationSMS, isSmsConfigured } from "./sms";
import * as XLSX from "xlsx";
import multer from "multer";

const requireResyAdmin = requireModuleAccess('reservations');

// Multer configuration for file uploads
const tableUpload = multer({ storage: multer.memoryStorage() });

// Initialize the reservation reminder scheduler
scheduleReminders();
import sgMail from "@sendgrid/mail";
import Stripe from "stripe";
import {
  resyUsers,
  resyLocations,
  resyExperiences,
  resyClubs,
  resyCustomers,
  resyReservations,
  resyTimeSlots,
  resyWaitlist,
  resyCustomerVisits,
  resyMealPeriods,
  resyOperatingHours,
  resySpecialDates,
  resyLocationHolidays,
  resyLocationTables,
  resyFlowControls,
  resyTurnTimeSettings,
  resyExperienceDiscounts,
  resyClubExperienceDiscounts,
  resyPrivateEvents,
  resySiteSettings,
  resyFooterLinks,
  resyTicketedEventDefinitions,
  resyTicketedEventTimeslots,
  insertResyLocationSchema,
  insertResyExperienceSchema,
  insertResyReservationSchema,
  insertResyCustomerSchema,
  insertResyMealPeriodSchema,
  insertResyOperatingHoursSchema,
  insertResyFlowControlSchema,
  insertResyTurnTimeSettingSchema,
  insertResyPrivateEventSchema,
  insertResySpecialDateSchema,
  insertResyLocationHolidaySchema,
  insertResyLocationTableSchema,
  insertResyExperienceDiscountSchema,
  insertResyClubSchema,
  insertResyClubExperienceDiscountSchema,
  insertResyCustomerVisitSchema,
  insertResyFooterLinkSchema,
  insertResyTicketedEventDefinitionSchema,
  insertResyTicketedEventTimeslotSchema,
  type ResyLocation,
  type ResyExperience,
  type ResyReservation,
  type ResyCustomer,
  type ResyMealPeriod,
  type ResyOperatingHours,
  type ResyFlowControl,
  type ResyTurnTimeSetting,
  type ResyLocationTable,
  type ResyUser,
  type ResyTicketedEventDefinition,
  type ResyTicketedEventTimeslot,
} from "@shared/schema";

const router = Router();

let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}

class ResyStorage {
  async getUser(id: string): Promise<ResyUser | undefined> {
    const [user] = await db.select().from(resyUsers).where(eq(resyUsers.id, id));
    return user;
  }

  async getAllUsers(): Promise<ResyUser[]> {
    return await db.select().from(resyUsers).orderBy(resyUsers.createdAt);
  }

  async upsertUser(userData: any): Promise<ResyUser> {
    const [user] = await db
      .insert(resyUsers)
      .values(userData)
      .onConflictDoUpdate({
        target: resyUsers.email,
        set: { ...userData, updatedAt: new Date() },
      })
      .returning();
    return user;
  }

  async updateUserRole(id: string, role: string, isActive?: boolean): Promise<ResyUser | undefined> {
    const updateData: any = { role, updatedAt: new Date() };
    if (isActive !== undefined) updateData.isActive = isActive;
    const [user] = await db.update(resyUsers).set(updateData).where(eq(resyUsers.id, id)).returning();
    return user;
  }

  async getLocations(): Promise<ResyLocation[]> {
    return await db.select().from(resyLocations).orderBy(resyLocations.name);
  }

  async getLocation(id: string): Promise<ResyLocation | undefined> {
    const [location] = await db.select().from(resyLocations).where(eq(resyLocations.id, id));
    return location;
  }

  async createLocation(data: any): Promise<ResyLocation> {
    const [location] = await db.insert(resyLocations).values(data).returning();
    return location;
  }

  async updateLocation(id: string, updates: any): Promise<ResyLocation | undefined> {
    const [location] = await db
      .update(resyLocations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(resyLocations.id, id))
      .returning();
    return location;
  }

  async deleteLocation(id: string): Promise<void> {
    // Delete all related records first (cascade manually since schema doesn't have onDelete cascade)
    await db.delete(resyLocationTables).where(eq(resyLocationTables.locationId, id));
    await db.delete(resyMealPeriods).where(eq(resyMealPeriods.locationId, id));
    await db.delete(resyOperatingHours).where(eq(resyOperatingHours.locationId, id));
    await db.delete(resyFlowControls).where(eq(resyFlowControls.locationId, id));
    await db.delete(resyTurnTimeSettings).where(eq(resyTurnTimeSettings.locationId, id));
    await db.delete(resySpecialDates).where(eq(resySpecialDates.locationId, id));
    await db.delete(resyLocationHolidays).where(eq(resyLocationHolidays.locationId, id));
    // Finally delete the location
    await db.delete(resyLocations).where(eq(resyLocations.id, id));
  }

  async getExperiences(): Promise<ResyExperience[]> {
    return await db.select().from(resyExperiences).orderBy(resyExperiences.displayOrder, resyExperiences.name);
  }

  async getExperience(id: string): Promise<ResyExperience | undefined> {
    const [experience] = await db.select().from(resyExperiences).where(eq(resyExperiences.id, id));
    return experience;
  }

  async createExperience(data: any): Promise<ResyExperience> {
    const [experience] = await db.insert(resyExperiences).values(data).returning();
    return experience;
  }

  async updateExperience(id: string, updates: any): Promise<ResyExperience | undefined> {
    const cleanedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    const [experience] = await db
      .update(resyExperiences)
      .set({ ...cleanedUpdates, updatedAt: new Date() })
      .where(eq(resyExperiences.id, id))
      .returning();
    return experience;
  }

  async deleteExperience(id: string): Promise<void> {
    await db.delete(resyExperiences).where(eq(resyExperiences.id, id));
  }

  async getReservations(): Promise<ResyReservation[]> {
    return await db.select().from(resyReservations).orderBy(desc(resyReservations.createdAt));
  }

  async getReservation(id: string): Promise<ResyReservation | undefined> {
    const [reservation] = await db.select().from(resyReservations).where(eq(resyReservations.id, id));
    return reservation;
  }

  async getReservationsByDate(date: string, locationId?: string): Promise<ResyReservation[]> {
    const conditions = [eq(resyReservations.reservationDate, date)];
    if (locationId) {
      conditions.push(eq(resyReservations.locationId, locationId));
    }
    return await db.select().from(resyReservations).where(and(...conditions));
  }

  async createReservation(data: any): Promise<ResyReservation> {
    const [reservation] = await db.insert(resyReservations).values(data).returning();
    return reservation;
  }

  async updateReservation(id: string, updates: any): Promise<ResyReservation | undefined> {
    const [reservation] = await db
      .update(resyReservations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(resyReservations.id, id))
      .returning();
    return reservation;
  }

  async deleteReservation(id: string): Promise<void> {
    await db.delete(resyReservations).where(eq(resyReservations.id, id));
  }

  async getMealPeriodsByLocation(locationId: string): Promise<ResyMealPeriod[]> {
    return await db.select().from(resyMealPeriods)
      .where(eq(resyMealPeriods.locationId, locationId))
      .orderBy(resyMealPeriods.displayOrder);
  }

  async getAllMealPeriods(): Promise<ResyMealPeriod[]> {
    return await db.select().from(resyMealPeriods).orderBy(resyMealPeriods.displayOrder);
  }

  async getMealPeriod(id: string): Promise<ResyMealPeriod | undefined> {
    const [period] = await db.select().from(resyMealPeriods).where(eq(resyMealPeriods.id, id));
    return period;
  }

  async createMealPeriod(data: any): Promise<ResyMealPeriod> {
    const [period] = await db.insert(resyMealPeriods).values(data).returning();
    return period;
  }

  async updateMealPeriod(id: string, updates: any): Promise<ResyMealPeriod | undefined> {
    const [period] = await db
      .update(resyMealPeriods)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(resyMealPeriods.id, id))
      .returning();
    return period;
  }

  async deleteMealPeriod(id: string): Promise<void> {
    await db.delete(resyMealPeriods).where(eq(resyMealPeriods.id, id));
  }

  async getOperatingHoursByLocation(locationId: string): Promise<ResyOperatingHours[]> {
    return await db.select().from(resyOperatingHours).where(eq(resyOperatingHours.locationId, locationId));
  }

  async getAllOperatingHours(): Promise<ResyOperatingHours[]> {
    return await db.select().from(resyOperatingHours);
  }

  async createOperatingHours(data: any): Promise<ResyOperatingHours> {
    const [hours] = await db.insert(resyOperatingHours).values(data).returning();
    return hours;
  }

  async updateOperatingHours(id: string, updates: any): Promise<ResyOperatingHours | undefined> {
    const [hours] = await db
      .update(resyOperatingHours)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(resyOperatingHours.id, id))
      .returning();
    return hours;
  }

  async deleteOperatingHours(id: string): Promise<void> {
    await db.delete(resyOperatingHours).where(eq(resyOperatingHours.id, id));
  }

  async getFlowControlsByLocation(locationId: string): Promise<ResyFlowControl[]> {
    return await db.select().from(resyFlowControls).where(eq(resyFlowControls.locationId, locationId));
  }

  async getAllFlowControls(): Promise<ResyFlowControl[]> {
    return await db.select().from(resyFlowControls);
  }

  async createFlowControl(data: any): Promise<ResyFlowControl> {
    const [fc] = await db.insert(resyFlowControls).values(data).returning();
    return fc;
  }

  async updateFlowControl(id: string, updates: any): Promise<ResyFlowControl | undefined> {
    const [fc] = await db
      .update(resyFlowControls)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(resyFlowControls.id, id))
      .returning();
    return fc;
  }

  async deleteFlowControl(id: string): Promise<void> {
    await db.delete(resyFlowControls).where(eq(resyFlowControls.id, id));
  }

  async getTurnTimeSettingsByLocation(locationId: string): Promise<ResyTurnTimeSetting[]> {
    return await db.select().from(resyTurnTimeSettings).where(eq(resyTurnTimeSettings.locationId, locationId));
  }

  async getAllTurnTimeSettings(): Promise<ResyTurnTimeSetting[]> {
    return await db.select().from(resyTurnTimeSettings);
  }

  async createTurnTimeSettings(data: any): Promise<ResyTurnTimeSetting> {
    const [tt] = await db.insert(resyTurnTimeSettings).values(data).returning();
    return tt;
  }

  async updateTurnTimeSettings(id: string, updates: any): Promise<ResyTurnTimeSetting | undefined> {
    const [tt] = await db
      .update(resyTurnTimeSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(resyTurnTimeSettings.id, id))
      .returning();
    return tt;
  }

  async deleteTurnTimeSettings(id: string): Promise<void> {
    await db.delete(resyTurnTimeSettings).where(eq(resyTurnTimeSettings.id, id));
  }

  async getLocationTablesByLocation(locationId: string): Promise<ResyLocationTable[]> {
    return await db
      .select()
      .from(resyLocationTables)
      .where(eq(resyLocationTables.locationId, locationId))
      .orderBy(resyLocationTables.tableLabel);
  }

  async getAllLocationTables(): Promise<ResyLocationTable[]> {
    return await db.select().from(resyLocationTables).orderBy(resyLocationTables.tableLabel);
  }

  async getLocationTable(id: string): Promise<ResyLocationTable | undefined> {
    const [table] = await db.select().from(resyLocationTables).where(eq(resyLocationTables.id, id));
    return table;
  }

  async createLocationTable(data: any): Promise<ResyLocationTable> {
    const [table] = await db.insert(resyLocationTables).values(data).returning();
    return table;
  }

  async updateLocationTable(id: string, updates: any): Promise<ResyLocationTable | undefined> {
    const [table] = await db
      .update(resyLocationTables)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(resyLocationTables.id, id))
      .returning();
    return table;
  }

  async deleteLocationTable(id: string): Promise<void> {
    await db.delete(resyLocationTables).where(eq(resyLocationTables.id, id));
  }

  async getCustomers(): Promise<ResyCustomer[]> {
    return await db.select().from(resyCustomers).orderBy(desc(resyCustomers.createdAt));
  }

  async getCustomer(id: string): Promise<ResyCustomer | undefined> {
    const [customer] = await db.select().from(resyCustomers).where(eq(resyCustomers.id, id));
    return customer;
  }

  async getCustomerByEmail(email: string): Promise<ResyCustomer | undefined> {
    const [customer] = await db.select().from(resyCustomers).where(eq(resyCustomers.email, email.toLowerCase()));
    return customer;
  }

  async searchCustomers(query: string): Promise<ResyCustomer[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    return await db
      .select()
      .from(resyCustomers)
      .where(
        sql`LOWER(${resyCustomers.firstName}) LIKE ${searchTerm} OR 
            LOWER(${resyCustomers.lastName}) LIKE ${searchTerm} OR 
            LOWER(${resyCustomers.email}) LIKE ${searchTerm} OR 
            ${resyCustomers.phone} LIKE ${searchTerm}`
      )
      .orderBy(desc(resyCustomers.createdAt));
  }

  async createCustomer(data: any): Promise<ResyCustomer> {
    const [customer] = await db
      .insert(resyCustomers)
      .values({ ...data, email: data.email.toLowerCase() })
      .returning();
    return customer;
  }

  async updateCustomer(id: string, updates: any): Promise<ResyCustomer | undefined> {
    const updateData = updates.email ? { ...updates, email: updates.email.toLowerCase() } : updates;
    const [customer] = await db
      .update(resyCustomers)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(resyCustomers.id, id))
      .returning();
    return customer;
  }

  async deleteCustomer(id: string): Promise<void> {
    await db.delete(resyCustomers).where(eq(resyCustomers.id, id));
  }

  async adjustCustomerPoints(id: string, adjustment: number): Promise<ResyCustomer | undefined> {
    const customer = await this.getCustomer(id);
    if (!customer) return undefined;
    const newPoints = Math.max(0, customer.loyaltyPoints + adjustment);
    const [updated] = await db
      .update(resyCustomers)
      .set({ loyaltyPoints: newPoints, updatedAt: new Date() })
      .where(eq(resyCustomers.id, id))
      .returning();
    return updated;
  }

  async getCustomerVisits(customerId: string) {
    return await db
      .select()
      .from(resyCustomerVisits)
      .where(eq(resyCustomerVisits.customerId, customerId))
      .orderBy(desc(resyCustomerVisits.visitDate));
  }

  async createCustomerVisit(data: any) {
    const [visit] = await db.insert(resyCustomerVisits).values(data).returning();
    return visit;
  }

  async getAllPrivateEvents() {
    return await db.select().from(resyPrivateEvents);
  }

  async getPrivateEventsByLocation(locationId: string) {
    return await db.select().from(resyPrivateEvents).where(eq(resyPrivateEvents.locationId, locationId));
  }

  async createPrivateEvent(data: any) {
    const [event] = await db.insert(resyPrivateEvents).values(data).returning();
    return event;
  }

  async updatePrivateEvent(id: string, updates: any) {
    const [event] = await db
      .update(resyPrivateEvents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(resyPrivateEvents.id, id))
      .returning();
    return event;
  }

  async deletePrivateEvent(id: string): Promise<void> {
    await db.delete(resyPrivateEvents).where(eq(resyPrivateEvents.id, id));
  }

  // Ticketed Event Definitions
  async getTicketedEventDefinitions(locationId?: string): Promise<ResyTicketedEventDefinition[]> {
    if (locationId) {
      return await db.select().from(resyTicketedEventDefinitions).where(eq(resyTicketedEventDefinitions.locationId, locationId));
    }
    return await db.select().from(resyTicketedEventDefinitions);
  }

  async getTicketedEventDefinition(id: string): Promise<ResyTicketedEventDefinition | undefined> {
    const [definition] = await db.select().from(resyTicketedEventDefinitions).where(eq(resyTicketedEventDefinitions.id, id));
    return definition;
  }

  async createTicketedEventDefinition(data: any): Promise<ResyTicketedEventDefinition> {
    const [definition] = await db.insert(resyTicketedEventDefinitions).values(data).returning();
    return definition;
  }

  async updateTicketedEventDefinition(id: string, updates: any): Promise<ResyTicketedEventDefinition | undefined> {
    const [definition] = await db
      .update(resyTicketedEventDefinitions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(resyTicketedEventDefinitions.id, id))
      .returning();
    return definition;
  }

  async deleteTicketedEventDefinition(id: string): Promise<void> {
    // First delete associated timeslots
    await db.delete(resyTicketedEventTimeslots).where(eq(resyTicketedEventTimeslots.definitionId, id));
    // Then delete the definition
    await db.delete(resyTicketedEventDefinitions).where(eq(resyTicketedEventDefinitions.id, id));
  }

  // Ticketed Event Timeslots
  async getTicketedEventTimeslots(definitionId: string): Promise<ResyTicketedEventTimeslot[]> {
    return await db.select().from(resyTicketedEventTimeslots).where(eq(resyTicketedEventTimeslots.definitionId, definitionId));
  }

  async getTicketedEventTimeslot(id: string): Promise<ResyTicketedEventTimeslot | undefined> {
    const [timeslot] = await db.select().from(resyTicketedEventTimeslots).where(eq(resyTicketedEventTimeslots.id, id));
    return timeslot;
  }

  async createTicketedEventTimeslot(data: any): Promise<ResyTicketedEventTimeslot> {
    const [timeslot] = await db.insert(resyTicketedEventTimeslots).values(data).returning();
    return timeslot;
  }

  async updateTicketedEventTimeslot(id: string, updates: any): Promise<ResyTicketedEventTimeslot | undefined> {
    const [timeslot] = await db
      .update(resyTicketedEventTimeslots)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(resyTicketedEventTimeslots.id, id))
      .returning();
    return timeslot;
  }

  async deleteTicketedEventTimeslot(id: string): Promise<void> {
    await db.delete(resyTicketedEventTimeslots).where(eq(resyTicketedEventTimeslots.id, id));
  }

  async deleteTicketedEventTimeslotsByDefinition(definitionId: string): Promise<void> {
    await db.delete(resyTicketedEventTimeslots).where(eq(resyTicketedEventTimeslots.definitionId, definitionId));
  }

  async getAllSpecialDates() {
    return await db.select().from(resySpecialDates);
  }

  async getSpecialDatesByLocation(locationId: string) {
    return await db.select().from(resySpecialDates).where(eq(resySpecialDates.locationId, locationId));
  }

  async getSpecialDatesByExperience(experienceId: string) {
    return await db.select().from(resySpecialDates);
  }

  async createSpecialDate(data: any) {
    const [sd] = await db.insert(resySpecialDates).values(data).returning();
    return sd;
  }

  async updateSpecialDate(id: string, updates: any) {
    const [sd] = await db
      .update(resySpecialDates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(resySpecialDates.id, id))
      .returning();
    return sd;
  }

  async deleteSpecialDate(id: string): Promise<void> {
    await db.delete(resySpecialDates).where(eq(resySpecialDates.id, id));
  }

  async getLocationHolidays(locationId?: string): Promise<any[]> {
    if (locationId) {
      return await db.select().from(resyLocationHolidays).where(eq(resyLocationHolidays.locationId, locationId));
    }
    return await db.select().from(resyLocationHolidays);
  }

  async setLocationHoliday(data: any): Promise<any> {
    const existing = await db.select().from(resyLocationHolidays)
      .where(and(
        eq(resyLocationHolidays.locationId, data.locationId),
        eq(resyLocationHolidays.holidayKey, data.holidayKey)
      ));
    
    if (existing.length > 0) {
      const [updated] = await db.update(resyLocationHolidays)
        .set({ isClosed: data.isClosed, updatedAt: new Date() })
        .where(eq(resyLocationHolidays.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(resyLocationHolidays).values(data).returning();
      return created;
    }
  }

  async deleteLocationHoliday(locationId: string, holidayKey: string): Promise<void> {
    await db.delete(resyLocationHolidays)
      .where(and(
        eq(resyLocationHolidays.locationId, locationId),
        eq(resyLocationHolidays.holidayKey, holidayKey)
      ));
  }

  async getClubs() {
    return await db.select().from(resyClubs).orderBy(resyClubs.displayOrder);
  }

  async getClub(id: string) {
    const [club] = await db.select().from(resyClubs).where(eq(resyClubs.id, id));
    return club;
  }

  async createClub(data: any) {
    const [club] = await db.insert(resyClubs).values(data).returning();
    return club;
  }

  async updateClub(id: string, updates: any) {
    const [club] = await db
      .update(resyClubs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(resyClubs.id, id))
      .returning();
    return club;
  }

  async deleteClub(id: string): Promise<void> {
    await db.delete(resyClubs).where(eq(resyClubs.id, id));
  }

  async getAllClubExperienceDiscounts() {
    return await db.select().from(resyClubExperienceDiscounts);
  }

  async getClubExperienceDiscounts(clubId: string) {
    return await db.select().from(resyClubExperienceDiscounts).where(eq(resyClubExperienceDiscounts.clubId, clubId));
  }

  async createClubExperienceDiscount(data: any) {
    const [discount] = await db.insert(resyClubExperienceDiscounts).values(data).returning();
    return discount;
  }

  async updateClubExperienceDiscount(id: string, updates: any) {
    const [discount] = await db
      .update(resyClubExperienceDiscounts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(resyClubExperienceDiscounts.id, id))
      .returning();
    return discount;
  }

  async deleteClubExperienceDiscount(id: string): Promise<void> {
    await db.delete(resyClubExperienceDiscounts).where(eq(resyClubExperienceDiscounts.id, id));
  }

  async getAllDiscounts() {
    return await db.select().from(resyExperienceDiscounts);
  }

  async getDiscountsByExperience(experienceId: string) {
    return await db.select().from(resyExperienceDiscounts).where(eq(resyExperienceDiscounts.experienceId, experienceId));
  }

  async createDiscount(data: any) {
    const [discount] = await db.insert(resyExperienceDiscounts).values(data).returning();
    return discount;
  }

  async updateDiscount(id: string, updates: any) {
    const [discount] = await db
      .update(resyExperienceDiscounts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(resyExperienceDiscounts.id, id))
      .returning();
    return discount;
  }

  async deleteDiscount(id: string): Promise<void> {
    await db.delete(resyExperienceDiscounts).where(eq(resyExperienceDiscounts.id, id));
  }

  async getFooterLinks() {
    return await db.select().from(resyFooterLinks).orderBy(resyFooterLinks.displayOrder);
  }

  async createFooterLink(data: any) {
    const [link] = await db.insert(resyFooterLinks).values(data).returning();
    return link;
  }

  async updateFooterLink(id: string, updates: any) {
    const [link] = await db
      .update(resyFooterLinks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(resyFooterLinks.id, id))
      .returning();
    return link;
  }

  async deleteFooterLink(id: string): Promise<void> {
    await db.delete(resyFooterLinks).where(eq(resyFooterLinks.id, id));
  }

  async getTimeSlotsByExperience(experienceId: string) {
    return await db
      .select()
      .from(resyTimeSlots)
      .where(eq(resyTimeSlots.experienceId, experienceId))
      .orderBy(resyTimeSlots.dayOfWeek, resyTimeSlots.startTime);
  }

  async getTimeSlot(id: string) {
    const [slot] = await db.select().from(resyTimeSlots).where(eq(resyTimeSlots.id, id));
    return slot;
  }

  async createTimeSlot(data: any) {
    const [slot] = await db.insert(resyTimeSlots).values(data).returning();
    return slot;
  }

  async deleteTimeSlot(id: string): Promise<void> {
    await db.delete(resyTimeSlots).where(eq(resyTimeSlots.id, id));
  }

  async getSiteSettings() {
    const settings = await db.select().from(resySiteSettings);
    const result: Record<string, string | null> = {};
    settings.forEach((s) => {
      result[s.key] = s.value;
    });
    return result;
  }

  async updateSiteSetting(key: string, value: string) {
    await db
      .insert(resySiteSettings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: resySiteSettings.key,
        set: { value, updatedAt: new Date() },
      });
  }
}

const resyStorage = new ResyStorage();

router.get("/api/resy/locations", async (req, res) => {
  try {
    const locations = await resyStorage.getLocations();
    res.json(locations);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch locations: " + error.message });
  }
});

router.get("/api/resy/locations/:id", async (req, res) => {
  try {
    const location = await resyStorage.getLocation(req.params.id);
    if (!location) return res.status(404).json({ message: "Location not found" });
    res.json(location);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch location: " + error.message });
  }
});

router.post("/api/resy/locations", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyLocationSchema.parse(req.body);
    const location = await resyStorage.createLocation(validated);
    res.json(location);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create location: " + error.message });
  }
});

router.patch("/api/resy/locations/:id", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyLocationSchema.partial().parse(req.body);
    const location = await resyStorage.updateLocation(req.params.id, validated);
    if (!location) return res.status(404).json({ message: "Location not found" });
    res.json(location);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update location: " + error.message });
  }
});

router.delete("/api/resy/locations/:id", requireResyAdmin, async (req, res) => {
  try {
    await resyStorage.deleteLocation(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete location: " + error.message });
  }
});

router.post("/api/resy/locations/:id/clone", requireResyAdmin, async (req, res) => {
  try {
    const original = await resyStorage.getLocation(req.params.id);
    if (!original) return res.status(404).json({ message: "Location not found" });
    
    const { id, createdAt, updatedAt, ...cloneData } = original;
    const cloned = await resyStorage.createLocation({
      ...cloneData,
      name: `${original.name} copy`,
      isActive: false,
    });
    res.json(cloned);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to clone location: " + error.message });
  }
});

router.get("/api/resy/experiences", async (req, res) => {
  try {
    const experiences = await resyStorage.getExperiences();
    console.log(`[Resy API] GET /api/resy/experiences returning ${experiences.length} experiences`);
    res.json(experiences);
  } catch (error: any) {
    console.error(`[Resy API] GET /api/resy/experiences ERROR:`, error);
    res.status(500).json({ message: "Failed to fetch experiences: " + error.message });
  }
});

// Diagnostic endpoint to check database connection
router.get("/api/resy/debug/db-check", async (req, res) => {
  try {
    const [expCount] = await db.select({ count: sql`count(*)` }).from(resyExperiences);
    const [locCount] = await db.select({ count: sql`count(*)` }).from(resyLocations);
    const [privateEvtCount] = await db.select({ count: sql`count(*)` }).from(resyPrivateEvents);
    const dbHost = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).host : 'not set';
    res.json({
      status: 'connected',
      experienceCount: Number(expCount.count),
      locationCount: Number(locCount.count),
      privateEventCount: Number(privateEvtCount.count),
      dbHost: dbHost.substring(0, 20) + '...',
      nodeEnv: process.env.NODE_ENV
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.get("/api/resy/experiences/:id", async (req, res) => {
  try {
    const experience = await resyStorage.getExperience(req.params.id);
    if (!experience) return res.status(404).json({ message: "Experience not found" });
    res.json(experience);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch experience: " + error.message });
  }
});

router.post("/api/resy/experiences", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyExperienceSchema.parse(req.body);
    const experience = await resyStorage.createExperience(validated);
    res.json(experience);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create experience: " + error.message });
  }
});

router.patch("/api/resy/experiences/:id", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyExperienceSchema.partial().parse(req.body);
    const experience = await resyStorage.updateExperience(req.params.id, validated);
    if (!experience) return res.status(404).json({ message: "Experience not found" });
    res.json(experience);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update experience: " + error.message });
  }
});

router.put("/api/resy/experiences/:id", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyExperienceSchema.partial().parse(req.body);
    const experience = await resyStorage.updateExperience(req.params.id, validated);
    if (!experience) return res.status(404).json({ message: "Experience not found" });
    res.json(experience);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update experience: " + error.message });
  }
});

router.put("/api/resy/experiences/:id/images", requireResyAdmin, async (req, res) => {
  try {
    const { primaryImageURL, secondaryImageURL } = req.body;
    const updateData: any = {};
    if (primaryImageURL !== undefined) updateData.imageUrl = primaryImageURL || null;
    if (secondaryImageURL !== undefined) updateData.secondaryImageUrl = secondaryImageURL || null;
    
    const experience = await resyStorage.updateExperience(req.params.id, updateData);
    if (!experience) return res.status(404).json({ message: "Experience not found" });
    res.json(experience);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update experience images: " + error.message });
  }
});

router.delete("/api/resy/experiences/:id", requireResyAdmin, async (req, res) => {
  try {
    await resyStorage.deleteExperience(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete experience: " + error.message });
  }
});

router.post("/api/resy/experiences/:id/clone", requireResyAdmin, async (req, res) => {
  try {
    const original = await resyStorage.getExperience(req.params.id);
    if (!original) return res.status(404).json({ message: "Experience not found" });
    
    const { id, createdAt, updatedAt, ...cloneData } = original;
    const cloned = await resyStorage.createExperience({
      ...cloneData,
      name: `${original.name} copy`,
      isActive: false,
    });
    res.json(cloned);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to clone experience: " + error.message });
  }
});

// Experience discounts - nested routes
router.get("/api/resy/experiences/:experienceId/discounts", requireResyAdmin, async (req, res) => {
  try {
    const discounts = await resyStorage.getDiscountsByExperience(req.params.experienceId);
    res.json(discounts);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch discounts: " + error.message });
  }
});

router.post("/api/resy/experiences/:experienceId/discounts", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyExperienceDiscountSchema.parse({
      ...req.body,
      experienceId: req.params.experienceId,
    });
    const discount = await resyStorage.createDiscount(validated);
    res.json(discount);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create discount: " + error.message });
  }
});

router.put("/api/resy/discounts/:id", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyExperienceDiscountSchema.partial().parse(req.body);
    const discount = await resyStorage.updateDiscount(req.params.id, validated);
    if (!discount) return res.status(404).json({ message: "Discount not found" });
    res.json(discount);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update discount: " + error.message });
  }
});

router.delete("/api/resy/discounts/:id", requireResyAdmin, async (req, res) => {
  try {
    await resyStorage.deleteDiscount(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete discount: " + error.message });
  }
});

// Experience timeslots
router.get("/api/resy/experiences/:experienceId/timeslots", async (req, res) => {
  try {
    // First check if this is a ticketed experience
    const experience = await resyStorage.getExperience(req.params.experienceId);
    
    if (experience?.reservationType === "ticketed" && experience.locationId) {
      // For ticketed experiences, get timeslots from the ticketed event definition
      const definitions = await resyStorage.getTicketedEventDefinitions(experience.locationId);
      if (definitions.length > 0) {
        const definition = definitions[0];
        const timeslots = await resyStorage.getTicketedEventTimeslots(definition.id);
        // Transform to match expected format with id, time, dayOfWeek, capacity
        // Also include the event date range from the definition
        const transformedSlots = timeslots.map(slot => ({
          id: slot.id,
          experienceId: req.params.experienceId,
          dayOfWeek: slot.dayOfWeek,
          time: slot.startTime,
          startTime: slot.startTime,
          capacity: slot.capacity,
          isActive: slot.isActive,
          // Include event definition dates for filtering
          eventStartDate: definition.startDate,
          eventEndDate: definition.endDate,
        }));
        return res.json(transformedSlots);
      }
    }
    
    // Fall back to legacy timeslots table
    const slots = await resyStorage.getTimeSlotsByExperience(req.params.experienceId);
    res.json(slots);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch timeslots: " + error.message });
  }
});

router.post("/api/resy/experiences/:experienceId/timeslots", requireResyAdmin, async (req, res) => {
  try {
    const { days, times, capacity } = req.body;
    const createdSlots = [];
    for (const day of days) {
      for (const time of times) {
        const slot = await resyStorage.createTimeSlot({
          experienceId: req.params.experienceId,
          dayOfWeek: day,
          startTime: time,
          capacity: capacity || 30,
          isActive: true,
        });
        createdSlots.push(slot);
      }
    }
    res.json(createdSlots);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create timeslots: " + error.message });
  }
});

router.get("/api/resy/reservations", requireResyAdmin, async (req, res) => {
  try {
    const reservations = await resyStorage.getReservations();
    res.json(reservations);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch reservations: " + error.message });
  }
});

router.get("/api/resy/reservations/:id", async (req, res) => {
  try {
    const reservation = await resyStorage.getReservation(req.params.id);
    if (!reservation) return res.status(404).json({ message: "Reservation not found" });
    res.json(reservation);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch reservation: " + error.message });
  }
});

router.post("/api/resy/reservations", async (req, res) => {
  try {
    // For ticketed events, provide defaults for table reservation fields
    const data = { ...req.body };
    
    // Get experience to determine type
    const experience = await resyStorage.getExperience(data.experienceId);
    
    if (experience?.reservationType === "ticketed") {
      // Provide defaults for ticketed events
      data.partySize = data.ticketQuantity || 1;
      
      // If reservationTime is not set but we have a timeSlotId, get the time from the slot
      if (!data.reservationTime && data.timeSlotId) {
        const slot = await resyStorage.getTimeSlot(data.timeSlotId);
        data.reservationTime = slot?.time || slot?.startTime || "12:00 PM";
      } else if (!data.reservationTime) {
        data.reservationTime = "12:00 PM";
      }
    }
    
    const validated = insertResyReservationSchema.parse(data);
    const reservation = await resyStorage.createReservation(validated);
    
    // Update or create customer with notification preferences
    const notificationPreference = data.notificationPreference || "email";
    const newsletterOptIn = data.newsletterOptIn || false;
    
    try {
      const existingCustomer = await resyStorage.getCustomerByEmail(reservation.customerEmail);
      if (existingCustomer) {
        // Update existing customer preferences
        const nameParts = reservation.customerName?.split(' ') || [];
        const firstName = nameParts[0] || existingCustomer.firstName;
        const lastName = nameParts.slice(1).join(' ') || existingCustomer.lastName;
        await db.update(resyCustomers)
          .set({
            notificationPreference,
            newsletterOptIn,
            phone: reservation.customerPhone || existingCustomer.phone,
            firstName,
            lastName,
          })
          .where(eq(resyCustomers.id, existingCustomer.id));
      } else {
        // Create new customer record
        const nameParts = reservation.customerName?.split(' ') || [''];
        await resyStorage.createCustomer({
          firstName: nameParts[0] || 'Guest',
          lastName: nameParts.slice(1).join(' ') || '',
          email: reservation.customerEmail,
          phone: reservation.customerPhone || null,
          notificationPreference,
          newsletterOptIn,
        });
        console.log(`Created new customer: ${reservation.customerEmail}`);
      }
    } catch (customerError) {
      console.error("Failed to create/update customer:", customerError);
    }
    
    // Send confirmation email if preference includes email
    const shouldSendEmail = notificationPreference === "email" || notificationPreference === "both";
    const shouldSendSMS = (notificationPreference === "text" || notificationPreference === "both") && reservation.customerPhone;
    
    if (shouldSendEmail) {
      try {
        if (experience) {
          const emailData = {
            customerName: reservation.customerName,
            customerEmail: reservation.customerEmail,
            experienceName: experience.name,
            reservationDate: reservation.reservationDate,
            reservationTime: reservation.reservationTime || "TBD",
            ticketQuantity: reservation.ticketQuantity || undefined,
            partySize: reservation.partySize || undefined,
            totalAmount: reservation.totalAmount || undefined,
            confirmationCode: reservation.confirmationCode || undefined,
            specialRequests: reservation.specialRequests || undefined,
          };
          const { subject, html, text } = generateReservationConfirmationEmail(emailData);
          await sendEmail(reservation.customerEmail, subject, html, text);
          console.log(`Confirmation email sent to ${reservation.customerEmail}`);
        }
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
      }
    }
    
    // Send confirmation SMS if preference includes text and we have a phone number
    if (shouldSendSMS && isSmsConfigured()) {
      try {
        if (experience) {
          const smsMessage = generateReservationConfirmationSMS({
            customerName: reservation.customerName,
            experienceName: experience.name,
            reservationDate: reservation.reservationDate,
            reservationTime: reservation.reservationTime || "TBD",
            ticketQuantity: reservation.ticketQuantity || undefined,
            partySize: reservation.partySize || undefined,
          });
          await sendSMS(reservation.customerPhone!, smsMessage);
          console.log(`Confirmation SMS sent to ${reservation.customerPhone}`);
        }
      } catch (smsError) {
        console.error("Failed to send confirmation SMS:", smsError);
      }
    }
    
    res.status(201).json(reservation);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create reservation: " + error.message });
  }
});

router.put("/api/resy/reservations/:id", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyReservationSchema.partial().parse(req.body);
    const reservation = await resyStorage.updateReservation(req.params.id, validated);
    if (!reservation) return res.status(404).json({ message: "Reservation not found" });
    res.json(reservation);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update reservation: " + error.message });
  }
});

// Delete reservation
router.delete("/api/resy/reservations/:id", requireResyAdmin, async (req, res) => {
  try {
    const reservation = await resyStorage.getReservation(req.params.id);
    if (!reservation) return res.status(404).json({ message: "Reservation not found" });
    
    await resyStorage.deleteReservation(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete reservation: " + error.message });
  }
});

// Refund reservation payment
router.post("/api/resy/reservations/:id/refund", requireResyAdmin, async (req, res) => {
  try {
    const reservation = await resyStorage.getReservation(req.params.id);
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }
    
    if (!reservation.paymentIntentId) {
      return res.status(400).json({ message: "No payment found for this reservation" });
    }
    
    if (!stripe) {
      return res.status(500).json({ message: "Stripe is not configured" });
    }
    
    const { amount, reason } = req.body;
    
    // Get the payment intent to check the amount
    const paymentIntent = await stripe.paymentIntents.retrieve(reservation.paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ message: "Payment was not successful, cannot refund" });
    }
    
    // Calculate refund amount (in cents)
    let refundAmountCents: number;
    if (amount) {
      refundAmountCents = Math.round(parseFloat(amount) * 100);
      if (refundAmountCents > paymentIntent.amount) {
        return res.status(400).json({ 
          message: `Refund amount exceeds original payment of $${(paymentIntent.amount / 100).toFixed(2)}` 
        });
      }
    } else {
      // Full refund
      refundAmountCents = paymentIntent.amount;
    }
    
    // Create the refund
    const refund = await stripe.refunds.create({
      payment_intent: reservation.paymentIntentId,
      amount: refundAmountCents,
      reason: reason === 'duplicate' ? 'duplicate' : 
              reason === 'fraudulent' ? 'fraudulent' : 'requested_by_customer'
    });
    
    // Update reservation status if full refund
    const isFullRefund = refundAmountCents === paymentIntent.amount;
    if (isFullRefund) {
      await resyStorage.updateReservation(req.params.id, { 
        status: 'cancelled',
        notes: `${reservation.notes || ''}\n[Refunded: $${(refundAmountCents / 100).toFixed(2)} on ${new Date().toISOString()}]`.trim()
      });
    } else {
      // Partial refund - update the total amount
      const newTotal = (paymentIntent.amount - refundAmountCents) / 100;
      await resyStorage.updateReservation(req.params.id, { 
        totalAmount: newTotal.toFixed(2),
        notes: `${reservation.notes || ''}\n[Partial refund: $${(refundAmountCents / 100).toFixed(2)} on ${new Date().toISOString()}]`.trim()
      });
    }
    
    res.json({ 
      success: true, 
      refundId: refund.id,
      refundedAmount: refundAmountCents / 100,
      isFullRefund
    });
  } catch (error: any) {
    console.error("Refund error:", error);
    res.status(500).json({ message: "Failed to process refund: " + error.message });
  }
});

// Reschedule reservation with availability validation
router.post("/api/resy/reservations/:id/reschedule", requireResyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, time, partySize } = req.body;
    
    if (!date || !time) {
      return res.status(400).json({ message: "Date and time are required" });
    }
    
    const reservation = await resyStorage.getReservation(id);
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }
    
    const experience = await resyStorage.getExperience(reservation.experienceId);
    if (!experience) {
      return res.status(404).json({ message: "Experience not found" });
    }
    
    const locationId = reservation.locationId || experience.locationId;
    const newPartySize = partySize || reservation.partySize || 2;
    
    // For table reservations, validate availability
    if (experience.reservationType === "table" && locationId) {
      // Check schedule for closures
      const schedule = await getNormalizedSchedule(locationId, date);
      if (schedule.isClosed) {
        return res.status(400).json({ 
          message: `Location is closed on ${date}: ${schedule.closureReason || 'Closed'}` 
        });
      }
      
      // Find matching meal period
      const period = schedule.servicePeriods.find(p => {
        const start = timeToMinutes(p.startTime);
        const end = timeToMinutes(p.endTime);
        const target = timeToMinutes(time);
        return target >= start && target < end;
      });
      
      if (!period) {
        return res.status(400).json({ 
          message: `No service available at ${time} on ${date}` 
        });
      }
      
      // Check flow capacity
      const flowResult = await getRemainingCovers(locationId, date, time, period.periodId);
      // Add back the current reservation's party size since we're rescheduling
      const adjustedRemaining = (reservation.reservationDate === date && reservation.reservationTime === time) 
        ? flowResult.remainingCovers 
        : flowResult.remainingCovers;
        
      if (adjustedRemaining < newPartySize) {
        return res.status(400).json({ 
          message: `Not enough covers available at ${time}. Only ${adjustedRemaining} remaining.` 
        });
      }
      
      // Get turn duration
      const turnDuration = await getTurnDuration(locationId, period.periodId, newPartySize);
      
      // Find available table (excluding current reservation's table from conflicts)
      const availableTables = await getAvailableTables(
        locationId, 
        date, 
        time, 
        newPartySize, 
        turnDuration,
        id // Pass reservation ID to exclude from conflict check
      );
      
      if (availableTables.length === 0) {
        return res.status(400).json({ 
          message: "No tables available for this party size at this time" 
        });
      }
      
      // Assign best available table
      const assignedTable = availableTables[0];
      const holdStart = time;
      const holdEnd = minutesToTime(timeToMinutes(time) + turnDuration);
      
      // Update reservation
      const updated = await resyStorage.updateReservation(id, {
        reservationDate: date,
        reservationTime: time,
        partySize: newPartySize,
        assignedTableId: assignedTable.tableId,
        tableAssignment: assignedTable.tableLabel,
        holdStart,
        holdEnd,
        turnDuration,
        notes: `${reservation.notes || ''}\n[Rescheduled from ${reservation.reservationDate} ${reservation.reservationTime} on ${new Date().toISOString()}]`.trim()
      });
      
      res.json({
        success: true,
        reservation: updated,
        assignedTable: {
          id: assignedTable.tableId,
          label: assignedTable.tableLabel
        },
        holdWindow: {
          start: holdStart,
          end: holdEnd,
          duration: turnDuration
        }
      });
    } else {
      // For ticketed events, just update date/time
      const updated = await resyStorage.updateReservation(id, {
        reservationDate: date,
        reservationTime: time,
        partySize: newPartySize,
        notes: `${reservation.notes || ''}\n[Rescheduled from ${reservation.reservationDate} ${reservation.reservationTime} on ${new Date().toISOString()}]`.trim()
      });
      
      res.json({
        success: true,
        reservation: updated
      });
    }
  } catch (error: any) {
    console.error("Reschedule error:", error);
    res.status(500).json({ message: "Failed to reschedule reservation: " + error.message });
  }
});

router.get("/api/resy/customers", requireResyAdmin, async (req, res) => {
  try {
    const customers = await resyStorage.getCustomers();
    res.json(customers);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch customers: " + error.message });
  }
});

router.get("/api/resy/customers/search", requireResyAdmin, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== "string") return res.status(400).json({ message: "Search query required" });
    const customers = await resyStorage.searchCustomers(q);
    res.json(customers);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to search customers: " + error.message });
  }
});

router.get("/api/resy/customers/:id", requireResyAdmin, async (req, res) => {
  try {
    const customer = await resyStorage.getCustomer(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch customer: " + error.message });
  }
});

router.post("/api/resy/customers", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyCustomerSchema.parse(req.body);
    const existing = await resyStorage.getCustomerByEmail(validated.email);
    if (existing) return res.status(400).json({ message: "Customer with this email already exists" });
    const customer = await resyStorage.createCustomer(validated);
    res.status(201).json(customer);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create customer: " + error.message });
  }
});

router.put("/api/resy/customers/:id", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyCustomerSchema.partial().parse(req.body);
    if (validated.email) {
      const existing = await resyStorage.getCustomerByEmail(validated.email);
      if (existing && existing.id !== req.params.id) {
        return res.status(400).json({ message: "Customer with this email already exists" });
      }
    }
    const customer = await resyStorage.updateCustomer(req.params.id, validated);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update customer: " + error.message });
  }
});

router.delete("/api/resy/customers/:id", requireResyAdmin, async (req, res) => {
  try {
    await resyStorage.deleteCustomer(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete customer: " + error.message });
  }
});

router.get("/api/resy/customers/:id/visits", requireResyAdmin, async (req, res) => {
  try {
    const visits = await resyStorage.getCustomerVisits(req.params.id);
    res.json(visits);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch customer visits: " + error.message });
  }
});

router.post("/api/resy/customers/:id/adjust-points", requireResyAdmin, async (req, res) => {
  try {
    const { adjustment } = req.body;
    if (typeof adjustment !== "number") return res.status(400).json({ message: "Adjustment must be a number" });
    const customer = await resyStorage.adjustCustomerPoints(req.params.id, adjustment);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to adjust points: " + error.message });
  }
});

router.get("/api/resy/meal-periods", async (req, res) => {
  try {
    const periods = await resyStorage.getAllMealPeriods();
    res.json(periods);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch meal periods: " + error.message });
  }
});

router.post("/api/resy/meal-periods", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyMealPeriodSchema.parse(req.body);
    const period = await resyStorage.createMealPeriod(validated);
    res.json(period);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create meal period: " + error.message });
  }
});

router.patch("/api/resy/meal-periods/:id", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyMealPeriodSchema.partial().parse(req.body);
    const period = await resyStorage.updateMealPeriod(req.params.id, validated);
    if (!period) return res.status(404).json({ message: "Meal period not found" });
    res.json(period);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update meal period: " + error.message });
  }
});

router.delete("/api/resy/meal-periods/:id", requireResyAdmin, async (req, res) => {
  try {
    await resyStorage.deleteMealPeriod(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete meal period: " + error.message });
  }
});

router.get("/api/resy/locations/:locationId/meal-periods", async (req, res) => {
  try {
    const periods = await resyStorage.getMealPeriodsByLocation(req.params.locationId);
    res.json(periods);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch meal periods: " + error.message });
  }
});

router.get("/api/resy/operating-hours", async (req, res) => {
  try {
    const hours = await resyStorage.getAllOperatingHours();
    res.json(hours);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch operating hours: " + error.message });
  }
});

router.get("/api/resy/locations/:locationId/operating-hours", async (req, res) => {
  try {
    const hours = await resyStorage.getOperatingHoursByLocation(req.params.locationId);
    res.json(hours);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch operating hours: " + error.message });
  }
});

router.post("/api/resy/operating-hours", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyOperatingHoursSchema.parse(req.body);
    const hours = await resyStorage.createOperatingHours(validated);
    res.json(hours);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create operating hours: " + error.message });
  }
});

router.patch("/api/resy/operating-hours/:id", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyOperatingHoursSchema.partial().parse(req.body);
    const hours = await resyStorage.updateOperatingHours(req.params.id, validated);
    if (!hours) return res.status(404).json({ message: "Operating hours not found" });
    res.json(hours);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update operating hours: " + error.message });
  }
});

router.delete("/api/resy/operating-hours/:id", requireResyAdmin, async (req, res) => {
  try {
    await resyStorage.deleteOperatingHours(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete operating hours: " + error.message });
  }
});

router.get("/api/resy/flow-controls", async (req, res) => {
  try {
    const controls = await resyStorage.getAllFlowControls();
    res.json(controls);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch flow controls: " + error.message });
  }
});

router.post("/api/resy/flow-controls", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyFlowControlSchema.parse(req.body);
    const control = await resyStorage.createFlowControl(validated);
    res.json(control);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create flow control: " + error.message });
  }
});

router.patch("/api/resy/flow-controls/:id", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyFlowControlSchema.partial().parse(req.body);
    const control = await resyStorage.updateFlowControl(req.params.id, validated);
    if (!control) return res.status(404).json({ message: "Flow control not found" });
    res.json(control);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update flow control: " + error.message });
  }
});

router.delete("/api/resy/flow-controls/:id", requireResyAdmin, async (req, res) => {
  try {
    await resyStorage.deleteFlowControl(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete flow control: " + error.message });
  }
});

router.get("/api/resy/locations/:locationId/flow-controls", async (req, res) => {
  try {
    const controls = await resyStorage.getFlowControlsByLocation(req.params.locationId);
    res.json(controls);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch flow controls: " + error.message });
  }
});

router.get("/api/resy/locations/:locationId/turn-times", async (req, res) => {
  try {
    const settings = await resyStorage.getTurnTimeSettingsByLocation(req.params.locationId);
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch turn times: " + error.message });
  }
});

router.get("/api/resy/turn-times", async (req, res) => {
  try {
    const settings = await resyStorage.getAllTurnTimeSettings();
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch turn times: " + error.message });
  }
});

router.post("/api/resy/turn-times", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyTurnTimeSettingSchema.parse(req.body);
    const setting = await resyStorage.createTurnTimeSettings(validated);
    res.json(setting);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create turn time: " + error.message });
  }
});

router.patch("/api/resy/turn-times/:id", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyTurnTimeSettingSchema.partial().parse(req.body);
    const setting = await resyStorage.updateTurnTimeSettings(req.params.id, validated);
    if (!setting) return res.status(404).json({ message: "Turn time not found" });
    res.json(setting);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update turn time: " + error.message });
  }
});

router.delete("/api/resy/turn-times/:id", requireResyAdmin, async (req, res) => {
  try {
    await resyStorage.deleteTurnTimeSettings(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete turn time: " + error.message });
  }
});

router.get("/api/resy/location-tables", async (req, res) => {
  try {
    const tables = await resyStorage.getAllLocationTables();
    res.json(tables);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch tables: " + error.message });
  }
});

router.get("/api/resy/locations/:locationId/tables", async (req, res) => {
  try {
    const tables = await resyStorage.getLocationTablesByLocation(req.params.locationId);
    res.json(tables);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch tables: " + error.message });
  }
});

// Export tables for a location to Excel (for syncing with TOAST POS etc.)
router.get("/api/resy/locations/:locationId/tables/export", requireResyAdmin, async (req, res) => {
  try {
    const { locationId } = req.params;
    const location = await resyStorage.getLocation(locationId);
    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }
    
    const tables = await resyStorage.getLocationTablesByLocation(locationId);
    
    // Format for export - use snake_case column names for compatibility with external systems
    const exportData = tables.map(table => ({
      table_label: table.tableLabel,
      min_capacity: table.minCapacity,
      max_capacity: table.maxCapacity,
      priority: table.priority,
      is_communal: table.isCommunal ? 'Yes' : 'No',
      is_active: table.isActive ? 'Yes' : 'No',
      is_paused: table.isPaused ? 'Yes' : 'No',
      combinable_with: table.combinableWith?.join(', ') || '',
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tables');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    const safeName = location.name.replace(/[^a-zA-Z0-9]/g, '-');
    const timestamp = new Date().toISOString().split('T')[0];
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${safeName}-tables-${timestamp}.xlsx`);
    res.send(buffer);
  } catch (error: any) {
    console.error("Error exporting tables:", error);
    res.status(500).json({ message: "Failed to export tables: " + error.message });
  }
});

// Download a blank template for importing tables
router.get("/api/resy/locations/:locationId/tables/template", requireResyAdmin, async (req, res) => {
  try {
    const { locationId } = req.params;
    const location = await resyStorage.getLocation(locationId);
    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }
    
    // Create template with example data
    const templateData = [
      {
        table_label: 'T1',
        min_capacity: 2,
        max_capacity: 4,
        priority: 0,
        is_communal: 'No',
        is_active: 'Yes',
        is_paused: 'No',
        combinable_with: '',
      },
      {
        table_label: 'T2',
        min_capacity: 4,
        max_capacity: 6,
        priority: 1,
        is_communal: 'No',
        is_active: 'Yes',
        is_paused: 'No',
        combinable_with: 'T3',
      },
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tables');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=tables-template.xlsx');
    res.send(buffer);
  } catch (error: any) {
    console.error("Error generating template:", error);
    res.status(500).json({ message: "Failed to generate template: " + error.message });
  }
});

// Import tables from Excel file
router.post("/api/resy/locations/:locationId/tables/import", requireResyAdmin, tableUpload.single('file'), async (req, res) => {
  try {
    const { locationId } = req.params;
    const location = await resyStorage.getLocation(locationId);
    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet) as any[];
    
    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[],
    };
    
    // Get existing tables for this location
    const existingTables = await resyStorage.getLocationTablesByLocation(locationId);
    const existingLabels = new Map(existingTables.map(t => [t.tableLabel, t]));
    
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNum = i + 2; // Excel row number (1-indexed + header)
      
      try {
        const tableLabel = String(row.table_label || row.tableLabel || '').trim();
        if (!tableLabel) {
          results.errors.push(`Row ${rowNum}: Missing table_label`);
          continue;
        }
        
        if (tableLabel.length > 5) {
          results.errors.push(`Row ${rowNum}: Table label must be 5 characters or less`);
          continue;
        }
        
        const minCapacity = parseInt(row.min_capacity || row.minCapacity) || 1;
        const maxCapacity = parseInt(row.max_capacity || row.maxCapacity) || minCapacity;
        const priority = parseInt(row.priority) || 0;
        const isCommunal = String(row.is_communal || row.isCommunal || '').toLowerCase() === 'yes';
        const isActive = String(row.is_active || row.isActive || 'yes').toLowerCase() !== 'no';
        const isPaused = String(row.is_paused || row.isPaused || '').toLowerCase() === 'yes';
        
        // Parse combinable_with - comma-separated list of table labels
        const combinableWithStr = String(row.combinable_with || row.combinableWith || '').trim();
        const combinableWith = combinableWithStr 
          ? combinableWithStr.split(',').map(s => s.trim()).filter(s => s)
          : [];
        
        const tableData = {
          locationId,
          tableLabel,
          minCapacity,
          maxCapacity,
          priority,
          isCommunal,
          isActive,
          isPaused,
          combinableWith,
        };
        
        const existingTable = existingLabels.get(tableLabel);
        if (existingTable) {
          // Update existing table
          await resyStorage.updateLocationTable(existingTable.id, tableData);
          results.updated++;
        } else {
          // Create new table
          await resyStorage.createLocationTable(tableData);
          results.created++;
        }
      } catch (error: any) {
        results.errors.push(`Row ${rowNum}: ${error.message}`);
      }
    }
    
    // Invalidate cache
    res.json({
      success: results.errors.length === 0,
      created: results.created,
      updated: results.updated,
      errors: results.errors,
    });
  } catch (error: any) {
    console.error("Error importing tables:", error);
    res.status(500).json({ message: "Failed to import tables: " + error.message });
  }
});

router.get("/api/resy/locations/:locationId/available-times", async (req, res) => {
  try {
    const { locationId } = req.params;
    const { date, partySize, debug } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }
    
    const requestedSize = parseInt(partySize as string) || 2;
    
    // Step 1: Use new utility to check schedule (special dates, holidays, service periods)
    const schedule = await getNormalizedSchedule(locationId, date as string);
    
    // Debug logging
    if (debug === "true") {
      console.log(`[DEBUG available-times] locationId: ${locationId}, date: ${date}, partySize: ${requestedSize}`);
      console.log(`[DEBUG available-times] schedule:`, JSON.stringify(schedule, null, 2));
    }
    
    if (schedule.isClosed) {
      return res.json({ 
        availableTimes: [], 
        messages: { closedMessage: schedule.closureReason || "Location is closed on this day" },
        debug: debug === "true" ? { schedule } : undefined
      });
    }
    
    if (schedule.servicePeriods.length === 0) {
      return res.json({ 
        availableTimes: [], 
        messages: { closedMessage: "No service periods available for this day" },
        debug: debug === "true" ? { schedule } : undefined
      });
    }
    
    // Get the location to check for reservationCloseTime
    const location = await resyStorage.getLocation(locationId);
    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }
    
    // Parse reservation close time if set
    let closeTimeMinutes: number | null = null;
    if (location.reservationCloseTime) {
      closeTimeMinutes = timeToMinutes(location.reservationCloseTime);
    }
    
    // Get flow controls for capacity limits
    const flowControls = await resyStorage.getFlowControlsByLocation(locationId);
    
    // Generate time slots based on service periods
    const availableTimes: Array<{
      time: string;
      available: boolean;
      capacity?: number;
      mealPeriod?: string;
      tablesAvailable?: number;
    }> = [];
    
    for (const period of schedule.servicePeriods) {
      if (!period.startTime || !period.endTime) continue;
      
      // Parse times - use lastReservationTime if set, otherwise use endTime
      const openMinutes = timeToMinutes(period.startTime);
      let effectiveCloseMinutes = timeToMinutes(period.lastReservationTime || period.endTime);
      
      // Apply reservation close time if set - limits the latest slot time
      if (closeTimeMinutes !== null && closeTimeMinutes < effectiveCloseMinutes) {
        effectiveCloseMinutes = closeTimeMinutes;
      }
      
      // Get flow control for this meal period (or default)
      const flowControl = flowControls.find(fc => fc.mealPeriodId === period.periodId && fc.isActive);
      const intervalMinutes = Math.max(flowControl?.intervalMinutes ?? 30, 1);
      
      // Generate time slots
      let currentMinutes = openMinutes;
      
      while (currentMinutes < effectiveCloseMinutes && currentMinutes < 24 * 60) {
        const timeStr = minutesToTime(currentMinutes);
        
        // Step 2: Check flow capacity for this time slot
        const flowResult = await getRemainingCovers(locationId, date as string, timeStr, period.periodId);
        
        // Step 3: Get turn duration for party size
        const turnDuration = await getTurnDuration(locationId, period.periodId, requestedSize);
        
        // Step 4: Check table availability
        const availableTables = await getAvailableTables(
          locationId,
          date as string,
          timeStr,
          requestedSize,
          turnDuration
        );
        
        // A time is available if:
        // 1. Flow capacity allows it (remaining covers >= party size)
        // 2. At least one table is available
        const hasFlowCapacity = flowResult.remainingCovers >= requestedSize;
        const hasTableAvailable = availableTables.length > 0;
        
        availableTimes.push({
          time: timeStr,
          available: hasFlowCapacity && hasTableAvailable,
          capacity: flowResult.remainingCovers,
          mealPeriod: period.periodName,
          tablesAvailable: availableTables.length
        });
        
        // Advance by interval
        currentMinutes += intervalMinutes;
      }
    }
    
    res.json({ availableTimes, messages: {} });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch available times: " + error.message });
  }
});

router.post("/api/resy/location-tables", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyLocationTableSchema.parse(req.body);
    const table = await resyStorage.createLocationTable(validated);
    res.json(table);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create table: " + error.message });
  }
});

router.patch("/api/resy/location-tables/:id", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyLocationTableSchema.partial().parse(req.body);
    const table = await resyStorage.updateLocationTable(req.params.id, validated);
    if (!table) return res.status(404).json({ message: "Table not found" });
    res.json(table);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update table: " + error.message });
  }
});

router.patch("/api/resy/location-tables/:id/toggle-pause", requireResyAdmin, async (req, res) => {
  try {
    const table = await resyStorage.getLocationTable(req.params.id);
    if (!table) return res.status(404).json({ message: "Table not found" });
    
    const updatedTable = await resyStorage.updateLocationTable(req.params.id, {
      isPaused: !table.isPaused
    });
    res.json(updatedTable);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to toggle table pause: " + error.message });
  }
});

router.delete("/api/resy/location-tables/:id", requireResyAdmin, async (req, res) => {
  try {
    await resyStorage.deleteLocationTable(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete table: " + error.message });
  }
});

router.get("/api/resy/private-events", async (req, res) => {
  try {
    const events = await resyStorage.getAllPrivateEvents();
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch private events: " + error.message });
  }
});

router.post("/api/resy/private-events", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyPrivateEventSchema.parse(req.body);
    const event = await resyStorage.createPrivateEvent(validated);
    res.json(event);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create private event: " + error.message });
  }
});

router.patch("/api/resy/private-events/:id", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyPrivateEventSchema.partial().parse(req.body);
    const event = await resyStorage.updatePrivateEvent(req.params.id, validated);
    if (!event) return res.status(404).json({ message: "Private event not found" });
    res.json(event);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update private event: " + error.message });
  }
});

router.delete("/api/resy/private-events/:id", requireResyAdmin, async (req, res) => {
  try {
    await resyStorage.deletePrivateEvent(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete private event: " + error.message });
  }
});

// Ticketed Event Definitions Routes
router.get("/api/resy/ticketed-events", async (req, res) => {
  try {
    const locationId = req.query.locationId as string | undefined;
    const definitions = await resyStorage.getTicketedEventDefinitions(locationId);
    res.json(definitions);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch ticketed events: " + error.message });
  }
});

router.get("/api/resy/ticketed-events/:id", async (req, res) => {
  try {
    const definition = await resyStorage.getTicketedEventDefinition(req.params.id);
    if (!definition) return res.status(404).json({ message: "Ticketed event not found" });
    res.json(definition);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch ticketed event: " + error.message });
  }
});

router.post("/api/resy/ticketed-events", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyTicketedEventDefinitionSchema.parse(req.body);
    const definition = await resyStorage.createTicketedEventDefinition(validated);
    res.json(definition);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create ticketed event: " + error.message });
  }
});

router.patch("/api/resy/ticketed-events/:id", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyTicketedEventDefinitionSchema.partial().parse(req.body);
    const definition = await resyStorage.updateTicketedEventDefinition(req.params.id, validated);
    if (!definition) return res.status(404).json({ message: "Ticketed event not found" });
    res.json(definition);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update ticketed event: " + error.message });
  }
});

router.delete("/api/resy/ticketed-events/:id", requireResyAdmin, async (req, res) => {
  try {
    await resyStorage.deleteTicketedEventDefinition(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete ticketed event: " + error.message });
  }
});

// Ticketed Event Timeslots Routes
router.get("/api/resy/ticketed-events/:definitionId/timeslots", async (req, res) => {
  try {
    const timeslots = await resyStorage.getTicketedEventTimeslots(req.params.definitionId);
    res.json(timeslots);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch timeslots: " + error.message });
  }
});

router.post("/api/resy/ticketed-events/:definitionId/timeslots", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyTicketedEventTimeslotSchema.parse({
      ...req.body,
      definitionId: req.params.definitionId
    });
    const timeslot = await resyStorage.createTicketedEventTimeslot(validated);
    res.json(timeslot);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create timeslot: " + error.message });
  }
});

// Delete all timeslots for a ticketed event definition
router.delete("/api/resy/ticketed-events/:definitionId/timeslots", requireResyAdmin, async (req, res) => {
  try {
    await resyStorage.deleteTicketedEventTimeslotsByDefinition(req.params.definitionId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete timeslots: " + error.message });
  }
});

router.patch("/api/resy/ticketed-event-timeslots/:id", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyTicketedEventTimeslotSchema.partial().parse(req.body);
    const timeslot = await resyStorage.updateTicketedEventTimeslot(req.params.id, validated);
    if (!timeslot) return res.status(404).json({ message: "Timeslot not found" });
    res.json(timeslot);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update timeslot: " + error.message });
  }
});

router.delete("/api/resy/ticketed-event-timeslots/:id", requireResyAdmin, async (req, res) => {
  try {
    await resyStorage.deleteTicketedEventTimeslot(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete timeslot: " + error.message });
  }
});

router.get("/api/resy/special-dates", async (req, res) => {
  try {
    const { locationId } = req.query;
    if (locationId && typeof locationId === 'string') {
      const dates = await resyStorage.getSpecialDatesByLocation(locationId);
      res.json(dates);
    } else {
      const dates = await resyStorage.getAllSpecialDates();
      res.json(dates);
    }
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch special dates: " + error.message });
  }
});

router.post("/api/resy/special-dates", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResySpecialDateSchema.parse(req.body);
    const date = await resyStorage.createSpecialDate(validated);
    res.json(date);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create special date: " + error.message });
  }
});

router.patch("/api/resy/special-dates/:id", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResySpecialDateSchema.partial().parse(req.body);
    const date = await resyStorage.updateSpecialDate(req.params.id, validated);
    if (!date) return res.status(404).json({ message: "Special date not found" });
    res.json(date);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update special date: " + error.message });
  }
});

router.delete("/api/resy/special-dates/:id", requireResyAdmin, async (req, res) => {
  try {
    await resyStorage.deleteSpecialDate(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete special date: " + error.message });
  }
});

router.get("/api/resy/location-holidays", async (req, res) => {
  try {
    const locationId = req.query.locationId as string | undefined;
    const holidays = await resyStorage.getLocationHolidays(locationId);
    res.json(holidays);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch location holidays: " + error.message });
  }
});

router.post("/api/resy/location-holidays", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyLocationHolidaySchema.parse(req.body);
    const holiday = await resyStorage.setLocationHoliday(validated);
    res.json(holiday);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to set location holiday: " + error.message });
  }
});

router.delete("/api/resy/location-holidays/:locationId/:holidayKey", requireResyAdmin, async (req, res) => {
  try {
    await resyStorage.deleteLocationHoliday(req.params.locationId, req.params.holidayKey);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete location holiday: " + error.message });
  }
});

router.get("/api/resy/clubs", async (req, res) => {
  try {
    const clubs = await resyStorage.getClubs();
    res.json(clubs);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch clubs: " + error.message });
  }
});

router.get("/api/resy/clubs/:id", async (req, res) => {
  try {
    const club = await resyStorage.getClub(req.params.id);
    if (!club) return res.status(404).json({ message: "Club not found" });
    res.json(club);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch club: " + error.message });
  }
});

router.post("/api/resy/clubs", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyClubSchema.parse(req.body);
    const club = await resyStorage.createClub(validated);
    res.json(club);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create club: " + error.message });
  }
});

router.patch("/api/resy/clubs/:id", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyClubSchema.partial().parse(req.body);
    const club = await resyStorage.updateClub(req.params.id, validated);
    if (!club) return res.status(404).json({ message: "Club not found" });
    res.json(club);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update club: " + error.message });
  }
});

router.delete("/api/resy/clubs/:id", requireResyAdmin, async (req, res) => {
  try {
    await resyStorage.deleteClub(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete club: " + error.message });
  }
});

router.get("/api/resy/club-experience-discounts", async (req, res) => {
  try {
    const discounts = await resyStorage.getAllClubExperienceDiscounts();
    res.json(discounts);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch club discounts: " + error.message });
  }
});

router.post("/api/resy/club-experience-discounts", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyClubExperienceDiscountSchema.parse(req.body);
    const discount = await resyStorage.createClubExperienceDiscount(validated);
    res.json(discount);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create club discount: " + error.message });
  }
});

router.patch("/api/resy/club-experience-discounts/:id", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyClubExperienceDiscountSchema.partial().parse(req.body);
    const discount = await resyStorage.updateClubExperienceDiscount(req.params.id, validated);
    if (!discount) return res.status(404).json({ message: "Club discount not found" });
    res.json(discount);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update club discount: " + error.message });
  }
});

router.delete("/api/resy/club-experience-discounts/:id", requireResyAdmin, async (req, res) => {
  try {
    await resyStorage.deleteClubExperienceDiscount(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete club discount: " + error.message });
  }
});

router.get("/api/resy/experience-discounts", async (req, res) => {
  try {
    const discounts = await resyStorage.getAllDiscounts();
    res.json(discounts);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch discounts: " + error.message });
  }
});

router.post("/api/resy/experience-discounts", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyExperienceDiscountSchema.parse(req.body);
    const discount = await resyStorage.createDiscount(validated);
    res.json(discount);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create discount: " + error.message });
  }
});

router.patch("/api/resy/experience-discounts/:id", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyExperienceDiscountSchema.partial().parse(req.body);
    const discount = await resyStorage.updateDiscount(req.params.id, validated);
    if (!discount) return res.status(404).json({ message: "Discount not found" });
    res.json(discount);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update discount: " + error.message });
  }
});

router.delete("/api/resy/experience-discounts/:id", requireResyAdmin, async (req, res) => {
  try {
    await resyStorage.deleteDiscount(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete discount: " + error.message });
  }
});

router.get("/api/resy/footer-links", async (req, res) => {
  try {
    const links = await resyStorage.getFooterLinks();
    res.json(links);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch footer links: " + error.message });
  }
});

router.post("/api/resy/footer-links", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyFooterLinkSchema.parse(req.body);
    const link = await resyStorage.createFooterLink(validated);
    res.json(link);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create footer link: " + error.message });
  }
});

router.patch("/api/resy/footer-links/:id", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyFooterLinkSchema.partial().parse(req.body);
    const link = await resyStorage.updateFooterLink(req.params.id, validated);
    if (!link) return res.status(404).json({ message: "Footer link not found" });
    res.json(link);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update footer link: " + error.message });
  }
});

router.delete("/api/resy/footer-links/:id", requireResyAdmin, async (req, res) => {
  try {
    await resyStorage.deleteFooterLink(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete footer link: " + error.message });
  }
});

router.get("/api/resy/users", requireResyAdmin, async (req, res) => {
  try {
    const users = await resyStorage.getAllUsers();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch users: " + error.message });
  }
});

router.put("/api/resy/users/:id/role", requireResyAdmin, async (req, res) => {
  try {
    const { role, isActive } = req.body;
    const user = await resyStorage.updateUserRole(req.params.id, role, isActive);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update user role: " + error.message });
  }
});

router.get("/api/resy/time-slots/:experienceId", async (req, res) => {
  try {
    const slots = await resyStorage.getTimeSlotsByExperience(req.params.experienceId);
    res.json(slots);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch time slots: " + error.message });
  }
});

router.post("/api/resy/time-slots", requireResyAdmin, async (req, res) => {
  try {
    const slot = await resyStorage.createTimeSlot(req.body);
    res.json(slot);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create time slot: " + error.message });
  }
});

router.delete("/api/resy/time-slots/:id", requireResyAdmin, async (req, res) => {
  try {
    await resyStorage.deleteTimeSlot(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete time slot: " + error.message });
  }
});

// Timeslot availability endpoint - check how many spots are available for a specific slot on a date
router.get("/api/timeslots/:id/availability", async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;
    
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ message: "Date query parameter is required" });
    }
    
    // Try to get the timeslot from ticketed events first, then fall back to legacy
    let capacity = 20;
    
    // Check ticketed event timeslots first
    const ticketedTimeslot = await resyStorage.getTicketedEventTimeslot(id);
    if (ticketedTimeslot) {
      capacity = ticketedTimeslot.capacity || 20;
    } else {
      // Fall back to legacy timeslots table
      const timeSlot = await resyStorage.getTimeSlot(id);
      if (!timeSlot) {
        return res.status(404).json({ message: "Timeslot not found" });
      }
      capacity = timeSlot.capacity || 20;
    }
    
    // Count existing reservations for this slot on this date
    const reservations = await resyStorage.getReservations();
    const bookedCount = reservations.filter(r => 
      r.timeSlotId === id && 
      r.reservationDate === date &&
      r.status !== 'cancelled'
    ).reduce((sum, r) => sum + (r.ticketQuantity || 1), 0);
    
    const available = Math.max(0, capacity - bookedCount);
    
    res.json({
      capacity,
      booked: bookedCount,
      available
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch availability: " + error.message });
  }
});

router.get("/api/resy/site-settings", async (req, res) => {
  try {
    const settings = await resyStorage.getSiteSettings();
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch site settings: " + error.message });
  }
});

router.put("/api/resy/site-settings/:key", requireResyAdmin, async (req, res) => {
  try {
    const { value } = req.body;
    await resyStorage.updateSiteSetting(req.params.key, value);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update site setting: " + error.message });
  }
});

// Admin endpoint to manually trigger reminder emails (for testing)
router.post("/api/resy/send-reminders", requireResyAdmin, async (req, res) => {
  try {
    const result = await sendDailyReminders();
    res.json({ 
      message: `Reminder emails processed`, 
      sent: result.sent, 
      errors: result.errors, 
      total: result.total 
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to send reminders: " + error.message });
  }
});

// ============================================================================
// RESERVATION AVAILABILITY SYSTEM
// Comprehensive availability checking with flow control, turn times, and table assignment
// ============================================================================

interface TimeWindow {
  start: string; // HH:MM format
  end: string;   // HH:MM format
}

interface AvailableTable {
  tableId: string;
  tableLabel: string;
  priority: number;
  minCapacity: number;
  maxCapacity: number;
  isCommunal: boolean;
}

interface AvailabilitySlot {
  time: string;
  periodId: string | null;
  periodName: string | null;
  status: "available" | "limited" | "full" | "closed";
  remainingCovers: number;
  maxCovers: number;
  turnDuration: number;
  availableTables: AvailableTable[];
  reason?: string;
}

// Convert time string to minutes since midnight
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Convert minutes since midnight to time string
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Check if two time windows overlap (half-open intervals [start, end))
function windowsOverlap(window1: TimeWindow, window2: TimeWindow): boolean {
  const start1 = timeToMinutes(window1.start);
  const end1 = timeToMinutes(window1.end);
  const start2 = timeToMinutes(window2.start);
  const end2 = timeToMinutes(window2.end);
  return start1 < end2 && end1 > start2;
}

// UTILITY 1: Special Date & Period Normalizer
async function getNormalizedSchedule(
  locationId: string,
  date: string // YYYY-MM-DD format
): Promise<{
  isClosed: boolean;
  closureReason?: string;
  servicePeriods: Array<{
    periodId: string;
    periodName: string;
    startTime: string;
    endTime: string;
    lastReservationTime: string | null;
    daysAvailable: number[];
  }>;
}> {
  // Parse date components directly to avoid UTC timezone shift
  // new Date('2025-12-13') is parsed as UTC midnight, which shifts day-of-week for US timezones
  const [year, month, day] = date.split('-').map(Number);
  const dayOfWeek = new Date(year, month - 1, day).getDay();
  
  // Check for special dates (closures or modified hours)
  const specialDates = await db.select()
    .from(resySpecialDates)
    .where(and(
      eq(resySpecialDates.locationId, locationId),
      eq(resySpecialDates.date, date)
    ));
  
  if (specialDates.length > 0) {
    const specialDate = specialDates[0];
    if (specialDate.isClosed) {
      return {
        isClosed: true,
        closureReason: specialDate.description || specialDate.name || "Closed for special event",
        servicePeriods: []
      };
    }
  }
  
  // Check for location holidays - holidays use holidayKey, need to resolve to date
  const locationHolidays = await db.select()
    .from(resyLocationHolidays)
    .where(eq(resyLocationHolidays.locationId, locationId));
  
  // Import RECURRING_HOLIDAYS to check if this date matches any holiday
  const { RECURRING_HOLIDAYS } = await import("@shared/schema");
  // Reuse year from date parsing above (line 2167)
  
  for (const locHoliday of locationHolidays) {
    if (locHoliday.isClosed) {
      const holidayDef = RECURRING_HOLIDAYS.find(h => h.key === locHoliday.holidayKey);
      if (holidayDef) {
        const holidayDate = holidayDef.getDate(year);
        if (holidayDate === date) {
          return {
            isClosed: true,
            closureReason: `Closed for ${holidayDef.name}`,
            servicePeriods: []
          };
        }
      }
    }
  }
  
  // Check operating hours for this day to see if location is open
  const operatingHours = await db.select()
    .from(resyOperatingHours)
    .where(and(
      eq(resyOperatingHours.locationId, locationId),
      eq(resyOperatingHours.dayOfWeek, dayOfWeek)
    ));
  
  // If there are operating hours and they're all closed, location is closed
  if (operatingHours.length > 0) {
    const allClosed = operatingHours.every(oh => oh.isClosed || !oh.isOpen);
    if (allClosed) {
      return {
        isClosed: true,
        closureReason: "Location is closed on this day",
        servicePeriods: []
      };
    }
  }
  
  // Get meal periods for this location that are active on this day
  const mealPeriods = await db.select()
    .from(resyMealPeriods)
    .where(and(
      eq(resyMealPeriods.locationId, locationId),
      eq(resyMealPeriods.isActive, true)
    ));
  
  // Filter meal periods that include this day of week
  const todaysPeriods = mealPeriods.filter(mp => {
    const days = mp.daysAvailable as number[] | null;
    return days && days.includes(dayOfWeek);
  });
  
  if (todaysPeriods.length === 0) {
    return {
      isClosed: true,
      closureReason: "No service periods available for this day",
      servicePeriods: []
    };
  }
  
  const servicePeriods = todaysPeriods.map(mp => ({
    periodId: mp.id,
    periodName: mp.name,
    startTime: mp.startTime,
    endTime: mp.endTime,
    lastReservationTime: mp.lastReservationTime || null,
    daysAvailable: (mp.daysAvailable as number[]) || []
  }));
  
  // Sort by start time
  servicePeriods.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  
  return {
    isClosed: false,
    servicePeriods
  };
}

// UTILITY 2: Flow Capacity Evaluator
async function getRemainingCovers(
  locationId: string,
  date: string,
  time: string,
  mealPeriodId: string | null
): Promise<{
  maxCovers: number;
  usedCovers: number;
  remainingCovers: number;
  flowMode: string;
}> {
  // Get flow control for this location/period
  const flowControls = await db.select()
    .from(resyFlowControls)
    .where(and(
      eq(resyFlowControls.locationId, locationId),
      eq(resyFlowControls.isActive, true)
    ));
  
  // Find the most specific flow control (period-specific or global)
  let flowControl = flowControls.find(fc => fc.mealPeriodId === mealPeriodId);
  if (!flowControl) {
    flowControl = flowControls.find(fc => fc.mealPeriodId === null);
  }
  
  if (!flowControl) {
    // No flow control configured - use defaults
    return {
      maxCovers: 999,
      usedCovers: 0,
      remainingCovers: 999,
      flowMode: "none"
    };
  }
  
  // Determine max covers for this time slot
  let maxCovers = flowControl.maxCoversPerInterval || 20;
  
  if (flowControl.flowMode === "controlled" && flowControl.intervalOverrides) {
    const overrides = flowControl.intervalOverrides as Array<{time: string, maxCovers: number}>;
    const override = overrides.find(o => o.time === time);
    if (override) {
      maxCovers = override.maxCovers;
    }
  }
  
  // Count existing reservations in this interval
  const intervalMinutes = flowControl.intervalMinutes || 15;
  const timeMinutes = timeToMinutes(time);
  const intervalStart = minutesToTime(Math.floor(timeMinutes / intervalMinutes) * intervalMinutes);
  const intervalEnd = minutesToTime(Math.floor(timeMinutes / intervalMinutes) * intervalMinutes + intervalMinutes);
  
  const reservations = await db.select()
    .from(resyReservations)
    .where(and(
      eq(resyReservations.locationId, locationId),
      eq(resyReservations.reservationDate, date),
      not(eq(resyReservations.status, "cancelled"))
    ));
  
  // Count covers in this interval
  const usedCovers = reservations
    .filter(r => {
      const resTime = timeToMinutes(r.reservationTime);
      const intStart = timeToMinutes(intervalStart);
      const intEnd = timeToMinutes(intervalEnd);
      return resTime >= intStart && resTime < intEnd;
    })
    .reduce((sum, r) => sum + r.partySize, 0);
  
  return {
    maxCovers,
    usedCovers,
    remainingCovers: Math.max(0, maxCovers - usedCovers),
    flowMode: flowControl.flowMode || "global"
  };
}

// UTILITY 3: Turn Time Resolver
async function getTurnDuration(
  locationId: string,
  mealPeriodId: string | null,
  partySize: number
): Promise<number> {
  // Get turn time settings for this location
  const turnTimeSettings = await db.select()
    .from(resyTurnTimeSettings)
    .where(and(
      eq(resyTurnTimeSettings.locationId, locationId),
      eq(resyTurnTimeSettings.isActive, true)
    ));
  
  // Filter by meal period if specified
  let candidates = mealPeriodId 
    ? turnTimeSettings.filter(tt => tt.mealPeriodId === mealPeriodId)
    : turnTimeSettings;
  
  // If no period-specific settings, use all
  if (candidates.length === 0) {
    candidates = turnTimeSettings;
  }
  
  // Find the matching turn time for this party size
  const match = candidates.find(tt => 
    partySize >= tt.minPartySize && partySize <= tt.maxPartySize
  );
  
  if (match) {
    return match.durationMinutes;
  }
  
  // Default turn time if no match found
  return 90; // 90 minutes default
}

// Helper: Generate combinations of size k from array (for table combinations)
function generateTableCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  if (k > arr.length) return [];
  
  const [first, ...rest] = arr;
  const withFirst = generateTableCombinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = generateTableCombinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

// UTILITY 4: Table Availability Engine (with combination support)
async function getAvailableTables(
  locationId: string,
  date: string,
  time: string,
  partySize: number,
  turnDuration: number,
  excludeReservationId?: string
): Promise<AvailableTable[]> {
  // Get all active tables for this location
  const tables = await db.select()
    .from(resyLocationTables)
    .where(and(
      eq(resyLocationTables.locationId, locationId),
      eq(resyLocationTables.isActive, true),
      eq(resyLocationTables.isPaused, false)
    ));
  
  // Get existing reservations for this date to check conflicts
  // Optionally exclude a specific reservation (for reschedule scenarios)
  let reservations = await db.select()
    .from(resyReservations)
    .where(and(
      eq(resyReservations.locationId, locationId),
      eq(resyReservations.reservationDate, date),
      not(eq(resyReservations.status, "cancelled"))
    ));
  
  // Exclude the reservation being rescheduled from conflict checks
  if (excludeReservationId) {
    reservations = reservations.filter(r => r.id !== excludeReservationId);
  }
  
  // Calculate the requested time window
  const requestedWindow: TimeWindow = {
    start: time,
    end: minutesToTime(timeToMinutes(time) + turnDuration)
  };
  
  // Helper to infer which tables a reservation would use based on party size
  // Returns list of table IDs that would be needed
  const inferTablesForReservation = (resPartySize: number): string[] => {
    // First try to find a single table that fits
    const singleTableMatch = tables.find(t => 
      resPartySize >= t.minCapacity && resPartySize <= t.maxCapacity
    );
    if (singleTableMatch) {
      return [singleTableMatch.id];
    }
    
    // If no single table, look for the smallest combination that fits
    const sortedTables = [...tables].sort((a, b) => b.maxCapacity - a.maxCapacity);
    for (const primaryTable of sortedTables) {
      const combinableWith = (primaryTable.combinableWith as string[]) || [];
      if (combinableWith.length === 0) continue;
      
      for (const comboId of combinableWith) {
        const comboTable = tables.find(t => t.id === comboId);
        if (comboTable) {
          const totalCapacity = primaryTable.maxCapacity + comboTable.maxCapacity;
          const totalMinCapacity = primaryTable.minCapacity + comboTable.minCapacity;
          if (resPartySize <= totalCapacity && resPartySize >= totalMinCapacity) {
            return [primaryTable.id, comboTable.id];
          }
        }
      }
    }
    
    return [];
  };
  
  // Helper to check if a table has conflicts
  const tableHasConflict = (tableId: string): boolean => {
    return reservations.some(r => {
      // Check both assignedTableId and tableId, and also check comma-separated combined tables
      const assignedIds = (r.assignedTableId || '').split(',').filter(Boolean);
      let isAssignedToTable = assignedIds.includes(tableId) || r.tableId === tableId;
      
      // If reservation has no assigned table, infer which table(s) it would need
      // This handles legacy reservations created before table assignment was implemented
      if (!r.assignedTableId && !r.tableId && r.partySize) {
        const inferredTables = inferTablesForReservation(r.partySize);
        isAssignedToTable = inferredTables.includes(tableId);
      }
      
      if (!isAssignedToTable) return false;
      
      const resStart = r.holdStart || r.reservationTime;
      const resEnd = r.holdEnd || minutesToTime(
        timeToMinutes(r.reservationTime) + (r.turnDuration || 90)
      );
      
      const resWindow: TimeWindow = { start: resStart, end: resEnd };
      return windowsOverlap(requestedWindow, resWindow);
    });
  };
  
  // Get all available tables (no conflicts)
  const availableTablesAtTime = tables.filter(t => !tableHasConflict(t.id));
  
  // First, try to find single tables that can accommodate the party
  const singleTableMatches = availableTablesAtTime.filter(t => 
    partySize >= t.minCapacity && partySize <= t.maxCapacity
  );
  
  const result: AvailableTable[] = [];
  
  for (const table of singleTableMatches) {
    result.push({
      tableId: table.id,
      tableLabel: table.tableLabel,
      priority: table.priority,
      minCapacity: table.minCapacity,
      maxCapacity: table.maxCapacity,
      isCommunal: table.isCommunal
    });
  }
  
  // If no single table fits, look for table combinations
  if (result.length === 0) {
    const availableTableIds = new Set(availableTablesAtTime.map(t => t.id));
    const availableTableMap = new Map(availableTablesAtTime.map(t => [t.id, t]));
    
    const foundCombinations: Array<{
      tables: typeof tables;
      totalCapacity: number;
      priority: number;
    }> = [];
    
    // For each available table, check if it can be combined with others
    for (const primaryTable of availableTablesAtTime) {
      const combinableWith = (primaryTable.combinableWith as string[]) || [];
      if (combinableWith.length === 0) continue;
      
      // Get all combinable tables that are also available
      const availableCombinableTables = combinableWith
        .filter(id => availableTableIds.has(id))
        .map(id => availableTableMap.get(id)!)
        .filter(Boolean);
      
      if (availableCombinableTables.length === 0) continue;
      
      // Generate all subsets that include primaryTable
      for (let size = 2; size <= availableCombinableTables.length + 1; size++) {
        const combinations = generateTableCombinations(availableCombinableTables, size - 1);
        
        for (const combo of combinations) {
          const fullCombo = [primaryTable, ...combo];
          const totalCapacity = fullCombo.reduce((sum, t) => sum + t.maxCapacity, 0);
          const totalMinCapacity = fullCombo.reduce((sum, t) => sum + t.minCapacity, 0);
          
          // Check if this combination can fit the party
          if (partySize <= totalCapacity && partySize >= totalMinCapacity) {
            const avgPriority = Math.round(
              fullCombo.reduce((sum, t) => sum + t.priority, 0) / fullCombo.length
            );
            
            foundCombinations.push({
              tables: fullCombo,
              totalCapacity,
              priority: avgPriority
            });
          }
        }
      }
    }
    
    // Deduplicate combinations
    const seenCombos = new Set<string>();
    const uniqueCombinations = foundCombinations.filter(combo => {
      const key = combo.tables.map(t => t.id).sort().join(',');
      if (seenCombos.has(key)) return false;
      seenCombos.add(key);
      return true;
    });
    
    // Sort by priority, then by total capacity
    uniqueCombinations.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.totalCapacity - b.totalCapacity;
    });
    
    // Add best combination as the available option
    if (uniqueCombinations.length > 0) {
      const best = uniqueCombinations[0];
      const labels = best.tables.map(t => t.tableLabel).join('+');
      const tableIds = best.tables.map(t => t.id).join(',');
      
      result.push({
        tableId: tableIds,
        tableLabel: labels,
        priority: best.priority,
        minCapacity: best.tables.reduce((sum, t) => sum + t.minCapacity, 0),
        maxCapacity: best.totalCapacity,
        isCommunal: false
      });
    }
  }
  
  // Sort by priority, then by minCapacity
  result.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.minCapacity - b.minCapacity;
  });
  
  return result;
}

// MAIN AVAILABILITY ENDPOINT - OPTIMIZED with batched queries
router.get("/api/resy/locations/:locationId/availability", async (req, res) => {
  try {
    const { locationId } = req.params;
    const { date, partySize } = req.query;
    
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ message: "Date query parameter is required (YYYY-MM-DD)" });
    }
    
    const party = parseInt(partySize as string) || 2;
    
    // Step 1: Get normalized schedule (special dates + service periods)
    const schedule = await getNormalizedSchedule(locationId, date);
    
    if (schedule.isClosed) {
      return res.json({
        date,
        locationId,
        partySize: party,
        isClosed: true,
        closureReason: schedule.closureReason,
        servicePeriods: [],
        slots: []
      });
    }
    
    // OPTIMIZATION: Batch all database queries upfront (4 parallel queries instead of 5 per slot)
    const [allTables, allReservations, allFlowControls, allTurnTimes] = await Promise.all([
      db.select()
        .from(resyLocationTables)
        .where(and(
          eq(resyLocationTables.locationId, locationId),
          eq(resyLocationTables.isActive, true),
          eq(resyLocationTables.isPaused, false)
        )),
      db.select()
        .from(resyReservations)
        .where(and(
          eq(resyReservations.locationId, locationId),
          eq(resyReservations.reservationDate, date as string),
          not(eq(resyReservations.status, "cancelled"))
        )),
      db.select()
        .from(resyFlowControls)
        .where(and(
          eq(resyFlowControls.locationId, locationId),
          eq(resyFlowControls.isActive, true)
        )),
      db.select()
        .from(resyTurnTimeSettings)
        .where(and(
          eq(resyTurnTimeSettings.locationId, locationId),
          eq(resyTurnTimeSettings.isActive, true)
        ))
    ]);
    
    // Helper to infer which tables a reservation would use based on party size
    const inferTablesForReservation = (resPartySize: number): string[] => {
      // First try to find a single table that fits
      const singleTableMatch = allTables.find(t => 
        resPartySize >= t.minCapacity && resPartySize <= t.maxCapacity
      );
      if (singleTableMatch) {
        return [singleTableMatch.id];
      }
      
      // If no single table, look for the smallest combination that fits
      const sortedTables = [...allTables].sort((a, b) => b.maxCapacity - a.maxCapacity);
      for (const primaryTable of sortedTables) {
        const combinableWith = (primaryTable.combinableWith as string[]) || [];
        if (combinableWith.length === 0) continue;
        
        for (const comboId of combinableWith) {
          const comboTable = allTables.find(t => t.id === comboId);
          if (comboTable) {
            const totalCapacity = primaryTable.maxCapacity + comboTable.maxCapacity;
            const totalMinCapacity = primaryTable.minCapacity + comboTable.minCapacity;
            if (resPartySize <= totalCapacity && resPartySize >= totalMinCapacity) {
              return [primaryTable.id, comboTable.id];
            }
          }
        }
      }
      
      return [];
    };
    
    // Helper: Check if a table has conflicts during a time window
    const tableHasConflict = (tableId: string, requestedWindow: TimeWindow): boolean => {
      return allReservations.some(r => {
        // Check both assignedTableId and tableId, and also check comma-separated combined tables
        const assignedIds = (r.assignedTableId || '').split(',').filter(Boolean);
        let isAssignedToTable = assignedIds.includes(tableId) || r.tableId === tableId;
        
        // If reservation has no assigned table, infer which table(s) it would need
        // This handles legacy reservations created before table assignment was implemented
        if (!r.assignedTableId && !r.tableId && r.partySize) {
          const inferredTables = inferTablesForReservation(r.partySize);
          isAssignedToTable = inferredTables.includes(tableId);
        }
        
        if (!isAssignedToTable) return false;
        
        const resStart = r.holdStart || r.reservationTime;
        const resEnd = r.holdEnd || minutesToTime(
          timeToMinutes(r.reservationTime) + (r.turnDuration || 90)
        );
        
        const resWindow: TimeWindow = { start: resStart, end: resEnd };
        return windowsOverlap(requestedWindow, resWindow);
      });
    };
    
    // Helper: Get turn duration (in-memory)
    const getTurnDurationFast = (mealPeriodId: string | null): number => {
      let candidates = mealPeriodId 
        ? allTurnTimes.filter(tt => tt.mealPeriodId === mealPeriodId)
        : allTurnTimes;
      
      if (candidates.length === 0) {
        candidates = allTurnTimes;
      }
      
      const match = candidates.find(tt => 
        party >= tt.minPartySize && party <= tt.maxPartySize
      );
      
      return match ? match.durationMinutes : 90;
    };
    
    // Helper: Get remaining covers (in-memory)
    const getRemainingCoversFast = (time: string, mealPeriodId: string | null): {
      maxCovers: number;
      usedCovers: number;
      remainingCovers: number;
      flowMode: string;
    } => {
      let flowControl = allFlowControls.find(fc => fc.mealPeriodId === mealPeriodId);
      if (!flowControl) {
        flowControl = allFlowControls.find(fc => fc.mealPeriodId === null);
      }
      
      if (!flowControl) {
        return { maxCovers: 999, usedCovers: 0, remainingCovers: 999, flowMode: "none" };
      }
      
      let maxCovers = flowControl.maxCoversPerInterval || 20;
      
      if (flowControl.flowMode === "controlled" && flowControl.intervalOverrides) {
        const overrides = flowControl.intervalOverrides as Array<{time: string, maxCovers: number}>;
        const override = overrides.find(o => o.time === time);
        if (override) {
          maxCovers = override.maxCovers;
        }
      }
      
      const intervalMinutes = flowControl.intervalMinutes || 15;
      const timeMinutes = timeToMinutes(time);
      const intervalStart = minutesToTime(Math.floor(timeMinutes / intervalMinutes) * intervalMinutes);
      const intervalEnd = minutesToTime(Math.floor(timeMinutes / intervalMinutes) * intervalMinutes + intervalMinutes);
      
      const usedCovers = allReservations
        .filter(r => {
          const resTime = timeToMinutes(r.reservationTime);
          const intStart = timeToMinutes(intervalStart);
          const intEnd = timeToMinutes(intervalEnd);
          return resTime >= intStart && resTime < intEnd;
        })
        .reduce((sum, r) => sum + r.partySize, 0);
      
      return {
        maxCovers,
        usedCovers,
        remainingCovers: Math.max(0, maxCovers - usedCovers),
        flowMode: flowControl.flowMode || "global"
      };
    };
    
    // Helper: Get available tables with combination support (in-memory)
    const getAvailableTablesFast = (time: string, turnDuration: number): AvailableTable[] => {
      const requestedWindow: TimeWindow = {
        start: time,
        end: minutesToTime(timeToMinutes(time) + turnDuration)
      };
      
      // Get all tables that are available (no conflicts) at this time
      const availableTablesAtTime = allTables.filter(table => 
        !tableHasConflict(table.id, requestedWindow)
      );
      
      const result: AvailableTable[] = [];
      
      // First, try to find single tables that can accommodate the party
      const singleTableMatches = availableTablesAtTime.filter(t => 
        party >= t.minCapacity && party <= t.maxCapacity
      );
      
      for (const table of singleTableMatches) {
        result.push({
          tableId: table.id,
          tableLabel: table.tableLabel,
          priority: table.priority,
          minCapacity: table.minCapacity,
          maxCapacity: table.maxCapacity,
          isCommunal: table.isCommunal
        });
      }
      
      // If no single table fits, look for table combinations
      if (result.length === 0) {
        // Build a map of available table IDs for quick lookup
        const availableTableIds = new Set(availableTablesAtTime.map(t => t.id));
        const availableTableMap = new Map(availableTablesAtTime.map(t => [t.id, t]));
        
        // Find valid combinations using combinableWith field
        const foundCombinations: Array<{
          tables: typeof allTables;
          totalCapacity: number;
          priority: number;
        }> = [];
        
        // For each available table, check if it can be combined with others
        for (const primaryTable of availableTablesAtTime) {
          const combinableWith = (primaryTable.combinableWith as string[]) || [];
          if (combinableWith.length === 0) continue;
          
          // Get all combinable tables that are also available
          const availableCombinableTables = combinableWith
            .filter(id => availableTableIds.has(id))
            .map(id => availableTableMap.get(id)!)
            .filter(Boolean);
          
          if (availableCombinableTables.length === 0) continue;
          
          // Try combinations starting with primaryTable
          // Start with just primary + one other, then add more if needed
          const tablesInGroup = [primaryTable, ...availableCombinableTables];
          
          // Generate all subsets that include primaryTable
          for (let size = 2; size <= tablesInGroup.length; size++) {
            // Generate combinations of 'size' tables that include primaryTable
            const combinations = generateCombinations(availableCombinableTables, size - 1);
            
            for (const combo of combinations) {
              const fullCombo = [primaryTable, ...combo];
              const totalCapacity = fullCombo.reduce((sum, t) => sum + t.maxCapacity, 0);
              const totalMinCapacity = fullCombo.reduce((sum, t) => sum + t.minCapacity, 0);
              
              // Check if this combination can fit the party
              if (party <= totalCapacity && party >= totalMinCapacity) {
                // Calculate combined priority (average)
                const avgPriority = Math.round(
                  fullCombo.reduce((sum, t) => sum + t.priority, 0) / fullCombo.length
                );
                
                foundCombinations.push({
                  tables: fullCombo,
                  totalCapacity,
                  priority: avgPriority
                });
              }
            }
          }
        }
        
        // Deduplicate combinations (same set of table IDs)
        const seenCombos = new Set<string>();
        const uniqueCombinations = foundCombinations.filter(combo => {
          const key = combo.tables.map(t => t.id).sort().join(',');
          if (seenCombos.has(key)) return false;
          seenCombos.add(key);
          return true;
        });
        
        // Sort by priority, then by total capacity (prefer smaller combinations)
        uniqueCombinations.sort((a, b) => {
          if (a.priority !== b.priority) return a.priority - b.priority;
          return a.totalCapacity - b.totalCapacity;
        });
        
        // Add best combination as the available option
        if (uniqueCombinations.length > 0) {
          const best = uniqueCombinations[0];
          const labels = best.tables.map(t => t.tableLabel).join('+');
          const tableIds = best.tables.map(t => t.id).join(',');
          
          result.push({
            tableId: tableIds, // Comma-separated IDs for combined tables
            tableLabel: labels,
            priority: best.priority,
            minCapacity: best.tables.reduce((sum, t) => sum + t.minCapacity, 0),
            maxCapacity: best.totalCapacity,
            isCommunal: false
          });
        }
      }
      
      // Sort by priority, then by minCapacity
      result.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.minCapacity - b.minCapacity;
      });
      
      return result;
    };
    
    // Helper: Generate combinations of size k from array
    const generateCombinations = <T,>(arr: T[], k: number): T[][] => {
      if (k === 0) return [[]];
      if (arr.length === 0) return [];
      if (k > arr.length) return [];
      
      const [first, ...rest] = arr;
      const withFirst = generateCombinations(rest, k - 1).map(c => [first, ...c]);
      const withoutFirst = generateCombinations(rest, k);
      return [...withFirst, ...withoutFirst];
    };
    
    // Step 2: Generate time slots for each service period (all in-memory now)
    const slots: AvailabilitySlot[] = [];
    const intervalMinutes = 15;
    
    for (const period of schedule.servicePeriods) {
      const startMinutes = timeToMinutes(period.startTime);
      const endTime = period.lastReservationTime || period.endTime;
      const endMinutes = timeToMinutes(endTime);
      
      let currentMinutes = startMinutes;
      while (currentMinutes < endMinutes) {
        const time = minutesToTime(currentMinutes);
        
        // All these are now fast in-memory operations
        const flowResult = getRemainingCoversFast(time, period.periodId);
        const turnDuration = getTurnDurationFast(period.periodId);
        const availableTables = getAvailableTablesFast(time, turnDuration);
        
        let status: "available" | "limited" | "full" | "closed" = "available";
        let reason: string | undefined;
        
        if (flowResult.remainingCovers <= 0) {
          status = "full";
          reason = "No covers available";
        } else if (availableTables.length === 0) {
          status = "full";
          reason = "No tables available for party size";
        } else if (flowResult.remainingCovers < party) {
          status = "full";
          reason = `Only ${flowResult.remainingCovers} covers available`;
        } else if (flowResult.remainingCovers <= party * 2) {
          status = "limited";
        }
        
        slots.push({
          time,
          periodId: period.periodId,
          periodName: period.periodName,
          status,
          remainingCovers: flowResult.remainingCovers,
          maxCovers: flowResult.maxCovers,
          turnDuration,
          availableTables: status !== "full" ? availableTables : [],
          reason
        });
        
        currentMinutes += intervalMinutes;
      }
    }
    
    res.json({
      date,
      locationId,
      partySize: party,
      isClosed: false,
      servicePeriods: schedule.servicePeriods.map(p => ({
        id: p.periodId,
        name: p.periodName,
        startTime: p.startTime,
        endTime: p.endTime,
        lastReservationTime: p.lastReservationTime
      })),
      slots
    });
  } catch (error: any) {
    console.error("Availability error:", error);
    res.status(500).json({ message: "Failed to fetch availability: " + error.message });
  }
});

// ASSIGN TABLE AND CREATE RESERVATION WITH HOLD
router.post("/api/resy/locations/:locationId/book", async (req, res) => {
  try {
    const { locationId } = req.params;
    const {
      date,
      time,
      partySize,
      experienceId,
      customerName,
      customerEmail,
      customerPhone,
      notes,
      specialRequests
    } = req.body;
    
    if (!date || !time || !partySize || !experienceId || !customerName || !customerEmail) {
      return res.status(400).json({ 
        message: "Missing required fields: date, time, partySize, experienceId, customerName, customerEmail" 
      });
    }
    
    // Get experience details for confirmation messages
    const experience = await resyStorage.getExperience(experienceId);
    if (!experience) {
      return res.status(400).json({ message: "Experience not found" });
    }
    
    // Step 1: Check availability
    const schedule = await getNormalizedSchedule(locationId, date);
    if (schedule.isClosed) {
      return res.status(400).json({ message: "Location is closed on this date" });
    }
    
    // Find which service period this time falls in
    const period = schedule.servicePeriods.find(p => {
      const startMinutes = timeToMinutes(p.startTime);
      const endMinutes = timeToMinutes(p.lastReservationTime || p.endTime);
      const requestMinutes = timeToMinutes(time);
      return requestMinutes >= startMinutes && requestMinutes < endMinutes;
    });
    
    if (!period) {
      return res.status(400).json({ message: "Requested time is outside service hours" });
    }
    
    // Step 2: Check flow capacity
    const flowResult = await getRemainingCovers(locationId, date, time, period.periodId);
    if (flowResult.remainingCovers < partySize) {
      return res.status(400).json({ 
        message: `Not enough covers available. Only ${flowResult.remainingCovers} remaining.` 
      });
    }
    
    // Step 3: Get turn duration
    const turnDuration = await getTurnDuration(locationId, period.periodId, partySize);
    
    // Step 4: Find available table
    const availableTables = await getAvailableTables(locationId, date, time, partySize, turnDuration);
    if (availableTables.length === 0) {
      return res.status(400).json({ message: "No tables available for this party size at this time" });
    }
    
    // Assign the first available table (highest priority)
    const assignedTable = availableTables[0];
    
    // Step 5: Calculate hold window
    const holdStart = time;
    const holdEnd = minutesToTime(timeToMinutes(time) + turnDuration);
    
    // Step 6: Generate confirmation code and token
    const confirmationCode = `RES-${Date.now().toString(36).toUpperCase()}`;
    const confirmationToken = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`.toUpperCase();
    
    // Step 7: Create the reservation
    const reservationData = {
      experienceId,
      locationId,
      reservationDate: date,
      reservationTime: time,
      partySize,
      customerName,
      customerEmail,
      customerPhone: customerPhone || null,
      notes: notes || null,
      specialRequests: specialRequests || null,
      status: "booked", // New reservations start as "booked", customer confirms via email link
      confirmationCode,
      confirmationToken,
      assignedTableId: assignedTable.tableId,
      tableAssignment: assignedTable.tableLabel,
      holdStart,
      holdEnd,
      turnDuration
    };
    
    const reservation = await resyStorage.createReservation(reservationData);
    
    // Create or update customer record
    try {
      const existingCustomer = await resyStorage.getCustomerByEmail(customerEmail);
      if (existingCustomer) {
        // Update existing customer
        const nameParts = customerName?.split(' ') || [];
        const firstName = nameParts[0] || existingCustomer.firstName;
        const lastName = nameParts.slice(1).join(' ') || existingCustomer.lastName;
        await db.update(resyCustomers)
          .set({
            phone: customerPhone || existingCustomer.phone,
            firstName,
            lastName,
          })
          .where(eq(resyCustomers.id, existingCustomer.id));
      } else {
        // Create new customer record
        const nameParts = customerName?.split(' ') || [''];
        await resyStorage.createCustomer({
          firstName: nameParts[0] || 'Guest',
          lastName: nameParts.slice(1).join(' ') || '',
          email: customerEmail,
          phone: customerPhone || null,
          notificationPreference: customerPhone ? "both" : "email",
          newsletterOptIn: false,
        });
        console.log(`Created new customer: ${customerEmail}`);
      }
    } catch (customerError) {
      console.error("Failed to create/update customer:", customerError);
    }
    
    // Send confirmation email
    try {
      const emailContent = generateReservationConfirmationEmail({
        customerName,
        customerEmail,
        experienceName: experience.name,
        reservationDate: date,
        reservationTime: time,
        partySize,
        confirmationCode,
        specialRequests: specialRequests || undefined
      });
      await sendEmail(customerEmail, emailContent.subject, emailContent.html, emailContent.text);
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
    }
    
    // Send SMS if configured
    if (customerPhone && isSmsConfigured()) {
      try {
        const smsContent = generateReservationConfirmationSMS({
          customerName,
          experienceName: experience.name,
          reservationDate: date,
          reservationTime: time,
          partySize
        });
        await sendSMS(customerPhone, smsContent);
      } catch (smsError) {
        console.error("Failed to send confirmation SMS:", smsError);
      }
    }
    
    res.json({
      success: true,
      reservation,
      assignedTable: {
        id: assignedTable.tableId,
        label: assignedTable.tableLabel
      },
      holdWindow: {
        start: holdStart,
        end: holdEnd,
        duration: turnDuration
      }
    });
  } catch (error: any) {
    console.error("Booking error:", error);
    res.status(500).json({ message: "Failed to create reservation: " + error.message });
  }
});

// ==========================================
// PUBLIC CONFIRMATION ENDPOINTS
// ==========================================

// Get reservation details by confirmation token (public - no auth required)
router.get("/api/resy/confirm/:token", async (req, res) => {
  try {
    const { token } = req.params;
    
    const [reservation] = await db.select()
      .from(resyReservations)
      .where(eq(resyReservations.confirmationToken, token));
    
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }
    
    // Get experience details
    const experience = await resyStorage.getExperience(reservation.experienceId);
    
    res.json({
      reservation: {
        id: reservation.id,
        customerName: reservation.customerName,
        reservationDate: reservation.reservationDate,
        reservationTime: reservation.reservationTime,
        partySize: reservation.partySize,
        status: reservation.status,
        specialRequests: reservation.specialRequests,
        confirmationCode: reservation.confirmationCode
      },
      experience: experience ? {
        name: experience.name,
        description: experience.description
      } : null
    });
  } catch (error: any) {
    console.error("Get reservation by token error:", error);
    res.status(500).json({ message: "Failed to retrieve reservation" });
  }
});

// Confirm reservation via token (public - no auth required)
router.post("/api/resy/confirm/:token", async (req, res) => {
  try {
    const { token } = req.params;
    
    const [reservation] = await db.select()
      .from(resyReservations)
      .where(eq(resyReservations.confirmationToken, token));
    
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }
    
    if (reservation.status === "cancelled") {
      return res.status(400).json({ message: "This reservation has been cancelled" });
    }
    
    if (reservation.status === "confirmed") {
      return res.json({ 
        success: true, 
        message: "Reservation is already confirmed",
        reservation 
      });
    }
    
    // Update status to confirmed
    const [updated] = await db.update(resyReservations)
      .set({ 
        status: "confirmed",
        updatedAt: new Date()
      })
      .where(eq(resyReservations.id, reservation.id))
      .returning();
    
    console.log(`[Reservation] Customer confirmed reservation ${reservation.id} via email link`);
    
    res.json({ 
      success: true, 
      message: "Thank you! Your reservation has been confirmed.",
      reservation: updated 
    });
  } catch (error: any) {
    console.error("Confirm reservation error:", error);
    res.status(500).json({ message: "Failed to confirm reservation" });
  }
});

// Cancel reservation via token (public - no auth required)
router.post("/api/resy/cancel/:token", async (req, res) => {
  try {
    const { token } = req.params;
    
    const [reservation] = await db.select()
      .from(resyReservations)
      .where(eq(resyReservations.confirmationToken, token));
    
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }
    
    if (reservation.status === "cancelled") {
      return res.json({ 
        success: true, 
        message: "This reservation has already been cancelled",
        reservation 
      });
    }
    
    // Update status to cancelled
    const [updated] = await db.update(resyReservations)
      .set({ 
        status: "cancelled",
        updatedAt: new Date()
      })
      .where(eq(resyReservations.id, reservation.id))
      .returning();
    
    console.log(`[Reservation] Customer cancelled reservation ${reservation.id} via email link`);
    
    res.json({ 
      success: true, 
      message: "Your reservation has been cancelled.",
      reservation: updated 
    });
  } catch (error: any) {
    console.error("Cancel reservation error:", error);
    res.status(500).json({ message: "Failed to cancel reservation" });
  }
});

export default router;
