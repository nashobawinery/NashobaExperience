import { Router } from "express";
import { sql } from "drizzle-orm";
import * as XLSX from "xlsx";
import { db } from "./db";
import { requirePlatformRole } from "./platformAuth";
import { getRestaurants, toastApiRequest } from "./reactivation/toast-api";
import {
  addDays,
  buildIncentiveReport,
  jobKey,
  defaultWeatherCallouts,
  incentiveSignature,
  sanitizeFallIncentiveSetup,
  setupProblem,
  type FallIncentiveSetup,
  weekdayIndex,
  type IncentivePerson,
  type IncentivePunch,
  type IncentiveReport,
} from "@shared/fall-incentive";

type RosterJob = {
  title: string;
  employees: { id: string; name: string; restaurantName: string }[];
};

type Roster = {
  restaurantCount: number;
  jobs: RosterJob[];
  employees: IncentivePerson[];
};

let rosterCache: { at: number; data: Roster } | null = null;
let rosterInflight: Promise<Roster> | null = null;
const rosterTtlMs = 5 * 60 * 1000;
let tableReady: Promise<void> | null = null;

function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = db.execute(sql`
      CREATE TABLE IF NOT EXISTS accounting_fall_incentive (
        id varchar PRIMARY KEY,
        setup jsonb NOT NULL,
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `).then(() => db.execute(sql`
      ALTER TABLE accounting_fall_incentive ADD COLUMN IF NOT EXISTS report jsonb
    `)).then(() => undefined).catch((error) => {
      tableReady = null;
      throw error;
    });
  }
  return tableReady;
}

function laborMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  console.error("[Fall Incentive]", message || error);
  if (message.includes("credentials")) return "Toast is not connected.";
  if (message.includes("(401)") || message.includes("(403)")) return "Toast did not share labor records with this connection.";
  if (message.includes("Toast is busy")) return "Toast is busy. Try this again in a minute.";
  return "Toast labor could not be read. Try again in a minute.";
}

function restaurantLabel(restaurant: { restaurantName?: string; locationName?: string }): string {
  const name = String(restaurant.restaurantName || "").trim();
  const location = String(restaurant.locationName || "").trim();
  if (name && location && location !== name) return `${name} · ${location}`;
  return name || location || "Toast location";
}

function personName(employee: { chosenName?: string; firstName?: string; lastName?: string }): string {
  const first = String(employee.chosenName || employee.firstName || "").trim();
  const last = String(employee.lastName || "").trim();
  return [first, last].filter(Boolean).join(" ") || "Unnamed employee";
}

function payrollNumber(employee: { externalEmployeeId?: unknown; externalId?: unknown }): string {
  for (const value of [employee.externalEmployeeId, employee.externalId]) {
    const text = String(value ?? "").trim();
    if (/^\d+$/.test(text)) return text;
  }
  return "";
}

function asList(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  throw new Error("Toast returned an unexpected labor response.");
}

async function loadRoster(force = false): Promise<Roster> {
  if (!force && rosterCache && Date.now() - rosterCache.at < rosterTtlMs) return rosterCache.data;
  if (!force && rosterInflight) return rosterInflight;
  rosterInflight = readRoster().then((data) => {
    rosterCache = { at: Date.now(), data };
    return data;
  }).finally(() => {
    rosterInflight = null;
  });
  return rosterInflight;
}

