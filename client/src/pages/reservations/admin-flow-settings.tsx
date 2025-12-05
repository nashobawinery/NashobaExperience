import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2, Clock, Calendar, Gauge, Timer } from "lucide-react";
import type { 
  Location, 
  MealPeriod, 
  InsertMealPeriod,
  OperatingHours,
  InsertOperatingHours,
  FlowControl,
  InsertFlowControl,
  TurnTimeSettings,
  InsertTurnTimeSettings
} from "@shared/schema";
import { 
  insertMealPeriodSchema,
  insertOperatingHoursSchema,
  insertFlowControlSchema,
  insertTurnTimeSettingsSchema
} from "@shared/schema";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MEAL_PERIOD_NAMES = ["breakfast", "lunch", "dinner", "brunch"];

export default function AdminFlowSettings() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl md:text-4xl font-semibold mb-2">Flow Control Settings</h1>
        <p className="text-muted-foreground">Manage meal periods, operating hours, flow controls, and turn times</p>
      </div>

      <Tabs defaultValue="meal-periods" className="space-y-6">
        <TabsList data-testid="tabs-flow-settings">
          <TabsTrigger value="meal-periods" data-testid="tab-meal-periods">
            <Clock className="w-3 h-3 mr-2" />
            Meal Periods
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
        </TabsList>

        <TabsContent value="meal-periods">
          <MealPeriodsTab />
        </TabsContent>

        <TabsContent value="operating-hours">
          <OperatingHoursTab />
        </TabsContent>

        <TabsContent value="flow-controls">
          <FlowControlsTab />
        </TabsContent>

        <TabsContent value="turn-times">
          <TurnTimesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MealPeriodsTab() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<MealPeriod | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");

  const { data: locations, isLoading: locationsLoading } = useQuery<Location[]>({
    queryKey: ["/api/resy/locations"],
  });

  const { data: mealPeriods, isLoading: periodsLoading } = useQuery<MealPeriod[]>({
    queryKey: ["/api/resy/meal-periods"],
  });

  const groupedPeriods = mealPeriods?.reduce((acc, period) => {
    if (!acc[period.locationId]) {
      acc[period.locationId] = [];
    }
    acc[period.locationId].push(period);
    return acc;
  }, {} as Record<string, MealPeriod[]>) || {};

  const handleEdit = (period: MealPeriod) => {
    setEditingPeriod(period);
    setSelectedLocationId(period.locationId);
    setIsDialogOpen(true);
  };

  const handleAdd = (locationId: string) => {
    setEditingPeriod(null);
    setSelectedLocationId(locationId);
    setIsDialogOpen(true);
  };

  return (
    <>
      {locationsLoading || periodsLoading ? (
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
      ) : locations && locations.length > 0 ? (
        <div className="grid gap-6">
          {locations.map((location) => (
            <Card key={location.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{location.name}</CardTitle>
                  <Button
                    onClick={() => handleAdd(location.id)}
                    size="sm"
                    data-testid={`button-add-meal-period-${location.id}`}
                  >
                    <Plus className="w-3 h-3 mr-2" />
                    Add Meal Period
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {groupedPeriods[location.id]?.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {groupedPeriods[location.id].map((period) => (
                      <MealPeriodCard
                        key={period.id}
                        period={period}
                        onEdit={handleEdit}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No meal periods configured for this location</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">No locations found</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPeriod ? "Edit Meal Period" : "Add New Meal Period"}
            </DialogTitle>
            <DialogDescription>
              {editingPeriod
                ? "Update meal period configuration"
                : "Add a new meal period to this location"}
            </DialogDescription>
          </DialogHeader>
          <MealPeriodForm
            period={editingPeriod}
            locationId={selectedLocationId}
            onSuccess={() => {
              setIsDialogOpen(false);
              setEditingPeriod(null);
              setSelectedLocationId("");
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function MealPeriodCard({ period, onEdit }: { period: MealPeriod; onEdit: (period: MealPeriod) => void }) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/meal-periods/${period.id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/meal-periods"] });
      toast({
        title: "Meal Period Deleted",
        description: "The meal period has been deleted successfully",
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
            <span>{period.startTime} - {period.endTime}</span>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(period)}
            data-testid={`button-edit-meal-period-${period.id}`}
          >
            <Pencil className="w-3 h-3" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid={`button-delete-meal-period-${period.id}`}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {period.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this meal period. This action cannot be undone.
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

function MealPeriodForm({ 
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
    defaultValues: period ? {
      locationId: period.locationId,
      name: period.name,
      startTime: period.startTime,
      endTime: period.endTime,
      isActive: period.isActive,
    } : {
      locationId: locationId,
      name: "lunch",
      startTime: "11:00",
      endTime: "14:00",
      isActive: true,
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: InsertMealPeriod) => {
      if (period) {
        await apiRequest("PATCH", `/api/meal-periods/${period.id}`, data);
      } else {
        await apiRequest("POST", "/api/resy/meal-periods", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/meal-periods"] });
      toast({
        title: period ? "Meal Period Updated" : "Meal Period Created",
        description: `The meal period has been ${period ? "updated" : "created"} successfully`,
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
              <FormLabel>Meal Period Name *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-meal-period-name">
                    <SelectValue placeholder="Select meal period" />
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
                  Enable this meal period for reservations
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button
            type="submit"
            disabled={saveMutation.isPending}
            data-testid="button-save-meal-period"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              period ? "Update Meal Period" : "Create Meal Period"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function OperatingHoursTab() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHours, setEditingHours] = useState<OperatingHours | null>(null);
  const [selectedMealPeriodId, setSelectedMealPeriodId] = useState<string>("");

  const { data: mealPeriods, isLoading: periodsLoading } = useQuery<MealPeriod[]>({
    queryKey: ["/api/resy/meal-periods"],
  });

  const { data: operatingHours, isLoading: hoursLoading } = useQuery<OperatingHours[]>({
    queryKey: ["/api/resy/operating-hours"],
  });

  const groupedHours = operatingHours?.reduce((acc, hours) => {
    if (!acc[hours.mealPeriodId]) {
      acc[hours.mealPeriodId] = [];
    }
    acc[hours.mealPeriodId].push(hours);
    return acc;
  }, {} as Record<string, OperatingHours[]>) || {};

  const handleEdit = (hours: OperatingHours) => {
    setEditingHours(hours);
    setSelectedMealPeriodId(hours.mealPeriodId);
    setIsDialogOpen(true);
  };

  const handleAdd = (mealPeriodId: string) => {
    setEditingHours(null);
    setSelectedMealPeriodId(mealPeriodId);
    setIsDialogOpen(true);
  };

  return (
    <>
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
      ) : mealPeriods && mealPeriods.length > 0 ? (
        <div className="grid gap-6">
          {mealPeriods.map((period) => (
            <Card key={period.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl capitalize">{period.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {period.startTime} - {period.endTime}
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
                          onEdit={handleEdit}
                        />
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No operating hours configured for this meal period</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">No meal periods found. Create meal periods first.</p>
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
                ? "Update operating hours for this day"
                : "Add operating hours for a new day"}
            </DialogDescription>
          </DialogHeader>
          <OperatingHoursForm
            hours={editingHours}
            mealPeriodId={selectedMealPeriodId}
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

function OperatingHoursCard({ hours, onEdit }: { hours: OperatingHours; onEdit: (hours: OperatingHours) => void }) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/operating-hours/${hours.id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/operating-hours"] });
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
            <Badge variant={hours.isOpen ? "default" : "secondary"}>
              {hours.isOpen ? "Open" : "Closed"}
            </Badge>
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
                <AlertDialogTitle>Delete {DAYS_OF_WEEK[hours.dayOfWeek]} hours?</AlertDialogTitle>
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
  onSuccess 
}: { 
  hours: OperatingHours | null; 
  mealPeriodId: string;
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
      dayOfWeek: 0,
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
      queryClient.invalidateQueries({ queryKey: ["/api/resy/operating-hours"] });
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
              <Select 
                onValueChange={(value) => field.onChange(parseInt(value))} 
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-day-of-week">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day, index) => (
                    <SelectItem key={index} value={index.toString()}>
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
                  Check if this meal period is available on this day
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

function FlowControlsTab() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingControl, setEditingControl] = useState<FlowControl | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");

  const { data: locations, isLoading: locationsLoading } = useQuery<Location[]>({
    queryKey: ["/api/resy/locations"],
  });

  const { data: flowControls, isLoading: controlsLoading } = useQuery<FlowControl[]>({
    queryKey: ["/api/resy/flow-controls"],
  });

  const groupedControls = flowControls?.reduce((acc, control) => {
    if (!acc[control.locationId]) {
      acc[control.locationId] = [];
    }
    acc[control.locationId].push(control);
    return acc;
  }, {} as Record<string, FlowControl[]>) || {};

  const handleEdit = (control: FlowControl) => {
    setEditingControl(control);
    setSelectedLocationId(control.locationId);
    setIsDialogOpen(true);
  };

  const handleAdd = (locationId: string) => {
    setEditingControl(null);
    setSelectedLocationId(locationId);
    setIsDialogOpen(true);
  };

  return (
    <>
      {locationsLoading || controlsLoading ? (
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
      ) : locations && locations.length > 0 ? (
        <div className="grid gap-6">
          {locations.map((location) => (
            <Card key={location.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{location.name}</CardTitle>
                  <Button
                    onClick={() => handleAdd(location.id)}
                    size="sm"
                    data-testid={`button-add-flow-control-${location.id}`}
                  >
                    <Plus className="w-3 h-3 mr-2" />
                    Add Flow Control
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {groupedControls[location.id]?.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {groupedControls[location.id].map((control) => (
                      <FlowControlCard
                        key={control.id}
                        control={control}
                        onEdit={handleEdit}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No flow controls configured for this location</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">No locations found</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingControl ? "Edit Flow Control" : "Add New Flow Control"}
            </DialogTitle>
            <DialogDescription>
              {editingControl
                ? "Update flow control configuration"
                : "Add a new flow control to this location"}
            </DialogDescription>
          </DialogHeader>
          <FlowControlForm
            control={editingControl}
            locationId={selectedLocationId}
            onSuccess={() => {
              setIsDialogOpen(false);
              setEditingControl(null);
              setSelectedLocationId("");
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function FlowControlCard({ control, onEdit }: { control: FlowControl; onEdit: (control: FlowControl) => void }) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/flow-controls/${control.id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/flow-controls"] });
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
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-sm font-semibold">
              {control.intervalMinutes}min intervals
            </Badge>
            {!control.isActive && (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Gauge className="w-3 h-3" />
              <span>Max {control.maxCoversPerInterval} covers/interval</span>
            </div>
            {control.maxDailyCovers && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                <span>Max {control.maxDailyCovers} covers/day</span>
              </div>
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
  onSuccess 
}: { 
  control: FlowControl | null; 
  locationId: string;
  onSuccess: () => void;
}) {
  const { toast } = useToast();

  const { data: mealPeriods } = useQuery<MealPeriod[]>({
    queryKey: ["/api/resy/meal-periods"],
  });

  const locationMealPeriods = mealPeriods?.filter(p => p.locationId === (control?.locationId || locationId)) || [];

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
      queryClient.invalidateQueries({ queryKey: ["/api/resy/flow-controls"] });
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
              <FormLabel>Meal Period (Optional)</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(value === "none" ? null : value)} 
                value={field.value || "none"}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-meal-period">
                    <SelectValue placeholder="Apply to all meal periods" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">All Meal Periods</SelectItem>
                  {locationMealPeriods.map((period) => (
                    <SelectItem key={period.id} value={period.id}>
                      <span className="capitalize">{period.name}</span> ({period.startTime} - {period.endTime})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Leave empty to apply to all meal periods at this location
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
              <FormLabel>Interval Minutes *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  min={5}
                  step={5}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                  data-testid="input-interval-minutes"
                />
              </FormControl>
              <FormDescription>
                Time window size (typically 15 minutes)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="maxCoversPerInterval"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Max Covers Per Interval *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  min={1}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                  data-testid="input-max-covers-interval"
                />
              </FormControl>
              <FormDescription>
                Maximum number of guests per time window
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
              <FormLabel>Max Daily Covers (Optional)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  min={1}
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                  data-testid="input-max-daily-covers"
                />
              </FormControl>
              <FormDescription>
                Maximum number of guests per day (leave empty for no limit)
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
                  data-testid="checkbox-flow-control-active"
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

function TurnTimesTab() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTurnTime, setEditingTurnTime] = useState<TurnTimeSettings | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");

  const { data: locations, isLoading: locationsLoading } = useQuery<Location[]>({
    queryKey: ["/api/resy/locations"],
  });

  const { data: turnTimes, isLoading: timesLoading } = useQuery<TurnTimeSettings[]>({
    queryKey: ["/api/resy/turn-times"],
  });

  const groupedTimes = turnTimes?.reduce((acc, time) => {
    if (!acc[time.locationId]) {
      acc[time.locationId] = [];
    }
    acc[time.locationId].push(time);
    return acc;
  }, {} as Record<string, TurnTimeSettings[]>) || {};

  const handleEdit = (time: TurnTimeSettings) => {
    setEditingTurnTime(time);
    setSelectedLocationId(time.locationId);
    setIsDialogOpen(true);
  };

  const handleAdd = (locationId: string) => {
    setEditingTurnTime(null);
    setSelectedLocationId(locationId);
    setIsDialogOpen(true);
  };

  return (
    <>
      {locationsLoading || timesLoading ? (
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
      ) : locations && locations.length > 0 ? (
        <div className="grid gap-6">
          {locations.map((location) => (
            <Card key={location.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{location.name}</CardTitle>
                  <Button
                    onClick={() => handleAdd(location.id)}
                    size="sm"
                    data-testid={`button-add-turn-time-${location.id}`}
                  >
                    <Plus className="w-3 h-3 mr-2" />
                    Add Turn Time
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {groupedTimes[location.id]?.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {groupedTimes[location.id].map((time) => (
                      <TurnTimeCard
                        key={time.id}
                        turnTime={time}
                        onEdit={handleEdit}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No turn times configured for this location</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">No locations found</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTurnTime ? "Edit Turn Time" : "Add New Turn Time"}
            </DialogTitle>
            <DialogDescription>
              {editingTurnTime
                ? "Update turn time configuration"
                : "Add a new turn time rule to this location"}
            </DialogDescription>
          </DialogHeader>
          <TurnTimeForm
            turnTime={editingTurnTime}
            locationId={selectedLocationId}
            onSuccess={() => {
              setIsDialogOpen(false);
              setEditingTurnTime(null);
              setSelectedLocationId("");
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function TurnTimeCard({ turnTime, onEdit }: { turnTime: TurnTimeSettings; onEdit: (turnTime: TurnTimeSettings) => void }) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/turn-times/${turnTime.id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/turn-times"] });
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
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-sm font-semibold">
              {turnTime.minPartySize}-{turnTime.maxPartySize} guests
            </Badge>
            {!turnTime.isActive && (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Timer className="w-3 h-3" />
            <span>{turnTime.durationMinutes} minutes</span>
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
                  This will permanently delete this turn time rule. This action cannot be undone.
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

  const { data: mealPeriods } = useQuery<MealPeriod[]>({
    queryKey: ["/api/resy/meal-periods"],
  });

  const locationMealPeriods = mealPeriods?.filter(p => p.locationId === (turnTime?.locationId || locationId)) || [];

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
      minPartySize: 1,
      maxPartySize: 2,
      durationMinutes: 90,
      isActive: true,
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: InsertTurnTimeSettings) => {
      if (turnTime) {
        await apiRequest("PATCH", `/api/turn-times/${turnTime.id}`, data);
      } else {
        await apiRequest("POST", "/api/resy/turn-times", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/turn-times"] });
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
              <FormLabel>Meal Period (Optional)</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(value === "none" ? null : value)} 
                value={field.value || "none"}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-turn-time-meal-period">
                    <SelectValue placeholder="Apply to all meal periods" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">All Meal Periods</SelectItem>
                  {locationMealPeriods.map((period) => (
                    <SelectItem key={period.id} value={period.id}>
                      <span className="capitalize">{period.name}</span> ({period.startTime} - {period.endTime})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Leave empty to apply to all meal periods at this location
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
                    min={1}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                    data-testid="input-min-party-size"
                  />
                </FormControl>
                <FormDescription>
                  Minimum guests
                </FormDescription>
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
                    min={1}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                    data-testid="input-max-party-size"
                  />
                </FormControl>
                <FormDescription>
                  Maximum guests
                </FormDescription>
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
                  min={15}
                  step={15}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                  data-testid="input-duration-minutes"
                />
              </FormControl>
              <FormDescription>
                Expected dining time for this party size
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
                  data-testid="checkbox-turn-time-active"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Active</FormLabel>
                <FormDescription>
                  Enable this turn time rule
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
