import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Loader2, 
  ArrowLeft, 
  Pencil, 
  Star, 
  Plus, 
  Minus, 
  MapPin, 
  Phone, 
  Mail,
  Calendar,
  Wine,
  Clock,
  Users,
  DollarSign
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateCustomerSchema, type UpdateCustomer, type Customer, type CustomerVisit, type Experience } from "@shared/schema";
import { format } from "date-fns";

export default function AdminCustomerDetail() {
  const { toast } = useToast();
  const [, params] = useRoute("/reservations/admin/customers/:id");
  const customerId = params?.id;

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPointsDialogOpen, setIsPointsDialogOpen] = useState(false);
  const [pointsAdjustment, setPointsAdjustment] = useState(0);

  const { data: customer, isLoading: customerLoading } = useQuery<Customer>({
    queryKey: ["/api/resy/customers", customerId],
    enabled: !!customerId,
  });

  const { data: visits, isLoading: visitsLoading } = useQuery<CustomerVisit[]>({
    queryKey: ["/api/resy/customers", customerId, "visits"],
    enabled: !!customerId,
  });

  const { data: experiences } = useQuery<Experience[]>({
    queryKey: ["/api/resy/experiences"],
  });

  const form = useForm<UpdateCustomer>({
    resolver: zodResolver(updateCustomerSchema),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateCustomer) => {
      const response = await apiRequest("PUT", `/api/customers/${customerId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/customers", customerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/resy/customers"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Customer updated",
        description: "The customer profile has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const adjustPointsMutation = useMutation({
    mutationFn: async (adjustment: number) => {
      const response = await apiRequest("POST", `/api/customers/${customerId}/adjust-points`, { adjustment });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/customers", customerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/resy/customers"] });
      setIsPointsDialogOpen(false);
      setPointsAdjustment(0);
      toast({
        title: "Points adjusted",
        description: "Loyalty points have been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditProfile = () => {
    if (customer) {
      form.reset({
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone || "",
        address: customer.address || "",
        city: customer.city || "",
        state: customer.state || "",
        zipCode: customer.zipCode || "",
        clubStatus: customer.clubStatus as "none" | "member" | "vip",
        notes: customer.notes || "",
      });
      setIsEditDialogOpen(true);
    }
  };

  const onSubmit = (data: UpdateCustomer) => {
    updateMutation.mutate(data);
  };

  const getClubBadge = (status: string) => {
    switch (status) {
      case "vip":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-lg px-3 py-1">VIP Member</Badge>;
      case "member":
        return <Badge variant="secondary" className="text-lg px-3 py-1">Club Member</Badge>;
      default:
        return <Badge variant="outline" className="text-lg px-3 py-1">No Membership</Badge>;
    }
  };

  const getVisitStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "no_show":
        return <Badge variant="outline" className="text-orange-600 border-orange-600">No Show</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getExperienceName = (experienceId: string) => {
    const experience = experiences?.find((e) => e.id === experienceId);
    return experience?.name || "Unknown Experience";
  };

  // Group visits by experience for summary
  const visitsByExperience = visits?.reduce((acc, visit) => {
    const expId = visit.experienceId;
    if (!acc[expId]) {
      acc[expId] = {
        experienceId: expId,
        name: getExperienceName(expId),
        count: 0,
        lastVisit: visit.visitDate,
        totalSpent: 0,
      };
    }
    acc[expId].count++;
    if (visit.totalSpent) {
      acc[expId].totalSpent += parseFloat(visit.totalSpent);
    }
    if (visit.visitDate > acc[expId].lastVisit) {
      acc[expId].lastVisit = visit.visitDate;
    }
    return acc;
  }, {} as Record<string, { experienceId: string; name: string; count: number; lastVisit: string; totalSpent: number }>);

  if (customerLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-semibold mb-2">Customer not found</h2>
        <p className="text-muted-foreground mb-4">The customer you're looking for doesn't exist.</p>
        <Link href="/reservations/admin/customers">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Customers
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/reservations/admin/customers">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-serif text-3xl md:text-4xl font-semibold mb-1">
              {customer.firstName} {customer.lastName}
            </h1>
            <div className="flex items-center gap-3">
              {getClubBadge(customer.clubStatus)}
              <div className="flex items-center gap-1 text-amber-500">
                <Star className="w-5 h-5 fill-current" />
                <span className="font-semibold text-lg">{customer.loyaltyPoints} points</span>
              </div>
            </div>
          </div>
        </div>
        <Button onClick={handleEditProfile} data-testid="button-edit-profile">
          <Pencil className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" data-testid="tab-profile">Profile</TabsTrigger>
          <TabsTrigger value="loyalty" data-testid="tab-loyalty">Loyalty & Club</TabsTrigger>
          <TabsTrigger value="visits" data-testid="tab-visits">Visit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <span data-testid="text-email">{customer.email}</span>
                </div>
                {customer.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                    <span data-testid="text-phone">{customer.phone}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Address</CardTitle>
              </CardHeader>
              <CardContent>
                {customer.address || customer.city || customer.state || customer.zipCode ? (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div data-testid="text-address">
                      {customer.address && <div>{customer.address}</div>}
                      {(customer.city || customer.state || customer.zipCode) && (
                        <div>
                          {customer.city}{customer.city && customer.state && ", "}{customer.state} {customer.zipCode}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No address on file</p>
                )}
              </CardContent>
            </Card>
          </div>

          {customer.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Internal Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p data-testid="text-notes">{customer.notes}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer ID</span>
                <span className="font-mono text-xs">{customer.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Member Since</span>
                <span>{customer.createdAt && format(new Date(customer.createdAt), "MMMM d, yyyy")}</span>
              </div>
              {customer.updatedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span>{format(new Date(customer.updatedAt), "MMMM d, yyyy")}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loyalty" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500" />
                  Loyalty Points
                </CardTitle>
                <CardDescription>Manage customer loyalty points</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <div className="text-5xl font-bold text-amber-500" data-testid="text-points-balance">
                    {customer.loyaltyPoints}
                  </div>
                  <div className="text-muted-foreground mt-1">Current Balance</div>
                </div>
                <Button 
                  onClick={() => setIsPointsDialogOpen(true)} 
                  className="w-full"
                  data-testid="button-adjust-points"
                >
                  Adjust Points
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Club Membership</CardTitle>
                <CardDescription>Current membership status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  {getClubBadge(customer.clubStatus)}
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {customer.clubStatus === "vip" && "VIP members receive exclusive benefits and priority booking."}
                  {customer.clubStatus === "member" && "Club members enjoy special discounts and early access."}
                  {customer.clubStatus === "none" && "Consider upgrading to a club membership for exclusive benefits."}
                </p>
              </CardContent>
            </Card>
          </div>

          {visitsByExperience && Object.keys(visitsByExperience).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Visit Summary by Experience</CardTitle>
                <CardDescription>Overview of visits across different experiences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Object.values(visitsByExperience).map((summary) => (
                    <div 
                      key={summary.experienceId} 
                      className="p-4 border rounded-lg space-y-2"
                      data-testid={`summary-${summary.experienceId}`}
                    >
                      <div className="flex items-center gap-2">
                        <Wine className="w-4 h-4 text-primary" />
                        <span className="font-medium">{summary.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Visits:</span>
                          <span className="ml-1 font-medium">{summary.count}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Spent:</span>
                          <span className="ml-1 font-medium">${summary.totalSpent.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Last: {format(new Date(summary.lastVisit), "M/d/yyyy")}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="visits" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Visit History ({visits?.length || 0} total)
              </CardTitle>
              <CardDescription>Complete log of customer visits</CardDescription>
            </CardHeader>
            <CardContent>
              {visitsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : visits && visits.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Experience</TableHead>
                        <TableHead>Party Size</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visits.map((visit) => (
                        <TableRow key={visit.id} data-testid={`row-visit-${visit.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              {format(new Date(visit.visitDate), "M/d/yyyy")}
                            </div>
                          </TableCell>
                          <TableCell>
                            {visit.visitTime && (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                {visit.visitTime}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Wine className="w-4 h-4 text-primary" />
                              {getExperienceName(visit.experienceId)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {visit.partySize && (
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                {visit.partySize}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {visit.totalSpent && (
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-muted-foreground" />
                                {parseFloat(visit.totalSpent).toFixed(2)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{getVisitStatusBadge(visit.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No visits recorded yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer Profile</DialogTitle>
            <DialogDescription>
              Update customer information and membership details.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="edit-firstName" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="edit-lastName" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} value={field.value || ""} data-testid="edit-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="edit-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="edit-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="edit-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="edit-state" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zip Code</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="edit-zipCode" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="clubStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Club Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "none"}>
                      <FormControl>
                        <SelectTrigger data-testid="edit-clubStatus">
                          <SelectValue placeholder="Select membership" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Membership</SelectItem>
                        <SelectItem value="member">Club Member</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="Internal notes..." data-testid="edit-notes" />
                    </FormControl>
                    <FormDescription>Internal notes (not visible to customer)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Adjust Points Dialog */}
      <Dialog open={isPointsDialogOpen} onOpenChange={setIsPointsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Loyalty Points</DialogTitle>
            <DialogDescription>
              Add or subtract points from {customer.firstName}'s balance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Current Balance</div>
              <div className="text-3xl font-bold text-amber-500">{customer.loyaltyPoints}</div>
            </div>
            <div className="flex items-center gap-4 justify-center">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setPointsAdjustment(prev => prev - 10)}
                data-testid="button-decrease-points"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Input
                type="number"
                value={pointsAdjustment}
                onChange={(e) => setPointsAdjustment(parseInt(e.target.value) || 0)}
                className="w-24 text-center"
                data-testid="input-points-adjustment"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setPointsAdjustment(prev => prev + 10)}
                data-testid="button-increase-points"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">New Balance</div>
              <div className="text-2xl font-bold" data-testid="text-new-balance">
                {Math.max(0, customer.loyaltyPoints + pointsAdjustment)}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsPointsDialogOpen(false); setPointsAdjustment(0); }}>
              Cancel
            </Button>
            <Button 
              onClick={() => adjustPointsMutation.mutate(pointsAdjustment)}
              disabled={adjustPointsMutation.isPending || pointsAdjustment === 0}
              data-testid="button-confirm-points"
            >
              {adjustPointsMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {pointsAdjustment >= 0 ? "Add Points" : "Remove Points"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
