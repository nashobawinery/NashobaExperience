import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, Trash2, Save, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ProceduresTemplateWithItems, ProceduresItem } from "@shared/schema";

const DAYS_OF_WEEK = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
  { key: "saturday", label: "Sat" },
  { key: "sunday", label: "Sun" },
];

const RESPONSE_TYPES = [
  { value: "checkbox", label: "Checkbox" },
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "yes_no", label: "Yes/No" },
  { value: "dropdown", label: "Dropdown" },
];

interface ProcedureItemForm {
  id?: string;
  label: string;
  description: string;
  isRequired: boolean;
  requireInitials: boolean;
  requireComment: boolean;
  responseType: string;
  dropdownOptions: string[];
  sortOrder: number;
}

interface StaffReportingUser {
  id: string;
  displayName: string;
  accessCode: string;
  homeDepartment?: string | null;
  isActive: boolean;
  assignments: {
    reportType: string;
    assignmentKey: string;
    isEnabled: boolean;
  }[];
}

export default function ProcedureTemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isNew = !id || id === "new";

  const [procedureName, setProcedureName] = useState("");
  const [procedureCode, setProcedureCode] = useState("");
  const [department, setDepartment] = useState("");
  const [procedureType, setProcedureType] = useState("general");
  const [description, setDescription] = useState("");
  const [daysOfWeek, setDaysOfWeek] = useState<Record<string, boolean>>({
    monday: true, tuesday: true, wednesday: true, thursday: true,
    friday: true, saturday: true, sunday: true
  });
  const [isActive, setIsActive] = useState(true);
  const [isMandatory, setIsMandatory] = useState(false);
  const [completionTime, setCompletionTime] = useState("");
  const [emailRecipientsTo, setEmailRecipientsTo] = useState<string[]>([]);
  const [emailRecipientsCc, setEmailRecipientsCc] = useState<string[]>([]);
  const [assignedStaffIds, setAssignedStaffIds] = useState<string[]>([]);
  const [items, setItems] = useState<ProcedureItemForm[]>([]);
  const [newEmailTo, setNewEmailTo] = useState("");
  const [newEmailCc, setNewEmailCc] = useState("");

  const { data: template, isLoading } = useQuery<ProceduresTemplateWithItems>({
    queryKey: ["/api/procedures/templates", id],
    enabled: !isNew,
  });

  const { data: departments } = useQuery<{ department: string; departmentLabel: string }[]>({
    queryKey: ["/api/procedures/departments"],
  });

  const { data: allStaff } = useQuery<StaffReportingUser[]>({
    queryKey: ["/api/staff-reporting/users"],
  });

  useEffect(() => {
    if (template) {
      setProcedureName(template.procedureName);
      setProcedureCode(template.procedureCode);
      setDepartment(template.department);
      setProcedureType(template.procedureType);
      setDescription(template.description || "");
      setDaysOfWeek((template.daysOfWeek as Record<string, boolean>) || {
        monday: true, tuesday: true, wednesday: true, thursday: true,
        friday: true, saturday: true, sunday: true
      });
      setIsActive(template.isActive);
      setIsMandatory(template.isMandatory ?? false);
      setCompletionTime(template.completionTime || "");
      setEmailRecipientsTo(template.emailRecipientsTo || []);
      setEmailRecipientsCc(template.emailRecipientsCc || []);
      setAssignedStaffIds((template as any).assignedStaffIds || []);
      setItems(template.items?.map(item => ({
        id: item.id,
        label: item.label,
        description: item.description || "",
        isRequired: item.isRequired,
        requireInitials: item.requireInitials,
        requireComment: item.requireComment,
        responseType: item.responseType,
        dropdownOptions: item.dropdownOptions || [],
        sortOrder: item.sortOrder
      })) || []);
    }
  }, [template]);

  useEffect(() => {
    if (!template || !allStaff) return;
    setAssignedStaffIds(
      allStaff
        .filter((staff) =>
          staff.assignments?.some((assignment) =>
            assignment.reportType === "procedure" &&
            assignment.assignmentKey === template.procedureCode &&
            assignment.isEnabled
          )
        )
        .map((staff) => staff.id)
    );
  }, [template, allStaff]);

  const createTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/procedures/templates", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Procedure created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/procedures/templates"] });
    },
    onError: (error: any) => {
      toast({ title: "Error creating procedure", description: error.message, variant: "destructive" });
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PATCH", `/api/procedures/templates/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Procedure updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/procedures/templates"] });
    },
    onError: (error: any) => {
      toast({ title: "Error updating procedure", description: error.message, variant: "destructive" });
    }
  });

  const createItemMutation = useMutation({
    mutationFn: async ({ templateId, data }: { templateId: string; data: any }) => {
      const response = await apiRequest("POST", `/api/procedures/templates/${templateId}/items`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procedures/templates", id] });
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: any }) => {
      const response = await apiRequest("PATCH", `/api/procedures/items/${itemId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procedures/templates", id] });
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiRequest("DELETE", `/api/procedures/items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procedures/templates", id] });
    }
  });

  const handleSave = async () => {
    // Automatically add any emails typed in the input fields but not yet added
    let finalEmailsTo = [...emailRecipientsTo];
    let finalEmailsCc = [...emailRecipientsCc];
    
    if (newEmailTo.trim()) {
      const pendingToEmails = newEmailTo.split(",").map(e => e.trim()).filter(e => e.includes("@"));
      finalEmailsTo = [...finalEmailsTo, ...pendingToEmails.filter(e => !finalEmailsTo.includes(e))];
    }
    
    if (newEmailCc.trim()) {
      const pendingCcEmails = newEmailCc.split(",").map(e => e.trim()).filter(e => e.includes("@"));
      finalEmailsCc = [...finalEmailsCc, ...pendingCcEmails.filter(e => !finalEmailsCc.includes(e))];
    }
    
    const normalizedProcedureCode = procedureCode.toUpperCase().replace(/\s+/g, "_");
    const templateData = {
      procedureName,
      procedureCode: normalizedProcedureCode,
      department,
      procedureType,
      description: description || null,
      daysOfWeek,
      isActive,
      isMandatory,
      completionTime: completionTime || null,
      emailRecipientsTo: finalEmailsTo,
      emailRecipientsCc: finalEmailsCc
    };

    if (isNew) {
      const result = await createTemplateMutation.mutateAsync(templateData);
      for (const item of items) {
        await createItemMutation.mutateAsync({
          templateId: result.id,
          data: {
            label: item.label,
            description: item.description || null,
            isRequired: item.isRequired,
            requireInitials: item.requireInitials,
            requireComment: item.requireComment,
            responseType: item.responseType,
            dropdownOptions: item.dropdownOptions.length > 0 ? item.dropdownOptions : null,
            sortOrder: item.sortOrder
          }
        });
      }
      await apiRequest("PUT", `/api/staff-reporting/procedures/${normalizedProcedureCode}/staff`, {
        assignedStaffIds,
        assignmentLabel: procedureName
      });
    } else {
      await updateTemplateMutation.mutateAsync(templateData);
      if (template?.procedureCode && template.procedureCode !== normalizedProcedureCode) {
        await apiRequest("PUT", `/api/staff-reporting/procedures/${template.procedureCode}/staff`, {
          assignedStaffIds: [],
          assignmentLabel: template.procedureName
        });
      }
      for (const item of items) {
        if (item.id) {
          await updateItemMutation.mutateAsync({
            itemId: item.id,
            data: {
              label: item.label,
              description: item.description || null,
              isRequired: item.isRequired,
              requireInitials: item.requireInitials,
              requireComment: item.requireComment,
              responseType: item.responseType,
              dropdownOptions: item.dropdownOptions.length > 0 ? item.dropdownOptions : null,
              sortOrder: item.sortOrder
            }
          });
        } else {
          await createItemMutation.mutateAsync({
            templateId: id!,
            data: {
              label: item.label,
              description: item.description || null,
              isRequired: item.isRequired,
              requireInitials: item.requireInitials,
              requireComment: item.requireComment,
              responseType: item.responseType,
              dropdownOptions: item.dropdownOptions.length > 0 ? item.dropdownOptions : null,
              sortOrder: item.sortOrder
            }
          });
        }
      }
      await apiRequest("PUT", `/api/staff-reporting/procedures/${normalizedProcedureCode}/staff`, {
        assignedStaffIds,
        assignmentLabel: procedureName
      });
    }

    queryClient.invalidateQueries({ queryKey: ["/api/staff-reporting/users"] });
    queryClient.invalidateQueries({ queryKey: ["/api/procedures/templates", id] });
    setLocation("/procedures");
  };

  const addItem = () => {
    setItems([...items, {
      label: "",
      description: "",
      isRequired: true,
      requireInitials: false,
      requireComment: false,
      responseType: "checkbox",
      dropdownOptions: [],
      sortOrder: items.length
    }]);
  };

  const updateItem = (index: number, updates: Partial<ProcedureItemForm>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    setItems(newItems);
  };

  const removeItem = async (index: number) => {
    const item = items[index];
    if (item.id) {
      await deleteItemMutation.mutateAsync(item.id);
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === items.length - 1) return;
    
    const newItems = [...items];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    
    // Swap the items
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    
    // Update sortOrder for all items
    const updatedItems = newItems.map((item, i) => ({
      ...item,
      sortOrder: i
    }));
    
    setItems(updatedItems);
  };

  const addEmailRecipient = (type: "to" | "cc") => {
    const email = type === "to" ? newEmailTo : newEmailCc;
    if (email) {
      // Split by comma and filter valid emails
      const newEmails = email.split(",").map(e => e.trim()).filter(e => e.includes("@"));
      if (newEmails.length > 0) {
        if (type === "to") {
          setEmailRecipientsTo([...emailRecipientsTo, ...newEmails]);
          setNewEmailTo("");
        } else {
          setEmailRecipientsCc([...emailRecipientsCc, ...newEmails]);
          setNewEmailCc("");
        }
      }
    }
  };

  const toggleStaffAssignment = (staffId: string) => {
    if (assignedStaffIds.includes(staffId)) {
      setAssignedStaffIds(assignedStaffIds.filter(id => id !== staffId));
    } else {
      setAssignedStaffIds([...assignedStaffIds, staffId]);
    }
  };

  const isPending = createTemplateMutation.isPending || updateTemplateMutation.isPending;

  if (!isNew && isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/procedures")} data-testid="button-back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{isNew ? "Create Procedure" : "Edit Procedure"}</h1>
          <p className="text-muted-foreground">
            {isNew ? "Define a new checklist procedure for your team" : `Editing ${template?.procedureName}`}
          </p>
        </div>
        <Button onClick={handleSave} disabled={isPending || !procedureName || !procedureCode || !department} data-testid="button-save">
          {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Procedure
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="procedureName">Procedure Name *</Label>
                  <Input
                    id="procedureName"
                    value={procedureName}
                    onChange={(e) => setProcedureName(e.target.value)}
                    placeholder="e.g., Retail Opening"
                    data-testid="input-procedure-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="procedureCode">Procedure Code *</Label>
                  <Input
                    id="procedureCode"
                    value={procedureCode}
                    onChange={(e) => setProcedureCode(e.target.value.toUpperCase().replace(/\s+/g, "_"))}
                    placeholder="e.g., RET_OPEN"
                    data-testid="input-procedure-code"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Select value={department || "__none__"} onValueChange={(v) => setDepartment(v === "__none__" ? "" : v)}>
                    <SelectTrigger data-testid="select-department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Select department</SelectItem>
                      {departments?.map((d) => (
                        <SelectItem key={d.department} value={d.department}>{d.departmentLabel}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="procedureType">Procedure Type</Label>
                  <Select value={procedureType} onValueChange={setProcedureType}>
                    <SelectTrigger data-testid="select-procedure-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="opening">Opening</SelectItem>
                      <SelectItem value="closing">Closing</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description or instructions..."
                  data-testid="input-description"
                />
              </div>

              <div className="space-y-2">
                <Label>Days of Week</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <Button
                      key={day.key}
                      type="button"
                      variant={daysOfWeek[day.key] ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDaysOfWeek({ ...daysOfWeek, [day.key]: !daysOfWeek[day.key] })}
                      data-testid={`button-day-${day.key}`}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="completionTime">Completion Time (Optional)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="completionTime"
                    type="time"
                    value={completionTime}
                    onChange={(e) => setCompletionTime(e.target.value)}
                    className="w-40"
                    data-testid="input-completion-time"
                  />
                  {completionTime && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCompletionTime("")}
                      data-testid="button-clear-completion-time"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  If set, staff starting the procedure after this time will be asked to explain why
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  data-testid="switch-active"
                />
                <Label htmlFor="isActive">Procedure is Active</Label>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Switch
                    id="isMandatory"
                    checked={isMandatory}
                    onCheckedChange={setIsMandatory}
                    data-testid="switch-mandatory"
                  />
                  <Label htmlFor="isMandatory">Mandatory Procedure</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  If enabled, a "No Report Filed" entry will be created and email notification sent when this procedure is not submitted on a scheduled day
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Checklist Items</CardTitle>
                  <CardDescription>Add the tasks that need to be completed</CardDescription>
                </div>
                <Button onClick={addItem} data-testid="button-add-item">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No tasks added yet. Click "Add Task" to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col gap-1 mt-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveItem(index, "up")}
                            disabled={index === 0}
                            data-testid={`button-move-up-${index}`}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveItem(index, "down")}
                            disabled={index === items.length - 1}
                            data-testid={`button-move-down-${index}`}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start gap-2">
                            <Badge variant="outline" className="mt-2 shrink-0">
                              {index + 1}
                            </Badge>
                            <div className="flex-1">
                              <Input
                                value={item.label}
                                onChange={(e) => updateItem(index, { label: e.target.value })}
                                placeholder="Task description..."
                                data-testid={`input-item-label-${index}`}
                              />
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeItem(index)} data-testid={`button-remove-item-${index}`}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                          
                          <div className="grid gap-4 md:grid-cols-4">
                            <div className="space-y-1">
                              <Label className="text-xs">Response Type</Label>
                              <Select value={item.responseType} onValueChange={(v) => updateItem(index, { responseType: v })}>
                                <SelectTrigger data-testid={`select-response-type-${index}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {RESPONSE_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-end gap-2">
                              <Checkbox
                                id={`required-${index}`}
                                checked={item.isRequired}
                                onCheckedChange={(checked) => updateItem(index, { isRequired: checked as boolean })}
                              />
                              <Label htmlFor={`required-${index}`} className="text-xs">Required</Label>
                            </div>
                            <div className="flex items-end gap-2">
                              <Checkbox
                                id={`initials-${index}`}
                                checked={item.requireInitials}
                                onCheckedChange={(checked) => updateItem(index, { requireInitials: checked as boolean })}
                              />
                              <Label htmlFor={`initials-${index}`} className="text-xs">Initials</Label>
                            </div>
                            <div className="flex items-end gap-2">
                              <Checkbox
                                id={`comment-${index}`}
                                checked={item.requireComment}
                                onCheckedChange={(checked) => updateItem(index, { requireComment: checked as boolean })}
                              />
                              <Label htmlFor={`comment-${index}`} className="text-xs">Comment</Label>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">Additional Details (optional)</Label>
                            <Textarea
                              value={item.description || ""}
                              onChange={(e) => updateItem(index, { description: e.target.value })}
                              placeholder="Add instructions or details. Use bullet points like:&#10;• First step&#10;• Second step&#10;• Third step"
                              className="min-h-[80px] text-sm"
                              data-testid={`input-item-description-${index}`}
                            />
                            <p className="text-xs text-muted-foreground">Use • or - for bullet points. Each line will be shown as a separate item.</p>
                          </div>

                          {item.responseType === "dropdown" && (
                            <div className="space-y-2">
                              <Label className="text-xs">Dropdown Options (comma-separated)</Label>
                              <Input
                                value={item.dropdownOptions.join(", ")}
                                onChange={(e) => updateItem(index, { dropdownOptions: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                                placeholder="Option 1, Option 2, Option 3"
                                data-testid={`input-dropdown-options-${index}`}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Recipients will be notified when procedure is submitted</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>To Recipients</Label>
                <div className="flex gap-2">
                  <Input
                    value={newEmailTo}
                    onChange={(e) => setNewEmailTo(e.target.value)}
                    placeholder="email@example.com"
                    onKeyDown={(e) => e.key === "Enter" && addEmailRecipient("to")}
                    onBlur={() => newEmailTo.trim() && addEmailRecipient("to")}
                    data-testid="input-email-to"
                  />
                  <Button variant="outline" onClick={() => addEmailRecipient("to")} data-testid="button-add-email-to">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Press Enter or click + to add. Separate multiple with commas.</p>
                <div className="flex flex-wrap gap-1">
                  {emailRecipientsTo.map((email, i) => (
                    <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => setEmailRecipientsTo(emailRecipientsTo.filter((_, idx) => idx !== i))}>
                      {email} ×
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>CC Recipients (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    value={newEmailCc}
                    onChange={(e) => setNewEmailCc(e.target.value)}
                    placeholder="email@example.com"
                    onKeyDown={(e) => e.key === "Enter" && addEmailRecipient("cc")}
                    onBlur={() => newEmailCc.trim() && addEmailRecipient("cc")}
                    data-testid="input-email-cc"
                  />
                  <Button variant="outline" onClick={() => addEmailRecipient("cc")} data-testid="button-add-email-cc">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {emailRecipientsCc.map((email, i) => (
                    <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => setEmailRecipientsCc(emailRecipientsCc.filter((_, idx) => idx !== i))}>
                      {email} ×
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Staff Assignment</CardTitle>
              <CardDescription>Assign staff members who can complete this procedure</CardDescription>
            </CardHeader>
            <CardContent>
              {!allStaff || allStaff.length === 0 ? (
                <p className="text-sm text-muted-foreground">No staff members available. Add staff in Staff Reporting Administration first.</p>
              ) : (
                <div className="space-y-2">
                  {allStaff.filter(s => s.isActive).map((staff) => (
                    <div key={staff.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`staff-${staff.id}`}
                        checked={assignedStaffIds.includes(staff.id)}
                        onCheckedChange={() => toggleStaffAssignment(staff.id)}
                        data-testid={`checkbox-staff-${staff.id}`}
                      />
                      <Label htmlFor={`staff-${staff.id}`} className="flex-1 cursor-pointer">
                        {staff.displayName}
                        {staff.homeDepartment && (
                          <span className="text-xs text-muted-foreground ml-2">({staff.homeDepartment})</span>
                        )}
                      </Label>
                      <Badge variant="outline" className="text-xs">{staff.accessCode}</Badge>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3">
                Selected: {assignedStaffIds.length} staff member{assignedStaffIds.length !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
