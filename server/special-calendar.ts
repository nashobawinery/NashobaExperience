/**
 * Labels for calendar days using reservation special dates plus recurring holidays.
 */

import { resySpecialDates, RECURRING_HOLIDAYS } from "@shared/schema";
import { and, eq, ilike, inArray, isNotNull } from "drizzle-orm";

import { db } from "./db";

type DbExec = typeof db;

function easternHour24(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  const hourPart = parts.find((p) => p.type === "hour");
  const hour = parseInt(hourPart?.value ?? "0", 10);
  return hour === 24 ? 0 : hour;
}

function subtractCalendarDay(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  const yy = dt.getUTCFullYear();
  const mo = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const da = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mo}-${da}`;
}

/**
 * Minimum event/banner date (YYYY-MM-DD) still visible on public media calendars.
 * Items stay visible through the event day until 1:00 AM Eastern the following morning.
 */
export function mediaEventVisibilityCutoffYmd(now = new Date()): string {
  const todayYmd = calendarYmdEastern(now);
  if (easternHour24(now) < 1) {
    return subtractCalendarDay(todayYmd);
  }
  return todayYmd;
}

/** Eastern US calendar YYYY-MM-DD for business-day alignment with operations. */
export function calendarYmdEastern(inst: Date | string | null | undefined): string {
  if (inst == null) return "invalid";
  const d =
    typeof inst === "string"
      ? new Date(inst)
      : inst instanceof Date
        ? inst
        : new Date(String(inst));
  if (Number.isNaN(d.getTime())) {
    if (typeof inst === "string") {
      const m = /^(\d{4}-\d{2}-\d{2})/.exec(inst);
      if (m) return m[1];
    }
    return "invalid";
  }
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    const y = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
    const da = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${mo}-${da}`;
  }
}

function isValidCalendarYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function recurringLabelsForYmd(targetYmd: string): string[] {
  const y = Number(targetYmd.slice(0, 4));
  if (!Number.isFinite(y) || y < 1990 || y > 2100) return [];

  const out: string[] = [];
  for (const h of RECURRING_HOLIDAYS) {
    try {
      if (h.getDate(y) === targetYmd) {
        out.push(h.name);
      }
    } catch {
      continue;
    }
  }
  return out;
}

function mergeDedupedStrings(values: Iterable<string>): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const raw of values) {
    const t = raw?.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(t);
  }
  return merged;
}

export async function getCalendarNotationLabels(db: DbExec, ymd: string): Promise<string[]> {
  if (!isValidCalendarYmd(ymd)) {
    return [];
  }

  let specialRows: { name: string | null }[] = [];
  try {
    specialRows = await db
      .select({ name: resySpecialDates.name })
      .from(resySpecialDates)
      .where(and(eq(resySpecialDates.date, ymd), isNotNull(resySpecialDates.name)));
  } catch (err) {
    console.warn(
      "[special-calendar] resy_special_dates lookup skipped:",
      (err as Error)?.message ?? err,
    );
  }

  const specialNames = specialRows.map((r) => r.name).filter((n): n is string => !!n?.trim());
  const recurring = recurringLabelsForYmd(ymd);
  return mergeDedupedStrings([...specialNames, ...recurring]);
}

export type SpecialDaySearchHit = {
  date: string;
  label: string;
  source: "special_date" | "recurring_holiday";
};

function escapeIlikePattern(q: string): string {
  return q.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** Search named holidays: DB special dates + recurring definitions (2018–2040). */
export async function searchSpecialCalendarDays(
  db: DbExec,
  rawQuery: string,
  limit = 40,
): Promise<SpecialDaySearchHit[]> {
  const q = rawQuery.trim();
  if (!q) return [];

  const pattern = `%${escapeIlikePattern(q)}%`;

  let dbRows: { date: string; name: string | null }[] = [];
  try {
    dbRows = await db
      .selectDistinct({ date: resySpecialDates.date, name: resySpecialDates.name })
      .from(resySpecialDates)
      .where(and(isNotNull(resySpecialDates.name), ilike(resySpecialDates.name, pattern)))
      .limit(limit);
  } catch (err) {
    console.warn("[special-calendar] special-days DB search skipped:", (err as Error)?.message ?? err);
  }

  const hits: SpecialDaySearchHit[] = [];
  const seen = new Set<string>();
  const push = (date: string, label: string, source: SpecialDaySearchHit["source"]) => {
    const key = `${date}|${label.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    hits.push({ date, label, source });
  };

  for (const row of dbRows) {
    if (row.name) push(row.date, row.name, "special_date");
  }

  const lower = q.toLowerCase();
  const yearFrom = 2018;
  const yearTo = 2040;
  for (let year = yearFrom; year <= yearTo; year++) {
    for (const h of RECURRING_HOLIDAYS) {
      const nameMatch = h.name.toLowerCase().includes(lower);
      const keyMatch = h.key.replace(/_/g, " ").toLowerCase().includes(lower);
      if (!nameMatch && !keyMatch) continue;
      try {
        const date = h.getDate(year);
        push(date, h.name, "recurring_holiday");
      } catch {
        continue;
      }
    }
  }

  hits.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.label.localeCompare(b.label)));
  return hits.slice(0, limit);
}

/**
 * Resolve holiday/special labels for many calendar days with one batched DB read.
 */
export async function buildNotationMapForYmds(
  db: DbExec,
  rawYmds: string[],
): Promise<Map<string, string[]>> {
  const uniqueDates = [
    ...new Set(
      rawYmds
        .map((y) => (typeof y === "string" ? y.trim() : ""))
        .filter(isValidCalendarYmd),
    ),
  ];

  const specialByDate = new Map<string, string[]>();

  if (uniqueDates.length > 0) {
    const chunkSize = 400;
    for (let offset = 0; offset < uniqueDates.length; offset += chunkSize) {
      const chunk = uniqueDates.slice(offset, offset + chunkSize);
      try {
        const rows = await db
          .select({ date: resySpecialDates.date, name: resySpecialDates.name })
          .from(resySpecialDates)
          .where(and(inArray(resySpecialDates.date, chunk), isNotNull(resySpecialDates.name)));

        for (const row of rows) {
          const n = row.name?.trim();
          if (!n) continue;
          const list = specialByDate.get(row.date) ?? [];
          list.push(n);
          specialByDate.set(row.date, list);
        }
      } catch (err) {
        console.warn(
          "[special-calendar] batched resy_special_dates lookup skipped:",
          (err as Error)?.message ?? err,
        );
      }
    }
  }

  const map = new Map<string, string[]>();
  for (const ymd of uniqueDates) {
    const specials = specialByDate.get(ymd) ?? [];
    const recurring = recurringLabelsForYmd(ymd);
    map.set(ymd, mergeDedupedStrings([...specials, ...recurring]));
  }

  return map;
}
