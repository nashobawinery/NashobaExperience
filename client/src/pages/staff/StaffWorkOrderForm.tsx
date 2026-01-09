import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

type DailyReportTemplate = {
  id: string;
  department: string;
  departmentLabel: string;
  isActive: boolean;
};

export default function StaffWorkOrderForm() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [submitted, setSubmitted] = useState(false);
  const [workOrderNumber, setWorkOrderNumber] = useState("");
  
  const params = new URLSearchParams(window.location.search);
  const staffName = params.get("staffName") || "";
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    department: "",
    workOrderType: "repair",
    priority: "medium",
  });

  const { data: departments = [] } = useQuery<DailyReportTemplate[]>({
    queryKey: ["/api/public/daily-reports/departments"],
  });

  const createWorkOrderMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const response = await apiRequest("POST", "/api/maintenance/work-orders/staff", data);
      return response.json();
    },
    onSuccess: (data: { workOrderNumber: string }) => {
      setWorkOrderNumber(data.workOrderNumber);
      setSubmitted(true);
      toast({ title: "Work Order Submitted", description: `Work order ${data.workOrderNumber} has been created.` });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Submit", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({ title: "Title Required", description: "Please enter a title for the work order.", variant: "destructive" });
      return;
    }
    
    if (!formData.department) {
      toast({ title: "Department Required", description: "Please select a department.", variant: "destructive" });
      return;
    }
    
    createWorkOrderMutation.mutate({
      ...formData,
      requestedByName: staffName,
    });
  };

  const handleBack = () => {
    navigate("/staff");
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Work Order Submitted</CardTitle>
            <CardDescription>
              Your work order has been submitted successfully
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Work Order Number</p>
              <p className="text-2xl font-bold font-mono">{workOrderNumber}</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handleBack} data-testid="button-back-to-portal">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Staff Portal
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handleBack} data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <Wrench className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <CardTitle>Submit Work Order</CardTitle>
                <CardDescription>
                  Report a maintenance issue or request a repair
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Brief description of the issue"
                  required
                  data-testid="input-wo-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide details about the issue, location within the area, etc."
                  rows={4}
                  data-testid="input-wo-description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select 
                  value={formData.department} 
                  onValueChange={(v) => setFormData({ ...formData, department: v })}
                >
                  <SelectTrigger data-testid="select-wo-department">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.filter(d => d.isActive).map((dept) => (
                      <SelectItem key={dept.id} value={dept.department}>
                        {dept.departmentLabel || dept.department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="workOrderType">Type</Label>
                  <Select 
                    value={formData.workOrderType} 
                    onValueChange={(v) => setFormData({ ...formData, workOrderType: v })}
                  >
                    <SelectTrigger data-testid="select-wo-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="repair">Repair</SelectItem>
                      <SelectItem value="corrective">Corrective</SelectItem>
                      <SelectItem value="preventive">Preventive</SelectItem>
                      <SelectItem value="inspection">Inspection</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(v) => setFormData({ ...formData, priority: v })}
                  >
                    <SelectTrigger data-testid="select-wo-priority">
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

              {staffName && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Submitting as:</p>
                  <p className="font-medium">{staffName}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={createWorkOrderMutation.isPending}
                data-testid="button-submit-work-order"
              >
                {createWorkOrderMutation.isPending ? "Submitting..." : "Submit Work Order"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
