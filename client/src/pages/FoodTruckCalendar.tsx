import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin,
  Clock,
  Globe,
  ExternalLink,
  Send,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Calendar,
  Code,
  Copy,
  Check,
  UtensilsCrossed,
  ShieldCheck,
  FileText,
  Sparkles,
} from "lucide-react";

interface FoodTruckDayBannerPublic {
  bannerDate: string;
  label: string;
}

interface FoodTruckCalendarEvent {
  id: number;
  title: string;
  eventDate: string;
  startTime: string;
  endTime: string | null;
  location: string | null;
  description: string | null;
  imageUrl: string | null;
  isFeatured: boolean;
  foodTruckId: number | null;
  truckName: string | null;
  cuisineType: string | null;
  truckDescription: string | null;
  truckImageUrl: string | null;
  truckWebsiteUrl: string | null;
  permitExpiry: string | null;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function groupByMonth(events: FoodTruckCalendarEvent[]): Record<string, FoodTruckCalendarEvent[]> {
  const groups: Record<string, FoodTruckCalendarEvent[]> = {};
  for (const event of events) {
    const [year, month] = event.eventDate.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    const key = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(event);
  }
  return groups;
}

/** Preserve order; one group per calendar day so banners can sit above only that day's cards (not the whole month grid). */
function groupEventsByDateInOrder(events: FoodTruckCalendarEvent[]): { eventDate: string; events: FoodTruckCalendarEvent[] }[] {
  const out: { eventDate: string; events: FoodTruckCalendarEvent[] }[] = [];
  for (const ev of events) {
    const last = out[out.length - 1];
    if (last && last.eventDate === ev.eventDate) {
      last.events.push(ev);
    } else {
      out.push({ eventDate: ev.eventDate, events: [ev] });
    }
  }
  return out;
}

export default function FoodTruckCalendar() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const isEmbed = params.get("embed") === "1";
  const previewEventId = params.get("event");

  const { data: events = [], isLoading, refetch } = useQuery<FoodTruckCalendarEvent[]>({
    queryKey: ["/api/public/food-truck-calendar"],
    staleTime: 0, // Force refresh on every request
    gcTime: 0, // Don't cache the data (new property name)
  });

  const { data: dayBanners = [] } = useQuery<FoodTruckDayBannerPublic[]>({
    queryKey: ["/api/public/food-truck-day-banners"],
    staleTime: 0,
    gcTime: 0,
  });

