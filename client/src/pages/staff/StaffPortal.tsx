import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, CheckSquare, LogIn, LogOut, ChevronRight, User, FileText, ClipboardCheck, Clock, AlertCircle, Wrench, Printer, BookMarked } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format } from "date-fns";

interface ProcedureTemplate {
  id: string;
  procedureCode: string;
  procedureName: string;
  department: string;
  procedureType: string;
  items: any[];
}

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
    templates: ProcedureTemplate[];
  };
}

interface ProcedureDraft {
  id: string;
  templateId: string;
  procedureName: string;
  procedureType: string;
  submissionDate: string;
  dateTimeStarted: string | null;
  createdAt: string;
}

interface DailyReportDraft {
  id: string;
  templateId: string;
  department: string;
  departmentLabel: string;
  reportDate: string;
  createdAt: string;
}

interface StaffPrintMenu {
  id: number;
  name: string;
  description: string | null;
  printUrl: string;
}

export default function StaffPortal() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [code, setCode] = useState("");
  const [verifiedCode, setVerifiedCode] = useState("");
  const [staffAccess, setStaffAccess] = useState<StaffAccess | null>(null);

  // Query for procedure drafts
  const { data: procedureDrafts = [] } = useQuery<ProcedureDraft[]>({
    queryKey: ["/api/procedures/submissions/staff-drafts", staffAccess?.staffName],
    queryFn: async () => {
      if (!staffAccess?.staffName) return [];
      const response = await fetch(`/api/procedures/submissions/staff-drafts?staffName=${encodeURIComponent(staffAccess.staffName)}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!staffAccess?.staffName,
  });

  // Query for daily report drafts
  const { data: reportDrafts = [] } = useQuery<DailyReportDraft[]>({
    queryKey: ["/api/public/daily-reports/staff-drafts", staffAccess?.staffName],
    queryFn: async () => {
      if (!staffAccess?.staffName) return [];
      const response = await fetch(`/api/public/daily-reports/staff-drafts?staffName=${encodeURIComponent(staffAccess.staffName)}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!staffAccess?.staffName,
  });

  const hasDrafts = procedureDrafts.length > 0 || reportDrafts.length > 0;

  const { data: printMenus = [] } = useQuery<StaffPrintMenu[]>({
    queryKey: ['/api/toast/public/staff-print-menus'],
    staleTime: 30000,
  });

  const openPrintMenu = (url: string) => {
    const printWindow = window.open(url, "_blank");
    if (printWindow) {
      printWindow.addEventListener("load", () => {
        setTimeout(() => printWindow.print(), 500);
      });
    }
  };

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
              Enter your access code to view your Daily Reports and Opening and Closing Procedures
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

        {/* Saved Drafts Section - Only show if there are drafts */}
        {hasDrafts && (
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Saved Drafts</CardTitle>
                  <CardDescription>
                    You have {procedureDrafts.length + reportDrafts.length} saved draft{procedureDrafts.length + reportDrafts.length !== 1 ? 's' : ''} to complete
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Procedure Drafts */}
              {procedureDrafts.map((draft) => (
                <Button
                  key={draft.id}
                  variant="outline"
                  className="w-full justify-between bg-white dark:bg-background"
                  onClick={() => navigate(`/procedures/staff?code=${verifiedCode}&procedureId=${draft.templateId}&draftId=${draft.id}`)}
                  data-testid={`button-resume-procedure-${draft.id}`}
                >
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-green-600" />
                    <div className="text-left">
                      <div className="font-medium">{draft.procedureName}</div>
                      <div className="text-xs text-muted-foreground">
                        Started {draft.dateTimeStarted ? format(new Date(draft.dateTimeStarted), 'MMM d, h:mm a') : format(new Date(draft.createdAt), 'MMM d, h:mm a')}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
                    Resume
                  </Badge>
                </Button>
              ))}
              
              {/* Daily Report Drafts */}
              {reportDrafts.map((draft) => (
                <Button
                  key={draft.id}
                  variant="outline"
                  className="w-full justify-between bg-white dark:bg-background"
                  onClick={() => navigate(`/daily-report/${draft.templateId}?draftId=${draft.id}`)}
                  data-testid={`button-resume-report-${draft.id}`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <div className="text-left">
                      <div className="font-medium">{draft.departmentLabel || draft.department}</div>
                      <div className="text-xs text-muted-foreground">
                        For {format(new Date(draft.reportDate), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
                    Resume
                  </Badge>
                </Button>
              ))}
            </CardContent>
          </Card>
        )}

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
                      onClick={() => navigate(`/daily-report/${dept.code}?department=${encodeURIComponent(dept.department)}`)}
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

          {/* Opening and Closing Procedures Section */}
          <Card className={!staffAccess.procedures.enabled ? "opacity-50" : ""}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <ClipboardCheck className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Opening and Closing Procedures</CardTitle>
                  <CardDescription>
                    {staffAccess.procedures.enabled 
                      ? `${staffAccess.procedures.templates.length} procedure${staffAccess.procedures.templates.length !== 1 ? 's' : ''} available`
                      : "Not assigned"
                    }
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {staffAccess.procedures.enabled && staffAccess.procedures.templates.length > 0 ? (
                <div className="space-y-2">
                  {staffAccess.procedures.templates.map((proc) => (
                    <Button
                      key={proc.id}
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => navigate(`/procedures/staff?code=${verifiedCode}&procedureId=${proc.id}`)}
                      data-testid={`button-procedure-${proc.id}`}
                    >
                      <span>{proc.procedureName}</span>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  ))}
                </div>
              ) : staffAccess.procedures.enabled ? (
                <p className="text-sm text-muted-foreground">
                  No procedures available for today.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You are not assigned to any procedures.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Print Menus Section - shown when menus are configured */}
        {printMenus.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <Printer className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Print Menus</CardTitle>
                  <CardDescription>
                    {printMenus.length} print-ready menu{printMenus.length !== 1 ? 's' : ''} available
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {printMenus.map((menu) => (
                <Button
                  key={menu.id}
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => openPrintMenu(menu.printUrl)}
                  data-testid={`button-print-menu-${menu.id}`}
                >
                  <div className="flex items-center gap-2">
                    <BookMarked className="w-4 h-4 text-purple-500" />
                    <div className="text-left">
                      <div className="font-medium">{menu.name}</div>
                      {menu.description && (
                        <div className="text-xs text-muted-foreground">{menu.description}</div>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Work Order Section - Always available */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <Wrench className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Maintenance Request</CardTitle>
                <CardDescription>
                  Submit a work order for repairs or maintenance needs
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => navigate(`/staff/work-order?staffName=${encodeURIComponent(staffAccess.staffName)}`)}
              data-testid="button-submit-work-order"
            >
              <span>Submit Work Order</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>

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
