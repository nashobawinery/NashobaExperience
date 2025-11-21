import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Copy, Eye, FileText, Mail, Clock, CheckCircle, XCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import type { B2bEmailTemplate, B2bEmailAutomationLog } from "@shared/schema";

const availableVariables = [
  { key: '{{customerName}}', description: 'Full business/account name' },
  { key: '{{firstName}}', description: 'First part of business name' },
  { key: '{{contactName}}', description: 'Primary contact name' },
  { key: '{{email}}', description: 'Customer email address' },
  { key: '{{tierName}}', description: 'Current tier (e.g., Tier 3)' },
  { key: '{{savingsTotal}}', description: 'Total savings vs Tier 1 pricing (formatted)' },
  { key: '{{savingsTotalRounded}}', description: 'Savings rounded to whole dollars' },
  { key: '{{casesOrdered}}', description: 'Cases ordered in commitment period' },
  { key: '{{casesRemaining}}', description: 'Cases remaining to meet commitment' },
  { key: '{{commitmentAmount}}', description: 'Annual commitment (10 or 30 cases)' },
  { key: '{{daysUntilRenewal}}', description: 'Days until renewal date' },
  { key: '{{renewalDate}}', description: 'Commitment renewal date' },
  { key: '{{orderNumber}}', description: 'Order number (if provided)' },
  { key: '{{orderTotal}}', description: 'Order total (if provided)' },
  { key: '{{todayDate}}', description: "Today's date" },
];

const triggerTypes = [
  { value: 'first_order', label: 'First Order Welcome' },
  { value: 'payment_reminder', label: 'Payment Reminder' },
  { value: 'commitment_renewal', label: 'Tier Commitment Renewal' },
  { value: 'manual', label: 'Manual Send' },
];

const tiers = ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5', 'Tier 6'];

interface FormData {
  name: string;
  description: string;
  triggerType: string;
  tierFilter: string[];
  subject: string;
  bodyHtml: string;
  bodyText: string;
  daysBeforeEvent: number | null;
  active: boolean;
}

