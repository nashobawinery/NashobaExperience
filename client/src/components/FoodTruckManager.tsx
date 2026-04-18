import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Trash2,
  Users,
  Calendar,
  Pencil,
  Globe,
  Mail,
  Phone,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  FileText,
  ExternalLink,
  Link,
  Copy,
  Printer,
  ArrowRight,
  UtensilsCrossed,
  ShieldCheck,
  Star,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import type { FoodTruck, FoodTruckEvent, FoodTruckSubmission, FoodTruckReview } from "@shared/schema";
import EventFlyerPrinter from "@/components/EventFlyerPrinter";
import { PermitFileUpload } from "@/components/PermitFileUpload";

function formatTime12(time24: string | null | undefined): string {
  if (!time24) return "";
  const [h, m] = time24.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${m} ${ampm}`;
}

export default function FoodTruckManager() {
  const [activeTab, setActiveTab] = useState("trucks");

  return (
    <div className="space-y-6">
      <Card className="bg-muted/40">
        <CardContent className="py-4 px-5">
          <p className="text-sm font-semibold mb-2 flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-primary" />
            How this page works
          </p>
          <div className="flex flex-wrap items-start gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              Food trucks apply through the public submission form
            </span>
            <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Approve in <button className="underline underline-offset-2 hover:text-foreground transition-colors" onClick={() => setActiveTab("submissions")}>Submissions</button> — added to Food Trucks list automatically
            </span>
            <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Book dates in <button className="underline underline-offset-2 hover:text-foreground transition-colors" onClick={() => setActiveTab("schedule")}>Schedule</button>
            </span>
            <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              All vendors must hold a valid Nashoba Board of Health food permit
            </span>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full max-w-3xl">
          <TabsTrigger value="trucks" className="flex items-center gap-2" data-testid="tab-food-trucks">
            <Users className="h-4 w-4" /> Food Trucks
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2" data-testid="tab-food-truck-schedule">
            <Calendar className="h-4 w-4" /> Schedule
          </TabsTrigger>
          <TabsTrigger value="submissions" className="flex items-center gap-2" data-testid="tab-food-truck-submissions">
            <FileText className="h-4 w-4" /> Submissions
          </TabsTrigger>
          <TabsTrigger value="reviews" className="flex items-center gap-2" data-testid="tab-food-truck-reviews">
            <Star className="h-4 w-4" /> Reviews
          </TabsTrigger>
          <TabsTrigger value="links" className="flex items-center gap-2" data-testid="tab-food-truck-links">
            <Link className="h-4 w-4" /> Links
          </TabsTrigger>
          <TabsTrigger value="print" className="flex items-center gap-2" data-testid="tab-food-truck-print">
            <Printer className="h-4 w-4" /> Print
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trucks" className="mt-6">
          <TrucksPanel />
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <SchedulePanel />
        </TabsContent>

        <TabsContent value="submissions" className="mt-6">
          <SubmissionsPanel />
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          <ReviewsPanel />
        </TabsContent>

        <TabsContent value="links" className="mt-6">
          <LinksPanel />
        </TabsContent>

        <TabsContent value="print" className="mt-6">
          <EventFlyerPrinter mode="food-trucks" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TrucksPanel() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editTruck, setEditTruck] = useState<FoodTruck | null>(null);
  const [form, setForm] = useState({
    name: "",
    cuisineType: "",
    description: "",
    imageUrl: "",
    websiteUrl: "",
    contactEmail: "",
    contactPhone: "",
    isApproved: true,
    isActive: true,
    permitNumber: "",
    permitExpiry: "",
    permitImageUrl: "",
  });

  const { data: trucks, isLoading } = useQuery<FoodTruck[]>({
    queryKey: ["/api/media/food-trucks"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest("POST", "/api/media/food-trucks", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media/food-trucks"] });
      closeDialog();
      toast({ title: "Food truck added" });
    },
    onError: () => toast({ title: "Failed to add food truck", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof form }) => {
      const res = await apiRequest("PUT", `/api/media/food-trucks/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media/food-trucks"] });
      closeDialog();
      toast({ title: "Food truck updated" });
    },
    onError: () => toast({ title: "Failed to update food truck", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/media/food-trucks/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media/food-trucks"] });
      toast({ title: "Food truck deleted" });
    },
  });

  const resetForm = () => setForm({ name: "", cuisineType: "", description: "", imageUrl: "", websiteUrl: "", contactEmail: "", contactPhone: "", isApproved: true, isActive: true, permitNumber: "", permitExpiry: "", permitImageUrl: "" });

  const closeDialog = () => {
    setShowDialog(false);
    setEditTruck(null);
    resetForm();
  };

  const openCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEdit = (t: FoodTruck) => {
    setForm({
      name: t.name,
      cuisineType: t.cuisineType || "",
      description: t.description || "",
      imageUrl: t.imageUrl || "",
      websiteUrl: t.websiteUrl || "",
      contactEmail: t.contactEmail || "",
      contactPhone: t.contactPhone || "",
      isApproved: t.isApproved,
      isActive: t.isActive,
      permitNumber: t.permitNumber || "",
      permitExpiry: t.permitExpiry || "",
      permitImageUrl: t.permitImageUrl || "",
    });
    setEditTruck(t);
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!form.name) return;
    if (editTruck) {
      updateMutation.mutate({ id: editTruck.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold" data-testid="text-trucks-heading">Food Trucks</h2>
        <Button onClick={openCreate} data-testid="button-add-truck">
          <Plus className="w-4 h-4 mr-2" /> Add Food Truck
        </Button>
      </div>

      {(!trucks || trucks.length === 0) ? (
        <Card className="p-8 text-center">
          <UtensilsCrossed className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Food Trucks Yet</h3>
          <p className="text-muted-foreground mb-4">Add your first food truck vendor to get started.</p>
          <Button onClick={openCreate} data-testid="button-add-first-truck">
            <Plus className="w-4 h-4 mr-2" /> Add Food Truck
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trucks.map(t => (
            <Card key={t.id} className="overflow-visible" data-testid={`card-truck-${t.id}`}>
              {t.imageUrl ? (
                <div className="aspect-video w-full overflow-hidden rounded-t-md relative">
                  <img
                    src={t.imageUrl}
                    alt={t.name}
                    className="w-full h-full object-cover"
                    data-testid={`img-truck-${t.id}`}
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <Button size="icon" variant="secondary" onClick={() => openEdit(t)} data-testid={`button-edit-truck-${t.id}`}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => { if (confirm(`Delete "${t.name}"?`)) deleteMutation.mutate(t.id); }}
                      data-testid={`button-delete-truck-${t.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="aspect-video w-full overflow-hidden rounded-t-md bg-muted flex items-center justify-center relative">
                  <UtensilsCrossed className="w-16 h-16 text-muted-foreground" />
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <Button size="icon" variant="secondary" onClick={() => openEdit(t)} data-testid={`button-edit-truck-${t.id}`}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => { if (confirm(`Delete "${t.name}"?`)) deleteMutation.mutate(t.id); }}
                      data-testid={`button-delete-truck-${t.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <h3 className="font-semibold text-base" data-testid={`text-truck-name-${t.id}`}>{t.name}</h3>
                  {t.cuisineType && <Badge variant="secondary">{t.cuisineType}</Badge>}
                </div>

                {t.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{t.description}</p>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={t.isActive ? "default" : "secondary"}>
                    {t.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant={t.isApproved ? "default" : "outline"}>
                    {t.isApproved ? "Approved" : "Pending"}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-sm text-muted-foreground">
                  {t.contactEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 shrink-0" />
                      <span>{t.contactEmail}</span>
                    </div>
                  )}
                  {t.contactPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>{t.contactPhone}</span>
                    </div>
                  )}
                  {t.permitExpiry && (
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 shrink-0" />
                      <span>Permit Good until {new Date(t.permitExpiry).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {t.websiteUrl && (
                  <Button variant="outline" size="sm" className="w-full" asChild data-testid={`link-truck-website-${t.id}`}>
                    <a href={t.websiteUrl} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4 mr-2" />
                      Visit Website
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                )}

                {/* Permit Information */}
                {(t.permitNumber || t.permitExpiry || t.permitImageUrl) && (
                  <div className="space-y-2 border-t pt-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <ShieldCheck className="h-4 w-4" />
                      Food Permit
                    </div>
                    {t.permitNumber && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Permit #:</span> {t.permitNumber}
                      </div>
                    )}
                    {t.permitExpiry && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Expires:</span> {new Date(t.permitExpiry).toLocaleDateString()}
                      </div>
                    )}
                    {t.permitImageUrl && (
                      <Button variant="outline" size="sm" className="w-full" asChild>
                        <a href={t.permitImageUrl} target="_blank" rel="noopener noreferrer">
                          <FileText className="h-4 w-4 mr-2" />
                          View Permit Document
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog || !!editTruck} onOpenChange={(v) => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTruck ? "Edit Food Truck" : "Add Food Truck"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Truck / Vendor Name *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Food truck name" data-testid="input-truck-name" />
            </div>
            <div className="space-y-2">
              <Label>Cuisine Type</Label>
              <Input value={form.cuisineType} onChange={e => setForm(p => ({ ...p, cuisineType: e.target.value }))} placeholder="e.g., BBQ, Tacos, Pizza, Seafood" data-testid="input-truck-cuisine" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Short description of the food truck" data-testid="input-truck-description" />
            </div>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input value={form.imageUrl} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))} placeholder="https://..." data-testid="input-truck-image" />
            </div>
            <div className="space-y-2">
              <Label>Website URL</Label>
              <Input value={form.websiteUrl} onChange={e => setForm(p => ({ ...p, websiteUrl: e.target.value }))} placeholder="https://..." data-testid="input-truck-website" />
            </div>
            <div className="space-y-2">
              <Label>Contact Email</Label>
              <Input value={form.contactEmail} onChange={e => setForm(p => ({ ...p, contactEmail: e.target.value }))} placeholder="email@example.com" data-testid="input-truck-email" />
            </div>
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input value={form.contactPhone} onChange={e => setForm(p => ({ ...p, contactPhone: e.target.value }))} placeholder="(555) 123-4567" data-testid="input-truck-phone" />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Approved</Label>
                <p className="text-xs text-muted-foreground">Vendor is approved and licensed</p>
              </div>
              <Switch checked={form.isApproved} onCheckedChange={v => setForm(p => ({ ...p, isApproved: v }))} data-testid="switch-truck-approved" />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Show in public listings</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={v => setForm(p => ({ ...p, isActive: v }))} data-testid="switch-truck-active" />
            </div>
            <div className="space-y-2">
              <Label>Food Permit Information</Label>
              <div className="space-y-3 p-3 border rounded-md bg-muted/30">
                <div className="space-y-2">
                  <Label>Permit Number</Label>
                  <Input value={form.permitNumber} onChange={e => setForm(p => ({ ...p, permitNumber: e.target.value }))} placeholder="Board of Health permit number" data-testid="input-truck-permit-number" />
                </div>
                <div className="space-y-2">
                  <Label>Permit Expiry Date</Label>
                  <Input type="date" value={form.permitExpiry} onChange={e => setForm(p => ({ ...p, permitExpiry: e.target.value }))} data-testid="input-truck-permit-expiry" />
                </div>
                <PermitFileUpload
                  value={form.permitImageUrl}
                  onChange={(url) => setForm(p => ({ ...p, permitImageUrl: url }))}
                  disabled={createMutation.isPending || updateMutation.isPending}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel-truck">Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.name || createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-truck"
            >
              {editTruck ? "Save Changes" : "Add Food Truck"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SchedulePanel() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editEvent, setEditEvent] = useState<FoodTruckEvent | null>(null);
  const [form, setForm] = useState({
    foodTruckId: null as number | null,
    title: "",
    eventDate: "",
    startTime: "",
    endTime: "",
    location: "",
    description: "",
    imageUrl: "",
    isActive: true,
    isFeatured: false,
  });

  const { data: events, isLoading } = useQuery<FoodTruckEvent[]>({
    queryKey: ["/api/media/food-truck-events"],
  });

  const { data: trucks } = useQuery<FoodTruck[]>({
    queryKey: ["/api/media/food-trucks"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest("POST", "/api/media/food-truck-events", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media/food-truck-events"] });
      closeDialog();
      toast({ title: "Event added" });
    },
    onError: () => toast({ title: "Failed to add event", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof form }) => {
      const res = await apiRequest("PUT", `/api/media/food-truck-events/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media/food-truck-events"] });
      closeDialog();
      toast({ title: "Event updated" });
    },
    onError: () => toast({ title: "Failed to update event", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/media/food-truck-events/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media/food-truck-events"] });
      toast({ title: "Event deleted" });
    },
  });

  const resetForm = () => setForm({ foodTruckId: null, title: "", eventDate: "", startTime: "", endTime: "", location: "", description: "", imageUrl: "", isActive: true, isFeatured: false });

  const closeDialog = () => {
    setShowDialog(false);
    setEditEvent(null);
    resetForm();
  };

  const openCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEdit = (ev: FoodTruckEvent) => {
    setForm({
      foodTruckId: ev.foodTruckId,
      title: ev.title,
      eventDate: ev.eventDate,
      startTime: ev.startTime,
      endTime: ev.endTime || "",
      location: ev.location || "",
      description: ev.description || "",
      imageUrl: ev.imageUrl || "",
      isActive: ev.isActive,
      isFeatured: ev.isFeatured,
    });
    setEditEvent(ev);
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!form.title || !form.eventDate || !form.startTime) return;
    if (editEvent) {
      updateMutation.mutate({ id: editEvent.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const truckMap = new Map(trucks?.map(t => [t.id, t]) || []);

  const groupedEvents = (events || []).reduce<Record<string, FoodTruckEvent[]>>((acc, ev) => {
    if (!acc[ev.eventDate]) acc[ev.eventDate] = [];
    acc[ev.eventDate].push(ev);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedEvents).sort((a, b) => a.localeCompare(b));

  // Helper function to get calendar days for a month
  const getCalendarDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  // Get scheduled dates for calendar
  const scheduledDates = new Set((events || []).map(e => e.eventDate));
  
  // Get current and next month for calendar view
  const currentMonth = new Date();
  const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold" data-testid="text-truck-schedule-heading">Food Truck Schedule</h2>
        <Button onClick={openCreate} data-testid="button-add-truck-event">
          <Plus className="w-4 h-4 mr-2" /> Add Event
        </Button>
      </div>

      {sortedDates.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Events Scheduled</h3>
          <p className="text-muted-foreground mb-4">Schedule your first food truck event.</p>
          <Button onClick={openCreate} data-testid="button-add-first-truck-event">
            <Plus className="w-4 h-4 mr-2" /> Add Event
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Events List - Left Side (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {sortedDates.map(date => (
              <div key={date} className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground" data-testid={`text-date-group-${date}`}>
                  {format(parseISO(date), "EEEE, MMMM d, yyyy")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groupedEvents[date].map(ev => {
                    const truck = ev.foodTruckId ? truckMap.get(ev.foodTruckId) : null;
                    return (
                      <Card key={ev.id} className="overflow-visible" data-testid={`card-truck-event-${ev.id}`}>
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-semibold truncate" data-testid={`text-truck-event-title-${ev.id}`}>{ev.title}</h4>
                              {truck && (
                                <span className="text-sm text-muted-foreground flex items-center gap-1">
                                  <UtensilsCrossed className="w-3 h-3" /> {truck.name}
                                  {truck.cuisineType && <Badge variant="outline" className="ml-1">{truck.cuisineType}</Badge>}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button size="icon" variant="ghost" onClick={() => openEdit(ev)} data-testid={`button-edit-truck-event-${ev.id}`}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => { if (confirm(`Delete "${ev.title}"?`)) deleteMutation.mutate(ev.id); }}
                                data-testid={`button-delete-truck-event-${ev.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime12(ev.startTime)}{ev.endTime ? ` - ${formatTime12(ev.endTime)}` : ""}
                            </span>
                            {ev.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {ev.location}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={ev.isActive ? "default" : "secondary"}>
                              {ev.isActive ? "Active" : "Inactive"}
                            </Badge>
                            {ev.isFeatured && <Badge variant="outline">Featured</Badge>}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))
          </div>
        </div>
      )
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Food Truck</Label>
              <Select
                value={form.foodTruckId ? String(form.foodTruckId) : "none"}
                onValueChange={v => {
                  const tid = v === "none" ? null : parseInt(v);
                  const truck = tid ? (trucks || []).find(t => t.id === tid) : null;
                  setForm(p => ({
                    ...p,
                    foodTruckId: tid,
                    title: truck ? `${truck.name} at Nashoba` : p.title,
                  }));
                }}
              >
                <SelectTrigger data-testid="select-event-truck">
                  <SelectValue placeholder="Select Food Truck" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select Food Truck</SelectItem>
                  {(trucks || []).filter(t => t.isApproved).map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name}{t.cuisineType ? ` (${t.cuisineType})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Event title" data-testid="input-truck-event-title" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={form.eventDate} onChange={e => setForm(p => ({ ...p, eventDate: e.target.value }))} data-testid="input-truck-event-date" />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g., Main Pavilion" data-testid="input-truck-event-location" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time *</Label>
                <Input type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} data-testid="input-truck-event-start-time" />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="time" value={form.endTime} onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))} data-testid="input-truck-event-end-time" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Additional Activities</Label>
              <Textarea 
              value={form.description} 
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} 
              placeholder="Additional activities or events happening on this day&#10;&#10;Formatting tips:&#10;* Use bullet points: - Live music from 1-4pm&#10;* Or numbered lists: 1. Wine tasting&#10;* Press Enter for line breaks&#10;* Mix and match formats!" 
              data-testid="input-truck-event-description" 
            />
            </div>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input value={form.imageUrl} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))} placeholder="https://..." data-testid="input-truck-event-image" />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Show in public calendar</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={v => setForm(p => ({ ...p, isActive: v }))} data-testid="switch-truck-event-active" />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Featured</Label>
                <p className="text-xs text-muted-foreground">Highlight this event</p>
              </div>
              <Switch checked={form.isFeatured} onCheckedChange={v => setForm(p => ({ ...p, isFeatured: v }))} data-testid="switch-truck-event-featured" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel-truck-event">Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.title || !form.eventDate || !form.startTime || createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-truck-event"
            >
              {editEvent ? "Save Changes" : "Add Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SubmissionsPanel() {
  const { toast } = useToast();
  const [reviewSubmission, setReviewSubmission] = useState<FoodTruckSubmission | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const { data: submissions, isLoading } = useQuery<FoodTruckSubmission[]>({
    queryKey: ["/api/media/food-truck-submissions"],
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, reviewNotes }: { id: number; status: string; reviewNotes: string }) => {
      const res = await apiRequest("PUT", `/api/media/food-truck-submissions/${id}`, { status, reviewNotes });
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/media/food-truck-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/media/food-trucks"] });
      setReviewSubmission(null);
      setReviewNotes("");
      toast({ title: vars.status === "approved" ? "Submission approved — food truck created" : "Submission declined" });
    },
    onError: () => toast({ title: "Failed to review submission", variant: "destructive" }),
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline">Pending</Badge>;
      case "approved": return <Badge variant="default">Approved</Badge>;
      case "declined": return <Badge variant="secondary">Declined</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold" data-testid="text-truck-submissions-heading">Food Truck Submissions</h2>

      {(!submissions || submissions.length === 0) ? (
        <Card className="p-8 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Submissions</h3>
          <p className="text-muted-foreground">Food truck applications will appear here when vendors apply through the public form.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {submissions.map(sub => (
            <Card key={sub.id} className="overflow-visible" data-testid={`card-truck-submission-${sub.id}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-semibold truncate" data-testid={`text-truck-submission-name-${sub.id}`}>{sub.truckName}</h4>
                    {sub.cuisineType && <p className="text-sm text-muted-foreground">{sub.cuisineType}</p>}
                  </div>
                  <div className="flex-shrink-0">
                    {statusBadge(sub.status)}
                  </div>
                </div>

                {sub.description && <p className="text-sm text-muted-foreground line-clamp-2">{sub.description}</p>}

                <div className="space-y-1 text-sm">
                  <p className="flex items-center gap-1 text-muted-foreground">
                    <Mail className="w-3 h-3" /> {sub.contactEmail}
                  </p>
                  {sub.contactPhone && (
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="w-3 h-3" /> {sub.contactPhone}
                    </p>
                  )}
                  {sub.websiteUrl && (
                    <a href={sub.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-muted-foreground">
                      <Globe className="w-3 h-3" /> Website <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium">Menu / Offerings:</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">{sub.menuDescription}</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={sub.healthLicenseAcknowledged ? "default" : "destructive"}>
                    {sub.healthLicenseAcknowledged ? "BOH License Acknowledged" : "License Not Acknowledged"}
                  </Badge>
                </div>

                {sub.message && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium">Message:</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{sub.message}</p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Submitted {new Date(sub.createdAt).toLocaleDateString()}
                </p>

                {sub.status === "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setReviewSubmission(sub);
                      setReviewNotes("");
                    }}
                    data-testid={`button-review-truck-submission-${sub.id}`}
                  >
                    Review Submission
                  </Button>
                )}

                {sub.reviewNotes && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium">Review Notes:</p>
                    <p className="text-xs text-muted-foreground">{sub.reviewNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!reviewSubmission} onOpenChange={(v) => { if (!v) { setReviewSubmission(null); setReviewNotes(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Submission — {reviewSubmission?.truckName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-1 text-sm">
              <p><strong>Cuisine:</strong> {reviewSubmission?.cuisineType || "—"}</p>
              <p><strong>Email:</strong> {reviewSubmission?.contactEmail}</p>
              {reviewSubmission?.contactPhone && <p><strong>Phone:</strong> {reviewSubmission.contactPhone}</p>}
              {reviewSubmission?.websiteUrl && <p><strong>Website:</strong> <a href={reviewSubmission.websiteUrl} target="_blank" rel="noopener noreferrer" className="underline">{reviewSubmission.websiteUrl}</a></p>}
              <p><strong>BOH License Acknowledged:</strong> {reviewSubmission?.healthLicenseAcknowledged ? "Yes" : "No"}</p>
            </div>
            {reviewSubmission?.description && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Description:</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{reviewSubmission.description}</p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-sm font-medium">Menu / Offerings:</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{reviewSubmission?.menuDescription}</p>
            </div>
            {reviewSubmission?.message && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Message:</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{reviewSubmission.message}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Review Notes (optional)</Label>
              <Textarea
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                placeholder="Internal notes about this submission..."
                data-testid="input-truck-review-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => {
                if (reviewSubmission) {
                  reviewMutation.mutate({ id: reviewSubmission.id, status: "declined", reviewNotes });
                }
              }}
              disabled={reviewMutation.isPending}
              className="flex items-center gap-1"
              data-testid="button-decline-truck-submission"
            >
              <XCircle className="w-4 h-4" /> Decline
            </Button>
            <Button
              onClick={() => {
                if (reviewSubmission) {
                  reviewMutation.mutate({ id: reviewSubmission.id, status: "approved", reviewNotes });
                }
              }}
              disabled={reviewMutation.isPending}
              className="flex items-center gap-1"
              data-testid="button-approve-truck-submission"
            >
              <CheckCircle className="w-4 h-4" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LinksPanel() {
  const { toast } = useToast();
  const baseUrl = window.location.origin;

  const links = [
    {
      label: "Food Truck Schedule",
      description: "Public page showing upcoming food truck appearances with vendor cards, photos, and details. Share this with customers or link from your website.",
      url: `${baseUrl}/food-trucks`,
      embedUrl: `${baseUrl}/food-trucks?embed=1`,
    },
    {
      label: "Vendor Application Form",
      description: "Public page where food trucks can apply to vend at your venue. Includes the Board of Health licensing requirement and menu description. Share this with vendors.",
      url: `${baseUrl}/food-trucks#apply`,
      embedUrl: `${baseUrl}/food-trucks?embed=1#apply`,
      note: "The application form is at the bottom of the Food Truck Schedule page.",
    },
  ];

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Public Links & Embed Codes</h3>
        <span className="text-sm text-muted-foreground block">Share these links or embed them on your website using iframes.</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {links.map((link) => (
          <Card key={link.label} className="overflow-visible">
            <CardContent className="p-5 space-y-4">
              <div>
                <h4 className="font-semibold flex items-center gap-2" data-testid={`text-link-label-${link.label}`}>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  {link.label}
                </h4>
                <span className="text-sm text-muted-foreground mt-1 block">{link.description}</span>
                {link.note && (
                  <span className="text-xs text-muted-foreground italic mt-1 block">{link.note}</span>
                )}
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Direct Link</Label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={link.url} className="text-sm font-mono" data-testid={`input-direct-link-${link.label}`} />
                    <Button size="icon" variant="outline" onClick={() => copyToClipboard(link.url, "Direct link")} data-testid={`button-copy-link-${link.label}`}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => window.open(link.url, "_blank")} data-testid={`button-open-link-${link.label}`}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Embed URL</Label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={link.embedUrl} className="text-sm font-mono" data-testid={`input-embed-link-${link.label}`} />
                    <Button size="icon" variant="outline" onClick={() => copyToClipboard(link.embedUrl, "Embed URL")} data-testid={`button-copy-embed-${link.label}`}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Embed Code</Label>
                  <div className="relative">
                    <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all">
                      {`<iframe src="${link.embedUrl}" width="100%" height="800" frameborder="0" style="border:none;"></iframe>`}
                    </pre>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(`<iframe src="${link.embedUrl}" width="100%" height="800" frameborder="0" style="border:none;"></iframe>`, "Embed code")}
                      data-testid={`button-copy-embed-code-${link.label}`}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ReviewsPanel() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editReview, setEditReview] = useState<FoodTruckReview | null>(null);
  const [selectedTruck, setSelectedTruck] = useState<FoodTruck | null>(null);
  const [form, setForm] = useState({
    foodTruckId: null as number | null,
    rating: 5,
    foodQuality: "",
    serviceQuality: "",
    cleanliness: "",
    professionalism: "",
    overallNotes: "",
    wouldRecommend: true,
    reviewedBy: "",
    reviewDate: new Date().toISOString().split('T')[0],
  });

  const { data: trucks } = useQuery<FoodTruck[]>({
    queryKey: ["/api/media/food-trucks"],
  });

  const { data: reviews, isLoading } = useQuery<FoodTruckReview[]>({
    queryKey: ["/api/media/food-truck-reviews", selectedTruck?.id],
    enabled: !!selectedTruck?.id,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/media/food-truck-reviews/${selectedTruck!.id}`);
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest("POST", "/api/media/food-truck-reviews", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media/food-truck-reviews", selectedTruck?.id] });
      closeDialog();
      toast({ title: "Review added" });
    },
    onError: () => toast({ title: "Failed to add review", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof form }) => {
      const res = await apiRequest("PUT", `/api/media/food-truck-reviews/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media/food-truck-reviews", selectedTruck?.id] });
      closeDialog();
      toast({ title: "Review updated" });
    },
    onError: () => toast({ title: "Failed to update review", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/media/food-truck-reviews/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media/food-truck-reviews", selectedTruck?.id] });
      toast({ title: "Review deleted" });
    },
  });

  const resetForm = () => setForm({
    foodTruckId: null,
    rating: 5,
    foodQuality: "",
    serviceQuality: "",
    cleanliness: "",
    professionalism: "",
    overallNotes: "",
    wouldRecommend: true,
    reviewedBy: "",
    reviewDate: new Date().toISOString().split('T')[0],
  });

  const closeDialog = () => {
    setShowDialog(false);
    setEditReview(null);
    resetForm();
  };

  const openCreate = () => {
    resetForm();
    setForm(p => ({ ...p, foodTruckId: selectedTruck?.id || null }));
    setShowDialog(true);
  };

  const openEdit = (review: FoodTruckReview) => {
    setForm({
      foodTruckId: review.foodTruckId,
      rating: review.rating,
      foodQuality: review.foodQuality || "",
      serviceQuality: review.serviceQuality || "",
      cleanliness: review.cleanliness || "",
      professionalism: review.professionalism || "",
      overallNotes: review.overallNotes || "",
      wouldRecommend: review.wouldRecommend,
      reviewedBy: review.reviewedBy || "",
      reviewDate: review.reviewDate,
    });
    setEditReview(review);
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!form.foodTruckId || !form.reviewedBy) return;
    if (editReview) {
      updateMutation.mutate({ id: editReview.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">Food Truck Reviews</h2>
        <div className="flex items-center gap-2">
          <Select
            value={selectedTruck?.id ? String(selectedTruck.id) : ""}
            onValueChange={(v) => {
              const truck = v ? (trucks || []).find(t => t.id === parseInt(v)) : null;
              setSelectedTruck(truck || null);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Food Truck" />
            </SelectTrigger>
            <SelectContent>
              {(trucks || []).map(t => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name}{t.cuisineType ? ` (${t.cuisineType})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTruck && (
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Add Review
            </Button>
          )}
        </div>
      </div>

      {!selectedTruck ? (
        <Card className="p-8 text-center">
          <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Select a Food Truck</h3>
          <p className="text-muted-foreground">Choose a food truck to view and manage internal reviews.</p>
        </Card>
      ) : (!reviews || reviews.length === 0) ? (
        <Card className="p-8 text-center">
          <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Reviews Yet</h3>
          <p className="text-muted-foreground mb-4">Add your first internal review for {selectedTruck.name}.</p>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add Review
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <Card key={review.id} className="overflow-visible">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {renderStars(review.rating)}
                      <span className="text-sm font-medium">{review.rating}/5</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>By: {review.reviewedBy}</span>
                      <span>Date: {new Date(review.reviewDate).toLocaleDateString()}</span>
                      {review.wouldRecommend && (
                        <Badge variant="outline">Would Recommend</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(review)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => { if (confirm("Delete this review?")) deleteMutation.mutate(review.id); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {review.foodQuality && (
                    <div>
                      <span className="font-medium">Food Quality:</span>
                      <p className="text-muted-foreground">{review.foodQuality}</p>
                    </div>
                  )}
                  {review.serviceQuality && (
                    <div>
                      <span className="font-medium">Service Quality:</span>
                      <p className="text-muted-foreground">{review.serviceQuality}</p>
                    </div>
                  )}
                  {review.cleanliness && (
                    <div>
                      <span className="font-medium">Cleanliness:</span>
                      <p className="text-muted-foreground">{review.cleanliness}</p>
                    </div>
                  )}
                  {review.professionalism && (
                    <div>
                      <span className="font-medium">Professionalism:</span>
                      <p className="text-muted-foreground">{review.professionalism}</p>
                    </div>
                  )}
                </div>

                {review.overallNotes && (
                  <div>
                    <span className="font-medium text-sm">Overall Notes:</span>
                    <p className="text-sm text-muted-foreground mt-1">{review.overallNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog || !!editReview} onOpenChange={(v) => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editReview ? "Edit Review" : "Add Review"} - {selectedTruck?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Rating *</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, rating }))}
                    className="p-1"
                  >
                    <Star
                      className={`w-6 h-6 ${rating <= form.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} hover:text-yellow-400 transition-colors`}
                    />
                  </button>
                ))}
                <span className="text-sm text-muted-foreground ml-2">{form.rating}/5</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Reviewer Name *</Label>
                <Input value={form.reviewedBy} onChange={e => setForm(p => ({ ...p, reviewedBy: e.target.value }))} placeholder="Your name" />
              </div>
              <div className="space-y-2">
                <Label>Review Date *</Label>
                <Input type="date" value={form.reviewDate} onChange={e => setForm(p => ({ ...p, reviewDate: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Food Quality Notes</Label>
                <Textarea value={form.foodQuality} onChange={e => setForm(p => ({ ...p, foodQuality: e.target.value }))} placeholder="Notes about food quality..." />
              </div>
              <div className="space-y-2">
                <Label>Service Quality Notes</Label>
                <Textarea value={form.serviceQuality} onChange={e => setForm(p => ({ ...p, serviceQuality: e.target.value }))} placeholder="Notes about service quality..." />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cleanliness Notes</Label>
                <Textarea value={form.cleanliness} onChange={e => setForm(p => ({ ...p, cleanliness: e.target.value }))} placeholder="Notes about cleanliness..." />
              </div>
              <div className="space-y-2">
                <Label>Professionalism Notes</Label>
                <Textarea value={form.professionalism} onChange={e => setForm(p => ({ ...p, professionalism: e.target.value }))} placeholder="Notes about professionalism..." />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Overall Notes</Label>
              <Textarea value={form.overallNotes} onChange={e => setForm(p => ({ ...p, overallNotes: e.target.value }))} placeholder="Overall assessment and notes..." />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Would Recommend</Label>
                <p className="text-xs text-muted-foreground">Would you recommend this food truck?</p>
              </div>
              <Switch checked={form.wouldRecommend} onCheckedChange={v => setForm(p => ({ ...p, wouldRecommend: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.foodTruckId || !form.reviewedBy || createMutation.isPending || updateMutation.isPending}
            >
              {editReview ? "Save Changes" : "Add Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
