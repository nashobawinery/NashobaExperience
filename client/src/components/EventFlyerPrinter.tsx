import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, Loader2, CalendarDays, Calendar } from "lucide-react";

interface FlyerPrinterProps {
  mode: "music" | "events";
}

export default function EventFlyerPrinter({ mode }: FlyerPrinterProps) {
  const [template, setTemplate] = useState("classic");
  const [scale, setScale] = useState(100);
  const [filterMode, setFilterMode] = useState<"range" | "date">("range");
  const [daysAhead, setDaysAhead] = useState(60);
  const [specificDate, setSpecificDate] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customFooter, setCustomFooter] = useState("");
  const [hideDescriptions, setHideDescriptions] = useState(false);
  const [hideImages, setHideImages] = useState(false);
  const [hidePrices, setHidePrices] = useState(false);
  const [showVenue, setShowVenue] = useState(true);

  const { data: musicEvents, isLoading: musicLoading } = useQuery({
    queryKey: ["/api/public/music-calendar"],
    enabled: mode === "music",
  });

  const { data: specialEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/public/special-events"],
    enabled: mode === "events",
  });

  const isLoading = mode === "music" ? musicLoading : eventsLoading;
  const eventCount = mode === "music"
    ? (musicEvents as any[])?.length || 0
    : (specialEvents as any[])?.length || 0;

  const getFlyerUrl = (tmpl: string) => {
    const base = window.location.origin;
    const params = new URLSearchParams();
    params.set("template", tmpl);
    params.set("mode", mode);
    if (scale !== 100) params.set("scale", String(scale));
    if (filterMode === "date" && specificDate) {
      params.set("specificdate", specificDate);
    } else if (daysAhead !== 60) {
      params.set("days", String(daysAhead));
    }
    if (customTitle.trim()) params.set("title", customTitle.trim());
    if (customFooter.trim()) params.set("footer", customFooter.trim());
    if (hideDescriptions) params.set("hidedesc", "1");
    if (hideImages) params.set("hideimg", "1");
    if (hidePrices) params.set("hideprice", "1");
    if (!showVenue) params.set("hidevenue", "1");
    return `${base}/api/media/flyer/embed?${params.toString()}`;
  };

  const handlePrint = (tmpl: string) => {
    const url = getFlyerUrl(tmpl);
    const printWindow = window.open(url, "_blank");
    if (printWindow) {
      printWindow.addEventListener("load", () => {
        setTimeout(() => printWindow.print(), 500);
      });
    }
  };

  const previewUrl = getFlyerUrl(template);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading events...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold" data-testid="text-flyer-printer-title">
          {mode === "music" ? "Music Lineup Flyer" : "Events Flyer"}
        </h2>
        <span className="text-sm text-muted-foreground block">
          {mode === "music"
            ? `Print a flyer showing upcoming live music performances. ${eventCount} upcoming event${eventCount !== 1 ? "s" : ""} found.`
            : `Print a flyer showing upcoming special events and workshops. ${eventCount} upcoming event${eventCount !== 1 ? "s" : ""} found.`
          }
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Template</Label>
          <Select value={template} onValueChange={setTemplate}>
            <SelectTrigger data-testid="select-flyer-template">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="classic">Classic Elegant</SelectItem>
              <SelectItem value="modern">Modern Clean</SelectItem>
              <SelectItem value="bold">Bold & Fun</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Events to Include</Label>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={filterMode === "range" ? "default" : "outline"}
              onClick={() => setFilterMode("range")}
              data-testid="button-filter-range"
              className="flex-1"
            >
              <CalendarDays className="w-3.5 h-3.5 mr-1" />
              Next Period
            </Button>
            <Button
              size="sm"
              variant={filterMode === "date" ? "default" : "outline"}
              onClick={() => setFilterMode("date")}
              data-testid="button-filter-date"
              className="flex-1"
            >
              <Calendar className="w-3.5 h-3.5 mr-1" />
              Specific Day
            </Button>
          </div>
          {filterMode === "range" ? (
            <Select value={String(daysAhead)} onValueChange={(v) => setDaysAhead(Number(v))}>
              <SelectTrigger data-testid="select-flyer-days">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="14">Next 2 Weeks</SelectItem>
                <SelectItem value="30">Next 1 Month</SelectItem>
                <SelectItem value="60">Next 2 Months</SelectItem>
                <SelectItem value="90">Next 3 Months</SelectItem>
                <SelectItem value="180">Next 6 Months</SelectItem>
                <SelectItem value="365">Next 1 Year</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input
              type="date"
              value={specificDate}
              onChange={(e) => setSpecificDate(e.target.value)}
              data-testid="input-flyer-specific-date"
            />
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Font Size: {scale}%</Label>
          <span className="text-xs text-muted-foreground block">Reduce to fit more events per page.</span>
          <input
            type="range"
            min={60}
            max={120}
            step={5}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="w-full max-w-xs accent-primary"
            data-testid="slider-flyer-scale"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Custom Title</Label>
          <span className="text-xs text-muted-foreground block">Leave blank for default title.</span>
          <Input
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder={mode === "music" ? "Live Music at Nashoba Valley" : "Upcoming Events"}
            data-testid="input-flyer-title"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Custom Footer</Label>
        <span className="text-xs text-muted-foreground block">Add a message at the bottom (e.g., website, phone, or special note).</span>
        <Input
          value={customFooter}
          onChange={(e) => setCustomFooter(e.target.value)}
          placeholder="Visit us at nashobawinery.com or call (978) 779-5521"
          data-testid="input-flyer-footer"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Options</Label>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={hideDescriptions}
              onCheckedChange={(c) => setHideDescriptions(!!c)}
              data-testid="checkbox-flyer-hide-desc"
            />
            <span>Hide Descriptions</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={hideImages}
              onCheckedChange={(c) => setHideImages(!!c)}
              data-testid="checkbox-flyer-hide-images"
            />
            <span>Hide Images</span>
          </label>
          {mode === "events" && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={hidePrices}
                onCheckedChange={(c) => setHidePrices(!!c)}
                data-testid="checkbox-flyer-hide-prices"
              />
              <span>Hide Prices</span>
            </label>
          )}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={!showVenue}
              onCheckedChange={(c) => setShowVenue(!c)}
              data-testid="checkbox-flyer-hide-venue"
            />
            <span>Hide Venue Info</span>
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="overflow-hidden">
          <div className="aspect-[3/4] bg-[#faf8f5] flex flex-col items-center justify-center p-6 text-center">
            <div className="text-[#8b6914] text-[10px] tracking-[3px] uppercase mb-1">Nashoba Valley Winery</div>
            <div className="text-[8px] italic text-[#999] mb-3">presents</div>
            <div className="text-[#2c1810] font-serif text-lg font-bold mb-2">
              {mode === "music" ? "Live Music" : "Upcoming Events"}
            </div>
            <div className="w-10 h-px bg-[#8b6914] mb-3" />
            <div className="space-y-1 text-left w-full px-2">
              <div className="flex items-center gap-1">
                <div className="w-6 h-6 rounded bg-[#e8dcc8]" />
                <div className="flex-1">
                  <div className="text-[8px] font-bold text-[#8b6914]">Sat, Mar 7</div>
                  <div className="text-[9px] font-bold text-[#2c1810]">{mode === "music" ? "John Gauvin" : "Glass Workshop"}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-6 h-6 rounded bg-[#e8dcc8]" />
                <div className="flex-1">
                  <div className="text-[8px] font-bold text-[#8b6914]">Sat, Mar 14</div>
                  <div className="text-[9px] font-bold text-[#2c1810]">{mode === "music" ? "Stroller Daddies" : "Cooking Demo"}</div>
                </div>
              </div>
            </div>
            <div className="text-[7px] text-[#888] mt-3 italic">Elegant serif, warm tones</div>
          </div>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-medium text-sm block">Classic Elegant</span>
                <span className="text-xs text-muted-foreground block">Serif fonts, gold accents</span>
              </div>
              <Button
                size="sm"
                onClick={() => handlePrint("classic")}
                data-testid="button-print-classic"
              >
                <Printer className="w-4 h-4 mr-1" />
                Print
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <div className="aspect-[3/4] bg-white flex flex-col items-center justify-center p-6 text-center">
            <div className="text-[#6b46c1] text-[10px] tracking-[4px] uppercase font-semibold mb-1">Nashoba Valley</div>
            <div className="text-[#1a1a1a] font-sans text-lg font-bold mb-2">
              {mode === "music" ? "Live Music" : "Events"}
            </div>
            <div className="w-full h-px bg-[#e5e5e5] mb-3" />
            <div className="space-y-1 text-left w-full px-2">
              <div className="flex items-center gap-1">
                <div className="w-6 h-6 rounded bg-[#f3f0ff]" />
                <div className="flex-1">
                  <div className="text-[8px] font-semibold text-[#6b46c1]">Sat, Mar 7</div>
                  <div className="text-[9px] font-semibold text-[#1a1a1a]">{mode === "music" ? "John Gauvin" : "Glass Workshop"}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-6 h-6 rounded bg-[#f3f0ff]" />
                <div className="flex-1">
                  <div className="text-[8px] font-semibold text-[#6b46c1]">Sat, Mar 14</div>
                  <div className="text-[9px] font-semibold text-[#1a1a1a]">{mode === "music" ? "Stroller Daddies" : "Cooking Demo"}</div>
                </div>
              </div>
            </div>
            <div className="text-[7px] text-[#999] mt-3">Clean sans-serif, minimal</div>
          </div>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-medium text-sm block">Modern Clean</span>
                <span className="text-xs text-muted-foreground block">Sans-serif, purple accents</span>
              </div>
              <Button
                size="sm"
                onClick={() => handlePrint("modern")}
                data-testid="button-print-modern"
              >
                <Printer className="w-4 h-4 mr-1" />
                Print
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <div className="aspect-[3/4] bg-[#1a1a2e] flex flex-col items-center justify-center p-6 text-center">
            <div className="text-[#e94560] text-[10px] tracking-[4px] uppercase font-semibold mb-1">Nashoba Valley</div>
            <div className="text-white font-sans text-lg font-bold uppercase tracking-wider mb-2">
              {mode === "music" ? "Live Music" : "Events"}
            </div>
            <div className="w-10 h-px bg-[#e94560] mb-3" />
            <div className="space-y-1 text-left w-full px-2">
              <div className="flex items-center gap-1">
                <div className="w-6 h-6 rounded bg-[#2a2a4e]" />
                <div className="flex-1">
                  <div className="text-[8px] font-semibold text-[#e94560]">Sat, Mar 7</div>
                  <div className="text-[9px] font-semibold text-white uppercase">{mode === "music" ? "John Gauvin" : "Glass Workshop"}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-6 h-6 rounded bg-[#2a2a4e]" />
                <div className="flex-1">
                  <div className="text-[8px] font-semibold text-[#e94560]">Sat, Mar 14</div>
                  <div className="text-[9px] font-semibold text-white uppercase">{mode === "music" ? "Stroller Daddies" : "Cooking Demo"}</div>
                </div>
              </div>
            </div>
            <div className="text-[7px] text-[rgba(255,255,255,0.5)] mt-3">Bold uppercase, dark theme</div>
          </div>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-medium text-sm block">Bold & Fun</span>
                <span className="text-xs text-muted-foreground block">Dark theme, red accents</span>
              </div>
              <Button
                size="sm"
                onClick={() => handlePrint("bold")}
                data-testid="button-print-bold"
              >
                <Printer className="w-4 h-4 mr-1" />
                Print
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {filterMode === "date" && !specificDate ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Calendar className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Select a date above to preview and print a single-day flyer.</p>
          </CardContent>
        </Card>
      ) : (filterMode === "range" ? eventCount > 0 : !!specificDate) && (
        <Card>
          <CardContent className="p-0 overflow-hidden rounded-md">
            <div className="bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground border-b flex items-center justify-between gap-2 flex-wrap">
              <span>
                {filterMode === "date" && specificDate
                  ? `Print Preview — ${new Date(specificDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`
                  : `Print Preview (${eventCount} event${eventCount !== 1 ? "s" : ""})`
                }
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePrint(template)}
                data-testid="button-open-print-preview"
              >
                <Printer className="w-4 h-4 mr-1" />
                Open & Print
              </Button>
            </div>
            <iframe
              key={previewUrl}
              src={previewUrl}
              className="w-full border-0"
              style={{ height: "700px" }}
              title="Flyer Preview"
              data-testid="iframe-flyer-preview"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
