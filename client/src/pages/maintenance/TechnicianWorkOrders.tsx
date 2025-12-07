import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wrench, AlertTriangle, CheckCircle2, Clock, MapPin, 
  Play, Pause, Check, MessageSquare, Package, ChevronRight,
  Calendar, User, FileText
} from "lucide-react";
import { format } from "date-fns";

type WorkOrder = {
  id: string;
  work_order_number: string;
  title: string;
  description: string;
  asset_id: string;
  asset_name: string;
  asset_number: string;
  asset_image: string;
  location_name: string;
  work_order_type: string;
  priority: string;
  status: string;
  due_date: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string;
  actual_end: string;
  estimated_hours: string;
  actual_hours: string;
  instructions: string;
  checklist_items: Array<{ item: string; checked: boolean; notes?: string }>;
  completion_notes: string;
  assignee_first_name: string;
  assignee_last_name: string;
  requester_first_name: string;
  requester_last_name: string;
  requester_email: string;
  created_at: string;
  comments: Array<{
    id: string;
    comment: string;
    first_name: string;
    last_name: string;
    created_at: string;
    is_system_generated: boolean;
  }>;
  partsUsed: Array<{
    id: string;
    part_name: string;
    part_number: string;
    quantity: number;
    total_cost: string;
  }>;
};

