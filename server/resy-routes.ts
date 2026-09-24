import { createHash, randomBytes } from "crypto";
import { Router } from "express";
import { db } from "./db";
import { eq, and, desc, sql, inArray, notInArray, not, lte, gte } from "drizzle-orm";
import { isPlatformAuthenticated } from "./platformAuth";
import { requireModuleAccess } from "./rbac";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { generateReservationConfirmationEmail, sendEmail, generateBrandedEmailHeader, generateBrandedEmailFooter, getBrandedEmailStyles } from "./email";
import { scheduleReminders, sendDailyReminders } from "./reservationReminders";
import { sendSMS, generateReservationConfirmationSMS, isSmsConfigured } from "./sms";
import * as XLSX from "xlsx";
import multer from "multer";

const requireResyAdmin = requireModuleAccess('reservations');

const floorPinAttempts = new Map<string, { count: number; lockedUntil: number }>();

function hashFloorCode(area: string, code: string) {
  return createHash("sha256").update(`nashoba-floor:${area}:${code}`).digest("hex");
}

async function requireFloorPin(req: any, res: any, next: () => void) {
  try {
    const token = String(req.get("x-floor-access") || "");
    if (!token) return res.status(401).json({ message: "Enter the 4-digit access code for this page." });
    const result = await db.execute(sql`SELECT area FROM resy_floor_access_sessions WHERE token = ${token} AND expires_at > now()`);
    const rows = ((result as { rows?: Array<{ area: string }> }).rows) || [];
    const requested = String(req.get("x-floor-area") || "");
    if (!rows.length || (requested && rows[0].area !== requested)) {
      return res.status(401).json({ message: "Enter the 4-digit access code for this page." });
    }
    next();
  } catch (error) {
    return res.status(401).json({ message: "Enter the 4-digit access code for this page." });
  }
}

router.get("/api/resy/floor-access/session", requireResyAdmin, requireFloorPin, async (_req, res) => {
  res.json({ ok: true });
});

router.get("/api/resy/floor-access", requireResyAdmin, async (_req, res) => {
  const result = await db.execute(sql`SELECT area FROM resy_floor_access_codes`);
  const rows = ((result as { rows?: Array<{ area: string }> }).rows) || [];
  const areas = new Set(rows.map((row) => row.area));
  res.json({ host: areas.has("host"), tracker: areas.has("tracker") });
});

router.put("/api/resy/floor-access", requireResyAdmin, async (req, res) => {
  const updates = [
    ["host", String(req.body?.hostCode || "")],
    ["tracker", String(req.body?.trackerCode || "")],
  ] as const;
  for (const [area, code] of updates) {
    if (!code) continue;
    if (!/^\d{4}$/.test(code)) return res.status(400).json({ message: "Each access code must be 4 digits." });
    await db.execute(sql`
      INSERT INTO resy_floor_access_codes (area, code_hash)
      VALUES (${area}, ${hashFloorCode(area, code)})
      ON CONFLICT (area) DO UPDATE SET code_hash = EXCLUDED.code_hash, updated_at = now()
    `);
  }
  res.json({ saved: true });
});

router.post("/api/resy/floor-access/verify", requireResyAdmin, async (req, res) => {
  const area = req.body?.area === "tracker" ? "tracker" : req.body?.area === "host" ? "host" : "";
  const code = String(req.body?.code || "");
  if (!area || !/^\d{4}$/.test(code)) return res.status(400).json({ message: "Enter the 4-digit code." });
  const caller = String(req.ip || req.get("x-forwarded-for") || "staff");
  const attempt = floorPinAttempts.get(caller);
  if (attempt && attempt.lockedUntil > Date.now()) {
    return res.status(429).json({ message: "Too many incorrect codes. Wait a few minutes and try again." });
  }
  const result = await db.execute(sql`SELECT code_hash FROM resy_floor_access_codes WHERE area = ${area}`);
  const rows = ((result as { rows?: Array<{ code_hash: string }> }).rows) || [];
  if (!rows.length) return res.status(400).json({ message: "This access code has not been set yet. A manager can set it in reservation settings." });
  if (rows[0].code_hash !== hashFloorCode(area, code)) {
    const count = (attempt?.count || 0) + 1;
    floorPinAttempts.set(caller, { count, lockedUntil: count >= 5 ? Date.now() + 10 * 60 * 1000 : 0 });
    return res.status(401).json({ message: "That code is not correct." });
  }
  floorPinAttempts.delete(caller);
  const token = randomBytes(24).toString("hex");
  await db.execute(sql`
    INSERT INTO resy_floor_access_sessions (token, area, expires_at)
    VALUES (${token}, ${area}, now() + interval '12 hours')
  `);
  res.json({ token });
});

const RESERVED_BOOKING_SLUGS = new Set([
  "accounting", "admin", "admin-hub", "apple-game", "b2b", "book", "boomerang", "cellartraks",
  "checkout", "command-center", "company-info", "compliance", "confirmation", "contact", "contracts",
  "daily-report", "daily-reports", "department-calendar", "display", "enhancement-requests",
  "event-calendar", "event-registration", "events", "faq", "faq-widget", "food-trucks", "future-concepts",
  "hub", "host", "knoll-tracker", "lms", "maintenance", "media", "media-center", "media-library", "module-management", "modules",
  "music", "operations", "procedures", "rcc", "reservations", "reset-password", "spot-inventory",
  "staff", "staff-dashboard", "staff-reporting", "support", "tasting", "toast-connect", "training",
  "unsubscribe",
]);

async function normalizeBookingSlug(data: Record<string, unknown>, currentId?: string) {
  if (!Object.prototype.hasOwnProperty.call(data, "bookingSlug")) return data;
  const raw = data.bookingSlug;
  if (raw == null || String(raw).trim() === "") {
    data.bookingSlug = null;
    return data;
  }
  const slug = String(raw).trim().toLowerCase();
  if (!/^[a-z0-9]{3,80}$/.test(slug)) {
    throw new Error("Reservation link must be 3 to 80 letters or numbers, with no spaces or symbols.");
  }
  if (RESERVED_BOOKING_SLUGS.has(slug)) {
    throw new Error("Choose a different reservation link. That address is already used by the site.");
  }
  const [existing] = await db.select({ id: resyExperiences.id }).from(resyExperiences).where(eq(resyExperiences.bookingSlug, slug));
  if (existing && existing.id !== currentId) {
    throw new Error("That reservation link is already used by another experience.");
  }
  data.bookingSlug = slug;
  return data;
}

const KNOLL_LOCATION_ID = "b8ab57a7-e755-4e2c-910f-439909a148b3";

const KNOLL_FLOOR_SECTIONS: Array<{ section: string; test: (label: string) => boolean; y: number }> = [
  { section: "A", test: (label) => /^A\d+$/.test(label), y: 70 },
  { section: "B", test: (label) => /^B\d+$/.test(label), y: 200 },
  { section: "C", test: (label) => /^C\d+$/.test(label), y: 330 },
  { section: "D", test: (label) => /^D\d+$/.test(label), y: 460 },
  { section: "E", test: (label) => /^E\d+$/.test(label), y: 590 },
  { section: "F", test: (label) => /^F\d+$/.test(label), y: 720 },
  { section: "G", test: (label) => /^G\d+$/.test(label), y: 850 },
  { section: "V", test: (label) => /^V\d+$/.test(label), y: 980 },
  { section: "P", test: (label) => /^P\d+$/.test(label), y: 1110 },
  { section: "Deck 1", test: (label) => /^1D\d+$/.test(label), y: 1280 },
  { section: "Deck 2", test: (label) => /^2D\d+$/.test(label), y: 1410 },
];

