import { getOrdersByBusinessDate, getRestaurants } from "../server/reactivation/toast-api";

async function main() {
  const restaurants = await getRestaurants();
  console.log("Restaurants:", restaurants.map((r: any) => r.restaurantName));
  
  // Try Feb 14 (Saturday, should be $21,020.21 per Toast dashboard)
  let grandCheckAmount = 0;
  let grandOurCalc = 0;
  
  for (const restaurant of restaurants) {
    const guid = restaurant.restaurantGuid;
    const name = restaurant.restaurantName;
    let page = 1;
    let hasMore = true;
    let locCheckAmt = 0;
    let locOurCalc = 0;
    let orderCount = 0;
    let firstOrder = true;
    
    while (hasMore) {
      const orders = await getOrdersByBusinessDate(guid, "2026-02-14", page, 100);
      if (!Array.isArray(orders) || orders.length === 0) break;
      
      for (const o of orders) {
        if (o.voided || o.deleted) continue;
        orderCount++;
        
        for (const c of (o.checks || [])) {
          if (c.voided || c.deleted) continue;
          locCheckAmt += c.amount || 0;
          
          if (firstOrder) {
            console.log("\n=== SAMPLE CHECK from", name, "===");
            console.log("Check keys:", Object.keys(c));
            console.log("amount:", c.amount, "totalAmount:", c.totalAmount, "taxAmount:", c.taxAmount);
            if (c.selections?.[0]) {
              const s = c.selections[0];
              console.log("Selection:", s.displayName, "price:", s.price, "preDiscountPrice:", s.preDiscountPrice, "tax:", s.tax);
            }
            if (c.appliedServiceCharges?.length > 0) {
              for (const sc of c.appliedServiceCharges) {
                console.log("ServiceCharge:", sc.name, "amount:", sc.chargeAmount, "gratuity:", sc.gratuity);
              }
            }
            firstOrder = false;
          }
          
          // Our current calculation
          let checkSales = 0;
          for (const s of (c.selections || [])) {
            if (s.voided) continue;
            if (s.displayName === "Gift Card") continue;
            let amt = s.preDiscountPrice || s.price || 0;
            for (const d of (s.appliedDiscounts || [])) {
              amt -= d.nonTaxableDiscountAmount || 0;
            }
            checkSales += amt;
          }
          for (const charge of (c.appliedServiceCharges || [])) {
            if (!charge.gratuity) {
              checkSales += charge.chargeAmount || 0;
            }
          }
          for (const d of (c.appliedDiscounts || [])) {
            checkSales -= d.nonTaxableDiscountAmount || 0;
          }
          locOurCalc += checkSales;
        }
      }
      
      page++;
      if (orders.length < 100) hasMore = false;
    }
    
    console.log(`\n${name}: ${orderCount} orders`);
    console.log(`  check.amount total: $${locCheckAmt.toFixed(2)}`);
    console.log(`  our calc total: $${locOurCalc.toFixed(2)}`);
    console.log(`  difference: $${(locOurCalc - locCheckAmt).toFixed(2)}`);
    
    grandCheckAmount += locCheckAmt;
    grandOurCalc += locOurCalc;
  }
  
  console.log(`\n=== GRAND TOTAL (Feb 14) ===`);
  console.log(`Toast dashboard says: $21,020.21`);
  console.log(`check.amount total: $${grandCheckAmount.toFixed(2)}`);
  console.log(`our calc total: $${grandOurCalc.toFixed(2)}`);
}

main().catch(console.error);
