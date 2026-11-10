export type FallTierInput = { minDays: string; rate: string };

export type WeatherCallout = {
  date: string;
  name: string;
  employeeId: string;
};

export type FallIncentiveSetup = {
  startDate: string;
  endDate: string;
  excludedHolidays: string[];
  tiers: FallTierInput[];
  includedJobTitles: string[];
  excludedEmployeeIds: string[];
  separateEmployeeIds: string[];
  samePeople: string[][];
  tierPromotions: string[];
  description: string;
  callouts: WeatherCallout[];
};

export type HolidayChoice = {
  date: string;
  name: string;
  weekend: boolean;
};

export type IncentiveTier = { minDays: number; rate: number };

export type TierBand = {
  minDays: number;
  maxDays: number | null;
  rate: number;
  label: string;
};

export type IncentivePerson = {
  id: string;
  name: string;
  restaurantName: string;
  jobTitles: string[];
  payrollNumber?: string;
  alsoKnownAs?: string[];
};

export type IncentivePunch = {
  employeeId: string;
  businessDate: string;
  jobTitle: string;
  inAt: string | null;
  outAt: string | null;
  hours: number;
  open: boolean;
};

export type IncentiveDay = {
  date: string;
  worked: boolean;
  hours: number;
  open: boolean;
  callout?: boolean;
  calloutConflict?: boolean;
  punches: { jobTitle: string; inAt: string | null; outAt: string | null; hours: number; open: boolean }[];
};

export type CalloutNote = {
  date: string;
  name: string;
  message: string;
};

export type IncentiveEmployeeReport = {
  id: string;
  name: string;
  restaurantName: string;
  jobTitles: string[];
  payrollNumber: string;
  daysWorked: number;
  hours: number;
  rate: number;
  total: number;
  openShift: boolean;
  calloutDays?: number;
  calloutConflicts?: number;
  alsoKnownAs?: string[];
  tierPromoted?: boolean;
  tierPromotionRate?: number;
  days: IncentiveDay[];
};

export type IncentiveReportGroup = {
  key: string;
  label: string;
  rate: number;
  employees: IncentiveEmployeeReport[];
  hours: number;
  total: number;
};

export type IncentiveReport = {
  dates: string[];
  dateCount: number;
  bands: TierBand[];
  missedLabel: string;
  groups: IncentiveReportGroup[];
  employeeCount: number;
  qualifiedCount: number;
  total: number;
  openShifts: number;
  calloutNotes?: CalloutNote[];
  dayBasis: "date";
  peopleCombined?: boolean;
};

