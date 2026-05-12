import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, ClipboardList, Copy, ExternalLink, FileText, Plus, Printer, QrCode, RefreshCw, Save, Settings, Trash2, Users } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DailyReportsAdminDashboard from "@/pages/daily-reports/DailyReportsAdminDashboard";
import ProceduresAdminDashboard from "@/pages/procedures/ProceduresAdminDashboard";
import ProcedureTemplateEditor from "@/pages/procedures/ProcedureTemplateEditor";

type StaffReportingAssignment = {
  id?: string;
  reportType: "daily_report" | "procedure" | "print_menu";
  assignmentKey: string;
  assignmentLabel: string;
  isEnabled: boolean;
  legacySource?: string | null;
};

type StaffReportingUser = {
  id: string;
  displayName: string;
  accessCode: string;
  homeDepartment?: string | null;
  isActive: boolean;
  lastUsedAt?: string | null;
  assignments: StaffReportingAssignment[];
};

type StaffReportingOptions = {
  departments: {
    department: string;
    departmentLabel: string;
    isActive: boolean;
  }[];
  procedures: {
    id: string;
    procedureCode: string;
    procedureName: string;
    department: string;
    procedureType: string;
    isActive: boolean;
  }[];
  printMenus: {
    id: string;
    name: string;
    description?: string | null;
    source: string;
  }[];
};

const emptyForm = {
  displayName: "",
  accessCode: "",
  homeDepartment: "",
  isActive: true,
  assignments: [] as StaffReportingAssignment[],
};

