import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, ExternalLink, Loader2, Upload, X, Tag, Percent, DollarSign, Calendar } from "lucide-react";
import type { Experience, InsertExperience, TimeSlot, ExperienceDiscount, InsertExperienceDiscount } from "@shared/schema";
import { insertExperienceSchema, insertExperienceDiscountSchema } from "@shared/schema";
import { ObjectUploader } from "@/components/ResyObjectUploader";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export default function AdminExperiences() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null);

  const { data: experiences, isLoading: experiencesLoading } = useQuery<Experience[]>({
    queryKey: ["/api/resy/experiences"],
  });

  const handleEdit = (experience: Experience) => {
    setEditingExperience(experience);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingExperience(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-semibold mb-2">Experiences</h1>
          <p className="text-muted-foreground">Manage your winery experiences and offerings</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} data-testid="button-add-experience">
              <Plus className="w-4 h-4 mr-2" />
              Add Experience
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingExperience ? "Edit Experience" : "Add New Experience"}
              </DialogTitle>
              <DialogDescription>
                {editingExperience
                  ? "Update the details of this experience"
                  : "Create a new experience for your guests to book"}
              </DialogDescription>
            </DialogHeader>
            <ExperienceForm
              experience={editingExperience}
              onSuccess={() => {
                setIsDialogOpen(false);
                setEditingExperience(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {experiencesLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <div className="aspect-[4/3] bg-muted animate-pulse" />
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded animate-pulse mb-3" />
                <div className="h-4 bg-muted rounded animate-pulse mb-2 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : experiences && experiences.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {experiences.map((experience) => (
            <ExperienceCard
              key={experience.id}
              experience={experience}
              onEdit={handleEdit}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No experiences yet</p>
            <Button onClick={handleAdd} data-testid="button-add-first">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Experience
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ExperienceCard({ experience, onEdit }: { experience: Experience; onEdit: (exp: Experience) => void }) {
  const { toast } = useToast();
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/resy/experiences/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/experiences"] });
      toast({
        title: "Experience Deleted",
        description: "The experience has been removed successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="overflow-hidden">
      {experience.imageUrl && (
        <div className="aspect-[4/3] overflow-hidden">
          <img
            src={experience.imageUrl}
            alt={experience.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-sans text-xl font-semibold">{experience.name}</h3>
          <div className="flex gap-1">
            {experience.isExternal && (
              <Badge variant="secondary" className="text-xs">
                <ExternalLink className="w-3 h-3 mr-1" />
                External
              </Badge>
            )}
            {!experience.isActive && (
              <Badge variant="destructive" className="text-xs">Inactive</Badge>
            )}
          </div>
        </div>
        {(experience.shortDescription || experience.description) && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {experience.shortDescription || experience.description}
          </p>
        )}
        {!experience.isExternal && (
          <p className="text-sm font-medium mb-3">
            Type: {experience.reservationType === 'ticketed' ? 'Ticketed Event' : 'Table Reservation'}
          </p>
        )}
        {experience.price && (
          <p className="text-sm font-medium mb-4">
            ${parseFloat(experience.price).toFixed(2)} per person
          </p>
        )}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onEdit(experience)}
            data-testid={`button-edit-${experience.id}`}
          >
            <Pencil className="w-3 h-3 mr-1" />
            Edit
          </Button>
          {!experience.isExternal && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDiscountDialogOpen(true)}
              data-testid={`button-discounts-${experience.id}`}
            >
              <Tag className="w-3 h-3 mr-1" />
              Discounts
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteMutation.isPending}
                data-testid={`button-delete-${experience.id}`}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Experience?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{experience.name}"? This action cannot be undone and will also delete all associated time slots and reservations.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate(experience.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>

      <DiscountManageDialog
        experience={experience}
        isOpen={isDiscountDialogOpen}
        onOpenChange={setIsDiscountDialogOpen}
      />
    </Card>
  );
}

function DiscountManageDialog({ experience, isOpen, onOpenChange }: {
  experience: Experience;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [isAddingDiscount, setIsAddingDiscount] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<ExperienceDiscount | null>(null);

  const { data: discounts, isLoading } = useQuery<ExperienceDiscount[]>({
    queryKey: ["/api/resy/experiences", experience.id, "discounts"],
    queryFn: async () => {
      const res = await fetch(`/api/resy/experiences/${experience.id}/discounts`);
      if (!res.ok) throw new Error("Failed to fetch discounts");
      return res.json();
    },
    enabled: isOpen,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/resy/discounts/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/experiences", experience.id, "discounts"] });
      toast({ title: "Discount Deleted", description: "The discount code has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleDiscountSaved = () => {
    setIsAddingDiscount(false);
    setEditingDiscount(null);
    queryClient.invalidateQueries({ queryKey: ["/api/resy/experiences", experience.id, "discounts"] });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Discount Codes for {experience.name}</DialogTitle>
          <DialogDescription>
            Create and manage discount codes for this experience
          </DialogDescription>
        </DialogHeader>

        {(isAddingDiscount || editingDiscount) ? (
          <DiscountForm
            experienceId={experience.id}
            discount={editingDiscount}
            onSuccess={handleDiscountSaved}
            onCancel={() => {
              setIsAddingDiscount(false);
              setEditingDiscount(null);
            }}
          />
        ) : (
          <div className="space-y-4">
            <Button
              onClick={() => setIsAddingDiscount(true)}
              data-testid="button-add-discount"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Discount Code
            </Button>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : discounts && discounts.length > 0 ? (
              <div className="space-y-3">
                {discounts.map((discount) => (
                  <Card key={discount.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                            {discount.code}
                          </code>
                          {discount.discountType === 'percentage' ? (
                            <Badge variant="secondary" className="text-xs">
                              <Percent className="w-3 h-3 mr-1" />
                              {discount.discountValue}% off
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              <DollarSign className="w-3 h-3 mr-1" />
                              ${parseFloat(discount.discountValue).toFixed(2)} off
                            </Badge>
                          )}
                          {!discount.isActive && (
                            <Badge variant="destructive" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
                          {discount.maxUses !== null && (
                            <span>Uses: {discount.usedCount}/{discount.maxUses}</span>
                          )}
                          {discount.maxUses === null && (
                            <span>Uses: {discount.usedCount} (unlimited)</span>
                          )}
                          {discount.validFrom && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              From: {discount.validFrom}
                            </span>
                          )}
                          {discount.validUntil && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Until: {discount.validUntil}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingDiscount(discount)}
                          data-testid={`button-edit-discount-${discount.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-discount-${discount.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Discount?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete the discount code "{discount.code}"?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(discount.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <Tag className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No discount codes yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create a code to offer discounts on this experience
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DiscountForm({ experienceId, discount, onSuccess, onCancel }: {
  experienceId: string;
  discount: ExperienceDiscount | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();

  const form = useForm<InsertExperienceDiscount>({
    resolver: zodResolver(insertExperienceDiscountSchema),
    defaultValues: discount ? {
      experienceId: discount.experienceId,
      code: discount.code,
      discountType: discount.discountType as 'percentage' | 'fixed',
      discountValue: discount.discountValue,
      maxUses: discount.maxUses ?? undefined,
      validFrom: discount.validFrom ?? undefined,
      validUntil: discount.validUntil ?? undefined,
      isActive: discount.isActive,
    } : {
      experienceId,
      code: "",
      discountType: "percentage",
      discountValue: "",
      maxUses: undefined,
      validFrom: undefined,
      validUntil: undefined,
      isActive: true,
    },
  });

  const discountType = form.watch("discountType");

  const saveMutation = useMutation({
    mutationFn: async (data: InsertExperienceDiscount) => {
      if (discount) {
        await apiRequest("PUT", `/api/resy/discounts/${discount.id}`, data);
      } else {
        await apiRequest("POST", `/api/resy/experiences/${experienceId}/discounts`, data);
      }
    },
    onSuccess: () => {
      toast({
        title: discount ? "Discount Updated" : "Discount Created",
        description: discount ? "The discount code has been updated." : "The new discount code has been created.",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertExperienceDiscount) => {
    saveMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Discount Code</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., WINE20"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  data-testid="input-discount-code"
                />
              </FormControl>
              <FormDescription>
                Customers will enter this code at checkout
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="discountType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || "percentage"}>
                  <FormControl>
                    <SelectTrigger data-testid="select-discount-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="discountValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {discountType === 'percentage' ? 'Percentage Off' : 'Amount Off ($)'}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step={discountType === 'percentage' ? "1" : "0.01"}
                    placeholder={discountType === 'percentage' ? "20" : "10.00"}
                    {...field}
                    value={field.value || ""}
                    data-testid="input-discount-value"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="maxUses"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Maximum Uses (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Leave empty for unlimited"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  data-testid="input-max-uses"
                />
              </FormControl>
              <FormDescription>
                How many times this code can be used in total
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="validFrom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valid From (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || undefined)}
                    data-testid="input-valid-from"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="validUntil"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valid Until (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || undefined)}
                    data-testid="input-valid-until"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
              <div className="space-y-0.5">
                <FormLabel>Active</FormLabel>
                <FormDescription>
                  Enable or disable this discount code
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="switch-discount-active"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saveMutation.isPending}
            className="flex-1"
            data-testid="button-save-discount"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : discount ? (
              "Update Discount"
            ) : (
              "Create Discount"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function ExperienceForm({ experience, onSuccess }: { experience: Experience | null; onSuccess: () => void }) {
  const { toast } = useToast();
  const [selectedDays, setSelectedDays] = useState<number[]>(experience ? [] : []);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [capacity, setCapacity] = useState<string>("");
  const [primaryImageURL, setPrimaryImageURL] = useState<string | null>(null);
  const [secondaryImageURL, setSecondaryImageURL] = useState<string | null>(null);
  const [uploadingPrimary, setUploadingPrimary] = useState(false);
  const [uploadingSecondary, setUploadingSecondary] = useState(false);

  const { data: locations } = useQuery<{ id: string; name: string; isActive: boolean; isTicketedEventLocation: boolean; isReservationLocation: boolean }[]>({
    queryKey: ["/api/resy/locations"],
  });

  const form = useForm<InsertExperience>({
    resolver: zodResolver(insertExperienceSchema),
    defaultValues: experience ? {
      name: experience.name,
      shortDescription: experience.shortDescription || "",
      longDescription: experience.longDescription || "",
      imageUrl: experience.imageUrl || "",
      locationId: experience.locationId || undefined,
      isExternal: experience.isExternal,
      externalUrl: experience.externalUrl || "",
      reservationType: experience.reservationType || undefined,
      price: experience.price || undefined,
      advanceBookingDays: experience.advanceBookingDays || undefined,
      displayOrder: experience.displayOrder,
      isActive: experience.isActive,
      showPrice: experience.showPrice ?? true,
      pointsEarned: experience.pointsEarned ?? 0,
    } : {
      name: "",
      shortDescription: "",
      longDescription: "",
      imageUrl: "",
      locationId: undefined,
      isExternal: false,
      externalUrl: "",
      reservationType: undefined,
      price: undefined,
      advanceBookingDays: undefined,
      displayOrder: 0,
      isActive: true,
      showPrice: true,
      pointsEarned: 0,
    },
  });

  const isExternal = form.watch("isExternal");
  const reservationType = form.watch("reservationType");
  
  // Filter locations based on selected reservation type
  const filteredLocations = locations?.filter(l => {
    if (!l.isActive) return false;
    if (reservationType === 'ticketed') return l.isTicketedEventLocation;
    if (reservationType === 'table') return l.isReservationLocation;
    return true; // Show all active if no type selected
  }) || [];

  const saveMutation = useMutation({
    mutationFn: async (data: InsertExperience) => {
      let savedExperience;
      if (experience) {
        await apiRequest("PUT", `/api/resy/experiences/${experience.id}`, data);
        savedExperience = experience;
      } else {
        const response = await apiRequest("POST", "/api/resy/experiences", data);
        savedExperience = await response.json();
      }

      // Upload images if URLs are changed (including deletion)
      if ((primaryImageURL !== null || secondaryImageURL !== null) && savedExperience) {
        const imageData: { primaryImageURL?: string | null; secondaryImageURL?: string | null } = {};
        if (primaryImageURL !== null) imageData.primaryImageURL = primaryImageURL || "";
        if (secondaryImageURL !== null) imageData.secondaryImageURL = secondaryImageURL || "";
        
        const response = await apiRequest("PUT", `/api/resy/experiences/${savedExperience.id}/images`, imageData);
        savedExperience = await response.json();
      }

      return savedExperience;
    },
    onSuccess: async (savedExperience) => {
      // If ticketed event and not editing, create time slots
      if (!experience && reservationType === 'ticketed' && selectedDays.length > 0 && timeSlots.length > 0 && savedExperience) {
        try {
          await apiRequest("POST", `/api/resy/experiences/${savedExperience.id}/timeslots`, {
            days: selectedDays,
            times: timeSlots,
            capacity: parseInt(capacity) || 30,
          });
        } catch (error) {
          console.error("Error creating time slots:", error);
        }
      }
      
      // Reset image upload states
      setPrimaryImageURL(null);
      setSecondaryImageURL(null);
      
      queryClient.invalidateQueries({ queryKey: ["/api/resy/experiences"] });
      toast({
        title: experience ? "Experience Updated" : "Experience Created",
        description: `The experience has been ${experience ? "updated" : "created"} successfully`,
      });
      onSuccess();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertExperience) => {
    saveMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Experience Name *</FormLabel>
              <FormControl>
                <Input placeholder="Winery Tours" {...field} data-testid="input-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          <div>
            <h3 className="text-sm font-medium">Experience Type & Location</h3>
            <p className="text-sm text-muted-foreground">Select the type first to see eligible locations</p>
          </div>

          <FormField
            control={form.control}
            name="reservationType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type of Experience *</FormLabel>
                <Select onValueChange={(value) => {
                  field.onChange(value);
                  // Clear location when type changes to force re-selection from filtered list
                  form.setValue("locationId", undefined, { shouldValidate: true });
                }} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger data-testid="select-type-top">
                      <SelectValue placeholder="Select experience type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ticketed">Ticketed Event (tours, tastings, events)</SelectItem>
                    <SelectItem value="table">Table Reservation (dining)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {!isExternal && (
            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""} disabled={!reservationType}>
                    <FormControl>
                      <SelectTrigger data-testid="select-location-top">
                        <SelectValue placeholder={reservationType ? "Select location" : "Select type first"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredLocations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {reservationType && filteredLocations.length === 0 && (
                    <FormDescription className="text-amber-600">
                      No locations configured for {reservationType === 'ticketed' ? 'ticketed events' : 'table reservations'}. 
                      Configure location types in Locations settings.
                    </FormDescription>
                  )}
                  {reservationType && filteredLocations.length > 0 && (
                    <FormDescription>
                      Showing {reservationType === 'ticketed' ? 'ticketed event' : 'reservation'} locations only
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <FormField
          control={form.control}
          name="shortDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Short Description</FormLabel>
              <FormControl>
                <Textarea
                  maxLength={200}
                  placeholder="A guided tour through our vineyard and production facilities..."
                  {...field}
                  value={field.value || ""}
                  data-testid="input-short-description"
                  rows={2}
                />
              </FormControl>
              <FormDescription>Max 200 characters - shown on experience cards</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="longDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Long Description</FormLabel>
              <FormControl>
                <Textarea
                  maxLength={1000}
                  placeholder="Detailed description of the experience including what to expect, duration, pricing details, etc..."
                  {...field}
                  value={field.value || ""}
                  data-testid="input-long-description"
                  rows={4}
                />
              </FormControl>
              <FormDescription>Max 1000 characters - shown on booking page</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4 rounded-md border p-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Images</h3>
            <p className="text-sm text-muted-foreground mb-4">Upload experience images (max 10MB each)</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Primary Image</label>
                {uploadingPrimary ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </div>
                ) : primaryImageURL !== null ? (
                  primaryImageURL ? (
                    <div className="flex items-center gap-2">
                      <img 
                        src={primaryImageURL} 
                        alt="Primary (new upload)" 
                        className="w-20 h-20 object-cover rounded-md border"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPrimaryImageURL(null)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <ObjectUploader
                      onComplete={(imageUrl) => {
                        setPrimaryImageURL(imageUrl);
                        toast({
                          title: "Image Selected",
                          description: "Primary image selected. Save to confirm.",
                        });
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <Upload className="w-3 h-3 mr-2" />
                      Select Primary
                    </ObjectUploader>
                  )
                ) : experience?.primaryImageKey ? (
                  <div className="flex items-center gap-2">
                    <img 
                      src={experience.primaryImageKey} 
                      alt="Primary" 
                      className="w-20 h-20 object-cover rounded-md border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setPrimaryImageURL("");
                        toast({
                          title: "Image will be removed",
                          description: "Save the form to confirm deletion",
                        });
                      }}
                      data-testid="button-delete-primary-image"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <ObjectUploader
                    onComplete={(imageUrl) => {
                      setPrimaryImageURL(imageUrl);
                      toast({
                        title: "Image Selected",
                        description: "Primary image selected. Save to confirm.",
                      });
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Upload className="w-3 h-3 mr-2" />
                    Select Primary
                  </ObjectUploader>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Secondary Image</label>
                {uploadingSecondary ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </div>
                ) : secondaryImageURL !== null ? (
                  secondaryImageURL ? (
                    <div className="flex items-center gap-2">
                      <img 
                        src={secondaryImageURL} 
                        alt="Secondary (new upload)" 
                        className="w-20 h-20 object-cover rounded-md border"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSecondaryImageURL(null)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <ObjectUploader
                      onComplete={(imageUrl) => {
                        setSecondaryImageURL(imageUrl);
                        toast({
                          title: "Image Selected",
                          description: "Secondary image selected. Save to confirm.",
                        });
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <Upload className="w-3 h-3 mr-2" />
                      Select Secondary
                    </ObjectUploader>
                  )
                ) : experience?.secondaryImageKey ? (
                  <div className="flex items-center gap-2">
                    <img 
                      src={experience.secondaryImageKey} 
                      alt="Secondary" 
                      className="w-20 h-20 object-cover rounded-md border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setSecondaryImageURL("");
                        toast({
                          title: "Image will be removed",
                          description: "Save the form to confirm deletion",
                        });
                      }}
                      data-testid="button-delete-secondary-image"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <ObjectUploader
                    onComplete={(imageUrl) => {
                      setSecondaryImageURL(imageUrl);
                      toast({
                        title: "Image Selected",
                        description: "Secondary image selected. Save to confirm.",
                      });
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Upload className="w-3 h-3 mr-2" />
                    Select Secondary
                  </ObjectUploader>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-md border p-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Custom Messages</h3>
            <p className="text-sm text-muted-foreground mb-4">Set custom messages to display when reservations are unavailable</p>
          </div>

          <FormField
            control={form.control}
            name="closedMessage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location Closed Message</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Sorry, we're closed on Mondays and Tuesdays"
                    {...field}
                    value={field.value || ""}
                    data-testid="input-closed-message"
                    rows={2}
                  />
                </FormControl>
                <FormDescription>Message displayed when the location is closed</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fullyBookedMessage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fully Booked Message</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="All reservations are taken for this date. Please check the waitlist."
                    {...field}
                    value={field.value || ""}
                    data-testid="input-fully-booked-message"
                    rows={2}
                  />
                </FormControl>
                <FormDescription>Message displayed when all time slots are fully booked</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="privateEventMessage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Private Event Message</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Closed for a private event"
                    {...field}
                    value={field.value || ""}
                    data-testid="input-private-event-message"
                    rows={2}
                  />
                </FormControl>
                <FormDescription>Message displayed when a private event is scheduled</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isExternal"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
              <div className="space-y-0.5">
                <FormLabel>External Platform</FormLabel>
                <FormDescription>
                  Is this hosted on another platform (OpenTable, Toasttab, etc)?
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="switch-external"
                />
              </FormControl>
            </FormItem>
          )}
        />

        {isExternal ? (
          <FormField
            control={form.control}
            name="externalUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>External URL *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://..."
                    {...field}
                    value={field.value || ""}
                    data-testid="input-external-url"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <>
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price per Person</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      value={field.value || ""}
                      data-testid="input-price"
                    />
                  </FormControl>
                  <FormDescription>
                    Enter 0 for free experiences. If Show Price is off, payment collected at door.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pointsEarned"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loyalty Points Earned</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      value={field.value ?? 0}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                      data-testid="input-points-earned"
                    />
                  </FormControl>
                  <FormDescription>
                    Points customers earn when booking this experience
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="advanceBookingDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Advance Booking Window (Days)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="30"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      data-testid="input-advance-booking-days"
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum days in advance this experience can be booked (leave empty for no limit)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {reservationType === 'ticketed' && (
              <>
                {!experience && (
                  <>
                    <div className="space-y-3">
                      <FormLabel>Days Offered</FormLabel>
                      <div className="grid grid-cols-2 gap-3">
                        {DAYS_OF_WEEK.map((day) => (
                          <div key={day.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`day-${day.value}`}
                              checked={selectedDays.includes(day.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedDays([...selectedDays, day.value]);
                                } else {
                                  setSelectedDays(selectedDays.filter(d => d !== day.value));
                                }
                              }}
                              data-testid={`checkbox-day-${day.value}`}
                            />
                            <label
                              htmlFor={`day-${day.value}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {day.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <FormLabel>Time Slots (comma-separated, e.g., 13:00, 15:00)</FormLabel>
                      <Input
                        placeholder="13:00, 15:00"
                        onChange={(e) => {
                          const times = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                          setTimeSlots(times);
                        }}
                        data-testid="input-time-slots"
                      />
                    </div>

                    <div className="space-y-2">
                      <FormLabel>Capacity per Time Slot</FormLabel>
                      <Input
                        type="number"
                        placeholder="30"
                        value={capacity}
                        onChange={(e) => setCapacity(e.target.value)}
                        data-testid="input-capacity"
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

        <FormField
          control={form.control}
          name="showPrice"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
              <div className="space-y-0.5">
                <FormLabel>Show Price</FormLabel>
                <FormDescription>
                  Display price on public booking page
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="switch-show-price"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="displayOrder"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Order</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  {...field}
                  value={field.value ?? 0}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    field.onChange(isNaN(value) ? 0 : Math.max(0, value));
                  }}
                  data-testid="input-display-order"
                />
              </FormControl>
              <FormDescription>
                Lower numbers appear first on the landing page (e.g., 0, 1, 2...)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
              <div className="space-y-0.5">
                <FormLabel>Active</FormLabel>
                <FormDescription>
                  Display this experience on the public booking page
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="switch-active"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={saveMutation.isPending}
            className="flex-1"
            data-testid="button-save"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : experience ? (
              "Update Experience"
            ) : (
              "Create Experience"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
