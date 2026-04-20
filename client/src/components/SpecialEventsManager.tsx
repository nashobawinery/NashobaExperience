import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  ExternalLink,
  Star,
  ListFilter,
  CalendarDays,
  Image,
  Printer,
} from "lucide-react";
import type { SpecialEvent } from "@shared/schema";
import EventFlyerPrinter from "./EventFlyerPrinter";
import { MediaDayBannersSection } from "@/components/media/MediaDayBannersSection";

const CATEGORY_LABELS: Record<string, string> = {
  workshop: "Workshop",
  "cooking-demo": "Cooking Demo",
  seasonal: "Seasonal",
  other: "Other",
};

const CATEGORY_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  workshop: "default",
  "cooking-demo": "secondary",
  seasonal: "outline",
  other: "secondary",
};

interface EventFormData {
  title: string;
  description: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  imageUrl: string;
  price: string;
  shopifyUrl: string;
  category: string;
  isActive: boolean;
  isFeatured: boolean;
}

const emptyForm: EventFormData = {
  title: "",
  description: "",
  eventDate: "",
  startTime: "",
  endTime: "",
  location: "",
  imageUrl: "",
  price: "",
  shopifyUrl: "",
  category: "other",
  isActive: true,
  isFeatured: false,
};

function formatTime12(time24: string | null | undefined): string {
  if (!time24) return "";
  const [h, m] = time24.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${m} ${ampm}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(month, 10) - 1]} ${parseInt(day, 10)}, ${year}`;
}

export default function SpecialEventsManager() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("events");
  const [showDialog, setShowDialog] = useState(false);
  const [editEvent, setEditEvent] = useState<SpecialEvent | null>(null);
  const [formData, setFormData] = useState<EventFormData>(emptyForm);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: events, isLoading } = useQuery<SpecialEvent[]>({
    queryKey: ["/api/media/special-events"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const res = await apiRequest("POST", "/api/media/special-events", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media/special-events"] });
      setShowDialog(false);
      toast({ title: "Event created" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create event", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<EventFormData> }) => {
      const res = await apiRequest("PUT", `/api/media/special-events/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media/special-events"] });
      setShowDialog(false);
      setEditEvent(null);
      toast({ title: "Event updated" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to update event", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/media/special-events/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media/special-events"] });
      toast({ title: "Event deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete event", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData(emptyForm);
  };

  const openCreate = () => {
    resetForm();
    setEditEvent(null);
    setShowDialog(true);
  };

  const openEdit = (event: SpecialEvent) => {
    setFormData({
      title: event.title,
      description: event.description || "",
      eventDate: event.eventDate,
      startTime: event.startTime,
      endTime: event.endTime || "",
      location: event.location || "",
      imageUrl: event.imageUrl || "",
      price: event.price || "",
      shopifyUrl: event.shopifyUrl || "",
      category: event.category,
      isActive: event.isActive,
      isFeatured: event.isFeatured,
    });
    setEditEvent(event);
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.eventDate || !formData.startTime) return;
    if (editEvent) {
      updateMutation.mutate({ id: editEvent.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredEvents = events?.filter(
    (e) => categoryFilter === "all" || e.category === categoryFilter
  );

  const upcomingEvents = filteredEvents
    ?.filter((e) => e.eventDate >= new Date().toISOString().split("T")[0])
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));

  const pastEvents = filteredEvents
    ?.filter((e) => e.eventDate < new Date().toISOString().split("T")[0])
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate));

  const calendarEvents = events
    ?.filter((e) => e.isActive && e.eventDate >= new Date().toISOString().split("T")[0])
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));

  const groupedByMonth = calendarEvents?.reduce<Record<string, SpecialEvent[]>>((acc, event) => {
    const [year, month] = event.eventDate.split("-");
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const key = `${months[parseInt(month, 10) - 1]} ${year}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="events" className="flex items-center gap-2" data-testid="tab-special-events">
              <CalendarDays className="h-4 w-4" /> Events
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2" data-testid="tab-special-events-calendar">
              <Calendar className="h-4 w-4" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="flyer" className="flex items-center gap-2" data-testid="tab-events-flyer">
              <Printer className="h-4 w-4" /> Flyer Printer
            </TabsTrigger>
          </TabsList>

          {activeTab === "events" && (
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-category-filter">
                  <ListFilter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="workshop">Workshops</SelectItem>
                  <SelectItem value="cooking-demo">Cooking Demos</SelectItem>
                  <SelectItem value="seasonal">Seasonal</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={openCreate} data-testid="button-create-special-event">
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="events" className="mt-6 space-y-6">
          <MediaDayBannersSection
            heading="Special day labels (public calendar)"
            description={<>Shown above events on that calendar day on the public Special Events page. Managed here only — not inside Add Event.</>}
            publicPathLabel="/events"
            mediaListUrl="/api/media/special-events-day-banners"
            publicListUrl="/api/public/special-events-day-banners"
            addButtonTestId="button-add-special-events-day-banner"
          />
          {(!filteredEvents || filteredEvents.length === 0) ? (
            <Card className="p-8 text-center">
              <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2" data-testid="text-no-events">No Events Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first special event to get started.
              </p>
              <Button onClick={openCreate} data-testid="button-create-first-event">
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {upcomingEvents && upcomingEvents.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Upcoming Events</h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {upcomingEvents.map((event) => (
                      <EventCard key={event.id} event={event} onEdit={openEdit} onDelete={(id) => {
                        if (confirm("Delete this event?")) deleteMutation.mutate(id);
                      }} />
                    ))}
                  </div>
                </div>
              )}
              {pastEvents && pastEvents.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Past Events</h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {pastEvents.map((event) => (
                      <EventCard key={event.id} event={event} onEdit={openEdit} onDelete={(id) => {
                        if (confirm("Delete this event?")) deleteMutation.mutate(id);
                      }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          {(!calendarEvents || calendarEvents.length === 0) ? (
            <Card className="p-8 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Upcoming Events</h3>
              <p className="text-muted-foreground">
                Active events will appear here for planning.
              </p>
            </Card>
          ) : (
            <div className="space-y-6">
              {groupedByMonth && Object.entries(groupedByMonth).map(([month, monthEvents]) => (
                <div key={month} className="space-y-3">
                  <h3 className="text-lg font-semibold" data-testid={`text-month-${month.replace(/\s/g, "-")}`}>{month}</h3>
                  <div className="space-y-2">
                    {monthEvents.map((event) => (
                      <Card key={event.id} className="p-4">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            <div className="flex flex-col items-center justify-center min-w-[50px] text-center">
                              <span className="text-2xl font-bold">{parseInt(event.eventDate.split("-")[2], 10)}</span>
                              <span className="text-xs text-muted-foreground">
                                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(event.eventDate + "T12:00:00").getDay()]}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold" data-testid={`text-calendar-event-${event.id}`}>{event.title}</span>
                                <Badge variant={CATEGORY_VARIANTS[event.category] || "secondary"}>
                                  {CATEGORY_LABELS[event.category] || event.category}
                                </Badge>
                                {event.isFeatured && <Badge variant="outline"><Star className="w-3 h-3 mr-1" /> Featured</Badge>}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTime12(event.startTime)}
                                  {event.endTime && ` - ${formatTime12(event.endTime)}`}
                                </span>
                                {event.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> {event.location}
                                  </span>
                                )}
                                {event.price && (
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" /> {event.price}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {event.shopifyUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(event.shopifyUrl!, "_blank")}
                              data-testid={`button-calendar-tickets-${event.id}`}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Tickets
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="flyer" className="mt-6">
          <EventFlyerPrinter mode="events" />
        </TabsContent>
      </Tabs>

      <Dialog open={showDialog} onOpenChange={(v) => { if (!v) { setShowDialog(false); setEditEvent(null); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editEvent ? "Edit Event" : "Create Event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Event title"
                data-testid="input-event-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the event"
                data-testid="input-event-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Event Date</Label>
                <Input
                  type="date"
                  value={formData.eventDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, eventDate: e.target.value }))}
                  data-testid="input-event-date"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData((prev) => ({ ...prev, category: v }))}>
                  <SelectTrigger data-testid="select-event-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="cooking-demo">Cooking Demo</SelectItem>
                    <SelectItem value="seasonal">Seasonal</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                  data-testid="input-event-start-time"
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                  data-testid="input-event-end-time"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Main Building, Pavilion"
                data-testid="input-event-location"
              />
            </div>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                value={formData.imageUrl}
                onChange={(e) => setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))}
                placeholder="https://..."
                data-testid="input-event-image-url"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price</Label>
                <Input
                  value={formData.price}
                  onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                  placeholder="e.g., $25, Free"
                  data-testid="input-event-price"
                />
              </div>
              <div className="space-y-2">
                <Label>Shopify URL</Label>
                <Input
                  value={formData.shopifyUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, shopifyUrl: e.target.value }))}
                  placeholder="https://shop..."
                  data-testid="input-event-shopify-url"
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Event is visible when active</p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(v) => setFormData((prev) => ({ ...prev, isActive: v }))}
                data-testid="switch-event-active"
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Featured</Label>
                <p className="text-xs text-muted-foreground">Highlight this event</p>
              </div>
              <Switch
                checked={formData.isFeatured}
                onCheckedChange={(v) => setFormData((prev) => ({ ...prev, isFeatured: v }))}
                data-testid="switch-event-featured"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setEditEvent(null); resetForm(); }} data-testid="button-cancel-event">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.title || !formData.eventDate || !formData.startTime || createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-event"
            >
              {editEvent ? "Save Changes" : "Create Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventCard({
  event,
  onEdit,
  onDelete,
}: {
  event: SpecialEvent;
  onEdit: (e: SpecialEvent) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <Card className="overflow-visible" data-testid={`card-special-event-${event.id}`}>
      {event.imageUrl && (
        <div className="relative w-full h-40 overflow-hidden rounded-t-md">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
            data-testid={`img-event-${event.id}`}
          />
          {event.isFeatured && (
            <Badge variant="default" className="absolute top-2 right-2">
              <Star className="w-3 h-3 mr-1" /> Featured
            </Badge>
          )}
        </div>
      )}
      <CardContent className={`p-4 space-y-3 ${!event.imageUrl ? "pt-4" : ""}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate" data-testid={`text-event-title-${event.id}`}>{event.title}</h4>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant={CATEGORY_VARIANTS[event.category] || "secondary"}>
                {CATEGORY_LABELS[event.category] || event.category}
              </Badge>
              <Badge variant={event.isActive ? "default" : "secondary"}>
                {event.isActive ? "Active" : "Inactive"}
              </Badge>
              {!event.imageUrl && event.isFeatured && (
                <Badge variant="outline"><Star className="w-3 h-3 mr-1" /> Featured</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={() => onEdit(event)} data-testid={`button-edit-event-${event.id}`}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onDelete(event.id)} data-testid={`button-delete-event-${event.id}`}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span>{formatDate(event.eventDate)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span>
              {formatTime12(event.startTime)}
              {event.endTime && ` - ${formatTime12(event.endTime)}`}
            </span>
          </div>
          {event.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span>{event.location}</span>
            </div>
          )}
          {event.price && (
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3 flex-shrink-0" />
              <span>{event.price}</span>
            </div>
          )}
        </div>

        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
        )}

        {event.shopifyUrl && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => window.open(event.shopifyUrl!, "_blank")}
            data-testid={`button-shopify-link-${event.id}`}
          >
            <ExternalLink className="w-3 h-3 mr-2" />
            View on Shopify
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
