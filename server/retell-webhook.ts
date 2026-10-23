import crypto from "crypto";
import { Router, type Request, type Response } from "express";
import type {
  InsertSupportMessage,
  InsertSupportRequest,
  SupportAgent,
  SupportCategory,
} from "@shared/schema";
import { pool } from "./db";
import { notifySupportAgents } from "./email";
import { storage } from "./storage";

const SIGNATURE_HEADER = "x-retell-signature";
const MAX_SIGNATURE_AGE_MS = 5 * 60 * 1000;

/**
 * Retell custom_analysis_data.category → support_categories.slug.
 * Confirmed live slugs: reservations, general-information.
 * There is no accounting category row yet. That slug is kept so those calls
 * route to it as soon as the category exists; until then they use the default agent.
 */
const CATEGORY_SLUG_BY_RETELL: Record<string, string> = {
  reservation: "reservations",
  accounting: "accounting",
  other: "general-information",
};

export type RetellWebhookStorage = {
  getSupportRequestByRetellCallId(callId: string): Promise<{ id: string } | undefined>;
  createSupportRequest(data: InsertSupportRequest): Promise<{ id: string }>;
  createSupportMessage(data: InsertSupportMessage): Promise<{ id: string }>;
  getSupportCategoryBySlug(slug: string): Promise<SupportCategory | undefined>;
  getLeadAgentForCategory(categoryId: string): Promise<SupportAgent | undefined>;
  getAgentsForCategory(categoryId: string): Promise<SupportAgent[]>;
  getDefaultSupportAgent(): Promise<SupportAgent | undefined>;
};

export type RetellWebhookDeps = {
  storage: RetellWebhookStorage;
  notifySupportAgents: typeof notifySupportAgents;
};

const productionDeps: RetellWebhookDeps = {
  storage,
  notifySupportAgents,
};

export function verifyRetellSignature(
  rawBody: string,
  apiKey: string,
  signature: string | undefined,
  now = Date.now(),
): { ok: true } | { ok: false; reason: "invalid_signature" | "stale_timestamp" } {
  if (!apiKey || !signature) return { ok: false, reason: "invalid_signature" };

  const match = /^v=(\d+),d=([0-9a-fA-F]+)$/.exec(signature.trim());
  if (!match) return { ok: false, reason: "invalid_signature" };

  const timestampText = match[1];
  const timestamp = Number(timestampText);
  if (!Number.isFinite(timestamp)) return { ok: false, reason: "invalid_signature" };
  if (Math.abs(now - timestamp) > MAX_SIGNATURE_AGE_MS) {
    return { ok: false, reason: "stale_timestamp" };
  }

  const expected = crypto
    .createHmac("sha256", apiKey)
    .update(rawBody + timestampText)
    .digest("hex");
  const actual = match[2].toLowerCase();
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(actual, "utf8");
  if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
    return { ok: false, reason: "invalid_signature" };
  }
  return { ok: true };
}

function logRetell(callId: string | undefined, outcome: string, detail?: string) {
  const extra = detail ? ` ${detail}` : "";
  console.log(`[Retell] call_id=${callId ?? "-"} outcome=${outcome}${extra}`);
}

function rawBodyText(req: Request): string | undefined {
  const raw = (req as Request & { rawBody?: unknown }).rawBody;
  if (Buffer.isBuffer(raw)) return raw.toString("utf8");
  if (typeof raw === "string") return raw;
  return undefined;
}

function signatureHeader(req: Request): string | undefined {
  const value = req.headers[SIGNATURE_HEADER];
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function lineForAgent(agentId: string | undefined): string {
  if (agentId && process.env.RETELL_AGENT_ID_WINERY && agentId === process.env.RETELL_AGENT_ID_WINERY) {
    return "Winery";
  }
  if (agentId && process.env.RETELL_AGENT_ID_JS && agentId === process.env.RETELL_AGENT_ID_JS) {
    return "J's Restaurant";
  }
  return "Unknown";
}

function formatEastern(ms: number): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ms));
}

function callTimeText(start: unknown, end: unknown): string | undefined {
  if (typeof start !== "number" || !Number.isFinite(start)) return undefined;
  const startText = formatEastern(start);
  if (typeof end !== "number" || !Number.isFinite(end)) return startText;
  return `${startText} – ${formatEastern(end)}`;
}

