import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wine, TrendingDown, Package, Shield, ChevronRight, ChevronLeft, Sprout, Users, Award, Mail, Heart, Star, GlassWater, MapPin, Boxes } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useB2bPublicTiers } from "@/hooks/useB2bProducts";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { B2bSlideshowSlide } from "@shared/schema";

type B2bSlideshowSlideWithMedia = B2bSlideshowSlide & { mediaUrl?: string };

export default function B2BPricingPage() {
  const [, setLocation] = useLocation();
  const [accessCode, setAccessCode] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    name: "",
    businessName: "",
    email: "",
  });
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [selectedTierCategory, setSelectedTierCategory] = useState<string>("wine");
  const { toast } = useToast();
  const { data: activeTiers, isLoading: loadingTiers } = useB2bPublicTiers();
  const { data: slides = [], isLoading: loadingSlides } = useQuery<B2bSlideshowSlideWithMedia[]>({
    queryKey: ["/api/b2b/slideshow/slides"],
  });

  // Category labels mapping
  const categoryLabels: Record<string, string> = {
    "wine": "Wine",
    "spirits": "Spirits",
    "beer": "Beer",
    "canned_cocktail": "Canned Cocktails",
    "canned_wine": "Canned Wine",
    "cider": "Cider"
  };
  const categories = Object.keys(categoryLabels);

  // Group tiers by category
  const tiersByCategory = useMemo(() => {
    if (!activeTiers) return {};
    const grouped: Record<string, typeof activeTiers> = {};
    for (const tier of activeTiers) {
      const category = tier.category || "wine";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(tier);
    }
    return grouped;
  }, [activeTiers]);

  const categoryTiers = tiersByCategory[selectedTierCategory] || [];

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);

    try {
      const response = await fetch("/api/b2b/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: accessCode }),
      });

      const data = await response.json();

      if (data.valid) {
        setIsVerified(true);
        sessionStorage.setItem("b2b_verified", "true");
        toast({
          title: "Access Granted",
          description: "Welcome to our wholesale platform",
        });
      } else {
        toast({
          title: "Invalid Access Code",
          description: "Please check your code and try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify access code",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const iconMap: Record<string, any> = {
    Sprout,
    Users,
    Award,
    Wine,
    Package,
    TrendingDown,
    Shield,
    Heart,
    Star,
  };

  const getIconComponent = (iconName?: string | null) => {
    if (!iconName || iconName === "none") return null;
    return iconMap[iconName] || null;
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(currentSlide - 1);
    }
  };

  const goToSlide = (index: number) => {
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingRequest(true);

    try {
      const response = await fetch("/api/b2b/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestForm),
      });

      if (response.ok) {
        toast({
          title: "Request Sent",
          description: "We'll contact you shortly with your access code",
        });
        setRequestDialogOpen(false);
        setRequestForm({ name: "", businessName: "", email: "" });
      } else {
        toast({
          title: "Error",
          description: "Failed to send request. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Initial welcome view (before access code entry)
  if (!isVerified) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        {/* Background Image with Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/90 via-primary/70 to-primary/50 z-10" />
        <img 
          src="/winery-aerial.webp" 
          alt="Nashoba Valley Winery Aerial View" 
          className="absolute inset-0 w-full h-full object-cover" 
        />
        
        <div className="relative z-20 w-full max-w-2xl px-6 py-12 text-center">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <img 
              src="/nvw-logo.png" 
              alt="Nashoba Valley Winery Logo" 
              className="w-48 h-auto object-contain drop-shadow-2xl"
              style={{ mixBlendMode: 'multiply' }}
            />
          </div>
          
          {/* Title */}
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-light text-primary-foreground mb-4 tracking-wide leading-tight">
            Nashoba Valley Winery
          </h1>
          <p className="text-2xl md:text-3xl text-primary-foreground/90 mb-4 font-light">
            Wholesale Program
          </p>
          <p className="text-lg text-primary-foreground/80 mb-12 max-w-xl mx-auto">
            Premium wines, spirits, and craft beverages from our working farm
          </p>

          {/* Access Code Form */}
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="bg-background/95 backdrop-blur-md rounded-lg p-6 shadow-xl">
              <Label htmlFor="access-code" className="text-base mb-3 block">
                Enter Access Code to View Wholesale Pricing
              </Label>
              <Input
                id="access-code"
                data-testid="input-access-code"
                type="text"
                placeholder="Enter your Wholesale Access Code Here"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                className="text-center text-xl font-mono tracking-wider border-2 border-primary/30 bg-background/50 focus-visible:ring-2 focus-visible:border-primary py-6 mb-4"
                required
              />
              <Button
                type="submit"
                data-testid="button-verify-code"
                size="lg"
                className="w-full py-6 text-lg font-medium"
                disabled={isVerifying || !accessCode}
              >
                {isVerifying ? "Verifying..." : "View Wholesale Pricing"}
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                No Access Code? Press the Request button below
              </p>
            </div>
          </form>

          {/* Login Links */}
          <div className="mt-8 space-y-3">
            <p className="text-sm text-primary-foreground/70">
              Already have an account?
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                className="bg-background/20 backdrop-blur-sm border-primary-foreground/30 text-primary-foreground hover:bg-background/30"
                onClick={() => setLocation("/b2b/login/customer")}
                data-testid="button-customer-login"
              >
                Customer Login
              </Button>
              <Button
                variant="outline"
                className="bg-background/20 backdrop-blur-sm border-primary-foreground/30 text-primary-foreground hover:bg-background/30"
                onClick={() => setLocation("/b2b/login/admin")}
                data-testid="button-admin-login"
              >
                Admin Login
              </Button>
            </div>
          </div>

          {/* Request Access Code Dialog */}
          <div className="mt-8 text-center">
            <p className="text-sm text-primary-foreground/70 mb-3">
              Don't have an access code?
            </p>
            <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-background/20 backdrop-blur-sm border-primary-foreground/30 text-primary-foreground hover:bg-background/30 gap-2"
                  data-testid="button-request-access"
                >
                  <Mail className="h-4 w-4" />
                  Request Access Code
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Request Wholesale Access Code</DialogTitle>
                  <DialogDescription>
                    Fill out the form below and we'll send you an access code to view our wholesale pricing.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleRequestAccess} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="request-name">Your Name *</Label>
                    <Input
                      id="request-name"
                      data-testid="input-request-name"
                      type="text"
                      placeholder="John Doe"
                      value={requestForm.name}
                      onChange={(e) => setRequestForm({ ...requestForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="request-business">Store/Restaurant Name *</Label>
                    <Input
                      id="request-business"
                      data-testid="input-request-business"
                      type="text"
                      placeholder="My Restaurant & Bar"
                      value={requestForm.businessName}
                      onChange={(e) => setRequestForm({ ...requestForm, businessName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="request-email">Email Address *</Label>
                    <Input
                      id="request-email"
                      data-testid="input-request-email"
                      type="email"
                      placeholder="you@yourbusiness.com"
                      value={requestForm.email}
                      onChange={(e) => setRequestForm({ ...requestForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setRequestDialogOpen(false)}
                      className="flex-1"
                      data-testid="button-cancel-request"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={isSubmittingRequest}
                      data-testid="button-submit-request"
                    >
                      {isSubmittingRequest ? "Sending..." : "Submit Request"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    );
  }

  // Pricing view (after access code verified)
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/90 via-primary/70 to-primary/50 z-10" />
        <img 
          src="/winery-aerial.webp" 
          alt="Nashoba Valley Winery" 
          className="absolute inset-0 w-full h-full object-cover" 
        />
        
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <img 
                src="/nvw-logo.png" 
                alt="Nashoba Valley Winery Logo" 
                className="w-32 md:w-40 h-auto object-contain drop-shadow-2xl"
                style={{ mixBlendMode: 'multiply' }}
              />
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-light text-primary-foreground mb-3">
              Wholesale Pricing
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl mx-auto">
              Premium products from our working farm to your business
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Why Partner With Us Slideshow */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="font-serif text-2xl md:text-3xl text-center">
              Why Partner With Nashoba Valley Winery
            </CardTitle>
            <CardDescription className="text-center text-base">
              Supporting local farms while offering exceptional products
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSlides ? (
              <div className="py-12 space-y-4">
                <Skeleton className="h-64 w-full" />
                <div className="flex justify-center gap-2">
                  <Skeleton className="h-2.5 w-2.5 rounded-full" />
                  <Skeleton className="h-2.5 w-2.5 rounded-full" />
                  <Skeleton className="h-2.5 w-2.5 rounded-full" />
                </div>
              </div>
            ) : slides.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <p>No slideshow content available at this time.</p>
              </div>
            ) : (
            <div className="relative">
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                  key={currentSlide}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                  }}
                  className="py-8"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                    {/* Media Column (1/3 width) */}
                    {slides[currentSlide].mediaType !== "none" && slides[currentSlide].mediaUrl && (
                      <div className="md:col-span-1">
                        {slides[currentSlide].mediaType === "image" ? (
                          <img 
                            src={slides[currentSlide].mediaUrl!} 
                            alt={slides[currentSlide].title}
                            className="w-full h-auto rounded-lg object-cover"
                          />
                        ) : slides[currentSlide].mediaType === "video" ? (
                          <video 
                            src={slides[currentSlide].mediaUrl!}
                            controls
                            className="w-full h-auto rounded-lg"
                          >
                            Your browser does not support the video tag.
                          </video>
                        ) : null}
                      </div>
                    )}
                    
                    {/* Content Column (2/3 width) */}
                    <div className={slides[currentSlide].mediaType !== "none" && slides[currentSlide].mediaUrl ? "md:col-span-2" : "md:col-span-3"}>
                      <div className="text-center max-w-3xl mx-auto">
                        {(() => {
                          const IconComponent = getIconComponent(slides[currentSlide].iconName);
                          return IconComponent ? (
                            <div className="flex justify-center mb-6">
                              <IconComponent className="h-16 w-16 text-primary" />
                            </div>
                          ) : null;
                        })()}
                        <h3 className="text-2xl md:text-3xl font-serif font-light mb-4">
                          {slides[currentSlide].title}
                        </h3>
                        <p className="text-base md:text-lg text-muted-foreground mb-6 leading-relaxed">
                          {slides[currentSlide].content}
                        </p>
                        {slides[currentSlide].highlight && (
                          <div className="inline-block bg-primary/10 border border-primary/20 rounded-lg px-6 py-3">
                            <p className="text-sm md:text-base font-medium text-primary">
                              {slides[currentSlide].highlight}
                            </p>
                          </div>
                        )}
                        
                        {/* View B2B Pricing button on last slide */}
                        {currentSlide === slides.length - 1 && (
                          <div className="mt-8">
                            <Button
                              size="lg"
                              onClick={() => setLocation("/b2b/pricing-sheet")}
                              className="gap-2 text-lg px-8 py-6"
                              data-testid="button-view-pricing-sheet"
                            >
                              <TrendingDown className="h-5 w-5" />
                              View B2B Pricing Sheet
                            </Button>
                            <p className="text-sm text-muted-foreground mt-3">
                              See detailed pricing and profit margins by tier
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex justify-between items-center mt-8 gap-4">
                <Button
                  variant="outline"
                  onClick={prevSlide}
                  disabled={currentSlide === 0}
                  className="gap-2"
                  data-testid="button-prev-slide"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>

                {/* Progress Dots */}
                <div className="flex gap-2">
                  {slides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToSlide(index)}
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        index === currentSlide
                          ? "w-8 bg-primary"
                          : "w-2.5 bg-muted-foreground/40 hover:bg-muted-foreground/60"
                      }`}
                      data-testid={`dot-slide-${index}`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>

                <Button
                  onClick={nextSlide}
                  disabled={currentSlide === slides.length - 1}
                  className="gap-2"
                  data-testid="button-next-slide"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing Tiers and Set Up Account */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Additional Services */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-2xl flex items-center gap-2">
                <Wine className="h-6 w-6 text-primary" />
                Additional Services We Offer
              </CardTitle>
              <CardDescription>
                Enhance your business with our value-added services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <GlassWater className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm mb-1">In-Store Tastings & Wine Dinners</p>
                  <p className="text-sm text-muted-foreground">
                    Let us host an in-store tasting or wine dinner featuring our premium adult beverages
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Boxes className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm mb-1">Sample Program</p>
                  <p className="text-sm text-muted-foreground">
                    Get 1-ounce samples of our wines mailed directly to your store
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm mb-1">Winery Tours</p>
                  <p className="text-sm text-muted-foreground">
                    Set up a visit to our winery for you and your staff to explore our products and our passion
                  </p>
                </div>
              </div>

              {/* Pricing Tiers */}
              <div className="pt-6 border-t">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingDown className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Wholesale Pricing Tiers</h3>
                  <p className="text-sm text-muted-foreground mt-1">Category-specific pricing for different beverage types</p>
                </div>
                {loadingTiers ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : !activeTiers || activeTiers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No active pricing tiers available at this time
                  </p>
                ) : (
                  <Tabs value={selectedTierCategory} onValueChange={setSelectedTierCategory} className="mt-4">
                    <TabsList className="grid w-full grid-cols-6">
                      {categories.map((cat) => (
                        <TabsTrigger key={cat} value={cat} data-testid={`tab-${cat}-pricing`}>
                          {categoryLabels[cat]}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    {categories.map((category) => (
                      <TabsContent key={category} value={category} className="mt-4">
                        {categoryTiers.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">
                            No active pricing tiers for {categoryLabels[category]}
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {categoryTiers.map((tier) => (
                              <div
                                key={tier.id}
                                className="flex items-center justify-between p-3 rounded-lg border bg-card hover-elevate"
                                data-testid={`tier-${tier.tierName}`}
                              >
                                <div>
                                  <p className="font-semibold">{tier.tierName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {tier.description || "Wholesale pricing"}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xl font-bold text-primary">{tier.discountPercentage}%</p>
                                  <p className="text-xs text-muted-foreground">off retail</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>
                    ))}
                  </Tabs>
                )}
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Package className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm mb-1">Case Quantities</p>
                      <p className="text-sm text-muted-foreground">
                        All orders are calculated by case (12 bottles per case)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ready to Get Started - Right Column */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-2xl flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                Ready to Get Started?
              </CardTitle>
              <CardDescription>
                Set up your wholesale account to start ordering
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-semibold">
                    1
                  </div>
                  <div>
                    <p className="font-medium mb-1">Create Account</p>
                    <p className="text-sm text-muted-foreground">
                      Register with your business details
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-semibold">
                    2
                  </div>
                  <div>
                    <p className="font-medium mb-1">Quick Approval</p>
                    <p className="text-sm text-muted-foreground">
                      Our team reviews your account (typically within 24 hours)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-semibold">
                    3
                  </div>
                  <div>
                    <p className="font-medium mb-1">Start Ordering</p>
                    <p className="text-sm text-muted-foreground">
                      Browse products and place orders at your tier pricing
                    </p>
                  </div>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full text-lg py-6"
                onClick={() => setLocation("/b2b/register")}
                data-testid="button-setup-account"
              >
                Set Up Your Account
              </Button>

              <div className="pt-4 border-t">
                <p className="text-sm text-center text-muted-foreground mb-3">
                  Already have an account?
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setLocation("/b2b/login/customer")}
                    data-testid="button-customer-login-bottom"
                  >
                    Customer Login
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setLocation("/b2b/login/admin")}
                    data-testid="button-admin-login-bottom"
                  >
                    Admin Login
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Benefits Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="text-center">
            <CardContent className="pt-6">
              <TrendingDown className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold text-lg mb-2">Wholesale Discounts</h3>
              <p className="text-sm text-muted-foreground">
                Save 10% to 60% off retail prices with our tier-based pricing
              </p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <Sprout className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold text-lg mb-2">Local & Sustainable</h3>
              <p className="text-sm text-muted-foreground">
                Support a working farm committed to sustainable agriculture
              </p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold text-lg mb-2">Dedicated Support</h3>
              <p className="text-sm text-muted-foreground">
                Assigned sales representative for personalized service
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Proceed to Pricing Sheet Button */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button
            size="lg"
            variant="outline"
            onClick={() => setLocation("/b2b/where-to-buy")}
            className="gap-2 text-lg px-12 py-6"
            data-testid="button-where-to-buy"
          >
            <MapPin className="h-5 w-5" />
            Where to Buy
          </Button>
          <Button
            size="lg"
            onClick={() => setLocation("/b2b/pricing-sheet")}
            className="gap-2 text-lg px-12 py-6"
            data-testid="button-proceed-to-pricing"
          >
            <TrendingDown className="h-5 w-5" />
            Proceed to Pricing Sheet
          </Button>
        </div>
      </div>
    </div>
  );
}
