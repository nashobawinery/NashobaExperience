import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, Clock, MapPin, Ticket, ArrowLeft, Filter, Code, Copy, Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SpecialEvent } from "@shared/schema";

const CATEGORY_LABELS: Record<string, string> = {
  "workshop": "Workshop",
  "cooking-demo": "Cooking Demo",
  "seasonal": "Seasonal",
  "other": "Other",
};

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Events" },
  { value: "workshop", label: "Workshops" },
  { value: "cooking-demo", label: "Cooking Demos" },
  { value: "seasonal", label: "Seasonal" },
  { value: "other", label: "Other" },
];

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

function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

export default function SpecialEventsPublic() {
  const [, setLocation] = useLocation();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showEmbed, setShowEmbed] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const isEmbed = params.get("embed") === "1";

  const { data: events, isLoading } = useQuery<SpecialEvent[]>({
    queryKey: ["/api/public/special-events"],
  });

  const filteredEvents = events?.filter((event) => {
    if (categoryFilter === "all") return true;
    return event.category === categoryFilter;
  }) ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="loading-events">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {!isEmbed && (
        <header className="border-b bg-card">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4 flex-wrap">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
              data-testid="button-back"
            >
              <ArrowLeft />
            </Button>
            <div>
              <h1 className="text-2xl font-serif font-semibold" data-testid="text-page-title">
                Special Events & Tickets
              </h1>
              <p className="text-sm text-muted-foreground">
                Discover upcoming workshops, cooking demos, and seasonal celebrations at Nashoba Valley
              </p>
            </div>
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
                  Copy the code below and paste it into your website HTML to embed the Special Events calendar.
                </p>
                <div className="relative">
                  <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all" data-testid="text-embed-code">
{`<iframe src="${window.location.origin}/events?embed=1" width="100%" height="800" frameborder="0" style="border:none;"></iframe>`}
                  </pre>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      navigator.clipboard.writeText(`<iframe src="${window.location.origin}/events?embed=1" width="100%" height="800" frameborder="0" style="border:none;"></iframe>`);
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

      <div className={`max-w-6xl mx-auto ${isEmbed ? "px-4 py-4" : "px-4 py-6"}`}>
        {isEmbed && (
          <div className="mb-6">
            <h1 className="text-2xl font-serif font-semibold" data-testid="text-page-title-embed">
              Special Events & Tickets
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Discover upcoming workshops, cooking demos, and seasonal celebrations
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48" data-testid="select-category-filter">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} data-testid={`option-category-${opt.value}`}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {categoryFilter !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCategoryFilter("all")}
              data-testid="button-clear-filter"
            >
              Clear filter
            </Button>
          )}
          <span className="text-sm text-muted-foreground ml-auto">
            {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
          </span>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="text-center py-16" data-testid="text-no-events">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No upcoming events</h3>
            <p className="text-muted-foreground">
              {categoryFilter !== "all"
                ? "No events found in this category. Try a different filter."
                : "Check back soon for exciting upcoming events!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <Card key={event.id} className="overflow-visible flex flex-col" data-testid={`card-event-${event.id}`}>
                {event.imageUrl && (
                  <div className="relative aspect-[16/9] overflow-hidden rounded-t-md">
                    <img
                      src={event.imageUrl}
                      alt={event.title}
                      className="w-full h-full object-cover"
                      data-testid={`img-event-${event.id}`}
                    />
                    {event.isFeatured && (
                      <Badge
                        variant="default"
                        className="absolute top-2 right-2"
                        data-testid={`badge-featured-${event.id}`}
                      >
                        Featured
                      </Badge>
                    )}
                  </div>
                )}
                <CardContent className="flex flex-col flex-1 p-4 gap-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <h3 className="font-semibold text-lg leading-tight" data-testid={`text-event-title-${event.id}`}>
                      {event.title}
                    </h3>
                    <Badge variant="secondary" className="shrink-0" data-testid={`badge-category-${event.id}`}>
                      {CATEGORY_LABELS[event.category] || event.category}
                    </Badge>
                  </div>

                  {event.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3" data-testid={`text-event-desc-${event.id}`}>
                      {event.description}
                    </p>
                  )}

                  <div className="flex flex-col gap-1.5 text-sm mt-auto">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span data-testid={`text-event-date-${event.id}`}>{formatDate(event.eventDate)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span data-testid={`text-event-time-${event.id}`}>
                        {formatTime(event.startTime)}
                        {event.endTime ? ` - ${formatTime(event.endTime)}` : ""}
                      </span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span data-testid={`text-event-location-${event.id}`}>{event.location}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
                    {event.price && (
                      <span className="font-semibold text-lg" data-testid={`text-event-price-${event.id}`}>
                        {event.price.startsWith("$") ? event.price : `$${event.price}`}
                      </span>
                    )}
                    {event.shopifyUrl ? (
                      <Button
                        asChild
                        className="ml-auto"
                        data-testid={`button-tickets-${event.id}`}
                      >
                        <a href={event.shopifyUrl} target="_blank" rel="noopener noreferrer">
                          <Ticket className="h-4 w-4 mr-2" />
                          Get Tickets
                        </a>
                      </Button>
                    ) : (
                      <Button variant="secondary" disabled className="ml-auto" data-testid={`button-tickets-disabled-${event.id}`}>
                        <Ticket className="h-4 w-4 mr-2" />
                        Coming Soon
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
