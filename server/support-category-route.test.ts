import assert from "node:assert/strict";
import { test } from "node:test";
import { interpretCategoryRoute, mailboxesForCategories, type CategoryRouteCandidate } from "./support-category-route";

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
