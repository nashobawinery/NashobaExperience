import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { insertSpecialDateSchema, type InsertSpecialDate, type SpecialDate, type Experience } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function AdminSpecialDates() {
  const { toast } = useToast();
  const [selectedExperienceId, setSelectedExperienceId] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSpecialDate, setEditingSpecialDate] = useState<SpecialDate | null>(null);

  const { data: experiences, isLoading: experiencesLoading } = useQuery<Experience[]>({
    queryKey: ["/api/resy/experiences"],
  });

  const { data: allSpecialDates, isLoading: specialDatesLoading } = useQuery<SpecialDate[]>({
    queryKey: ["/api/resy/special-dates"],
  });

  const filteredSpecialDates = selectedExperienceId 
    ? allSpecialDates?.filter(sd => sd.experienceId === selectedExperienceId)
    : allSpecialDates;

  // Group special dates by experience for better organization
  const specialDatesByExperience = filteredSpecialDates?.reduce((acc, sd) => {
    if (!acc[sd.experienceId]) {
      acc[sd.experienceId] = [];
    }
    acc[sd.experienceId].push(sd);
    return acc;
  }, {} as Record<string, SpecialDate[]>) || {};

  const handleEdit = (specialDate: SpecialDate) => {
    setEditingSpecialDate(specialDate);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingSpecialDate(null);
    setIsDialogOpen(true);
  };

  const isLoading = experiencesLoading || specialDatesLoading;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl md:text-4xl font-semibold mb-2">Special Dates</h1>
        <p className="text-muted-foreground">
          Close specific experiences for date ranges (vacations, short staffing, etc.). 
          Customers will not be able to book during these periods.
        </p>
      </div>

      {/* Experience Filter and Add Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-full sm:w-64">
            <Select
              value={selectedExperienceId || undefined}
              onValueChange={(value) => setSelectedExperienceId(value || "")}
              disabled={isLoading}
            >
              <SelectTrigger data-testid="select-experience-filter">
                <SelectValue placeholder="All Experiences" />
              </SelectTrigger>
              <SelectContent>
                {experiences?.map((experience) => (
                  <SelectItem key={experience.id} value={experience.id}>
                    {experience.name}
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
          {Object.entries(specialDatesByExperience).map(([experienceId, specialDates]) => {
            const experience = experiences?.find(e => e.id === experienceId);
            return (
              <div key={experienceId}>
                <h2 className="text-lg font-semibold mb-3">{experience?.name || "Unknown Experience"}</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {specialDates.map((specialDate) => (
                    <SpecialDateCard
                      key={specialDate.id}
                      specialDate={specialDate}
                      experience={experience}
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
        experiences={experiences || []}
        defaultExperienceId={selectedExperienceId}
      />
    </div>
  );
}

interface SpecialDateCardProps {
  specialDate: SpecialDate;
  experience?: Experience;
  onEdit: (specialDate: SpecialDate) => void;
}

function SpecialDateCard({ specialDate, experience, onEdit }: SpecialDateCardProps) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/special-dates/${specialDate.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/special-dates"] });
      toast({
        title: "Special date deleted",
        description: "The closure has been deleted successfully.",
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

  const formatDateRange = () => {
    const start = new Date(specialDate.startDate);
    if (!specialDate.endDate) {
      return format(start, "MMM d, yyyy");
    }
    const end = new Date(specialDate.endDate);
    return `${format(start, "MMM d, yyyy")} - ${format(end, "MMM d, yyyy")}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{formatDateRange()}</CardTitle>
            <CardDescription className="text-sm mt-1">{experience?.name || "Unknown Experience"}</CardDescription>
          </div>
          {!specialDate.isActive && (
            <Badge variant="secondary" className="shrink-0">
              Inactive
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {specialDate.reason && (
          <div className="text-sm mb-4">
            <span className="text-muted-foreground">Reason:</span>
            <p className="mt-1 line-clamp-2">{specialDate.reason}</p>
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
                <AlertDialogTitle>Delete Special Date?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove the closure for {formatDateRange()}. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  data-testid="button-confirm-delete"
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
  specialDate: SpecialDate | null;
  experiences: Experience[];
  defaultExperienceId?: string;
}

function SpecialDateDialog({ open, onOpenChange, specialDate, experiences, defaultExperienceId }: SpecialDateDialogProps) {
  const { toast } = useToast();
  const isEditing = !!specialDate;

  const form = useForm<InsertSpecialDate>({
    resolver: zodResolver(insertSpecialDateSchema),
    defaultValues: specialDate ? {
      experienceId: specialDate.experienceId,
      startDate: specialDate.startDate,
      endDate: specialDate.endDate || "",
      reason: specialDate.reason || "",
      isActive: specialDate.isActive,
    } : {
      experienceId: defaultExperienceId || "",
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: "",
      reason: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertSpecialDate) => {
      return await apiRequest("POST", "/api/resy/special-dates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/special-dates"] });
      toast({
        title: "Special date created",
        description: "The closure has been created successfully.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You must be logged in to create special dates.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to create special date.",
          variant: "destructive",
        });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertSpecialDate) => {
      return await apiRequest("PATCH", `/api/special-dates/${specialDate!.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/special-dates"] });
      toast({
        title: "Special date updated",
        description: "The closure has been updated successfully.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You must be logged in to update special dates.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to update special date.",
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = async (data: InsertSpecialDate) => {
    // Convert empty string to null for endDate
    const payload = {
      ...data,
      endDate: data.endDate || null,
      reason: data.reason || null,
    };

    if (isEditing) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Special Date" : "Add Special Date"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update the closure period for this experience."
              : "Create a closure period when this experience will be unavailable."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="experienceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Experience</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-experience">
                        <SelectValue placeholder="Select experience" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {experiences.map((experience) => (
                        <SelectItem key={experience.id} value={experience.id}>
                          {experience.name}
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
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Start Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="justify-start text-left font-normal"
                          disabled={isPending}
                          data-testid="button-start-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
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
              name="endDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>End Date (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="justify-start text-left font-normal"
                          disabled={isPending}
                          data-testid="button-end-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(new Date(field.value), "PPP") : <span>Single day closure</span>}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
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
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="e.g., Vacation, Short Staffed, Maintenance"
                      disabled={isPending}
                      data-testid="input-reason"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                data-testid="button-submit"
              >
                {isPending ? "Saving..." : isEditing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
