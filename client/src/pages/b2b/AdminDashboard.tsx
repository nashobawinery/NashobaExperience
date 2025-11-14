import { useState } from "react";
import { useB2bAdminCustomers, useB2bApproveCustomer, useB2bRejectCustomer } from "@/hooks/useB2bAdminCustomers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, CheckCircle2, XCircle, Building, Mail, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function AdminDashboard() {
  const { toast } = useToast();
  const { data: pendingCustomers, isLoading: loadingPending } = useB2bAdminCustomers("pending_approval");
  const { data: activeCustomers, isLoading: loadingActive } = useB2bAdminCustomers("active");
  const { mutateAsync: approveCustomer, isPending: isApproving } = useB2bApproveCustomer();
  const { mutateAsync: rejectCustomer, isPending: isRejecting } = useB2bRejectCustomer();

  const [approveDialog, setApproveDialog] = useState<{ isOpen: boolean; customer: any | null }>({
    isOpen: false,
    customer: null,
  });
  const [selectedTier, setSelectedTier] = useState("");

  const handleApprove = async () => {
    if (!approveDialog.customer || !selectedTier) return;

    try {
      await approveCustomer({
        customerId: approveDialog.customer.id,
        tierId: selectedTier,
      });

      toast({
        title: "Customer Approved",
        description: `${approveDialog.customer.accountName} has been approved. They will receive an email with login credentials.`,
      });

      setApproveDialog({ isOpen: false, customer: null });
      setSelectedTier("");
    } catch (error: any) {
      toast({
        title: "Approval Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReject = async (customerId: string, accountName: string) => {
    try {
      await rejectCustomer({
        customerId,
        reason: "Application declined",
      });

      toast({
        title: "Customer Rejected",
        description: `${accountName}'s application has been declined.`,
      });
    } catch (error: any) {
      toast({
        title: "Rejection Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const renderCustomerCard = (customer: any, isPending: boolean) => (
    <Card key={customer.id} data-testid={`customer-card-${customer.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="font-serif text-xl mb-2 flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              {customer.accountName}
            </CardTitle>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {customer.emailAddress}
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {customer.phoneNumber}
              </div>
            </div>
          </div>
          <Badge variant={isPending ? "secondary" : "default"}>
            {customer.accountStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Business Type:</p>
              <p className="font-medium capitalize">{customer.businessType || "N/A"}</p>
            </div>
            {customer.tier && (
              <div>
                <p className="text-muted-foreground">Tier:</p>
                <p className="font-medium">{customer.tier}</p>
              </div>
            )}
            {customer.approvedAt && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Approved:</p>
                <p className="font-medium">{format(new Date(customer.approvedAt), "MMM d, yyyy")}</p>
              </div>
            )}
          </div>

          {customer.businessAddress && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Address:</p>
              <p className="text-sm">{customer.businessAddress}</p>
            </div>
          )}

          {isPending && (
            <div className="pt-3 border-t flex gap-2">
              <Button
                size="sm"
                onClick={() => setApproveDialog({ isOpen: true, customer })}
                className="flex-1"
                data-testid={`button-approve-${customer.id}`}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleReject(customer.id, customer.accountName)}
                className="flex-1"
                data-testid={`button-reject-${customer.id}`}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-semibold mb-2">B2B Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage wholesale customer accounts</p>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="pending" data-testid="tab-pending">
            <Users className="h-4 w-4 mr-2" />
            Pending Approval ({pendingCustomers?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="active" data-testid="tab-active">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Active Customers ({activeCustomers?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {loadingPending ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !pendingCustomers || pendingCustomers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Pending Applications</h3>
                <p className="text-muted-foreground">
                  New customer registrations will appear here for approval
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingCustomers.map((customer) => renderCustomerCard(customer, true))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {loadingActive ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !activeCustomers || activeCustomers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Active Customers</h3>
                <p className="text-muted-foreground">
                  Approved customers will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeCustomers.map((customer) => renderCustomerCard(customer, false))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Approval Dialog */}
      <Dialog open={approveDialog.isOpen} onOpenChange={(open) => setApproveDialog({ isOpen: open, customer: approveDialog.customer })}>
        <DialogContent data-testid="dialog-approve-customer">
          <DialogHeader>
            <DialogTitle className="font-serif">Approve Customer</DialogTitle>
            <DialogDescription>
              Assign a pricing tier for {approveDialog.customer?.accountName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Pricing Tier *</label>
              <Select value={selectedTier} onValueChange={setSelectedTier}>
                <SelectTrigger data-testid="select-tier">
                  <SelectValue placeholder="Select pricing tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tier1">Tier 1 (10% off)</SelectItem>
                  <SelectItem value="tier2">Tier 2 (20% off)</SelectItem>
                  <SelectItem value="tier3">Tier 3 (30% off)</SelectItem>
                  <SelectItem value="tier4">Tier 4 (40% off)</SelectItem>
                  <SelectItem value="tier5">Tier 5 (50% off)</SelectItem>
                  <SelectItem value="tier6">Tier 6 (60% off)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-sm text-muted-foreground">
              A temporary password will be generated from their phone number and sent via email.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveDialog({ isOpen: false, customer: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={!selectedTier || isApproving}
              data-testid="button-confirm-approve"
            >
              {isApproving ? "Approving..." : "Approve & Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
