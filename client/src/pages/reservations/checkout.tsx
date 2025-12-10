import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, CreditCard, Mail, Bell } from "lucide-react";
import type { Reservation, Experience } from "@shared/schema";
import { format } from "date-fns";

function formatTo12Hour(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

function CheckoutForm({ reservation, experience }: { reservation: Reservation; experience: Experience }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/confirmation/${reservation.id}`,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Information
          </CardTitle>
          <CardDescription>Enter your payment details to complete your reservation</CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentElement />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reservation Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Experience</span>
              <span className="font-medium">{experience.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">
                {format(new Date(reservation.reservationDate), "MMMM d, yyyy")}
              </span>
            </div>
            {reservation.reservationTime && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium">{formatTo12Hour(reservation.reservationTime)}</span>
              </div>
            )}
            {reservation.ticketQuantity && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tickets</span>
                <span className="font-medium">{reservation.ticketQuantity}</span>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>${parseFloat(reservation.totalAmount || "0").toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Important Information */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <Mail className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Email Confirmation</p>
              <p className="text-muted-foreground">
                You will receive an email confirmation with your reservation details. 
                No physical tickets will be issued - simply check in at our welcome desk when you arrive.
              </p>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex items-start space-x-3">
            <Checkbox 
              id="newsletter" 
              checked={newsletterOptIn}
              onCheckedChange={(checked) => setNewsletterOptIn(checked === true)}
              data-testid="checkbox-newsletter"
            />
            <div className="grid gap-1.5 leading-none">
              <Label 
                htmlFor="newsletter" 
                className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
              >
                <Bell className="w-4 h-4 text-primary" />
                Sign up for our newsletter
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive updates about special events, wine releases, and exclusive offers from Nashoba Valley Winery.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        type="submit"
        className="w-full"
        disabled={!stripe || isProcessing}
        data-testid="button-pay"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing Payment...
          </>
        ) : (
          `Pay $${parseFloat(reservation.totalAmount || "0").toFixed(2)}`
        )}
      </Button>
    </form>
  );
}

export default function Checkout() {
  const { id } = useParams();
  const [clientSecret, setClientSecret] = useState("");

  const { data: reservation, isLoading: reservationLoading } = useQuery<Reservation>({
    queryKey: ["/api/resy/reservations", id],
  });

  const { data: experience, isLoading: experienceLoading } = useQuery<Experience>({
    queryKey: ["/api/resy/experiences", reservation?.experienceId],
    enabled: !!reservation,
  });

  useEffect(() => {
    if (reservation && !clientSecret && stripePromise) {
      apiRequest("POST", "/api/resy/create-payment-intent", {
        amount: parseFloat(reservation.totalAmount || "0"),
        reservationId: reservation.id,
      })
        .then((res) => res.json())
        .then((data) => {
          setClientSecret(data.clientSecret);
        })
        .catch((error) => {
          console.error("Error creating payment intent:", error);
        });
    }
  }, [reservation, clientSecret, stripePromise]);

  if (!stripePromise) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-lg text-muted-foreground mb-4">Payment processing is currently unavailable</p>
            <p className="text-sm text-muted-foreground mb-4">Please contact us to complete your reservation</p>
            <Button asChild data-testid="button-home">
              <Link href="/reservations">Return to Reservations</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (reservationLoading || experienceLoading || !clientSecret) {
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
              <Link href="/reservations">Return to Reservations</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center">
          <Button variant="ghost" asChild data-testid="button-back">
            <Link href={`/book/${experience.id}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="font-serif text-3xl md:text-4xl font-semibold mb-8">
          Complete Your Reservation
        </h1>

        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm reservation={reservation} experience={experience} />
        </Elements>
      </div>
    </div>
  );
}
