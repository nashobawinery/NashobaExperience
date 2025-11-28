import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wine, ShoppingBag, Sparkles } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <Wine className="w-12 h-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl">Nashoba Tasting Experience</CardTitle>
          <CardDescription className="text-base">
            Your digital companion for an enhanced wine tasting journey
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold">AI-Powered Recommendations</h3>
                <p className="text-sm text-muted-foreground">
                  Get personalized wine suggestions based on your preferences
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShoppingBag className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold">Seamless Shopping</h3>
                <p className="text-sm text-muted-foreground">
                  Build your cart and enjoy tier-based discounts
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <img 
                src="/nvw-logo.png" 
                alt="Nashoba Logo" 
                className="w-5 h-5 object-contain flex-shrink-0"
              />
              <div>
                <h3 className="font-semibold">Interactive Trivia</h3>
                <p className="text-sm text-muted-foreground">
                  Learn about wine while earning rewards
                </p>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleLogin} 
            className="w-full" 
            size="lg"
            data-testid="button-login"
          >
            Sign In to Get Started
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
