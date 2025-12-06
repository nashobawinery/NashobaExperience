import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  Users,
  Loader2,
  ExternalLink,
  Tag,
  Check,
  X,
  Crown,
} from "lucide-react";
import type { Experience, TimeSlot } from "@shared/schema";
import { format, addDays, startOfToday } from "date-fns";

function formatTo12Hour(time24: string): string {
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

const bookingFormSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  customerEmail: z.string().email("Please enter a valid email address"),
  customerPhone: z.string().optional(),
  partySize: z.number().min(1).optional(),
  ticketQuantity: z.number().min(1).optional(),
  specialRequests: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

type TimeSlotWithAvailability = TimeSlot & {
  available?: number;
  booked?: number;
};

type AvailableTimeSlot = {
  time: string;
  available: boolean;
  mealPeriod: string;
};

export default function Booking() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState<string>();
  const [selectedTableTime, setSelectedTableTime] = useState<string>();
  const [availableSlotsForDay, setAvailableSlotsForDay] = useState<
    TimeSlotWithAvailability[]
  >([]);
  const [availableTableTimes, setAvailableTableTimes] = useState<
    AvailableTimeSlot[]
  >([]);
  const [availabilityMessages, setAvailabilityMessages] = useState<{
    closedMessage?: string;
    fullyBookedMessage?: string;
    privateEventMessage?: string;
  }>({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [discountValidating, setDiscountValidating] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    discountType: "percentage" | "fixed";
    discountValue: string;
  } | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [clubDiscount, setClubDiscount] = useState<{
    clubName: string;
    discountType: "percentage" | "fixed";
    discountValue: string;
  } | null>(null);
  const [checkingClubDiscount, setCheckingClubDiscount] = useState(false);

  const { data: experience, isLoading: experienceLoading } =
    useQuery<Experience>({
      queryKey: ["/api/resy/experiences", id],
    });

  const { data: timeSlots } = useQuery<TimeSlot[]>({
    queryKey: ["/api/resy/experiences", id, "timeslots"],
    enabled: !!experience && experience.reservationType === "ticketed",
  });

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      specialRequests: "",
      partySize: 2,
      ticketQuantity: 1,
    },
  });

  // Watch party size for table reservations
  const watchedPartySize = form.watch("partySize");

  // Fetch availability for ticketed events when date changes
  useEffect(() => {
    const fetchAvailability = async () => {
      if (selectedDate && timeSlots) {
        setLoadingAvailability(true);
        const dayOfWeek = selectedDate.getDay();
        const slotsForDay = timeSlots.filter(
          (slot) => slot.dayOfWeek === dayOfWeek,
        );

        // Fetch availability for each slot
        const slotsWithAvailability = await Promise.all(
          slotsForDay.map(async (slot) => {
            try {
              const response = await fetch(
                `/api/timeslots/${slot.id}/availability?date=${format(selectedDate, "yyyy-MM-dd")}`,
              );
              const availability = await response.json();
              return {
                ...slot,
                available: availability.available,
                booked: availability.booked,
              };
            } catch (error) {
              console.error("Error fetching availability:", error);
              return slot;
            }
          }),
        );

        setAvailableSlotsForDay(slotsWithAvailability);
        setLoadingAvailability(false);

        // Reset selected time slot if it's not available on this day
        if (!slotsForDay.some((slot) => slot.id === selectedTimeSlotId)) {
          setSelectedTimeSlotId(undefined);
        }
      }
    };

    fetchAvailability();
  }, [selectedDate, timeSlots, selectedTimeSlotId]);

  // Fetch availability for table reservations when date or party size changes
  useEffect(() => {
    const fetchTableAvailability = async () => {
      if (
        selectedDate &&
        experience?.reservationType === "table" &&
        experience.locationId
      ) {
        const partySize = form.getValues("partySize") || 2;
        setLoadingAvailability(true);

        try {
          const response = await fetch(
            `/api/locations/${experience.locationId}/available-times?date=${format(selectedDate, "yyyy-MM-dd")}&partySize=${partySize}&experienceId=${experience.id}`,
          );

          if (response.ok) {
            const result = await response.json();
            // Handle new response structure: { availableTimes: [...], messages: {...} }
            const times = result.availableTimes || result; // Backward compatibility
            const messages = result.messages || {};
            setAvailableTableTimes(times);
            setAvailabilityMessages(messages);

            // Reset selected time if it's not available
            if (
              selectedTableTime &&
              !times.some(
                (t: AvailableTimeSlot) =>
                  t.time === selectedTableTime && t.available,
              )
            ) {
              setSelectedTableTime(undefined);
            }
          } else {
            console.error("Failed to fetch table availability");
            setAvailableTableTimes([]);
            setAvailabilityMessages({});
          }
        } catch (error) {
          console.error("Error fetching table availability:", error);
          setAvailableTableTimes([]);
        } finally {
          setLoadingAvailability(false);
        }
      }
    };

    fetchTableAvailability();
  }, [selectedDate, experience, watchedPartySize]);

  // Watch email for club discount check
  const watchedEmail = form.watch("customerEmail");

  // Check for club discount when email changes (debounced)
  useEffect(() => {
    const checkClubDiscount = async () => {
      if (!watchedEmail || !experience) {
        setClubDiscount(null);
        return;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(watchedEmail)) {
        return;
      }

      setCheckingClubDiscount(true);

      try {
        const response = await fetch(
          `/api/experiences/${experience.id}/check-club-discount`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: watchedEmail }),
          },
        );

        const result = await response.json();

        if (result.hasDiscount) {
          setClubDiscount({
            clubName: result.clubName,
            discountType: result.discountType,
            discountValue: result.discountValue,
          });
        } else {
          setClubDiscount(null);
        }
      } catch (error) {
        console.error("Error checking club discount:", error);
        setClubDiscount(null);
      } finally {
        setCheckingClubDiscount(false);
      }
    };

    // Debounce the check
    const timeoutId = setTimeout(checkClubDiscount, 500);
    return () => clearTimeout(timeoutId);
  }, [watchedEmail, experience]);

  const validateDiscountCode = async () => {
    if (!discountCode.trim() || !experience) return;

    setDiscountValidating(true);
    setDiscountError(null);

    try {
      const response = await fetch(
        `/api/experiences/${experience.id}/validate-discount`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: discountCode.trim() }),
        },
      );

      const result = await response.json();

      if (result.valid) {
        setAppliedDiscount({
          code: result.code,
          discountType: result.discountType,
          discountValue: result.discountValue,
        });
        setDiscountError(null);
        setDiscountCode("");
      } else {
        setDiscountError(result.message || "Invalid discount code");
        setAppliedDiscount(null);
      }
    } catch (error) {
      setDiscountError("Failed to validate discount code");
      setAppliedDiscount(null);
    } finally {
      setDiscountValidating(false);
    }
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode("");
    setDiscountError(null);
  };

  // Get the best discount (club discount or promo code, whichever saves more)
  // Uses watched values to recalculate when quantity changes
  const watchedTicketQuantity = form.watch("ticketQuantity");

  const getActiveDiscount = (): {
    type: "club" | "promo";
    discountType: "percentage" | "fixed";
    discountValue: string;
    label: string;
  } | null => {
    if (!clubDiscount && !appliedDiscount) return null;
    if (clubDiscount && !appliedDiscount) {
      return {
        type: "club",
        discountType: clubDiscount.discountType,
        discountValue: clubDiscount.discountValue,
        label: clubDiscount.clubName,
      };
    }
    if (!clubDiscount && appliedDiscount) {
      return {
        type: "promo",
        discountType: appliedDiscount.discountType,
        discountValue: appliedDiscount.discountValue,
        label: appliedDiscount.code,
      };
    }
    // Both exist - calculate which saves more using full subtotal
    const basePrice = experience?.price ? parseFloat(experience.price) : 0;
    const quantity =
      experience?.reservationType === "ticketed"
        ? watchedTicketQuantity || 1
        : watchedPartySize || 1;
    const subtotal = basePrice * quantity;

    const clubSaving =
      clubDiscount!.discountType === "percentage"
        ? subtotal * (parseFloat(clubDiscount!.discountValue) / 100)
        : parseFloat(clubDiscount!.discountValue);
    const promoSaving =
      appliedDiscount!.discountType === "percentage"
        ? subtotal * (parseFloat(appliedDiscount!.discountValue) / 100)
        : parseFloat(appliedDiscount!.discountValue);

    if (clubSaving >= promoSaving) {
      return {
        type: "club",
        discountType: clubDiscount!.discountType,
        discountValue: clubDiscount!.discountValue,
        label: clubDiscount!.clubName,
      };
    }
    return {
      type: "promo",
      discountType: appliedDiscount!.discountType,
      discountValue: appliedDiscount!.discountValue,
      label: appliedDiscount!.code,
    };
  };

  const activeDiscount = getActiveDiscount();

  const calculateDiscountedTotal = (baseTotal: number): number => {
    if (!activeDiscount) return baseTotal;

    if (activeDiscount.discountType === "percentage") {
      const discountAmount =
        baseTotal * (parseFloat(activeDiscount.discountValue) / 100);
      return Math.max(0, baseTotal - discountAmount);
    } else {
      const discountAmount = parseFloat(activeDiscount.discountValue);
      return Math.max(0, baseTotal - discountAmount);
    }
  };

  const createReservationMutation = useMutation({
    mutationFn: async (data: BookingFormValues) => {
      if (!experience || !selectedDate) {
        throw new Error("Missing required data");
      }

      const selectedSlot = availableSlotsForDay.find(
        (slot) => slot.id === selectedTimeSlotId,
      );

      const quantity =
        experience.reservationType === "ticketed"
          ? data.ticketQuantity || 1
          : data.partySize || 1;
      const baseTotal = experience.price
        ? parseFloat(experience.price) * quantity
        : 0;
      const finalTotal = calculateDiscountedTotal(baseTotal);

      const reservationData = {
        experienceId: experience.id,
        locationId: experience.locationId || null,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone || null,
        reservationDate: format(selectedDate, "yyyy-MM-dd"),
        reservationTime:
          experience.reservationType === "ticketed"
            ? selectedSlot?.time || null
            : selectedTableTime || null,
        timeSlotId: selectedTimeSlotId || null,
        partySize:
          experience.reservationType === "table" ? data.partySize : null,
        ticketQuantity:
          experience.reservationType === "ticketed"
            ? data.ticketQuantity
            : null,
        totalAmount: finalTotal > 0 ? finalTotal.toString() : null,
        status: "pending",
        specialRequests: data.specialRequests || null,
        discountCode: appliedDiscount?.code || null,
      };

      const response = await apiRequest(
        "POST",
        "/api/resy/reservations",
        reservationData,
      );
      return response.json();
    },
    onSuccess: (reservation) => {
      // Redirect to checkout if there's a price > 0 and showPrice is enabled (advance payment)
      if (
        reservation.totalAmount &&
        parseFloat(reservation.totalAmount) > 0 &&
        experience?.showPrice !== false
      ) {
        navigate(`/checkout/${reservation.id}`);
      } else {
        // Direct confirmation for free reservations or pay-at-door
        toast({
          title: "Reservation Confirmed!",
          description: "You will receive a confirmation email shortly.",
        });
        navigate(`/confirmation/${reservation.id}`);
      }
    },
    onError: async (error: any) => {
      // Parse error message - apiRequest returns "statusCode: jsonBody" format
      let errorData: any = {};
      let errorMessage = error.message || "Failed to create reservation";

      try {
        // Try to extract JSON from error message (format: "400: {json}")
        const jsonMatch = error.message?.match(/\d+:\s*({.+})/);
        if (jsonMatch) {
          errorData = JSON.parse(jsonMatch[1]);
          errorMessage = errorData.message || errorMessage;
        }
      } catch (e) {
        // If JSON parsing fails, use the original error message
      }

      // If capacity error, re-fetch availability to show updated numbers
      if (
        errorMessage.includes("available") &&
        selectedDate &&
        selectedTimeSlotId
      ) {
        try {
          const response = await fetch(
            `/api/timeslots/${selectedTimeSlotId}/availability?date=${format(selectedDate, "yyyy-MM-dd")}`,
          );
          const availability = await response.json();

          // Update the availability in state
          setAvailableSlotsForDay((prev) =>
            prev.map((slot) =>
              slot.id === selectedTimeSlotId
                ? {
                    ...slot,
                    available: availability.available,
                    booked: availability.booked,
                  }
                : slot,
            ),
          );
        } catch (e) {
          console.error("Error refreshing availability:", e);
        }
      }

      toast({
        title: "Reservation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BookingFormValues) => {
    if (!selectedDate) {
      toast({
        title: "Please select a date",
        description: "A reservation date is required",
        variant: "destructive",
      });
      return;
    }

    if (experience?.reservationType === "ticketed" && !selectedTimeSlotId) {
      toast({
        title: "Please select a time",
        description: "A time slot is required for ticketed events",
        variant: "destructive",
      });
      return;
    }

    if (experience?.reservationType === "table" && !selectedTableTime) {
      toast({
        title: "Please select a time",
        description: "A reservation time is required",
        variant: "destructive",
      });
      return;
    }

    createReservationMutation.mutate(data);
  };

  if (experienceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!experience) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-lg text-muted-foreground mb-4">
              Experience not found
            </p>
            <Button asChild data-testid="button-back-home">
              <Link href="/">Return Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If this is an external experience, redirect to the external URL
  if (experience.isExternal && experience.externalUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-lg font-semibold text-foreground">
              {experience.name}
            </p>
            <p className="text-sm text-muted-foreground">
              This experience is hosted on an external platform. Click below to
              make your reservation.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() =>
                  window.open(
                    experience.externalUrl!,
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
                data-testid="button-open-external"
              >
                Open Reservation Page
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" asChild data-testid="button-copy-link">
                <a
                  href={experience.externalUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Copy Link & Visit Manually
                </a>
              </Button>
              <Button variant="outline" asChild data-testid="button-back-home">
                <Link href="/">Return Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isTicketed = experience.reservationType === "ticketed";
  const shouldShowPrice = experience.showPrice !== false;
  // Prefer imageUrl as it contains resolved media library URLs
  const getImageUrl = () => {
    if (experience.imageUrl && !experience.imageUrl.startsWith('/@fs/')) return experience.imageUrl;
    if (experience.primaryImageKey && experience.primaryImageKey.startsWith('/api/')) return experience.primaryImageKey;
    return "";
  };
  const imageUrl = getImageUrl();

  // Calculate max bookable date for ticketed events with advance booking restrictions
  const maxBookableDate =
    isTicketed && experience.advanceBookingDays
      ? addDays(startOfToday(), experience.advanceBookingDays)
      : undefined;

  const isDateDisabled = (date: Date) => {
    if (date < startOfToday()) return true;
    if (maxBookableDate && date > maxBookableDate) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center">
          <Button variant="ghost" asChild data-testid="button-back">
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Experience Info */}
        <div className="mb-8">
          {imageUrl && (
            <div className="aspect-[21/9] overflow-hidden rounded-lg mb-6">
              <img
                src={imageUrl}
                alt={experience.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <h1 className="font-serif text-3xl md:text-4xl font-semibold mb-2">
            {experience.name}
          </h1>
          {(experience.longDescription || experience.description) && (
            <p
              className="text-lg text-muted-foreground"
              data-testid="text-long-description"
            >
              {experience.longDescription || experience.description}
            </p>
          )}
          {experience.price && parseFloat(experience.price) === 0 ? (
            <p
              className="text-lg font-medium text-muted-foreground mt-4"
              data-testid="text-no-charge"
            >
              No charge for booking this experience
            </p>
          ) : experience.price && parseFloat(experience.price) > 0 ? (
            shouldShowPrice ? (
              <p
                className="text-xl font-semibold text-foreground mt-4"
                data-testid="text-price"
              >
                ${parseFloat(experience.price).toFixed(2)} per person
              </p>
            ) : (
              <p
                className="text-lg font-medium text-muted-foreground mt-4"
                data-testid="text-pay-at-door"
              >
                Payment collected at door ($
                {parseFloat(experience.price).toFixed(2)} per person)
              </p>
            )
          ) : null}
        </div>

        {/* Booking Form */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Date & Time Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Select Date & Time
              </CardTitle>
              <CardDescription>
                Choose your preferred date and available time slot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {maxBookableDate && (
                <div
                  className="rounded-md bg-muted p-3 text-sm text-muted-foreground"
                  data-testid="text-booking-window"
                >
                  Tickets available up to {experience.advanceBookingDays} days
                  in advance (through {format(maxBookableDate, "MMMM d, yyyy")})
                </div>
              )}
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={isDateDisabled}
                className="rounded-md border"
                data-testid="calendar-date"
              />

              {isTicketed && selectedDate && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Time Slot</label>
                  {loadingAvailability ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking availability...
                    </div>
                  ) : availableSlotsForDay.length > 0 ? (
                    <Select
                      value={selectedTimeSlotId}
                      onValueChange={setSelectedTimeSlotId}
                    >
                      <SelectTrigger data-testid="select-time">
                        <SelectValue placeholder="Select a time" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSlotsForDay.map((slot) => (
                          <SelectItem
                            key={slot.id}
                            value={slot.id}
                            disabled={slot.available === 0}
                          >
                            <div className="flex items-center justify-between w-full gap-4">
                              <span>{formatTo12Hour(slot.time)}</span>
                              <span
                                className={`text-xs ${slot.available === 0 ? "text-destructive" : slot.available && slot.available < 5 ? "text-amber-600" : "text-muted-foreground"}`}
                              >
                                {slot.available !== undefined
                                  ? slot.available === 0
                                    ? "Sold Out"
                                    : `${slot.available} available`
                                  : ""}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No time slots available for this date
                    </p>
                  )}
                </div>
              )}

              {!isTicketed && selectedDate && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Reservation Time
                  </label>
                  {loadingAvailability ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking availability...
                    </div>
                  ) : (
                    (() => {
                      // Determine which message to show (priority: private event > closed > fully booked)
                      const displayMessage =
                        availabilityMessages.privateEventMessage ||
                        availabilityMessages.closedMessage ||
                        availabilityMessages.fullyBookedMessage;

                      const hasAvailableTimes = availableTableTimes.length > 0;

                      return (
                        <div className="space-y-4">
                          {/* Show message if it exists */}
                          {displayMessage && (
                            <div
                              className="rounded-md bg-muted p-4 text-sm text-muted-foreground"
                              data-testid="text-availability-message"
                            >
                              {displayMessage}
                            </div>
                          )}

                          {/* Show time grid if there are available times */}
                          {hasAvailableTimes
                            ? (() => {
                                // Normalize meal period names to title case
                                const normalizeMealPeriod = (
                                  period: string,
                                ): string => {
                                  return (
                                    period.charAt(0).toUpperCase() +
                                    period.slice(1).toLowerCase()
                                  );
                                };

                                // Group times by normalized meal period (deduplicate keys)
                                const timesByNormalizedPeriod = new Map<
                                  string,
                                  AvailableTimeSlot[]
                                >();
                                availableTableTimes.forEach((slot) => {
                                  const normalized = normalizeMealPeriod(
                                    slot.mealPeriod,
                                  );
                                  if (
                                    !timesByNormalizedPeriod.has(normalized)
                                  ) {
                                    timesByNormalizedPeriod.set(normalized, []);
                                  }
                                  timesByNormalizedPeriod
                                    .get(normalized)!
                                    .push(slot);
                                });

                                // Define canonical meal period order
                                const mealPeriodOrder = [
                                  "Breakfast",
                                  "Brunch",
                                  "Lunch",
                                  "Dinner",
                                  "Supper",
                                ];

                                // Sort meal periods by defined order
                                const sortedPeriods = Array.from(
                                  timesByNormalizedPeriod.keys(),
                                ).sort((a, b) => {
                                  const indexA = mealPeriodOrder.indexOf(a);
                                  const indexB = mealPeriodOrder.indexOf(b);
                                  // If both are in the order list, sort by order
                                  if (indexA !== -1 && indexB !== -1)
                                    return indexA - indexB;
                                  // If only one is in the order list, it comes first
                                  if (indexA !== -1) return -1;
                                  if (indexB !== -1) return 1;
                                  // If neither is in the order list, sort alphabetically
                                  return a.localeCompare(b);
                                });

                                return sortedPeriods.map((period) => {
                                  const slots =
                                    timesByNormalizedPeriod.get(period)!;

                                  return (
                                    <div key={period}>
                                      <h4
                                        className="text-sm font-semibold mb-2"
                                        data-testid={`heading-meal-period-${period.toLowerCase()}`}
                                      >
                                        {period}
                                      </h4>
                                      <div className="grid grid-cols-3 gap-2">
                                        {slots.map((slot, index) => (
                                          <Button
                                            key={`${slot.time}-${index}`}
                                            variant={
                                              selectedTableTime === slot.time
                                                ? "default"
                                                : "outline"
                                            }
                                            disabled={!slot.available}
                                            onClick={() =>
                                              setSelectedTableTime(slot.time)
                                            }
                                            className="w-full"
                                            data-testid={`button-time-${slot.time.replace(":", "")}`}
                                          >
                                            {formatTo12Hour(slot.time)}
                                          </Button>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                });
                              })()
                            : !displayMessage && (
                                /* Show generic "no availability" only if there's no custom message */
                                <p
                                  className="text-sm text-muted-foreground"
                                  data-testid="text-no-availability"
                                >
                                  No times available for this date and party
                                  size
                                </p>
                              )}
                        </div>
                      );
                    })()
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Guest Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Guest Information
              </CardTitle>
              <CardDescription>
                Please provide your contact details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="John Doe"
                            {...field}
                            data-testid="input-name"
                          />
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
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="john@example.com"
                            {...field}
                            data-testid="input-email"
                          />
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
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="(555) 123-4567"
                            {...field}
                            data-testid="input-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isTicketed ? (
                    <FormField
                      control={form.control}
                      name="ticketQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Tickets *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseInt(e.target.value))
                              }
                              data-testid="input-tickets"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name="partySize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Party Size *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseInt(e.target.value))
                              }
                              data-testid="input-party-size"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {experience.price &&
                    parseFloat(experience.price) > 0 &&
                    shouldShowPrice && (
                      <div className="space-y-3">
                        {clubDiscount && (
                          <div
                            className="flex items-center justify-between rounded-md border border-primary bg-primary/5 p-3"
                            data-testid="club-discount-banner"
                          >
                            <div className="flex items-center gap-2">
                              <Crown className="w-4 h-4 text-primary" />
                              <span className="text-sm font-medium text-primary">
                                {clubDiscount.clubName} Member
                              </span>
                              <span className="text-xs text-primary/80">
                                (
                                {clubDiscount.discountType === "percentage"
                                  ? `${clubDiscount.discountValue}% off`
                                  : `$${parseFloat(clubDiscount.discountValue).toFixed(2)} off`}
                                )
                              </span>
                            </div>
                            {checkingClubDiscount && (
                              <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            )}
                          </div>
                        )}

                        <div>
                          <FormLabel>Discount Code</FormLabel>
                          {appliedDiscount ? (
                            <div className="flex items-center justify-between rounded-md border border-green-500 bg-green-50 dark:bg-green-950 p-3 mt-1">
                              <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-600" />
                                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                  {appliedDiscount.code} applied
                                </span>
                                <span className="text-xs text-green-600 dark:text-green-400">
                                  (
                                  {appliedDiscount.discountType === "percentage"
                                    ? `${appliedDiscount.discountValue}% off`
                                    : `$${parseFloat(appliedDiscount.discountValue).toFixed(2)} off`}
                                  )
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={removeDiscount}
                                className="h-6 w-6 p-0"
                                data-testid="button-remove-discount"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2 mt-1">
                              <Input
                                placeholder="Enter discount code"
                                value={discountCode}
                                onChange={(e) => {
                                  setDiscountCode(e.target.value.toUpperCase());
                                  setDiscountError(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    validateDiscountCode();
                                  }
                                }}
                                data-testid="input-discount-code"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={validateDiscountCode}
                                disabled={
                                  discountValidating || !discountCode.trim()
                                }
                                data-testid="button-apply-discount"
                              >
                                {discountValidating ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  "Apply"
                                )}
                              </Button>
                            </div>
                          )}
                          {discountError && (
                            <p className="text-sm text-destructive mt-1">
                              {discountError}
                            </p>
                          )}
                          {clubDiscount &&
                            appliedDiscount &&
                            activeDiscount && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {activeDiscount.type === "club"
                                  ? "Your club membership discount is being applied (it's better than the promo code)."
                                  : "Your promo code discount is being applied (it's better than your club discount)."}
                              </p>
                            )}
                        </div>
                      </div>
                    )}

                  <FormField
                    control={form.control}
                    name="specialRequests"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Requests</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any dietary restrictions or special accommodations..."
                            {...field}
                            data-testid="input-requests"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {activeDiscount &&
                    experience.price &&
                    parseFloat(experience.price) > 0 && (
                      <div
                        className="rounded-md bg-muted p-4 space-y-2"
                        data-testid="pricing-summary"
                      >
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Subtotal
                          </span>
                          <span>
                            $
                            {(
                              parseFloat(experience.price) *
                              (isTicketed
                                ? form.watch("ticketQuantity") || 1
                                : form.watch("partySize") || 1)
                            ).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm text-green-600">
                          <span className="flex items-center gap-1">
                            {activeDiscount.type === "club" && (
                              <Crown className="w-3 h-3" />
                            )}
                            {activeDiscount.type === "club"
                              ? `${activeDiscount.label} Discount`
                              : `Discount (${activeDiscount.label})`}
                          </span>
                          <span>
                            -
                            {activeDiscount.discountType === "percentage"
                              ? `${activeDiscount.discountValue}%`
                              : `$${parseFloat(activeDiscount.discountValue).toFixed(2)}`}
                          </span>
                        </div>
                        <div className="flex justify-between font-semibold border-t pt-2">
                          <span>Total</span>
                          <span>
                            $
                            {calculateDiscountedTotal(
                              parseFloat(experience.price) *
                                (isTicketed
                                  ? form.watch("ticketQuantity") || 1
                                  : form.watch("partySize") || 1),
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createReservationMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createReservationMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : experience.price &&
                      parseFloat(experience.price) > 0 &&
                      shouldShowPrice ? (
                      "Continue to Payment"
                    ) : (
                      "Confirm Reservation"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
