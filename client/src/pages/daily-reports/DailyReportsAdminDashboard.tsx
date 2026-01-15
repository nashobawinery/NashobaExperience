import { useState, useMemo } from "react";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
  Settings,
  QrCode,
  Copy,
  Download,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
  X,
  RotateCcw,
  Save,
  Loader2
} from "lucide-react";
import { getModuleDocs } from "@/docs";
import ModuleDocumentation from "@/components/ModuleDocumentation";
import "@/docs/daily-reports";
import dailyReportIcon from "@assets/Daily Report_1764626305136.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { format, formatDistanceToNow, isToday, isSameDay, startOfDay, endOfDay, subDays } from "date-fns";

interface NotificationEmail {
  email: string;
  name?: string;
  role?: string;
}

interface DailyReportMetric {
  key: string;
  label: string;
  type: string;
  unit?: string;
  isEnabled?: boolean;
}

interface DailyReportTemplate {
  id: string;
  department: string;
  departmentLabel: string;
  metrics: DailyReportMetric[];
  notificationEmails?: NotificationEmail[];
  sortOrder?: number;
  isActive: boolean;
  createdAt: string;
}

interface DailyReport {
  id: string;
  templateId: string;
  department: string;
  reportDate: string;
  status: string;
  source: 'qr_form' | 'admin' | 'api' | string;
  metrics: Record<string, number | string>;
  metricsData: Record<string, number | string> | null;
  customerServiceSummary: string | null;
  operationalNotes: string | null;
  staffingNotes: string | null;
  performanceSummary: string | null;
  overallRating: number | null;
  hasCustomerConcerns: boolean;
  customerConcernsSummary: string | null;
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
  incidentTime: string | null;
  severity: string;
  description: string;
  isCustomerRelated: boolean;
  customerName: string | null;
  customerContact: string | null;
  actionTaken: string | null;
  resolved: boolean;
  requiresFollowUp: boolean;
  followUpNotes: string | null;
  reportedById: string | null;
  reportedByName: string | null;
  createdAt: string;
  updatedAt: string;
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
  department: string;
  procedureName: string;
  description: string | null;
  procedureType: 'opening' | 'closing' | 'general';
  sortOrder: number;
  isRequired: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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

interface DailyReportAccessCode {
  id: string;
  code: string;
  staffName: string;
  department: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

interface DailyReportIncidentNote {
  id: string;
  incidentId: string;
  note: string;
  addedById: string | null;
  addedByName: string | null;
  createdAt: string;
}

interface DailyReportFieldDefinition {
  id: string;
  key: string;
  label: string;
  type: 'number' | 'text' | 'checkbox' | 'dropdown';
  description?: string | null;
  options?: { value: string; label: string }[] | null;
  notificationEmails?: { email: string; name?: string }[] | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DepartmentFieldAssignment {
  id: string;
  templateId: string;
  fieldDefinitionId: string;
  isEnabled: boolean;
  sortOrder: number;
  fieldDefinition?: DailyReportFieldDefinition;
}

const fieldTypeOptions = [
  { value: "number", label: "Number", description: "Numeric values (counts, quantities, etc.)" },
  { value: "text", label: "Text", description: "Free-form text responses" },
  { value: "checkbox", label: "Checkbox", description: "Simple yes/no check mark" },
  { value: "dropdown", label: "Dropdown", description: "Select from predefined options" }
];

function ReportFieldsTab() {
  const { toast } = useToast();
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<DailyReportFieldDefinition | null>(null);
  const [fieldFormData, setFieldFormData] = useState({
    key: "",
    label: "",
    type: "text" as "number" | "text" | "checkbox" | "dropdown",
    description: "",
    options: [] as { value: string; label: string }[],
    notificationEmails: [] as { email: string; name?: string }[],
    sortOrder: 0,
    isActive: true
  });
  const [newOptionLabel, setNewOptionLabel] = useState("");
  const [newNotificationEmail, setNewNotificationEmail] = useState("");
  const [newNotificationName, setNewNotificationName] = useState("");

  const { data: fieldDefinitions = [], isLoading } = useQuery<DailyReportFieldDefinition[]>({
    queryKey: ['/api/daily-reports/field-definitions'],
  });

  const createFieldMutation = useMutation({
    mutationFn: async (data: Omit<DailyReportFieldDefinition, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await apiRequest('POST', '/api/daily-reports/field-definitions', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/field-definitions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/templates'] });
      toast({ title: "Success", description: "Field definition created and synced to all departments" });
      setIsFieldDialogOpen(false);
      resetFieldForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create field", variant: "destructive" });
    }
  });

  const updateFieldMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DailyReportFieldDefinition> }) => {
      const response = await apiRequest('PATCH', `/api/daily-reports/field-definitions/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/field-definitions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/templates'] });
      toast({ title: "Success", description: "Field definition updated and synced to all departments" });
      setIsFieldDialogOpen(false);
      setEditingField(null);
      resetFieldForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update field", variant: "destructive" });
    }
  });

  const deleteFieldMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/daily-reports/field-definitions/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/field-definitions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/templates'] });
      toast({ title: "Success", description: "Field definition deleted and removed from all departments" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete field", variant: "destructive" });
    }
  });

  const syncFieldsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/daily-reports/field-definitions/sync');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/templates'] });
      toast({ title: "Success", description: "Field definitions synced to all department templates" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to sync fields", variant: "destructive" });
    }
  });

  const resetFieldForm = () => {
    setFieldFormData({
      key: "",
      label: "",
      type: "text",
      description: "",
      options: [],
      notificationEmails: [],
      sortOrder: fieldDefinitions.length,
      isActive: true
    });
    setNewOptionLabel("");
    setNewNotificationEmail("");
    setNewNotificationName("");
  };

  const handleAddField = () => {
    setEditingField(null);
    resetFieldForm();
    setIsFieldDialogOpen(true);
  };

  const handleEditField = (field: DailyReportFieldDefinition) => {
    setEditingField(field);
    setFieldFormData({
      key: field.key,
      label: field.label,
      type: field.type,
      description: field.description || "",
      options: field.options || [],
      notificationEmails: field.notificationEmails || [],
      sortOrder: field.sortOrder,
      isActive: field.isActive
    });
    setNewOptionLabel("");
    setNewNotificationEmail("");
    setNewNotificationName("");
    setIsFieldDialogOpen(true);
  };

  const handleSaveField = () => {
    if (!fieldFormData.key.trim() || !fieldFormData.label.trim()) {
      toast({ title: "Error", description: "Key and Label are required", variant: "destructive" });
      return;
    }

    if (fieldFormData.type === 'dropdown' && fieldFormData.options.length === 0) {
      toast({ title: "Error", description: "Dropdown fields require at least one option", variant: "destructive" });
      return;
    }

    const data = {
      key: fieldFormData.key.toLowerCase().replace(/\s+/g, '_'),
      label: fieldFormData.label,
      type: fieldFormData.type,
      description: fieldFormData.description || null,
      options: fieldFormData.type === 'dropdown' ? fieldFormData.options : null,
      notificationEmails: fieldFormData.notificationEmails.length > 0 ? fieldFormData.notificationEmails : null,
      sortOrder: fieldFormData.sortOrder,
      isActive: fieldFormData.isActive
    };

    if (editingField) {
      updateFieldMutation.mutate({ id: editingField.id, data });
    } else {
      createFieldMutation.mutate(data);
    }
  };

  const addDropdownOption = () => {
    if (!newOptionLabel.trim()) return;
    const value = newOptionLabel.toLowerCase().replace(/\s+/g, '_');
    if (fieldFormData.options.some(o => o.value === value)) {
      toast({ title: "Error", description: "Option already exists", variant: "destructive" });
      return;
    }
    setFieldFormData({
      ...fieldFormData,
      options: [...fieldFormData.options, { value, label: newOptionLabel.trim() }]
    });
    setNewOptionLabel("");
  };

  const removeDropdownOption = (value: string) => {
    setFieldFormData({
      ...fieldFormData,
      options: fieldFormData.options.filter(o => o.value !== value)
    });
  };

  const addNotificationEmail = () => {
    const email = newNotificationEmail.trim().toLowerCase();
    if (!email) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: "Error", description: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    
    if (fieldFormData.notificationEmails.some(e => e.email === email)) {
      toast({ title: "Error", description: "This email is already added", variant: "destructive" });
      return;
    }
    
    setFieldFormData({
      ...fieldFormData,
      notificationEmails: [...fieldFormData.notificationEmails, { 
        email, 
        name: newNotificationName.trim() || undefined 
      }]
    });
    setNewNotificationEmail("");
    setNewNotificationName("");
  };

  const removeNotificationEmail = (email: string) => {
    setFieldFormData({
      ...fieldFormData,
      notificationEmails: fieldFormData.notificationEmails.filter(e => e.email !== email)
    });
  };

  const handleDeleteField = (field: DailyReportFieldDefinition) => {
    if (window.confirm(`Are you sure you want to delete "${field.label}"? This will remove it from all department templates.`)) {
      deleteFieldMutation.mutate(field.id);
    }
  };

  const sortedFields = [...fieldDefinitions].sort((a, b) => a.sortOrder - b.sortOrder);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Report Fields
            </CardTitle>
            <CardDescription>
              Manage the master list of fields available in daily reports. Changes here sync to all department templates.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncFieldsMutation.mutate()}
              disabled={syncFieldsMutation.isPending}
              data-testid="button-sync-fields"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncFieldsMutation.isPending ? 'animate-spin' : ''}`} />
              Sync to Templates
            </Button>
            <Button onClick={handleAddField} data-testid="button-add-field">
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sortedFields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No field definitions yet.</p>
              <p className="text-sm">Add fields to define what data departments can collect in their daily reports.</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-muted/50 font-medium text-sm border-b">
                <div className="col-span-1">#</div>
                <div className="col-span-3">Label</div>
                <div className="col-span-2">Key</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              <div className="divide-y">
                {sortedFields.map((field, index) => (
                  <div 
                    key={field.id} 
                    className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-muted/30 group"
                    data-testid={`field-row-${field.key}`}
                  >
                    <div className="col-span-1 text-muted-foreground">{index + 1}</div>
                    <div className="col-span-3">
                      <div className="font-medium">{field.label}</div>
                      {field.description && (
                        <div className="text-xs text-muted-foreground truncate">{field.description}</div>
                      )}
                    </div>
                    <div className="col-span-2">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{field.key}</code>
                    </div>
                    <div className="col-span-2">
                      <Badge variant="outline" className="text-xs">
                        {field.type === 'number' ? '123' : 
                         field.type === 'checkbox' ? 'Yes' : 
                         field.type === 'dropdown' ? 'List' : 'Abc'} {field.type}
                      </Badge>
                    </div>
                    <div className="col-span-2">
                      {field.isActive ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <div className="col-span-2 flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleEditField(field)}
                        data-testid={`button-edit-field-${field.key}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteField(field)}
                        data-testid={`button-delete-field-${field.key}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">How Field Syncing Works</p>
                <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                  <li>Adding a new field automatically adds it to all department templates (disabled by default)</li>
                  <li>Updating a field's label or type syncs to all departments</li>
                  <li>Deleting a field removes it from all department templates</li>
                  <li>Department-level enable/disable is controlled in the Departments tab</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isFieldDialogOpen} onOpenChange={setIsFieldDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingField ? 'Edit Field' : 'Add New Field'}</DialogTitle>
            <DialogDescription>
              {editingField 
                ? 'Update the field definition. Changes will sync to all department templates.'
                : 'Create a new field that will be available in all department templates.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fieldLabel">Label *</Label>
                <Input
                  id="fieldLabel"
                  placeholder="e.g., Total Reservations"
                  value={fieldFormData.label}
                  onChange={(e) => setFieldFormData({ ...fieldFormData, label: e.target.value })}
                  data-testid="input-field-label"
                />
                <p className="text-xs text-muted-foreground">Display name shown to users</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fieldKey">Key *</Label>
                <Input
                  id="fieldKey"
                  placeholder="e.g., total_reservations"
                  value={fieldFormData.key}
                  onChange={(e) => setFieldFormData({ 
                    ...fieldFormData, 
                    key: e.target.value.toLowerCase().replace(/\s+/g, '_')
                  })}
                  data-testid="input-field-key"
                />
                <p className="text-xs text-muted-foreground">Unique identifier (snake_case)</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fieldType">Field Type *</Label>
              <Select
                value={fieldFormData.type}
                onValueChange={(value: "number" | "text" | "checkbox" | "dropdown") => setFieldFormData({ 
                  ...fieldFormData, 
                  type: value,
                  options: value === 'dropdown' ? fieldFormData.options : []
                })}
              >
                <SelectTrigger data-testid="select-field-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fieldTypeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {option.value === 'number' ? '123' : 
                           option.value === 'checkbox' ? 'Yes' : 
                           option.value === 'dropdown' ? 'List' : 'Abc'}
                        </Badge>
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {fieldTypeOptions.find(o => o.value === fieldFormData.type)?.description}
              </p>
            </div>

            {/* Dropdown Options UI */}
            {fieldFormData.type === 'dropdown' && (
              <div className="space-y-2 border rounded-md p-3 bg-muted/30">
                <Label>Dropdown Options *</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter option label"
                    value={newOptionLabel}
                    onChange={(e) => setNewOptionLabel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDropdownOption())}
                    data-testid="input-dropdown-option"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addDropdownOption}
                    data-testid="button-add-dropdown-option"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {fieldFormData.options.length > 0 ? (
                  <div className="space-y-1 mt-2">
                    {fieldFormData.options.map((option) => (
                      <div key={option.value} className="flex items-center justify-between gap-2 bg-background rounded px-2 py-1">
                        <span className="text-sm">{option.label}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeDropdownOption(option.value)}
                          data-testid={`button-remove-option-${option.value}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">Add at least one option for the dropdown</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fieldDescription">Description (optional)</Label>
              <Textarea
                id="fieldDescription"
                placeholder="Describe what this field captures..."
                value={fieldFormData.description}
                onChange={(e) => setFieldFormData({ ...fieldFormData, description: e.target.value })}
                className="resize-none"
                rows={2}
                data-testid="input-field-description"
              />
            </div>

            {/* Field-Level Notification Emails */}
            <div className="space-y-2 border rounded-md p-3 bg-muted/30">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Field-Specific Email Notifications (optional)
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                When this field is submitted, a separate email with just this field's value will be sent to these addresses.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Email address"
                  type="email"
                  value={newNotificationEmail}
                  onChange={(e) => setNewNotificationEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNotificationEmail())}
                  data-testid="input-notification-email"
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Name (optional)"
                    value={newNotificationName}
                    onChange={(e) => setNewNotificationName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNotificationEmail())}
                    data-testid="input-notification-name"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addNotificationEmail}
                    data-testid="button-add-notification-email"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {fieldFormData.notificationEmails.length > 0 ? (
                <div className="space-y-1 mt-2">
                  {fieldFormData.notificationEmails.map((recipient) => (
                    <div key={recipient.email} className="flex items-center justify-between gap-2 bg-background rounded px-2 py-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span>{recipient.email}</span>
                        {recipient.name && (
                          <span className="text-muted-foreground">({recipient.name})</span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeNotificationEmail(recipient.email)}
                        data-testid={`button-remove-notification-${recipient.email}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">No email notifications configured for this field</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fieldSortOrder">Sort Order</Label>
                <Input
                  id="fieldSortOrder"
                  type="number"
                  min="0"
                  value={fieldFormData.sortOrder}
                  onChange={(e) => setFieldFormData({ ...fieldFormData, sortOrder: parseInt(e.target.value) || 0 })}
                  data-testid="input-field-sort-order"
                />
              </div>
              <div className="flex items-center space-x-2 pt-7">
                <Switch
                  id="fieldActive"
                  checked={fieldFormData.isActive}
                  onCheckedChange={(checked) => setFieldFormData({ ...fieldFormData, isActive: checked })}
                  data-testid="switch-field-active"
                />
                <Label htmlFor="fieldActive">Active</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFieldDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveField}
              disabled={createFieldMutation.isPending || updateFieldMutation.isPending}
              data-testid="button-save-field"
            >
              {(createFieldMutation.isPending || updateFieldMutation.isPending) 
                ? "Saving..." 
                : (editingField ? "Update Field" : "Add Field")
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
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
  reviewed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  needs_revision: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  submitted: "Pending Review",
  reviewed: "Reviewed",
  needs_revision: "Needs Revision"
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

const procedureTypes = [
  { value: "opening", label: "Opening", description: "Tasks completed at start of shift" },
  { value: "closing", label: "Closing", description: "Tasks completed at end of shift" },
  { value: "general", label: "General", description: "Tasks that can be done throughout the day" }
];

const procedureTypeColors: Record<string, string> = {
  opening: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  closing: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  general: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
};

type SortField = 'department' | 'reportDate' | 'status' | 'incidents' | 'procedures' | 'submittedBy';
type SortDirection = 'asc' | 'desc';

export default function DailyReportsAdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [searchQuery, setSearchQuery] = useState("");
  
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>('reportDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
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
    staffName: "", // Staff member filing the report
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

  const [isAccessCodeDialogOpen, setIsAccessCodeDialogOpen] = useState(false);
  const [editingAccessCode, setEditingAccessCode] = useState<DailyReportAccessCode | null>(null);
  const [accessCodeFormData, setAccessCodeFormData] = useState({
    staffName: "",
    department: "",
    code: "",
    isActive: true
  });
  const [showQrCode, setShowQrCode] = useState<DailyReportAccessCode | null>(null);
  const [showGlobalQrCode, setShowGlobalQrCode] = useState(false);
  
  const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DailyReportTemplate | null>(null);
  const [departmentFormData, setDepartmentFormData] = useState({
    departmentLabel: "",
    notificationEmailsText: "",
    sortOrder: 0
  });
  
  const [isNewDepartmentDialogOpen, setIsNewDepartmentDialogOpen] = useState(false);
  const [newDepartmentFormData, setNewDepartmentFormData] = useState({
    departmentKey: "",
    departmentLabel: ""
  });
  
  const [inlineEditingEmailsTemplateId, setInlineEditingEmailsTemplateId] = useState<string | null>(null);
  const [inlineEmailsText, setInlineEmailsText] = useState("");
  
  // Sort order editing state - tracks temp values while user is typing
  const [editingSortOrder, setEditingSortOrder] = useState<{ fieldId: string; templateId: string; value: string } | null>(null);
  
  const [isProcedureTemplateDialogOpen, setIsProcedureTemplateDialogOpen] = useState(false);
  const [editingProcedureTemplate, setEditingProcedureTemplate] = useState<DailyProcedureTemplate | null>(null);
  const [procedureTemplateFormData, setProcedureTemplateFormData] = useState({
    department: "",
    procedureName: "",
    description: "",
    procedureType: "general" as 'opening' | 'closing' | 'general',
    sortOrder: 0,
    isRequired: true,
    isActive: true
  });

  // Revision request state
  const [isRevisionRequestDialogOpen, setIsRevisionRequestDialogOpen] = useState(false);
  const [revisionRequestMessage, setRevisionRequestMessage] = useState("");
  const [reportForRevision, setReportForRevision] = useState<DailyReport | null>(null);

  // Incident management state
  const [isIncidentManageDialogOpen, setIsIncidentManageDialogOpen] = useState(false);
  const [managingIncident, setManagingIncident] = useState<DailyReportIncident | null>(null);
  const [newIncidentNote, setNewIncidentNote] = useState("");

  // Template preview state
  const [previewingTemplate, setPreviewingTemplate] = useState<DailyReportTemplate | null>(null);
  
  // Template duplicate state
  const [duplicatingTemplate, setDuplicatingTemplate] = useState<DailyReportTemplate | null>(null);
  const [duplicateFormData, setDuplicateFormData] = useState({
    departmentLabel: "",
    departmentKey: "",
    copyProcedures: true,
    copyAccessCodes: false
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery<DailyReportTemplate[]>({
    queryKey: ['/api/daily-reports/templates']
  });
  
  const sortedTemplates = useMemo(() => {
    return [...templates].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [templates]);

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

  const { data: selectedReportRevisionRequests = [] } = useQuery<{
    id: string;
    reportId: string;
    requestedById: string | null;
    requestedByName: string | null;
    requestMessage: string;
    status: string;
    responseMessage: string | null;
    respondedById: string | null;
    respondedByName: string | null;
    respondedAt: string | null;
    createdAt: string;
  }[]>({
    queryKey: ['/api/daily-reports/reports', selectedReport?.id, 'revision-requests'],
    enabled: !!selectedReport
  });

  const { data: procedureTemplates = [] } = useQuery<DailyProcedureTemplate[]>({
    queryKey: ['/api/daily-reports/templates', selectedReport?.templateId, 'procedures'],
    enabled: !!selectedReport?.templateId
  });

  const { data: emailRecipients = [], isLoading: emailRecipientsLoading } = useQuery<DailyReportEmailRecipient[]>({
    queryKey: ['/api/daily-reports/email-recipients'],
    enabled: activeTab === 'departments'
  });
  
  const { data: allProcedureTemplates = [] } = useQuery<DailyProcedureTemplate[]>({
    queryKey: ['/api/daily-reports/procedures'],
    enabled: activeTab === 'departments'
  });

  const { data: allFieldAssignments = {} } = useQuery<Record<string, DepartmentFieldAssignment[]>>({
    queryKey: ['/api/daily-reports/field-assignments'],
    enabled: activeTab === 'departments' || isReportDialogOpen || isViewReportDialogOpen
  });

  // Query for unresolved incidents (for the Incidents tab)
  const { data: unresolvedIncidents = [], isLoading: unresolvedIncidentsLoading } = useQuery<DailyReportIncident[]>({
    queryKey: ['/api/daily-reports/incidents/unresolved'],
    enabled: activeTab === 'incidents'
  });

  // Query for incident notes (when managing an incident)
  const { data: incidentNotes = [], isLoading: incidentNotesLoading } = useQuery<DailyReportIncidentNote[]>({
    queryKey: ['/api/daily-reports/incidents', managingIncident?.id, 'notes'],
    enabled: !!managingIncident
  });

  // Mutation for resolving incidents
  const resolveIncidentMutation = useMutation({
    mutationFn: async (incidentId: string) => {
      return await apiRequest('POST', `/api/daily-reports/incidents/${incidentId}/resolve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/incidents/unresolved'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports'] });
      if (selectedReport) {
        queryClient.invalidateQueries({ queryKey: ['/api/daily-reports', selectedReport.id, 'incidents'] });
      }
      setIsIncidentManageDialogOpen(false);
      setManagingIncident(null);
      toast({ title: "Incident marked as resolved" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to resolve incident", description: error.message, variant: "destructive" });
    }
  });

  // Mutation for adding incident notes
  const addIncidentNoteMutation = useMutation({
    mutationFn: async ({ incidentId, note }: { incidentId: string; note: string }) => {
      return await apiRequest('POST', `/api/daily-reports/incidents/${incidentId}/notes`, { note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/incidents', managingIncident?.id, 'notes'] });
      setNewIncidentNote("");
      toast({ title: "Note added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add note", description: error.message, variant: "destructive" });
    }
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

  const { data: accessCodes = [], isLoading: accessCodesLoading } = useQuery<DailyReportAccessCode[]>({
    queryKey: ['/api/daily-reports/access-codes']
  });

  const createAccessCodeMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/daily-reports/access-codes', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/access-codes'] });
      setIsAccessCodeDialogOpen(false);
      resetAccessCodeForm();
      toast({ title: "Access code created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create access code", description: error.message, variant: "destructive" });
    }
  });

  const updateAccessCodeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest('PATCH', `/api/daily-reports/access-codes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/access-codes'] });
      setIsAccessCodeDialogOpen(false);
      setEditingAccessCode(null);
      resetAccessCodeForm();
      toast({ title: "Access code updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update access code", description: error.message, variant: "destructive" });
    }
  });

  const deleteAccessCodeMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/daily-reports/access-codes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/access-codes'] });
      toast({ title: "Access code deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete access code", description: error.message, variant: "destructive" });
    }
  });

  const updateDepartmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { departmentLabel?: string; notificationEmails?: NotificationEmail[]; metrics?: DailyReportMetric[]; sortOrder?: number } }) => {
      return await apiRequest('PATCH', `/api/daily-reports/templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/templates'] });
      setIsDepartmentDialogOpen(false);
      setEditingDepartment(null);
      toast({ title: "Department settings updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update department settings", description: error.message, variant: "destructive" });
    }
  });

  const createDepartmentMutation = useMutation({
    mutationFn: async (data: { department: string; departmentLabel: string; metrics: any[] }) => {
      return await apiRequest('POST', '/api/daily-reports/templates', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/templates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/field-assignments'] });
      setIsNewDepartmentDialogOpen(false);
      setNewDepartmentFormData({ departmentKey: "", departmentLabel: "" });
      toast({ title: "Department created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create department", description: error.message, variant: "destructive" });
    }
  });

  const duplicateTemplateMutation = useMutation({
    mutationFn: async (data: { 
      sourceTemplateId: string; 
      departmentKey: string; 
      departmentLabel: string;
      copyProcedures: boolean;
      copyAccessCodes: boolean;
    }) => {
      const response = await apiRequest('POST', `/api/daily-reports/templates/${data.sourceTemplateId}/duplicate`, {
        departmentKey: data.departmentKey,
        departmentLabel: data.departmentLabel,
        copyProcedures: data.copyProcedures,
        copyAccessCodes: data.copyAccessCodes
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/templates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/field-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/procedures'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/access-codes'] });
      setDuplicatingTemplate(null);
      setDuplicateFormData({ departmentLabel: "", departmentKey: "", copyProcedures: true, copyAccessCodes: false });
      toast({ title: "Template duplicated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to duplicate template", description: error.message, variant: "destructive" });
    }
  });

  const toggleMetricMutation = useMutation({
    mutationFn: async ({ templateId, fieldDefinitionId, isEnabled }: { templateId: string; fieldDefinitionId: string; isEnabled: boolean }) => {
      // Update via junction table API using field definition ID
      return await apiRequest('PATCH', `/api/daily-reports/templates/${templateId}/fields/${fieldDefinitionId}`, {
        isEnabled
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/field-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/templates'] });
      toast({ title: "Field configuration updated" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update field configuration", description: error.message, variant: "destructive" });
    }
  });

  const batchToggleMetricsMutation = useMutation({
    mutationFn: async ({ templateId, enableAll }: { templateId: string; enableAll: boolean }) => {
      // Update all fields via junction table API
      return await apiRequest('PATCH', `/api/daily-reports/templates/${templateId}/fields`, {
        enableAll
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/field-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/templates'] });
      toast({ title: variables.enableAll ? "All fields enabled" : "All fields cleared" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update field configuration", description: error.message, variant: "destructive" });
    }
  });

  const updateFieldSortOrderMutation = useMutation({
    mutationFn: async ({ templateId, fieldDefinitionId, sortOrder }: { templateId: string; fieldDefinitionId: string; sortOrder: number }) => {
      return await apiRequest('PATCH', `/api/daily-reports/templates/${templateId}/fields/${fieldDefinitionId}`, {
        sortOrder
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/field-assignments'] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update field order", description: error.message, variant: "destructive" });
    }
  });
  
  const createProcedureTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/daily-reports/procedures', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/procedures'] });
      setIsProcedureTemplateDialogOpen(false);
      resetProcedureTemplateForm();
      toast({ title: "Procedure created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create procedure", description: error.message, variant: "destructive" });
    }
  });
  
  const updateProcedureTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest('PATCH', `/api/daily-reports/procedures/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/procedures'] });
      setIsProcedureTemplateDialogOpen(false);
      setEditingProcedureTemplate(null);
      resetProcedureTemplateForm();
      toast({ title: "Procedure updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update procedure", description: error.message, variant: "destructive" });
    }
  });
  
  const deleteProcedureTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/daily-reports/procedures/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/procedures'] });
      toast({ title: "Procedure deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete procedure", description: error.message, variant: "destructive" });
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
      toast({ title: "Report saved as draft" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create report", description: error.message, variant: "destructive" });
    }
  });

  const createAndSubmitReportMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/daily-reports', data);
      const report = await res.json();
      await apiRequest('POST', `/api/daily-reports/${report.id}/submit`);
      return report;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/stats'] });
      setIsReportDialogOpen(false);
      resetReportForm();
      toast({ title: "Report saved and submitted", description: "The report is now awaiting manager review." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to save and submit report", description: error.message, variant: "destructive" });
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
      toast({ title: "Report saved" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update report", description: error.message, variant: "destructive" });
    }
  });

  const updateAndSubmitReportMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest('PATCH', `/api/daily-reports/${id}`, data);
      await apiRequest('POST', `/api/daily-reports/${id}/submit`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/stats'] });
      setIsReportDialogOpen(false);
      setEditingReport(null);
      resetReportForm();
      toast({ title: "Report saved and submitted", description: "The report is now awaiting manager review." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to save and submit report", description: error.message, variant: "destructive" });
    }
  });

  const submitReportMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('POST', `/api/daily-reports/${id}/submit`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/stats'] });
      toast({ title: "Report submitted for review", description: "The report is now awaiting manager review." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to submit report", description: error.message, variant: "destructive" });
    }
  });

  const reviewReportMutation = useMutation({
    mutationFn: async ({ id, approved = true, reviewNotes }: { id: string; approved?: boolean; reviewNotes?: string }) => {
      return await apiRequest('POST', `/api/daily-reports/${id}/review`, { approved, reviewNotes });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/stats'] });
      if (variables.approved) {
        toast({ title: "Report approved", description: "The report has been marked as reviewed." });
      } else {
        toast({ title: "Revision requested", description: "The report has been sent back for revision." });
      }
    },
    onError: (error: any) => {
      toast({ title: "Failed to review report", description: error.message, variant: "destructive" });
    }
  });

  const createRevisionRequestMutation = useMutation({
    mutationFn: async ({ reportId, requestMessage }: { reportId: string; requestMessage: string }) => {
      const response = await apiRequest('POST', `/api/daily-reports/reports/${reportId}/revision-requests`, { requestMessage });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/stats'] });
      toast({ title: "Revision request sent", description: "The report has been sent back for revision with your message." });
      setIsRevisionRequestDialogOpen(false);
      setRevisionRequestMessage("");
      setReportForRevision(null);
      setIsViewReportDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to send revision request", description: error.message, variant: "destructive" });
    }
  });

  const deleteReportMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/daily-reports/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/stats'] });
      toast({ title: "Report deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete report", description: error.message, variant: "destructive" });
    }
  });

  const reopenReportMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('PATCH', `/api/daily-reports/${id}`, { status: 'draft' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/stats'] });
      toast({ title: "Report reopened for editing" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to reopen report", description: error.message, variant: "destructive" });
    }
  });

  const createIncidentMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', `/api/daily-reports/${selectedReport?.id}/incidents`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports', selectedReport?.id, 'incidents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/incidents/unresolved'] });
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
      staffName: "",
      metrics: {},
      customerServiceSummary: "",
      operationalNotes: "",
      staffingNotes: ""
    });
  };

  const clearReportFields = () => {
    setReportFormData(prev => ({
      ...prev,
      metrics: {},
      customerServiceSummary: "",
      operationalNotes: "",
      staffingNotes: ""
    }));
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

  const resetAccessCodeForm = () => {
    setAccessCodeFormData({
      staffName: "",
      department: "",
      code: "",
      isActive: true
    });
  };

  const handleAddAccessCode = () => {
    setEditingAccessCode(null);
    resetAccessCodeForm();
    setIsAccessCodeDialogOpen(true);
  };

  const handleEditAccessCode = (code: DailyReportAccessCode) => {
    setEditingAccessCode(code);
    setAccessCodeFormData({
      staffName: code.staffName,
      department: code.department,
      code: code.code,
      isActive: code.isActive
    });
    setIsAccessCodeDialogOpen(true);
  };

  const handleSaveAccessCode = () => {
    if (!accessCodeFormData.staffName || !accessCodeFormData.department) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    if (accessCodeFormData.code && !/^\d{4}$/.test(accessCodeFormData.code)) {
      toast({ title: "Code must be exactly 4 digits", variant: "destructive" });
      return;
    }

    if (editingAccessCode) {
      updateAccessCodeMutation.mutate({
        id: editingAccessCode.id,
        data: {
          staffName: accessCodeFormData.staffName,
          department: accessCodeFormData.department,
          code: accessCodeFormData.code || undefined,
          isActive: accessCodeFormData.isActive
        }
      });
    } else {
      createAccessCodeMutation.mutate({
        staffName: accessCodeFormData.staffName,
        department: accessCodeFormData.department,
        code: accessCodeFormData.code || undefined,
        isActive: accessCodeFormData.isActive
      });
    }
  };

  const handleDeleteAccessCode = (id: string) => {
    if (window.confirm("Are you sure you want to delete this access code?")) {
      deleteAccessCodeMutation.mutate(id);
    }
  };

  const handleShowQrCode = (code: DailyReportAccessCode) => {
    setShowQrCode(code);
  };

  const copyCodeToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Code copied to clipboard" });
  };

  const getPublicFormUrl = (code: string) => {
    return `${window.location.origin}/daily-report/${code}`;
  };

  const getGlobalPublicFormUrl = () => {
    return `${window.location.origin}/staff`;
  };

  const copyGlobalUrlToClipboard = () => {
    navigator.clipboard.writeText(getGlobalPublicFormUrl());
    toast({ title: "Staff Portal URL copied to clipboard" });
  };

  const copyUrlToClipboard = (code: string) => {
    navigator.clipboard.writeText(getPublicFormUrl(code));
    toast({ title: "URL copied to clipboard" });
  };

  const handleEditDepartment = (template: DailyReportTemplate) => {
    setEditingDepartment(template);
    const emailsText = (template.notificationEmails || [])
      .map(e => e.email)
      .join(', ');
    setDepartmentFormData({
      departmentLabel: template.departmentLabel || "",
      notificationEmailsText: emailsText,
      sortOrder: template.sortOrder ?? 0
    });
    setIsDepartmentDialogOpen(true);
  };

  const handleSaveDepartment = () => {
    if (!editingDepartment) return;
    
    const trimmedLabel = departmentFormData.departmentLabel.trim();
    if (!trimmedLabel) {
      toast({ title: "Department name is required", variant: "destructive" });
      return;
    }
    
    const emailList = departmentFormData.notificationEmailsText
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(email => email.length > 0 && email.includes('@'))
      .map(email => ({ email, name: undefined, role: undefined }));
    
    updateDepartmentMutation.mutate({
      id: editingDepartment.id,
      data: {
        departmentLabel: trimmedLabel,
        notificationEmails: emailList,
        sortOrder: departmentFormData.sortOrder
      }
    });
  };

  const handleCreateDepartment = () => {
    const { departmentKey, departmentLabel } = newDepartmentFormData;
    
    if (!departmentKey || !departmentLabel) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    
    // Create department key from input (lowercase, underscores for spaces)
    const normalizedKey = departmentKey.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    
    if (!normalizedKey) {
      toast({ title: "Invalid department key", description: "Please use only letters, numbers, and underscores", variant: "destructive" });
      return;
    }
    
    // Check if department already exists
    if (templates.some(t => t.department === normalizedKey)) {
      toast({ title: "Department already exists", description: "A department with this key already exists", variant: "destructive" });
      return;
    }
    
    createDepartmentMutation.mutate({
      department: normalizedKey,
      departmentLabel: departmentLabel.trim(),
      metrics: [] // Empty metrics - field assignments will be auto-synced
    });
  };

  const handleStartInlineEmailEdit = (template: DailyReportTemplate) => {
    const emailsText = (template.notificationEmails || [])
      .map(e => e.email)
      .join(', ');
    setInlineEmailsText(emailsText);
    setInlineEditingEmailsTemplateId(template.id);
  };

  const handleCancelInlineEmailEdit = () => {
    setInlineEditingEmailsTemplateId(null);
    setInlineEmailsText("");
  };

  const handleSaveInlineEmails = (templateId: string) => {
    const emailList = inlineEmailsText
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(email => email.length > 0 && email.includes('@'))
      .map(email => ({ email, name: undefined, role: undefined }));
    
    updateDepartmentMutation.mutate({
      id: templateId,
      data: {
        notificationEmails: emailList
      }
    }, {
      onSuccess: () => {
        setInlineEditingEmailsTemplateId(null);
        setInlineEmailsText("");
        toast({ title: "Notification emails updated" });
      }
    });
  };
  
  const resetProcedureTemplateForm = () => {
    setProcedureTemplateFormData({
      department: "",
      procedureName: "",
      description: "",
      procedureType: "general",
      sortOrder: 0,
      isRequired: true,
      isActive: true
    });
  };
  
  const handleAddProcedureTemplate = (department: string) => {
    setEditingProcedureTemplate(null);
    const deptProcedures = allProcedureTemplates.filter(p => p.department === department);
    setProcedureTemplateFormData({
      department,
      procedureName: "",
      description: "",
      procedureType: "general",
      sortOrder: deptProcedures.length,
      isRequired: true,
      isActive: true
    });
    setIsProcedureTemplateDialogOpen(true);
  };
  
  const handleEditProcedureTemplate = (procedure: DailyProcedureTemplate) => {
    setEditingProcedureTemplate(procedure);
    setProcedureTemplateFormData({
      department: procedure.department,
      procedureName: procedure.procedureName,
      description: procedure.description || "",
      procedureType: procedure.procedureType,
      sortOrder: procedure.sortOrder,
      isRequired: procedure.isRequired,
      isActive: procedure.isActive
    });
    setIsProcedureTemplateDialogOpen(true);
  };
  
  const handleSaveProcedureTemplate = () => {
    if (!procedureTemplateFormData.procedureName || !procedureTemplateFormData.department) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    
    const data = {
      department: procedureTemplateFormData.department,
      procedureName: procedureTemplateFormData.procedureName,
      description: procedureTemplateFormData.description || null,
      procedureType: procedureTemplateFormData.procedureType,
      sortOrder: procedureTemplateFormData.sortOrder,
      isRequired: procedureTemplateFormData.isRequired,
      isActive: procedureTemplateFormData.isActive
    };
    
    if (editingProcedureTemplate) {
      updateProcedureTemplateMutation.mutate({ id: editingProcedureTemplate.id, data });
    } else {
      createProcedureTemplateMutation.mutate(data);
    }
  };
  
  const handleDeleteProcedureTemplate = (id: string) => {
    if (window.confirm("Are you sure you want to delete this procedure? This cannot be undone.")) {
      deleteProcedureTemplateMutation.mutate(id);
    }
  };
  
  const getProceduresForDepartment = (department: string) => {
    return allProcedureTemplates
      .filter(p => p.department === department)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  };

  const handleCreateReport = () => {
    setEditingReport(null);
    resetReportForm();
    setIsReportDialogOpen(true);
  };

  const handleEditReport = (report: DailyReport) => {
    setEditingReport(report);
    // Format date as YYYY-MM-DD for HTML date input
    const dateStr = report.reportDate ? format(new Date(report.reportDate), 'yyyy-MM-dd') : '';
    setReportFormData({
      department: report.department,
      reportDate: dateStr,
      staffName: report.submittedByName || "",
      metrics: (report.metrics || {}) as Record<string, string>,
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

  const getReportData = () => {
    const template = templates.find(t => t.department === reportFormData.department);
    if (!template) {
      return null;
    }

    const enabledFields = (allFieldAssignments[template.id] || [])
      .filter(a => a.isEnabled && a.fieldDefinition?.isActive);

    const metricsToSave: Record<string, number | string> = {};
    enabledFields.forEach(assignment => {
      const key = assignment.fieldDefinition?.key;
      if (key) {
        const value = reportFormData.metrics[key];
        if (assignment.fieldDefinition?.type === 'text') {
          metricsToSave[key] = value || '';
        } else {
          metricsToSave[key] = value ? parseFloat(value) : 0;
        }
      }
    });

    return {
      templateId: template.id,
      department: reportFormData.department,
      reportDate: reportFormData.reportDate,
      staffName: reportFormData.staffName || null, // Staff member filing the report
      metrics: metricsToSave,
      customerServiceSummary: reportFormData.customerServiceSummary || null,
      operationalNotes: reportFormData.operationalNotes || null,
      staffingNotes: reportFormData.staffingNotes || null
    };
  };

  const handleSaveReport = () => {
    const data = getReportData();
    if (!data) {
      toast({ title: "Please select a department", variant: "destructive" });
      return;
    }

    if (editingReport) {
      updateReportMutation.mutate({ id: editingReport.id, data });
    } else {
      createReportMutation.mutate(data);
    }
  };

  const handleSaveAndSubmitReport = () => {
    const data = getReportData();
    if (!data) {
      toast({ title: "Please select a department", variant: "destructive" });
      return;
    }

    if (editingReport) {
      updateAndSubmitReportMutation.mutate({ id: editingReport.id, data });
    } else {
      createAndSubmitReportMutation.mutate(data);
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

  const uniqueStaffMembers = Array.from(new Set(reports.map(r => r.submittedByName).filter((name): name is string => Boolean(name))));

  const filteredAndSortedReports = (() => {
    let result = reports.filter(report => {
      if (selectedDepartment !== "all" && report.department !== selectedDepartment) {
        return false;
      }
      if (selectedStaff !== "all" && report.submittedByName !== selectedStaff) {
        return false;
      }
      if (dateFrom) {
        const reportDate = new Date(report.reportDate);
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (reportDate < fromDate) return false;
      }
      if (dateTo) {
        const reportDate = new Date(report.reportDate);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (reportDate > toDate) return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const template = templates.find(t => t.id === report.templateId);
        return (
          template?.departmentLabel?.toLowerCase().includes(query) ||
          report.customerServiceSummary?.toLowerCase().includes(query) ||
          report.operationalNotes?.toLowerCase().includes(query) ||
          report.submittedByName?.toLowerCase().includes(query)
        );
      }
      return true;
    });

    result.sort((a, b) => {
      let comparison = 0;
      const templateA = templates.find(t => t.id === a.templateId);
      const templateB = templates.find(t => t.id === b.templateId);
      
      switch (sortField) {
        case 'department':
          comparison = (templateA?.departmentLabel || a.department).localeCompare(templateB?.departmentLabel || b.department);
          break;
        case 'reportDate':
          comparison = new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'incidents':
          comparison = (a.incidentsCount || 0) - (b.incidentsCount || 0);
          break;
        case 'procedures':
          comparison = (a.proceduresCompletedCount || 0) - (b.proceduresCompletedCount || 0);
          break;
        case 'submittedBy':
          comparison = (a.submittedByName || '').localeCompare(b.submittedByName || '');
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  })();

  const filteredReports = filteredAndSortedReports;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" /> 
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const clearFilters = () => {
    setSelectedDepartment("all");
    setSelectedStaff("all");
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
    setSortField('reportDate');
    setSortDirection('desc');
  };

  const hasActiveFilters = selectedDepartment !== "all" || selectedStaff !== "all" || dateFrom || dateTo || searchQuery;

  const exportToExcel = () => {
    if (filteredReports.length === 0) {
      toast({ title: "No reports to export", variant: "destructive" });
      return;
    }

    const exportData = filteredReports.map(report => {
      const template = templates.find(t => t.id === report.templateId);
      return {
        'Department': template?.departmentLabel || report.department,
        'Date': format(new Date(report.reportDate), "yyyy-MM-dd"),
        'Status': report.status,
        'Source': report.source === 'qr_form' ? 'QR Form' : 'Admin',
        'Incidents': report.incidentsCount || 0,
        'Procedures Completed': `${report.proceduresCompletedCount || 0}/${report.proceduresTotalCount || 0}`,
        'Submitted By': report.submittedByName || '',
        'Submitted At': report.submittedAt ? format(new Date(report.submittedAt), "yyyy-MM-dd HH:mm") : '-',
        'Performance Summary': report.performanceSummary || '-',
        'Overall Rating': report.overallRating || '-',
        'Has Customer Concerns': report.hasCustomerConcerns ? 'Yes' : 'No',
        'Customer Concerns Summary': report.customerConcernsSummary || '-'
      };
    });

    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Daily Reports");
      
      const dateStr = format(new Date(), "yyyy-MM-dd");
      XLSX.writeFile(wb, `daily-reports-export-${dateStr}.xlsx`);
      toast({ title: "Export complete", description: `Exported ${filteredReports.length} reports` });
    }).catch(() => {
      toast({ title: "Export failed", variant: "destructive" });
    });
  };

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
              variant="outline" 
              size="sm" 
              onClick={() => setLocation("/")}
              data-testid="button-return-hub"
            >
              <Home className="h-4 w-4 mr-2" />
              Return to Hub
            </Button>
            <div className="flex items-center gap-2">
              <img src={dailyReportIcon} alt="Daily Reports" className="h-8 w-8 object-contain" />
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
            <TabsTrigger value="fields" data-testid="tab-fields">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Report Fields
            </TabsTrigger>
            <TabsTrigger value="docs" data-testid="tab-docs">
              <BookOpen className="h-4 w-4 mr-2" />
              Documentation
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
                    {sortedTemplates.map(t => (
                      <SelectItem key={t.department} value={t.department}>
                        {t.departmentLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedTemplates.map(template => {
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
                          {statusLabels[report.status] || report.status}
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
                                <span className="font-medium">{report.metrics ? (report.metrics as any)[m.key] || 0 : 0}</span>
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
            <Card className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                  </h3>
                  <div className="flex items-center gap-2">
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                        <X className="h-4 w-4 mr-1" />
                        Clear Filters
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={exportToExcel} data-testid="button-export-excel">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export to Excel
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search reports..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                        data-testid="input-search-reports"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Department</Label>
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                      <SelectTrigger data-testid="select-filter-department">
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {sortedTemplates.map(t => (
                          <SelectItem key={t.department} value={t.department}>
                            {t.departmentLabel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Staff Member</Label>
                    <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                      <SelectTrigger data-testid="select-filter-staff">
                        <SelectValue placeholder="All Staff" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Staff</SelectItem>
                        {uniqueStaffMembers.map(name => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">From Date</Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      data-testid="input-date-from"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">To Date</Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      data-testid="input-date-to"
                    />
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Showing {filteredReports.length} of {reports.length} reports
                  {hasActiveFilters && " (filtered)"}
                </div>
              </div>
            </Card>

            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <table className="w-full">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th 
                          className="text-left p-3 font-medium cursor-pointer hover:bg-muted/80 select-none"
                          onClick={() => handleSort('department')}
                          data-testid="th-sort-department"
                        >
                          <div className="flex items-center">
                            Department
                            <SortIcon field="department" />
                          </div>
                        </th>
                        <th 
                          className="text-left p-3 font-medium cursor-pointer hover:bg-muted/80 select-none"
                          onClick={() => handleSort('reportDate')}
                          data-testid="th-sort-date"
                        >
                          <div className="flex items-center">
                            Date
                            <SortIcon field="reportDate" />
                          </div>
                        </th>
                        <th 
                          className="text-left p-3 font-medium cursor-pointer hover:bg-muted/80 select-none"
                          onClick={() => handleSort('status')}
                          data-testid="th-sort-status"
                        >
                          <div className="flex items-center">
                            Status
                            <SortIcon field="status" />
                          </div>
                        </th>
                        <th 
                          className="text-left p-3 font-medium cursor-pointer hover:bg-muted/80 select-none"
                          onClick={() => handleSort('incidents')}
                          data-testid="th-sort-incidents"
                        >
                          <div className="flex items-center">
                            Incidents
                            <SortIcon field="incidents" />
                          </div>
                        </th>
                        <th 
                          className="text-left p-3 font-medium cursor-pointer hover:bg-muted/80 select-none"
                          onClick={() => handleSort('procedures')}
                          data-testid="th-sort-procedures"
                        >
                          <div className="flex items-center">
                            Procedures
                            <SortIcon field="procedures" />
                          </div>
                        </th>
                        <th 
                          className="text-left p-3 font-medium cursor-pointer hover:bg-muted/80 select-none"
                          onClick={() => handleSort('submittedBy')}
                          data-testid="th-sort-submitted-by"
                        >
                          <div className="flex items-center">
                            Submitted By
                            <SortIcon field="submittedBy" />
                          </div>
                        </th>
                        <th 
                          className="text-left p-3 font-medium"
                          data-testid="th-source"
                        >
                          Source
                        </th>
                        <th className="text-right p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReports.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center p-8 text-muted-foreground">
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
                                  {statusLabels[report.status] || report.status}
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
                                {report.submittedByName || ""}
                              </td>
                              <td className="p-3">
                                <Badge 
                                  variant="outline" 
                                  className={report.source === 'qr_form' 
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' 
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'}
                                  data-testid={`badge-source-${report.id}`}
                                >
                                  {report.source === 'qr_form' ? 'QR Form' : 'Admin'}
                                </Badge>
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
                                    
                                    {/* Edit available for draft, submitted, and needs_revision */}
                                    {(report.status === "draft" || report.status === "submitted" || report.status === "needs_revision") && (
                                      <DropdownMenuItem onClick={() => handleEditReport(report)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit Report
                                      </DropdownMenuItem>
                                    )}
                                    
                                    <DropdownMenuSeparator />
                                    
                                    {/* Submit for draft reports */}
                                    {report.status === "draft" && (
                                      <DropdownMenuItem onClick={() => submitReportMutation.mutate(report.id)}>
                                        <Send className="h-4 w-4 mr-2" />
                                        Submit for Review
                                      </DropdownMenuItem>
                                    )}
                                    
                                    {/* Resubmit for needs_revision reports */}
                                    {report.status === "needs_revision" && (
                                      <DropdownMenuItem onClick={() => submitReportMutation.mutate(report.id)}>
                                        <Send className="h-4 w-4 mr-2" />
                                        Resubmit for Review
                                      </DropdownMenuItem>
                                    )}
                                    
                                    {/* Mark reviewed for submitted OR needs_revision reports */}
                                    {(report.status === "submitted" || report.status === "needs_revision") && (
                                      <DropdownMenuItem onClick={() => reviewReportMutation.mutate({ id: report.id, approved: true })}>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Mark as Reviewed
                                      </DropdownMenuItem>
                                    )}
                                    
                                    {/* Request revision for submitted reports */}
                                    {report.status === "submitted" && (
                                      <DropdownMenuItem onClick={() => {
                                        setReportForRevision(report);
                                        setIsRevisionRequestDialogOpen(true);
                                      }}>
                                        <RotateCcw className="h-4 w-4 mr-2" />
                                        Request Revision
                                      </DropdownMenuItem>
                                    )}
                                    
                                    {/* Reopen reviewed reports */}
                                    {report.status === "reviewed" && (
                                      <DropdownMenuItem onClick={() => {
                                        if (confirm("Reopen this report for editing?")) {
                                          reopenReportMutation.mutate(report.id);
                                        }
                                      }}>
                                        <RotateCcw className="h-4 w-4 mr-2" />
                                        Reopen Report
                                      </DropdownMenuItem>
                                    )}
                                    
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      className="text-destructive"
                                      onClick={() => {
                                        if (confirm("Are you sure you want to delete this report? This cannot be undone.")) {
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
                {unresolvedIncidentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : unresolvedIncidents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No unresolved incidents</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {unresolvedIncidents.map((incident) => (
                      <div
                        key={incident.id}
                        className={`p-4 rounded-lg border ${
                          incident.severity === 'high' 
                            ? 'border-destructive/50 bg-destructive/5' 
                            : incident.severity === 'medium'
                            ? 'border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20'
                            : 'border-border bg-muted/30'
                        }`}
                        data-testid={`incident-card-${incident.id}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge 
                                variant={incident.severity === 'high' ? 'destructive' : incident.severity === 'medium' ? 'outline' : 'secondary'}
                                className="text-xs"
                              >
                                {incident.severity}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {incident.incidentType}
                              </Badge>
                              {incident.requiresFollowUp && (
                                <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                                  Follow-up Required
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm mt-2">{incident.description}</p>
                            {incident.followUpNotes && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Notes: {incident.followUpNotes}
                              </p>
                            )}
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="text-xs text-muted-foreground text-right">
                              {incident.createdAt && format(new Date(incident.createdAt), 'MMM d, h:mm a')}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-incident-menu-${incident.id}`}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setManagingIncident(incident);
                                    setIsIncidentManageDialogOpen(true);
                                  }}
                                  data-testid={`menu-manage-incident-${incident.id}`}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setManagingIncident(incident);
                                    setIsIncidentManageDialogOpen(true);
                                  }}
                                  data-testid={`menu-add-note-incident-${incident.id}`}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  Add Note
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => resolveIncidentMutation.mutate(incident.id)}
                                  className="text-green-600"
                                  data-testid={`menu-resolve-incident-${incident.id}`}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark Resolved
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="departments" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <div className="flex items-center gap-3">
                  <QrCode className="h-5 w-5 text-amber-500" />
                  <div>
                    <CardTitle className="text-base">Staff Portal</CardTitle>
                    <CardDescription>
                      Unified portal for both Daily Reports and Daily Procedures
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={copyGlobalUrlToClipboard}
                    data-testid="button-copy-global-url"
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy URL
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => setShowGlobalQrCode(true)}
                    data-testid="button-show-global-qr"
                  >
                    <QrCode className="h-4 w-4 mr-1" />
                    View QR
                  </Button>
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle>Department Templates</CardTitle>
                  <CardDescription>
                    Configure fields, email notifications, access codes, and procedures for each department
                  </CardDescription>
                </div>
                <Button onClick={() => setIsNewDepartmentDialogOpen(true)} data-testid="button-create-department">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Department
                </Button>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="space-y-2">
                  {sortedTemplates.map(template => {
                    const Icon = departmentIcons[template.department] || Building;
                    const emailCount = template.notificationEmails?.length || 0;
                    const deptAccessCodes = accessCodes.filter(c => c.department === template.department);
                    const procedures = getProceduresForDepartment(template.department);
                    const openingProcs = procedures.filter(p => p.procedureType === 'opening');
                    const closingProcs = procedures.filter(p => p.procedureType === 'closing');
                    const generalProcs = procedures.filter(p => p.procedureType === 'general');
                    
                    return (
                      <AccordionItem 
                        key={template.id} 
                        value={template.id}
                        className="border rounded-lg px-4"
                        data-testid={`card-template-${template.department}`}
                      >
                        <AccordionTrigger className="hover:no-underline py-4">
                          <div className="flex items-center gap-3 flex-1">
                            <Icon className="h-5 w-5 text-amber-500" />
                            <div className="text-left">
                              <div className="font-medium">{template.departmentLabel}</div>
                              <div className="text-sm text-muted-foreground">
                                {(allFieldAssignments[template.id] || []).filter(a => a.isEnabled).length} fields, {procedures.length} procedures, {deptAccessCodes.length} access code{deptAccessCodes.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 mr-2" onClick={(e) => e.stopPropagation()}>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewingTemplate(template);
                              }}
                              title="Preview"
                              data-testid={`button-preview-template-${template.department}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDuplicatingTemplate(template);
                                setDuplicateFormData({
                                  departmentLabel: `${template.departmentLabel} (Copy)`,
                                  departmentKey: `${template.department}-copy`,
                                  copyProcedures: true,
                                  copyAccessCodes: false
                                });
                              }}
                              title="Duplicate"
                              data-testid={`button-duplicate-template-${template.department}`}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditDepartment(template);
                              }}
                              title="Edit"
                              data-testid={`button-edit-template-${template.department}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pb-4">
                          <div className="border-b pb-3">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-medium flex items-center gap-2">
                                <Settings className="h-4 w-4 text-muted-foreground" />
                                Report Fields
                                <span className="text-xs text-muted-foreground font-normal">
                                  ({(allFieldAssignments[template.id] || []).filter(a => a.isEnabled).length} of {(allFieldAssignments[template.id] || []).length} enabled)
                                </span>
                              </h4>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    batchToggleMetricsMutation.mutate({
                                      templateId: template.id,
                                      enableAll: false
                                    });
                                  }}
                                  disabled={batchToggleMetricsMutation.isPending || toggleMetricMutation.isPending || (allFieldAssignments[template.id] || []).every(a => !a.isEnabled)}
                                  data-testid={`button-clear-all-fields-${template.department}`}
                                >
                                  Clear All
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    batchToggleMetricsMutation.mutate({
                                      templateId: template.id,
                                      enableAll: true
                                    });
                                  }}
                                  disabled={batchToggleMetricsMutation.isPending || toggleMetricMutation.isPending || (allFieldAssignments[template.id] || []).every(a => a.isEnabled)}
                                  data-testid={`button-enable-all-fields-${template.department}`}
                                >
                                  Enable All
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {(allFieldAssignments[template.id] || []).sort((a, b) => a.sortOrder - b.sortOrder).map(assignment => (
                                <div 
                                  key={assignment.fieldDefinitionId} 
                                  className="flex items-center gap-2 p-2 rounded-md hover-elevate"
                                  data-testid={`metric-toggle-${template.department}-${assignment.fieldDefinition?.key}`}
                                >
                                  <Checkbox
                                    checked={assignment.isEnabled}
                                    onCheckedChange={(checked) => {
                                      toggleMetricMutation.mutate({
                                        templateId: template.id,
                                        fieldDefinitionId: assignment.fieldDefinitionId,
                                        isEnabled: !!checked
                                      });
                                    }}
                                    disabled={toggleMetricMutation.isPending}
                                    data-testid={`checkbox-metric-${assignment.fieldDefinition?.key}`}
                                  />
                                  <span className={`text-sm flex-1 ${!assignment.isEnabled ? 'text-muted-foreground line-through' : ''}`}>
                                    {assignment.fieldDefinition?.label || 'Unknown Field'}
                                  </span>
                                  {assignment.isEnabled && (
                                    <Input
                                      type="number"
                                      min="0"
                                      value={
                                        editingSortOrder?.fieldId === assignment.fieldDefinitionId && 
                                        editingSortOrder?.templateId === template.id
                                          ? editingSortOrder.value
                                          : assignment.sortOrder
                                      }
                                      onChange={(e) => {
                                        setEditingSortOrder({
                                          fieldId: assignment.fieldDefinitionId,
                                          templateId: template.id,
                                          value: e.target.value
                                        });
                                      }}
                                      onFocus={(e) => {
                                        e.target.select();
                                        setEditingSortOrder({
                                          fieldId: assignment.fieldDefinitionId,
                                          templateId: template.id,
                                          value: String(assignment.sortOrder)
                                        });
                                      }}
                                      onBlur={() => {
                                        if (editingSortOrder && 
                                            editingSortOrder.fieldId === assignment.fieldDefinitionId &&
                                            editingSortOrder.templateId === template.id) {
                                          const newOrder = parseInt(editingSortOrder.value) || 0;
                                          if (newOrder !== assignment.sortOrder) {
                                            updateFieldSortOrderMutation.mutate({
                                              templateId: template.id,
                                              fieldDefinitionId: assignment.fieldDefinitionId,
                                              sortOrder: newOrder
                                            });
                                          }
                                          setEditingSortOrder(null);
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.currentTarget.blur();
                                        } else if (e.key === 'Escape') {
                                          setEditingSortOrder(null);
                                          e.currentTarget.blur();
                                        }
                                      }}
                                      className="w-16 h-7 text-center text-sm"
                                      disabled={updateFieldSortOrderMutation.isPending}
                                      data-testid={`input-sort-order-${assignment.fieldDefinition?.key}`}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>Notification Emails</span>
                              </div>
                              {inlineEditingEmailsTemplateId !== template.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStartInlineEmailEdit(template)}
                                  data-testid={`button-edit-emails-${template.department}`}
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                              )}
                            </div>
                            
                            {inlineEditingEmailsTemplateId === template.id ? (
                              <div className="space-y-2 pl-6">
                                <Textarea
                                  placeholder="Enter email addresses separated by commas&#10;e.g., manager@company.com, supervisor@company.com"
                                  value={inlineEmailsText}
                                  onChange={(e) => setInlineEmailsText(e.target.value)}
                                  className="min-h-[80px] resize-none text-sm"
                                  data-testid={`input-inline-emails-${template.department}`}
                                />
                                <p className="text-xs text-muted-foreground">
                                  Separate multiple emails with commas
                                </p>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveInlineEmails(template.id)}
                                    disabled={updateDepartmentMutation.isPending}
                                    data-testid={`button-save-emails-${template.department}`}
                                  >
                                    {updateDepartmentMutation.isPending ? "Saving..." : "Save"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancelInlineEmailEdit}
                                    disabled={updateDepartmentMutation.isPending}
                                    data-testid={`button-cancel-emails-${template.department}`}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground pl-6">
                                {emailCount === 0 
                                  ? "None configured" 
                                  : (template.notificationEmails || []).map(e => e.email).join(', ')}
                              </div>
                            )}
                          </div>
                          
                          <div className="border-t pt-3">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-medium flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                                Procedure Checklist
                              </h4>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddProcedureTemplate(template.department)}
                                data-testid={`button-add-procedure-${template.department}`}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Procedure
                              </Button>
                            </div>
                            
                            {procedures.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                No procedures configured. Click "Add Procedure" to create checklists.
                              </p>
                            ) : (
                              <div className="space-y-3">
                                {openingProcs.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge className={procedureTypeColors.opening}>Opening</Badge>
                                      <span className="text-xs text-muted-foreground">{openingProcs.length} procedure{openingProcs.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    <div className="space-y-1">
                                      {openingProcs.map(proc => (
                                        <div key={proc.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm group" data-testid={`procedure-${proc.id}`}>
                                          <div className="flex items-center gap-2">
                                            <span className={!proc.isActive ? "text-muted-foreground line-through" : ""}>
                                              {proc.procedureName}
                                            </span>
                                            {proc.isRequired && <Badge variant="outline" className="text-xs">Required</Badge>}
                                            {!proc.isActive && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                                          </div>
                                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditProcedureTemplate(proc)}>
                                              <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteProcedureTemplate(proc.id)}>
                                              <Trash2 className="h-3 w-3 text-destructive" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {closingProcs.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge className={procedureTypeColors.closing}>Closing</Badge>
                                      <span className="text-xs text-muted-foreground">{closingProcs.length} procedure{closingProcs.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    <div className="space-y-1">
                                      {closingProcs.map(proc => (
                                        <div key={proc.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm group" data-testid={`procedure-${proc.id}`}>
                                          <div className="flex items-center gap-2">
                                            <span className={!proc.isActive ? "text-muted-foreground line-through" : ""}>
                                              {proc.procedureName}
                                            </span>
                                            {proc.isRequired && <Badge variant="outline" className="text-xs">Required</Badge>}
                                            {!proc.isActive && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                                          </div>
                                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditProcedureTemplate(proc)}>
                                              <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteProcedureTemplate(proc.id)}>
                                              <Trash2 className="h-3 w-3 text-destructive" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {generalProcs.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge className={procedureTypeColors.general}>General</Badge>
                                      <span className="text-xs text-muted-foreground">{generalProcs.length} procedure{generalProcs.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    <div className="space-y-1">
                                      {generalProcs.map(proc => (
                                        <div key={proc.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm group" data-testid={`procedure-${proc.id}`}>
                                          <div className="flex items-center gap-2">
                                            <span className={!proc.isActive ? "text-muted-foreground line-through" : ""}>
                                              {proc.procedureName}
                                            </span>
                                            {proc.isRequired && <Badge variant="outline" className="text-xs">Required</Badge>}
                                            {!proc.isActive && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                                          </div>
                                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditProcedureTemplate(proc)}>
                                              <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteProcedureTemplate(proc.id)}>
                                              <Trash2 className="h-3 w-3 text-destructive" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="border-t pt-3">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-medium flex items-center gap-2">
                                <QrCode className="h-4 w-4 text-muted-foreground" />
                                Staff Access Codes
                                <span className="text-xs text-muted-foreground font-normal">
                                  ({deptAccessCodes.length} code{deptAccessCodes.length !== 1 ? 's' : ''})
                                </span>
                              </h4>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingAccessCode(null);
                                  resetAccessCodeForm();
                                  setAccessCodeFormData(prev => ({ ...prev, department: template.department }));
                                  setIsAccessCodeDialogOpen(true);
                                }}
                                data-testid={`button-add-access-code-${template.department}`}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Code
                              </Button>
                            </div>
                            
                            {deptAccessCodes.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                No access codes. Add codes to allow staff to submit reports via QR code.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {deptAccessCodes.map(code => (
                                  <div 
                                    key={code.id} 
                                    className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm group"
                                    data-testid={`access-code-${code.id}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="font-mono font-bold bg-background px-2 py-0.5 rounded border">{code.code}</span>
                                      <span className={!code.isActive ? "text-muted-foreground line-through" : ""}>
                                        {code.staffName}
                                      </span>
                                      {!code.isActive && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleShowQrCode(code)} title="Show QR">
                                        <QrCode className="h-3 w-3" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyCodeToClipboard(code.code)} title="Copy Code">
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditAccessCode(code)} title="Edit">
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteAccessCode(code.id)} title="Delete">
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fields" className="space-y-4">
            <ReportFieldsTab />
          </TabsContent>

          <TabsContent value="docs">
            <Card>
              <CardContent className="p-6">
                <ModuleDocumentation documentation={getModuleDocs("daily-reports")!} />
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
                  onValueChange={(v) => setReportFormData({ ...reportFormData, department: v, staffName: "", metrics: {} })}
                  disabled={!!editingReport}
                >
                  <SelectTrigger id="report-department" data-testid="select-report-department">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedTemplates.map(t => (
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
            
            {/* Staff member - read-only when editing, dropdown when creating */}
            {reportFormData.department && (
              <div className="space-y-2">
                <Label htmlFor="report-staff">Staff Member Filing Report</Label>
                {editingReport ? (
                  <Input
                    id="report-staff"
                    value={reportFormData.staffName || ""}
                    disabled
                    className="bg-muted"
                    data-testid="input-report-staff-readonly"
                  />
                ) : (
                  <Select 
                    value={reportFormData.staffName || "_empty"} 
                    onValueChange={(v) => setReportFormData({ ...reportFormData, staffName: v === "_empty" ? "" : v })}
                  >
                    <SelectTrigger id="report-staff" data-testid="select-report-staff">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_empty">
                        <span className="text-muted-foreground italic">None selected</span>
                      </SelectItem>
                      {accessCodes
                        .filter(ac => ac.department === reportFormData.department && ac.isActive)
                        .map(ac => (
                          <SelectItem key={ac.id} value={ac.staffName}>
                            {ac.staffName}
                          </SelectItem>
                        ))
                      }
                      {accessCodes.filter(ac => ac.department === reportFormData.department && ac.isActive).length === 0 && (
                        <SelectItem value="_none" disabled>
                          No staff registered for this department
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
                {!editingReport && (
                  <p className="text-xs text-muted-foreground">
                    Select the staff member who is submitting this report. Add staff in the Departments tab.
                  </p>
                )}
              </div>
            )}

            {selectedTemplate && (
              <div className="space-y-4">
                <div className="border-t pt-4">
                  <Label className="text-base font-medium">Daily Metrics</Label>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    {/* Use enabled fields from junction table assignments */}
                    {(allFieldAssignments[selectedTemplate.id] || [])
                      .filter(a => a.isEnabled && a.fieldDefinition?.isActive)
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map(assignment => {
                        const metric = assignment.fieldDefinition;
                        if (!metric) return null;
                        return (
                          <div key={metric.key} className="space-y-2">
                            <Label htmlFor={`metric-${metric.key}`}>{metric.label}</Label>
                            <Input
                              id={`metric-${metric.key}`}
                              type={metric.type === "text" ? "text" : "number"}
                              step="1"
                              value={reportFormData.metrics[metric.key] || ""}
                              onChange={(e) => setReportFormData({
                                ...reportFormData,
                                metrics: { ...reportFormData.metrics, [metric.key]: e.target.value }
                              })}
                              placeholder={metric.type === "text" ? `Enter ${metric.label.toLowerCase()}...` : "0"}
                              data-testid={`input-metric-${metric.key}`}
                            />
                          </div>
                        );
                      })}
                  </div>
                  {(allFieldAssignments[selectedTemplate.id] || []).filter(a => a.isEnabled).length === 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      No fields configured for this department. Configure fields in the Departments tab.
                    </p>
                  )}
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
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="ghost" 
              onClick={clearReportFields}
              disabled={!reportFormData.department}
              className="sm:mr-auto"
              data-testid="button-clear-fields"
            >
              <X className="h-4 w-4 mr-2" />
              Clear All Fields
            </Button>
            <div className="flex gap-2 flex-wrap justify-end">
              <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="secondary"
                onClick={handleSaveReport}
                disabled={!reportFormData.department || createReportMutation.isPending || updateReportMutation.isPending || createAndSubmitReportMutation.isPending || updateAndSubmitReportMutation.isPending}
                data-testid="button-save-report"
              >
                <Save className="h-4 w-4 mr-2" />
                {createReportMutation.isPending || updateReportMutation.isPending ? "Saving..." : "Save as Draft"}
              </Button>
              <Button 
                onClick={handleSaveAndSubmitReport}
                disabled={!reportFormData.department || createReportMutation.isPending || updateReportMutation.isPending || createAndSubmitReportMutation.isPending || updateAndSubmitReportMutation.isPending}
                data-testid="button-save-and-submit-report"
              >
                <Send className="h-4 w-4 mr-2" />
                {createAndSubmitReportMutation.isPending || updateAndSubmitReportMutation.isPending ? "Submitting..." : "Save & Submit"}
              </Button>
            </div>
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
                  {statusLabels[selectedReport.status] || selectedReport.status}
                </Badge>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Edit button for draft, submitted, needs_revision */}
                  {(selectedReport.status === "draft" || selectedReport.status === "submitted" || selectedReport.status === "needs_revision") && (
                    <Button size="sm" variant="outline" onClick={() => {
                      setIsViewReportDialogOpen(false);
                      handleEditReport(selectedReport);
                    }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                  
                  {/* Submit for draft */}
                  {selectedReport.status === "draft" && (
                    <Button size="sm" onClick={() => {
                      submitReportMutation.mutate(selectedReport.id);
                      setIsViewReportDialogOpen(false);
                    }}>
                      <Send className="h-4 w-4 mr-2" />
                      Submit
                    </Button>
                  )}
                  
                  {/* Resubmit for needs_revision */}
                  {selectedReport.status === "needs_revision" && (
                    <Button size="sm" onClick={() => {
                      submitReportMutation.mutate(selectedReport.id);
                      setIsViewReportDialogOpen(false);
                    }}>
                      <Send className="h-4 w-4 mr-2" />
                      Resubmit
                    </Button>
                  )}
                  
                  {/* Approve for submitted or needs_revision */}
                  {(selectedReport.status === "submitted" || selectedReport.status === "needs_revision") && (
                    <Button size="sm" onClick={() => {
                      reviewReportMutation.mutate({ id: selectedReport.id, approved: true });
                      setIsViewReportDialogOpen(false);
                    }}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  )}
                  
                  {/* Request revision for submitted */}
                  {selectedReport.status === "submitted" && (
                    <Button size="sm" variant="outline" onClick={() => {
                      setReportForRevision(selectedReport);
                      setIsRevisionRequestDialogOpen(true);
                    }} data-testid="button-request-revision">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Request Revision
                    </Button>
                  )}
                  
                  {/* Reopen for reviewed */}
                  {selectedReport.status === "reviewed" && (
                    <Button size="sm" variant="outline" onClick={() => {
                      if (confirm("Reopen this report for editing?")) {
                        reopenReportMutation.mutate(selectedReport.id);
                        setIsViewReportDialogOpen(false);
                      }
                    }}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reopen
                    </Button>
                  )}
                </div>
              </div>

              {/* Report metadata - submitted by, source, rating */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-b pb-4">
                <div>
                  <div className="text-sm text-muted-foreground">Submitted By</div>
                  <div className="font-medium">{selectedReport.submittedByName || "—"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Source</div>
                  <div className="font-medium">
                    {selectedReport.source === 'qr_form' ? (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">QR Form</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Admin</Badge>
                    )}
                  </div>
                </div>
                {selectedReport.overallRating && (
                  <div>
                    <div className="text-sm text-muted-foreground">Overall Rating</div>
                    <div className="font-medium flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className={star <= selectedReport.overallRating! ? "text-yellow-500" : "text-gray-300"}>
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedReport.hasCustomerConcerns && (
                  <div>
                    <div className="text-sm text-muted-foreground">Customer Concerns</div>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Yes</Badge>
                  </div>
                )}
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(allFieldAssignments[selectedReport.templateId] || [])
                  .filter(a => a.isEnabled && a.fieldDefinition?.isActive)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map(assignment => {
                    const metric = assignment.fieldDefinition;
                    if (!metric) return null;
                    return (
                      <div key={metric.key} className="bg-muted rounded-lg p-3">
                        <div className="text-sm text-muted-foreground">{metric.label}</div>
                        <div className="text-2xl font-bold">
                          {selectedReport.metricsData ? (selectedReport.metricsData as any)[metric.key] || (metric.type === 'text' ? '—' : 0) : (metric.type === 'text' ? '—' : 0)}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Summary sections - shows both admin fields and QR form fields */}
              {(selectedReport.performanceSummary || selectedReport.customerServiceSummary || selectedReport.customerConcernsSummary || selectedReport.operationalNotes || selectedReport.staffingNotes) && (
                <div className="space-y-4">
                  {selectedReport.performanceSummary && (
                    <div>
                      <Label className="text-sm font-medium">Performance Summary</Label>
                      <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{selectedReport.performanceSummary}</p>
                    </div>
                  )}
                  {selectedReport.customerConcernsSummary && (
                    <div>
                      <Label className="text-sm font-medium">Customer Concerns Details</Label>
                      <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{selectedReport.customerConcernsSummary}</p>
                    </div>
                  )}
                  {selectedReport.customerServiceSummary && selectedReport.customerServiceSummary !== selectedReport.performanceSummary && (
                    <div>
                      <Label className="text-sm font-medium">Customer Service Summary</Label>
                      <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{selectedReport.customerServiceSummary}</p>
                    </div>
                  )}
                  {selectedReport.operationalNotes && (
                    <div>
                      <Label className="text-sm font-medium">Operational Notes</Label>
                      <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{selectedReport.operationalNotes}</p>
                    </div>
                  )}
                  {selectedReport.staffingNotes && (
                    <div>
                      <Label className="text-sm font-medium">Staffing Notes</Label>
                      <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{selectedReport.staffingNotes}</p>
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
                            <div className="flex items-center gap-2">
                              {incident.requiresFollowUp && (
                                <Badge variant="outline" className="text-orange-600">
                                  Follow-up Required
                                </Badge>
                              )}
                              {incident.resolved && (
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  Resolved
                                </Badge>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-report-incident-menu-${incident.id}`}>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setManagingIncident(incident);
                                      setIsIncidentManageDialogOpen(true);
                                    }}
                                    data-testid={`menu-view-report-incident-${incident.id}`}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setManagingIncident(incident);
                                      setIsIncidentManageDialogOpen(true);
                                    }}
                                    data-testid={`menu-add-note-report-incident-${incident.id}`}
                                  >
                                    <FileText className="h-4 w-4 mr-2" />
                                    Add Note
                                  </DropdownMenuItem>
                                  {!incident.resolved && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        onClick={() => resolveIncidentMutation.mutate(incident.id)}
                                        className="text-green-600"
                                        data-testid={`menu-resolve-report-incident-${incident.id}`}
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Mark Resolved
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
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
                  <div className="space-y-4 mt-3">
                    {(() => {
                      const openingProcs = procedureTemplates.filter(p => p.procedureType === 'opening');
                      const closingProcs = procedureTemplates.filter(p => p.procedureType === 'closing');
                      const generalProcs = procedureTemplates.filter(p => p.procedureType === 'general' || !p.procedureType);
                      
                      const getCompletionCount = (procs: typeof procedureTemplates) => {
                        return procs.filter(p => selectedReportProcedures.find(c => c.procedureTemplateId === p.id)?.completed).length;
                      };
                      
                      const renderProcedureGroup = (procs: typeof procedureTemplates, label: string, colorClass: string) => {
                        if (procs.length === 0) return null;
                        const completedCount = getCompletionCount(procs);
                        return (
                          <div key={label} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className={colorClass}>{label}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {completedCount}/{procs.length} completed
                              </span>
                            </div>
                            <div className="space-y-1 pl-1">
                              {procs.map(proc => {
                                const completion = selectedReportProcedures.find(c => c.procedureTemplateId === proc.id);
                                return (
                                  <div key={proc.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted" data-testid={`procedure-item-${proc.id}`}>
                                    <Checkbox
                                      checked={completion?.completed || false}
                                      onCheckedChange={(checked) => {
                                        updateProceduresMutation.mutate({
                                          reportId: selectedReport.id,
                                          completions: [{ procedureId: proc.id, completed: checked === true }]
                                        });
                                      }}
                                      data-testid={`checkbox-procedure-${proc.id}`}
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
                          </div>
                        );
                      };
                      
                      return (
                        <>
                          {renderProcedureGroup(openingProcs, "Opening", procedureTypeColors.opening)}
                          {renderProcedureGroup(closingProcs, "Closing", procedureTypeColors.closing)}
                          {renderProcedureGroup(generalProcs, "General", procedureTypeColors.general)}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {selectedReportRevisionRequests.length > 0 && (
                <div className="border-t pt-4">
                  <Label className="text-base font-medium">
                    Revision Requests ({selectedReportRevisionRequests.length})
                  </Label>
                  <div className="space-y-3 mt-3">
                    {selectedReportRevisionRequests.map(request => (
                      <Card key={request.id} data-testid={`revision-request-${request.id}`}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <RotateCcw className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {request.requestedByName || 'Admin'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(request.createdAt), "MMM d, yyyy 'at' h:mm a")}
                              </span>
                            </div>
                            <Badge 
                              className={
                                request.status === 'pending' 
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                                  : request.status === 'addressed'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                              }
                            >
                              {request.status === 'pending' ? 'Pending' : request.status === 'addressed' ? 'Addressed' : request.status}
                            </Badge>
                          </div>
                          <div className="pl-6">
                            <p className="text-sm text-muted-foreground mb-2">{request.requestMessage}</p>
                            {request.responseMessage && (
                              <div className="mt-2 p-2 bg-muted/50 rounded-md">
                                <div className="flex items-center gap-2 mb-1">
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                  <span className="text-xs font-medium">
                                    Response from {request.respondedByName || 'Submitter'}
                                  </span>
                                  {request.respondedAt && (
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(request.respondedAt), "MMM d 'at' h:mm a")}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{request.responseMessage}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

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

      {/* Incident Management Dialog */}
      <Dialog 
        open={isIncidentManageDialogOpen} 
        onOpenChange={(open) => {
          setIsIncidentManageDialogOpen(open);
          if (!open) {
            setManagingIncident(null);
            setNewIncidentNote("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Incident Details
            </DialogTitle>
            <DialogDescription>
              View incident details, add notes, and manage resolution
            </DialogDescription>
          </DialogHeader>
          
          {managingIncident && (
            <div className="space-y-4">
              {/* Incident Summary */}
              <div className={`p-4 rounded-lg border ${
                managingIncident.severity === 'high' 
                  ? 'border-destructive/50 bg-destructive/5' 
                  : managingIncident.severity === 'medium'
                  ? 'border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20'
                  : 'border-border bg-muted/30'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge 
                    variant={managingIncident.severity === 'high' ? 'destructive' : managingIncident.severity === 'medium' ? 'outline' : 'secondary'}
                    className="text-xs"
                  >
                    {managingIncident.severity}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {incidentTypes.find(t => t.value === managingIncident.incidentType)?.label || managingIncident.incidentType}
                  </Badge>
                  {managingIncident.resolved && (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
                      Resolved
                    </Badge>
                  )}
                </div>
                <p className="text-sm">{managingIncident.description}</p>
                {managingIncident.actionTaken && (
                  <p className="text-sm mt-2 text-muted-foreground">
                    <strong>Action Taken:</strong> {managingIncident.actionTaken}
                  </p>
                )}
                <div className="mt-2 text-xs text-muted-foreground">
                  Reported {managingIncident.createdAt && formatDistanceToNow(new Date(managingIncident.createdAt), { addSuffix: true })}
                  {managingIncident.reportedByName && ` by ${managingIncident.reportedByName}`}
                </div>
              </div>

              {/* Notes Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Notes & Updates</Label>
                </div>
                
                <ScrollArea className="h-40 rounded-md border p-3">
                  {incidentNotesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : incidentNotes.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No notes yet. Add a note below to track updates.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {incidentNotes.map((note) => (
                        <div key={note.id} className="border-l-2 border-muted-foreground/30 pl-3 py-1">
                          <p className="text-sm">{note.note}</p>
                          <div className="text-xs text-muted-foreground mt-1">
                            {note.addedByName || "System"} • {note.createdAt && formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Add Note Form */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Add a note or update..."
                      value={newIncidentNote}
                      onChange={(e) => setNewIncidentNote(e.target.value)}
                      rows={2}
                      className="flex-1"
                      data-testid="textarea-new-incident-note"
                    />
                    <Button
                      size="icon"
                      onClick={() => {
                        if (newIncidentNote.trim() && managingIncident) {
                          addIncidentNoteMutation.mutate({
                            incidentId: managingIncident.id,
                            note: newIncidentNote.trim()
                          });
                        }
                      }}
                      disabled={!newIncidentNote.trim() || addIncidentNoteMutation.isPending}
                      data-testid="button-add-incident-note"
                    >
                      {addIncidentNoteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsIncidentManageDialogOpen(false);
                setManagingIncident(null);
                setNewIncidentNote("");
              }}
            >
              Close
            </Button>
            {managingIncident && !managingIncident.resolved && (
              <Button
                onClick={() => {
                  if (managingIncident) {
                    resolveIncidentMutation.mutate(managingIncident.id);
                  }
                }}
                disabled={resolveIncidentMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-resolve-incident-dialog"
              >
                {resolveIncidentMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Resolving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Resolved
                  </>
                )}
              </Button>
            )}
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
                  {sortedTemplates.map(t => (
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

      <Dialog open={isAccessCodeDialogOpen} onOpenChange={setIsAccessCodeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAccessCode ? "Edit Access Code" : "Create Access Code"}</DialogTitle>
            <DialogDescription>
              {editingAccessCode 
                ? "Update the staff member's information for this access code"
                : "Create a new access code for a staff member to submit daily reports"
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code-department">Department</Label>
              <Select 
                value={accessCodeFormData.department} 
                onValueChange={(v) => setAccessCodeFormData({ ...accessCodeFormData, department: v })}
              >
                <SelectTrigger id="code-department" data-testid="select-code-department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {sortedTemplates.map(t => (
                    <SelectItem key={t.department} value={t.department}>
                      {t.departmentLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="code-staff-name">Staff Name</Label>
              <Input
                id="code-staff-name"
                type="text"
                placeholder="John Smith"
                value={accessCodeFormData.staffName}
                onChange={(e) => setAccessCodeFormData({ ...accessCodeFormData, staffName: e.target.value })}
                data-testid="input-staff-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code-value">Access Code (4 digits)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="code-value"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="Leave empty to auto-generate"
                  value={accessCodeFormData.code}
                  onChange={(e) => setAccessCodeFormData({ ...accessCodeFormData, code: e.target.value.replace(/\D/g, "") })}
                  className="font-mono text-lg tracking-widest"
                  data-testid="input-code-value"
                />
                {accessCodeFormData.code && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => copyCodeToClipboard(accessCodeFormData.code)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Enter a memorable 4-digit code or leave empty to auto-generate
              </p>
            </div>

            {editingAccessCode && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="code-active"
                  checked={accessCodeFormData.isActive}
                  onCheckedChange={(checked) => setAccessCodeFormData({ ...accessCodeFormData, isActive: checked === true })}
                />
                <Label htmlFor="code-active" className="text-sm">Active (can be used to submit reports)</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAccessCodeDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveAccessCode}
              disabled={!accessCodeFormData.department || !accessCodeFormData.staffName || createAccessCodeMutation.isPending || updateAccessCodeMutation.isPending}
              data-testid="button-save-access-code"
            >
              {(createAccessCodeMutation.isPending || updateAccessCodeMutation.isPending) ? "Saving..." : (editingAccessCode ? "Save Changes" : "Create Code")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showQrCode} onOpenChange={() => setShowQrCode(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">QR Code</DialogTitle>
            <DialogDescription className="text-center">
              Scan this code to access the daily report form
            </DialogDescription>
          </DialogHeader>
          {showQrCode && (
            <div className="space-y-4 py-4">
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getPublicFormUrl(showQrCode.code))}`}
                    alt="QR Code"
                    className="w-48 h-48"
                  />
                </div>
              </div>
              <div className="text-center space-y-2">
                <div className="font-medium">{showQrCode.staffName}</div>
                <div className="text-sm text-muted-foreground">
                  {templates.find(t => t.department === showQrCode.department)?.departmentLabel || showQrCode.department}
                </div>
                <div className="font-mono text-2xl font-bold">{showQrCode.code}</div>
              </div>
              <div className="flex justify-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => copyCodeToClipboard(showQrCode.code)}
                  data-testid="button-copy-code-dialog"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Code
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => copyUrlToClipboard(showQrCode.code)}
                  data-testid="button-copy-url-dialog"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Copy URL
                </Button>
              </div>
              <div className="text-center">
                <a 
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=png&data=${encodeURIComponent(getPublicFormUrl(showQrCode.code))}`}
                  download={`qr-code-${showQrCode.code}.png`}
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  data-testid="link-download-qr"
                >
                  <Download className="h-4 w-4" />
                  Download QR Code
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showGlobalQrCode} onOpenChange={setShowGlobalQrCode}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Staff Portal</DialogTitle>
            <DialogDescription className="text-center">
              Staff scan this code to access both Daily Reports and Daily Procedures
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-lg">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(getGlobalPublicFormUrl())}`}
                  alt="Global QR Code"
                  className="w-64 h-64"
                  data-testid="img-global-qr-large"
                />
              </div>
            </div>
            <div className="text-center space-y-2">
              <div className="font-medium text-lg">Staff Portal</div>
              <div className="text-sm text-muted-foreground">
                Access both Daily Reports and Procedures
              </div>
            </div>
            <div className="flex justify-center gap-2">
              <Button 
                variant="outline" 
                onClick={copyGlobalUrlToClipboard}
                data-testid="button-copy-global-url-dialog"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy URL
              </Button>
            </div>
            <div className="text-center">
              <a 
                href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&format=png&data=${encodeURIComponent(getGlobalPublicFormUrl())}`}
                download="staff-portal-qr.png"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                data-testid="link-download-global-qr"
              >
                <Download className="h-4 w-4" />
                Download High Resolution
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDepartmentDialogOpen} onOpenChange={setIsDepartmentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingDepartment && (() => {
                const Icon = departmentIcons[editingDepartment.department] || Building;
                return <Icon className="h-5 w-5 text-amber-500" />;
              })()}
              {editingDepartment?.departmentLabel || "Department"} Settings
            </DialogTitle>
            <DialogDescription>
              Configure notification emails and staff access codes for this department.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="departmentLabel" className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Department Name
                </Label>
                <Input
                  id="departmentLabel"
                  placeholder="Enter department name"
                  value={departmentFormData.departmentLabel}
                  onChange={(e) => setDepartmentFormData({ ...departmentFormData, departmentLabel: e.target.value })}
                  data-testid="input-department-label"
                />
                <p className="text-xs text-muted-foreground">
                  The display name for this department in reports and notifications.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder" className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  Sort Order
                </Label>
                <Input
                  id="sortOrder"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={departmentFormData.sortOrder}
                  onChange={(e) => setDepartmentFormData({ ...departmentFormData, sortOrder: parseInt(e.target.value) || 0 })}
                  data-testid="input-department-sort-order"
                />
                <p className="text-xs text-muted-foreground">
                  Lower numbers appear first.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notificationEmails" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Notification Emails
              </Label>
              <Textarea
                id="notificationEmails"
                placeholder="Enter email addresses separated by commas&#10;e.g., manager@company.com, supervisor@company.com"
                value={departmentFormData.notificationEmailsText}
                onChange={(e) => setDepartmentFormData({ ...departmentFormData, notificationEmailsText: e.target.value })}
                className="min-h-[80px] resize-none"
                data-testid="input-notification-emails"
              />
              <p className="text-xs text-muted-foreground">
                Recipients will receive notifications when reports are submitted for this department.
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  Staff Access Codes
                </Label>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setEditingAccessCode(null);
                    resetAccessCodeForm();
                    if (editingDepartment) {
                      setAccessCodeFormData(prev => ({ ...prev, department: editingDepartment.department }));
                    }
                    setIsAccessCodeDialogOpen(true);
                  }}
                  data-testid="button-add-dept-access-code"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Code
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Staff can scan QR codes or enter their code to submit reports without logging in.
              </p>
              
              {(() => {
                const deptCodes = accessCodes.filter(c => c.department === editingDepartment?.department);
                if (deptCodes.length === 0) {
                  return (
                    <div className="text-center py-4 text-muted-foreground border rounded-lg bg-muted/30">
                      <QrCode className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No access codes for this department</p>
                      <p className="text-xs">Add codes to allow staff to submit reports via QR code</p>
                    </div>
                  );
                }
                return (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {deptCodes.map(code => (
                      <div 
                        key={code.id} 
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="font-mono text-lg font-bold bg-background px-2 py-1 rounded border">
                            {code.code}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{code.staffName}</div>
                            <div className="text-xs text-muted-foreground">
                              {code.isActive ? (
                                <span className="text-green-600">Active</span>
                              ) : (
                                <span className="text-red-600">Inactive</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleShowQrCode(code)}
                            title="Show QR Code"
                            data-testid={`button-show-qr-${code.id}`}
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyCodeToClipboard(code.code)}
                            title="Copy Code"
                            data-testid={`button-copy-code-${code.id}`}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditAccessCode(code)}
                            title="Edit"
                            data-testid={`button-edit-code-${code.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteAccessCode(code.id)}
                            title="Delete"
                            data-testid={`button-delete-code-${code.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDepartmentDialogOpen(false)}>
              Close
            </Button>
            <Button 
              onClick={handleSaveDepartment}
              disabled={updateDepartmentMutation.isPending}
              data-testid="button-save-department"
            >
              {updateDepartmentMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isNewDepartmentDialogOpen} onOpenChange={setIsNewDepartmentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-amber-500" />
              Create New Department
            </DialogTitle>
            <DialogDescription>
              Add a new department to manage daily reports. The department will automatically get all existing field definitions.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="departmentKey">Department Key</Label>
              <Input
                id="departmentKey"
                placeholder="e.g., bakery, warehouse"
                value={newDepartmentFormData.departmentKey}
                onChange={(e) => setNewDepartmentFormData({ ...newDepartmentFormData, departmentKey: e.target.value })}
                data-testid="input-department-key"
              />
              <p className="text-xs text-muted-foreground">
                A unique identifier for the department (letters, numbers, underscores only)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="departmentLabel">Display Name</Label>
              <Input
                id="departmentLabel"
                placeholder="e.g., Bakery, Warehouse"
                value={newDepartmentFormData.departmentLabel}
                onChange={(e) => setNewDepartmentFormData({ ...newDepartmentFormData, departmentLabel: e.target.value })}
                data-testid="input-department-label"
              />
              <p className="text-xs text-muted-foreground">
                The name that will be displayed in the interface
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewDepartmentDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateDepartment}
              disabled={!newDepartmentFormData.departmentKey || !newDepartmentFormData.departmentLabel || createDepartmentMutation.isPending}
              data-testid="button-create-new-department"
            >
              {createDepartmentMutation.isPending ? "Creating..." : "Create Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isProcedureTemplateDialogOpen} onOpenChange={setIsProcedureTemplateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProcedureTemplate ? "Edit Procedure" : "Add Procedure"}
            </DialogTitle>
            <DialogDescription>
              {editingProcedureTemplate 
                ? "Update this procedure's details"
                : "Create a new procedure for the department checklist"
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="procedureName">Procedure Name *</Label>
              <Input
                id="procedureName"
                placeholder="e.g., Open cash register"
                value={procedureTemplateFormData.procedureName}
                onChange={(e) => setProcedureTemplateFormData({ ...procedureTemplateFormData, procedureName: e.target.value })}
                data-testid="input-procedure-name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="procedureDescription">Description (optional)</Label>
              <Textarea
                id="procedureDescription"
                placeholder="Additional details about this procedure..."
                value={procedureTemplateFormData.description}
                onChange={(e) => setProcedureTemplateFormData({ ...procedureTemplateFormData, description: e.target.value })}
                className="resize-none"
                rows={3}
                data-testid="input-procedure-description"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Procedure Type</Label>
              <Select
                value={procedureTemplateFormData.procedureType}
                onValueChange={(value: 'opening' | 'closing' | 'general') => 
                  setProcedureTemplateFormData({ ...procedureTemplateFormData, procedureType: value })
                }
              >
                <SelectTrigger data-testid="select-procedure-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {procedureTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Badge className={`${procedureTypeColors[type.value]} text-xs`}>{type.label}</Badge>
                        <span className="text-xs text-muted-foreground">{type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isRequired"
                  checked={procedureTemplateFormData.isRequired}
                  onCheckedChange={(checked) => setProcedureTemplateFormData({ ...procedureTemplateFormData, isRequired: checked })}
                  data-testid="switch-procedure-required"
                />
                <Label htmlFor="isRequired">Required</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={procedureTemplateFormData.isActive}
                  onCheckedChange={(checked) => setProcedureTemplateFormData({ ...procedureTemplateFormData, isActive: checked })}
                  data-testid="switch-procedure-active"
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                min="0"
                value={procedureTemplateFormData.sortOrder}
                onChange={(e) => setProcedureTemplateFormData({ ...procedureTemplateFormData, sortOrder: parseInt(e.target.value) || 0 })}
                data-testid="input-procedure-sort-order"
              />
              <p className="text-xs text-muted-foreground">
                Lower numbers appear first in the checklist
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProcedureTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveProcedureTemplate}
              disabled={createProcedureTemplateMutation.isPending || updateProcedureTemplateMutation.isPending}
              data-testid="button-save-procedure"
            >
              {(createProcedureTemplateMutation.isPending || updateProcedureTemplateMutation.isPending) 
                ? "Saving..." 
                : (editingProcedureTemplate ? "Update Procedure" : "Add Procedure")
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revision Request Dialog */}
      <Dialog open={isRevisionRequestDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setRevisionRequestMessage("");
          setReportForRevision(null);
        }
        setIsRevisionRequestDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Request Revision</DialogTitle>
            <DialogDescription>
              Describe what needs to be clarified or corrected in this report.
              {reportForRevision && (
                <span className="block mt-1 font-medium">
                  Report: {templates.find(t => t.id === reportForRevision.templateId)?.departmentLabel || reportForRevision.department} - {format(new Date(reportForRevision.reportDate), "MMM d, yyyy")}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea 
              placeholder="Enter your revision request... (e.g., Please clarify the sales numbers for the afternoon shift)"
              value={revisionRequestMessage}
              onChange={(e) => setRevisionRequestMessage(e.target.value)}
              rows={4}
              data-testid="input-revision-request-message"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsRevisionRequestDialogOpen(false);
              setRevisionRequestMessage("");
              setReportForRevision(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (reportForRevision) {
                  createRevisionRequestMutation.mutate({
                    reportId: reportForRevision.id,
                    requestMessage: revisionRequestMessage
                  });
                }
              }}
              disabled={!revisionRequestMessage.trim() || createRevisionRequestMutation.isPending}
              data-testid="button-submit-revision-request"
            >
              {createRevisionRequestMutation.isPending ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Preview Dialog */}
      <Dialog open={!!previewingTemplate} onOpenChange={(open) => !open && setPreviewingTemplate(null)}>
        <DialogContent className="sm:max-w-[700px] h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Template Preview: {previewingTemplate?.departmentLabel}
            </DialogTitle>
            <DialogDescription>
              This is how the daily report form will appear to staff members
            </DialogDescription>
          </DialogHeader>
          
          {previewingTemplate && (
            <div className="flex-1 min-h-0">
              <ScrollArea className="h-full pr-4">
              <div className="space-y-6 py-4">
                <div className="bg-muted/50 rounded-lg p-4 border">
                  <h3 className="font-medium text-sm text-muted-foreground mb-3">REPORT FIELDS</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {(allFieldAssignments[previewingTemplate.id] || [])
                      .filter(a => a.isEnabled)
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map(assignment => (
                        <div key={assignment.fieldDefinitionId} className="space-y-1">
                          <Label className="text-sm">{assignment.fieldDefinition?.label || 'Unknown Field'}</Label>
                          <Input 
                            placeholder={`Enter ${assignment.fieldDefinition?.label?.toLowerCase() || 'value'}...`}
                            disabled 
                            className="bg-background"
                          />
                        </div>
                      ))}
                  </div>
                  {(allFieldAssignments[previewingTemplate.id] || []).filter(a => a.isEnabled).length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No fields enabled for this template</p>
                  )}
                </div>

                <div className="bg-muted/50 rounded-lg p-4 border">
                  <h3 className="font-medium text-sm text-muted-foreground mb-3">PROCEDURE CHECKLISTS</h3>
                  {(() => {
                    const procedures = getProceduresForDepartment(previewingTemplate.department);
                    const openingProcs = procedures.filter(p => p.procedureType === 'opening');
                    const closingProcs = procedures.filter(p => p.procedureType === 'closing');
                    const generalProcs = procedures.filter(p => p.procedureType === 'general');
                    
                    if (procedures.length === 0) {
                      return <p className="text-sm text-muted-foreground italic">No procedures configured for this template</p>;
                    }
                    
                    return (
                      <div className="space-y-4">
                        {openingProcs.length > 0 && (
                          <div>
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100 mb-2">Opening</Badge>
                            <div className="space-y-2 ml-2">
                              {openingProcs.map(proc => (
                                <label key={proc.id} className="flex items-center gap-2">
                                  <Checkbox disabled />
                                  <span className="text-sm">{proc.procedureName}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                        {closingProcs.length > 0 && (
                          <div>
                            <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100 mb-2">Closing</Badge>
                            <div className="space-y-2 ml-2">
                              {closingProcs.map(proc => (
                                <label key={proc.id} className="flex items-center gap-2">
                                  <Checkbox disabled />
                                  <span className="text-sm">{proc.procedureName}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                        {generalProcs.length > 0 && (
                          <div>
                            <Badge variant="secondary" className="mb-2">General</Badge>
                            <div className="space-y-2 ml-2">
                              {generalProcs.map(proc => (
                                <label key={proc.id} className="flex items-center gap-2">
                                  <Checkbox disabled />
                                  <span className="text-sm">{proc.procedureName}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="bg-muted/50 rounded-lg p-4 border">
                  <h3 className="font-medium text-sm text-muted-foreground mb-3">NOTES SECTIONS</h3>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label className="text-sm">Customer Service Summary</Label>
                      <Textarea placeholder="Enter customer service notes..." disabled className="bg-background resize-none" rows={2} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Operational Notes</Label>
                      <Textarea placeholder="Enter operational notes..." disabled className="bg-background resize-none" rows={2} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Staffing Notes</Label>
                      <Textarea placeholder="Enter staffing notes..." disabled className="bg-background resize-none" rows={2} />
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 border">
                  <h3 className="font-medium text-sm text-muted-foreground mb-3">NOTIFICATION RECIPIENTS</h3>
                  {(previewingTemplate.notificationEmails?.length || 0) > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {previewingTemplate.notificationEmails?.map((email, idx) => (
                        <Badge key={idx} variant="outline" className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {email.email}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No notification recipients configured</p>
                  )}
                </div>
              </div>
              </ScrollArea>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewingTemplate(null)} data-testid="button-close-preview">
              Close Preview
            </Button>
            <Button onClick={() => {
              setPreviewingTemplate(null);
              if (previewingTemplate) handleEditDepartment(previewingTemplate);
            }} data-testid="button-edit-from-preview">
              <Edit className="h-4 w-4 mr-2" />
              Edit Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Template Dialog */}
      <Dialog open={!!duplicatingTemplate} onOpenChange={(open) => !open && setDuplicatingTemplate(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Duplicate Template
            </DialogTitle>
            <DialogDescription>
              Create a copy of "{duplicatingTemplate?.departmentLabel}" with a new name. 
              Field configurations will be copied automatically.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="duplicate-label">New Template Name</Label>
              <Input
                id="duplicate-label"
                value={duplicateFormData.departmentLabel}
                onChange={(e) => {
                  const label = e.target.value;
                  const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                  setDuplicateFormData(prev => ({
                    ...prev,
                    departmentLabel: label,
                    departmentKey: key
                  }));
                }}
                placeholder="e.g., Restaurant - Lunch"
                data-testid="input-duplicate-label"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="duplicate-key">Template Key (auto-generated)</Label>
              <Input
                id="duplicate-key"
                value={duplicateFormData.departmentKey}
                onChange={(e) => setDuplicateFormData(prev => ({
                  ...prev,
                  departmentKey: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '')
                }))}
                placeholder="e.g., restaurant-lunch"
                data-testid="input-duplicate-key"
              />
              <p className="text-xs text-muted-foreground">
                Used internally. Must be unique and contain only lowercase letters, numbers, and hyphens.
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>What to copy:</Label>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="copy-fields"
                  checked={true}
                  disabled
                />
                <label htmlFor="copy-fields" className="text-sm text-muted-foreground">
                  Field configurations (always copied)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="copy-procedures"
                  checked={duplicateFormData.copyProcedures}
                  onCheckedChange={(checked) => setDuplicateFormData(prev => ({
                    ...prev,
                    copyProcedures: !!checked
                  }))}
                  data-testid="checkbox-copy-procedures"
                />
                <label htmlFor="copy-procedures" className="text-sm">
                  Procedure checklists
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="copy-access-codes"
                  checked={duplicateFormData.copyAccessCodes}
                  onCheckedChange={(checked) => setDuplicateFormData(prev => ({
                    ...prev,
                    copyAccessCodes: !!checked
                  }))}
                  data-testid="checkbox-copy-access-codes"
                />
                <label htmlFor="copy-access-codes" className="text-sm">
                  Staff access codes
                </label>
              </div>
            </div>

            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              Note: Report history is not copied. The new template will start fresh.
            </p>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDuplicatingTemplate(null)}
              data-testid="button-cancel-duplicate"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (duplicatingTemplate) {
                  duplicateTemplateMutation.mutate({
                    sourceTemplateId: duplicatingTemplate.id,
                    departmentKey: duplicateFormData.departmentKey,
                    departmentLabel: duplicateFormData.departmentLabel,
                    copyProcedures: duplicateFormData.copyProcedures,
                    copyAccessCodes: duplicateFormData.copyAccessCodes
                  });
                }
              }}
              disabled={
                !duplicateFormData.departmentKey.trim() || 
                !duplicateFormData.departmentLabel.trim() ||
                duplicateTemplateMutation.isPending
              }
              data-testid="button-confirm-duplicate"
            >
              {duplicateTemplateMutation.isPending ? "Duplicating..." : "Create Duplicate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