function tableLabelNumber(label: string): number {
  const match = label.match(/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

async function seedKnollFloorLayout() {
  const tables = await db.select().from(resyLocationTables).where(eq(resyLocationTables.locationId, KNOLL_LOCATION_ID));
  for (const group of KNOLL_FLOOR_SECTIONS) {
    const members = tables
      .filter((table) => table.isActive && !table.isPaused && group.test(table.tableLabel) && table.posX == null)
      .sort((a, b) => tableLabelNumber(a.tableLabel) - tableLabelNumber(b.tableLabel) || a.tableLabel.localeCompare(b.tableLabel));
    for (let index = 0; index < members.length; index++) {
      await db.update(resyLocationTables).set({
        posX: 70 + index * 110,
        posY: group.y,
        floorSection: group.section,
      }).where(eq(resyLocationTables.id, members[index].id));
    }
  }
}

export async function ensureResyMasterPageFlags() {
  await db.execute(sql`ALTER TABLE resy_locations ADD COLUMN IF NOT EXISTS show_on_master_page boolean NOT NULL DEFAULT true`);
  await db.execute(sql`ALTER TABLE resy_experiences ADD COLUMN IF NOT EXISTS show_on_master_page boolean NOT NULL DEFAULT true`);
  await db.execute(sql`ALTER TABLE resy_locations ADD COLUMN IF NOT EXISTS headline text`);
  await db.execute(sql`ALTER TABLE resy_locations ADD COLUMN IF NOT EXISTS booking_details text`);
  await db.execute(sql`ALTER TABLE resy_locations ADD COLUMN IF NOT EXISTS confirmation_intro text`);
  await db.execute(sql`ALTER TABLE resy_locations ADD COLUMN IF NOT EXISTS confirmation_closing text`);
  await db.execute(sql`ALTER TABLE resy_locations ADD COLUMN IF NOT EXISTS confirmation_contact_email varchar(255)`);
  await db.execute(sql`ALTER TABLE resy_locations ADD COLUMN IF NOT EXISTS confirmation_contact_phone varchar(30)`);
  await db.execute(sql`ALTER TABLE resy_locations ADD COLUMN IF NOT EXISTS ai_knowledge text`);
  await db.execute(sql`ALTER TABLE resy_experiences ADD COLUMN IF NOT EXISTS booking_slug varchar(80)`);
  await db.execute(sql`ALTER TABLE resy_experiences ADD COLUMN IF NOT EXISTS allow_adjacent_reservations boolean NOT NULL DEFAULT false`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS resy_floor_access_codes (
      area varchar(20) PRIMARY KEY,
      code_hash text NOT NULL,
      updated_at timestamp DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS resy_floor_access_sessions (
      token varchar PRIMARY KEY,
      area varchar(20) NOT NULL,
      expires_at timestamp NOT NULL
    )
  `);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS resy_experiences_booking_slug_key ON resy_experiences (booking_slug)`);
  await db.execute(sql`
    UPDATE resy_experiences
    SET booking_slug = 'knollresy'
    WHERE id = 'fd589420-3c4f-4c93-b1e8-069c66db7516'
      AND (booking_slug IS NULL OR booking_slug = '')
  `);
  await db.execute(sql`ALTER TABLE resy_location_tables ADD COLUMN IF NOT EXISTS pos_x integer`);
  await db.execute(sql`ALTER TABLE resy_location_tables ADD COLUMN IF NOT EXISTS pos_y integer`);
  await db.execute(sql`ALTER TABLE resy_location_tables ADD COLUMN IF NOT EXISTS floor_section varchar(40)`);
  await db.execute(sql`ALTER TABLE resy_reservations ADD COLUMN IF NOT EXISTS seated_at timestamp`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS resy_table_walkins (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      location_id varchar NOT NULL,
      table_id varchar NOT NULL,
      service_date varchar(10) NOT NULL,
      label text NOT NULL DEFAULT 'Pirates!!!',
      cleared_at timestamp,
      created_at timestamp DEFAULT now()
    )
  `);
  await seedKnollFloorLayout();
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS resy_location_questions (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      location_id varchar NOT NULL,
      question text NOT NULL,
      answer text NOT NULL,
      corrected_answer text,
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now()
    )
  `);
}
const isAuthenticated = isPlatformAuthenticated;

// Multer configuration for file uploads
const tableUpload = multer({ storage: multer.memoryStorage() });

// Initialize the reservation reminder scheduler
scheduleReminders();
import sgMail from "@sendgrid/mail";
import Stripe from "stripe";
import {
  resyUsers,
  resyLocations,
  resyLocationQuestions,
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
  resyTableWalkins,
  resyFlowControls,
  resyTurnTimeSettings,
  resyExperienceDiscounts,
  resyClubExperienceDiscounts,
  resyPrivateEvents,
  resyEventStaffCodes,
  resySiteSettings,
  resyFooterLinks,
  users,
  customerIdentities,
  toastGuests,
  resyTicketedEventDefinitions,
  resyTicketedEventTimeslots,
  insertResyLocationSchema,
  insertResyEventStaffCodeSchema,
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

async function seedEventBookableLocations() {
  try {
    const eventLocations = [
      { name: 'Restaurant Lunch', displayOrder: 100 },
      { name: 'Restaurant Evening', displayOrder: 101 },
      { name: 'Restaurant Brunch', displayOrder: 102 },
      { name: 'Private Dining', displayOrder: 103 },
      { name: 'Patio', displayOrder: 105 },
      { name: 'Distillery', displayOrder: 106 },
      { name: 'Terrace Bar', displayOrder: 107 },
    ];

    const existing = await db.select({ name: resyLocations.name }).from(resyLocations);
    const existingNames = new Set(existing.map(l => l.name));

    for (const loc of eventLocations) {
      if (!existingNames.has(loc.name)) {
        await db.insert(resyLocations).values({
          id: crypto.randomUUID(),
          name: loc.name,
          isActive: true,
          displayOrder: loc.displayOrder,
        });
        console.log(`[Event Seed] Created location: ${loc.name}`);
      }
    }

    const pavLocation = await db.select().from(resyLocations).where(eq(resyLocations.name, 'The Pavilion'));
    if (pavLocation.length > 0) {
      await db.update(resyLocations).set({ displayOrder: 104 }).where(eq(resyLocations.name, 'The Pavilion'));
    }

    const allLocations = await db.select().from(resyLocations).where(eq(resyLocations.isActive, true));
    const locMap: Record<string, string> = {};
    allLocations.forEach(l => { locMap[l.name] = l.id; });

    const experiences = await db.select().from(resyExperiences).where(eq(resyExperiences.isActive, true));
    const expId = experiences.length > 0 ? experiences[0].id : null;
    if (!expId) return;

    const existingEvents = await db.select().from(resyPrivateEvents);
    const eventKey = (locId: string, date: string) => `${locId}_${date}`;
    const existingEventKeys = new Set(existingEvents.map(e => eventKey(e.locationId || '', e.eventDate)));

    const eventsToSeed = [
      { location: 'Restaurant Lunch', date: '2026-05-02', start: '10:00', end: '14:00' },
      { location: 'Restaurant Lunch', date: '2026-08-01', start: '10:00', end: '14:00' },
      { location: 'Restaurant Lunch', date: '2026-09-12', start: '10:00', end: '14:00' },
      { location: 'Restaurant Evening', date: '2026-05-30', start: '17:00', end: '22:00' },
      { location: 'Restaurant Brunch', date: '2026-06-14', start: '10:00', end: '14:00' },
      { location: 'The Pavilion', date: '2026-05-14', start: '10:00', end: '22:00' },
      { location: 'Patio', date: '2026-05-15', start: '10:00', end: '22:00' },
      { location: 'Patio', date: '2026-06-13', start: '10:00', end: '22:00' },
      { location: 'Patio', date: '2026-06-14', start: '10:00', end: '22:00' },
      { location: 'Patio', date: '2026-08-22', start: '10:00', end: '22:00' },
    ];

    let seeded = 0;
    for (const evt of eventsToSeed) {
      const locationId = locMap[evt.location];
      if (!locationId) continue;
      if (existingEventKeys.has(eventKey(locationId, evt.date))) continue;

      await db.insert(resyPrivateEvents).values({
        id: crypto.randomUUID(),
        experienceId: expId,
        locationId,
        eventDate: evt.date,
        startTime: evt.start,
        endTime: evt.end,
        customerName: 'Private Event',
        customerEmail: 'events@nashoba.com',
        partySize: 50,
        status: 'confirmed',
        bookedByStaffName: 'Richard Pelletier',
      });
      seeded++;
    }
    if (seeded > 0) console.log(`[Event Seed] Created ${seeded} private events`);
  } catch (err: any) {
    console.error('[Event Seed] Error:', err.message);
  }
}

seedEventBookableLocations();

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
    if (experience) return experience;
    const [bySlug] = await db.select().from(resyExperiences).where(eq(resyExperiences.bookingSlug, id));
    return bySlug;
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

  async getAllEventStaffCodes() {
    return await db.select().from(resyEventStaffCodes).orderBy(resyEventStaffCodes.staffName);
  }

  async getEventStaffCodeByCode(code: string) {
    const [staff] = await db.select().from(resyEventStaffCodes)
      .where(and(eq(resyEventStaffCodes.code, code), eq(resyEventStaffCodes.isActive, true)));
    return staff;
  }

  async createEventStaffCode(data: any) {
    const [staff] = await db.insert(resyEventStaffCodes).values(data).returning();
    return staff;
  }

  async updateEventStaffCode(id: string, updates: any) {
    const [staff] = await db
      .update(resyEventStaffCodes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(resyEventStaffCodes.id, id))
      .returning();
    return staff;
  }

  async deleteEventStaffCode(id: string): Promise<void> {
    await db.delete(resyEventStaffCodes).where(eq(resyEventStaffCodes.id, id));
  }

  async getConfirmedPrivateEvents() {
    return await db.select().from(resyPrivateEvents)
      .where(and(
        not(eq(resyPrivateEvents.status, 'cancelled')),
      ))
      .orderBy(resyPrivateEvents.eventDate);
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

  async listSiteSettingsRows() {
    return await db.select().from(resySiteSettings).orderBy(resySiteSettings.createdAt);
  }

  /** Flat record shape expected by Reservation admin-settings (`SiteSettings`). */
  async getSiteSettingsRecord(): Promise<Record<string, string | null>> {
    const rows = await this.listSiteSettingsRows();
    const row = rows[0];
    if (!row) return {};
    const result: Record<string, string | null> = {};
    for (const [key, val] of Object.entries(row) as [string, unknown][]) {
      if (key === "createdAt" || key === "updatedAt") continue;
      if (val === null || val === undefined) result[key] = null;
      else if (typeof val === "boolean") result[key] = val ? "true" : "false";
      else if (val instanceof Date) result[key] = val.toISOString();
      else result[key] = String(val);
    }
    return result;
  }

  async updateSiteSetting(key: string, value: string) {
    const allowedColumns = [
      "value",
      "description",
      "headerTitle",
      "headerSubtitle",
      "logoUrl",
      "accentColor",
      "backgroundImageUrl",
      "headerImageUrl",
      "companyName",
      "primaryColor",
      "secondaryColor",
      "companyAddress",
      "companyPhone",
      "companyEmail",
      "companyCity",
      "companyState",
      "companyZip",
      "companyZipCode",
      "companyWebsite",
      "showPoweredBy",
    ] as const;
    const allowedLookup: readonly string[] = allowedColumns;
    if (!allowedLookup.includes(key)) {
      throw new Error("Invalid site setting key");
    }
    const [row] = await db.select({ id: resySiteSettings.id }).from(resySiteSettings).limit(1);
    if (!row) {
      throw new Error("Site settings row missing; seed resy_site_settings first");
    }
    const parsedValue =
      key === "showPoweredBy" ? value === "true" || value === "1" : value;
    await db
      .update(resySiteSettings)
      .set({ [key]: parsedValue as never, updatedAt: new Date() })
      .where(eq(resySiteSettings.id, row.id));
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

router.get("/api/resy/locations/:id/questions", requireResyAdmin, async (req, res) => {
  try {
    const questions = await db.select().from(resyLocationQuestions)
      .where(eq(resyLocationQuestions.locationId, req.params.id))
      .orderBy(desc(resyLocationQuestions.createdAt))
      .limit(30);
    res.json(questions);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch questions: " + error.message });
  }
});

router.patch("/api/resy/locations/:id/questions/:questionId", requireResyAdmin, async (req, res) => {
  try {
    const correctedAnswer = String(req.body?.correctedAnswer || "").trim();
    if (!correctedAnswer) return res.status(400).json({ message: "A corrected answer is required" });
    const [updated] = await db.update(resyLocationQuestions)
      .set({ correctedAnswer, updatedAt: new Date() })
      .where(and(
        eq(resyLocationQuestions.id, req.params.questionId),
        eq(resyLocationQuestions.locationId, req.params.id),
      ))
      .returning();
    if (!updated) return res.status(404).json({ message: "Question not found" });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to save correction: " + error.message });
  }
});

router.post("/api/resy/locations/:id/ask", async (req, res) => {
  try {
    const location = await resyStorage.getLocation(req.params.id);
    if (!location) return res.status(404).json({ message: "Location not found" });
    const question = String(req.body?.question || "").trim();
    if (question.length < 3 || question.length > 500) {
      return res.status(400).json({ message: "Enter a question of a few words, up to 500 characters." });
    }

    const corrections = await db.select({
      question: resyLocationQuestions.question,
      correctedAnswer: resyLocationQuestions.correctedAnswer,
    }).from(resyLocationQuestions).where(and(
      eq(resyLocationQuestions.locationId, location.id),
      sql`${resyLocationQuestions.correctedAnswer} is not null`,
    )).orderBy(desc(resyLocationQuestions.updatedAt)).limit(20);

    const facts = corrections
      .filter((item) => item.correctedAnswer)
      .map((item) => `Q: ${item.question}\nApproved answer: ${item.correctedAnswer}`)
      .join("\n\n");

    let answer = "I don't have that detail yet. The team has been notified and can confirm it for you.";
    if (process.env.OPENAI_API_KEY) {
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: "You answer guest questions about one Nashoba Valley reservation location. Use only the facts provided. If a fact is missing, say you don't know and that the team can confirm it. Do not invent prices, availability, or policies.",
          },
          {
            role: "user",
            content: `Location: ${location.name}
Headline: ${location.headline || ""}
About: ${location.description || ""}
What guests book: ${location.bookingDetails || ""}
Address: ${location.address || ""}
Staff notes: ${location.aiKnowledge || ""}
Approved answers:
${facts || "None yet."}

Guest question: ${question}`,
          },
        ],
      });
      answer = completion.choices[0]?.message?.content?.trim() || answer;
    }

    const [saved] = await db.insert(resyLocationQuestions).values({
      locationId: location.id,
      question,
      answer,
    }).returning();

    const managers = await db.select({ email: users.email }).from(users).where(eq(users.role, "admin"));
    const recipients = managers
      .map((manager) => manager.email || "")
      .filter((email) => email.includes("@") && !email.endsWith("@example.com"));
    const subject = `Guest question about ${location.name}`;
    const text = `A guest asked about ${location.name}.\n\nQuestion: ${question}\n\nAnswer sent to the guest:\n${answer}\n\nCorrect this answer in Reservations → Locations → ${location.name} → Settings → Guest questions. Saved corrections are used the next time a guest asks.`;
    const html = `<p>A guest asked about <strong>${location.name}</strong>.</p><p><strong>Question:</strong> ${question.replace(/</g, "")}</p><p><strong>Answer sent to the guest:</strong></p><p>${answer.replace(/</g, "").replace(/\n/g, "<br>")}</p><p>Correct this answer in Reservations → Locations → ${location.name} → Settings → Guest questions. Saved corrections are used the next time a guest asks.</p>`;
    for (const email of recipients) {
      try {
        await sendEmail(email, subject, html, text);
      } catch (emailError) {
        console.error("Failed to email guest question:", emailError);
      }
    }

    res.json({ id: saved.id, answer });
  } catch (error: any) {
    console.error("Location question failed:", error);
    res.status(500).json({ message: "Could not answer that question right now." });
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
    const validated = await normalizeBookingSlug(insertResyExperienceSchema.parse(req.body) as Record<string, unknown>);
    const experience = await resyStorage.createExperience(validated);
    res.json(experience);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create experience: " + error.message });
  }
});

router.patch("/api/resy/experiences/:id", requireResyAdmin, async (req, res) => {
  try {
    const validated = await normalizeBookingSlug(insertResyExperienceSchema.partial().parse(req.body) as Record<string, unknown>, req.params.id);
    const experience = await resyStorage.updateExperience(req.params.id, validated);
    if (!experience) return res.status(404).json({ message: "Experience not found" });
    res.json(experience);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update experience: " + error.message });
  }
});

router.put("/api/resy/experiences/:id", requireResyAdmin, async (req, res) => {
  try {
    const validated = await normalizeBookingSlug(insertResyExperienceSchema.partial().parse(req.body) as Record<string, unknown>, req.params.id);
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
      bookingSlug: null,
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

// Get automatic discount for an experience (public endpoint for booking flow)
router.get("/api/resy/experiences/:experienceId/automatic-discount", async (req, res) => {
  try {
    const discounts = await resyStorage.getDiscountsByExperience(req.params.experienceId);
    const today = new Date().toISOString().split('T')[0];
    
    // Find an active, automatic discount that's within the valid date range
    const automaticDiscount = discounts.find(d => {
      if (!d.isActive || !d.isAutomatic) return false;
      if (d.maxUses !== null && d.usedCount >= d.maxUses) return false;
      if (d.validFrom && today < d.validFrom) return false;
      if (d.validUntil && today > d.validUntil) return false;
      return true;
    });
    
    if (automaticDiscount) {
      res.json({
        hasAutoDiscount: true,
        discount: {
          id: automaticDiscount.id,
          code: automaticDiscount.code,
          discountType: automaticDiscount.discountType,
          discountValue: automaticDiscount.discountValue,
        }
      });
    } else {
      res.json({ hasAutoDiscount: false });
    }
  } catch (error: any) {
    res.status(500).json({ message: "Failed to check automatic discount: " + error.message });
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
    const slots = await resyStorage.getTimeSlotsByExperience(experience?.id || req.params.experienceId);
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

async function reservationConfirmationContent(
  experience: { name: string; locationId?: string | null; reservationType?: string | null },
  fields: {
    customerName: string;
    customerEmail: string;
    reservationDate: string;
    reservationTime: string;
    ticketQuantity?: number;
    partySize?: number;
    totalAmount?: string;
    confirmationCode?: string;
    specialRequests?: string;
    locationId?: string | null;
    confirmationToken?: string;
    experienceId?: string;
  },
) {
  const locationId = fields.locationId || experience.locationId;
  const location = locationId ? await resyStorage.getLocation(locationId) : undefined;
  return {
    customerName: fields.customerName,
    customerEmail: fields.customerEmail,
    experienceName: experience.name,
    reservationDate: fields.reservationDate,
    reservationTime: fields.reservationTime,
    ticketQuantity: fields.ticketQuantity,
    partySize: fields.partySize,
    totalAmount: fields.totalAmount,
    confirmationCode: fields.confirmationCode,
    specialRequests: fields.specialRequests,
    locationName: location?.name,
    locationAddress: location?.address || undefined,
    reservationType: experience.reservationType || undefined,
    bookingDetails: location?.bookingDetails || undefined,
    intro: location?.confirmationIntro || undefined,
    closing: location?.confirmationClosing || undefined,
    contactEmail: location?.confirmationContactEmail || undefined,
    contactPhone: location?.confirmationContactPhone || undefined,
    confirmationToken: fields.confirmationToken,
    experienceId: fields.experienceId,
  };
}

const WALK_IN_INVITE = "We do have some tables for walk-ins and invite you to join us as a walk-in customer. Wait times may vary based on the number of people that show up without reservations.";

function withWalkInInvite(message: string): string {
  return `${message} ${WALK_IN_INVITE}`;
}

function outsideAdvanceBookingWindow(advanceBookingDays: number | null | undefined, reservationDate: string): string | null {
  if (!advanceBookingDays || advanceBookingDays < 1 || !reservationDate) return null;
  const [year, month, day] = reservationDate.split("-").map(Number);
  if (!year || !month || !day) return null;
  const requested = new Date(year, month - 1, day);
  const latest = new Date();
  latest.setHours(0, 0, 0, 0);
  latest.setDate(latest.getDate() + advanceBookingDays);
  if (requested > latest) {
    return `Reservations can be made up to ${advanceBookingDays} days in advance.`;
  }
  return null;
}

function tablesAreAdjacent(left: { id: string; posX: number | null; posY: number | null; floorSection: string | null; combinableWith: string[] | null }, right: { id: string; posX: number | null; posY: number | null; floorSection: string | null; combinableWith: string[] | null }) {
  if (left.posX != null && right.posX != null && left.posY != null && right.posY != null) {
    const dx = Math.abs(left.posX - right.posX);
    const dy = Math.abs(left.posY - right.posY);
    if (dy <= 45 && dx >= 70 && dx <= 150) return true;
  }
  return (left.combinableWith || []).includes(right.id) || (right.combinableWith || []).includes(left.id);
}

function reservationWindow(reservation: { holdStart: string | null; holdEnd: string | null; reservationTime: string; turnDuration: number | null }, fallbackStart?: string, fallbackDuration?: number) {
  const start = clockMinutes(reservation.holdStart || fallbackStart || reservation.reservationTime);
  const end = reservation.holdEnd ? clockMinutes(reservation.holdEnd) : start + (reservation.turnDuration || fallbackDuration || 180);
  return { start, end: Math.max(end, start + 15) };
}

async function screenSecondReservation(input: {
  locationId: string;
  experienceId: string;
  date: string;
  time: string;
  partySize: number;
  customerEmail?: string | null;
  customerPhone?: string | null;
  turnDuration: number;
  acceptSeparateTables?: boolean;
}) {
  const email = input.customerEmail?.trim().toLowerCase() || "";
  const phone = (input.customerPhone || "").replace(/\D/g, "").slice(-10);
  const [experience] = await db.select().from(resyExperiences).where(eq(resyExperiences.id, input.experienceId));
  const existing = (await db.select().from(resyReservations).where(and(
    eq(resyReservations.locationId, input.locationId),
    eq(resyReservations.experienceId, input.experienceId),
    eq(resyReservations.reservationDate, input.date),
    not(eq(resyReservations.status, "cancelled")),
    not(eq(resyReservations.status, "completed")),
  ))).filter((reservation) => {
    const sameEmail = email && reservation.customerEmail?.trim().toLowerCase() === email;
    const samePhone = phone.length >= 7 && (reservation.customerPhone || "").replace(/\D/g, "").slice(-10) === phone;
    return sameEmail || samePhone;
  });
  if (existing.length === 0) return { blocked: false as const };
  if (!experience?.allowAdjacentReservations) {
    return {
      blocked: true as const,
      message: "You already have a reservation on this day. This event does not accept a second reservation, because another table is not guaranteed to be next to your first table.",
    };
  }
  if (existing.length > 1) {
    return {
      blocked: true as const,
      message: "You already have more than one reservation on this day. Another table cannot be added.",
    };
  }
  const first = existing[0];
  const tables = await db.select().from(resyLocationTables).where(and(
    eq(resyLocationTables.locationId, input.locationId),
    eq(resyLocationTables.isActive, true),
    eq(resyLocationTables.isPaused, false),
  ));
  const walkins = await openWalkinTableIds(input.locationId, input.date);
  const dayReservations = await db.select().from(resyReservations).where(and(
    eq(resyReservations.locationId, input.locationId),
    eq(resyReservations.reservationDate, input.date),
    not(eq(resyReservations.status, "cancelled")),
    not(eq(resyReservations.status, "completed")),
  ));
  const requested = { start: clockMinutes(input.time), end: clockMinutes(input.time) + input.turnDuration };
  const firstWindow = reservationWindow(first);
  const freeFor = (tableId: string, window: { start: number; end: number }, ignoreId: string) => {
    if (walkins.has(tableId)) return false;
    return !dayReservations.some((reservation) => {
      if (reservation.id === ignoreId || !reservationUsesTable(reservation, tableId)) return false;
      const held = reservationWindow(reservation);
      return window.start < held.end && held.start < window.end;
    });
  };
  const fits = (table: typeof tables[number], party: number) => party >= table.minCapacity && party <= table.maxCapacity;
  const current = tables.find((table) => reservationUsesTable(first, table.id));
  if (current) {
    const neighbor = tables.find((table) => table.id !== current.id && tablesAreAdjacent(current, table) && fits(table, input.partySize) && freeFor(table.id, requested, first.id));
    if (neighbor) return { blocked: false as const, tableId: neighbor.id, tableLabel: neighbor.tableLabel };
  }
  for (const left of tables) {
    if (!fits(left, first.partySize) || !freeFor(left.id, firstWindow, first.id)) continue;
    for (const right of tables) {
      if (right.id === left.id || !tablesAreAdjacent(left, right) || !fits(right, input.partySize) || !freeFor(right.id, requested, first.id)) continue;
      return {
        blocked: false as const,
        tableId: right.id,
        tableLabel: right.tableLabel,
        moveExisting: { reservationId: first.id, tableId: left.id, tableLabel: left.tableLabel },
      };
    }
  }
  if (input.acceptSeparateTables) return { blocked: false as const, separateAccepted: true as const };
  return {
    blocked: true as const,
    separateOption: true as const,
    message: "Sorry, I see you are trying to book a second table, unfortunately at this time we do not have two tables adjacent to each other and therefore cannot accommodate your request.",
  };
}

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
    
    const bookingLocationId = data.locationId || experience?.locationId;
    if (bookingLocationId && data.reservationDate) {
      const bookingLocation = await resyStorage.getLocation(bookingLocationId);
      const windowMessage = outsideAdvanceBookingWindow(bookingLocation?.advanceBookingDays, String(data.reservationDate));
      if (windowMessage) return res.status(400).json({ message: windowMessage });

      if (experience?.reservationType === "table" && data.reservationTime && data.partySize) {
        const party = Number(data.partySize);
        if (bookingLocation?.maxReservationSize && party > bookingLocation.maxReservationSize) {
          return res.status(400).json({ message: `The largest party we can reserve is ${bookingLocation.maxReservationSize}.` });
        }
        const schedule = await getNormalizedSchedule(bookingLocationId, String(data.reservationDate));
        if (schedule.isClosed) {
          return res.status(400).json({ message: schedule.closureReason || "This location is closed on that day." });
        }
        const period = schedule.servicePeriods.find((item) => {
          const start = timeToMinutes(item.startTime);
          const end = timeToMinutes(item.lastReservationTime || item.endTime);
          const requested = timeToMinutes(String(data.reservationTime));
          return requested >= start && requested < end;
        });
        if (!period) {
          return res.status(400).json({ message: "That time is outside the hours for this location." });
        }
        const dayReservations = await db.select().from(resyReservations).where(and(
          eq(resyReservations.locationId, bookingLocationId),
          eq(resyReservations.reservationDate, String(data.reservationDate)),
          not(eq(resyReservations.status, "cancelled")),
          not(eq(resyReservations.status, "completed"))
        ));
        const dailyUsed = dayReservations.reduce((sum, reservation) => sum + (reservation.partySize || 0), 0);
        const flowControls = await resyStorage.getFlowControlsByLocation(bookingLocationId);
        const dailyCap = flowControls.find((control) => control.isActive && control.maxDailyCovers)?.maxDailyCovers ?? null;
        if (dailyCap !== null && dailyUsed + party > dailyCap) {
          return res.status(400).json({ message: withWalkInInvite("Sorry, we have reached the maximum number of guests we can seat on this day.") });
        }
        const flowResult = await getRemainingCovers(bookingLocationId, String(data.reservationDate), String(data.reservationTime), period.periodId);
        if (flowResult.remainingCovers < party) {
          return res.status(400).json({ message: withWalkInInvite(`Sorry, the time selected is not available for a party of ${party}.`) });
        }
        const turnDuration = await getTurnDuration(bookingLocationId, period.periodId, party);
        const second = await screenSecondReservation({
          locationId: bookingLocationId,
          experienceId: String(data.experienceId || experience?.id || ""),
          date: String(data.reservationDate),
          time: String(data.reservationTime),
          partySize: party,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          turnDuration,
          acceptSeparateTables: data.acceptSeparateTables === true,
        });
        if (second.blocked) return res.status(400).json({ message: second.message, separateOption: second.separateOption === true });
        if (second.separateAccepted) {
          data.specialRequests = [data.specialRequests, "Guest accepted that this second table is not close to their other reservation."].filter(Boolean).join(" ");
        }
        if (second.moveExisting) {
          await resyStorage.updateReservation(second.moveExisting.reservationId, {
            assignedTableId: second.moveExisting.tableId,
            tableId: second.moveExisting.tableId,
            tableAssignment: second.moveExisting.tableLabel,
          });
        }
        const availableTables = second.tableId
          ? [{ tableId: second.tableId, tableLabel: second.tableLabel }]
          : await getAvailableTables(bookingLocationId, String(data.reservationDate), String(data.reservationTime), party, turnDuration);
        if (availableTables.length === 0) {
          const fittingTables = await db.select().from(resyLocationTables).where(and(
            eq(resyLocationTables.locationId, bookingLocationId),
            eq(resyLocationTables.isActive, true),
            eq(resyLocationTables.isPaused, false),
            lte(resyLocationTables.minCapacity, party),
            gte(resyLocationTables.maxCapacity, party)
          ));
          return res.status(400).json({
            message: fittingTables.length === 0
              ? `Sorry, we do not have a table that can seat ${party} people.`
              : withWalkInInvite(`Sorry, you are booking a table for ${party} people and all of the tables that can seat ${party} are already booked.`),
          });
        }
        data.assignedTableId = availableTables[0].tableId;
        data.tableAssignment = availableTables[0].tableLabel;
        data.turnDuration = turnDuration;
        data.holdStart = data.reservationTime;
        data.holdEnd = minutesToTime(timeToMinutes(String(data.reservationTime)) + turnDuration);
      }
    }

    if (!data.confirmationToken) {
      data.confirmationToken = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`.toUpperCase();
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
          const emailData = await reservationConfirmationContent(experience, {
            customerName: reservation.customerName,
            customerEmail: reservation.customerEmail,
            reservationDate: reservation.reservationDate,
            reservationTime: reservation.reservationTime || "TBD",
            ticketQuantity: reservation.ticketQuantity || undefined,
            partySize: reservation.partySize || undefined,
            totalAmount: reservation.totalAmount || undefined,
            confirmationCode: reservation.confirmationCode || undefined,
            specialRequests: reservation.specialRequests || undefined,
            locationId: reservation.locationId,
            confirmationToken: reservation.confirmationToken || undefined,
            experienceId: reservation.experienceId,
          });
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

function phoneLast10(value: unknown): string {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : "";
}

function phoneDigitsEqual(column: any, digits: string) {
  return sql`right(regexp_replace(coalesce(${column}, ''), '\\D', '', 'g'), 10) = ${digits}`;
}

router.post("/api/resy/guests/lookup-phone", async (req, res) => {
  try {
    const digits = phoneLast10(req.body?.phone);
    if (!digits) return res.json({ matched: false });

    const identities = await db
      .select({
        firstName: customerIdentities.mergedFirstName,
        lastName: customerIdentities.mergedLastName,
        email: customerIdentities.primaryEmail,
      })
      .from(customerIdentities)
      .where(phoneDigitsEqual(customerIdentities.primaryPhone, digits))
      .limit(15);

    const guests = await db
      .select({
        firstName: toastGuests.firstName,
        lastName: toastGuests.lastName,
        email: toastGuests.email1,
      })
      .from(toastGuests)
      .where(
        sql`${phoneDigitsEqual(toastGuests.phone1, digits)}
          OR ${phoneDigitsEqual(toastGuests.phone2, digits)}
          OR ${phoneDigitsEqual(toastGuests.phone3, digits)}
          OR ${phoneDigitsEqual(toastGuests.phone4, digits)}
          OR ${phoneDigitsEqual(toastGuests.phone5, digits)}`
      )
      .limit(15);

    const reservationCustomers = await db
      .select({
        firstName: resyCustomers.firstName,
        lastName: resyCustomers.lastName,
        email: resyCustomers.email,
      })
      .from(resyCustomers)
      .where(phoneDigitsEqual(resyCustomers.phone, digits))
      .limit(15);

    const people = new Map<string, { firstName: string; lastName: string; email: string }>();
    const addPerson = (
      firstName: string | null,
      lastName: string | null,
      email: string | null,
      prefer: boolean,
    ) => {
      const first = (firstName || "").trim();
      const last = (lastName || "").trim();
      const mail = (email || "").trim();
      if (!first && !last && !mail) return;
      const key = `${first.toLowerCase()}|${last.toLowerCase()}`;
      const existing = people.get(key);
      if (!existing) {
        people.set(key, { firstName: first, lastName: last, email: mail });
        return;
      }
      if (!existing.firstName && first) existing.firstName = first;
      if (!existing.lastName && last) existing.lastName = last;
      if ((prefer || !existing.email) && mail) existing.email = mail;
    };

    for (const guest of guests) addPerson(guest.firstName, guest.lastName, guest.email, false);
    for (const customer of reservationCustomers) addPerson(customer.firstName, customer.lastName, customer.email, false);
    for (const identity of identities) addPerson(identity.firstName, identity.lastName, identity.email, true);

    const named = [...people.values()].filter((person) => person.firstName || person.lastName);
    const matches = named.length > 0 ? named : [...people.values()];
    if (matches.length !== 1) return res.json({ matched: false });

    const person = matches[0];
    res.json({
      matched: true,
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
    });
  } catch (error: any) {
    console.error("Guest phone lookup failed:", error);
    res.status(500).json({ matched: false });
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

function reservationUsesTable(reservation: { assignedTableId: string | null; tableId: string | null }, tableId: string) {
  if (reservation.tableId === tableId) return true;
  return (reservation.assignedTableId || "").split(",").filter(Boolean).includes(tableId);
}

function replaceReservationTable(
  reservation: { assignedTableId: string | null; tableId: string | null; tableAssignment: string | null },
  fromId: string,
  toId: string,
  fromLabel: string,
  toLabel: string,
) {
  const assignedIds = (reservation.assignedTableId || "").split(",").filter(Boolean);
  const nextIds = assignedIds.map((id) => (id === fromId ? toId : id));
  const nextAssignment = (reservation.tableAssignment || "")
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean)
    .map((label) => (label === fromLabel ? toLabel : label))
    .join(", ");
  return {
    assignedTableId: nextIds.length ? nextIds.join(",") : toId,
    tableId: reservation.tableId === fromId ? toId : reservation.tableId,
    tableAssignment: nextAssignment || toLabel,
  };
}

async function openWalkinTableIds(locationId: string, date: string) {
  const rows = await db.select({ tableId: resyTableWalkins.tableId }).from(resyTableWalkins).where(and(
    eq(resyTableWalkins.locationId, locationId),
    eq(resyTableWalkins.serviceDate, date),
    sql`${resyTableWalkins.clearedAt} IS NULL`,
  ));
  return new Set(rows.map((row) => row.tableId));
}

router.get("/api/resy/locations/:locationId/floor", requireResyAdmin, requireFloorPin, async (req, res) => {
  try {
    const { locationId } = req.params;
    const date = String(req.query.date || new Date().toISOString().slice(0, 10));
    const [tables, reservations, walkins] = await Promise.all([
      db.select().from(resyLocationTables).where(and(
        eq(resyLocationTables.locationId, locationId),
        eq(resyLocationTables.isActive, true),
        eq(resyLocationTables.isPaused, false),
      )),
      db.select().from(resyReservations).where(and(
        eq(resyReservations.locationId, locationId),
        eq(resyReservations.reservationDate, date),
        not(eq(resyReservations.status, "cancelled")),
      )),
      db.select().from(resyTableWalkins).where(and(
        eq(resyTableWalkins.locationId, locationId),
        eq(resyTableWalkins.serviceDate, date),
        sql`${resyTableWalkins.clearedAt} IS NULL`,
      )),
    ]);
    const turnRows = await db.select().from(resyTurnTimeSettings).where(and(
      eq(resyTurnTimeSettings.locationId, locationId),
      eq(resyTurnTimeSettings.isActive, true),
    ));
    const turnMinutes = turnRows[0]?.durationMinutes || 180;
    res.json({ date, tables, reservations, walkins, turnMinutes });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to load the floor plan: " + error.message });
  }
});

router.patch("/api/resy/location-tables/:id/position", requireResyAdmin, requireFloorPin, async (req, res) => {
  try {
    const posX = Number(req.body.posX);
    const posY = Number(req.body.posY);
    if (!Number.isFinite(posX) || !Number.isFinite(posY)) {
      return res.status(400).json({ message: "A table position is required." });
    }
    const [table] = await db.update(resyLocationTables).set({
      posX: Math.round(posX),
      posY: Math.round(posY),
      updatedAt: new Date(),
    }).where(eq(resyLocationTables.id, req.params.id)).returning();
    if (!table) return res.status(404).json({ message: "Table not found" });
    res.json(table);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to move the table: " + error.message });
  }
});

router.post("/api/resy/reservations/:id/arrive", requireResyAdmin, requireFloorPin, async (req, res) => {
  try {
    const reservation = await resyStorage.getReservation(req.params.id);
    if (!reservation) return res.status(404).json({ message: "Reservation not found" });
    if (reservation.status === "cancelled" || reservation.status === "completed") {
      return res.status(400).json({ message: "This reservation is no longer active." });
    }
    if (!reservation.assignedTableId && !reservation.tableId) {
      return res.status(400).json({ message: "Assign this reservation to a table before seating the party." });
    }
    const tableIds = (reservation.assignedTableId || reservation.tableId || "").split(",").filter(Boolean);
    const sameDay = await db.select().from(resyReservations).where(and(
      eq(resyReservations.locationId, reservation.locationId || ""),
      eq(resyReservations.reservationDate, reservation.reservationDate),
      eq(resyReservations.status, "seated"),
    ));
    const alreadySeated = sameDay.find((row) => row.id !== reservation.id && tableIds.some((tableId) => reservationUsesTable(row, tableId)));
    if (alreadySeated) {
      return res.status(400).json({ message: `${alreadySeated.customerName} is already seated at that table.` });
    }
    const updated = await resyStorage.updateReservation(reservation.id, { status: "seated", seatedAt: new Date() });
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to seat the reservation: " + error.message });
  }
});

router.post("/api/resy/locations/:locationId/tables/:tableId/clear", requireResyAdmin, requireFloorPin, async (req, res) => {
  try {
    const { locationId, tableId } = req.params;
    const date = String(req.body.date || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ message: "A service date is required." });
    const [walkin] = await db.select().from(resyTableWalkins).where(and(
      eq(resyTableWalkins.locationId, locationId),
      eq(resyTableWalkins.tableId, tableId),
      eq(resyTableWalkins.serviceDate, date),
      sql`${resyTableWalkins.clearedAt} IS NULL`,
    ));
    if (walkin) {
      await db.update(resyTableWalkins).set({ clearedAt: new Date() }).where(eq(resyTableWalkins.id, walkin.id));
      return res.json({ cleared: "walkin" });
    }
    const reservations = await db.select().from(resyReservations).where(and(
      eq(resyReservations.locationId, locationId),
      eq(resyReservations.reservationDate, date),
      eq(resyReservations.status, "seated"),
    ));
    const seated = reservations.find((reservation) => reservationUsesTable(reservation, tableId));
    if (!seated) return res.status(400).json({ message: "That table does not have a seated party." });
    await resyStorage.updateReservation(seated.id, { status: "completed" });
    res.json({ cleared: "reservation", reservationId: seated.id });
  } catch (error: any) {
    res.status(400).json({ message: "Failed to clear the table: " + error.message });
  }
});

router.post("/api/resy/locations/:locationId/tables/swap", requireResyAdmin, requireFloorPin, async (req, res) => {
  try {
    const { locationId } = req.params;
    const { date, fromTableId, toTableId } = req.body || {};
    if (!fromTableId || !toTableId || fromTableId === toTableId) {
      return res.status(400).json({ message: "Choose two different tables." });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return res.status(400).json({ message: "A service date is required." });
    const tables = await db.select().from(resyLocationTables).where(eq(resyLocationTables.locationId, locationId));
    const fromTable = tables.find((table) => table.id === fromTableId);
    const toTable = tables.find((table) => table.id === toTableId);
    if (!fromTable || !toTable) return res.status(404).json({ message: "Table not found" });
    const reservations = await db.select().from(resyReservations).where(and(
      eq(resyReservations.locationId, locationId),
      eq(resyReservations.reservationDate, String(date)),
      not(eq(resyReservations.status, "cancelled")),
      not(eq(resyReservations.status, "completed")),
    ));
    const moving = reservations.filter((reservation) => reservationUsesTable(reservation, fromTableId) || reservationUsesTable(reservation, toTableId));
    for (const reservation of moving) {
      const sourceId = reservationUsesTable(reservation, fromTableId) ? fromTableId : toTableId;
      const target = sourceId === fromTableId ? toTable : fromTable;
      const source = sourceId === fromTableId ? fromTable : toTable;
      const next = replaceReservationTable(reservation, source.id, target.id, source.tableLabel, target.tableLabel);
      await resyStorage.updateReservation(reservation.id, next);
    }
    res.json({ moved: moving.length });
  } catch (error: any) {
    res.status(400).json({ message: "Failed to move the reservations: " + error.message });
  }
});

router.post("/api/resy/locations/:locationId/host-walkin", requireResyAdmin, requireFloorPin, async (req, res) => {
  try {
    const { locationId } = req.params;
    const date = String(req.body?.date || "");
    const customerName = String(req.body?.customerName || "").trim();
    const customerPhone = String(req.body?.customerPhone || "").trim();
    const partySize = Number(req.body?.partySize);
    const tableId = String(req.body?.tableId || "");
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    if (date !== todayKey) return res.status(400).json({ message: "A host walk-in is seated today." });
    if (!customerName || !customerPhone) return res.status(400).json({ message: "A name and phone number are required." });
    if (!Number.isInteger(partySize) || partySize < 1) return res.status(400).json({ message: "A party size is required." });
    const [table] = await db.select().from(resyLocationTables).where(and(
      eq(resyLocationTables.id, tableId),
      eq(resyLocationTables.locationId, locationId),
      eq(resyLocationTables.isActive, true),
      eq(resyLocationTables.isPaused, false),
    ));
    if (!table) return res.status(404).json({ message: "Table not found" });
    if (partySize < table.minCapacity || partySize > table.maxCapacity) {
      return res.status(400).json({ message: `${table.tableLabel} seats ${table.minCapacity} to ${table.maxCapacity}.` });
    }
    const walkins = await openWalkinTableIds(locationId, date);
    if (walkins.has(tableId)) return res.status(400).json({ message: `${table.tableLabel} is occupied by Pirates!!!.` });
    const reservations = await db.select().from(resyReservations).where(and(
      eq(resyReservations.locationId, locationId),
      eq(resyReservations.reservationDate, date),
      not(eq(resyReservations.status, "cancelled")),
      not(eq(resyReservations.status, "completed")),
    ));
    if (reservations.some((reservation) => reservation.status === "seated" && reservationUsesTable(reservation, tableId))) {
      return res.status(400).json({ message: `${table.tableLabel} is already occupied.` });
    }
    const start = today.getHours() * 60 + today.getMinutes();
    const duration = await getTurnDuration(locationId, null, partySize);
    const end = start + duration;
    const conflict = reservations.some((reservation) => {
      if (!reservationUsesTable(reservation, tableId)) return false;
      const window = reservationSpan(reservation);
      return start < window.end && window.start < end;
    });
    if (conflict) return res.status(400).json({ message: `${table.tableLabel} has a reservation during this seating.` });
    const [experience] = await db.select().from(resyExperiences).where(and(
      eq(resyExperiences.locationId, locationId),
      eq(resyExperiences.isActive, true),
    ));
    if (!experience) return res.status(400).json({ message: "This location does not have a reservation to attach the walk-in to." });
    const holdStart = minutesToTime(start);
    const holdEnd = minutesToTime(end);
    const phoneDigits = customerPhone.replace(/\D/g, "") || String(Date.now());
    const reservation = await resyStorage.createReservation({
      experienceId: experience.id,
      locationId,
      reservationDate: date,
      reservationTime: holdStart,
      partySize,
      customerName,
      customerEmail: `walkin-${phoneDigits}@guest.nashobawinery.org`,
      customerPhone,
      status: "seated",
      notes: "Seated by the host as a walk-in.",
      assignedTableId: table.id,
      tableId: table.id,
      tableAssignment: table.tableLabel,
      holdStart,
      holdEnd,
      turnDuration: duration,
      seatedAt: new Date(),
      confirmationCode: `W${phoneDigits.slice(-4)}${start}`,
    });
    res.json(reservation);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to seat the walk-in: " + error.message });
  }
});

router.post("/api/resy/locations/:locationId/tables/:tableId/pirates", requireResyAdmin, requireFloorPin, async (req, res) => {
  try {
    const { locationId, tableId } = req.params;
    const date = String(req.body.date || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ message: "A service date is required." });
    const walkins = await openWalkinTableIds(locationId, date);
    if (walkins.has(tableId)) return res.status(400).json({ message: "Pirates!!! are already seated at that table." });
    const tables = await db.select().from(resyLocationTables).where(and(
      eq(resyLocationTables.locationId, locationId),
      eq(resyLocationTables.isActive, true),
      eq(resyLocationTables.isPaused, false),
    ));
    const source = tables.find((table) => table.id === tableId);
    if (!source) return res.status(404).json({ message: "Table not found" });
    const reservations = await db.select().from(resyReservations).where(and(
      eq(resyReservations.locationId, locationId),
      eq(resyReservations.reservationDate, date),
      not(eq(resyReservations.status, "cancelled")),
      not(eq(resyReservations.status, "completed")),
    ));
    const onTable = reservations.filter((reservation) => reservationUsesTable(reservation, tableId));
    if (onTable.some((reservation) => reservation.status === "seated")) {
      return res.status(400).json({ message: "Clear the seated party before seating a walk-in." });
    }
    const displaced: string[] = [];
    const placed: string[] = [];
    const windows = (reservation: typeof onTable[number]) => ({
      start: timeToMinutes(reservation.holdStart || reservation.reservationTime),
      end: timeToMinutes(reservation.holdEnd || reservation.reservationTime) + (reservation.holdEnd ? 0 : (reservation.turnDuration || 180)),
    });
    const conflicts = (candidateId: string, reservation: typeof onTable[number]) => {
      const window = windows(reservation);
      return reservations.some((other) => {
        if (other.id === reservation.id || !reservationUsesTable(other, candidateId)) return false;
        const otherWindow = windows(other);
        return window.start < otherWindow.end && otherWindow.start < window.end;
      });
    };
    for (const reservation of onTable) {
      const candidate = tables.find((table) =>
        table.id !== tableId &&
        !walkins.has(table.id) &&
        table.minCapacity <= reservation.partySize &&
        table.maxCapacity >= reservation.partySize &&
        !conflicts(table.id, reservation)
      );
      if (!candidate) {
        await resyStorage.updateReservation(reservation.id, { assignedTableId: null, tableId: null, tableAssignment: null });
        displaced.push(reservation.customerName);
        continue;
      }
      const next = replaceReservationTable(reservation, tableId, candidate.id, source.tableLabel, candidate.tableLabel);
      await resyStorage.updateReservation(reservation.id, next);
      reservation.assignedTableId = next.assignedTableId;
      reservation.tableId = next.tableId;
      placed.push(`${reservation.customerName} to ${candidate.tableLabel}`);
    }
    const [walkin] = await db.insert(resyTableWalkins).values({
      locationId,
      tableId,
      serviceDate: date,
      label: "Pirates!!!",
    }).returning();
    res.json({ walkin, placed, displaced });
  } catch (error: any) {
    res.status(400).json({ message: "Failed to seat the walk-in: " + error.message });
  }
});

function clockMinutes(time: string): number {
  const match = String(time || "").trim().match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?/);
  if (!match) return 0;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3]?.toLowerCase();
  if (period === "pm" && hours < 12) hours += 12;
  if (period === "am" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function reservationSpan(reservation: { holdStart: string | null; holdEnd: string | null; reservationTime: string; turnDuration: number | null }) {
  const start = clockMinutes(reservation.holdStart || reservation.reservationTime);
  const end = reservation.holdEnd ? clockMinutes(reservation.holdEnd) : start + (reservation.turnDuration || 180);
  return { start, end: Math.max(end, start + 15) };
}

function spansOverlap(left: { start: number; end: number }, right: { start: number; end: number }) {
  return left.start < right.end && right.start < left.end;
}

router.post("/api/resy/locations/:locationId/floor/suggest", requireResyAdmin, requireFloorPin, async (req, res) => {
  try {
    const { locationId } = req.params;
    const date = String(req.body?.date || "");
    const reservationId = String(req.body?.reservationId || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !reservationId) {
      return res.status(400).json({ message: "A reservation and service date are required." });
    }
    const [tables, reservations, walkinRows] = await Promise.all([
      db.select().from(resyLocationTables).where(and(
        eq(resyLocationTables.locationId, locationId),
        eq(resyLocationTables.isActive, true),
        eq(resyLocationTables.isPaused, false),
      )),
      db.select().from(resyReservations).where(and(
        eq(resyReservations.locationId, locationId),
        eq(resyReservations.reservationDate, date),
        not(eq(resyReservations.status, "cancelled")),
        not(eq(resyReservations.status, "completed")),
      )),
      db.select().from(resyTableWalkins).where(and(
        eq(resyTableWalkins.locationId, locationId),
        eq(resyTableWalkins.serviceDate, date),
        sql`${resyTableWalkins.clearedAt} IS NULL`,
      )),
    ]);
    const walkins = new Set(walkinRows.map((row) => row.tableId));
    const target = reservations.find((reservation) => reservation.id === reservationId);
    if (!target) return res.status(404).json({ message: "Reservation not found" });
    const assignment = new Map<string, string | null>();
    const tableFor = (reservation: typeof target) => {
      if (assignment.has(reservation.id)) return assignment.get(reservation.id) || null;
      const ids = (reservation.assignedTableId || reservation.tableId || "").split(",").filter(Boolean);
      return ids.find((id) => tables.some((table) => table.id === id)) || null;
    };
    const clashes = (tableId: string, reservation: typeof target) => reservations.some((other) => {
      if (other.id === reservation.id || tableFor(other) !== tableId) return false;
      return spansOverlap(reservationSpan(reservation), reservationSpan(other));
    });
    const fits = (table: typeof tables[number], partySize: number) => table.minCapacity <= partySize && table.maxCapacity >= partySize;
    const current = tables.find((table) => table.id === tableFor(target));
    let problem = "This reservation needs a table.";
    if (!current) problem = `${target.customerName} does not have a table.`;
    else if (!fits(current, target.partySize)) problem = `${current.tableLabel} cannot seat a party of ${target.partySize}.`;
    else if (walkins.has(current.id)) problem = `${current.tableLabel} is occupied by Pirates!!!.`;
    else if (clashes(current.id, target)) problem = `${current.tableLabel} is already reserved during ${target.customerName}'s time.`;

    const openFor = (reservation: typeof target, blocked: Set<string>) => tables.find((table) =>
      !blocked.has(table.id) && !walkins.has(table.id) && fits(table, reservation.partySize) && !clashes(table.id, reservation)
    );
    let planned: Array<{ reservationId: string; toTableId: string }> = [];
    const direct = openFor(target, new Set(current ? [current.id] : []));
    if (direct) planned = [{ reservationId: target.id, toTableId: direct.id }];
    if (!planned.length) {
      const candidates = tables.filter((table) => fits(table, target.partySize) && !walkins.has(table.id));
      for (const candidate of candidates) {
        const blockers = reservations.filter((reservation) =>
          reservation.id !== target.id &&
          reservation.status !== "seated" &&
          tableFor(reservation) === candidate.id &&
          spansOverlap(reservationSpan(target), reservationSpan(reservation))
        );
        if (!blockers.length || blockers.length > 4) continue;
        assignment.clear();
        assignment.set(target.id, candidate.id);
        const plan: Array<{ reservationId: string; toTableId: string }> = [];
        let possible = true;
        for (const blocker of blockers) {
          const next = tables.find((table) =>
            table.id !== candidate.id &&
            !walkins.has(table.id) &&
            fits(table, blocker.partySize) &&
            !clashes(table.id, blocker)
          );
          if (!next) { possible = false; break; }
          assignment.set(blocker.id, next.id);
          plan.push({ reservationId: blocker.id, toTableId: next.id });
        }
        if (!possible || clashes(candidate.id, target)) continue;
        planned = [{ reservationId: target.id, toTableId: candidate.id }, ...plan];
        break;
      }
      assignment.clear();
    }

    const moves = planned.map((move) => {
      const reservation = reservations.find((item) => item.id === move.reservationId)!;
      const from = tables.find((table) => table.id === tableFor(reservation));
      const to = tables.find((table) => table.id === move.toTableId)!;
      return {
        reservationId: reservation.id,
        customerName: reservation.customerName,
        time: reservation.reservationTime,
        partySize: reservation.partySize,
        fromLabel: from?.tableLabel || "unassigned",
        toTableId: to.id,
        toLabel: to.tableLabel,
      };
    });
    let summary = moves.length
      ? moves.map((move) => `Seat ${move.customerName} (${move.partySize}) at ${move.toLabel} instead of ${move.fromLabel}.`).join(" ")
      : `No open table can seat ${target.customerName}'s party of ${target.partySize} without overlapping another reservation.`;
    if (moves.length && process.env.OPENAI_API_KEY) {
      try {
        const { default: OpenAI } = await import("openai");
        const openai = new OpenAI();
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.2,
          messages: [
            { role: "system", content: "Explain a seating change to a restaurant host. Use only the moves provided. Do not invent tables, times, or guests. Two or three short sentences." },
            { role: "user", content: `Problem: ${problem}\nMoves:\n${moves.map((move) => `${move.customerName}, party of ${move.partySize} at ${move.time}, from ${move.fromLabel} to ${move.toLabel}`).join("\n")}` },
          ],
        });
        summary = completion.choices[0]?.message?.content?.trim() || summary;
      } catch (error) {
        console.error("Host seating suggestion failed:", error);
      }
    }
    res.json({ problem, summary, moves });
  } catch (error: any) {
    res.status(400).json({ message: "Failed to suggest seating: " + error.message });
  }
});

router.post("/api/resy/locations/:locationId/floor/apply", requireResyAdmin, requireFloorPin, async (req, res) => {
  try {
    const { locationId } = req.params;
    const date = String(req.body?.date || "");
    const requested = Array.isArray(req.body?.moves) ? req.body.moves : [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || requested.length === 0) {
      return res.status(400).json({ message: "A seating recommendation is required." });
    }
    const [tables, reservations, walkinRows] = await Promise.all([
      db.select().from(resyLocationTables).where(and(
        eq(resyLocationTables.locationId, locationId),
        eq(resyLocationTables.isActive, true),
        eq(resyLocationTables.isPaused, false),
      )),
      db.select().from(resyReservations).where(and(
        eq(resyReservations.locationId, locationId),
        eq(resyReservations.reservationDate, date),
        not(eq(resyReservations.status, "cancelled")),
        not(eq(resyReservations.status, "completed")),
      )),
      db.select().from(resyTableWalkins).where(and(
        eq(resyTableWalkins.locationId, locationId),
        eq(resyTableWalkins.serviceDate, date),
        sql`${resyTableWalkins.clearedAt} IS NULL`,
      )),
    ]);
    const walkins = new Set(walkinRows.map((row) => row.tableId));
    const assignment = new Map<string, string | null>();
    for (const reservation of reservations) {
      const ids = (reservation.assignedTableId || reservation.tableId || "").split(",").filter(Boolean);
      assignment.set(reservation.id, ids.find((id) => tables.some((table) => table.id === id)) || null);
    }
    for (const move of requested) {
      const reservation = reservations.find((item) => item.id === move.reservationId);
      const table = tables.find((item) => item.id === move.toTableId);
      if (!reservation || !table) return res.status(400).json({ message: "That recommendation no longer matches the floor." });
      if (reservation.partySize < table.minCapacity || reservation.partySize > table.maxCapacity) {
        return res.status(400).json({ message: `${table.tableLabel} cannot seat ${reservation.customerName}.` });
      }
      if (walkins.has(table.id)) return res.status(400).json({ message: `${table.tableLabel} is occupied by Pirates!!!.` });
      assignment.set(reservation.id, table.id);
    }
    for (const reservation of reservations) {
      const tableId = assignment.get(reservation.id);
      if (!tableId) continue;
      const window = reservationSpan(reservation);
      const overlap = reservations.some((other) => {
        if (other.id === reservation.id || assignment.get(other.id) !== tableId) return false;
        const otherWindow = reservationSpan(other);
        return window.start < otherWindow.end && otherWindow.start < window.end;
      });
      if (overlap) return res.status(400).json({ message: "Those moves would put two parties at the same table at the same time." });
    }
    for (const move of requested) {
      const table = tables.find((item) => item.id === move.toTableId)!;
      await resyStorage.updateReservation(move.reservationId, {
        assignedTableId: table.id,
        tableId: table.id,
        tableAssignment: table.tableLabel,
      });
    }
    res.json({ applied: requested.length });
  } catch (error: any) {
    res.status(400).json({ message: "Failed to apply the seating: " + error.message });
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
    
    const windowMessage = outsideAdvanceBookingWindow(location.advanceBookingDays, String(date));
    if (windowMessage) {
      return res.json({
        availableTimes: [],
        messages: { closedMessage: windowMessage },
      });
    }

    // Parse reservation close time if set
    let closeTimeMinutes: number | null = null;
    if (location.reservationCloseTime) {
      closeTimeMinutes = timeToMinutes(location.reservationCloseTime);
    }
    
    // Get flow controls for capacity limits
    const flowControls = await resyStorage.getFlowControlsByLocation(locationId);
    
    // Generate time slots based on service periods
    const dayReservations = await db.select().from(resyReservations).where(and(
      eq(resyReservations.locationId, locationId),
      eq(resyReservations.reservationDate, date as string),
      not(eq(resyReservations.status, "cancelled")),
      not(eq(resyReservations.status, "completed"))
    ));
    const dailyUsed = dayReservations.reduce((sum, reservation) => sum + (reservation.partySize || 0), 0);
    const dailyCap = flowControls.find((control) => control.isActive && control.maxDailyCovers)?.maxDailyCovers ?? null;
    const fittingTables = await db.select().from(resyLocationTables).where(and(
      eq(resyLocationTables.locationId, locationId),
      eq(resyLocationTables.isActive, true),
      eq(resyLocationTables.isPaused, false),
      lte(resyLocationTables.minCapacity, requestedSize),
      gte(resyLocationTables.maxCapacity, requestedSize)
    ));

    const availableTimes: Array<{
      time: string;
      available: boolean;
      capacity?: number;
      mealPeriod?: string;
      tablesAvailable?: number;
      reason?: string;
      walkIn?: boolean;
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
        const overDailyCap = dailyCap !== null && dailyUsed + requestedSize > dailyCap;
        const overPartyCap = !!location.maxReservationSize && requestedSize > location.maxReservationSize;
        let reason: string | undefined;
        let walkIn = false;
        if (overPartyCap) {
          reason = `The largest party we can reserve is ${location.maxReservationSize}.`;
        } else if (overDailyCap) {
          reason = "Sorry, we have reached the maximum number of guests we can seat on this day.";
          walkIn = true;
        } else if (!hasFlowCapacity) {
          reason = `Sorry, the time selected is not available for a party of ${requestedSize}.`;
          walkIn = true;
        } else if (!hasTableAvailable) {
          if (fittingTables.length === 0) {
            reason = `Sorry, we do not have a table that can seat ${requestedSize} people.`;
          } else {
            reason = `Sorry, you are booking a table for ${requestedSize} people and all of the tables that can seat ${requestedSize} are already booked.`;
            walkIn = true;
          }
        }
        
        availableTimes.push({
          time: timeStr,
          available: !overPartyCap && !overDailyCap && hasFlowCapacity && hasTableAvailable,
          capacity: flowResult.remainingCovers,
          mealPeriod: period.periodName,
          tablesAvailable: availableTables.length,
          reason,
          walkIn,
        });
        
        // Advance by interval
        currentMinutes += intervalMinutes;
      }
    }
    
    const openTimes = availableTimes.filter((slot) => slot.available).map((slot) => slot.time);
    const blockedReasons = Array.from(new Set(availableTimes.filter((slot) => slot.reason).map((slot) => slot.reason as string)));
    const offerWalkIn = availableTimes.some((slot) => slot.walkIn);
    let suggestion = "";
    if (blockedReasons.length > 0 && process.env.OPENAI_API_KEY) {
      try {
        const { default: OpenAI } = await import("openai");
        const openai = new OpenAI();
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: "You help a guest whose reservation request cannot be fully met. Use only the facts given. Do not invent times, table counts, or wait times. Suggest the open times if any, or a smaller party or another day if none are open. Two or three short sentences.",
            },
            {
              role: "user",
              content: `Party size: ${requestedSize}
Date: ${date}
Reasons some times are unavailable: ${blockedReasons.join(" | ") || "none"}
Open times for this party: ${openTimes.join(", ") || "none"}
Walk-in tables exist: ${offerWalkIn ? "yes" : "no"}
If walk-in is yes, include this sentence exactly: ${WALK_IN_INVITE}`,
            },
          ],
        });
        suggestion = completion.choices[0]?.message?.content?.trim() || "";
      } catch (error) {
        console.error("Availability suggestion failed:", error);
      }
    }

    res.json({ availableTimes, messages: { suggestion } });
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

async function sendNewPrivateEventNotification(event: any) {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.log("SendGrid not configured, skipping private event notification");
      return;
    }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const staffCodes = await db.select().from(resyEventStaffCodes).where(eq(resyEventStaffCodes.isActive, true));
    const recipients = staffCodes.filter(s => s.email).map(s => s.email!);
    if (recipients.length === 0) {
      console.log("No event staff with emails found, skipping notification");
      return;
    }

    const location = event.locationId
      ? await db.select().from(resyLocations).where(eq(resyLocations.id, event.locationId)).then(r => r[0])
      : null;
    const locationName = location?.name || "Unknown Location";

    const eventDateFormatted = new Date(event.eventDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const eventBookableNames = ['Restaurant Lunch', 'Restaurant Evening', 'Restaurant Brunch', 'Private Dining', 'Pavilion', 'Patio', 'Distillery', 'Terrace Bar'];
    const displayNameMap: Record<string, string> = {
      'The Pavilion': 'Pavilion',
      'Winery Patio Area': 'Patio',
    };

    const allLocations = await db.select().from(resyLocations)
      .where(eq(resyLocations.isActive, true))
      .orderBy(resyLocations.displayOrder);

    const allEvents = await db.select().from(resyPrivateEvents)
      .where(not(eq(resyPrivateEvents.status, 'cancelled')));

    const blockedByLocation: { locationName: string; displayName: string; dates: string[] }[] = [];
    const locationMap: Record<string, number> = {};

    allLocations.forEach(loc => {
      const displayName = displayNameMap[loc.name] || loc.name;
      if (eventBookableNames.includes(displayName)) {
        locationMap[loc.id] = blockedByLocation.length;
        blockedByLocation.push({ locationName: loc.name, displayName, dates: [] });
      }
    });

    allEvents.forEach(ev => {
      if (ev.locationId && locationMap[ev.locationId] !== undefined) {
        const idx = locationMap[ev.locationId];
        if (!blockedByLocation[idx].dates.includes(ev.eventDate)) {
          blockedByLocation[idx].dates.push(ev.eventDate);
        }
      }
    });

    blockedByLocation.forEach(loc => {
      loc.dates.sort((a, b) => a.localeCompare(b));
    });

    const formatDate = (d: string) => {
      const date = new Date(d + 'T12:00:00');
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    const maxDates = Math.max(...blockedByLocation.map(l => l.dates.length), 0);
    let tableRows = '';
    for (let i = 0; i < maxDates; i++) {
      tableRows += '<tr>';
      blockedByLocation.forEach(loc => {
        const date = loc.dates[i];
        tableRows += `<td style="padding:10px 14px;border:1px solid #d5cfc8;color:#6b6560;font-size:13px;vertical-align:top;">${date ? formatDate(date) : ''}</td>`;
      });
      tableRows += '</tr>';
    }

    const calendarTableHtml = `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;border:1px solid #d5cfc8;margin-top:10px;">
        <thead>
          <tr>${blockedByLocation.map(loc => `<th style="background:#ede8e2;color:#4a4540;padding:10px 14px;text-align:left;border:1px solid #d5cfc8;font-weight:600;font-size:13px;font-family:Georgia,serif;">${loc.displayName}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${tableRows || `<tr><td colspan="${blockedByLocation.length}" style="padding:20px;text-align:center;color:#999;">No blocked dates at this time.</td></tr>`}
        </tbody>
      </table>
    `;

    const header = generateBrandedEmailHeader("New Private Event Booked!");
    const footer = generateBrandedEmailFooter(false);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head><style>${getBrandedEmailStyles()}</style></head>
      <body style="margin:0;padding:0;background-color:#f5f5f5;">
        ${header}
        <div style="max-width:800px;margin:0 auto;padding:30px 20px;background:#ffffff;">
          <p style="font-size:18px;color:#5C2535;font-weight:bold;margin:0 0 10px;">Good Job - We have a new private event!</p>
          
          <div style="background:#f5f0eb;border-radius:8px;padding:20px;margin:20px 0;">
            <h3 style="margin:0 0 15px;color:#4a4540;font-family:Georgia,serif;">Event Details</h3>
            <table cellpadding="0" cellspacing="0" border="0" style="font-size:14px;color:#333;">
              <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Location:</td><td style="padding:4px 0;">${locationName}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Date:</td><td style="padding:4px 0;">${eventDateFormatted}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Time:</td><td style="padding:4px 0;">${event.startTime} - ${event.endTime}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Customer:</td><td style="padding:4px 0;">${event.customerName}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Party Size:</td><td style="padding:4px 0;">${event.partySize}</td></tr>
              ${event.bookedByStaffName ? `<tr><td style="padding:4px 12px 4px 0;font-weight:600;">Booked By:</td><td style="padding:4px 0;">${event.bookedByStaffName}</td></tr>` : ''}
              ${event.notes ? `<tr><td style="padding:4px 12px 4px 0;font-weight:600;">Notes:</td><td style="padding:4px 0;">${event.notes}</td></tr>` : ''}
              ${event.estimatedRevenue ? `<tr><td style="padding:4px 12px 4px 0;font-weight:600;">Est. Revenue:</td><td style="padding:4px 0;">$${(event.estimatedRevenue / 100).toFixed(2)}</td></tr>` : ''}
            </table>
          </div>

          <div style="margin-top:30px;">
            <h3 style="text-align:center;font-family:'Georgia',serif;font-weight:400;font-size:20px;color:#4a4540;margin:0 0 10px;">Dates and Locations Already Reserved by Location</h3>
            <div style="font-size:12px;color:#6b6560;margin-bottom:15px;">
              <p style="margin:0 0 4px;font-style:italic;">Note:</p>
              <ul style="margin:4px 0 0 0;padding-left:20px;">
                <li style="margin-bottom:3px;">When the Restaurant Evening is booked, Private Dining is also booked.</li>
                <li style="margin-bottom:3px;">When the Patio is booked, the Distillery is also booked as this is reserved in case of inclement weather.</li>
              </ul>
            </div>
            ${calendarTableHtml}
          </div>
        </div>
        ${footer}
      </body>
      </html>
    `;

    for (const email of recipients) {
      try {
        await sgMail.send({
          to: email,
          from: process.env.SENDGRID_FROM_EMAIL || 'noreply@nashobawinery.com',
          subject: `New Private Event - ${locationName} on ${eventDateFormatted}`,
          html: emailHtml,
        });
      } catch (emailErr: any) {
        console.error(`Failed to send private event notification to ${email}:`, emailErr.message);
      }
    }
    console.log(`Private event notification sent to ${recipients.length} user(s)`);
  } catch (error: any) {
    console.error("Failed to send private event notifications:", error.message);
  }
}

router.post("/api/resy/private-events", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyPrivateEventSchema.parse(req.body);
    const event = await resyStorage.createPrivateEvent(validated);
    sendNewPrivateEventNotification(event).catch(err => console.error("Notification error:", err));
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
      r.status !== 'cancelled' &&
      r.status !== 'completed'
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
    const settings = await resyStorage.getSiteSettingsRecord();
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch site settings: " + error.message });
  }
});

