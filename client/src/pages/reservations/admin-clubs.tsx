import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2, Users, Percent, DollarSign, Wine, ChevronRight } from "lucide-react";
import type { Club, InsertClub, Experience, ClubExperienceDiscount, InsertClubExperienceDiscount } from "@shared/schema";
import { insertClubSchema, insertClubExperienceDiscountSchema } from "@shared/schema";
import { z } from "zod";

const DEFAULT_CLUBS = [
  { name: "Wine Club", description: "Our standard wine club membership with exclusive discounts on experiences" },
  { name: "Reserve Wine Club", description: "Premium membership with enhanced discounts and priority reservations" },
  { name: "Barrel Club", description: "VIP membership tier with the best discounts and exclusive access" },
  { name: "Founders Club", description: "Our most exclusive membership with maximum benefits and complimentary experiences" },
];

export default function AdminClubs() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);

  const { data: clubs, isLoading: clubsLoading } = useQuery<Club[]>({
    queryKey: ["/api/resy/clubs"],
  });

  const { data: experiences } = useQuery<Experience[]>({
    queryKey: ["/api/resy/experiences"],
  });

  const { data: allClubDiscounts } = useQuery<ClubExperienceDiscount[]>({
    queryKey: ["/api/club-discounts"],
  });

  const handleEdit = (club: Club) => {
    setEditingClub(club);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingClub(null);
    setIsDialogOpen(true);
  };

  const internalExperiences = experiences?.filter(exp => !exp.isExternal && exp.isActive) || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-semibold mb-2">Club Management</h1>
          <p className="text-muted-foreground">Manage membership clubs and their experience discounts</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} data-testid="button-add-club">
              <Plus className="w-4 h-4 mr-2" />
              Add Club
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingClub ? "Edit Club" : "Add New Club"}
              </DialogTitle>
              <DialogDescription>
                {editingClub
                  ? "Update the details of this club"
                  : "Create a new membership club tier"}
              </DialogDescription>
            </DialogHeader>
            <ClubForm
              club={editingClub}
              onSuccess={() => {
                setIsDialogOpen(false);
                setEditingClub(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {clubsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : clubs && clubs.length > 0 ? (
        <div className="space-y-4">
          {clubs.map((club) => (
            <ClubCard
              key={club.id}
              club={club}
              experiences={internalExperiences}
              clubDiscounts={allClubDiscounts?.filter(d => d.clubId === club.id) || []}
              onEdit={handleEdit}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Users className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-medium text-lg mb-1">No Clubs Yet</h3>
                <p className="text-muted-foreground mb-4">Create membership clubs to offer experience discounts to your loyal customers</p>
              </div>
              <div className="flex flex-col gap-2 max-w-xs mx-auto">
                <Button onClick={handleAdd} data-testid="button-add-first-club">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Club
                </Button>
                <CreateDefaultClubsButton />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CreateDefaultClubsButton() {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  const createClubMutation = useMutation({
    mutationFn: async (club: { name: string; description: string; displayOrder: number }) => {
      const response = await apiRequest("POST", "/api/resy/clubs", club);
      return response.json();
    },
  });

  const handleCreateDefaults = async () => {
    setIsCreating(true);
    try {
      for (let i = 0; i < DEFAULT_CLUBS.length; i++) {
        await createClubMutation.mutateAsync({
          ...DEFAULT_CLUBS[i],
          displayOrder: i,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/resy/clubs"] });
      toast({
        title: "Clubs Created",
        description: "Default club tiers have been created successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleCreateDefaults} disabled={isCreating} data-testid="button-create-defaults">
      {isCreating ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Wine className="w-4 h-4 mr-2" />
      )}
      Create Default Clubs
    </Button>
  );
}

function ClubCard({
  club,
  experiences,
  clubDiscounts,
  onEdit,
}: {
  club: Club;
  experiences: Experience[];
  clubDiscounts: ClubExperienceDiscount[];
  onEdit: (club: Club) => void;
}) {
  const { toast } = useToast();
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<ClubExperienceDiscount | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/clubs/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/clubs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/club-discounts"] });
      toast({
        title: "Club Deleted",
        description: "The club has been removed successfully",
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

  const getExperienceName = (experienceId: string) => {
    return experiences.find(e => e.id === experienceId)?.name || "Unknown Experience";
  };

  const handleAddDiscount = () => {
    setEditingDiscount(null);
    setIsDiscountDialogOpen(true);
  };

  const handleEditDiscount = (discount: ClubExperienceDiscount) => {
    setEditingDiscount(discount);
    setIsDiscountDialogOpen(true);
  };

  return (
    <Card>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="details" className="border-0">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4 flex-1">
              <AccordionTrigger className="hover:no-underline p-0 [&[data-state=open]>svg]:rotate-90">
                <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200" />
              </AccordionTrigger>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{club.name}</h3>
                  {!club.isActive && (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>
                {club.description && (
                  <p className="text-sm text-muted-foreground mt-1">{club.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="whitespace-nowrap">
                  {clubDiscounts.length} {clubDiscounts.length === 1 ? 'Discount' : 'Discounts'}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Button variant="outline" size="sm" onClick={() => onEdit(club)} data-testid={`button-edit-club-${club.id}`}>
                <Pencil className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" data-testid={`button-delete-club-${club.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Club?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{club.name}" and all its experience discounts.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate(club.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Delete"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          <AccordionContent className="px-6 pb-4">
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">Experience Discounts</h4>
                <Dialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" onClick={handleAddDiscount} data-testid={`button-add-discount-${club.id}`}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Discount
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingDiscount ? "Edit Discount" : "Add Experience Discount"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingDiscount 
                          ? `Update discount for ${club.name}`
                          : `Set up a discount for ${club.name} members`}
                      </DialogDescription>
                    </DialogHeader>
                    <ClubDiscountForm
                      clubId={club.id}
                      discount={editingDiscount}
                      experiences={experiences}
                      existingDiscounts={clubDiscounts}
                      onSuccess={() => {
                        setIsDiscountDialogOpen(false);
                        setEditingDiscount(null);
                      }}
                    />
                  </DialogContent>
                </Dialog>
              </div>

              {clubDiscounts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Experience</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clubDiscounts.map((discount) => (
                      <ClubDiscountRow
                        key={discount.id}
                        discount={discount}
                        experienceName={getExperienceName(discount.experienceId)}
                        onEdit={handleEditDiscount}
                      />
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-6 text-muted-foreground border rounded-lg">
                  <p>No discounts configured for this club</p>
                  <p className="text-sm mt-1">Add discounts to give members special pricing on experiences</p>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}

function ClubDiscountRow({
  discount,
  experienceName,
  onEdit,
}: {
  discount: ClubExperienceDiscount;
  experienceName: string;
  onEdit: (discount: ClubExperienceDiscount) => void;
}) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/club-discounts/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/club-discounts"] });
      toast({
        title: "Discount Deleted",
        description: "The discount has been removed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatDiscount = () => {
    if (discount.discountType === 'percentage') {
      return `${parseFloat(discount.discountValue).toFixed(0)}% off`;
    }
    return `$${parseFloat(discount.discountValue).toFixed(2)} off`;
  };

  return (
    <TableRow data-testid={`discount-row-${discount.id}`}>
      <TableCell className="font-medium">{experienceName}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {discount.discountType === 'percentage' ? (
            <Percent className="w-4 h-4 text-muted-foreground" />
          ) : (
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          )}
          {formatDiscount()}
        </div>
      </TableCell>
      <TableCell>
        {discount.isActive ? (
          <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>
        ) : (
          <Badge variant="secondary">Inactive</Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(discount)} data-testid={`button-edit-discount-${discount.id}`}>
            <Pencil className="w-4 h-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" data-testid={`button-delete-discount-${discount.id}`}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Discount?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove the discount for {experienceName}.
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
      </TableCell>
    </TableRow>
  );
}

function ClubForm({
  club,
  onSuccess,
}: {
  club: Club | null;
  onSuccess: () => void;
}) {
  const { toast } = useToast();

  const form = useForm<InsertClub>({
    resolver: zodResolver(insertClubSchema),
    defaultValues: {
      name: club?.name || "",
      description: club?.description || "",
      displayOrder: club?.displayOrder ?? 0,
      isActive: club?.isActive ?? true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertClub) => {
      const response = await apiRequest("POST", "/api/resy/clubs", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/clubs"] });
      toast({
        title: "Club Created",
        description: "The new club has been created successfully",
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
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertClub) => {
      const response = await apiRequest("PUT", `/api/clubs/${club!.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/clubs"] });
      toast({
        title: "Club Updated",
        description: "The club has been updated successfully",
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
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertClub) => {
    if (club) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Club Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Wine Club" {...field} data-testid="input-club-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the benefits of this club membership"
                  {...field}
                  value={field.value || ""}
                  data-testid="input-club-description"
                />
              </FormControl>
              <FormMessage />
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
                  min={0}
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  data-testid="input-club-order"
                />
              </FormControl>
              <FormDescription>Lower numbers appear first</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active</FormLabel>
                <FormDescription>
                  Inactive clubs won't apply discounts to bookings
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="switch-club-active"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isPending} data-testid="button-save-club">
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {club ? "Update Club" : "Create Club"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function ClubDiscountForm({
  clubId,
  discount,
  experiences,
  existingDiscounts,
  onSuccess,
}: {
  clubId: string;
  discount: ClubExperienceDiscount | null;
  experiences: Experience[];
  existingDiscounts: ClubExperienceDiscount[];
  onSuccess: () => void;
}) {
  const { toast } = useToast();

  const discountFormSchema = z.object({
    experienceId: z.string().min(1, "Experience is required"),
    discountType: z.enum(['percentage', 'fixed']),
    discountValue: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Must be a positive number"),
    isActive: z.boolean().default(true),
  });

  type DiscountFormValues = z.infer<typeof discountFormSchema>;

  const form = useForm<DiscountFormValues>({
    resolver: zodResolver(discountFormSchema),
    defaultValues: {
      experienceId: discount?.experienceId || "",
      discountType: (discount?.discountType as 'percentage' | 'fixed') || 'percentage',
      discountValue: discount?.discountValue || "",
      isActive: discount?.isActive ?? true,
    },
  });

  const availableExperiences = experiences.filter(exp => {
    if (discount && exp.id === discount.experienceId) return true;
    return !existingDiscounts.some(d => d.experienceId === exp.id);
  });

  const createMutation = useMutation({
    mutationFn: async (data: DiscountFormValues) => {
      const response = await apiRequest("POST", `/api/clubs/${clubId}/discounts`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/club-discounts"] });
      toast({
        title: "Discount Created",
        description: "The experience discount has been added",
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

  const updateMutation = useMutation({
    mutationFn: async (data: DiscountFormValues) => {
      const response = await apiRequest("PUT", `/api/club-discounts/${discount!.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/club-discounts"] });
      toast({
        title: "Discount Updated",
        description: "The discount has been updated",
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

  const onSubmit = (data: DiscountFormValues) => {
    if (discount) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const discountType = form.watch("discountType");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="experienceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Experience</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={!!discount}>
                <FormControl>
                  <SelectTrigger data-testid="select-experience">
                    <SelectValue placeholder="Select an experience" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableExperiences.map((exp) => (
                    <SelectItem key={exp.id} value={exp.id}>
                      {exp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableExperiences.length === 0 && !discount && (
                <p className="text-sm text-muted-foreground">All experiences already have discounts for this club</p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="discountType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Discount Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
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
                {discountType === 'percentage' ? 'Discount Percentage' : 'Discount Amount'}
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {discountType === 'percentage' ? '%' : '$'}
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="pl-8"
                    placeholder={discountType === 'percentage' ? "e.g., 15" : "e.g., 10.00"}
                    {...field}
                    data-testid="input-discount-value"
                  />
                </div>
              </FormControl>
              <FormDescription>
                {discountType === 'percentage'
                  ? "Enter percentage (e.g., 15 for 15% off)"
                  : "Enter dollar amount (e.g., 10.00 for $10 off)"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active</FormLabel>
                <FormDescription>
                  Inactive discounts won't be applied to bookings
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

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isPending || (availableExperiences.length === 0 && !discount)} data-testid="button-save-discount">
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {discount ? "Update Discount" : "Add Discount"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
