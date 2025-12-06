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
import { Plus, Pencil, Trash2, Loader2, Users, Pause, Play, Settings, ArrowRight } from "lucide-react";
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
              {editingLocation ? "Update location configuration including reservation close time" : "Add a new dining location to the system"}
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
          reservationCloseTime: location.reservationCloseTime || "",
          isActive: location.isActive,
        }
      : {
          name: "",
          description: "",
          address: "",
          reservationCloseTime: "",
          isActive: true,
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

        <FormField
          control={form.control}
          name="reservationCloseTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reservation Close Time</FormLabel>
              <FormControl>
                <Input
                  placeholder="19:30"
                  {...field}
                  value={field.value || ""}
                  data-testid="input-reservation-close-time"
                />
              </FormControl>
              <FormDescription>
                Last reservation time (HH:MM format). Leave empty to use meal period closing times. Example: "19:30" to stop taking reservations at 7:30 PM even if the restaurant closes at 8:00 PM.
              </FormDescription>
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
