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
  X,
  ThumbsUp,
  ThumbsDown,
  Clock,
  MapPin,
  Wine,
  Calendar,
  HelpCircle
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

function LinkifiedText({ text }: { text: string }) {
  // First handle markdown-style links [text](url)
  const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let processedText = text;
  const markdownLinks: { placeholder: string; label: string; url: string }[] = [];
  
  let match;
  let placeholderIndex = 0;
  while ((match = markdownLinkRegex.exec(text)) !== null) {
    const placeholder = `__LINK_${placeholderIndex}__`;
    markdownLinks.push({ placeholder, label: match[1], url: match[2] });
    processedText = processedText.replace(match[0], placeholder);
    placeholderIndex++;
  }
  
  // Then handle raw URLs
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
  const parts = processedText.split(urlRegex);
  
  return (
    <>
      {parts.map((part, index) => {
        // Check if this is a markdown link placeholder
        const mdLink = markdownLinks.find(l => l.placeholder === part);
        if (mdLink) {
          return (
            <a
              key={index}
              href={mdLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 underline hover:opacity-80"
            >
              {mdLink.label}
            </a>
          );
        }
        // Check if this is a raw URL
        if (urlRegex.test(part)) {
          urlRegex.lastIndex = 0;
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 underline hover:opacity-80"
            >
              {part}
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

// Quick reply options for common queries
const QUICK_REPLIES = [
  { icon: Clock, label: "Hours & Location", subject: "Hours & Location", message: "What are your hours of operation and where are you located?" },
  { icon: Calendar, label: "Reservations", subject: "Reservations", message: "I'd like to make a reservation. What options do you have available?" },
  { icon: Wine, label: "Wine & Spirits", subject: "Wine & Spirits", message: "Can you tell me about your wine and spirits selection?" },
  { icon: MapPin, label: "Tours & Tastings", subject: "Tours & Tastings", message: "What tours and tastings do you offer?" },
  { icon: HelpCircle, label: "Other Question", subject: "", message: "" },
];

function StartConversationForm({ onStart }: { onStart: (requestId: string) => void }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [showFullForm, setShowFullForm] = useState(false);
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

  const handleQuickReply = (quick: typeof QUICK_REPLIES[0]) => {
    if (quick.subject === "") {
      // "Other Question" - show full form
      setShowFullForm(true);
    } else {
      // Quick reply - submit immediately
      startMutation.mutate({
        ...formData,
        subject: quick.subject,
        message: quick.message,
      });
    }
  };

  return (
    <div className="p-6">
      <div className="text-center mb-6">
        <Bot className="h-12 w-12 mx-auto mb-3 text-primary" />
        <h2 className="text-xl font-semibold mb-1">How can we help?</h2>
        <p className="text-sm text-muted-foreground">
          I'm an AI assistant for Nashoba Valley. Choose a topic or ask your own question.
        </p>
      </div>

      {/* Quick Reply Buttons */}
      {!showFullForm && (
        <div className="space-y-2 mb-4">
          {QUICK_REPLIES.map((quick) => (
            <Button
              key={quick.label}
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => handleQuickReply(quick)}
              disabled={startMutation.isPending}
              data-testid={`quick-reply-${quick.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <quick.icon className="h-5 w-5 text-primary flex-shrink-0" />
              <span className="text-left">{quick.label}</span>
            </Button>
          ))}
        </div>
      )}

      {/* Full form - shown when "Other Question" is selected */}
      {showFullForm && (
        <div className="mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowFullForm(false)}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to quick options
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`space-y-4 ${!showFullForm ? 'hidden' : ''}`}>
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
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'up' | 'down'>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: async ({ messageId, feedback }: { messageId: string; feedback: 'up' | 'down' }) => {
      return apiRequest("POST", `/api/support/messages/${messageId}/feedback`, { feedback });
    },
    onSuccess: (_, { messageId, feedback }) => {
      setFeedbackGiven(prev => ({ ...prev, [messageId]: feedback }));
      toast({ title: feedback === 'up' ? "Thanks for the feedback!" : "We'll try to do better" });
    },
  });

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
                <p className="text-sm whitespace-pre-wrap"><LinkifiedText text={message.content} /></p>
                
                {/* Feedback buttons for bot messages */}
                {message.senderType === "bot" && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-purple-200 dark:border-purple-700">
                    <span className="text-xs opacity-60">Was this helpful?</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => feedbackMutation.mutate({ messageId: message.id, feedback: 'up' })}
                        disabled={!!feedbackGiven[message.id] || feedbackMutation.isPending}
                        className={`p-1 rounded hover:bg-purple-200 dark:hover:bg-purple-700 transition-colors ${
                          feedbackGiven[message.id] === 'up' ? 'text-green-600 dark:text-green-400' : 'opacity-60'
                        }`}
                        data-testid={`feedback-up-${message.id}`}
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => feedbackMutation.mutate({ messageId: message.id, feedback: 'down' })}
                        disabled={!!feedbackGiven[message.id] || feedbackMutation.isPending}
                        className={`p-1 rounded hover:bg-purple-200 dark:hover:bg-purple-700 transition-colors ${
                          feedbackGiven[message.id] === 'down' ? 'text-red-600 dark:text-red-400' : 'opacity-60'
                        }`}
                        data-testid={`feedback-down-${message.id}`}
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
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
