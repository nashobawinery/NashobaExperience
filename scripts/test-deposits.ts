import { getOrdersByBusinessDate, getRestaurants } from "../server/reactivation/toast-api";

async function main() {
  const restaurants = await getRestaurants();
  const guid = restaurants[1].restaurantGuid;
  
  // Check Feb 13 for deposit-like items
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const orders = await getOrdersByBusinessDate(guid, "2026-02-13", page, 100);
    if (!Array.isArray(orders) || orders.length === 0) break;
    
    for (const o of orders) {
      if (o.voided || o.deleted) continue;
      for (const c of (o.checks || [])) {
        if (c.voided || c.deleted) continue;
        for (const s of (c.selections || [])) {
          if (s.voided) continue;
          const name = s.displayName || "";
          if (/deposit|toast table|reservation|booking/i.test(name)) {
            console.log(`Feb 13: "${name}" price=$${s.price} preDiscount=$${s.preDiscountPrice}`);
          }
        }
      }
    }
    page++;
    if (orders.length < 100) hasMore = false;
  }
  
  // Check Feb 7 for deposits
  page = 1;
  hasMore = true;
  while (hasMore) {
    const orders = await getOrdersByBusinessDate(guid, "2026-02-07", page, 100);
    if (!Array.isArray(orders) || orders.length === 0) break;
    
    for (const o of orders) {
      if (o.voided || o.deleted) continue;
      for (const c of (o.checks || [])) {
        if (c.voided || c.deleted) continue;
        for (const s of (c.selections || [])) {
          if (s.voided) continue;
          const name = s.displayName || "";
          if (/deposit|toast table|reservation|booking/i.test(name)) {
            console.log(`Feb 7: "${name}" price=$${s.price} preDiscount=$${s.preDiscountPrice}`);
          }
        }
      }
    }
    page++;
    if (orders.length < 100) hasMore = false;
  }
}

main().catch(console.error);
