import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  Loader2,
  ArrowLeft,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { SupportRequest, SupportMessage } from "@shared/schema";

type SupportRequestWithMessages = SupportRequest & { messages: SupportMessage[] };

const STORAGE_KEY = "support_request_id";

function StartConversationForm({ onStart }: { onStart: (requestId: string) => void }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const { toast } = useToast();

  const startMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/support/requests", {
        name: data.name || undefined,
        email: data.email || undefined,
        subject: data.subject,
        initialMessage: data.message,
      });
      return response.json() as Promise<SupportRequest>;
    },
    onSuccess: (request) => {
      localStorage.setItem(STORAGE_KEY, request.id);
      onStart(request.id);
    },
    onError: () => {
      toast({ title: "Failed to start conversation", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.message.trim()) {
      toast({ title: "Please provide a subject and message", variant: "destructive" });
      return;
    }
    startMutation.mutate(formData);
  };

  return (
    <div className="p-6">
      <div className="text-center mb-6">
        <MessageSquare className="h-12 w-12 mx-auto mb-3 text-primary" />
        <h2 className="text-xl font-semibold mb-1">How can we help?</h2>
        <p className="text-sm text-muted-foreground">
          Start a conversation with our support team. Our AI assistant will help you get started.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Your name"
              data-testid="input-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your@email.com"
              data-testid="input-email"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">Subject *</Label>
          <Input
            id="subject"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            placeholder="What can we help you with?"
            required
            data-testid="input-subject"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Message *</Label>
          <Textarea
            id="message"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            placeholder="Please describe your question or issue..."
            rows={4}
            required
            data-testid="input-initial-message"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={startMutation.isPending}
          data-testid="button-start-conversation"
        >
          {startMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <MessageSquare className="h-4 w-4 mr-2" />
              Start Conversation
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

function ChatInterface({ 
  requestId, 
  onNewConversation 
}: { 
  requestId: string; 
  onNewConversation: () => void;
}) {
  const [newMessage, setNewMessage] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: request, isLoading, error } = useQuery<SupportRequestWithMessages>({
    queryKey: ["/api/support/requests", requestId],
    refetchInterval: 5000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/support/requests/${requestId}/messages`, { 
        content,
        senderName: request?.customerName || "Guest",
        senderEmail: request?.customerEmail,
      });
    },
    onSuccess: async () => {
      setNewMessage("");
      await queryClient.invalidateQueries({ queryKey: ["/api/support/requests", requestId] });
      
      setIsGeneratingAi(true);
      try {
        await apiRequest("POST", `/api/support/requests/${requestId}/ai-response`);
        await queryClient.invalidateQueries({ queryKey: ["/api/support/requests", requestId] });
      } catch {
      }
      setIsGeneratingAi(false);
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [request?.messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage.trim());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground mb-4">Unable to load conversation</p>
        <Button onClick={onNewConversation} data-testid="button-new-conversation">
          Start New Conversation
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-sm truncate">{request.subject}</h3>
            <p className="text-xs text-muted-foreground">
              Started {format(new Date(request.createdAt), "MMM d 'at' h:mm a")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              localStorage.removeItem(STORAGE_KEY);
              onNewConversation();
            }}
            data-testid="button-new-conversation-header"
          >
            <X className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {request.messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.senderType === "customer" ? "justify-end" : "justify-start"}`}
              data-testid={`message-${message.id}`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-3 ${
                  message.senderType === "customer"
                    ? "bg-primary text-primary-foreground"
                    : message.senderType === "bot"
                    ? "bg-purple-100 dark:bg-purple-900"
                    : "bg-green-100 dark:bg-green-900"
                }`}
              >
                <div className="flex items-center gap-1 mb-1 text-xs opacity-70">
                  {message.senderType === "bot" && <Bot className="h-3 w-3" />}
                  {message.senderType === "agent" && <User className="h-3 w-3" />}
                  <span>
                    {message.senderType === "customer" 
                      ? "You" 
                      : message.senderType === "bot" 
                      ? "AI Assistant" 
                      : "Support Agent"}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          
          {isGeneratingAi && (
            <div className="flex justify-start">
              <div className="bg-purple-100 dark:bg-purple-900 rounded-lg p-3 flex items-center gap-2">
                <Bot className="h-4 w-4" />
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">AI is thinking...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {request.status !== "closed" && (
        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={sendMessageMutation.isPending || isGeneratingAi}
              data-testid="input-chat-message"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!newMessage.trim() || sendMessageMutation.isPending || isGeneratingAi}
              data-testid="button-send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}

      {request.status === "closed" && (
        <div className="p-4 border-t bg-muted text-center">
          <p className="text-sm text-muted-foreground mb-2">This conversation has been closed</p>
          <Button size="sm" onClick={onNewConversation} data-testid="button-start-new-closed">
            Start New Conversation
          </Button>
        </div>
      )}
    </div>
  );
}

export default function SupportWidget() {
  const [requestId, setRequestId] = useState<string | null>(null);

  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (savedId) {
      setRequestId(savedId);
    }
  }, []);

  const handleNewConversation = () => {
    setRequestId(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg h-[600px] flex flex-col">
        <CardHeader className="border-b py-4">
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Nashoba Valley Support
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          {requestId ? (
            <ChatInterface 
              requestId={requestId} 
              onNewConversation={handleNewConversation} 
            />
          ) : (
            <StartConversationForm onStart={setRequestId} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
