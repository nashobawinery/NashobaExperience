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
import { Plus, Pencil, Trash2, Loader2, CalendarOff, Users, Mail, Phone, Clock } from "lucide-react";
import { format, parse, isValid } from "date-fns";
import type { 
  Location, 
  ResyPrivateEvent,
  InsertResyPrivateEvent,
  ResyExperience
} from "@shared/schema";
import { insertResyPrivateEventSchema } from "@shared/schema";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "completed", label: "Completed" },
];

export default function AdminPrivateEvents() {
  const { toast } = useToast();
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ResyPrivateEvent | null>(null);

  const { data: locations, isLoading: locationsLoading } = useQuery<Location[]>({
    queryKey: ["/api/resy/locations"],
  });

  const { data: experiences, isLoading: experiencesLoading } = useQuery<ResyExperience[]>({
    queryKey: ["/api/resy/experiences"],
  });

  const { data: allEvents, isLoading: eventsLoading } = useQuery<ResyPrivateEvent[]>({
    queryKey: ["/api/resy/private-events"],
  });

  const filteredEvents = selectedLocationId 
    ? allEvents?.filter(event => event.locationId === selectedLocationId)
    : allEvents;

  const eventsByDate = filteredEvents?.reduce((acc, event) => {
    const dateKey = event.eventDate || "unknown";
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, ResyPrivateEvent[]>) || {};

  const sortedDates = Object.keys(eventsByDate).sort((a, b) => a.localeCompare(b));

  const handleEdit = (event: ResyPrivateEvent) => {
    setEditingEvent(event);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingEvent(null);
    setIsDialogOpen(true);
  };

  const isLoading = locationsLoading || experiencesLoading || eventsLoading;

  const formatDateDisplay = (dateStr: string): string => {
    if (!dateStr) return "Unknown Date";
    try {
      const parsed = parse(dateStr, "yyyy-MM-dd", new Date());
      if (isValid(parsed)) {
        return format(parsed, "EEEE, MMMM d, yyyy");
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl md:text-4xl font-semibold mb-2">Private Events</h1>
        <p className="text-muted-foreground">
          Manage private event bookings and reservations for special occasions.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-full sm:w-64">
            <Select value={selectedLocationId || "__all__"} onValueChange={(v) => setSelectedLocationId(v === "__all__" ? "" : v)}>
              <SelectTrigger data-testid="select-location-filter">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Locations</SelectItem>
                {locations?.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
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
                  {formatDateDisplay(date)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {eventsByDate[date].map((event) => (
                    <PrivateEventCard
                      key={event.id}
                      event={event}
                      locations={locations || []}
                      experiences={experiences || []}
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
              <p className="text-sm mt-2">Add a private event to start managing bookings</p>
            </div>
          </CardContent>
        </Card>
      )}

      <PrivateEventDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        event={editingEvent}
        locations={locations || []}
        experiences={experiences || []}
        defaultLocationId={selectedLocationId}
      />
    </div>
  );
}

interface PrivateEventCardProps {
  event: ResyPrivateEvent;
  locations: Location[];
  experiences: ResyExperience[];
  onEdit: (event: ResyPrivateEvent) => void;
}

function PrivateEventCard({ event, locations, experiences, onEdit }: PrivateEventCardProps) {
  const { toast } = useToast();
  const location = locations.find(l => l.id === event.locationId);
  const experience = experiences.find(e => e.id === event.experienceId);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/resy/private-events/${event.id}`);
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      confirmed: "default",
      cancelled: "destructive",
      completed: "outline",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{event.customerName}</CardTitle>
            <CardDescription className="text-sm mt-1">
              {experience?.name || "Private Event"}
            </CardDescription>
          </div>
          {getStatusBadge(event.status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span>{event.startTime} - {event.endTime}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-3 h-3 text-muted-foreground" />
            <span>{event.partySize} guests</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-3 h-3 text-muted-foreground" />
            <span className="truncate">{event.customerEmail}</span>
          </div>
          {event.customerPhone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3 h-3 text-muted-foreground" />
              <span>{event.customerPhone}</span>
            </div>
          )}
          {location && (
            <div className="text-xs text-muted-foreground mt-2">
              {location.name}
            </div>
          )}
          {event.notes && (
            <div className="mt-2 pt-2 border-t">
              <p className="text-muted-foreground text-xs">Notes:</p>
              <p className="text-sm line-clamp-2">{event.notes}</p>
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
                variant="destructive"
                disabled={deleteMutation.isPending}
                data-testid={`button-delete-event-${event.id}`}
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
                <AlertDialogTitle>Delete Private Event</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this private event for {event.customerName}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
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
  event: ResyPrivateEvent | null;
  locations: Location[];
  experiences: ResyExperience[];
  defaultLocationId?: string;
}

function PrivateEventDialog({ 
  open, 
  onOpenChange, 
  event, 
  locations, 
  experiences,
  defaultLocationId 
}: PrivateEventDialogProps) {
  const { toast } = useToast();
  const isEditing = !!event;

  const form = useForm<InsertResyPrivateEvent>({
    resolver: zodResolver(insertResyPrivateEventSchema),
    defaultValues: {
      experienceId: "",
      locationId: defaultLocationId || "",
      eventDate: format(new Date(), "yyyy-MM-dd"),
      startTime: "18:00",
      endTime: "22:00",
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      partySize: 10,
      status: "pending",
      notes: "",
    },
  });

  const resetForm = () => {
    if (event) {
      form.reset({
        experienceId: event.experienceId,
        locationId: event.locationId || "",
        eventDate: event.eventDate,
        startTime: event.startTime,
        endTime: event.endTime,
        customerName: event.customerName,
        customerEmail: event.customerEmail,
        customerPhone: event.customerPhone || "",
        partySize: event.partySize,
        status: event.status,
        notes: event.notes || "",
      });
    } else {
      form.reset({
        experienceId: "",
        locationId: defaultLocationId || "",
        eventDate: format(new Date(), "yyyy-MM-dd"),
        startTime: "18:00",
        endTime: "22:00",
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        partySize: 10,
        status: "pending",
        notes: "",
      });
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: InsertResyPrivateEvent) => {
      await apiRequest("POST", "/api/resy/private-events", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/private-events"] });
      toast({
        title: "Event created",
        description: "Private event has been created successfully.",
      });
      onOpenChange(false);
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
    mutationFn: async (data: InsertResyPrivateEvent) => {
      await apiRequest("PATCH", `/api/resy/private-events/${event!.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/private-events"] });
      toast({
        title: "Event updated",
        description: "Private event has been updated successfully.",
      });
      onOpenChange(false);
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

  const onSubmit = (data: InsertResyPrivateEvent) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" onOpenAutoFocus={() => resetForm()}>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Private Event" : "Add Private Event"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the private event details" : "Create a new private event booking"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="experienceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Experience *</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isPending}
                    >
                      <SelectTrigger data-testid="select-experience">
                        <SelectValue placeholder="Select experience" />
                      </SelectTrigger>
                      <SelectContent>
                        {experiences?.map((exp) => (
                          <SelectItem key={exp.id} value={exp.id}>{exp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value || "__none__"}
                      onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                      disabled={isPending}
                    >
                      <SelectTrigger data-testid="select-location">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No specific location</SelectItem>
                        {locations?.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="eventDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Date *</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      disabled={isPending}
                      data-testid="input-event-date"
                    />
                  </FormControl>
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
                    <FormLabel>Start Time *</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        disabled={isPending}
                        data-testid="input-start-time"
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
                    <FormLabel>End Time *</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        disabled={isPending}
                        data-testid="input-end-time"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Full name"
                      disabled={isPending}
                      data-testid="input-customer-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customerEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Email *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      {...field}
                      placeholder="email@example.com"
                      disabled={isPending}
                      data-testid="input-customer-email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customerPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Phone</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      {...field}
                      value={field.value || ""}
                      placeholder="(555) 123-4567"
                      disabled={isPending}
                      data-testid="input-customer-phone"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="partySize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Party Size *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      disabled={isPending}
                      data-testid="input-party-size"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isPending}
                    >
                      <SelectTrigger data-testid="select-status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
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
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      placeholder="Special requests, dietary restrictions, etc."
                      rows={3}
                      disabled={isPending}
                      data-testid="input-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                data-testid="button-save-event"
              >
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditing ? "Update Event" : "Create Event"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
