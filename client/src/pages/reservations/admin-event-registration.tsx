import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Users, Code, Calendar, Copy, Check, KeyRound, CalendarOff, DollarSign, Pencil, Printer, ArrowUpDown, ArrowUp, ArrowDown, FileText, BookOpen } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { ResyEventStaffCode, ResyPrivateEvent, ResyLocation } from "@shared/schema";

function formatTime12(time24: string | null | undefined): string {
  if (!time24) return "";
  const [h, m] = time24.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${m} ${ampm}`;
}

export default function AdminEventRegistration() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("staff");

  const { data: staffCodes, isLoading: codesLoading } = useQuery<ResyEventStaffCode[]>({
    queryKey: ["/api/resy/event-staff-codes"],
  });

  const { data: events, isLoading: eventsLoading } = useQuery<ResyPrivateEvent[]>({
    queryKey: ["/api/resy/private-events"],
  });

  const { data: locations } = useQuery<ResyLocation[]>({
    queryKey: ["/api/resy/locations"],
  });

  if (codesLoading || eventsLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const locationMap = new Map(locations?.map(l => [l.id, l.name]) || []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-event-registration-title">Event Registration</h1>
        <p className="text-muted-foreground">Manage staff access codes, view booked events, and generate embed codes</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="staff" className="flex items-center gap-2" data-testid="tab-staff">
            <Users className="h-4 w-4" /> Staff
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2" data-testid="tab-events">
            <Calendar className="h-4 w-4" /> Events
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2" data-testid="tab-reports">
            <FileText className="h-4 w-4" /> Reports
          </TabsTrigger>
          <TabsTrigger value="embed" className="flex items-center gap-2" data-testid="tab-embed">
            <Code className="h-4 w-4" /> Embed
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex items-center gap-2" data-testid="tab-docs">
            <BookOpen className="h-4 w-4" /> Docs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="mt-6">
          <StaffCodesPanel codes={staffCodes || []} />
        </TabsContent>

        <TabsContent value="events" className="mt-6">
          <EventsPanel events={events || []} locationMap={locationMap} />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <ReportsPanel events={events || []} locationMap={locationMap} />
        </TabsContent>

        <TabsContent value="embed" className="mt-6">
          <EmbedPanel />
        </TabsContent>

        <TabsContent value="docs" className="mt-6">
          <DocumentationPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StaffCodesPanel({ codes }: { codes: ResyEventStaffCode[] }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<ResyEventStaffCode | null>(null);
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [code, setCode] = useState("");

  const openCreateDialog = () => {
    setEditingStaff(null);
    setStaffName("");
    setStaffEmail("");
    setCode("");
    setDialogOpen(true);
  };

  const openEditDialog = (staff: ResyEventStaffCode) => {
    setEditingStaff(staff);
    setStaffName(staff.staffName);
    setStaffEmail(staff.email || "");
    setCode(staff.code);
    setDialogOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: async (data: { staffName: string; code: string; email?: string }) => {
      const res = await apiRequest("POST", "/api/resy/event-staff-codes", data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Staff code created" });
      queryClient.invalidateQueries({ queryKey: ["/api/resy/event-staff-codes"] });
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { staffName?: string; code?: string; email?: string | null } }) => {
      const res = await apiRequest("PATCH", `/api/resy/event-staff-codes/${id}`, data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Staff updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/resy/event-staff-codes"] });
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/resy/event-staff-codes/${id}`);
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Staff code removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/resy/event-staff-codes"] });
    },
    onError: () => {
      toast({ title: "Error removing staff code", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/resy/event-staff-codes/${id}`, { isActive });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/event-staff-codes"] });
    },
  });

  const handleSave = () => {
    if (editingStaff) {
      updateMutation.mutate({
        id: editingStaff.id,
        data: { staffName, code, email: staffEmail || null },
      });
    } else {
      createMutation.mutate({ staffName, code, email: staffEmail || undefined });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Event Staff Codes
            </CardTitle>
            <CardDescription>Staff members who can book private events via the portal</CardDescription>
          </div>
          <Button onClick={openCreateDialog} data-testid="button-add-staff-code">
            <Plus className="h-4 w-4 mr-2" /> Add Staff
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {codes.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No staff codes yet. Add staff members to enable the event registration portal.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {codes.map(staff => (
              <div key={staff.id} className="flex items-center justify-between p-3 rounded-md bg-muted/30" data-testid={`staff-code-row-${staff.id}`}>
                <div className="flex items-center gap-3">
                  <Badge variant={staff.isActive ? "default" : "secondary"}>
                    {staff.code}
                  </Badge>
                  <div>
                    <p className="font-medium" data-testid={`text-staff-name-${staff.id}`}>{staff.staffName}</p>
                    {staff.email && (
                      <p className="text-xs text-muted-foreground" data-testid={`text-staff-email-${staff.id}`}>{staff.email}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {staff.lastUsedAt
                        ? `Last used ${format(new Date(staff.lastUsedAt), "MMM d, yyyy h:mm a")}`
                        : "Never used"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(staff)}
                    data-testid={`button-edit-staff-${staff.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleMutation.mutate({ id: staff.id, isActive: !staff.isActive })}
                    data-testid={`button-toggle-staff-${staff.id}`}
                  >
                    {staff.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid={`button-delete-staff-${staff.id}`}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Staff Code</AlertDialogTitle>
                        <AlertDialogDescription>
                          Remove access for {staff.staffName}? They will no longer be able to book events.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(staff.id)}>
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 border rounded-md bg-muted/20">
          <p className="text-sm font-medium mb-1">Portal URL</p>
          <p className="text-sm text-muted-foreground mb-2">Share this link with your private events team:</p>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={`${window.location.origin}/event-registration`}
              className="font-mono text-sm"
              data-testid="input-portal-url"
            />
            <CopyButton text={`${window.location.origin}/event-registration`} />
          </div>
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStaff ? "Edit Staff Member" : "Add Event Staff"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Staff Name</Label>
              <Input
                placeholder="Enter staff member's name"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                data-testid="input-staff-name"
              />
            </div>
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="Enter email for event notifications"
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                data-testid="input-staff-email"
              />
              <p className="text-xs text-muted-foreground mt-1">Staff will receive email notifications when new events are booked</p>
            </div>
            <div>
              <Label>4-Digit Access Code</Label>
              <Input
                placeholder="e.g. 1234"
                value={code}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setCode(v);
                }}
                maxLength={4}
                data-testid="input-staff-code"
              />
              <p className="text-xs text-muted-foreground mt-1">Must be exactly 4 digits</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!staffName || code.length !== 4 || isSaving}
              data-testid="button-save-staff-code"
            >
              {isSaving ? "Saving..." : editingStaff ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function EventsPanel({ events, locationMap }: { events: ResyPrivateEvent[]; locationMap: Map<string, string> }) {
  const { toast } = useToast();
  const sortedEvents = [...events].sort((a, b) => (b.eventDate || '').localeCompare(a.eventDate || ''));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ResyPrivateEvent | null>(null);

  const [eventForm, setEventForm] = useState({
    experienceId: "",
    locationId: "",
    eventDate: "",
    startTime: "",
    endTime: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    partySize: "",
    status: "confirmed",
    notes: "",
    estimatedRevenue: "",
    actualRevenue: "",
  });

  const { data: locations } = useQuery<ResyLocation[]>({
    queryKey: ["/api/resy/locations"],
  });

  const { data: experiences } = useQuery<any[]>({
    queryKey: ["/api/resy/experiences"],
  });

  const openCreateDialog = () => {
    setEditingEvent(null);
    setEventForm({
      experienceId: "",
      locationId: "",
      eventDate: "",
      startTime: "17:00",
      endTime: "22:00",
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      partySize: "",
      status: "confirmed",
      notes: "",
      estimatedRevenue: "",
      actualRevenue: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (event: ResyPrivateEvent) => {
    setEditingEvent(event);
    setEventForm({
      experienceId: event.experienceId || "",
      locationId: event.locationId || "",
      eventDate: event.eventDate,
      startTime: event.startTime,
      endTime: event.endTime,
      customerName: event.customerName,
      customerEmail: event.customerEmail,
      customerPhone: event.customerPhone || "",
      partySize: String(event.partySize),
      status: event.status,
      notes: event.notes || "",
      estimatedRevenue: event.estimatedRevenue != null ? String(event.estimatedRevenue) : "",
      actualRevenue: event.actualRevenue != null ? String(event.actualRevenue) : "",
    });
    setDialogOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/resy/private-events", data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Event created" });
      queryClient.invalidateQueries({ queryKey: ["/api/resy/private-events"] });
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/resy/private-events/${id}`, data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Event updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/resy/private-events"] });
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/resy/private-events/${id}`);
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Event deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/resy/private-events"] });
    },
    onError: () => {
      toast({ title: "Error deleting event", variant: "destructive" });
    },
  });

  const handleSave = () => {
    const payload: any = {
      locationId: eventForm.locationId || null,
      eventDate: eventForm.eventDate,
      startTime: eventForm.startTime,
      endTime: eventForm.endTime,
      customerName: eventForm.customerName,
      customerEmail: eventForm.customerEmail,
      customerPhone: eventForm.customerPhone || null,
      partySize: parseInt(eventForm.partySize) || 1,
      status: eventForm.status,
      notes: eventForm.notes || null,
      estimatedRevenue: eventForm.estimatedRevenue ? parseInt(eventForm.estimatedRevenue) : null,
      actualRevenue: eventForm.actualRevenue ? parseInt(eventForm.actualRevenue) : null,
    };

    if (editingEvent) {
      if (eventForm.experienceId) payload.experienceId = eventForm.experienceId;
      updateMutation.mutate({ id: editingEvent.id, data: payload });
    } else {
      payload.experienceId = eventForm.experienceId;
      createMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const eventBookableLocations = locations?.filter(l => {
    const bookableNames = ['Restaurant Lunch', 'Restaurant Evening', 'Restaurant Brunch', 'Private Dining', 'The Pavilion', 'Pavilion', 'Patio', 'Winery Patio Area', 'Distillery', 'Terrace Bar'];
    return bookableNames.includes(l.name) && l.isActive;
  }) || [];

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarOff className="h-5 w-5" />
              Booked Events
            </CardTitle>
            <CardDescription>All private events booked through the portal and admin</CardDescription>
          </div>
          <Button onClick={openCreateDialog} data-testid="button-add-event">
            <Plus className="h-4 w-4 mr-2" /> Add Event
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sortedEvents.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No private events booked yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedEvents.map(event => (
              <div key={event.id} className="flex items-center justify-between p-3 rounded-md bg-muted/30" data-testid={`event-row-${event.id}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium" data-testid={`text-event-name-${event.id}`}>{event.customerName}</p>
                    <Badge variant={
                      event.status === 'confirmed' ? 'default' :
                      event.status === 'cancelled' ? 'destructive' :
                      event.status === 'completed' ? 'secondary' : 'outline'
                    }>
                      {event.status}
                    </Badge>
                    {event.bookedByStaffName && (
                      <Badge variant="outline">Booked by {event.bookedByStaffName}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                    <span>{formatDate(event.eventDate)}</span>
                    <span>{formatTime12(event.startTime)} - {formatTime12(event.endTime)}</span>
                    {event.locationId && <span>{locationMap.get(event.locationId) || 'Unknown Location'}</span>}
                    <span>{event.partySize} guests</span>
                  </div>
                  {(event.estimatedRevenue != null || event.actualRevenue != null) && (
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                      {event.estimatedRevenue != null && <span>Est: ${event.estimatedRevenue.toLocaleString()}</span>}
                      {event.actualRevenue != null && <span>Actual: ${event.actualRevenue.toLocaleString()}</span>}
                    </div>
                  )}
                  {event.customerEmail && (
                    <p className="text-xs text-muted-foreground mt-0.5">{event.customerEmail} {event.customerPhone ? `| ${event.customerPhone}` : ''}</p>
                  )}
                  {event.notes && (
                    <p className="text-xs text-muted-foreground mt-0.5 italic">{event.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(event)}
                    data-testid={`button-edit-event-${event.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid={`button-delete-event-${event.id}`}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Event</AlertDialogTitle>
                        <AlertDialogDescription>
                          Delete the event for {event.customerName} on {formatDate(event.eventDate)}? This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(event.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Add Private Event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingEvent && (
              <div>
                <Label>Experience</Label>
                <Select value={eventForm.experienceId} onValueChange={(v) => setEventForm(f => ({ ...f, experienceId: v }))}>
                  <SelectTrigger data-testid="select-event-experience">
                    <SelectValue placeholder="Select experience" />
                  </SelectTrigger>
                  <SelectContent>
                    {(experiences || []).map((exp: any) => (
                      <SelectItem key={exp.id} value={exp.id}>{exp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Location</Label>
              <Select value={eventForm.locationId} onValueChange={(v) => setEventForm(f => ({ ...f, locationId: v }))}>
                <SelectTrigger data-testid="select-event-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {eventBookableLocations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Event Date</Label>
              <Input
                type="date"
                value={eventForm.eventDate}
                onChange={(e) => setEventForm(f => ({ ...f, eventDate: e.target.value }))}
                data-testid="input-event-date"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={eventForm.startTime}
                  onChange={(e) => setEventForm(f => ({ ...f, startTime: e.target.value }))}
                  data-testid="input-event-start"
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={eventForm.endTime}
                  onChange={(e) => setEventForm(f => ({ ...f, endTime: e.target.value }))}
                  data-testid="input-event-end"
                />
              </div>
            </div>
            <div>
              <Label>Customer Name</Label>
              <Input
                placeholder="Enter customer name"
                value={eventForm.customerName}
                onChange={(e) => setEventForm(f => ({ ...f, customerName: e.target.value }))}
                data-testid="input-event-customer-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Customer Email</Label>
                <Input
                  type="email"
                  placeholder="Email address"
                  value={eventForm.customerEmail}
                  onChange={(e) => setEventForm(f => ({ ...f, customerEmail: e.target.value }))}
                  data-testid="input-event-customer-email"
                />
              </div>
              <div>
                <Label>Customer Phone</Label>
                <Input
                  placeholder="Phone number"
                  value={eventForm.customerPhone}
                  onChange={(e) => setEventForm(f => ({ ...f, customerPhone: e.target.value }))}
                  data-testid="input-event-customer-phone"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Party Size</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Number of guests"
                  value={eventForm.partySize}
                  onChange={(e) => setEventForm(f => ({ ...f, partySize: e.target.value }))}
                  data-testid="input-event-party-size"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={eventForm.status} onValueChange={(v) => setEventForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger data-testid="select-event-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Estimated Revenue ($)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 5000"
                  value={eventForm.estimatedRevenue}
                  onChange={(e) => setEventForm(f => ({ ...f, estimatedRevenue: e.target.value }))}
                  data-testid="input-event-est-revenue"
                />
              </div>
              <div>
                <Label>Actual Revenue ($)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 5500"
                  value={eventForm.actualRevenue}
                  onChange={(e) => setEventForm(f => ({ ...f, actualRevenue: e.target.value }))}
                  data-testid="input-event-actual-revenue"
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Any special requirements or notes"
                value={eventForm.notes}
                onChange={(e) => setEventForm(f => ({ ...f, notes: e.target.value }))}
                data-testid="input-event-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!eventForm.customerName || !eventForm.eventDate || !eventForm.startTime || !eventForm.endTime || !eventForm.customerEmail || !eventForm.partySize || (!editingEvent && !eventForm.experienceId) || isSaving}
              data-testid="button-save-event"
            >
              {isSaving ? "Saving..." : editingEvent ? "Save Changes" : "Create Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

type SortField = 'eventDate' | 'customerName' | 'location' | 'partySize' | 'startTime' | 'status' | 'estimatedRevenue' | 'actualRevenue' | 'bookedByStaffName';
type SortDir = 'asc' | 'desc';

function ReportsPanel({ events, locationMap }: { events: ResyPrivateEvent[]; locationMap: Map<string, string> }) {
  const [sortField, setSortField] = useState<SortField>('eventDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const filtered = statusFilter === 'all' ? events : events.filter(e => e.status === statusFilter);

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortField) {
      case 'eventDate':
        return (a.eventDate || '').localeCompare(b.eventDate || '') * dir;
      case 'customerName':
        return (a.customerName || '').localeCompare(b.customerName || '') * dir;
      case 'location':
        return ((locationMap.get(a.locationId || '') || '')).localeCompare(locationMap.get(b.locationId || '') || '') * dir;
      case 'partySize':
        return ((a.partySize || 0) - (b.partySize || 0)) * dir;
      case 'startTime':
        return (a.startTime || '').localeCompare(b.startTime || '') * dir;
      case 'status':
        return (a.status || '').localeCompare(b.status || '') * dir;
      case 'estimatedRevenue':
        return ((a.estimatedRevenue || 0) - (b.estimatedRevenue || 0)) * dir;
      case 'actualRevenue':
        return ((a.actualRevenue || 0) - (b.actualRevenue || 0)) * dir;
      case 'bookedByStaffName':
        return (a.bookedByStaffName || '').localeCompare(b.bookedByStaffName || '') * dir;
      default:
        return 0;
    }
  });

  const totalEstimated = sorted.reduce((sum, e) => sum + (e.estimatedRevenue || 0), 0);
  const totalActual = sorted.reduce((sum, e) => sum + (e.actualRevenue || 0), 0);
  const totalGuests = sorted.reduce((sum, e) => sum + (e.partySize || 0), 0);

  const formatDate = (dateStr: string) => {
    try { return format(parseISO(dateStr), "MMM d, yyyy"); } catch { return dateStr; }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = sorted.map(e => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #ddd;">${formatDate(e.eventDate)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #ddd;">${e.customerName}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #ddd;">${locationMap.get(e.locationId || '') || '-'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #ddd;">${formatTime12(e.startTime)} - ${formatTime12(e.endTime)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #ddd;text-align:center;">${e.partySize}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #ddd;">${e.status}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #ddd;">${e.customerEmail || '-'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #ddd;">${e.customerPhone || '-'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #ddd;text-align:right;">${e.estimatedRevenue != null ? '$' + e.estimatedRevenue.toLocaleString() : '-'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #ddd;text-align:right;">${e.actualRevenue != null ? '$' + e.actualRevenue.toLocaleString() : '-'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #ddd;">${e.bookedByStaffName || '-'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #ddd;">${e.notes || '-'}</td>
      </tr>
    `).join('');

    const filterLabel = statusFilter === 'all' ? 'All Events' : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Events`;
    const sortLabel = sortField === 'eventDate' ? 'Date' : sortField === 'customerName' ? 'Customer' : sortField === 'location' ? 'Location' : sortField === 'estimatedRevenue' ? 'Est. Revenue' : sortField === 'actualRevenue' ? 'Actual Revenue' : sortField;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Private Events Report</title>
        <style>
          body { font-family: 'Georgia', serif; margin: 40px; color: #333; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          .subtitle { color: #666; font-size: 13px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { padding: 8px 10px; border-bottom: 2px solid #333; text-align: left; font-weight: 600; background: #f5f0eb; }
          .totals { margin-top: 20px; font-size: 14px; }
          .totals span { margin-right: 30px; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <h1>Nashoba Valley - Private Events Report</h1>
        <p class="subtitle">${filterLabel} | Sorted by ${sortLabel} (${sortDir === 'asc' ? 'ascending' : 'descending'}) | ${sorted.length} events | Generated ${format(new Date(), "MMM d, yyyy h:mm a")}</p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Location</th>
              <th>Time</th>
              <th style="text-align:center;">Guests</th>
              <th>Status</th>
              <th>Email</th>
              <th>Phone</th>
              <th style="text-align:right;">Est. Revenue</th>
              <th style="text-align:right;">Actual Revenue</th>
              <th>Booked By</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="totals">
          <span><strong>Total Events:</strong> ${sorted.length}</span>
          <span><strong>Total Guests:</strong> ${totalGuests.toLocaleString()}</span>
          <span><strong>Est. Revenue:</strong> $${totalEstimated.toLocaleString()}</span>
          <span><strong>Actual Revenue:</strong> $${totalActual.toLocaleString()}</span>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Events Report
            </CardTitle>
            <CardDescription>Sortable report of all private events - click column headers to sort</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-report-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handlePrint} data-testid="button-print-report">
              <Printer className="h-4 w-4 mr-2" /> Print Report
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No events to display.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('eventDate')} data-testid="sort-date">
                      <span className="flex items-center">Date <SortIcon field="eventDate" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('customerName')} data-testid="sort-customer">
                      <span className="flex items-center">Customer <SortIcon field="customerName" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('location')} data-testid="sort-location">
                      <span className="flex items-center">Location <SortIcon field="location" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('startTime')} data-testid="sort-time">
                      <span className="flex items-center">Time <SortIcon field="startTime" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none whitespace-nowrap text-center" onClick={() => handleSort('partySize')} data-testid="sort-guests">
                      <span className="flex items-center justify-center">Guests <SortIcon field="partySize" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('status')} data-testid="sort-status">
                      <span className="flex items-center">Status <SortIcon field="status" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none whitespace-nowrap text-right" onClick={() => handleSort('estimatedRevenue')} data-testid="sort-est-revenue">
                      <span className="flex items-center justify-end">Est. Revenue <SortIcon field="estimatedRevenue" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none whitespace-nowrap text-right" onClick={() => handleSort('actualRevenue')} data-testid="sort-actual-revenue">
                      <span className="flex items-center justify-end">Actual Revenue <SortIcon field="actualRevenue" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('bookedByStaffName')} data-testid="sort-booked-by">
                      <span className="flex items-center">Booked By <SortIcon field="bookedByStaffName" /></span>
                    </TableHead>
                    <TableHead className="whitespace-nowrap">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map(event => (
                    <TableRow key={event.id} data-testid={`report-row-${event.id}`}>
                      <TableCell className="whitespace-nowrap">{formatDate(event.eventDate)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{event.customerName}</p>
                          {event.customerEmail && <p className="text-xs text-muted-foreground">{event.customerEmail}</p>}
                          {event.customerPhone && <p className="text-xs text-muted-foreground">{event.customerPhone}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{locationMap.get(event.locationId || '') || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatTime12(event.startTime)} - {formatTime12(event.endTime)}</TableCell>
                      <TableCell className="text-center">{event.partySize}</TableCell>
                      <TableCell>
                        <Badge variant={
                          event.status === 'confirmed' ? 'default' :
                          event.status === 'cancelled' ? 'destructive' :
                          event.status === 'completed' ? 'secondary' : 'outline'
                        }>
                          {event.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {event.estimatedRevenue != null ? `$${event.estimatedRevenue.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {event.actualRevenue != null ? `$${event.actualRevenue.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{event.bookedByStaffName || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{event.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex items-center gap-6 text-sm font-medium flex-wrap">
              <span data-testid="text-total-events">Total Events: {sorted.length}</span>
              <span data-testid="text-total-guests">Total Guests: {totalGuests.toLocaleString()}</span>
              <span data-testid="text-total-est-revenue">Est. Revenue: ${totalEstimated.toLocaleString()}</span>
              <span data-testid="text-total-actual-revenue">Actual Revenue: ${totalActual.toLocaleString()}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DocumentationPanel() {
  const baseUrl = window.location.origin;
  const embedUrl = `${baseUrl}/api/resy/public/private-events/embed`;
  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="400" frameborder="0" style="border:none;border-radius:8px;overflow:hidden;"></iframe>`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Event Registration System Documentation
          </CardTitle>
          <CardDescription>Complete guide to how the private event registration system works</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <div className="space-y-8">

            <section>
              <h3 className="text-lg font-semibold border-b pb-2 mb-3">System Overview</h3>
              <p className="text-muted-foreground mb-3">
                The Event Registration system allows staff members to book private events at Nashoba Valley, blocking specific locations for specific dates. It consists of several integrated components that work together: a staff-facing online booking portal, an admin backend for management, an embeddable calendar widget for the public website, and automated email notifications.
              </p>
              <h4 className="font-semibold mt-4 mb-2">Where to Find Everything</h4>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li><strong>Admin Backend:</strong> Located inside the <strong>Reservations</strong> module in the platform sidebar, under the tab called <strong>"Event Registration"</strong>. This is the page you are on right now.</li>
                <li><strong>Staff Portal:</strong> A separate page at <span className="font-mono text-xs">/event-registration</span> where staff log in with their 4-digit code to book and edit events.</li>
                <li><strong>Public Calendar:</strong> An embeddable widget showing blocked dates, designed for the Nashoba Valley WordPress website.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold border-b pb-2 mb-3">1. Staff Portal (Online Event Registration)</h3>
              <p className="text-muted-foreground mb-3">
                The staff portal is a web-based booking tool accessible at:
              </p>
              <div className="p-3 bg-muted rounded-md font-mono text-sm mb-3" data-testid="text-doc-portal-url">
                {baseUrl}/event-registration
              </div>

              <h4 className="font-semibold mt-4 mb-2">How Staff Access Works</h4>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Each staff member is assigned a unique 4-digit access code (managed in the Staff tab)</li>
                <li>Staff enter their code on the login screen to access the booking portal</li>
                <li>No username/password needed - just the 4-digit code</li>
                <li>Staff can be activated or deactivated without deleting their record</li>
                <li>Each staff member can optionally have an email address for receiving notifications</li>
              </ul>

              <h4 className="font-semibold mt-4 mb-2">Booking a Private Event</h4>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Staff select a location (Restaurant, Pavilion, Patio, Distillery, Terrace Bar, etc.)</li>
                <li>Staff select an experience type from the available experiences</li>
                <li>Staff pick a date and set start/end times</li>
                <li>Staff enter customer details: name, email, phone, party size</li>
                <li>Optional fields: estimated revenue, actual revenue, and notes</li>
                <li>When submitted, the system blocks that location for the selected date</li>
                <li>The system checks for conflicts - if a location is already booked for that date, the booking is rejected</li>
              </ul>

              <h4 className="font-semibold mt-4 mb-2">Viewing & Editing Events from the Portal</h4>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>The portal shows an <strong>"All Booked Events"</strong> section listing every active event sorted by date</li>
                <li>Each event is clickable - staff can click any event to open an edit dialog directly from the portal</li>
                <li>In the edit dialog, staff can update: customer name, email, phone, party size, date, start/end time, estimated and actual revenue, status, and notes</li>
                <li>The <strong>"Your Recent Bookings"</strong> section shows only events booked by the currently logged-in staff member</li>
                <li>Staff do not need admin access to edit events - any staff member with a valid 4-digit code can view and edit all booked events from the portal</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold border-b pb-2 mb-3">2. Admin Backend (This Page)</h3>
              <p className="text-muted-foreground mb-3">
                The admin backend is located in the platform under <strong>Reservations &rarr; Event Registration</strong> tab. This is the page you are currently viewing. It provides full management capabilities across five tabs:
              </p>

              <h4 className="font-semibold mt-4 mb-2">Staff Tab</h4>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Add new staff members with a name, email, and 4-digit code</li>
                <li>Edit existing staff details (click the pencil icon)</li>
                <li>Activate/deactivate staff access without deleting</li>
                <li>Remove staff members entirely</li>
                <li>View when each staff member last used their code</li>
              </ul>

              <h4 className="font-semibold mt-4 mb-2">Events Tab</h4>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>View all booked private events with full details</li>
                <li>Add new events directly from the admin (click "Add Event")</li>
                <li>Edit any event's details (click the pencil icon on any event)</li>
                <li>Delete events with confirmation</li>
                <li>Events show: date, time, location, customer info, party size, status, revenue, and who booked it</li>
              </ul>

              <h4 className="font-semibold mt-4 mb-2">Reports Tab</h4>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Sortable table view of all events - click any column header to sort</li>
                <li>Filter by status (Pending, Confirmed, Completed, Cancelled)</li>
                <li>Summary totals: total events, total guests, estimated revenue, actual revenue</li>
                <li>Print Report button generates a clean, print-ready version</li>
                <li>The printed report includes the current sort order and filter applied</li>
              </ul>

              <h4 className="font-semibold mt-4 mb-2">Embed Tab</h4>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Provides the iframe embed code for the blocked dates calendar</li>
                <li>Shows a direct link to the standalone calendar page</li>
                <li>Provides the JSON API endpoint for custom integrations</li>
                <li>Includes a live preview of the embed</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold border-b pb-2 mb-3">3. Email Notifications</h3>
              <p className="text-muted-foreground mb-3">
                Every time a new private event is booked - whether from the staff portal or the admin backend - an email notification is automatically sent to all active staff members who have an email address on file.
              </p>
              <h4 className="font-semibold mt-4 mb-2">What the Email Includes</h4>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Subject line: "New Private Event - [Location] on [Date]"</li>
                <li>Header message: "Good Job - We have a new private event!"</li>
                <li>Full event details: location, date, time, customer name, party size, who booked it, notes, estimated revenue</li>
                <li>A complete calendar table showing all currently reserved dates organized by location - matching the format on the website</li>
                <li>Notes about linked locations (e.g., when Restaurant Evening is booked, Private Dining is also blocked; when Patio is booked, Distillery is also blocked)</li>
              </ul>
              <h4 className="font-semibold mt-4 mb-2">Email Configuration</h4>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Emails are sent via SendGrid using the configured API key</li>
                <li>The "from" address uses the SENDGRID_FROM_EMAIL environment variable</li>
                <li>Each recipient receives an individual email (not CC'd together)</li>
                <li>If SendGrid is not configured, notifications are silently skipped</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold border-b pb-2 mb-3">4. Blocked Dates Calendar (Public Widget)</h3>
              <p className="text-muted-foreground mb-3">
                The system generates a public-facing calendar that shows which locations are blocked on which dates. This calendar is designed to be embedded on the Nashoba Valley website.
              </p>
              <h4 className="font-semibold mt-4 mb-2">Calendar Design</h4>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Light cream background (#f5f0eb) with serif fonts to match the winery branding</li>
                <li>Shows a table with locations as columns and blocked dates listed under each</li>
                <li>Dates are formatted as "Month Day, Year" (e.g., "June 15, 2026")</li>
                <li>Only shows active (non-cancelled) events</li>
                <li>Updates automatically when events are added, edited, or cancelled</li>
              </ul>
              <h4 className="font-semibold mt-4 mb-2">Available Endpoints</h4>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li><span className="font-mono text-xs">/api/resy/public/private-events/embed</span> - Returns the full HTML embed (iframe-ready)</li>
                <li><span className="font-mono text-xs">/api/resy/public/private-events/blocked-dates</span> - Returns JSON data for custom integrations</li>
                <li><span className="font-mono text-xs">/event-calendar</span> - Standalone full-page calendar view</li>
                <li>All public endpoints require no authentication</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold border-b pb-2 mb-3">5. WordPress Integration</h3>
              <p className="text-muted-foreground mb-3">
                The blocked dates calendar is embedded on the Nashoba Valley WordPress website using an HTML block. Here is how it was set up:
              </p>

              <h4 className="font-semibold mt-4 mb-2">Step-by-Step WordPress Setup</h4>
              <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                <li>
                  <strong>Open the WordPress page editor</strong> - Navigate to the page where you want the calendar to appear (e.g., the Private Events page) and click "Edit" to open the block editor (Gutenberg).
                </li>
                <li>
                  <strong>Add a Custom HTML block</strong> - Click the "+" button to add a new block, search for "Custom HTML" and select it. This block allows you to paste raw HTML code directly into your page.
                </li>
                <li>
                  <strong>Paste the iframe embed code</strong> - Copy the following code and paste it into the Custom HTML block:
                </li>
              </ol>
              <div className="p-3 bg-muted rounded-md font-mono text-xs break-all my-3" data-testid="text-doc-embed-code">
                {iframeCode}
              </div>
              <ol className="list-decimal pl-5 space-y-2 text-muted-foreground" start={4}>
                <li>
                  <strong>Adjust sizing if needed</strong> - The default height is 400px. You can increase or decrease the <span className="font-mono text-xs">height</span> value to fit more or fewer dates. For example, use <span className="font-mono text-xs">height="600"</span> if you have many bookings.
                </li>
                <li>
                  <strong>Preview and publish</strong> - Click "Preview" in WordPress to see how the calendar looks on your page. The calendar loads in real-time from the platform, so it always shows the latest blocked dates. Click "Publish" or "Update" to save.
                </li>
              </ol>

              <h4 className="font-semibold mt-4 mb-2">How the Embed Works</h4>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>The iframe loads the embed endpoint from the Nashoba platform server</li>
                <li>The endpoint generates a self-contained HTML page with inline CSS (no external dependencies)</li>
                <li>The calendar has a light cream theme (#f5f0eb background) with Georgia serif fonts to blend with the winery website aesthetic</li>
                <li>The title and notes were intentionally removed from the iframe to avoid duplication with the WordPress page's own heading and content</li>
                <li>The iframe uses <span className="font-mono text-xs">frameborder="0"</span> and <span className="font-mono text-xs">border:none</span> so it appears seamlessly within the page</li>
                <li>The <span className="font-mono text-xs">border-radius:8px</span> gives it slightly rounded corners for a polished look</li>
                <li>The calendar data is fetched fresh each time someone visits the page - no caching issues</li>
              </ul>

              <h4 className="font-semibold mt-4 mb-2">Troubleshooting</h4>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li><strong>Calendar not showing:</strong> Make sure the platform is published and running. The iframe loads from the live published URL.</li>
                <li><strong>Calendar too short/tall:</strong> Adjust the <span className="font-mono text-xs">height</span> value in the iframe code.</li>
                <li><strong>Dates not updating:</strong> The calendar pulls live data - hard refresh the WordPress page (Ctrl+Shift+R) to clear any browser cache.</li>
                <li><strong>Styling conflicts:</strong> The embed uses inline styles and is isolated inside an iframe, so WordPress theme styles should not affect it.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold border-b pb-2 mb-3">6. Location Blocking Rules</h3>
              <p className="text-muted-foreground mb-3">
                When a private event is booked for a location, that location is blocked for the entire date. Important rules:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Each location can only have one private event per date</li>
                <li>When a booking is made, a "special date" record is also created that marks the location as closed</li>
                <li>Cancelling an event frees up the location for that date</li>
                <li>The calendar widget only shows non-cancelled events</li>
                <li><strong>Linked locations:</strong> When Restaurant Evening is booked, Private Dining is also considered booked. When Patio is booked, Distillery is also booked (reserved for inclement weather backup).</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold border-b pb-2 mb-3">7. Data Flow Summary</h3>
              <div className="space-y-3 text-muted-foreground">
                <div className="p-3 bg-muted/50 rounded-md">
                  <p className="font-semibold text-foreground mb-1">Staff books event via portal</p>
                  <p className="text-sm">Staff enters code &rarr; Fills in event details &rarr; System checks for conflicts &rarr; Creates event record &rarr; Creates special date (blocks location) &rarr; Sends email to all staff with emails &rarr; Calendar widget updates automatically</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-md">
                  <p className="font-semibold text-foreground mb-1">Admin creates event via backend</p>
                  <p className="text-sm">Admin fills in event form &rarr; Selects experience &rarr; Creates event record &rarr; Sends email to all staff with emails &rarr; Calendar widget updates automatically</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-md">
                  <p className="font-semibold text-foreground mb-1">Visitor views WordPress page</p>
                  <p className="text-sm">WordPress page loads &rarr; iframe requests embed endpoint &rarr; Server queries all active events &rarr; Generates HTML table organized by location &rarr; Returns styled calendar to iframe</p>
                </div>
              </div>
            </section>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EmbedPanel() {
  const [copied, setCopied] = useState(false);
  const baseUrl = window.location.origin;
  const embedUrl = `${baseUrl}/api/resy/public/private-events/embed`;
  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="400" frameborder="0" style="border:none;border-radius:8px;overflow:hidden;"></iframe>`;
  const directLink = `${baseUrl}/event-calendar`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Embed Code
          </CardTitle>
          <CardDescription>Copy and paste this code into your website to show blocked event dates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>iframe Embed Code</Label>
            <div className="mt-2 p-3 bg-muted rounded-md font-mono text-xs break-all" data-testid="text-embed-code">
              {iframeCode}
            </div>
            <div className="mt-2">
              <CopyButton text={iframeCode} label="Copy Embed Code" />
            </div>
          </div>

          <div>
            <Label>Direct Link</Label>
            <div className="flex items-center gap-2 mt-2">
              <Input readOnly value={directLink} className="font-mono text-sm" data-testid="input-direct-link" />
              <CopyButton text={directLink} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Share this link to show the blocked dates calendar</p>
          </div>

          <div>
            <Label>JSON API</Label>
            <div className="flex items-center gap-2 mt-2">
              <Input readOnly value={`${baseUrl}/api/resy/public/private-events/blocked-dates`} className="font-mono text-sm" data-testid="input-json-api" />
              <CopyButton text={`${baseUrl}/api/resy/public/private-events/blocked-dates`} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Use this endpoint to build custom integrations</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>How the embed will appear on your website</CardDescription>
        </CardHeader>
        <CardContent>
          <iframe
            src={embedUrl}
            width="100%"
            height="400"
            style={{ border: 'none', borderRadius: '8px', overflow: 'hidden' }}
            title="Blocked Dates Preview"
            data-testid="iframe-embed-preview"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="outline" size={label ? "sm" : "icon"} onClick={handleCopy} data-testid="button-copy">
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {label && <span className="ml-2">{label}</span>}
    </Button>
  );
}
