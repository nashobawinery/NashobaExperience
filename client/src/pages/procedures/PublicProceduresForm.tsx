import { useState, useEffect } from "react";
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
import { ArrowLeft, ArrowRight, ClipboardCheck, Loader2, CheckCircle, Sunrise, Sunset, Calendar, LogOut, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ProceduresUser, ProceduresTemplateWithItems, ProceduresItem } from "@shared/schema";

type Stage = "pin" | "select" | "complete" | "success";

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

  return <div className="space-y-1 mt-1">{elements}</div>;
}

export default function PublicProceduresForm() {
  const { toast } = useToast();
  const [stage, setStage] = useState<Stage>("pin");
  const [pin, setPin] = useState("");
  const [user, setUser] = useState<ProceduresUser | null>(null);
  const [selectedProcedure, setSelectedProcedure] = useState<ProceduresTemplateWithItems | null>(null);
  const [answers, setAnswers] = useState<Record<string, { value: any; initials?: string; comment?: string; completedAt?: string }>>({});
  const [notes, setNotes] = useState("");
  const [lateReason, setLateReason] = useState("");
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Check if the current time is past the procedure's completion time deadline
  const isLateSubmission = (): boolean => {
    if (!selectedProcedure?.completionTime) return false;
    const [hours, minutes] = selectedProcedure.completionTime.split(':').map(Number);
    const deadline = new Date();
    deadline.setHours(hours, minutes, 0, 0);
    return startTime > deadline;
  };

  const loginMutation = useMutation({
    mutationFn: async (pinCode: string) => {
      const response = await apiRequest("POST", "/api/procedures/login", { pin: pinCode });
      return response.json();
    },
    onSuccess: (data: ProceduresUser) => {
      setUser(data);
      setStage("select");
    },
    onError: () => {
      toast({ title: "Invalid PIN", description: "Please check your PIN and try again.", variant: "destructive" });
      setPin("");
    }
  });

  const { data: todaysProcedures, isLoading: proceduresLoading, refetch: refetchProcedures } = useQuery<ProceduresTemplateWithItems[]>({
    queryKey: ["/api/procedures/today", user?.id],
    enabled: !!user?.id,
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
      setDraftId(null); // Clear draft after successful submission
    },
    onError: (error: any) => {
      toast({ title: "Error submitting procedure", description: error.message, variant: "destructive" });
    }
  });

  // Save draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = draftId 
        ? `/api/procedures/submissions/${draftId}` 
        : "/api/procedures/submissions";
      const method = draftId ? "PATCH" : "POST";
      const response = await apiRequest(method, url, data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.id) {
        setDraftId(data.id);
      }
      toast({ title: "Progress Saved", description: "Your progress has been saved. You can return later to continue." });
      setIsSavingDraft(false);
    },
    onError: (error: any) => {
      toast({ title: "Error saving progress", description: error.message, variant: "destructive" });
      setIsSavingDraft(false);
    }
  });

  // Function to save current progress as a draft
  const handleSaveDraft = () => {
    if (!selectedProcedure || !user) return;
    setIsSavingDraft(true);
    
    saveDraftMutation.mutate({
      templateId: selectedProcedure.id,
      procedureCode: selectedProcedure.procedureCode,
      department: selectedProcedure.department,
      submittedByUserId: user.id,
      submittedByName: user.displayName,
      submissionDate: new Date().toISOString(),
      dateTimeStarted: startTime.toISOString(),
      dateTimeSubmitted: new Date().toISOString(),
      status: "draft",
      answers,
      notes: notes || null,
      lateReason: isLateSubmission() ? lateReason : null
    });
  };

  useEffect(() => {
    if (user?.id) {
      refetchProcedures();
    }
  }, [user?.id, refetchProcedures]);

  const handleLogin = () => {
    if (pin.length >= 4) {
      loginMutation.mutate(pin);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setPin("");
    setSelectedProcedure(null);
    setAnswers({});
    setNotes("");
    setLateReason("");
    setStage("pin");
  };

  const handleSelectProcedure = async (procedure: ProceduresTemplateWithItems) => {
    setSelectedProcedure(procedure);
    
    // Initialize with empty answers first
    const initialAnswers: Record<string, { value: any; initials?: string; comment?: string }> = {};
    procedure.items.forEach(item => {
      initialAnswers[item.id] = { value: item.responseType === "checkbox" ? false : "" };
    });
    
    // Try to load an existing draft for this procedure
    if (user) {
      try {
        const response = await fetch(`/api/procedures/submissions/draft/${procedure.id}?staffName=${encodeURIComponent(user.displayName)}`);
        if (response.ok) {
          const draft = await response.json();
          if (draft && draft.status === "draft") {
            // Restore saved answers from draft
            const savedAnswers = draft.answers as Record<string, { value: any; initials?: string; comment?: string; completedAt?: string }>;
            if (savedAnswers && typeof savedAnswers === 'object') {
              // Merge saved answers with initial structure
              Object.keys(savedAnswers).forEach(itemId => {
                if (initialAnswers[itemId]) {
                  initialAnswers[itemId] = { ...initialAnswers[itemId], ...savedAnswers[itemId] };
                }
              });
            }
            // Restore notes and late reason
            if (draft.notes) setNotes(draft.notes);
            if (draft.lateReason) setLateReason(draft.lateReason);
            if (draft.dateTimeStarted) setStartTime(new Date(draft.dateTimeStarted));
            setDraftId(draft.id);
            toast({ title: "Draft Loaded", description: "Your previous progress has been restored." });
          }
        }
      } catch (error) {
        // No draft found or error loading - continue with empty form
        console.log("No existing draft found for this procedure");
      }
    }
    
    setAnswers(initialAnswers);
    if (!draftId) {
      setLateReason("");
      setStartTime(new Date()); // Capture when procedure actually starts
    }
    setStage("complete");
  };

  const handleSubmit = () => {
    if (!selectedProcedure || !user) return;

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
        title: "Incomplete Tasks", 
        description: `Please complete all required items: ${incomplete.map(i => i.label).join(", ")}`,
        variant: "destructive"
      });
      return;
    }

    // Validate late reason if submission is late
    if (isLateSubmission() && !lateReason.trim()) {
      toast({
        title: "Late Submission Reason Required",
        description: "Please provide an explanation for why this procedure is being started after the scheduled time.",
        variant: "destructive"
      });
      return;
    }

    submitMutation.mutate({
      templateId: selectedProcedure.id,
      procedureCode: selectedProcedure.procedureCode,
      department: selectedProcedure.department,
      submittedByUserId: user.id,
      submittedByName: user.displayName,
      submissionDate: new Date().toISOString(),
      dateTimeStarted: startTime.toISOString(),
      dateTimeSubmitted: new Date().toISOString(),
      status: "submitted",
      answers,
      notes: notes || null,
      lateReason: isLateSubmission() ? lateReason : null
    });
  };

  const getProcedureTypeIcon = (type: string) => {
    switch (type) {
      case "opening": return <Sunrise className="w-5 h-5 text-amber-500" />;
      case "closing": return <Sunset className="w-5 h-5 text-indigo-500" />;
      default: return <Calendar className="w-5 h-5" />;
    }
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

  const completedCount = selectedProcedure?.items.filter(item => {
    const answer = answers[item.id];
    if (!answer) return false;
    if (item.responseType === "checkbox") return answer.value === true;
    return !!answer.value;
  }).length || 0;

  const progress = selectedProcedure ? (completedCount / selectedProcedure.items.length) * 100 : 0;

  const renderItemInput = (item: ProceduresItem) => {
    const answer = answers[item.id] || { value: "" };

    switch (item.responseType) {
      case "checkbox":
        return (
          <Checkbox
            checked={answer.value === true}
            onCheckedChange={(checked) => updateAnswer(item.id, "value", checked)}
            data-testid={`checkbox-item-${item.id}`}
          />
        );
      case "yes_no":
        return (
          <Select 
            value={answer.value || "__none__"} 
            onValueChange={(v) => updateAnswer(item.id, "value", v === "__none__" ? "" : v)}
          >
            <SelectTrigger className="w-[120px]" data-testid={`select-item-${item.id}`}>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select</SelectItem>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        );
      case "number":
        return (
          <Input
            type="number"
            value={answer.value}
            onChange={(e) => updateAnswer(item.id, "value", e.target.value)}
            className="w-[120px]"
            data-testid={`input-item-${item.id}`}
          />
        );
      case "dropdown":
        return (
          <Select 
            value={answer.value || "__none__"} 
            onValueChange={(v) => updateAnswer(item.id, "value", v === "__none__" ? "" : v)}
          >
            <SelectTrigger className="w-[180px]" data-testid={`select-item-${item.id}`}>
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select option</SelectItem>
              {item.dropdownOptions?.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return (
          <Input
            value={answer.value}
            onChange={(e) => updateAnswer(item.id, "value", e.target.value)}
            placeholder="Enter response"
            className="w-[200px]"
            data-testid={`input-item-${item.id}`}
          />
        );
    }
  };

  if (stage === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-6">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-green-600">Procedure Completed!</h2>
              <p className="text-muted-foreground mt-2">
                {selectedProcedure?.procedureName} has been submitted successfully.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button 
              className="w-full" 
              onClick={() => {
                setSelectedProcedure(null);
                setAnswers({});
                setNotes("");
                setStage("select");
              }}
              data-testid="button-another-procedure"
            >
              Complete Another Procedure
            </Button>
            <Button variant="outline" className="w-full" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (stage === "pin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClipboardCheck className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Daily Procedures</CardTitle>
            <CardDescription>Enter your PIN to access today's procedures</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">PIN Code</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter your PIN"
                maxLength={10}
                className="text-center text-2xl tracking-widest"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                autoFocus
                data-testid="input-pin"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={handleLogin}
              disabled={pin.length < 4 || loginMutation.isPending}
              data-testid="button-login"
            >
              {loginMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Access Procedures
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (stage === "select") {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Today's Procedures</h1>
              <p className="text-muted-foreground">Welcome, {user?.displayName}</p>
            </div>
            <Button variant="outline" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
          </div>

          {proceduresLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="animate-pulse h-6 bg-muted rounded w-1/2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : todaysProcedures && todaysProcedures.length > 0 ? (
            <div className="grid gap-4">
              {todaysProcedures.map((procedure) => (
                <Card 
                  key={procedure.id} 
                  className="hover-elevate cursor-pointer"
                  onClick={() => handleSelectProcedure(procedure)}
                  data-testid={`card-procedure-${procedure.id}`}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      {getProcedureTypeIcon(procedure.procedureType)}
                      <div className="flex-1">
                        <CardTitle>{procedure.procedureName}</CardTitle>
                        <CardDescription>{procedure.items.length} tasks to complete</CardDescription>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold">No Procedures for Today</h3>
                <p className="text-muted-foreground">You have no procedures assigned for today.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setStage("select")} data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{selectedProcedure?.procedureName}</h1>
            <p className="text-sm text-muted-foreground">{user?.displayName}</p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span>{completedCount} of {selectedProcedure?.items.length} tasks completed</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>

        <div className="space-y-3">
          {selectedProcedure?.items.map((item, index) => (
            <Card key={item.id} className="p-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {renderItemInput(item)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.label}</span>
                      {item.isRequired && <Badge variant="destructive" className="text-xs">Required</Badge>}
                    </div>
                    {item.description && (
                      <FormattedText text={item.description} />
                    )}
                  </div>
                </div>

                {(item.requireInitials || item.requireComment) && (
                  <div className="flex gap-3 pl-8">
                    {item.requireInitials && (
                      <div className="space-y-1">
                        <Label className="text-xs">Initials</Label>
                        <Input
                          value={answers[item.id]?.initials || ""}
                          onChange={(e) => updateAnswer(item.id, "initials", e.target.value.toUpperCase())}
                          placeholder="XX"
                          className="w-[80px] uppercase"
                          maxLength={4}
                          data-testid={`input-initials-${item.id}`}
                        />
                      </div>
                    )}
                    {item.requireComment && (
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Comment</Label>
                        <Input
                          value={answers[item.id]?.comment || ""}
                          onChange={(e) => updateAnswer(item.id, "comment", e.target.value)}
                          placeholder="Add a comment..."
                          data-testid={`input-comment-${item.id}`}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {isLateSubmission() && (
          <Card className="p-4 border-amber-500 bg-amber-50 dark:bg-amber-900/10">
            <div className="flex items-start gap-2 mb-2">
              <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300">
                Late Submission
              </Badge>
              <span className="text-sm text-amber-700 dark:text-amber-400">
                This procedure was scheduled to be completed by {selectedProcedure?.completionTime}
              </span>
            </div>
            <div className="space-y-2">
              <Label className="text-amber-800 dark:text-amber-300">
                Reason for Late Submission <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={lateReason}
                onChange={(e) => setLateReason(e.target.value)}
                placeholder="Please explain why this procedure is being started after the scheduled time..."
                className="border-amber-300 focus:border-amber-500"
                data-testid="textarea-late-reason"
              />
            </div>
          </Card>
        )}

        <Card className="p-4">
          <div className="space-y-2">
            <Label>Additional Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about this procedure..."
              data-testid="input-notes"
            />
          </div>
        </Card>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline"
            className="flex-1" 
            size="lg"
            onClick={handleSaveDraft}
            disabled={isSavingDraft || saveDraftMutation.isPending}
            data-testid="button-save-draft"
          >
            {isSavingDraft || saveDraftMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Progress
          </Button>
          <Button 
            className="flex-1" 
            size="lg"
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            data-testid="button-submit"
          >
            {submitMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            Submit Procedure
          </Button>
        </div>
      </div>
    </div>
  );
}
