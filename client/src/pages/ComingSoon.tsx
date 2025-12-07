import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Construction } from "lucide-react";

interface ComingSoonProps {
  moduleName: string;
  description?: string;
}

export default function ComingSoon({ moduleName, description }: ComingSoonProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Construction className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">{moduleName}</CardTitle>
          <CardDescription>
            {description || "This module is currently under development."}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-6">
            Check back soon for updates. In the meantime, explore other available modules.
          </p>
          <Button 
            onClick={() => setLocation("/admin-hub")}
            data-testid="button-back-to-hub"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin Hub
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function ProceduresComingSoon() {
  return <ComingSoon moduleName="Daily Procedures" description="Staff procedure completion tracking and task management coming soon." />;
}

export function SupportComingSoon() {
  return <ComingSoon moduleName="Customer Support" description="Customer support ticketing and issue resolution coming soon." />;
}

export function AppleGameComingSoon() {
  return <ComingSoon moduleName="Apple Game" description="Interactive apple picking game for guest engagement coming soon." />;
}
