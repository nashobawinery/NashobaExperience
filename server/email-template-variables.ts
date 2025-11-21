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
  
  let totalSavings = 0;
  
  for (const order of orders) {
    const orderItems = await storage.getB2bOrderItems(order.id);
    const products = await storage.getProducts();
    
    for (const item of orderItems) {
      const product = products.find(p => p.id === item.productId);
      if (!product) continue;
      
      const retailPrice = Number(item.retailPrice);
      const paidPrice = Number(item.unitPrice);
      const quantity = item.quantity;
      
      const tier1Price = retailPrice * 0.80;
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
}> {
  const commitmentAmount = customer.tierName === 'Tier 3' ? 10 : customer.tierName === 'Tier 4' ? 30 : 0;
  
  if (commitmentAmount === 0 || !customer.commitmentStartDate) {
    return {
      casesOrdered: 0,
      casesRemaining: 0,
      commitmentAmount: 0,
      daysUntilRenewal: 0,
      renewalDate: null,
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
    const orderItems = await storage.getB2bOrderItems(order.id);
    for (const item of orderItems) {
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
  };
}

export async function substituteVariables(template: string, data: EmailTemplateData): Promise<string> {
  const { customer, order, customData = {} } = data;
  
  const savingsVsTier1 = await calculateSavingsVsTier1(customer);
  const commitment = await calculateCommitmentProgress(customer);
  
  const variables: Record<string, string> = {
    customerName: customer.accountName,
    firstName: customer.accountName.split(' ')[0],
    contactName: customer.contactName || customer.accountName,
    email: customer.email,
    phoneNumber: customer.phoneNumber || '',
    tierName: customer.tierName,
    
    savingsTotal: `$${savingsVsTier1.toFixed(2)}`,
    savingsTotalRounded: `$${Math.round(savingsVsTier1)}`,
    
    casesOrdered: commitment.casesOrdered.toString(),
    casesRemaining: commitment.casesRemaining.toString(),
    commitmentAmount: commitment.commitmentAmount.toString(),
    daysUntilRenewal: commitment.daysUntilRenewal.toString(),
    renewalDate: commitment.renewalDate ? commitment.renewalDate.toLocaleDateString() : '',
    
    orderNumber: order?.orderNumber || '',
    orderTotal: order ? `$${Number(order.totalAmount).toFixed(2)}` : '',
    orderDate: order ? new Date(order.orderDate).toLocaleDateString() : '',
    orderStatus: order?.status || '',
    
    todayDate: new Date().toLocaleDateString(),
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