function isUniqueViolation(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    if ((current as { code?: unknown }).code === "23505") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

async function resolveAssignedAgent(
  store: RetellWebhookStorage,
  categoryId: string | null,
): Promise<string | null> {
  if (categoryId) {
    const lead = await store.getLeadAgentForCategory(categoryId);
    if (lead?.isActive) return lead.id;
    const agents = await store.getAgentsForCategory(categoryId);
    const active = agents.find((agent) => agent.isActive);
    if (active) return active.id;
  }
  const fallback = await store.getDefaultSupportAgent();
  return fallback?.isActive ? fallback.id : null;
}

function slugForRetellCategory(category: string | undefined): string {
  if (category && CATEGORY_SLUG_BY_RETELL[category]) return CATEGORY_SLUG_BY_RETELL[category];
  return CATEGORY_SLUG_BY_RETELL.other;
}

export async function handleRetellWebhook(
  req: Request,
  res: Response,
  deps: RetellWebhookDeps = productionDeps,
): Promise<void> {
  const apiKey = process.env.RETELL_WEBHOOK_API_KEY?.trim() ?? "";
  const rawBody = rawBodyText(req);
  if (rawBody === undefined || !apiKey) {
    logRetell(undefined, "invalid_signature");
    res.status(401).json({ message: "Invalid signature" });
    return;
  }
  const verification = verifyRetellSignature(rawBody, apiKey, signatureHeader(req));
  if (!verification.ok) {
    logRetell(undefined, verification.reason);
    res.status(401).json({ message: "Invalid signature" });
    return;
  }

  const body = asRecord(req.body);
  const event = asNonEmptyString(body?.event);
  if (event !== "call_analyzed") {
    logRetell(undefined, "ignored");
    res.status(200).json({ ok: true, outcome: "ignored" });
    return;
  }

  const call = asRecord(body?.call) ?? {};
  const callId = asNonEmptyString(call.call_id);
  if (!callId) {
    logRetell(undefined, "missing_call_id");
    res.status(200).json({ ok: true, outcome: "ignored" });
    return;
  }

  try {
    const existing = await deps.storage.getSupportRequestByRetellCallId(callId);
    if (existing) {
      logRetell(callId, "duplicate");
      res.status(200).json({ ok: true, outcome: "duplicate" });
      return;
    }

    const analysis = asRecord(call.call_analysis) ?? {};
    const custom = asRecord(analysis.custom_analysis_data) ?? {};
    const retellCategory = asNonEmptyString(custom.category)?.toLowerCase();
    const categoryLabel = retellCategory === "reservation" || retellCategory === "accounting" || retellCategory === "other"
      ? retellCategory
      : "other";
    const messageTaken = custom.message_taken === true;
    const callerName = asNonEmptyString(custom.caller_name);
    const fromNumber = asNonEmptyString(call.from_number);
    const callbackNumber = asNonEmptyString(custom.callback_number) ?? fromNumber;
    const callerLabel = callerName ?? fromNumber ?? "Unknown caller";
    const agentId = asNonEmptyString(call.agent_id);
    const line = lineForAgent(agentId);
    const summary = asNonEmptyString(custom.summary) ?? asNonEmptyString(analysis.call_summary);
    const transcript = asNonEmptyString(call.transcript);
    const recordingUrl = asNonEmptyString(call.recording_url);
    const when = callTimeText(call.start_timestamp, call.end_timestamp);
    const agentName = asNonEmptyString(call.agent_name);

    const categorySlug = slugForRetellCategory(categoryLabel);
    const categoryRow = await deps.storage.getSupportCategoryBySlug(categorySlug);
    const category = categoryRow?.isActive ? categoryRow : undefined;
    const assignedAgentId = await resolveAssignedAgent(deps.storage, category?.id ?? null);

    const subject = `Phone call – ${messageTaken ? "Message" : "Info only"} – ${categoryLabel} – ${callerLabel}`;
    const ticketBody = [
      `Line: ${line}`,
      agentName ? `Agent: ${agentName}` : undefined,
      when ? `Call time (${"America/New_York"}): ${when}` : undefined,
      callerName ? `Caller: ${callerName}` : undefined,
      `Callback number: ${callbackNumber ?? "Not provided"}`,
      fromNumber ? `Caller ID: ${fromNumber}` : undefined,
      asNonEmptyString(call.to_number) ? `Called number: ${asNonEmptyString(call.to_number)}` : undefined,
      `Category: ${categoryLabel}`,
      summary ? `Summary: ${summary}` : undefined,
      recordingUrl ? `Recording: ${recordingUrl}` : undefined,
      `Call ID: ${callId}`,
      "",
      "Transcript:",
      transcript ?? "No transcript provided.",
    ].filter((lineText): lineText is string => lineText !== undefined).join("\n");

    const created = await deps.storage.createSupportRequest({
      customerName: callerName ?? null,
      customerPhone: callbackNumber ?? null,
      subject,
      initialMessage: ticketBody,
      status: "new",
      priority: messageTaken ? "high" : "normal",
      source: "phone",
      tags: ["phone", messageTaken ? "message-taken" : "info-only"],
      retellCallId: callId,
      categoryId: category?.id ?? null,
      assignedAgentId,
    });

    try {
      await deps.storage.createSupportMessage({
        requestId: created.id,
        senderType: "customer",
        senderName: callerName ?? fromNumber ?? "Phone caller",
        content: ticketBody,
        isInternal: false,
      });
    } catch {
      // The transcript is already on initialMessage. A retry would see a duplicate and skip.
      console.error(`[Retell] call_id=${callId} outcome=message_failed`);
    }

    logRetell(
      callId,
      "created",
      `category_slug=${categorySlug} matched=${category ? "yes" : "no"} message_taken=${messageTaken ? "yes" : "no"}`,
    );

    res.status(200).json({ ok: true, outcome: "created", requestId: created.id });

    if (messageTaken) {
      const notificationMessage = [
        summary,
        `Callback: ${callbackNumber ?? "Not provided"}`,
        `Line: ${line}`,
        recordingUrl ? `Recording: ${recordingUrl}` : undefined,
      ].filter((lineText): lineText is string => Boolean(lineText)).join("\n");
      void (async () => {
        try {
          await deps.notifySupportAgents(
            created.id,
            subject,
            notificationMessage || "Phone message taken.",
            callerName ?? null,
            null,
            category?.name ?? null,
            "phone",
            null,
          );
        } catch (notifyError) {
          const code = notifyError && typeof notifyError === "object" && "code" in notifyError
            ? String((notifyError as { code?: unknown }).code ?? "")
            : "";
          console.error(`[Retell] call_id=${callId} outcome=notify_failed${code ? ` code=${code}` : ""}`);
        }
      })();
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      logRetell(callId, "duplicate");
      res.status(200).json({ ok: true, outcome: "duplicate" });
      return;
    }
    const code = error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
    console.error(`[Retell] call_id=${callId} outcome=error${code ? ` code=${code}` : ""}`);
    res.status(500).json({ message: "Failed to create support request" });
  }
}

export function createRetellRouter(deps?: RetellWebhookDeps) {
  const router = Router();
  router.post("/api/webhooks/retell", (req, res, next) => {
    handleRetellWebhook(req, res, deps).catch(next);
  });
  return router;
}

/** Adds phone-ticket columns if this database has not been migrated yet. Matches 013_support_phone_calls.sql. */
export async function ensureSupportPhoneColumns(): Promise<void> {
  await pool.query(`ALTER TABLE support_requests ADD COLUMN IF NOT EXISTS retell_call_id varchar`);
  await pool.query(`ALTER TABLE support_requests ADD COLUMN IF NOT EXISTS category_id varchar`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_support_req_retell_call ON support_requests (retell_call_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_support_req_category ON support_requests (category_id)`);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'support_requests_category_id_support_categories_id_fk'
      ) THEN
        ALTER TABLE support_requests
          ADD CONSTRAINT support_requests_category_id_support_categories_id_fk
          FOREIGN KEY (category_id)
          REFERENCES support_categories (id)
          ON DELETE SET NULL;
      END IF;
    END $$;
  `);
}

const retellRouter = createRetellRouter();
export default retellRouter;
