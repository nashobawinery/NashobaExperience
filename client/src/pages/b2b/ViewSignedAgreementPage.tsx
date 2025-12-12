import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, ArrowLeft, FileText, CheckCircle, Building, Mail, Phone, MapPin, Calendar, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface SignedAgreement {
  id: string;
  customerId: string;
  businessName: string;
  contactName: string;
  address: string;
  email: string;
  phone: string;
  tierId: string | null;
  signatureName: string | null;
  signedAt: string | null;
  status: string;
  fiscalYearStart: string | null;
  fiscalYearEnd: string | null;
  createdAt: string;
  tier: {
    tierName: string;
    discountPercentage: string;
    commitmentCases: number;
  } | null;
}

export default function ViewSignedAgreementPage() {
  const { agreementId } = useParams<{ agreementId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  const { data: agreement, isLoading, error } = useQuery<SignedAgreement>({
    queryKey: ['/api/b2b/admin/tier-agreements', agreementId],
    enabled: !!agreementId,
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/b2b/admin/tier-agreements/${agreementId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: 'Cancelled via agreement view' }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel agreement');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Agreement Cancelled',
        description: 'The tier agreement has been cancelled.',
      });
      setLocation('/b2b/admin');
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Cancel',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
  
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
  
  if (error || !agreement) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Agreement Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The agreement you're looking for could not be found.
            </p>
            <Button onClick={() => setLocation('/b2b/admin')} data-testid="button-back-to-admin">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const isSigned = agreement.status === 'active' && agreement.signatureName;
  const minCases = agreement.tier?.commitmentCases || (agreement.tier?.tierName === 'Tier 3' ? 10 : 30);
  
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="outline" onClick={() => setLocation('/b2b/admin')} data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant={isSigned ? "default" : "secondary"} className="text-sm">
              {agreement.status === 'active' ? 'Active' : agreement.status?.includes('pending') ? 'Pending Signature' : agreement.status}
            </Badge>
            {(agreement.status === 'active' || agreement.status?.includes('pending')) && (
              <>
                {showCancelConfirm ? (
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending} data-testid="button-confirm-cancel">
                      {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                      Confirm
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowCancelConfirm(false)} data-testid="button-cancel-cancel">
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setShowCancelConfirm(true)} data-testid="button-cancel-agreement">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Cancel Agreement
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        
        <Card className="mb-6" data-testid="signed-agreement-card">
          <CardHeader className="text-center border-b bg-primary/5">
            <div className="flex items-center justify-center gap-2 mb-2">
              <FileText className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl font-serif">Wholesale Tier Agreement</CardTitle>
            </div>
            <p className="text-muted-foreground">Nashoba Valley Winery</p>
          </CardHeader>
          
          <CardContent className="p-6 space-y-6">
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                Customer Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Business Name</p>
                  <p className="font-medium" data-testid="text-business-name">{agreement.businessName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Contact Name</p>
                  <p className="font-medium" data-testid="text-contact-name">{agreement.contactName}</p>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Address</p>
                    <p className="font-medium" data-testid="text-address">{agreement.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium" data-testid="text-email">{agreement.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium" data-testid="text-phone">{agreement.phone}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="font-semibold text-lg mb-3">1. Tier Selection & Case Commitment</h3>
              {agreement.tier ? (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <p className="font-semibold text-primary" data-testid="text-tier-selected">
                    {agreement.tier.tierName} - {agreement.tier.discountPercentage}% Discount
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Customer agrees to purchase a minimum of <strong>{minCases} cases</strong> during the fiscal year for this agreement.
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground italic">No tier selected yet</p>
              )}
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-3">2. Term and Renewal</h3>
              <p className="text-muted-foreground text-sm mb-3">
                This Agreement begins on the date signed and continues for 12 consecutive months which will be the fiscal year for this agreement. The Agreement will automatically renew at the end of each fiscal year unless terminated by either party.
              </p>
              {agreement.fiscalYearStart && agreement.fiscalYearEnd && (
                <div className="flex items-center gap-2 text-sm bg-muted/50 p-3 rounded">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>
                    <strong>Agreement Period:</strong> {format(new Date(agreement.fiscalYearStart), 'MMM d, yyyy')} to {format(new Date(agreement.fiscalYearEnd), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-3">3. Failure to Meet Minimum Case Commitment</h3>
              <p className="text-muted-foreground text-sm">
                If Customer does not meet the minimum case requirement by the end of the fiscal year—or by the termination date if Customer ends the Agreement early—Customer agrees to pay the difference between the Tier discount received and the price Customer would have paid under Tier 1 or Tier 2, depending on eligibility. Nashoba will calculate the shortfall and issue an invoice for the difference. Customer agrees to pay this invoice in full within 30 days.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-3">4. Early Termination</h3>
              <p className="text-muted-foreground text-sm">
                Customer may terminate this Agreement at any time by providing written notice. If Customer terminates early and has not yet met the required case minimum, Section 3 above applies.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-3">5. Eligibility and Compliance</h3>
              <p className="text-muted-foreground text-sm">
                Customer affirms that they hold all licenses required to purchase and resell alcoholic beverages. Nashoba reserves the right to suspend or terminate this Agreement if Customer violates program terms or applicable regulations.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-3">6. Entire Agreement</h3>
              <p className="text-muted-foreground text-sm">
                This document represents the full Agreement between Nashoba and Customer regarding wholesale tier participation. Changes must be made in writing and agreed to by both parties.
              </p>
            </div>
            
            <Separator />
            
            {isSigned ? (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-green-800 dark:text-green-200">Agreement Signed</h4>
                    <div className="mt-2 text-sm space-y-1">
                      <p><strong>Signature:</strong> <span data-testid="text-signature">{agreement.signatureName}</span></p>
                      <p><strong>Date Signed:</strong> <span data-testid="text-signed-date">{agreement.signedAt ? format(new Date(agreement.signedAt), 'MMMM d, yyyy') : 'N/A'}</span></p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-center">
                <p className="text-amber-800 dark:text-amber-200 font-medium">
                  This agreement is pending signature
                </p>
              </div>
            )}
            
            <div className="text-center text-xs text-muted-foreground pt-4 border-t">
              <p>Agreement ID: {agreement.id}</p>
              <p>Created: {format(new Date(agreement.createdAt), 'MMMM d, yyyy')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
