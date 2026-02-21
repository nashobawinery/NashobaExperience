import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Monitor,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Bell,
  Camera,
  Sparkles,
  Settings,
  Eye,
  ExternalLink,
  GripVertical,
  Image,
  Clock,
  MapPin,
} from "lucide-react";

interface Slide {
  id: number;
  slideType: string;
  title: string;
  subtitle: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  backgroundImageUrl: string | null;
  mediaLibraryId: string | null;
  duration: number;
  sortOrder: number;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
}

interface Event {
  id: number;
  title: string;
  description: string | null;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  category: string | null;
  imageUrl: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  isActive: boolean;
}

interface Announcement {
  id: number;
  title: string;
  body: string;
  priority: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
}

interface Photo {
  id: number;
  imageUrl: string;
  mediaLibraryId: string | null;
  caption: string | null;
  category: string | null;
  sortOrder: number;
  isDisplayed: boolean;
}

interface DailySpecial {
  id: number;
  title: string;
  description: string | null;
  validDate: string | null;
  happyHourStart: string | null;
  happyHourEnd: string | null;
  isActive: boolean;
}

interface DisplaySetting {
  id: number;
  slideType: string;
  isEnabled: boolean;
  duration: number;
  sortOrder: number;
  backgroundImageUrl: string | null;
}

const SLIDE_TYPE_LABELS: Record<string, string> = {
  welcome: "Welcome Screen",
  events_today: "Today's Events",
  wine_list: "Wine & Beverage List",
  food_menu: "Food Menu",
  upcoming_events: "Upcoming Events",
  photo_gallery: "Photo Gallery",
  announcement: "Announcements",
  weather: "Weather",
  wine_club: "Wine Club Promo",
  daily_specials: "Daily Specials",
  custom: "Custom Slides",
};

