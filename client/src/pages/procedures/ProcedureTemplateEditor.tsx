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
import { ArrowLeft, Plus, Trash2, GripVertical, Save, Loader2 } from "lucide-react";
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

export default function ProcedureTemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isNew = id === "new";

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
  const [emailRecipientsTo, setEmailRecipientsTo] = useState<string[]>([]);
  const [emailRecipientsCc, setEmailRecipientsCc] = useState<string[]>([]);
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
      setEmailRecipientsTo(template.emailRecipientsTo || []);
      setEmailRecipientsCc(template.emailRecipientsCc || []);
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

  const createTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("/api/procedures/templates", "POST", data);
      return response;
    },
    onSuccess: (data) => {
      toast({ title: "Procedure created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/procedures/templates"] });
      setLocation(`/procedures/templates/${data.id}`);
    },
    onError: (error: any) => {
      toast({ title: "Error creating procedure", description: error.message, variant: "destructive" });
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest(`/api/procedures/templates/${id}`, "PATCH", data);
      return response;
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
      return await apiRequest(`/api/procedures/templates/${templateId}/items`, "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procedures/templates", id] });
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: any }) => {
      return await apiRequest(`/api/procedures/items/${itemId}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procedures/templates", id] });
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiRequest(`/api/procedures/items/${itemId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procedures/templates", id] });
    }
  });

  const handleSave = async () => {
    const templateData = {
      procedureName,
      procedureCode: procedureCode.toUpperCase().replace(/\s+/g, "_"),
      department,
      procedureType,
      description: description || null,
      daysOfWeek,
      isActive,
      emailRecipientsTo,
      emailRecipientsCc
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
    } else {
      await updateTemplateMutation.mutateAsync(templateData);
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
    }
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

  const addEmailRecipient = (type: "to" | "cc") => {
    const email = type === "to" ? newEmailTo : newEmailCc;
    if (email && email.includes("@")) {
      if (type === "to") {
        setEmailRecipientsTo([...emailRecipientsTo, email]);
        setNewEmailTo("");
      } else {
        setEmailRecipientsCc([...emailRecipientsCc, email]);
        setNewEmailCc("");
      }
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

              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  data-testid="switch-active"
                />
                <Label htmlFor="isActive">Procedure is Active</Label>
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
                        <GripVertical className="w-5 h-5 text-muted-foreground mt-2 cursor-grab" />
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start gap-2">
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
                    data-testid="input-email-to"
                  />
                  <Button variant="outline" onClick={() => addEmailRecipient("to")} data-testid="button-add-email-to">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
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
        </div>
      </div>
    </div>
  );
}
