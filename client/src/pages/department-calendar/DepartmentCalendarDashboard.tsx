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
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Mail,
  RefreshCw,
  Bell,
  Filter,
  Search,
  MoreVertical,
  Archive,
  Copy,
  Building2,
  Layers,
  Pencil,
  User,
  Check,
  X
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, formatDistanceToNow, isPast, addDays, isWithinInterval } from "date-fns";

interface Department {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  task_count: string;
}

interface DepartmentTask {
  id: number;
  department_id: number;
  department_name: string;
  department_color: string | null;
  task_name: string;
  description: string | null;
  recurrence: string;
  due_date: string | null;
  reminder_days: number[] | null;
  assigned_to_name: string | null;
  assigned_to_email: string | null;
  assignees: Array<{name: string; email: string}> | null;
  manager_name: string | null;
  manager_email: string | null;
  managers: Array<{name: string; email: string}> | null;
  status: string;
  priority: string;
  completion_notes: string | null;
  tags: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  last_reminder_sent: string | null;
}

interface DepartmentStats {
  total_tasks: string;
  pending: string;
  in_progress: string;
  completed: string;
  overdue: string;
  past_due: string;
  due_this_week: string;
  due_this_month: string;
}

interface PersonEntry {
  name: string;
  email: string;
}

interface TaskFormData {
  departmentId: number | null;
  taskName: string;
  description: string;
  recurrence: string;
  dueDate: string;
  reminderDays: number[];
  assignees: PersonEntry[];
  managers: PersonEntry[];
  priority: string;
  tags: string[];
}

interface DepartmentFormData {
  name: string;
  description: string;
  color: string;
}

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
  { value: "on_hold", label: "On Hold", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
];

