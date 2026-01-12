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
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  Scale, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Mail,
  ExternalLink,
  RefreshCw,
  FileText,
  Building2,
  Bell,
  Filter,
  Search,
  MoreVertical,
  Eye,
  EyeOff,
  Archive,
  Copy,
  CheckSquare,
  BookOpen,
  GripVertical,
  X,
  Image,
  Upload,
  Loader2,
  ImageIcon,
  Home,
  Clipboard
} from "lucide-react";
import { getModuleDocs } from "@/docs";
import ModuleDocumentation from "@/components/ModuleDocumentation";
import "@/docs/compliance";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, formatDistanceToNow, isPast, addDays, isWithinInterval } from "date-fns";

interface ComplianceTask {
  id: string;
  task_name: string;
  description: string | null;
  steps: TaskStep[] | null;
  category: string;
  subcategory: string | null;
  jurisdiction: string | null;
  regulatory_body: string | null;
  recurrence: string;
  custom_recurrence_days: number | null;
  due_date: string | null;
  reminder_days: number[] | null;
  assigned_to_name: string | null;
  assigned_to_email: string | null;
  status: string;
  priority: string;
  portal_url: string | null;
  portal_username: string | null;
  portal_password: string | null;
  portal_notes: string | null;
  estimated_cost: string | null;
  actual_cost: string | null;
  penalty_amount: string | null;
  completion_notes: string | null;
  confirmation_number: string | null;
  tags: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  last_reminder_sent: string | null;
}

interface ComplianceStats {
  total_tasks: string;
  pending: string;
  in_progress: string;
  completed: string;
  overdue: string;
  past_due: string;
  due_this_week: string;
  due_this_month: string;
}

