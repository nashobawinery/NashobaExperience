import { Router, type Request, type Response } from "express";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import { requirePlatformRole } from "./platformAuth";
import { storage } from "./storage";
import {
  dailyReportTemplates,
  proceduresTemplates,
  staffPrintMenus,
  staffReportingAssignments,
  staffReportingStaff,
  toastMenuEmbedConfigs,
} from "@shared/schema";

const router = Router();
const isAdmin = requirePlatformRole(["super_admin"]);
let prepared = false;

type StaffReportingAssignmentInput = {
  reportType: "daily_report" | "procedure" | "print_menu";
  assignmentKey: string;
  assignmentLabel?: string;
  isEnabled?: boolean;
};

type StaffReportingUserPayload = {
  displayName: string;
  accessCode: string;
  homeDepartment?: string | null;
  isActive?: boolean;
  assignments?: StaffReportingAssignmentInput[];
};

const todayKey = () => {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[new Date().getDay()];
};

function isAvailableNowEastern(template: { availableFromTime?: string | null; availableUntilTime?: string | null } | null) {
  if (!template || (!template.availableFromTime && !template.availableUntilTime)) return true;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  const cur = h * 60 + m;
  if (template.availableFromTime) {
    const [fh, fm] = template.availableFromTime.split(":").map(Number);
    if (cur < fh * 60 + fm) return false;
  }
  if (template.availableUntilTime) {
    const [uh, um] = template.availableUntilTime.split(":").map(Number);
    const until = uh * 60 + um;
    if (cur >= (until === 0 ? 24 * 60 : until)) return false;
  }
  return true;
}

