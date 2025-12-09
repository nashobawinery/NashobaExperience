import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Clock, Calendar, Gauge, Timer, CalendarOff, Plus, Pencil, Trash2, Loader2, Pause, Play, Ticket, ExternalLink } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Location, LocationTable, InsertLocationTable, MealPeriod, InsertMealPeriod, OperatingHours, InsertOperatingHours, FlowControl, InsertFlowControl, TurnTimeSettings, InsertTurnTimeSettings } from "@shared/schema";
import { insertLocationTableSchema, insertMealPeriodSchema, insertOperatingHoursSchema, insertFlowControlSchema, insertTurnTimeSettingsSchema } from "@shared/schema";

const MEAL_PERIOD_NAMES = ["breakfast", "lunch", "dinner", "brunch", "retail", "other"];
const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime12Hour(time24: string | null | undefined): string {
  if (!time24) return "";
  const [hours, minutes] = time24.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return time24;
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function TimeInput12Hour({ 
  value, 
  onChange,
  "data-testid": testId 
}: { 
  value: string; 
  onChange: (value: string) => void;
  "data-testid"?: string;
}) {
  const parse24Hour = (time24: string) => {
    if (!time24) return { hour: "", minute: "", period: "PM" as "AM" | "PM" };
    const [h, m] = time24.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return { hour: "", minute: "", period: "PM" as "AM" | "PM" };
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return { hour: hour12.toString(), minute: m.toString().padStart(2, "0"), period };
  };

  const { hour, minute, period } = parse24Hour(value);

  const buildTime24 = (h: string, m: string, p: string) => {
    if (!h || !m) return "";
    let hour24 = parseInt(h);
    if (p === "PM" && hour24 !== 12) hour24 += 12;
    if (p === "AM" && hour24 === 12) hour24 = 0;
    return `${hour24.toString().padStart(2, "0")}:${m.padStart(2, "0")}`;
  };

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const minutes = ["00", "15", "30", "45"];

  return (
    <div className="flex items-center gap-2" data-testid={testId}>
      <Select 
        value={hour} 
        onValueChange={(h) => onChange(buildTime24(h, minute || "00", period))}
      >
        <SelectTrigger className="w-20" data-testid={`${testId}-hour`}>
          <SelectValue placeholder="Hour" />
        </SelectTrigger>
        <SelectContent>
          {hours.map((h) => (
            <SelectItem key={h} value={h}>{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground">:</span>
      <Select 
        value={minute} 
        onValueChange={(m) => onChange(buildTime24(hour || "12", m, period))}
      >
        <SelectTrigger className="w-20" data-testid={`${testId}-minute`}>
          <SelectValue placeholder="Min" />
        </SelectTrigger>
        <SelectContent>
          {minutes.map((m) => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select 
        value={period} 
        onValueChange={(p) => onChange(buildTime24(hour || "12", minute || "00", p))}
      >
        <SelectTrigger className="w-20" data-testid={`${testId}-period`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
      {value && (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => onChange("")}
          className="text-muted-foreground"
        >
          Clear
        </Button>
      )}
    </div>
  );
}

export default function AdminLocationDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const locationId = params.id;

  const { data: location, isLoading } = useQuery<Location>({
    queryKey: ["/api/resy/locations", locationId],
    enabled: !!locationId,
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="h-8 bg-muted rounded animate-pulse w-1/3" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!location) {
    return (
      <div className="space-y-8">
        <Button
          variant="ghost"
          onClick={() => setLocation("/reservations/admin/locations")}
          data-testid="button-back-to-locations"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Locations
        </Button>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Location not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button
            variant="ghost"
            onClick={() => setLocation("/reservations/admin/locations")}
            data-testid="button-back-to-locations"
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Locations
          </Button>
          <h1 className="font-serif text-3xl md:text-4xl font-semibold">{location.name}</h1>
          {location.description && (
            <p className="text-muted-foreground">{location.description}</p>
          )}
        </div>
      </div>

      {/* Ticketed Event Locations - show content directly without tabs */}
      {location.isTicketedEventLocation && (
        <TicketedEventsTab locationId={locationId!} />
      )}

      {/* Table Reservation Locations - show tabbed interface */}
      {location.isReservationLocation && (
        <Tabs defaultValue="tables" className="space-y-6">
          <TabsList data-testid="tabs-location-detail">
            <TabsTrigger value="tables" data-testid="tab-tables">
              <Users className="w-3 h-3 mr-2" />
              Tables
            </TabsTrigger>
            <TabsTrigger value="service-periods" data-testid="tab-service-periods">
              <Clock className="w-3 h-3 mr-2" />
              Service Periods
            </TabsTrigger>
            <TabsTrigger value="operating-hours" data-testid="tab-operating-hours">
              <Calendar className="w-3 h-3 mr-2" />
              Operating Hours
            </TabsTrigger>
            <TabsTrigger value="flow-controls" data-testid="tab-flow-controls">
              <Gauge className="w-3 h-3 mr-2" />
              Flow Controls
            </TabsTrigger>
            <TabsTrigger value="turn-times" data-testid="tab-turn-times">
              <Timer className="w-3 h-3 mr-2" />
              Turn Times
            </TabsTrigger>
            <TabsTrigger value="special-dates" data-testid="tab-special-dates">
              <CalendarOff className="w-3 h-3 mr-2" />
              Special Dates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tables">
            <TablesTab locationId={locationId!} />
          </TabsContent>

          <TabsContent value="service-periods">
            <ServicePeriodsTab locationId={locationId!} />
          </TabsContent>

          <TabsContent value="operating-hours">
            <OperatingHoursTab locationId={locationId!} location={location} />
          </TabsContent>

          <TabsContent value="flow-controls">
            <FlowControlsTab locationId={locationId!} />
          </TabsContent>

          <TabsContent value="turn-times">
            <TurnTimesTab locationId={locationId!} />
          </TabsContent>

          <TabsContent value="special-dates">
            <SpecialDatesRedirectTab locationId={locationId!} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// Tables Tab - Table management for this location
function TablesTab({ locationId }: { locationId: string }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<LocationTable | null>(null);

  const { data: allTables, isLoading: tablesLoading } = useQuery<LocationTable[]>({
    queryKey: ["/api/resy/location-tables"],
  });

  const tables = allTables?.filter(t => t.locationId === locationId) || [];

  const handleEdit = (table: LocationTable) => {
    setEditingTable(table);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingTable(null);
    setIsDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tables</CardTitle>
            <Button
              onClick={handleAdd}
              data-testid="button-add-table"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Table
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tablesLoading ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : tables.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {tables.map((table) => (
                <TableCard
                  key={table.id}
                  table={table}
                  allTables={tables}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No tables configured for this location</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTable ? "Edit Table" : "Add New Table"}
            </DialogTitle>
            <DialogDescription>
              {editingTable
                ? "Update table configuration"
                : "Add a new table to this location"}
            </DialogDescription>
          </DialogHeader>
          <TableForm
            table={editingTable}
            locationId={locationId}
            allTables={tables}
            onSuccess={() => {
              setIsDialogOpen(false);
              setEditingTable(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function TableCard({ 
  table, 
  allTables,
  onEdit 
}: { 
  table: LocationTable; 
  allTables: LocationTable[];
  onEdit: (table: LocationTable) => void;
}) {
  const { toast } = useToast();

  const pauseMutation = useMutation<LocationTable, Error, void>({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/resy/location-tables/${table.id}/toggle-pause`, {});
      return await res.json();
    },
    onSuccess: (updatedTable: LocationTable) => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/location-tables"] });
      toast({
        title: updatedTable.isPaused ? "Table Paused" : "Table Unpaused",
        description: `Table ${table.tableLabel} is now ${updatedTable.isPaused ? 'paused' : 'available'} for reservations`,
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/resy/location-tables/${table.id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/location-tables"] });
      toast({
        title: "Table Deleted",
        description: "The table has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const combinedWithTables = allTables.filter(t => 
    table.combinableWith?.includes(t.id)
  );

  const totalCombinedCapacity = combinedWithTables.length > 0
    ? table.maxCapacity + combinedWithTables.reduce((sum, t) => sum + t.maxCapacity, 0)
    : null;

  return (
    <div className="border rounded-md p-4 space-y-3 hover-elevate">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="outline" className="text-sm font-semibold">
              Table {table.tableLabel}
            </Badge>
            {table.isCommunal && (
              <Badge variant="default">Communal</Badge>
            )}
            {!table.isActive && (
              <Badge variant="secondary">Inactive</Badge>
            )}
            {table.isPaused && (
              <Badge variant="secondary">Paused</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-3 h-3" />
            <span>{table.minCapacity}-{table.maxCapacity} people</span>
          </div>
          {combinedWithTables.length > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              <span className="font-medium">Combines with:</span> {combinedWithTables.map(t => t.tableLabel).join(", ")}
              {totalCombinedCapacity && (
                <span className="ml-1">(up to {totalCombinedCapacity} people)</span>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(table)}
            data-testid={`button-edit-table-${table.id}`}
          >
            <Pencil className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => pauseMutation.mutate()}
            disabled={pauseMutation.isPending}
            data-testid={`button-pause-table-${table.id}`}
            title={table.isPaused ? "Unpause table" : "Pause table"}
          >
            {pauseMutation.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : table.isPaused ? (
              <Play className="w-3 h-3" />
            ) : (
              <Pause className="w-3 h-3" />
            )}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid={`button-delete-table-${table.id}`}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Table {table.tableLabel}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this table. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

function TableForm({ 
  table, 
  locationId, 
  allTables,
  onSuccess 
}: { 
  table: LocationTable | null; 
  locationId: string;
  allTables: LocationTable[];
  onSuccess: () => void;
}) {
  const { toast } = useToast();

  const form = useForm<InsertLocationTable>({
    resolver: zodResolver(insertLocationTableSchema),
    defaultValues: {
      locationId: locationId,
      tableLabel: "",
      minCapacity: 2,
      maxCapacity: 4,
      combinableWith: [],
      isCommunal: false,
      isActive: true,
    },
  });

  // Reset form when table changes (for editing existing tables)
  useEffect(() => {
    if (table) {
      form.reset({
        locationId: table.locationId,
        tableLabel: table.tableLabel,
        minCapacity: table.minCapacity,
        maxCapacity: table.maxCapacity,
        combinableWith: table.combinableWith || [],
        isCommunal: table.isCommunal ?? false,
        isActive: table.isActive,
      });
    } else {
      form.reset({
        locationId: locationId,
        tableLabel: "",
        minCapacity: 2,
        maxCapacity: 4,
        combinableWith: [],
        isCommunal: false,
        isActive: true,
      });
    }
  }, [table, locationId, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: InsertLocationTable) => {
      if (table) {
        await apiRequest("PATCH", `/api/resy/location-tables/${table.id}`, data);
      } else {
        await apiRequest("POST", "/api/resy/location-tables", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/location-tables"] });
      toast({
        title: table ? "Table Updated" : "Table Created",
        description: `The table has been ${table ? "updated" : "created"} successfully`,
      });
      onSuccess();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertLocationTable) => {
    saveMutation.mutate(data);
  };

  const availableTablesForCombination = allTables.filter(t => 
    !table || t.id !== table.id
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="tableLabel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Table Label *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="1, 2A, PT10, etc."
                  maxLength={5}
                  data-testid="input-table-label"
                />
              </FormControl>
              <FormDescription>
                Alphanumeric identifier (max 5 characters)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="minCapacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min Capacity *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min={1}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                    data-testid="input-min-capacity"
                  />
                </FormControl>
                <FormDescription>
                  Minimum party size
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxCapacity"
            render={({ field}) => (
              <FormItem>
                <FormLabel>Max Capacity *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min={1}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                    data-testid="input-max-capacity"
                  />
                </FormControl>
                <FormDescription>
                  Maximum party size
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {availableTablesForCombination.length > 0 && (
          <FormField
            control={form.control}
            name="combinableWith"
            render={({ field }) => {
              const selectedTables = availableTablesForCombination.filter(t => 
                field.value?.includes(t.id)
              );
              const minCapacity = form.watch("minCapacity") || 0;
              const maxCapacity = form.watch("maxCapacity") || 0;
              const combinedMinCapacity = selectedTables.length > 0
                ? minCapacity + selectedTables.reduce((sum, t) => sum + t.minCapacity, 0)
                : null;
              const combinedMaxCapacity = selectedTables.length > 0
                ? maxCapacity + selectedTables.reduce((sum, t) => sum + t.maxCapacity, 0)
                : null;

              return (
                <FormItem>
                  <FormLabel>Combinable With (Optional)</FormLabel>
                  <FormDescription className="mb-3">
                    Select tables that can be combined with this one for larger parties
                  </FormDescription>
                  <div className="space-y-2">
                    {availableTablesForCombination.map((otherTable) => (
                      <div key={otherTable.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`combine-${otherTable.id}`}
                          checked={field.value?.includes(otherTable.id) || false}
                          onChange={(e) => {
                            const currentValue = field.value || [];
                            if (e.target.checked) {
                              field.onChange([...currentValue, otherTable.id]);
                            } else {
                              field.onChange(currentValue.filter(id => id !== otherTable.id));
                            } }}
                          className="rounded border-input"
                          data-testid={`checkbox-combine-${otherTable.id}`}
                        />
                        <label htmlFor={`combine-${otherTable.id}`} className="text-sm">
                          Table {otherTable.tableLabel} ({otherTable.minCapacity}-{otherTable.maxCapacity} people)
                        </label>
                      </div>
                    ))}
                  </div>
                  {combinedMinCapacity && combinedMaxCapacity && (
                    <div className="mt-3 p-3 bg-muted rounded-md text-sm">
                      <span className="font-medium">Combined capacity:</span>{" "}
                      {combinedMinCapacity}-{combinedMaxCapacity} people
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        )}

        <FormField
          control={form.control}
          name="isCommunal"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="checkbox-communal"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Communal Table</FormLabel>
                <FormDescription>
                  A communal table allows multiple reservations to be booked so that people who may not know each other are seated together, 
                  with all reservations starting at the same time. The table remains open for additional reservations until all seats are filled. 
                  Turn time is based on the total number of guests at the table. If this option is not selected, the table when booked will be 
                  unavailable for another reservation regardless of the number of people, and will remain unavailable until after the turn time 
                  for the number of people at the table has expired.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button
            type="submit"
            disabled={saveMutation.isPending}
            data-testid="button-save-table"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              table ? "Update Table" : "Create Table"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Service Periods Tab (formerly Meal Periods) - Service period management for this location
function ServicePeriodsTab({ locationId }: { locationId: string }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<MealPeriod | null>(null);

  const { data: periods, isLoading: periodsLoading } = useQuery<MealPeriod[]>({
    queryKey: ["/api/resy/locations", locationId, "meal-periods"],
  });

  const handleEdit = (period: MealPeriod) => {
    setEditingPeriod(period);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingPeriod(null);
    setIsDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Service Periods</CardTitle>
            <Button
              onClick={handleAdd}
              data-testid="button-add-service-period"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Service Period
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {periodsLoading ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : periods && periods.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {periods.map((period) => (
                <ServicePeriodCard
                  key={period.id}
                  period={period}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No service periods configured for this location</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPeriod ? "Edit Service Period" : "Add New Service Period"}
            </DialogTitle>
            <DialogDescription>
              {editingPeriod
                ? "Update service period configuration"
                : "Add a new service period to this location"}
            </DialogDescription>
          </DialogHeader>
          <ServicePeriodForm
            period={editingPeriod}
            locationId={locationId}
            onSuccess={() => {
              setIsDialogOpen(false);
              setEditingPeriod(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function ServicePeriodCard({ period, onEdit }: { period: MealPeriod; onEdit: (period: MealPeriod) => void }) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/resy/meal-periods/${period.id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/locations", period.locationId, "meal-periods"] });
      toast({
        title: "Service Period Deleted",
        description: "The service period has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="border rounded-md p-4 space-y-3 hover-elevate">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-sm font-semibold capitalize">
              {period.name}
            </Badge>
            {!period.isActive && (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{formatTime12Hour(period.startTime)} - {formatTime12Hour(period.endTime)}</span>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(period)}
            data-testid={`button-edit-service-period-${period.id}`}
          >
            <Pencil className="w-3 h-3" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid={`button-delete-service-period-${period.id}`}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {period.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this service period. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

function ServicePeriodForm({ 
  period, 
  locationId, 
  onSuccess 
}: { 
  period: MealPeriod | null; 
  locationId: string;
  onSuccess: () => void;
}) {
  const { toast } = useToast();

  const form = useForm<InsertMealPeriod>({
    resolver: zodResolver(insertMealPeriodSchema),
    defaultValues: {
      locationId: locationId,
      name: "lunch",
      startTime: "11:00",
      endTime: "14:00",
      isActive: true,
    },
  });

  // Reset form when period changes (for editing existing periods)
  useEffect(() => {
    if (period) {
      form.reset({
        locationId: period.locationId,
        name: period.name,
        startTime: period.startTime,
        endTime: period.endTime,
        isActive: period.isActive,
      });
    } else {
      form.reset({
        locationId: locationId,
        name: "lunch",
        startTime: "11:00",
        endTime: "14:00",
        isActive: true,
      });
    }
  }, [period, locationId, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: InsertMealPeriod) => {
      if (period) {
        await apiRequest("PATCH", `/api/resy/meal-periods/${period.id}`, data);
      } else {
        await apiRequest("POST", "/api/resy/meal-periods", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/locations", locationId, "meal-periods"] });
      toast({
        title: period ? "Service Period Updated" : "Service Period Created",
        description: `The service period has been ${period ? "updated" : "created"} successfully`,
      });
      onSuccess();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertMealPeriod) => {
    saveMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service Period Name *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-service-period-name">
                    <SelectValue placeholder="Select service period" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {MEAL_PERIOD_NAMES.map((name) => (
                    <SelectItem key={name} value={name}>
                      <span className="capitalize">{name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="time"
                    data-testid="input-start-time"
                  />
                </FormControl>
                <FormDescription>
                  Format: HH:MM (24-hour)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="time"
                    data-testid="input-end-time"
                  />
                </FormControl>
                <FormDescription>
                  Format: HH:MM (24-hour)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="checkbox-is-active"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Active</FormLabel>
                <FormDescription>
                  Enable this service period for reservations
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button
            type="submit"
            disabled={saveMutation.isPending}
            data-testid="button-save-service-period"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              period ? "Update Service Period" : "Create Service Period"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Operating Hours Tab - Operating hours for service periods at this location
function OperatingHoursTab({ locationId, location }: { locationId: string; location: Location }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHours, setEditingHours] = useState<OperatingHours | null>(null);
  const [selectedMealPeriodId, setSelectedMealPeriodId] = useState<string>("");
  const [isCloseTimeDialogOpen, setIsCloseTimeDialogOpen] = useState(false);
  const [reservationCloseTime, setReservationCloseTime] = useState(location.reservationCloseTime || "");

  const { data: periods, isLoading: periodsLoading } = useQuery<MealPeriod[]>({
    queryKey: ["/api/resy/locations", locationId, "meal-periods"],
  });

  const { data: allHours, isLoading: hoursLoading } = useQuery<OperatingHours[]>({
    queryKey: ["/api/resy/locations", locationId, "operating-hours"],
  });

  const updateCloseTimeMutation = useMutation({
    mutationFn: async (closeTime: string) => {
      await apiRequest("PUT", `/api/resy/locations/${locationId}`, {
        ...location,
        reservationCloseTime: closeTime || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/locations", locationId] });
      toast({
        title: "Reservation Close Time Updated",
        description: reservationCloseTime ? `Reservations will close at ${formatTime12Hour(reservationCloseTime)}` : "Using service period end times",
      });
      setIsCloseTimeDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const operatingHours = allHours || [];

  const groupedHours = operatingHours.reduce((acc, hours) => {
    const periodId = hours.mealPeriodId || "unassigned";
    if (!acc[periodId]) {
      acc[periodId] = [];
    }
    acc[periodId].push(hours);
    return acc;
  }, {} as Record<string, OperatingHours[]>);

  const handleEdit = (hours: OperatingHours) => {
    setEditingHours(hours);
    setSelectedMealPeriodId(hours.mealPeriodId || "");
    setIsDialogOpen(true);
  };

  const handleAdd = (mealPeriodId: string) => {
    setEditingHours(null);
    setSelectedMealPeriodId(mealPeriodId);
    setIsDialogOpen(true);
  };

  return (
    <>
      {/* Reservation Close Time Setting */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Reservation Close Time</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Override when reservations stop being accepted
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReservationCloseTime(location.reservationCloseTime || "");
                setIsCloseTimeDialogOpen(true);
              }}
              data-testid="button-edit-close-time"
            >
              <Pencil className="w-3 h-3 mr-2" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {location.reservationCloseTime ? (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>Last reservation at <strong>{formatTime12Hour(location.reservationCloseTime)}</strong></span>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Not set - using service period end times
            </p>
          )}
        </CardContent>
      </Card>

      {/* Close Time Dialog */}
      <Dialog open={isCloseTimeDialogOpen} onOpenChange={setIsCloseTimeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Reservation Close Time</DialogTitle>
            <DialogDescription>
              Set the last time reservations can be made. Leave empty to use service period end times.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Close Time</label>
              <TimeInput12Hour
                value={reservationCloseTime}
                onChange={setReservationCloseTime}
                data-testid="input-reservation-close-time"
              />
              <p className="text-sm text-muted-foreground">
                Example: Set to 7:30 PM to stop taking reservations even if the location closes later.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setIsCloseTimeDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => updateCloseTimeMutation.mutate(reservationCloseTime)}
                disabled={updateCloseTimeMutation.isPending}
                data-testid="button-save-close-time"
              >
                {updateCloseTimeMutation.isPending ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {periodsLoading || hoursLoading ? (
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 bg-muted rounded animate-pulse w-1/3" />
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : periods && periods.length > 0 ? (
        <div className="grid gap-6">
          {periods.map((period) => (
            <Card key={period.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl capitalize">{period.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatTime12Hour(period.startTime)} - {formatTime12Hour(period.endTime)}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleAdd(period.id)}
                    size="sm"
                    data-testid={`button-add-operating-hours-${period.id}`}
                  >
                    <Plus className="w-3 h-3 mr-2" />
                    Add Day
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {groupedHours[period.id]?.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {groupedHours[period.id]
                      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                      .map((hours) => (
                        <OperatingHoursCard
                          key={hours.id}
                          hours={hours}
                          locationId={locationId}
                          onEdit={handleEdit}
                        />
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No operating hours configured for this service period</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">No service periods found. Create service periods first.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingHours ? "Edit Operating Hours" : "Add Operating Hours"}
            </DialogTitle>
            <DialogDescription>
              {editingHours
                ? "Update operating hours configuration"
                : "Add operating hours for a specific day"}
            </DialogDescription>
          </DialogHeader>
          <OperatingHoursForm
            hours={editingHours}
            mealPeriodId={selectedMealPeriodId}
            locationId={locationId}
            onSuccess={() => {
              setIsDialogOpen(false);
              setEditingHours(null);
              setSelectedMealPeriodId("");
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function OperatingHoursCard({ hours, locationId, onEdit }: { hours: OperatingHours; locationId: string; onEdit: (hours: OperatingHours) => void }) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/resy/operating-hours/${hours.id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/locations", locationId, "operating-hours"] });
      queryClient.invalidateQueries({ queryKey: ["/api/resy/locations", locationId, "meal-periods"] });
      toast({
        title: "Operating Hours Deleted",
        description: "The operating hours have been deleted successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="border rounded-md p-4 space-y-3 hover-elevate">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-sm font-semibold">
              {DAYS_OF_WEEK[hours.dayOfWeek]}
            </Badge>
            {!hours.isOpen && (
              <Badge variant="secondary">Closed</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(hours)}
            data-testid={`button-edit-operating-hours-${hours.id}`}
          >
            <Pencil className="w-3 h-3" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid={`button-delete-operating-hours-${hours.id}`}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {DAYS_OF_WEEK[hours.dayOfWeek]}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete these operating hours. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

function OperatingHoursForm({
  hours,
  mealPeriodId,
  locationId,
  onSuccess
}: {
  hours: OperatingHours | null;
  mealPeriodId: string;
  locationId: string;
  onSuccess: () => void;
}) {
  const { toast } = useToast();

  const form = useForm<InsertOperatingHours>({
    resolver: zodResolver(insertOperatingHoursSchema),
    defaultValues: hours ? {
      mealPeriodId: hours.mealPeriodId,
      dayOfWeek: hours.dayOfWeek,
      isOpen: hours.isOpen,
    } : {
      mealPeriodId: mealPeriodId,
      dayOfWeek: 1,
      isOpen: true,
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: InsertOperatingHours) => {
      if (hours) {
        await apiRequest("PATCH", `/api/operating-hours/${hours.id}`, data);
      } else {
        await apiRequest("POST", "/api/resy/operating-hours", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/locations", locationId, "operating-hours"] });
      queryClient.invalidateQueries({ queryKey: ["/api/resy/locations", locationId, "meal-periods"] });
      toast({
        title: hours ? "Operating Hours Updated" : "Operating Hours Created",
        description: `The operating hours have been ${hours ? "updated" : "created"} successfully`,
      });
      onSuccess();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertOperatingHours) => {
    saveMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="dayOfWeek"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Day of Week *</FormLabel>
              <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value?.toString()}>
                <FormControl>
                  <SelectTrigger data-testid="select-day-of-week">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isOpen"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="checkbox-is-open"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Open</FormLabel>
                <FormDescription>
                  Enable this day for reservations
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button
            type="submit"
            disabled={saveMutation.isPending}
            data-testid="button-save-operating-hours"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              hours ? "Update Operating Hours" : "Create Operating Hours"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Flow Controls Tab - Pacing rules for table-based reservations at this location
function FlowControlsTab({ locationId }: { locationId: string }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingControl, setEditingControl] = useState<FlowControl | null>(null);

  const { data: periods } = useQuery<MealPeriod[]>({
    queryKey: ["/api/resy/locations", locationId, "meal-periods"],
  });

  const { data: controls, isLoading: controlsLoading } = useQuery<FlowControl[]>({
    queryKey: ["/api/resy/locations", locationId, "flow-controls"],
  });

  const getPeriodName = (periodId: string | null) => {
    if (!periodId) return "All Service Periods";
    const period = periods?.find(p => p.id === periodId);
    return period ? period.name : "Unknown";
  };

  const handleEdit = (control: FlowControl) => {
    setEditingControl(control);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingControl(null);
    setIsDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Flow Controls</CardTitle>
            <Button
              onClick={handleAdd}
              data-testid="button-add-flow-control"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Flow Control
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {controlsLoading ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : controls && controls.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {controls.map((control) => (
                <FlowControlCard
                  key={control.id}
                  control={control}
                  periodName={getPeriodName(control.mealPeriodId)}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No flow controls configured for this location</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingControl ? "Edit Flow Control" : "Add New Flow Control"}
            </DialogTitle>
            <DialogDescription>
              Configure pacing rules for managing reservation flow
            </DialogDescription>
          </DialogHeader>
          <FlowControlForm
            control={editingControl}
            locationId={locationId}
            periods={periods || []}
            onSuccess={() => {
              setIsDialogOpen(false);
              setEditingControl(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function FlowControlCard({ control, periodName, onEdit }: { control: FlowControl; periodName: string; onEdit: (control: FlowControl) => void }) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/resy/flow-controls/${control.id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/locations", control.locationId, "flow-controls"] });
      toast({
        title: "Flow Control Deleted",
        description: "The flow control has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="border rounded-md p-4 space-y-3 hover-elevate">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm font-semibold">
              {periodName}
            </Badge>
            {!control.isActive && (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Interval: {control.intervalMinutes} min</Badge>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            {control.maxCoversPerInterval && (
              <div>Max per interval: {control.maxCoversPerInterval} covers</div>
            )}
            {control.maxDailyCovers && (
              <div>Max daily: {control.maxDailyCovers} covers</div>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(control)}
            data-testid={`button-edit-flow-control-${control.id}`}
          >
            <Pencil className="w-3 h-3" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid={`button-delete-flow-control-${control.id}`}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Flow Control?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this flow control. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

function FlowControlForm({
  control,
  locationId,
  periods,
  onSuccess
}: {
  control: FlowControl | null;
  locationId: string;
  periods: MealPeriod[];
  onSuccess: () => void;
}) {
  const { toast } = useToast();

  const form = useForm<InsertFlowControl>({
    resolver: zodResolver(insertFlowControlSchema),
    defaultValues: control ? {
      locationId: control.locationId,
      mealPeriodId: control.mealPeriodId,
      intervalMinutes: control.intervalMinutes,
      maxCoversPerInterval: control.maxCoversPerInterval,
      maxDailyCovers: control.maxDailyCovers,
      isActive: control.isActive,
    } : {
      locationId: locationId,
      mealPeriodId: null,
      intervalMinutes: 15,
      maxCoversPerInterval: 20,
      maxDailyCovers: null,
      isActive: true,
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: InsertFlowControl) => {
      if (control) {
        await apiRequest("PATCH", `/api/flow-controls/${control.id}`, data);
      } else {
        await apiRequest("POST", "/api/resy/flow-controls", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/locations", locationId, "flow-controls"] });
      toast({
        title: control ? "Flow Control Updated" : "Flow Control Created",
        description: `The flow control has been ${control ? "updated" : "created"} successfully`,
      });
      onSuccess();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertFlowControl) => {
    saveMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="mealPeriodId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service Period</FormLabel>
              <Select onValueChange={(val) => field.onChange(val === "all" ? null : val)} value={field.value || "all"}>
                <FormControl>
                  <SelectTrigger data-testid="select-meal-period">
                    <SelectValue placeholder="Select service period" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="all">All Service Periods</SelectItem>
                  {periods.map((period) => (
                    <SelectItem key={period.id} value={period.id}>
                      {period.name} ({formatTime12Hour(period.startTime)} - {formatTime12Hour(period.endTime)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Apply to a specific service period or all periods at this location
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="intervalMinutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Interval (Minutes) *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  min="1"
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                  data-testid="input-interval-minutes"
                />
              </FormControl>
              <FormDescription>
                Time interval for pacing reservations
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="maxCoversPerInterval"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Covers per Interval</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min="0"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                    data-testid="input-max-covers-per-interval"
                  />
                </FormControl>
                <FormDescription>
                  Optional limit
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxDailyCovers"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Daily Covers</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min="0"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                    data-testid="input-max-daily-covers"
                  />
                </FormControl>
                <FormDescription>
                  Optional daily limit
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="checkbox-is-active"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Active</FormLabel>
                <FormDescription>
                  Enable this flow control rule
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button
            type="submit"
            disabled={saveMutation.isPending}
            data-testid="button-save-flow-control"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              control ? "Update Flow Control" : "Create Flow Control"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Turn Times Tab - Expected dining duration settings for this location
function TurnTimesTab({ locationId }: { locationId: string }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTurnTime, setEditingTurnTime] = useState<TurnTimeSettings | null>(null);

  const { data: periods } = useQuery<MealPeriod[]>({
    queryKey: ["/api/resy/locations", locationId, "meal-periods"],
  });

  const { data: turnTimes, isLoading: timesLoading } = useQuery<TurnTimeSettings[]>({
    queryKey: ["/api/resy/locations", locationId, "turn-times"],
  });

  const getPeriodName = (periodId: string | null) => {
    if (!periodId) return "All Service Periods";
    const period = periods?.find(p => p.id === periodId);
    return period ? period.name : "Unknown";
  };

  const handleEdit = (time: TurnTimeSettings) => {
    setEditingTurnTime(time);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingTurnTime(null);
    setIsDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Turn Times</CardTitle>
            <Button
              onClick={handleAdd}
              data-testid="button-add-turn-time"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Turn Time
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {timesLoading ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : turnTimes && turnTimes.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {turnTimes.map((time) => (
                <TurnTimeCard
                  key={time.id}
                  turnTime={time}
                  periodName={getPeriodName(time.mealPeriodId)}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No turn times configured for this location</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTurnTime ? "Edit Turn Time" : "Add New Turn Time"}
            </DialogTitle>
            <DialogDescription>
              Configure expected dining duration for different party sizes
            </DialogDescription>
          </DialogHeader>
          <TurnTimeForm
            turnTime={editingTurnTime}
            locationId={locationId}
            onSuccess={() => {
              setIsDialogOpen(false);
              setEditingTurnTime(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function TurnTimeCard({ 
  turnTime, 
  periodName,
  onEdit 
}: { 
  turnTime: TurnTimeSettings; 
  periodName: string;
  onEdit: (time: TurnTimeSettings) => void 
}) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/resy/turn-times/${turnTime.id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/locations", turnTime.locationId, "turn-times"] });
      toast({
        title: "Turn Time Deleted",
        description: "The turn time has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="border rounded-md p-4 space-y-3 hover-elevate">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">
              {turnTime.minPartySize === turnTime.maxPartySize 
                ? `${turnTime.minPartySize} guest${turnTime.minPartySize > 1 ? 's' : ''}`
                : `${turnTime.minPartySize}-${turnTime.maxPartySize} guests`
              }
            </Badge>
            {!turnTime.isActive && (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            Duration: {turnTime.durationMinutes} minutes
          </div>
          <div className="text-xs text-muted-foreground">
            Service Period: <span className="font-medium">{periodName}</span>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(turnTime)}
            data-testid={`button-edit-turn-time-${turnTime.id}`}
          >
            <Pencil className="w-3 h-3" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid={`button-delete-turn-time-${turnTime.id}`}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Turn Time?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this turn time setting. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

function TurnTimeForm({
  turnTime,
  locationId,
  onSuccess
}: {
  turnTime: TurnTimeSettings | null;
  locationId: string;
  onSuccess: () => void;
}) {
  const { toast } = useToast();

  const { data: periods } = useQuery<MealPeriod[]>({
    queryKey: ["/api/resy/locations", locationId, "meal-periods"],
  });

  const form = useForm<InsertTurnTimeSettings>({
    resolver: zodResolver(insertTurnTimeSettingsSchema),
    defaultValues: turnTime ? {
      locationId: turnTime.locationId,
      mealPeriodId: turnTime.mealPeriodId,
      minPartySize: turnTime.minPartySize,
      maxPartySize: turnTime.maxPartySize,
      durationMinutes: turnTime.durationMinutes,
      isActive: turnTime.isActive,
    } : {
      locationId: locationId,
      mealPeriodId: null,
      minPartySize: 2,
      maxPartySize: 4,
      durationMinutes: 90,
      isActive: true,
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: InsertTurnTimeSettings) => {
      if (turnTime) {
        await apiRequest("PATCH", `/api/resy/turn-times/${turnTime.id}`, data);
      } else {
        await apiRequest("POST", "/api/resy/turn-times", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/locations", locationId, "turn-times"] });
      toast({
        title: turnTime ? "Turn Time Updated" : "Turn Time Created",
        description: `The turn time has been ${turnTime ? "updated" : "created"} successfully`,
      });
      onSuccess();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertTurnTimeSettings) => {
    saveMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="mealPeriodId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service Period</FormLabel>
              <Select onValueChange={(val) => field.onChange(val === "all" ? null : val)} value={field.value || "all"}>
                <FormControl>
                  <SelectTrigger data-testid="select-meal-period">
                    <SelectValue placeholder="Select service period" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="all">All Service Periods</SelectItem>
                  {periods?.map((period) => (
                    <SelectItem key={period.id} value={period.id}>
                      {period.name} ({formatTime12Hour(period.startTime)} - {formatTime12Hour(period.endTime)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Apply to a specific service period or all periods at this location
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="minPartySize"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min Party Size *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min="1"
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                    data-testid="input-min-party-size"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxPartySize"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Party Size *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min="1"
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                    data-testid="input-max-party-size"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="durationMinutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration (Minutes) *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  min="1"
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                  data-testid="input-duration-minutes"
                />
              </FormControl>
              <FormDescription>
                Expected dining duration for this party size range
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="checkbox-is-active"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Active</FormLabel>
                <FormDescription>
                  Enable this turn time setting
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button
            type="submit"
            disabled={saveMutation.isPending}
            data-testid="button-save-turn-time"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              turnTime ? "Update Turn Time" : "Create Turn Time"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Special Dates Redirect Tab - Links to Special Dates management
function SpecialDatesRedirectTab({ locationId }: { locationId: string }) {
  const [, setLocation] = useLocation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Special Dates & Private Events</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          Closures, holidays, and private events for this location are managed through the Special Dates feature.
        </p>
        <div className="space-y-2">
          <h4 className="font-medium">What You Can Do</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Block specific dates for private events</li>
            <li>Set holiday closures</li>
            <li>Configure one-time special hours</li>
            <li>Manage recurring annual holidays</li>
          </ul>
        </div>
        <div className="pt-4">
          <Button
            onClick={() => setLocation("/reservations/admin/special-dates")}
            data-testid="button-go-to-special-dates"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Go to Special Dates
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Ticketed Events Tab - Manage ticketed events for this location
function TicketedEventsTab({ locationId }: { locationId: string }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  const { data: ticketedEvents, isLoading } = useQuery<any[]>({
    queryKey: ["/api/resy/ticketed-events", { locationId }],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/resy/ticketed-events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/ticketed-events"] });
      toast({ title: "Ticketed event deleted successfully" });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You don't have permission to delete ticketed events", variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    },
  });

  const handleEdit = (event: any) => {
    setEditingEvent(event);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingEvent(null);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingEvent(null);
  };

  const events = ticketedEvents?.filter(e => e.locationId === locationId) || [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Ticketed Events</CardTitle>
          <Button onClick={handleCreate} data-testid="button-add-ticketed-event">
            <Plus className="w-4 h-4 mr-2" />
            Add Ticketed Event
          </Button>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No ticketed events configured for this location.</p>
              <p className="text-sm mt-2">Add events for tours, tastings, or other ticketed experiences.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`ticketed-event-${event.id}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{event.name}</span>
                      <Badge variant={event.eventType === "recurring" ? "default" : "secondary"}>
                        {event.eventType === "recurring" ? "Recurring" : "Single Event"}
                      </Badge>
                      {!event.isActive && (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    )}
                    {event.eventType === "single" && event.singleEventDate && (
                      <p className="text-sm text-muted-foreground">
                        {event.singleEventDate} at {formatTime12Hour(event.singleEventTime)} - Capacity: {event.singleEventCapacity}
                      </p>
                    )}
                    {event.eventType === "recurring" && (
                      <p className="text-sm text-muted-foreground">
                        {event.frequency?.charAt(0).toUpperCase() + event.frequency?.slice(1)} - 
                        {event.daysOfWeek?.map((d: number) => DAYS_OF_WEEK[d]?.slice(0, 3)).join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(event)}
                      data-testid={`button-edit-ticketed-event-${event.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          data-testid={`button-delete-ticketed-event-${event.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Ticketed Event</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{event.name}"? This will also remove all associated time slots.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(event.id)}
                            data-testid="button-confirm-delete-ticketed-event"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Ticketed Event" : "Create Ticketed Event"}</DialogTitle>
          </DialogHeader>
          <TicketedEventForm
            locationId={locationId}
            event={editingEvent}
            onSuccess={handleDialogClose}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

// Ticketed Event Form Component
function TicketedEventForm({
  locationId,
  event,
  onSuccess,
}: {
  locationId: string;
  event: any | null;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [eventType, setEventType] = useState<"single" | "recurring">(event?.eventType || "single");
  const [selectedDays, setSelectedDays] = useState<number[]>(event?.daysOfWeek || []);
  const [timeslots, setTimeslots] = useState<Array<{ dayOfWeek: number | null; startTime: string; capacity: number }>>(
    []
  );

  // Fetch existing timeslots if editing
  const { data: existingTimeslots } = useQuery<any[]>({
    queryKey: ["/api/resy/ticketed-events", event?.id, "timeslots"],
    enabled: !!event?.id,
  });

  // Initialize timeslots when data loads
  useEffect(() => {
    if (existingTimeslots && existingTimeslots.length > 0) {
      setTimeslots(existingTimeslots.map(ts => ({
        dayOfWeek: ts.dayOfWeek,
        startTime: ts.startTime,
        capacity: ts.capacity,
      })));
    }
  }, [existingTimeslots]);

  const form = useForm({
    defaultValues: {
      name: event?.name || "",
      description: event?.description || "",
      eventType: event?.eventType || "single",
      singleEventDate: event?.singleEventDate || "",
      singleEventTime: event?.singleEventTime || "",
      singleEventCapacity: event?.singleEventCapacity || 20,
      frequency: event?.frequency || "weekly",
      startDate: event?.startDate || "",
      endDate: event?.endDate || "",
      isActive: event?.isActive ?? true,
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        locationId,
        eventType,
        daysOfWeek: eventType === "recurring" ? selectedDays : [],
      };

      let response;
      if (event?.id) {
        response = await apiRequest("PATCH", `/api/resy/ticketed-events/${event.id}`, payload);
      } else {
        response = await apiRequest("POST", "/api/resy/ticketed-events", payload);
      }
      const savedEvent = await response.json();

      // Save timeslots for recurring events
      if (eventType === "recurring" && savedEvent?.id) {
        // First, delete all existing timeslots for this event
        if (event?.id) {
          await apiRequest("DELETE", `/api/resy/ticketed-events/${savedEvent.id}/timeslots`);
        }
        
        // Then add the new timeslots
        for (const slot of timeslots) {
          await apiRequest("POST", `/api/resy/ticketed-events/${savedEvent.id}/timeslots`, {
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            capacity: slot.capacity,
          });
        }
      }

      return savedEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/ticketed-events"] });
      toast({ title: event ? "Ticketed event updated successfully" : "Ticketed event created successfully" });
      onSuccess();
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You don't have permission to manage ticketed events", variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    },
  });

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const addTimeslot = () => {
    setTimeslots(prev => [...prev, { dayOfWeek: null, startTime: "12:00", capacity: 20 }]);
  };

  const removeTimeslot = (index: number) => {
    setTimeslots(prev => prev.filter((_, i) => i !== index));
  };

  const updateTimeslot = (index: number, field: string, value: any) => {
    setTimeslots(prev => prev.map((slot, i) => 
      i === index ? { ...slot, [field]: value } : slot
    ));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., Winery Tour, Tasting Session" data-testid="input-event-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Brief description of the event" data-testid="input-event-description" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel>Event Type</FormLabel>
          <div className="flex gap-4">
            <Button
              type="button"
              variant={eventType === "single" ? "default" : "outline"}
              onClick={() => setEventType("single")}
              data-testid="button-event-type-single"
            >
              Single Event
            </Button>
            <Button
              type="button"
              variant={eventType === "recurring" ? "default" : "outline"}
              onClick={() => setEventType("recurring")}
              data-testid="button-event-type-recurring"
            >
              Recurring
            </Button>
          </div>
        </div>

        {eventType === "single" && (
          <div className="space-y-4 p-4 border rounded-lg">
            <h4 className="font-medium">Single Event Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="singleEventDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-single-event-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="singleEventTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} data-testid="input-single-event-time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="singleEventCapacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum Capacity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      data-testid="input-single-event-capacity"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {eventType === "recurring" && (
          <div className="space-y-4 p-4 border rounded-lg">
            <h4 className="font-medium">Recurring Event Details</h4>
            
            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-frequency">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Days of Week</FormLabel>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day, index) => (
                  <Button
                    key={day}
                    type="button"
                    variant={selectedDays.includes(index) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDay(index)}
                    data-testid={`button-day-${day.toLowerCase()}`}
                  >
                    {day.slice(0, 3)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-start-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-end-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>Time Slots</FormLabel>
                <Button type="button" variant="outline" size="sm" onClick={addTimeslot} data-testid="button-add-timeslot">
                  <Plus className="w-3 h-3 mr-1" />
                  Add Time Slot
                </Button>
              </div>
              
              {timeslots.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No time slots configured. Add time slots to define when this event is offered.
                </p>
              ) : (
                <div className="space-y-2">
                  {timeslots.map((slot, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded">
                      <Select
                        value={slot.dayOfWeek?.toString() || "all"}
                        onValueChange={(v) => updateTimeslot(index, "dayOfWeek", v === "all" ? null : parseInt(v))}
                      >
                        <SelectTrigger className="w-32" data-testid={`select-timeslot-day-${index}`}>
                          <SelectValue placeholder="Day" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Days</SelectItem>
                          {selectedDays.map(d => (
                            <SelectItem key={d} value={d.toString()}>{DAYS_OF_WEEK[d]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => updateTimeslot(index, "startTime", e.target.value)}
                        className="w-28"
                        data-testid={`input-timeslot-time-${index}`}
                      />
                      <Input
                        type="number"
                        min={1}
                        value={slot.capacity}
                        onChange={(e) => updateTimeslot(index, "capacity", parseInt(e.target.value) || 1)}
                        className="w-20"
                        placeholder="Cap"
                        data-testid={`input-timeslot-capacity-${index}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTimeslot(index)}
                        data-testid={`button-remove-timeslot-${index}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="checkbox-event-active"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Active</FormLabel>
                <FormDescription>
                  Enable this ticketed event for booking
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onSuccess}
            className="flex-1"
            data-testid="button-cancel-ticketed-event"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saveMutation.isPending}
            className="flex-1"
            data-testid="button-save-ticketed-event"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              event ? "Save Changes" : "Create Event"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