interface StepAttachment {
  id: string;
  fileName: string;
  storageKey: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

interface TaskStep {
  id?: string;
  order: number;
  instruction: string;
  attachments?: StepAttachment[];
}

interface TaskFormData {
  taskName: string;
  description: string;
  steps: TaskStep[];
  category: string;
  subcategory: string;
  jurisdiction: string;
  regulatoryBody: string;
  recurrence: string;
  customRecurrenceDays: number | null;
  dueDate: string;
  reminderDays: number[];
  assignedToName: string;
  assignedToEmail: string;
  status: string;
  priority: string;
  portalUrl: string;
  portalUsername: string;
  portalPassword: string;
  portalNotes: string;
  estimatedCost: string;
  actualCost: string;
  penaltyAmount: string;
  completionNotes: string;
  confirmationNumber: string;
  tags: string[];
}

const categoryOptions = [
  { value: "tax", label: "Tax" },
  { value: "licensing", label: "Licensing" },
  { value: "regulatory", label: "Regulatory" },
  { value: "insurance", label: "Insurance" },
  { value: "environmental", label: "Environmental" },
  { value: "health_safety", label: "Health & Safety" },
  { value: "payroll", label: "Payroll" },
  { value: "privacy", label: "Privacy" },
  { value: "security", label: "Security" },
  { value: "administrative", label: "Administrative" },
  { value: "other", label: "Other" },
];

const priorityOptions = [
  { value: "low", label: "Low", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  { value: "medium", label: "Medium", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "critical", label: "Critical", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
];

const statusOptions = [
  { value: "pending", label: "Pending", color: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "completed", label: "Completed", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  { value: "overdue", label: "Overdue", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  { value: "cancelled", label: "Cancelled", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
];

const recurrenceOptions = [
  { value: "one_time", label: "One Time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semi_annual", label: "Semi-Annual" },
  { value: "annual", label: "Annual" },
  { value: "custom", label: "Custom" },
];

const defaultFormData: TaskFormData = {
  taskName: "",
  description: "",
  steps: [],
  category: "tax",
  subcategory: "",
  jurisdiction: "",
  regulatoryBody: "",
  recurrence: "one_time",
  customRecurrenceDays: null,
  dueDate: "",
  reminderDays: [7, 3, 1],
  assignedToName: "",
  assignedToEmail: "",
  status: "pending",
  priority: "medium",
  portalUrl: "",
  portalUsername: "",
  portalPassword: "",
  portalNotes: "",
  estimatedCost: "",
  actualCost: "",
  penaltyAmount: "",
  completionNotes: "",
  confirmationNumber: "",
  tags: [],
};

export default function ComplianceAdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ComplianceTask | null>(null);
  const [formData, setFormData] = useState<TaskFormData>(defaultFormData);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [viewShowPassword, setViewShowPassword] = useState(false);
  const [uploadingStepId, setUploadingStepId] = useState<string | null>(null);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<ComplianceStats>({
    queryKey: ['/api/compliance/stats'],
  });

  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery<ComplianceTask[]>({
    queryKey: ['/api/compliance/tasks'],
  });

  const { data: upcomingTasks = [] } = useQuery<ComplianceTask[]>({
    queryKey: ['/api/compliance/upcoming'],
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      return apiRequest('POST', '/api/compliance/tasks', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/upcoming'] });
      setTaskDialogOpen(false);
      setFormData(defaultFormData);
      toast({ title: "Success", description: "Task created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create task", variant: "destructive" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TaskFormData> }) => {
      return apiRequest('PATCH', `/api/compliance/tasks/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/upcoming'] });
      setTaskDialogOpen(false);
      setSelectedTask(null);
      setFormData(defaultFormData);
      toast({ title: "Success", description: "Task updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update task", variant: "destructive" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/compliance/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/upcoming'] });
      toast({ title: "Success", description: "Task deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete task", variant: "destructive" });
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('POST', `/api/compliance/tasks/${id}/send-reminder`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Reminder email sent successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to send reminder", variant: "destructive" });
    },
  });

  const archiveTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('POST', `/api/compliance/tasks/${id}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/upcoming'] });
      toast({ title: "Success", description: "Task archived - it will no longer recur" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to archive task", variant: "destructive" });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('POST', `/api/compliance/tasks/${id}/complete`);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/upcoming'] });
      if (data.nextCycle) {
        toast({ 
          title: "Task Completed", 
          description: `Moved to next cycle. New due date: ${new Date(data.nextDueDate).toLocaleDateString()}` 
        });
      } else {
        toast({ title: "Task Completed", description: "One-time task marked as complete" });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to complete task", variant: "destructive" });
    },
  });

  const duplicateTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('POST', `/api/compliance/tasks/${id}/duplicate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/stats'] });
      toast({ title: "Success", description: "Task duplicated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to duplicate task", variant: "destructive" });
    },
  });

  const handleOpenCreateDialog = () => {
    setSelectedTask(null);
    setFormData(defaultFormData);
    setShowPassword(false);
    setTaskDialogOpen(true);
  };

  const handleOpenEditDialog = (task: ComplianceTask) => {
    setSelectedTask(task);
    setShowPassword(false);
    setFormData({
      taskName: task.task_name,
      description: task.description || "",
      steps: task.steps || [],
      category: task.category,
      subcategory: task.subcategory || "",
      jurisdiction: task.jurisdiction || "",
      regulatoryBody: task.regulatory_body || "",
      recurrence: task.recurrence,
      customRecurrenceDays: task.custom_recurrence_days,
      dueDate: task.due_date ? task.due_date.split('T')[0] : "",
      reminderDays: task.reminder_days || [7, 3, 1],
      assignedToName: task.assigned_to_name || "",
      assignedToEmail: task.assigned_to_email || "",
      status: task.status,
      priority: task.priority,
      portalUrl: task.portal_url || "",
      portalUsername: task.portal_username || "",
      portalPassword: task.portal_password || "",
      portalNotes: task.portal_notes || "",
      estimatedCost: task.estimated_cost || "",
      actualCost: task.actual_cost || "",
      penaltyAmount: task.penalty_amount || "",
      completionNotes: task.completion_notes || "",
      confirmationNumber: task.confirmation_number || "",
      tags: task.tags || [],
    });
    setTaskDialogOpen(true);
  };

  const handleAddStep = () => {
    const newStep: TaskStep = {
      id: crypto.randomUUID(),
      order: formData.steps.length + 1,
      instruction: "",
      attachments: []
    };
    setFormData(prev => ({ ...prev, steps: [...prev.steps, newStep] }));
  };

  const handleRemoveStep = (index: number) => {
    const updatedSteps = formData.steps
      .filter((_, i) => i !== index)
      .map((step, i) => ({ ...step, order: i + 1 }));
    setFormData(prev => ({ ...prev, steps: updatedSteps }));
  };

  const handleUpdateStep = (index: number, instruction: string) => {
    const updatedSteps = [...formData.steps];
    updatedSteps[index] = { ...updatedSteps[index], instruction };
    setFormData(prev => ({ ...prev, steps: updatedSteps }));
  };

  const handleUploadStepAttachment = async (stepId: string, stepIndex: number, file: File) => {
    if (!selectedTask) {
      toast({ title: "Error", description: "Please save the task first before adding screenshots", variant: "destructive" });
      return;
    }

    // Check if this step exists on the server (was saved previously)
    const serverStep = selectedTask.steps?.find(s => s.id === stepId);
    if (!serverStep) {
      toast({ title: "Save Required", description: "Please save the task to persist this step before adding screenshots", variant: "destructive" });
      return;
    }

    setUploadingStepId(stepId);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetch(`/api/compliance/tasks/${selectedTask.id}/steps/${stepId}/attachments`, {
        method: 'POST',
        body: formDataUpload,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Upload failed');
      }

      const result = await response.json();
      
      // Update the local form data with the new attachment
      const updatedSteps = [...formData.steps];
      if (!updatedSteps[stepIndex].attachments) {
        updatedSteps[stepIndex].attachments = [];
      }
      updatedSteps[stepIndex].attachments!.push(result.attachment);
      setFormData(prev => ({ ...prev, steps: updatedSteps }));

      // Update selectedTask to keep server state in sync
      const updatedServerSteps = selectedTask.steps?.map(s => 
        s.id === stepId 
          ? { ...s, attachments: [...(s.attachments || []), result.attachment] }
          : s
      ) || [];
      setSelectedTask({ ...selectedTask, steps: updatedServerSteps });

      // Invalidate cache to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/tasks'] });

      toast({ title: "Success", description: "Screenshot uploaded successfully" });
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to upload screenshot", variant: "destructive" });
    } finally {
      setUploadingStepId(null);
    }
  };

  const handlePasteScreenshot = async (stepId: string, stepIndex: number) => {
    if (!selectedTask) {
      toast({ title: "Error", description: "Please save the task first before adding screenshots", variant: "destructive" });
      return;
    }

    const serverStep = selectedTask.steps?.find(s => s.id === stepId);
    if (!serverStep) {
      toast({ title: "Save Required", description: "Please save the task to persist this step before adding screenshots", variant: "destructive" });
      return;
    }

    try {
      const clipboardItems = await navigator.clipboard.read();
      let imageBlob: Blob | null = null;

      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            imageBlob = await item.getType(type);
            break;
          }
        }
        if (imageBlob) break;
      }

      if (!imageBlob) {
        toast({ title: "No Image Found", description: "No image found in clipboard. Copy a screenshot first (use Print Screen or Snipping Tool).", variant: "destructive" });
        return;
      }

      const file = new File([imageBlob], `screenshot-${Date.now()}.png`, { type: imageBlob.type });
      await handleUploadStepAttachment(stepId, stepIndex, file);
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        toast({ title: "Permission Denied", description: "Please allow clipboard access to paste screenshots.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to paste from clipboard. Try using the upload button instead.", variant: "destructive" });
      }
    }
  };

  const handleDeleteStepAttachment = async (stepId: string, stepIndex: number, attachmentId: string) => {
    if (!selectedTask) return;

    setDeletingAttachmentId(attachmentId);
    try {
      const response = await fetch(`/api/compliance/tasks/${selectedTask.id}/steps/${stepId}/attachments/${attachmentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Delete failed');
      }

      // Update the local form data
      const updatedSteps = [...formData.steps];
      updatedSteps[stepIndex].attachments = updatedSteps[stepIndex].attachments?.filter(a => a.id !== attachmentId) || [];
      setFormData(prev => ({ ...prev, steps: updatedSteps }));

      // Update selectedTask to keep server state in sync
      const updatedServerSteps = selectedTask.steps?.map(s => 
        s.id === stepId 
          ? { ...s, attachments: (s.attachments || []).filter(a => a.id !== attachmentId) }
          : s
      ) || [];
      setSelectedTask({ ...selectedTask, steps: updatedServerSteps });

      // Invalidate cache to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/tasks'] });

      toast({ title: "Success", description: "Screenshot deleted successfully" });
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to delete screenshot", variant: "destructive" });
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  const handleViewTask = (task: ComplianceTask) => {
    setSelectedTask(task);
    setViewShowPassword(false);
    setViewDialogOpen(true);
  };

  const handleSubmit = () => {
    if (selectedTask) {
      updateTaskMutation.mutate({ id: selectedTask.id, data: formData });
    } else {
      createTaskMutation.mutate(formData);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (filterCategory !== "all" && task.category !== filterCategory) return false;
    if (filterStatus !== "all" && task.status !== filterStatus) return false;
    if (filterPriority !== "all" && task.priority !== filterPriority) return false;
    if (searchTerm && !task.task_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = statusOptions.find(s => s.value === status);
    return statusConfig ? statusConfig.color : "bg-gray-100 text-gray-800";
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = priorityOptions.find(p => p.value === priority);
    return priorityConfig ? priorityConfig.color : "bg-gray-100 text-gray-800";
  };

  const getDueDateStatus = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const now = new Date();
    
    if (isPast(date)) {
      return { label: "Overdue", color: "text-red-600 dark:text-red-400" };
    }
    
    if (isWithinInterval(date, { start: now, end: addDays(now, 7) })) {
      return { label: formatDistanceToNow(date, { addSuffix: true }), color: "text-amber-600 dark:text-amber-400" };
    }
    
    return { label: formatDistanceToNow(date, { addSuffix: true }), color: "text-muted-foreground" };
  };

  return (
    <div className="min-h-screen bg-background" data-testid="compliance-admin-dashboard">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation('/admin')}
              data-testid="button-return-hub"
            >
              <Home className="h-4 w-4 mr-2" />
              Return to Hub
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Compliance Management</h1>
              <p className="text-xs text-muted-foreground">Track deadlines, filings, and regulatory requirements</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetchTasks()}
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              size="sm"
              onClick={handleOpenCreateDialog}
              data-testid="button-create-task"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6" data-testid="compliance-tabs">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks" data-testid="tab-tasks">All Tasks</TabsTrigger>
            <TabsTrigger value="calendar" data-testid="tab-calendar">Calendar</TabsTrigger>
            <TabsTrigger value="documentation" data-testid="tab-documentation">
              <BookOpen className="h-4 w-4 mr-2" />
              Docs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card data-testid="card-total-tasks">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-2xl font-bold">{stats?.total_tasks || 0}</div>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-overdue">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-2xl font-bold text-red-600">{stats?.past_due || 0}</div>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-due-this-week">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Due This Week</CardTitle>
                  <Clock className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-2xl font-bold text-amber-600">{stats?.due_this_week || 0}</div>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-completed">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-2xl font-bold text-green-600">{stats?.completed || 0}</div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Upcoming Deadlines
                  </CardTitle>
                  <CardDescription>Tasks due within the next 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {upcomingTasks.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No upcoming deadlines</p>
                    ) : (
                      <div className="space-y-3">
                        {upcomingTasks.map((task) => {
                          const dueStatus = getDueDateStatus(task.due_date);
                          return (
                            <div 
                              key={task.id} 
                              className="flex items-center justify-between p-3 rounded-lg border hover-elevate cursor-pointer"
                              onClick={() => handleViewTask(task)}
                              data-testid={`upcoming-task-${task.id}`}
                            >
                              <div className="space-y-1">
                                <p className="font-medium">{task.task_name}</p>
                                <div className="flex items-center gap-2 text-sm">
                                  <Badge variant="outline" className={getStatusBadge(task.status)}>
                                    {statusOptions.find(s => s.value === task.status)?.label}
                                  </Badge>
                                  <Badge variant="outline" className={getPriorityBadge(task.priority)}>
                                    {priorityOptions.find(p => p.value === task.priority)?.label}
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-sm font-medium ${dueStatus?.color}`}>
                                  {task.due_date && format(new Date(task.due_date), 'MMM d, yyyy')}
                                </p>
                                <p className={`text-xs ${dueStatus?.color}`}>{dueStatus?.label}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-indigo-500" />
                    Tasks by Category
                  </CardTitle>
                  <CardDescription>Distribution of compliance tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categoryOptions.map((category) => {
                      const count = tasks.filter(t => t.category === category.value).length;
                      const percentage = tasks.length > 0 ? (count / tasks.length) * 100 : 0;
                      return (
                        <div key={category.value} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{category.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-indigo-500 rounded-full" 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-8 text-right">{count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>All Compliance Tasks</CardTitle>
                    <CardDescription>Manage all your compliance deadlines and requirements</CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search tasks..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-48"
                        data-testid="input-search-tasks"
                      />
                    </div>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="w-40" data-testid="filter-category">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categoryOptions.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-36" data-testid="filter-status">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {statusOptions.map((stat) => (
                          <SelectItem key={stat.value} value={stat.value}>{stat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filterPriority} onValueChange={setFilterPriority}>
                      <SelectTrigger className="w-32" data-testid="filter-priority">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {priorityOptions.map((pri) => (
                          <SelectItem key={pri.value} value={pri.value}>{pri.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <Scale className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No tasks found</p>
                    <p className="text-muted-foreground mb-4">
                      {tasks.length === 0 
                        ? "Create your first compliance task to get started" 
                        : "No tasks match your current filters"}
                    </p>
                    <Button onClick={handleOpenCreateDialog} data-testid="button-create-first-task">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {filteredTasks.map((task) => {
                        const dueStatus = getDueDateStatus(task.due_date);
                        return (
                          <div 
                            key={task.id} 
                            className="flex items-center justify-between p-4 rounded-lg border hover-elevate"
                            data-testid={`task-row-${task.id}`}
                          >
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{task.task_name}</p>
                                {task.portal_url && (
                                  <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className={getStatusBadge(task.status)}>
                                  {statusOptions.find(s => s.value === task.status)?.label}
                                </Badge>
                                <Badge variant="outline" className={getPriorityBadge(task.priority)}>
                                  {priorityOptions.find(p => p.value === task.priority)?.label}
                                </Badge>
                                <Badge variant="outline">
                                  {categoryOptions.find(c => c.value === task.category)?.label}
                                </Badge>
                                {task.assigned_to_name && (
                                  <span className="text-xs text-muted-foreground">
                                    Assigned to: {task.assigned_to_name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                              {task.due_date && (
                                <div className="text-right hidden md:block">
                                  <p className={`text-sm font-medium ${dueStatus?.color}`}>
                                    {format(new Date(task.due_date), 'MMM d, yyyy')}
                                  </p>
                                  <p className={`text-xs ${dueStatus?.color}`}>{dueStatus?.label}</p>
                                </div>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" data-testid={`task-menu-${task.id}`}>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewTask(task)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleOpenEditDialog(task)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  {task.assigned_to_email && (
                                    <DropdownMenuItem 
                                      onClick={() => sendReminderMutation.mutate(task.id)}
                                      disabled={sendReminderMutation.isPending}
                                    >
                                      <Mail className="h-4 w-4 mr-2" />
                                      Send Reminder
                                    </DropdownMenuItem>
                                  )}
                                  {task.portal_url && (
                                    <DropdownMenuItem onClick={() => window.open(task.portal_url!, '_blank')}>
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      Open Portal
                                    </DropdownMenuItem>
                                  )}
                                  {task.status !== 'completed' && (
                                    <DropdownMenuItem 
                                      onClick={() => completeTaskMutation.mutate(task.id)}
                                      disabled={completeTaskMutation.isPending}
                                      data-testid={`button-complete-${task.id}`}
                                    >
                                      <CheckSquare className="h-4 w-4 mr-2" />
                                      {task.recurrence === 'one_time' ? 'Complete' : 'Complete & Next Cycle'}
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem 
                                    onClick={() => duplicateTaskMutation.mutate(task.id)}
                                    disabled={duplicateTaskMutation.isPending}
                                    data-testid={`button-duplicate-${task.id}`}
                                  >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Duplicate
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => archiveTaskMutation.mutate(task.id)}
                                    disabled={archiveTaskMutation.isPending}
                                    className="text-amber-600"
                                    data-testid={`button-archive-${task.id}`}
                                  >
                                    <Archive className="h-4 w-4 mr-2" />
                                    Archive
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => deleteTaskMutation.mutate(task.id)}
                                    className="text-red-600"
                                    data-testid={`button-delete-${task.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Compliance Calendar
                </CardTitle>
                <CardDescription>Visual overview of upcoming deadlines</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {[
                    { label: "Overdue", filter: (t: ComplianceTask) => t.due_date && isPast(new Date(t.due_date)) && t.status !== 'completed', color: "border-red-500 bg-red-50 dark:bg-red-950/20" },
                    { label: "Due This Week", filter: (t: ComplianceTask) => t.due_date && isWithinInterval(new Date(t.due_date), { start: new Date(), end: addDays(new Date(), 7) }) && t.status !== 'completed', color: "border-amber-500 bg-amber-50 dark:bg-amber-950/20" },
                    { label: "Due This Month", filter: (t: ComplianceTask) => t.due_date && isWithinInterval(new Date(t.due_date), { start: addDays(new Date(), 7), end: addDays(new Date(), 30) }) && t.status !== 'completed', color: "border-blue-500 bg-blue-50 dark:bg-blue-950/20" },
                  ].map((section) => {
                    const sectionTasks = tasks.filter(section.filter);
                    return (
                      <div key={section.label} className={`p-4 rounded-lg border-l-4 ${section.color}`}>
                        <h3 className="font-semibold mb-3">{section.label} ({sectionTasks.length})</h3>
                        {sectionTasks.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No tasks</p>
                        ) : (
                          <div className="space-y-2">
                            {sectionTasks.slice(0, 5).map((task) => (
                              <div 
                                key={task.id} 
                                className="flex items-center justify-between p-2 rounded bg-background hover-elevate cursor-pointer"
                                onClick={() => handleViewTask(task)}
                              >
                                <span className="font-medium text-sm">{task.task_name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {task.due_date && format(new Date(task.due_date), 'MMM d')}
                                </span>
                              </div>
                            ))}
                            {sectionTasks.length > 5 && (
                              <p className="text-xs text-muted-foreground text-center pt-2">
                                +{sectionTasks.length - 5} more tasks
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documentation">
            {getModuleDocs("compliance") && (
              <ModuleDocumentation documentation={getModuleDocs("compliance")!} />
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
            <DialogDescription>
              {selectedTask ? 'Update the compliance task details' : 'Add a new compliance task to track'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="taskName">Task Name *</Label>
              <Input
                id="taskName"
                value={formData.taskName}
                onChange={(e) => setFormData(prev => ({ ...prev, taskName: e.target.value }))}
                placeholder="e.g., Quarterly Sales Tax Filing"
                data-testid="input-task-name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detailed description of the compliance task..."
                rows={3}
                data-testid="input-description"
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Step-by-Step Directions</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={handleAddStep}
                  data-testid="button-add-step"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Step
                </Button>
              </div>
              {formData.steps.length > 0 ? (
                <div className="space-y-4 mt-2">
                  {formData.steps.map((step, index) => (
                    <div key={step.id || index} className="border rounded-lg p-3 space-y-3">
                      <div className="flex items-start gap-2">
                        <div className="flex items-center justify-center w-6 h-9 text-sm font-medium text-muted-foreground">
                          {step.order}.
                        </div>
                        <Input
                          value={step.instruction}
                          onChange={(e) => handleUpdateStep(index, e.target.value)}
                          placeholder={`Step ${step.order} instruction...`}
                          className="flex-1"
                          data-testid={`input-step-${index}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveStep(index)}
                          className="text-destructive hover:text-destructive"
                          data-testid={`button-remove-step-${index}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Step Screenshots Section */}
                      <div className="ml-8 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">Screenshots</span>
                          {(() => {
                            const stepExistsOnServer = selectedTask?.steps?.some(s => s.id === step.id);
                            if (!selectedTask) {
                              return <span className="text-xs text-amber-600">Save task first to add screenshots</span>;
                            }
                            if (!stepExistsOnServer) {
                              return <span className="text-xs text-amber-600">Save changes to enable screenshots for this step</span>;
                            }
                            return (
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7"
                                  disabled={uploadingStepId === step.id}
                                  onClick={() => step.id && handlePasteScreenshot(step.id, index)}
                                  data-testid={`button-paste-step-${index}`}
                                >
                                  {uploadingStepId === step.id ? (
                                    <>
                                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                      Uploading...
                                    </>
                                  ) : (
                                    <>
                                      <Clipboard className="w-3 h-3 mr-1" />
                                      Paste Screenshot
                                    </>
                                  )}
                                </Button>
                                <label className="cursor-pointer">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file && step.id) {
                                        handleUploadStepAttachment(step.id, index, file);
                                      }
                                      e.target.value = '';
                                    }}
                                    disabled={uploadingStepId === step.id}
                                    data-testid={`input-upload-step-${index}`}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7"
                                    disabled={uploadingStepId === step.id}
                                    asChild
                                  >
                                    <span>
                                      <Upload className="w-3 h-3 mr-1" />
                                      Upload
                                    </span>
                                  </Button>
                                </label>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Display existing attachments */}
                        {step.attachments && step.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {step.attachments.map((attachment) => (
                              <div 
                                key={attachment.id} 
                                className="relative group border rounded-md overflow-hidden"
                              >
                                <img
                                  src={`/api/compliance/tasks/${selectedTask?.id}/steps/${step.id}/attachments/${attachment.id}`}
                                  alt={attachment.fileName}
                                  className="w-20 h-20 object-cover"
                                  data-testid={`img-step-attachment-${attachment.id}`}
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => step.id && handleDeleteStepAttachment(step.id, index, attachment.id)}
                                    disabled={deletingAttachmentId === attachment.id}
                                    data-testid={`button-delete-attachment-${attachment.id}`}
                                  >
                                    {deletingAttachmentId === attachment.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3 h-3" />
                                    )}
                                  </Button>
                                </div>
                                <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs px-1 py-0.5 truncate">
                                  {attachment.fileName}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  No steps added. Click "Add Step" to add step-by-step directions.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category *</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger data-testid="select-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Priority *</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}
                >
                  <SelectTrigger data-testid="select-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((pri) => (
                      <SelectItem key={pri.value} value={pri.value}>{pri.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}
                >
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((stat) => (
                      <SelectItem key={stat.value} value={stat.value}>{stat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Recurrence</Label>
                <Select 
                  value={formData.recurrence} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, recurrence: v }))}
                >
                  <SelectTrigger data-testid="select-recurrence">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {recurrenceOptions.map((rec) => (
                      <SelectItem key={rec.value} value={rec.value}>{rec.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  data-testid="input-due-date"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reminderDays">Email Reminder Days (before due date)</Label>
                <Input
                  id="reminderDays"
                  value={formData.reminderDays.join(', ')}
                  onChange={(e) => {
                    const days = e.target.value
                      .split(',')
                      .map(d => parseInt(d.trim()))
                      .filter(d => !isNaN(d) && d > 0);
                    setFormData(prev => ({ ...prev, reminderDays: days }));
                  }}
                  placeholder="e.g., 7, 3, 1"
                  data-testid="input-reminder-days"
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated days before due date to send email reminders
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="jurisdiction">Jurisdiction</Label>
                <Input
                  id="jurisdiction"
                  value={formData.jurisdiction}
                  onChange={(e) => setFormData(prev => ({ ...prev, jurisdiction: e.target.value }))}
                  placeholder="e.g., Massachusetts, Federal"
                  data-testid="input-jurisdiction"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="assignedToName">Assigned To (Name)</Label>
                <Input
                  id="assignedToName"
                  value={formData.assignedToName}
                  onChange={(e) => setFormData(prev => ({ ...prev, assignedToName: e.target.value }))}
                  placeholder="e.g., Mike Support"
                  data-testid="input-assigned-name"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="assignedToEmail">Assigned To (Email)</Label>
                <Input
                  id="assignedToEmail"
                  type="email"
                  value={formData.assignedToEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, assignedToEmail: e.target.value }))}
                  placeholder="e.g., support@nasobawinery.com"
                  data-testid="input-assigned-email"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="regulatoryBody">Regulatory Body</Label>
              <Input
                id="regulatoryBody"
                value={formData.regulatoryBody}
                onChange={(e) => setFormData(prev => ({ ...prev, regulatoryBody: e.target.value }))}
                placeholder="e.g., ABCC, IRS, DOR"
                data-testid="input-regulatory-body"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="portalUrl">Portal URL</Label>
              <div className="flex gap-2">
                <Input
                  id="portalUrl"
                  type="url"
                  value={formData.portalUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, portalUrl: e.target.value }))}
                  placeholder="https://..."
                  className="flex-1"
                  data-testid="input-portal-url"
                />
                {formData.portalUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.open(formData.portalUrl, '_blank')}
                    data-testid="button-launch-portal"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Launch
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="portalUsername">Portal Username</Label>
                <Input
                  id="portalUsername"
                  value={formData.portalUsername}
                  onChange={(e) => setFormData(prev => ({ ...prev, portalUsername: e.target.value }))}
                  placeholder="Username for portal login"
                  data-testid="input-portal-username"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="portalPassword">Portal Password</Label>
                <div className="flex gap-2">
                  <Input
                    id="portalPassword"
                    type={showPassword ? "text" : "password"}
                    value={formData.portalPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, portalPassword: e.target.value }))}
                    placeholder="Password for portal login"
                    className="flex-1"
                    data-testid="input-portal-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {selectedTask && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="completionNotes">Completion Notes</Label>
                  <Textarea
                    id="completionNotes"
                    value={formData.completionNotes}
                    onChange={(e) => setFormData(prev => ({ ...prev, completionNotes: e.target.value }))}
                    placeholder="Notes about task completion..."
                    rows={2}
                    data-testid="input-completion-notes"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="confirmationNumber">Confirmation Number</Label>
                  <Input
                    id="confirmationNumber"
                    value={formData.confirmationNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmationNumber: e.target.value }))}
                    placeholder="e.g., 123456789"
                    data-testid="input-confirmation-number"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.taskName || createTaskMutation.isPending || updateTaskMutation.isPending}
              data-testid="button-save-task"
            >
              {createTaskMutation.isPending || updateTaskMutation.isPending ? 'Saving...' : selectedTask ? 'Update Task' : 'Create Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-indigo-500" />
              {selectedTask?.task_name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-6 py-4">
              <div className="flex flex-wrap gap-2">
                <Badge className={getStatusBadge(selectedTask.status)}>
                  {statusOptions.find(s => s.value === selectedTask.status)?.label}
                </Badge>
                <Badge className={getPriorityBadge(selectedTask.priority)}>
                  {priorityOptions.find(p => p.value === selectedTask.priority)?.label}
                </Badge>
                <Badge variant="outline">
                  {categoryOptions.find(c => c.value === selectedTask.category)?.label}
                </Badge>
                <Badge variant="outline">
                  {recurrenceOptions.find(r => r.value === selectedTask.recurrence)?.label}
                </Badge>
              </div>

              {selectedTask.description && (
                <div>
                  <h4 className="font-semibold mb-1">Description</h4>
                  <p className="text-muted-foreground">{selectedTask.description}</p>
                </div>
              )}

              {selectedTask.steps && selectedTask.steps.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Step-by-Step Directions</h4>
                  <div className="space-y-4">
                    {selectedTask.steps
                      .sort((a, b) => a.order - b.order)
                      .map((step, index) => (
                        <div key={step.id || index} className="border rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <span className="font-medium text-muted-foreground">{step.order}.</span>
                            <span className="text-muted-foreground flex-1">{step.instruction}</span>
                          </div>
                          {step.attachments && step.attachments.length > 0 && (
                            <div className="mt-2 ml-6 flex flex-wrap gap-2">
                              {step.attachments.map((attachment) => (
                                <a
                                  key={attachment.id}
                                  href={`/api/compliance/tasks/${selectedTask.id}/steps/${step.id}/attachments/${attachment.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="relative group border rounded-md overflow-hidden"
                                >
                                  <img
                                    src={`/api/compliance/tasks/${selectedTask.id}/steps/${step.id}/attachments/${attachment.id}`}
                                    alt={attachment.fileName}
                                    className="w-24 h-24 object-cover"
                                    data-testid={`view-img-step-attachment-${attachment.id}`}
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                    <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                  <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs px-1 py-0.5 truncate">
                                    {attachment.fileName}
                                  </span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedTask.due_date && (
                  <div>
                    <h4 className="font-semibold mb-1 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Due Date
                    </h4>
                    <p className={getDueDateStatus(selectedTask.due_date)?.color}>
                      {format(new Date(selectedTask.due_date), 'MMMM d, yyyy')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getDueDateStatus(selectedTask.due_date)?.label}
                    </p>
                  </div>
                )}

                {selectedTask.assigned_to_name && (
                  <div>
                    <h4 className="font-semibold mb-1">Assigned To</h4>
                    <p>{selectedTask.assigned_to_name}</p>
                    <p className="text-xs text-muted-foreground">{selectedTask.assigned_to_email}</p>
                  </div>
                )}

                {selectedTask.jurisdiction && (
                  <div>
                    <h4 className="font-semibold mb-1">Jurisdiction</h4>
                    <p>{selectedTask.jurisdiction}</p>
                  </div>
                )}

                {selectedTask.regulatory_body && (
                  <div>
                    <h4 className="font-semibold mb-1">Regulatory Body</h4>
                    <p>{selectedTask.regulatory_body}</p>
                  </div>
                )}
              </div>

              {selectedTask.portal_url && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Portal Access
                  </h4>
                  <div className="space-y-2 bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <a 
                        href={selectedTask.portal_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline text-sm truncate flex-1 mr-2"
                      >
                        {selectedTask.portal_url}
                      </a>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => window.open(selectedTask.portal_url!, '_blank')}
                        data-testid="button-view-launch-portal"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Launch
                      </Button>
                    </div>
                    {selectedTask.portal_username && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Username:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{selectedTask.portal_username}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedTask.portal_username!);
                              toast({ title: "Copied", description: "Username copied to clipboard" });
                            }}
                            data-testid="button-copy-username"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                    {selectedTask.portal_password && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Password:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">
                            {viewShowPassword ? selectedTask.portal_password : '••••••••'}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setViewShowPassword(!viewShowPassword)}
                            data-testid="button-view-toggle-password"
                          >
                            {viewShowPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedTask.portal_password!);
                              toast({ title: "Copied", description: "Password copied to clipboard" });
                            }}
                            data-testid="button-copy-password"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                    {selectedTask.portal_notes && (
                      <div className="text-sm pt-2 border-t">
                        <span className="text-muted-foreground">Notes: </span>
                        <span>{selectedTask.portal_notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedTask.completion_notes && (
                <div>
                  <h4 className="font-semibold mb-1">Completion Notes</h4>
                  <p className="text-muted-foreground">{selectedTask.completion_notes}</p>
                </div>
              )}

              {selectedTask.confirmation_number && (
                <div>
                  <h4 className="font-semibold mb-1">Confirmation Number</h4>
                  <p className="font-mono bg-muted px-2 py-1 rounded inline-block">
                    {selectedTask.confirmation_number}
                  </p>
                </div>
              )}

              <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
                <p>Created: {format(new Date(selectedTask.created_at), 'MMMM d, yyyy h:mm a')}</p>
                {selectedTask.completed_at && (
                  <p>Completed: {format(new Date(selectedTask.completed_at), 'MMMM d, yyyy h:mm a')}</p>
                )}
                {selectedTask.last_reminder_sent && (
                  <p>Last Reminder: {format(new Date(selectedTask.last_reminder_sent), 'MMMM d, yyyy h:mm a')}</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
            {selectedTask?.assigned_to_email && (
              <Button 
                variant="outline"
                onClick={() => {
                  sendReminderMutation.mutate(selectedTask.id);
                }}
                disabled={sendReminderMutation.isPending}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Reminder
              </Button>
            )}
            <Button onClick={() => {
              setViewDialogOpen(false);
              if (selectedTask) handleOpenEditDialog(selectedTask);
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
