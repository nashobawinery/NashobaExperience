import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  ClipboardList,
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Filter,
  Search,
  Eye,
  FileText,
  Users,
  BookOpen,
  RefreshCw,
  MoreVertical,
  Building,
  AlertCircle,
  Wine,
  ShoppingBag,
  Utensils,
  PartyPopper,
  Factory,
  Wrench,
  Apple,
  ChefHat,
  Home,
  Send,
  Mail,
  Settings
} from "lucide-react";
import { getModuleDocs } from "@/docs";
import ModuleDocumentation from "@/components/ModuleDocumentation";
import "@/docs/daily-reports";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { format, formatDistanceToNow, isToday, isSameDay, startOfDay, endOfDay, subDays } from "date-fns";

interface DailyReportTemplate {
  id: string;
  department: string;
  departmentLabel: string;
  metrics: Array<{ key: string; label: string; type: string }>;
  isActive: boolean;
  createdAt: string;
}

interface DailyReport {
  id: string;
  templateId: string;
  department: string;
  reportDate: string;
  status: string;
  metrics: Record<string, number | string>;
  customerServiceSummary: string | null;
  operationalNotes: string | null;
  staffingNotes: string | null;
  submittedById: string | null;
  submittedByName: string | null;
  submittedAt: string | null;
  reviewedById: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  incidentsCount: number;
  proceduresCompleted: boolean;
  proceduresCompletedCount: number;
  proceduresTotalCount: number;
  createdAt: string;
  updatedAt: string;
}

interface DailyReportIncident {
  id: string;
  reportId: string;
  incidentType: string;
  severity: string;
  description: string;
  actionTaken: string | null;
  followUpRequired: boolean;
  followUpNotes: string | null;
  reportedById: string | null;
  reportedByName: string | null;
  occurredAt: string | null;
  createdAt: string;
}

interface DailyProcedureCompletion {
  id: string;
  reportId: string;
  procedureTemplateId: string;
  completed: boolean;
  completedById: string | null;
  completedByName: string | null;
  completedAt: string | null;
  notes: string | null;
}

interface DailyProcedureTemplate {
  id: string;
  templateId: string;
  procedureName: string;
  description: string | null;
  sortOrder: number;
  isRequired: boolean;
  complianceTaskId: string | null;
  isActive: boolean;
}

interface DailyReportStats {
  total: number;
  draft: number;
  submitted: number;
  reviewed: number;
  todayCount: number;
  incidentsToday: number;
  criticalIncidents: number;
  proceduresCompleted: number;
  proceduresTotal: number;
}

interface DailyReportEmailRecipient {
  id: string;
  department: string;
  email: string;
  name: string | null;
  isActive: boolean;
  createdAt: string;
}

const departmentIcons: Record<string, any> = {
  tasting_room: Wine,
  retail: ShoppingBag,
  the_knoll: Utensils,
  pavilion: PartyPopper,
  js_restaurant: Utensils,
  production: Factory,
  events: PartyPopper,
  maintenance: Wrench,
  orchard: Apple,
  food_operations: ChefHat
};

const statusColors: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  reviewed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
};

const severityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
};

const incidentTypes = [
  { value: "customer_complaint", label: "Customer Complaint" },
  { value: "equipment_issue", label: "Equipment Issue" },
  { value: "safety_concern", label: "Safety Concern" },
  { value: "staffing_issue", label: "Staffing Issue" },
  { value: "inventory_shortage", label: "Inventory Shortage" },
  { value: "quality_issue", label: "Quality Issue" },
  { value: "policy_violation", label: "Policy Violation" },
  { value: "maintenance_needed", label: "Maintenance Needed" },
  { value: "positive_feedback", label: "Positive Feedback" },
  { value: "other", label: "Other" }
];

