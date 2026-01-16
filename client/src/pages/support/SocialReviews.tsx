import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Star,
  MessageSquare,
  RefreshCw,
  Plus,
  ExternalLink,
  Sparkles,
  Send,
  Check,
  X,
  Filter,
  Search,
  Building2,
  Globe,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Archive,
  Flag
} from "lucide-react";
import { SiFacebook, SiGoogle, SiYelp, SiTripadvisor } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SocialChannel, SocialReview, SocialReviewResponse } from "@shared/schema";

const platformConfig: Record<string, { name: string; icon: any; color: string }> = {
  google: { name: "Google", icon: SiGoogle, color: "text-blue-500" },
  facebook: { name: "Facebook", icon: SiFacebook, color: "text-blue-600" },
  yelp: { name: "Yelp", icon: SiYelp, color: "text-red-500" },
  tripadvisor: { name: "TripAdvisor", icon: SiTripadvisor, color: "text-green-600" }
};

const statusConfig: Record<string, { label: string; className: string }> = {
  new: { label: "New", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  read: { label: "Read", className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" },
  responded: { label: "Responded", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  archived: { label: "Archived", className: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200" },
  flagged: { label: "Flagged", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" }
};

function StarRating({ rating, size = "default" }: { rating: number | null | undefined; size?: "default" | "large" }) {
  if (!rating) return <span className="text-muted-foreground text-sm">No rating</span>;
  const sizeClass = size === "large" ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
      <span className="ml-1 text-sm font-medium">{rating}/5</span>
    </div>
  );
}

function PlatformIcon({ platform, size = "default" }: { platform: string; size?: "default" | "large" }) {
  const config = platformConfig[platform] || { name: platform, icon: Globe, color: "text-gray-500" };
  const Icon = config.icon;
  const sizeClass = size === "large" ? "h-6 w-6" : "h-4 w-4";
  return <Icon className={`${sizeClass} ${config.color}`} />;
}

function ChannelCard({ channel }: { channel: SocialChannel }) {
  const config = platformConfig[channel.platform] || { name: channel.platform, icon: Globe, color: "text-gray-500" };
  
  return (
    <Card className="hover-elevate">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full bg-muted`}>
            <PlatformIcon platform={channel.platform} size="large" />
          </div>
          <div className="flex-1">
            <div className="font-medium">{channel.accountName}</div>
            <div className="text-sm text-muted-foreground">{config.name}</div>
          </div>
          <Badge variant={channel.isActive ? "default" : "secondary"}>
            {channel.isActive ? "Active" : "Disconnected"}
          </Badge>
        </div>
        {channel.lastSyncAt && (
          <div className="mt-2 text-xs text-muted-foreground">
            Last synced: {formatDistanceToNow(new Date(channel.lastSyncAt), { addSuffix: true })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReviewCard({ 
  review, 
  onSelect 
}: { 
  review: SocialReview;
  onSelect: (review: SocialReview) => void;
}) {
  const sentiment = review.rating && review.rating >= 4 ? "positive" : 
                   review.rating && review.rating <= 2 ? "negative" : "neutral";
  
  return (
    <Card 
      className="hover-elevate cursor-pointer" 
      onClick={() => onSelect(review)}
      data-testid={`review-card-${review.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <PlatformIcon platform={review.platform} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{review.authorName || "Anonymous"}</span>
              <StarRating rating={review.rating} />
              <Badge className={statusConfig[review.status]?.className || ""} variant="outline">
                {statusConfig[review.status]?.label || review.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {review.content || "No review content"}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{review.reviewCreatedAt ? format(new Date(review.reviewCreatedAt), "MMM d, yyyy") : format(new Date(review.createdAt), "MMM d, yyyy")}</span>
              {review.requiresResponse && (
                <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-950">
                  Needs Response
                </Badge>
              )}
            </div>
          </div>
          {sentiment === "positive" && <ThumbsUp className="h-4 w-4 text-green-500" />}
          {sentiment === "negative" && <ThumbsDown className="h-4 w-4 text-red-500" />}
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewDetailView({ 
  review, 
  onClose 
}: { 
  review: SocialReview; 
  onClose: () => void;
}) {
  const [draftResponse, setDraftResponse] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const { data: responses = [] } = useQuery<SocialReviewResponse[]>({
    queryKey: ["/api/admin/social/reviews", review.id, "responses"],
  });

  const updateReviewMutation = useMutation({
    mutationFn: async (data: Partial<SocialReview>) => {
      return apiRequest("PATCH", `/api/admin/social/reviews/${review.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social/reviews"] });
      toast({ title: "Review updated" });
    },
  });

  const createResponseMutation = useMutation({
    mutationFn: async (data: { content: string; status: string }) => {
      return apiRequest("POST", `/api/admin/social/reviews/${review.id}/responses`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social/reviews", review.id, "responses"] });
      setDraftResponse("");
      toast({ title: "Response saved" });
    },
  });

  const generateAIDraft = async () => {
    setIsGenerating(true);
    try {
      const response = await apiRequest("POST", `/api/admin/social/reviews/${review.id}/ai-draft`, {});
      const data = await response.json();
      setDraftResponse(data.draft);
      toast({ title: "AI draft generated" });
    } catch (error) {
      toast({ title: "Failed to generate draft", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendResponse = () => {
    if (!draftResponse.trim()) return;
    createResponseMutation.mutate({ content: draftResponse, status: "sent" });
  };

  const handleSaveDraft = () => {
    if (!draftResponse.trim()) return;
    createResponseMutation.mutate({ content: draftResponse, status: "draft" });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-review">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <PlatformIcon platform={review.platform} size="large" />
              <span className="font-semibold">{review.authorName || "Anonymous"}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {format(new Date(review.reviewCreatedAt || review.createdAt), "MMMM d, yyyy 'at' h:mm a")}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Select
            value={review.status}
            onValueChange={(value) => updateReviewMutation.mutate({ status: value })}
          >
            <SelectTrigger className="w-[140px]" data-testid="select-review-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="read">Read</SelectItem>
              <SelectItem value="responded">Responded</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg">Original Review</CardTitle>
                <StarRating rating={review.rating} size="large" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-foreground whitespace-pre-wrap">
                {review.content || "No review content provided."}
              </p>
              {review.reviewUrl && (
                <Button
                  variant="link"
                  size="sm"
                  asChild
                  className="p-0 h-auto mt-3"
                  data-testid="link-view-external-review"
                >
                  <a
                    href={review.reviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View on {platformConfig[review.platform]?.name || review.platform}
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>

          {responses.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Response History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {responses.map((resp) => (
                  <div key={resp.id} className="p-3 rounded-md bg-muted/50 border">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-sm font-medium">{resp.responderName || "Admin"}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={resp.status === "sent" ? "default" : "secondary"}>
                          {resp.status === "sent" ? "Sent" : resp.status === "draft" ? "Draft" : resp.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(resp.createdAt), "MMM d, h:mm a")}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm">{resp.content}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg">Write Response</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateAIDraft}
                  disabled={isGenerating}
                  data-testid="button-generate-ai-draft"
                >
                  {isGenerating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Generate AI Draft
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Write your response to this review..."
                value={draftResponse}
                onChange={(e) => setDraftResponse(e.target.value)}
                rows={6}
                className="resize-none"
                data-testid="textarea-response"
              />
              <div className="flex justify-end gap-2 mt-3">
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={!draftResponse.trim() || createResponseMutation.isPending}
                  data-testid="button-save-draft"
                >
                  Save Draft
                </Button>
                <Button
                  onClick={handleSendResponse}
                  disabled={!draftResponse.trim() || createResponseMutation.isPending}
                  data-testid="button-send-response"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Response
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}

function StatsOverview() {
  const { data: stats } = useQuery<{
    totalReviews: number;
    averageRating: number;
    needsResponse: number;
    respondedThisWeek: number;
    byPlatform: Record<string, { count: number; avgRating: number }>;
  }>({
    queryKey: ["/api/admin/social/stats"],
  });

  if (!stats) return null;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalReviews}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Average Rating</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{stats.averageRating?.toFixed(1) || "N/A"}</span>
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Needs Response</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{stats.needsResponse}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Responded This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.respondedThisWeek}</div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SocialReviews() {
  const [, setLocation] = useLocation();
  const [selectedReview, setSelectedReview] = useState<SocialReview | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: channels = [], isLoading: channelsLoading } = useQuery<SocialChannel[]>({
    queryKey: ["/api/admin/social/channels"],
  });

  const { data: reviews = [], isLoading: reviewsLoading, refetch: refetchReviews } = useQuery<SocialReview[]>({
    queryKey: ["/api/admin/social/reviews"],
  });

  const filteredReviews = reviews.filter((review) => {
    if (platformFilter !== "all" && review.platform !== platformFilter) return false;
    if (statusFilter !== "all" && review.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        review.authorName?.toLowerCase().includes(term) ||
        review.content?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  if (selectedReview) {
    return (
      <div className="h-screen flex flex-col">
        <ReviewDetailView review={selectedReview} onClose={() => setSelectedReview(null)} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/support">
              <Button variant="ghost" size="icon" data-testid="button-back-support">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Social Review Monitoring</h1>
              <p className="text-sm text-muted-foreground">
                Manage reviews from Google, Facebook, Yelp, and TripAdvisor
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetchReviews()} data-testid="button-refresh-reviews">
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Reviews
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        <StatsOverview />

        <Tabs defaultValue="reviews">
          <TabsList>
            <TabsTrigger value="reviews" data-testid="tab-reviews">
              <MessageSquare className="h-4 w-4 mr-2" />
              Reviews
            </TabsTrigger>
            <TabsTrigger value="channels" data-testid="tab-channels">
              <Building2 className="h-4 w-4 mr-2" />
              Connected Channels
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reviews" className="mt-4 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reviews..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-reviews"
                />
              </div>
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-platform-filter">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="yelp">Yelp</SelectItem>
                  <SelectItem value="tripadvisor">TripAdvisor</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="responded">Responded</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reviewsLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredReviews.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Star className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-1">No reviews found</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    {channels.length === 0
                      ? "Connect a social channel to start monitoring reviews."
                      : "No reviews match your current filters. Try adjusting your search criteria."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} onSelect={setSelectedReview} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="channels" className="mt-4">
            {channelsLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : channels.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-1">No channels connected</h3>
                  <p className="text-sm text-muted-foreground max-w-md mb-4">
                    Connect your business profiles from Google, Facebook, Yelp, or TripAdvisor to start monitoring reviews.
                  </p>
                  <div className="flex gap-3 flex-wrap justify-center">
                    <Button variant="outline" className="gap-2" data-testid="button-connect-google">
                      <SiGoogle className="h-4 w-4 text-blue-500" />
                      Connect Google
                    </Button>
                    <Button variant="outline" className="gap-2" data-testid="button-connect-facebook">
                      <SiFacebook className="h-4 w-4 text-blue-600" />
                      Connect Facebook
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    Yelp and TripAdvisor reviews can be imported manually.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {channels.map((channel) => (
                  <ChannelCard key={channel.id} channel={channel} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
