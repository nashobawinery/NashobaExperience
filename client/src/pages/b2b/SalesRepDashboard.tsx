import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useB2bAuth } from "@/contexts/B2bAuthContext";
import { Calendar, DollarSign, TrendingUp, User, BarChart3, CheckCircle2, ArrowRight } from "lucide-react";
import { format } from "date-fns";

type Commission = {
  id: string;
  orderId: string;
  orderNumber: string;
  orderTotal: string;
  commissionPercentage: string;
  commissionAmount: string;
  status: string;
  order?: {
    orderNumber: string;
    orderDate: string;
    status: string;
    customer?: {
      accountName: string;
    };
  };
  paidToSalesRep: boolean;
  paidToSalesRepAt?: string;
  createdAt?: string;
};

type SalesRepProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  territory?: string;
  commissionType: string;
  commissionPercentage: string;
  active: boolean;
  createdAt: string;
};

type TierProgressItem = {
  tierName: string;
  ratePercent: number;
  minSales: number;
  maxSales: number | null;
  salesInTier: number;
  progress: number;
  isComplete: boolean;
  isActive: boolean;
  remaining: number | null;
};

type TierProgressData = {
  commissionType: string;
  flatRate?: number;
  ytdSales: number;
  year: number;
  totalCommission: number;
  effectiveRate: number;
  tierBreakdown: Array<{
    tierName: string;
    ratePercent: number;
    salesInTier: number;
    commissionInTier: number;
    minSales: number;
    maxSales: number | null;
  }>;
  tierProgress?: TierProgressItem[];
};

