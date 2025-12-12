import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, CheckCircle, AlertCircle, Truck } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type OrderData = {
  order: {
    id: string;
    orderNumber: string;
    invoiceNumber: string;
    orderDate: string;
    scheduledDeliveryDate: string;
    total: string;
    subtotal: string;
    status: string;
  };
  customer: {
    accountName: string;
    primaryContactName: string;
    emailAddress: string;
  } | null;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
  }>;
};

export default function OrderDeliveryConfirmPage() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [isConfirmed, setIsConfirmed] = useState(false);

  const { data, isLoading, error } = useQuery<OrderData>({
    queryKey: ['/api/b2b/order-workflow/delivery-confirm', token],
    queryFn: async () => {
      const response = await fetch(`/api/b2b/order-workflow/delivery-confirm/${token}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch order');
      }
      return response.json();
    },
    enabled: !!token,
    retry: false,
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/b2b/order-workflow/delivery-confirm/${token}`, {});
    },
    onSuccess: () => {
      setIsConfirmed(true);
      toast({
        title: "Delivery Confirmed",
        description: "Order status updated to Delivered - Pending Payment.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to confirm delivery",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Unable to Load Order</CardTitle>
            <CardDescription>
              {(error as Error)?.message || "This link may have expired or delivery has already been confirmed."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isConfirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <CardTitle>Delivery Confirmed</CardTitle>
            <CardDescription>
              Thank you for confirming delivery of order {data.order.orderNumber}.
              The order status has been updated to "Delivered - Pending Payment".
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Confirm Delivery</h1>
          <p className="text-muted-foreground mt-2">
            Please confirm that this order has been delivered
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Order {data.order.orderNumber}
              </CardTitle>
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
                Delivery Pending
              </Badge>
            </div>
            {data.order.invoiceNumber && (
              <CardDescription>Invoice #{data.order.invoiceNumber}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Customer</h4>
                {data.customer && (
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">{data.customer.accountName}</p>
                    <p>{data.customer.primaryContactName}</p>
                    <p>{data.customer.emailAddress}</p>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-900">
                <h4 className="font-medium mb-2">Scheduled Delivery Date</h4>
                <p className="text-lg font-semibold text-blue-700 dark:text-blue-400">
                  {data.order.scheduledDeliveryDate
                    ? format(new Date(data.order.scheduledDeliveryDate), 'EEEE, MMMM d, yyyy')
                    : 'Not set'}
                </p>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Product</th>
                    <th className="text-center p-3 text-sm font-medium">Qty</th>
                    <th className="text-right p-3 text-sm font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-3 text-sm">{item.productName}</td>
                      <td className="p-3 text-sm text-center">{item.quantity}</td>
                      <td className="p-3 text-sm text-right">${item.lineTotal}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30">
                  <tr className="border-t">
                    <td colSpan={2} className="p-3 text-right font-medium">Total:</td>
                    <td className="p-3 text-right font-bold">${data.order.total}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-900">
              <p className="text-sm text-center">
                By clicking the button below, you confirm that this order has been successfully delivered to the customer.
              </p>
            </div>

            <Button
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending}
              className="w-full"
              size="lg"
              data-testid="button-confirm-delivery"
            >
              {confirmMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirm Delivery
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
