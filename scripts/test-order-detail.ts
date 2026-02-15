import { getOrdersByBusinessDate, getRestaurants } from "../server/reactivation/toast-api";

async function main() {
  const restaurants = await getRestaurants();
  const guid = restaurants[1].restaurantGuid; // Nashoba Valley main
  
  let page = 1;
  let hasMore = true;
  let totalCheckAmount = 0;
  let totalCheckAmountNoGiftCards = 0;
  let giftCardTotal = 0;
  let serviceChargeTotal = 0;
  let voidedOrderCount = 0;
  let deletedOrderCount = 0;
  
  while (hasMore) {
    const orders = await getOrdersByBusinessDate(guid, "2026-02-14", page, 100);
    if (!Array.isArray(orders) || orders.length === 0) break;
    
    for (const o of orders) {
      if (o.voided || o.deleted) {
        if (o.voided) voidedOrderCount++;
        if (o.deleted) deletedOrderCount++;
        continue;
      }
      
      for (const c of (o.checks || [])) {
        if (c.voided || c.deleted) continue;
        totalCheckAmount += c.amount || 0;
        
        let hasGiftCard = false;
        let checkGiftCards = 0;
        let checkServiceCharges = 0;
        
        for (const s of (c.selections || [])) {
          if (s.voided) continue;
          if (s.displayName && s.displayName.toLowerCase().includes("gift card")) {
            hasGiftCard = true;
            checkGiftCards += s.price || 0;
          }
        }
        
        for (const charge of (c.appliedServiceCharges || [])) {
          if (!charge.gratuity) {
            checkServiceCharges += charge.chargeAmount || 0;
          }
        }
        
        giftCardTotal += checkGiftCards;
        serviceChargeTotal += checkServiceCharges;
        totalCheckAmountNoGiftCards += (c.amount || 0) - checkGiftCards;
      }
    }
    
    page++;
    if (orders.length < 100) hasMore = false;
  }
  
  console.log("=== Feb 14 Analysis ===");
  console.log(`Toast dashboard: $21,020.21`);
  console.log(`check.amount total: $${totalCheckAmount.toFixed(2)}`);
  console.log(`Gift card total: $${giftCardTotal.toFixed(2)}`);
  console.log(`check.amount minus gift cards: $${totalCheckAmountNoGiftCards.toFixed(2)}`);
  console.log(`Non-gratuity service charges: $${serviceChargeTotal.toFixed(2)}`);
  console.log(`check.amount - gift cards - service charges: $${(totalCheckAmountNoGiftCards - serviceChargeTotal).toFixed(2)}`);
  console.log(`Voided orders: ${voidedOrderCount}, Deleted: ${deletedOrderCount}`);
}

main().catch(console.error);
