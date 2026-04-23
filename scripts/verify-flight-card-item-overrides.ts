/**
 * One-off check: item_overrides exists and Drizzle can read flight_card_configs.
 * Run: npx tsx scripts/verify-flight-card-item-overrides.ts
 */
import { config } from "dotenv";
config();

import { db } from "../server/db";
import { flightCardConfigs } from "../shared/schema";
import { sql } from "drizzle-orm";

const col = await db.execute(sql`
  SELECT column_name, data_type, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'flight_card_configs'
    AND column_name = 'item_overrides'
`);
if (col.rows.length === 0) {
  console.error("FAIL: item_overrides column not found on flight_card_configs");
  process.exit(1);
}
console.log("OK: column in DB", col.rows[0]);

const sample = await db.select().from(flightCardConfigs).limit(1);
if (sample.length) {
  const k = "itemOverrides" in sample[0];
  if (!k) {
    console.error("FAIL: Drizzle row missing itemOverrides");
    process.exit(1);
  }
  const v = (sample[0] as { itemOverrides: string | null }).itemOverrides;
  console.log("OK: sample row itemOverrides =", v?.slice(0, 60) + (v && v.length > 60 ? "…" : ""));
} else {
  console.log("OK: flight_card_configs empty; insert still possible");
}

process.exit(0);
