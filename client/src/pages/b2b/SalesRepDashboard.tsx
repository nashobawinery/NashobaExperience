import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useB2bAuth } from "@/contexts/B2bAuthContext";
import { Calendar, DollarSign, TrendingUp } from "lucide-react";
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

export default function SalesRepDashboard() {
  const { user } = useB2bAuth();

  const { data: commissions, isLoading } = useQuery<Commission[]>({
    queryKey: ["b2b", "sales-rep", "commissions"],
    queryFn: async () => {
      const response = await fetch("/api/b2b/sales-rep/commissions");
      if (!response.ok) throw new Error("Failed to fetch commissions");
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
        return "secondary";
      case "awaiting_delivery":
      case "awaiting_payment":
        return "default";
      case "completed":
        return "default";
      default:
        return "secondary";
    }
  };

  const getCommissionStatusBadgeVariant = (status: string, paid: boolean) => {
    if (paid) return "default";
    if (status === "pending") return "secondary";
    if (status === "earned") return "default";
    return "secondary";
  };

  // Calculate totals
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

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-serif font-semibold mb-8">
          Commission Dashboard
        </h1>
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
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-semibold mb-2">
          Commission Dashboard
        </h1>
        <p className="text-muted-foreground">
          Track your commissions throughout the order workflow
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Commissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold">
                ${pendingTotal.toFixed(2)}
              </span>
              <span className="text-sm text-muted-foreground">
                {commissions?.filter((c) => c.status === "pending").length || 0}{" "}
                orders
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
              <span className="text-2xl font-semibold">
                ${earnedTotal.toFixed(2)}
              </span>
              <span className="text-sm text-muted-foreground">
                {commissions?.filter(
                  (c) => c.status === "earned" && !c.paidToSalesRep
                ).length || 0}{" "}
                orders
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
              <span className="text-2xl font-semibold">
                ${paidTotal.toFixed(2)}
              </span>
              <span className="text-sm text-muted-foreground">
                {commissions?.filter((c) => c.paidToSalesRep).length || 0}{" "}
                orders
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Commission paid
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Commissions List */}
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
                            {format(
                              new Date(commission.order.orderDate),
                              "MMM d, yyyy"
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 items-start flex-wrap">
                      <Badge variant={getOrderStatusBadgeVariant(commission.order?.status || "")}>
                        {getOrderStatusLabel(commission.order?.status || "")}
                      </Badge>
                      <Badge
                        variant={getCommissionStatusBadgeVariant(
                          commission.status,
                          commission.paidToSalesRep
                        )}
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
                      <p className="font-semibold text-primary">
                        ${Number(commission.commissionAmount).toFixed(2)}
                      </p>
                    </div>
                    {commission.paidToSalesRepAt && (
                      <div>
                        <p className="text-muted-foreground">Paid Date</p>
                        <p className="font-semibold">
                          {format(
                            new Date(commission.paidToSalesRepAt),
                            "MMM d, yyyy"
                          )}
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
    </div>
  );
}
