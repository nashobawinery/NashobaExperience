import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import nvwLogo from '@assets/NVW logo no background_1762469370864.png';

interface AgreementData {
  agreement: {
    id: string;
    businessName: string;
    contactName: string;
    address: string;
    email: string;
    phone: string;
    fiscalYearStart: string;
    fiscalYearEnd: string;
  };
  tiers: Array<{
    id: string;
    name: string;
    description: string;
    discountPercentage: string;
    minimumCases: number;
  }>;
}

export default function TierAgreementPage() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [selectedTierId, setSelectedTierId] = useState<string>('');
  const [signatureName, setSignatureName] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedTierName, setSubmittedTierName] = useState('');
  
  const todayDate = format(new Date(), 'MMMM d, yyyy');
  
  const { data, isLoading, error } = useQuery<AgreementData>({
    queryKey: ['/api/b2b/tier-agreement', token],
    enabled: !!token,
  });
  
  const submitMutation = useMutation({
    mutationFn: async (formData: { tierId: string; signatureName: string }) => {
      const response = await apiRequest('POST', `/api/b2b/tier-agreement/${token}/submit`, formData);
      return response.json();
    },
    onSuccess: (result: any) => {
      setIsSubmitted(true);
      setSubmittedTierName(result.tier);
      toast({
        title: 'Agreement Signed',
        description: 'Your tier agreement has been submitted successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit agreement',
        variant: 'destructive',
      });
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTierId) {
      toast({
        title: 'Please select a tier',
        description: 'You must select either Tier 3 or Tier 4 to continue.',
        variant: 'destructive',
      });
      return;
    }
    if (!signatureName.trim()) {
      toast({
        title: 'Signature required',
        description: 'Please type your name as your electronic signature.',
        variant: 'destructive',
      });
      return;
    }
    submitMutation.mutate({ tierId: selectedTierId, signatureName: signatureName.trim() });
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading agreement...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    const errorMessage = (error as any)?.message || 'Agreement not found or link has expired.';
    const alreadySigned = (error as any)?.alreadySigned;
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>{alreadySigned ? 'Already Signed' : 'Link Invalid'}</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-2xl">Agreement Signed Successfully!</CardTitle>
            <CardDescription className="text-base mt-2">
              Thank you for signing the Wholesale Tier Agreement. Your account has been upgraded to <strong>{submittedTierName}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              A confirmation email has been sent to your email address. You can now enjoy your enhanced wholesale pricing on all qualifying purchases.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!data) {
    return null;
  }
  
  const { agreement, tiers } = data;
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center bg-[#5C2535] text-white rounded-t-lg py-8">
            <div className="mb-4">
              <img 
                src={nvwLogo} 
                alt="Nashoba Valley Winery" 
                className="h-16 mx-auto"
                data-testid="img-nvw-logo"
              />
            </div>
            <CardTitle className="text-2xl md:text-3xl font-bold">
              Nashoba Valley Winery
            </CardTitle>
            <CardDescription className="text-white/90 text-lg mt-2">
              Wholesale Tier Agreement (Tier 3 or Tier 4)
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-6 md:p-8">
            <form onSubmit={handleSubmit}>
              <div className="prose prose-sm max-w-none mb-8">
                <p className="text-muted-foreground">
                  This Wholesale Tier Agreement ("Agreement") is made between Nashoba Valley Winery ("Nashoba") and the undersigned wholesale customer ("Customer").
                </p>
              </div>
              
              <Separator className="my-6" />
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-4">1. Tier Selection and Annual Purchase Commitment</h3>
                  <p className="text-muted-foreground mb-4">
                    Customer elects to participate in the following wholesale tier (select one):
                  </p>
                  
                  <RadioGroup
                    value={selectedTierId}
                    onValueChange={setSelectedTierId}
                    className="space-y-4"
                  >
                    {tiers.map((tier) => (
                      <div
                        key={tier.id}
                        className={`flex items-start space-x-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedTierId === tier.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedTierId(tier.id)}
                        data-testid={`tier-option-${tier.name.toLowerCase().replace(' ', '-')}`}
                      >
                        <RadioGroupItem value={tier.id} id={tier.id} className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor={tier.id} className="text-base font-semibold cursor-pointer">
                            {tier.name} – {tier.discountPercentage}% Discount
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Customer agrees to purchase a minimum of <strong>{tier.minimumCases} cases</strong> during Nashoba's fiscal year.
                          </p>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                  
                  <p className="text-muted-foreground mt-4 text-sm">
                    In return, Customer will receive the wholesale discount associated with the selected Tier for all qualifying purchases during the fiscal year.
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-semibold text-lg mb-3">2. Term and Renewal</h3>
                  <p className="text-muted-foreground text-sm">
                    This Agreement begins on the date signed and continues for 12 consecutive months which will be the fiscal year for this agreement. The Agreement will automatically renew at the end of each fiscal year unless terminated by either party.
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-semibold text-lg mb-3">3. Failure to Meet Minimum Case Commitment</h3>
                  <p className="text-muted-foreground text-sm">
                    If Customer does not meet the minimum case requirement by the end of the fiscal year—or by the termination date if Customer ends the Agreement early—Customer agrees to pay the difference between the Tier discount received and the price Customer would have paid under Tier 1 or Tier 2, depending on eligibility. Nashoba will calculate the shortfall and issue an invoice for the difference. Customer agrees to pay this invoice in full within 30 days.
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-semibold text-lg mb-3">4. Early Termination</h3>
                  <p className="text-muted-foreground text-sm">
                    Customer may terminate this Agreement at any time by providing written notice. If Customer terminates early and has not yet met the required case minimum, Section 3 above applies.
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-semibold text-lg mb-3">5. Eligibility and Compliance</h3>
                  <p className="text-muted-foreground text-sm">
                    Customer affirms that they hold all licenses required to purchase and resell alcoholic beverages. Nashoba reserves the right to suspend or terminate this Agreement if Customer violates program terms or applicable regulations.
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-semibold text-lg mb-3">6. Entire Agreement</h3>
                  <p className="text-muted-foreground text-sm">
                    This document represents the full Agreement between Nashoba and Customer regarding wholesale tier participation. Changes must be made in writing and agreed to by both parties.
                  </p>
                </div>
                
                <Separator className="my-8" />
                
                <div className="bg-muted/50 rounded-lg p-6 space-y-4">
                  <h3 className="font-semibold text-lg">Customer Information</h3>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-muted-foreground text-sm">Business Name</Label>
                      <p className="font-medium" data-testid="text-business-name">{agreement.businessName}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Contact Name</Label>
                      <p className="font-medium" data-testid="text-contact-name">{agreement.contactName}</p>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-muted-foreground text-sm">Address</Label>
                      <p className="font-medium" data-testid="text-address">{agreement.address}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Email</Label>
                      <p className="font-medium" data-testid="text-email">{agreement.email}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Phone</Label>
                      <p className="font-medium" data-testid="text-phone">{agreement.phone}</p>
                    </div>
                  </div>
                </div>
                
                <Separator className="my-8" />
                
                <div className="space-y-6">
                  <h3 className="font-semibold text-lg">Signature</h3>
                  
                  <p className="text-muted-foreground text-sm">
                    By signing below, Customer agrees to the terms of this Agreement and acknowledges the annual case commitment required for the selected wholesale tier.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signature">Customer Signature (Type your full name)</Label>
                      <Input
                        id="signature"
                        value={signatureName}
                        onChange={(e) => setSignatureName(e.target.value)}
                        placeholder="Type your full name as your signature"
                        className="text-lg"
                        data-testid="input-signature"
                      />
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Printed Name</Label>
                        <p className="font-medium py-2 px-3 bg-muted rounded-md" data-testid="text-printed-name">
                          {signatureName || '(Your name will appear here)'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <p className="font-medium py-2 px-3 bg-muted rounded-md" data-testid="text-date">
                          {todayDate}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-6">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={submitMutation.isPending || !selectedTierId || !signatureName.trim()}
                    data-testid="button-submit-agreement"
                  >
                    {submitMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      'Sign and Submit Agreement'
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
        
        <p className="text-center text-muted-foreground text-sm mt-6">
          © {new Date().getFullYear()} Nashoba Valley Winery. All rights reserved.
        </p>
      </div>
    </div>
  );
}
