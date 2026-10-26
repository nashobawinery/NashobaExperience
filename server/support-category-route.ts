export type CategoryRouteCandidate = {
  id: string;
  name: string;
  notifyEmail?: string | null;
  isActive?: boolean;
};

export type InterpretedCategoryRoute = {
  categoryIds: string[];
  categoryNames: string[];
  unsure: boolean;
};

const EVENT_LANGUAGE = /\b(weddings?|bridal|rehearsal dinner|receptions?|get(?:ting)? married|banquets?|functions?|private events?|corporate events?|host(?:ing)? an event|book(?:ing)? an event|plan(?:ning)? an event|event inquir\w*)\b/i;
const RESERVATION_LANGUAGE = /\b(reservations?|book(?:ing)?(?: a)? table|tables? for|part(?:y|ies) of|groups? of|seating|(?:\d{1,3}|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty)\s*(?:people|guests|persons|pax))\b/i;

/** A private event, wedding, banquet, or function. A reservation of any size does not qualify. */
export function isEventBooking(text: string): boolean {
  return EVENT_LANGUAGE.test(text);
}

/** A table, party, or seating request. A private event or function is handled separately. */
export function isReservationInquiry(text: string): boolean {
  if (isEventBooking(text)) return false;
  return RESERVATION_LANGUAGE.test(text);
}

export function eventCategory<T extends { id: string; name: string; slug?: string; isActive?: boolean }>(categories: T[]): T | undefined {
  const active = categories.filter((category) => category.isActive !== false);
  return active.find((category) => category.slug === "events-entertainment")
    ?? active.find((category) => category.slug === "events-and-function")
    ?? active.find((category) => /event/i.test(category.slug || category.name));
}

export function reservationCategory<T extends { id: string; name: string; slug?: string; isActive?: boolean }>(categories: T[]): T | undefined {
  const active = categories.filter((category) => category.isActive !== false);
  return active.find((category) => category.slug === "reservations")
    ?? active.find((category) => /reservation/i.test(category.slug || category.name));
}

function activeCategories(categories: CategoryRouteCandidate[]): CategoryRouteCandidate[] {
  return categories.filter((category) => category.isActive !== false);
}

/**
 * A single confident match uses that category.
 * Two or more plausible matches use every one of them.
 * No match, one match without confidence, or an unreadable answer is unsure.
 */
export function interpretCategoryRoute(
  raw: string | null | undefined,
  categories: CategoryRouteCandidate[],
): InterpretedCategoryRoute {
  const byId = new Map(activeCategories(categories).map((category) => [category.id, category]));
  const parsed = parseRouteJson(raw);
  if (!parsed) {
    return { categoryIds: [], categoryNames: [], unsure: true };
  }

  const matched: CategoryRouteCandidate[] = [];
  const seen = new Set<string>();
  for (const id of parsed.categoryIds) {
    if (seen.has(id)) continue;
    const category = byId.get(id);
    if (!category) continue;
    seen.add(id);
    matched.push(category);
  }

  const confidentSingle = parsed.confident === true && matched.length === 1;
  if (confidentSingle || matched.length >= 2) {
    return {
      categoryIds: matched.map((category) => category.id),
      categoryNames: matched.map((category) => category.name),
      unsure: false,
    };
  }

  return { categoryIds: [], categoryNames: [], unsure: true };
}

/** Splits a mailbox field on commas or semicolons. Blank pieces are ignored. */
export function splitMailboxList(value: string | null | undefined): string[] {
  if (!value) return [];
  const emails: string[] = [];
  const seen = new Set<string>();
  for (const part of value.split(/[,;]/)) {
    const email = part.trim();
    if (!email.includes("@")) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    emails.push(email);
  }
  return emails;
}

export function mailboxesForCategories(
  categories: Array<{ notifyEmail?: string | null }>,
  defaultEmail: string | null | undefined,
): string[] {
  const emails: string[] = [];
  const seen = new Set<string>();
  let missing = false;

  const addAll = (value: string | null | undefined) => {
    const parts = splitMailboxList(value);
    for (const email of parts) {
      const key = email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      emails.push(email);
    }
    return parts.length;
  };

  for (const category of categories) {
    if (addAll(category.notifyEmail) === 0) missing = true;
  }

  const needsFallback = categories.length === 0 || missing || emails.length === 0;
  if (needsFallback) addAll(defaultEmail);
  return emails;
}

function parseRouteJson(raw: string | null | undefined): { confident: boolean; categoryIds: string[] } | null {
  if (!raw?.trim()) return null;
  const jsonText = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const record = parsed as { confident?: unknown; categoryIds?: unknown };
  if (!Array.isArray(record.categoryIds)) return null;
  const categoryIds = record.categoryIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
  return { confident: record.confident === true, categoryIds };
}
