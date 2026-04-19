import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { KeyRound, CalendarPlus, LogOut, Calendar, MapPin, Clock, Users, Loader2, Pencil, DollarSign } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { ResyLocation, ResyPrivateEvent, ResyExperience } from "@shared/schema";

function formatTime12(time24: string | null | undefined): string {
  if (!time24) return "";
  const [h, m] = time24.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${m} ${ampm}`;
}

export default function EventRegistrationPortal() {
  const [staffCode, setStaffCode] = useState("");
  const [staffName, setStaffName] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const saved = sessionStorage.getItem("eventStaffCode");
    const savedName = sessionStorage.getItem("eventStaffName");
    if (saved && savedName) {
      setStaffCode(saved);
      setStaffName(savedName);
      setIsLoggedIn(true);
    }
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/resy/event-registration/login", { code });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: (data) => {
      setStaffName(data.staffName);
      setIsLoggedIn(true);
      sessionStorage.setItem("eventStaffCode", staffCode);
      sessionStorage.setItem("eventStaffName", data.staffName);
      toast({ title: `Welcome, ${data.staffName}` });
    },
    onError: (error: any) => {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleLogout = () => {
    setIsLoggedIn(false);
    setStaffCode("");
    setStaffName("");
    sessionStorage.removeItem("eventStaffCode");
    sessionStorage.removeItem("eventStaffName");
  };

  if (!isLoggedIn) {
    return <LoginScreen code={staffCode} setCode={setStaffCode} onLogin={() => loginMutation.mutate(staffCode)} isLoading={loginMutation.isPending} />;
  }

  return <BookingScreen staffCode={staffCode} staffName={staffName} onLogout={handleLogout} />;
}

function LoginScreen({ code, setCode, onLogin, isLoading }: {
  code: string;
  setCode: (c: string) => void;
  onLogin: () => void;
  isLoading: boolean;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 4) {
      onLogin();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Private Event Registration</CardTitle>
          <CardDescription>Enter your 4-digit access code to book private events</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="0000"
              value={code}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                setCode(v);
              }}
              onKeyDown={handleKeyDown}
              maxLength={4}
              className="text-center text-2xl tracking-[0.5em] font-mono w-40"
              autoFocus
              data-testid="input-login-code"
            />
          </div>
          <Button
            className="w-full"
            onClick={onLogin}
            disabled={code.length !== 4 || isLoading}
            data-testid="button-login"
          >
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {isLoading ? "Verifying..." : "Enter"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function BookingScreen({ staffCode, staffName, onLogout }: {
  staffCode: string;
  staffName: string;
  onLogout: () => void;
}) {
  const { toast } = useToast();
  const [locationId, setLocationId] = useState("");
  const [experienceId, setExperienceId] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("22:00");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [partySize, setPartySize] = useState("");
  const [notes, setNotes] = useState("");
  const [estimatedRevenue, setEstimatedRevenue] = useState("");
  const [actualRevenue, setActualRevenue] = useState("");
  const [editingEvent, setEditingEvent] = useState<ResyPrivateEvent | null>(null);

  const { data: locations, isLoading: locLoading } = useQuery<ResyLocation[]>({
    queryKey: ["/api/resy/locations"],
  });

  // Predefined list of 8 locations from private events schedule
  const privateEventLocations = [
    "Restaurant Lunch",
    "Restaurant Evening", 
    "Restaurant Brunch",
    "Private Dining",
    "The Pavilion",
    "Patio",
    "Distillery",
    "Terrace Bar"
  ];

  const { data: experiences, isLoading: expLoading } = useQuery<ResyExperience[]>({
    queryKey: ["/api/resy/experiences"],
  });

  const { data: myEvents, isLoading: eventsLoading } = useQuery<ResyPrivateEvent[]>({
    queryKey: ["/api/resy/event-registration/my-events", staffCode],
    queryFn: () => fetch(`/api/resy/event-registration/my-events?code=${encodeURIComponent(staffCode)}`).then(r => r.json()),
  });

  const { data: allEvents } = useQuery<ResyPrivateEvent[]>({
    queryKey: ["/api/resy/event-registration/all-events", staffCode],
    queryFn: () => fetch(`/api/resy/event-registration/all-events?code=${encodeURIComponent(staffCode)}`).then(r => r.json()),
  });

  const bookMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/resy/event-registration/book", data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Event booked successfully", description: "The location has been blocked for this date." });
      queryClient.invalidateQueries({ queryKey: ["/api/resy/event-registration/my-events", staffCode] });
      queryClient.invalidateQueries({ queryKey: ["/api/resy/event-registration/all-events", staffCode] });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Booking failed", description: error.message, variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/resy/event-registration/edit/${id}`, data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Event updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/resy/event-registration/my-events", staffCode] });
      queryClient.invalidateQueries({ queryKey: ["/api/resy/event-registration/all-events", staffCode] });
      setEditingEvent(null);
    },
    onError: (error: any) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setPartySize("");
    setNotes("");
    setEstimatedRevenue("");
    setActualRevenue("");
    setEventDate("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId || !experienceId || !eventDate || !customerName || !customerEmail || !partySize) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    bookMutation.mutate({
      staffCode,
      locationId,
      experienceId,
      eventDate,
      startTime,
      endTime,
      customerName,
      customerEmail,
      customerPhone: customerPhone || undefined,
      partySize: parseInt(partySize),
      notes: notes || undefined,
      estimatedRevenue: estimatedRevenue ? parseInt(estimatedRevenue) : undefined,
      actualRevenue: actualRevenue ? parseInt(actualRevenue) : undefined,
    });
  };

  const staffEvents = myEvents?.filter(e => e.status !== 'cancelled')
    .sort((a, b) => (b.eventDate || '').localeCompare(a.eventDate || '')) || [];

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "";
    try { return format(parseISO(dateStr), "MMM d, yyyy"); } catch { return dateStr; }
  };

  const locationMap = new Map(locations?.map(l => [l.id, l.name]) || []);
  const experienceMap = new Map(experiences?.map(e => [e.id, e.name]) || []);

  if (locLoading || expLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-2xl mx-auto flex items-center justify-between p-4 gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold" data-testid="text-portal-title">Private Event Registration</h1>
            <p className="text-sm text-muted-foreground">Logged in as <span className="font-medium">{staffName}</span></p>
          </div>
          <Button variant="outline" size="sm" onClick={onLogout} data-testid="button-logout">
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5" />
              Book Private Event
            </CardTitle>
            <CardDescription>Fill in the details to block a location for a private event</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Location *</Label>
                  <Select value={locationId} onValueChange={setLocationId}>
                    <SelectTrigger className="mt-1" data-testid="select-location">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations?.filter(l => l.isActive && privateEventLocations.includes(l.name)).map(loc => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Experience *</Label>
                  <Select value={experienceId} onValueChange={setExperienceId}>
                    <SelectTrigger className="mt-1" data-testid="select-experience">
                      <SelectValue placeholder="Select experience" />
                    </SelectTrigger>
                    <SelectContent>
                      {experiences?.filter(e => e.isActive).map(exp => (
                        <SelectItem key={exp.id} value={exp.id}>{exp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Event Date *</Label>
                  <Input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="mt-1"
                    data-testid="input-event-date"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1"><Clock className="h-3 w-3" /> Start Time</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="mt-1"
                    data-testid="input-start-time"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1"><Clock className="h-3 w-3" /> End Time</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="mt-1"
                    data-testid="input-end-time"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Customer Name *</Label>
                  <Input
                    placeholder="Name of the person booking"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="mt-1"
                    data-testid="input-customer-name"
                  />
                </div>
                <div>
                  <Label>Customer Email *</Label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="mt-1"
                    data-testid="input-customer-email"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Phone</Label>
                  <Input
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="mt-1"
                    data-testid="input-customer-phone"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1"><Users className="h-3 w-3" /> Party Size *</Label>
                  <Input
                    type="number"
                    placeholder="Number of guests"
                    value={partySize}
                    onChange={(e) => setPartySize(e.target.value)}
                    min={1}
                    className="mt-1"
                    data-testid="input-party-size"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Estimated Revenue</Label>
                  <Input
                    type="number"
                    placeholder="$0"
                    value={estimatedRevenue}
                    onChange={(e) => setEstimatedRevenue(e.target.value)}
                    min={0}
                    className="mt-1"
                    data-testid="input-estimated-revenue"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Actual Revenue</Label>
                  <Input
                    type="number"
                    placeholder="$0"
                    value={actualRevenue}
                    onChange={(e) => setActualRevenue(e.target.value)}
                    min={0}
                    className="mt-1"
                    data-testid="input-actual-revenue"
                  />
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  placeholder="Special requirements, setup details, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1"
                  data-testid="input-notes"
                />
              </div>

              <Button type="submit" className="w-full" disabled={bookMutation.isPending} data-testid="button-book-event">
                {bookMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarPlus className="h-4 w-4 mr-2" />}
                {bookMutation.isPending ? "Booking..." : "Book Event & Block Location"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {(allEvents?.length || 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                All Booked Events
              </CardTitle>
              <CardDescription>Click any event to view or edit its details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...(allEvents || [])].sort((a, b) => (a.eventDate || '').localeCompare(b.eventDate || '')).map(event => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 rounded-md bg-muted/30 cursor-pointer hover-elevate"
                    onClick={() => setEditingEvent(event)}
                    data-testid={`all-event-row-${event.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-center shrink-0 w-14">
                        <p className="text-xs text-muted-foreground">{(() => { try { return format(parseISO(event.eventDate), "MMM"); } catch { return ""; } })()}</p>
                        <p className="text-lg font-bold leading-tight">{(() => { try { return format(parseISO(event.eventDate), "d"); } catch { return ""; } })()}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{event.customerName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          {event.locationId && <span>{locationMap.get(event.locationId) || ''}</span>}
                          <span>{formatTime12(event.startTime)} - {formatTime12(event.endTime)}</span>
                          <span>{event.partySize} guests</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {event.estimatedRevenue != null && (
                        <span className="text-xs text-muted-foreground">${event.estimatedRevenue.toLocaleString('en-US')}</span>
                      )}
                      <Badge variant={
                        event.status === 'confirmed' ? 'default' :
                        event.status === 'completed' ? 'secondary' : 'outline'
                      }>
                        {event.status}
                      </Badge>
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {staffEvents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Recent Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {staffEvents.slice(0, 10).map(event => (
                  <div key={event.id} className="p-3 rounded-md bg-muted/30 space-y-2" data-testid={`booking-row-${event.id}`}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="space-y-1">
                        <p className="font-medium">{event.customerName}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(event.eventDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime12(event.startTime)} - {formatTime12(event.endTime)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                          {event.locationId && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {locationMap.get(event.locationId)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {event.partySize} guests
                          </span>
                        </div>
                        {(event.estimatedRevenue !== null || event.actualRevenue !== null) && (
                          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                            {event.estimatedRevenue !== null && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                Est: ${event.estimatedRevenue?.toLocaleString('en-US')}
                              </span>
                            )}
                            {event.actualRevenue !== null && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                Actual: ${event.actualRevenue?.toLocaleString('en-US')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">{event.status}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingEvent(event)}
                          data-testid={`button-edit-event-${event.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {editingEvent && (
        <EditEventDialog
          event={editingEvent}
          staffCode={staffCode}
          locationMap={locationMap}
          experienceMap={experienceMap}
          onClose={() => setEditingEvent(null)}
          onSave={(updates) => editMutation.mutate({ id: editingEvent.id, staffCode, ...updates })}
          isSaving={editMutation.isPending}
        />
      )}
    </div>
  );
}

function EditEventDialog({ event, staffCode, locationMap, experienceMap, onClose, onSave, isSaving }: {
  event: ResyPrivateEvent;
  staffCode: string;
  locationMap: Map<string, string>;
  experienceMap: Map<string, string>;
  onClose: () => void;
  onSave: (updates: any) => void;
  isSaving: boolean;
}) {
  const { data: locations } = useQuery<ResyLocation[]>({
    queryKey: ["/api/resy/locations"],
  });

  // Predefined list of 8 locations from private events schedule
  const privateEventLocations = [
    "Restaurant Lunch",
    "Restaurant Evening", 
    "Restaurant Brunch",
    "Private Dining",
    "The Pavilion",
    "Patio",
    "Distillery",
    "Terrace Bar"
  ];
  
  const [customerName, setCustomerName] = useState(event.customerName || "");
  const [customerEmail, setCustomerEmail] = useState(event.customerEmail || "");
  const [customerPhone, setCustomerPhone] = useState(event.customerPhone || "");
  const [partySize, setPartySize] = useState(String(event.partySize || ""));
  const [startTime, setStartTime] = useState(event.startTime || "10:00");
  const [endTime, setEndTime] = useState(event.endTime || "22:00");
  const [notes, setNotes] = useState(event.notes || "");
  const [estimatedRevenue, setEstimatedRevenue] = useState(event.estimatedRevenue != null ? String(event.estimatedRevenue) : "");
  const [actualRevenue, setActualRevenue] = useState(event.actualRevenue != null ? String(event.actualRevenue) : "");
  const [status, setStatus] = useState(event.status || "confirmed");
  const [locationId, setLocationId] = useState(event.locationId || "");

  const handleSave = () => {
    onSave({
      customerName,
      customerEmail,
      customerPhone: customerPhone || null,
      partySize: parseInt(partySize) || event.partySize,
      startTime,
      endTime,
      notes: notes || null,
      estimatedRevenue: estimatedRevenue ? parseInt(estimatedRevenue) : null,
      actualRevenue: actualRevenue ? parseInt(actualRevenue) : null,
      status,
      locationId: locationId || null,
    });
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "";
    try { return format(parseISO(dateStr), "EEEE, MMMM d, yyyy"); } catch { return dateStr; }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
          <DialogDescription>
            {formatDate(event.eventDate)} at {locationMap.get(event.locationId || "") || "Unknown Location"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid gap-4 grid-cols-2">
            <div>
              <Label>Customer Name</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="mt-1" data-testid="edit-customer-name" />
            </div>
            <div>
              <Label>Customer Email</Label>
              <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="mt-1" data-testid="edit-customer-email" />
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Location</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger className="mt-1" data-testid="edit-location">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations?.filter(l => l.isActive && privateEventLocations.includes(l.name)).map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div>
              <Label>Phone</Label>
              <Input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="mt-1" data-testid="edit-customer-phone" />
            </div>
            <div>
              <Label>Party Size</Label>
              <Input type="number" value={partySize} onChange={(e) => setPartySize(e.target.value)} min={1} className="mt-1" data-testid="edit-party-size" />
            </div>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div>
              <Label className="flex items-center gap-1"><Clock className="h-3 w-3" /> Start Time</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1" data-testid="edit-start-time" />
            </div>
            <div>
              <Label className="flex items-center gap-1"><Clock className="h-3 w-3" /> End Time</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1" data-testid="edit-end-time" />
            </div>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div>
              <Label className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Estimated Revenue</Label>
              <Input type="number" placeholder="$0" value={estimatedRevenue} onChange={(e) => setEstimatedRevenue(e.target.value)} min={0} className="mt-1" data-testid="edit-estimated-revenue" />
            </div>
            <div>
              <Label className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Actual Revenue</Label>
              <Input type="number" placeholder="$0" value={actualRevenue} onChange={(e) => setActualRevenue(e.target.value)} min={0} className="mt-1" data-testid="edit-actual-revenue" />
            </div>
          </div>

          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1" data-testid="edit-status">
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

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" data-testid="edit-notes" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} data-testid="button-cancel-edit">Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-edit">
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
