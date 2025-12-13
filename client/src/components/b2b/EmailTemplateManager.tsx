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
import { Plus, Edit2, Trash2, Copy, Eye, FileText, Mail, Clock, CheckCircle, XCircle, Lock, Info, Zap } from "lucide-react";
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

const systemTemplates = [
  {
    id: 'order_delivery_date',
    name: 'Order Delivery Date Request',
    trigger: 'Order Created (Manual)',
    description: 'Sent to the assigned sales rep when a manual order is created. Contains a secure link for the sales rep to set the delivery date with the customer.',
    variables: ['Order ID', 'Customer Name', 'Sales Rep Name', 'Order Items', 'Secure Token Link'],
    category: 'Order Workflow',
  },
  {
    id: 'order_approval_request',
    name: 'Order Approval Request',
    trigger: 'Delivery Date Set',
    description: 'Sent to admin after the sales rep sets a delivery date. Contains order details and a secure link for the admin to approve or reject the order.',
    variables: ['Order ID', 'Customer Name', 'Delivery Date', 'Order Total', 'Secure Token Link'],
    category: 'Order Workflow',
  },
  {
    id: 'delivery_confirmation_request',
    name: 'Delivery Confirmation Request',
    trigger: 'Order Approved',
    description: 'Sent after an order is approved. Contains a secure link for confirming delivery was completed and recording any delivery notes.',
    variables: ['Order ID', 'Customer Name', 'Delivery Date', 'Order Items', 'Secure Token Link'],
    category: 'Order Workflow',
  },
  {
    id: 'payment_confirmation_request',
    name: 'Payment Confirmation Request',
    trigger: 'Delivery Confirmed',
    description: 'Sent after delivery is confirmed. Contains a secure link for recording the payment method and confirming the order is complete.',
    variables: ['Order ID', 'Customer Name', 'Order Total', 'Secure Token Link'],
    category: 'Order Workflow',
  },
  {
    id: 'password_reset',
    name: 'Password Reset Email',
    trigger: 'Reset Requested',
    description: 'Sent when a B2B user (customer or sales rep) requests to reset their password. Contains a secure time-limited reset link.',
    variables: ['User Type/Role', 'Secure Reset Link (expires in 1 hour)'],
    category: 'Authentication',
  },
  {
    id: 'access_request',
    name: 'Wholesale Access Code Request',
    trigger: 'Access Form Submitted',
    description: 'Sent to admin when someone requests an access code through the B2B landing page. Admin can then provide the access code to the requester.',
    variables: ['Requester Name', 'Business Name', 'Email Address'],
    category: 'Onboarding',
  },
  {
    id: 'wholesale_application',
    name: 'New Wholesale Account Application',
    trigger: 'Application Submitted',
    description: 'Sent to admin when a new business completes the wholesale account application form. Contains all submitted business information for review.',
    variables: ['Account Name', 'Customer Type', 'Contact Info', 'License Info', 'Address', 'Notes'],
    category: 'Onboarding',
  },
  {
    id: 'tier_renewal',
    name: 'Tier Commitment Renewal Reminder',
    trigger: 'Approaching Renewal Date',
    description: 'Sent to customers approaching their tier commitment renewal date. Shows their progress toward meeting the case commitment and remaining time.',
    variables: ['Customer Name', 'Tier Name', 'Cases Purchased', 'Cases Remaining', 'Days Until Renewal'],
    category: 'Customer Engagement',
  },
  {
    id: 'favorites_email',
    name: 'Tasting Favorites Email',
    trigger: 'Guest Email Request',
    description: 'Sent to tasting room guests when they request their favorites list via email. Contains all favorited products with notes and pricing.',
    variables: ['Guest Name', 'Product List', 'Product Notes', 'Prices'],
    category: 'Tasting Room',
  },
  {
    id: 'cart_order_email',
    name: 'Tasting Order Notification',
    trigger: 'Cart Submitted',
    description: 'Sent to staff when a guest submits their tasting room order. Contains the full order details including discounts and totals.',
    variables: ['Guest Name', 'Order Items', 'Subtotal', 'Discounts', 'Total'],
    category: 'Tasting Room',
  },
];

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

interface SystemTemplatePreview {
  templateKey: string;
  subject: string;
  html: string;
  text: string;
}

interface SystemTemplateCustomization {
  id?: string;
  templateKey: string;
  customSubject: string;
  customIntroText: string;
  customBodyText: string;
  customClosingText: string;
  active: boolean;
}

