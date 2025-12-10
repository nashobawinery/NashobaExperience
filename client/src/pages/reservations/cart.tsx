import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Trash2,
  ShoppingCart,
  Loader2,
  CreditCard,
} from "lucide-react";
import { useReservationCart, type CartReservation } from "@/contexts/reservation-cart-context";
import { format, parseISO } from "date-fns";

function formatTo12Hour(timeStr: string): string {
  if (timeStr.includes("AM") || timeStr.includes("PM")) {
    return timeStr;
  }
  const [hours, minutes] = timeStr.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export default function Cart() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { cartItems, removeFromCart, clearCart, cartCount } = useReservationCart();
  const [processingCheckout, setProcessingCheckout] = useState(false);

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      return sum + (price * item.partySize);
    }, 0);
  };

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      setProcessingCheckout(true);
      try {
        const createdReservations: any[] = [];
        const failedItems: { name: string; error: string }[] = [];
        const successfulExperienceIds: string[] = [];

        for (const item of cartItems) {
          try {
            const reservationData = {
              experienceId: item.experienceId,
              locationId: item.locationId || null,
              customerName: `${item.customerInfo.firstName} ${item.customerInfo.lastName}`.trim(),
              customerEmail: item.customerInfo.email,
              customerPhone: item.customerInfo.phone || null,
              notificationPreference: "email",
              reservationDate: item.date,
              reservationTime: item.time,
              timeSlotId: null,
              partySize: item.reservationType === "table" ? item.partySize : null,
              ticketQuantity: item.reservationType === "ticketed" ? item.partySize : null,
              totalAmount: (parseFloat(item.price) * item.partySize).toString(),
              status: "pending",
              specialRequests: item.specialRequests || null,
              discountCode: null,
            };

            const response = await apiRequest(
              "POST",
              "/api/resy/reservations",
              reservationData,
            );
            const reservation = await response.json();
            createdReservations.push(reservation);
            successfulExperienceIds.push(item.experienceId);
          } catch (error: any) {
            let errorMessage = "Booking failed";
            if (error.message) {
              const colonIndex = error.message.indexOf(':');
              if (colonIndex > 0) {
                const errorText = error.message.substring(colonIndex + 1).trim();
                try {
                  const errorData = JSON.parse(errorText);
                  errorMessage = errorData.message || errorData.error || errorText;
                } catch {
                  errorMessage = errorText || errorMessage;
                }
              } else {
                errorMessage = error.message;
              }
            }
            failedItems.push({ name: item.experienceName, error: errorMessage });
          }
        }

        return { createdReservations, failedItems, successfulExperienceIds };
      } finally {
        setProcessingCheckout(false);
      }
    },
    onSuccess: ({ createdReservations, failedItems, successfulExperienceIds }) => {
      successfulExperienceIds.forEach(id => removeFromCart(id));
      
      if (failedItems.length > 0 && createdReservations.length === 0) {
        const errorDetails = failedItems.map(f => `${f.name}: ${f.error}`).join('; ');
        toast({
          title: "Checkout Failed",
          description: `Failed to create reservations. ${errorDetails}. Please review your cart and try again.`,
          variant: "destructive",
        });
        return;
      }

      if (failedItems.length > 0) {
        const errorDetails = failedItems.map(f => `${f.name}: ${f.error}`).join('; ');
        toast({
          title: "Partial Success",
          description: `${createdReservations.length} reservation(s) created successfully. ${failedItems.length} failed: ${errorDetails}. Failed items remain in your cart - you can retry or remove them.`,
          variant: "destructive",
        });
        return;
      }
      
      if (createdReservations.length === 1) {
        const reservation = createdReservations[0];
        if (reservation.totalAmount && parseFloat(reservation.totalAmount) > 0) {
          navigate(`/checkout/${reservation.id}`);
        } else {
          toast({
            title: "Reservation Confirmed!",
            description: "You will receive a confirmation email shortly.",
          });
          navigate(`/confirmation/${reservation.id}`);
        }
      } else {
        toast({
          title: "Reservations Confirmed!",
          description: `${createdReservations.length} reservations have been created. You will receive confirmation emails shortly.`,
        });
        navigate("/reservations");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Checkout Failed",
        description: error.message || "Failed to complete checkout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRemoveItem = (experienceId: string) => {
    removeFromCart(experienceId);
    toast({
      title: "Removed from Cart",
      description: "The reservation has been removed from your cart.",
    });
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast({
        title: "Cart is Empty",
        description: "Add some reservations to your cart before checking out.",
        variant: "destructive",
      });
      return;
    }
    checkoutMutation.mutate();
  };

  if (cartCount === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b sticky top-0 bg-background z-10">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center">
            <Button variant="ghost" asChild data-testid="button-back">
              <Link href="/reservations">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Experiences
              </Link>
            </Button>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="font-serif text-3xl font-semibold mb-4">Your Cart is Empty</h1>
          <p className="text-muted-foreground mb-8">
            Browse our experiences and add reservations to your cart.
          </p>
          <Button asChild data-testid="button-browse-experiences">
            <Link href="/reservations">Browse Experiences</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" asChild data-testid="button-back">
            <Link href="/reservations">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Continue Shopping
            </Link>
          </Button>
          <h1 className="font-semibold">Your Cart ({cartCount})</h1>
          <div className="w-24" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <CartItemCard
                key={item.experienceId}
                item={item}
                onRemove={() => handleRemoveItem(item.experienceId)}
              />
            ))}
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
                <CardDescription>
                  {cartCount} reservation{cartCount > 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.experienceId} className="flex justify-between text-sm">
                    <span className="text-muted-foreground truncate max-w-[60%]">
                      {item.experienceName}
                    </span>
                    <span>
                      ${(parseFloat(item.price) * item.partySize).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="border-t pt-4 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={handleCheckout}
                  disabled={processingCheckout}
                  data-testid="button-checkout"
                >
                  {processingCheckout ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : calculateTotal() > 0 ? (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Proceed to Payment
                    </>
                  ) : (
                    "Confirm Reservations"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function CartItemCard({ item, onRemove }: { item: CartReservation; onRemove: () => void }) {
  const formattedDate = format(parseISO(item.date), "EEEE, MMMM d, yyyy");
  const formattedTime = formatTo12Hour(item.time);
  const itemTotal = parseFloat(item.price) * item.partySize;

  return (
    <Card data-testid={`cart-item-${item.experienceId}`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2">{item.experienceName}</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{formattedTime}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{item.partySize} {item.partySize === 1 ? 'guest' : 'guests'}</span>
              </div>
            </div>
            <div className="mt-3 text-sm">
              <span className="text-muted-foreground">Guest: </span>
              <span>{item.customerInfo.firstName} {item.customerInfo.lastName}</span>
            </div>
            {item.specialRequests && (
              <div className="mt-2 text-sm">
                <span className="text-muted-foreground">Notes: </span>
                <span className="italic">{item.specialRequests}</span>
              </div>
            )}
          </div>
          <div className="text-right ml-4">
            <Badge variant="secondary" className="mb-2">
              ${itemTotal.toFixed(2)}
            </Badge>
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                data-testid={`button-remove-${item.experienceId}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