function SlidesManager() {
  const { toast } = useToast();
  const [editingSlide, setEditingSlide] = useState<Slide | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    slideType: "custom" as string,
    title: "",
    subtitle: "",
    bodyText: "",
    backgroundImageUrl: "",
    duration: 12,
    sortOrder: 0,
    isActive: true,
    startDate: "",
    endDate: "",
    location: "",
  });

  const { data: slides, isLoading } = useQuery<Slide[]>({
    queryKey: ["/api/nashobatv/slides"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/nashobatv/slides", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nashobatv/slides"] });
      setIsDialogOpen(false);
      toast({ title: "Slide created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/nashobatv/slides/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nashobatv/slides"] });
      setIsDialogOpen(false);
      toast({ title: "Slide updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/nashobatv/slides/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nashobatv/slides"] });
      toast({ title: "Slide deleted" });
    },
  });

  const openCreate = () => {
    setEditingSlide(null);
    setFormData({ slideType: "custom", title: "", subtitle: "", bodyText: "", backgroundImageUrl: "", duration: 12, sortOrder: 0, isActive: true, startDate: "", endDate: "", location: "" });
    setIsDialogOpen(true);
  };

  const openEdit = (slide: Slide) => {
    setEditingSlide(slide);
    setFormData({
      slideType: slide.slideType,
      title: slide.title,
      subtitle: slide.subtitle || "",
      bodyText: slide.bodyText || "",
      backgroundImageUrl: slide.backgroundImageUrl || "",
      duration: slide.duration,
      sortOrder: slide.sortOrder,
      isActive: slide.isActive,
      startDate: slide.startDate || "",
      endDate: slide.endDate || "",
      location: slide.location || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const payload = {
      ...formData,
      subtitle: formData.subtitle || null,
      bodyText: formData.bodyText || null,
      backgroundImageUrl: formData.backgroundImageUrl || null,
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
      location: formData.location || null,
    };
    if (editingSlide) {
      updateMutation.mutate({ id: editingSlide.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold">Custom Slides</h3>
        <Button onClick={openCreate} data-testid="button-add-slide">
          <Plus className="w-4 h-4 mr-2" />
          Add Slide
        </Button>
      </div>

      {(!slides || slides.length === 0) ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Monitor className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No custom slides yet. Add one to get started.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {slides.map((slide) => (
            <Card key={slide.id} className="p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium truncate">{slide.title}</h4>
                    <Badge variant={slide.isActive ? "default" : "secondary"}>
                      {slide.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline">{SLIDE_TYPE_LABELS[slide.slideType] || slide.slideType}</Badge>
                  </div>
                  {slide.subtitle && <p className="text-sm text-muted-foreground mt-1">{slide.subtitle}</p>}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{slide.duration}s</span>
                    <span>Order: {slide.sortOrder}</span>
                    {slide.startDate && <span>From: {slide.startDate}</span>}
                    {slide.endDate && <span>Until: {slide.endDate}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(slide)} data-testid={`button-edit-slide-${slide.id}`}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(slide.id)} data-testid={`button-delete-slide-${slide.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSlide ? "Edit Slide" : "Add Slide"}</DialogTitle>
            <DialogDescription>Configure the slide content and display settings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Slide Type</Label>
              <Select value={formData.slideType} onValueChange={(v) => setFormData({ ...formData, slideType: v })}>
                <SelectTrigger data-testid="select-slide-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SLIDE_TYPE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} data-testid="input-slide-title" />
            </div>
            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Input value={formData.subtitle} onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })} data-testid="input-slide-subtitle" />
            </div>
            <div className="space-y-2">
              <Label>Body Text</Label>
              <Textarea value={formData.bodyText} onChange={(e) => setFormData({ ...formData, bodyText: e.target.value })} rows={3} data-testid="input-slide-body" />
            </div>
            <div className="space-y-2">
              <Label>Background Image URL</Label>
              <Input value={formData.backgroundImageUrl} onChange={(e) => setFormData({ ...formData, backgroundImageUrl: e.target.value })} data-testid="input-slide-bg-url" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (seconds)</Label>
                <Input type="number" min={3} max={120} value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 12 })} data-testid="input-slide-duration" />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input type="number" value={formData.sortOrder} onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })} data-testid="input-slide-sort" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} data-testid="input-slide-start" />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} data-testid="input-slide-end" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.isActive} onCheckedChange={(v) => setFormData({ ...formData, isActive: v })} data-testid="switch-slide-active" />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.title || createMutation.isPending || updateMutation.isPending} data-testid="button-save-slide">
              {editingSlide ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventsManager() {
  const { toast } = useToast();
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    eventDate: "",
    startTime: "",
    endTime: "",
    location: "",
    category: "",
    imageUrl: "",
    isActive: true,
  });

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/nashobatv/events"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/nashobatv/events", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nashobatv/events"] });
      setIsDialogOpen(false);
      toast({ title: "Event created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/nashobatv/events/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nashobatv/events"] });
      setIsDialogOpen(false);
      toast({ title: "Event updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/nashobatv/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nashobatv/events"] });
      toast({ title: "Event deleted" });
    },
  });

  const openCreate = () => {
    setEditingEvent(null);
    setFormData({ title: "", description: "", eventDate: "", startTime: "", endTime: "", location: "", category: "", imageUrl: "", isActive: true });
    setIsDialogOpen(true);
  };

  const openEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      eventDate: event.eventDate,
      startTime: event.startTime || "",
      endTime: event.endTime || "",
      location: event.location || "",
      category: event.category || "",
      imageUrl: event.imageUrl || "",
      isActive: event.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const payload = {
      ...formData,
      description: formData.description || null,
      startTime: formData.startTime || null,
      endTime: formData.endTime || null,
      location: formData.location || null,
      category: formData.category || null,
      imageUrl: formData.imageUrl || null,
    };
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold">Events</h3>
        <Button onClick={openCreate} data-testid="button-add-event">
          <Plus className="w-4 h-4 mr-2" />
          Add Event
        </Button>
      </div>

      {(!events || events.length === 0) ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No events yet. Add one to display on TV.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Card key={event.id} className="p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium">{event.title}</h4>
                    <Badge variant={event.isActive ? "default" : "secondary"}>{event.isActive ? "Active" : "Inactive"}</Badge>
                    {event.category && <Badge variant="outline">{event.category}</Badge>}
                  </div>
                  {event.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{event.description}</p>}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{event.eventDate}</span>
                    {event.startTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{event.startTime}{event.endTime ? ` - ${event.endTime}` : ""}</span>}
                    {event.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(event)} data-testid={`button-edit-event-${event.id}`}><Edit className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(event.id)} data-testid={`button-delete-event-${event.id}`}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Add Event"}</DialogTitle>
            <DialogDescription>Events will appear on the TV display on their scheduled date.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} data-testid="input-event-title" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} data-testid="input-event-description" />
            </div>
            <div className="space-y-2">
              <Label>Event Date</Label>
              <Input type="date" value={formData.eventDate} onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })} data-testid="input-event-date" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} data-testid="input-event-start-time" />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} data-testid="input-event-end-time" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} data-testid="input-event-location" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger data-testid="select-event-category"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Music">Music</SelectItem>
                    <SelectItem value="Tasting">Tasting</SelectItem>
                    <SelectItem value="Food">Food</SelectItem>
                    <SelectItem value="Holiday">Holiday</SelectItem>
                    <SelectItem value="Private">Private</SelectItem>
                    <SelectItem value="Special">Special</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} data-testid="input-event-image" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.isActive} onCheckedChange={(v) => setFormData({ ...formData, isActive: v })} data-testid="switch-event-active" />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.title || !formData.eventDate || createMutation.isPending || updateMutation.isPending} data-testid="button-save-event">
              {editingEvent ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnnouncementsManager() {
  const { toast } = useToast();
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ title: "", body: "", priority: 0, startDate: "", endDate: "", isActive: true });

  const { data: announcements, isLoading } = useQuery<Announcement[]>({ queryKey: ["/api/nashobatv/announcements"] });

  const createMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", "/api/nashobatv/announcements", data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nashobatv/announcements"] }); setIsDialogOpen(false); toast({ title: "Announcement created" }); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { const res = await apiRequest("PUT", `/api/nashobatv/announcements/${id}`, data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nashobatv/announcements"] }); setIsDialogOpen(false); toast({ title: "Announcement updated" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/nashobatv/announcements/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nashobatv/announcements"] }); toast({ title: "Announcement deleted" }); },
  });

  const openCreate = () => {
    setEditingItem(null);
    setFormData({ title: "", body: "", priority: 0, startDate: "", endDate: "", isActive: true });
    setIsDialogOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setEditingItem(a);
    setFormData({ title: a.title, body: a.body, priority: a.priority, startDate: a.startDate || "", endDate: a.endDate || "", isActive: a.isActive });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const payload = { ...formData, startDate: formData.startDate || null, endDate: formData.endDate || null };
    if (editingItem) { updateMutation.mutate({ id: editingItem.id, data: payload }); }
    else { createMutation.mutate(payload); }
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold">Announcements</h3>
        <Button onClick={openCreate} data-testid="button-add-announcement"><Plus className="w-4 h-4 mr-2" />Add Announcement</Button>
      </div>

      {(!announcements || announcements.length === 0) ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No announcements yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium">{a.title}</h4>
                    <Badge variant={a.isActive ? "default" : "secondary"}>{a.isActive ? "Active" : "Inactive"}</Badge>
                    {a.priority > 0 && <Badge variant="outline">Priority: {a.priority}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.body}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(a)} data-testid={`button-edit-announcement-${a.id}`}><Edit className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(a.id)} data-testid={`button-delete-announcement-${a.id}`}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Announcement" : "Add Announcement"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Title</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} data-testid="input-announcement-title" /></div>
            <div className="space-y-2"><Label>Message</Label><Textarea value={formData.body} onChange={(e) => setFormData({ ...formData, body: e.target.value })} rows={3} data-testid="input-announcement-body" /></div>
            <div className="space-y-2"><Label>Priority (higher = shown first)</Label><Input type="number" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })} data-testid="input-announcement-priority" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} /></div>
              <div className="space-y-2"><Label>End Date</Label><Input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={formData.isActive} onCheckedChange={(v) => setFormData({ ...formData, isActive: v })} data-testid="switch-announcement-active" /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.title || !formData.body || createMutation.isPending || updateMutation.isPending} data-testid="button-save-announcement">{editingItem ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PhotosManager() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [formData, setFormData] = useState({ imageUrl: "", caption: "", category: "", sortOrder: 0, isDisplayed: true });

  const { data: photos, isLoading } = useQuery<Photo[]>({ queryKey: ["/api/nashobatv/photos"] });

  const createMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", "/api/nashobatv/photos", data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nashobatv/photos"] }); setIsDialogOpen(false); toast({ title: "Photo added" }); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { const res = await apiRequest("PUT", `/api/nashobatv/photos/${id}`, data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nashobatv/photos"] }); setIsDialogOpen(false); toast({ title: "Photo updated" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/nashobatv/photos/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nashobatv/photos"] }); toast({ title: "Photo removed" }); },
  });

  const openCreate = () => {
    setEditingPhoto(null);
    setFormData({ imageUrl: "", caption: "", category: "", sortOrder: 0, isDisplayed: true });
    setIsDialogOpen(true);
  };

  const openEdit = (p: Photo) => {
    setEditingPhoto(p);
    setFormData({ imageUrl: p.imageUrl, caption: p.caption || "", category: p.category || "", sortOrder: p.sortOrder, isDisplayed: p.isDisplayed });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const payload = { ...formData, caption: formData.caption || null, category: formData.category || null };
    if (editingPhoto) { updateMutation.mutate({ id: editingPhoto.id, data: payload }); }
    else { createMutation.mutate(payload); }
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold">Gallery Photos</h3>
        <Button onClick={openCreate} data-testid="button-add-photo"><Plus className="w-4 h-4 mr-2" />Add Photo</Button>
      </div>

      {(!photos || photos.length === 0) ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No gallery photos yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((p) => (
            <Card key={p.id} className="overflow-visible">
              <div className="aspect-video relative">
                <img src={p.imageUrl} alt={p.caption || "Gallery"} className="w-full h-full object-cover rounded-t-md" />
                {!p.isDisplayed && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-t-md">
                    <Badge variant="secondary">Hidden</Badge>
                  </div>
                )}
              </div>
              <div className="p-3">
                {p.caption && <p className="text-sm truncate">{p.caption}</p>}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">Order: {p.sortOrder}</span>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)} data-testid={`button-edit-photo-${p.id}`}><Edit className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(p.id)} data-testid={`button-delete-photo-${p.id}`}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingPhoto ? "Edit Photo" : "Add Photo"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Image URL</Label><Input value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} data-testid="input-photo-url" /></div>
            <div className="space-y-2"><Label>Caption</Label><Input value={formData.caption} onChange={(e) => setFormData({ ...formData, caption: e.target.value })} data-testid="input-photo-caption" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Category</Label><Input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} /></div>
              <div className="space-y-2"><Label>Sort Order</Label><Input type="number" value={formData.sortOrder} onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })} /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={formData.isDisplayed} onCheckedChange={(v) => setFormData({ ...formData, isDisplayed: v })} data-testid="switch-photo-displayed" /><Label>Show on Display</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.imageUrl || createMutation.isPending || updateMutation.isPending} data-testid="button-save-photo">{editingPhoto ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SpecialsManager() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DailySpecial | null>(null);
  const [formData, setFormData] = useState({ title: "", description: "", validDate: "", happyHourStart: "", happyHourEnd: "", isActive: true });

  const { data: specials, isLoading } = useQuery<DailySpecial[]>({ queryKey: ["/api/nashobatv/specials"] });

  const createMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", "/api/nashobatv/specials", data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nashobatv/specials"] }); setIsDialogOpen(false); toast({ title: "Special created" }); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { const res = await apiRequest("PUT", `/api/nashobatv/specials/${id}`, data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nashobatv/specials"] }); setIsDialogOpen(false); toast({ title: "Special updated" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/nashobatv/specials/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nashobatv/specials"] }); toast({ title: "Special deleted" }); },
  });

  const openCreate = () => {
    setEditingItem(null);
    setFormData({ title: "", description: "", validDate: "", happyHourStart: "", happyHourEnd: "", isActive: true });
    setIsDialogOpen(true);
  };

  const openEdit = (s: DailySpecial) => {
    setEditingItem(s);
    setFormData({ title: s.title, description: s.description || "", validDate: s.validDate || "", happyHourStart: s.happyHourStart || "", happyHourEnd: s.happyHourEnd || "", isActive: s.isActive });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const payload = { ...formData, description: formData.description || null, validDate: formData.validDate || null, happyHourStart: formData.happyHourStart || null, happyHourEnd: formData.happyHourEnd || null };
    if (editingItem) { updateMutation.mutate({ id: editingItem.id, data: payload }); }
    else { createMutation.mutate(payload); }
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold">Daily Specials</h3>
        <Button onClick={openCreate} data-testid="button-add-special"><Plus className="w-4 h-4 mr-2" />Add Special</Button>
      </div>

      {(!specials || specials.length === 0) ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No daily specials yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {specials.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium">{s.title}</h4>
                    <Badge variant={s.isActive ? "default" : "secondary"}>{s.isActive ? "Active" : "Inactive"}</Badge>
                    {s.validDate && <Badge variant="outline">{s.validDate}</Badge>}
                  </div>
                  {s.description && <p className="text-sm text-muted-foreground mt-1">{s.description}</p>}
                  {(s.happyHourStart || s.happyHourEnd) && <p className="text-xs text-muted-foreground mt-1">Happy Hour: {s.happyHourStart} - {s.happyHourEnd}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(s)} data-testid={`button-edit-special-${s.id}`}><Edit className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(s.id)} data-testid={`button-delete-special-${s.id}`}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingItem ? "Edit Special" : "Add Special"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Title</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} data-testid="input-special-title" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} data-testid="input-special-description" /></div>
            <div className="space-y-2"><Label>Valid Date (leave empty for every day)</Label><Input type="date" value={formData.validDate} onChange={(e) => setFormData({ ...formData, validDate: e.target.value })} data-testid="input-special-date" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Happy Hour Start</Label><Input type="time" value={formData.happyHourStart} onChange={(e) => setFormData({ ...formData, happyHourStart: e.target.value })} /></div>
              <div className="space-y-2"><Label>Happy Hour End</Label><Input type="time" value={formData.happyHourEnd} onChange={(e) => setFormData({ ...formData, happyHourEnd: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={formData.isActive} onCheckedChange={(v) => setFormData({ ...formData, isActive: v })} data-testid="switch-special-active" /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.title || createMutation.isPending || updateMutation.isPending} data-testid="button-save-special">{editingItem ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DisplaySettingsManager() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<DisplaySetting[]>({ queryKey: ["/api/nashobatv/display-settings"] });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/nashobatv/display-settings/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nashobatv/display-settings"] });
      toast({ title: "Settings updated" });
    },
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold">Display Settings</h3>
          <p className="text-sm text-muted-foreground">Control which slides appear and their duration on the TV display.</p>
        </div>
        <Button variant="outline" onClick={() => window.open("/display", "_blank")} data-testid="button-preview-display">
          <Eye className="w-4 h-4 mr-2" />
          Preview Display
          <ExternalLink className="w-3 h-3 ml-1" />
        </Button>
      </div>

      <div className="space-y-3">
        {settings?.map((s) => (
          <Card key={s.id} className="p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{SLIDE_TYPE_LABELS[s.slideType] || s.slideType}</p>
                  <p className="text-xs text-muted-foreground">Duration: {s.duration}s | Order: {s.sortOrder}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Duration</Label>
                  <Input
                    type="number"
                    min={3}
                    max={120}
                    value={s.duration}
                    onChange={(e) => updateMutation.mutate({ id: s.id, data: { duration: parseInt(e.target.value) || 12 } })}
                    className="w-20"
                    data-testid={`input-setting-duration-${s.slideType}`}
                  />
                </div>
                <Switch
                  checked={s.isEnabled}
                  onCheckedChange={(v) => updateMutation.mutate({ id: s.id, data: { isEnabled: v } })}
                  data-testid={`switch-setting-${s.slideType}`}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function NashobatvAdmin() {
  const [subTab, setSubTab] = useState("settings");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Monitor className="w-7 h-7" />
            NashobaTV Digital Signage
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage the content displayed on TV screens throughout the venue.
          </p>
        </div>
        <Button variant="outline" onClick={() => window.open("/display", "_blank")} data-testid="button-open-display">
          <Eye className="w-4 h-4 mr-2" />
          Open TV Display
          <ExternalLink className="w-3 h-3 ml-1" />
        </Button>
      </div>

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="grid w-full grid-cols-6 h-auto">
          <TabsTrigger value="settings" data-testid="tab-tv-settings" className="flex items-center justify-center gap-2">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </TabsTrigger>
          <TabsTrigger value="slides" data-testid="tab-tv-slides" className="flex items-center justify-center gap-2">
            <Image className="w-4 h-4" />
            <span>Slides</span>
          </TabsTrigger>
          <TabsTrigger value="events" data-testid="tab-tv-events" className="flex items-center justify-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>Events</span>
          </TabsTrigger>
          <TabsTrigger value="announcements" data-testid="tab-tv-announcements" className="flex items-center justify-center gap-2">
            <Bell className="w-4 h-4" />
            <span>Announcements</span>
          </TabsTrigger>
          <TabsTrigger value="photos" data-testid="tab-tv-photos" className="flex items-center justify-center gap-2">
            <Camera className="w-4 h-4" />
            <span>Photos</span>
          </TabsTrigger>
          <TabsTrigger value="specials" data-testid="tab-tv-specials" className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>Specials</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings"><DisplaySettingsManager /></TabsContent>
        <TabsContent value="slides"><SlidesManager /></TabsContent>
        <TabsContent value="events"><EventsManager /></TabsContent>
        <TabsContent value="announcements"><AnnouncementsManager /></TabsContent>
        <TabsContent value="photos"><PhotosManager /></TabsContent>
        <TabsContent value="specials"><SpecialsManager /></TabsContent>
      </Tabs>
    </div>
  );
}
