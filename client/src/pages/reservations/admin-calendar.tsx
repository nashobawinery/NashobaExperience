import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight, Clock, MapPin, User, Mail, Phone } from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import type { Reservation, Experience } from "@shared/schema";

export default function AdminCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [viewMonth, setViewMonth] = useState<Date>(new Date());

  const { data: reservations, isLoading: reservationsLoading } = useQuery<Reservation[]>({
    queryKey: ["/api/resy/reservations"],
  });

  const { data: experiences } = useQuery<Experience[]>({
    queryKey: ["/api/resy/experiences"],
  });

  const experienceMap = new Map(experiences?.map(exp => [exp.id, exp]) || []);

  // Get reservations for the selected date
  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const selectedDateReservations = reservations?.filter(res => {
    const resDate = format(parseISO(res.reservationDate), "yyyy-MM-dd");
    return resDate === selectedDateStr;
  }) || [];

  // Get dates that have reservations in the current view month
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  
  const datesWithReservations = new Set<string>();
  reservations?.forEach(res => {
    const resDate = parseISO(res.reservationDate);
    if (resDate >= monthStart && resDate <= monthEnd) {
      datesWithReservations.add(format(resDate, "yyyy-MM-dd"));
    }
  });

  const previousMonth = () => {
    const newDate = new Date(viewMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setViewMonth(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(viewMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setViewMonth(newDate);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "confirmed":
        return "default";
      case "pending":
        return "secondary";
      case "cancelled":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl md:text-4xl font-semibold mb-2" data-testid="text-calendar-title">Calendar</h1>
        <p className="text-muted-foreground">View all reservations across experiences</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Calendar View */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={previousMonth}
              data-testid="button-prev-month"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <CardTitle className="text-xl font-serif">
              {format(viewMonth, "MMMM yyyy")}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextMonth}
              data-testid="button-next-month"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={viewMonth}
              onMonthChange={setViewMonth}
              className="rounded-md"
              modifiers={{
                hasReservations: (date: Date) => {
                  const dateStr = format(date, "yyyy-MM-dd");
                  return datesWithReservations.has(dateStr);
                },
              }}
              modifiersClassNames={{
                hasReservations: "font-bold text-primary",
              }}
              data-testid="calendar-view"
            />
            <div className="mt-4 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                Dates with reservations shown in bold
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Reservations List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-serif">
              {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "Select a date"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reservationsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-4 border rounded-md">
                    <div className="h-4 bg-muted rounded animate-pulse mb-2" />
                    <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                  </div>
                ))}
              </div>
            ) : selectedDateReservations.length > 0 ? (
              <div className="space-y-4">
                {selectedDateReservations.map((reservation) => {
                  const experience = experienceMap.get(reservation.experienceId);
                  return (
                    <div
                      key={reservation.id}
                      className="p-4 border rounded-md space-y-2 hover-elevate"
                      data-testid={`reservation-${reservation.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{reservation.customerName}</p>
                          <p className="text-sm text-muted-foreground">
                            {experience?.name || "Unknown Experience"}
                          </p>
                        </div>
                        <Badge variant={getStatusBadgeVariant(reservation.status)}>
                          {reservation.status}
                        </Badge>
                      </div>

                      <div className="grid gap-1 text-sm">
                        {experience?.location && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{experience.location}</span>
                          </div>
                        )}
                        {reservation.reservationTime && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{reservation.reservationTime}</span>
                          </div>
                        )}
                        {reservation.partySize && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="w-3 h-3" />
                            <span>{reservation.partySize} guests</span>
                          </div>
                        )}
                        {reservation.ticketQuantity && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="w-3 h-3" />
                            <span>{reservation.ticketQuantity} tickets</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          <span>{reservation.customerEmail}</span>
                        </div>
                        {reservation.customerPhone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            <span>{reservation.customerPhone}</span>
                          </div>
                        )}
                        {reservation.specialRequests && (
                          <div className="mt-2 p-2 bg-muted rounded text-xs">
                            <p className="font-medium mb-1">Special Requests:</p>
                            <p>{reservation.specialRequests}</p>
                          </div>
                        )}
                      </div>

                      {reservation.totalAmount && (
                        <div className="pt-2 border-t">
                          <p className="text-sm font-medium">
                            Total: ${(parseFloat(reservation.totalAmount) || 0).toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {selectedDate ? "No reservations on this date" : "Select a date to view reservations"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
