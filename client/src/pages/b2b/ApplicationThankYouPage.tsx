import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { CheckCircle, Mail, Clock, ArrowLeft } from "lucide-react";
import logoUrl from "@assets/NVW logo no background_1762469370864.png";

export default function ApplicationThankYouPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted py-8 md:py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card>
          <CardHeader className="text-center pb-6">
            <img 
              src={logoUrl} 
              alt="Nashoba Valley Winery" 
              className="h-20 w-auto mx-auto mb-6"
            />
            
            <div className="mx-auto mb-6 p-4 bg-green-100 dark:bg-green-900/30 rounded-full w-fit">
              <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" />
            </div>
            
            <CardTitle className="font-serif text-2xl md:text-3xl text-primary">
              Thank You for Your Application!
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <p className="text-lg text-muted-foreground">
                We've received your wholesale account application and are excited to review it.
              </p>
              
              <div className="flex items-center justify-center gap-2 text-primary font-semibold">
                <Clock className="h-5 w-5" />
                <span>Someone from our team will be in touch within 48 hours.</span>
              </div>
            </div>
            
            <div className="p-5 bg-primary/5 rounded-lg border border-primary/10">
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Need to Reach Us Sooner?
              </h3>
              <p className="text-muted-foreground">
                If you have an urgent question or need immediate assistance, please don't hesitate to email us at:
              </p>
              <a 
                href="mailto:support@nashobawinery.com"
                className="inline-block mt-2 text-primary font-semibold hover:underline"
                data-testid="link-support-email"
              >
                support@nashobawinery.com
              </a>
            </div>
            
            <div className="p-5 bg-muted/50 rounded-lg">
              <h3 className="font-semibold mb-2">What Happens Next?</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-primary">1.</span>
                  Our team will review your application and verify your business information.
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-primary">2.</span>
                  Once approved, you'll receive an email with your login credentials.
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-primary">3.</span>
                  You can then log in to view wholesale pricing and place orders.
                </li>
              </ul>
            </div>
            
            <div className="text-center pt-4">
              <Button
                variant="outline"
                onClick={() => setLocation("/b2b")}
                className="gap-2"
                data-testid="button-back-to-pricing"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Wholesale Pricing
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <p className="text-center text-sm text-muted-foreground mt-6">
          Thank you for considering Nashoba Valley Winery as your wholesale partner.
          We look forward to working with you!
        </p>
      </div>
    </div>
  );
}