const recurrenceOptions = [
  { value: "one_time", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "bi_weekly", label: "Bi-Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "bi_monthly", label: "Bi-Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
];

const colorOptions = [
  { value: "#3b82f6", label: "Blue" },
  { value: "#10b981", label: "Green" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#ef4444", label: "Red" },
  { value: "#ec4899", label: "Pink" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#84cc16", label: "Lime" },
];

const emptyTaskForm: TaskFormData = {
  departmentId: null,
  taskName: "",
  description: "",
  recurrence: "one_time",
  dueDate: "",
  reminderDays: [14, 7, 1],
  assignees: [{ name: "", email: "" }],
  managers: [{ name: "", email: "" }],
  priority: "medium",
  tags: [],
};

const reminderDayOptions = [
  { value: 30, label: "30 days before" },
  { value: 14, label: "14 days before" },
  { value: 7, label: "7 days before" },
  { value: 3, label: "3 days before" },
  { value: 1, label: "1 day before" },
];

const emptyDepartmentForm: DepartmentFormData = {
  name: "",
  description: "",
  color: "#3b82f6",
};

export default function DepartmentCalendarDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("tasks");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showDepartmentDialog, setShowDepartmentDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  
  const [selectedTask, setSelectedTask] = useState<DepartmentTask | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormData>(emptyTaskForm);
  const [departmentForm, setDepartmentForm] = useState<DepartmentFormData>(emptyDepartmentForm);
  const [completionNotes, setCompletionNotes] = useState("");

  const { data: stats, isLoading: statsLoading } = useQuery<DepartmentStats>({
    queryKey: ["/api/department-calendar/stats"],
  });

  const { data: departments = [], isLoading: departmentsLoading } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<DepartmentTask[]>({
    queryKey: ["/api/department-calendar/tasks"],
  });

  const createDepartmentMutation = useMutation({
    mutationFn: async (data: DepartmentFormData) => {
      const res = await apiRequest("POST", "/api/departments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({ title: "Department created successfully" });
      setShowDepartmentDialog(false);
      setDepartmentForm(emptyDepartmentForm);
    },
    onError: (error: any) => {
      toast({ title: "Failed to create department", description: error.message, variant: "destructive" });
    },
  });

  const updateDepartmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<DepartmentFormData> }) => {
      const res = await apiRequest("PATCH", `/api/departments/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({ title: "Department updated successfully" });
      setShowDepartmentDialog(false);
      setSelectedDepartment(null);
      setDepartmentForm(emptyDepartmentForm);
    },
    onError: (error: any) => {
      toast({ title: "Failed to update department", description: error.message, variant: "destructive" });
    },
  });

  const deleteDepartmentMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/departments/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/department-calendar/tasks"] });
      toast({ title: "Department deleted successfully" });
      setShowDeleteDialog(false);
      setSelectedDepartment(null);
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete department", description: error.message, variant: "destructive" });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const res = await apiRequest("POST", "/api/department-calendar/tasks", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/department-calendar/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/department-calendar/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({ title: "Task created successfully" });
      setShowTaskDialog(false);
      setTaskForm(emptyTaskForm);
    },
    onError: (error: any) => {
      toast({ title: "Failed to create task", description: error.message, variant: "destructive" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<TaskFormData> }) => {
      const res = await apiRequest("PATCH", `/api/department-calendar/tasks/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/department-calendar/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/department-calendar/stats"] });
      toast({ title: "Task updated successfully" });
      setShowTaskDialog(false);
      setSelectedTask(null);
      setTaskForm(emptyTaskForm);
    },
    onError: (error: any) => {
      toast({ title: "Failed to update task", description: error.message, variant: "destructive" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/department-calendar/tasks/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/department-calendar/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/department-calendar/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({ title: "Task deleted successfully" });
      setShowDeleteDialog(false);
      setSelectedTask(null);
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete task", description: error.message, variant: "destructive" });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: async ({ id, completionNotes }: { id: number; completionNotes: string }) => {
      const res = await apiRequest("POST", `/api/department-calendar/tasks/${id}/complete`, { completionNotes });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/department-calendar/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/department-calendar/stats"] });
      if (data.nextCycle) {
        toast({ 
          title: "Task completed", 
          description: `Recurring task moved to next cycle. Due: ${format(new Date(data.nextDueDate), 'MMM d, yyyy')}`
        });
      } else {
        toast({ title: "Task completed successfully" });
      }
      setShowCompleteDialog(false);
      setSelectedTask(null);
      setCompletionNotes("");
    },
    onError: (error: any) => {
      toast({ title: "Failed to complete task", description: error.message, variant: "destructive" });
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/department-calendar/tasks/${id}/send-reminder`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/department-calendar/tasks"] });
      toast({ title: "Reminder sent successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to send reminder", description: error.message, variant: "destructive" });
    },
  });

  const duplicateTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/department-calendar/tasks/${id}/duplicate`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/department-calendar/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/department-calendar/stats"] });
      toast({ title: "Task duplicated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to duplicate task", description: error.message, variant: "destructive" });
    },
  });

  const archiveTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/department-calendar/tasks/${id}/archive`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/department-calendar/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/department-calendar/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({ title: "Task archived successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to archive task", description: error.message, variant: "destructive" });
    },
  });

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.task_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.department_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === "all" || task.department_id.toString() === filterDepartment;
    const matchesStatus = filterStatus === "all" || task.status === filterStatus;
    const matchesPriority = filterPriority === "all" || task.priority === filterPriority;
    return matchesSearch && matchesDepartment && matchesStatus && matchesPriority;
  });

  const handleEditTask = (task: DepartmentTask) => {
    setSelectedTask(task);
    // Build assignees array from new format or legacy fields
    let assignees: PersonEntry[] = [];
    if (task.assignees && task.assignees.length > 0) {
      assignees = task.assignees;
    } else if (task.assigned_to_name || task.assigned_to_email) {
      assignees = [{ name: task.assigned_to_name || "", email: task.assigned_to_email || "" }];
    } else {
      assignees = [{ name: "", email: "" }];
    }
    
    // Build managers array from new format or legacy fields
    let managers: PersonEntry[] = [];
    if (task.managers && task.managers.length > 0) {
      managers = task.managers;
    } else if (task.manager_name || task.manager_email) {
      managers = [{ name: task.manager_name || "", email: task.manager_email || "" }];
    } else {
      managers = [{ name: "", email: "" }];
    }
    
    setTaskForm({
      departmentId: task.department_id,
      taskName: task.task_name,
      description: task.description || "",
      recurrence: task.recurrence,
      dueDate: task.due_date ? task.due_date.split("T")[0] : "",
      reminderDays: task.reminder_days || [14, 7, 1],
      assignees,
      managers,
      priority: task.priority,
      tags: task.tags || [],
    });
    setShowTaskDialog(true);
  };

  const handleEditDepartment = (dept: Department) => {
    setSelectedDepartment(dept);
    setDepartmentForm({
      name: dept.name,
      description: dept.description || "",
      color: dept.color || "#3b82f6",
    });
    setShowDepartmentDialog(true);
  };

  const handleSubmitTask = () => {
    if (selectedTask) {
      updateTaskMutation.mutate({ id: selectedTask.id, data: taskForm });
    } else {
      createTaskMutation.mutate(taskForm);
    }
  };

  const handleSubmitDepartment = () => {
    if (selectedDepartment) {
      updateDepartmentMutation.mutate({ id: selectedDepartment.id, data: departmentForm });
    } else {
      createDepartmentMutation.mutate(departmentForm);
    }
  };

  const getDueStatus = (dueDate: string | null) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const now = new Date();
    if (isPast(due)) return "overdue";
    if (isWithinInterval(due, { start: now, end: addDays(now, 3) })) return "soon";
    if (isWithinInterval(due, { start: now, end: addDays(now, 7) })) return "upcoming";
    return "future";
  };

  const getPriorityBadge = (priority: string) => {
    const option = priorityOptions.find(p => p.value === priority);
    return <Badge className={option?.color || ""}>{option?.label || priority}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const option = statusOptions.find(s => s.value === status);
    return <Badge className={option?.color || ""}>{option?.label || status}</Badge>;
  };

  const getRecurrenceLabel = (recurrence: string) => {
    const option = recurrenceOptions.find(r => r.value === recurrence);
    return option?.label || recurrence;
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setLocation("/")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Department Calendar</h1>
          <p className="text-muted-foreground">Manage department tasks and schedules</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Tasks</CardDescription>
            <CardTitle className="text-2xl" data-testid="text-total-tasks">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.total_tasks || "0"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-2xl text-amber-600" data-testid="text-pending-tasks">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.pending || "0"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Due This Week</CardDescription>
            <CardTitle className="text-2xl text-blue-600" data-testid="text-due-week">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.due_this_week || "0"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overdue</CardDescription>
            <CardTitle className="text-2xl text-red-600" data-testid="text-overdue-tasks">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.past_due || "0"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="tasks" data-testid="tab-tasks">
              <Calendar className="h-4 w-4 mr-2" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="delinquent" data-testid="tab-delinquent">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Delinquent
            </TabsTrigger>
            <TabsTrigger value="departments" data-testid="tab-departments">
              <Layers className="h-4 w-4 mr-2" />
              Departments
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1" />
          
          {activeTab === "tasks" && (
            <Button onClick={() => { setSelectedTask(null); setTaskForm(emptyTaskForm); setShowTaskDialog(true); }} data-testid="button-add-task">
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          )}
          {activeTab === "departments" && (
            <Button onClick={() => { setSelectedDepartment(null); setDepartmentForm(emptyDepartmentForm); setShowDepartmentDialog(true); }} data-testid="button-add-department">
              <Plus className="h-4 w-4 mr-2" />
              Add Department
            </Button>
          )}
        </div>

        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-tasks"
                  />
                </div>
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger className="w-[180px]" data-testid="select-filter-department">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px]" data-testid="select-filter-status">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {statusOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="w-[140px]" data-testid="select-filter-priority">
                    <SelectValue placeholder="All Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    {priorityOptions.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No tasks found</h3>
                  <p className="text-muted-foreground mb-4">Create your first department task to get started</p>
                  <Button onClick={() => { setSelectedTask(null); setTaskForm(emptyTaskForm); setShowTaskDialog(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3">
                    {filteredTasks.map((task) => (
                      <Card key={task.id} className="hover-elevate" data-testid={`card-task-${task.id}`}>
                        <CardContent className="py-4">
                          <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                <Badge 
                                  variant="outline" 
                                  style={{ borderColor: task.department_color || undefined }}
                                  data-testid={`badge-department-${task.id}`}
                                >
                                  {task.department_name}
                                </Badge>
                                {getStatusBadge(task.status)}
                                {getPriorityBadge(task.priority)}
                                {task.recurrence !== "one_time" && (
                                  <Badge variant="secondary">
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    {getRecurrenceLabel(task.recurrence)}
                                  </Badge>
                                )}
                              </div>
                              <h3 className="font-medium text-base truncate" data-testid={`text-task-name-${task.id}`}>
                                {task.task_name}
                              </h3>
                              {task.description && (
                                <p className="text-sm text-muted-foreground truncate mt-1">{task.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                                {task.due_date && (
                                  <span className={`flex items-center gap-1 ${getDueStatus(task.due_date) === "overdue" ? "text-red-600" : getDueStatus(task.due_date) === "soon" ? "text-amber-600" : ""}`}>
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(task.due_date), "MMM d, yyyy")}
                                    {getDueStatus(task.due_date) === "overdue" && " (Overdue)"}
                                  </span>
                                )}
                                {task.assigned_to_name && (
                                  <span className="flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {task.assigned_to_name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {task.status !== "completed" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => { setSelectedTask(task); setShowCompleteDialog(true); }}
                                  data-testid={`button-complete-${task.id}`}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Complete
                                </Button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" data-testid={`button-task-menu-${task.id}`}>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditTask(task)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => duplicateTaskMutation.mutate(task.id)}>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Duplicate
                                  </DropdownMenuItem>
                                  {task.assigned_to_email && (
                                    <DropdownMenuItem onClick={() => sendReminderMutation.mutate(task.id)}>
                                      <Mail className="h-4 w-4 mr-2" />
                                      Send Reminder
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => archiveTaskMutation.mutate(task.id)}>
                                    <Archive className="h-4 w-4 mr-2" />
                                    Archive
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onClick={() => { setSelectedTask(task); setShowDeleteDialog(true); }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delinquent">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Delinquent Tasks
              </CardTitle>
              <CardDescription>
                Tasks that are past their due date and not yet completed. Both the assigned person and their manager will be notified.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : (
                (() => {
                  const delinquentTasks = tasks.filter(task => {
                    if (!task.due_date || task.status === 'completed') return false;
                    return isPast(new Date(task.due_date));
                  });
                  
                  if (delinquentTasks.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Delinquent Tasks</h3>
                        <p className="text-muted-foreground">All tasks are on track. Great job!</p>
                      </div>
                    );
                  }
                  
                  return (
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-4">
                        {delinquentTasks.map((task) => {
                          const daysPastDue = task.due_date 
                            ? Math.floor((new Date().getTime() - new Date(task.due_date).getTime()) / (1000 * 60 * 60 * 24))
                            : 0;
                          
                          return (
                            <Card key={task.id} className="border-l-4 border-l-red-500" data-testid={`card-delinquent-task-${task.id}`}>
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge 
                                        variant="outline" 
                                        style={{ 
                                          backgroundColor: task.department_color ? `${task.department_color}20` : undefined,
                                          borderColor: task.department_color || undefined 
                                        }}
                                      >
                                        {task.department_name}
                                      </Badge>
                                      <Badge variant="destructive">
                                        {daysPastDue} day{daysPastDue !== 1 ? 's' : ''} overdue
                                      </Badge>
                                      <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}>
                                        {task.priority}
                                      </Badge>
                                    </div>
                                    <h4 className="font-medium text-base mb-1" data-testid={`text-delinquent-task-name-${task.id}`}>
                                      {task.task_name}
                                    </h4>
                                    {task.description && (
                                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{task.description}</p>
                                    )}
                                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                      {task.due_date && (
                                        <span className="flex items-center gap-1 text-red-600">
                                          <Clock className="h-3 w-3" />
                                          Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
                                        </span>
                                      )}
                                      {task.assigned_to_name && (
                                        <span className="flex items-center gap-1">
                                          <User className="h-3 w-3" />
                                          Assigned: {task.assigned_to_name}
                                        </span>
                                      )}
                                      {task.manager_name && (
                                        <span className="flex items-center gap-1">
                                          <User className="h-3 w-3" />
                                          Manager: {task.manager_name}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditTask(task)}
                                      data-testid={`button-edit-delinquent-${task.id}`}
                                    >
                                      <Pencil className="h-4 w-4 mr-1" />
                                      Edit
                                    </Button>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() =>
                                        completeTaskMutation.mutate({
                                          id: task.id,
                                          completionNotes: "",
                                        })
                                      }
                                      data-testid={`button-complete-delinquent-${task.id}`}
                                    >
                                      <Check className="h-4 w-4 mr-1" />
                                      Complete
                                    </Button>
                                    {(task.assigned_to_email || task.manager_email) && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => sendReminderMutation.mutate(task.id)}
                                        data-testid={`button-notify-delinquent-${task.id}`}
                                      >
                                        <Mail className="h-4 w-4 mr-1" />
                                        Notify
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  );
                })()
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments">
          <Card>
            <CardContent className="pt-6">
              {departmentsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : departments.length === 0 ? (
                <div className="text-center py-12">
                  <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No departments found</h3>
                  <p className="text-muted-foreground mb-4">Create departments to organize your tasks</p>
                  <Button onClick={() => { setSelectedDepartment(null); setDepartmentForm(emptyDepartmentForm); setShowDepartmentDialog(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Department
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {departments.map((dept) => (
                    <Card key={dept.id} className="hover-elevate" data-testid={`card-department-${dept.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: dept.color || "#3b82f6" }}
                            />
                            <div>
                              <CardTitle className="text-base" data-testid={`text-department-name-${dept.id}`}>
                                {dept.name}
                              </CardTitle>
                              {dept.description && (
                                <CardDescription className="text-sm mt-1">{dept.description}</CardDescription>
                              )}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-department-menu-${dept.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditDepartment(dept)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => { setSelectedDepartment(dept); setShowDeleteDialog(true); }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Badge variant="secondary" data-testid={`badge-task-count-${dept.id}`}>
                          {dept.task_count} tasks
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTask ? "Edit Task" : "Add New Task"}</DialogTitle>
            <DialogDescription>
              {selectedTask ? "Update the task details below" : "Fill in the details for your new task"}
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details" data-testid="tab-task-details">Details</TabsTrigger>
              <TabsTrigger value="assignment" data-testid="tab-task-assignment">Assignment</TabsTrigger>
              <TabsTrigger value="notifications" data-testid="tab-task-notifications">
                <Bell className="h-4 w-4 mr-1" />
                Notifications
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <Label htmlFor="departmentId">Department *</Label>
                  <Select 
                    value={taskForm.departmentId?.toString() || ""} 
                    onValueChange={(v) => setTaskForm({ ...taskForm, departmentId: parseInt(v) })}
                  >
                    <SelectTrigger data-testid="select-task-department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v })}>
                    <SelectTrigger data-testid="select-task-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="taskName">Task Name *</Label>
                <Input
                  id="taskName"
                  value={taskForm.taskName}
                  onChange={(e) => setTaskForm({ ...taskForm, taskName: e.target.value })}
                  placeholder="Enter task name"
                  data-testid="input-task-name"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Enter task description"
                  rows={3}
                  data-testid="textarea-task-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="recurrence">Recurrence</Label>
                  <Select value={taskForm.recurrence} onValueChange={(v) => setTaskForm({ ...taskForm, recurrence: v })}>
                    <SelectTrigger data-testid="select-task-recurrence">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {recurrenceOptions.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    data-testid="input-task-duedate"
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="assignment" className="space-y-4 py-4">
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Assigned People</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setTaskForm({
                        ...taskForm,
                        assignees: [...taskForm.assignees, { name: "", email: "" }]
                      })}
                      data-testid="button-add-assignee"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Person
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    People responsible for completing this task. They will receive reminder notifications.
                  </p>
                  <div className="space-y-3">
                    {taskForm.assignees.map((assignee, index) => (
                      <div key={index} className="flex items-end gap-2">
                        <div className="flex-1">
                          <Label htmlFor={`assignee-name-${index}`}>Name</Label>
                          <Input
                            id={`assignee-name-${index}`}
                            value={assignee.name}
                            onChange={(e) => {
                              const updated = [...taskForm.assignees];
                              updated[index] = { ...updated[index], name: e.target.value };
                              setTaskForm({ ...taskForm, assignees: updated });
                            }}
                            placeholder="Person's name"
                            data-testid={`input-assignee-name-${index}`}
                          />
                        </div>
                        <div className="flex-1">
                          <Label htmlFor={`assignee-email-${index}`}>Email</Label>
                          <Input
                            id={`assignee-email-${index}`}
                            type="email"
                            value={assignee.email}
                            onChange={(e) => {
                              const updated = [...taskForm.assignees];
                              updated[index] = { ...updated[index], email: e.target.value };
                              setTaskForm({ ...taskForm, assignees: updated });
                            }}
                            placeholder="email@example.com"
                            data-testid={`input-assignee-email-${index}`}
                          />
                        </div>
                        {taskForm.assignees.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const updated = taskForm.assignees.filter((_, i) => i !== index);
                              setTaskForm({ ...taskForm, assignees: updated });
                            }}
                            data-testid={`button-remove-assignee-${index}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Managers / Supervisors</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setTaskForm({
                        ...taskForm,
                        managers: [...taskForm.managers, { name: "", email: "" }]
                      })}
                      data-testid="button-add-manager"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Manager
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Managers receive all reminders and delinquent task alerts when tasks are overdue.
                  </p>
                  <div className="space-y-3">
                    {taskForm.managers.map((manager, index) => (
                      <div key={index} className="flex items-end gap-2">
                        <div className="flex-1">
                          <Label htmlFor={`manager-name-${index}`}>Name</Label>
                          <Input
                            id={`manager-name-${index}`}
                            value={manager.name}
                            onChange={(e) => {
                              const updated = [...taskForm.managers];
                              updated[index] = { ...updated[index], name: e.target.value };
                              setTaskForm({ ...taskForm, managers: updated });
                            }}
                            placeholder="Manager's name"
                            data-testid={`input-manager-name-${index}`}
                          />
                        </div>
                        <div className="flex-1">
                          <Label htmlFor={`manager-email-${index}`}>Email</Label>
                          <Input
                            id={`manager-email-${index}`}
                            type="email"
                            value={manager.email}
                            onChange={(e) => {
                              const updated = [...taskForm.managers];
                              updated[index] = { ...updated[index], email: e.target.value };
                              setTaskForm({ ...taskForm, managers: updated });
                            }}
                            placeholder="manager@example.com"
                            data-testid={`input-manager-email-${index}`}
                          />
                        </div>
                        {taskForm.managers.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const updated = taskForm.managers.filter((_, i) => i !== index);
                              setTaskForm({ ...taskForm, managers: updated });
                            }}
                            data-testid={`button-remove-manager-${index}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="notifications" className="space-y-4 py-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Reminder Notifications
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Select when to send email reminders to the assigned person before the due date. 
                    Reminders include all task details and days remaining.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {reminderDayOptions.map((option) => (
                      <label 
                        key={option.value} 
                        className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                          taskForm.reminderDays.includes(option.value) 
                            ? 'bg-primary/10 border-primary' 
                            : 'hover:bg-muted'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={taskForm.reminderDays.includes(option.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTaskForm({ 
                                ...taskForm, 
                                reminderDays: [...taskForm.reminderDays, option.value].sort((a, b) => b - a) 
                              });
                            } else {
                              setTaskForm({ 
                                ...taskForm, 
                                reminderDays: taskForm.reminderDays.filter(d => d !== option.value) 
                              });
                            }
                          }}
                          className="h-4 w-4"
                          data-testid={`checkbox-reminder-${option.value}`}
                        />
                        <span className="text-sm">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Delinquent Task Alerts
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    When a task becomes overdue (past due date and not completed), both the assigned person 
                    and the manager will receive a delinquent notification email. Overdue tasks will also 
                    appear in the Delinquent Tasks tab for tracking.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)} data-testid="button-cancel-task">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitTask}
              disabled={!taskForm.departmentId || !taskForm.taskName.trim()}
              data-testid="button-save-task"
            >
              {selectedTask ? "Update Task" : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDepartmentDialog} onOpenChange={setShowDepartmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedDepartment ? "Edit Department" : "Add New Department"}</DialogTitle>
            <DialogDescription>
              {selectedDepartment ? "Update the department details below" : "Create a new department to organize tasks"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="deptName">Department Name *</Label>
              <Input
                id="deptName"
                value={departmentForm.name}
                onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
                placeholder="Enter department name"
                data-testid="input-department-name"
              />
            </div>
            <div>
              <Label htmlFor="deptDescription">Description</Label>
              <Textarea
                id="deptDescription"
                value={departmentForm.description}
                onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })}
                placeholder="Enter description"
                rows={2}
                data-testid="textarea-department-description"
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${departmentForm.color === color.value ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setDepartmentForm({ ...departmentForm, color: color.value })}
                    title={color.label}
                    data-testid={`button-color-${color.label.toLowerCase()}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDepartmentDialog(false)} data-testid="button-cancel-department">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitDepartment}
              disabled={!departmentForm.name.trim()}
              data-testid="button-save-department"
            >
              {selectedDepartment ? "Update Department" : "Create Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Task</DialogTitle>
            <DialogDescription>
              {selectedTask?.recurrence !== "one_time" 
                ? "This is a recurring task. Completing it will move it to the next cycle." 
                : "Mark this task as completed."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="completionNotes">Completion Notes (Optional)</Label>
            <Textarea
              id="completionNotes"
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="Add any notes about the completion..."
              rows={3}
              data-testid="textarea-completion-notes"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)} data-testid="button-cancel-complete">
              Cancel
            </Button>
            <Button 
              onClick={() => selectedTask && completeTaskMutation.mutate({ id: selectedTask.id, completionNotes })}
              data-testid="button-confirm-complete"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {selectedTask ? "task" : "department"}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (selectedTask) {
                  deleteTaskMutation.mutate(selectedTask.id);
                } else if (selectedDepartment) {
                  deleteDepartmentMutation.mutate(selectedDepartment.id);
                }
              }}
              data-testid="button-confirm-delete"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