async function readRoster(): Promise<Roster> {
  const restaurants = asList(await getRestaurants());
  const people: IncentivePerson[] = [];
  const titles = new Map<string, { title: string; employees: Map<string, { id: string; name: string; restaurantName: string }> }>();

  for (const restaurant of restaurants) {
    const guid = String(restaurant.restaurantGuid || "");
    if (!guid) continue;
    const label = restaurantLabel(restaurant);
    const [jobs, employees] = await Promise.all([
      toastApiRequest("/labor/v1/jobs", guid),
      toastApiRequest("/labor/v1/employees", guid),
    ]);
    const titleByGuid = new Map<string, string>();
    for (const job of asList(jobs)) {
      if (job?.deleted) continue;
      const title = String(job?.title || "").trim().replace(/\s+/g, " ");
      const jobGuid = String(job?.guid || "");
      if (!title || !jobGuid) continue;
      titleByGuid.set(jobGuid, title);
      const key = jobKey(title);
      if (!titles.has(key)) titles.set(key, { title, employees: new Map() });
    }
    for (const employee of asList(employees)) {
      if (employee?.deleted) continue;
      const employeeGuid = String(employee?.guid || "");
      if (!employeeGuid) continue;
      const jobTitles = asList(employee.jobReferences)
        .map((job) => titleByGuid.get(String(job?.guid || "")))
        .filter((title): title is string => Boolean(title));
      const uniqueTitles = [...new Set(jobTitles)];
      if (uniqueTitles.length === 0) continue;
      const person: IncentivePerson = {
        id: `${guid}:${employeeGuid}`,
        name: personName(employee),
        restaurantName: label,
        jobTitles: uniqueTitles,
        payrollNumber: payrollNumber(employee),
      };
      people.push(person);
      for (const title of uniqueTitles) {
        const group = titles.get(jobKey(title));
        group?.employees.set(person.id, { id: person.id, name: person.name, restaurantName: person.restaurantName });
      }
    }
  }

  people.sort((left, right) => left.name.localeCompare(right.name) || left.restaurantName.localeCompare(right.restaurantName));
  const jobs = [...titles.values()]
    .map((group) => ({
      title: group.title,
      employees: [...group.employees.values()].sort((left, right) => left.name.localeCompare(right.name) || left.restaurantName.localeCompare(right.restaurantName)),
    }))
    .sort((left, right) => left.title.localeCompare(right.title));

  return { restaurantCount: restaurants.length, jobs, employees: people };
}

function toastStamp(iso: string): string {
  return `${iso}T00:00:00.000-0000`;
}

function timeWindows(start: string, end: string): { start: string; end: string }[] {
  const first = addDays(start, -1);
  const last = addDays(end, 2);
  const windows: { start: string; end: string }[] = [];
  let cursor = first;
  while (cursor < last && windows.length < 20) {
    let next = addDays(cursor, 28);
    if (next > last) next = last;
    windows.push({ start: cursor, end: next });
    cursor = next;
  }
  return windows;
}

function businessIso(entry: { businessDate?: string; inDate?: string }): string | null {
  const raw = String(entry.businessDate || "");
  if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  if (!entry.inDate) return null;
  const date = new Date(entry.inDate);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(date);
}

async function readPunches(start: string, end: string): Promise<IncentivePunch[]> {
  const restaurants = asList(await getRestaurants());
  const punches: IncentivePunch[] = [];
  const seen = new Set<string>();
  for (const restaurant of restaurants) {
    const guid = String(restaurant.restaurantGuid || "");
    if (!guid) continue;
    const jobs = asList(await toastApiRequest("/labor/v1/jobs", guid));
    const titleByGuid = new Map<string, string>();
    for (const job of jobs) {
      const title = String(job?.title || "").trim().replace(/\s+/g, " ");
      if (job?.guid && title) titleByGuid.set(String(job.guid), title);
    }
    for (const window of timeWindows(start, end)) {
      const path = `/labor/v1/timeEntries?startDate=${encodeURIComponent(toastStamp(window.start))}&endDate=${encodeURIComponent(toastStamp(window.end))}`;
      const entries = asList(await toastApiRequest(path, guid));
      for (const entry of entries) {
        if (entry?.deleted) continue;
        const entryGuid = String(entry?.guid || "");
        if (entryGuid && seen.has(entryGuid)) continue;
        if (entryGuid) seen.add(entryGuid);
        const employeeGuid = String(entry?.employeeReference?.guid || "");
        const jobTitle = titleByGuid.get(String(entry?.jobReference?.guid || ""));
        const businessDate = businessIso(entry);
        if (!employeeGuid || !jobTitle || !businessDate) continue;
        const regular = Number(entry.regularHours);
        const overtime = Number(entry.overtimeHours);
        punches.push({
          employeeId: `${guid}:${employeeGuid}`,
          businessDate,
          jobTitle,
          inAt: entry.inDate ? String(entry.inDate) : null,
          outAt: entry.outDate ? String(entry.outDate) : null,
          hours: (Number.isFinite(regular) ? regular : 0) + (Number.isFinite(overtime) ? overtime : 0),
          open: !entry.outDate,
        });
      }
    }
  }
  return punches;
}

