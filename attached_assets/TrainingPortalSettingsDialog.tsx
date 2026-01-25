import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GraduationCap, QrCode, Loader2, UserCheck, XCircle, Key, Search, BookOpen, Lock, Shield, Clock, FileText, CheckCircle, BarChart } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useFacility } from "@/lib/facility-context";
import type { Staff } from "@shared/schema";

export function TrainingPortalSettingsDialog() {
  const { toast } = useToast();
  const facilityId = useFacility();
  const [open, setOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [newAccessCode, setNewAccessCode] = useState("");
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [isSettingCode, setIsSettingCode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const portalUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/training-portal`
    : "/training-portal";

  const { data: staff = [], isLoading } = useQuery<Staff[]>({
    queryKey: ["/api/staff", { facilityId }],
    enabled: !!facilityId && open,
  });

  const activeStaff = staff.filter(s => s.isActive);
  
  const filteredStaff = activeStaff.filter(s => {
    if (!searchTerm) return true;
    const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) || 
           s.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           s.department?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleSetAccessCode = async () => {
    if (!selectedStaff || newAccessCode.length !== 4) return;
    
    setIsSettingCode(true);
    try {
      await apiRequest("POST", `/api/staff/${selectedStaff.id}/training-access-code`, { accessCode: newAccessCode });
      toast({ title: "Access code set successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      setCodeDialogOpen(false);
      setNewAccessCode("");
      setSelectedStaff(null);
    } catch (error: any) {
      toast({ title: error.message || "Failed to set access code", variant: "destructive" });
    } finally {
      setIsSettingCode(false);
    }
  };

  const handleDisableAccess = async (staffId: string) => {
    try {
      await apiRequest("DELETE", `/api/staff/${staffId}/training-access-code`);
      toast({ title: "Training portal access disabled" });
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
    } catch (error: any) {
      toast({ title: error.message || "Failed to disable access", variant: "destructive" });
    }
  };

  const enabledCount = activeStaff.filter(s => s.trainingPortalEnabled).length;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" data-testid="button-training-portal-settings">
            <GraduationCap className="h-4 w-4 mr-2" />
            Training Portal
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Staff Training Portal
            </DialogTitle>
            <DialogDescription>
              Allow staff to access their assigned training courses using a simple 4-digit access code
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Portal QR Code
                </CardTitle>
                <CardDescription>
                  Print this QR code and place it in common areas. Staff can scan it to access the training portal.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-lg">
                  <QRCodeSVG value={portalUrl} size={200} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Portal URL:</p>
                  <p className="text-xs text-muted-foreground break-all">{portalUrl}</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    navigator.clipboard.writeText(portalUrl);
                    toast({ title: "URL copied to clipboard" });
                  }}
                  data-testid="button-copy-training-portal-url"
                >
                  Copy URL
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Staff Access Codes
                </CardTitle>
                <CardDescription>
                  Manage which staff members can access the training portal and set their access codes.
                  {enabledCount > 0 && (
                    <span className="ml-2">
                      <Badge variant="secondary">{enabledCount} staff enabled</Badge>
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search staff by name, role, or department..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-staff"
                    />
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredStaff.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No staff found.</p>
                    {searchTerm && <p className="text-sm">Try adjusting your search.</p>}
                  </div>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Staff Member</TableHead>
                          <TableHead>Role / Department</TableHead>
                          <TableHead>Portal Access</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStaff.map((member) => (
                          <TableRow key={member.id} data-testid={`row-training-staff-${member.id}`}>
                            <TableCell className="font-medium">
                              {member.firstName} {member.lastName}
                            </TableCell>
                            <TableCell>
                              <span>{member.role}</span>
                              {member.department && (
                                <span className="text-muted-foreground ml-1">/ {member.department}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {member.trainingPortalEnabled ? (
                                <Badge variant="default" className="flex items-center gap-1 w-fit">
                                  <UserCheck className="h-3 w-3" />
                                  Enabled
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                  <XCircle className="h-3 w-3" />
                                  Not Set
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedStaff(member);
                                    setNewAccessCode("");
                                    setCodeDialogOpen(true);
                                  }}
                                  data-testid={`button-set-training-code-${member.id}`}
                                >
                                  {member.trainingPortalEnabled ? "Change Code" : "Set Code"}
                                </Button>
                                {member.trainingPortalEnabled && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDisableAccess(member.id)}
                                    data-testid={`button-disable-training-${member.id}`}
                                  >
                                    Disable
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Documentation
                </CardTitle>
                <CardDescription>
                  Complete guide for setting up and using the Staff Training Portal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Getting Started</h4>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Set a 4-digit access code for each staff member who needs portal access</li>
                    <li>Share the portal URL or print the QR code for staff to scan</li>
                    <li>Staff enter their last name and access code to log in</li>
                    <li>Once logged in, they can view and complete assigned training courses</li>
                  </ol>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Security Features</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <Lock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span><strong>Secure Access Codes:</strong> All access codes are securely hashed (one-way encryption) before storage. They cannot be retrieved or viewed by anyone, including administrators. If a staff member forgets their code, it must be reset.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span><strong>Lockout Protection:</strong> After 5 failed login attempts, the account is locked for 60 seconds to prevent unauthorized access.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span><strong>Session Timeout:</strong> Portal sessions automatically expire after 24 hours for security.</span>
                    </li>
                  </ul>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Staff Portal Features</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <GraduationCap className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span><strong>Course Access:</strong> Staff can view all their assigned training courses with due dates and completion status.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span><strong>Lesson Content:</strong> View text, videos, images, and PDF documents within each course lesson.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span><strong>Quiz Completion:</strong> Take quizzes to test knowledge and complete course requirements.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <BarChart className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span><strong>Progress Tracking:</strong> Lesson progress is tracked automatically as staff complete content.</span>
                    </li>
                  </ul>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Best Practices</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>Use unique access codes for each staff member - do not reuse codes</li>
                    <li>Communicate access codes securely (in person or via secure message)</li>
                    <li>Disable access immediately when staff leave the facility</li>
                    <li>Consider changing codes periodically for enhanced security</li>
                    <li>Print the QR code and place it in break rooms for easy access</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Training Access Code</DialogTitle>
            <DialogDescription>
              Set a 4-digit access code for {selectedStaff?.firstName} {selectedStaff?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-access-code">4-Digit Access Code</Label>
              <Input
                id="new-access-code"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                placeholder="Enter 4-digit code"
                value={newAccessCode}
                onChange={(e) => setNewAccessCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="text-center text-2xl tracking-[0.5em] font-mono"
                data-testid="input-new-training-code"
              />
              <p className="text-xs text-muted-foreground">
                This code will be used by {selectedStaff?.firstName} to access the training portal
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCodeDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSetAccessCode} 
              disabled={isSettingCode || newAccessCode.length !== 4}
              data-testid="button-confirm-training-code"
            >
              {isSettingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set Access Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
