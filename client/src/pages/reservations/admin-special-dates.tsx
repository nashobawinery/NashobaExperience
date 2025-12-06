import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { insertResySpecialDateSchema, type InsertResySpecialDate, type ResySpecialDate, type ResyLocation } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function AdminSpecialDates() {
  const { toast } = useToast();
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSpecialDate, setEditingSpecialDate] = useState<ResySpecialDate | null>(null);

  const { data: locations, isLoading: locationsLoading } = useQuery<ResyLocation[]>({
    queryKey: ["/api/resy/locations"],
  });

  const { data: allSpecialDates, isLoading: specialDatesLoading } = useQuery<ResySpecialDate[]>({
    queryKey: ["/api/resy/special-dates"],
  });

  const filteredSpecialDates = selectedLocationId 
    ? allSpecialDates?.filter(sd => sd.locationId === selectedLocationId)
    : allSpecialDates;

  // Group special dates by location for better organization
  const specialDatesByLocation = filteredSpecialDates?.reduce((acc, sd) => {
    if (!acc[sd.locationId]) {
      acc[sd.locationId] = [];
    }
    acc[sd.locationId].push(sd);
    return acc;
  }, {} as Record<string, ResySpecialDate[]>) || {};

  const handleEdit = (specialDate: ResySpecialDate) => {
    setEditingSpecialDate(specialDate);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingSpecialDate(null);
    setIsDialogOpen(true);
  };

  const isLoading = locationsLoading || specialDatesLoading;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl md:text-4xl font-semibold mb-2">Special Dates</h1>
        <p className="text-muted-foreground">
          Configure special operating hours or closures for specific dates (holidays, events, etc.).
        </p>
      </div>

      {/* Location Filter and Add Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-full sm:w-64">
            <Select
              value={selectedLocationId || "all"}
              onValueChange={(value) => setSelectedLocationId(value === "all" ? "" : value)}
              disabled={isLoading}
            >
              <SelectTrigger data-testid="select-location-filter">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations?.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleAdd} data-testid="button-add-special-date">
          <Plus className="w-4 h-4 mr-2" />
          Add Special Date
        </Button>
      </div>

      {/* Special Dates List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : !filteredSpecialDates || filteredSpecialDates.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No special dates configured.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(specialDatesByLocation).map(([locationId, specialDates]) => {
            const location = locations?.find(l => l.id === locationId);
            return (
              <div key={locationId}>
                <h2 className="text-lg font-semibold mb-3">{location?.name || "Unknown Location"}</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {specialDates.map((specialDate) => (
                    <SpecialDateCard
                      key={specialDate.id}
                      specialDate={specialDate}
                      location={location}
                      onEdit={handleEdit}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <SpecialDateDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        specialDate={editingSpecialDate}
        locations={locations || []}
        defaultLocationId={selectedLocationId}
      />
    </div>
  );
}

interface SpecialDateCardProps {
  specialDate: ResySpecialDate;
  location?: ResyLocation;
  onEdit: (specialDate: ResySpecialDate) => void;
}

function SpecialDateCard({ specialDate, location, onEdit }: SpecialDateCardProps) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/resy/special-dates/${specialDate.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/special-dates"] });
      toast({
        title: "Special date deleted",
        description: "The special date has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You must be logged in to delete special dates.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to delete special date.",
          variant: "destructive",
        });
      }
    },
  });

  const formatDate = () => {
    if (!specialDate.date) return "No date set";
    try {
      const date = new Date(specialDate.date + "T00:00:00");
      if (isNaN(date.getTime())) return "Invalid date";
      return format(date, "MMM d, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{formatDate()}</CardTitle>
            <CardDescription className="text-sm mt-1">
              {specialDate.name || (specialDate.isClosed ? "Closed" : "Special Hours")}
            </CardDescription>
          </div>
          <Badge variant={specialDate.isClosed ? "destructive" : "secondary"} className="shrink-0">
            {specialDate.isClosed ? "Closed" : "Modified Hours"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {!specialDate.isClosed && (specialDate.openTime || specialDate.closeTime) && (
          <div className="text-sm mb-4">
            <span className="text-muted-foreground">Hours:</span>
            <p className="mt-1">
              {specialDate.openTime || "?"} - {specialDate.closeTime || "?"}
            </p>
          </div>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(specialDate)}
            data-testid={`button-edit-special-date-${specialDate.id}`}
          >
            <Pencil className="w-3 h-3 mr-2" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                data-testid={`button-delete-special-date-${specialDate.id}`}
              >
                <Trash2 className="w-3 h-3 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Special Date</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this special date? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

interface SpecialDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  specialDate: ResySpecialDate | null;
  locations: ResyLocation[];
  defaultLocationId?: string;
}

function SpecialDateDialog({ open, onOpenChange, specialDate, locations, defaultLocationId }: SpecialDateDialogProps) {
  const { toast } = useToast();
  const isEditing = !!specialDate;

  const form = useForm<InsertResySpecialDate>({
    resolver: zodResolver(insertResySpecialDateSchema),
    defaultValues: {
      locationId: specialDate?.locationId || defaultLocationId || "",
      date: specialDate?.date || "",
      name: specialDate?.name || "",
      isClosed: specialDate?.isClosed ?? true,
      openTime: specialDate?.openTime || "",
      closeTime: specialDate?.closeTime || "",
    },
  });

  // Reset form when dialog opens with new data
  const resetForm = () => {
    form.reset({
      locationId: specialDate?.locationId || defaultLocationId || "",
      date: specialDate?.date || "",
      name: specialDate?.name || "",
      isClosed: specialDate?.isClosed ?? true,
      openTime: specialDate?.openTime || "",
      closeTime: specialDate?.closeTime || "",
    });
  };

  const createMutation = useMutation({
    mutationFn: async (data: InsertResySpecialDate) => {
      const response = await apiRequest("POST", "/api/resy/special-dates", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/special-dates"] });
      toast({
        title: "Special date created",
        description: "The special date has been created successfully.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create special date.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertResySpecialDate) => {
      const response = await apiRequest("PUT", `/api/resy/special-dates/${specialDate?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/special-dates"] });
      toast({
        title: "Special date updated",
        description: "The special date has been updated successfully.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update special date.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertResySpecialDate) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isClosed = form.watch("isClosed");

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (newOpen) resetForm();
      onOpenChange(newOpen);
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Special Date" : "Add Special Date"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update the special date details below."
              : "Configure a closure or modified hours for a specific date."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-location">
                        <SelectValue placeholder="Select a location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          data-testid="button-select-date"
                        >
                          {field.value ? (
                            format(new Date(field.value + "T00:00:00"), "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value + "T00:00:00") : undefined}
                        onSelect={(date) => {
                          if (date) {
                            field.onChange(format(date, "yyyy-MM-dd"));
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name (optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      placeholder="e.g., Christmas Day, Private Event"
                      data-testid="input-name"
                    />
                  </FormControl>
                  <FormDescription>A name or reason for this special date.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isClosed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Closed</FormLabel>
                    <FormDescription>
                      Location is completely closed on this date
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-is-closed"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {!isClosed && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="openTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Open Time</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          type="time"
                          data-testid="input-open-time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="closeTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Close Time</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          type="time"
                          data-testid="input-close-time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-save-special-date">
                {isPending ? "Saving..." : isEditing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
