import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Wine, Users, DollarSign, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import type { Reservation, Experience } from "@shared/schema";

export default function AdminHome() {
  const { data: experiences, isLoading: experiencesLoading } = useQuery<Experience[]>({
    queryKey: ["/api/resy/experiences"],
  });

  const { data: reservations, isLoading: reservationsLoading } = useQuery<Reservation[]>({
    queryKey: ["/api/resy/reservations"],
  });

  const activeExperiences = experiences?.filter(exp => exp.isActive).length || 0;
  const totalReservations = reservations?.length || 0;
  const confirmedReservations = reservations?.filter(r => r.status === 'confirmed').length || 0;
  const totalRevenue = reservations
    ?.filter(r => r.status === 'confirmed' && r.totalAmount)
    .reduce((sum, r) => sum + parseFloat(r.totalAmount || "0"), 0) || 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-semibold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your reservation management system</p>
        </div>
        <Button
          variant="outline"
          onClick={() => window.open('/reservations', '_blank')}
          data-testid="button-view-customer-page"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          View Customer Page
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Experiences</CardTitle>
            <Wine className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {experiencesLoading ? (
              <div className="h-8 bg-muted rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold">{activeExperiences}</div>
                <p className="text-xs text-muted-foreground">
                  {experiences?.length} total experiences
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reservations</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {reservationsLoading ? (
              <div className="h-8 bg-muted rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold">{totalReservations}</div>
                <p className="text-xs text-muted-foreground">All time bookings</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {reservationsLoading ? (
              <div className="h-8 bg-muted rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold">{confirmedReservations}</div>
                <p className="text-xs text-muted-foreground">Confirmed reservations</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {reservationsLoading ? (
              <div className="h-8 bg-muted rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">From ticketed events</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Reservations</CardTitle>
        </CardHeader>
        <CardContent>
          {reservationsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : reservations && reservations.length > 0 ? (
            <div className="space-y-3">
              {reservations.slice(0, 5).map((reservation) => {
                const experience = experiences?.find(e => e.id === reservation.experienceId);
                return (
                  <div key={reservation.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <p className="font-medium">{reservation.customerName}</p>
                      <p className="text-sm text-muted-foreground">{experience?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {format(new Date(reservation.reservationDate), "M/d/yyyy")}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">{reservation.status}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No reservations yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
