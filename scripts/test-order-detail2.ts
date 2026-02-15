import { getOrdersByBusinessDate, getRestaurants } from "../server/reactivation/toast-api";

async function main() {
  const restaurants = await getRestaurants();
  const guid = restaurants[1].restaurantGuid;
  
  let page = 1;
  let hasMore = true;
  const itemNames: Record<string, { count: number; total: number }> = {};
  let checkAmountTotal = 0;
  let selectionPriceTotal = 0;
  
  while (hasMore) {
    const orders = await getOrdersByBusinessDate(guid, "2026-02-14", page, 100);
    if (!Array.isArray(orders) || orders.length === 0) break;
    
    for (const o of orders) {
      if (o.voided || o.deleted) continue;
      for (const c of (o.checks || [])) {
        if (c.voided || c.deleted) continue;
        checkAmountTotal += c.amount || 0;
        
        for (const s of (c.selections || [])) {
          if (s.voided) continue;
          const name = s.displayName || "UNKNOWN";
          const price = s.price || 0;
          const preDiscount = s.preDiscountPrice || 0;
          selectionPriceTotal += price;
          
          if (!itemNames[name]) itemNames[name] = { count: 0, total: 0 };
          itemNames[name].count++;
          itemNames[name].total += price;
        }
      }
    }
    page++;
    if (orders.length < 100) hasMore = false;
  }
  
  console.log(`check.amount total: $${checkAmountTotal.toFixed(2)}`);
  console.log(`sum of selection.price: $${selectionPriceTotal.toFixed(2)}`);
  console.log(`diff (check - selections): $${(checkAmountTotal - selectionPriceTotal).toFixed(2)}`);
  
  // Show items that look like deposits/fees/non-revenue
  console.log("\n=== ITEM NAMES THAT MIGHT BE NON-REVENUE ===");
  const suspicious = Object.entries(itemNames)
    .filter(([name]) => /deposit|fee|toast|table|reservation|surcharge|auto|grat/i.test(name))
    .sort((a, b) => b[1].total - a[1].total);
  
  for (const [name, data] of suspicious) {
    console.log(`  ${name}: ${data.count}x, $${data.total.toFixed(2)}`);
  }
  
  // Also show top items by revenue
  console.log("\n=== TOP 20 ITEMS BY REVENUE ===");
  const sorted = Object.entries(itemNames).sort((a, b) => b[1].total - a[1].total).slice(0, 20);
  for (const [name, data] of sorted) {
    console.log(`  ${name}: ${data.count}x, $${data.total.toFixed(2)}`);
  }
}

main().catch(console.error);
