import { fetchDailyRevenue } from "../server/reactivation/toast-api";

async function main() {
  // This week (Mon Feb 9 - Sat Feb 14)
  const thisWeek = [
    { date: "2026-02-09", toast: 50.00, day: "Mon" },
    { date: "2026-02-10", toast: 261.54, day: "Tue" },
    { date: "2026-02-11", toast: 890.68, day: "Wed" },
    { date: "2026-02-12", toast: 5192.73, day: "Thu" },
    { date: "2026-02-13", toast: 6552.00, day: "Fri" },
    { date: "2026-02-14", toast: 21020.21, day: "Sat" },
  ];
  
  // Prior week (Mon Feb 2 - Sun Feb 8)
  const priorWeek = [
    { date: "2026-02-02", toast: 334.00, day: "Mon" },
    { date: "2026-02-03", toast: 79.40, day: "Tue" },
    { date: "2026-02-04", toast: 698.94, day: "Wed" },
    { date: "2026-02-05", toast: 2491.06, day: "Thu" },
    { date: "2026-02-06", toast: 4399.57, day: "Fri" },
    { date: "2026-02-07", toast: 6038.47, day: "Sat" },
    { date: "2026-02-08", toast: 6500.69, day: "Sun" },
  ];
  
  console.log("=== THIS WEEK ===");
  for (const d of thisWeek) {
    const r = await fetchDailyRevenue(d.date);
    const diff = r.netSales - d.toast;
    const match = Math.abs(diff) < 1 ? "MATCH" : `off by $${diff.toFixed(2)}`;
    console.log(`${d.day} ${d.date}: Toast=$${d.toast.toFixed(2)}, Ours=$${r.netSales.toFixed(2)} [${match}]`);
  }
  
  console.log("\n=== PRIOR WEEK ===");
  for (const d of priorWeek) {
    const r = await fetchDailyRevenue(d.date);
    const diff = r.netSales - d.toast;
    const match = Math.abs(diff) < 1 ? "MATCH" : `off by $${diff.toFixed(2)}`;
    console.log(`${d.day} ${d.date}: Toast=$${d.toast.toFixed(2)}, Ours=$${r.netSales.toFixed(2)} [${match}]`);
  }
}

main().catch(console.error);
