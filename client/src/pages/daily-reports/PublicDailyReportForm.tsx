import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck, AlertTriangle, Star, CheckCircle2, Plus, X, Loader2, Building2, Sunrise, Moon, ListChecks, ChevronRight, Save, Send, RotateCcw, MessageSquare } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import dailyReportIcon from "@assets/Daily Report_1764626305136.png";
import ToastVoidsDiscountsPanel from "@/components/ToastVoidsDiscountsPanel";

interface Procedure {
  id: string;
  name: string;
  description: string | null;
  type: "opening" | "closing" | "general";
  isRequired: boolean;
  sortOrder: number;
}

interface AvailableDepartment {
  department: string;
  departmentLabel: string;
  code: string;
}

interface ValidationResponse {
  staffName: string;
  multipleDepartments: boolean;
  availableDepartments?: AvailableDepartment[];
  department?: string;
  departmentLabel?: string;
  metrics?: Array<{ key: string; label: string; type?: string; unit?: string; options?: Array<{ value: string; label: string }> }>;
  procedures?: Procedure[];
}

interface FormData {
  staffName: string;
  department: string;
  departmentLabel: string;
  code: string;
  metrics: Array<{ key: string; label: string; type?: string; unit?: string; options?: Array<{ value: string; label: string }> }>;
  procedures: Procedure[];
}

interface Incident {
  description: string;
  severity: string;
  category: string;
  followUpRequired: boolean;
  followUpNotes: string;
}

interface RevisionRequest {
  id: string;
  reportId: string;
  requestedByName: string | null;
  requestMessage: string;
  status: string;
  createdAt: string;
  reportDate: string;
  department: string;
  departmentLabel: string;
}

