import { useState, useMemo, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { useB2bAdminOrders, useB2bAdminSalesReps, type B2bOrder, type SalesRep } from "@/hooks/useB2bAdmin";
import { useB2bAdminCustomers } from "@/hooks/useB2bAdminCustomers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, Package, Users, BarChart3, Calendar, ArrowUpRight, ArrowDownRight, Layers } from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, subMonths } from "date-fns";

type DateRange = "7d" | "30d" | "90d" | "ytd" | "all";

function getDateRange(range: DateRange): { start: Date; end: Date } {
  const end = new Date();
  const now = new Date();
  switch (range) {
    case "7d":
      return { start: subDays(now, 7), end };
    case "30d":
      return { start: subDays(now, 30), end };
    case "90d":
      return { start: subDays(now, 90), end };
    case "ytd":
      return { start: new Date(now.getFullYear(), 0, 1), end };
    case "all":
      return { start: new Date(2020, 0, 1), end };
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function getPreviousPeriodRange(range: DateRange): { start: Date; end: Date } {
  const current = getDateRange(range);
  const durationMs = current.end.getTime() - current.start.getTime();
  return {
    start: new Date(current.start.getTime() - durationMs),
    end: new Date(current.end.getTime() - durationMs),
  };
}

export default function B2bReports() {
  const { data: orders, isLoading: ordersLoading } = useB2bAdminOrders();
  const { data: customers, isLoading: customersLoading } = useB2bAdminCustomers();
  const { data: salesReps, isLoading: salesRepsLoading } = useB2bAdminSalesReps();
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const isLoading = ordersLoading || customersLoading || salesRepsLoading;

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    const { start, end } = getDateRange(dateRange);
    return orders.filter((order) => {
      if (order.orderType === "return") return false;
      const orderDate = parseISO(order.orderDate);
      return isWithinInterval(orderDate, { start, end });
    });
  }, [orders, dateRange]);

  const previousOrders = useMemo(() => {
    if (!orders) return [];
    const { start, end } = getPreviousPeriodRange(dateRange);
    return orders.filter((order) => {
      if (order.orderType === "return") return false;
      const orderDate = parseISO(order.orderDate);
      return isWithinInterval(orderDate, { start, end });
    });
  }, [orders, dateRange]);

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + parseFloat(o.total || "0"), 0);
  const previousRevenue = previousOrders.reduce((sum, o) => sum + parseFloat(o.total || "0"), 0);
  const revenueChange = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

  const totalOrders = filteredOrders.length;
  const previousOrderCount = previousOrders.length;
  const orderChange = previousOrderCount > 0 ? ((totalOrders - previousOrderCount) / previousOrderCount) * 100 : 0;

  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const previousAvg = previousOrderCount > 0 ? previousRevenue / previousOrderCount : 0;
  const avgChange = previousAvg > 0 ? ((avgOrderValue - previousAvg) / previousAvg) * 100 : 0;

  const uniqueCustomers = new Set(filteredOrders.map((o) => o.customerId)).size;
  const previousUniqueCustomers = new Set(previousOrders.map((o) => o.customerId)).size;
  const customerChange = previousUniqueCustomers > 0 ? ((uniqueCustomers - previousUniqueCustomers) / previousUniqueCustomers) * 100 : 0;

  const salesByCustomer = useMemo(() => {
    const map = new Map<string, { name: string; total: number; orders: number }>();
    filteredOrders.forEach((order) => {
      const name = order.customerName || order.customer?.accountName || "Unknown";
      const existing = map.get(order.customerId) || { name, total: 0, orders: 0 };
      existing.total += parseFloat(order.total || "0");
      existing.orders += 1;
      map.set(order.customerId, existing);
    });
    return Array.from(map.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [filteredOrders]);

  const salesByProduct = useMemo(() => {
    const map = new Map<string, { name: string; total: number; quantity: number }>();
    filteredOrders.forEach((order) => {
      if (!order.items) return;
      order.items.forEach((item) => {
        const existing = map.get(item.productId) || { name: item.productName, total: 0, quantity: 0 };
        existing.total += parseFloat(item.totalPrice || "0");
        existing.quantity += item.quantity;
        map.set(item.productId, existing);
      });
    });
    return Array.from(map.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [filteredOrders]);

  const salesBySalesRep = useMemo(() => {
    if (!salesReps || !customers) return [];
    const customerToRep = new Map<string, string>();
    const allCustomers = Array.isArray(customers) ? customers : (customers as any)?.customers || [];
    allCustomers.forEach((c: any) => {
      if (c.salesRepId) customerToRep.set(c.id, c.salesRepId);
    });

    const map = new Map<string, { name: string; total: number; orders: number; customers: Set<string> }>();
    filteredOrders.forEach((order) => {
      const repId = customerToRep.get(order.customerId);
      if (!repId) return;
      const rep = salesReps.find((r) => r.id === repId);
      if (!rep) return;
      const name = `${rep.firstName} ${rep.lastName}`;
      const existing = map.get(repId) || { name, total: 0, orders: 0, customers: new Set<string>() };
      existing.total += parseFloat(order.total || "0");
      existing.orders += 1;
      existing.customers.add(order.customerId);
      map.set(repId, existing);
    });
    return Array.from(map.entries())
      .map(([id, data]) => ({ id, name: data.name, total: data.total, orders: data.orders, customers: data.customers.size }))
      .sort((a, b) => b.total - a.total);
  }, [filteredOrders, salesReps, customers]);

  const salesByWeek = useMemo(() => {
    const map = new Map<string, { weekLabel: string; total: number; orders: number }>();
    filteredOrders.forEach((order) => {
      const orderDate = parseISO(order.orderDate);
      const weekStart = startOfWeek(orderDate, { weekStartsOn: 1 });
      const key = format(weekStart, "yyyy-MM-dd");
      const weekLabel = `${format(weekStart, "MMM d")} - ${format(endOfWeek(orderDate, { weekStartsOn: 1 }), "MMM d")}`;
      const existing = map.get(key) || { weekLabel, total: 0, orders: 0 };
      existing.total += parseFloat(order.total || "0");
      existing.orders += 1;
      map.set(key, existing);
    });
    return Array.from(map.entries())
      .map(([key, data]) => ({ key, ...data }))
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [filteredOrders]);

  const salesByMonth = useMemo(() => {
    const map = new Map<string, { monthLabel: string; total: number; orders: number }>();
    filteredOrders.forEach((order) => {
      const orderDate = parseISO(order.orderDate);
      const key = format(orderDate, "yyyy-MM");
      const monthLabel = format(orderDate, "MMMM yyyy");
      const existing = map.get(key) || { monthLabel, total: 0, orders: 0 };
      existing.total += parseFloat(order.total || "0");
      existing.orders += 1;
      map.set(key, existing);
    });
    return Array.from(map.entries())
      .map(([key, data]) => ({ key, ...data }))
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [filteredOrders]);

  const ordersByStatus = useMemo(() => {
    const map = new Map<string, number>();
    filteredOrders.forEach((order) => {
      const count = map.get(order.status) || 0;
      map.set(order.status, count + 1);
    });
    return Array.from(map.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredOrders]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif font-semibold" data-testid="text-reports-title">B2B Reports</h2>
          <p className="text-sm text-muted-foreground">Sales performance and analytics</p>
        </div>
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
          <SelectTrigger className="w-[160px]" data-testid="select-date-range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="ytd">Year to date</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Revenue"
          value={formatCurrency(totalRevenue)}
          change={revenueChange}
          icon={DollarSign}
          testId="metric-revenue"
        />
        <MetricCard
          title="Orders"
          value={totalOrders.toString()}
          change={orderChange}
          icon={Package}
          testId="metric-orders"
        />
        <MetricCard
          title="Avg Order"
          value={formatCurrency(avgOrderValue)}
          change={avgChange}
          icon={TrendingUp}
          testId="metric-avg-order"
        />
        <MetricCard
          title="Active Customers"
          value={uniqueCustomers.toString()}
          change={customerChange}
          icon={Users}
          testId="metric-customers"
        />
      </div>

      <Tabs defaultValue="by-customer" className="space-y-4">
        <TabsList className="h-auto flex-wrap gap-1">
          <TabsTrigger value="by-customer" className="gap-1.5 text-xs px-2.5" data-testid="tab-report-by-customer">
            <Users className="w-3.5 h-3.5" />
            By Customer
          </TabsTrigger>
          <TabsTrigger value="by-product" className="gap-1.5 text-xs px-2.5" data-testid="tab-report-by-product">
            <Package className="w-3.5 h-3.5" />
            By Product
          </TabsTrigger>
          <TabsTrigger value="by-rep" className="gap-1.5 text-xs px-2.5" data-testid="tab-report-by-rep">
            <Users className="w-3.5 h-3.5" />
            By Sales Rep
          </TabsTrigger>
          <TabsTrigger value="by-period" className="gap-1.5 text-xs px-2.5" data-testid="tab-report-by-period">
            <Calendar className="w-3.5 h-3.5" />
            By Period
          </TabsTrigger>
          <TabsTrigger value="status" className="gap-1.5 text-xs px-2.5" data-testid="tab-report-status">
            <BarChart3 className="w-3.5 h-3.5" />
            Order Status
          </TabsTrigger>
          <TabsTrigger value="pricing-commissions" className="gap-1.5 text-xs px-2.5" data-testid="tab-report-pricing-commissions">
            <Layers className="w-3.5 h-3.5" />
            Pricing &amp; Commissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="by-customer">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Sales by Customer</CardTitle>
            </CardHeader>
            <CardContent>
              {salesByCustomer.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No order data for this period</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Customer</th>
                        <th className="text-right py-2 px-4 font-medium text-muted-foreground">Orders</th>
                        <th className="text-right py-2 px-4 font-medium text-muted-foreground">Revenue</th>
                        <th className="text-right py-2 pl-4 font-medium text-muted-foreground">Avg Order</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesByCustomer.map((row, i) => (
                        <tr key={row.id} className="border-b last:border-0" data-testid={`row-customer-${i}`}>
                          <td className="py-2.5 pr-4 font-medium">{row.name}</td>
                          <td className="py-2.5 px-4 text-right">{row.orders}</td>
                          <td className="py-2.5 px-4 text-right font-medium">{formatCurrency(row.total)}</td>
                          <td className="py-2.5 pl-4 text-right text-muted-foreground">{formatCurrency(row.total / row.orders)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-semibold">
                        <td className="py-2.5 pr-4">Total</td>
                        <td className="py-2.5 px-4 text-right">{salesByCustomer.reduce((s, r) => s + r.orders, 0)}</td>
                        <td className="py-2.5 px-4 text-right">{formatCurrency(salesByCustomer.reduce((s, r) => s + r.total, 0))}</td>
                        <td className="py-2.5 pl-4 text-right"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-product">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Sales by Product</CardTitle>
            </CardHeader>
            <CardContent>
              {salesByProduct.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No order data for this period</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Product</th>
                        <th className="text-right py-2 px-4 font-medium text-muted-foreground">Units Sold</th>
                        <th className="text-right py-2 pl-4 font-medium text-muted-foreground">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesByProduct.map((row, i) => (
                        <tr key={row.id} className="border-b last:border-0" data-testid={`row-product-${i}`}>
                          <td className="py-2.5 pr-4 font-medium">{row.name}</td>
                          <td className="py-2.5 px-4 text-right">{row.quantity}</td>
                          <td className="py-2.5 pl-4 text-right font-medium">{formatCurrency(row.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-semibold">
                        <td className="py-2.5 pr-4">Total</td>
                        <td className="py-2.5 px-4 text-right">{salesByProduct.reduce((s, r) => s + r.quantity, 0)}</td>
                        <td className="py-2.5 pl-4 text-right">{formatCurrency(salesByProduct.reduce((s, r) => s + r.total, 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-rep">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Sales by Sales Rep</CardTitle>
            </CardHeader>
            <CardContent>
              {salesBySalesRep.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No sales rep data for this period</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Sales Rep</th>
                        <th className="text-right py-2 px-4 font-medium text-muted-foreground">Orders</th>
                        <th className="text-right py-2 px-4 font-medium text-muted-foreground">Customers</th>
                        <th className="text-right py-2 px-4 font-medium text-muted-foreground">Revenue</th>
                        <th className="text-right py-2 pl-4 font-medium text-muted-foreground">Avg Order</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesBySalesRep.map((row, i) => (
                        <tr key={row.id} className="border-b last:border-0" data-testid={`row-rep-${i}`}>
                          <td className="py-2.5 pr-4 font-medium">{row.name}</td>
                          <td className="py-2.5 px-4 text-right">{row.orders}</td>
                          <td className="py-2.5 px-4 text-right">{row.customers}</td>
                          <td className="py-2.5 px-4 text-right font-medium">{formatCurrency(row.total)}</td>
                          <td className="py-2.5 pl-4 text-right text-muted-foreground">{formatCurrency(row.total / row.orders)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-semibold">
                        <td className="py-2.5 pr-4">Total</td>
                        <td className="py-2.5 px-4 text-right">{salesBySalesRep.reduce((s, r) => s + r.orders, 0)}</td>
                        <td className="py-2.5 px-4 text-right"></td>
                        <td className="py-2.5 px-4 text-right">{formatCurrency(salesBySalesRep.reduce((s, r) => s + r.total, 0))}</td>
                        <td className="py-2.5 pl-4 text-right"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-period">
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Sales by Week</CardTitle>
              </CardHeader>
              <CardContent>
                {salesByWeek.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No order data for this period</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Week</th>
                          <th className="text-right py-2 px-4 font-medium text-muted-foreground">Orders</th>
                          <th className="text-right py-2 pl-4 font-medium text-muted-foreground">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesByWeek.map((row, i) => (
                          <tr key={row.key} className="border-b last:border-0" data-testid={`row-week-${i}`}>
                            <td className="py-2.5 pr-4">{row.weekLabel}</td>
                            <td className="py-2.5 px-4 text-right">{row.orders}</td>
                            <td className="py-2.5 pl-4 text-right font-medium">{formatCurrency(row.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 font-semibold">
                          <td className="py-2.5 pr-4">Total</td>
                          <td className="py-2.5 px-4 text-right">{salesByWeek.reduce((s, r) => s + r.orders, 0)}</td>
                          <td className="py-2.5 pl-4 text-right">{formatCurrency(salesByWeek.reduce((s, r) => s + r.total, 0))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Sales by Month</CardTitle>
              </CardHeader>
              <CardContent>
                {salesByMonth.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No order data for this period</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Month</th>
                          <th className="text-right py-2 px-4 font-medium text-muted-foreground">Orders</th>
                          <th className="text-right py-2 pl-4 font-medium text-muted-foreground">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesByMonth.map((row, i) => (
                          <tr key={row.key} className="border-b last:border-0" data-testid={`row-month-${i}`}>
                            <td className="py-2.5 pr-4">{row.monthLabel}</td>
                            <td className="py-2.5 px-4 text-right">{row.orders}</td>
                            <td className="py-2.5 pl-4 text-right font-medium">{formatCurrency(row.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 font-semibold">
                          <td className="py-2.5 pr-4">Total</td>
                          <td className="py-2.5 px-4 text-right">{salesByMonth.reduce((s, r) => s + r.orders, 0)}</td>
                          <td className="py-2.5 pl-4 text-right">{formatCurrency(salesByMonth.reduce((s, r) => s + r.total, 0))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="status">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Orders by Status</CardTitle>
            </CardHeader>
            <CardContent>
              {ordersByStatus.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No order data for this period</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {ordersByStatus.map((row) => (
                    <Card key={row.status} data-testid={`card-status-${row.status}`}>
                      <CardContent className="p-4 text-center">
                        <Badge variant="secondary" className="mb-2">
                          {row.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </Badge>
                        <p className="text-2xl font-bold">{row.count}</p>
                        <p className="text-xs text-muted-foreground">orders</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing-commissions">
          <ProductPricingCommissionReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface PricingReportData {
  products: Array<{
    id: string;
    name: string;
    category: string;
    sku: string | null;
    retailPrice: string;
    caseSize: number | null;
  }>;
  pricingTiers: Array<{
    id: string;
    tierName: string;
    category: string;
    discountPercentage: string;
    commitmentCases: number | null;
  }>;
  commissionTiers: Array<{
    id: string;
    tierName: string;
    ratePercent: string;
    minAnnualSales: string;
    maxAnnualSales: string | null;
  }>;
}

function ProductPricingCommissionReport() {
  const { data, isLoading } = useQuery<PricingReportData>({
    queryKey: ['/api/b2b/admin/reports/product-pricing-commissions'],
  });
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPricingTier, setSelectedPricingTier] = useState<string>("all");

  const categories = useMemo(() => {
    if (!data?.products) return [];
    const cats = Array.from(new Set(data.products.map(p => p.category)));
    return cats.sort();
  }, [data]);

  const uniquePricingTierNames = useMemo(() => {
    if (!data?.pricingTiers) return [];
    const names = Array.from(new Set(data.pricingTiers.map(t => t.tierName)));
    return names;
  }, [data]);

  const filteredProducts = useMemo(() => {
    if (!data?.products) return [];
    if (selectedCategory === "all") return data.products;
    return data.products.filter(p => p.category === selectedCategory);
  }, [data, selectedCategory]);

  const getPricingTiersForCategory = (category: string) => {
    if (!data?.pricingTiers) return [];
    return data.pricingTiers.filter(t => t.category === category);
  };

  const getDisplayPricingTiers = (category: string) => {
    const tiers = getPricingTiersForCategory(category);
    if (selectedPricingTier === "all") return tiers;
    return tiers.filter(t => t.tierName === selectedPricingTier);
  };

  const commissionTiers = data?.commissionTiers || [];

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  const fmtCategory = (c: string) =>
    c.replace(/_/g, " ").replace(/\b\w/g, ch => ch.toUpperCase());

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.products.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground">No product data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base" data-testid="text-pricing-commission-title">Product Pricing &amp; Commission Report</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Shows wholesale tier pricing for each product with commission costs and net prices per commission tier
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[160px]" data-testid="select-report-category">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c} value={c}>{fmtCategory(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedPricingTier} onValueChange={setSelectedPricingTier}>
                <SelectTrigger className="w-[160px]" data-testid="select-report-pricing-tier">
                  <SelectValue placeholder="All Pricing Tiers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pricing Tiers</SelectItem>
                  {uniquePricingTierNames.map(n => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-3 font-medium text-muted-foreground whitespace-nowrap">Product</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground whitespace-nowrap">Category</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground whitespace-nowrap">Retail</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground whitespace-nowrap">Pricing Tier</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground whitespace-nowrap">Wholesale</th>
                  {commissionTiers.map(ct => (
                    <th key={ct.id} colSpan={2} className="text-center py-2 px-1 font-medium text-muted-foreground whitespace-nowrap border-l">
                      {ct.tierName} ({ct.ratePercent}%)
                    </th>
                  ))}
                </tr>
                <tr className="border-b">
                  <th colSpan={5}></th>
                  {commissionTiers.map(ct => (
                    <Fragment key={`sub-${ct.id}`}>
                      <th className="text-right py-1 px-2 font-normal text-xs text-muted-foreground whitespace-nowrap border-l">Commission</th>
                      <th className="text-right py-1 px-2 font-normal text-xs text-muted-foreground whitespace-nowrap">Net Price</th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const pricingTiers = getDisplayPricingTiers(product.category);
                  const retailPrice = parseFloat(product.retailPrice);

                  if (pricingTiers.length === 0) {
                    return (
                      <tr key={product.id} className="border-b last:border-0" data-testid={`row-pricing-${product.id}`}>
                        <td className="py-2.5 pr-3 font-medium">{product.name}</td>
                        <td className="py-2.5 px-3">
                          <Badge variant="secondary">{fmtCategory(product.category)}</Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium">{fmtCurrency(retailPrice)}</td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground text-xs">No tier</td>
                        <td className="py-2.5 px-3 text-right font-medium">{fmtCurrency(retailPrice)}</td>
                        {commissionTiers.map(ct => {
                          const rate = parseFloat(ct.ratePercent) / 100;
                          const commission = retailPrice * rate;
                          const net = retailPrice - commission;
                          return (
                            <Fragment key={ct.id}>
                              <td className="py-2.5 px-2 text-right text-muted-foreground border-l">{fmtCurrency(commission)}</td>
                              <td className="py-2.5 px-2 text-right font-medium">{fmtCurrency(net)}</td>
                            </Fragment>
                          );
                        })}
                      </tr>
                    );
                  }

                  return pricingTiers.map((tier, tierIdx) => {
                    const discount = parseFloat(tier.discountPercentage) / 100;
                    const wholesalePrice = retailPrice * (1 - discount);

                    return (
                      <tr
                        key={`${product.id}-${tier.id}`}
                        className={`border-b last:border-0 ${tierIdx > 0 ? 'bg-muted/30' : ''}`}
                        data-testid={`row-pricing-${product.id}-${tier.tierName}`}
                      >
                        <td className="py-2.5 pr-3 font-medium">{tierIdx === 0 ? product.name : ''}</td>
                        <td className="py-2.5 px-3">
                          {tierIdx === 0 && <Badge variant="secondary">{fmtCategory(product.category)}</Badge>}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium">{tierIdx === 0 ? fmtCurrency(retailPrice) : ''}</td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <span className="text-xs">{tier.tierName}</span>
                          <span className="text-xs text-muted-foreground ml-1">(-{tier.discountPercentage}%)</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium">{fmtCurrency(wholesalePrice)}</td>
                        {commissionTiers.map(ct => {
                          const rate = parseFloat(ct.ratePercent) / 100;
                          const commission = wholesalePrice * rate;
                          const net = wholesalePrice - commission;
                          return (
                            <Fragment key={ct.id}>
                              <td className="py-2.5 px-2 text-right text-muted-foreground border-l">{fmtCurrency(commission)}</td>
                              <td className="py-2.5 px-2 text-right font-medium">{fmtCurrency(net)}</td>
                            </Fragment>
                          );
                        })}
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> Commission amounts shown are per-unit based on each commission tier rate.
              Actual sales rep commissions use marginal brackets based on YTD collected revenue.
              Reps with flat rate commission use their fixed percentage regardless of tier.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  testId,
}: {
  title: string;
  value: string;
  change: number;
  icon: any;
  testId: string;
}) {
  const isPositive = change >= 0;
  return (
    <Card data-testid={testId}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs text-muted-foreground">{title}</span>
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <p className="text-xl font-bold">{value}</p>
        {change !== 0 && (
          <div className="flex items-center gap-1 mt-1">
            {isPositive ? (
              <ArrowUpRight className="w-3 h-3 text-green-600" />
            ) : (
              <ArrowDownRight className="w-3 h-3 text-red-600" />
            )}
            <span className={`text-xs ${isPositive ? "text-green-600" : "text-red-600"}`}>
              {Math.abs(change).toFixed(1)}% vs prior period
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
