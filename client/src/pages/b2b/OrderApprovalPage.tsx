import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Package, CheckCircle, XCircle, AlertCircle, Truck, FileText } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type OrderData = {
  order: {
    id: string;
    orderNumber: string;
    orderDate: string;
    scheduledDeliveryDate: string;
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

export default function OrderApprovalPage() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [result, setResult] = useState<'approved' | 'rejected' | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data, isLoading, error } = useQuery<OrderData>({
    queryKey: ['/api/b2b/order-workflow/approval', token],
    queryFn: async () => {
      const response = await fetch(`/api/b2b/order-workflow/approval/${token}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch order');
      }
      return response.json();
    },
    enabled: !!token,
    retry: false,
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/b2b/order-workflow/approval/${token}`, { action: 'approve' });
    },
    onSuccess: () => {
      setResult('approved');
      toast({
        title: "Order Approved",
        description: "Invoice has been sent to the customer.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve order",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => {
      return apiRequest('POST', `/api/b2b/order-workflow/approval/${token}`, { action: 'reject', rejectionReason: reason });
    },
    onSuccess: () => {
      setResult('rejected');
      setShowRejectDialog(false);
      toast({
        title: "Order Rejected",
        description: "The customer has been notified.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject order",
        variant: "destructive",
      });
    },
  });

  const handleReject = () => {
    rejectMutation.mutate(rejectionReason);
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
              {(error as Error)?.message || "This link may have expired or the order has already been processed."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (result === 'approved') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <CardTitle>Order Approved</CardTitle>
            <CardDescription>
              The invoice has been sent to {data.customer?.accountName}.
              The order status is now "Approved - Delivery Pending".
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (result === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Order Rejected</CardTitle>
            <CardDescription>
              The customer has been notified that their order could not be processed.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Order Approval</h1>
          <p className="text-muted-foreground mt-2">
            Review and approve or reject this order
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Preview - Order {data.order.orderNumber}
              </CardTitle>
              <Badge variant="secondary">Pending Approval</Badge>
            </div>
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
                    {data.customer.phoneNumber && <p>{data.customer.phoneNumber}</p>}
                  </div>
                )}
              </div>

              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-900">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Scheduled Delivery
                </h4>
                <p className="text-lg font-semibold text-green-700 dark:text-green-400">
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
                    <th className="text-right p-3 text-sm font-medium">Unit Price</th>
                    <th className="text-right p-3 text-sm font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-3 text-sm">{item.productName}</td>
                      <td className="p-3 text-sm text-center">{item.quantity}</td>
                      <td className="p-3 text-sm text-right">${item.unitPrice}</td>
                      <td className="p-3 text-sm text-right">${item.lineTotal}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30">
                  <tr className="border-t">
                    <td colSpan={3} className="p-3 text-right font-medium">Order Total:</td>
                    <td className="p-3 text-right font-bold text-lg">${data.order.total}</td>
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

            {data.order.notes && (
              <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-200 dark:border-yellow-900">
                <h4 className="font-medium mb-2">Order Notes</h4>
                <p className="text-sm">{data.order.notes}</p>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                className="flex-1"
                data-testid="button-approve"
              >
                {approveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve & Send Invoice
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowRejectDialog(true)}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                className="flex-1"
                data-testid="button-reject"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject Order
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Order</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this order. This will be shared with the customer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Reason (optional)</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter the reason for rejection..."
                data-testid="input-rejection-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Confirm Rejection"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
