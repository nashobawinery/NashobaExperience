import { useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Calendar, Clock, Users, Mail, Phone, Loader2 } from "lucide-react";
import type { Reservation, Experience } from "@shared/schema";
import { format } from "date-fns";

function formatTo12Hour(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export default function Confirmation() {
  const { id } = useParams();

  const { data: reservation, isLoading: reservationLoading } = useQuery<Reservation>({
    queryKey: ["/api/resy/reservations", id],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (paymentIntentClientSecret: string) => {
      return apiRequest("POST", `/api/confirm-payment/${id}`, {
        paymentIntentClientSecret,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/reservations", id] });
    },
  });

  // Update reservation status to confirmed when arriving from Stripe
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentIntentClientSecret = urlParams.get("payment_intent_client_secret");
    
    if (paymentIntentClientSecret && reservation && reservation.status === "pending") {
      updateStatusMutation.mutate(paymentIntentClientSecret);
    }
  }, [reservation]);

  const { data: experience, isLoading: experienceLoading } = useQuery<Experience>({
    queryKey: ["/api/resy/experiences", reservation?.experienceId],
    enabled: !!reservation,
  });

  if (reservationLoading || experienceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!reservation || !experience) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-lg text-muted-foreground mb-4">Reservation not found</p>
            <Button asChild data-testid="button-home">
              <Link href="/">Return Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="font-serif text-3xl md:text-4xl font-semibold mb-2">
            Reservation Confirmed!
          </h1>
          <p className="text-lg text-muted-foreground">
            Thank you for your reservation. A confirmation email has been sent to{" "}
            <span className="font-medium text-foreground">{reservation.customerEmail}</span>
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Reservation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Experience</p>
                  <p className="font-semibold">{experience.name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-semibold">
                    {format(new Date(reservation.reservationDate), "EEEE, MMMM d, yyyy")}
                  </p>
                </div>
              </div>

              {reservation.reservationTime && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time</p>
                    <p className="font-semibold">{formatTo12Hour(reservation.reservationTime)}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {reservation.ticketQuantity ? "Tickets" : "Party Size"}
                  </p>
                  <p className="font-semibold">
                    {reservation.ticketQuantity || reservation.partySize}
                    {reservation.ticketQuantity ? " tickets" : " guests"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{reservation.customerEmail}</span>
            </div>
            {reservation.customerPhone && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{reservation.customerPhone}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {reservation.totalAmount && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">Total Paid</span>
                <span className="text-2xl font-semibold text-green-600">
                  ${parseFloat(reservation.totalAmount).toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {reservation.specialRequests && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Special Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{reservation.specialRequests}</p>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <Button className="flex-1" asChild data-testid="button-home">
            <Link href="/">Return to Home</Link>
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => window.print()} data-testid="button-print">
            Print Confirmation
          </Button>
        </div>

        <div className="mt-8 p-4 bg-muted rounded-md">
          <p className="text-sm text-muted-foreground text-center">
            Please arrive 10 minutes before your scheduled time. If you need to make changes to your reservation, please contact us.
          </p>
        </div>
      </div>
    </div>
  );
}
