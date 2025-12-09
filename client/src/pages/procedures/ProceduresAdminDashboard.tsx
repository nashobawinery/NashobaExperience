import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ClipboardList, Users, FileText, Settings, ChevronRight, Sunrise, Sunset, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProceduresTemplate } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ProceduresAdminDashboard() {
  const [, setLocation] = useLocation();
  const [selectedDepartment, setSelectedDepartment] = useState<string>("__all__");
  const [selectedType, setSelectedType] = useState<string>("__all__");
  const { toast } = useToast();

  const { data: templates, isLoading: templatesLoading } = useQuery<ProceduresTemplate[]>({
    queryKey: ["/api/procedures/templates"],
  });

  const { data: departments } = useQuery<{ department: string; departmentLabel: string }[]>({
    queryKey: ["/api/procedures/departments"],
  });

  const filteredTemplates = templates?.filter((t) => {
    if (selectedDepartment !== "__all__" && t.department !== selectedDepartment) return false;
    if (selectedType !== "__all__" && t.procedureType !== selectedType) return false;
    return true;
  });

  const getProcedureTypeIcon = (type: string) => {
    switch (type) {
      case "opening": return <Sunrise className="w-4 h-4" />;
      case "closing": return <Sunset className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const getProcedureTypeBadge = (type: string) => {
    switch (type) {
      case "opening": return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">Opening</Badge>;
      case "closing": return <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100">Closing</Badge>;
      default: return <Badge variant="secondary">General</Badge>;
    }
  };

  const getDaysLabel = (daysOfWeek: Record<string, boolean> | null) => {
    if (!daysOfWeek) return "No days set";
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const activeDays = days.filter(d => daysOfWeek[d]);
    if (activeDays.length === 7) return "Every day";
    if (activeDays.length === 5 && !daysOfWeek.saturday && !daysOfWeek.sunday) return "Weekdays";
    if (activeDays.length === 2 && daysOfWeek.saturday && daysOfWeek.sunday) return "Weekends";
    return activeDays.map(d => d.slice(0, 3).charAt(0).toUpperCase() + d.slice(1, 3)).join(", ");
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Daily Procedures</h1>
          <p className="text-muted-foreground mt-1">
            Manage opening, closing, and general task checklists for your team
          </p>
        </div>
        <Link href="/procedures/templates/new">
          <Button data-testid="button-create-procedure">
            <Plus className="w-4 h-4 mr-2" />
            New Procedure
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="procedures" className="space-y-6">
        <TabsList>
          <TabsTrigger value="procedures" data-testid="tab-procedures">
            <ClipboardList className="w-4 h-4 mr-2" />
            Procedures
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users" onClick={() => setLocation("/procedures/users")}>
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="submissions" data-testid="tab-submissions" onClick={() => setLocation("/procedures/submissions")}>
            <FileText className="w-4 h-4 mr-2" />
            Submissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="procedures" className="space-y-6">
          <div className="flex flex-wrap gap-4">
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[200px]" data-testid="select-department-filter">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Departments</SelectItem>
                {departments?.map((d) => (
                  <SelectItem key={d.department} value={d.department}>{d.departmentLabel}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[180px]" data-testid="select-type-filter">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Types</SelectItem>
                <SelectItem value="opening">Opening</SelectItem>
                <SelectItem value="closing">Closing</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {templatesLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTemplates && filteredTemplates.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="hover-elevate cursor-pointer" onClick={() => setLocation(`/procedures/templates/${template.id}`)}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate" data-testid={`text-procedure-name-${template.id}`}>
                          {template.procedureName}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {departments?.find(d => d.department === template.department)?.departmentLabel || template.department}
                        </CardDescription>
                      </div>
                      {getProcedureTypeBadge(template.procedureType)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        <span>Code: {template.procedureCode}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{getDaysLabel(template.daysOfWeek as Record<string, boolean> | null)}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between">
                    <Badge variant={template.isActive ? "default" : "secondary"}>
                      {template.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <ClipboardList className="w-12 h-12 text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">No procedures found</h3>
                  <p className="text-muted-foreground mt-1">
                    Get started by creating your first procedure checklist
                  </p>
                </div>
                <Link href="/procedures/templates/new">
                  <Button data-testid="button-create-first-procedure">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Procedure
                  </Button>
                </Link>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
