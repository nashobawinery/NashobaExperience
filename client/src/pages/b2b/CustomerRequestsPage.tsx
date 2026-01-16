import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Clock, CheckCircle, XCircle, Edit2 } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

type CustomerRequest = {
  id: string;
  accountName: string;
  customerType: string | null;
  primaryContactName: string;
  emailAddress: string;
  phoneNumber: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  salesRep: {
    firstName: string;
    lastName: string;
  };
  tier?: {
    name: string;
  } | null;
};

type TierPricing = {
  id: string;
  name: string;
};

export default function CustomerRequestsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<CustomerRequest | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery<CustomerRequest[]>({
    queryKey: ["/api/b2b/customer-requests"],
  });

  const { data: tiers } = useQuery<TierPricing[]>({
    queryKey: ["/api/b2b/admin/tiers"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/b2b/customer-requests", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/b2b/customer-requests"] });
      setIsDialogOpen(false);
      toast({
        title: "Request Submitted",
        description: "Your customer request has been submitted for approval.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit request",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PUT", `/api/b2b/customer-requests/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/b2b/customer-requests"] });
      setIsDialogOpen(false);
      setEditingRequest(null);
      toast({
        title: "Request Updated",
        description: "Your customer request has been resubmitted for approval.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update request",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      accountName: formData.get("accountName"),
      customerType: formData.get("customerType") || null,
      primaryContactName: formData.get("primaryContactName"),
      primaryContactRole: formData.get("primaryContactRole") || null,
      emailAddress: formData.get("emailAddress"),
      phoneNumber: formData.get("phoneNumber"),
      altPhoneNumber: formData.get("altPhoneNumber") || null,
      billingAddress: formData.get("billingAddress") || null,
      billingCity: formData.get("billingCity") || null,
      billingState: formData.get("billingState") || null,
      billingZipCode: formData.get("billingZipCode") || null,
      shippingAddress: formData.get("shippingAddress") || null,
      shippingCity: formData.get("shippingCity") || null,
      shippingState: formData.get("shippingState") || null,
      shippingZipCode: formData.get("shippingZipCode") || null,
      pricingTierId: formData.get("pricingTierId") || null,
      notes: formData.get("notes") || null,
    };

    if (editingRequest) {
      updateMutation.mutate({ id: editingRequest.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditDialog = (request: CustomerRequest) => {
    setEditingRequest(request);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingRequest(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-600">
            <CheckCircle className="h-3 w-3" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-semibold mb-2">Customer Requests</h1>
          <p className="text-muted-foreground">
            Submit new customers for admin approval
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) closeDialog();
          else setIsDialogOpen(true);
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-customer-request">
              <Plus className="h-4 w-4 mr-2" />
              New Customer Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRequest ? "Edit Customer Request" : "Submit Customer for Approval"}
              </DialogTitle>
              <DialogDescription>
                {editingRequest
                  ? "Update the customer information and resubmit for approval."
                  : "Fill in the customer details. An admin will review and approve the request."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accountName">Business Name *</Label>
                  <Input
                    id="accountName"
                    name="accountName"
                    required
                    defaultValue={editingRequest?.accountName || ""}
                    data-testid="input-account-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerType">Customer Type</Label>
                  <Select name="customerType" defaultValue={editingRequest?.customerType || ""}>
                    <SelectTrigger data-testid="select-customer-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retail_liquor">Retail Liquor</SelectItem>
                      <SelectItem value="restaurant">Restaurant</SelectItem>
                      <SelectItem value="private_club">Private Club</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryContactName">Primary Contact Name *</Label>
                  <Input
                    id="primaryContactName"
                    name="primaryContactName"
                    required
                    defaultValue={editingRequest?.primaryContactName || ""}
                    data-testid="input-contact-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primaryContactRole">Contact Role</Label>
                  <Input
                    id="primaryContactRole"
                    name="primaryContactRole"
                    placeholder="e.g. Owner, Manager"
                    data-testid="input-contact-role"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emailAddress">Email Address *</Label>
                  <Input
                    id="emailAddress"
                    name="emailAddress"
                    type="email"
                    required
                    defaultValue={editingRequest?.emailAddress || ""}
                    data-testid="input-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number *</Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    required
                    defaultValue={editingRequest?.phoneNumber || ""}
                    data-testid="input-phone"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="altPhoneNumber">Alternate Phone</Label>
                <Input
                  id="altPhoneNumber"
                  name="altPhoneNumber"
                  data-testid="input-alt-phone"
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Billing Address</h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="billingAddress">Street Address</Label>
                    <Input id="billingAddress" name="billingAddress" data-testid="input-billing-address" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="billingCity">City</Label>
                      <Input id="billingCity" name="billingCity" data-testid="input-billing-city" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="billingState">State</Label>
                      <Input id="billingState" name="billingState" data-testid="input-billing-state" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="billingZipCode">ZIP Code</Label>
                      <Input id="billingZipCode" name="billingZipCode" data-testid="input-billing-zip" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Shipping Address</h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="shippingAddress">Street Address</Label>
                    <Input id="shippingAddress" name="shippingAddress" data-testid="input-shipping-address" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="shippingCity">City</Label>
                      <Input id="shippingCity" name="shippingCity" data-testid="input-shipping-city" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shippingState">State</Label>
                      <Input id="shippingState" name="shippingState" data-testid="input-shipping-state" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shippingZipCode">ZIP Code</Label>
                      <Input id="shippingZipCode" name="shippingZipCode" data-testid="input-shipping-zip" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pricingTierId">Suggested Pricing Tier</Label>
                  <Select name="pricingTierId">
                    <SelectTrigger data-testid="select-pricing-tier">
                      <SelectValue placeholder="Select tier (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiers?.map((tier) => (
                        <SelectItem key={tier.id} value={tier.id}>
                          {tier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Any additional information about this customer..."
                    data-testid="input-notes"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-request"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Submitting..."
                    : editingRequest
                    ? "Resubmit Request"
                    : "Submit Request"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {requests?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No customer requests yet. Click "New Customer Request" to submit your first one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests?.map((request) => (
            <Card key={request.id} data-testid={`card-request-${request.id}`}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap justify-between items-start gap-2">
                  <div>
                    <CardTitle className="text-lg">{request.accountName}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {request.primaryContactName} • {request.emailAddress}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(request.status)}
                    {(request.status === "pending" || request.status === "rejected") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(request)}
                        data-testid={`button-edit-${request.id}`}
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>{" "}
                    <span className="capitalize">{request.customerType?.replace("_", " ") || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span> {request.phoneNumber}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Submitted:</span>{" "}
                    {format(new Date(request.createdAt), "MMM d, yyyy")}
                  </div>
                  {request.reviewedAt && (
                    <div>
                      <span className="text-muted-foreground">Reviewed:</span>{" "}
                      {format(new Date(request.reviewedAt), "MMM d, yyyy")}
                    </div>
                  )}
                </div>
                {request.status === "rejected" && request.rejectionReason && (
                  <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm font-medium text-destructive">Rejection Reason:</p>
                    <p className="text-sm text-destructive/90">{request.rejectionReason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
