import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { reservationHref } from "@/lib/reservationLink";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ExternalLink, Calendar, Wine, Users, Link2, ShoppingCart, Check, AlertTriangle, Ticket } from "lucide-react";
import type { Experience, Location, ResySiteSetting, FooterLink } from "@shared/schema";
import heroImageDefault from "@/assets/winery-vineyard.jpg";
import { useReservationCart } from "@/contexts/reservation-cart-context";

export default function Landing() {
  const { data: experiences, isLoading: experiencesLoading } = useQuery<Experience[]>({
    queryKey: ["/api/resy/experiences"],
  });

  const { data: settingsArray = [] } = useQuery<ResySiteSetting[]>({
    queryKey: ["/api/resy/settings"],
  });

  const { data: footerLinks = [] } = useQuery<FooterLink[]>({
    queryKey: ["/api/resy/footer-links"],
  });

  const { isInCart, cartCount } = useReservationCart();

  const { isLoading: locationsLoading } = useQuery<Location[]>({
    queryKey: ["/api/resy/locations"],
  });

  const activeExperiences = experiences?.filter(exp => exp.isActive && exp.showOnMasterPage !== false) || [];
  const siteRow = settingsArray[0];

  const headerImage = siteRow?.headerImageUrl?.trim() ? siteRow.headerImageUrl : heroImageDefault;
  const headerTitle =
    siteRow?.headerTitle?.trim() ||
    "Welcome to Nashoba Valley Winery, Distillery and Brewery Reservation Page";
  const headerSubtitle =
    siteRow?.headerSubtitle?.trim() ||
    "Experience the finest wines, spirits, and cuisine at our multi-location destination";

  return (
    <div className="relative min-h-screen">
      <img src={heroImageDefault} alt="" className="fixed inset-0 h-full w-full object-cover" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-xl flex-col px-4 py-8 md:py-14">
        <div className="rounded-2xl bg-white/90 p-4 shadow-xl backdrop-blur-sm md:p-5">
          <img
            src={headerImage}
            alt={headerTitle}
            className="mb-4 aspect-[16/10] w-full rounded-xl object-cover"
          />
          <h1 className="sr-only">{headerTitle}</h1>
          <p className="sr-only">{headerSubtitle}</p>
          {cartCount > 0 && (
            <div className="mb-3 flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
              <span className="flex items-center gap-2 text-sm font-medium">
                <ShoppingCart className="h-4 w-4" />
                {cartCount} in your cart
              </span>
              <Link href="/reservations/cart">
                <Button size="sm" variant="outline" className="rounded-full" data-testid="button-view-cart-banner">View cart</Button>
              </Link>
            </div>
          )}
          <div className="space-y-3">
            {(experiencesLoading || locationsLoading) && (
              [...Array(3)].map((_, index) => <div key={index} className="h-24 animate-pulse rounded-xl bg-white" />)
            )}
            {!experiencesLoading && activeExperiences.map((experience) => (
              <MasterBookingRow
                key={experience.id}
                experience={experience}
                inCart={isInCart(experience.id)}
                cartCount={cartCount}
              />
            ))}
            {!experiencesLoading && activeExperiences.length === 0 && (
              <p className="rounded-xl bg-white px-4 py-6 text-center text-sm text-muted-foreground">No reservations are open right now.</p>
            )}
          </div>
        </div>
        <footer className="mt-6 pb-6 text-center text-white drop-shadow">
        <div className="px-4 py-6">
          {footerLinks.length > 0 && (
            <div className="flex flex-wrap justify-center gap-6 mb-6">
              {footerLinks.sort((a, b) => a.displayOrder - b.displayOrder).map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  data-testid={`footer-link-${link.id}`}
                >
                  {link.iconUrl ? (
                    <img 
                      src={link.iconUrl} 
                      alt={link.name}
                      className="w-6 h-6 rounded object-cover"
                    />
                  ) : (
                    <Link2 className="w-4 h-4" />
                  )}
                  <span className="text-sm">{link.name}</span>
                </a>
              ))}
            </div>
          )}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Nashoba Valley Winery. All rights reserved.
            </p>
            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                asChild
                data-testid="link-admin"
              >
                <a href="/api/login">Admin Login</a>
              </Button>
            </div>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}

