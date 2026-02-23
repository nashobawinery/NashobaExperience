import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { Progress } from "@/components/ui/progress";
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
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
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

interface HistoricalFact {
  id: number;
  fact: string;
  year: number | null;
  month: number | null;
  day: number | null;
  category: string;
  isActive: boolean;
}

const FACT_CATEGORIES = [
  { value: "winery", label: "Winery" },
  { value: "restaurant", label: "Restaurant" },
  { value: "distillery", label: "Distillery" },
  { value: "brewery", label: "Brewery" },
  { value: "farm", label: "Farm" },
];

const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface DisplaySetting {
  id: number;
  slideType: string;
  isEnabled: boolean;
  duration: number;
  sortOrder: number;
  backgroundImageUrl: string | null;
  configData: any;
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
  trivia: "Trivia Questions",
  history: "Did You Know?",
  custom: "Custom Slides",
};

const SLIDE_TYPE_DESCRIPTIONS: Record<string, string> = {
  welcome: "Welcome screen with logo, time, and customizable message below.",
  events_today: "Pulls from the Events tab. Only shows when today has events.",
  wine_list: "Pulls from the product catalog (wines & beverages).",
  food_menu: "Displays farm-to-table dining highlights.",
  upcoming_events: "Pulls from the Events tab. Only shows when future events exist.",
  photo_gallery: "Pulls from the Photos tab. Only shows when photos exist.",
  announcement: "Pulls from the Announcements tab. Only shows when active announcements exist.",
  weather: "Live weather from Open-Meteo API for Bolton, MA.",
  wine_club: "Auto-generated wine club membership promotion.",
  daily_specials: "Pulls from the Specials tab. Only shows when active specials exist.",
  trivia: "Pulls from the Tasting Experience trivia bank.",
  history: "Pulls from the History tab. Facts about the winery, restaurant, distillery, brewery, and farm.",
  custom: "Your own slides created in the Slides tab.",
};

