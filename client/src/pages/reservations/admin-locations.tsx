import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Loader2, Users, Pause, Play, Settings, ArrowRight, Copy } from "lucide-react";
import type { Location, LocationTable, InsertLocationTable, InsertLocation } from "@shared/schema";
import { insertLocationTableSchema, insertLocationSchema } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminLocations() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  const { data: locations, isLoading: locationsLoading } = useQuery<Location[]>({
    queryKey: ["/api/resy/locations"],
  });

  const { data: allTables, isLoading: tablesLoading } = useQuery<LocationTable[]>({
    queryKey: ["/api/resy/location-tables"],
  });

  const cloneMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/resy/locations/${id}/clone`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/locations"] });
      toast({
        title: "Location Cloned",
        description: "A copy of the location has been created",
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
        title: "Clone Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/resy/locations/${id}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/locations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/resy/location-tables"] });
      toast({
        title: "Location Deleted",
        description: "The location has been permanently deleted",
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

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setIsLocationDialogOpen(true);
  };

  const handleCreateLocation = () => {
    setEditingLocation(null);
    setIsLocationDialogOpen(true);
  };

  const handleManageLocation = (locationId: string) => {
    navigate(`/reservations/admin/locations/${locationId}`);
  };

  const groupedTables = allTables?.reduce((acc, table) => {
    if (!acc[table.locationId]) {
      acc[table.locationId] = [];
    }
    acc[table.locationId].push(table);
    return acc;
  }, {} as Record<string, LocationTable[]>) || {};

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-semibold mb-2">Locations & Tables</h1>
          <p className="text-muted-foreground">Manage dining locations and their table inventory</p>
        </div>
        <Button
          onClick={handleCreateLocation}
          data-testid="button-create-location"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Location
        </Button>
      </div>

      {locationsLoading || tablesLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 bg-muted rounded animate-pulse w-2/3" />
              </CardHeader>
              <CardContent>
                <div className="h-16 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : locations && locations.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => {
            const tableCount = groupedTables[location.id]?.length || 0;
            return (
              <Card key={location.id} className="hover-elevate">
                <CardHeader>
                  <CardTitle className="text-xl">{location.name}</CardTitle>
                  {location.description && (
                    <CardDescription>{location.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{tableCount} {tableCount === 1 ? 'table' : 'tables'}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleManageLocation(location.id)}
                      className="flex-1"
                      data-testid={`button-manage-location-${location.id}`}
                    >
                      Manage
                      <ArrowRight className="w-3 h-3 ml-2" />
                    </Button>
                    <Button
                      onClick={() => handleEditLocation(location)}
                      size="icon"
                      variant="outline"
                      data-testid={`button-edit-location-${location.id}`}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => cloneMutation.mutate(location.id)}
                      size="icon"
                      variant="outline"
                      disabled={cloneMutation.isPending}
                      data-testid={`button-clone-location-${location.id}`}
                    >
                      {cloneMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="outline"
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-location-${location.id}`}
                        >
                          {deleteMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Location</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{location.name}"? This will also delete all tables, operating hours, and other settings associated with this location. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(location.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            data-testid="button-confirm-delete"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">No locations found</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingLocation ? "Edit Location Settings" : "Create New Location"}</DialogTitle>
            <DialogDescription>
              {editingLocation ? "Update location configuration" : "Add a new dining location to the system"}
            </DialogDescription>
          </DialogHeader>
          <LocationForm
            location={editingLocation}
            onSuccess={() => {
              setIsLocationDialogOpen(false);
              setEditingLocation(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LocationForm({ location, onSuccess }: { location: Location | null; onSuccess: () => void }) {
  const { toast } = useToast();

  const form = useForm<InsertLocation>({
    resolver: zodResolver(insertLocationSchema),
    defaultValues: location
      ? {
          name: location.name,
          description: location.description || "",
          address: location.address || "",
          isActive: location.isActive,
          isTicketedEventLocation: location.isTicketedEventLocation ?? false,
          isReservationLocation: location.isReservationLocation ?? false,
        }
      : {
          name: "",
          description: "",
          address: "",
          isActive: true,
          isTicketedEventLocation: false,
          isReservationLocation: false,
        },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: InsertLocation) => {
      if (location) {
        const response = await apiRequest("PATCH", `/api/resy/locations/${location.id}`, data);
        return response.json();
      }
      const response = await apiRequest("POST", "/api/resy/locations", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/locations"] });
      toast({
        title: location ? "Location Updated" : "Location Created",
        description: `Location has been ${location ? "updated" : "created"} successfully`,
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

  const onSubmit = (data: InsertLocation) => {
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
              <FormLabel>Location Name *</FormLabel>
              <FormControl>
                <Input placeholder="J's Restaurant" {...field} data-testid="input-location-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          <FormLabel className="text-base font-medium">Location Type</FormLabel>
          <FormDescription className="mt-0 mb-3">
            Select the type of experience this location supports
          </FormDescription>
          
          <FormField
            control={form.control}
            name="isReservationLocation"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      if (checked) {
                        form.setValue("isTicketedEventLocation", false);
                      }
                    }}
                    data-testid="checkbox-reservation-location"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="font-normal">
                    Table Reservation
                  </FormLabel>
                  <FormDescription>
                    For dining with table management, service periods, and turn times
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isTicketedEventLocation"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      if (checked) {
                        form.setValue("isReservationLocation", false);
                      }
                    }}
                    data-testid="checkbox-ticketed-location"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="font-normal">
                    Ticketed Event
                  </FormLabel>
                  <FormDescription>
                    For tours, tastings, and events with capacity limits (no table management)
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input
                  placeholder="Fine dining with seasonal menu"
                  {...field}
                  value={field.value || ""}
                  data-testid="input-location-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button
            type="submit"
            disabled={saveMutation.isPending}
            data-testid="button-save-location"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Update Location"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
