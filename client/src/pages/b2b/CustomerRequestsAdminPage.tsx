import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle, XCircle, User, Building, Mail, Phone, MapPin, FileText, Eye, Loader2, Search } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

type CustomerRequest = {
  id: string;
  accountName: string;
  customerType: string | null;
  primaryContactName: string;
  primaryContactRole: string | null;
  emailAddress: string;
  phoneNumber: string;
  altPhoneNumber: string | null;
  licenseNumber: string | null;
  taxId: string | null;
  billingAddress: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingZipCode: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingZipCode: string | null;
  notes: string | null;
  status: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  salesRep: {
    id: string;
    firstName: string;
    lastName: string;
  };
  tier?: {
    id: string;
    name: string;
  } | null;
  pricingTierId: string | null;
};

type TierPricing = {
  id: string;
  name: string;
};

export default function CustomerRequestsAdminPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [viewingRequest, setViewingRequest] = useState<CustomerRequest | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery<CustomerRequest[]>({
    queryKey: ["/api/b2b/admin/customer-requests"],
  });

  const { data: tiers } = useQuery<TierPricing[]>({
    queryKey: ["/api/b2b/admin/tiers"],
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, tierId }: { id: string; tierId: string }) => {
      return apiRequest("POST", `/api/b2b/admin/customer-requests/${id}/approve`, { tierId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/b2b/admin/customer-requests"] });
      setApproveDialogOpen(false);
      setViewingRequest(null);
      setIsViewDialogOpen(false);
      setSelectedTierId("");
      toast({
        title: "Customer Approved",
        description: "The customer has been created and can now log in.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve customer request",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return apiRequest("POST", `/api/b2b/admin/customer-requests/${id}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/b2b/admin/customer-requests"] });
      setRejectDialogOpen(false);
      setViewingRequest(null);
      setIsViewDialogOpen(false);
      setRejectionReason("");
      toast({
        title: "Request Rejected",
        description: "The customer request has been rejected.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject customer request",
        variant: "destructive",
      });
    },
  });

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
          <Badge className="bg-green-600 hover:bg-green-700 flex items-center gap-1">
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
        return <Badge>{status}</Badge>;
    }
  };

  const getCustomerTypeLabel = (type: string | null) => {
    if (!type) return "Not specified";
    const labels: Record<string, string> = {
      retail_liquor: "Retail Liquor",
      restaurant: "Restaurant",
      private_club: "Private Club",
      other: "Other",
    };
    return labels[type] || type;
  };

  const filteredRequests = requests?.filter((request) => {
    const matchesSearch =
      request.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.primaryContactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.emailAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${request.salesRep.firstName} ${request.salesRep.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleApprove = () => {
    if (!viewingRequest || !selectedTierId) return;
    approveMutation.mutate({ id: viewingRequest.id, tierId: selectedTierId });
  };

  const handleReject = () => {
    if (!viewingRequest) return;
    rejectMutation.mutate({ id: viewingRequest.id, reason: rejectionReason });
  };

  const openViewDialog = (request: CustomerRequest) => {
    setViewingRequest(request);
    setSelectedTierId(request.pricingTierId || "");
    setIsViewDialogOpen(true);
  };

  const pendingCount = requests?.filter(r => r.status === "pending").length || 0;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                Customer Request Review
                {pendingCount > 0 && (
                  <Badge variant="destructive">{pendingCount} pending</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Review and approve customer requests submitted by sales representatives
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by business name, contact, email, or sales rep..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-customer-requests"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value: "all" | "pending" | "approved" | "rejected") => setStatusFilter(value)}
            >
              <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredRequests && filteredRequests.length > 0 ? (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <Card key={request.id} className="hover-elevate" data-testid={`card-request-${request.id}`}>
                  <CardContent className="pt-4">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg">{request.accountName}</h3>
                          {getStatusBadge(request.status)}
                          <Badge variant="outline">{getCustomerTypeLabel(request.customerType)}</Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{request.primaryContactName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <span>{request.emailAddress}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span>{request.phoneNumber}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            <span>Submitted by: {request.salesRep.firstName} {request.salesRep.lastName}</span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Submitted: {format(new Date(request.createdAt), "MMM d, yyyy 'at' h:mm a")}
                          {request.reviewedAt && (
                            <span className="ml-4">
                              Reviewed: {format(new Date(request.reviewedAt), "MMM d, yyyy 'at' h:mm a")}
                            </span>
                          )}
                        </div>
                        {request.status === "rejected" && request.rejectionReason && (
                          <div className="text-sm text-destructive mt-2">
                            <span className="font-medium">Rejection reason:</span> {request.rejectionReason}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openViewDialog(request)}
                          data-testid={`button-view-request-${request.id}`}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        {request.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                setViewingRequest(request);
                                setSelectedTierId(request.pricingTierId || "");
                                setApproveDialogOpen(true);
                              }}
                              data-testid={`button-approve-request-${request.id}`}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setViewingRequest(request);
                                setRejectDialogOpen(true);
                              }}
                              data-testid={`button-reject-request-${request.id}`}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No customer requests found</p>
              <p className="text-sm">
                {statusFilter !== "all" 
                  ? `No ${statusFilter} requests match your search criteria`
                  : "Customer requests will appear here when sales reps submit them"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Request Details</DialogTitle>
            <DialogDescription>
              Review all submitted information for this customer request
            </DialogDescription>
          </DialogHeader>
          {viewingRequest && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{viewingRequest.accountName}</h3>
                {getStatusBadge(viewingRequest.status)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <User className="h-4 w-4" />
                      Contact Information
                    </h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-muted-foreground">Name:</span> {viewingRequest.primaryContactName}</p>
                      {viewingRequest.primaryContactRole && (
                        <p><span className="text-muted-foreground">Role:</span> {viewingRequest.primaryContactRole}</p>
                      )}
                      <p><span className="text-muted-foreground">Email:</span> {viewingRequest.emailAddress}</p>
                      <p><span className="text-muted-foreground">Phone:</span> {viewingRequest.phoneNumber}</p>
                      {viewingRequest.altPhoneNumber && (
                        <p><span className="text-muted-foreground">Alt Phone:</span> {viewingRequest.altPhoneNumber}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <Building className="h-4 w-4" />
                      Business Details
                    </h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-muted-foreground">Type:</span> {getCustomerTypeLabel(viewingRequest.customerType)}</p>
                      {viewingRequest.licenseNumber && (
                        <p><span className="text-muted-foreground">License #:</span> {viewingRequest.licenseNumber}</p>
                      )}
                      {viewingRequest.taxId && (
                        <p><span className="text-muted-foreground">Tax ID:</span> {viewingRequest.taxId}</p>
                      )}
                      {viewingRequest.tier && (
                        <p><span className="text-muted-foreground">Requested Tier:</span> {viewingRequest.tier.name}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {(viewingRequest.billingAddress || viewingRequest.shippingAddress) && (
                    <div>
                      <h4 className="font-medium flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4" />
                        Addresses
                      </h4>
                      <div className="space-y-3 text-sm">
                        {viewingRequest.billingAddress && (
                          <div>
                            <p className="text-muted-foreground text-xs">Billing:</p>
                            <p>{viewingRequest.billingAddress}</p>
                            <p>{viewingRequest.billingCity}, {viewingRequest.billingState} {viewingRequest.billingZipCode}</p>
                          </div>
                        )}
                        {viewingRequest.shippingAddress && (
                          <div>
                            <p className="text-muted-foreground text-xs">Shipping:</p>
                            <p>{viewingRequest.shippingAddress}</p>
                            <p>{viewingRequest.shippingCity}, {viewingRequest.shippingState} {viewingRequest.shippingZipCode}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {viewingRequest.notes && (
                    <div>
                      <h4 className="font-medium flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4" />
                        Notes
                      </h4>
                      <p className="text-sm">{viewingRequest.notes}</p>
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium mb-2">Submission Info</h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-muted-foreground">Sales Rep:</span> {viewingRequest.salesRep.firstName} {viewingRequest.salesRep.lastName}</p>
                      <p><span className="text-muted-foreground">Submitted:</span> {format(new Date(viewingRequest.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
                      {viewingRequest.reviewedAt && (
                        <p><span className="text-muted-foreground">Reviewed:</span> {format(new Date(viewingRequest.reviewedAt), "MMM d, yyyy 'at' h:mm a")}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {viewingRequest.status === "rejected" && viewingRequest.rejectionReason && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <h4 className="font-medium text-destructive mb-1">Rejection Reason</h4>
                  <p className="text-sm">{viewingRequest.rejectionReason}</p>
                </div>
              )}

              {viewingRequest.status === "pending" && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setApproveDialogOpen(true);
                    }}
                    data-testid="button-approve-from-dialog"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Customer
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      setRejectDialogOpen(true);
                    }}
                    data-testid="button-reject-from-dialog"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Request
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Customer Request</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new customer account for <strong>{viewingRequest?.accountName}</strong>. 
              Please select a pricing tier for this customer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="tier-select">Pricing Tier</Label>
            <Select value={selectedTierId} onValueChange={setSelectedTierId}>
              <SelectTrigger className="mt-2" data-testid="select-tier-for-approval">
                <SelectValue placeholder="Select a pricing tier" />
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
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={!selectedTierId || approveMutation.isPending}
              data-testid="button-confirm-approve"
            >
              {approveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Approve
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Customer Request</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting the request from <strong>{viewingRequest?.accountName}</strong>.
              This will be visible to the sales rep who submitted the request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-reason">Rejection Reason</Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why this request is being rejected..."
              className="mt-2"
              data-testid="textarea-rejection-reason"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={rejectMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
