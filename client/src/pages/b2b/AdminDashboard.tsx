import { useState } from "react";
import { useB2bAdminCustomers, useB2bApproveCustomer, useB2bRejectCustomer } from "@/hooks/useB2bAdminCustomers";
import { useB2bAdminOrders, useB2bAdminSalesReps, useB2bAdminTiers, useChangeAdminPassword, useCreateSalesRep, useUpdateSalesRep, useToggleTierActive } from "@/hooks/useB2bAdmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Users, CheckCircle2, XCircle, Building, Mail, Phone, ShoppingCart, UserCog, Settings as SettingsIcon, Lock, Plus, Edit, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function AdminDashboard() {
  const { toast } = useToast();
  const { data: pendingCustomers, isLoading: loadingPending } = useB2bAdminCustomers("pending_approval");
  const { data: activeCustomers, isLoading: loadingActive } = useB2bAdminCustomers("active");
  const { data: orders, isLoading: loadingOrders } = useB2bAdminOrders();
  const { data: salesReps, isLoading: loadingSalesReps } = useB2bAdminSalesReps();
  const { data: tiers, isLoading: loadingTiers } = useB2bAdminTiers();
  const { mutateAsync: approveCustomer, isPending: isApproving } = useB2bApproveCustomer();
  const { mutateAsync: rejectCustomer, isPending: isRejecting } = useB2bRejectCustomer();
  const { mutateAsync: changePassword, isPending: isChangingPassword } = useChangeAdminPassword();
  const { mutateAsync: createSalesRep, isPending: isCreatingSalesRep } = useCreateSalesRep();
  const { mutateAsync: updateSalesRep, isPending: isUpdatingSalesRep } = useUpdateSalesRep();
  const { mutateAsync: toggleTierActive, isPending: isTogglingTier } = useToggleTierActive();

  const [approveDialog, setApproveDialog] = useState<{ isOpen: boolean; customer: any | null }>({
    isOpen: false,
    customer: null,
  });
  const [selectedTier, setSelectedTier] = useState("");
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Sales rep dialog state
  const [salesRepDialog, setSalesRepDialog] = useState<{ isOpen: boolean; salesRep: any | null }>({
    isOpen: false,
    salesRep: null,
  });
  const [salesRepForm, setSalesRepForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    territory: "",
    password: "",
  });

  const handleApprove = async () => {
    if (!approveDialog.customer || !selectedTier) {
      toast({
        title: "Missing Information",
        description: "Please select a pricing tier",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Approving customer:', {
        customerId: approveDialog.customer.id,
        tierId: selectedTier,
        customerName: approveDialog.customer.accountName
      });

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
      console.error('Approval error:', error);
      toast({
        title: "Approval Failed",
        description: error.message || "An error occurred while approving the customer",
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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation must match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    try {
      await changePassword({ currentPassword, newPassword });
      
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Password Change Failed",
        description: error.message || "Please check your current password",
        variant: "destructive",
      });
    }
  };

  const handleToggleTier = async (tierId: string, currentActive: boolean) => {
    try {
      await toggleTierActive({ tierId, active: !currentActive });
      toast({
        title: "Tier Updated",
        description: `Tier has been ${!currentActive ? 'activated' : 'deactivated'}. ${!currentActive ? 'It will now appear in pricing and approval options.' : 'It has been hidden from new customer pricing and approval.'}`,
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update tier status",
        variant: "destructive",
      });
    }
  };

  const handleSalesRepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (salesRepDialog.salesRep) {
        // Update existing sales rep
        await updateSalesRep({
          id: salesRepDialog.salesRep.id,
          ...salesRepForm,
          password: salesRepForm.password || undefined,
        });
        
        toast({
          title: "Sales Rep Updated",
          description: "Sales representative has been updated successfully",
        });
      } else {
        // Create new sales rep
        if (!salesRepForm.password) {
          toast({
            title: "Password Required",
            description: "Password is required for new sales representatives",
            variant: "destructive",
          });
          return;
        }

        await createSalesRep(salesRepForm);
        
        toast({
          title: "Sales Rep Created",
          description: "New sales representative has been created successfully",
        });
      }

      setSalesRepDialog({ isOpen: false, salesRep: null });
      setSalesRepForm({
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        territory: "",
        password: "",
      });
    } catch (error: any) {
      toast({
        title: "Operation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openSalesRepDialog = (salesRep?: any) => {
    if (salesRep) {
      setSalesRepForm({
        firstName: salesRep.firstName,
        lastName: salesRep.lastName,
        email: salesRep.email,
        phoneNumber: salesRep.phoneNumber || "",
        territory: salesRep.territory || "",
        password: "",
      });
    } else {
      setSalesRepForm({
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        territory: "",
        password: "",
      });
    }
    setSalesRepDialog({ isOpen: true, salesRep: salesRep || null });
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
                <p className="font-medium">{customer.tier.tierName} ({customer.tier.discountPercentage}% off)</p>
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
        <p className="text-muted-foreground">Manage wholesale operations</p>
      </div>

      <Tabs defaultValue="customers" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="customers" data-testid="tab-customers">
            <Users className="h-4 w-4 mr-2" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="sales-reps" data-testid="tab-sales-reps">
            <UserCog className="h-4 w-4 mr-2" />
            Sales Reps
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">
            <SettingsIcon className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* CUSTOMERS TAB */}
        <TabsContent value="customers" className="space-y-6">
          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="pending" data-testid="tab-pending">
                Pending ({pendingCustomers?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="active" data-testid="tab-active">
                Active ({activeCustomers?.length || 0})
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
        </TabsContent>

        {/* ORDERS TAB */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">All Orders</CardTitle>
              <CardDescription>View all wholesale orders placed by customers</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingOrders ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : !orders || orders.length === 0 ? (
                <div className="py-12 text-center">
                  <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No Orders Yet</h3>
                  <p className="text-muted-foreground">
                    Customer orders will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                      data-testid={`order-${order.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-semibold">{order.orderNumber}</p>
                          <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{order.customerName}</p>
                        <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg">${order.total}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(order.orderDate), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SALES REPS TAB */}
        <TabsContent value="sales-reps" className="space-y-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => openSalesRepDialog()} data-testid="button-add-sales-rep">
              <Plus className="h-4 w-4 mr-2" />
              Add Sales Rep
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Sales Representatives</CardTitle>
              <CardDescription>Manage your sales team</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSalesReps ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : !salesReps || salesReps.length === 0 ? (
                <div className="py-12 text-center">
                  <UserCog className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No Sales Representatives</h3>
                  <p className="text-muted-foreground">
                    Add sales representatives to manage customer accounts
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {salesReps.map((rep) => (
                    <div
                      key={rep.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                      data-testid={`sales-rep-${rep.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-semibold">
                            {rep.firstName} {rep.lastName}
                          </p>
                          <Badge variant={rep.active ? 'default' : 'secondary'}>
                            {rep.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{rep.email}</p>
                        {rep.territory && (
                          <p className="text-xs text-muted-foreground">Territory: {rep.territory}</p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openSalesRepDialog(rep)}
                        data-testid={`button-edit-rep-${rep.id}`}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your admin account password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    data-testid="input-current-password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    data-testid="input-new-password"
                    minLength={6}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 6 characters
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    data-testid="input-confirm-password"
                    minLength={6}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isChangingPassword}
                  data-testid="button-change-password"
                >
                  {isChangingPassword ? "Changing Password..." : "Change Password"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Tier Management Card */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing Tiers
              </CardTitle>
              <CardDescription>
                Manage which pricing tiers are active for new customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTiers ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : !tiers || tiers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No pricing tiers configured
                </p>
              ) : (
                <div className="space-y-3">
                  {tiers.map((tier) => (
                    <div
                      key={tier.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${!tier.active ? 'opacity-60' : ''}`}
                      data-testid={`tier-${tier.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{tier.tierName}</p>
                          <Badge variant={tier.active ? 'default' : 'secondary'}>
                            {tier.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {tier.discountPercentage}% wholesale discount
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Label htmlFor={`tier-${tier.id}-switch`} className="text-sm cursor-pointer">
                          {tier.active ? 'Active' : 'Inactive'}
                        </Label>
                        <Switch
                          id={`tier-${tier.id}-switch`}
                          checked={tier.active}
                          onCheckedChange={() => handleToggleTier(tier.id, tier.active)}
                          disabled={isTogglingTier}
                          data-testid={`switch-tier-${tier.id}`}
                        />
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
                    Note: Inactive tiers will not appear on the public pricing page or in the customer approval dropdown. 
                    Existing customers assigned to inactive tiers will retain their pricing.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
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
                  {loadingTiers ? (
                    <div className="p-2 text-sm text-muted-foreground">Loading tiers...</div>
                  ) : !tiers || tiers.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">No tiers available</div>
                  ) : (
                    tiers.map((tier) => (
                      <SelectItem key={tier.id} value={tier.id}>
                        {tier.tierName} ({tier.discountPercentage}% off)
                      </SelectItem>
                    ))
                  )}
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

      {/* Sales Rep Dialog */}
      <Dialog open={salesRepDialog.isOpen} onOpenChange={(open) => setSalesRepDialog({ isOpen: open, salesRep: salesRepDialog.salesRep })}>
        <DialogContent data-testid="dialog-sales-rep">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {salesRepDialog.salesRep ? "Edit" : "Add"} Sales Representative
            </DialogTitle>
            <DialogDescription>
              {salesRepDialog.salesRep ? "Update sales representative details" : "Create a new sales representative account"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalesRepSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={salesRepForm.firstName}
                  onChange={(e) => setSalesRepForm({ ...salesRepForm, firstName: e.target.value })}
                  data-testid="input-first-name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={salesRepForm.lastName}
                  onChange={(e) => setSalesRepForm({ ...salesRepForm, lastName: e.target.value })}
                  data-testid="input-last-name"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={salesRepForm.email}
                onChange={(e) => setSalesRepForm({ ...salesRepForm, email: e.target.value })}
                data-testid="input-email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={salesRepForm.phoneNumber}
                onChange={(e) => setSalesRepForm({ ...salesRepForm, phoneNumber: e.target.value })}
                data-testid="input-phone"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="territory">Territory</Label>
              <Input
                id="territory"
                value={salesRepForm.territory}
                onChange={(e) => setSalesRepForm({ ...salesRepForm, territory: e.target.value })}
                data-testid="input-territory"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Password {salesRepDialog.salesRep ? "(leave blank to keep current)" : "*"}
              </Label>
              <Input
                id="password"
                type="password"
                value={salesRepForm.password}
                onChange={(e) => setSalesRepForm({ ...salesRepForm, password: e.target.value })}
                data-testid="input-password"
                required={!salesRepDialog.salesRep}
                minLength={6}
              />
              {!salesRepDialog.salesRep && (
                <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSalesRepDialog({ isOpen: false, salesRep: null })}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatingSalesRep || isUpdatingSalesRep}
                data-testid="button-save-sales-rep"
              >
                {(isCreatingSalesRep || isUpdatingSalesRep) ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