export default function StaffReportingDashboard() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const isProcedureEditorRoute = location.startsWith("/staff-reporting/procedures/templates/");
  const [activeTab, setActiveTab] = useState(isProcedureEditorRoute ? "procedures" : "daily-reports");
  const wasProcedureEditorRoute = useRef(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffReportingUser | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [copiedStaffUrl, setCopiedStaffUrl] = useState(false);
  const staffPortalUrl = `${window.location.origin}/staff`;

  const { data: users = [], isLoading: usersLoading } = useQuery<StaffReportingUser[]>({
    queryKey: ["/api/staff-reporting/users"],
  });

  const { data: options } = useQuery<StaffReportingOptions>({
    queryKey: ["/api/staff-reporting/options"],
  });

  useEffect(() => {
    if (isProcedureEditorRoute) {
      setActiveTab("procedures");
    } else if (wasProcedureEditorRoute.current) {
      // Returning from template editor URLs: Daily Reports should be the module landing tab.
      setActiveTab("daily-reports");
    }
    wasProcedureEditorRoute.current = isProcedureEditorRoute;
  }, [isProcedureEditorRoute]);

  const assignmentCount = useMemo(() => {
    return users.reduce((total, user) => total + user.assignments.filter((a) => a.isEnabled).length, 0);
  }, [users]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...formData,
        accessCode: formData.accessCode.trim().toUpperCase(),
        homeDepartment: formData.homeDepartment || null,
      };
      const response = editingUser
        ? await apiRequest("PATCH", `/api/staff-reporting/users/${editingUser.id}`, payload)
        : await apiRequest("POST", "/api/staff-reporting/users", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-reporting/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/staff-portal/validate"] });
      toast({ title: editingUser ? "Staff user updated" : "Staff user created" });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Could not save staff user", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/staff-reporting/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-reporting/users"] });
      toast({ title: "Staff user removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Could not remove staff user", description: error.message, variant: "destructive" });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/staff-reporting/backfill"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-reporting/users"] });
      toast({ title: "Legacy users refreshed" });
    },
    onError: (error: Error) => {
      toast({ title: "Could not refresh users", description: error.message, variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
    setFormData(emptyForm);
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (user: StaffReportingUser) => {
    setEditingUser(user);
    setFormData({
      displayName: user.displayName,
      accessCode: user.accessCode,
      homeDepartment: user.homeDepartment || "",
      isActive: user.isActive,
      assignments: user.assignments.map((assignment) => ({ ...assignment })),
    });
    setDialogOpen(true);
  };

  const hasAssignment = (reportType: StaffReportingAssignment["reportType"], assignmentKey: string) => {
    return formData.assignments.some((assignment) => assignment.reportType === reportType && assignment.assignmentKey === assignmentKey && assignment.isEnabled);
  };

  const toggleAssignment = (
    checked: boolean,
    reportType: StaffReportingAssignment["reportType"],
    assignmentKey: string,
    assignmentLabel: string,
  ) => {
    setFormData((prev) => {
      const existing = prev.assignments.find((assignment) => assignment.reportType === reportType && assignment.assignmentKey === assignmentKey);
      if (existing) {
        return {
          ...prev,
          assignments: prev.assignments.map((assignment) =>
            assignment.reportType === reportType && assignment.assignmentKey === assignmentKey
              ? { ...assignment, isEnabled: checked }
              : assignment,
          ),
        };
      }
      return {
        ...prev,
        assignments: [...prev.assignments, { reportType, assignmentKey, assignmentLabel, isEnabled: checked }],
      };
    });
  };

  const getAssignmentsByType = (user: StaffReportingUser, reportType: StaffReportingAssignment["reportType"]) => {
    return user.assignments.filter((assignment) => assignment.reportType === reportType && assignment.isEnabled);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (isProcedureEditorRoute) {
      setLocation("/staff-reporting");
    }
  };

  const copyStaffPortalUrl = async () => {
    await navigator.clipboard.writeText(staffPortalUrl);
    setCopiedStaffUrl(true);
    toast({ title: "Staff portal URL copied" });
    setTimeout(() => setCopiedStaffUrl(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => setLocation("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Hub
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Staff Daily Report Center</h1>
              <p className="text-muted-foreground mt-1">
                Daily Reports, Opening and Closing Procedures, and shared staff access in one module.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{users.length} staff users</Badge>
            <Badge variant="outline">{assignmentCount} active assignments</Badge>
          </div>
        </div>

        <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/10 via-background to-amber-500/10">
          <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-white p-2 shadow-sm">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=104x104&data=${encodeURIComponent(staffPortalUrl)}`}
                  alt="Staff portal QR code"
                  className="h-24 w-24"
                  data-testid="img-staff-daily-report-center-qr"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Staff Daily Report Center Login</CardTitle>
                </div>
                <CardDescription>
                  Share this one link with staff for Daily Reports, Opening and Closing Procedures, and approved Print Menus.
                </CardDescription>
                <div className="flex max-w-xl items-center gap-2 rounded-lg border bg-background p-2">
                  <span className="flex-1 truncate font-mono text-sm" data-testid="text-staff-daily-report-center-url">
                    {staffPortalUrl}
                  </span>
                  <Button variant="ghost" size="icon" onClick={copyStaffPortalUrl} data-testid="button-copy-staff-daily-report-center-url">
                    {copiedStaffUrl ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <Link href="/staff" target="_blank">
              <Button data-testid="button-open-staff-daily-report-center">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Staff Login
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="daily-reports">
              <FileText className="h-4 w-4 mr-2" />
              Daily Reports
            </TabsTrigger>
            <TabsTrigger value="procedures">
              <ClipboardList className="h-4 w-4 mr-2" />
              Opening and Closing Procedures
            </TabsTrigger>
            <TabsTrigger value="administration">
              <Settings className="h-4 w-4 mr-2" />
              Administration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily-reports">
            <DailyReportsAdminDashboard />
          </TabsContent>

          <TabsContent value="procedures">
            {isProcedureEditorRoute ? (
              <ProcedureTemplateEditor returnPath="/staff-reporting" />
            ) : (
              <ProceduresAdminDashboard embeddedInStaffReporting basePath="/staff-reporting/procedures" />
            )}
          </TabsContent>

          <TabsContent value="administration" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Shared Staff Users</CardTitle>
                  <CardDescription>
                    Retains legacy Daily Report and Procedure users, then lets you assign each person by report type.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Legacy Users
                  </Button>
                  <Button onClick={openCreateDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Staff User
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {usersLoading ? (
                  [...Array(4)].map((_, index) => <Skeleton key={index} className="h-24 w-full" />)
                ) : users.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                    No staff users found. Refresh legacy users or add a new user.
                  </div>
                ) : (
                  users.map((user) => {
                    const reportAssignments = getAssignmentsByType(user, "daily_report");
                    const procedureAssignments = getAssignmentsByType(user, "procedure");
                    const printMenuAssignments = getAssignmentsByType(user, "print_menu");
                    return (
                      <Card key={user.id} className="border-muted">
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold">{user.displayName}</h3>
                                <Badge variant="outline">Code {user.accessCode}</Badge>
                                <Badge variant={user.isActive ? "default" : "secondary"}>
                                  {user.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              <div>
                                <div className="text-sm font-semibold">Employee Authorized Procedures and Reports</div>
                                <p className="text-xs text-muted-foreground">
                                  Checked items are available to this employee from the staff login.
                                </p>
                              </div>
                              <div className="grid gap-3 text-sm md:grid-cols-3">
                                <div>
                                  <div className="font-medium flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Daily Reports
                                  </div>
                                  <div className="mt-1 flex flex-wrap gap-1 text-muted-foreground">
                                    {reportAssignments.length > 0
                                      ? reportAssignments.map((assignment) => (
                                          <Badge key={assignment.assignmentKey} variant="secondary">
                                            {assignment.assignmentLabel}
                                          </Badge>
                                        ))
                                      : "No report assignments"}
                                  </div>
                                </div>
                                <div>
                                  <div className="font-medium flex items-center gap-2">
                                    <ClipboardList className="h-4 w-4" />
                                    Procedures
                                  </div>
                                  <div className="mt-1 flex flex-wrap gap-1 text-muted-foreground">
                                    {procedureAssignments.length > 0
                                      ? procedureAssignments.map((assignment) => (
                                          <Badge key={assignment.assignmentKey} variant="secondary">
                                            {assignment.assignmentLabel}
                                          </Badge>
                                        ))
                                      : "No procedure assignments"}
                                  </div>
                                </div>
                                <div>
                                  <div className="font-medium flex items-center gap-2">
                                    <Printer className="h-4 w-4" />
                                    Print Menus
                                  </div>
                                  <div className="mt-1 flex flex-wrap gap-1 text-muted-foreground">
                                    {printMenuAssignments.length > 0
                                      ? printMenuAssignments.map((assignment) => (
                                          <Badge key={assignment.assignmentKey} variant="secondary">
                                            {assignment.assignmentLabel}
                                          </Badge>
                                        ))
                                      : "No print menu access"}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => openEditDialog(user)}>
                                <Users className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (window.confirm(`Remove ${user.displayName} from Staff Daily Report Center?`)) {
                                    deleteMutation.mutate(user.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit Staff User" : "Add Staff User"}</DialogTitle>
            <DialogDescription>
              Manage Employee Authorized Procedures and Reports from one shared staff profile.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="displayName">Name</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(event) => setFormData({ ...formData, displayName: event.target.value })}
                  placeholder="Staff member name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accessCode">Access Code</Label>
                <Input
                  id="accessCode"
                  value={formData.accessCode}
                  onChange={(event) => setFormData({ ...formData, accessCode: event.target.value.toUpperCase().slice(0, 10) })}
                  placeholder="1234"
                />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="homeDepartment">Department</Label>
                <Select
                  value={formData.homeDepartment || "__none__"}
                  onValueChange={(value) => setFormData({ ...formData, homeDepartment: value === "__none__" ? "" : value })}
                >
                  <SelectTrigger id="homeDepartment">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No primary department</SelectItem>
                    {options?.departments.map((department) => (
                      <SelectItem key={department.department} value={department.department}>
                        {department.departmentLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Department is managed here in Staff Daily Report Center Administration.
                </p>
              </div>
              <div className="flex items-center gap-2 md:col-span-3">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked === true })}
                />
                <Label htmlFor="isActive">Active staff user</Label>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="font-semibold">Employee Authorized Procedures and Reports</h3>
                <p className="text-sm text-muted-foreground">
                  New reports and procedures are added here unchecked until a manager authorizes them.
                </p>
              </div>
              <div className="grid gap-6 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Daily Reports</CardTitle>
                  <CardDescription>Toggle the departments this person can submit.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {options?.departments.map((department) => (
                    <label key={department.department} className="flex items-start gap-3 rounded-lg border p-3">
                      <Checkbox
                        checked={hasAssignment("daily_report", department.department)}
                        onCheckedChange={(checked) =>
                          toggleAssignment(checked === true, "daily_report", department.department, department.departmentLabel)
                        }
                      />
                      <span>
                        <span className="block font-medium">{department.departmentLabel}</span>
                        <span className="text-xs text-muted-foreground">{department.department}</span>
                      </span>
                    </label>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Opening and Closing Procedures</CardTitle>
                  <CardDescription>Toggle the procedures this person can complete.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {options?.procedures.map((procedure) => (
                    <label key={procedure.procedureCode} className="flex items-start gap-3 rounded-lg border p-3">
                      <Checkbox
                        checked={hasAssignment("procedure", procedure.procedureCode)}
                        onCheckedChange={(checked) =>
                          toggleAssignment(checked === true, "procedure", procedure.procedureCode, procedure.procedureName)
                        }
                      />
                      <span>
                        <span className="block font-medium">{procedure.procedureName}</span>
                        <span className="text-xs text-muted-foreground">
                          {procedure.department} / {procedure.procedureType} / {procedure.procedureCode}
                        </span>
                      </span>
                    </label>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Print Menus</CardTitle>
                  <CardDescription>Toggle approved Media Center menus this person can print.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {options?.printMenus?.length ? (
                    options.printMenus.map((menu) => (
                      <label key={menu.id} className="flex items-start gap-3 rounded-lg border p-3">
                        <Checkbox
                          checked={hasAssignment("print_menu", menu.id)}
                          onCheckedChange={(checked) =>
                            toggleAssignment(checked === true, "print_menu", menu.id, menu.name)
                          }
                        />
                        <span>
                          <span className="block font-medium">{menu.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {menu.description || (menu.source === "saved_config" ? "Saved menu configuration" : "Staff board menu")}
                          </span>
                        </span>
                      </label>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No approved staff print menus found in Media Center.
                    </div>
                  )}
                </CardContent>
              </Card>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !formData.displayName.trim() || !formData.accessCode.trim()}
            >
              <Save className="h-4 w-4 mr-2" />
              Save User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
