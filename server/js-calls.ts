import crypto from "crypto";
import { Router, type Request, type Response, type NextFunction } from "express";
import { and, desc, eq, ne, sql } from "drizzle-orm";
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

export const RESTAURANT_CALL_RECIPIENTS = [
  { id: "justin", name: "Justin", email: "jp@nashobawinery.com" },
  { id: "anne", name: "Anne", email: "aparrow@nashobawinery.com" },
  { id: "richard", name: "Richard", email: "rap@nashobawinery.com" },
  { id: "cindy", name: "Cindy", email: "crp@nashobawinery.com" },
] as const;

export type RestaurantCallRecipient = (typeof RESTAURANT_CALL_RECIPIENTS)[number];

export function restaurantCallRecipient(id: string): RestaurantCallRecipient | undefined {
  return RESTAURANT_CALL_RECIPIENTS.find((person) => person.id === id);
}

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
      ne(supportRequests.status, "closed"),
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

export class RestaurantCallActionError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function openRestaurantCall(id: string) {
  const request = await storage.getSupportRequest(id);
  if (!request || request.source !== "phone" || request.status === "closed" || !request.initialMessage.includes(LINE)) {
    return undefined;
  }
  return request;
}

function noteForAction(action: "spam" | "complete" | "forward", detail: string, initials = ""): string {
  if (action === "spam") return "Marked Spam/NA and closed from the restaurant call page.";
  if (action === "complete") return `Completed by ${initials.toUpperCase()} from the restaurant call page.\n\n${detail}`;
  return detail;
}

export async function applyRestaurantCallAction(
  id: string,
  action: "spam" | "complete" | "forward",
  detail = "",
  initials = "",
): Promise<void> {
  const request = await openRestaurantCall(id);
  if (!request) {
    throw new RestaurantCallActionError(404, "That call is no longer on this page.");
  }

  let content = noteForAction(action, detail, initials);
  if (action === "forward") {
    const recipient = restaurantCallRecipient(detail);
    if (!recipient) throw new RestaurantCallActionError(400, "Choose Justin, Anne, Richard, or Cindy.");
    const call = parseRestaurantCall({
      id: request.id,
      customerName: request.customerName,
      customerPhone: request.customerPhone,
      initialMessage: request.initialMessage,
      createdAt: request.createdAt,
    });
    const { sendEmail } = await import("./email");
    const summary = call?.summary || request.subject || "Restaurant call";
    const transcript = (call?.transcript || "").slice(0, 8000);
    const text = [
      `A J's restaurant call was forwarded to ${recipient.name}.`,
      `Caller: ${call?.callerName || request.customerName || "Unknown caller"}`,
      `Phone: ${call?.phone || request.customerPhone || "Not provided"}`,
      call?.callTime ? `Call time: ${call.callTime}` : undefined,
      "",
      summary,
      "",
      transcript,
      "",
      "Open Customer Support: https://nashobawinery.org/support",
    ].filter((line): line is string => line !== undefined).join("\n");
    const html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");
    try {
      await sendEmail(recipient.email, `J's call forwarded: ${call?.callerName || "Unknown caller"}`, `<p>${html}</p>`, text);
    } catch {
      throw new RestaurantCallActionError(502, "The email could not be sent. The call is still open.");
    }
    content = `Forwarded to ${recipient.name} (${recipient.email}) and closed from the restaurant call page.`;
  }

  await storage.createSupportMessage({
    requestId: id,
    senderType: "agent",
    senderName: "J's host",
    content,
    isInternal: true,
    metadata: { action, source: "js-calls" },
  });
  await storage.closeSupportRequest(id, "js-calls", action === "complete" && initials ? initials.toUpperCase() : "J's host");
}

export function createJsCallsRouter(
  listCalls: () => Promise<RestaurantCall[]> = listRestaurantCalls,
  readCode: () => Promise<string> = currentAccessCode,
  applyAction: typeof applyRestaurantCallAction = applyRestaurantCallAction,
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
      res.json({ calls, recipients: RESTAURANT_CALL_RECIPIENTS });
    } catch {
      console.error("[JsCalls] Failed to list restaurant calls");
      res.status(500).json({ message: "Restaurant calls could not be loaded." });
    }
  });

  async function runAction(req: Request, res: Response, action: "spam" | "complete" | "forward", detail = "", initials = "") {
    try {
      await applyAction(req.params.id, action, detail, initials);
      res.json({ ok: true });
    } catch (error) {
      if (error instanceof RestaurantCallActionError) {
        res.status(error.status).json({ message: error.message });
        return;
      }
      console.error(`[JsCalls] Failed to ${action} call ${req.params.id}`);
      res.status(500).json({ message: "The call could not be updated." });
    }
  }

  router.post("/api/js-calls/:id/spam", requireCallAccess, (req, res) => {
    void runAction(req, res, "spam");
  });

  router.post("/api/js-calls/:id/complete", requireCallAccess, (req, res) => {
    const notes = typeof req.body?.notes === "string" ? req.body.notes.trim() : "";
    const initials = typeof req.body?.initials === "string" ? req.body.initials.trim().toUpperCase() : "";
    if (!/^[A-Z]{2,4}$/.test(initials)) {
      res.status(400).json({ message: "Enter your initials." });
      return;
    }
    if (!notes) {
      res.status(400).json({ message: "Add a note before completing the call." });
      return;
    }
    void runAction(req, res, "complete", notes, initials);
  });

  router.post("/api/js-calls/:id/forward", requireCallAccess, (req, res) => {
    const recipientId = typeof req.body?.recipientId === "string" ? req.body.recipientId : "";
    if (!restaurantCallRecipient(recipientId)) {
      res.status(400).json({ message: "Choose Justin, Anne, Richard, or Cindy." });
      return;
    }
    void runAction(req, res, "forward", recipientId);
  });

  return router;
}

export default createJsCallsRouter();
