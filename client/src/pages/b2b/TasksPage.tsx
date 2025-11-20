import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Package, DollarSign, CheckCircle2, Truck, CreditCard, ArrowRight } from "lucide-react";
import { format } from "date-fns";

type B2bOrder = {
  id: string;
  orderNumber: string;
  orderDate: string;
  status: string;
  subtotal: string;
  tax: string;
  total: string;
  deliveredAt?: string;
  paidAt?: string;
  completedAt?: string;
  customer: {
    id: string;
    accountName: string;
    primaryContactName: string;
    emailAddress: string;
  };
};

export default function TasksPage() {
  const { toast } = useToast();
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const { data: orders, isLoading } = useQuery<B2bOrder[]>({
    queryKey: ['/api/b2b/admin/orders'],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      return await apiRequest("PATCH", `/api/b2b/admin/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/b2b/admin/orders'] });
      toast({
        title: "Success",
        description: "Order status updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update order status",
        variant: "destructive",
      });
    },
  });

  const toggleOrderExpanded = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return 'secondary';
      case 'awaiting_delivery':
        return 'default';
      case 'awaiting_payment':
        return 'default';
      case 'completed':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return 'Waiting Approval';
      case 'awaiting_delivery':
        return 'Awaiting Delivery';
      case 'awaiting_payment':
        return 'Awaiting Payment';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending_approval':
        return 'awaiting_delivery';
      case 'awaiting_delivery':
        return 'awaiting_payment';
      case 'awaiting_payment':
        return 'completed';
      default:
        return null;
    }
  };

  const getNextStatusButton = (order: B2bOrder) => {
    const nextStatus = getNextStatus(order.status);
    if (!nextStatus) return null;

    const buttonLabels: Record<string, { label: string; icon: React.ReactNode }> = {
      'awaiting_delivery': { label: 'Approve Order', icon: <CheckCircle2 className="h-4 w-4" /> },
      'awaiting_payment': { label: 'Confirm Delivery', icon: <Truck className="h-4 w-4" /> },
      'completed': { label: 'Confirm Payment', icon: <CreditCard className="h-4 w-4" /> },
    };

    const { label, icon } = buttonLabels[nextStatus] || { label: 'Next Step', icon: <ArrowRight className="h-4 w-4" /> };

    return (
      <Button
        onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: nextStatus })}
        disabled={updateStatusMutation.isPending}
        size="sm"
        data-testid={`button-update-status-${order.id}`}
      >
        {icon}
        <span className="ml-2">{label}</span>
      </Button>
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const ordersByStatus = {
    pending_approval: orders?.filter(o => o.status === 'pending_approval') || [],
    awaiting_delivery: orders?.filter(o => o.status === 'awaiting_delivery') || [],
    awaiting_payment: orders?.filter(o => o.status === 'awaiting_payment') || [],
    completed: orders?.filter(o => o.status === 'completed') || [],
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-serif font-semibold mb-8">Order Workflow</h1>

      <div className="space-y-8">
        {/* Pending Approval */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-yellow-500" />
            Waiting Approval
            <Badge variant="secondary">{ordersByStatus.pending_approval.length}</Badge>
          </h2>
          <div className="space-y-4">
            {ordersByStatus.pending_approval.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No orders pending approval
                </CardContent>
              </Card>
            ) : (
              ordersByStatus.pending_approval.map(order => (
                <Card key={order.id} data-testid={`order-card-${order.id}`}>
                  <CardHeader>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="font-serif text-xl mb-2">
                          Order #{order.orderNumber}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(order.orderDate), "MMM d, yyyy")}
                          </div>
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4" />
                            {order.customer.accountName}
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            ${parseFloat(order.total).toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(order.status)}>
                          {getStatusLabel(order.status)}
                        </Badge>
                        {getNextStatusButton(order)}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Awaiting Delivery */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            Awaiting Delivery
            <Badge variant="secondary">{ordersByStatus.awaiting_delivery.length}</Badge>
          </h2>
          <div className="space-y-4">
            {ordersByStatus.awaiting_delivery.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No orders awaiting delivery
                </CardContent>
              </Card>
            ) : (
              ordersByStatus.awaiting_delivery.map(order => (
                <Card key={order.id} data-testid={`order-card-${order.id}`}>
                  <CardHeader>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="font-serif text-xl mb-2">
                          Order #{order.orderNumber}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(order.orderDate), "MMM d, yyyy")}
                          </div>
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4" />
                            {order.customer.accountName}
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            ${parseFloat(order.total).toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(order.status)}>
                          {getStatusLabel(order.status)}
                        </Badge>
                        {getNextStatusButton(order)}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Awaiting Payment */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-orange-500" />
            Awaiting Payment
            <Badge variant="secondary">{ordersByStatus.awaiting_payment.length}</Badge>
          </h2>
          <div className="space-y-4">
            {ordersByStatus.awaiting_payment.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No orders awaiting payment
                </CardContent>
              </Card>
            ) : (
              ordersByStatus.awaiting_payment.map(order => (
                <Card key={order.id} data-testid={`order-card-${order.id}`}>
                  <CardHeader>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="font-serif text-xl mb-2">
                          Order #{order.orderNumber}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(order.orderDate), "MMM d, yyyy")}
                          </div>
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4" />
                            {order.customer.accountName}
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            ${parseFloat(order.total).toFixed(2)}
                          </div>
                          {order.deliveredAt && (
                            <div className="flex items-center gap-1">
                              <Truck className="h-4 w-4" />
                              Delivered {format(new Date(order.deliveredAt), "MMM d, yyyy")}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(order.status)}>
                          {getStatusLabel(order.status)}
                        </Badge>
                        {getNextStatusButton(order)}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Completed */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            Completed
            <Badge variant="secondary">{ordersByStatus.completed.length}</Badge>
          </h2>
          <div className="space-y-4">
            {ordersByStatus.completed.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No completed orders
                </CardContent>
              </Card>
            ) : (
              ordersByStatus.completed.slice(0, 10).map(order => (
                <Card key={order.id} data-testid={`order-card-${order.id}`}>
                  <CardHeader>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="font-serif text-xl mb-2">
                          Order #{order.orderNumber}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(order.orderDate), "MMM d, yyyy")}
                          </div>
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4" />
                            {order.customer.accountName}
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            ${parseFloat(order.total).toFixed(2)}
                          </div>
                          {order.completedAt && (
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="h-4 w-4" />
                              Completed {format(new Date(order.completedAt), "MMM d, yyyy")}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant={getStatusBadgeVariant(order.status)}>
                        {getStatusLabel(order.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
            {ordersByStatus.completed.length > 10 && (
              <Card>
                <CardContent className="p-4 text-center text-sm text-muted-foreground">
                  Showing 10 most recent completed orders
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
