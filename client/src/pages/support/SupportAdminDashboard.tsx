import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { 
  MessageSquare, 
  Bot, 
  User, 
  Clock, 
  CheckCircle2, 
  Circle, 
  Search, 
  Send, 
  RefreshCw,
  ArrowLeft,
  Settings,
  BookOpen,
  Globe,
  AlertCircle,
  Pencil,
  BarChart3,
  Star,
  Mail,
  Loader2,
  CircleDot,
  CheckCircle,
  Archive,
  HelpCircle,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { SupportRequest, SupportMessage } from "@shared/schema";

type SupportRequestWithMessages = SupportRequest & { messages: SupportMessage[] };

const statusConfig: Record<string, { label: string; icon: typeof Circle; className: string }> = {
  new: { label: "New", icon: AlertCircle, className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  open: { label: "Open", icon: CircleDot, className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  customer_replied: { label: "Customer Replied", icon: MessageSquare, className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  pending: { label: "Pending", icon: Loader2, className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  bot_responded: { label: "Bot Responded", icon: Bot, className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  human_responded: { label: "Agent Responded", icon: User, className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  resolved: { label: "Resolved", icon: CheckCircle, className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  closed: { label: "Closed", icon: Archive, className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" }
};

const changeableStatuses = [
  { value: "open", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

function RequestList({ 
  onSelectRequest, 
  selectedRequestId 
}: { 
  onSelectRequest: (id: string) => void;
  selectedRequestId: string | null;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: requests = [], isLoading, refetch } = useQuery<SupportRequest[]>({
    queryKey: ["/api/admin/support/requests"],
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({ title: "Refreshed", description: "Support requests updated" });
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredRequests = requests.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        r.subject?.toLowerCase().includes(term) ||
        r.customerEmail?.toLowerCase().includes(term) ||
        r.customerName?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">Support Requests</CardTitle>
          <Button size="icon" variant="ghost" onClick={handleRefresh} disabled={isRefreshing} data-testid="button-refresh-requests">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="input-search-requests"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            <Badge
              variant={statusFilter === "all" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setStatusFilter("all")}
              data-testid="filter-all"
            >
              All ({requests.length})
            </Badge>
            <Badge
              variant={statusFilter === "new" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setStatusFilter("new")}
              data-testid="filter-new"
            >
              New ({requests.filter(r => r.status === "new").length})
            </Badge>
            <Badge
              variant={statusFilter === "open" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setStatusFilter("open")}
              data-testid="filter-open"
            >
              Open ({requests.filter(r => r.status === "open").length})
            </Badge>
            <Badge
              variant={statusFilter === "pending" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setStatusFilter("pending")}
              data-testid="filter-pending"
            >
              Pending ({requests.filter(r => r.status === "pending").length})
            </Badge>
            <Badge
              variant={statusFilter === "resolved" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setStatusFilter("resolved")}
              data-testid="filter-resolved"
            >
              Resolved ({requests.filter(r => r.status === "resolved").length})
            </Badge>
            <Badge
              variant={statusFilter === "closed" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setStatusFilter("closed")}
              data-testid="filter-closed"
            >
              Closed ({requests.filter(r => r.status === "closed").length})
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-340px)]">
          {isLoading ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              Loading requests...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              No requests found
            </div>
          ) : (
            <div className="divide-y">
              {filteredRequests.map((request) => {
                const status = statusConfig[request.status] || statusConfig.new;
                const StatusIcon = status.icon;
                return (
                  <button
                    key={request.id}
                    onClick={() => onSelectRequest(request.id)}
                    className={`w-full text-left p-4 hover-elevate transition-colors ${
                      selectedRequestId === request.id ? "bg-accent" : ""
                    }`}
                    data-testid={`request-item-${request.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <StatusIcon className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {request.source === 'email' && (
                            <Mail className="h-4 w-4 shrink-0 text-blue-500" />
                          )}
                          <span className="font-medium truncate">{request.subject}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="truncate">
                            {request.customerName || request.customerEmail || "Anonymous"}
                          </span>
                          <span>·</span>
                          <span className="shrink-0">
                            {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <Badge className={`mt-2 ${status.className}`} variant="secondary">
                          {status.label}
                        </Badge>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function ChatView({ requestId, onBack }: { requestId: string; onBack: () => void }) {
  const [newMessage, setNewMessage] = useState("");
  const [aiDraftOpen, setAiDraftOpen] = useState(false);
  const [aiDraftContent, setAiDraftContent] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: request, isLoading } = useQuery<SupportRequestWithMessages>({
    queryKey: ["/api/admin/support/requests", requestId],
    enabled: !!requestId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/admin/support/requests/${requestId}/messages`, { content });
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/requests", requestId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/requests"] });
      toast({ title: "Message sent" });
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  const generateAiDraftMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/support/requests/${requestId}/ai-draft`);
      return res.json();
    },
    onSuccess: (data: { draft: string }) => {
      setAiDraftContent(data.draft);
      setAiDraftOpen(true);
    },
    onError: () => {
      toast({ title: "Failed to generate AI response", variant: "destructive" });
    },
  });

  const sendAiResponseMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/support/requests/${requestId}/ai-response`, { content });
    },
    onSuccess: () => {
      setAiDraftOpen(false);
      setAiDraftContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/requests", requestId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/requests"] });
      toast({ title: "Response sent from Nashoba Team" });
    },
    onError: () => {
      toast({ title: "Failed to send response", variant: "destructive" });
    },
  });

  const closeRequestMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/admin/support/requests/${requestId}/close`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/requests", requestId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/requests"] });
      toast({ title: "Request closed" });
    },
    onError: () => {
      toast({ title: "Failed to close request", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return apiRequest("PATCH", `/api/admin/support/requests/${requestId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/requests", requestId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/requests"] });
      toast({ title: "Status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage.trim());
  };

  if (isLoading) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading conversation...</div>
      </Card>
    );
  }

  if (!request) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Request not found</div>
      </Card>
    );
  }

  const status = statusConfig[request.status] || statusConfig.new;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="ghost" onClick={onBack} className="md:hidden" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {request.source === 'email' && (
                <Badge variant="outline" className="gap-1 text-blue-600 border-blue-300">
                  <Mail className="h-3 w-3" />
                  Email
                </Badge>
              )}
              <CardTitle className="text-lg truncate">{request.subject}</CardTitle>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <span>{request.customerName || request.customerEmail || "Anonymous"}</span>
              <span>·</span>
              <span>{format(new Date(request.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
            </div>
          </div>
          <Select
            value={request.status}
            onValueChange={(value) => updateStatusMutation.mutate(value)}
            disabled={updateStatusMutation.isPending}
          >
            <SelectTrigger className="w-[140px]" data-testid="select-status">
              <SelectValue>
                <Badge className={status.className} variant="secondary">{status.label}</Badge>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {changeableStatuses.map((s) => (
                <SelectItem key={s.value} value={s.value} data-testid={`status-option-${s.value}`}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => generateAiDraftMutation.mutate()}
            disabled={generateAiDraftMutation.isPending || request.status === "closed"}
            data-testid="button-generate-ai"
          >
            <Bot className="h-4 w-4 mr-2" />
            {generateAiDraftMutation.isPending ? "Generating..." : "Generate AI Response"}
          </Button>
        </div>

        <Dialog open={aiDraftOpen} onOpenChange={setAiDraftOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                Edit Response Before Sending
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This response will be sent from the Nashoba Team. Edit the message below before sending.
              </p>
              <Textarea
                value={aiDraftContent}
                onChange={(e) => setAiDraftContent(e.target.value)}
                rows={10}
                className="resize-none"
                data-testid="textarea-ai-draft"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAiDraftOpen(false)} data-testid="button-cancel-ai">
                Cancel
              </Button>
              <Button 
                onClick={() => sendAiResponseMutation.mutate(aiDraftContent)}
                disabled={sendAiResponseMutation.isPending || !aiDraftContent.trim()}
                data-testid="button-send-ai"
              >
                <Send className="h-4 w-4 mr-2" />
                {sendAiResponseMutation.isPending ? "Sending..." : "Send from Nashoba Team"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {request.messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.senderType === "customer" ? "justify-start" : "justify-end"}`}
              data-testid={`message-${message.id}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.senderType === "customer"
                    ? "bg-muted"
                    : message.senderType === "bot"
                    ? "bg-purple-100 dark:bg-purple-900"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                <div className="flex items-center gap-2 mb-1 text-xs opacity-70">
                  {message.senderType === "customer" && <User className="h-3 w-3" />}
                  {message.senderType === "bot" && <Bot className="h-3 w-3" />}
                  {message.senderType === "agent" && <User className="h-3 w-3" />}
                  <span>{message.senderName || "Unknown"}</span>
                  <span>·</span>
                  <span>{format(new Date(message.createdAt), "h:mm a")}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {request.status !== "closed" && (
        <form onSubmit={handleSendMessage} className="p-4 border-t">
          <div className="flex gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="resize-none min-h-[80px]"
              data-testid="input-message"
            />
            <Button
              type="submit"
              disabled={!newMessage.trim() || sendMessageMutation.isPending}
              data-testid="button-send-message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="h-full flex items-center justify-center">
      <div className="text-center text-muted-foreground p-8">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium mb-1">No conversation selected</p>
        <p className="text-sm">Select a support request from the list to view the conversation</p>
      </div>
    </Card>
  );
}

function DocumentationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Customer Support Documentation
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 pb-4">
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Integration Setup
              </h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Your support system receives emails at <strong>support@nashobawinery.com</strong>. Here's how it works:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Emails sent to support@nashobawinery.com are forwarded to support@inbound.nashobawinery.com</li>
                  <li>SendGrid Inbound Parse receives the email and sends it to our webhook</li>
                  <li>The webhook creates a new support ticket automatically</li>
                  <li>You'll see the new ticket appear in this dashboard within 30 seconds</li>
                </ol>
                <div className="bg-muted p-3 rounded-md mt-2">
                  <p className="font-medium text-foreground">DNS Configuration:</p>
                  <p>MX Record: inbound.nashobawinery.com → mx.sendgrid.net (Priority 10)</p>
                  <p>Webhook URL: https://nashobawinery.org/api/webhooks/inbound-email</p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Bot className="h-4 w-4" />
                AI Response System
              </h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>The AI assistant uses your Knowledge Base to generate helpful responses. Every AI response includes this disclaimer:</p>
                <div className="bg-muted p-3 rounded-md italic">
                  "This is an AI generated response. A live agent will review within 24 hours and reach out to you with additional information. If our AI agent has answered your question, please respond 'close' and we will mark our answer as satisfying your needs."
                </div>
                <p className="mt-2"><strong>How to use:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Select a support request from the list</li>
                  <li>Click "Generate AI Response" to create a draft</li>
                  <li>Review and edit the AI's suggestion</li>
                  <li>Click "Send Response" to email it to the customer</li>
                </ol>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Customer Reply Linking
              </h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>When customers reply to your support emails, their responses are automatically linked to the original ticket:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Replies use email headers (In-Reply-To, References) to find the original ticket</li>
                  <li>Customer messages appear in the conversation thread</li>
                  <li>The ticket status updates based on the reply</li>
                </ul>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md mt-2 border border-green-200 dark:border-green-800">
                  <p className="font-medium text-green-800 dark:text-green-200">Auto-Close Feature:</p>
                  <p className="text-green-700 dark:text-green-300">If a customer replies with just "close", "closed", or "resolved", the ticket automatically closes with a note that the AI response was satisfactory.</p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Circle className="h-4 w-4" />
                Ticket Status Flow
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">New</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Email received, awaiting response</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Bot Responded</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">AI response sent, awaiting customer reply</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Open</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Customer replied (not "close"), needs agent review</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Pending</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Waiting for external information</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Resolved</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Issue addressed, pending final confirmation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">Closed</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Ticket complete (auto or manual)</span>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Star className="h-4 w-4" />
                Social Review Monitoring
              </h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Monitor and respond to reviews from Google, Facebook, Yelp, and TripAdvisor:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>Email Detection:</strong> Forward review notification emails to support@nashobawinery.com - they're automatically parsed and imported</li>
                  <li><strong>Manual Import:</strong> Use "Add Review" button to manually enter reviews</li>
                  <li><strong>AI Draft Responses:</strong> Generate professional response drafts with AI</li>
                  <li><strong>Copy + Open:</strong> Copy response and open the platform to paste it (no OAuth needed)</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Knowledge Base
              </h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Build your AI's knowledge by adding:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>Canned Responses:</strong> Pre-written answers for common questions</li>
                  <li><strong>Web Sources:</strong> URLs to scrape for information (hours, menus, policies)</li>
                  <li><strong>FAQ Articles:</strong> Detailed articles for complex topics</li>
                </ul>
                <p className="mt-2">The AI searches your knowledge base to provide accurate, consistent responses.</p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Auto-Refresh
              </h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>The ticket list refreshes automatically every 30 seconds. You can also click the refresh button for immediate updates. New emails typically appear within 1-2 minutes of being sent.</p>
              </div>
            </section>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={onClose} data-testid="button-close-docs">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SupportAdminDashboard() {
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [docsOpen, setDocsOpen] = useState(false);
  const [, setLocation] = useLocation();

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin-hub">
              <Button variant="ghost" size="icon" data-testid="button-back-admin">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Customer Support</h1>
              <p className="text-sm text-muted-foreground">Manage customer inquiries and conversations</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setDocsOpen(true)}
              data-testid="button-documentation"
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              Documentation
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/support/knowledge-base")}
              data-testid="button-knowledge-base"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Knowledge Base
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/admin/support/social-reviews")}
              data-testid="button-social-reviews"
            >
              <Star className="h-4 w-4 mr-2" />
              Social Reviews
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/admin/support/analytics")}
              data-testid="button-analytics"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </div>
        </div>
      </header>
      
      <DocumentationDialog open={docsOpen} onClose={() => setDocsOpen(false)} />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-full md:w-[400px] border-r flex-shrink-0">
          <RequestList
            onSelectRequest={setSelectedRequestId}
            selectedRequestId={selectedRequestId}
          />
        </div>
        <div className={`flex-1 ${selectedRequestId ? "" : "hidden md:block"}`}>
          {selectedRequestId ? (
            <ChatView
              requestId={selectedRequestId}
              onBack={() => setSelectedRequestId(null)}
            />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  );
}