export default function SalesRepDashboard() {
  const { user } = useB2bAuth();

  const { data: commissions, isLoading: commissionsLoading } = useQuery<Commission[]>({
    queryKey: ["b2b", "sales-rep", "commissions"],
    queryFn: async () => {
      const response = await fetch("/api/b2b/sales-rep/commissions");
      if (!response.ok) throw new Error("Failed to fetch commissions");
      return response.json();
    },
  });

  const { data: profile, isLoading: profileLoading } = useQuery<SalesRepProfile>({
    queryKey: ["b2b", "sales-rep", "profile"],
    queryFn: async () => {
      const response = await fetch("/api/b2b/sales-rep/profile");
      if (!response.ok) throw new Error("Failed to fetch profile");
      return response.json();
    },
  });

  const { data: tierProgress, isLoading: tierLoading } = useQuery<TierProgressData>({
    queryKey: ["b2b", "sales-rep", "tier-progress"],
    queryFn: async () => {
      const response = await fetch("/api/b2b/sales-rep/tier-progress");
      if (!response.ok) throw new Error("Failed to fetch tier progress");
      return response.json();
    },
  });

  const getOrderStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending_approval: "Waiting Approval",
      awaiting_delivery: "Awaiting Delivery",
      awaiting_payment: "Awaiting Payment",
      completed: "Completed",
    };
    return labels[status] || status;
  };

  const getOrderStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending_approval":
        return "secondary" as const;
      case "awaiting_delivery":
      case "awaiting_payment":
        return "default" as const;
      case "completed":
        return "default" as const;
      default:
        return "secondary" as const;
    }
  };

  const getCommissionStatusBadgeVariant = (status: string, paid: boolean) => {
    if (paid) return "default" as const;
    if (status === "pending") return "secondary" as const;
    if (status === "earned") return "default" as const;
    return "secondary" as const;
  };

  const pendingTotal =
    commissions?.reduce((sum, c) => {
      return sum + (c.status === "pending" ? parseFloat(c.commissionAmount) : 0);
    }, 0) || 0;

  const earnedTotal =
    commissions?.reduce((sum, c) => {
      return (
        sum +
        (c.status === "earned" && !c.paidToSalesRep
          ? parseFloat(c.commissionAmount)
          : 0)
      );
    }, 0) || 0;

  const paidTotal =
    commissions?.reduce((sum, c) => {
      return sum + (c.paidToSalesRep ? parseFloat(c.commissionAmount) : 0);
    }, 0) || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-semibold mb-2" data-testid="text-dashboard-title">
          Commission Dashboard
        </h1>
        <p className="text-muted-foreground">
          Track your commissions, view your profile, and monitor tier progress
        </p>
      </div>

      <Tabs defaultValue="history" className="space-y-6">
        <TabsList data-testid="tabs-dashboard">
          <TabsTrigger value="profile" data-testid="tab-profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            <DollarSign className="h-4 w-4 mr-2" />
            Sales History
          </TabsTrigger>
          <TabsTrigger value="tiers" data-testid="tab-tiers">
            <BarChart3 className="h-4 w-4 mr-2" />
            Tier Progress
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          {profileLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-48" />
            </div>
          ) : profile ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">First Name</p>
                      <p className="font-medium" data-testid="text-profile-first-name">{profile.firstName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Name</p>
                      <p className="font-medium" data-testid="text-profile-last-name">{profile.lastName}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium" data-testid="text-profile-email">{profile.email}</p>
                  </div>
                  {profile.phoneNumber && (
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium" data-testid="text-profile-phone">{profile.phoneNumber}</p>
                    </div>
                  )}
                  {profile.territory && (
                    <div>
                      <p className="text-sm text-muted-foreground">Territory</p>
                      <p className="font-medium" data-testid="text-profile-territory">{profile.territory}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Commission Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Commission Structure</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={profile.commissionType === 'tiered' ? 'default' : 'secondary'} data-testid="badge-commission-type">
                        {profile.commissionType === 'tiered' ? 'Tiered (Marginal Brackets)' : 'Flat Rate'}
                      </Badge>
                    </div>
                  </div>
                  {profile.commissionType === 'flat' && (
                    <div>
                      <p className="text-sm text-muted-foreground">Flat Rate</p>
                      <p className="text-2xl font-semibold" data-testid="text-profile-flat-rate">
                        {Number(profile.commissionPercentage).toFixed(2)}%
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={profile.active ? 'default' : 'secondary'} data-testid="badge-profile-status">
                      {profile.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Member Since</p>
                    <p className="font-medium" data-testid="text-profile-member-since">
                      {format(new Date(profile.createdAt), "MMMM d, yyyy")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Unable to load profile information</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Sales History Tab */}
        <TabsContent value="history" className="space-y-6">
          {commissionsLoading ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Pending Commissions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-semibold" data-testid="text-pending-total">
                        ${pendingTotal.toFixed(2)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {commissions?.filter((c) => c.status === "pending").length || 0} orders
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Awaiting order approval
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Earned (Not Paid)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-semibold" data-testid="text-earned-total">
                        ${earnedTotal.toFixed(2)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {commissions?.filter((c) => c.status === "earned" && !c.paidToSalesRep).length || 0} orders
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Ready for payroll
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Paid Out
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-semibold" data-testid="text-paid-total">
                        ${paidTotal.toFixed(2)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {commissions?.filter((c) => c.paidToSalesRep).length || 0} orders
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Commission paid
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-4">All Commissions</h2>
                {!commissions || commissions.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">No commissions yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {commissions.map((commission) => (
                      <Card key={commission.id} data-testid={`commission-card-${commission.id}`}>
                        <CardHeader>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <CardTitle className="font-serif text-lg mb-2">
                                Order #{commission.order?.orderNumber || commission.orderNumber}
                              </CardTitle>
                              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                {commission.order?.customer && (
                                  <div className="flex items-center gap-1">
                                    <span>{commission.order.customer.accountName}</span>
                                  </div>
                                )}
                                {commission.order?.orderDate && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {format(new Date(commission.order.orderDate), "MMM d, yyyy")}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 items-start flex-wrap">
                              <Badge variant={getOrderStatusBadgeVariant(commission.order?.status || "")}>
                                {getOrderStatusLabel(commission.order?.status || "")}
                              </Badge>
                              <Badge
                                variant={getCommissionStatusBadgeVariant(commission.status, commission.paidToSalesRep)}
                              >
                                {commission.paidToSalesRep
                                  ? "Paid"
                                  : commission.status === "pending"
                                    ? "Pending"
                                    : "Earned"}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Order Total</p>
                              <p className="font-semibold">
                                ${Number(commission.orderTotal).toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Commission Rate</p>
                              <p className="font-semibold">
                                {Number(commission.commissionPercentage).toFixed(2)}%
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Commission Amount</p>
                              <p className="font-semibold">
                                ${Number(commission.commissionAmount).toFixed(2)}
                              </p>
                            </div>
                            {commission.paidToSalesRepAt && (
                              <div>
                                <p className="text-muted-foreground">Paid Date</p>
                                <p className="font-semibold">
                                  {format(new Date(commission.paidToSalesRepAt), "MMM d, yyyy")}
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* Tier Progress Tab */}
        <TabsContent value="tiers" className="space-y-6">
          {tierLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-48" />
            </div>
          ) : tierProgress ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      YTD Sales ({tierProgress.year})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="text-2xl font-semibold" data-testid="text-ytd-sales">
                      ${tierProgress.ytdSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      YTD Commission Earned
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="text-2xl font-semibold" data-testid="text-ytd-commission">
                      ${tierProgress.totalCommission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Effective Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="text-2xl font-semibold" data-testid="text-effective-rate">
                      {tierProgress.effectiveRate.toFixed(2)}%
                    </span>
                  </CardContent>
                </Card>
              </div>

              {tierProgress.commissionType === 'flat' ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Flat Rate Commission</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Your commission is calculated at a flat rate of{" "}
                      <span className="font-semibold text-foreground">{tierProgress.flatRate}%</span>{" "}
                      on all orders. Tier-based progression does not apply to your account.
                    </p>
                  </CardContent>
                </Card>
              ) : tierProgress.tierProgress && tierProgress.tierProgress.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tier Progression</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {tierProgress.tierProgress.map((tier, index) => {
                      const isLocked = !tier.isComplete && !tier.isActive && tierProgress.ytdSales < tier.minSales;
                      return (
                        <div key={tier.tierName} data-testid={`tier-progress-${index}`} className="space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              {tier.isComplete ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                              ) : tier.isActive ? (
                                <ArrowRight className="h-5 w-5 text-primary" />
                              ) : (
                                <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                              )}
                              <span className="font-semibold">{tier.tierName}</span>
                              <Badge variant="secondary" className="text-xs">
                                {tier.ratePercent}%
                              </Badge>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              ${tier.minSales.toLocaleString('en-US')}
                              {tier.maxSales ? ` - $${tier.maxSales.toLocaleString('en-US')}` : '+'}
                            </span>
                          </div>

                          <Progress value={tier.progress} className="h-2" />

                          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground flex-wrap">
                            <span>
                              ${tier.salesInTier.toLocaleString('en-US', { minimumFractionDigits: 2 })} earned in tier
                            </span>
                            {tier.isComplete ? (
                              <span className="text-green-600 dark:text-green-400 font-medium">Complete</span>
                            ) : tier.isActive && tier.remaining !== null ? (
                              <span>${tier.remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })} to next tier</span>
                            ) : isLocked ? (
                              <span>Locked</span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No commission tiers configured</p>
                  </CardContent>
                </Card>
              )}

              {tierProgress.tierBreakdown && tierProgress.tierBreakdown.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">YTD Commission Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="pb-2 pr-4 font-medium text-muted-foreground">Tier</th>
                            <th className="pb-2 pr-4 font-medium text-muted-foreground text-right">Rate</th>
                            <th className="pb-2 pr-4 font-medium text-muted-foreground text-right">Sales in Tier</th>
                            <th className="pb-2 font-medium text-muted-foreground text-right">Commission</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tierProgress.tierBreakdown.map((item, i) => (
                            <tr key={i} className="border-b last:border-0">
                              <td className="py-2 pr-4">{item.tierName}</td>
                              <td className="py-2 pr-4 text-right">{item.ratePercent}%</td>
                              <td className="py-2 pr-4 text-right">
                                ${item.salesInTier.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 text-right font-medium">
                                ${item.commissionInTier.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                          <tr className="font-semibold">
                            <td className="pt-2 pr-4" colSpan={2}>Total</td>
                            <td className="pt-2 pr-4 text-right">
                              ${tierProgress.ytdSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="pt-2 text-right">
                              ${tierProgress.totalCommission.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Unable to load tier progress</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
