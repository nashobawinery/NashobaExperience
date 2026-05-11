import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type SearchModeWordsOrDate = "words" | "date";

export type SpecialDaySearchHit = {
  date: string;
  label: string;
  source: "special_date" | "recurring_holiday";
};

interface WordOrHolidayDateFilterProps {
  mode: SearchModeWordsOrDate;
  onModeChange: (m: SearchModeWordsOrDate) => void;
  wordsValue: string;
  onWordsChange: (v: string) => void;
  wordsPlaceholder?: string;
  pickedYmd: string;
  onPickYmd: (ymd: string) => void;
  compact?: boolean;
  idPrefix?: string;
}

/** Filter by free text vs. a calendar day / named holiday occurrence (special dates DB + recurring list). */
export function WordOrHolidayDateFilter({
  mode,
  onModeChange,
  wordsValue,
  onWordsChange,
  wordsPlaceholder = "Search…",
  pickedYmd,
  onPickYmd,
  compact,
  idPrefix = "wh-filter",
}: WordOrHolidayDateFilterProps) {
  const [openCal, setOpenCal] = useState(false);
  const [nameQuery, setNameQuery] = useState("");
  const deferredName = useDeferredValue(nameQuery.trim());

  const { data: nameHits = [], isFetching } = useQuery<SpecialDaySearchHit[]>({
    queryKey: ["/api/calendar/special-days/search", { q: deferredName, limit: 40 }],
    enabled: mode === "date" && deferredName.length >= 1,
  });

  const calendarDay = useMemo(
    () => (pickedYmd ? new Date(pickedYmd + "T12:00:00") : undefined),
    [pickedYmd],
  );

  return (
    <div className={cn("space-y-3 rounded-md border bg-muted/20 p-3", compact && "space-y-2 p-2")}>
      <RadioGroup
        value={mode}
        onValueChange={(v) => onModeChange(v as SearchModeWordsOrDate)}
        className="flex flex-wrap gap-4"
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="words" id={`${idPrefix}-words`} />
          <Label htmlFor={`${idPrefix}-words`} className="cursor-pointer font-normal">
            By word / text
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="date" id={`${idPrefix}-date`} />
          <Label htmlFor={`${idPrefix}-date`} className="cursor-pointer font-normal">
            By date / holiday
          </Label>
        </div>
      </RadioGroup>

      {mode === "words" ? (
        <div className="space-y-1">
          {!compact && (
            <Label className="text-xs text-muted-foreground">Search</Label>
          )}
          <Input
            placeholder={wordsPlaceholder}
            value={wordsValue}
            onChange={(e) => onWordsChange(e.target.value)}
            data-testid={`${idPrefix}-words-input`}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Calendar day</Label>
              <Popover open={openCal} onOpenChange={setOpenCal}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("justify-start text-left font-normal min-w-[200px]", !pickedYmd && "text-muted-foreground")}
                    data-testid={`${idPrefix}-calendar-trigger`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {pickedYmd
                      ? format(new Date(pickedYmd + "T12:00:00"), "MMM d, yyyy")
                      : "Pick date…"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={calendarDay}
                    onSelect={(day) => {
                      if (!day) return;
                      const ymd = format(day, "yyyy-MM-dd");
                      onPickYmd(ymd);
                      setOpenCal(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            {pickedYmd && (
              <Button variant="ghost" size="sm" onClick={() => onPickYmd("")}>
                Clear date
              </Button>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Or find by name (e.g. Easter) — mixes reservation special dates & recurring holidays
            </Label>
            <Input
              placeholder='Type holiday name…'
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              data-testid={`${idPrefix}-holiday-search`}
            />
            {mode === "date" && deferredName.length >= 1 && (
              <div className="relative rounded-md border bg-background">
                {isFetching && (
                  <div className="absolute right-2 top-2 flex items-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
                <ScrollArea className="h-[min(240px,40vh)]">
                  <ul className="p-1">
                    {nameHits.length === 0 && !isFetching ? (
                      <li className="px-3 py-2 text-sm text-muted-foreground">No matching days</li>
                    ) : (
                      nameHits.map((h) => (
                        <li key={`${h.date}-${h.source}-${h.label}`}>
                          <button
                            type="button"
                            className="flex w-full flex-col rounded-sm px-2 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => {
                              onPickYmd(h.date);
                              setNameQuery("");
                            }}
                            data-testid={`${idPrefix}-hit-${h.date}`}
                          >
                            <span className="font-medium">{h.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(h.date + "T12:00:00"), "EEEE, MMM d, yyyy")}
                              {" · "}
                              {h.source === "special_date" ? "Special date" : "Recurring"}
                            </span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
