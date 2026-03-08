import { storage } from "./storage";
import type { B2bCustomer, B2bOrder, TierPricing } from "@shared/schema";

export interface EmailTemplateData {
  customer: B2bCustomer;
  order?: B2bOrder;
  tierPricings?: TierPricing[];
  customData?: Record<string, string | number>;
}

export async function calculateSavingsVsTier1(customer: B2bCustomer): Promise<number> {
  const orders = await storage.getB2bOrders(customer.id);
  
  const allProducts = await storage.getB2bProductsForCatalog();
  const productMap = new Map(allProducts.map(p => [p.id, p]));
  
  const allTierPricing = await storage.getAllTierPricing();
  const tier1ByCategory = new Map<string, number>();
  for (const tier of allTierPricing) {
    if (tier.tierName === 'Tier 1' && tier.productCategory) {
      tier1ByCategory.set(tier.productCategory, Number(tier.discountPercentage) / 100);
    }
  }
  
  let totalSavings = 0;
  
  for (const order of orders) {
    for (const item of order.items) {
      const product = productMap.get(item.productId);
      if (!product) continue;
      
      const tier1DiscountPercent = tier1ByCategory.get(product.category);
      if (tier1DiscountPercent === undefined) continue;
      
      const retailPrice = Number(item.retailPrice);
      const paidPrice = Number(item.unitPrice);
      const quantity = item.quantity;
      
      const tier1Price = retailPrice * (1 - tier1DiscountPercent);
      const savingsPerBottle = tier1Price - paidPrice;
      totalSavings += savingsPerBottle * quantity;
    }
  }
  
  return Math.max(0, totalSavings);
}

export async function calculateCommitmentProgress(customer: B2bCustomer): Promise<{
  casesOrdered: number;
  casesRemaining: number;
  commitmentAmount: number;
  daysUntilRenewal: number;
  renewalDate: Date | null;
  tierName: string;
}> {
  let tierName = '';
  let commitmentAmount = 0;
  
  if (customer.pricingTierId) {
    const tier = await storage.getTierPricing(customer.pricingTierId);
    if (tier) {
      tierName = tier.tierName;
      if (tier.tierName === 'Tier 3') commitmentAmount = 10;
      if (tier.tierName === 'Tier 4') commitmentAmount = 30;
    }
  }
  
  if (commitmentAmount === 0 || !customer.commitmentStartDate) {
    return {
      casesOrdered: 0,
      casesRemaining: 0,
      commitmentAmount: 0,
      daysUntilRenewal: 0,
      renewalDate: null,
      tierName,
    };
  }
  
  const startDate = new Date(customer.commitmentStartDate);
  const renewalDate = new Date(startDate);
  renewalDate.setFullYear(renewalDate.getFullYear() + 1);
  
  const now = new Date();
  const daysUntilRenewal = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  const orders = await storage.getB2bOrders(customer.id);
  const ordersInCommitmentPeriod = orders.filter(order => {
    const orderDate = new Date(order.orderDate);
    return orderDate >= startDate && orderDate < renewalDate;
  });
  
  let casesOrdered = 0;
  for (const order of ordersInCommitmentPeriod) {
    for (const item of order.items) {
      const caseSize = 12;
      casesOrdered += Math.ceil(item.quantity / caseSize);
    }
  }
  
  const casesRemaining = Math.max(0, commitmentAmount - casesOrdered);
  
  return {
    casesOrdered,
    casesRemaining,
    commitmentAmount,
    daysUntilRenewal,
    renewalDate,
    tierName,
  };
}

export async function substituteVariables(template: string, data: EmailTemplateData): Promise<string> {
  const { customer, order, customData = {} } = data;
  
  const savingsVsTier1 = await calculateSavingsVsTier1(customer);
  const commitment = await calculateCommitmentProgress(customer);
  
  const variables: Record<string, string> = {
    customerName: customer.accountName,
    firstName: customer.accountName.split(' ')[0],
    contactName: customer.primaryContactName || customer.accountName,
    email: customer.emailAddress,
    phoneNumber: customer.phoneNumber || '',
    tierName: commitment.tierName,
    
    savingsTotal: `$${savingsVsTier1.toFixed(2)}`,
    savingsTotalRounded: `$${Math.round(savingsVsTier1)}`,
    
    casesOrdered: commitment.casesOrdered.toString(),
    casesRemaining: commitment.casesRemaining.toString(),
    commitmentAmount: commitment.commitmentAmount.toString(),
    daysUntilRenewal: commitment.daysUntilRenewal.toString(),
    renewalDate: commitment.renewalDate ? commitment.renewalDate.toLocaleDateString('en-US') : '',
    
    orderNumber: order?.orderNumber || '',
    orderTotal: order ? `$${Number(order.total).toFixed(2)}` : '',
    orderDate: order ? new Date(order.orderDate).toLocaleDateString('en-US') : '',
    orderStatus: order?.status || '',
    
    todayDate: new Date().toLocaleDateString('en-US'),
    currentYear: new Date().getFullYear().toString(),
    ...customData,
  };
  
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  }
  
  return result;
}

export const availableVariables = [
  { key: '{{customerName}}', description: 'Full business/account name' },
  { key: '{{firstName}}', description: 'First part of business name' },
  { key: '{{contactName}}', description: 'Primary contact name' },
  { key: '{{email}}', description: 'Customer email address' },
  { key: '{{phoneNumber}}', description: 'Customer phone number' },
  { key: '{{tierName}}', description: 'Current tier (e.g., Tier 3)' },
  
  { key: '{{savingsTotal}}', description: 'Total savings vs Tier 1 pricing (formatted with decimals)' },
  { key: '{{savingsTotalRounded}}', description: 'Total savings vs Tier 1 pricing (rounded to whole dollars)' },
  
  { key: '{{casesOrdered}}', description: 'Cases ordered in current commitment period' },
  { key: '{{casesRemaining}}', description: 'Cases remaining to meet commitment' },
  { key: '{{commitmentAmount}}', description: 'Total annual commitment (10 or 30 cases)' },
  { key: '{{daysUntilRenewal}}', description: 'Days until commitment renewal date' },
  { key: '{{renewalDate}}', description: 'Commitment renewal date' },
  
  { key: '{{orderNumber}}', description: 'Order number (if order context provided)' },
  { key: '{{orderTotal}}', description: 'Order total amount (if order context provided)' },
  { key: '{{orderDate}}', description: 'Order date (if order context provided)' },
  { key: '{{orderStatus}}', description: 'Order status (if order context provided)' },
  
  { key: '{{todayDate}}', description: "Today's date" },
  { key: '{{currentYear}}', description: 'Current year' },
];