// Alias for Reservation landing (`ResySiteSetting[]`; same rows as DB).
router.get("/api/resy/settings", async (req, res) => {
  try {
    const rows = await resyStorage.listSiteSettingsRows();
    res.json(rows);
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
      not(eq(resyReservations.status, "cancelled")),
      not(eq(resyReservations.status, "completed"))
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
  const walkins = await openWalkinTableIds(locationId, date);
  const tables = (await db.select()
    .from(resyLocationTables)
    .where(and(
      eq(resyLocationTables.locationId, locationId),
      eq(resyLocationTables.isActive, true),
      eq(resyLocationTables.isPaused, false)
    ))).filter((table) => !walkins.has(table.id));
  
  // Get existing reservations for this date to check conflicts
  // Optionally exclude a specific reservation (for reschedule scenarios)
  let reservations = await db.select()
    .from(resyReservations)
    .where(and(
      eq(resyReservations.locationId, locationId),
      eq(resyReservations.reservationDate, date),
      not(eq(resyReservations.status, "cancelled")),
      not(eq(resyReservations.status, "completed"))
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
          not(eq(resyReservations.status, "cancelled")),
          not(eq(resyReservations.status, "completed"))
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
    const walkins = await openWalkinTableIds(locationId, String(date));
    for (let index = allTables.length - 1; index >= 0; index--) {
      if (walkins.has(allTables[index].id)) allTables.splice(index, 1);
    }
    
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
    const second = await screenSecondReservation({
      locationId,
      experienceId,
      date,
      time,
      partySize,
      customerEmail,
      customerPhone,
      turnDuration,
      acceptSeparateTables: req.body?.acceptSeparateTables === true,
    });
    if (second.blocked) return res.status(400).json({ message: second.message, separateOption: second.separateOption === true });
    if (second.separateAccepted) {
      req.body.specialRequests = [specialRequests, "Guest accepted that this second table is not close to their other reservation."].filter(Boolean).join(" ");
    }
    if (second.moveExisting) {
      await resyStorage.updateReservation(second.moveExisting.reservationId, {
        assignedTableId: second.moveExisting.tableId,
        tableId: second.moveExisting.tableId,
        tableAssignment: second.moveExisting.tableLabel,
      });
    }
    
    // Step 4: Find available table
    const availableTables = second.tableId
      ? [{ tableId: second.tableId, tableLabel: second.tableLabel, score: 0 }]
      : await getAvailableTables(locationId, date, time, partySize, turnDuration);
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
      specialRequests: req.body.specialRequests || specialRequests || null,
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
      const emailContent = generateReservationConfirmationEmail(await reservationConfirmationContent(experience, {
        customerName,
        customerEmail,
        reservationDate: date,
        reservationTime: time,
        partySize,
        confirmationCode,
        specialRequests: specialRequests || undefined,
        locationId: experience.locationId,
        confirmationToken,
        experienceId,
      }));
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
        id: experience.id,
        name: experience.name,
        description: experience.description,
        bookingSlug: experience.bookingSlug,
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

// ========== Event Staff Codes Routes ==========

router.get("/api/resy/event-staff-codes", requireResyAdmin, async (req, res) => {
  try {
    const codes = await resyStorage.getAllEventStaffCodes();
    res.json(codes);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch event staff codes: " + error.message });
  }
});

router.post("/api/resy/event-staff-codes", requireResyAdmin, async (req, res) => {
  try {
    const validated = insertResyEventStaffCodeSchema.parse(req.body);
    const existing = await resyStorage.getEventStaffCodeByCode(validated.code);
    if (existing) {
      return res.status(400).json({ message: "A staff member with this code already exists" });
    }
    const code = await resyStorage.createEventStaffCode(validated);
    res.json(code);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to create event staff code: " + error.message });
  }
});

router.patch("/api/resy/event-staff-codes/:id", requireResyAdmin, async (req, res) => {
  try {
    const updates = insertResyEventStaffCodeSchema.partial().parse(req.body);
    const code = await resyStorage.updateEventStaffCode(req.params.id, updates);
    if (!code) return res.status(404).json({ message: "Event staff code not found" });
    res.json(code);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update event staff code: " + error.message });
  }
});

router.delete("/api/resy/event-staff-codes/:id", requireResyAdmin, async (req, res) => {
  try {
    await resyStorage.deleteEventStaffCode(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete event staff code: " + error.message });
  }
});

// ========== Event Registration Portal Routes (Staff Access) ==========

router.post("/api/resy/event-registration/login", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || code.length !== 4) {
      return res.status(400).json({ message: "Please enter a valid 4-digit code" });
    }
    const staff = await resyStorage.getEventStaffCodeByCode(code);
    if (!staff) {
      return res.status(401).json({ message: "Invalid access code" });
    }
    await resyStorage.updateEventStaffCode(staff.id, { lastUsedAt: new Date() });
    res.json({ success: true, staffName: staff.staffName, staffId: staff.id });
  } catch (error: any) {
    res.status(500).json({ message: "Login failed: " + error.message });
  }
});

router.get("/api/resy/event-registration/my-events", async (req, res) => {
  try {
    const code = req.query.code as string;
    if (!code) {
      return res.status(400).json({ message: "Staff code required" });
    }
    const staff = await resyStorage.getEventStaffCodeByCode(code);
    if (!staff) {
      return res.status(401).json({ message: "Invalid staff code" });
    }
    const allEvents = await resyStorage.getAllPrivateEvents();
    const myEvents = allEvents.filter(e => e.bookedByStaffName === staff.staffName);
    res.json(myEvents);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch events: " + error.message });
  }
});

router.get("/api/resy/event-registration/all-events", async (req, res) => {
  try {
    const code = req.query.code as string;
    if (!code) {
      return res.status(400).json({ message: "Staff code required" });
    }
    const staff = await resyStorage.getEventStaffCodeByCode(code);
    if (!staff) {
      return res.status(401).json({ message: "Invalid staff code" });
    }
    const allEvents = await resyStorage.getAllPrivateEvents();
    const activeEvents = allEvents.filter(e => e.status !== 'cancelled');
    res.json(activeEvents);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch events: " + error.message });
  }
});

router.post("/api/resy/event-registration/book", async (req, res) => {
  try {
    const { staffCode, ...eventData } = req.body;
    if (!staffCode) {
      return res.status(401).json({ message: "Staff code required" });
    }
    const staff = await resyStorage.getEventStaffCodeByCode(staffCode);
    if (!staff) {
      return res.status(401).json({ message: "Invalid staff code" });
    }

    const validated = insertResyPrivateEventSchema.parse({
      ...eventData,
      bookedByStaffName: staff.staffName,
      status: "confirmed",
    });

    if (validated.locationId && validated.eventDate) {
      const existingEvents = await db.select().from(resyPrivateEvents)
        .where(and(
          eq(resyPrivateEvents.locationId, validated.locationId),
          eq(resyPrivateEvents.eventDate, validated.eventDate),
          not(eq(resyPrivateEvents.status, 'cancelled'))
        ));
      if (existingEvents.length > 0) {
        return res.status(400).json({ message: "This location is already blocked for this date. Choose a different date or location." });
      }
    }

    const event = await resyStorage.createPrivateEvent(validated);

    if (validated.locationId && validated.eventDate) {
      try {
        const [specialDate] = await db.insert(resySpecialDates).values({
          locationId: validated.locationId,
          date: validated.eventDate,
          startTime: validated.startTime || "00:00",
          endTime: validated.endTime || "23:59",
          name: `Private Event: ${validated.customerName}`,
          description: `Private event booked by ${staff.staffName}. ${validated.notes || ''}`.trim(),
          isClosed: true,
        }).returning();

        await db.update(resyPrivateEvents)
          .set({ specialDateId: specialDate.id })
          .where(eq(resyPrivateEvents.id, event.id));
      } catch (sdError: any) {
        console.error("Failed to create special date for private event:", sdError.message);
      }
    }

    sendNewPrivateEventNotification(event).catch(err => console.error("Notification error:", err));
    res.json(event);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to book event: " + error.message });
  }
});

router.patch("/api/resy/event-registration/edit/:id", async (req, res) => {
  try {
    const { staffCode, ...updates } = req.body;
    if (!staffCode) {
      return res.status(401).json({ message: "Staff code required" });
    }
    const staff = await resyStorage.getEventStaffCodeByCode(staffCode);
    if (!staff) {
      return res.status(401).json({ message: "Invalid staff code" });
    }

    const allEvents = await resyStorage.getAllPrivateEvents();
    const event = allEvents.find(e => e.id === req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (event.bookedByStaffName !== staff.staffName) {
      return res.status(403).json({ message: "You can only edit your own events" });
    }

    const allowedFields: Record<string, any> = {};
    const editableKeys = ['customerName', 'customerEmail', 'customerPhone', 'partySize', 'startTime', 'endTime', 'notes', 'estimatedRevenue', 'actualRevenue', 'status', 'locationId'];
    for (const key of editableKeys) {
      if (updates[key] !== undefined) {
        allowedFields[key] = updates[key];
      }
    }
    allowedFields.updatedAt = new Date();

    const updated = await resyStorage.updatePrivateEvent(req.params.id, allowedFields);

    if (event.specialDateId && (updates.startTime || updates.endTime || updates.customerName)) {
      try {
        await db.update(resySpecialDates)
          .set({
            startTime: updates.startTime || event.startTime,
            endTime: updates.endTime || event.endTime,
            name: `Private Event: ${updates.customerName || event.customerName}`,
          })
          .where(eq(resySpecialDates.id, event.specialDateId));
      } catch (sdError: any) {
        console.error("Failed to update special date:", sdError.message);
      }
    }

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: "Failed to update event: " + error.message });
  }
});

// ========== Public Embed Endpoint ==========

router.get("/api/resy/public/private-events/blocked-dates", async (req, res) => {
  try {
    const eventBookableNames = ['Restaurant Lunch', 'Restaurant Evening', 'Restaurant Brunch', 'Private Dining', 'Pavilion', 'Patio', 'Distillery', 'Terrace Bar'];
    const displayNameMap: Record<string, string> = {
      'The Pavilion': 'Pavilion',
      'Winery Patio Area': 'Patio',
    };

    const locations = await db.select().from(resyLocations)
      .where(eq(resyLocations.isActive, true))
      .orderBy(resyLocations.displayOrder);

    const events = await db.select().from(resyPrivateEvents)
      .where(not(eq(resyPrivateEvents.status, 'cancelled')));

    const specialDates = await db.select().from(resySpecialDates)
      .where(eq(resySpecialDates.isClosed, true));

    const blockedByLocation: Record<string, { locationName: string; dates: string[] }> = {};

    locations.forEach(loc => {
      const displayName = displayNameMap[loc.name] || loc.name;
      if (eventBookableNames.includes(displayName)) {
        blockedByLocation[loc.id] = { locationName: displayName, dates: [] };
      }
    });

    events.forEach(event => {
      if (event.locationId && blockedByLocation[event.locationId]) {
        if (!blockedByLocation[event.locationId].dates.includes(event.eventDate)) {
          blockedByLocation[event.locationId].dates.push(event.eventDate);
        }
      }
    });

    specialDates.forEach(sd => {
      if (blockedByLocation[sd.locationId]) {
        if (!blockedByLocation[sd.locationId].dates.includes(sd.date)) {
          blockedByLocation[sd.locationId].dates.push(sd.date);
        }
      }
    });

    Object.values(blockedByLocation).forEach(loc => {
      loc.dates.sort();
    });

    const ordered: Record<string, { locationName: string; dates: string[] }> = {};
    eventBookableNames.forEach(name => {
      const entry = Object.entries(blockedByLocation).find(([_, v]) => v.locationName === name);
      if (entry) {
        ordered[entry[0]] = entry[1];
      }
    });

    res.json(ordered);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch blocked dates: " + error.message });
  }
});

router.get("/api/resy/public/private-events/embed", async (req, res) => {
  try {
    const eventBookableNames = ['Restaurant Lunch', 'Restaurant Evening', 'Restaurant Brunch', 'Private Dining', 'Pavilion', 'Patio', 'Distillery', 'Terrace Bar'];
    const displayNameMap: Record<string, string> = {
      'The Pavilion': 'Pavilion',
      'Winery Patio Area': 'Patio',
    };

    const locations = await db.select().from(resyLocations)
      .where(eq(resyLocations.isActive, true))
      .orderBy(resyLocations.displayOrder);

    const events = await db.select().from(resyPrivateEvents)
      .where(not(eq(resyPrivateEvents.status, 'cancelled')));

    const specialDates = await db.select().from(resySpecialDates)
      .where(eq(resySpecialDates.isClosed, true));

    const blockedByLocation: Record<string, { locationName: string; displayName: string; dates: string[] }> = {};

    locations.forEach(loc => {
      const displayName = displayNameMap[loc.name] || loc.name;
      if (eventBookableNames.includes(displayName)) {
        blockedByLocation[loc.id] = { locationName: loc.name, displayName, dates: [] };
      }
    });

    events.forEach(event => {
      if (event.locationId && blockedByLocation[event.locationId]) {
        if (!blockedByLocation[event.locationId].dates.includes(event.eventDate)) {
          blockedByLocation[event.locationId].dates.push(event.eventDate);
        }
      }
    });

    specialDates.forEach(sd => {
      if (blockedByLocation[sd.locationId]) {
        if (!blockedByLocation[sd.locationId].dates.includes(sd.date)) {
          blockedByLocation[sd.locationId].dates.push(sd.date);
        }
      }
    });

    Object.values(blockedByLocation).forEach(loc => {
      loc.dates.sort();
    });

    const orderedNames = eventBookableNames;
    const locationEntries = orderedNames
      .map(name => Object.values(blockedByLocation).find(l => l.displayName === name))
      .filter((l): l is { locationName: string; displayName: string; dates: string[] } => !!l);

    const formatDate = (dateStr: string) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return `${months[month - 1]} ${day}, ${year}`;
    };

    const maxDates = Math.max(...locationEntries.map(l => l.dates.length), 0);

    let tableRows = '';
    for (let i = 0; i < maxDates; i++) {
      tableRows += '<tr>';
      locationEntries.forEach(loc => {
        const date = loc.dates[i];
        tableRows += `<td>${date ? formatDate(date) : ''}</td>`;
      });
      tableRows += '</tr>';
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&display=swap" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding: 32px 24px;
      background: #f5f0eb;
      font-family: 'Georgia', 'Times New Roman', serif;
      color: #4a4540;
    }
    .table-wrapper {
      max-width: 100%;
      overflow-x: auto;
      margin: 0 auto;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      border: 1px solid #d5cfc8;
    }
    th {
      background: #ede8e2;
      color: #4a4540;
      padding: 12px 16px;
      text-align: left;
      border: 1px solid #d5cfc8;
      font-weight: 600;
      font-size: 14px;
      font-family: 'Georgia', serif;
    }
    td {
      padding: 10px 16px;
      border: 1px solid #d5cfc8;
      color: #6b6560;
      font-size: 14px;
      vertical-align: top;
    }
  </style>
</head>
<body>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr>${locationEntries.map(loc => `<th>${loc.displayName}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${tableRows || '<tr><td colspan="' + locationEntries.length + '" style="padding:20px;text-align:center;color:#999;">No blocked dates at this time.</td></tr>'}
      </tbody>
    </table>
  </div>
</body>
</html>`;

    res.set('Content-Type', 'text/html');
    res.set('X-Frame-Options', 'ALLOWALL');
    res.send(html);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to generate embed: " + error.message });
  }
});

export default router;
