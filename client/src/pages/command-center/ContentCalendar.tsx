import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CcContentCalendarEntry } from "@shared/schema";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay,
  addMonths, subMonths, isToday,
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Calendar,
} from "lucide-react";

const CHANNELS = ["email", "sms", "social", "on_site", "print"] as const;
const STATUSES = ["planned", "published", "cancelled"] as const;

const CHANNEL_COLORS: Record<string, string> = {
  email: "bg-blue-500",
  sms: "bg-green-500",
  social: "bg-purple-500",
  on_site: "bg-orange-500",
  print: "bg-gray-500",
};

const CHANNEL_BADGE_VARIANTS: Record<string, string> = {
  email: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  sms: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  social: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  on_site: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  print: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const STATUS_BADGE_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  planned: "outline",
  published: "default",
  cancelled: "destructive",
};

interface EntryFormData {
  date: string;
  channel: string;
  title: string;
  notes: string;
  status: string;
}

const defaultFormData: EntryFormData = {
  date: format(new Date(), "yyyy-MM-dd"),
  channel: "email",
  title: "",
  notes: "",
  status: "planned",
};

export function ContentCalendar() {
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState<EntryFormData>(defaultFormData);
  const [editingEntry, setEditingEntry] = useState<CcContentCalendarEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<CcContentCalendarEntry | null>(null);

  const { data: entries = [], isLoading } = useQuery<CcContentCalendarEntry[]>({
    queryKey: ["/api/growth-studio/calendar"],
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const monthEntries = entries.filter((e) => {
    const d = new Date(e.date);
    return d >= monthStart && d <= monthEnd;
  });

  const stats = {
    planned: monthEntries.filter((e) => e.status === "planned").length,
    published: monthEntries.filter((e) => e.status === "published").length,
    cancelled: monthEntries.filter((e) => e.status === "cancelled").length,
  };

  const channelStats = CHANNELS.reduce((acc, ch) => {
    acc[ch] = monthEntries.filter((e) => e.channel === ch).length;
    return acc;
  }, {} as Record<string, number>);

  const createMutation = useMutation({
    mutationFn: async (data: EntryFormData) => {
      await apiRequest("POST", "/api/growth-studio/calendar", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/growth-studio/calendar"] });
      toast({ title: "Entry created" });
      setAddDialogOpen(false);
      setFormData(defaultFormData);
    },
    onError: () => {
      toast({ title: "Failed to create entry", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EntryFormData }) => {
      await apiRequest("PATCH", `/api/growth-studio/calendar/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/growth-studio/calendar"] });
      toast({ title: "Entry updated" });
      setEditDialogOpen(false);
      setEditingEntry(null);
    },
    onError: () => {
      toast({ title: "Failed to update entry", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/growth-studio/calendar/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/growth-studio/calendar"] });
      toast({ title: "Entry deleted" });
      setDeleteDialogOpen(false);
      setDeletingEntry(null);
    },
    onError: () => {
      toast({ title: "Failed to delete entry", variant: "destructive" });
    },
  });

  const openAddDialog = (date?: Date) => {
    setFormData({
      ...defaultFormData,
      date: date ? format(date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    });
    setAddDialogOpen(true);
  };

  const openEditDialog = (entry: CcContentCalendarEntry) => {
    setEditingEntry(entry);
    setFormData({
      date: entry.date,
      channel: entry.channel,
      title: entry.title,
      notes: entry.notes || "",
      status: entry.status,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (entry: CcContentCalendarEntry) => {
    setDeletingEntry(entry);
    setDeleteDialogOpen(true);
  };

  const getEntriesForDay = (day: Date) =>
    entries.filter((e) => isSameDay(new Date(e.date), day));

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold" data-testid="text-calendar-heading">
            Content Calendar
          </h2>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              onClick={() => openAddDialog()}
              data-testid="button-add-entry"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Calendar Entry</DialogTitle>
            </DialogHeader>
            <EntryForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={() => createMutation.mutate(formData)}
              isPending={createMutation.isPending}
              submitLabel="Create"
              testIdPrefix="add"
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-bold" data-testid="stat-total">{monthEntries.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Planned</p>
            <p className="text-xl font-bold" data-testid="stat-planned">{stats.planned}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Published</p>
            <p className="text-xl font-bold" data-testid="stat-published">{stats.published}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Cancelled</p>
            <p className="text-xl font-bold" data-testid="stat-cancelled">{stats.cancelled}</p>
          </CardContent>
        </Card>
        {CHANNELS.map((ch) => (
          <Card key={ch}>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${CHANNEL_COLORS[ch]}`} />
                <p className="text-xs text-muted-foreground capitalize">{ch.replace("_", " ")}</p>
              </div>
              <p className="text-xl font-bold" data-testid={`stat-channel-${ch}`}>
                {channelStats[ch]}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
          <CardTitle className="text-base" data-testid="text-month-title">
            {format(currentMonth, "MMMM yyyy")}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              data-testid="button-prev-month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
              data-testid="button-today"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              data-testid="button-next-month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <div className="grid grid-cols-7 gap-px">
            {dayNames.map((name) => (
              <div
                key={name}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {name}
              </div>
            ))}
            {calendarDays.map((day) => {
              const dayEntries = getEntriesForDay(day);
              const inMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);
              return (
                <button
                  key={day.toISOString()}
                  className={`min-h-[4.5rem] p-1 border rounded-md text-left transition-colors ${
                    !inMonth ? "opacity-40" : ""
                  } ${today ? "border-primary bg-primary/5" : "border-border"} hover-elevate`}
                  onClick={() => openAddDialog(day)}
                  data-testid={`button-day-${format(day, "yyyy-MM-dd")}`}
                >
                  <span
                    className={`text-xs font-medium ${
                      today ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {dayEntries.map((entry) => (
                      <span
                        key={entry.id}
                        className={`h-2 w-2 rounded-full ${CHANNEL_COLORS[entry.channel]}`}
                        title={`${entry.channel}: ${entry.title}`}
                        data-testid={`dot-entry-${entry.id}`}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Entries for {format(currentMonth, "MMMM yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground" data-testid="text-loading">
              Loading...
            </p>
          ) : monthEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-entries">
              No entries this month.
            </p>
          ) : (
            <div className="space-y-2">
              {monthEntries
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-md border"
                    data-testid={`entry-row-${entry.id}`}
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(entry.date), "MMM d")}
                        </span>
                        <Badge
                          className={`text-xs no-default-hover-elevate no-default-active-elevate ${CHANNEL_BADGE_VARIANTS[entry.channel]}`}
                        >
                          {entry.channel.replace("_", " ")}
                        </Badge>
                        <Badge variant={STATUS_BADGE_VARIANTS[entry.status]} className="text-xs">
                          {entry.status}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium" data-testid={`text-entry-title-${entry.id}`}>
                        {entry.title}
                      </p>
                      {entry.notes && (
                        <p className="text-xs text-muted-foreground">{entry.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(entry)}
                        data-testid={`button-edit-entry-${entry.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(entry)}
                        data-testid={`button-delete-entry-${entry.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Calendar Entry</DialogTitle>
          </DialogHeader>
          {editingEntry && (
            <EntryForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={() =>
                updateMutation.mutate({ id: editingEntry.id, data: formData })
              }
              isPending={updateMutation.isPending}
              submitLabel="Save"
              testIdPrefix="edit"
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Entry</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete "{deletingEntry?.title}"?
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingEntry && deleteMutation.mutate(deletingEntry.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EntryForm({
  formData,
  setFormData,
  onSubmit,
  isPending,
  submitLabel,
  testIdPrefix,
}: {
  formData: EntryFormData;
  setFormData: (data: EntryFormData) => void;
  onSubmit: () => void;
  isPending: boolean;
  submitLabel: string;
  testIdPrefix: string;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${testIdPrefix}-date`}>Date</Label>
        <Input
          id={`${testIdPrefix}-date`}
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          data-testid={`input-${testIdPrefix}-date`}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${testIdPrefix}-channel`}>Channel</Label>
        <Select
          value={formData.channel}
          onValueChange={(v) => setFormData({ ...formData, channel: v })}
        >
          <SelectTrigger data-testid={`select-${testIdPrefix}-channel`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHANNELS.map((ch) => (
              <SelectItem key={ch} value={ch} data-testid={`option-${testIdPrefix}-channel-${ch}`}>
                {ch.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${testIdPrefix}-title`}>Title</Label>
        <Input
          id={`${testIdPrefix}-title`}
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Entry title"
          data-testid={`input-${testIdPrefix}-title`}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${testIdPrefix}-notes`}>Notes</Label>
        <Textarea
          id={`${testIdPrefix}-notes`}
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Optional notes"
          data-testid={`input-${testIdPrefix}-notes`}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${testIdPrefix}-status`}>Status</Label>
        <Select
          value={formData.status}
          onValueChange={(v) => setFormData({ ...formData, status: v })}
        >
          <SelectTrigger data-testid={`select-${testIdPrefix}-status`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} data-testid={`option-${testIdPrefix}-status-${s}`}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button
          onClick={onSubmit}
          disabled={isPending || !formData.title.trim()}
          data-testid={`button-${testIdPrefix}-submit`}
        >
          {isPending ? "Saving..." : submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );
}
