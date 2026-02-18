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
import { Plus, Trash2, Users, Code, Calendar, Copy, Check, KeyRound, CalendarOff } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { ResyEventStaffCode, ResyPrivateEvent, ResyLocation } from "@shared/schema";

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
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="staff" className="flex items-center gap-2" data-testid="tab-staff">
            <Users className="h-4 w-4" /> Staff
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2" data-testid="tab-events">
            <Calendar className="h-4 w-4" /> Events
          </TabsTrigger>
          <TabsTrigger value="embed" className="flex items-center gap-2" data-testid="tab-embed">
            <Code className="h-4 w-4" /> Embed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="mt-6">
          <StaffCodesPanel codes={staffCodes || []} />
        </TabsContent>

        <TabsContent value="events" className="mt-6">
          <EventsPanel events={events || []} locationMap={locationMap} />
        </TabsContent>

        <TabsContent value="embed" className="mt-6">
          <EmbedPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StaffCodesPanel({ codes }: { codes: ResyEventStaffCode[] }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [code, setCode] = useState("");

  const createMutation = useMutation({
    mutationFn: async (data: { staffName: string; code: string }) => {
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
      setStaffName("");
      setCode("");
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
          <Button onClick={() => setDialogOpen(true)} data-testid="button-add-staff-code">
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
                    <p className="text-xs text-muted-foreground">
                      {staff.lastUsedAt
                        ? `Last used ${format(new Date(staff.lastUsedAt), "MMM d, yyyy h:mm a")}`
                        : "Never used"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
            <DialogTitle>Add Event Staff</DialogTitle>
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
              onClick={() => createMutation.mutate({ staffName, code })}
              disabled={!staffName || code.length !== 4 || createMutation.isPending}
              data-testid="button-save-staff-code"
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function EventsPanel({ events, locationMap }: { events: ResyPrivateEvent[]; locationMap: Map<string, string> }) {
  const sortedEvents = [...events].sort((a, b) => (b.eventDate || '').localeCompare(a.eventDate || ''));

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
        <CardTitle className="flex items-center gap-2">
          <CalendarOff className="h-5 w-5" />
          Booked Events
        </CardTitle>
        <CardDescription>All private events booked through the portal and admin</CardDescription>
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
                    <span>{event.startTime} - {event.endTime}</span>
                    {event.locationId && <span>{locationMap.get(event.locationId) || 'Unknown Location'}</span>}
                    <span>{event.partySize} guests</span>
                  </div>
                  {event.customerEmail && (
                    <p className="text-xs text-muted-foreground mt-0.5">{event.customerEmail} {event.customerPhone ? `| ${event.customerPhone}` : ''}</p>
                  )}
                  {event.notes && (
                    <p className="text-xs text-muted-foreground mt-0.5 italic">{event.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
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
