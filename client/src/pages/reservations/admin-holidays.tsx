import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { RECURRING_HOLIDAYS, type ResyLocation, type ResyLocationHoliday } from "@shared/schema";
import { CalendarDays, MapPin } from "lucide-react";

export default function AdminHolidays() {
  const { toast } = useToast();
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");

  const { data: locations, isLoading: locationsLoading } = useQuery<ResyLocation[]>({
    queryKey: ["/api/resy/locations"],
  });

  const { data: allHolidays, isLoading: holidaysLoading } = useQuery<ResyLocationHoliday[]>({
    queryKey: ["/api/resy/location-holidays"],
  });

  const setHolidayMutation = useMutation({
    mutationFn: async (data: { locationId: string; holidayKey: string; isClosed: boolean }) => {
      const response = await apiRequest("POST", "/api/resy/location-holidays", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/location-holidays"] });
      toast({
        title: "Holiday Updated",
        description: "The holiday closure status has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update holiday",
        variant: "destructive",
      });
    },
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: async ({ locationId, holidayKey }: { locationId: string; holidayKey: string }) => {
      await apiRequest("DELETE", `/api/resy/location-holidays/${locationId}/${holidayKey}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/location-holidays"] });
    },
  });

  const getHolidayDate = (holidayKey: string, year: number): string => {
    const holiday = RECURRING_HOLIDAYS.find(h => h.key === holidayKey);
    if (!holiday) return "";
    return holiday.getDate(year);
  };

  const formatHolidayDate = (holidayKey: string): string => {
    const currentYear = new Date().getFullYear();
    const dateStr = getHolidayDate(holidayKey, currentYear);
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const isHolidayClosed = (locationId: string, holidayKey: string): boolean => {
    const holiday = allHolidays?.find(
      h => h.locationId === locationId && h.holidayKey === holidayKey
    );
    return holiday?.isClosed ?? false;
  };

  const handleToggleHoliday = (locationId: string, holidayKey: string, isClosed: boolean) => {
    if (isClosed) {
      setHolidayMutation.mutate({ locationId, holidayKey, isClosed: true });
    } else {
      deleteHolidayMutation.mutate({ locationId, holidayKey });
    }
  };

  const selectedLocation = selectedLocationId 
    ? locations?.find(l => l.id === selectedLocationId) 
    : null;

  const isLoading = locationsLoading || holidaysLoading;

  const getLocationClosedCount = (locationId: string): number => {
    return allHolidays?.filter(h => h.locationId === locationId && h.isClosed).length ?? 0;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl md:text-4xl font-semibold mb-2">Recurring Holidays</h1>
        <p className="text-muted-foreground">
          Configure which holidays each location is automatically closed for every year. 
          These closures apply annually without needing to recreate special dates.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="w-full sm:w-64">
          <Select
            value={selectedLocationId || "select"}
            onValueChange={(value) => setSelectedLocationId(value === "select" ? "" : value)}
            disabled={isLoading}
          >
            <SelectTrigger data-testid="select-location-holidays">
              <SelectValue placeholder="Select a location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="select" disabled>Select a location</SelectItem>
              {locations?.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : !selectedLocationId ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <MapPin className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <div>
                <h3 className="text-lg font-medium">Select a Location</h3>
                <p className="text-muted-foreground">
                  Choose a location above to configure which holidays it will be closed for.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5" />
                    {selectedLocation?.name}
                  </CardTitle>
                  <CardDescription>
                    Toggle which holidays this location is closed
                  </CardDescription>
                </div>
                <Badge variant="secondary">
                  {getLocationClosedCount(selectedLocationId)} holidays closed
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {RECURRING_HOLIDAYS.map((holiday) => {
                  const isClosed = isHolidayClosed(selectedLocationId, holiday.key);
                  const dateDisplay = formatHolidayDate(holiday.key);
                  
                  return (
                    <div
                      key={holiday.key}
                      className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                      data-testid={`holiday-row-${holiday.key}`}
                    >
                      <div className="flex items-center gap-4">
                        <Switch
                          checked={isClosed}
                          onCheckedChange={(checked) => 
                            handleToggleHoliday(selectedLocationId, holiday.key, checked)
                          }
                          disabled={setHolidayMutation.isPending || deleteHolidayMutation.isPending}
                          data-testid={`switch-holiday-${holiday.key}`}
                        />
                        <div>
                          <div className="font-medium">{holiday.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {dateDisplay} (this year)
                          </div>
                        </div>
                      </div>
                      {isClosed && (
                        <Badge variant="destructive">Closed</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {locations && locations.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">All Locations Summary</CardTitle>
                <CardDescription>
                  Quick view of holiday closures across all locations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Location</th>
                        <th className="text-center p-2 font-medium">Holidays Closed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {locations.map((location) => (
                        <tr 
                          key={location.id} 
                          className="border-b hover-elevate cursor-pointer"
                          onClick={() => setSelectedLocationId(location.id)}
                        >
                          <td className="p-2">{location.name}</td>
                          <td className="text-center p-2">
                            <Badge variant="secondary">
                              {getLocationClosedCount(location.id)} / {RECURRING_HOLIDAYS.length}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