export function emptyFallIncentiveSetup(): FallIncentiveSetup {
  return {
    startDate: "",
    endDate: "",
    excludedHolidays: [],
    tiers: [{ minDays: "", rate: "" }],
    includedJobTitles: [],
    excludedEmployeeIds: [],
    separateEmployeeIds: [],
    samePeople: [],
    tierPromotions: [],
    description: "",
    callouts: [],
  };
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function weekdayIndex(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function daysInRange(start: string, end: string): number | null {
  if (!isIsoDate(start) || !isIsoDate(end) || end < start) return null;
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000) + 1;
}

export function jobKey(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

export function isJobIncluded(title: string, includedJobTitles: string[]): boolean {
  const key = jobKey(title);
  return includedJobTitles.some((item) => jobKey(item) === key);
}

function utcDate(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

function nthWeekday(year: number, month: number, weekday: number, n: number): string {
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const delta = (weekday - firstDow + 7) % 7;
  return utcDate(year, month, 1 + delta + (n - 1) * 7);
}

function lastWeekday(year: number, month: number, weekday: number): string {
  const last = new Date(Date.UTC(year, month, 0));
  const delta = (last.getUTCDay() - weekday + 7) % 7;
  return utcDate(year, month, last.getUTCDate() - delta);
}

function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utcDate(year, month, day);
}

function holidaysForYear(year: number): { date: string; name: string }[] {
  const fixed = [
    { date: `${year}-01-01`, name: "New Year's Day", observe: true },
    { date: nthWeekday(year, 1, 1, 3), name: "Martin Luther King Jr. Day", observe: false },
    { date: nthWeekday(year, 2, 1, 3), name: "Presidents' Day", observe: false },
    { date: easterSunday(year), name: "Easter Sunday", observe: false },
    { date: lastWeekday(year, 5, 1), name: "Memorial Day", observe: false },
    { date: `${year}-06-19`, name: "Juneteenth", observe: true },
    { date: `${year}-07-04`, name: "Independence Day", observe: true },
    { date: nthWeekday(year, 9, 1, 1), name: "Labor Day", observe: false },
    { date: nthWeekday(year, 10, 1, 2), name: "Columbus Day", observe: false },
    { date: `${year}-11-11`, name: "Veterans Day", observe: true },
    { date: nthWeekday(year, 11, 4, 4), name: "Thanksgiving", observe: false },
    { date: addDays(nthWeekday(year, 11, 4, 4), 1), name: "Day After Thanksgiving", observe: false },
    { date: `${year}-12-24`, name: "Christmas Eve", observe: false },
    { date: `${year}-12-25`, name: "Christmas Day", observe: true },
    { date: `${year}-12-31`, name: "New Year's Eve", observe: false },
  ];
  const rows = fixed.map((item) => ({ date: item.date, name: item.name }));
  for (const item of fixed) {
    if (!item.observe) continue;
    const dow = weekdayIndex(item.date);
    if (dow !== 0 && dow !== 6) continue;
    rows.push({ date: addDays(item.date, dow === 6 ? -1 : 1), name: `${item.name} (observed)` });
  }
  return rows;
}

export function majorHolidays(start: string, end: string): HolidayChoice[] {
  if (!isIsoDate(start) || !isIsoDate(end) || end < start) return [];
  const namesByDate = new Map<string, string[]>();
  const startYear = Number(start.slice(0, 4));
  const endYear = Number(end.slice(0, 4));
  for (let year = startYear - 1; year <= endYear + 1; year += 1) {
    for (const holiday of holidaysForYear(year)) {
      if (holiday.date < start || holiday.date > end) continue;
      const names = namesByDate.get(holiday.date) ?? [];
      if (!names.includes(holiday.name)) names.push(holiday.name);
      namesByDate.set(holiday.date, names);
    }
  }
  return [...namesByDate.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([date, names]) => ({
      date,
      name: names.join(" · "),
      weekend: weekdayIndex(date) === 0 || weekdayIndex(date) === 6,
    }));
}

export function incentiveDates(start: string, end: string, excludedHolidays: string[]): string[] {
  const span = daysInRange(start, end);
  if (span == null || span > 366) return [];
  const excluded = new Set(excludedHolidays);
  const selected = new Set<string>();
  let guard = 0;
  for (let day = start; day <= end && guard < 400; day = addDays(day, 1), guard += 1) {
    const dow = weekdayIndex(day);
    if (dow === 0 || dow === 6) selected.add(day);
  }
  for (const holiday of majorHolidays(start, end)) {
    if (excluded.has(holiday.date)) selected.delete(holiday.date);
    else selected.add(holiday.date);
  }
  return [...selected].sort();
}

export function parseTiers(tiers: FallTierInput[]): IncentiveTier[] {
  const parsed: IncentiveTier[] = [];
  for (const tier of tiers) {
    if (!/^\d{1,3}$/.test(tier.minDays)) continue;
    const minDays = Number(tier.minDays);
    if (!Number.isInteger(minDays) || minDays < 1) continue;
    if (!/^\d{1,3}(\.\d{1,2})?$/.test(tier.rate)) continue;
    const rate = Math.round(Number(tier.rate) * 100) / 100;
    if (!Number.isFinite(rate) || rate < 0) continue;
    parsed.push({ minDays, rate });
  }
  return parsed;
}

export function tierBands(tiers: IncentiveTier[]): TierBand[] {
  const byMin = new Map<number, number>();
  for (const tier of tiers) {
    const current = byMin.get(tier.minDays);
    if (current == null || tier.rate > current) byMin.set(tier.minDays, tier.rate);
  }
  const ordered = [...byMin.entries()].sort((left, right) => right[0] - left[0]);
  return ordered.map(([minDays, rate], index) => {
    const higher = ordered[index - 1];
    const maxDays = higher ? higher[0] - 1 : null;
    const label = maxDays == null
      ? `${minDays} or more days`
      : maxDays <= minDays
        ? `${minDays} ${minDays === 1 ? "day" : "days"}`
        : `${minDays} to ${maxDays} days`;
    return { minDays, maxDays, rate, label };
  });
}

export function bandForDays(days: number, bands: TierBand[]): TierBand | null {
  return bands.find((band) => days >= band.minDays && (band.maxDays == null || days <= band.maxDays)) ?? null;
}

export function nextTierUp(days: number, bands: TierBand[]): TierBand | null {
  const next = bands.find((band) => band.minDays === days + 1);
  if (!next) return null;
  const current = bandForDays(days, bands);
  if (current && current.rate >= next.rate) return null;
  return next;
}

export function applyTierPromotions(report: IncentiveReport, promotedIds: string[]): IncentiveReport {
  const promoted = new Set(promotedIds);
  const people = report.groups.flatMap((group) => group.employees).map((person) => {
    const next = nextTierUp(person.daysWorked, report.bands);
    const tierPromoted = Boolean(next && promoted.has(person.id));
    const base = bandForDays(person.daysWorked, report.bands);
    const rate = tierPromoted && next ? next.rate : base?.rate ?? 0;
    return {
      ...person,
      rate,
      total: roundMoney(person.hours * rate),
      tierPromoted,
      tierPromotionRate: next?.rate,
    };
  });
  const placed = new Set<string>();
  const groups: IncentiveReportGroup[] = report.bands.map((band) => {
    const employees = people.filter((person) => {
      const next = nextTierUp(person.daysWorked, report.bands);
      const match = person.tierPromoted && next
        ? next.minDays === band.minDays && next.rate === band.rate
        : person.daysWorked >= band.minDays && (band.maxDays == null || person.daysWorked <= band.maxDays);
      if (match) placed.add(person.id);
      return match;
    });
    return {
      key: `${band.minDays}-${band.rate}`,
      label: band.label,
      rate: band.rate,
      employees,
      hours: roundHours(employees.reduce((sum, person) => sum + person.hours, 0)),
      total: roundMoney(employees.reduce((sum, person) => sum + person.total, 0)),
    };
  });
  const missed = people.filter((person) => !placed.has(person.id));
  if (missed.length > 0) {
    groups.push({
      key: "none",
      label: report.missedLabel,
      rate: 0,
      employees: missed,
      hours: roundHours(missed.reduce((sum, person) => sum + person.hours, 0)),
      total: 0,
    });
  }
  return {
    ...report,
    groups,
    qualifiedCount: people.filter((person) => person.rate > 0).length,
    total: roundMoney(people.reduce((sum, person) => sum + person.total, 0)),
  };
}

export function setupProblem(setup: FallIncentiveSetup): string | null {
  if (!isIsoDate(setup.startDate) || !isIsoDate(setup.endDate)) return "Enter a start date and an end date.";
  if (setup.endDate < setup.startDate) return "The end date has to be on or after the start date.";
  const span = daysInRange(setup.startDate, setup.endDate);
  if (span == null || span > 366) return "Choose a range of a year or less.";
  if (incentiveDates(setup.startDate, setup.endDate, setup.excludedHolidays).length === 0) return "There are no incentive dates in this range.";
  if (parseTiers(setup.tiers).length === 0) return "Add at least one incentive line with the days required and the amount per hour.";
  return null;
}

export function missedLabel(bands: TierBand[]): string {
  if (bands.length === 0) return "No incentive";
  const lowest = bands[bands.length - 1];
  if (lowest.minDays <= 1) return "No incentive · 0 days";
  return `No incentive · fewer than ${lowest.minDays} days`;
}

export function roundHours(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function incentiveSignature(setup: FallIncentiveSetup): string {
  const clean = sanitizeFallIncentiveSetup(setup);
  return JSON.stringify({
    startDate: clean.startDate,
    endDate: clean.endDate,
    excludedHolidays: [...clean.excludedHolidays].sort(),
    tiers: clean.tiers,
    includedJobTitles: [...clean.includedJobTitles].map((title) => jobKey(title)).sort(),
    excludedEmployeeIds: [...clean.excludedEmployeeIds].sort(),
    separateEmployeeIds: [...clean.separateEmployeeIds].sort(),
    samePeople: clean.samePeople.map((group) => [...group].sort()).sort(),
    callouts: clean.callouts.map((callout) => `${callout.date}|${callout.employeeId}|${callout.name.toLowerCase()}`).sort(),
  });
}

export function sanitizeFallIncentiveSetup(value: unknown): FallIncentiveSetup {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const tiers = Array.isArray(raw.tiers) ? raw.tiers.slice(0, 20) : [];
  const cleanTiers = tiers.map((row) => {
    const item = row && typeof row === "object" ? row as Record<string, unknown> : {};
    return {
      minDays: cleanNumberText(item.minDays),
      rate: cleanNumberText(item.rate),
    };
  });
  return {
    startDate: isIsoDate(String(raw.startDate ?? "")) ? String(raw.startDate) : "",
    endDate: isIsoDate(String(raw.endDate ?? "")) ? String(raw.endDate) : "",
    excludedHolidays: cleanStringList(raw.excludedHolidays, 80).filter(isIsoDate),
    tiers: cleanTiers.length > 0 ? cleanTiers : [{ minDays: "", rate: "" }],
    includedJobTitles: cleanStringList(raw.includedJobTitles, 200),
    excludedEmployeeIds: cleanStringList(raw.excludedEmployeeIds, 2000),
    separateEmployeeIds: cleanStringList(raw.separateEmployeeIds, 2000),
    samePeople: cleanSamePeople(raw.samePeople),
    tierPromotions: cleanStringList(raw.tierPromotions, 2000),
    description: cleanDescription(raw.description),
    callouts: cleanCallouts(raw.callouts),
  };
}

function cleanSamePeople(value: unknown): string[][] {
  if (!Array.isArray(value)) return [];
  const groups: string[][] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const ids = cleanStringList(item, 10).filter((id) => !seen.has(id));
    if (ids.length < 2) continue;
    ids.forEach((id) => seen.add(id));
    groups.push(ids);
    if (groups.length >= 100) break;
  }
  return groups;
}

function cleanDescription(value: unknown): string {
  return String(value ?? "").replace(/\u0000/g, "").slice(0, 20000);
}

function cleanCallouts(value: unknown): WeatherCallout[] {
  if (!Array.isArray(value)) return [];
  const out: WeatherCallout[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const date = String(row.date ?? "");
    if (!isIsoDate(date)) continue;
    const name = String(row.name ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
    const employeeId = String(row.employeeId ?? "").trim().slice(0, 80);
    if (!name && !employeeId) continue;
    const key = `${date}|${employeeId}|${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ date, name, employeeId });
    if (out.length >= 500) break;
  }
  return out;
}

const calloutAliases: Record<string, string> = {
  nacy: "nancy",
  jackie: "jaclyn",
  corrine: "corinne",
  yaui: "yauri",
};

function calloutTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => calloutAliases[token] ?? token);
}

export type CalloutMatch = {
  employeeIds: string[];
  status: "matched" | "duplicate" | "ambiguous" | "unmatched";
};

export function matchCalloutName(label: string, employees: { id: string; name: string }[]): CalloutMatch {
  const want = calloutTokens(label);
  if (want.length === 0 || employees.length === 0) return { employeeIds: [], status: "unmatched" };
  const scored = employees.map((person) => {
    const have = calloutTokens(person.name);
    const first = have[0] ?? "";
    let score = 0;
    if (first === want[0]) score += 10;
    else if ((first.startsWith(want[0]) || want[0].startsWith(first)) && Math.min(first.length, want[0].length) >= 3) score += 4;
    if (score === 0) return { id: person.id, name: person.name, score: 0 };
    if (want.length === 1) return { id: person.id, name: person.name, score: score + 1 };
    const wantLast = want.slice(1).join("");
    const haveLast = have.slice(1).join("");
    if (!haveLast) return { id: person.id, name: person.name, score: 0 };
    if (wantLast.length === 1) return { id: person.id, name: person.name, score: haveLast.startsWith(wantLast) ? score + 6 : 0 };
    if (haveLast === wantLast || haveLast.startsWith(wantLast) || wantLast.startsWith(haveLast) || haveLast.includes(wantLast)) {
      return { id: person.id, name: person.name, score: score + 8 };
    }
    return { id: person.id, name: person.name, score: 0 };
  }).filter((person) => person.score > 0);
  const best = Math.max(0, ...scored.map((person) => person.score));
  const winners = scored.filter((person) => person.score === best);
  if (winners.length === 0) return { employeeIds: [], status: "unmatched" };
  if (winners.length === 1) return { employeeIds: [winners[0].id], status: "matched" };
  const sameName = new Set(winners.map((person) => calloutTokens(person.name).join(" "))).size === 1;
  return {
    employeeIds: winners.map((person) => person.id),
    status: sameName ? "duplicate" : "ambiguous",
  };
}

export function resolveCallout(callout: WeatherCallout, employees: { id: string; name: string }[]): CalloutMatch {
  if (callout.employeeId) {
    return employees.some((person) => person.id === callout.employeeId)
      ? { employeeIds: [callout.employeeId], status: "matched" }
      : { employeeIds: [], status: "unmatched" };
  }
  return matchCalloutName(callout.name, employees);
}

export function defaultWeatherCallouts(): WeatherCallout[] {
  const groups: { date: string; names: string[] }[] = [
    { date: "2026-09-13", names: ["Amy C", "Anna T", "Christina D", "Danielle", "Delia", "Donna", "Nancy"] },
    { date: "2026-09-20", names: ["Amy C", "Andy", "Antonio", "Ashley B", "Ashley M", "Crystal", "Donna", "Erin F", "Erin D", "Kristy", "Maddy", "Mary D", "Nancy"] },
    { date: "2026-09-26", names: ["Alex R", "Amy C", "Andy", "Antonio", "Ashley B", "Corrine", "Dan J", "Danielle", "Donna", "Erin D", "Erin Flynn", "Jess Shay", "Kristy", "Laura", "Mary K", "Nancy", "Ryan"] },
    { date: "2026-09-27", names: ["Alex", "Amy C", "Andy", "Antonio", "Ashley B", "Ashley M", "Brenna", "Chris L", "Christina", "Corrine", "Crystal", "Dan J", "Danielle", "Donna", "Erin D", "Erin F", "Jenna", "Jess Yauri", "Jillian", "Laura M", "Mettaya", "Nancy", "Ryan"] },
    { date: "2026-11-01", names: ["Ashley M", "Brenna", "Crystal", "Delia", "Erin F", "Jackie", "Jess Yauri", "Jillian B", "Nancy"] },
  ];
  return groups.flatMap((group) => group.names.map((name) => ({ date: group.date, name, employeeId: "" })));
}

function cleanNumberText(value: unknown): string {
  const text = String(value ?? "").trim();
  return /^\d{0,3}(\.\d{0,2})?$/.test(text) ? text : "";
}

function cleanStringList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const text = item.trim();
    if (!text || text.length > 120 || out.includes(text)) continue;
    out.push(text);
    if (out.length >= max) break;
  }
  return out;
}

export type CombinedPeople = {
  people: IncentivePerson[];
  memberIds: Map<string, string>;
  groups: { id: string; name: string; also: string[]; memberIds: string[] }[];
};

function personTokens(value: string): string[] {
  return value.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
}

export function combinePeople(
  employees: IncentivePerson[],
  separateEmployeeIds: string[] = [],
  samePeople: string[][] = [],
): CombinedPeople {
  const separate = new Set(separateEmployeeIds);
  const parent = employees.map((_, index) => index);
  const find = (index: number): number => {
    let cursor = index;
    while (parent[cursor] !== cursor) {
      parent[cursor] = parent[parent[cursor]];
      cursor = parent[cursor];
    }
    return cursor;
  };
  const union = (left: number, right: number) => {
    if (separate.has(employees[left].id) || separate.has(employees[right].id)) return;
    const a = find(left);
    const b = find(right);
    if (a !== b) parent[b] = a;
  };
  const indexOf = new Map(employees.map((person, index) => [person.id, index]));
  for (const group of samePeople) {
    const indexes = group.map((id) => indexOf.get(id)).filter((index): index is number => index != null);
    for (let cursor = 1; cursor < indexes.length; cursor += 1) union(indexes[0], indexes[cursor]);
  }
  const byName = new Map<string, number[]>();
  employees.forEach((person, index) => {
    const key = personTokens(person.name).join(" ");
    if (!key) return;
    const list = byName.get(key) ?? [];
    list.push(index);
    byName.set(key, list);
  });
  for (const indexes of byName.values()) {
    for (let cursor = 1; cursor < indexes.length; cursor += 1) union(indexes[0], indexes[cursor]);
  }
  employees.forEach((person, index) => {
    if (separate.has(person.id) || person.payrollNumber) return;
    const tokens = personTokens(person.name);
    if (tokens.length !== 2 || tokens[1].length !== 1) return;
    const matches = employees.filter((other, otherIndex) => {
      if (otherIndex === index || separate.has(other.id)) return false;
      const have = personTokens(other.name);
      const last = have.slice(1).join("");
      return have[0] === tokens[0] && last.startsWith(tokens[1]) && last.length > 1;
    });
    const roots = new Set(matches.map((other) => find(indexOf.get(other.id) ?? index)));
    if (roots.size === 1 && matches[0]) union(index, indexOf.get(matches[0].id) ?? index);
  });
  employees.forEach((person, index) => {
    if (separate.has(person.id) || person.payrollNumber) return;
    const tokens = personTokens(person.name);
    if (tokens.length < 2) return;
    const last = tokens.slice(1).join("");
    const matches = employees.filter((other, otherIndex) => {
      if (otherIndex === index || separate.has(other.id)) return false;
      const have = personTokens(other.name);
      if (have.length < 2 || have.slice(1).join("") !== last) return false;
      const first = have[0];
      return first !== tokens[0] && (first.startsWith(tokens[0]) || tokens[0].startsWith(first)) && Math.min(first.length, tokens[0].length) >= 3;
    });
    const roots = new Set(matches.map((other) => find(indexOf.get(other.id) ?? index)));
    if (roots.size === 1 && matches[0]) union(index, indexOf.get(matches[0].id) ?? index);
  });

  const buckets = new Map<number, IncentivePerson[]>();
  employees.forEach((person, index) => {
    const root = find(index);
    const list = buckets.get(root) ?? [];
    list.push(person);
    buckets.set(root, list);
  });
  const people: IncentivePerson[] = [];
  const memberIds = new Map<string, string>();
  const groups: CombinedPeople["groups"] = [];
  for (const members of buckets.values()) {
    const primary = members.slice().sort((left, right) => {
      const score = (person: IncentivePerson) => (person.payrollNumber ? 100 : 0) + Math.min(person.name.length, 40) + Math.min(person.jobTitles.length, 20);
      return score(right) - score(left) || left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
    })[0];
    const jobTitles: string[] = [];
    for (const member of members) {
      memberIds.set(member.id, primary.id);
      for (const title of member.jobTitles) {
        if (!jobTitles.some((item) => jobKey(title) === jobKey(item))) jobTitles.push(title);
      }
    }
    const also = [...new Set(members.map((member) => member.name).filter((name) => name !== primary.name))].sort((left, right) => left.localeCompare(right));
    people.push({
      id: primary.id,
      name: primary.name,
      restaurantName: primary.restaurantName,
      jobTitles,
      payrollNumber: primary.payrollNumber || members.find((member) => member.payrollNumber)?.payrollNumber || "",
      alsoKnownAs: also,
    });
    if (members.length > 1) groups.push({ id: primary.id, name: primary.name, also, memberIds: members.map((member) => member.id) });
  }
  people.sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
  groups.sort((left, right) => left.name.localeCompare(right.name));
  return { people, memberIds, groups };
}

export function suggestedSamePeople(
  employees: IncentivePerson[],
  separateEmployeeIds: string[] = [],
  samePeople: string[][] = [],
): { ids: string[]; label: string }[] {
  const combined = combinePeople(employees, separateEmployeeIds, samePeople);
  const suggestions: { ids: string[]; label: string }[] = [];
  const seen = new Set<string>();
  for (const person of employees) {
    if (person.payrollNumber) continue;
    const tokens = personTokens(person.name);
    if (tokens.length < 2) continue;
    const last = tokens.slice(1).join("");
    const matches = employees.filter((other) => {
      if (other.id === person.id) return false;
      const have = personTokens(other.name);
      if (have.length < 2 || have.slice(1).join("") !== last) return false;
      const first = have[0];
      return first !== tokens[0] && (first.startsWith(tokens[0]) || tokens[0].startsWith(first)) && Math.min(first.length, tokens[0].length) >= 3;
    });
    if (matches.length !== 1) continue;
    const other = matches[0];
    if (combined.memberIds.get(person.id) === combined.memberIds.get(other.id)) continue;
    const key = [person.id, other.id].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push({ ids: [other.id, person.id], label: `${other.name} and ${person.name}` });
  }
  return suggestions.sort((left, right) => left.label.localeCompare(right.label));
}

export function daysWorkedCount(days: IncentiveDay[], dateCount: number): number {
  const worked = days.filter((day) => day.worked).length;
  return Math.min(worked, Math.max(0, dateCount));
}

export function buildIncentiveReport(input: {
  startDate: string;
  endDate: string;
  excludedHolidays: string[];
  tiers: FallTierInput[];
  includedJobTitles: string[];
  excludedEmployeeIds: string[];
  separateEmployeeIds?: string[];
  samePeople?: string[][];
  callouts?: WeatherCallout[];
  employees: IncentivePerson[];
  punches: IncentivePunch[];
}): IncentiveReport {
  const dates = incentiveDates(input.startDate, input.endDate, input.excludedHolidays);
  const dateSet = new Set(dates);
  const bands = tierBands(parseTiers(input.tiers));
  const none = missedLabel(bands);
  const combined = combinePeople(input.employees, input.separateEmployeeIds ?? [], input.samePeople ?? []);
  const canonical = (id: string) => combined.memberIds.get(id) ?? id;
  const excluded = new Set(input.excludedEmployeeIds);
  const people = combined.people.filter((person) =>
    !excluded.has(person.id) && person.jobTitles.some((title) => isJobIncluded(title, input.includedJobTitles)),
  );
  const peopleIds = new Set(people.map((person) => person.id));
  const calloutNotes: CalloutNote[] = [];
  const calloutsByPerson = new Map<string, Set<string>>();
  for (const callout of input.callouts ?? []) {
    const resolved = resolveCallout(
      { ...callout, employeeId: callout.employeeId ? canonical(callout.employeeId) : "" },
      combined.people,
    );
    if (!dateSet.has(callout.date)) {
      calloutNotes.push({ date: callout.date, name: callout.name, message: "This date is not an incentive date, so it does not add a day." });
      continue;
    }
    if (resolved.status === "unmatched") {
      calloutNotes.push({ date: callout.date, name: callout.name, message: "No employee matches this name." });
      continue;
    }
    if (resolved.status === "ambiguous") {
      calloutNotes.push({ date: callout.date, name: callout.name, message: "More than one employee matches this name." });
      continue;
    }
    const resolvedIds = [...new Set(resolved.employeeIds.map((employeeId) => canonical(employeeId)))];
    if (resolvedIds.length > 1 && resolved.status === "duplicate") {
      calloutNotes.push({ date: callout.date, name: callout.name, message: "This name is on more than one Toast record, so the call-off is counted on each." });
    }
    for (const employeeId of resolvedIds) {
      if (!peopleIds.has(employeeId)) {
        calloutNotes.push({ date: callout.date, name: callout.name, message: "This person is not included in the selected jobs." });
        continue;
      }
      const datesForPerson = calloutsByPerson.get(employeeId) ?? new Set<string>();
      datesForPerson.add(callout.date);
      calloutsByPerson.set(employeeId, datesForPerson);
    }
  }
  const punchesByPerson = new Map<string, IncentivePunch[]>();
  for (const punch of input.punches) {
    if (!dateSet.has(punch.businessDate) || !isJobIncluded(punch.jobTitle, input.includedJobTitles)) continue;
    const employeeId = canonical(punch.employeeId);
    const list = punchesByPerson.get(employeeId) ?? [];
    list.push(punch);
    punchesByPerson.set(employeeId, list);
  }

  const reports: IncentiveEmployeeReport[] = people.map((person) => {
    const punches = (punchesByPerson.get(person.id) ?? []).slice().sort((left, right) => {
      return (left.inAt ?? left.businessDate).localeCompare(right.inAt ?? right.businessDate);
    });
    const byDate = new Map<string, IncentivePunch[]>();
    for (const punch of punches) {
      const list = byDate.get(punch.businessDate) ?? [];
      list.push(punch);
      byDate.set(punch.businessDate, list);
    }
    const days: IncentiveDay[] = dates.map((date) => {
      const dayPunches = byDate.get(date) ?? [];
      const hours = roundHours(dayPunches.reduce((sum, punch) => sum + punch.hours, 0));
      const open = dayPunches.some((punch) => punch.open);
      const callout = calloutsByPerson.get(person.id)?.has(date) ?? false;
      const calloutConflict = callout && (hours > 0 || open);
      if (calloutConflict) {
        calloutNotes.push({ date, name: person.name, message: "Called off due to weather, but Toast has hours on this day. This date still counts as one day." });
      }
      return {
        date,
        worked: hours > 0 || open || callout,
        hours,
        open,
        callout,
        calloutConflict,
        punches: dayPunches.map((punch) => ({
          jobTitle: punch.jobTitle,
          inAt: punch.inAt,
          outAt: punch.outAt,
          hours: roundHours(punch.hours),
          open: punch.open,
        })),
      };
    });
    const daysWorked = daysWorkedCount(days, dates.length);
    const hours = roundHours(days.reduce((sum, day) => sum + day.hours, 0));
    const band = bandForDays(daysWorked, bands);
    const rate = band?.rate ?? 0;
    return {
      id: person.id,
      name: person.name,
      restaurantName: person.restaurantName,
      jobTitles: person.jobTitles.filter((title) => isJobIncluded(title, input.includedJobTitles)),
      payrollNumber: person.payrollNumber ?? "",
      daysWorked,
      hours,
      rate,
      total: roundMoney(hours * rate),
      openShift: days.some((day) => day.open),
      calloutDays: days.filter((day) => day.callout).length,
      calloutConflicts: days.filter((day) => day.calloutConflict).length,
      alsoKnownAs: person.alsoKnownAs ?? [],
      days,
    };
  });

  reports.sort((left, right) => right.daysWorked - left.daysWorked || left.name.localeCompare(right.name));
  const placed = new Set<string>();
  const groups: IncentiveReportGroup[] = bands.map((band) => {
    const employees = reports.filter((person) => {
      const match = person.daysWorked >= band.minDays && (band.maxDays == null || person.daysWorked <= band.maxDays);
      if (match) placed.add(person.id);
      return match;
    });
    return {
      key: `${band.minDays}-${band.rate}`,
      label: band.label,
      rate: band.rate,
      employees,
      hours: roundHours(employees.reduce((sum, person) => sum + person.hours, 0)),
      total: roundMoney(employees.reduce((sum, person) => sum + person.total, 0)),
    };
  });
  const missed = reports.filter((person) => !placed.has(person.id));
  if (missed.length > 0) {
    groups.push({
      key: "none",
      label: none,
      rate: 0,
      employees: missed,
      hours: roundHours(missed.reduce((sum, person) => sum + person.hours, 0)),
      total: 0,
    });
  }

  return {
    dates,
    dateCount: dates.length,
    bands,
    missedLabel: none,
    groups,
    employeeCount: reports.length,
    qualifiedCount: reports.filter((person) => person.rate > 0).length,
    total: roundMoney(reports.reduce((sum, person) => sum + person.total, 0)),
    openShifts: reports.filter((person) => person.openShift).length,
    calloutNotes,
    dayBasis: "date",
    peopleCombined: true,
  };
}

export function toastImportCsv(report: IncentiveReport): string {
  const lines = ["EE Number,EE Name,Job,Retro Pay,Week"];
  const rows = report.groups
    .filter((group) => group.rate > 0)
    .flatMap((group) => group.employees)
    .filter((person) => person.total > 0)
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
  for (const person of rows) {
    lines.push([
      csvCell(person.payrollNumber ?? ""),
      csvCell(person.name),
      csvCell(primaryJob(person)),
      person.total.toFixed(2),
      "1",
    ].join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}

function primaryJob(person: IncentiveEmployeeReport): string {
  const hours = new Map<string, number>();
  for (const day of person.days) {
    for (const punch of day.punches) {
      if (!punch.jobTitle) continue;
      hours.set(punch.jobTitle, (hours.get(punch.jobTitle) ?? 0) + punch.hours);
    }
  }
  const ranked = [...hours.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  return ranked[0]?.[0] || person.jobTitles[0] || "";
}

function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
