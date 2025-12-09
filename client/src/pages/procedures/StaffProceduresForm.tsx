import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ClipboardCheck, Loader2, CheckCircle, Sunrise, Sunset, Calendar, LogOut, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ProceduresStaff, ProceduresTemplateWithItems, ProceduresItem } from "@shared/schema";

type Stage = "login" | "select" | "complete" | "success";

function FormattedText({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];
  let currentList: string[] = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={elements.length} className="list-disc list-inside space-y-0.5 ml-1">
          {currentList.map((item, i) => (
            <li key={i} className="text-sm text-muted-foreground">{item}</li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
      currentList.push(trimmed.replace(/^[•\-*]\s*/, ''));
    } else if (trimmed) {
      flushList();
      elements.push(
        <p key={elements.length} className="text-sm text-muted-foreground">{trimmed}</p>
      );
    }
  });
  flushList();

  return <div className="space-y-1">{elements}</div>;
}

export default function StaffProceduresForm() {
  const { toast } = useToast();
  const [stage, setStage] = useState<Stage>("login");
  const [code, setCode] = useState("");
  const [staff, setStaff] = useState<ProceduresStaff | null>(null);
  const [selectedProcedure, setSelectedProcedure] = useState<ProceduresTemplateWithItems | null>(null);
  const [answers, setAnswers] = useState<Record<string, { value: any; initials?: string; comment?: string; completedAt?: string }>>({});
  const [notes, setNotes] = useState("");
  const [startTime] = useState(new Date());

  const loginMutation = useMutation({
    mutationFn: async (accessCode: string) => {
      const response = await apiRequest("POST", "/api/procedures/staff-login", { code: accessCode });
      return response.json();
    },
    onSuccess: (data: ProceduresStaff) => {
      setStaff(data);
      setStage("select");
    },
    onError: () => {
      toast({ title: "Invalid Code", description: "Please check your access code and try again.", variant: "destructive" });
      setCode("");
    }
  });

  const { data: assignedProcedures, isLoading: proceduresLoading } = useQuery<ProceduresTemplateWithItems[]>({
    queryKey: ["/api/procedures/staff-procedures", staff?.id],
    enabled: !!staff?.id,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/procedures/submissions", data);
      return response.json();
    },
    onSuccess: () => {
      setStage("success");
    },
    onError: (error: any) => {
      toast({ title: "Error submitting procedure", description: error.message, variant: "destructive" });
    }
  });

  const handleLogin = () => {
    if (code.length >= 1) {
      loginMutation.mutate(code);
    }
  };

  const handleLogout = () => {
    setStaff(null);
    setCode("");
    setSelectedProcedure(null);
    setAnswers({});
    setNotes("");
    setStage("login");
  };

  const handleSelectProcedure = (procedure: ProceduresTemplateWithItems) => {
    setSelectedProcedure(procedure);
    const initialAnswers: Record<string, { value: any; initials?: string; comment?: string }> = {};
    procedure.items.forEach(item => {
      initialAnswers[item.id] = { value: item.responseType === "checkbox" ? false : "" };
    });
    setAnswers(initialAnswers);
    setStage("complete");
  };

  const handleSubmit = () => {
    if (!selectedProcedure || !staff) return;

    const requiredItems = selectedProcedure.items.filter(i => i.isRequired);
    const incomplete = requiredItems.filter(item => {
      const answer = answers[item.id];
      if (!answer) return true;
      if (item.responseType === "checkbox" && !answer.value) return true;
      if (item.responseType !== "checkbox" && !answer.value) return true;
      if (item.requireInitials && !answer.initials) return true;
      return false;
    });

    if (incomplete.length > 0) {
      toast({
        title: "Incomplete items",
        description: `Please complete all required items: ${incomplete.map(i => i.label).join(", ")}`,
        variant: "destructive"
      });
      return;
    }

    submitMutation.mutate({
      templateId: selectedProcedure.id,
      procedureCode: selectedProcedure.procedureCode,
      department: selectedProcedure.department,
      submittedByName: staff.staffName,
      dateTimeStarted: startTime.toISOString(),
      dateTimeSubmitted: new Date().toISOString(),
      submissionDate: new Date().toISOString(),
      status: "submitted",
      answers,
      notes: notes || null
    });
  };

  const handleBackToSelect = () => {
    setSelectedProcedure(null);
    setAnswers({});
    setNotes("");
    setStage("select");
  };

  const handleStartNew = () => {
    setSelectedProcedure(null);
    setAnswers({});
    setNotes("");
    setStage("select");
  };

  const updateAnswer = (itemId: string, field: string, value: any) => {
    setAnswers(prev => {
      const current = prev[itemId] || { value: "" };
      const updated = { ...current, [field]: value };
      
      // Add completedAt timestamp when a task is completed for the first time
      if (field === "value" && !current.completedAt) {
        const isCompleted = typeof value === "boolean" ? value : (value !== "" && value !== null);
        if (isCompleted) {
          updated.completedAt = new Date().toISOString();
        }
      }
      
      return { ...prev, [itemId]: updated };
    });
  };

  const getCompletedCount = () => {
    if (!selectedProcedure) return 0;
    return selectedProcedure.items.filter(item => {
      const answer = answers[item.id];
      if (!answer) return false;
      if (item.responseType === "checkbox") return answer.value === true;
      return !!answer.value;
    }).length;
  };

  const getProcedureIcon = (type: string) => {
    switch (type) {
      case "opening": return <Sunrise className="w-5 h-5" />;
      case "closing": return <Sunset className="w-5 h-5" />;
      default: return <Calendar className="w-5 h-5" />;
    }
  };

  const renderItemInput = (item: ProceduresItem) => {
    const answer = answers[item.id] || { value: "" };

    switch (item.responseType) {
      case "checkbox":
        return (
          <Checkbox
            checked={answer.value || false}
            onCheckedChange={(checked) => updateAnswer(item.id, "value", checked)}
            data-testid={`checkbox-item-${item.id}`}
          />
        );
      case "text":
        return (
          <Input
            value={answer.value || ""}
            onChange={(e) => updateAnswer(item.id, "value", e.target.value)}
            placeholder="Enter response..."
            data-testid={`input-item-${item.id}`}
          />
        );
      case "number":
        return (
          <Input
            type="number"
            value={answer.value || ""}
            onChange={(e) => updateAnswer(item.id, "value", e.target.value)}
            placeholder="Enter number..."
            data-testid={`input-item-${item.id}`}
          />
        );
      case "yes_no":
        return (
          <Select value={answer.value || ""} onValueChange={(v) => updateAnswer(item.id, "value", v)}>
            <SelectTrigger data-testid={`select-item-${item.id}`}>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        );
      case "dropdown":
        return (
          <Select value={answer.value || ""} onValueChange={(v) => updateAnswer(item.id, "value", v)}>
            <SelectTrigger data-testid={`select-item-${item.id}`}>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {(item.dropdownOptions || []).map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return null;
    }
  };

  // Login Stage
  if (stage === "login") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <User className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Staff Login</CardTitle>
            <CardDescription>Enter your access code to view your assigned procedures</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Access Code</Label>
              <Input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Enter your code"
                className="text-center text-2xl tracking-widest"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                autoFocus
                data-testid="input-staff-code"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleLogin} 
              className="w-full" 
              disabled={code.length < 1 || loginMutation.isPending}
              data-testid="button-staff-login"
            >
              {loginMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Select Procedure Stage
  if (stage === "select") {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Welcome, {staff?.staffName}</h1>
              <p className="text-muted-foreground">Select a procedure to complete</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>

          {proceduresLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !assignedProcedures || assignedProcedures.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Procedures Available</h3>
                <p className="text-muted-foreground">
                  You don't have any procedures assigned for today. Check back later or contact your manager.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {assignedProcedures.map((procedure) => (
                <Card 
                  key={procedure.id} 
                  className="cursor-pointer hover-elevate"
                  onClick={() => handleSelectProcedure(procedure)}
                  data-testid={`card-procedure-${procedure.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {getProcedureIcon(procedure.procedureType)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{procedure.procedureName}</h3>
                        <p className="text-sm text-muted-foreground">{procedure.procedureCode}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{procedure.department}</Badge>
                          <Badge variant="secondary">{procedure.items.length} tasks</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Complete Procedure Stage
  if (stage === "complete" && selectedProcedure) {
    const progress = (getCompletedCount() / selectedProcedure.items.length) * 100;

    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={handleBackToSelect} data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{selectedProcedure.procedureName}</h1>
              <p className="text-sm text-muted-foreground">{selectedProcedure.procedureCode}</p>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Progress</span>
              <span className="text-sm font-medium">{getCompletedCount()} / {selectedProcedure.items.length}</span>
            </div>
            <Progress value={progress} />
          </div>

          <div className="space-y-4 mb-6">
            {selectedProcedure.items.map((item, index) => (
              <Card key={item.id} data-testid={`card-task-${item.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-muted rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium">{item.label}</p>
                          {item.description && (
                            <FormattedText text={item.description} />
                          )}
                        </div>
                        {item.isRequired && <Badge variant="destructive" className="text-xs">Required</Badge>}
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {renderItemInput(item)}
                        {answers[item.id]?.completedAt && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {(() => {
                              try {
                                const date = new Date(answers[item.id].completedAt!);
                                return isNaN(date.getTime()) ? '' : date.toLocaleTimeString();
                              } catch {
                                return '';
                              }
                            })()}
                          </span>
                        )}
                      </div>

                      {(item.requireInitials || item.requireComment) && (
                        <div className="flex gap-2">
                          {item.requireInitials && (
                            <Input
                              placeholder="Initials"
                              value={answers[item.id]?.initials || ""}
                              onChange={(e) => updateAnswer(item.id, "initials", e.target.value)}
                              className="w-20"
                              data-testid={`input-initials-${item.id}`}
                            />
                          )}
                          {item.requireComment && (
                            <Input
                              placeholder="Comment..."
                              value={answers[item.id]?.comment || ""}
                              onChange={(e) => updateAnswer(item.id, "comment", e.target.value)}
                              className="flex-1"
                              data-testid={`input-comment-${item.id}`}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mb-6">
            <CardContent className="p-4">
              <Label>Additional Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes or comments..."
                className="mt-2"
                data-testid="textarea-notes"
              />
            </CardContent>
          </Card>

          <Button 
            onClick={handleSubmit} 
            className="w-full" 
            size="lg"
            disabled={submitMutation.isPending}
            data-testid="button-submit"
          >
            {submitMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            Submit Procedure
          </Button>
        </div>
      </div>
    );
  }

  // Success Stage
  if (stage === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Procedure Submitted</h2>
            <p className="text-muted-foreground mb-6">
              Your procedure has been submitted successfully.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={handleStartNew} data-testid="button-start-new">
                Complete Another Procedure
              </Button>
              <Button variant="outline" onClick={handleLogout} data-testid="button-logout-success">
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
