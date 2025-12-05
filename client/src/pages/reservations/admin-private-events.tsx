import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2, CalendarOff } from "lucide-react";
import { format, parse } from "date-fns";
import type { 
  Location, 
  MealPeriod, 
  PrivateEvent,
  InsertPrivateEvent
} from "@shared/schema";
import { insertPrivateEventSchema } from "@shared/schema";

export default function AdminPrivateEvents() {
  const { toast } = useToast();
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PrivateEvent | null>(null);

  const { data: locations, isLoading: locationsLoading } = useQuery<Location[]>({
    queryKey: ["/api/resy/locations"],
  });

  const { data: mealPeriods, isLoading: periodsLoading } = useQuery<MealPeriod[]>({
    queryKey: ["/api/resy/meal-periods"],
  });

  const { data: allEvents, isLoading: eventsLoading } = useQuery<PrivateEvent[]>({
    queryKey: ["/api/resy/private-events"],
  });

  const filteredEvents = selectedLocationId 
    ? allEvents?.filter(event => event.locationId === selectedLocationId)
    : allEvents;

  // Group events by date for better organization
  const eventsByDate = filteredEvents?.reduce((acc, event) => {
    if (!acc[event.date]) {
      acc[event.date] = [];
    }
    acc[event.date].push(event);
    return acc;
  }, {} as Record<string, PrivateEvent[]>) || {};

  const sortedDates = Object.keys(eventsByDate).sort((a, b) => a.localeCompare(b));

  const handleEdit = (event: PrivateEvent) => {
    setEditingEvent(event);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingEvent(null);
    setIsDialogOpen(true);
  };

  const isLoading = locationsLoading || periodsLoading || eventsLoading;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl md:text-4xl font-semibold mb-2">Private Events</h1>
        <p className="text-muted-foreground">
          Manage private events that close the location during specified times. 
          The system will warn you about existing reservations before booking.
        </p>
      </div>

      {/* Location Filter and Add Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-full sm:w-64">
            <Select
              value={selectedLocationId || undefined}
              onValueChange={(value) => setSelectedLocationId(value || "")}
              disabled={isLoading}
            >
              <SelectTrigger data-testid="select-location-filter">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                {locations?.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedLocationId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedLocationId("")}
              data-testid="button-clear-location-filter"
            >
              Clear
            </Button>
          )}
        </div>
        <Button
          onClick={handleAdd}
          data-testid="button-add-private-event"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Private Event
        </Button>
      </div>

      {/* Events List */}
      {isLoading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 bg-muted rounded animate-pulse w-1/3" />
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredEvents && filteredEvents.length > 0 ? (
        <div className="grid gap-6">
          {sortedDates.map((date) => (
            <Card key={date}>
              <CardHeader>
                <CardTitle className="text-xl">
                  {format(parse(date, "yyyy-MM-dd", new Date()), "EEEE, MMMM d, yyyy")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {eventsByDate[date].map((event) => (
                    <PrivateEventCard
                      key={event.id}
                      event={event}
                      locations={locations || []}
                      mealPeriods={mealPeriods || []}
                      onEdit={handleEdit}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16">
            <div className="text-center text-muted-foreground">
              <CalendarOff className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No private events scheduled</p>
              <p className="text-sm mt-2">Add a private event to block availability for specific meal periods</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <PrivateEventDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        event={editingEvent}
        locations={locations || []}
        mealPeriods={mealPeriods || []}
        defaultLocationId={selectedLocationId}
      />
    </div>
  );
}

interface PrivateEventCardProps {
  event: PrivateEvent;
  locations: Location[];
  mealPeriods: MealPeriod[];
  onEdit: (event: PrivateEvent) => void;
}

function PrivateEventCard({ event, locations, mealPeriods, onEdit }: PrivateEventCardProps) {
  const { toast } = useToast();
  const location = locations.find(l => l.id === event.locationId);
  const mealPeriod = mealPeriods.find(mp => mp.id === event.mealPeriodId);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/private-events/${event.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/private-events"] });
      toast({
        title: "Event deleted",
        description: "Private event has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You must be logged in to delete private events.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to delete private event.",
          variant: "destructive",
        });
      }
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{location?.name || "Unknown Location"}</CardTitle>
            <CardDescription className="text-sm mt-1">{mealPeriod?.name || "Unknown Period"}</CardDescription>
          </div>
          {!event.isActive && (
            <Badge variant="secondary" className="shrink-0">
              Inactive
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Time:</span>
            <span>{event.startTime} - {event.endTime}</span>
          </div>
          {event.message && (
            <div>
              <span className="text-muted-foreground">Message:</span>
              <p className="mt-1 text-sm line-clamp-2">{event.message}</p>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(event)}
            data-testid={`button-edit-event-${event.id}`}
          >
            <Pencil className="w-3 h-3 mr-2" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                data-testid={`button-delete-event-${event.id}`}
              >
                <Trash2 className="w-3 h-3 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Private Event</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this private event? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  data-testid="button-confirm-delete"
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

interface PrivateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: PrivateEvent | null;
  locations: Location[];
  mealPeriods: MealPeriod[];
  defaultLocationId?: string;
}

interface ConflictData {
  id: string;
  customerName: string;
  customerEmail: string;
  time: string;
  partySize: number;
  experienceName: string;
}

interface ConflictResponse {
  hasConflicts: boolean;
  conflictCount: number;
  conflicts: ConflictData[];
}

function PrivateEventDialog({ open, onOpenChange, event, locations, mealPeriods, defaultLocationId }: PrivateEventDialogProps) {
  const { toast } = useToast();
  const isEditing = !!event;
  const [conflicts, setConflicts] = useState<ConflictData[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [pendingData, setPendingData] = useState<InsertPrivateEvent | null>(null);

  const form = useForm<InsertPrivateEvent>({
    resolver: zodResolver(insertPrivateEventSchema),
    defaultValues: event ? {
      locationId: event.locationId,
      mealPeriodId: event.mealPeriodId,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      message: event.message,
      isActive: event.isActive,
    } : {
      locationId: defaultLocationId || "",
      mealPeriodId: "",
      date: format(new Date(), "yyyy-MM-dd"),
      startTime: "17:00",
      endTime: "22:00",
      message: "Closed for private event",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertPrivateEvent) => {
      return await apiRequest("POST", "/api/resy/private-events", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/private-events"] });
      toast({
        title: "Event created",
        description: "Private event has been created successfully.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You must be logged in to create private events.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to create private event.",
          variant: "destructive",
        });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertPrivateEvent) => {
      return await apiRequest("PATCH", `/api/private-events/${event!.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/private-events"] });
      toast({
        title: "Event updated",
        description: "Private event has been updated successfully.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You must be logged in to update private events.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to update private event.",
          variant: "destructive",
        });
      }
    },
  });

  const checkConflicts = async (data: InsertPrivateEvent): Promise<ConflictResponse> => {
    try {
      const response = await fetch(
        `/api/private-events/check-conflicts?locationId=${data.locationId}&date=${data.date}&startTime=${data.startTime}&endTime=${data.endTime}${data.mealPeriodId ? `&mealPeriodId=${data.mealPeriodId}` : ''}`
      );
      if (!response.ok) {
        throw new Error("Failed to check conflicts");
      }
      return await response.json();
    } catch (error) {
      console.error("Error checking conflicts:", error);
      return { hasConflicts: false, conflictCount: 0, conflicts: [] };
    }
  };

  const onSubmit = async (data: InsertPrivateEvent) => {
    // Check for conflicts before submitting
    const conflictResponse = await checkConflicts(data);
    
    if (conflictResponse.hasConflicts) {
      // Show conflict dialog
      setConflicts(conflictResponse.conflicts);
      setPendingData(data);
      setShowConflictDialog(true);
    } else {
      // No conflicts, proceed with submission
      if (isEditing) {
        updateMutation.mutate(data);
      } else {
        createMutation.mutate(data);
      }
    }
  };

  const confirmBookingWithConflicts = () => {
    if (pendingData) {
      if (isEditing) {
        updateMutation.mutate(pendingData);
      } else {
        createMutation.mutate(pendingData);
      }
      setShowConflictDialog(false);
      setPendingData(null);
      setConflicts([]);
    }
  };

  const cancelBooking = () => {
    setShowConflictDialog(false);
    setPendingData(null);
    setConflicts([]);
  };

  const selectedLocationId = form.watch("locationId");
  const filteredMealPeriods = mealPeriods.filter(mp => mp.locationId === selectedLocationId);

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Private Event" : "Add Private Event"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update the private event details. The location will be closed during this event's time period." 
              : "Create a new private event to close the location for a specific time period. You'll be notified if there are existing reservations."}
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
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-event-location">
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
              name="mealPeriodId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meal Period</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isPending || !selectedLocationId}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-event-meal-period">
                        <SelectValue placeholder={!selectedLocationId ? "Select a location first" : "Select a meal period"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredMealPeriods.map((period) => (
                        <SelectItem key={period.id} value={period.id}>
                          {period.name} ({period.startTime} - {period.endTime})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the meal period that will be blocked by this private event
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      disabled={isPending}
                      data-testid="input-event-date"
                    />
                  </FormControl>
                  <FormDescription>
                    The date when this private event occurs
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        disabled={isPending}
                        data-testid="input-event-start-time"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        disabled={isPending}
                        data-testid="input-event-end-time"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      disabled={isPending}
                      placeholder="Closed for private event"
                      rows={3}
                      data-testid="input-event-message"
                    />
                  </FormControl>
                  <FormDescription>
                    Custom message to display when this period is blocked (e.g., "Closed for wedding reception")
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                data-testid="button-cancel-event"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                data-testid="button-save-event"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isEditing ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  isEditing ? "Update Event" : "Create Event"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>

      {/* Conflict Warning Dialog */}
      <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Existing Reservations Found</AlertDialogTitle>
            <AlertDialogDescription>
              There are {conflicts.length} existing reservation{conflicts.length !== 1 ? 's' : ''} during this time period. 
              Booking this private event will close the location, potentially affecting these guests.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="max-h-60 overflow-y-auto space-y-2 my-4">
            {conflicts.map((conflict) => (
              <Card key={conflict.id}>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Guest:</span> {conflict.customerName}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {conflict.customerEmail}
                    </div>
                    <div>
                      <span className="font-medium">Time:</span> {conflict.time}
                    </div>
                    <div>
                      <span className="font-medium">Party Size:</span> {conflict.partySize}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelBooking} data-testid="button-cancel-conflict">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmBookingWithConflicts} data-testid="button-confirm-conflict">
              Book Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