export function EmailTemplateManager() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<B2bEmailTemplate | null>(null);
  const [showVariables, setShowVariables] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    triggerType: 'manual',
    tierFilter: [],
    subject: '',
    bodyHtml: '',
    bodyText: '',
    daysBeforeEvent: null,
    active: true,
  });

  const { data: templates = [], isLoading } = useQuery<B2bEmailTemplate[]>({
    queryKey: ['/api/b2b/admin/email-templates'],
  });

  const { data: automationLogs = [], isLoading: loadingLogs } = useQuery<B2bEmailAutomationLog[]>({
    queryKey: ['/api/b2b/admin/email-automation-logs'],
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<B2bEmailTemplate>) =>
      apiRequest('POST', '/api/b2b/admin/email-templates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/b2b/admin/email-templates'] });
      toast({ title: "Template created successfully" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create template", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<B2bEmailTemplate> }) =>
      apiRequest('PATCH', `/api/b2b/admin/email-templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/b2b/admin/email-templates'] });
      toast({ title: "Template updated successfully" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to update template", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest('DELETE', `/api/b2b/admin/email-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/b2b/admin/email-templates'] });
      toast({ title: "Template deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete template", variant: "destructive" });
    },
  });

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      triggerType: 'manual',
      tierFilter: [],
      subject: '',
      bodyHtml: '',
      bodyText: '',
      daysBeforeEvent: null,
      active: true,
    });
    setEditingTemplate(null);
    setIsDialogOpen(false);
  }

  function handleEdit(template: B2bEmailTemplate) {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      triggerType: template.triggerType,
      tierFilter: template.tierFilter ? JSON.parse(template.tierFilter) : [],
      subject: template.subject,
      bodyHtml: template.bodyHtml,
      bodyText: template.bodyText,
      daysBeforeEvent: template.daysBeforeEvent,
      active: template.active,
    });
    setIsDialogOpen(true);
  }

  function handleSubmit() {
    const payload = {
      ...formData,
      tierFilter: formData.tierFilter.length > 0 ? JSON.stringify(formData.tierFilter) : null,
    };

    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function insertVariable(variable: string, field: 'subject' | 'bodyHtml' | 'bodyText') {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field] + variable,
    }));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" data-testid="heading-email-templates">Email Templates</h2>
          <p className="text-muted-foreground">Create automated email campaigns with personalized variables</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-template">
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading templates...</div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No email templates yet. Create your first one!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id} data-testid={`card-template-${template.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {template.name}
                      {!template.active && (
                        <span className="text-xs bg-muted px-2 py-1 rounded">Inactive</span>
                      )}
                    </CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(template)}
                      data-testid={`button-edit-template-${template.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm('Delete this template?')) {
                          deleteMutation.mutate(template.id);
                        }
                      }}
                      data-testid={`button-delete-template-${template.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-4">
                    <span className="text-muted-foreground">Trigger:</span>
                    <span>{triggerTypes.find(t => t.value === template.triggerType)?.label}</span>
                  </div>
                  {template.tierFilter && (
                    <div className="flex gap-4">
                      <span className="text-muted-foreground">Tiers:</span>
                      <span>{JSON.parse(template.tierFilter).join(', ')}</span>
                    </div>
                  )}
                  <div className="flex gap-4">
                    <span className="text-muted-foreground">Subject:</span>
                    <span className="truncate">{template.subject}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Email Automation Logs */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Email Automation History
          </CardTitle>
          <CardDescription>Recent automated and manual email sends</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingLogs ? (
            <div className="text-center py-8 text-muted-foreground">Loading logs...</div>
          ) : automationLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No email history yet
            </div>
          ) : (
            <div className="space-y-2">
              {automationLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 border rounded-lg"
                  data-testid={`log-${log.id}`}
                >
                  <div className="flex-shrink-0">
                    {log.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600" data-testid={`icon-success-${log.id}`} />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" data-testid={`icon-error-${log.id}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold truncate" data-testid={`log-subject-${log.id}`}>
                        {log.subject}
                      </p>
                      <Badge variant={log.success ? 'default' : 'destructive'} data-testid={`log-status-${log.id}`}>
                        {log.success ? 'Sent' : 'Failed'}
                      </Badge>
                      <Badge variant="outline" data-testid={`log-trigger-${log.id}`}>
                        {triggerTypes.find(t => t.value === log.triggerType)?.label || log.triggerType}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid={`log-recipient-${log.id}`}>
                      To: {log.recipientEmail}
                    </p>
                    {!log.success && log.errorMessage && (
                      <p className="text-sm text-red-600 mt-1" data-testid={`log-error-${log.id}`}>
                        Error: {log.errorMessage}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm text-muted-foreground whitespace-nowrap">
                    <p data-testid={`log-date-${log.id}`}>
                      {format(new Date(log.sentAt), "MMM d, yyyy")}
                    </p>
                    <p data-testid={`log-time-${log.id}`}>
                      {format(new Date(log.sentAt), "h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) resetForm();
        setIsDialogOpen(open);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-email-template">
              {editingTemplate ? 'Edit Template' : 'Create Template'}
            </DialogTitle>
            <DialogDescription>
              Use variables like {'{{customerName}}'} to personalize emails
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="First Order Welcome"
                  data-testid="input-template-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="triggerType">Trigger Type</Label>
                <Select
                  value={formData.triggerType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, triggerType: value }))}
                >
                  <SelectTrigger id="triggerType" data-testid="select-trigger-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Sent to new customers after their first order"
                data-testid="input-description"
              />
            </div>

            {formData.triggerType === 'commitment_renewal' && (
              <div className="space-y-2">
                <Label htmlFor="daysBeforeEvent">Days Before Renewal</Label>
                <Input
                  id="daysBeforeEvent"
                  type="number"
                  value={formData.daysBeforeEvent || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, daysBeforeEvent: e.target.value ? parseInt(e.target.value) : null }))}
                  placeholder="30"
                  data-testid="input-days-before"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Tier Filter (leave empty for all)</Label>
              <div className="flex flex-wrap gap-2">
                {tiers.map((tier) => (
                  <Button
                    key={tier}
                    size="sm"
                    variant={formData.tierFilter.includes(tier) ? 'default' : 'outline'}
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        tierFilter: prev.tierFilter.includes(tier)
                          ? prev.tierFilter.filter(t => t !== tier)
                          : [...prev.tierFilter, tier]
                      }));
                    }}
                    data-testid={`button-tier-filter-${tier}`}
                  >
                    {tier}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                data-testid="switch-active"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="subject">Email Subject</Label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowVariables(!showVariables)}
                  data-testid="button-toggle-variables"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {showVariables ? 'Hide' : 'Show'} Variables
                </Button>
              </div>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Welcome to Nashoba Valley Winery, {{customerName}}!"
                data-testid="input-subject"
              />
            </div>

            {showVariables && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Available Variables</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {availableVariables.map((v) => (
                      <Button
                        key={v.key}
                        size="sm"
                        variant="ghost"
                        className="justify-start h-auto py-2"
                        onClick={() => {
                          navigator.clipboard.writeText(v.key);
                          toast({ title: 'Copied to clipboard!' });
                        }}
                        data-testid={`button-variable-${v.key}`}
                      >
                        <Copy className="w-3 h-3 mr-2 flex-shrink-0" />
                        <div className="text-left">
                          <div className="font-mono">{v.key}</div>
                          <div className="text-xs text-muted-foreground">{v.description}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label htmlFor="bodyHtml">Email Body (HTML)</Label>
              <Textarea
                id="bodyHtml"
                value={formData.bodyHtml}
                onChange={(e) => setFormData(prev => ({ ...prev, bodyHtml: e.target.value }))}
                placeholder="<h1>Welcome {{customerName}}!</h1><p>Thank you for your order...</p>"
                rows={8}
                data-testid="textarea-body-html"
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bodyText">Email Body (Plain Text)</Label>
              <Textarea
                id="bodyText"
                value={formData.bodyText}
                onChange={(e) => setFormData(prev => ({ ...prev, bodyText: e.target.value }))}
                placeholder="Welcome {{customerName}}! Thank you for your order..."
                rows={6}
                data-testid="textarea-body-text"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm} data-testid="button-cancel">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || !formData.subject || !formData.bodyHtml || !formData.bodyText}
              data-testid="button-save-template"
            >
              {editingTemplate ? 'Update' : 'Create'} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
