import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Users, ClipboardList, FileText, Search, Eye, CheckCircle, XCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProceduresSubmission, ProceduresTemplate, ProceduresItem } from "@shared/schema";
import { format } from "date-fns";

export default function ProceduresSubmissions() {
  const [, setLocation] = useLocation();
  const [selectedDepartment, setSelectedDepartment] = useState<string>("__all__");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingSubmission, setViewingSubmission] = useState<ProceduresSubmission | null>(null);

  const { data: submissions, isLoading } = useQuery<ProceduresSubmission[]>({
    queryKey: ["/api/procedures/submissions"],
  });

  const { data: departments } = useQuery<{ department: string; departmentLabel: string }[]>({
    queryKey: ["/api/procedures/departments"],
  });

  const { data: viewingTemplate } = useQuery<{ items: ProceduresItem[] }>({
    queryKey: ["/api/procedures/templates", viewingSubmission?.templateId],
    enabled: !!viewingSubmission?.templateId,
  });

  const filteredSubmissions = submissions?.filter((s) => {
    if (selectedDepartment !== "__all__" && s.department !== selectedDepartment) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!s.submittedByName.toLowerCase().includes(query) && !s.procedureCode.toLowerCase().includes(query)) {
        return false;
      }
    }
    return true;
  });

  const getEmailStatusBadge = (status: string | null) => {
    switch (status) {
      case "success": return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Sent</Badge>;
      case "failed": return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default: return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const getSubmissionStatusBadge = (status: string) => {
    switch (status) {
      case "no_report": return <Badge variant="destructive">NO REPORT FILED</Badge>;
      case "submitted": return <Badge variant="secondary" className="bg-green-100 text-green-800">Submitted</Badge>;
      case "draft": return <Badge variant="outline">Draft</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderAnswer = (answer: any, item: ProceduresItem) => {
    if (!answer) return <span className="text-muted-foreground">-</span>;
    
    const value = answer.value;
    switch (item.responseType) {
      case "checkbox":
        return value ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />;
      case "yes_no":
        return value === "yes" ? <Badge variant="secondary" className="bg-green-100 text-green-800">Yes</Badge> : <Badge variant="secondary" className="bg-red-100 text-red-800">No</Badge>;
      default:
        return <span>{value}</span>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/procedures")} data-testid="button-back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Submissions History</h1>
          <p className="text-muted-foreground">View completed procedure submissions</p>
        </div>
      </div>

      <Tabs defaultValue="submissions">
        <TabsList>
          <TabsTrigger value="submissions" data-testid="tab-submissions">
            <FileText className="w-4 h-4 mr-2" />
            Submissions
          </TabsTrigger>
          <TabsTrigger value="procedures" onClick={() => setLocation("/procedures")} data-testid="tab-procedures">
            <ClipboardList className="w-4 h-4 mr-2" />
            Procedures
          </TabsTrigger>
          <TabsTrigger value="users" onClick={() => setLocation("/procedures/users")} data-testid="tab-users">
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submissions" className="mt-6 space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or code..."
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[200px]" data-testid="select-department">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Departments</SelectItem>
                {departments?.map((d) => (
                  <SelectItem key={d.department} value={d.department}>{d.departmentLabel}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Procedure</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Email Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredSubmissions && filteredSubmissions.length > 0 ? (
                    filteredSubmissions.map((submission) => (
                      <TableRow key={submission.id} className={submission.status === "no_report" ? "bg-red-50 dark:bg-red-900/10" : ""}>
                        <TableCell>
                          <Badge variant="outline">{submission.procedureCode}</Badge>
                        </TableCell>
                        <TableCell>
                          {departments?.find(d => d.department === submission.department)?.departmentLabel || submission.department}
                        </TableCell>
                        <TableCell>
                          {getSubmissionStatusBadge(submission.status)}
                        </TableCell>
                        <TableCell data-testid={`text-submitter-${submission.id}`}>{submission.submittedByName}</TableCell>
                        <TableCell>
                          {format(new Date(submission.submissionDate), "MMM d, yyyy h:mm a")}
                        </TableCell>
                        <TableCell>
                          {getEmailStatusBadge(submission.emailSentStatus)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setViewingSubmission(submission)}
                            data-testid={`button-view-${submission.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No submissions found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!viewingSubmission} onOpenChange={() => setViewingSubmission(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
          </DialogHeader>
          
          {viewingSubmission && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Procedure:</span>
                  <p className="font-medium">{viewingSubmission.procedureCode}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Department:</span>
                  <p className="font-medium">
                    {departments?.find(d => d.department === viewingSubmission.department)?.departmentLabel || viewingSubmission.department}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Submitted By:</span>
                  <p className="font-medium">{viewingSubmission.submittedByName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Submitted At:</span>
                  <p className="font-medium">{format(new Date(viewingSubmission.dateTimeSubmitted), "MMM d, yyyy h:mm a")}</p>
                </div>
              </div>

              {viewingSubmission.lateReason && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-300 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300">
                      Late Submission
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">Reason provided:</span>
                  <p className="mt-1 text-amber-800 dark:text-amber-300">{viewingSubmission.lateReason}</p>
                </div>
              )}

              {viewingSubmission.notes && (
                <div>
                  <span className="text-sm text-muted-foreground">Notes:</span>
                  <p className="mt-1 p-3 bg-muted rounded-md">{viewingSubmission.notes}</p>
                </div>
              )}

              <div>
                <h4 className="font-medium mb-3">Checklist Responses</h4>
                <div className="space-y-2">
                  {viewingTemplate?.items?.map((item) => {
                    const answers = viewingSubmission.answers as Record<string, any>;
                    const answer = answers[item.id];
                    return (
                      <div key={item.id} className="p-3 border rounded-md">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="font-medium">{item.label}</p>
                            {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            {renderAnswer(answer, item)}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2 pt-2 border-t border-dashed">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-muted-foreground">Completed:</span>
                            {answer?.completedAt ? (
                              <span className="font-medium">
                                {(() => {
                                  try {
                                    const date = new Date(answer.completedAt);
                                    return isNaN(date.getTime()) ? 'N/A' : format(date, "h:mm:ss a");
                                  } catch {
                                    return 'N/A';
                                  }
                                })()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic">Not recorded</span>
                            )}
                          </div>
                          {answer?.initials && (
                            <Badge variant="outline" className="text-xs">
                              Initials: {answer.initials}
                            </Badge>
                          )}
                          {answer?.comment && (
                            <span className="text-xs text-muted-foreground max-w-[150px] truncate" title={answer.comment}>
                              {answer.comment}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
