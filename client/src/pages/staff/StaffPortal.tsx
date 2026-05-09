import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, LogIn, LogOut, ChevronRight, FileText, ClipboardCheck, Clock, Wrench, Printer, CalendarDays, ShieldCheck } from "lucide-react";
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
  printMenus?: {
    enabled: boolean;
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
  id: number | string;
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
    queryKey: ['/api/public/staff-portal/print-menus', verifiedCode],
    queryFn: async () => {
      if (!verifiedCode) return [];
      const response = await fetch(`/api/public/staff-portal/print-menus?code=${encodeURIComponent(verifiedCode)}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!verifiedCode,
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

  const dashboardCards = staffAccess ? [
    {
      key: "daily-reports",
      title: "Daily Reports",
      description: staffAccess.dailyReports.enabled
        ? "Manager daily summaries for sales, customer notes, staffing, and operations."
        : "Not assigned.",
      icon: FileText,
      accent: "bg-blue-500",
      enabled: staffAccess.dailyReports.enabled,
      content: staffAccess.dailyReports.enabled ? (
        <div className="space-y-2">
          {staffAccess.dailyReports.departments.map((dept) => (
            <Button
              key={dept.department}
              variant="secondary"
              className="w-full justify-between bg-white/10 hover:bg-white/20 text-white border-white/10"
              onClick={() => navigate(`/daily-report/${dept.code}?department=${encodeURIComponent(dept.department)}`)}
              data-testid={`button-daily-report-${dept.department}`}
            >
              <span>{dept.departmentLabel}</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          ))}
        </div>
      ) : null,
    },
    {
      key: "procedures",
      title: "Opening and Closing Procedures",
      description: staffAccess.procedures.enabled
        ? "Complete the operational checklists assigned for today."
        : "Not assigned.",
      icon: ClipboardCheck,
      accent: "bg-emerald-500",
      enabled: staffAccess.procedures.enabled && staffAccess.procedures.templates.length > 0,
      content: staffAccess.procedures.enabled && staffAccess.procedures.templates.length > 0 ? (
        <div className="space-y-2">
          {staffAccess.procedures.templates.map((proc) => (
            <Button
              key={proc.id}
              variant="secondary"
              className="w-full justify-between bg-white/10 hover:bg-white/20 text-white border-white/10"
              onClick={() => navigate(`/procedures/staff?code=${verifiedCode}&procedureId=${proc.id}`)}
              data-testid={`button-procedure-${proc.id}`}
            >
              <span>{proc.procedureName}</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          ))}
        </div>
      ) : null,
    },
    {
      key: "print-menus",
      title: "Print Menus",
      description: printMenus.length > 0
        ? "Open approved Media Center menus in print-ready format."
        : "Not approved.",
      icon: Printer,
      accent: "bg-purple-500",
      enabled: printMenus.length > 0,
      content: printMenus.length > 0 ? (
        <div className="space-y-2">
          {printMenus.map((menu) => (
            <Button
              key={menu.id}
              variant="secondary"
              className="w-full justify-between bg-white/10 hover:bg-white/20 text-white border-white/10"
              onClick={() => openPrintMenu(menu.printUrl)}
              data-testid={`button-print-menu-${menu.id}`}
            >
              <span className="truncate">{menu.name}</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          ))}
        </div>
      ) : null,
    },
    {
      key: "maintenance",
      title: "Maintenance Request",
      description: "Submit a work order for repairs or maintenance needs.",
      icon: Wrench,
      accent: "bg-orange-500",
      enabled: true,
      content: (
        <Button
          variant="secondary"
          className="w-full justify-between bg-white/10 hover:bg-white/20 text-white border-white/10"
          onClick={() => navigate(`/staff/work-order?staffName=${encodeURIComponent(staffAccess.staffName)}`)}
          data-testid="button-submit-work-order"
        >
          <span>Submit Work Order</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      ),
    },
    {
      key: "schedule",
      title: "Staff Schedule",
      description: "Coming soon: shifts, time off, and team calendar.",
      icon: CalendarDays,
      accent: "bg-cyan-500",
      enabled: false,
      content: null,
    },
    {
      key: "resources",
      title: "Operating Procedures",
      description: "Coming soon: references, training documents, and operating resources.",
      icon: ShieldCheck,
      accent: "bg-amber-500",
      enabled: false,
      content: null,
    },
  ] : [];

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
              Enter your access code to view Daily Reports, Opening and Closing Procedures, and approved Print Menus
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

  // Dashboard showing staff features
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-purple-950/40 p-6 shadow-2xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-300">Staff Home</p>
                <Badge className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  New Release 05092026
                </Badge>
              </div>
              <h1 className="mt-2 text-3xl md:text-4xl font-bold">Welcome, {staffAccess.staffName}</h1>
              <p className="mt-2 text-sm text-slate-300">
                We updated this page to make staff tools easier to find. Choose where to go next.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleLogout} data-testid="button-staff-logout">
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dashboardCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.key}
                className={`min-h-[220px] overflow-hidden border-white/10 bg-slate-900/90 text-white shadow-xl ${!card.enabled ? "opacity-70" : ""}`}
              >
                <CardContent className="flex h-full flex-col p-0">
                  <div className="flex-1 p-5">
                    <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${card.accent}`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">{card.title}</CardTitle>
                    <CardDescription className="mt-2 text-slate-300">
                      {card.description}
                    </CardDescription>
                    <div className="mt-4">
                      {card.content}
                    </div>
                  </div>
                  {!card.content && (
                    <div className="border-t border-white/10 bg-white/5 px-5 py-3 text-sm text-slate-300">
                      {card.enabled ? "Open" : "Coming soon"}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Saved Drafts Section - Only show if there are drafts */}
        {hasDrafts && (
          <Card className="border-amber-300/30 bg-amber-400/10 text-white">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <CardTitle className="text-lg">Saved Drafts</CardTitle>
                  <CardDescription className="text-amber-100/80">
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

        {/* Access Summary */}
        <Card className="border-white/10 bg-slate-900/80 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-4">
              <Badge variant={staffAccess.dailyReports.enabled ? "default" : "secondary"}>
                {staffAccess.dailyReports.enabled ? "Daily Reports Active" : "No Daily Reports"}
              </Badge>
              <Badge variant={staffAccess.procedures.enabled ? "default" : "secondary"}>
                {staffAccess.procedures.enabled ? "Procedures Active" : "No Procedures"}
              </Badge>
              <Badge variant={printMenus.length > 0 ? "default" : "secondary"}>
                {printMenus.length > 0 ? "Print Menus Active" : "No Print Menus"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
