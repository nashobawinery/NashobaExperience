import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { EnhancementRequest } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Plus,
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  Send,
  CheckCircle2,
  Clock,
  CircleDot,
  Wrench,
  XCircle,
  Loader2,
} from "lucide-react";

const MODULE_OPTIONS = [
  "Admin Dashboard",
  "B2B Wholesale",
  "Command Center",
  "Compliance",
  "Contracts",
  "Daily Procedures",
  "Daily Reports",
  "Department Calendar",
  "LMS / Training",
  "Maintenance",
  "Reservations",
  "Spot Inventory",
  "Staff Portal",
  "Support",
  "Tasting Experience",
  "Toast Connect",
  "Other",
];

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CircleDot }> = {
  new: { label: "New", variant: "destructive", icon: CircleDot },
  reviewing: { label: "Reviewing", variant: "default", icon: Clock },
  in_progress: { label: "In Progress", variant: "default", icon: Wrench },
  completed: { label: "Completed", variant: "secondary", icon: CheckCircle2 },
  declined: { label: "Declined", variant: "outline", icon: XCircle },
};

export default function EnhancementRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isUserAdmin = user?.role === "admin";

  const [statusFilter, setStatusFilter] = useState("all");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [editingRequest, setEditingRequest] = useState<EnhancementRequest | null>(null);
  const [completingRequest, setCompletingRequest] = useState<EnhancementRequest | null>(null);

  const [newForm, setNewForm] = useState({
    title: "",
    description: "",
    module: "",
    submittedBy: "",
    submitterEmail: "",
  });

  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    module: "",
    status: "",
    adminNotes: "",
    submittedBy: "",
    submitterEmail: "",
  });

  const [completeForm, setCompleteForm] = useState({
    changesDescription: "",
    responseMessage: "",
  });

  const { data: requests = [], isLoading } = useQuery<EnhancementRequest[]>({
    queryKey: ["/api/enhancement-requests"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newForm) => {
      const res = await apiRequest("POST", "/api/enhancement-requests", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enhancement-requests"] });
      setShowNewDialog(false);
      setNewForm({ title: "", description: "", module: "", submittedBy: "", submitterEmail: "" });
      toast({ title: "Request submitted", description: "Your enhancement request has been submitted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit request.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/enhancement-requests/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enhancement-requests"] });
      setEditingRequest(null);
      toast({ title: "Updated", description: "Enhancement request updated." });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof completeForm }) => {
      const res = await apiRequest("POST", `/api/enhancement-requests/${id}/complete`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enhancement-requests"] });
      setCompletingRequest(null);
      setCompleteForm({ changesDescription: "", responseMessage: "" });
      toast({ title: "Completed", description: "Request marked as completed and notification sent." });
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: number; direction: "up" | "down" }) => {
      const res = await apiRequest("POST", `/api/enhancement-requests/${id}/vote`, { direction });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enhancement-requests"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/enhancement-requests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enhancement-requests"] });
      toast({ title: "Deleted", description: "Enhancement request removed." });
    },
  });

  const filtered = statusFilter === "all"
    ? requests
    : requests.filter((r) => r.status === statusFilter);

  const openEdit = (r: EnhancementRequest) => {
    setEditForm({
      title: r.title,
      description: r.description,
      module: r.module || "",
      status: r.status,
      adminNotes: r.adminNotes || "",
      submittedBy: r.submittedBy,
      submitterEmail: r.submitterEmail || "",
    });
    setEditingRequest(r);
  };

  const openComplete = (r: EnhancementRequest) => {
    setCompleteForm({ changesDescription: "", responseMessage: "" });
    setCompletingRequest(r);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Enhancement Requests</h1>
            <p className="text-sm text-muted-foreground">Submit and track system enhancement requests</p>
          </div>
          <Button onClick={() => setShowNewDialog(true)} data-testid="button-new-request">
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>

        <Card className="mt-6 p-4">
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground" data-testid="text-request-count">
              {filtered.length} request{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="text-empty-state">
              No enhancement requests found. Click "New Request" to submit one.
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((request) => {
                const statusCfg = STATUS_CONFIG[request.status] || STATUS_CONFIG.new;
                const StatusIcon = statusCfg.icon;
                return (
                  <div
                    key={request.id}
                    className="flex gap-3 p-4 border rounded-md"
                    data-testid={`card-request-${request.id}`}
                  >
                    <div className="flex flex-col items-center gap-1 pt-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => voteMutation.mutate({ id: request.id, direction: "up" })}
                        data-testid={`button-vote-up-${request.id}`}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium tabular-nums" data-testid={`text-votes-${request.id}`}>
                        {request.votes}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => voteMutation.mutate({ id: request.id, direction: "down" })}
                        data-testid={`button-vote-down-${request.id}`}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant={statusCfg.variant} data-testid={`badge-status-${request.id}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusCfg.label}
                        </Badge>
                        {request.module && (
                          <Badge variant="outline" data-testid={`badge-module-${request.id}`}>
                            {request.module}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          by {request.submittedBy}
                        </span>
                      </div>
                      <h3 className="font-medium mb-1" data-testid={`text-title-${request.id}`}>{request.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-3" data-testid={`text-description-${request.id}`}>
                        {request.description}
                      </p>
                      {request.status === "completed" && request.changesDescription && (
                        <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                          <span className="font-medium">Changes made:</span> {request.changesDescription}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Submitted {new Date(request.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })} at {new Date(request.createdAt).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {isUserAdmin && (
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(request)}
                          data-testid={`button-edit-${request.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {request.status !== "completed" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openComplete(request)}
                            data-testid={`button-complete-${request.id}`}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Delete this enhancement request?")) {
                              deleteMutation.mutate(request.id);
                            }
                          }}
                          data-testid={`button-delete-${request.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Enhancement Request</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(newForm);
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="new-name">Your Name</Label>
              <Input
                id="new-name"
                value={newForm.submittedBy}
                onChange={(e) => setNewForm({ ...newForm, submittedBy: e.target.value })}
                required
                data-testid="input-submitter-name"
              />
            </div>
            <div>
              <Label htmlFor="new-email">Your Email (for notifications)</Label>
              <Input
                id="new-email"
                type="email"
                value={newForm.submitterEmail}
                onChange={(e) => setNewForm({ ...newForm, submitterEmail: e.target.value })}
                data-testid="input-submitter-email"
              />
            </div>
            <div>
              <Label htmlFor="new-module">Module</Label>
              <Select value={newForm.module} onValueChange={(v) => setNewForm({ ...newForm, module: v })}>
                <SelectTrigger id="new-module" data-testid="select-module">
                  <SelectValue placeholder="Select a module" />
                </SelectTrigger>
                <SelectContent>
                  {MODULE_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="new-title">Title</Label>
              <Input
                id="new-title"
                value={newForm.title}
                onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                required
                placeholder="Brief summary of the enhancement"
                data-testid="input-title"
              />
            </div>
            <div>
              <Label htmlFor="new-description">Description</Label>
              <Textarea
                id="new-description"
                value={newForm.description}
                onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                required
                rows={5}
                placeholder="Describe what you would like to see changed or added..."
                data-testid="input-description"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-request">
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingRequest} onOpenChange={(open) => !open && setEditingRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Enhancement Request</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editingRequest) {
                updateMutation.mutate({ id: editingRequest.id, data: editForm });
              }
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="edit-name">Submitted By</Label>
              <Input
                id="edit-name"
                value={editForm.submittedBy}
                onChange={(e) => setEditForm({ ...editForm, submittedBy: e.target.value })}
                required
                data-testid="input-edit-submitter"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Submitter Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.submitterEmail}
                onChange={(e) => setEditForm({ ...editForm, submitterEmail: e.target.value })}
                data-testid="input-edit-email"
              />
            </div>
            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger id="edit-status" data-testid="select-edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-module">Module</Label>
              <Select value={editForm.module} onValueChange={(v) => setEditForm({ ...editForm, module: v })}>
                <SelectTrigger id="edit-module" data-testid="select-edit-module">
                  <SelectValue placeholder="Select a module" />
                </SelectTrigger>
                <SelectContent>
                  {MODULE_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                required
                data-testid="input-edit-title"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                required
                rows={4}
                data-testid="input-edit-description"
              />
            </div>
            <div>
              <Label htmlFor="edit-admin-notes">Admin Notes (internal only)</Label>
              <Textarea
                id="edit-admin-notes"
                value={editForm.adminNotes}
                onChange={(e) => setEditForm({ ...editForm, adminNotes: e.target.value })}
                rows={3}
                placeholder="Internal notes about this request..."
                data-testid="input-edit-admin-notes"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingRequest(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-edit">
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!completingRequest} onOpenChange={(open) => !open && setCompletingRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete Enhancement Request</DialogTitle>
          </DialogHeader>
          {completingRequest && (
            <div className="mb-4 p-3 bg-muted rounded-md">
              <p className="font-medium">{completingRequest.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{completingRequest.description}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Requested by {completingRequest.submittedBy}
                {completingRequest.submitterEmail && ` (${completingRequest.submitterEmail})`}
              </p>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (completingRequest) {
                completeMutation.mutate({ id: completingRequest.id, data: completeForm });
              }
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="complete-changes">Changes Made</Label>
              <Textarea
                id="complete-changes"
                value={completeForm.changesDescription}
                onChange={(e) => setCompleteForm({ ...completeForm, changesDescription: e.target.value })}
                rows={4}
                placeholder="Describe the changes that were implemented..."
                required
                data-testid="input-changes-description"
              />
            </div>
            <div>
              <Label htmlFor="complete-response">
                Response to Submitter
                {completingRequest?.submitterEmail && (
                  <span className="text-xs text-muted-foreground ml-2">
                    (will be emailed to {completingRequest.submitterEmail})
                  </span>
                )}
              </Label>
              <Textarea
                id="complete-response"
                value={completeForm.responseMessage}
                onChange={(e) => setCompleteForm({ ...completeForm, responseMessage: e.target.value })}
                rows={4}
                placeholder="Write a message to the person who submitted this request..."
                required
                data-testid="input-response-message"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCompletingRequest(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={completeMutation.isPending} data-testid="button-complete-request">
                {completeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete & Notify
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
