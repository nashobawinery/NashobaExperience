import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, CalendarIcon, Package, CheckCircle, AlertCircle } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type OrderData = {
  order: {
    id: string;
    orderNumber: string;
    orderDate: string;
    total: string;
    subtotal: string;
    status: string;
    notes: string | null;
    shippingAddress: string | null;
    shippingCity: string | null;
    shippingState: string | null;
    shippingZipCode: string | null;
  };
  customer: {
    accountName: string;
    primaryContactName: string;
    emailAddress: string;
    phoneNumber: string | null;
  } | null;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
  }>;
};

export default function OrderDeliveryDatePage() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [date, setDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { data, isLoading, error } = useQuery<OrderData>({
    queryKey: ['/api/b2b/order-workflow/delivery-date', token],
    queryFn: async () => {
      const response = await fetch(`/api/b2b/order-workflow/delivery-date/${token}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch order');
      }
      return response.json();
    },
    enabled: !!token,
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: async (deliveryDate: Date) => {
      return apiRequest('POST', `/api/b2b/order-workflow/delivery-date/${token}`, { deliveryDate: deliveryDate.toISOString() });
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Delivery Date Set",
        description: "The order has been sent to an administrator for approval.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set delivery date",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!date) {
      toast({
        title: "Select a Date",
        description: "Please select a delivery date",
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate(date);
  };

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
              {(error as Error)?.message || "This link may have expired or the delivery date has already been set."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <CardTitle>Delivery Date Set</CardTitle>
            <CardDescription>
              The delivery date has been set for {date ? format(date, 'EEEE, MMMM d, yyyy') : ''}.
              The order has been sent to an administrator for approval.
              You will receive a notification once the order is approved.
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
          <h1 className="text-2xl font-bold text-foreground">Set Delivery Date</h1>
          <p className="text-muted-foreground mt-2">
            Please select a delivery date for this order
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order {data.order.orderNumber}
              </CardTitle>
              <Badge variant="outline">
                {new Date(data.order.orderDate).toLocaleDateString('en-US')}
              </Badge>
            </div>
            {data.customer && (
              <CardDescription>
                {data.customer.accountName} - {data.customer.primaryContactName}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
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

            {data.order.shippingAddress && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Shipping Address</h4>
                <p className="text-sm text-muted-foreground">
                  {data.order.shippingAddress}<br />
                  {data.order.shippingCity}, {data.order.shippingState} {data.order.shippingZipCode}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <h4 className="font-medium">Select Delivery Date</h4>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                    data-testid="button-select-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "EEEE, MMMM d, yyyy") : "Select delivery date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Button
                onClick={handleSubmit}
                disabled={!date || submitMutation.isPending}
                className="w-full"
                data-testid="button-submit-date"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Set Delivery Date & Submit for Approval"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
