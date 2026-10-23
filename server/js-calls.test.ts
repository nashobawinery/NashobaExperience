import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, test } from "node:test";
import express from "express";
import { pool } from "./db";
import {
  clearCallAccessAttempts,
  createJsCallsRouter,
  parseRestaurantCall,
  type RestaurantCall,
} from "./js-calls";

after(async () => {
  await pool.end();
});

const SAMPLE = [
  "Line: J's Restaurant",
  "Caller: Ada Lovelace",
  "Callback number: +19785551212",
  "Call time (America/New_York): Oct 23, 2026, 6:40 PM",
  "Summary: Ada is running late and still wants a table for 4.",
  "Recording: https://example.com/recording.wav",
  "",
  "Transcript:",
  "Caller: We are running late but please hold the reservation.",
].join("\n");

test("a J's call keeps the transcript and marks a late reservation", () => {
  const call = parseRestaurantCall({
    id: "call-1",
    customerName: null,
    customerPhone: null,
    initialMessage: SAMPLE,
    createdAt: new Date("2026-10-23T22:40:00.000Z"),
  });
  assert.ok(call);
  assert.equal(call?.callerName, "Ada Lovelace");
  assert.equal(call?.callTime, "Oct 23, 2026, 6:40 PM");
  assert.equal(call?.phone, "+19785551212");
  assert.equal(call?.summary, "Ada is running late and still wants a table for 4.");
  assert.equal(call?.transcript, "Caller: We are running late but please hold the reservation.");
  assert.equal(call?.late, true);
  assert.equal(call?.reservation, true);
  assert.equal(call?.recordingUrl, "https://example.com/recording.wav");
});

test("a winery line call is left out", () => {
  const call = parseRestaurantCall({
    id: "call-2",
    customerName: "Grace",
    customerPhone: null,
    initialMessage: "Line: Winery\n\nTranscript:\nHello",
    createdAt: new Date(),
  });
  assert.equal(call, null);
});

async function listen(calls: RestaurantCall[]): Promise<{ server: Server; port: number }> {
  clearCallAccessAttempts();
  const app = express();
  app.use(express.json());
  app.use(createJsCallsRouter(async () => calls, async () => "9816"));
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  return { server, port: address.port };
}

async function post(port: number, code: string) {
  const response = await fetch(`http://127.0.0.1:${port}/api/js-calls/unlock`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code }),
  });
  return { status: response.status, json: await response.json() };
}

test("the access code opens the restaurant call list", async () => {
  process.env.JS_CALLS_ACCESS_CODE = "9816";
  const calls: RestaurantCall[] = [{
    id: "call-1",
    callerName: "Ada Lovelace",
    phone: "+19785551212",
    callTime: "Oct 23, 2026, 6:40 PM",
    summary: "Running late for a reservation.",
    transcript: "Please hold the table.",
    recordedAt: "2026-10-23T22:40:00.000Z",
    late: true,
    reservation: true,
    recordingUrl: null,
  }];
  const { server, port } = await listen(calls);
  try {
    const denied = await post(port, "0000");
    assert.equal(denied.status, 401);

    const unlocked = await post(port, "9816");
    assert.equal(unlocked.status, 200);
    const list = await fetch(`http://127.0.0.1:${port}/api/js-calls`, {
      headers: { "x-js-calls-access": unlocked.json.token },
    });
    const body = await list.json();
    assert.equal(list.status, 200);
    assert.equal(body.calls.length, 1);
    assert.equal(body.calls[0].transcript, "Please hold the table.");

    const missing = await fetch(`http://127.0.0.1:${port}/api/js-calls`);
    assert.equal(missing.status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