function MasterBookingRow({ experience, inCart, cartCount }: { experience: Experience; inCart: boolean; cartCount: number }) {
  const [showExternalWarning, setShowExternalWarning] = useState(false);
  const price = experience.showPrice !== false && experience.price ? parseFloat(experience.price) : null;
  const label = experience.reservationType === "ticketed" ? "Experience" : "Reservation";
  const book = (
    <Button variant="outline" className="h-10 shrink-0 rounded-full px-5" disabled={inCart} data-testid={`button-book-${experience.id}`}>
      {inCart ? "In cart" : "Book"}
    </Button>
  );

  return (
    <div className="flex items-center gap-3 rounded-xl bg-[#f4f4f5] px-4 py-3" data-testid={`card-experience-${experience.id}`}>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-lg font-semibold">{experience.name}</p>
        {price != null && !Number.isNaN(price) && (
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <Ticket className="h-3.5 w-3.5" />
            ${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)} per {experience.reservationType === "ticketed" ? "ticket" : "person"}
          </p>
        )}
      </div>
      {inCart ? book : experience.isExternal ? (
        <>
          <Button variant="outline" className="h-10 shrink-0 rounded-full px-5" onClick={() => cartCount > 0 ? setShowExternalWarning(true) : experience.externalUrl && window.open(experience.externalUrl, "_blank", "noopener,noreferrer")} data-testid={`button-book-${experience.id}`}>
            Book
          </Button>
          <AlertDialog open={showExternalWarning} onOpenChange={setShowExternalWarning}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>External reservation system</AlertDialogTitle>
                <AlertDialogDescription>
                  This booking opens another reservation system. Finish the items in your cart first, or continue and leave the cart behind.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => { setShowExternalWarning(false); window.location.href = "/reservations/cart"; }}>Return to cart</AlertDialogCancel>
                <AlertDialogAction onClick={() => experience.externalUrl && window.open(experience.externalUrl, "_blank", "noopener,noreferrer")}>Continue anyway</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : (
        <Link href={reservationHref(experience)}>{book}</Link>
      )}
    </div>
  );
}

export function ExperienceCard({ experience, inCart, cartCount }: { experience: Experience; inCart: boolean; cartCount: number }) {
  const [showExternalWarning, setShowExternalWarning] = useState(false);

  const getImageUrl = (exp: Experience) => {
    if (exp.imageUrl && !exp.imageUrl.startsWith('/@fs/')) return exp.imageUrl;
    if (exp.primaryImageKey && exp.primaryImageKey.startsWith('/api/')) return exp.primaryImageKey;
    return "";
  };

  const imageUrl = getImageUrl(experience);

  const handleExternalClick = () => {
    if (cartCount > 0) {
      setShowExternalWarning(true);
    } else {
      proceedToExternal();
    }
  };

  const proceedToExternal = () => {
    if (experience.externalUrl) {
      window.open(experience.externalUrl, '_blank', 'noopener,noreferrer');
    }
    setShowExternalWarning(false);
  };

  const handleReturnToCart = () => {
    setShowExternalWarning(false);
    window.location.href = '/reservations/cart';
  };

  const shouldShowPrice = experience.showPrice !== false;

  return (
    <Card className={`overflow-hidden transition-all duration-200 group ${inCart ? 'opacity-75' : 'hover-elevate'}`}>
      {imageUrl && (
        <div className="aspect-[4/3] overflow-hidden relative">
          <img
            src={imageUrl}
            alt={experience.name}
            className={`w-full h-full object-cover transition-transform duration-200 ${inCart ? 'grayscale' : 'group-hover:scale-105'}`}
          />
          {inCart && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <Badge className="bg-primary text-primary-foreground">
                <Check className="w-3 h-3 mr-1" />
                In Cart
              </Badge>
            </div>
          )}
        </div>
      )}
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-sans text-xl font-semibold text-foreground">
            {experience.name}
          </h3>
          {experience.isExternal && (
            <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
          )}
        </div>
        {(experience.shortDescription || experience.description) && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2" data-testid="text-short-description">
            {experience.shortDescription || experience.description}
          </p>
        )}
        {shouldShowPrice && experience.price && experience.reservationType === 'ticketed' && (
          <p className="text-sm font-medium text-foreground mb-4">
            From ${parseFloat(experience.price).toFixed(2)} per person
          </p>
        )}
        {inCart ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center italic" data-testid="text-in-cart-message">
              This Experience is limited to a single purchase per Customer
            </p>
            <Button
              variant="outline"
              className="w-full"
              disabled
              data-testid={`button-book-${experience.id}-disabled`}
            >
              <Check className="w-4 h-4 mr-2" />
              Already in Cart
            </Button>
          </div>
        ) : experience.isExternal ? (
          <>
            <Button
              className="w-full"
              onClick={handleExternalClick}
              data-testid={`button-book-${experience.id}`}
            >
              Reserve Now
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
            <AlertDialog open={showExternalWarning} onOpenChange={setShowExternalWarning}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <AlertDialogTitle>External Reservation System</AlertDialogTitle>
                  </div>
                  <AlertDialogDescription className="text-left">
                    You are being directed to a different reservation system for this experience. The items in your cart will not be transferred and may be lost if you don't complete your purchase first.
                    <br /><br />
                    We suggest that you press the Return button below and check out to purchase the items in your cart, then return to this reservation platform and book a reservation for this experience.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={handleReturnToCart}
                    data-testid="button-external-return"
                  >
                    Return to Cart
                  </Button>
                  <AlertDialogAction 
                    onClick={proceedToExternal}
                    data-testid="button-external-proceed"
                  >
                    Continue Anyway
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : (
          <Button
            className="w-full"
            asChild
            data-testid={`button-book-${experience.id}`}
          >
            <Link href={reservationHref(experience)}>
              {experience.reservationType === 'ticketed' ? (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Tickets
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Reserve Table
                </>
              )}
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
