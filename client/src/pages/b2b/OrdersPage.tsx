import { useB2bOrders } from "@/hooks/useB2bOrders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Calendar, DollarSign, Truck, Clock, CheckCircle, FileText } from "lucide-react";
import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function getOrderStatusLabel(status: string): string {
  switch (status) {
    case 'pending_delivery_date':
      return 'Processing';
    case 'pending_approval':
      return 'Awaiting Confirmation';
    case 'awaiting_delivery':
      return 'Scheduled for Delivery';
    case 'awaiting_payment':
      return 'Delivered - Payment Due';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

function getOrderStatusDescription(status: string): string {
  switch (status) {
    case 'pending_delivery_date':
      return 'Your order is being processed and a delivery date will be scheduled soon.';
    case 'pending_approval':
      return 'Your delivery date has been set and the order is being prepared.';
    case 'awaiting_delivery':
      return 'Your order has been approved and is scheduled for delivery.';
    case 'awaiting_payment':
      return 'Your order has been delivered. Payment is now due.';
    case 'completed':
      return 'Your order has been completed. Thank you for your business!';
    case 'cancelled':
      return 'This order has been cancelled.';
    default:
      return '';
  }
}

function getOrderStatusIcon(status: string) {
  switch (status) {
    case 'pending_delivery_date':
      return <Clock className="h-4 w-4" />;
    case 'pending_approval':
      return <FileText className="h-4 w-4" />;
    case 'awaiting_delivery':
      return <Truck className="h-4 w-4" />;
    case 'awaiting_payment':
      return <DollarSign className="h-4 w-4" />;
    case 'completed':
      return <CheckCircle className="h-4 w-4" />;
    default:
      return null;
  }
}

function getOrderStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case 'completed':
      return 'default';
    case 'cancelled':
      return 'destructive';
    case 'awaiting_payment':
      return 'outline';
    default:
      return 'secondary';
  }
}

export default function OrdersPage() {
  const { data: orders, isLoading, isError, error } = useB2bOrders();

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <Package className="h-16 w-16 mx-auto mb-4 text-destructive" />
          <h3 className="text-lg font-medium mb-2">Error Loading Orders</h3>
          <p className="text-muted-foreground">{error?.message || 'Failed to load order history'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-serif font-semibold mb-8">Order History</h1>

      {!orders || orders.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No orders yet</h3>
          <p className="text-muted-foreground">Your order history will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} data-testid={`order-${order.id}`}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
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
                        {order.totalCases} case(s)
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        ${Number(order.totalAmount || 0).toFixed(2)}
                      </div>
                      {(order as any).deliveryDate && (
                        <div className="flex items-center gap-1">
                          <Truck className="h-4 w-4" />
                          Delivery: {format(new Date((order as any).deliveryDate), "MMM d, yyyy")}
                        </div>
                      )}
                    </div>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant={getOrderStatusVariant(order.status)}
                        className="flex items-center gap-1 cursor-help"
                        data-testid={`status-badge-${order.id}`}
                      >
                        {getOrderStatusIcon(order.status)}
                        {getOrderStatusLabel(order.status)}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{getOrderStatusDescription(order.status)}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm mb-3">Order Items:</h4>
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-sm py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-muted-foreground">SKU: {item.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${Number(item.totalPrice || 0).toFixed(2)}</p>
                        <p className="text-muted-foreground text-xs">
                          {item.quantity} case(s) @ ${Number(item.unitPrice || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
