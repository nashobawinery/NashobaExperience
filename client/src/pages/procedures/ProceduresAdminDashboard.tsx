import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ClipboardList, Users, FileText, Settings, ChevronRight, Sunrise, Sunset, Calendar, QrCode, Download, Printer, ExternalLink, Copy, Check, UserPlus, Trash2, Pencil, Home } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { ProceduresStaff } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProceduresTemplate } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import QRCodeLib from "qrcode";

type ProceduresAdminDashboardProps = {
  embeddedInStaffReporting?: boolean;
  basePath?: string;
};

export default function ProceduresAdminDashboard({
  embeddedInStaffReporting = false,
  basePath = "/procedures",
}: ProceduresAdminDashboardProps) {
  const [, setLocation] = useLocation();
  const [selectedDepartment, setSelectedDepartment] = useState<string>("__all__");
  const [selectedType, setSelectedType] = useState<string>("__all__");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("procedures");
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<ProceduresStaff | null>(null);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffCode, setNewStaffCode] = useState("");
  const [newStaffDepartment, setNewStaffDepartment] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [procedureToDelete, setProcedureToDelete] = useState<ProceduresTemplate | null>(null);
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const staffLoginUrl = `${window.location.origin}/staff`;
  const newTemplatePath = `${basePath}/templates/new`;
  const getTemplatePath = (templateId: string) => `${basePath}/templates/${templateId}`;

  const { data: templates, isLoading: templatesLoading } = useQuery<ProceduresTemplate[]>({
    queryKey: ["/api/procedures/templates"],
  });

  const { data: departments } = useQuery<{ department: string; departmentLabel: string }[]>({
    queryKey: ["/api/procedures/departments"],
  });

  const { data: staffList, isLoading: staffLoading } = useQuery<ProceduresStaff[]>({
    queryKey: ["/api/procedures/staff"],
  });

  const createStaffMutation = useMutation({
    mutationFn: async (data: { staffName: string; code: string; department?: string }) => {
      const response = await apiRequest("POST", "/api/procedures/staff", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procedures/staff"] });
      toast({ title: "Staff member added", description: "The staff member has been created successfully." });
      resetStaffForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create staff member", variant: "destructive" });
    }
  });

  const updateStaffMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProceduresStaff> }) => {
      const response = await apiRequest("PATCH", `/api/procedures/staff/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procedures/staff"] });
      toast({ title: "Staff member updated", description: "The staff member has been updated successfully." });
      resetStaffForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update staff member", variant: "destructive" });
    }
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/procedures/staff/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procedures/staff"] });
      toast({ title: "Staff member removed", description: "The staff member has been removed." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete staff member", variant: "destructive" });
    }
  });

  const copyTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await apiRequest("POST", `/api/procedures/templates/${templateId}/copy`);
      return response.json();
    },
    onSuccess: (newTemplate) => {
      queryClient.invalidateQueries({ queryKey: ["/api/procedures/templates"] });
      toast({ 
        title: "Procedure copied", 
        description: `Created "${newTemplate.procedureName}". The copy is set to inactive so you can review it.` 
      });
      setLocation(getTemplatePath(newTemplate.id));
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to copy procedure", variant: "destructive" });
    }
  });

  const handleCopyTemplate = (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    copyTemplateMutation.mutate(templateId);
  };

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      await apiRequest("DELETE", `/api/procedures/templates/${templateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procedures/templates"] });
      toast({ title: "Procedure deleted", description: "The procedure has been permanently deleted." });
      setDeleteConfirmOpen(false);
      setProcedureToDelete(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete procedure", variant: "destructive" });
    }
  });

  const handleDeleteClick = (e: React.MouseEvent, template: ProceduresTemplate) => {
    e.stopPropagation();
    setProcedureToDelete(template);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (procedureToDelete) {
      deleteTemplateMutation.mutate(procedureToDelete.id);
    }
  };

  const resetStaffForm = () => {
    setStaffDialogOpen(false);
    setEditingStaff(null);
    setNewStaffName("");
    setNewStaffCode("");
    setNewStaffDepartment("");
  };

  const handleAddStaff = () => {
    setEditingStaff(null);
    setNewStaffName("");
    setNewStaffCode("");
    setNewStaffDepartment("");
    setStaffDialogOpen(true);
  };

  const handleEditStaff = (staff: ProceduresStaff) => {
    setEditingStaff(staff);
    setNewStaffName(staff.staffName);
    setNewStaffCode(staff.code);
    setNewStaffDepartment(staff.department || "");
    setStaffDialogOpen(true);
  };

  const handleSaveStaff = () => {
    if (!newStaffName.trim() || !newStaffCode.trim()) {
      toast({ title: "Missing fields", description: "Please enter a name and access code.", variant: "destructive" });
      return;
    }
    if (editingStaff) {
      updateStaffMutation.mutate({
        id: editingStaff.id,
        data: { staffName: newStaffName, code: newStaffCode, department: newStaffDepartment || null }
      });
    } else {
      createStaffMutation.mutate({
        staffName: newStaffName,
        code: newStaffCode,
        department: newStaffDepartment || undefined
      });
    }
  };

  useEffect(() => {
    if (canvasRef.current) {
      QRCodeLib.toCanvas(
        canvasRef.current,
        staffLoginUrl,
        {
          width: 200,
          margin: 2,
          color: {
            dark: "#7C2D3A",
            light: "#FFFFFF",
          },
        },
        (error) => {
          if (error) console.error("QR Code generation error:", error);
        }
      );
    }
  }, [staffLoginUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(staffLoginUrl);
      setCopied(true);
      toast({ title: "Link copied", description: "Staff Portal link copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({ title: "Failed to copy", description: "Please copy the link manually", variant: "destructive" });
    }
  };

  const handleDownloadQR = () => {
    if (canvasRef.current) {
      const url = canvasRef.current.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = "staff-procedures-qr.png";
      link.href = url;
      link.click();
    }
  };

  const handlePrintQR = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow && canvasRef.current) {
      const imageUrl = canvasRef.current.toDataURL("image/png");
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Staff Procedures - QR Code</title>
            <style>
              body {
                margin: 0;
                padding: 40px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                font-family: system-ui, -apple-system, sans-serif;
              }
              h1 { font-size: 28px; margin-bottom: 10px; text-align: center; color: #7C2D3A; }
              p { font-size: 16px; margin-bottom: 20px; text-align: center; color: #666; }
              img { max-width: 300px; border: 2px solid #7C2D3A; border-radius: 8px; padding: 16px; background: white; }
              .url { margin-top: 16px; font-size: 12px; color: #999; word-break: break-all; }
            </style>
          </head>
          <body>
            <h1>Opening and Closing Procedures</h1>
            <p>Scan to access your assigned procedures</p>
            <img src="${imageUrl}" alt="QR Code" />
            <div class="url">${staffLoginUrl}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 250);
    }
  };

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
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/staff-reporting")}
              data-testid="button-return-staff-reporting"
            >
              Staff Reporting
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setLocation("/")}
              data-testid="button-return-hub"
            >
              <Home className="w-4 h-4 mr-2" />
              Return to Hub
            </Button>
          </div>
          <div>
            <h1 className="text-3xl font-bold">Opening and Closing Procedures</h1>
            <p className="text-muted-foreground mt-1">
              Manage opening, closing, and general procedure checklists for your team
            </p>
          </div>
        </div>
        <Link href={newTemplatePath}>
          <Button data-testid="button-create-procedure">
            <Plus className="w-4 h-4 mr-2" />
            New Procedure
          </Button>
        </Link>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex-shrink-0 flex justify-center p-4 bg-white rounded-lg">
              <canvas ref={canvasRef} data-testid="canvas-staff-qr" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <QrCode className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">Staff Portal</h3>
                </div>
                <p className="text-muted-foreground text-sm">
                  Share this link or QR code with your staff to access Daily Reports and Opening and Closing Procedures.
                  Staff will need their access code to log in.
                </p>
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-background rounded-lg border">
                <span className="flex-1 font-mono text-sm truncate" data-testid="text-staff-url">{staffLoginUrl}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleCopyLink}
                  data-testid="button-copy-link"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Link href="/staff" target="_blank">
                  <Button variant="ghost" size="icon" data-testid="button-open-staff-login">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleDownloadQR} data-testid="button-download-qr">
                  <Download className="w-4 h-4 mr-2" />
                  Download QR
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrintQR} data-testid="button-print-qr">
                  <Printer className="w-4 h-4 mr-2" />
                  Print QR
                </Button>
                <Link href="/staff" target="_blank">
                  <Button size="sm" data-testid="button-go-to-staff-login">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Staff Portal
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => {
        if (value === "submissions") {
          setLocation("/procedures/submissions");
        } else {
          setActiveTab(value);
        }
      }} className="space-y-6">
        <TabsList>
          <TabsTrigger value="submissions" data-testid="tab-submissions">
            <FileText className="w-4 h-4 mr-2" />
            Submitted Reports
          </TabsTrigger>
          <TabsTrigger value="procedures" data-testid="tab-procedures">
            <ClipboardList className="w-4 h-4 mr-2" />
            Procedures
          </TabsTrigger>
          <TabsTrigger value="staff" data-testid="tab-staff">
            <Users className="w-4 h-4 mr-2" />
            Staff
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
                <Card key={template.id} className="hover-elevate cursor-pointer" onClick={() => setLocation(getTemplatePath(template.id))}>
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
                  <CardFooter className="flex items-center justify-between gap-2">
                    <Badge variant={template.isActive ? "default" : "secondary"}>
                      {template.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => handleCopyTemplate(e, template.id)}
                        disabled={copyTemplateMutation.isPending}
                        data-testid={`button-copy-procedure-${template.id}`}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => handleDeleteClick(e, template)}
                        disabled={deleteTemplateMutation.isPending}
                        data-testid={`button-delete-procedure-${template.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
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
                <Link href={newTemplatePath}>
                  <Button data-testid="button-create-first-procedure">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Procedure
                  </Button>
                </Link>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="staff" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Staff Members</h2>
              <p className="text-sm text-muted-foreground">Manage staff who can access procedures via the Staff Portal</p>
            </div>
            <Button onClick={handleAddStaff} data-testid="button-add-staff">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Staff
            </Button>
          </div>

          {staffLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : staffList && staffList.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {staffList.map((staff) => (
                <Card key={staff.id} data-testid={`card-staff-${staff.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate" data-testid={`text-staff-name-${staff.id}`}>{staff.staffName}</h3>
                        <p className="text-sm text-muted-foreground font-mono" data-testid={`text-staff-code-${staff.id}`}>Code: {staff.code}</p>
                        {staff.department && (
                          <Badge variant="outline" className="mt-2">{departments?.find(d => d.department === staff.department)?.departmentLabel || staff.department}</Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditStaff(staff)} data-testid={`button-edit-staff-${staff.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => deleteStaffMutation.mutate(staff.id)}
                          disabled={deleteStaffMutation.isPending}
                          data-testid={`button-delete-staff-${staff.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                      <Badge variant={staff.isActive ? "default" : "secondary"} className="text-xs">
                        {staff.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {staff.lastUsedAt && (
                        <span className="ml-2">Last used: {new Date(staff.lastUsedAt).toLocaleDateString('en-US')}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <Users className="w-12 h-12 text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">No staff members</h3>
                  <p className="text-muted-foreground mt-1">
                    Add staff members so they can log in and complete assigned procedures
                  </p>
                </div>
                <Button onClick={handleAddStaff} data-testid="button-add-first-staff">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Staff Member
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStaff ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
            <DialogDescription>
              {editingStaff ? "Update the staff member's details" : "Add a new staff member who can access assigned procedures"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="staffName">Name</Label>
              <Input
                id="staffName"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                placeholder="Enter staff name"
                data-testid="input-staff-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staffCode">Access Code</Label>
              <Input
                id="staffCode"
                value={newStaffCode}
                onChange={(e) => setNewStaffCode(e.target.value.toUpperCase())}
                placeholder="Enter access code (e.g., 1234)"
                data-testid="input-staff-access-code"
              />
              <p className="text-xs text-muted-foreground">Staff will use this code to log in at the Staff Portal</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staffDepartment">Department (Optional)</Label>
              <Select value={newStaffDepartment || "__none__"} onValueChange={(v) => setNewStaffDepartment(v === "__none__" ? "" : v)}>
                <SelectTrigger data-testid="select-staff-department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No Department</SelectItem>
                  {departments?.map((d) => (
                    <SelectItem key={d.department} value={d.department}>{d.departmentLabel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetStaffForm} data-testid="button-cancel-staff">Cancel</Button>
            <Button 
              onClick={handleSaveStaff} 
              disabled={createStaffMutation.isPending || updateStaffMutation.isPending}
              data-testid="button-save-staff"
            >
              {(createStaffMutation.isPending || updateStaffMutation.isPending) ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Procedure</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{procedureToDelete?.procedureName}"? This will permanently remove the procedure and all its checklist items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-procedure">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              disabled={deleteTemplateMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-procedure"
            >
              {deleteTemplateMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