export default function DailyReportsAdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isIncidentDialogOpen, setIsIncidentDialogOpen] = useState(false);
  const [isProcedureDialogOpen, setIsProcedureDialogOpen] = useState(false);
  const [isViewReportDialogOpen, setIsViewReportDialogOpen] = useState(false);
  
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null);
  const [editingIncident, setEditingIncident] = useState<DailyReportIncident | null>(null);
  
  const [reportFormData, setReportFormData] = useState({
    department: "",
    reportDate: format(new Date(), "yyyy-MM-dd"),
    metrics: {} as Record<string, string>,
    customerServiceSummary: "",
    operationalNotes: "",
    staffingNotes: ""
  });
  
  const [incidentFormData, setIncidentFormData] = useState({
    incidentType: "other",
    severity: "medium",
    description: "",
    actionTaken: "",
    followUpRequired: false,
    followUpNotes: "",
    occurredAt: format(new Date(), "yyyy-MM-dd'T'HH:mm")
  });
  
  const [isEmailRecipientDialogOpen, setIsEmailRecipientDialogOpen] = useState(false);
  const [editingEmailRecipient, setEditingEmailRecipient] = useState<DailyReportEmailRecipient | null>(null);
  const [emailRecipientFormData, setEmailRecipientFormData] = useState({
    department: "",
    email: "",
    name: "",
    isActive: true
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery<DailyReportTemplate[]>({
    queryKey: ['/api/daily-reports/templates']
  });

  const { data: reports = [], isLoading: reportsLoading } = useQuery<DailyReport[]>({
    queryKey: ['/api/daily-reports', { department: selectedDepartment, date: selectedDate }]
  });

  const { data: stats, isLoading: statsLoading } = useQuery<DailyReportStats>({
    queryKey: ['/api/daily-reports/stats', { date: selectedDate }]
  });

  const { data: selectedReportIncidents = [] } = useQuery<DailyReportIncident[]>({
    queryKey: ['/api/daily-reports', selectedReport?.id, 'incidents'],
    enabled: !!selectedReport
  });

  const { data: selectedReportProcedures = [] } = useQuery<DailyProcedureCompletion[]>({
    queryKey: ['/api/daily-reports', selectedReport?.id, 'procedures'],
    enabled: !!selectedReport
  });

  const { data: procedureTemplates = [] } = useQuery<DailyProcedureTemplate[]>({
    queryKey: ['/api/daily-reports/templates', selectedReport?.templateId, 'procedures'],
    enabled: !!selectedReport?.templateId
  });

  const { data: emailRecipients = [], isLoading: emailRecipientsLoading } = useQuery<DailyReportEmailRecipient[]>({
    queryKey: ['/api/daily-reports/email-recipients'],
    enabled: activeTab === 'settings'
  });

  const createEmailRecipientMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/daily-reports/email-recipients', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/email-recipients'] });
      setIsEmailRecipientDialogOpen(false);
      resetEmailRecipientForm();
      toast({ title: "Email recipient added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add email recipient", description: error.message, variant: "destructive" });
    }
  });

  const updateEmailRecipientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest('PATCH', `/api/daily-reports/email-recipients/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/email-recipients'] });
      setIsEmailRecipientDialogOpen(false);
      setEditingEmailRecipient(null);
      resetEmailRecipientForm();
      toast({ title: "Email recipient updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update email recipient", description: error.message, variant: "destructive" });
    }
  });

  const deleteEmailRecipientMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/daily-reports/email-recipients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/email-recipients'] });
      toast({ title: "Email recipient deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete email recipient", description: error.message, variant: "destructive" });
    }
  });

  const createReportMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/daily-reports', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports'] });
      setIsReportDialogOpen(false);
      resetReportForm();
      toast({ title: "Report created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create report", description: error.message, variant: "destructive" });
    }
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest('PATCH', `/api/daily-reports/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports'] });
      setIsReportDialogOpen(false);
      setEditingReport(null);
      resetReportForm();
      toast({ title: "Report updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update report", description: error.message, variant: "destructive" });
    }
  });

  const submitReportMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('POST', `/api/daily-reports/${id}/submit`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports'] });
      toast({ title: "Report submitted for review" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to submit report", description: error.message, variant: "destructive" });
    }
  });

  const reviewReportMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('POST', `/api/daily-reports/${id}/review`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports'] });
      toast({ title: "Report marked as reviewed" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to review report", description: error.message, variant: "destructive" });
    }
  });

  const deleteReportMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/daily-reports/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports'] });
      toast({ title: "Report deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete report", description: error.message, variant: "destructive" });
    }
  });

  const createIncidentMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', `/api/daily-reports/${selectedReport?.id}/incidents`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports', selectedReport?.id, 'incidents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports'] });
      setIsIncidentDialogOpen(false);
      resetIncidentForm();
      toast({ title: "Incident logged successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to log incident", description: error.message, variant: "destructive" });
    }
  });

  const updateProceduresMutation = useMutation({
    mutationFn: async ({ reportId, completions }: { reportId: string; completions: Array<{ procedureId: string; completed: boolean; notes?: string }> }) => {
      return await apiRequest('POST', `/api/daily-reports/${reportId}/procedures/bulk`, { completions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports', selectedReport?.id, 'procedures'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports'] });
      toast({ title: "Procedures updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update procedures", description: error.message, variant: "destructive" });
    }
  });

  const resetReportForm = () => {
    setReportFormData({
      department: "",
      reportDate: format(new Date(), "yyyy-MM-dd"),
      metrics: {},
      customerServiceSummary: "",
      operationalNotes: "",
      staffingNotes: ""
    });
  };

  const resetIncidentForm = () => {
    setIncidentFormData({
      incidentType: "other",
      severity: "medium",
      description: "",
      actionTaken: "",
      followUpRequired: false,
      followUpNotes: "",
      occurredAt: format(new Date(), "yyyy-MM-dd'T'HH:mm")
    });
  };

  const resetEmailRecipientForm = () => {
    setEmailRecipientFormData({
      department: "",
      email: "",
      name: "",
      isActive: true
    });
  };

  const handleAddEmailRecipient = () => {
    setEditingEmailRecipient(null);
    resetEmailRecipientForm();
    setIsEmailRecipientDialogOpen(true);
  };

  const handleEditEmailRecipient = (recipient: DailyReportEmailRecipient) => {
    setEditingEmailRecipient(recipient);
    setEmailRecipientFormData({
      department: recipient.department,
      email: recipient.email,
      name: recipient.name || "",
      isActive: recipient.isActive
    });
    setIsEmailRecipientDialogOpen(true);
  };

  const handleSaveEmailRecipient = async () => {
    if (!emailRecipientFormData.department || !emailRecipientFormData.email) {
      toast({ title: "Please fill in required fields", variant: "destructive" });
      return;
    }

    if (editingEmailRecipient) {
      const data = {
        department: emailRecipientFormData.department,
        email: emailRecipientFormData.email.trim(),
        name: emailRecipientFormData.name || null,
        isActive: emailRecipientFormData.isActive
      };
      updateEmailRecipientMutation.mutate({ id: editingEmailRecipient.id, data });
    } else {
      const emails = emailRecipientFormData.email
        .split(',')
        .map(e => e.trim())
        .filter(e => e.length > 0 && e.includes('@'));

      if (emails.length === 0) {
        toast({ title: "Please enter valid email addresses", variant: "destructive" });
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const email of emails) {
        try {
          await apiRequest('POST', '/api/daily-reports/email-recipients', {
            department: emailRecipientFormData.department,
            email,
            name: null,
            isActive: true
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to add ${email}:`, error);
          errorCount++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/email-recipients'] });

      if (successCount > 0) {
        toast({ 
          title: `Added ${successCount} recipient${successCount > 1 ? 's' : ''}`,
          description: errorCount > 0 ? `${errorCount} failed to add` : undefined
        });
        setIsEmailRecipientDialogOpen(false);
        resetEmailRecipientForm();
      } else {
        toast({ title: "Failed to add recipients", variant: "destructive" });
      }
    }
  };

  const handleDeleteEmailRecipient = (id: string) => {
    if (window.confirm("Are you sure you want to delete this email recipient?")) {
      deleteEmailRecipientMutation.mutate(id);
    }
  };

  const handleCreateReport = () => {
    setEditingReport(null);
    resetReportForm();
    setIsReportDialogOpen(true);
  };

  const handleEditReport = (report: DailyReport) => {
    setEditingReport(report);
    setReportFormData({
      department: report.department,
      reportDate: report.reportDate,
      metrics: report.metrics as Record<string, string>,
      customerServiceSummary: report.customerServiceSummary || "",
      operationalNotes: report.operationalNotes || "",
      staffingNotes: report.staffingNotes || ""
    });
    setIsReportDialogOpen(true);
  };

  const handleViewReport = (report: DailyReport) => {
    setSelectedReport(report);
    setIsViewReportDialogOpen(true);
  };

  const handleSaveReport = () => {
    const template = templates.find(t => t.department === reportFormData.department);
    if (!template) {
      toast({ title: "Please select a department", variant: "destructive" });
      return;
    }

    const metricsToSave: Record<string, number> = {};
    template.metrics.forEach(m => {
      const value = reportFormData.metrics[m.key];
      metricsToSave[m.key] = value ? parseFloat(value) : 0;
    });

    const data = {
      templateId: template.id,
      department: reportFormData.department,
      reportDate: reportFormData.reportDate,
      metrics: metricsToSave,
      customerServiceSummary: reportFormData.customerServiceSummary || null,
      operationalNotes: reportFormData.operationalNotes || null,
      staffingNotes: reportFormData.staffingNotes || null
    };

    if (editingReport) {
      updateReportMutation.mutate({ id: editingReport.id, data });
    } else {
      createReportMutation.mutate(data);
    }
  };

  const handleAddIncident = () => {
    if (!selectedReport) return;
    setEditingIncident(null);
    resetIncidentForm();
    setIsIncidentDialogOpen(true);
  };

  const handleSaveIncident = () => {
    const data = {
      incidentType: incidentFormData.incidentType,
      severity: incidentFormData.severity,
      description: incidentFormData.description,
      actionTaken: incidentFormData.actionTaken || null,
      followUpRequired: incidentFormData.followUpRequired,
      followUpNotes: incidentFormData.followUpNotes || null,
      occurredAt: incidentFormData.occurredAt || null
    };

    createIncidentMutation.mutate(data);
  };

  const selectedTemplate = templates.find(t => t.department === reportFormData.department);

  const filteredReports = reports.filter(report => {
    if (selectedDepartment !== "all" && report.department !== selectedDepartment) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const template = templates.find(t => t.id === report.templateId);
      return (
        template?.departmentLabel?.toLowerCase().includes(query) ||
        report.customerServiceSummary?.toLowerCase().includes(query) ||
        report.operationalNotes?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const DepartmentIcon = ({ department }: { department: string }) => {
    const Icon = departmentIcons[department] || Building;
    return <Icon className="h-4 w-4" />;
  };

  if (templatesLoading || reportsLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation("/admin-hub")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-amber-500" />
              <h1 className="text-xl font-semibold">Daily Reports</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/daily-reports'] })}
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              onClick={handleCreateReport}
              data-testid="button-new-report"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Report
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card data-testid="card-stats-total">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Today's Reports</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.todayCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                of {templates.length} departments
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-stats-pending">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.submitted || 0}</div>
              <p className="text-xs text-muted-foreground">
                awaiting manager review
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-stats-incidents">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Incidents Today</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.incidentsToday || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.criticalIncidents || 0} critical
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-stats-procedures">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Procedures</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.proceduresCompleted || 0}/{stats?.proceduresTotal || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                completed today
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="reports" data-testid="tab-reports">Reports</TabsTrigger>
            <TabsTrigger value="incidents" data-testid="tab-incidents">Incidents</TabsTrigger>
            <TabsTrigger value="departments" data-testid="tab-departments">Departments</TabsTrigger>
            <TabsTrigger value="docs" data-testid="tab-docs">
              <BookOpen className="h-4 w-4 mr-2" />
              Documentation
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="date-filter">Date</Label>
                <Input
                  id="date-filter"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-40"
                  data-testid="input-date-filter"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="dept-filter">Department</Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-48" data-testid="select-department-filter">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {templates.map(t => (
                      <SelectItem key={t.department} value={t.department}>
                        {t.departmentLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(template => {
                const report = filteredReports.find(r => r.department === template.department);
                const Icon = departmentIcons[template.department] || Building;
                
                return (
                  <Card 
                    key={template.id} 
                    className={`cursor-pointer hover-elevate ${report ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-gray-300'}`}
                    onClick={() => report ? handleViewReport(report) : handleCreateReport()}
                    data-testid={`card-department-${template.department}`}
                  >
                    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-amber-500" />
                        <CardTitle className="text-sm font-medium">{template.departmentLabel}</CardTitle>
                      </div>
                      {report && (
                        <Badge className={statusColors[report.status]}>
                          {report.status}
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent>
                      {report ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {template.metrics.slice(0, 4).map(m => (
                              <div key={m.key}>
                                <span className="text-muted-foreground">{m.label}:</span>{" "}
                                <span className="font-medium">{(report.metrics as any)[m.key] || 0}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <AlertTriangle className="h-3 w-3" />
                            {report.incidentsCount} incidents
                            <span className="mx-1">|</span>
                            <CheckCircle className="h-3 w-3" />
                            {report.proceduresCompletedCount}/{report.proceduresTotalCount} procedures
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          No report submitted for {format(new Date(selectedDate), "MMM d, yyyy")}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-reports"
                />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-40"
                  data-testid="input-date-filter-reports"
                />
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <table className="w-full">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-3 font-medium">Department</th>
                        <th className="text-left p-3 font-medium">Date</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Incidents</th>
                        <th className="text-left p-3 font-medium">Procedures</th>
                        <th className="text-left p-3 font-medium">Submitted By</th>
                        <th className="text-right p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReports.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center p-8 text-muted-foreground">
                            No reports found for the selected criteria
                          </td>
                        </tr>
                      ) : (
                        filteredReports.map(report => {
                          const template = templates.find(t => t.id === report.templateId);
                          return (
                            <tr 
                              key={report.id} 
                              className="border-b hover:bg-muted/50"
                              data-testid={`row-report-${report.id}`}
                            >
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <DepartmentIcon department={report.department} />
                                  <span>{template?.departmentLabel || report.department}</span>
                                </div>
                              </td>
                              <td className="p-3">
                                {format(new Date(report.reportDate), "MMM d, yyyy")}
                              </td>
                              <td className="p-3">
                                <Badge className={statusColors[report.status]}>
                                  {report.status}
                                </Badge>
                              </td>
                              <td className="p-3">
                                {report.incidentsCount > 0 ? (
                                  <Badge variant="outline" className="gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {report.incidentsCount}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">0</span>
                                )}
                              </td>
                              <td className="p-3">
                                <span className={report.proceduresCompleted ? "text-green-600" : "text-muted-foreground"}>
                                  {report.proceduresCompletedCount}/{report.proceduresTotalCount}
                                </span>
                              </td>
                              <td className="p-3 text-sm">
                                {report.submittedByName || "-"}
                              </td>
                              <td className="p-3 text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" data-testid={`button-actions-${report.id}`}>
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleViewReport(report)}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Details
                                    </DropdownMenuItem>
                                    {report.status === "draft" && (
                                      <>
                                        <DropdownMenuItem onClick={() => handleEditReport(report)}>
                                          <Edit className="h-4 w-4 mr-2" />
                                          Edit Report
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => submitReportMutation.mutate(report.id)}>
                                          <Send className="h-4 w-4 mr-2" />
                                          Submit for Review
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    {report.status === "submitted" && (
                                      <DropdownMenuItem onClick={() => reviewReportMutation.mutate(report.id)}>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Mark as Reviewed
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      className="text-destructive"
                                      onClick={() => {
                                        if (confirm("Are you sure you want to delete this report?")) {
                                          deleteReportMutation.mutate(report.id);
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="incidents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Incidents</CardTitle>
                <CardDescription>
                  Incidents logged across all departments. Critical issues are highlighted.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a report to view and manage incidents</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="departments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Department Templates</CardTitle>
                <CardDescription>
                  Configure metrics and procedures for each department
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map(template => {
                    const Icon = departmentIcons[template.department] || Building;
                    return (
                      <Card key={template.id} data-testid={`card-template-${template.department}`}>
                        <CardHeader className="flex flex-row items-center gap-3 pb-2">
                          <Icon className="h-5 w-5 text-amber-500" />
                          <div>
                            <CardTitle className="text-base">{template.departmentLabel}</CardTitle>
                            <CardDescription>{template.metrics.length} metrics tracked</CardDescription>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-1">
                            {template.metrics.map(m => (
                              <Badge key={m.key} variant="secondary" className="text-xs">
                                {m.label}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="docs">
            <Card>
              <CardContent className="p-6">
                <ModuleDocumentation documentation={getModuleDocs("daily-reports")!} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Notifications
                  </CardTitle>
                  <CardDescription>
                    Configure who receives email notifications when daily reports are submitted
                  </CardDescription>
                </div>
                <Button onClick={handleAddEmailRecipient} data-testid="button-add-email-recipient">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Recipient
                </Button>
              </CardHeader>
              <CardContent>
                {emailRecipientsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : emailRecipients.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No email recipients configured</p>
                    <p className="text-sm">Add recipients to receive notifications when reports are submitted</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {templates.map(template => {
                      const deptRecipients = emailRecipients.filter(r => r.department === template.department);
                      if (deptRecipients.length === 0) return null;
                      const Icon = departmentIcons[template.department] || Building;
                      return (
                        <div key={template.department} className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Icon className="h-4 w-4 text-amber-500" />
                            <span className="font-medium">{template.departmentLabel}</span>
                            <Badge variant="secondary" className="text-xs">
                              {deptRecipients.length} recipient{deptRecipients.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            {deptRecipients.map(recipient => (
                              <div 
                                key={recipient.id} 
                                className="flex items-center justify-between p-2 bg-muted/50 rounded"
                                data-testid={`email-recipient-${recipient.id}`}
                              >
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <span className={!recipient.isActive ? "text-muted-foreground line-through" : ""}>
                                    {recipient.email}
                                  </span>
                                  {recipient.name && (
                                    <span className="text-muted-foreground text-sm">({recipient.name})</span>
                                  )}
                                  {!recipient.isActive && (
                                    <Badge variant="outline" className="text-xs">Inactive</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleEditEmailRecipient(recipient)}
                                    data-testid={`button-edit-recipient-${recipient.id}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleDeleteEmailRecipient(recipient.id)}
                                    data-testid={`button-delete-recipient-${recipient.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {emailRecipients.filter(r => !templates.find(t => t.department === r.department)).length > 0 && (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-muted-foreground">Other Departments</span>
                        </div>
                        <div className="space-y-2">
                          {emailRecipients
                            .filter(r => !templates.find(t => t.department === r.department))
                            .map(recipient => (
                              <div 
                                key={recipient.id} 
                                className="flex items-center justify-between p-2 bg-muted/50 rounded"
                              >
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <span>{recipient.email}</span>
                                  <Badge variant="outline" className="text-xs">{recipient.department}</Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => handleEditEmailRecipient(recipient)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteEmailRecipient(recipient.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReport ? "Edit Daily Report" : "Create Daily Report"}</DialogTitle>
            <DialogDescription>
              Fill in the daily metrics and notes for your department
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="report-department">Department</Label>
                <Select 
                  value={reportFormData.department} 
                  onValueChange={(v) => setReportFormData({ ...reportFormData, department: v, metrics: {} })}
                  disabled={!!editingReport}
                >
                  <SelectTrigger id="report-department" data-testid="select-report-department">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.department} value={t.department}>
                        {t.departmentLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-date">Report Date</Label>
                <Input
                  id="report-date"
                  type="date"
                  value={reportFormData.reportDate}
                  onChange={(e) => setReportFormData({ ...reportFormData, reportDate: e.target.value })}
                  disabled={!!editingReport}
                  data-testid="input-report-date"
                />
              </div>
            </div>

            {selectedTemplate && (
              <div className="space-y-4">
                <div className="border-t pt-4">
                  <Label className="text-base font-medium">Daily Metrics</Label>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    {selectedTemplate.metrics.map(metric => (
                      <div key={metric.key} className="space-y-2">
                        <Label htmlFor={`metric-${metric.key}`}>{metric.label}</Label>
                        <Input
                          id={`metric-${metric.key}`}
                          type="number"
                          step={metric.type === "currency" || metric.type === "percentage" ? "0.01" : "1"}
                          value={reportFormData.metrics[metric.key] || ""}
                          onChange={(e) => setReportFormData({
                            ...reportFormData,
                            metrics: { ...reportFormData.metrics, [metric.key]: e.target.value }
                          })}
                          placeholder={metric.type === "currency" ? "$0.00" : "0"}
                          data-testid={`input-metric-${metric.key}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer-service">Customer Service Summary</Label>
                  <Textarea
                    id="customer-service"
                    placeholder="Notable customer interactions, feedback, or service issues..."
                    value={reportFormData.customerServiceSummary}
                    onChange={(e) => setReportFormData({ ...reportFormData, customerServiceSummary: e.target.value })}
                    rows={3}
                    data-testid="textarea-customer-service"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="operational-notes">Operational Notes</Label>
                  <Textarea
                    id="operational-notes"
                    placeholder="Important operational updates, challenges, or accomplishments..."
                    value={reportFormData.operationalNotes}
                    onChange={(e) => setReportFormData({ ...reportFormData, operationalNotes: e.target.value })}
                    rows={3}
                    data-testid="textarea-operational-notes"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="staffing-notes">Staffing Notes</Label>
                  <Textarea
                    id="staffing-notes"
                    placeholder="Staffing levels, callouts, or scheduling notes..."
                    value={reportFormData.staffingNotes}
                    onChange={(e) => setReportFormData({ ...reportFormData, staffingNotes: e.target.value })}
                    rows={2}
                    data-testid="textarea-staffing-notes"
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveReport}
              disabled={!reportFormData.department || createReportMutation.isPending || updateReportMutation.isPending}
              data-testid="button-save-report"
            >
              {createReportMutation.isPending || updateReportMutation.isPending ? "Saving..." : "Save Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewReportDialogOpen} onOpenChange={setIsViewReportDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedReport && <DepartmentIcon department={selectedReport.department} />}
              {templates.find(t => t.id === selectedReport?.templateId)?.departmentLabel} - Daily Report
            </DialogTitle>
            <DialogDescription>
              {selectedReport && format(new Date(selectedReport.reportDate), "EEEE, MMMM d, yyyy")}
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-6 py-4">
              <div className="flex items-center justify-between">
                <Badge className={statusColors[selectedReport.status]}>
                  {selectedReport.status}
                </Badge>
                <div className="flex items-center gap-2">
                  {selectedReport.status === "draft" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => {
                        setIsViewReportDialogOpen(false);
                        handleEditReport(selectedReport);
                      }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button size="sm" onClick={() => {
                        submitReportMutation.mutate(selectedReport.id);
                        setIsViewReportDialogOpen(false);
                      }}>
                        <Send className="h-4 w-4 mr-2" />
                        Submit
                      </Button>
                    </>
                  )}
                  {selectedReport.status === "submitted" && (
                    <Button size="sm" onClick={() => {
                      reviewReportMutation.mutate(selectedReport.id);
                      setIsViewReportDialogOpen(false);
                    }}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Reviewed
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {templates.find(t => t.id === selectedReport.templateId)?.metrics.map(metric => (
                  <div key={metric.key} className="bg-muted rounded-lg p-3">
                    <div className="text-sm text-muted-foreground">{metric.label}</div>
                    <div className="text-2xl font-bold">
                      {metric.type === "currency" && "$"}
                      {(selectedReport.metrics as any)[metric.key] || 0}
                      {metric.type === "percentage" && "%"}
                    </div>
                  </div>
                ))}
              </div>

              {(selectedReport.customerServiceSummary || selectedReport.operationalNotes || selectedReport.staffingNotes) && (
                <div className="space-y-4">
                  {selectedReport.customerServiceSummary && (
                    <div>
                      <Label className="text-sm font-medium">Customer Service Summary</Label>
                      <p className="mt-1 text-sm text-muted-foreground">{selectedReport.customerServiceSummary}</p>
                    </div>
                  )}
                  {selectedReport.operationalNotes && (
                    <div>
                      <Label className="text-sm font-medium">Operational Notes</Label>
                      <p className="mt-1 text-sm text-muted-foreground">{selectedReport.operationalNotes}</p>
                    </div>
                  )}
                  {selectedReport.staffingNotes && (
                    <div>
                      <Label className="text-sm font-medium">Staffing Notes</Label>
                      <p className="mt-1 text-sm text-muted-foreground">{selectedReport.staffingNotes}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-medium">Incidents ({selectedReportIncidents.length})</Label>
                  <Button size="sm" variant="outline" onClick={handleAddIncident}>
                    <Plus className="h-4 w-4 mr-2" />
                    Log Incident
                  </Button>
                </div>
                {selectedReportIncidents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No incidents logged for this report</p>
                ) : (
                  <div className="space-y-2">
                    {selectedReportIncidents.map(incident => (
                      <Card key={incident.id}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={severityColors[incident.severity]}>
                                  {incident.severity}
                                </Badge>
                                <span className="text-sm font-medium">
                                  {incidentTypes.find(t => t.value === incident.incidentType)?.label || incident.incidentType}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">{incident.description}</p>
                              {incident.actionTaken && (
                                <p className="text-sm mt-1"><strong>Action:</strong> {incident.actionTaken}</p>
                              )}
                            </div>
                            {incident.followUpRequired && (
                              <Badge variant="outline" className="text-orange-600">
                                Follow-up Required
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <Label className="text-base font-medium">
                  Procedures ({selectedReport.proceduresCompletedCount}/{selectedReport.proceduresTotalCount})
                </Label>
                {procedureTemplates.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">No procedure checklist for this department</p>
                ) : (
                  <div className="space-y-2 mt-3">
                    {procedureTemplates.map(proc => {
                      const completion = selectedReportProcedures.find(c => c.procedureTemplateId === proc.id);
                      return (
                        <div key={proc.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted">
                          <Checkbox
                            checked={completion?.completed || false}
                            onCheckedChange={(checked) => {
                              updateProceduresMutation.mutate({
                                reportId: selectedReport.id,
                                completions: [{ procedureId: proc.id, completed: checked === true }]
                              });
                            }}
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{proc.procedureName}</div>
                            {proc.description && (
                              <div className="text-xs text-muted-foreground">{proc.description}</div>
                            )}
                          </div>
                          {proc.isRequired && (
                            <Badge variant="outline" className="text-xs">Required</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t pt-4 text-xs text-muted-foreground">
                {selectedReport.submittedByName && (
                  <p>Submitted by {selectedReport.submittedByName} on {selectedReport.submittedAt && format(new Date(selectedReport.submittedAt), "MMM d, yyyy 'at' h:mm a")}</p>
                )}
                {selectedReport.reviewedByName && (
                  <p>Reviewed by {selectedReport.reviewedByName} on {selectedReport.reviewedAt && format(new Date(selectedReport.reviewedAt), "MMM d, yyyy 'at' h:mm a")}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isIncidentDialogOpen} onOpenChange={setIsIncidentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Incident</DialogTitle>
            <DialogDescription>
              Record an incident that occurred during this shift
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="incident-type">Incident Type</Label>
                <Select 
                  value={incidentFormData.incidentType} 
                  onValueChange={(v) => setIncidentFormData({ ...incidentFormData, incidentType: v })}
                >
                  <SelectTrigger id="incident-type" data-testid="select-incident-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {incidentTypes.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="incident-severity">Severity</Label>
                <Select 
                  value={incidentFormData.severity} 
                  onValueChange={(v) => setIncidentFormData({ ...incidentFormData, severity: v })}
                >
                  <SelectTrigger id="incident-severity" data-testid="select-incident-severity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="incident-description">Description</Label>
              <Textarea
                id="incident-description"
                placeholder="What happened?"
                value={incidentFormData.description}
                onChange={(e) => setIncidentFormData({ ...incidentFormData, description: e.target.value })}
                rows={3}
                data-testid="textarea-incident-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="incident-action">Action Taken</Label>
              <Textarea
                id="incident-action"
                placeholder="What was done to address this?"
                value={incidentFormData.actionTaken}
                onChange={(e) => setIncidentFormData({ ...incidentFormData, actionTaken: e.target.value })}
                rows={2}
                data-testid="textarea-incident-action"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="follow-up"
                checked={incidentFormData.followUpRequired}
                onCheckedChange={(checked) => setIncidentFormData({ ...incidentFormData, followUpRequired: checked === true })}
              />
              <Label htmlFor="follow-up" className="text-sm">Follow-up required</Label>
            </div>

            {incidentFormData.followUpRequired && (
              <div className="space-y-2">
                <Label htmlFor="follow-up-notes">Follow-up Notes</Label>
                <Textarea
                  id="follow-up-notes"
                  placeholder="What needs to be done?"
                  value={incidentFormData.followUpNotes}
                  onChange={(e) => setIncidentFormData({ ...incidentFormData, followUpNotes: e.target.value })}
                  rows={2}
                  data-testid="textarea-follow-up-notes"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="incident-time">When did this occur?</Label>
              <Input
                id="incident-time"
                type="datetime-local"
                value={incidentFormData.occurredAt}
                onChange={(e) => setIncidentFormData({ ...incidentFormData, occurredAt: e.target.value })}
                data-testid="input-incident-time"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsIncidentDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveIncident}
              disabled={!incidentFormData.description || createIncidentMutation.isPending}
              data-testid="button-save-incident"
            >
              {createIncidentMutation.isPending ? "Saving..." : "Log Incident"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEmailRecipientDialogOpen} onOpenChange={setIsEmailRecipientDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEmailRecipient ? "Edit Email Recipient" : "Add Email Recipient"}</DialogTitle>
            <DialogDescription>
              Configure who receives email notifications when reports are submitted
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipient-department">Department</Label>
              <Select 
                value={emailRecipientFormData.department} 
                onValueChange={(v) => setEmailRecipientFormData({ ...emailRecipientFormData, department: v })}
              >
                <SelectTrigger id="recipient-department" data-testid="select-recipient-department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.department} value={t.department}>
                      {t.departmentLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient-email">
                {editingEmailRecipient ? "Email Address" : "Email Addresses"}
              </Label>
              {!editingEmailRecipient && (
                <p className="text-sm text-muted-foreground">
                  Separate multiple emails with commas
                </p>
              )}
              <Input
                id="recipient-email"
                type={editingEmailRecipient ? "email" : "text"}
                placeholder={editingEmailRecipient 
                  ? "manager@nashobawinery.com" 
                  : "manager@nashobawinery.com, staff@nashobawinery.com"}
                value={emailRecipientFormData.email}
                onChange={(e) => setEmailRecipientFormData({ ...emailRecipientFormData, email: e.target.value })}
                data-testid="input-recipient-email"
              />
            </div>

            {editingEmailRecipient && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="recipient-name">Name (Optional)</Label>
                  <Input
                    id="recipient-name"
                    type="text"
                    placeholder="John Smith"
                    value={emailRecipientFormData.name}
                    onChange={(e) => setEmailRecipientFormData({ ...emailRecipientFormData, name: e.target.value })}
                    data-testid="input-recipient-name"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="recipient-active"
                    checked={emailRecipientFormData.isActive}
                    onCheckedChange={(checked) => setEmailRecipientFormData({ ...emailRecipientFormData, isActive: checked === true })}
                  />
                  <Label htmlFor="recipient-active" className="text-sm">Active (receives emails)</Label>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailRecipientDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEmailRecipient}
              disabled={!emailRecipientFormData.department || !emailRecipientFormData.email || createEmailRecipientMutation.isPending || updateEmailRecipientMutation.isPending}
              data-testid="button-save-recipient"
            >
              {(createEmailRecipientMutation.isPending || updateEmailRecipientMutation.isPending) ? "Saving..." : (editingEmailRecipient ? "Save Changes" : "Add Recipients")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