export function EmailTemplateManager() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<B2bEmailTemplate | null>(null);
  const [showVariables, setShowVariables] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState<SystemTemplatePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [editSystemDialogOpen, setEditSystemDialogOpen] = useState(false);
  const [editingSystemTemplate, setEditingSystemTemplate] = useState<string | null>(null);
  const [systemCustomization, setSystemCustomization] = useState<SystemTemplateCustomization>({
    templateKey: '',
    customSubject: '',
    customIntroText: '',
    customBodyText: '',
    customClosingText: '',
    active: true,
  });
  const [loadingCustomization, setLoadingCustomization] = useState(false);
  const [savingCustomization, setSavingCustomization] = useState(false);

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

  async function fetchSystemTemplatePreview(templateKey: string) {
    setLoadingPreview(true);
    try {
      const response = await fetch(`/api/b2b/admin/system-templates/preview/${templateKey}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch preview');
      }
      const data = await response.json();
      setPreviewData(data);
      setPreviewDialogOpen(true);
    } catch (error) {
      toast({ 
        title: "Failed to load preview", 
        description: "Could not generate template preview",
        variant: "destructive" 
      });
    } finally {
      setLoadingPreview(false);
    }
  }

  async function openEditSystemDialog(templateKey: string) {
    setEditingSystemTemplate(templateKey);
    setLoadingCustomization(true);
    setEditSystemDialogOpen(true);
    
    try {
      const response = await fetch(`/api/b2b/admin/system-templates/customization/${templateKey}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSystemCustomization({
          id: data.id,
          templateKey: templateKey,
          customSubject: data.customSubject || '',
          customIntroText: data.customIntroText || '',
          customBodyText: data.customBodyText || '',
          customClosingText: data.customClosingText || '',
          active: data.active ?? true,
        });
      } else {
        setSystemCustomization({
          templateKey: templateKey,
          customSubject: '',
          customIntroText: '',
          customBodyText: '',
          customClosingText: '',
          active: true,
        });
      }
    } catch (error) {
      setSystemCustomization({
        templateKey: templateKey,
        customSubject: '',
        customIntroText: '',
        customBodyText: '',
        customClosingText: '',
        active: true,
      });
    } finally {
      setLoadingCustomization(false);
    }
  }

  async function saveSystemCustomization() {
    setSavingCustomization(true);
    try {
      const response = await fetch('/api/b2b/admin/system-templates/customization', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(systemCustomization),
      });
      if (!response.ok) {
        throw new Error('Failed to save customization');
      }
      toast({ title: "Customization saved successfully" });
      setEditSystemDialogOpen(false);
      setEditingSystemTemplate(null);
    } catch (error) {
      toast({ 
        title: "Failed to save customization", 
        variant: "destructive" 
      });
    } finally {
      setSavingCustomization(false);
    }
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

      {/* System Templates Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2" data-testid="heading-system-templates">
            <Lock className="w-5 h-5" />
            System Email Templates
          </CardTitle>
          <CardDescription>
            These are built-in email templates that power the order workflow and automated notifications. 
            They are managed by the system and cannot be edited directly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-muted/50 rounded-lg flex items-start gap-3">
            <Info className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">How System Templates Work</p>
              <p>
                System templates are triggered automatically by specific actions in the platform (like creating an order or setting a delivery date). 
                They use secure token links for each step of the order workflow, ensuring only authorized users can take action.
                These emails are branded with Nashoba Valley Winery styling and include all relevant order information.
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            {['Order Workflow', 'Authentication', 'Onboarding', 'Customer Engagement', 'Tasting Room'].map((category) => {
              const categoryTemplates = systemTemplates.filter(t => t.category === category);
              if (categoryTemplates.length === 0) return null;
              
              return (
                <div key={category}>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    {category}
                  </h4>
                  <div className="grid gap-2">
                    {categoryTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="p-4 border rounded-lg"
                        data-testid={`system-template-${template.id}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h5 className="font-medium" data-testid={`system-template-name-${template.id}`}>
                                {template.name}
                              </h5>
                              <Badge variant="secondary" data-testid={`system-template-badge-${template.id}`}>
                                <Lock className="w-3 h-3 mr-1" />
                                System
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2" data-testid={`system-template-desc-${template.id}`}>
                              {template.description}
                            </p>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <span className="text-muted-foreground">Trigger:</span>
                              <Badge variant="outline" data-testid={`system-template-trigger-${template.id}`}>
                                {template.trigger}
                              </Badge>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1" data-testid={`system-template-variables-${template.id}`}>
                              <span className="text-xs text-muted-foreground mr-1">Variables:</span>
                              {template.variables.map((v, i) => (
                                <Badge key={i} variant="outline" className="text-xs font-normal" data-testid={`system-template-variable-${template.id}-${i}`}>
                                  {v}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex-shrink-0 flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditSystemDialog(template.id)}
                              data-testid={`button-edit-system-template-${template.id}`}
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Customize
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => fetchSystemTemplatePreview(template.id)}
                              disabled={loadingPreview}
                              data-testid={`button-preview-system-template-${template.id}`}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Preview
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

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

      {/* System Template Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-system-preview">
              System Email Preview
            </DialogTitle>
            <DialogDescription>
              Preview of the email template with sample data
            </DialogDescription>
          </DialogHeader>
          
          {previewData && (
            <div className="flex-1 flex flex-col min-h-0 space-y-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Subject:</span>
                <span className="font-medium" data-testid="preview-subject">{previewData.subject}</span>
              </div>
              
              <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
                <iframe
                  srcDoc={previewData.html}
                  title="Email Preview"
                  className="w-full h-full min-h-[400px]"
                  sandbox="allow-same-origin"
                  data-testid="preview-iframe"
                />
              </div>
              
              <div className="text-xs text-muted-foreground text-center">
                This preview uses sample data. Actual emails will contain real order and customer information.
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)} data-testid="button-close-preview">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* System Template Edit/Customize Dialog */}
      <Dialog open={editSystemDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setEditingSystemTemplate(null);
        }
        setEditSystemDialogOpen(open);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-customize-system">
              Customize System Template
            </DialogTitle>
            <DialogDescription>
              Override default text for {systemTemplates.find(t => t.id === editingSystemTemplate)?.name || 'this template'}. 
              Leave fields empty to use the default text.
            </DialogDescription>
          </DialogHeader>
          
          {loadingCustomization ? (
            <div className="py-8 text-center text-muted-foreground">Loading customization...</div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customSubject">Custom Subject Line</Label>
                <Input
                  id="customSubject"
                  value={systemCustomization.customSubject}
                  onChange={(e) => setSystemCustomization(prev => ({ ...prev, customSubject: e.target.value }))}
                  placeholder="Leave empty to use default"
                  data-testid="input-custom-subject"
                />
                <p className="text-xs text-muted-foreground">Override the email subject line</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customIntroText">Custom Introduction Text</Label>
                <Textarea
                  id="customIntroText"
                  value={systemCustomization.customIntroText}
                  onChange={(e) => setSystemCustomization(prev => ({ ...prev, customIntroText: e.target.value }))}
                  placeholder="Leave empty to use default"
                  rows={3}
                  data-testid="textarea-custom-intro"
                />
                <p className="text-xs text-muted-foreground">Opening greeting or introduction paragraph</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customBodyText">Custom Body Text</Label>
                <Textarea
                  id="customBodyText"
                  value={systemCustomization.customBodyText}
                  onChange={(e) => setSystemCustomization(prev => ({ ...prev, customBodyText: e.target.value }))}
                  placeholder="Leave empty to use default"
                  rows={4}
                  data-testid="textarea-custom-body"
                />
                <p className="text-xs text-muted-foreground">Main content of the email</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customClosingText">Custom Closing Text</Label>
                <Textarea
                  id="customClosingText"
                  value={systemCustomization.customClosingText}
                  onChange={(e) => setSystemCustomization(prev => ({ ...prev, customClosingText: e.target.value }))}
                  placeholder="Leave empty to use default"
                  rows={2}
                  data-testid="textarea-custom-closing"
                />
                <p className="text-xs text-muted-foreground">Closing message or signature</p>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  id="customActive"
                  checked={systemCustomization.active}
                  onCheckedChange={(checked) => setSystemCustomization(prev => ({ ...prev, active: checked }))}
                  data-testid="switch-custom-active"
                />
                <Label htmlFor="customActive">Use custom text (when disabled, defaults are used)</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditSystemDialogOpen(false)} 
              data-testid="button-cancel-customize"
            >
              Cancel
            </Button>
            <Button
              onClick={saveSystemCustomization}
              disabled={savingCustomization || loadingCustomization}
              data-testid="button-save-customize"
            >
              {savingCustomization ? 'Saving...' : 'Save Customization'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