function SlidesManager({ channelId }: { channelId: number }) {
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

  const [showGalleryPicker, setShowGalleryPicker] = useState(false);

  const { data: slides, isLoading } = useQuery<Slide[]>({
    queryKey: ["/api/nashobatv/slides", channelId],
    queryFn: async () => {
      const res = await fetch(`/api/nashobatv/slides?channelId=${channelId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const { data: galleryPhotos = [] } = useQuery<Photo[]>({
    queryKey: ["/api/nashobatv/photos", channelId],
    queryFn: async () => {
      const res = await fetch(`/api/nashobatv/photos?channelId=${channelId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/nashobatv/slides", { ...data, channelId });
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
      slideType: "custom",
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
        <div>
          <h3 className="text-lg font-semibold">Custom Slides</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Create your own slides with custom text and images. To enable/disable built-in slides (trivia, weather, history, etc.), use the Settings tab.</p>
        </div>
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
            <input type="hidden" value="custom" />
            <div className="space-y-1">
              <Label>Slide Type</Label>
              <p className="text-sm text-muted-foreground">Custom Slide</p>
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
              <Label>Background Image</Label>
              {formData.backgroundImageUrl ? (
                <div className="relative rounded-md overflow-visible border">
                  <img
                    src={formData.backgroundImageUrl}
                    alt="Selected background"
                    className="w-full h-32 object-cover rounded-md"
                    data-testid="img-slide-bg-preview"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => setFormData({ ...formData, backgroundImageUrl: "" })}
                    data-testid="button-clear-slide-bg"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : null}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowGalleryPicker(!showGalleryPicker)}
                  data-testid="button-pick-from-gallery"
                >
                  <Image className="h-4 w-4 mr-1" /> Pick from Gallery
                </Button>
              </div>
              {showGalleryPicker && (
                <div className="border rounded-md p-2 space-y-2 max-h-48 overflow-y-auto">
                  {galleryPhotos.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {galleryPhotos.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          className={`relative rounded-md overflow-visible border-2 cursor-pointer ${formData.backgroundImageUrl === p.imageUrl ? "border-primary" : "border-transparent"}`}
                          onClick={() => {
                            setFormData({ ...formData, backgroundImageUrl: p.imageUrl });
                            setShowGalleryPicker(false);
                          }}
                          data-testid={`gallery-pick-${p.id}`}
                        >
                          <img
                            src={p.imageUrl}
                            alt={p.caption || "Gallery photo"}
                            className="w-full h-16 object-cover rounded-md"
                          />
                          {formData.backgroundImageUrl === p.imageUrl && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center rounded-md">
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">No gallery photos yet. Add some in the Photos tab.</p>
                  )}
                </div>
              )}
              <Input
                value={formData.backgroundImageUrl}
                onChange={(e) => setFormData({ ...formData, backgroundImageUrl: e.target.value })}
                placeholder="Or paste an image URL..."
                className="text-xs"
                data-testid="input-slide-bg-url"
              />
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

function EventsManager({ channelId }: { channelId: number }) {
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
    queryKey: ["/api/nashobatv/events", channelId],
    queryFn: async () => {
      const res = await fetch(`/api/nashobatv/events?channelId=${channelId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/nashobatv/events", { ...data, channelId });
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

function AnnouncementsManager({ channelId }: { channelId: number }) {
  const { toast } = useToast();
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ title: "", body: "", priority: 0, startDate: "", endDate: "", isActive: true });

  const { data: announcements, isLoading } = useQuery<Announcement[]>({
    queryKey: ["/api/nashobatv/announcements", channelId],
    queryFn: async () => {
      const res = await fetch(`/api/nashobatv/announcements?channelId=${channelId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", "/api/nashobatv/announcements", { ...data, channelId }); return res.json(); },
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

interface UploadingFile {
  file: File;
  id: string;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  publicUrl?: string;
  previewUrl?: string;
  error?: string;
}

function PhotosManager({ channelId }: { channelId: number }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUrlDialogOpen, setIsUrlDialogOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [formData, setFormData] = useState({ imageUrl: "", caption: "", category: "", sortOrder: 0, isDisplayed: true });
  const [urlFormData, setUrlFormData] = useState({ imageUrl: "", caption: "", isDisplayed: true });
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragOverDialog, setIsDragOverDialog] = useState(false);
  const [isDragOverEmpty, setIsDragOverEmpty] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      uploadingFiles.forEach(f => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl); });
    };
  }, []);

  const { data: photos, isLoading } = useQuery<Photo[]>({
    queryKey: ["/api/nashobatv/photos", channelId],
    queryFn: async () => {
      const res = await fetch(`/api/nashobatv/photos?channelId=${channelId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", "/api/nashobatv/photos", { ...data, channelId }); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nashobatv/photos"] }); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { const res = await apiRequest("PUT", `/api/nashobatv/photos/${id}`, data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nashobatv/photos"] }); setIsDialogOpen(false); toast({ title: "Photo updated" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/nashobatv/photos/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nashobatv/photos"] }); toast({ title: "Photo removed" }); },
  });

  const openEdit = (p: Photo) => {
    setEditingPhoto(p);
    setFormData({ imageUrl: p.imageUrl, caption: p.caption || "", category: p.category || "", sortOrder: p.sortOrder, isDisplayed: p.isDisplayed });
    setIsDialogOpen(true);
  };

  const handleEditSubmit = () => {
    const payload = { ...formData, caption: formData.caption || null, category: formData.category || null };
    if (editingPhoto) { updateMutation.mutate({ id: editingPhoto.id, data: payload }); }
  };

  const addFiles = useCallback((files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast({ title: "No images selected", description: "Please select image files (JPG, PNG, etc.)", variant: "destructive" });
      return;
    }
    const newEntries: UploadingFile[] = imageFiles.map(f => ({
      file: f,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      status: "pending" as const,
      progress: 0,
      previewUrl: URL.createObjectURL(f),
    }));
    setUploadingFiles(prev => [...prev, ...newEntries]);
    if (!isUploadOpen) setIsUploadOpen(true);
  }, [toast, isUploadOpen]);

  const removeFile = (id: string) => {
    setUploadingFiles(prev => {
      const removing = prev.find(f => f.id === id);
      if (removing?.previewUrl) URL.revokeObjectURL(removing.previewUrl);
      return prev.filter(f => f.id !== id);
    });
  };

  const cleanupPreviews = useCallback(() => {
    setUploadingFiles(prev => {
      prev.forEach(f => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl); });
      return [];
    });
  }, []);

  const uploadSingleFile = async (entry: UploadingFile): Promise<string> => {
    setUploadingFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: "uploading" as const, progress: 10 } : f));

    const response = await apiRequest("POST", "/api/admin/object-storage/upload", {
      filename: entry.file.name,
      folder: "nashobatv-photos",
    });
    const uploadData = await response.json();

    setUploadingFiles(prev => prev.map(f => f.id === entry.id ? { ...f, progress: 40 } : f));

    const uploadResponse = await fetch(uploadData.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": entry.file.type },
      body: entry.file,
    });

    if (!uploadResponse.ok) throw new Error("Upload failed");

    setUploadingFiles(prev => prev.map(f => f.id === entry.id ? { ...f, progress: 80 } : f));

    return uploadData.publicUrl;
  };

  const handleUploadAll = async () => {
    const pendingFiles = uploadingFiles.filter(f => f.status === "pending");
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    let successCount = 0;
    const currentPhotoCount = photos?.length || 0;

    for (let i = 0; i < pendingFiles.length; i++) {
      const entry = pendingFiles[i];
      try {
        const publicUrl = await uploadSingleFile(entry);

        await createMutation.mutateAsync({
          imageUrl: publicUrl,
          caption: null,
          category: null,
          sortOrder: currentPhotoCount + i,
          isDisplayed: true,
        });

        setUploadingFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: "done" as const, progress: 100, publicUrl } : f));
        successCount++;
      } catch (error) {
        setUploadingFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: "error" as const, error: "Upload failed", progress: 0 } : f));
      }
    }

    setIsUploading(false);
    queryClient.invalidateQueries({ queryKey: ["/api/nashobatv/photos"] });

    if (successCount > 0) {
      toast({ title: `${successCount} photo${successCount > 1 ? "s" : ""} uploaded` });
    }
  };

  const handleDragOverDialog = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOverDialog(true); }, []);
  const handleDragLeaveDialog = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOverDialog(false); }, []);
  const handleDropDialog = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverDialog(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleDragOverEmpty = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOverEmpty(true); }, []);
  const handleDragLeaveEmpty = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOverEmpty(false); }, []);
  const handleDropEmpty = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverEmpty(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  };

  const pendingCount = uploadingFiles.filter(f => f.status === "pending").length;
  const doneCount = uploadingFiles.filter(f => f.status === "done").length;
  const allDone = uploadingFiles.length > 0 && uploadingFiles.every(f => f.status === "done" || f.status === "error");

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold">Gallery Photos</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { setUrlFormData({ imageUrl: "", caption: "", isDisplayed: true }); setIsUrlDialogOpen(true); }} data-testid="button-add-photo-url">
            <Plus className="w-4 h-4 mr-2" />Add by URL
          </Button>
          <Button onClick={() => { setUploadingFiles([]); setIsUploadOpen(true); }} data-testid="button-upload-photos">
            <Upload className="w-4 h-4 mr-2" />Upload Photos
          </Button>
        </div>
      </div>

      {(!photos || photos.length === 0) ? (
        <Card
          className={`p-8 text-center text-muted-foreground border-2 border-dashed cursor-pointer transition-colors ${isDragOverEmpty ? "border-primary bg-primary/5" : ""}`}
          onDragOver={handleDragOverEmpty}
          onDragLeave={handleDragLeaveEmpty}
          onDrop={handleDropEmpty}
          onClick={() => { setUploadingFiles([]); setIsUploadOpen(true); }}
          data-testid="drop-zone-empty"
        >
          <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No gallery photos yet</p>
          <p className="text-sm mt-1">Drag and drop images here, or click to upload</p>
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

      <Dialog open={isUploadOpen} onOpenChange={(open) => { if (!isUploading) setIsUploadOpen(open); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Photos</DialogTitle>
            <DialogDescription>Select multiple images to add to the gallery. You can drag and drop files or browse to select them.</DialogDescription>
          </DialogHeader>

          <div
            className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors ${isDragOverDialog ? "border-primary bg-primary/5" : "border-muted-foreground/25"}`}
            onDragOver={handleDragOverDialog}
            onDragLeave={handleDragLeaveDialog}
            onDrop={handleDropDialog}
            onClick={() => fileInputRef.current?.click()}
            data-testid="drop-zone-dialog"
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium">Drag and drop images here</p>
            <p className="text-sm text-muted-foreground mt-1">or click to browse files</p>
            <p className="text-xs text-muted-foreground mt-2">Supports JPG, PNG, WebP</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              data-testid="input-file-upload"
            />
          </div>

          {uploadingFiles.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{uploadingFiles.length} file{uploadingFiles.length > 1 ? "s" : ""} selected{doneCount > 0 ? ` (${doneCount} uploaded)` : ""}</span>
                {!isUploading && pendingCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={cleanupPreviews} data-testid="button-clear-files">Clear all</Button>
                )}
              </div>
              {uploadingFiles.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                  <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                    {entry.previewUrl && <img src={entry.previewUrl} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{entry.file.name}</p>
                    <p className="text-xs text-muted-foreground">{(entry.file.size / 1024 / 1024).toFixed(1)} MB</p>
                    {entry.status === "uploading" && <Progress value={entry.progress} className="h-1 mt-1" />}
                    {entry.status === "error" && <p className="text-xs text-destructive mt-1">{entry.error}</p>}
                  </div>
                  <div className="flex-shrink-0">
                    {entry.status === "pending" && !isUploading && (
                      <Button size="icon" variant="ghost" onClick={() => removeFile(entry.id)} data-testid={`button-remove-file-${entry.id}`}><X className="w-4 h-4" /></Button>
                    )}
                    {entry.status === "uploading" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                    {entry.status === "done" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {entry.status === "error" && <AlertCircle className="w-4 h-4 text-destructive" />}
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { if (!isUploading) setIsUploadOpen(false); }} disabled={isUploading}>
              {allDone ? "Close" : "Cancel"}
            </Button>
            {pendingCount > 0 && (
              <Button onClick={handleUploadAll} disabled={isUploading} data-testid="button-start-upload">
                {isUploading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                ) : (
                  <><Upload className="w-4 h-4 mr-2" />Upload {pendingCount} Photo{pendingCount > 1 ? "s" : ""}</>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Photo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {editingPhoto && (
              <div className="aspect-video relative rounded-md overflow-hidden bg-muted">
                <img src={formData.imageUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="space-y-2"><Label>Caption</Label><Input value={formData.caption} onChange={(e) => setFormData({ ...formData, caption: e.target.value })} data-testid="input-photo-caption" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Category</Label><Input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} /></div>
              <div className="space-y-2"><Label>Sort Order</Label><Input type="number" value={formData.sortOrder} onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })} /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={formData.isDisplayed} onCheckedChange={(v) => setFormData({ ...formData, isDisplayed: v })} data-testid="switch-photo-displayed" /><Label>Show on Display</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSubmit} disabled={updateMutation.isPending} data-testid="button-save-photo">{updateMutation.isPending ? "Saving..." : "Update"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isUrlDialogOpen} onOpenChange={setIsUrlDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Photo by URL</DialogTitle>
            <DialogDescription>Paste an image URL to add it to the gallery.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Image URL</Label><Input value={urlFormData.imageUrl} onChange={(e) => setUrlFormData({ ...urlFormData, imageUrl: e.target.value })} placeholder="https://..." data-testid="input-photo-url" /></div>
            {urlFormData.imageUrl && (
              <div className="aspect-video relative rounded-md overflow-hidden bg-muted">
                <img src={urlFormData.imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
            <div className="space-y-2"><Label>Caption</Label><Input value={urlFormData.caption} onChange={(e) => setUrlFormData({ ...urlFormData, caption: e.target.value })} data-testid="input-url-photo-caption" /></div>
            <div className="flex items-center gap-2"><Switch checked={urlFormData.isDisplayed} onCheckedChange={(v) => setUrlFormData({ ...urlFormData, isDisplayed: v })} data-testid="switch-url-photo-displayed" /><Label>Show on Display</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUrlDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                createMutation.mutate(
                  { imageUrl: urlFormData.imageUrl, caption: urlFormData.caption || null, category: null, sortOrder: photos?.length || 0, isDisplayed: urlFormData.isDisplayed },
                  { onSuccess: () => { setIsUrlDialogOpen(false); toast({ title: "Photo added" }); } }
                );
              }}
              disabled={!urlFormData.imageUrl || createMutation.isPending}
              data-testid="button-save-url-photo"
            >
              {createMutation.isPending ? "Adding..." : "Add Photo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SpecialsManager({ channelId }: { channelId: number }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DailySpecial | null>(null);
  const [formData, setFormData] = useState({ title: "", description: "", validDate: "", happyHourStart: "", happyHourEnd: "", isActive: true });

  const { data: specials, isLoading } = useQuery<DailySpecial[]>({
    queryKey: ["/api/nashobatv/specials", channelId],
    queryFn: async () => {
      const res = await fetch(`/api/nashobatv/specials?channelId=${channelId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", "/api/nashobatv/specials", { ...data, channelId }); return res.json(); },
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

function HistoricalFactsManager() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HistoricalFact | null>(null);
  const [formData, setFormData] = useState({ fact: "", year: "", month: "", day: "", category: "winery", isActive: true });

  const { data: facts, isLoading } = useQuery<HistoricalFact[]>({
    queryKey: ["/api/nashobatv/historical-facts"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", "/api/nashobatv/historical-facts", data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nashobatv/historical-facts"] }); setIsDialogOpen(false); toast({ title: "Fact added" }); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { const res = await apiRequest("PUT", `/api/nashobatv/historical-facts/${id}`, data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nashobatv/historical-facts"] }); setIsDialogOpen(false); toast({ title: "Fact updated" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/nashobatv/historical-facts/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nashobatv/historical-facts"] }); toast({ title: "Fact deleted" }); },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => { const res = await apiRequest("PUT", `/api/nashobatv/historical-facts/${id}`, { isActive }); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nashobatv/historical-facts"] }); },
  });

  const openCreate = () => {
    setEditingItem(null);
    setFormData({ fact: "", year: "", month: "", day: "", category: "winery", isActive: true });
    setIsDialogOpen(true);
  };

  const openEdit = (f: HistoricalFact) => {
    setEditingItem(f);
    setFormData({
      fact: f.fact,
      year: f.year?.toString() || "",
      month: f.month?.toString() || "",
      day: f.day?.toString() || "",
      category: f.category,
      isActive: f.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const payload = {
      fact: formData.fact,
      year: formData.year ? parseInt(formData.year) : null,
      month: formData.month ? parseInt(formData.month) : null,
      day: formData.day ? parseInt(formData.day) : null,
      category: formData.category,
      isActive: formData.isActive,
    };
    if (editingItem) { updateMutation.mutate({ id: editingItem.id, data: payload }); }
    else { createMutation.mutate(payload); }
  };

  const formatDate = (f: HistoricalFact) => {
    const parts: string[] = [];
    if (f.year) parts.push(f.year.toString());
    if (f.month && f.month >= 1 && f.month <= 12) {
      const monthDay = MONTH_NAMES[f.month] + (f.day ? ` ${f.day}` : "");
      parts.unshift(monthDay);
    }
    return parts.join(", ") || "No date";
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  const activeCount = facts?.filter(f => f.isActive).length || 0;
  const totalCount = facts?.length || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold">Historical Facts</h3>
          <p className="text-sm text-muted-foreground">{activeCount} of {totalCount} facts active. These appear on the "Did You Know?" slide.</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-fact"><Plus className="w-4 h-4 mr-2" />Add Fact</Button>
      </div>

      {(!facts || facts.length === 0) ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No historical facts yet. Add some to display on the "Did You Know?" slide.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {facts.map((f) => (
            <Card key={f.id} className={`p-4 ${!f.isActive ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{f.fact}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="outline">{FACT_CATEGORIES.find(c => c.value === f.category)?.label || f.category}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(f)}</span>
                    {!f.isActive && <Badge variant="secondary">Inactive</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Switch
                    checked={f.isActive}
                    onCheckedChange={(v) => toggleActiveMutation.mutate({ id: f.id, isActive: v })}
                    data-testid={`switch-fact-active-${f.id}`}
                  />
                  <Button size="icon" variant="ghost" onClick={() => openEdit(f)} data-testid={`button-edit-fact-${f.id}`}><Edit className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(f.id)} data-testid={`button-delete-fact-${f.id}`}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingItem ? "Edit Historical Fact" : "Add Historical Fact"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fact</Label>
              <Textarea value={formData.fact} onChange={(e) => setFormData({ ...formData, fact: e.target.value })} rows={3} placeholder="e.g., Nashoba Valley Winery was founded by Jack Partridge..." data-testid="input-fact-text" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger data-testid="select-fact-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FACT_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Year</Label>
                <Input type="number" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} placeholder="e.g., 1978" data-testid="input-fact-year" />
              </div>
              <div className="space-y-2">
                <Label>Month (1-12)</Label>
                <Input type="number" min={1} max={12} value={formData.month} onChange={(e) => setFormData({ ...formData, month: e.target.value })} placeholder="Optional" data-testid="input-fact-month" />
              </div>
              <div className="space-y-2">
                <Label>Day (1-31)</Label>
                <Input type="number" min={1} max={31} value={formData.day} onChange={(e) => setFormData({ ...formData, day: e.target.value })} placeholder="Optional" data-testid="input-fact-day" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Month and day are optional. Facts with dates matching the current date are prioritized on the display.</p>
            <div className="flex items-center gap-2"><Switch checked={formData.isActive} onCheckedChange={(v) => setFormData({ ...formData, isActive: v })} data-testid="switch-fact-active" /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.fact || createMutation.isPending || updateMutation.isPending} data-testid="button-save-fact">{editingItem ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableSettingCard({ setting, onUpdate, isPending }: {
  setting: DisplaySetting;
  onUpdate: (id: number, data: any) => void;
  isPending: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: setting.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const { data: triviaQuestions } = useQuery<{ id: string; question: string }[]>({
    queryKey: ["/api/public/display/trivia"],
    enabled: setting.slideType === "trivia",
  });

  const configData = (setting.configData as Record<string, any> | null) || {};
  const selectedQuestionId = configData.selectedQuestionId || "auto";
  const welcomeMessage = configData.customMessage || "";
  const [localWelcomeMsg, setLocalWelcomeMsg] = useState(welcomeMessage);

  useEffect(() => {
    setLocalWelcomeMsg(welcomeMessage);
  }, [welcomeMessage]);

  const saveWelcomeMessage = useCallback((msg: string) => {
    onUpdate(setting.id, { configData: { ...configData, customMessage: msg || undefined } });
  }, [setting.id, configData, onUpdate]);

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`p-4 ${isDragging ? "shadow-lg" : ""}`}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              type="button"
              className="cursor-grab active:cursor-grabbing p-1 rounded hover-elevate touch-none"
              {...attributes}
              {...listeners}
              data-testid={`drag-handle-${setting.slideType}`}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium">{SLIDE_TYPE_LABELS[setting.slideType] || setting.slideType}</p>
                <Badge variant={setting.isEnabled ? "default" : "secondary"}>
                  {setting.isEnabled ? "On" : "Off"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{SLIDE_TYPE_DESCRIPTIONS[setting.slideType] || ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Duration (s)</Label>
              <Input
                type="number"
                min={3}
                max={120}
                value={setting.duration}
                onChange={(e) => onUpdate(setting.id, { duration: parseInt(e.target.value) || 12 })}
                className="w-20"
                data-testid={`input-setting-duration-${setting.slideType}`}
              />
            </div>
            <Switch
              checked={setting.isEnabled}
              onCheckedChange={(v) => onUpdate(setting.id, { isEnabled: v })}
              data-testid={`switch-setting-${setting.slideType}`}
            />
          </div>
        </div>

        {setting.slideType === "welcome" && (
          <div className="mt-3 pt-3 border-t">
            <div className="bg-muted/50 rounded-md p-3 space-y-3">
              <div className="space-y-1">
                <Label className="text-sm font-semibold">Custom Message</Label>
                <p className="text-xs text-muted-foreground">
                  Replace the default tagline with your own message. Leave empty to use the default.
                </p>
              </div>
              <Textarea
                value={localWelcomeMsg}
                onChange={(e) => setLocalWelcomeMsg(e.target.value)}
                onBlur={() => saveWelcomeMessage(localWelcomeMsg)}
                placeholder="Award-winning farm committed to producing premium, handcrafted wines and spirits"
                rows={2}
                className="text-sm"
                data-testid="input-welcome-custom-message"
              />
              <p className="text-xs text-muted-foreground">
                {localWelcomeMsg
                  ? "Custom message set — this will appear on the Welcome Screen."
                  : "Using default message. Type something above to customize it."}
              </p>
            </div>
          </div>
        )}

        {setting.slideType === "trivia" && (
          <div className="mt-3 pt-3 border-t">
            <div className="bg-muted/50 rounded-md p-3 space-y-3">
              <div className="space-y-1">
                <Label className="text-sm font-semibold">Question Selection</Label>
                <p className="text-xs text-muted-foreground">
                  Choose whether to show a random question each time or always show a specific one.
                </p>
              </div>
              <Select
                value={selectedQuestionId}
                onValueChange={(v) => onUpdate(setting.id, { configData: { ...configData, selectedQuestionId: v } })}
              >
                <SelectTrigger className="w-full" data-testid="select-trivia-question">
                  <SelectValue placeholder="Auto (Random)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (Random each time)</SelectItem>
                  {triviaQuestions?.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.question.length > 80 ? q.question.slice(0, 80) + "..." : q.question}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {selectedQuestionId === "auto"
                  ? "Currently set to Auto — a different random question is shown each time this slide appears."
                  : "Currently set to a specific question — this same question will show every time."}
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function DisplaySettingsManager({ channelId, channelSlug }: { channelId: number; channelSlug: string }) {
  const { toast } = useToast();
  const { data: settings, isLoading: settingsLoading } = useQuery<DisplaySetting[]>({
    queryKey: ["/api/nashobatv/display-settings", channelId],
    queryFn: async () => {
      const res = await fetch(`/api/nashobatv/display-settings?channelId=${channelId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });
  const { data: slides } = useQuery<Slide[]>({
    queryKey: ["/api/nashobatv/slides", channelId],
    queryFn: async () => {
      const res = await fetch(`/api/nashobatv/slides?channelId=${channelId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });
  const [localOrder, setLocalOrder] = useState<DisplaySetting[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sortedSettings = useMemo(() => {
    if (localOrder) return localOrder;
    if (!settings) return [];
    return [...settings].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [settings, localOrder]);

  const customSlideCount = useMemo(() => {
    return slides?.filter(s => s.isActive && s.slideType === "custom").length || 0;
  }, [slides]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/nashobatv/display-settings/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nashobatv/display-settings"] });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (updatedSettings: { id: number; sortOrder: number; isEnabled: boolean; duration: number }[]) => {
      const res = await apiRequest("PUT", "/api/nashobatv/display-settings/bulk", { settings: updatedSettings });
      return res.json();
    },
    onSuccess: () => {
      setLocalOrder(null);
      queryClient.invalidateQueries({ queryKey: ["/api/nashobatv/display-settings"] });
      toast({ title: "Display order updated" });
    },
    onError: () => {
      setLocalOrder(null);
      toast({ title: "Failed to update order", variant: "destructive" });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !sortedSettings.length) return;

    const oldIndex = sortedSettings.findIndex(s => s.id === active.id);
    const newIndex = sortedSettings.findIndex(s => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sortedSettings, oldIndex, newIndex).map((s, i) => ({
      ...s,
      sortOrder: i + 1,
    }));
    setLocalOrder(reordered);

    const updates = reordered.map((s) => ({
      id: s.id,
      sortOrder: s.sortOrder,
      isEnabled: s.isEnabled,
      duration: s.duration,
    }));
    bulkUpdateMutation.mutate(updates);
  };

  const handleUpdate = (id: number, data: any) => {
    updateMutation.mutate({ id, data });
  };

  if (settingsLoading) return <Skeleton className="h-48 w-full" />;

  const enabledCount = sortedSettings.filter(s => s.isEnabled).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold">Display Settings</h3>
          <p className="text-sm text-muted-foreground">
            All built-in slide types are listed below. Toggle each on/off, set duration, drag to reorder, and configure options (like trivia question selection). {enabledCount} of {sortedSettings.length} enabled.
          </p>
        </div>
        <Button variant="outline" onClick={() => window.open(`/display/${channelSlug}`, "_blank")} data-testid="button-preview-display">
          <Eye className="w-4 h-4 mr-2" />
          Preview Display
          <ExternalLink className="w-3 h-3 ml-1" />
        </Button>
      </div>

      {customSlideCount > 0 && (
        <Card className="p-3 bg-muted/50">
          <p className="text-sm text-muted-foreground">
            <strong>{customSlideCount}</strong> custom slide{customSlideCount !== 1 ? "s" : ""} active. Enable "Custom Slides" below to show them on the display. Manage custom slide content in the Slides tab.
          </p>
        </Card>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortedSettings.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {sortedSettings.map((s) => (
              <SortableSettingCard
                key={s.id}
                setting={s}
                onUpdate={handleUpdate}
                isPending={updateMutation.isPending}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Card className="p-5 mt-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="space-y-3">
            <h4 className="font-semibold">How NashobaTV Works</h4>
            <p className="text-sm text-muted-foreground">
              NashobaTV is a full-screen digital signage system designed for venue TV screens. Open the display at <strong>/display</strong> on any TV browser.
              The display automatically cycles through enabled slide types in the order shown above, pausing on each for its configured duration.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Slide Types & Content Sources:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Welcome Screen</strong> - Always available. Shows venue name and current time.</li>
                <li><strong>Today's Events</strong> - Pulled from the <em>Events</em> tab. Only shows when events exist for today.</li>
                <li><strong>Wine & Beverage List</strong> - Pulled from your product catalog. Splits into Wine and Craft Beverages slides automatically.</li>
                <li><strong>Food Menu</strong> - Reserved for food menu display (enable when menu content is configured).</li>
                <li><strong>Upcoming Events</strong> - Pulled from the <em>Events</em> tab. Shows future scheduled events.</li>
                <li><strong>Photo Gallery</strong> - Pulled from the <em>Photos</em> tab. Only shows when photos have been uploaded.</li>
                <li><strong>Announcements</strong> - Pulled from the <em>Announcements</em> tab. Only shows when active announcements exist.</li>
                <li><strong>Weather</strong> - Displays current weather conditions for the venue area.</li>
                <li><strong>Wine Club Promo</strong> - Always available. Promotes wine club membership.</li>
                <li><strong>Daily Specials</strong> - Pulled from the <em>Specials</em> tab. Only shows when specials are active.</li>
                <li><strong>Trivia Questions</strong> - Pulled from the Tasting Experience trivia bank. Shows one question per slide with multiple choice answers, then reveals the answer with explanation. Set to "Auto" for a random question each time, or pick a specific question to always show.</li>
                <li><strong>Did You Know?</strong> - Historical facts about Nashoba Valley Winery, J's Restaurant, the distillery, the brewery, and the farm. Shows a random fact each time with the year and "X Years Ago" context. Only shows when historical facts exist.</li>
                <li><strong>Custom Slides</strong> - Pulled from the <em>Slides</em> tab. Create individual slides with custom title, text, and images. Each custom slide displays separately.</li>
              </ul>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Key Behaviors:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Slides with no content are automatically skipped (e.g., Today's Events won't show if no events are scheduled).</li>
                <li>Drag slide types to change the order they appear in the rotation.</li>
                <li>Use the toggle to enable/disable any slide type without deleting its content.</li>
                <li>Duration controls how many seconds each slide type is shown before advancing.</li>
                <li>The display refreshes its content every 1-10 minutes depending on the data type, so changes appear automatically.</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function NashobatvAdmin({ channelId, channelSlug }: { channelId: number; channelSlug: string }) {
  const [subTab, setSubTab] = useState("settings");

  return (
    <Tabs value={subTab} onValueChange={setSubTab}>
      <TabsList className="grid w-full grid-cols-7 h-auto">
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
        <TabsTrigger value="history" data-testid="tab-tv-history" className="flex items-center justify-center gap-2">
          <Clock className="w-4 h-4" />
          <span>History</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="settings"><DisplaySettingsManager channelId={channelId} channelSlug={channelSlug} /></TabsContent>
      <TabsContent value="slides"><SlidesManager channelId={channelId} /></TabsContent>
      <TabsContent value="events"><EventsManager channelId={channelId} /></TabsContent>
      <TabsContent value="announcements"><AnnouncementsManager channelId={channelId} /></TabsContent>
      <TabsContent value="photos"><PhotosManager channelId={channelId} /></TabsContent>
      <TabsContent value="specials"><SpecialsManager channelId={channelId} /></TabsContent>
      <TabsContent value="history"><HistoricalFactsManager /></TabsContent>
    </Tabs>
  );
}