  const labelByDate = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of dayBanners) {
      m.set(b.bannerDate, b.label);
    }
    return m;
  }, [dayBanners]);

  // Debug: Log events when they change
  useEffect(() => {
    if (events.length > 0) {
      console.log('Frontend Calendar Events:', events.map(e => ({
        id: e.id,
        eventDate: e.eventDate,
        title: e.title,
        truckName: e.truckName,
        description: e.description?.substring(0, 100) + ((e.description?.length || 0) > 100 ? '...' : ''),
        hasDescription: !!e.description
      })));
    }
  }, [events]);

  // Scroll to and highlight preview event
  useEffect(() => {
    if (previewEventId && events.length > 0) {
      const eventElement = document.querySelector(`[data-testid="card-food-truck-event-${previewEventId}"]`);
      if (eventElement) {
        // Add highlight class
        eventElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
        
        // Scroll into view
        eventElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Remove highlight after 3 seconds
        setTimeout(() => {
          eventElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
        }, 3000);
      }
    }
  }, [previewEventId, events]);

  const [submitted, setSubmitted] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [formData, setFormData] = useState({
    truckName: "",
    cuisineType: "",
    description: "",
    websiteUrl: "",
    contactEmail: "",
    contactPhone: "",
    message: "",
    menuDescription: "",
    healthLicenseAcknowledged: false,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/public/food-truck-submit", data);
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Application Received",
        description: "Thank you! We will review your application and get back to you.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.healthLicenseAcknowledged) {
      toast({
        title: "License Acknowledgment Required",
        description: "You must acknowledge the Board of Health licensing requirement before submitting.",
        variant: "destructive",
      });
      return;
    }
    if (!formData.menuDescription.trim()) {
      toast({
        title: "Menu Description Required",
        description: "Please describe the food and beverages you offer.",
        variant: "destructive",
      });
      return;
    }
    if (!formData.truckName.trim() || !formData.contactEmail.trim()) {
      toast({
        title: "Required Fields Missing",
        description: "Please provide your truck name and email address.",
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate(formData);
  };

  const updateField = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const grouped = groupByMonth(events);

  return (
    <div className={`min-h-screen bg-background ${isEmbed ? "" : "pb-12"}`}>
      {!isEmbed && (
        <header className="border-b bg-card">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <UtensilsCrossed className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-serif font-semibold" data-testid="text-page-title">
                  Food Trucks at Nashoba Valley Winery
                </h1>
                <p className="text-sm text-muted-foreground">
                  Upcoming food truck appearances and events
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate("/")} data-testid="button-back-home">
              Back to Home
            </Button>
          </div>
        </header>
      )}

      {!isEmbed && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={showEmbed ? "default" : "outline"}
              onClick={() => setShowEmbed(!showEmbed)}
              data-testid="button-toggle-embed"
            >
              <Code className="h-4 w-4 mr-2" />
              Embed on Your Website
            </Button>
          </div>
          {showEmbed && (
            <Card className="mt-3">
              <CardContent className="pt-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Copy the code below and paste it into your website HTML to embed the Food Truck calendar.
                </p>
                <div className="relative">
                  <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all" data-testid="text-embed-code">
{`<iframe src="${window.location.origin}/food-trucks?embed=1" width="100%" height="800" frameborder="0" style="border:none;"></iframe>`}
                  </pre>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      navigator.clipboard.writeText(`<iframe src="${window.location.origin}/food-trucks?embed=1" width="100%" height="800" frameborder="0" style="border:none;"></iframe>`);
                      setCopiedEmbed(true);
                      setTimeout(() => setCopiedEmbed(false), 2000);
                    }}
                    data-testid="button-copy-embed"
                  >
                    {copiedEmbed ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <UtensilsCrossed className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium mb-2" data-testid="text-no-events">No Upcoming Food Truck Events</h2>
            <p className="text-muted-foreground">
              Check back soon for upcoming food truck appearances.
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([month, monthEvents]) => (
            <div key={month} className="mb-10">
              <h2
                className="text-lg font-semibold mb-4 flex items-center gap-2"
                data-testid={`text-month-${month.replace(/\s/g, "-")}`}
              >
                <Calendar className="h-5 w-5 text-muted-foreground" />
                {month}
              </h2>
              <div className="space-y-8">
                {groupEventsByDateInOrder(monthEvents).map(({ eventDate, events: dayEvents }) => {
                  const dayLabel = labelByDate.get(eventDate);
                  return (
                    <div key={eventDate} className="space-y-3">
                      {dayLabel && (
                        <div
                          className="relative overflow-hidden rounded-lg border-2 border-amber-400/55 bg-gradient-to-r from-primary via-primary to-primary/85 px-4 py-3.5 text-center shadow-lg shadow-primary/35 ring-1 ring-amber-300/40"
                          data-testid={`banner-special-day-${eventDate}`}
                        >
                          <div
                            aria-hidden
                            className="pointer-events-none absolute inset-y-0 -left-1/3 w-2/5 bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent motion-safe:animate-banner-sheen motion-reduce:animate-none"
                          />
                          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/80 to-transparent" />
                          <div className="relative flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                            <Sparkles
                              className="h-5 w-5 shrink-0 text-amber-200 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)] motion-safe:animate-pulse motion-reduce:animate-none"
                              aria-hidden
                            />
                            <p className="font-serif text-base font-bold uppercase tracking-[0.12em] text-primary-foreground drop-shadow-md sm:text-lg">
                              {dayLabel}
                            </p>
                            <Sparkles
                              className="h-5 w-5 shrink-0 text-amber-200 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)] motion-safe:animate-pulse motion-reduce:animate-none"
                              aria-hidden
                            />
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {dayEvents.map((event) => (
                  <Card key={event.id} data-testid={`card-food-truck-event-${event.id}`}>
                    {/* Prominent Date and Time Callout at Top */}
                    <div className="bg-primary text-primary-foreground p-4 rounded-t-md">
                      <div className="text-center space-y-1">
                        <div className="flex items-center justify-center gap-2 text-lg font-bold">
                          <Calendar className="h-5 w-5" />
                          <span data-testid={`text-date-${event.id}`}>{formatDate(event.eventDate)}</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-base font-medium">
                          <Clock className="h-4 w-4" />
                          <span data-testid={`text-time-${event.id}`}>
                            {formatTime(event.startTime)}
                            {event.endTime ? ` - ${formatTime(event.endTime)}` : ""}
                          </span>
                        </div>
                        {event.location && (
                          <div className="flex items-center justify-center gap-2 text-sm">
                            <MapPin className="h-4 w-4" />
                            <span data-testid={`text-location-${event.id}`}>{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {(event.imageUrl || event.truckImageUrl) && (
                      <div className="aspect-video w-full overflow-hidden">
                        <img
                          src={event.imageUrl || event.truckImageUrl || ""}
                          alt={event.truckName || event.title}
                          className="w-full h-full object-cover object-top"
                          data-testid={`img-event-${event.id}`}
                        />
                      </div>
                    )}
                    <CardContent className="p-4 space-y-4">
                      <div className="space-y-3">
                        {/* Truck Name and Cuisine Type */}
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <h3 className="font-semibold text-base leading-tight" data-testid={`text-truck-name-${event.id}`}>
                            {event.truckName || event.title}
                          </h3>
                          {event.cuisineType && (
                            <Badge variant="secondary" className="shrink-0" data-testid={`badge-cuisine-${event.id}`}>
                              {event.cuisineType}
                            </Badge>
                          )}
                        </div>

                        {/* Event Title (if different from truck name) */}
                        {event.title && event.truckName && event.title !== event.truckName && (
                          <p className="text-sm text-muted-foreground" data-testid={`text-event-title-${event.id}`}>
                            {event.title}
                          </p>
                        )}

                        {/* Food Truck Description */}
                        {event.truckDescription && (
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground" data-testid={`text-truck-description-${event.id}`}>
                              {event.truckDescription}
                            </p>
                          </div>
                        )}

                        {/* Event Description - Additional Activities */}
                        {event.description && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Additional Activities:</p>
                            <div className="text-sm text-muted-foreground" data-testid={`text-event-description-${event.id}`}>
                              {(() => {
                                const lines = event.description.split('\n');
                                return lines.map((line, index) => {
                                  // Handle bullet points (starting with -, *, or number with dot)
                                  if (line.trim().match(/^[-*]\s+/) || line.trim().match(/^\d+\.\s+/)) {
                                    const bulletContent = line.trim().replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
                                    return (
                                      <div key={index} className="flex items-start gap-2 mb-1">
                                        <span className="text-primary mt-1">{'\u2022'}</span>
                                        <span>{bulletContent}</span>
                                      </div>
                                    );
                                  }
                                  // Handle regular lines with proper spacing
                                  else if (line.trim()) {
                                    return <p key={index} className="mb-1">{line}</p>;
                                  }
                                  // Handle empty lines for spacing
                                  else {
                                    return <br key={index} />;
                                  }
                                });
                              })()}
                            </div>
                          </div>
                        )}

                        
                        {/* Featured Badge */}
                        {event.isFeatured && (
                          <Badge variant="default" data-testid={`badge-featured-${event.id}`}>Featured</Badge>
                        )}

                        {/* Website Link - Enhanced */}
                        {event.truckWebsiteUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            asChild
                            data-testid={`button-website-${event.id}`}
                          >
                            <a href={event.truckWebsiteUrl} target="_blank" rel="noopener noreferrer">
                              <Globe className="h-4 w-4 mr-2" />
                              Visit {event.truckName || "Food Truck"} Website
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        <div className="mt-16 border-t pt-10" id="apply">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-serif font-semibold mb-2" data-testid="text-application-heading">
              Vend at Nashoba Valley Winery
            </h2>
            <p className="text-muted-foreground mb-6">
              Interested in bringing your food truck to our property? Please review the licensing requirements below and complete the application form.
            </p>

            <Card className="mb-8">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <h3 className="font-semibold text-base" data-testid="text-license-notice-heading">
                    Board of Health Permit Requirement
                  </h3>
                </div>

                <div className="text-sm space-y-3 text-muted-foreground" data-testid="text-license-notice-body">
                  <p>
                    All food trucks and mobile food vendors operating at Nashoba Valley Winery are required to hold a valid <strong>Mobile Food Vendor Permit</strong> issued by the <strong>Nashoba Board of Health</strong> in Ayer, Massachusetts. This permit must be current and displayed at all times while vending on our property.
                  </p>
                  <p>
                    Mobile food vendor permits are issued annually. If you do not yet have a permit or your permit has expired, you must apply before we can confirm your booking.
                  </p>
                </div>

                <div className="rounded-md bg-muted/50 p-4 space-y-3">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    How to Obtain a Nashoba Board of Health Mobile Vendor Permit
                  </p>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>
                      <strong>Contact the Ayer Board of Health</strong> — The Ayer Board of Health offices are located at Ayer Town Hall, 1 Main Street, Ayer, MA 01432. Phone: (978) 772-8220. Office hours vary; call ahead to confirm.
                    </li>
                    <li>
                      <strong>Complete a Mobile Food Establishment Application</strong> — Download or pick up the application form from the Ayer Board of Health office. You will need to provide information about your truck, equipment, and food handling procedures.
                    </li>
                    <li>
                      <strong>Provide required documentation</strong> — Typically includes proof of food safety certification (ServSafe or equivalent), a current vehicle registration, and a description of your menu and food preparation methods.
                    </li>
                    <li>
                      <strong>Schedule an inspection</strong> — A Board of Health inspector will need to inspect your mobile unit before issuing the permit. Plan 1–2 weeks for this process.
                    </li>
                    <li>
                      <strong>Pay the permit fee</strong> — Fees are set annually by the Town of Ayer. Contact the Board of Health for current fee schedules.
                    </li>
                    <li>
                      <strong>Renew annually</strong> — Permits expire each year and must be renewed. Keep your renewal dates on file to avoid lapses.
                    </li>
                  </ol>
                  <p className="text-xs text-muted-foreground italic">
                    Note: If you already hold a mobile food vendor permit from another Massachusetts municipality, you may still be required to obtain an Ayer permit to operate on private property within Ayer. Confirm with the Ayer Board of Health directly.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 pt-1">
                  <Button variant="outline" asChild data-testid="button-ayer-boh">
                    <a href="https://www.ayer.ma.us/board-of-health" target="_blank" rel="noopener noreferrer">
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      Ayer Board of Health Website
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                  <Button variant="outline" asChild data-testid="button-servsafe">
                    <a href="https://www.servsafe.com/" target="_blank" rel="noopener noreferrer">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      ServSafe Certification
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {submitted ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2" data-testid="text-submission-success">
                    Application Received!
                  </h3>
                  <p className="text-muted-foreground">
                    Thank you for your interest in vending at Nashoba Valley Winery. We will review your application and get back to you soon.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({
                        truckName: "",
                        cuisineType: "",
                        description: "",
                        websiteUrl: "",
                        contactEmail: "",
                        contactPhone: "",
                        message: "",
                        menuDescription: "",
                        healthLicenseAcknowledged: false,
                      });
                    }}
                    data-testid="button-submit-another"
                  >
                    Submit Another Application
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-base mb-4" data-testid="text-form-heading">
                    Vendor Application Form
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="truckName">Food Truck / Vendor Name *</Label>
                        <Input
                          id="truckName"
                          value={formData.truckName}
                          onChange={(e) => updateField("truckName", e.target.value)}
                          required
                          data-testid="input-truck-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cuisineType">Cuisine Type</Label>
                        <Input
                          id="cuisineType"
                          value={formData.cuisineType}
                          onChange={(e) => updateField("cuisineType", e.target.value)}
                          placeholder="e.g., BBQ, Tacos, Seafood"
                          data-testid="input-cuisine-type"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">About Your Truck</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => updateField("description", e.target.value)}
                        placeholder="Tell us about your food truck — your story, what makes you unique, etc."
                        rows={3}
                        data-testid="input-description"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="websiteUrl">Website / Social Media</Label>
                        <Input
                          id="websiteUrl"
                          type="url"
                          value={formData.websiteUrl}
                          onChange={(e) => updateField("websiteUrl", e.target.value)}
                          placeholder="https://"
                          data-testid="input-website"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactEmail">Email *</Label>
                        <Input
                          id="contactEmail"
                          type="email"
                          value={formData.contactEmail}
                          onChange={(e) => updateField("contactEmail", e.target.value)}
                          required
                          data-testid="input-email"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contactPhone">Phone</Label>
                      <Input
                        id="contactPhone"
                        type="tel"
                        value={formData.contactPhone}
                        onChange={(e) => updateField("contactPhone", e.target.value)}
                        data-testid="input-phone"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="menuDescription">
                        Menu / Food Offerings *
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Please describe the foods and beverages you offer, including any specialties or seasonal items.
                      </p>
                      <Textarea
                        id="menuDescription"
                        value={formData.menuDescription}
                        onChange={(e) => updateField("menuDescription", e.target.value)}
                        rows={5}
                        required
                        placeholder={"Example:\nSmoked brisket sandwiches, pulled pork platters, mac & cheese sides\nBeverage options: lemonade, sweet tea\nAll items gluten-free friendly"}
                        data-testid="input-menu-description"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Additional Notes</Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => updateField("message", e.target.value)}
                        rows={2}
                        placeholder="Any other information you'd like us to know..."
                        data-testid="input-message"
                      />
                    </div>

                    <div className="flex items-start gap-3 p-4 border rounded-md bg-muted/30">
                      <Checkbox
                        id="healthLicenseAcknowledged"
                        checked={formData.healthLicenseAcknowledged}
                        onCheckedChange={(checked) =>
                          updateField("healthLicenseAcknowledged", checked === true)
                        }
                        data-testid="checkbox-health-license"
                      />
                      <Label
                        htmlFor="healthLicenseAcknowledged"
                        className="text-sm leading-relaxed cursor-pointer"
                      >
                        I confirm that my food truck holds (or will hold prior to the event) a valid Mobile Food Vendor Permit issued by the Nashoba Board of Health, Ayer, MA, and that all required food safety certifications are current.
                      </Label>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={submitMutation.isPending}
                      data-testid="button-submit-vendor"
                    >
                      {submitMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Submit Application
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
