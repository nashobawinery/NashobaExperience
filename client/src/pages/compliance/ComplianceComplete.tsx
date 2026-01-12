import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface CompletionResult {
  success: boolean;
  message: string;
  taskName?: string;
  completedAt?: string;
  completedBy?: string;
}

export default function ComplianceComplete() {
  const [result, setResult] = useState<CompletionResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setResult({ success: false, message: "No token provided" });
      setLoading(false);
      return;
    }

    fetch(`/api/public/compliance/complete?token=${encodeURIComponent(token)}`)
      .then(res => res.json())
      .then(data => {
        setResult(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error completing task:", err);
        setResult({ success: false, message: "Failed to complete task. Please try again." });
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-10 pb-10">
            <Loader2 className="w-16 h-16 mx-auto mb-4 text-primary animate-spin" />
            <p className="text-lg text-muted-foreground">Processing your request...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: result?.success ? '#dcfce7' : '#fef2f2' }}>
            {result?.success ? (
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            ) : result?.message?.includes('already') ? (
              <Clock className="w-10 h-10 text-amber-600" />
            ) : (
              <XCircle className="w-10 h-10 text-red-600" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {result?.success ? "Task Completed!" : "Unable to Complete"}
          </CardTitle>
          <CardDescription className="text-base mt-2">
            {result?.message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {result?.taskName && (
            <div className="p-4 bg-muted rounded-lg text-left">
              <p className="text-sm text-muted-foreground">Task</p>
              <p className="font-semibold">{result.taskName}</p>
            </div>
          )}
          
          {result?.completedAt && (
            <div className="p-4 bg-muted rounded-lg text-left">
              <p className="text-sm text-muted-foreground">Completed At</p>
              <p className="font-semibold">
                {format(new Date(result.completedAt), "MMMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          )}
          
          {result?.completedBy && (
            <div className="p-4 bg-muted rounded-lg text-left">
              <p className="text-sm text-muted-foreground">Completed By</p>
              <p className="font-semibold">{result.completedBy}</p>
            </div>
          )}

          <p className="text-sm text-muted-foreground pt-4">
            You can close this window now.
          </p>
          
          <Button variant="outline" className="w-full" onClick={() => window.close()} data-testid="button-close">
            Close Window
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