export async function ensureStaffReportingAccessModel() {
  if (prepared) return;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS staff_reporting_staff (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      display_name varchar NOT NULL,
      access_code varchar(10) NOT NULL,
      home_department varchar,
      is_active boolean NOT NULL DEFAULT true,
      legacy_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
      last_used_at timestamp,
      created_by_id varchar,
      created_by_name varchar,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_staff_reporting_staff_code ON staff_reporting_staff(access_code);
    CREATE INDEX IF NOT EXISTS idx_staff_reporting_staff_active ON staff_reporting_staff(is_active);
    CREATE TABLE IF NOT EXISTS staff_reporting_assignments (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      staff_id varchar NOT NULL REFERENCES staff_reporting_staff(id) ON DELETE CASCADE,
      report_type varchar(30) NOT NULL,
      assignment_key varchar(120) NOT NULL,
      assignment_label text NOT NULL,
      is_enabled boolean NOT NULL DEFAULT true,
      legacy_source varchar(40),
      legacy_id varchar,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now(),
      CONSTRAINT uq_staff_reporting_assignment UNIQUE (staff_id, report_type, assignment_key)
    );
    CREATE INDEX IF NOT EXISTS idx_staff_reporting_assignments_staff ON staff_reporting_assignments(staff_id);
    CREATE INDEX IF NOT EXISTS idx_staff_reporting_assignments_type ON staff_reporting_assignments(report_type);
  `);

  await db.execute(sql`
    WITH legacy_daily_staff AS (
      SELECT lower(trim(staff_name)) AS normalized_name, code, min(staff_name) AS staff_name,
             min(department) AS home_department, bool_or(is_active) AS is_active,
             jsonb_agg(DISTINCT jsonb_build_object('source', 'daily_report_access_codes', 'code', code)) AS legacy_sources
      FROM daily_report_access_codes
      GROUP BY lower(trim(staff_name)), code
    )
    INSERT INTO staff_reporting_staff (display_name, access_code, home_department, is_active, legacy_sources)
    SELECT staff_name, code, home_department, is_active, legacy_sources
    FROM legacy_daily_staff lds
    WHERE NOT EXISTS (
      SELECT 1 FROM staff_reporting_staff s
      WHERE lower(trim(s.display_name)) = lds.normalized_name AND s.access_code = lds.code
    );

    INSERT INTO staff_reporting_assignments (staff_id, report_type, assignment_key, assignment_label, is_enabled, legacy_source, legacy_id)
    SELECT s.id, 'daily_report', drac.department, COALESCE(drt.department_label, drac.department),
           drac.is_active, 'daily_report_access_codes', drac.id
    FROM daily_report_access_codes drac
    JOIN staff_reporting_staff s ON lower(trim(s.display_name)) = lower(trim(drac.staff_name)) AND s.access_code = drac.code
    LEFT JOIN daily_report_templates drt ON drt.department = drac.department
    ON CONFLICT (staff_id, report_type, assignment_key) DO UPDATE SET
      assignment_label = EXCLUDED.assignment_label,
      is_enabled = staff_reporting_assignments.is_enabled OR EXCLUDED.is_enabled,
      updated_at = now();

    WITH legacy_procedure_staff AS (
      SELECT lower(trim(staff_name)) AS normalized_name, code, min(staff_name) AS staff_name,
             min(department) AS home_department, bool_or(is_active) AS is_active,
             jsonb_agg(DISTINCT jsonb_build_object('source', 'procedures_staff', 'code', code)) AS legacy_sources
      FROM procedures_staff
      GROUP BY lower(trim(staff_name)), code
    )
    INSERT INTO staff_reporting_staff (display_name, access_code, home_department, is_active, legacy_sources)
    SELECT staff_name, code, home_department, is_active, legacy_sources
    FROM legacy_procedure_staff lps
    WHERE NOT EXISTS (
      SELECT 1 FROM staff_reporting_staff s
      WHERE lower(trim(s.display_name)) = lps.normalized_name AND s.access_code = lps.code
    );

    INSERT INTO staff_reporting_assignments (staff_id, report_type, assignment_key, assignment_label, is_enabled, legacy_source, legacy_id)
    SELECT srs.id, 'procedure', pt.procedure_code, pt.procedure_name,
           ps.is_active AND pt.is_active, 'procedures_staff', ps.id
    FROM procedures_staff ps
    JOIN staff_reporting_staff srs ON lower(trim(srs.display_name)) = lower(trim(ps.staff_name)) AND srs.access_code = ps.code
    JOIN procedures_templates pt ON ps.id = ANY(COALESCE(pt.assigned_staff_ids, ARRAY[]::text[]))
    ON CONFLICT (staff_id, report_type, assignment_key) DO UPDATE SET
      assignment_label = EXCLUDED.assignment_label,
      is_enabled = staff_reporting_assignments.is_enabled OR EXCLUDED.is_enabled,
      updated_at = now();

    WITH legacy_pin_users AS (
      SELECT lower(trim(display_name)) AS normalized_name, pin_code, display_name, is_active, assigned_procedure_codes
      FROM procedures_users
    )
    INSERT INTO staff_reporting_staff (display_name, access_code, is_active, legacy_sources)
    SELECT display_name, pin_code, is_active,
           jsonb_build_array(jsonb_build_object('source', 'procedures_users', 'pin', pin_code))
    FROM legacy_pin_users lpu
    WHERE NOT EXISTS (
      SELECT 1 FROM staff_reporting_staff s
      WHERE lower(trim(s.display_name)) = lpu.normalized_name AND s.access_code = lpu.pin_code
    );

    INSERT INTO staff_reporting_assignments (staff_id, report_type, assignment_key, assignment_label, is_enabled, legacy_source, legacy_id)
    SELECT srs.id, 'procedure', code, COALESCE(pt.procedure_name, code), pu.is_active, 'procedures_users', pu.id
    FROM procedures_users pu
    JOIN staff_reporting_staff srs ON lower(trim(srs.display_name)) = lower(trim(pu.display_name)) AND srs.access_code = pu.pin_code
    CROSS JOIN LATERAL unnest(COALESCE(pu.assigned_procedure_codes, ARRAY[]::text[])) AS code
    LEFT JOIN procedures_templates pt ON pt.procedure_code = code
    ON CONFLICT (staff_id, report_type, assignment_key) DO UPDATE SET
      assignment_label = EXCLUDED.assignment_label,
      is_enabled = staff_reporting_assignments.is_enabled OR EXCLUDED.is_enabled,
      updated_at = now();
  `);

  prepared = true;
}

async function getUsersWithAssignments() {
  await ensureStaffReportingAccessModel();
  const rows = await db
    .select()
    .from(staffReportingStaff)
    .leftJoin(staffReportingAssignments, eq(staffReportingAssignments.staffId, staffReportingStaff.id))
    .orderBy(staffReportingStaff.displayName, staffReportingStaff.accessCode);

  const users = new Map<string, any>();
  for (const row of rows) {
    const staff = row.staff_reporting_staff;
    if (!users.has(staff.id)) {
      users.set(staff.id, { ...staff, assignments: [] });
    }
    if (row.staff_reporting_assignments) {
      users.get(staff.id).assignments.push(row.staff_reporting_assignments);
    }
  }
  return Array.from(users.values());
}

async function replaceAssignments(staffId: string, assignments: StaffReportingAssignmentInput[] = []) {
  await db.delete(staffReportingAssignments).where(eq(staffReportingAssignments.staffId, staffId));
  if (assignments.length === 0) return;

  await db.insert(staffReportingAssignments).values(
    assignments.map((assignment) => ({
      staffId,
      reportType: assignment.reportType,
      assignmentKey: assignment.assignmentKey,
      assignmentLabel: assignment.assignmentLabel || assignment.assignmentKey,
      isEnabled: assignment.isEnabled ?? true,
      legacySource: "staff_reporting",
    })),
  );
}

async function getProcedureStaffAssignments(procedureCode: string) {
  await ensureStaffReportingAccessModel();
  const users = await getUsersWithAssignments();
  return users.map((user) => ({
    ...user,
    isAssigned: user.assignments.some((assignment: any) =>
      assignment.reportType === "procedure" &&
      assignment.assignmentKey === procedureCode &&
      assignment.isEnabled
    ),
  }));
}

async function syncLegacyProcedureStaffIds(procedureCode: string, selectedStaffIds: string[]) {
  const selectedStaff = selectedStaffIds.length > 0
    ? await db.select().from(staffReportingStaff).where(inArray(staffReportingStaff.id, selectedStaffIds))
    : [];

  const legacyStaffIds: string[] = [];
  for (const staff of selectedStaff) {
    const legacyMatch = await db.execute(sql`
      SELECT id
      FROM procedures_staff
      WHERE lower(trim(staff_name)) = lower(trim(${staff.displayName}))
        AND code = ${staff.accessCode}
      LIMIT 1
    `);
    const legacyId = legacyMatch.rows[0]?.id;
    if (typeof legacyId === "string") legacyStaffIds.push(legacyId);
  }

  await db
    .update(proceduresTemplates)
    .set({ assignedStaffIds: legacyStaffIds, updatedAt: new Date() } as any)
    .where(eq(proceduresTemplates.procedureCode, procedureCode));
}

export async function getSharedStaffPortalAccess(code: string) {
  await ensureStaffReportingAccessModel();
  const staffRows = await db
    .select()
    .from(staffReportingStaff)
    .where(and(eq(staffReportingStaff.accessCode, code), eq(staffReportingStaff.isActive, true)));

  if (staffRows.length === 0) return null;

  const assignments = await db
    .select()
    .from(staffReportingAssignments)
    .where(and(
      inArray(staffReportingAssignments.staffId, staffRows.map((s) => s.id)),
      eq(staffReportingAssignments.isEnabled, true),
    ));

  const dailyDepartments: { department: string; departmentLabel: string; code: string }[] = [];
  const seenDepartments = new Set<string>();
  for (const assignment of assignments.filter((a) => a.reportType === "daily_report")) {
    if (seenDepartments.has(assignment.assignmentKey)) continue;
    const template = await storage.getDailyReportTemplateByDepartment(assignment.assignmentKey);
    if (!isAvailableNowEastern(template ?? null)) continue;
    dailyDepartments.push({
      department: assignment.assignmentKey,
      departmentLabel: template?.departmentLabel || assignment.assignmentLabel || assignment.assignmentKey,
      code,
    });
    seenDepartments.add(assignment.assignmentKey);
  }

  const procedureTemplates: any[] = [];
  const seenProcedures = new Set<string>();
  const today = todayKey();
  for (const assignment of assignments.filter((a) => a.reportType === "procedure")) {
    if (seenProcedures.has(assignment.assignmentKey)) continue;
    const template = await storage.getProceduresTemplateByCode(assignment.assignmentKey);
    if (!template || !template.isActive) continue;
    const daysOfWeek = template.daysOfWeek as Record<string, boolean> | null;
    if (daysOfWeek && !daysOfWeek[today]) continue;
    const templateWithItems = await storage.getProceduresTemplateWithItems(template.id);
    if (templateWithItems) {
      procedureTemplates.push(templateWithItems);
      seenProcedures.add(assignment.assignmentKey);
    }
  }

  await db
    .update(staffReportingStaff)
    .set({ lastUsedAt: new Date(), updatedAt: new Date() })
    .where(eq(staffReportingStaff.accessCode, code));

  return {
    staffName: staffRows[0].displayName,
    dailyReports: {
      enabled: dailyDepartments.length > 0,
      departments: dailyDepartments,
    },
    procedures: {
      enabled: procedureTemplates.length > 0,
      staffId: staffRows[0].id,
      department: staffRows[0].homeDepartment,
      templates: procedureTemplates,
    },
    printMenus: {
      enabled: assignments.some((assignment) => assignment.reportType === "print_menu"),
    },
  };
}

export async function getApprovedStaffPrintMenus(code: string, origin: string) {
  await ensureStaffReportingAccessModel();
  const staffRows = await db
    .select()
    .from(staffReportingStaff)
    .where(and(eq(staffReportingStaff.accessCode, code), eq(staffReportingStaff.isActive, true)));

  if (staffRows.length === 0) return [];

  const assignments = await db
    .select()
    .from(staffReportingAssignments)
    .where(and(
      inArray(staffReportingAssignments.staffId, staffRows.map((s) => s.id)),
      eq(staffReportingAssignments.reportType, "print_menu"),
      eq(staffReportingAssignments.isEnabled, true),
    ));
  const approvedKeys = new Set(assignments.map((assignment) => assignment.assignmentKey));
  if (approvedKeys.size === 0) return [];

  const legacyMenus = await db.select().from(staffPrintMenus)
    .where(eq(staffPrintMenus.isActive, true))
    .orderBy(staffPrintMenus.sortOrder, staffPrintMenus.name);

  const savedConfigs = await db.select().from(toastMenuEmbedConfigs)
    .where(eq(toastMenuEmbedConfigs.showOnStaffBoard, true))
    .orderBy(toastMenuEmbedConfigs.name);

  const legacyMenuDtos = legacyMenus.map((menu) => ({
    ...menu,
    id: String(menu.id),
  })).filter((menu) => approvedKeys.has(menu.id));

  const configMenuDtos = savedConfigs.map((config) => ({
    id: `cfg-${config.id}`,
    name: config.name,
    description: config.description,
    printUrl: `${origin}/api/toast/public/embed-config/${config.slug}`,
    menuGuid: config.menuGuids.split(",")[0] || null,
    isActive: true,
    sortOrder: 999,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
    _source: "saved-config",
    slug: config.slug,
  })).filter((menu) => approvedKeys.has(menu.id));

  return [...legacyMenuDtos, ...configMenuDtos];
}

router.get("/users", isAdmin, async (_req: Request, res: Response) => {
  try {
    res.json(await getUsersWithAssignments());
  } catch (error) {
    console.error("[Staff Reporting] Failed to fetch users:", error);
    res.status(500).json({ message: "Failed to fetch staff reporting users" });
  }
});

router.get("/options", isAdmin, async (_req: Request, res: Response) => {
  try {
    await ensureStaffReportingAccessModel();
    const departments = await db
      .select({
        department: dailyReportTemplates.department,
        departmentLabel: dailyReportTemplates.departmentLabel,
        isActive: dailyReportTemplates.isActive,
      })
      .from(dailyReportTemplates)
      .orderBy(dailyReportTemplates.sortOrder, dailyReportTemplates.departmentLabel);

    const procedures = await db
      .select({
        id: proceduresTemplates.id,
        procedureCode: proceduresTemplates.procedureCode,
        procedureName: proceduresTemplates.procedureName,
        department: proceduresTemplates.department,
        procedureType: proceduresTemplates.procedureType,
        isActive: proceduresTemplates.isActive,
      })
      .from(proceduresTemplates)
      .orderBy(proceduresTemplates.department, proceduresTemplates.procedureName);

    const legacyMenus = await db.select().from(staffPrintMenus)
      .where(eq(staffPrintMenus.isActive, true))
      .orderBy(staffPrintMenus.sortOrder, staffPrintMenus.name);
    const savedConfigs = await db.select().from(toastMenuEmbedConfigs)
      .where(eq(toastMenuEmbedConfigs.showOnStaffBoard, true))
      .orderBy(toastMenuEmbedConfigs.name);
    const printMenus = [
      ...legacyMenus.map((menu) => ({
        id: String(menu.id),
        name: menu.name,
        description: menu.description,
        source: "staff_board",
      })),
      ...savedConfigs.map((config) => ({
        id: `cfg-${config.id}`,
        name: config.name,
        description: config.description,
        source: "saved_config",
      })),
    ];

    res.json({ departments, procedures, printMenus });
  } catch (error) {
    console.error("[Staff Reporting] Failed to fetch options:", error);
    res.status(500).json({ message: "Failed to fetch staff reporting options" });
  }
});

router.get("/procedures/:procedureCode/staff", isAdmin, async (req: Request, res: Response) => {
  try {
    res.json(await getProcedureStaffAssignments(req.params.procedureCode));
  } catch (error) {
    console.error("[Staff Reporting] Failed to fetch procedure staff assignments:", error);
    res.status(500).json({ message: "Failed to fetch procedure staff assignments" });
  }
});

router.put("/procedures/:procedureCode/staff", isAdmin, async (req: Request, res: Response) => {
  try {
    await ensureStaffReportingAccessModel();
    const procedureCode = req.params.procedureCode;
    const selectedStaffIds = Array.isArray(req.body?.assignedStaffIds) ? req.body.assignedStaffIds as string[] : [];
    const assignmentLabel = typeof req.body?.assignmentLabel === "string" && req.body.assignmentLabel.trim()
      ? req.body.assignmentLabel.trim()
      : procedureCode;

    await db
      .update(staffReportingAssignments)
      .set({ isEnabled: false, updatedAt: new Date() })
      .where(and(
        eq(staffReportingAssignments.reportType, "procedure"),
        eq(staffReportingAssignments.assignmentKey, procedureCode),
      ));

    if (selectedStaffIds.length > 0) {
      await db
        .insert(staffReportingAssignments)
        .values(selectedStaffIds.map((staffId) => ({
          staffId,
          reportType: "procedure",
          assignmentKey: procedureCode,
          assignmentLabel,
          isEnabled: true,
          legacySource: "staff_reporting",
        })))
        .onConflictDoUpdate({
          target: [
            staffReportingAssignments.staffId,
            staffReportingAssignments.reportType,
            staffReportingAssignments.assignmentKey,
          ],
          set: {
            assignmentLabel,
            isEnabled: true,
            updatedAt: new Date(),
          },
        });
    }

    await syncLegacyProcedureStaffIds(procedureCode, selectedStaffIds);
    res.json(await getProcedureStaffAssignments(procedureCode));
  } catch (error) {
    console.error("[Staff Reporting] Failed to update procedure staff assignments:", error);
    res.status(500).json({ message: "Failed to update procedure staff assignments" });
  }
});

router.post("/users", isAdmin, async (req: Request, res: Response) => {
  try {
    await ensureStaffReportingAccessModel();
    const payload = req.body as StaffReportingUserPayload;
    if (!payload.displayName?.trim() || !payload.accessCode?.trim()) {
      return res.status(400).json({ message: "Name and access code are required" });
    }

    const [user] = await db
      .insert(staffReportingStaff)
      .values({
        displayName: payload.displayName.trim(),
        accessCode: payload.accessCode.trim().toUpperCase(),
        homeDepartment: payload.homeDepartment || null,
        isActive: payload.isActive ?? true,
        legacySources: [{ source: "staff_reporting" }],
      })
      .returning();

    await replaceAssignments(user.id, payload.assignments);
    res.status(201).json((await getUsersWithAssignments()).find((u) => u.id === user.id));
  } catch (error) {
    console.error("[Staff Reporting] Failed to create user:", error);
    res.status(500).json({ message: "Failed to create staff reporting user" });
  }
});

router.patch("/users/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    await ensureStaffReportingAccessModel();
    const payload = req.body as Partial<StaffReportingUserPayload>;
    const [user] = await db
      .update(staffReportingStaff)
      .set({
        ...(payload.displayName !== undefined ? { displayName: payload.displayName.trim() } : {}),
        ...(payload.accessCode !== undefined ? { accessCode: payload.accessCode.trim().toUpperCase() } : {}),
        ...(payload.homeDepartment !== undefined ? { homeDepartment: payload.homeDepartment || null } : {}),
        ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
        updatedAt: new Date(),
      })
      .where(eq(staffReportingStaff.id, req.params.id))
      .returning();

    if (!user) return res.status(404).json({ message: "Staff reporting user not found" });
    if (payload.assignments) await replaceAssignments(user.id, payload.assignments);
    res.json((await getUsersWithAssignments()).find((u) => u.id === user.id));
  } catch (error) {
    console.error("[Staff Reporting] Failed to update user:", error);
    res.status(500).json({ message: "Failed to update staff reporting user" });
  }
});

router.delete("/users/:id", isAdmin, async (req: Request, res: Response) => {
  try {
    await ensureStaffReportingAccessModel();
    await db.delete(staffReportingStaff).where(eq(staffReportingStaff.id, req.params.id));
    res.json({ message: "Staff reporting user deleted" });
  } catch (error) {
    console.error("[Staff Reporting] Failed to delete user:", error);
    res.status(500).json({ message: "Failed to delete staff reporting user" });
  }
});

router.post("/backfill", isAdmin, async (_req: Request, res: Response) => {
  try {
    prepared = false;
    await ensureStaffReportingAccessModel();
    res.json({ message: "Staff reporting access model refreshed" });
  } catch (error) {
    console.error("[Staff Reporting] Failed to refresh access model:", error);
    res.status(500).json({ message: "Failed to refresh staff reporting access model" });
  }
});

export default router;
