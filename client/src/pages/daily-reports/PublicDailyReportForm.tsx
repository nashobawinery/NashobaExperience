import { useState, useEffect } from "react";
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
import { ClipboardCheck, AlertTriangle, Star, CheckCircle2, Plus, X, Loader2, Building2 } from "lucide-react";

interface FormData {
  staffName: string;
  department: string;
  departmentLabel: string;
  metrics: Array<{ key: string; label: string; type?: string; unit?: string }>;
}

interface Incident {
  description: string;
  severity: string;
  category: string;
  followUpRequired: boolean;
  followUpNotes: string;
}

export default function PublicDailyReportForm() {
  const { code: urlCode } = useParams<{ code: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [enteredCode, setEnteredCode] = useState(urlCode || "");
  const [validatedCode, setValidatedCode] = useState<string | null>(urlCode || null);
  const [isValidating, setIsValidating] = useState(false);
  
  const [performanceSummary, setPerformanceSummary] = useState("");
  const [overallRating, setOverallRating] = useState<number | null>(null);
  const [hasCustomerConcerns, setHasCustomerConcerns] = useState(false);
  const [customerConcernsSummary, setCustomerConcernsSummary] = useState("");
  const [metricsData, setMetricsData] = useState<Record<string, string>>({});
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

  const { data: formData, isLoading: isLoadingForm, error: formError, refetch } = useQuery<FormData>({
    queryKey: ['/api/public/daily-reports/validate', validatedCode],
    enabled: !!validatedCode,
  });

  useEffect(() => {
    if (urlCode && !validatedCode) {
      handleValidateCode(urlCode);
    }
  }, [urlCode]);

  const handleValidateCode = async (code: string) => {
    if (!code || code.length !== 6) {
      toast({ title: "Please enter a 6-digit code", variant: "destructive" });
      return;
    }

    setIsValidating(true);
    try {
      const response = await fetch(`/api/public/daily-reports/validate/${code}`);
      if (response.ok) {
        setValidatedCode(code);
        if (!urlCode) {
          navigate(`/daily-report/${code}`, { replace: true });
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

  const submitMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/public/daily-reports/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: validatedCode,
          performanceSummary: performanceSummary || null,
          overallRating,
          hasCustomerConcerns,
          customerConcernsSummary: hasCustomerConcerns ? customerConcernsSummary : null,
          metricsData: Object.keys(metricsData).length > 0 ? metricsData : null,
          incidents: incidents.length > 0 ? incidents : null
        })
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

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Report Submitted!</h2>
            <p className="text-muted-foreground mb-6">
              Thank you for submitting your daily report. Your manager will be notified.
            </p>
            <Button 
              onClick={() => {
                setSubmitted(false);
                setPerformanceSummary("");
                setOverallRating(null);
                setHasCustomerConcerns(false);
                setCustomerConcernsSummary("");
                setMetricsData({});
                setIncidents([]);
              }}
              data-testid="button-submit-another"
            >
              Submit Another Report
            </Button>
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
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClipboardCheck className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Daily Report</CardTitle>
            <CardDescription>Enter your 6-digit access code to continue</CardDescription>
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
                  maxLength={6}
                  placeholder="000000"
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-2xl tracking-widest font-mono"
                  data-testid="input-access-code"
                />
              </div>
              <Button 
                className="w-full" 
                onClick={() => handleValidateCode(enteredCode)}
                disabled={isValidating || enteredCode.length !== 6}
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

  if (formError || !formData) {
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

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
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
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {formData.metrics && formData.metrics.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Department Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.metrics.map((metric) => (
                <div key={metric.key} className="space-y-2">
                  <Label htmlFor={`metric-${metric.key}`}>
                    {metric.label} {metric.unit && <span className="text-muted-foreground">({metric.unit})</span>}
                  </Label>
                  <Input
                    id={`metric-${metric.key}`}
                    type={metric.type === 'number' || metric.type === 'currency' ? 'number' : 'text'}
                    placeholder={`Enter ${metric.label.toLowerCase()}`}
                    value={metricsData[metric.key] || ""}
                    onChange={(e) => setMetricsData({ ...metricsData, [metric.key]: e.target.value })}
                    data-testid={`input-metric-${metric.key}`}
                  />
                </div>
              ))}
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

        <Button 
          className="w-full" 
          size="lg"
          onClick={() => submitMutation.mutate()}
          disabled={submitMutation.isPending}
          data-testid="button-submit-report"
        >
          {submitMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Submit Report
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
