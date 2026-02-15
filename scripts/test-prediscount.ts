import { getOrdersByBusinessDate, getRestaurants } from "../server/reactivation/toast-api";

async function main() {
  const restaurants = await getRestaurants();
  const guid = restaurants[1].restaurantGuid;
  
  let page = 1;
  let hasMore = true;
  let priceTotal = 0;
  let preDiscountTotal = 0;
  let discountTotal = 0;
  let checkDiscountTotal = 0;
  
  while (hasMore) {
    const orders = await getOrdersByBusinessDate(guid, "2026-02-14", page, 100);
    if (!Array.isArray(orders) || orders.length === 0) break;
    
    for (const o of orders) {
      if (o.voided || o.deleted) continue;
      for (const c of (o.checks || [])) {
        if (c.voided || c.deleted) continue;
        
        for (const s of (c.selections || [])) {
          if (s.voided) continue;
          priceTotal += s.price || 0;
          preDiscountTotal += s.preDiscountPrice || 0;
          
          for (const d of (s.appliedDiscounts || [])) {
            discountTotal += d.nonTaxableDiscountAmount || 0;
          }
        }
        
        for (const d of (c.appliedDiscounts || [])) {
          checkDiscountTotal += d.nonTaxableDiscountAmount || 0;
        }
      }
    }
    page++;
    if (orders.length < 100) hasMore = false;
  }
  
  console.log(`selection.price total: $${priceTotal.toFixed(2)}`);
  console.log(`selection.preDiscountPrice total: $${preDiscountTotal.toFixed(2)}`);
  console.log(`selection-level discounts (nonTaxable): $${discountTotal.toFixed(2)}`);
  console.log(`check-level discounts (nonTaxable): $${checkDiscountTotal.toFixed(2)}`);
  console.log(`preDiscountPrice - all discounts: $${(preDiscountTotal - discountTotal - checkDiscountTotal).toFixed(2)}`);
  console.log(`price already has discounts applied: price == preDiscount - discounts? ${Math.abs(priceTotal - (preDiscountTotal - discountTotal)) < 1}`);
}

main().catch(console.error);
