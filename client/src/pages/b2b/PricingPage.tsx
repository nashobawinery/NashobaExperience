import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, Wine, TrendingDown, Package, Clock, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useB2bPublicTiers } from "@/hooks/useB2bProducts";
import { Skeleton } from "@/components/ui/skeleton";

export default function B2BPricingPage() {
  const [, setLocation] = useLocation();
  const [accessCode, setAccessCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();
  const { data: activeTiers, isLoading: loadingTiers } = useB2bPublicTiers();

  const handleSubmit = async (e: React.FormEvent) => {
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
        toast({
          title: "Access Granted",
          description: "Welcome to our wholesale platform",
        });
        // Store verification in sessionStorage
        sessionStorage.setItem("b2b_verified", "true");
        setLocation("/b2b/register");
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

  const features = [
    {
      icon: TrendingDown,
      title: "Wholesale Pricing",
      description: "Exclusive tier-based discounts from 10% to 60% off retail",
    },
    {
      icon: Package,
      title: "Case Quantities",
      description: "All orders calculated by case (12 bottles per case)",
    },
    {
      icon: Clock,
      title: "Fast Approval",
      description: "Quick account approval process, typically within 24 hours",
    },
    {
      icon: Shield,
      title: "Dedicated Support",
      description: "Assigned sales representative for personalized service",
    },
  ];


  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary opacity-90" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <Wine className="h-16 w-16 mx-auto mb-6 text-primary-foreground/80" />
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-light mb-6">
              Nashoba Valley Winery
            </h1>
            <p className="text-xl md:text-2xl font-light mb-4">
              Wholesale Program
            </p>
            <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
              Premium wines, spirits, and craft beverages for restaurants, retailers, and distributors
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="text-center">
              <CardContent className="pt-6">
                <feature.icon className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Pricing Tiers */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-2xl">Pricing Tiers</CardTitle>
              <CardDescription>
                Competitive wholesale pricing based on your account tier
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                <div className="space-y-3">
                  {activeTiers.map((tier) => (
                    <div
                      key={tier.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div>
                        <p className="font-medium">{tier.tierName}</p>
                        <p className="text-sm text-muted-foreground">Wholesale pricing</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">{tier.discountPercentage}% off</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Access Code Entry */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-2xl flex items-center gap-2">
                <Lock className="h-6 w-6" />
                Access Required
              </CardTitle>
              <CardDescription>
                Enter your access code to view pricing and register
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="access-code">Access Code</Label>
                  <Input
                    id="access-code"
                    data-testid="input-access-code"
                    type="text"
                    placeholder="Enter your access code"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    className="text-center text-lg font-mono tracking-wider"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Contact your sales representative for an access code
                  </p>
                </div>

                <Button
                  type="submit"
                  data-testid="button-verify-code"
                  className="w-full"
                  size="lg"
                  disabled={isVerifying || !accessCode}
                >
                  {isVerifying ? "Verifying..." : "Continue to Registration"}
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
                      data-testid="button-customer-login"
                    >
                      Customer Login
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setLocation("/b2b/login/admin")}
                      data-testid="button-admin-login"
                    >
                      Admin Login
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-2xl">How It Works</CardTitle>
            <CardDescription>Simple steps to start ordering</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-3 text-xl font-semibold">
                  1
                </div>
                <h4 className="font-medium mb-2">Register</h4>
                <p className="text-sm text-muted-foreground">
                  Complete registration with your business details
                </p>
              </div>
              <div className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-3 text-xl font-semibold">
                  2
                </div>
                <h4 className="font-medium mb-2">Get Approved</h4>
                <p className="text-sm text-muted-foreground">
                  Our team reviews and approves your account
                </p>
              </div>
              <div className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-3 text-xl font-semibold">
                  3
                </div>
                <h4 className="font-medium mb-2">Browse & Order</h4>
                <p className="text-sm text-muted-foreground">
                  View tier pricing and place orders by case
                </p>
              </div>
              <div className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-3 text-xl font-semibold">
                  4
                </div>
                <h4 className="font-medium mb-2">Receive Products</h4>
                <p className="text-sm text-muted-foreground">
                  Fast fulfillment and dedicated support
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
