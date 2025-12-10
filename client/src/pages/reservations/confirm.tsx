import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, CalendarDays, Clock, Users } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

interface ReservationDetails {
  reservation: {
    id: string;
    customerName: string;
    reservationDate: string;
    reservationTime: string;
    partySize: number;
    status: string;
    specialRequests?: string;
    confirmationCode?: string;
  };
  experience: {
    name: string;
    description?: string;
  } | null;
}

export default function ConfirmReservation() {
  const params = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const [actionTaken, setActionTaken] = useState<"confirmed" | "cancelled" | null>(null);

  const { data, isLoading, error } = useQuery<ReservationDetails>({
    queryKey: ["/api/resy/confirm", params.token],
    enabled: !!params.token,
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/resy/confirm/${params.token}`);
    },
    onSuccess: () => {
      setActionTaken("confirmed");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/resy/cancel/${params.token}`);
    },
    onSuccess: () => {
      setActionTaken("cancelled");
    },
  });

  const formatTo12Hour = (timeStr: string): string => {
    if (!timeStr) return "TBD";
    if (timeStr.includes("AM") || timeStr.includes("PM")) {
      return timeStr;
    }
    const [hours, minutes] = timeStr.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <CardTitle>Reservation Not Found</CardTitle>
            <CardDescription>
              This confirmation link may be invalid or expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              If you need assistance with your reservation, please contact us at (978) 779-5521.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { reservation, experience } = data;

  // Already confirmed or cancelled
  if (actionTaken === "confirmed" || reservation.status === "confirmed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-green-600">Reservation Confirmed!</CardTitle>
            <CardDescription>
              Thank you for confirming your reservation, {reservation.customerName}!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold text-lg mb-3">{experience?.name || "Reservation"}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-muted-foreground" />
                    <span>{format(new Date(reservation.reservationDate), "EEEE, MMMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{formatTo12Hour(reservation.reservationTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>{reservation.partySize} {reservation.partySize === 1 ? "guest" : "guests"}</span>
                  </div>
                </div>
              </div>
              <p className="text-center text-muted-foreground text-sm">
                We look forward to seeing you! Please arrive 10-15 minutes before your scheduled time.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (actionTaken === "cancelled" || reservation.status === "cancelled") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <CardTitle>Reservation Cancelled</CardTitle>
            <CardDescription>
              Your reservation has been cancelled.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              We're sorry we won't be seeing you this time. If you'd like to book a new reservation, please visit our website.
            </p>
            <p className="text-sm text-muted-foreground">
              Questions? Contact us at (978) 779-5521.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show confirmation options for "booked" status
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Confirm Your Reservation</CardTitle>
          <CardDescription>
            Hi {reservation.customerName}! Please confirm your upcoming visit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold text-lg mb-3">{experience?.name || "Reservation"}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  <span>{format(new Date(reservation.reservationDate), "EEEE, MMMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{formatTo12Hour(reservation.reservationTime)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>{reservation.partySize} {reservation.partySize === 1 ? "guest" : "guests"}</span>
                </div>
                {reservation.specialRequests && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-muted-foreground">Special Requests: {reservation.specialRequests}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending || cancelMutation.isPending}
                data-testid="button-confirm-reservation"
              >
                {confirmMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Yes, I'm Coming!
                  </>
                )}
              </Button>
              
              <Button
                size="lg"
                variant="destructive"
                className="w-full"
                onClick={() => cancelMutation.mutate()}
                disabled={confirmMutation.isPending || cancelMutation.isPending}
                data-testid="button-cancel-reservation"
              >
                {cancelMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Reservation
                  </>
                )}
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Need to make changes? Contact us at (978) 779-5521.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
