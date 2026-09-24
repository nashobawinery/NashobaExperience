import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Wine, ArrowLeft, ShoppingCart, MapPin } from "lucide-react";
import type { Experience, Location } from "@shared/schema";
import { useReservationCart } from "@/contexts/reservation-cart-context";
import { ExperienceCard } from "@/pages/reservations/landing";

function experienceImage(experience: Experience): string {
  if (experience.imageUrl && !experience.imageUrl.startsWith("/@fs/")) return experience.imageUrl;
  if (experience.primaryImageKey && experience.primaryImageKey.startsWith("/api/")) return experience.primaryImageKey;
  return "";
}

export default function LocationLanding() {
  const params = useParams<{ id: string }>();
  const locationId = params.id;
  const { isInCart, cartCount } = useReservationCart();

  const { data: location, isLoading: locationLoading } = useQuery<Location>({
    queryKey: ["/api/resy/locations", locationId],
    enabled: !!locationId,
  });

  const { data: experiences, isLoading: experiencesLoading } = useQuery<Experience[]>({
    queryKey: ["/api/resy/experiences"],
  });

  const locationExperiences = (experiences || []).filter(
    (experience) => experience.isActive && experience.locationId === locationId
  );
  const heroImage = location?.imageUrl || locationExperiences.map(experienceImage).find(Boolean) || "";

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-72 md:h-96 overflow-hidden bg-muted">
        {heroImage && (
          <img src={heroImage} alt={location?.name || "Location"} className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/35 to-black/75" />
        <div className="absolute inset-0 flex flex-col items-center justify-end text-center px-4 pb-10">
          <h1 className="font-serif text-4xl md:text-6xl font-semibold text-white mb-3">
            {locationLoading ? "Loading..." : location?.name || "Location"}
          </h1>
          {location?.headline && (
            <p className="text-lg md:text-2xl text-white/90 max-w-3xl">{location.headline}</p>
          )}
        </div>
      </div>

      {cartCount > 0 && (
        <div className="bg-primary/10 border-b border-primary/20">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">
                You have {cartCount} reservation{cartCount > 1 ? "s" : ""} in your cart
              </span>
            </div>
            <Link href="/reservations/cart">
              <Button size="sm">View Cart & Checkout</Button>
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-10">
        <Link href="/reservations">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            All locations and experiences
          </Button>
        </Link>

        {location && (
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] mb-14">
            <div className="space-y-4">
              {location.address && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {location.address}
                </p>
              )}
              {location.description && (
                <p className="text-lg leading-relaxed text-foreground">{location.description}</p>
              )}
            </div>
            <Card>
              <CardContent className="p-6 space-y-3">
                <h2 className="font-serif text-2xl font-medium">What you are booking</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {location.bookingDetails || "Choose an experience below to reserve."}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <h2 className="font-serif text-3xl font-medium mb-6">Reserve</h2>
        {experiencesLoading || locationLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : !location ? (
          <p className="text-muted-foreground">This location could not be found.</p>
        ) : locationExperiences.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {locationExperiences.map((experience) => (
              <ExperienceCard
                key={experience.id}
                experience={experience}
                inCart={isInCart(experience.id)}
                cartCount={cartCount}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Wine className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">
              No reservations are open for {location.name} yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
