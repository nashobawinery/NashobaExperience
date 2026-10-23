import crypto from "crypto";
import { Router, type Request, type Response, type NextFunction } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { supportRequests } from "@shared/schema";
import { db } from "./db";
import { storage } from "./storage";

export const JS_CALLS_CODE_SETTING = "js_calls_access_code";

const LINE = "Line: J's Restaurant";
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const LOCK_MS = 15 * 60 * 1000;

const attempts = new Map<string, { count: number; lockedUntil: number }>();

export type RestaurantCall = {
  id: string;
  callerName: string;
  phone: string | null;
  callTime: string | null;
  summary: string | null;
  transcript: string;
  recordedAt: string;
  late: boolean;
  reservation: boolean;
  recordingUrl: string | null;
};

const LATE_PATTERN = /\b(running late|be late|i'm late|im late|we're late|were late|delayed|on (?:my|our) way|can't make it|cannot make it|stuck in traffic)\b/i;
const RESERVATION_PATTERN = /\b(reserv\w*|book(?:ing)? a table|table for|party of|seating)\b/i;

function fallbackAccessCode(): string {
  const configured = process.env.JS_CALLS_ACCESS_CODE?.trim() ?? "";
  return /^\d{4}$/.test(configured) ? configured : "9816";
}

/** The code saved in Support wins. Otherwise the environment value, then 9816. */
export async function currentAccessCode(): Promise<string> {
  try {
    const setting = await storage.getSupportSetting(JS_CALLS_CODE_SETTING);
    const saved = setting?.settingValue?.trim() ?? "";
    if (/^\d{4}$/.test(saved)) return saved;
  } catch {
    console.error("[JsCalls] Could not read the access code setting");
  }
  return fallbackAccessCode();
}

export function codesMatch(input: string, expectedCode: string): boolean {
  const expected = Buffer.from(expectedCode);
  const given = Buffer.from(input.trim());
  if (given.length !== expected.length) {
    crypto.timingSafeEqual(expected, expected);
    return false;
  }
  return crypto.timingSafeEqual(given, expected);
}

function tokenSecret(): string {
  return process.env.SESSION_SECRET || "js-calls-session";
}

export function signCallToken(code: string, now = Date.now()): string {
  const expires = String(now + TOKEN_TTL_MS);
  const signature = crypto.createHmac("sha256", tokenSecret()).update(`${code}.${expires}`).digest("hex");
  return `${expires}.${signature}`;
}

export function tokenIsValid(token: string | undefined, code: string, now = Date.now()): boolean {
  if (!token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || !/^\d+$/.test(expires)) return false;
  const expected = crypto.createHmac("sha256", tokenSecret()).update(`${code}.${expires}`).digest("hex");
  const actualBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(actualBuf, expectedBuf)) return false;
  return Number(expires) > now;
}

function field(body: string, label: string): string | null {
  const match = body.match(new RegExp(`^${label}:\\s*(.+)$`, "m"));
  const value = match?.[1]?.trim();
  if (!value || value === "Not provided") return null;
  return value;
}

export function parseRestaurantCall(row: {
  id: string;
  customerName: string | null;
  customerPhone: string | null;
  initialMessage: string;
  createdAt: Date | string;
}): RestaurantCall | null {
  if (!row.initialMessage.includes(LINE)) return null;
  const [head, transcriptBody] = row.initialMessage.split(/\nTranscript:\n/);
  const transcript = transcriptBody?.trim() || "No transcript provided.";
  const summary = field(head, "Summary");
  const text = `${summary ?? ""}\n${transcript}`;
  const recordedAt = row.createdAt instanceof Date ? row.createdAt.toISOString() : new Date(row.createdAt).toISOString();
  return {
    id: row.id,
    callerName: field(head, "Caller") ?? row.customerName ?? "Unknown caller",
    phone: field(head, "Callback number") ?? row.customerPhone,
    callTime: field(head, "Call time \\(America/New_York\\)"),
    summary,
    transcript,
    recordedAt,
    late: LATE_PATTERN.test(text),
    reservation: RESERVATION_PATTERN.test(text),
    recordingUrl: field(head, "Recording"),
  };
}

export async function listRestaurantCalls(): Promise<RestaurantCall[]> {
  const rows = await db.select({
    id: supportRequests.id,
    customerName: supportRequests.customerName,
    customerPhone: supportRequests.customerPhone,
    initialMessage: supportRequests.initialMessage,
    createdAt: supportRequests.createdAt,
  }).from(supportRequests)
    .where(and(
      eq(supportRequests.source, "phone"),
      sql`${supportRequests.initialMessage} like ${"%" + LINE + "%"}`,
    ))
    .orderBy(desc(supportRequests.createdAt))
    .limit(80);

  return rows.flatMap((row) => {
    const call = parseRestaurantCall(row);
    return call ? [call] : [];
  });
}

function clientKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.ip;
  return ip || "unknown";
}

function locked(key: string, now: number): boolean {
  const record = attempts.get(key);
  return !!record && record.lockedUntil > now;
}

function noteFailure(key: string, now: number) {
  const record = attempts.get(key) ?? { count: 0, lockedUntil: 0 };
  const count = record.lockedUntil > now ? record.count : record.count + 1;
  attempts.set(key, {
    count,
    lockedUntil: count >= MAX_ATTEMPTS ? now + LOCK_MS : 0,
  });
}

export function clearCallAccessAttempts() {
  attempts.clear();
}

function readToken(req: Request): string | undefined {
  const header = req.get("x-js-calls-access");
  return header?.trim() || undefined;
}

export function createJsCallsRouter(
  listCalls: () => Promise<RestaurantCall[]> = listRestaurantCalls,
  readCode: () => Promise<string> = currentAccessCode,
) {
  const router = Router();

  async function requireCallAccess(req: Request, res: Response, next: NextFunction) {
    const code = await readCode();
    if (!tokenIsValid(readToken(req), code)) {
      res.status(401).json({ message: "Enter the access code to view restaurant calls." });
      return;
    }
    next();
  }

  router.post("/api/js-calls/unlock", async (req, res) => {
    const now = Date.now();
    const key = clientKey(req);
    if (locked(key, now)) {
      res.status(429).json({ message: "Too many tries. Wait a few minutes and enter the code again." });
      return;
    }
    const code = typeof req.body?.code === "string" ? req.body.code : "";
    const expected = await readCode();
    if (!codesMatch(code, expected)) {
      noteFailure(key, now);
      res.status(401).json({ message: "That code is not recognized." });
      return;
    }
    attempts.delete(key);
    res.json({ token: signCallToken(expected, now) });
  });

  router.get("/api/js-calls", requireCallAccess, async (_req, res) => {
    try {
      const calls = await listCalls();
      res.json({ calls });
    } catch {
      console.error("[JsCalls] Failed to list restaurant calls");
      res.status(500).json({ message: "Restaurant calls could not be loaded." });
    }
  });

  return router;
}

export default createJsCallsRouter();
