import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation, useParams, useSearch } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { 
  ArrowLeft, 
  Shield, 
  Send, 
  Ban, 
  Loader2, 
  Lock, 
  Mail,
  MessageSquare,
  Clock,
  User,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type SupportMessage = {
  id: string;
  senderType: 'customer' | 'agent' | 'bot';
  senderName: string | null;
  content: string;
  createdAt: string;
  isInternal: boolean;
};

type SupportRequest = {
  id: string;
  subject: string;
  customerName: string | null;
  customerEmail: string | null;
  status: string;
  priority: string | null;
  category: string | null;
  source: string | null;
  createdAt: string;
  initialMessage: string;
  messages: SupportMessage[];
};

type AgentInfo = {
  id: string;
  displayName: string;
  email: string;
};

type OtherAgent = {
  id: string;
  displayName: string;
};

export default function SupportAgentTicketPage() {
  const params = useParams<{ ticketId: string }>();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const searchParams = new URLSearchParams(search);
  const tokenFromUrl = searchParams.get('token');
  const actionFromUrl = searchParams.get('action') || 'view';

  const [isVerifying, setIsVerifying] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [ticket, setTicket] = useState<SupportRequest | null>(null);
  const [otherAgents, setOtherAgents] = useState<OtherAgent[]>([]);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [showSpamDialog, setShowSpamDialog] = useState(false);
  const [forwardToAgentId, setForwardToAgentId] = useState("");
  const [forwardNote, setForwardNote] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenFromUrl) {
      setError("Access link is missing required token. Please use the link from your email.");
      setIsVerifying(false);
      return;
    }

    verifyToken();
  }, [tokenFromUrl]);

  const verifyToken = async () => {
    try {
      const res = await apiRequest('POST', '/api/support/verify-token', {
        token: tokenFromUrl,
        action: actionFromUrl
      });
      const data = await res.json();

      if (data.success) {
        setAgent(data.agent);
        setTicket(data.ticket);
        setOtherAgents(data.otherAgents || []);
        setIsVerified(true);

        if (actionFromUrl === 'forward') {
          setShowForwardDialog(true);
        } else if (actionFromUrl === 'spam') {
          setShowSpamDialog(true);
        }
      } else {
        setError(data.message || "Failed to verify access");
      }
    } catch (err: any) {
      setError(err.message || "Access link is invalid or has expired");
    } finally {
      setIsVerifying(false);
    }
  };

  const performAction = async (action: string, data: any = {}) => {
    try {
      const res = await apiRequest('POST', '/api/support/token-action', {
        token: tokenFromUrl,
        action,
        ...data
      });
      const result = await res.json();
      
      if (result.success) {
        return result;
      } else {
        throw new Error(result.message || 'Action failed');
      }
    } catch (err: any) {
      throw err;
    }
  };

  const forwardMutation = useMutation({
    mutationFn: async () => {
      return performAction('forward', { targetAgentId: forwardToAgentId, note: forwardNote });
    },
    onSuccess: (data) => {
      toast({ title: "Ticket forwarded", description: data.message });
      setShowForwardDialog(false);
      setActionSuccess("Ticket has been forwarded successfully.");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to forward ticket", variant: "destructive" });
    }
  });

  const spamMutation = useMutation({
    mutationFn: async () => {
      return performAction('spam');
    },
    onSuccess: () => {
      toast({ title: "Marked as spam" });
      setShowSpamDialog(false);
      setActionSuccess("Ticket has been marked as spam.");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to mark as spam", variant: "destructive" });
    }
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      return performAction('reply', { replyContent: replyMessage });
    },
    onSuccess: () => {
      toast({ title: "Reply sent" });
      setReplyMessage("");
      verifyToken();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to send reply", variant: "destructive" });
    }
  });

  const handleForward = () => {
    if (!forwardToAgentId) {
      toast({ title: "Please select an agent", variant: "destructive" });
      return;
    }
    forwardMutation.mutate();
  };

  const handleMarkSpam = () => {
    spamMutation.mutate();
  };

  const handleSendReply = () => {
    if (!replyMessage.trim()) {
      toast({ title: "Please enter a message", variant: "destructive" });
      return;
    }
    replyMutation.mutate();
  };

  const statusConfig: Record<string, { label: string; className: string }> = {
    new: { label: 'New', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    open: { label: 'Open', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
    pending: { label: 'Pending', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
    resolved: { label: 'Resolved', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    closed: { label: 'Closed', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
    spam: { label: 'Spam', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8">
          <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
          <h2 className="text-lg font-medium mb-2">Verifying Access</h2>
          <p className="text-muted-foreground">
            Please wait while we verify your access link...
          </p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-lg font-medium mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            {error}
          </p>
          <Button onClick={() => setLocation('/admin/support')} data-testid="button-go-to-dashboard">
            Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  if (actionSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
          <h2 className="text-lg font-medium mb-2">Action Completed</h2>
          <p className="text-muted-foreground mb-4">
            {actionSuccess}
          </p>
          <Button onClick={() => setLocation('/admin/support')} data-testid="button-go-to-dashboard">
            Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  if (!ticket || !agent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-medium mb-2">Ticket Not Found</h2>
          <p className="text-muted-foreground mb-4">
            This ticket may have been deleted or you don't have access.
          </p>
          <Button onClick={() => setLocation('/admin/support')} data-testid="button-go-to-dashboard">
            Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const status = statusConfig[ticket.status] || statusConfig.new;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b p-4 sticky top-0 bg-background z-10">
        <div className="flex items-center justify-between gap-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation('/admin/support')}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold line-clamp-1">{ticket.subject}</h1>
              <p className="text-sm text-muted-foreground">
                Quick access as {agent.displayName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowForwardDialog(true)}
              disabled={otherAgents.length === 0}
              data-testid="button-forward"
            >
              <Send className="h-4 w-4 mr-1" />
              Forward
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowSpamDialog(true)}
              className="text-destructive hover:text-destructive"
              data-testid="button-spam"
            >
              <Ban className="h-4 w-4 mr-1" />
              Spam
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Badge className={status.className}>{status.label}</Badge>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">From</Label>
                <p className="text-sm font-medium flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {ticket.customerName || 'Anonymous'}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Source</Label>
                <p className="text-sm font-medium flex items-center gap-1">
                  {ticket.source === 'email' ? <Mail className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                  {ticket.source || 'Unknown'}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Created</Label>
                <p className="text-sm font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
            {ticket.customerEmail && (
              <div className="mt-3 pt-3 border-t">
                <Label className="text-xs text-muted-foreground">Customer Email</Label>
                <p className="text-sm">{ticket.customerEmail}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Conversation</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{ticket.customerName || 'Customer'}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(ticket.createdAt), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-sm whitespace-pre-wrap">{ticket.initialMessage}</p>
                    </div>
                  </div>
                </div>

                {ticket.messages?.map((msg) => (
                  <div key={msg.id} className={`flex gap-3 ${msg.isInternal ? 'opacity-60' : ''}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                      msg.senderType === 'customer' 
                        ? 'bg-blue-100' 
                        : msg.senderType === 'bot' 
                        ? 'bg-purple-100' 
                        : 'bg-green-100'
                    }`}>
                      {msg.senderType === 'customer' ? (
                        <User className="h-4 w-4 text-blue-600" />
                      ) : msg.senderType === 'bot' ? (
                        <MessageSquare className="h-4 w-4 text-purple-600" />
                      ) : (
                        <Shield className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {msg.senderName || (msg.senderType === 'bot' ? 'AI Assistant' : 'Agent')}
                        </span>
                        {msg.isInternal && (
                          <Badge variant="outline" className="text-xs">Internal</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(msg.createdAt), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <div className={`rounded-lg p-3 ${msg.isInternal ? 'bg-yellow-50 dark:bg-yellow-950' : 'bg-muted'}`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {ticket.status !== 'spam' && ticket.status !== 'closed' && (
              <div className="mt-4 pt-4 border-t space-y-3">
                <Label>Reply to Customer</Label>
                <Textarea
                  placeholder="Type your reply..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="min-h-[100px]"
                  data-testid="textarea-reply"
                />
                <div className="flex justify-end">
                  <Button 
                    onClick={handleSendReply}
                    disabled={!replyMessage.trim() || replyMutation.isPending}
                    data-testid="button-send-reply"
                  >
                    {replyMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Reply
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showForwardDialog} onOpenChange={setShowForwardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Forward Ticket</DialogTitle>
            <DialogDescription>
              Forward this ticket to another support agent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Forward to</Label>
              <Select value={forwardToAgentId} onValueChange={setForwardToAgentId}>
                <SelectTrigger data-testid="select-forward-agent">
                  <SelectValue placeholder="Select an agent..." />
                </SelectTrigger>
                <SelectContent>
                  {otherAgents.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Textarea
                placeholder="Add a note for the next agent..."
                value={forwardNote}
                onChange={(e) => setForwardNote(e.target.value)}
                data-testid="textarea-forward-note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForwardDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleForward}
              disabled={!forwardToAgentId || forwardMutation.isPending}
              data-testid="button-confirm-forward"
            >
              {forwardMutation.isPending ? "Forwarding..." : "Forward"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSpamDialog} onOpenChange={setShowSpamDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Spam</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this ticket as spam? This action will close the ticket.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSpamDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleMarkSpam}
              disabled={spamMutation.isPending}
              data-testid="button-confirm-spam"
            >
              {spamMutation.isPending ? "Processing..." : "Mark as Spam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
