import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, MailMinus, MessageSquareOff, Loader2, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function UnsubscribePage() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const id = params.get("id");
  const type = params.get("type");
  const token = params.get("token");

  const [status, setStatus] = useState<"loading" | "ready" | "confirming" | "done" | "error">("loading");
  const [firstName, setFirstName] = useState("Valued Customer");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!id || !type || !token) {
      setStatus("error");
      setErrorMsg("Invalid unsubscribe link.");
      return;
    }
    fetch(`/api/unsubscribe/verify?id=${id}&type=${type}&token=${token}`)
      .then(r => {
        if (!r.ok) throw new Error("Invalid link");
        return r.json();
      })
      .then(data => {
        setFirstName(data.firstName || "Valued Customer");
        setStatus("ready");
      })
      .catch(() => {
        setStatus("error");
        setErrorMsg("This unsubscribe link is invalid or has expired.");
      });
  }, [id, type, token]);

  const handleConfirm = async () => {
    setStatus("confirming");
    try {
      await apiRequest("POST", "/api/unsubscribe/confirm", { id: parseInt(id!), type, token });
      setStatus("done");
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again or contact us directly.");
    }
  };

  const Icon = type === "sms" ? MessageSquareOff : MailMinus;
  const typeLabel = type === "sms" ? "text messages" : "marketing emails";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3">
            {status === "done" ? (
              <CheckCircle className="h-12 w-12 text-green-500" />
            ) : status === "error" ? (
              <AlertTriangle className="h-12 w-12 text-destructive" />
            ) : (
              <Icon className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
          <CardTitle data-testid="text-unsubscribe-title">
            {status === "done" ? "You've been unsubscribed" : status === "error" ? "Oops" : "Unsubscribe"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {status === "ready" && (
            <>
              <p className="text-muted-foreground" data-testid="text-unsubscribe-message">
                Hi {firstName}, would you like to stop receiving {typeLabel} from Nashoba Valley Winery?
              </p>
              <Button
                onClick={handleConfirm}
                variant="destructive"
                className="w-full"
                data-testid="button-confirm-unsubscribe"
              >
                Yes, unsubscribe me from {typeLabel}
              </Button>
              <p className="text-xs text-muted-foreground">
                You can always contact us at (978) 779-5521 to update your preferences.
              </p>
            </>
          )}

          {status === "confirming" && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-muted-foreground">Processing...</span>
            </div>
          )}

          {status === "done" && (
            <>
              <p className="text-muted-foreground" data-testid="text-unsubscribe-success">
                You will no longer receive {typeLabel} from Nashoba Valley Winery. 
                If you change your mind, contact us at (978) 779-5521.
              </p>
            </>
          )}

          {status === "error" && (
            <p className="text-muted-foreground" data-testid="text-unsubscribe-error">
              {errorMsg}
            </p>
          )}

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Nashoba Valley Winery | 100 Wattaquadock Hill Road, Bolton, MA 01740
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
