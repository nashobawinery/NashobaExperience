import { Router } from "express";
import { db } from "./db";
import { eq, and, desc, sql, inArray, notInArray, not } from "drizzle-orm";
import { isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
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
  resyLocationTables,
  resyFlowControls,
  resyTurnTimeSettings,
  resyExperienceDiscounts,
  resyClubExperienceDiscounts,
  resyPrivateEvents,
  resySiteSettings,
  resyFooterLinks,
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
  insertResyLocationTableSchema,
  insertResyExperienceDiscountSchema,
  insertResyClubSchema,
  insertResyClubExperienceDiscountSchema,
  insertResyCustomerVisitSchema,
  insertResyFooterLinkSchema,
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

  async getAllSpecialDates() {
    return await db.select().from(resySpecialDates);
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

router.post("/api/resy/locations", isAuthenticated, async (req, res) => {
  try {
    const validated = insertResyLocationSchema.parse(req.body);
    const location = await resyStorage.createLocation(validated);
    res.json(location);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create location: " + error.message });
  }
});

router.patch("/api/resy/locations/:id", isAuthenticated, async (req, res) => {
  try {
    const validated = insertResyLocationSchema.partial().parse(req.body);
    const location = await resyStorage.updateLocation(req.params.id, validated);
    if (!location) return res.status(404).json({ message: "Location not found" });
    res.json(location);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update location: " + error.message });
  }
});

router.delete("/api/resy/locations/:id", isAuthenticated, async (req, res) => {
  try {
    await resyStorage.deleteLocation(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete location: " + error.message });
  }
});

router.get("/api/resy/experiences", async (req, res) => {
  try {
    const experiences = await resyStorage.getExperiences();
    res.json(experiences);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch experiences: " + error.message });
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

router.post("/api/resy/experiences", isAuthenticated, async (req, res) => {
  try {
    const validated = insertResyExperienceSchema.parse(req.body);
    const experience = await resyStorage.createExperience(validated);
    res.json(experience);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create experience: " + error.message });
  }
});

router.patch("/api/resy/experiences/:id", isAuthenticated, async (req, res) => {
  try {
    const validated = insertResyExperienceSchema.partial().parse(req.body);
    const experience = await resyStorage.updateExperience(req.params.id, validated);
    if (!experience) return res.status(404).json({ message: "Experience not found" });
    res.json(experience);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update experience: " + error.message });
  }
});

router.delete("/api/resy/experiences/:id", isAuthenticated, async (req, res) => {
  try {
    await resyStorage.deleteExperience(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete experience: " + error.message });
  }
});

router.get("/api/resy/reservations", isAuthenticated, async (req, res) => {
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
    const validated = insertResyReservationSchema.parse(req.body);
    const reservation = await resyStorage.createReservation(validated);
    res.status(201).json(reservation);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create reservation: " + error.message });
  }
});

router.put("/api/resy/reservations/:id", isAuthenticated, async (req, res) => {
  try {
    const validated = insertResyReservationSchema.partial().parse(req.body);
    const reservation = await resyStorage.updateReservation(req.params.id, validated);
    if (!reservation) return res.status(404).json({ message: "Reservation not found" });
    res.json(reservation);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update reservation: " + error.message });
  }
});

router.get("/api/resy/customers", isAuthenticated, async (req, res) => {
  try {
    const customers = await resyStorage.getCustomers();
    res.json(customers);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch customers: " + error.message });
  }
});

router.get("/api/resy/customers/search", isAuthenticated, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== "string") return res.status(400).json({ message: "Search query required" });
    const customers = await resyStorage.searchCustomers(q);
    res.json(customers);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to search customers: " + error.message });
  }
});

router.get("/api/resy/customers/:id", isAuthenticated, async (req, res) => {
  try {
    const customer = await resyStorage.getCustomer(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch customer: " + error.message });
  }
});

router.post("/api/resy/customers", isAuthenticated, async (req, res) => {
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

router.put("/api/resy/customers/:id", isAuthenticated, async (req, res) => {
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

router.delete("/api/resy/customers/:id", isAuthenticated, async (req, res) => {
  try {
    await resyStorage.deleteCustomer(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete customer: " + error.message });
  }
});

router.get("/api/resy/customers/:id/visits", isAuthenticated, async (req, res) => {
  try {
    const visits = await resyStorage.getCustomerVisits(req.params.id);
    res.json(visits);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch customer visits: " + error.message });
  }
});

router.post("/api/resy/customers/:id/adjust-points", isAuthenticated, async (req, res) => {
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

router.post("/api/resy/meal-periods", isAuthenticated, async (req, res) => {
  try {
    const validated = insertResyMealPeriodSchema.parse(req.body);
    const period = await resyStorage.createMealPeriod(validated);
    res.json(period);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create meal period: " + error.message });
  }
});

router.patch("/api/resy/meal-periods/:id", isAuthenticated, async (req, res) => {
  try {
    const validated = insertResyMealPeriodSchema.partial().parse(req.body);
    const period = await resyStorage.updateMealPeriod(req.params.id, validated);
    if (!period) return res.status(404).json({ message: "Meal period not found" });
    res.json(period);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update meal period: " + error.message });
  }
});

router.delete("/api/resy/meal-periods/:id", isAuthenticated, async (req, res) => {
  try {
    await resyStorage.deleteMealPeriod(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete meal period: " + error.message });
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

router.post("/api/resy/operating-hours", isAuthenticated, async (req, res) => {
  try {
    const validated = insertResyOperatingHoursSchema.parse(req.body);
    const hours = await resyStorage.createOperatingHours(validated);
    res.json(hours);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create operating hours: " + error.message });
  }
});

router.patch("/api/resy/operating-hours/:id", isAuthenticated, async (req, res) => {
  try {
    const validated = insertResyOperatingHoursSchema.partial().parse(req.body);
    const hours = await resyStorage.updateOperatingHours(req.params.id, validated);
    if (!hours) return res.status(404).json({ message: "Operating hours not found" });
    res.json(hours);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update operating hours: " + error.message });
  }
});

router.delete("/api/resy/operating-hours/:id", isAuthenticated, async (req, res) => {
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

router.post("/api/resy/flow-controls", isAuthenticated, async (req, res) => {
  try {
    const validated = insertResyFlowControlSchema.parse(req.body);
    const control = await resyStorage.createFlowControl(validated);
    res.json(control);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create flow control: " + error.message });
  }
});

router.patch("/api/resy/flow-controls/:id", isAuthenticated, async (req, res) => {
  try {
    const validated = insertResyFlowControlSchema.partial().parse(req.body);
    const control = await resyStorage.updateFlowControl(req.params.id, validated);
    if (!control) return res.status(404).json({ message: "Flow control not found" });
    res.json(control);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update flow control: " + error.message });
  }
});

router.delete("/api/resy/flow-controls/:id", isAuthenticated, async (req, res) => {
  try {
    await resyStorage.deleteFlowControl(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete flow control: " + error.message });
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

router.post("/api/resy/turn-times", isAuthenticated, async (req, res) => {
  try {
    const validated = insertResyTurnTimeSettingSchema.parse(req.body);
    const setting = await resyStorage.createTurnTimeSettings(validated);
    res.json(setting);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create turn time: " + error.message });
  }
});

router.patch("/api/resy/turn-times/:id", isAuthenticated, async (req, res) => {
  try {
    const validated = insertResyTurnTimeSettingSchema.partial().parse(req.body);
    const setting = await resyStorage.updateTurnTimeSettings(req.params.id, validated);
    if (!setting) return res.status(404).json({ message: "Turn time not found" });
    res.json(setting);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update turn time: " + error.message });
  }
});

router.delete("/api/resy/turn-times/:id", isAuthenticated, async (req, res) => {
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

router.post("/api/resy/location-tables", isAuthenticated, async (req, res) => {
  try {
    const validated = insertResyLocationTableSchema.parse(req.body);
    const table = await resyStorage.createLocationTable(validated);
    res.json(table);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create table: " + error.message });
  }
});

router.patch("/api/resy/location-tables/:id", isAuthenticated, async (req, res) => {
  try {
    const validated = insertResyLocationTableSchema.partial().parse(req.body);
    const table = await resyStorage.updateLocationTable(req.params.id, validated);
    if (!table) return res.status(404).json({ message: "Table not found" });
    res.json(table);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update table: " + error.message });
  }
});

router.delete("/api/resy/location-tables/:id", isAuthenticated, async (req, res) => {
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

router.post("/api/resy/private-events", isAuthenticated, async (req, res) => {
  try {
    const validated = insertResyPrivateEventSchema.parse(req.body);
    const event = await resyStorage.createPrivateEvent(validated);
    res.json(event);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create private event: " + error.message });
  }
});

router.patch("/api/resy/private-events/:id", isAuthenticated, async (req, res) => {
  try {
    const validated = insertResyPrivateEventSchema.partial().parse(req.body);
    const event = await resyStorage.updatePrivateEvent(req.params.id, validated);
    if (!event) return res.status(404).json({ message: "Private event not found" });
    res.json(event);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update private event: " + error.message });
  }
});

router.delete("/api/resy/private-events/:id", isAuthenticated, async (req, res) => {
  try {
    await resyStorage.deletePrivateEvent(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete private event: " + error.message });
  }
});

router.get("/api/resy/special-dates", async (req, res) => {
  try {
    const dates = await resyStorage.getAllSpecialDates();
    res.json(dates);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch special dates: " + error.message });
  }
});

router.post("/api/resy/special-dates", isAuthenticated, async (req, res) => {
  try {
    const validated = insertResySpecialDateSchema.parse(req.body);
    const date = await resyStorage.createSpecialDate(validated);
    res.json(date);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create special date: " + error.message });
  }
});

router.patch("/api/resy/special-dates/:id", isAuthenticated, async (req, res) => {
  try {
    const validated = insertResySpecialDateSchema.partial().parse(req.body);
    const date = await resyStorage.updateSpecialDate(req.params.id, validated);
    if (!date) return res.status(404).json({ message: "Special date not found" });
    res.json(date);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update special date: " + error.message });
  }
});

router.delete("/api/resy/special-dates/:id", isAuthenticated, async (req, res) => {
  try {
    await resyStorage.deleteSpecialDate(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete special date: " + error.message });
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

router.post("/api/resy/clubs", isAuthenticated, async (req, res) => {
  try {
    const validated = insertResyClubSchema.parse(req.body);
    const club = await resyStorage.createClub(validated);
    res.json(club);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create club: " + error.message });
  }
});

router.patch("/api/resy/clubs/:id", isAuthenticated, async (req, res) => {
  try {
    const validated = insertResyClubSchema.partial().parse(req.body);
    const club = await resyStorage.updateClub(req.params.id, validated);
    if (!club) return res.status(404).json({ message: "Club not found" });
    res.json(club);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update club: " + error.message });
  }
});

router.delete("/api/resy/clubs/:id", isAuthenticated, async (req, res) => {
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

router.post("/api/resy/club-experience-discounts", isAuthenticated, async (req, res) => {
  try {
    const validated = insertResyClubExperienceDiscountSchema.parse(req.body);
    const discount = await resyStorage.createClubExperienceDiscount(validated);
    res.json(discount);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create club discount: " + error.message });
  }
});

router.patch("/api/resy/club-experience-discounts/:id", isAuthenticated, async (req, res) => {
  try {
    const validated = insertResyClubExperienceDiscountSchema.partial().parse(req.body);
    const discount = await resyStorage.updateClubExperienceDiscount(req.params.id, validated);
    if (!discount) return res.status(404).json({ message: "Club discount not found" });
    res.json(discount);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update club discount: " + error.message });
  }
});

router.delete("/api/resy/club-experience-discounts/:id", isAuthenticated, async (req, res) => {
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

router.post("/api/resy/experience-discounts", isAuthenticated, async (req, res) => {
  try {
    const validated = insertResyExperienceDiscountSchema.parse(req.body);
    const discount = await resyStorage.createDiscount(validated);
    res.json(discount);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create discount: " + error.message });
  }
});

router.patch("/api/resy/experience-discounts/:id", isAuthenticated, async (req, res) => {
  try {
    const validated = insertResyExperienceDiscountSchema.partial().parse(req.body);
    const discount = await resyStorage.updateDiscount(req.params.id, validated);
    if (!discount) return res.status(404).json({ message: "Discount not found" });
    res.json(discount);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update discount: " + error.message });
  }
});

router.delete("/api/resy/experience-discounts/:id", isAuthenticated, async (req, res) => {
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

router.post("/api/resy/footer-links", isAuthenticated, async (req, res) => {
  try {
    const validated = insertResyFooterLinkSchema.parse(req.body);
    const link = await resyStorage.createFooterLink(validated);
    res.json(link);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create footer link: " + error.message });
  }
});

router.patch("/api/resy/footer-links/:id", isAuthenticated, async (req, res) => {
  try {
    const validated = insertResyFooterLinkSchema.partial().parse(req.body);
    const link = await resyStorage.updateFooterLink(req.params.id, validated);
    if (!link) return res.status(404).json({ message: "Footer link not found" });
    res.json(link);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update footer link: " + error.message });
  }
});

router.delete("/api/resy/footer-links/:id", isAuthenticated, async (req, res) => {
  try {
    await resyStorage.deleteFooterLink(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete footer link: " + error.message });
  }
});

router.get("/api/resy/users", isAuthenticated, async (req, res) => {
  try {
    const users = await resyStorage.getAllUsers();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch users: " + error.message });
  }
});

router.put("/api/resy/users/:id/role", isAuthenticated, async (req, res) => {
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

router.post("/api/resy/time-slots", isAuthenticated, async (req, res) => {
  try {
    const slot = await resyStorage.createTimeSlot(req.body);
    res.json(slot);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create time slot: " + error.message });
  }
});

router.delete("/api/resy/time-slots/:id", isAuthenticated, async (req, res) => {
  try {
    await resyStorage.deleteTimeSlot(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete time slot: " + error.message });
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

router.put("/api/resy/site-settings/:key", isAuthenticated, async (req, res) => {
  try {
    const { value } = req.body;
    await resyStorage.updateSiteSetting(req.params.key, value);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update site setting: " + error.message });
  }
});

export default router;
