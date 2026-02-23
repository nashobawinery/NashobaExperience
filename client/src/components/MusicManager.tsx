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
  Music,
  Globe,
  Mail,
  Phone,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  FileText,
  ExternalLink,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import type { Musician, MusicEvent, MusicianSubmission } from "@shared/schema";

function formatTime12(time24: string | null | undefined): string {
  if (!time24) return "";
  const [h, m] = time24.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${m} ${ampm}`;
}

export default function MusicManager() {
  const [activeTab, setActiveTab] = useState("musicians");

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="musicians" className="flex items-center gap-2" data-testid="tab-musicians">
            <Users className="h-4 w-4" /> Musicians
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2" data-testid="tab-schedule">
            <Calendar className="h-4 w-4" /> Schedule
          </TabsTrigger>
          <TabsTrigger value="submissions" className="flex items-center gap-2" data-testid="tab-submissions">
            <FileText className="h-4 w-4" /> Submissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="musicians" className="mt-6">
          <MusiciansPanel />
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <SchedulePanel />
        </TabsContent>

        <TabsContent value="submissions" className="mt-6">
          <SubmissionsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MusiciansPanel() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editMusician, setEditMusician] = useState<Musician | null>(null);
  const [form, setForm] = useState({
    name: "",
    genre: "",
    bio: "",
    imageUrl: "",
    websiteUrl: "",
    contactEmail: "",
    contactPhone: "",
    isApproved: true,
    isActive: true,
  });

  const { data: musicians, isLoading } = useQuery<Musician[]>({
    queryKey: ["/api/media/musicians"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest("POST", "/api/media/musicians", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media/musicians"] });
      closeDialog();
      toast({ title: "Musician added" });
    },
    onError: () => toast({ title: "Failed to add musician", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof form }) => {
      const res = await apiRequest("PUT", `/api/media/musicians/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media/musicians"] });
      closeDialog();
      toast({ title: "Musician updated" });
    },
    onError: () => toast({ title: "Failed to update musician", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/media/musicians/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media/musicians"] });
      toast({ title: "Musician deleted" });
    },
  });

  const resetForm = () => setForm({ name: "", genre: "", bio: "", imageUrl: "", websiteUrl: "", contactEmail: "", contactPhone: "", isApproved: true, isActive: true });

  const closeDialog = () => {
    setShowDialog(false);
    setEditMusician(null);
    resetForm();
  };

  const openCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEdit = (m: Musician) => {
    setForm({
      name: m.name,
      genre: m.genre || "",
      bio: m.bio || "",
      imageUrl: m.imageUrl || "",
      websiteUrl: m.websiteUrl || "",
      contactEmail: m.contactEmail || "",
      contactPhone: m.contactPhone || "",
      isApproved: m.isApproved,
      isActive: m.isActive,
    });
    setEditMusician(m);
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!form.name) return;
    if (editMusician) {
      updateMutation.mutate({ id: editMusician.id, data: form });
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
        <h2 className="text-lg font-semibold" data-testid="text-musicians-heading">Musicians</h2>
        <Button onClick={openCreate} data-testid="button-add-musician">
          <Plus className="w-4 h-4 mr-2" /> Add Musician
        </Button>
      </div>

      {(!musicians || musicians.length === 0) ? (
        <Card className="p-8 text-center">
          <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Musicians Yet</h3>
          <p className="text-muted-foreground mb-4">Add your first musician to get started.</p>
          <Button onClick={openCreate} data-testid="button-add-first-musician">
            <Plus className="w-4 h-4 mr-2" /> Add Musician
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {musicians.map(m => (
            <Card key={m.id} className="overflow-visible" data-testid={`card-musician-${m.id}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {m.imageUrl ? (
                      <img src={m.imageUrl} alt={m.name} className="w-12 h-12 rounded-md object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                        <Music className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate" data-testid={`text-musician-name-${m.id}`}>{m.name}</h3>
                      {m.genre && <p className="text-sm text-muted-foreground">{m.genre}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(m)} data-testid={`button-edit-musician-${m.id}`}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Delete "${m.name}"?`)) deleteMutation.mutate(m.id);
                      }}
                      data-testid={`button-delete-musician-${m.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={m.isActive ? "default" : "secondary"}>
                    {m.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant={m.isApproved ? "default" : "outline"}>
                    {m.isApproved ? "Approved" : "Pending"}
                  </Badge>
                </div>

                {m.websiteUrl && (
                  <a
                    href={m.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm flex items-center gap-1 text-muted-foreground"
                    data-testid={`link-musician-website-${m.id}`}
                  >
                    <Globe className="w-3 h-3" /> Website
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}

                {m.contactEmail && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {m.contactEmail}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog || !!editMusician} onOpenChange={(v) => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editMusician ? "Edit Musician" : "Add Musician"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Musician name" data-testid="input-musician-name" />
            </div>
            <div className="space-y-2">
              <Label>Genre</Label>
              <Input value={form.genre} onChange={e => setForm(p => ({ ...p, genre: e.target.value }))} placeholder="e.g., Jazz, Rock, Acoustic" data-testid="input-musician-genre" />
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Short biography" data-testid="input-musician-bio" />
            </div>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input value={form.imageUrl} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))} placeholder="https://..." data-testid="input-musician-image" />
            </div>
            <div className="space-y-2">
              <Label>Website URL</Label>
              <Input value={form.websiteUrl} onChange={e => setForm(p => ({ ...p, websiteUrl: e.target.value }))} placeholder="https://..." data-testid="input-musician-website" />
            </div>
            <div className="space-y-2">
              <Label>Contact Email</Label>
              <Input value={form.contactEmail} onChange={e => setForm(p => ({ ...p, contactEmail: e.target.value }))} placeholder="email@example.com" data-testid="input-musician-email" />
            </div>
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input value={form.contactPhone} onChange={e => setForm(p => ({ ...p, contactPhone: e.target.value }))} placeholder="(555) 123-4567" data-testid="input-musician-phone" />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Approved</Label>
                <p className="text-xs text-muted-foreground">Musician is approved to perform</p>
              </div>
              <Switch checked={form.isApproved} onCheckedChange={v => setForm(p => ({ ...p, isApproved: v }))} data-testid="switch-musician-approved" />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Show in public listings</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={v => setForm(p => ({ ...p, isActive: v }))} data-testid="switch-musician-active" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel-musician">Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.name || createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-musician"
            >
              {editMusician ? "Save Changes" : "Add Musician"}
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
  const [editEvent, setEditEvent] = useState<MusicEvent | null>(null);
  const [form, setForm] = useState({
    musicianId: null as number | null,
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

  const { data: events, isLoading } = useQuery<MusicEvent[]>({
    queryKey: ["/api/media/music-events"],
  });

  const { data: musicians } = useQuery<Musician[]>({
    queryKey: ["/api/media/musicians"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest("POST", "/api/media/music-events", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media/music-events"] });
      closeDialog();
      toast({ title: "Event added" });
    },
    onError: () => toast({ title: "Failed to add event", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof form }) => {
      const res = await apiRequest("PUT", `/api/media/music-events/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media/music-events"] });
      closeDialog();
      toast({ title: "Event updated" });
    },
    onError: () => toast({ title: "Failed to update event", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/media/music-events/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media/music-events"] });
      toast({ title: "Event deleted" });
    },
  });

  const resetForm = () => setForm({ musicianId: null, title: "", eventDate: "", startTime: "", endTime: "", location: "", description: "", imageUrl: "", isActive: true, isFeatured: false });

  const closeDialog = () => {
    setShowDialog(false);
    setEditEvent(null);
    resetForm();
  };

  const openCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEdit = (ev: MusicEvent) => {
    setForm({
      musicianId: ev.musicianId,
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

  const musicianMap = new Map(musicians?.map(m => [m.id, m]) || []);

  const groupedEvents = (events || []).reduce<Record<string, MusicEvent[]>>((acc, ev) => {
    const date = ev.eventDate;
    if (!acc[date]) acc[date] = [];
    acc[date].push(ev);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedEvents).sort((a, b) => b.localeCompare(a));

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
        <h2 className="text-lg font-semibold" data-testid="text-schedule-heading">Music Schedule</h2>
        <Button onClick={openCreate} data-testid="button-add-music-event">
          <Plus className="w-4 h-4 mr-2" /> Add Event
        </Button>
      </div>

      {sortedDates.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Events Scheduled</h3>
          <p className="text-muted-foreground mb-4">Schedule your first live music event.</p>
          <Button onClick={openCreate} data-testid="button-add-first-event">
            <Plus className="w-4 h-4 mr-2" /> Add Event
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDates.map(date => (
            <div key={date} className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground" data-testid={`text-date-group-${date}`}>
                {format(parseISO(date), "EEEE, MMMM d, yyyy")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupedEvents[date].map(ev => {
                  const musician = ev.musicianId ? musicianMap.get(ev.musicianId) : null;
                  return (
                    <Card key={ev.id} className="overflow-visible" data-testid={`card-music-event-${ev.id}`}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-semibold truncate" data-testid={`text-event-title-${ev.id}`}>{ev.title}</h4>
                            {musician && (
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Music className="w-3 h-3" /> {musician.name}
                                {musician.genre && <Badge variant="outline" className="ml-1">{musician.genre}</Badge>}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(ev)} data-testid={`button-edit-event-${ev.id}`}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                if (confirm(`Delete "${ev.title}"?`)) deleteMutation.mutate(ev.id);
                              }}
                              data-testid={`button-delete-event-${ev.id}`}
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
          ))}
        </div>
      )}

      <Dialog open={showDialog || !!editEvent} onOpenChange={(v) => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editEvent ? "Edit Event" : "Add Music Event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Event title" data-testid="input-event-title" />
            </div>
            <div className="space-y-2">
              <Label>Musician</Label>
              <Select
                value={form.musicianId ? String(form.musicianId) : "none"}
                onValueChange={v => setForm(p => ({ ...p, musicianId: v === "none" ? null : parseInt(v) }))}
              >
                <SelectTrigger data-testid="select-event-musician">
                  <SelectValue placeholder="Select musician" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No musician</SelectItem>
                  {(musicians || []).map(m => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={form.eventDate} onChange={e => setForm(p => ({ ...p, eventDate: e.target.value }))} data-testid="input-event-date" />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g., Pavilion" data-testid="input-event-location" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time *</Label>
                <Input type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} data-testid="input-event-start-time" />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="time" value={form.endTime} onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))} data-testid="input-event-end-time" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Event description" data-testid="input-event-description" />
            </div>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input value={form.imageUrl} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))} placeholder="https://..." data-testid="input-event-image" />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Show in public calendar</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={v => setForm(p => ({ ...p, isActive: v }))} data-testid="switch-event-active" />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Featured</Label>
                <p className="text-xs text-muted-foreground">Highlight this event</p>
              </div>
              <Switch checked={form.isFeatured} onCheckedChange={v => setForm(p => ({ ...p, isFeatured: v }))} data-testid="switch-event-featured" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel-event">Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.title || !form.eventDate || !form.startTime || createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-event"
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
  const [reviewSubmission, setReviewSubmission] = useState<MusicianSubmission | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const { data: submissions, isLoading } = useQuery<MusicianSubmission[]>({
    queryKey: ["/api/media/musician-submissions"],
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, reviewNotes }: { id: number; status: string; reviewNotes: string }) => {
      const res = await apiRequest("PUT", `/api/media/musician-submissions/${id}`, { status, reviewNotes });
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/media/musician-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/media/musicians"] });
      setReviewSubmission(null);
      setReviewNotes("");
      toast({ title: vars.status === "approved" ? "Submission approved - musician created" : "Submission declined" });
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
      <h2 className="text-lg font-semibold" data-testid="text-submissions-heading">Musician Submissions</h2>

      {(!submissions || submissions.length === 0) ? (
        <Card className="p-8 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Submissions</h3>
          <p className="text-muted-foreground">Musician submissions will appear here when they apply through the public form.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {submissions.map(sub => (
            <Card key={sub.id} className="overflow-visible" data-testid={`card-submission-${sub.id}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-semibold truncate" data-testid={`text-submission-name-${sub.id}`}>{sub.musicianName}</h4>
                    {sub.genre && <p className="text-sm text-muted-foreground">{sub.genre}</p>}
                  </div>
                  <div className="flex-shrink-0">
                    {statusBadge(sub.status)}
                  </div>
                </div>

                {sub.bio && <p className="text-sm text-muted-foreground line-clamp-2">{sub.bio}</p>}

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
                  <p className="text-xs font-medium">Song List:</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">{sub.songList}</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={sub.proAcknowledged ? "default" : "destructive"}>
                    {sub.proAcknowledged ? "PRO Acknowledged" : "PRO Not Acknowledged"}
                  </Badge>
                </div>

                {sub.message && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium">Message:</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{sub.message}</p>
                  </div>
                )}

                {sub.reviewNotes && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium">Review Notes:</p>
                    <p className="text-xs text-muted-foreground">{sub.reviewNotes}</p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Submitted {sub.createdAt ? format(new Date(sub.createdAt), "MMM d, yyyy") : "N/A"}
                </p>

                {sub.status === "pending" && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      onClick={() => { setReviewSubmission(sub); setReviewNotes(""); }}
                      className="flex items-center gap-1"
                      data-testid={`button-review-submission-${sub.id}`}
                    >
                      <CheckCircle className="w-4 h-4" /> Review
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!reviewSubmission} onOpenChange={(v) => { if (!v) { setReviewSubmission(null); setReviewNotes(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Submission: {reviewSubmission?.musicianName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm"><strong>Genre:</strong> {reviewSubmission?.genre || "Not specified"}</p>
              <p className="text-sm"><strong>Email:</strong> {reviewSubmission?.contactEmail}</p>
              {reviewSubmission?.contactPhone && <p className="text-sm"><strong>Phone:</strong> {reviewSubmission.contactPhone}</p>}
              <p className="text-sm"><strong>PRO Acknowledged:</strong> {reviewSubmission?.proAcknowledged ? "Yes" : "No"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Song List:</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{reviewSubmission?.songList}</p>
            </div>
            <div className="space-y-2">
              <Label>Review Notes (optional)</Label>
              <Textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Notes about this decision..." data-testid="input-review-notes" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (reviewSubmission) {
                  reviewMutation.mutate({ id: reviewSubmission.id, status: "declined", reviewNotes });
                }
              }}
              disabled={reviewMutation.isPending}
              className="flex items-center gap-1"
              data-testid="button-decline-submission"
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
              data-testid="button-approve-submission"
            >
              <CheckCircle className="w-4 h-4" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