async function readSetup(): Promise<FallIncentiveSetup> {
  await ensureTable();
  const result = await db.execute(sql`SELECT setup FROM accounting_fall_incentive WHERE id = 'default'`);
  const stored = result.rows[0]?.setup;
  let parsed: unknown = stored ?? null;
  if (typeof stored === "string") {
    try { parsed = JSON.parse(stored); } catch { parsed = null; }
  }
  const hadCallouts = Boolean(parsed && typeof parsed === "object" && "callouts" in parsed);
  const setup = sanitizeFallIncentiveSetup(parsed);
  if (!hadCallouts) {
    setup.callouts = defaultWeatherCallouts();
    await writeSetup(setup);
  }
  return setup;
}

async function writeSetup(setup: FallIncentiveSetup): Promise<void> {
  await ensureTable();
  const clean = sanitizeFallIncentiveSetup(setup);
  await db.execute(sql`
    INSERT INTO accounting_fall_incentive (id, setup)
    VALUES ('default', CAST(${JSON.stringify(clean)} AS jsonb))
    ON CONFLICT (id) DO UPDATE SET setup = EXCLUDED.setup, updated_at = now()
  `);
}

function parseStored(value: unknown): unknown {
  if (typeof value !== "string") return value ?? null;
  try { return JSON.parse(value); } catch { return null; }
}

async function readReport(): Promise<IncentiveReport | null> {
  await ensureTable();
  const result = await db.execute(sql`SELECT report FROM accounting_fall_incentive WHERE id = 'default'`);
  const parsed = parseStored(result.rows[0]?.report);
  if (!parsed || typeof parsed !== "object") return null;
  const report = parsed as IncentiveReport;
  if (!Array.isArray(report.groups) || !Array.isArray(report.dates)) return null;
  return report;
}

async function writeReport(report: IncentiveReport): Promise<void> {
  await ensureTable();
  await db.execute(sql`
    UPDATE accounting_fall_incentive
    SET report = CAST(${JSON.stringify(report)} AS jsonb), updated_at = now()
    WHERE id = 'default'
  `);
}

async function clearReport(): Promise<void> {
  await ensureTable();
  await db.execute(sql`
    UPDATE accounting_fall_incentive
    SET report = NULL, updated_at = now()
    WHERE id = 'default'
  `);
}

