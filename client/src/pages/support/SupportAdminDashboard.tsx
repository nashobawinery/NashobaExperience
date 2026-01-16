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
  Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { SupportRequest, SupportMessage } from "@shared/schema";

type SupportRequestWithMessages = SupportRequest & { messages: SupportMessage[] };

const statusConfig: Record<string, { label: string; icon: typeof Circle; className: string }> = {
  new: { label: "New", icon: AlertCircle, className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  customer_replied: { label: "Customer Replied", icon: MessageSquare, className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  bot_responded: { label: "Bot Responded", icon: Bot, className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  human_responded: { label: "Agent Responded", icon: User, className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  closed: { label: "Closed", icon: CheckCircle2, className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" }
};

function RequestList({ 
  onSelectRequest, 
  selectedRequestId 
}: { 
  onSelectRequest: (id: string) => void;
  selectedRequestId: string | null;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: requests = [], isLoading, refetch } = useQuery<SupportRequest[]>({
    queryKey: ["/api/admin/support/requests"],
  });

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
          <Button size="icon" variant="ghost" onClick={() => refetch()} data-testid="button-refresh-requests">
            <RefreshCw className="h-4 w-4" />
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
              All
            </Badge>
            <Badge
              variant={statusFilter === "new" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setStatusFilter("new")}
              data-testid="filter-new"
            >
              New
            </Badge>
            <Badge
              variant={statusFilter === "customer_replied" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setStatusFilter("customer_replied")}
              data-testid="filter-customer-replied"
            >
              Needs Response
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
          <Badge className={status.className} variant="secondary">{status.label}</Badge>
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
          {request.status !== "closed" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => closeRequestMutation.mutate()}
              disabled={closeRequestMutation.isPending}
              data-testid="button-close-request"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Close Request
            </Button>
          )}
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

export default function SupportAdminDashboard() {
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
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
