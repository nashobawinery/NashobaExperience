import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, test } from "node:test";
import express from "express";
import type { InsertSupportMessage, InsertSupportRequest, SupportAgent, SupportCategory } from "@shared/schema";
import { pool } from "./db";
import { createRetellRouter, type RetellWebhookDeps, type RetellWebhookStorage } from "./retell-webhook";
import type { SupportTicketRoute } from "./support-category-routing";

process.env.RETELL_WEBHOOK_API_KEY = "test-webhook-key";
process.env.RETELL_AGENT_ID_WINERY = "agent_winery";
process.env.RETELL_AGENT_ID_JS = "agent_js";

const WEBHOOK_KEY = "test-webhook-key";
const TRANSCRIPT = "TRANSCRIPT-SECRET-LINE caller wants a tasting on Saturday.";

after(async () => {
  await pool.end();
});

function sign(rawBody: string, timestamp = Date.now(), key = WEBHOOK_KEY): string {
  const digest = crypto.createHmac("sha256", key).update(rawBody + String(timestamp)).digest("hex");
  return `v=${timestamp},d=${digest}`;
}

function category(id: string, name: string, slug: string): SupportCategory {
  return {
    id,
    name,
    slug,
    description: null,
    icon: null,
    color: null,
    tags: [],
    isActive: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function agent(id: string, isDefault = false): SupportAgent {
  return {
    id,
    platformUserId: `user-${id}`,
    email: `${id}@example.com`,
    displayName: id,
    pinCode: "1234",
    pinCodeHash: null,
    isActive: true,
    receiveEmailNotifications: true,
    isDefaultAgent: isDefault,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

type Notification = {
  ticketId: string;
  subject: string;
  message: string;
  category: string | string[] | null;
  source: string;
};

function createHarness() {
  const requests: InsertSupportRequest[] = [];
  const messages: InsertSupportMessage[] = [];
  const notifications: Notification[] = [];
  const categories = new Map<string, SupportCategory>([
    ["reservations", category("cat-res", "Reservations", "reservations")],
    ["general-information", category("cat-gen", "General Information", "general-information")],
  ]);
  const leads = new Map<string, SupportAgent>([
    ["cat-res", agent("agent-res")],
    ["cat-gen", agent("agent-gen")],
  ]);

  const storage: RetellWebhookStorage = {
    async getSupportRequestByRetellCallId(callId) {
      const found = requests.find((request) => request.retellCallId === callId);
      return found ? { id: `req-${requests.indexOf(found) + 1}` } : undefined;
    },
    async createSupportRequest(data) {
      requests.push(data);
      return { id: `req-${requests.length}` };
    },
    async createSupportMessage(data) {
      messages.push(data);
      return { id: `msg-${messages.length}` };
    },
    async getSupportCategoryBySlug(slug) {
      return categories.get(slug);
    },
    async getLeadAgentForCategory(categoryId) {
      return leads.get(categoryId);
    },
    async getAgentsForCategory(categoryId) {
      const lead = leads.get(categoryId);
      return lead ? [lead] : [];
    },
    async getDefaultSupportAgent() {
      return agent("agent-default", true);
    },
  };

  const deps: RetellWebhookDeps = {
    storage,
    notifySupportAgents: async (ticketId, subject, message, _customerName, _customerEmail, categoryName, source) => {
      notifications.push({ ticketId, subject, message, category: categoryName, source });
    },
    routeTicket: async (subject): Promise<SupportTicketRoute> => {
      const reservation = /reservation/i.test(subject);
      return {
        categoryIds: reservation ? ["cat-res"] : [],
        categoryNames: reservation ? ["Reservations"] : [],
        categoryId: reservation ? "cat-res" : null,
        assignedAgentId: reservation ? "agent-res" : "agent-default",
        unsure: !reservation,
      };
    },
  };

  return { requests, messages, notifications, deps };
}

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function listen(deps: RetellWebhookDeps): Promise<{ server: Server; port: number }> {
  const app = express();
  app.use(express.json({
    verify: (req, _res, buf) => {
      (req as typeof req & { rawBody?: Buffer }).rawBody = buf;
    },
  }));
  app.use(createRetellRouter(deps));
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  return { server, port: address.port };
}

async function close(server: Server) {
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
}

async function post(port: number, rawBody: string, signature?: string) {
  const response = await fetch(`http://127.0.0.1:${port}/api/webhooks/retell`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(signature ? { "x-retell-signature": signature } : {}),
    },
    body: rawBody,
  });
  const json = await response.json() as { ok?: boolean; outcome?: string; requestId?: string; message?: string };
  return { status: response.status, json };
}

function analyzedPayload(custom: Record<string, unknown> = {}, call: Record<string, unknown> = {}) {
  return {
    event: "call_analyzed",
    call: {
      call_id: "call_test_1",
      agent_id: "agent_winery",
      agent_name: "Winery Agent",
      from_number: "+19785550199",
      to_number: "+19785550100",
      start_timestamp: 1710000000000,
      end_timestamp: 1710000060000,
      transcript: TRANSCRIPT,
      recording_url: "https://example.com/recording.wav",
      call_analysis: {
        call_summary: "Caller wants a tasting.",
        custom_analysis_data: {
          caller_name: "Ada Lovelace",
          callback_number: "+19785551212",
          category: "reservation",
          message_taken: true,
          summary: "Book a tasting for Saturday.",
          ...custom,
        },
      },
      ...call,
    },
  };
}

test("a signed call_analyzed event creates one ticket, and a repeat does not create another", async () => {
  const harness = createHarness();
  const { server, port } = await listen(harness.deps);
  try {
    const rawBody = JSON.stringify(analyzedPayload());
    const first = await post(port, rawBody, sign(rawBody));
    const second = await post(port, rawBody, sign(rawBody));

    assert.equal(first.status, 200);
    assert.equal(first.json.outcome, "created");
    assert.equal(second.status, 200);
    assert.equal(second.json.outcome, "duplicate");
    assert.equal(harness.requests.length, 1);
    assert.equal(harness.messages.length, 1);

    const ticket = harness.requests[0];
    assert.equal(ticket.source, "phone");
    assert.equal(ticket.priority, "high");
    assert.equal(ticket.categoryId, "cat-res");
    assert.equal(ticket.assignedAgentId, "agent-res");
    assert.equal(ticket.customerName, "Ada Lovelace");
    assert.equal(ticket.customerPhone, "+19785551212");
    assert.equal(ticket.retellCallId, "call_test_1");
    assert.equal(ticket.subject, "Phone call – Message – reservation – Ada Lovelace");
    assert.equal(ticket.initialMessage?.includes("Line: Winery"), true);
    assert.equal(ticket.initialMessage?.includes("https://example.com/recording.wav"), true);
    assert.equal(ticket.initialMessage?.includes(TRANSCRIPT), true);
    assert.equal(harness.messages[0].content.includes(TRANSCRIPT), true);

    await flush();
    assert.equal(harness.notifications.length, 1);
    assert.equal(harness.notifications[0].category, "Reservations");
    assert.equal(harness.notifications[0].source, "phone");
    assert.equal(harness.notifications[0].message.includes(TRANSCRIPT), false);
    assert.equal(harness.notifications[0].ticketId, first.json.requestId);
  } finally {
    await close(server);
  }
});

test("the webhook responds before the agent notification email is sent", { timeout: 5000 }, async () => {
  const harness = createHarness();
  let releaseNotify = () => {};
  const notifyGate = new Promise<void>((resolve) => {
    releaseNotify = resolve;
  });
  let notifyStarted = false;
  const sendNotification = harness.deps.notifySupportAgents;
  harness.deps.notifySupportAgents = async (...args) => {
    notifyStarted = true;
    await notifyGate;
    return sendNotification(...args);
  };

  const { server, port } = await listen(harness.deps);
  try {
    const rawBody = JSON.stringify(analyzedPayload({}, { call_id: "call_order_1" }));
    const response = await post(port, rawBody, sign(rawBody));
    await flush();

    assert.equal(response.status, 200);
    assert.equal(response.json.outcome, "created");
    assert.equal(notifyStarted, true);
    assert.equal(harness.notifications.length, 0);

    releaseNotify();
    await flush();
    assert.equal(harness.notifications.length, 1);
  } finally {
    releaseNotify();
    await close(server);
  }
});

test("a failed agent email still returns 200 and logs the call id", async () => {
  const harness = createHarness();
  harness.deps.notifySupportAgents = async () => {
    throw new Error("smtp down");
  };
  const logged: string[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    logged.push(args.map((part) => String(part)).join(" "));
  };

  const { server, port } = await listen(harness.deps);
  try {
    const rawBody = JSON.stringify(analyzedPayload({}, { call_id: "call_fail_1" }));
    const response = await post(port, rawBody, sign(rawBody));
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(response.status, 200);
    assert.equal(response.json.outcome, "created");
    assert.equal(harness.requests.length, 1);
    assert.equal(logged.some((line) => line.includes("call_id=call_fail_1") && line.includes("notify_failed")), true);
  } finally {
    console.error = originalError;
    await close(server);
  }
});

test("an invalid signature returns 401 and does not create a ticket", async () => {
  const harness = createHarness();
  const { server, port } = await listen(harness.deps);
  try {
    const rawBody = JSON.stringify(analyzedPayload());
    const response = await post(port, rawBody, sign(rawBody, Date.now(), "wrong-key"));

    assert.equal(response.status, 401);
    assert.equal(harness.requests.length, 0);
    assert.equal(harness.notifications.length, 0);
  } finally {
    await close(server);
  }
});

test("a signature older than 5 minutes returns 401", async () => {
  const harness = createHarness();
  const { server, port } = await listen(harness.deps);
  try {
    const rawBody = JSON.stringify(analyzedPayload());
    const stale = Date.now() - 6 * 60 * 1000;
    const response = await post(port, rawBody, sign(rawBody, stale));

    assert.equal(response.status, 401);
    assert.equal(harness.requests.length, 0);
  } finally {
    await close(server);
  }
});

test("info-only calls create a ticket and do not email agents", async () => {
  const harness = createHarness();
  const { server, port } = await listen(harness.deps);
  try {
    const rawBody = JSON.stringify(analyzedPayload(
      { category: "other", message_taken: false, caller_name: "Grace Hopper" },
      { call_id: "call_info_1", agent_id: "agent_js" },
    ));
    const response = await post(port, rawBody, sign(rawBody));

    assert.equal(response.status, 200);
    assert.equal(response.json.outcome, "created");
    assert.equal(harness.requests.length, 1);
    assert.equal(harness.requests[0].priority, "normal");
    assert.equal(harness.requests[0].categoryId, "cat-gen");
    assert.equal(harness.requests[0].subject, "Phone call – Info only – other – Grace Hopper");
    assert.equal(harness.requests[0].initialMessage?.includes("Line: J's Restaurant"), true);
    assert.equal(harness.notifications.length, 0);
  } finally {
    await close(server);
  }
});

test("call_started is ignored and a call with no call_id does not create a ticket", async () => {
  const harness = createHarness();
  const { server, port } = await listen(harness.deps);
  try {
    const started = JSON.stringify({ event: "call_started", call: { call_id: "call_live" } });
    const startedResponse = await post(port, started, sign(started));
    assert.equal(startedResponse.status, 200);
    assert.equal(startedResponse.json.outcome, "ignored");

    const missing = JSON.stringify({ event: "call_analyzed", call: { transcript: "hello" } });
    const missingResponse = await post(port, missing, sign(missing));
    assert.equal(missingResponse.status, 200);
    assert.equal(missingResponse.json.outcome, "ignored");
    assert.equal(harness.requests.length, 0);
  } finally {
    await close(server);
  }
});

test("an accounting call still creates a ticket when that category slug is missing", async () => {
  const harness = createHarness();
  const { server, port } = await listen(harness.deps);
  try {
    const rawBody = JSON.stringify(analyzedPayload(
      { category: "accounting", message_taken: true, caller_name: "Bill Payer" },
      { call_id: "call_acct_1" },
    ));
    const response = await post(port, rawBody, sign(rawBody));
    await flush();

    assert.equal(response.status, 200);
    assert.equal(response.json.outcome, "created");
    assert.equal(harness.requests.length, 1);
    assert.equal(harness.requests[0].categoryId, null);
    assert.equal(harness.requests[0].assignedAgentId, "agent-default");
    assert.equal(harness.notifications.length, 1);
    assert.equal(harness.notifications[0].category, null);
  } finally {
    await close(server);
  }
});

test("a message-taken call emails every category the router returns", async () => {
  const harness = createHarness();
  harness.deps.routeTicket = async () => ({
    categoryIds: ["cat-res", "cat-acct"],
    categoryNames: ["Reservations", "Accounting"],
    categoryId: "cat-res",
    assignedAgentId: "agent-res",
    unsure: false,
  });
  const { server, port } = await listen(harness.deps);
  try {
    const rawBody = JSON.stringify(analyzedPayload({}, { call_id: "call_multi_1" }));
    const response = await post(port, rawBody, sign(rawBody));
    await flush();

    assert.equal(response.status, 200);
    assert.deepEqual(harness.notifications[0].category, ["Reservations", "Accounting"]);
    assert.equal(harness.notifications[0].message.includes(TRANSCRIPT), false);
  } finally {
    await close(server);
  }
});
