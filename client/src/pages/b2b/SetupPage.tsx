import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Settings, Check, AlertCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SetupPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSetup = async () => {
    setIsCreating(true);
    setError(null);
    
    try {
      const response = await fetch("/api/b2b/setup-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || "Setup failed");
      }

      setCredentials(result.credentials);
      setSetupComplete(true);
      
      toast({
        title: "Setup Complete!",
        description: "Admin account has been created successfully.",
      });
    } catch (error: any) {
      setError(error.message);
      toast({
        title: "Setup Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center py-12">
      <div className="w-full max-w-md px-4">
        <Button
          variant="ghost"
          onClick={() => setLocation("/b2b")}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to B2B
        </Button>

        <Card>
          <CardHeader className="text-center">
            <Settings className="h-12 w-12 mx-auto mb-4 text-primary" />
            <CardTitle className="font-serif text-2xl">B2B Admin Setup</CardTitle>
            <CardDescription>
              One-time setup to create your B2B admin account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!setupComplete ? (
              <div className="space-y-4">
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <h3 className="font-medium text-sm">What this does:</h3>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Creates a default admin account</li>
                    <li>Email: admin@nashobawinery.com</li>
                    <li>Password: admin123</li>
                    <li>Can only be run once</li>
                  </ul>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You must change the default password immediately after logging in for security.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={handleSetup}
                  disabled={isCreating}
                  className="w-full"
                  size="lg"
                  data-testid="button-create-admin"
                >
                  {isCreating ? (
                    <>Creating Admin Account...</>
                  ) : (
                    <>
                      <Settings className="h-4 w-4 mr-2" />
                      Create Admin Account
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <Check className="h-5 w-5" />
                    <h3 className="font-medium">Setup Complete!</h3>
                  </div>
                  
                  {credentials && (
                    <div className="space-y-2 text-sm">
                      <div className="bg-background/50 rounded p-3 space-y-1">
                        <p className="font-medium">Login Credentials:</p>
                        <p className="font-mono text-xs">
                          <span className="text-muted-foreground">Email:</span> {credentials.email}
                        </p>
                        <p className="font-mono text-xs">
                          <span className="text-muted-foreground">Password:</span> {credentials.password}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Important:</strong> Change this password immediately after logging in!
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={() => setLocation("/b2b/login/admin")}
                  className="w-full"
                  size="lg"
                  data-testid="button-go-to-login"
                >
                  Go to Admin Login
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
