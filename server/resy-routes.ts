import { Router } from "express";
import { db } from "./db";
import { eq, and, desc, sql, inArray, notInArray, not } from "drizzle-orm";
import { isAuthenticated } from "./replitAuth";
import { requireModuleAccess } from "./rbac";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { generateReservationConfirmationEmail, sendEmail } from "./email";
import { scheduleReminders, sendDailyReminders } from "./reservationReminders";
import { sendSMS, generateReservationConfirmationSMS, isSmsConfigured } from "./sms";

const requireResyAdmin = requireModuleAccess('reservations');

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

  async getMealPeriodsByLocation(locationId: string): Promise<ResyMealPeriod[]> {
    return await db.select().from(resyMealPeriods).orderBy(resyMealPeriods.displayOrder);
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
        await db.update(resyCustomers)
          .set({
            notificationPreference,
            newsletterOptIn,
            phone: reservation.customerPhone || existingCustomer.phone,
          })
          .where(eq(resyCustomers.id, existingCustomer.id));
      }
    } catch (customerError) {
      console.error("Failed to update customer preferences:", customerError);
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

router.get("/api/resy/locations/:locationId/available-times", async (req, res) => {
  try {
    const { locationId } = req.params;
    const { date, partySize } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }
    
    const requestedDate = new Date(date as string);
    const dayOfWeek = requestedDate.getDay();
    
    // Get the location to check for reservationCloseTime
    const location = await resyStorage.getLocation(locationId);
    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }
    
    // Parse reservation close time if set
    let closeTimeHour: number | null = null;
    let closeTimeMin: number | null = null;
    if (location.reservationCloseTime) {
      const parts = location.reservationCloseTime.split(':').map(Number);
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        closeTimeHour = parts[0];
        closeTimeMin = parts[1];
      }
    }
    
    // Get service periods (meal periods) for this location and filter by day availability
    const mealPeriods = await resyStorage.getMealPeriodsByLocation(locationId);
    const activePeriods = mealPeriods.filter(p => {
      if (!p.isActive) return false;
      // Check if this day is in the daysAvailable array
      const daysAvailable = p.daysAvailable || [0, 1, 2, 3, 4, 5, 6]; // Default to all days if not set
      return daysAvailable.includes(dayOfWeek);
    });
    
    if (activePeriods.length === 0) {
      return res.json({ 
        availableTimes: [], 
        messages: { closed: "Location is closed on this day" } 
      });
    }
    
    // Get flow controls for capacity limits
    const flowControls = await resyStorage.getFlowControlsByLocation(locationId);
    
    // Get existing reservations for this date
    const reservations = await resyStorage.getReservationsByDate(date as string, locationId);
    
    // Generate time slots based on service periods
    const availableTimes: Array<{time: string, available: boolean, capacity?: number, mealPeriod?: string}> = [];
    
    for (const period of activePeriods) {
      if (!period.startTime || !period.endTime) continue;
      
      // Parse times - use lastReservationTime if set, otherwise use endTime
      const [openHour, openMin] = period.startTime.split(':').map(Number);
      const effectiveEndTime = period.lastReservationTime || period.endTime;
      let [closeHour, closeMin] = effectiveEndTime.split(':').map(Number);
      
      // Apply reservation close time if set - limits the latest slot time
      if (closeTimeHour !== null && closeTimeMin !== null) {
        // Use the earlier of service period close or reservation close time
        const serviceCloseMinutes = closeHour * 60 + closeMin;
        const reservationCloseMinutes = closeTimeHour * 60 + closeTimeMin;
        if (reservationCloseMinutes < serviceCloseMinutes) {
          closeHour = closeTimeHour;
          closeMin = closeTimeMin;
        }
      }
      
      // Get flow control for this meal period (or default)
      const flowControl = flowControls.find(fc => fc.mealPeriodId === period.id && fc.isActive);
      // Ensure interval is positive to prevent infinite loops
      const intervalMinutes = Math.max(flowControl?.intervalMinutes ?? 30, 1);
      const defaultMaxCovers = flowControl?.maxCoversPerInterval ?? 20;
      
      // Parse interval overrides for controlled flow mode
      const isControlledMode = flowControl?.flowMode === "controlled";
      const intervalOverrides = (flowControl?.intervalOverrides as Array<{time: string, maxCovers: number}>) || [];
      
      // Calculate the effective close time in minutes for easier comparison
      const effectiveCloseMinutes = closeHour * 60 + closeMin;
      const openMinutes = openHour * 60 + openMin;
      
      // Generate time slots - iterate through all possible slots from open to close
      // Only generate slots that are strictly BEFORE the effective close time
      let currentMinutes = openMinutes;
      
      while (currentMinutes < effectiveCloseMinutes && currentMinutes < 24 * 60) {
        const slotHour = Math.floor(currentMinutes / 60);
        const slotMin = currentMinutes % 60;
        const timeStr = `${slotHour.toString().padStart(2, '0')}:${slotMin.toString().padStart(2, '0')}`;
        
        // Determine max covers for this specific time slot
        let maxCovers = defaultMaxCovers;
        if (isControlledMode && intervalOverrides.length > 0) {
          const override = intervalOverrides.find(o => o.time === timeStr);
          if (override) {
            maxCovers = override.maxCovers;
          }
        }
        
        // Count existing reservations at this time
        const existingCovers = reservations
          .filter((r: ResyReservation) => r.reservationTime === timeStr)
          .reduce((sum: number, r: ResyReservation) => sum + (r.partySize || 0), 0);
        
        const remaining = maxCovers - existingCovers;
        const requestedSize = parseInt(partySize as string) || 2;
        
        availableTimes.push({
          time: timeStr,
          available: remaining >= requestedSize,
          capacity: remaining
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

export default router;
