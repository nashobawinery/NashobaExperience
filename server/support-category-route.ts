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

const PARTY_WORDS: Record<string, number> = {
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

const EVENT_LANGUAGE = /\b(weddings?|bridal|rehearsal dinner|receptions?|get(?:ting)? married|banquets?|private events?|corporate events?|host(?:ing)? an event|book(?:ing)? an event|plan(?:ning)? an event|event inquir\w*)\b/i;

function partyCount(raw: string): number | null {
  const digits = raw.match(/\d{1,3}/);
  if (digits) {
    const count = Number(digits[0]);
    return count >= 1 && count <= 500 ? count : null;
  }
  const word = raw.toLowerCase().replace(/-/g, " ").trim();
  return PARTY_WORDS[word] ?? null;
}

function partyMentions(text: string): Array<{ size: number; index: number }> {
  const mentions: Array<{ size: number; index: number }> = [];
  const pattern = /(?:party|group|table|reservation|booking)\s+(?:of|for)\s+([a-z0-9-]+)|([a-z0-9-]+)\s*(?:people|guests|persons|pax)\b/gi;
  for (const match of text.matchAll(pattern)) {
    const raw = match[1] || match[2] || "";
    const size = partyCount(raw);
    if (size != null) mentions.push({ size, index: match.index ?? 0 });
  }
  return mentions;
}

function venueNear(text: string, index: number): "knoll" | "js" | null {
  const window = text.slice(Math.max(0, index - 80), index + 80);
  const knoll = /\bknoll\b/i.test(window);
  const js = /\bj'?s\b/i.test(window);
  if (knoll && !js) return "knoll";
  if (js && !knoll) return "js";
  return null;
}

/**
 * Weddings and hosted events always qualify.
 * A Knoll reservation of more than 18 people qualifies.
 * A J's reservation of more than 8 people qualifies.
 * The phone line is used when the caller does not name the venue.
 */
export function isEventBooking(text: string): boolean {
  if (EVENT_LANGUAGE.test(text)) return true;
  const spoken = text.replace(/^line:\s*.+$/gim, " ");
  const mentions = partyMentions(spoken);
  if (mentions.length === 0) return false;
  const saysKnoll = /\bknoll\b/i.test(spoken);
  const saysJs = /\bj'?s\b/i.test(spoken);
  const lineJs = /line:\s*j'?s restaurant/i.test(text);
  const lineWinery = /line:\s*winery/i.test(text);
  const fallback = saysKnoll && !saysJs
    ? "knoll"
    : saysJs && !saysKnoll
      ? "js"
      : lineJs && !lineWinery
        ? "js"
        : lineWinery && !lineJs
          ? "knoll"
          : null;

  return mentions.some((mention) => {
    const venue = venueNear(spoken, mention.index) ?? fallback;
    if (venue === "knoll") return mention.size > 18;
    if (venue === "js") return mention.size > 8;
    return mention.size > 18;
  });
}

export function eventCategory<T extends { id: string; name: string; slug?: string; isActive?: boolean }>(categories: T[]): T | undefined {
  const active = categories.filter((category) => category.isActive !== false);
  return active.find((category) => category.slug === "events-entertainment")
    ?? active.find((category) => category.slug === "events-and-function")
    ?? active.find((category) => /event/i.test(category.slug || category.name));
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
