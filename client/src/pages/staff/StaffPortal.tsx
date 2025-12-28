import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, CheckSquare, LogIn, LogOut, ChevronRight, User, FileText, ClipboardCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface StaffAccess {
  staffName: string;
  dailyReports: {
    enabled: boolean;
    departments: { department: string; departmentLabel: string; code: string }[];
  };
  procedures: {
    enabled: boolean;
    staffId: string | null;
    department: string | null;
  };
}

export default function StaffPortal() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [code, setCode] = useState("");
  const [verifiedCode, setVerifiedCode] = useState("");
  const [staffAccess, setStaffAccess] = useState<StaffAccess | null>(null);

  const validateMutation = useMutation({
    mutationFn: async (accessCode: string) => {
      const response = await fetch("/api/public/staff-portal/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: accessCode })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Invalid code");
      }
      return { data: await response.json() as StaffAccess, code: accessCode };
    },
    onSuccess: ({ data, code: validatedCode }) => {
      setStaffAccess(data);
      setVerifiedCode(validatedCode);
    },
    onError: (error: Error) => {
      toast({ title: "Invalid Code", description: error.message, variant: "destructive" });
      setCode("");
    }
  });

  const handleLogin = () => {
    if (code.trim().length >= 1) {
      validateMutation.mutate(code.trim().toUpperCase());
    }
  };

  const handleLogout = () => {
    setStaffAccess(null);
    setCode("");
    setVerifiedCode("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  // Login screen
  if (!staffAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <ClipboardList className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Staff Portal</CardTitle>
            <CardDescription>
              Enter your access code to view your Daily Reports and Procedures
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Access Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="Enter your code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                className="text-center text-2xl tracking-widest font-mono"
                autoComplete="off"
                data-testid="input-staff-code"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={handleLogin}
              disabled={!code.trim() || validateMutation.isPending}
              data-testid="button-staff-login"
            >
              {validateMutation.isPending ? (
                "Validating..."
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Continue
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Dashboard showing both modules
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Welcome, {staffAccess.staffName}</h1>
              <p className="text-sm text-muted-foreground">Staff Portal</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-staff-logout">
            <LogOut className="w-4 h-4 mr-2" />
            Log Out
          </Button>
        </div>

        {/* Module Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Daily Reports Section */}
          <Card className={!staffAccess.dailyReports.enabled ? "opacity-50" : ""}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Daily Reports</CardTitle>
                  <CardDescription>
                    {staffAccess.dailyReports.enabled 
                      ? `${staffAccess.dailyReports.departments.length} department${staffAccess.dailyReports.departments.length !== 1 ? 's' : ''} available`
                      : "Not assigned"
                    }
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {staffAccess.dailyReports.enabled ? (
                <div className="space-y-2">
                  {staffAccess.dailyReports.departments.map((dept) => (
                    <Button
                      key={dept.department}
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => navigate(`/daily-report/${dept.code}`)}
                      data-testid={`button-daily-report-${dept.department}`}
                    >
                      <span>{dept.departmentLabel}</span>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You are not assigned to any Daily Report departments.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Daily Procedures Section */}
          <Card className={!staffAccess.procedures.enabled ? "opacity-50" : ""}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <ClipboardCheck className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Daily Procedures</CardTitle>
                  <CardDescription>
                    {staffAccess.procedures.enabled 
                      ? "Checklists and tasks"
                      : "Not assigned"
                    }
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {staffAccess.procedures.enabled ? (
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => navigate(`/procedures/staff?code=${verifiedCode}`)}
                  data-testid="button-daily-procedures"
                >
                  <span>View Procedures</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You are not assigned to any procedures.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Access Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-4">
              <Badge variant={staffAccess.dailyReports.enabled ? "default" : "secondary"}>
                {staffAccess.dailyReports.enabled ? "Daily Reports Active" : "No Daily Reports"}
              </Badge>
              <Badge variant={staffAccess.procedures.enabled ? "default" : "secondary"}>
                {staffAccess.procedures.enabled ? "Procedures Active" : "No Procedures"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
