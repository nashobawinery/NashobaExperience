import assert from "node:assert/strict";
import { test } from "node:test";
import { eventCategory, interpretCategoryRoute, isEventBooking, mailboxesForCategories, type CategoryRouteCandidate } from "./support-category-route";

const categories: CategoryRouteCandidate[] = [
  { id: "acct", name: "Accounting", notifyEmail: "Rap@nashobawinery.com" },
  { id: "res", name: "Reservations", notifyEmail: "Aparrow@nashobawinery.com" },
  { id: "events", name: "Events & Entertainment", notifyEmail: "crp@nashobawinery.com" },
  { id: "hours", name: "Hours & Location", notifyEmail: null },
  { id: "spam", name: "Spam", notifyEmail: null, isActive: false },
];

test("a confident single category is used by itself", () => {
  const route = interpretCategoryRoute(
    JSON.stringify({ confident: true, categoryIds: ["acct"] }),
    categories,
  );
  assert.deepEqual(route.categoryNames, ["Accounting"]);
  assert.equal(route.unsure, false);
});

test("several plausible categories are all kept", () => {
  const route = interpretCategoryRoute(
    JSON.stringify({ confident: false, categoryIds: ["res", "events", "res"] }),
    categories,
  );
  assert.deepEqual(route.categoryNames, ["Reservations", "Events & Entertainment"]);
  assert.equal(route.unsure, false);
});

test("a confident answer that names several categories still uses all of them", () => {
  const route = interpretCategoryRoute(
    JSON.stringify({ confident: true, categoryIds: ["acct", "res"] }),
    categories,
  );
  assert.deepEqual(route.categoryIds, ["acct", "res"]);
  assert.equal(route.unsure, false);
});

test("one category without confidence goes to the default mailbox", () => {
  const route = interpretCategoryRoute(
    JSON.stringify({ confident: false, categoryIds: ["hours"] }),
    categories,
  );
  assert.deepEqual(route.categoryNames, []);
  assert.equal(route.unsure, true);
});

test("an unreadable or unknown answer goes to the default mailbox", () => {
  assert.equal(interpretCategoryRoute("NONE", categories).unsure, true);
  assert.equal(interpretCategoryRoute("```json\n{\"confident\":true,\"categoryIds\":[\"missing\"]}\n```", categories).unsure, true);
  assert.equal(interpretCategoryRoute(null, categories).unsure, true);
});

test("an inactive category is ignored", () => {
  const route = interpretCategoryRoute(
    JSON.stringify({ confident: true, categoryIds: ["spam"] }),
    categories,
  );
  assert.equal(route.unsure, true);
});

test("weddings and large parties are events, and smaller parties stay reservations", () => {
  assert.equal(isEventBooking("We want to host a wedding at the winery."), true);
  assert.equal(isEventBooking("Line: Winery\nReservation for 19 people at the Knoll."), true);
  assert.equal(isEventBooking("Line: J's Restaurant\nTable for 9 tonight."), true);
  assert.equal(isEventBooking("Line: Winery\nCan we book the Knoll for a party of twenty?"), true);
  assert.equal(isEventBooking("Line: J's Restaurant\nParty of 16 at the Knoll."), false);
  assert.equal(isEventBooking("Line: Winery\nTable for 12 at the Knoll."), false);
  assert.equal(isEventBooking("Line: J's Restaurant\nTable for 8."), false);
  assert.equal(isEventBooking("What time do you open?"), false);
  assert.equal(eventCategory([
    { id: "res", name: "Reservations", slug: "reservations" },
    { id: "events", name: "Events & Entertainment", slug: "events-entertainment" },
  ])?.id, "events");
});

test("mailbox selection emails each match and uses the default when a match has no address", () => {
  const fallback = "Jp@nashobawinery.com";
  assert.deepEqual(
    mailboxesForCategories([{ notifyEmail: "Rap@nashobawinery.com" }, { notifyEmail: "Aparrow@nashobawinery.com" }], fallback),
    ["Rap@nashobawinery.com", "Aparrow@nashobawinery.com"],
  );
  assert.deepEqual(
    mailboxesForCategories([{ notifyEmail: "Rap@nashobawinery.com" }, { notifyEmail: null }], fallback),
    ["Rap@nashobawinery.com", fallback],
  );
  assert.deepEqual(mailboxesForCategories([], fallback), [fallback]);
  assert.deepEqual(
    mailboxesForCategories([{ notifyEmail: "jp@nashobawinery.com" }], fallback),
    ["jp@nashobawinery.com"],
  );
  assert.deepEqual(mailboxesForCategories([], "  "), []);
  assert.deepEqual(
    mailboxesForCategories([{ notifyEmail: "aparrow@nashobawinery.com, staff@nashobawinery.com" }], fallback),
    ["aparrow@nashobawinery.com", "staff@nashobawinery.com"],
  );
  assert.deepEqual(
    mailboxesForCategories([{ notifyEmail: "aparrow@nashobawinery.com; staff@nashobawinery.com" }], fallback),
    ["aparrow@nashobawinery.com", "staff@nashobawinery.com"],
  );
});
