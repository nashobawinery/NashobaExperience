import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";

async function getOrderRecipientEmails(): Promise<string> {
  const response = await fetch("/api/settings/order_recipient_emails");
  if (!response.ok) {
    if (response.status === 404) {
      return "onsiteorder@nashobawinery.com";
    }
    throw new Error("Failed to fetch order recipient emails");
  }
  const data = await response.json();
  return data.value;
}

async function updateOrderRecipientEmails(emails: string): Promise<void> {
  const response = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key: "order_recipient_emails",
      value: emails,
    }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to update order recipient emails");
  }
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export default function OrderRecipientEmailsManager() {
  const { toast } = useToast();
  const [editedEmails, setEditedEmails] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { data: currentEmails, isLoading } = useQuery({
    queryKey: ['/api/settings/order_recipient_emails'],
    queryFn: getOrderRecipientEmails,
  });

  const updateMutation = useMutation({
    mutationFn: updateOrderRecipientEmails,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/order_recipient_emails'] });
      setEditedEmails(null);
      setValidationError(null);
      toast({
        title: "Success",
        description: "Order recipient emails updated successfully",
      });
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to update order recipient emails";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const displayEmails = editedEmails !== null ? editedEmails : currentEmails;

  const parseEmails = (emailString: string): string[] => {
    return emailString
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0);
  };

  const handleChange = (value: string) => {
    setEditedEmails(value);
    
    const emails = parseEmails(value);
    
    if (emails.length === 0) {
      setValidationError("At least one email address is required");
      return;
    }
    
    if (emails.length > 10) {
      setValidationError("Maximum 10 email addresses allowed");
      return;
    }
    
    const invalidEmails = emails.filter(email => !validateEmail(email));
    if (invalidEmails.length > 0) {
      setValidationError(`Invalid email format: ${invalidEmails.join(', ')}`);
      return;
    }
    
    setValidationError(null);
  };

  const handleSave = () => {
    if (editedEmails !== null && !validationError) {
      const emails = parseEmails(editedEmails);
      const uniqueEmails = Array.from(new Set(emails));
      const cleanedEmails = uniqueEmails.join(', ');
      updateMutation.mutate(cleanedEmails);
    }
  };

  const handleReset = () => {
    setEditedEmails(null);
    setValidationError(null);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  const hasChanges = editedEmails !== null && editedEmails !== currentEmails;
  const emailList = parseEmails(displayEmails || "");

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-primary" />
            <h2 className="font-serif text-xl font-medium">Order Recipient Emails</h2>
          </div>
          {hasChanges && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={updateMutation.isPending}
                data-testid="button-reset-emails"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending || !!validationError}
                data-testid="button-save-order-emails"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="order-emails" className="text-base">
              Email Addresses
            </Label>
            <p className="text-sm text-muted-foreground mb-3">
              Enter one or more email addresses (comma-separated) where customer orders should be sent
            </p>
            <Textarea
              id="order-emails"
              value={displayEmails ?? ""}
              onChange={(e) => handleChange(e.target.value)}
              className={validationError ? "border-destructive min-h-[100px]" : "min-h-[100px]"}
              placeholder="email@example.com, orders@example.com"
              data-testid="textarea-order-emails"
            />
            {validationError && (
              <p className="text-xs text-destructive mt-2" data-testid="text-validation-error">
                {validationError}
              </p>
            )}
            {!validationError && (
              <p className="text-xs text-muted-foreground mt-2">
                {emailList.length} email{emailList.length !== 1 ? 's' : ''} configured
              </p>
            )}
          </div>

          {emailList.length > 0 && !validationError && (
            <div className="pt-4 border-t">
              <h3 className="font-medium mb-3">Current Recipients</h3>
              <div className="flex flex-wrap gap-2">
                {emailList.map((email, index) => (
                  <Badge key={index} variant="secondary" className="gap-2" data-testid={`badge-email-${index}`}>
                    <Mail className="w-3 h-3" />
                    {email}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <h3 className="font-medium mb-2">How It Works</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Guest cart orders are sent to all configured email addresses</li>
              <li>Separate multiple emails with commas</li>
              <li>Emails are automatically trimmed and de-duplicated</li>
              <li>Maximum 10 email addresses allowed</li>
              <li>Each email must be a valid email format</li>
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}