export function registerFallIncentiveRoutes(router: Router) {
  const isAdmin = requirePlatformRole(["super_admin"]);

  router.get("/fall-incentive", isAdmin, async (_req, res) => {
    try {
      res.json(await readSetup());
    } catch (error) {
      console.error("[Fall Incentive] read setup:", error);
      res.status(500).json({ message: "The fall incentive could not be loaded." });
    }
  });

  router.put("/fall-incentive", isAdmin, async (req, res) => {
    try {
      const setup = sanitizeFallIncentiveSetup(req.body);
      const previous = await readSetup();
      await writeSetup(setup);
      if (incentiveSignature(previous) !== incentiveSignature(setup)) await clearReport();
      res.json(setup);
    } catch (error) {
      console.error("[Fall Incentive] save setup:", error);
      res.status(500).json({ message: "The fall incentive could not be saved." });
    }
  });

  router.get("/fall-incentive/last-report", isAdmin, async (_req, res) => {
    try {
      res.json(await readReport());
    } catch (error) {
      console.error("[Fall Incentive] read report:", error);
      res.status(500).json({ message: "The last report could not be loaded." });
    }
  });

  router.get("/fall-incentive/roster", isAdmin, async (req, res) => {
    try {
      const roster = await loadRoster(req.query.refresh === "1");
      res.json(roster);
    } catch (error) {
      res.status(502).json({ message: laborMessage(error) });
    }
  });

  router.post("/fall-incentive/report", isAdmin, async (req, res) => {
    const setup = sanitizeFallIncentiveSetup(req.body);
    const problem = setupProblem(setup);
    if (problem) {
      res.status(400).json({ message: problem });
      return;
    }
    try {
      await writeSetup(setup);
    } catch (error) {
      console.error("[Fall Incentive] save setup:", error);
      res.status(500).json({ message: "The fall incentive could not be saved." });
      return;
    }
    try {
      const roster = await loadRoster();
      const included = roster.employees.some((person) =>
        !setup.excludedEmployeeIds.includes(person.id)
        && person.jobTitles.some((title) => setup.includedJobTitles.some((item) => jobKey(item) === jobKey(title))),
      );
      if (!included) {
        res.status(400).json({ message: "Choose at least one employee." });
        return;
      }
      const punches = await readPunches(setup.startDate, setup.endDate);
      const report = buildIncentiveReport({ ...setup, employees: roster.employees, punches });
      await writeReport(report);
      res.json(report);
    } catch (error) {
      res.status(502).json({ message: laborMessage(error) });
    }
  });

  router.post("/fall-incentive/export", isAdmin, (req, res) => {
    try {
      const report = req.body as IncentiveReport;
      if (!report || !Array.isArray(report.groups) || !Array.isArray(report.dates)) {
        res.status(400).json({ message: "Generate the report before downloading it." });
        return;
      }
      const buffer = fallIncentiveWorkbook(report);
      const first = report.dates[0] || "report";
      const last = report.dates[report.dates.length - 1] || first;
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="fall-incentive-${first}-to-${last}.xlsx"`);
      res.send(buffer);
    } catch (error) {
      console.error("[Fall Incentive] export:", error);
      res.status(500).json({ message: "The Excel file could not be created." });
    }
  });
}

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function excelSheetName(name: string, used: Set<string>): string {
  const cleaned = name.replace(/[\\/*?:[\]]/g, " ").replace(/\s+/g, " ").trim() || "Employee";
  const base = cleaned.slice(0, 31);
  let candidate = base;
  let number = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` ${number}`;
    candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`;
    number += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

function clockText(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
}

function weekdayName(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  return weekdays[weekdayIndex(iso)] ?? "";
}

export function fallIncentiveWorkbook(report: IncentiveReport): Buffer {
  const book = XLSX.utils.book_new();
  const used = new Set<string>(["summary"]);
  const summary: (string | number)[][] = [
    ["Fall Incentive"],
    [],
    ["First incentive date", report.dates[0] ?? ""],
    ["Last incentive date", report.dates[report.dates.length - 1] ?? ""],
    ["Incentive dates", report.dateCount ?? report.dates.length],
    ["Employees", report.employeeCount ?? 0],
    ["Employees who qualify", report.qualifiedCount ?? 0],
    ["Incentive total", report.total ?? 0],
    [],
    ["Tier", "Amount per hour"],
  ];
  for (const band of report.bands ?? []) {
    summary.push([band.label, band.rate]);
  }
  if (report.missedLabel) summary.push([report.missedLabel, 0]);
  summary.push([]);
  summary.push(["Dates counted", report.dates.join(", ")]);
  summary.push([]);
  const headerRow = summary.length;
  summary.push(["Employee", "Location", "Jobs", "Days worked", "Hours worked", "Tier", "Amount per hour", "Incentive"]);

  const people = (report.groups ?? []).flatMap((group) =>
    (group.employees ?? []).map((person) => ({ person, tier: group.label, rate: group.rate })),
  );
  for (const row of people) {
    summary.push([
      row.person.name,
      row.person.restaurantName,
      (row.person.jobTitles ?? []).join(", "),
      row.person.daysWorked,
      row.person.hours,
      row.tier,
      row.rate,
      row.person.total,
    ]);
  }
  summary.push([]);
  summary.push(["Incentive total", "", "", "", "", "", "", report.total ?? 0]);

  const summarySheet = XLSX.utils.aoa_to_sheet(summary);
  summarySheet["!cols"] = [
    { wch: 28 }, { wch: 24 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 32 }, { wch: 18 }, { wch: 14 },
  ];
  const totalCell = XLSX.utils.encode_cell({ r: 7, c: 1 });
  if (summarySheet[totalCell]) summarySheet[totalCell].z = '"$"#,##0.00';
  for (let row = headerRow + 1; row < headerRow + 1 + people.length; row += 1) {
    const hours = XLSX.utils.encode_cell({ r: row, c: 4 });
    const rate = XLSX.utils.encode_cell({ r: row, c: 6 });
    const amount = XLSX.utils.encode_cell({ r: row, c: 7 });
    if (summarySheet[hours]) summarySheet[hours].z = "0.00";
    if (summarySheet[rate]) summarySheet[rate].z = '"$"#,##0.00';
    if (summarySheet[amount]) summarySheet[amount].z = '"$"#,##0.00';
  }
  XLSX.utils.book_append_sheet(book, summarySheet, "Summary");

  for (const row of people) {
    const person = row.person;
    const lines: (string | number)[][] = [
      [person.name],
      ["Location", person.restaurantName],
      ["Jobs", (person.jobTitles ?? []).join(", ")],
      ["Tier", row.tier],
      [],
      ["Date", "Day", "Worked", "Job", "Shift start", "Shift end", "Hours"],
    ];
    const firstShiftRow = lines.length;
    let shiftHours = 0;
    for (const day of person.days ?? []) {
      const calledOff = day.callout ? "Scheduled but Called Off Due to Weather" : "";
      if (!day.punches || day.punches.length === 0) {
        shiftHours += day.hours ?? 0;
        lines.push([
          day.date,
          weekdayName(day.date),
          day.worked ? "Yes" : "No",
          calledOff,
          "",
          "",
          day.hours ?? 0,
        ]);
        continue;
      }
      day.punches.forEach((punch, index) => {
        shiftHours += punch.hours ?? 0;
        lines.push([
          day.date,
          weekdayName(day.date),
          day.calloutConflict ? "Conflict" : day.worked ? "Yes" : "No",
          index === 0 && day.callout
            ? `${punch.jobTitle} — Scheduled but Called Off Due to Weather${day.calloutConflict ? ". Toast also has hours on this day." : ""}`
            : punch.jobTitle,
          clockText(punch.inAt),
          punch.open ? "Still clocked in" : clockText(punch.outAt),
          punch.hours ?? 0,
        ]);
      });
    }
    const lastShiftRow = lines.length - 1;
    lines.push([]);
    const hoursRow = lines.length;
    lines.push(["Hours worked", person.hours]);
    const rateRow = lines.length;
    lines.push(["Amount per hour", person.rate]);
    const totalRow = lines.length;
    lines.push(["Incentive", person.total]);
    const shiftHoursRow = lines.length;
    lines.push(["Sum of shift hours", ""]);
    lines.push(["Days worked", person.daysWorked, "Each incentive date counts once. A weather call-off with no Toast hours counts as that one day. A flagged call-off, where Toast also has hours, still counts as that same one day."]);
    lines.push(["Weather call-offs", person.calloutDays ?? 0, "Already included in days worked. Do not add this number again."]);
    const calcRow = lines.length;
    lines.push(["Calculation", ""]);
    if (person.openShift) lines.push(["Note", "A shift is still open, so these hours can change."]);

    const sheet = XLSX.utils.aoa_to_sheet(lines);
    if (lastShiftRow >= firstShiftRow) {
      const start = firstShiftRow + 1;
      const end = lastShiftRow + 1;
      const hoursRef = XLSX.utils.encode_cell({ r: hoursRow, c: 1 });
      const rateRef = XLSX.utils.encode_cell({ r: rateRow, c: 1 });
      const totalRef = XLSX.utils.encode_cell({ r: totalRow, c: 1 });
      const shiftRef = XLSX.utils.encode_cell({ r: shiftHoursRow, c: 1 });
      if (sheet[hoursRef]) sheet[hoursRef].z = "0.00";
      if (sheet[rateRef]) sheet[rateRef].z = '"$"#,##0.00';
      sheet[totalRef] = { t: "n", f: `ROUND(${hoursRef}*${rateRef},2)`, v: person.total, z: '"$"#,##0.00' };
      sheet[shiftRef] = { t: "n", f: `SUM(G${start}:G${end})`, v: Math.round(shiftHours * 100) / 100, z: "0.00" };
      const calcRef = XLSX.utils.encode_cell({ r: calcRow, c: 1 });
      sheet[calcRef] = {
        t: "s",
        f: `"Hours worked ("&TEXT(${hoursRef},"0.00")&") × amount per hour ("&TEXT(${rateRef},"$#,##0.00")&") = "&TEXT(${totalRef},"$#,##0.00")`,
        v: `Hours worked (${Number(person.hours).toFixed(2)}) × amount per hour ($${Number(person.rate).toFixed(2)}) = $${Number(person.total).toFixed(2)}`,
      };
      for (let rowIndex = firstShiftRow; rowIndex <= lastShiftRow; rowIndex += 1) {
        const cell = XLSX.utils.encode_cell({ r: rowIndex, c: 6 });
        if (sheet[cell] && typeof sheet[cell].v === "number") sheet[cell].z = "0.00";
      }
    }
    sheet["!cols"] = [
      { wch: 16 }, { wch: 28 }, { wch: 12 }, { wch: 64 }, { wch: 16 }, { wch: 18 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(book, sheet, excelSheetName(person.name, used));
  }

  return XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
