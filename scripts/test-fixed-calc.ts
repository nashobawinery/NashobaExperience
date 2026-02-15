import { fetchDailyRevenue } from "../server/reactivation/toast-api";

async function main() {
  // Test Feb 14 - Toast says $21,020.21
  const result14 = await fetchDailyRevenue("2026-02-14");
  console.log(`Feb 14: Toast=$21,020.21, Ours=$${result14.netSales.toFixed(2)}, Orders=${result14.orderCount}`);
  
  // Test Feb 13 - Toast says $6,552.00
  const result13 = await fetchDailyRevenue("2026-02-13");
  console.log(`Feb 13: Toast=$6,552.00, Ours=$${result13.netSales.toFixed(2)}, Orders=${result13.orderCount}`);
  
  // Test Feb 9 - Toast says $50.00
  const result9 = await fetchDailyRevenue("2026-02-09");
  console.log(`Feb 9: Toast=$50.00, Ours=$${result9.netSales.toFixed(2)}, Orders=${result9.orderCount}`);
  
  // Test Feb 8 - Toast says $6,038.47
  const result8 = await fetchDailyRevenue("2026-02-08");
  console.log(`Feb 8: Toast=$6,038.47, Ours=$${result8.netSales.toFixed(2)}, Orders=${result8.orderCount}`);
}

main().catch(console.error);
