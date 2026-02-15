import { fetchDailyRevenue } from "../server/reactivation/toast-api";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function upsertHistorical(dateStr: string, netRevenue: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayOfWeek = dateObj.getDay();
  const startOfYear = new Date(y, 0, 1);
  const diff = dateObj.getTime() - startOfYear.getTime();
  const weekOfYear = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;

  await db.execute(sql`
    INSERT INTO rcc_toast_historical_revenue (revenue_date, net_revenue, day_of_week, week_of_year, year)
    VALUES (${dateStr}, ${netRevenue}, ${dayOfWeek}, ${weekOfYear}, ${y})
    ON CONFLICT (revenue_date) DO UPDATE SET
      net_revenue = ${netRevenue},
      created_at = NOW()
  `);
}

async function upsertDailyRevenue(dateStr: string, toastRevenue: string) {
  const existing = await db.execute(sql`
    SELECT * FROM rcc_daily_revenue WHERE date = ${dateStr}
  `);
  if (existing.rows.length > 0) {
    const row: any = existing.rows[0];
    await db.execute(sql`
      UPDATE rcc_daily_revenue
      SET toast_revenue = ${toastRevenue}, updated_at = NOW()
      WHERE id = ${row.id}
    `);
  }
}

async function main() {
  const startArg = process.argv[2] || '2026-01-01';
  const endArg = process.argv[3] || '2026-02-15';
  
  const [sy, sm, sd] = startArg.split('-').map(Number);
  const [ey, em, ed] = endArg.split('-').map(Number);
  const startDate = new Date(sy, sm - 1, sd);
  const endDate = new Date(ey, em - 1, ed);

  const allDates: string[] = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    allDates.push(ds);
  }

  console.log(`[Bulk Sync] Will sync ${allDates.length} dates from ${allDates[0]} to ${allDates[allDates.length - 1]}`);

  let synced = 0;
  let errors = 0;
  let totalRevenue = 0;

  for (let i = 0; i < allDates.length; i++) {
    const dateStr = allDates[i];
    
    if (i > 0 && i % 10 === 0) {
      console.log(`[Bulk Sync] Progress: ${i}/${allDates.length} dates processed, ${synced} synced, ${errors} errors, $${totalRevenue.toFixed(2)} total`);
    }

    try {
      const revenue = await fetchDailyRevenue(dateStr);
      await upsertHistorical(dateStr, revenue.netSales.toFixed(2));
      await upsertDailyRevenue(dateStr, revenue.netSales.toFixed(2));
      synced++;
      totalRevenue += revenue.netSales;
      
      if (revenue.netSales > 0) {
        console.log(`[Bulk Sync] ${dateStr}: $${revenue.netSales.toFixed(2)} (${revenue.orderCount} orders)`);
      }
    } catch (err: any) {
      errors++;
      console.error(`[Bulk Sync] Error for ${dateStr}: ${err.message}`);
      await sleep(500);
    }
  }

  console.log(`\n[Bulk Sync] ============ COMPLETE ============`);
  console.log(`[Bulk Sync] Total dates: ${allDates.length}`);
  console.log(`[Bulk Sync] Synced: ${synced}`);
  console.log(`[Bulk Sync] Errors: ${errors}`);
  console.log(`[Bulk Sync] Total Revenue: $${totalRevenue.toFixed(2)}`);

  process.exit(0);
}

main().catch(err => {
  console.error("[Bulk Sync] Fatal error:", err);
  process.exit(1);
});