const priorityColors: Record<string, string> = {
  critical: "bg-red-500 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-black",
  low: "bg-green-500 text-white",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_progress: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  on_hold: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const priorityIcons: Record<string, React.ReactNode> = {
  critical: <AlertTriangle className="w-4 h-4" />,
  high: <AlertTriangle className="w-4 h-4" />,
  medium: <Clock className="w-4 h-4" />,
  low: <Clock className="w-4 h-4" />,
};

export default function TechnicianWorkOrders() {
  const { toast } = useToast();
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("my-orders");

  const { data: workOrders = [], isLoading } = useQuery<WorkOrder[]>({
    queryKey: ["/api/maintenance/work-orders"],
  });

  const { data: workOrderDetail } = useQuery<WorkOrder>({
    queryKey: ["/api/maintenance/work-orders", selectedWorkOrder],
    enabled: !!selectedWorkOrder,
  });

  const updateWorkOrderMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
      return apiRequest("PUT", `/api/maintenance/work-orders/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/work-orders"] });
      toast({ title: "Work order updated" });
    },
    onError: () => {
      toast({ title: "Failed to update work order", variant: "destructive" });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment: string }) => {
      return apiRequest("POST", `/api/maintenance/work-orders/${id}/comments`, { comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/work-orders", selectedWorkOrder] });
      toast({ title: "Comment added" });
    },
    onError: () => {
      toast({ title: "Failed to add comment", variant: "destructive" });
    },
  });

  const myOrders = workOrders.filter(wo => wo.status !== 'completed' && wo.status !== 'cancelled');
  const completedOrders = workOrders.filter(wo => wo.status === 'completed');

  const handleStartWork = (wo: WorkOrder) => {
    updateWorkOrderMutation.mutate({
      ...wo,
      id: wo.id,
      status: 'in_progress',
    });
  };

  const handleCompleteWork = (wo: WorkOrder, completionNotes: string, actualHours: string) => {
    updateWorkOrderMutation.mutate({
      ...wo,
      id: wo.id,
      status: 'completed',
      completionNotes,
      actualHours: actualHours ? parseFloat(actualHours) : undefined,
    });
    setSelectedWorkOrder(null);
  };

  if (selectedWorkOrder && workOrderDetail) {
    return (
      <WorkOrderDetailView
        workOrder={workOrderDetail}
        onBack={() => setSelectedWorkOrder(null)}
        onStart={() => handleStartWork(workOrderDetail)}
        onComplete={handleCompleteWork}
        onAddComment={(comment) => addCommentMutation.mutate({ id: selectedWorkOrder, comment })}
        isUpdating={updateWorkOrderMutation.isPending}
        isAddingComment={addCommentMutation.isPending}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <h1 className="text-xl font-bold" data-testid="text-page-title">My Work Orders</h1>
        <p className="text-sm text-muted-foreground">Tap an order to view details</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4 pt-4">
        <TabsList className="w-full">
          <TabsTrigger value="my-orders" className="flex-1 gap-2" data-testid="tab-my-orders">
            <Wrench className="w-4 h-4" />
            Active ({myOrders.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex-1 gap-2" data-testid="tab-completed">
            <CheckCircle2 className="w-4 h-4" />
            Completed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-orders" className="mt-4 pb-20">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : myOrders.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
              <p className="text-lg font-medium">All caught up!</p>
              <p className="text-muted-foreground">No active work orders assigned to you</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myOrders.map((wo) => (
                <WorkOrderCard
                  key={wo.id}
                  workOrder={wo}
                  onClick={() => setSelectedWorkOrder(wo.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 pb-20">
          {completedOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No completed work orders
            </div>
          ) : (
            <div className="space-y-3">
              {completedOrders.slice(0, 20).map((wo) => (
                <WorkOrderCard
                  key={wo.id}
                  workOrder={wo}
                  onClick={() => setSelectedWorkOrder(wo.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WorkOrderCard({ 
  workOrder, 
  onClick 
}: { 
  workOrder: WorkOrder; 
  onClick: () => void;
}) {
  return (
    <Card 
      className="hover-elevate active-elevate-2 cursor-pointer"
      onClick={onClick}
      data-testid={`card-work-order-${workOrder.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={priorityColors[workOrder.priority]}>
                {priorityIcons[workOrder.priority]}
                <span className="ml-1 capitalize">{workOrder.priority}</span>
              </Badge>
              <Badge className={statusColors[workOrder.status]}>
                {workOrder.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="font-medium text-sm mb-1">{workOrder.work_order_number}</p>
            <p className="font-medium truncate">{workOrder.title}</p>
            {workOrder.asset_name && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <Wrench className="w-3 h-3" />
                {workOrder.asset_name}
              </p>
            )}
            {workOrder.location_name && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {workOrder.location_name}
              </p>
            )}
            {workOrder.due_date && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Calendar className="w-3 h-3" />
                Due: {format(new Date(workOrder.due_date), 'MMM d, yyyy')}
              </p>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

function WorkOrderDetailView({
  workOrder,
  onBack,
  onStart,
  onComplete,
  onAddComment,
  isUpdating,
  isAddingComment,
}: {
  workOrder: WorkOrder;
  onBack: () => void;
  onStart: () => void;
  onComplete: (wo: WorkOrder, notes: string, hours: string) => void;
  onAddComment: (comment: string) => void;
  isUpdating: boolean;
  isAddingComment: boolean;
}) {
  const [completionNotes, setCompletionNotes] = useState("");
  const [actualHours, setActualHours] = useState(workOrder.estimated_hours || "");
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [newComment, setNewComment] = useState("");

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    onAddComment(newComment);
    setNewComment("");
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-2" data-testid="button-back">
          Back to List
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{workOrder.work_order_number}</p>
            <h1 className="text-lg font-bold">{workOrder.title}</h1>
          </div>
          <Badge className={priorityColors[workOrder.priority]}>
            {workOrder.priority}
          </Badge>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="p-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge className={statusColors[workOrder.status]}>
                  {workOrder.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Type</span>
                <span className="text-sm capitalize">{workOrder.work_order_type}</span>
              </div>
              {workOrder.asset_name && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Asset</span>
                  <span className="text-sm">{workOrder.asset_name}</span>
                </div>
              )}
              {workOrder.location_name && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Location</span>
                  <span className="text-sm">{workOrder.location_name}</span>
                </div>
              )}
              {workOrder.due_date && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Due Date</span>
                  <span className="text-sm">{format(new Date(workOrder.due_date), 'MMM d, yyyy')}</span>
                </div>
              )}
              {workOrder.estimated_hours && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Estimated Hours</span>
                  <span className="text-sm">{workOrder.estimated_hours}h</span>
                </div>
              )}
              {workOrder.requester_first_name && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Requested By</span>
                  <span className="text-sm">{workOrder.requester_first_name} {workOrder.requester_last_name}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {workOrder.description && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{workOrder.description}</p>
              </CardContent>
            </Card>
          )}

          {workOrder.instructions && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{workOrder.instructions}</p>
              </CardContent>
            </Card>
          )}

          {workOrder.checklist_items && workOrder.checklist_items.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {workOrder.checklist_items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 rounded border">
                      <input 
                        type="checkbox" 
                        checked={item.checked} 
                        readOnly
                        className="mt-1"
                      />
                      <span className="text-sm">{item.item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {workOrder.partsUsed && workOrder.partsUsed.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Parts Used
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {workOrder.partsUsed.map((part) => (
                    <div key={part.id} className="flex items-center justify-between p-2 rounded border">
                      <div>
                        <p className="text-sm font-medium">{part.part_name}</p>
                        <p className="text-xs text-muted-foreground">{part.part_number}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">Qty: {part.quantity}</p>
                        <p className="text-xs text-muted-foreground">${Number(part.total_cost || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Comments ({workOrder.comments?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4">
                {workOrder.comments?.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>
                )}
                {workOrder.comments?.map((comment) => (
                  <div key={comment.id} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {comment.first_name} {comment.last_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm">{comment.comment}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={2}
                  className="flex-1"
                  data-testid="input-comment"
                />
                <Button 
                  onClick={handleAddComment} 
                  disabled={isAddingComment || !newComment.trim()}
                  size="sm"
                  data-testid="button-add-comment"
                >
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex gap-3">
        {workOrder.status === 'open' && (
          <Button 
            className="flex-1" 
            onClick={onStart}
            disabled={isUpdating}
            data-testid="button-start-work"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Work
          </Button>
        )}
        {workOrder.status === 'in_progress' && (
          <>
            <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
              <DialogTrigger asChild>
                <Button className="flex-1" data-testid="button-complete-work">
                  <Check className="w-4 h-4 mr-2" />
                  Complete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Complete Work Order</DialogTitle>
                  <DialogDescription>Add completion notes and actual time spent</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="actualHours">Actual Hours Worked</Label>
                    <Input
                      id="actualHours"
                      type="number"
                      step="0.5"
                      value={actualHours}
                      onChange={(e) => setActualHours(e.target.value)}
                      data-testid="input-actual-hours"
                    />
                  </div>
                  <div>
                    <Label htmlFor="completionNotes">Completion Notes</Label>
                    <Textarea
                      id="completionNotes"
                      value={completionNotes}
                      onChange={(e) => setCompletionNotes(e.target.value)}
                      placeholder="Describe work performed, any issues found..."
                      rows={4}
                      data-testid="input-completion-notes"
                    />
                  </div>
                  <Button 
                    className="w-full"
                    onClick={() => {
                      onComplete(workOrder, completionNotes, actualHours);
                      setShowCompleteDialog(false);
                    }}
                    disabled={isUpdating}
                    data-testid="button-confirm-complete"
                  >
                    Mark as Completed
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
        {workOrder.status === 'completed' && (
          <div className="flex-1 text-center py-3">
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Completed
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