export default function PublicDailyReportForm() {
  const { code: urlCode } = useParams<{ code: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Get department from URL query params (when coming from Staff Portal)
  const urlParams = new URLSearchParams(window.location.search);
  const urlDepartment = urlParams.get('department');
  
  const [enteredCode, setEnteredCode] = useState(urlCode || "");
  const [validatedCode, setValidatedCode] = useState<string | null>(null); // Don't pre-set - let validation set it
  const [isValidating, setIsValidating] = useState(false);
  
  // Multi-department support
  const [validationData, setValidationData] = useState<ValidationResponse | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  
  const [performanceSummary, setPerformanceSummary] = useState("");
  const [overallRating, setOverallRating] = useState<number | null>(null);
  const [hasCustomerConcerns, setHasCustomerConcerns] = useState(false);
  const [customerConcernsSummary, setCustomerConcernsSummary] = useState("");
  const [metricsData, setMetricsData] = useState<Record<string, string>>({});
  const [procedureCompletions, setProcedureCompletions] = useState<Record<string, boolean>>({});
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [currentIncident, setCurrentIncident] = useState<Incident>({
    description: "",
    severity: "low",
    category: "other",
    followUpRequired: false,
    followUpNotes: ""
  });
  const [submitted, setSubmitted] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  
  // Revision request state
  const [revisionResponseText, setRevisionResponseText] = useState<Record<string, string>>({});
  const [respondingToRequestId, setRespondingToRequestId] = useState<string | null>(null);

  // Fetch pending revision requests for this staff member
  const { data: pendingRevisionRequests = [] } = useQuery<RevisionRequest[]>({
    queryKey: ['/api/public/daily-reports/revision-requests', validatedCode],
    queryFn: async () => {
      if (!validatedCode) return [];
      const response = await fetch(`/api/public/daily-reports/revision-requests?code=${validatedCode}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!validatedCode
  });

  // Mutation to respond to a revision request
  const respondToRevisionMutation = useMutation({
    mutationFn: async ({ requestId, responseMessage }: { requestId: string; responseMessage: string }) => {
      const response = await fetch(`/api/public/daily-reports/revision-requests/${requestId}/respond`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseMessage, code: validatedCode })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit response');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/public/daily-reports/revision-requests', validatedCode] });
      setRespondingToRequestId(null);
      setRevisionResponseText({});
      toast({ title: "Response submitted!", description: "Your response has been sent to the admin." });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    }
  });

  // Initialize procedure completions when form data loads
  useEffect(() => {
    if (formData?.procedures && formData.procedures.length > 0) {
      const initialCompletions: Record<string, boolean> = {};
      formData.procedures.forEach(p => {
        initialCompletions[p.id] = false;
      });
      setProcedureCompletions(prev => {
        // Only set if not already initialized
        if (Object.keys(prev).length === 0) {
          return initialCompletions;
        }
        return prev;
      });
    }
  }, [formData?.procedures]);

  useEffect(() => {
    if (urlCode && !validatedCode) {
      handleValidateCode(urlCode);
    }
  }, [urlCode]);

  const handleValidateCode = async (code: string) => {
    if (!code || code.length !== 4) {
      toast({ title: "Please enter a 4-digit code", variant: "destructive" });
      return;
    }

    setIsValidating(true);
    try {
      const response = await fetch(`/api/public/daily-reports/validate/${code}`);
      if (response.ok) {
        const data: ValidationResponse = await response.json();
        setValidatedCode(code);
        setValidationData(data);
        
        if (!urlCode) {
          navigate(`/daily-report/${code}`, { replace: true });
        }

        // If only one department, load form data directly
        if (!data.multipleDepartments && data.department) {
          setFormData({
            staffName: data.staffName,
            department: data.department,
            departmentLabel: data.departmentLabel || data.department,
            code: code,
            metrics: data.metrics || [],
            procedures: data.procedures || []
          });
          setSelectedDepartment(data.department);
        } else if (data.multipleDepartments && urlDepartment) {
          // If department was provided in URL (from Staff Portal), auto-select it
          const matchingDept = data.availableDepartments?.find(d => d.department === urlDepartment);
          if (matchingDept) {
            // Load form data for the pre-selected department
            handleSelectDepartmentFromUrl(urlDepartment, data.staffName);
          }
        }
      } else {
        const error = await response.json();
        toast({ title: error.message || "Invalid code", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Failed to validate code", variant: "destructive" });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSelectDepartment = async (department: string) => {
    if (!validationData?.staffName) return;
    
    setIsLoadingForm(true);
    try {
      const response = await fetch(
        `/api/public/daily-reports/department/${department}/form?staffName=${encodeURIComponent(validationData.staffName)}`
      );
      if (response.ok) {
        const data = await response.json();
        setFormData({
          staffName: data.staffName,
          department: data.department,
          departmentLabel: data.departmentLabel,
          code: data.code,
          metrics: data.metrics || [],
          procedures: data.procedures || []
        });
        setSelectedDepartment(department);
      } else {
        const error = await response.json();
        toast({ title: error.message || "Failed to load form", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Failed to load department form", variant: "destructive" });
    } finally {
      setIsLoadingForm(false);
    }
  };
  
  const handleSelectDepartmentFromUrl = async (department: string, staffName: string) => {
    setIsLoadingForm(true);
    try {
      const response = await fetch(
        `/api/public/daily-reports/department/${department}/form?staffName=${encodeURIComponent(staffName)}`
      );
      if (response.ok) {
        const data = await response.json();
        setFormData({
          staffName: data.staffName,
          department: data.department,
          departmentLabel: data.departmentLabel,
          code: data.code,
          metrics: data.metrics || [],
          procedures: data.procedures || []
        });
        setSelectedDepartment(department);
      } else {
        const error = await response.json();
        toast({ title: error.message || "Failed to load form", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Failed to load department form", variant: "destructive" });
    } finally {
      setIsLoadingForm(false);
    }
  };

  // Group procedures by type
  const groupedProcedures = useMemo(() => {
    if (!formData?.procedures) return { opening: [], closing: [], general: [] };
    return {
      opening: formData.procedures.filter(p => p.type === "opening").sort((a, b) => a.sortOrder - b.sortOrder),
      closing: formData.procedures.filter(p => p.type === "closing").sort((a, b) => a.sortOrder - b.sortOrder),
      general: formData.procedures.filter(p => p.type === "general").sort((a, b) => a.sortOrder - b.sortOrder),
    };
  }, [formData?.procedures]);

  const hasProcedures = formData?.procedures && formData.procedures.length > 0;
  const requiredProcedures = formData?.procedures?.filter(p => p.isRequired) || [];
  const requiredCompleted = requiredProcedures.every(p => procedureCompletions[p.id] === true);

  const getReportPayload = () => {
    const codeToSubmit = formData?.code || validatedCode;
    const now = new Date();
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return {
      code: codeToSubmit,
      department: formData?.department || selectedDepartment,
      reportDate: localDate,
      performanceSummary: performanceSummary || null,
      overallRating,
      hasCustomerConcerns,
      customerConcernsSummary: hasCustomerConcerns ? customerConcernsSummary : null,
      metricsData: Object.keys(metricsData).length > 0 ? metricsData : null,
      incidents: incidents.length > 0 ? incidents : null,
      procedureCompletions: Object.keys(procedureCompletions).length > 0 ? procedureCompletions : null
    };
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/public/daily-reports/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getReportPayload())
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit report");
      }
      return response.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: "Report submitted successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    }
  });

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/public/daily-reports/save-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getReportPayload())
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save draft");
      }
      return response.json();
    },
    onSuccess: () => {
      setDraftSaved(true);
      toast({ title: "Draft saved successfully!", description: "You can come back later to finish and submit." });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    }
  });

  const addIncident = () => {
    if (!currentIncident.description.trim()) {
      toast({ title: "Please enter an incident description", variant: "destructive" });
      return;
    }
    setIncidents([...incidents, currentIncident]);
    setCurrentIncident({
      description: "",
      severity: "low",
      category: "other",
      followUpRequired: false,
      followUpNotes: ""
    });
    setShowIncidentForm(false);
  };

  const removeIncident = (index: number) => {
    setIncidents(incidents.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setSubmitted(false);
    setDraftSaved(false);
    setPerformanceSummary("");
    setOverallRating(null);
    setHasCustomerConcerns(false);
    setCustomerConcernsSummary("");
    setMetricsData({});
    setProcedureCompletions({});
    setIncidents([]);
  };

  if (submitted || draftSaved) {
    const hasMultipleDepartments = validationData?.multipleDepartments && validationData.availableDepartments;
    const isDraft = draftSaved && !submitted;
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className={`w-16 h-16 ${isDraft ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30'} rounded-full flex items-center justify-center mx-auto mb-4`}>
              {isDraft ? (
                <Save className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              ) : (
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              )}
            </div>
            <h2 className="text-2xl font-semibold mb-2">
              {isDraft ? "Draft Saved!" : "Report Submitted!"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {isDraft 
                ? `Your draft report for ${formData?.departmentLabel} has been saved. You can complete and submit it later from the admin dashboard.`
                : `Thank you for submitting your daily report for ${formData?.departmentLabel}. Your manager will be notified.`
              }
            </p>
            <div className="space-y-3">
              <Button 
                onClick={resetForm}
                className="w-full"
                data-testid="button-submit-another"
              >
                {isDraft ? "Start a New Report" : `Submit Another Report for ${formData?.departmentLabel}`}
              </Button>
              {hasMultipleDepartments && (
                <Button 
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setSelectedDepartment(null);
                    setFormData(null);
                  }}
                  className="w-full"
                  data-testid="button-switch-department"
                >
                  Switch to a Different Department
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!validatedCode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <img src={dailyReportIcon} alt="Daily Report" className="w-16 h-16 object-contain" />
            </div>
            <CardTitle className="text-2xl">Daily Report</CardTitle>
            <CardDescription>Enter your 4-digit access code to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="access-code">Access Code</Label>
                <Input
                  id="access-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="0000"
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-2xl tracking-widest font-mono"
                  data-testid="input-access-code"
                />
              </div>
              <Button 
                className="w-full" 
                onClick={() => handleValidateCode(enteredCode)}
                disabled={isValidating || enteredCode.length !== 4}
                data-testid="button-validate-code"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingForm) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show department selection when staff has multiple departments
  if (validationData?.multipleDepartments && validationData.availableDepartments && !selectedDepartment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <img src={dailyReportIcon} alt="Daily Report" className="w-16 h-16 object-contain" />
            </div>
            <CardTitle className="text-2xl">Select Department</CardTitle>
            <CardDescription>
              Welcome, {validationData.staffName}! Choose which department you're reporting for today.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {validationData.availableDepartments.map((dept) => (
                <button
                  key={dept.department}
                  onClick={() => handleSelectDepartment(dept.department)}
                  className="w-full flex items-center justify-between p-4 rounded-lg border bg-card hover-elevate transition-all text-left"
                  data-testid={`button-select-department-${dept.department}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-medium">{dept.departmentLabel}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t">
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => {
                  setValidatedCode(null);
                  setValidationData(null);
                }}
                data-testid="button-use-different-code"
              >
                Use a Different Code
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Invalid Access Code</h2>
            <p className="text-muted-foreground mb-6">
              This access code is invalid or has been deactivated.
            </p>
            <Button onClick={() => setValidatedCode(null)} data-testid="button-try-another-code">
              Try Another Code
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasMultipleDepartments = validationData?.multipleDepartments && validationData.availableDepartments;

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold text-lg" data-testid="text-department-name">{formData.departmentLabel}</h1>
                <p className="text-sm text-muted-foreground" data-testid="text-staff-name">
                  Reporting as: {formData.staffName}
                </p>
              </div>
            </div>
            {hasMultipleDepartments && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedDepartment(null);
                  setFormData(null);
                  setPerformanceSummary("");
                  setOverallRating(null);
                  setHasCustomerConcerns(false);
                  setCustomerConcernsSummary("");
                  setMetricsData({});
                  setProcedureCompletions({});
                  setIncidents([]);
                }}
                data-testid="button-change-department"
              >
                Change
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {pendingRevisionRequests.length > 0 && (
          <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-yellow-600" />
                <div>
                  <CardTitle className="text-lg">Revision Requests</CardTitle>
                  <CardDescription>You have {pendingRevisionRequests.length} pending revision request{pendingRevisionRequests.length > 1 ? 's' : ''}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingRevisionRequests.map(request => (
                <Card key={request.id} data-testid={`revision-request-card-${request.id}`}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <Badge variant="outline" className="mb-1">
                          {request.departmentLabel}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          Report from {new Date(request.reportDate).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        Pending
                      </Badge>
                    </div>
                    <div className="p-2 bg-muted/50 rounded mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-medium">{request.requestedByName || 'Admin'}</span>
                      </div>
                      <p className="text-sm">{request.requestMessage}</p>
                    </div>
                    
                    {respondingToRequestId === request.id ? (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Type your response..."
                          value={revisionResponseText[request.id] || ''}
                          onChange={(e) => setRevisionResponseText({
                            ...revisionResponseText,
                            [request.id]: e.target.value
                          })}
                          className="min-h-[80px]"
                          data-testid={`textarea-revision-response-${request.id}`}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              if ((revisionResponseText[request.id] || '').trim()) {
                                respondToRevisionMutation.mutate({
                                  requestId: request.id,
                                  responseMessage: revisionResponseText[request.id]
                                });
                              }
                            }}
                            disabled={respondToRevisionMutation.isPending || !(revisionResponseText[request.id] || '').trim()}
                            data-testid={`button-submit-response-${request.id}`}
                          >
                            {respondToRevisionMutation.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4 mr-2" />
                            )}
                            Submit Response
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setRespondingToRequestId(null);
                              setRevisionResponseText({});
                            }}
                            data-testid={`button-cancel-response-${request.id}`}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRespondingToRequestId(request.id)}
                        className="w-full"
                        data-testid={`button-respond-${request.id}`}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Respond to Request
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        )}

        {formData.metrics && formData.metrics.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">Daily Report Fields</CardTitle>
                  <CardDescription>Fill in the applicable fields for your shift</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMetricsData({})}
                  data-testid="button-clear-all-metrics"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Number fields in a compact grid */}
              {formData.metrics.filter(m => m.type === 'number' || m.type === 'currency').length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {formData.metrics.filter(m => m.type === 'number' || m.type === 'currency').map((metric) => (
                    <div key={metric.key} className="space-y-1">
                      <Label htmlFor={`metric-${metric.key}`} className="text-sm">
                        {metric.label}
                      </Label>
                      <Input
                        id={`metric-${metric.key}`}
                        type="number"
                        placeholder="0"
                        value={metricsData[metric.key] || ""}
                        onChange={(e) => setMetricsData({ ...metricsData, [metric.key]: e.target.value })}
                        data-testid={`input-metric-${metric.key}`}
                      />
                    </div>
                  ))}
                </div>
              )}
              
              {/* Text fields displayed full-width for longer entries */}
              {formData.metrics.filter(m => m.type === 'text').map((metric) => (
                <div key={metric.key} className="space-y-1">
                  <Label htmlFor={`metric-${metric.key}`} className="text-sm">
                    {metric.label}
                  </Label>
                  <Textarea
                    id={`metric-${metric.key}`}
                    placeholder={`Enter ${metric.label.toLowerCase()}...`}
                    value={metricsData[metric.key] || ""}
                    onChange={(e) => setMetricsData({ ...metricsData, [metric.key]: e.target.value })}
                    className="min-h-[60px]"
                    data-testid={`input-metric-${metric.key}`}
                  />
                </div>
              ))}

              {/* Checkbox fields */}
              {formData.metrics.filter(m => m.type === 'checkbox').length > 0 && (
                <div className="space-y-2">
                  {formData.metrics.filter(m => m.type === 'checkbox').map((metric) => (
                    <div key={metric.key} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Checkbox
                        id={`metric-${metric.key}`}
                        checked={metricsData[metric.key] === 'true' || metricsData[metric.key] === true}
                        onCheckedChange={(checked) => setMetricsData({ 
                          ...metricsData, 
                          [metric.key]: checked ? 'true' : 'false' 
                        })}
                        data-testid={`checkbox-metric-${metric.key}`}
                      />
                      <Label htmlFor={`metric-${metric.key}`} className="text-sm cursor-pointer">
                        {metric.label}
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              {/* Dropdown fields */}
              {formData.metrics.filter(m => m.type === 'dropdown').map((metric) => (
                <div key={metric.key} className="space-y-1">
                  <Label htmlFor={`metric-${metric.key}`} className="text-sm">
                    {metric.label}
                  </Label>
                  <Select
                    value={metricsData[metric.key] || ""}
                    onValueChange={(value) => setMetricsData({ ...metricsData, [metric.key]: value })}
                  >
                    <SelectTrigger data-testid={`select-metric-${metric.key}`}>
                      <SelectValue placeholder={`Select ${metric.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {(metric.options || []).map((option: { value: string; label: string }) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {hasProcedures && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-primary" />
                Procedure Checklist
              </CardTitle>
              <CardDescription>
                Complete your daily procedures
                {requiredProcedures.length > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 ml-1">
                    ({requiredProcedures.length} required)
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {groupedProcedures.opening.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                    <Sunrise className="w-4 h-4" />
                    Opening Procedures
                  </div>
                  <div className="space-y-2 pl-6">
                    {groupedProcedures.opening.map((procedure) => (
                      <div
                        key={procedure.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                        data-testid={`procedure-${procedure.id}`}
                      >
                        <Checkbox
                          id={`procedure-${procedure.id}`}
                          checked={procedureCompletions[procedure.id] === true}
                          onCheckedChange={(checked) =>
                            setProcedureCompletions({
                              ...procedureCompletions,
                              [procedure.id]: checked === true
                            })
                          }
                          data-testid={`checkbox-procedure-${procedure.id}`}
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={`procedure-${procedure.id}`}
                            className={`text-sm cursor-pointer ${
                              procedureCompletions[procedure.id] ? 'line-through text-muted-foreground' : ''
                            }`}
                          >
                            {procedure.name}
                            {procedure.isRequired && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </Label>
                          {procedure.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {procedure.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {groupedProcedures.general.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-400">
                    <ListChecks className="w-4 h-4" />
                    General Procedures
                  </div>
                  <div className="space-y-2 pl-6">
                    {groupedProcedures.general.map((procedure) => (
                      <div
                        key={procedure.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                        data-testid={`procedure-${procedure.id}`}
                      >
                        <Checkbox
                          id={`procedure-${procedure.id}`}
                          checked={procedureCompletions[procedure.id] === true}
                          onCheckedChange={(checked) =>
                            setProcedureCompletions({
                              ...procedureCompletions,
                              [procedure.id]: checked === true
                            })
                          }
                          data-testid={`checkbox-procedure-${procedure.id}`}
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={`procedure-${procedure.id}`}
                            className={`text-sm cursor-pointer ${
                              procedureCompletions[procedure.id] ? 'line-through text-muted-foreground' : ''
                            }`}
                          >
                            {procedure.name}
                            {procedure.isRequired && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </Label>
                          {procedure.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {procedure.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {groupedProcedures.closing.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-400">
                    <Moon className="w-4 h-4" />
                    Closing Procedures
                  </div>
                  <div className="space-y-2 pl-6">
                    {groupedProcedures.closing.map((procedure) => (
                      <div
                        key={procedure.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                        data-testid={`procedure-${procedure.id}`}
                      >
                        <Checkbox
                          id={`procedure-${procedure.id}`}
                          checked={procedureCompletions[procedure.id] === true}
                          onCheckedChange={(checked) =>
                            setProcedureCompletions({
                              ...procedureCompletions,
                              [procedure.id]: checked === true
                            })
                          }
                          data-testid={`checkbox-procedure-${procedure.id}`}
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={`procedure-${procedure.id}`}
                            className={`text-sm cursor-pointer ${
                              procedureCompletions[procedure.id] ? 'line-through text-muted-foreground' : ''
                            }`}
                          >
                            {procedure.name}
                            {procedure.isRequired && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </Label>
                          {procedure.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {procedure.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!requiredCompleted && requiredProcedures.length > 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Please complete all required procedures (marked with *) before submitting.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Overall Rating</CardTitle>
            <CardDescription>How would you rate today's shift?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setOverallRating(rating)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    overallRating === rating
                      ? 'bg-primary text-primary-foreground scale-110'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                  data-testid={`button-rating-${rating}`}
                >
                  <Star className={`w-5 h-5 ${overallRating && rating <= overallRating ? 'fill-current' : ''}`} />
                </button>
              ))}
            </div>
            {overallRating && (
              <p className="text-center text-sm text-muted-foreground mt-2">
                {overallRating === 1 && "Poor"}
                {overallRating === 2 && "Below Average"}
                {overallRating === 3 && "Average"}
                {overallRating === 4 && "Good"}
                {overallRating === 5 && "Excellent"}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Performance Summary</CardTitle>
            <CardDescription>Brief summary of today's operations</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Describe how operations went today..."
              value={performanceSummary}
              onChange={(e) => setPerformanceSummary(e.target.value)}
              rows={4}
              data-testid="textarea-performance-summary"
            />
          </CardContent>
        </Card>

        <ToastVoidsDiscountsPanel
          date={(() => {
            const now = new Date();
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          })()}
          explainedByName={formData?.staffName}
          mode="edit"
          showDiscounts={true}
        />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Incidents
            </CardTitle>
            <CardDescription>Log any incidents or issues that occurred</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {incidents.length > 0 && (
              <div className="space-y-2">
                {incidents.map((incident, index) => (
                  <div 
                    key={index} 
                    className="flex items-start justify-between gap-2 p-3 bg-muted rounded-lg"
                    data-testid={`incident-${index}`}
                  >
                    <div className="flex-1">
                      <p className="text-sm">{incident.description}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant={
                          incident.severity === 'critical' ? 'destructive' :
                          incident.severity === 'high' ? 'destructive' :
                          incident.severity === 'medium' ? 'secondary' : 'outline'
                        }>
                          {incident.severity}
                        </Badge>
                        <Badge variant="outline">{incident.category}</Badge>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeIncident(index)}
                      data-testid={`button-remove-incident-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {showIncidentForm ? (
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe what happened..."
                    value={currentIncident.description}
                    onChange={(e) => setCurrentIncident({ ...currentIncident, description: e.target.value })}
                    rows={2}
                    data-testid="textarea-incident-description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <Select 
                      value={currentIncident.severity} 
                      onValueChange={(v) => setCurrentIncident({ ...currentIncident, severity: v })}
                    >
                      <SelectTrigger data-testid="select-incident-severity">
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
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select 
                      value={currentIncident.category} 
                      onValueChange={(v) => setCurrentIncident({ ...currentIncident, category: v })}
                    >
                      <SelectTrigger data-testid="select-incident-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="safety">Safety</SelectItem>
                        <SelectItem value="equipment">Equipment</SelectItem>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="inventory">Inventory</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="follow-up"
                    checked={currentIncident.followUpRequired}
                    onCheckedChange={(checked) => setCurrentIncident({ ...currentIncident, followUpRequired: checked === true })}
                  />
                  <Label htmlFor="follow-up" className="text-sm">Requires follow-up</Label>
                </div>
                {currentIncident.followUpRequired && (
                  <div className="space-y-2">
                    <Label>Follow-up Notes</Label>
                    <Textarea
                      placeholder="What needs to be done?"
                      value={currentIncident.followUpNotes}
                      onChange={(e) => setCurrentIncident({ ...currentIncident, followUpNotes: e.target.value })}
                      rows={2}
                      data-testid="textarea-incident-followup"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={addIncident} data-testid="button-add-incident">
                    Add Incident
                  </Button>
                  <Button variant="outline" onClick={() => setShowIncidentForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => setShowIncidentForm(true)}
                data-testid="button-log-incident"
              >
                <Plus className="w-4 h-4 mr-2" />
                Log an Incident
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Customer Concerns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="customer-concerns"
                checked={hasCustomerConcerns}
                onCheckedChange={(checked) => setHasCustomerConcerns(checked === true)}
                data-testid="checkbox-customer-concerns"
              />
              <Label htmlFor="customer-concerns">Any customer concerns or complaints?</Label>
            </div>
            {hasCustomerConcerns && (
              <Textarea
                placeholder="Describe the customer concerns..."
                value={customerConcernsSummary}
                onChange={(e) => setCustomerConcernsSummary(e.target.value)}
                rows={3}
                data-testid="textarea-customer-concerns"
              />
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="secondary"
            className="flex-1" 
            size="lg"
            onClick={() => saveDraftMutation.mutate()}
            disabled={saveDraftMutation.isPending || submitMutation.isPending}
            data-testid="button-save-draft"
          >
            {saveDraftMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save as Draft
              </>
            )}
          </Button>
          <Button 
            className="flex-1" 
            size="lg"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || saveDraftMutation.isPending}
            data-testid="button-submit-report"
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Report
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
