import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Search, CheckCircle, XCircle, Clock, Pencil, Trash2, DollarSign, CalendarIcon, RefreshCw, Table2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertReservationSchema, type InsertReservation } from "@shared/schema";
import type { Reservation, Experience } from "@shared/schema";
import { format } from "date-fns";

export default function AdminReservations() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [experienceFilter, setExperienceFilter] = useState<string>("all");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);

  const { data: reservations, isLoading: reservationsLoading } = useQuery<Reservation[]>({
    queryKey: ["/api/resy/reservations"],
  });

  const { data: experiences } = useQuery<Experience[]>({
    queryKey: ["/api/resy/experiences"],
  });

  const { data: locationTables } = useQuery<Array<{id: string; tableLabel: string; tableNumber: number; minCapacity: number; maxCapacity: number; locationId: string}>>({
    queryKey: ["/api/resy/location-tables"],
  });

  const filteredReservations = reservations?.filter((reservation) => {
    const matchesSearch = reservation.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || reservation.status === statusFilter;
    const matchesExperience = experienceFilter === "all" || reservation.experienceId === experienceFilter;
    return matchesSearch && matchesStatus && matchesExperience;
  }) || [];

  const handleEdit = (reservation: Reservation) => {
    setEditingReservation(reservation);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl md:text-4xl font-semibold mb-2">Reservations</h1>
        <p className="text-muted-foreground">View and manage all customer reservations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="select-status">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={experienceFilter} onValueChange={setExperienceFilter}>
              <SelectTrigger data-testid="select-experience">
                <SelectValue placeholder="Filter by experience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Experiences</SelectItem>
                {experiences?.map((exp) => (
                  <SelectItem key={exp.id} value={exp.id}>
                    {exp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Reservations ({filteredReservations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {reservationsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : filteredReservations.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReservations.map((reservation) => {
                    const experience = experiences?.find(e => e.id === reservation.experienceId);
                    return (
                      <ReservationRow
                        key={reservation.id}
                        reservation={reservation}
                        experience={experience}
                        locationTables={locationTables}
                        onEdit={handleEdit}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No reservations found</p>
            </div>
          )}
        </CardContent>
      </Card>

      <EditReservationDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        reservation={editingReservation}
        locationTables={locationTables}
      />
    </div>
  );
}

type LocationTable = {id: string; tableLabel: string; tableNumber: number; minCapacity: number; maxCapacity: number; locationId: string};

function formatTimeRange(reservation: Reservation): string {
  const startTime = reservation.holdStart || reservation.reservationTime;
  if (!startTime) return "-";
  
  const [startHours, startMins] = startTime.split(':').map(Number);
  const startTotalMins = startHours * 60 + startMins;
  
  let endTotalMins: number;
  if (reservation.holdEnd) {
    const [endH, endM] = reservation.holdEnd.split(':').map(Number);
    endTotalMins = endH * 60 + endM;
    if (endTotalMins < startTotalMins) {
      endTotalMins += 1440;
    }
  } else {
    endTotalMins = startTotalMins + (reservation.turnDuration || 90);
  }
  
  const formatMins = (totalMins: number) => {
    const normalizedMins = ((totalMins % 1440) + 1440) % 1440;
    const h = Math.floor(normalizedMins / 60);
    const m = normalizedMins % 60;
    const period = h >= 12 ? 'pm' : 'am';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
  };
  
  const startFormatted = formatMins(startTotalMins);
  const endFormatted = formatMins(endTotalMins);
  
  const spansNextDay = endTotalMins >= 1440;
  
  return spansNextDay 
    ? `${startFormatted} - ${endFormatted}+` 
    : `${startFormatted} - ${endFormatted}`;
}

function ReservationRow({ reservation, experience, locationTables, onEdit }: { reservation: Reservation; experience?: Experience; locationTables?: LocationTable[]; onEdit: (reservation: Reservation) => void }) {
  const { toast } = useToast();
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  
  const getTableDisplay = () => {
    const assignedIds = (reservation.assignedTableId || '').split(',').filter(Boolean);
    if (assignedIds.length === 0) {
      return <span className="text-muted-foreground">-</span>;
    }
    
    const tableLabels = assignedIds.map(id => {
      const table = locationTables?.find(t => t.id === id);
      return table ? table.tableNumber.toString() : (id ? String(id).slice(0, 4) : '?');
    });
    
    return (
      <Badge variant="outline" className="font-mono">
        <Table2 className="w-3 h-3 mr-1" />
        {tableLabels.join(', ')}
      </Badge>
    );
  };

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      await apiRequest("PUT", `/api/resy/reservations/${reservation.id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/reservations"] });
      toast({
        title: "Status Updated",
        description: "Reservation status has been updated successfully",
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
      await apiRequest("DELETE", `/api/resy/reservations/${reservation.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/reservations"] });
      toast({
        title: "Reservation Deleted",
        description: "The reservation has been permanently deleted",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const refundMutation = useMutation({
    mutationFn: async (data: { amount?: string }) => {
      return await apiRequest("POST", `/api/resy/reservations/${reservation.id}/refund`, data);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/reservations"] });
      setIsRefundDialogOpen(false);
      setRefundAmount("");
      toast({
        title: "Refund Processed",
        description: `$${data.refundedAmount.toFixed(2)} has been refunded${data.isFullRefund ? ' (full refund)' : ' (partial refund)'}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Refund Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <Badge className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="w-3 h-3 mr-1" />
            Confirmed
          </Badge>
        );
      case 'booked':
        return (
          <Badge className="bg-blue-600 hover:bg-blue-700">
            <Clock className="w-3 h-3 mr-1" />
            Booked
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            {status}
          </Badge>
        );
    }
  };

  return (
    <TableRow>
      <TableCell>
        <div>
          <p className="font-medium">{reservation.customerName}</p>
          <p className="text-sm text-muted-foreground">{reservation.customerEmail}</p>
          {reservation.customerPhone && (
            <p className="text-xs text-muted-foreground">{reservation.customerPhone}</p>
          )}
        </div>
      </TableCell>
      <TableCell>{experience?.name || "Unknown"}</TableCell>
      <TableCell>
        {format(new Date(reservation.reservationDate), "MMM d, yyyy")}
      </TableCell>
      <TableCell className="whitespace-nowrap">{formatTimeRange(reservation)}</TableCell>
      <TableCell>
        {reservation.partySize ? (
          <Badge variant="secondary">{reservation.partySize}</Badge>
        ) : reservation.ticketQuantity ? (
          `${reservation.ticketQuantity} tickets`
        ) : "-"}
      </TableCell>
      <TableCell>{getTableDisplay()}</TableCell>
      <TableCell>
        {reservation.totalAmount ? `$${parseFloat(reservation.totalAmount).toFixed(2)}` : "-"}
      </TableCell>
      <TableCell>{getStatusBadge(reservation.status)}</TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(reservation)}
            data-testid={`button-edit-${reservation.id}`}
          >
            <Pencil className="w-3 h-3 mr-1" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsRescheduleDialogOpen(true)}
            data-testid={`button-reschedule-${reservation.id}`}
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Reschedule
          </Button>
          {reservation.status !== 'confirmed' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateStatusMutation.mutate('confirmed')}
              disabled={updateStatusMutation.isPending}
              data-testid={`button-confirm-${reservation.id}`}
            >
              Confirm
            </Button>
          )}
          {reservation.status !== 'cancelled' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => updateStatusMutation.mutate('cancelled')}
              disabled={updateStatusMutation.isPending}
              data-testid={`button-cancel-${reservation.id}`}
            >
              Cancel
            </Button>
          )}
          {reservation.totalAmount && parseFloat(reservation.totalAmount) > 0 && reservation.paymentIntentId && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsRefundDialogOpen(true)}
              data-testid={`button-refund-${reservation.id}`}
            >
              <DollarSign className="w-3 h-3 mr-1" />
              Refund
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="destructive"
                data-testid={`button-delete-${reservation.id}`}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Reservation</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to permanently delete this reservation for {reservation.customerName}? 
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Refund Dialog */}
        <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Process Refund</DialogTitle>
              <DialogDescription>
                Original payment: ${parseFloat(reservation.totalAmount || "0").toFixed(2)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Refund Amount (leave blank for full refund)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={`Full refund: $${parseFloat(reservation.totalAmount || "0").toFixed(2)}`}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  data-testid="input-refund-amount"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRefundDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => refundMutation.mutate({ amount: refundAmount || undefined })}
                disabled={refundMutation.isPending}
              >
                {refundMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Refund ${refundAmount ? `$${parseFloat(refundAmount).toFixed(2)}` : 'Full Amount'}`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reschedule Dialog */}
        <RescheduleDialog
          open={isRescheduleDialogOpen}
          onOpenChange={setIsRescheduleDialogOpen}
          reservation={reservation}
          experience={experience}
        />
      </TableCell>
    </TableRow>
  );
}

interface EditReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: Reservation | null;
  locationTables?: LocationTable[];
}

function EditReservationDialog({ open, onOpenChange, reservation, locationTables }: EditReservationDialogProps) {
  const { toast } = useToast();
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);

  const form = useForm<Partial<InsertReservation>>({
    resolver: zodResolver(insertReservationSchema.partial()),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      partySize: undefined,
      ticketQuantity: undefined,
      reservationDate: "",
      reservationTime: "",
      specialRequests: "",
      status: "pending",
    },
  });

  useEffect(() => {
    if (reservation) {
      form.reset({
        customerName: reservation.customerName,
        customerEmail: reservation.customerEmail,
        customerPhone: reservation.customerPhone || "",
        partySize: reservation.partySize || undefined,
        ticketQuantity: reservation.ticketQuantity || undefined,
        reservationDate: reservation.reservationDate,
        reservationTime: reservation.reservationTime || "",
        specialRequests: reservation.specialRequests || "",
        status: reservation.status,
      });
      const assignedIds = (reservation.assignedTableId || '').split(',').filter(Boolean);
      setSelectedTableIds(assignedIds);
    }
  }, [reservation, form]);

  const filteredTables = locationTables?.filter(
    t => !reservation?.locationId || t.locationId === reservation.locationId
  ) || [];

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertReservation> & { assignedTableId?: string }) => {
      return await apiRequest("PUT", `/api/resy/reservations/${reservation!.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/reservations"] });
      toast({
        title: "Reservation updated",
        description: "The reservation has been updated successfully.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You must be logged in to update reservations.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to update reservation.",
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = async (data: Partial<InsertReservation>) => {
    const dataWithTable = {
      ...data,
      assignedTableId: selectedTableIds.length > 0 ? selectedTableIds.join(',') : undefined,
    };
    updateMutation.mutate(dataWithTable);
  };
  
  const toggleTableSelection = (tableId: string) => {
    setSelectedTableIds(prev => 
      prev.includes(tableId) 
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    );
  };

  if (!reservation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Reservation</DialogTitle>
          <DialogDescription>
            Update the reservation details for {reservation.customerName}.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-customer-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" data-testid="input-customer-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-customer-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="partySize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Party Size</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="1"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                        value={field.value || ""}
                        data-testid="input-party-size"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reservationDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="input-reservation-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reservationTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input {...field} type="time" data-testid="input-reservation-time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="specialRequests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Requests</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} data-testid="input-special-requests" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {filteredTables.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Assigned Table(s)</label>
                <div className="flex flex-wrap gap-2">
                  {filteredTables.map((table) => (
                    <Button
                      key={table.id}
                      type="button"
                      size="sm"
                      variant={selectedTableIds.includes(table.id) ? "default" : "outline"}
                      onClick={() => toggleTableSelection(table.id)}
                      data-testid={`button-table-${table.tableNumber}`}
                    >
                      <Table2 className="w-3 h-3 mr-1" />
                      {table.tableNumber}
                      <span className="ml-1 text-xs opacity-70">
                        ({table.minCapacity}-{table.maxCapacity})
                      </span>
                    </Button>
                  ))}
                </div>
                {selectedTableIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {selectedTableIds.map(id => {
                      const table = filteredTables.find(t => t.id === id);
                      return table ? `Table ${table.tableNumber}` : id;
                    }).join(', ')}
                  </p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateMutation.isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                data-testid="button-save"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface AvailabilitySlot {
  time: string;
  available: boolean;
  mealPeriod: string;
  remainingCovers?: number;
}

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: Reservation;
  experience?: Experience;
}

function RescheduleDialog({ open, onOpenChange, reservation, experience }: RescheduleDialogProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(reservation.reservationDate)
  );
  const [selectedTime, setSelectedTime] = useState<string>(reservation.reservationTime || "");
  const [partySize, setPartySize] = useState<number>(reservation.partySize || 2);
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  const locationId = reservation.locationId || experience?.locationId;

  // Fetch availability when date or party size changes
  useEffect(() => {
    if (!open || !selectedDate || !locationId) return;
    
    const fetchAvailability = async () => {
      setLoadingAvailability(true);
      setAvailabilityError(null);
      setAvailableSlots([]);
      
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const response = await fetch(
          `/api/resy/locations/${locationId}/availability?date=${dateStr}&partySize=${partySize}`
        );
        const data = await response.json();
        
        if (data.isClosed) {
          setAvailabilityError(data.closureReason || "Location is closed on this day");
          return;
        }
        
        if (data.slots && data.slots.length > 0) {
          const slots: AvailabilitySlot[] = data.slots
            .filter((s: any) => s.available)
            .map((s: any) => ({
              time: s.time,
              available: s.available,
              mealPeriod: s.mealPeriod || "",
              remainingCovers: s.remainingCovers
            }));
          setAvailableSlots(slots);
          
          if (slots.length === 0) {
            setAvailabilityError("No available times for this party size on this date");
          }
        } else {
          setAvailabilityError("No service times available for this date");
        }
      } catch (error) {
        console.error("Failed to fetch availability:", error);
        setAvailabilityError("Failed to check availability");
      } finally {
        setLoadingAvailability(false);
      }
    };
    
    fetchAvailability();
  }, [open, selectedDate, partySize, locationId]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedDate(new Date(reservation.reservationDate));
      setSelectedTime(reservation.reservationTime || "");
      setPartySize(reservation.partySize || 2);
    }
  }, [open, reservation]);

  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDate || !selectedTime) {
        throw new Error("Please select a date and time");
      }
      return await apiRequest("POST", `/api/resy/reservations/${reservation.id}/reschedule`, {
        date: format(selectedDate, "yyyy-MM-dd"),
        time: selectedTime,
        partySize
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/reservations"] });
      onOpenChange(false);
      toast({
        title: "Reservation Rescheduled",
        description: `Moved to ${format(selectedDate!, "MMM d, yyyy")} at ${selectedTime}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Reschedule Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatTo12Hour = (timeStr: string): string => {
    if (timeStr.includes("AM") || timeStr.includes("PM")) {
      return timeStr;
    }
    const [hours, minutes] = timeStr.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reschedule Reservation</DialogTitle>
          <DialogDescription>
            Current: {format(new Date(reservation.reservationDate), "MMM d, yyyy")} at {reservation.reservationTime}
            {reservation.partySize && ` for ${reservation.partySize} guests`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Party Size</label>
              <Select
                value={partySize.toString()}
                onValueChange={(v) => setPartySize(parseInt(v))}
              >
                <SelectTrigger data-testid="select-party-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n} {n === 1 ? "guest" : "guests"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Select Date</label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium block">Available Times</label>
            
            {loadingAvailability && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {availabilityError && !loadingAvailability && (
              <div className="text-center py-8 text-muted-foreground">
                <XCircle className="w-8 h-8 mx-auto mb-2 text-destructive" />
                <p>{availabilityError}</p>
              </div>
            )}

            {!loadingAvailability && !availabilityError && availableSlots.length > 0 && (
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot.time}
                    variant={selectedTime === slot.time ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTime(slot.time)}
                    className="justify-start"
                    data-testid={`button-time-${slot.time}`}
                  >
                    <Clock className="w-3 h-3 mr-2" />
                    {formatTo12Hour(slot.time)}
                  </Button>
                ))}
              </div>
            )}

            {selectedTime && (
              <div className="mt-4 p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">New Schedule:</p>
                <p className="text-sm text-muted-foreground">
                  {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")} at {formatTo12Hour(selectedTime)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Party of {partySize}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => rescheduleMutation.mutate()}
            disabled={!selectedDate || !selectedTime || rescheduleMutation.isPending}
            data-testid="button-confirm-reschedule"
          >
            {rescheduleMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Rescheduling...
              </>
            ) : (
              "Confirm Reschedule"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
