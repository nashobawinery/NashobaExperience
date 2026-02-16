import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("[Phone Merge] Starting phone+name duplicate detection (remaining only)...");

  const dupeGroups = await db.execute(sql`
    WITH ranked AS (
      SELECT id, guest_guid, first_name, last_name, email1, email2, phone1, 
             lifetime_spend, total_visits, average_spend, days_since_last_visit,
             activity_categories, source, merged_into_id,
             ROW_NUMBER() OVER (
               PARTITION BY phone1, LOWER(TRIM(COALESCE(first_name, ''))), LOWER(TRIM(COALESCE(last_name, '')))
               ORDER BY CAST(COALESCE(lifetime_spend, '0') AS FLOAT) DESC, id ASC
             ) as rn,
             COUNT(*) OVER (
               PARTITION BY phone1, LOWER(TRIM(COALESCE(first_name, ''))), LOWER(TRIM(COALESCE(last_name, '')))
             ) as group_size
      FROM toast_guests
      WHERE phone1 IS NOT NULL AND phone1 != ''
        AND first_name IS NOT NULL AND first_name != ''
        AND last_name IS NOT NULL AND last_name != ''
        AND source = 'toast'
        AND merged_into_id IS NULL
    )
    SELECT * FROM ranked WHERE group_size > 1
    ORDER BY phone1, rn
  `);

  const groups = new Map<string, any[]>();
  for (const row of dupeGroups.rows as any[]) {
    const key = `${row.phone1}|${(row.first_name || '').toLowerCase().trim()}|${(row.last_name || '').toLowerCase().trim()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  console.log(`[Phone Merge] Found ${groups.size} remaining duplicate groups with ${dupeGroups.rows.length} total records`);

  if (groups.size === 0) {
    console.log("[Phone Merge] All duplicates already merged!");
    process.exit(0);
  }

  let merged = 0, emailsConsolidated = 0, linkedRecords = 0;

  for (const [key, records] of groups) {
    const winner = records[0];
    const losers = records.slice(1);

    const allEmails = new Set<string>();
    for (const r of records) {
      if (r.email1 && r.email1.trim()) allEmails.add(r.email1.trim().toLowerCase());
      if (r.email2 && r.email2.trim()) allEmails.add(r.email2.trim().toLowerCase());
    }
    const winnerEmail = (winner.email1 || '').trim().toLowerCase();
    if (winnerEmail) allEmails.delete(winnerEmail);
    const winnerEmail2 = (winner.email2 || '').trim().toLowerCase();
    if (winnerEmail2) allEmails.delete(winnerEmail2);
    const extraEmails = Array.from(allEmails);

    let newEmail1 = winner.email1;
    if (!newEmail1 || !newEmail1.trim()) {
      if (extraEmails.length > 0) newEmail1 = extraEmails.shift()!;
    }
    const newEmail2 = winner.email2 || extraEmails.shift() || null;
    const newEmail3 = extraEmails.shift() || null;

    let totalSpend = 0, totalVisits = 0;
    let minDaysSince: number | null = null;
    const allCategories = new Set<string>();
    for (const r of records) {
      totalSpend += parseFloat(r.lifetime_spend || '0');
      totalVisits += parseInt(r.total_visits || '0');
      const ds = r.days_since_last_visit;
      if (ds !== null && (minDaysSince === null || ds < minDaysSince)) minDaysSince = ds;
      if (r.activity_categories) for (const c of r.activity_categories.split(';')) if (c.trim()) allCategories.add(c.trim());
    }
    const avgSpend = totalVisits > 0 ? totalSpend / totalVisits : 0;
    const categoriesStr = allCategories.size > 0 ? Array.from(allCategories).join(';') : null;
    let segment = 'lost';
    if (minDaysSince !== null) {
      if (minDaysSince <= 30) segment = 'active';
      else if (minDaysSince <= 60) segment = 'at_risk';
      else if (minDaysSince <= 120) segment = 'lapsed';
      else if (minDaysSince <= 365) segment = 'dormant';
    }

    await db.execute(sql`
      UPDATE toast_guests SET
        email1 = COALESCE(${newEmail1}, email1),
        email2 = ${newEmail2},
        email3 = ${newEmail3},
        lifetime_spend = ${totalSpend.toFixed(2)},
        total_visits = ${totalVisits},
        average_spend = ${avgSpend.toFixed(2)},
        days_since_last_visit = ${minDaysSince},
        reactivation_segment = ${segment},
        activity_categories = ${categoriesStr},
        updated_at = NOW()
      WHERE id = ${winner.id}
    `);
    if (newEmail2 || newEmail3) emailsConsolidated++;

    const existingCanon = await db.execute(sql`SELECT canonical_id FROM customer_identity_links WHERE guest_id = ${winner.id}`);
    let canonicalId: number;
    if (existingCanon.rows.length > 0) {
      canonicalId = (existingCanon.rows[0] as any).canonical_id;
    } else {
      const r = await db.execute(sql`
        INSERT INTO customer_identities (primary_email, primary_phone, merged_first_name, merged_last_name)
        VALUES (${newEmail1 || null}, ${winner.phone1}, ${winner.first_name}, ${winner.last_name}) RETURNING id
      `);
      canonicalId = (r.rows[0] as any).id;
      await db.execute(sql`INSERT INTO customer_identity_links (canonical_id, guest_id, source) VALUES (${canonicalId}, ${winner.id}, 'toast') ON CONFLICT (guest_id) DO NOTHING`);
    }

    for (const loser of losers) {
      await db.execute(sql`INSERT INTO customer_identity_links (canonical_id, guest_id, source) VALUES (${canonicalId}, ${loser.id}, 'toast') ON CONFLICT (guest_id) DO NOTHING`);
      await db.execute(sql`UPDATE toast_guests SET merged_into_id = ${winner.id}, updated_at = NOW() WHERE id = ${loser.id}`);
      linkedRecords++;
    }
    merged++;
    if (merged % 50 === 0) console.log(`[Phone Merge] Progress: ${merged}/${groups.size}`);
  }

  console.log(`[Phone Merge] COMPLETE: ${merged} groups, ${linkedRecords} linked, ${emailsConsolidated} emails consolidated`);
  const stats = await db.execute(sql`SELECT COUNT(*) FILTER (WHERE merged_into_id IS NOT NULL) as merged, COUNT(*) FILTER (WHERE merged_into_id IS NULL) as active FROM toast_guests WHERE source = 'toast'`);
  console.log("[Phone Merge] Stats:", stats.rows);
  process.exit(0);
}
main().catch(err => { console.error("Fatal:", err); process.exit(1); });
