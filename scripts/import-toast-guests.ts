import fs from "fs";
import { db } from "../server/db";
import { toastGuests } from "../shared/schema";
import { sql } from "drizzle-orm";

const CSV_PATH = "/tmp/toast_import/guest-list_6a9c3e8438f903b67ab0842b0d294680_e0efff47-85ea-4be2-843d-ded098b8782e_1.csv";
const BATCH_SIZE = 500;

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseTimestamp(val: string): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function parseNum(val: string): string | null {
  if (!val || val === "") return null;
  const n = Number(val);
  if (isNaN(n) || !isFinite(n)) return null;
  return val;
}

function parseInt2(val: string): number | null {
  if (!val || val === "") return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

function computeSegment(lastVisitDate: Date | null): { days: number | null; segment: string | null } {
  if (!lastVisitDate) return { days: null, segment: null };
  const now = new Date();
  const days = Math.floor((now.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));
  let segment: string;
  if (days <= 30) segment = "active";
  else if (days <= 60) segment = "at_risk";
  else if (days <= 120) segment = "lapsed";
  else if (days <= 365) segment = "dormant";
  else segment = "lost";
  return { days, segment };
}

async function main() {
  console.log("Reading CSV...");
  const content = fs.readFileSync(CSV_PATH, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  const headers = parseCsvLine(lines[0]);
  console.log(`Found ${lines.length - 1} records, ${headers.length} columns`);
  console.log("Headers:", headers.join(", "));

  const colIndex: Record<string, number> = {};
  headers.forEach((h, i) => {
    colIndex[h] = i;
  });

  const get = (fields: string[], col: string) => fields[colIndex[col]] || "";

  console.log("Deduplicating by guestGuid (keeping last occurrence)...");
  const guestMap = new Map<string, string[]>();
  let totalSkipped = 0;
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    if (fields.length < 5) { totalSkipped++; continue; }
    const guestGuid = get(fields, "guestGuid");
    if (!guestGuid) { totalSkipped++; continue; }
    guestMap.set(guestGuid, fields);
  }
  console.log(`Unique guests: ${guestMap.size.toLocaleString()} (${totalSkipped} skipped, ${lines.length - 1 - guestMap.size - totalSkipped} duplicates)`);

  let imported = 0;
  let batch: any[] = [];

  for (const [guestGuid, fields] of guestMap) {
    const lastVisit = parseTimestamp(get(fields, "lastVisitDate"));
    const { days, segment } = computeSegment(lastVisit);

    batch.push({
      guestGuid,
      email1: get(fields, "email1") || null,
      email1MarketingPreference: get(fields, "email1MarketingPreference") || null,
      phone1: get(fields, "phone1") || null,
      phone1MarketingPreference: get(fields, "phone1MarketingPreference") || null,
      firstName: get(fields, "firstName") || null,
      lastName: get(fields, "lastName") || null,
      firstVisitDate: parseTimestamp(get(fields, "firstVisitDate")),
      lastVisitDate: lastVisit,
      lastDiningBehavior: get(fields, "lastDiningBehavior") || null,
      totalVisits: parseInt2(get(fields, "totalVisits")),
      diningBehaviors: get(fields, "diningBehaviors") || null,
      averageSpend: parseNum(get(fields, "averageSpend")),
      averageTip: parseNum(get(fields, "averageTip")),
      averageTipPercentage: parseNum(get(fields, "averageTipPercentage")),
      lifetimeSpend: parseNum(get(fields, "lifetimeSpend")),
      email2: get(fields, "email2") || null,
      email2MarketingPreference: get(fields, "email2MarketingPreference") || null,
      phone2: get(fields, "phone2") || null,
      phone2MarketingPreference: get(fields, "phone2MarketingPreference") || null,
      email3: get(fields, "email3") || null,
      email3MarketingPreference: get(fields, "email3MarketingPreference") || null,
      phone3: get(fields, "phone3") || null,
      phone3MarketingPreference: get(fields, "phone3MarketingPreference") || null,
      email4: get(fields, "email4") || null,
      email4MarketingPreference: get(fields, "email4MarketingPreference") || null,
      phone4: get(fields, "phone4") || null,
      phone4MarketingPreference: get(fields, "phone4MarketingPreference") || null,
      email5: get(fields, "email5") || null,
      email5MarketingPreference: get(fields, "email5MarketingPreference") || null,
      phone5: get(fields, "phone5") || null,
      phone5MarketingPreference: get(fields, "phone5MarketingPreference") || null,
      daysSinceLastVisit: days,
      reactivationSegment: segment,
    });

    if (batch.length >= BATCH_SIZE) {
      await db.insert(toastGuests).values(batch);
      imported += batch.length;
      batch = [];
      if (imported % 5000 === 0) {
        console.log(`  Imported ${imported.toLocaleString()} records...`);
      }
    }
  }

  if (batch.length > 0) {
    await db.insert(toastGuests).values(batch);
    imported += batch.length;
  }

  console.log(`\nImport complete!`);
  console.log(`  Total imported: ${imported.toLocaleString()}`);
  console.log(`  Skipped: ${totalSkipped}`);

  const segmentCounts = await db.execute(sql`
    SELECT reactivation_segment, COUNT(*) as count 
    FROM toast_guests 
    GROUP BY reactivation_segment 
    ORDER BY count DESC
  `);
  console.log("\nSegment breakdown:");
  for (const row of segmentCounts.rows) {
    console.log(`  ${row.reactivation_segment}: ${Number(row.count).toLocaleString()}`);
  }

  const topSpenders = await db.execute(sql`
    SELECT first_name, last_name, email1, total_visits, lifetime_spend, days_since_last_visit, reactivation_segment
    FROM toast_guests
    WHERE lifetime_spend IS NOT NULL
    ORDER BY lifetime_spend DESC
    LIMIT 5
  `);
  console.log("\nTop 5 spenders:");
  for (const row of topSpenders.rows) {
    console.log(`  ${row.first_name || ''} ${row.last_name || ''} - $${Number(row.lifetime_spend).toLocaleString()} (${row.total_visits} visits, ${row.reactivation_segment})`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
