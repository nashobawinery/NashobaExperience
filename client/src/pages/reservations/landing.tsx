import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
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
import { ExternalLink, Calendar, Wine, Users, Link2, ShoppingCart, Check, AlertTriangle } from "lucide-react";
import type { Experience, ResySiteSetting, FooterLink } from "@shared/schema";
import heroImageDefault from "@assets/stock_images/winery_vineyard_land_9ae4eda8.jpg";
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

  const activeExperiences = experiences?.filter(exp => exp.isActive) || [];
  
  const getSetting = (key: string, defaultValue: string = "") => {
    const setting = settingsArray.find(s => s.key === key);
    return setting?.value || defaultValue;
  };
  
  const headerImage = getSetting("headerImageUrl", "") || heroImageDefault;
  const headerTitle = getSetting("headerTitle", "Welcome to Nashoba Valley Winery, Distillery and Brewery Reservation Page");
  const headerSubtitle = getSetting("headerSubtitle", "Experience the finest wines, spirits, and cuisine at our multi-location destination");

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative h-80 overflow-hidden">
        <img
          src={headerImage}
          alt={headerTitle}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-semibold text-white mb-4 max-w-4xl">
            {headerTitle}
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl">
            {headerSubtitle}
          </p>
        </div>
      </div>

      {/* Cart Banner */}
      {cartCount > 0 && (
        <div className="bg-primary/10 border-b border-primary/20">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">
                You have {cartCount} reservation{cartCount > 1 ? 's' : ''} in your cart
              </span>
            </div>
            <Link href="/reservations/cart">
              <Button size="sm" data-testid="button-view-cart-banner">
                View Cart & Checkout
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl md:text-4xl font-medium text-foreground mb-4">
            Reserve Your Experience
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From intimate tastings to guided tours and fine dining, discover all that Nashoba Valley has to offer
          </p>
        </div>

        {/* Experiences Grid */}
        {experiencesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="aspect-[4/3] bg-muted animate-pulse" />
                <CardContent className="p-6">
                  <div className="h-6 bg-muted rounded animate-pulse mb-3" />
                  <div className="h-4 bg-muted rounded animate-pulse mb-2 w-3/4" />
                  <div className="h-10 bg-muted rounded animate-pulse mt-4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeExperiences.map((experience) => (
              <ExperienceCard 
                key={experience.id} 
                experience={experience} 
                inCart={isInCart(experience.id)}
                cartCount={cartCount}
              />
            ))}
          </div>
        )}

        {activeExperiences.length === 0 && !experiencesLoading && (
          <div className="text-center py-12">
            <Wine className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">
              No experiences available at this time. Please check back soon.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
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
  );
}

function ExperienceCard({ experience, inCart, cartCount }: { experience: Experience; inCart: boolean; cartCount: number }) {
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
            <Link href={`/book/${experience.id}`}>
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
