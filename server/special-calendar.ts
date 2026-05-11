/**
 * Labels for calendar days using reservation special dates plus recurring holidays.
 */

import { resySpecialDates, RECURRING_HOLIDAYS } from "@shared/schema";
import { and, eq, ilike, isNotNull } from "drizzle-orm";

import { db } from "./db";

/** Eastern US calendar YYYY-MM-DD for business-day alignment with operations. */
export function calendarYmdEastern(inst: Date | string): string {
  const d = typeof inst === "string" ? new Date(inst) : inst;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

type DbExec = typeof db;

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

export async function getCalendarNotationLabels(db: DbExec, ymd: string): Promise<string[]> {
  const specialRows = await db
    .select({ name: resySpecialDates.name })
    .from(resySpecialDates)
    .where(and(eq(resySpecialDates.date, ymd), isNotNull(resySpecialDates.name)));

  const recurring = recurringLabelsForYmd(ymd);

  const seen = new Set<string>();
  const merged: string[] = [];
  const pushTrimmed = (s: string | null | undefined) => {
    const t = s?.trim();
    if (!t) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(t);
  };

  for (const row of specialRows) {
    pushTrimmed(row.name ?? undefined);
  }
  for (const name of recurring) {
    pushTrimmed(name);
  }

  return merged;
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

  const dbRows = await db
    .selectDistinct({ date: resySpecialDates.date, name: resySpecialDates.name })
    .from(resySpecialDates)
    .where(and(isNotNull(resySpecialDates.name), ilike(resySpecialDates.name, pattern)))
    .limit(limit);

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

export async function buildNotationMapForYmds(
  db: DbExec,
  ymds: string[],
): Promise<Map<string, string[]>> {
  const unique = [...new Set(ymds.filter(Boolean))];
  const map = new Map<string, string[]>();
  await Promise.all(
    unique.map(async (ymd) => {
      map.set(ymd, await getCalendarNotationLabels(db, ymd));
    }),
  );
  return map;
}
