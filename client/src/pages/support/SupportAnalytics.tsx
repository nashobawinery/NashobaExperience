import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  BarChart3,
  Eye,
  ThumbsUp,
  ThumbsDown,
  FileText,
  MessageSquare,
  TrendingUp,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { SupportArticle, SupportRequest } from "@shared/schema";

interface AnalyticsData {
  topArticles: SupportArticle[];
  articleStats: {
    total: number;
    published: number;
    draft: number;
    totalViews: number;
    totalHelpful: number;
    totalNotHelpful: number;
  };
  requestStats: {
    total: number;
    new: number;
    inProgress: number;
    closed: number;
  };
  recentRequests: SupportRequest[];
}

export default function SupportAnalytics() {
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/support/analytics"],
  });

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Failed to load analytics data.</p>
      </div>
    );
  }

  const helpfulRate = analytics.articleStats.totalHelpful + analytics.articleStats.totalNotHelpful > 0
    ? Math.round((analytics.articleStats.totalHelpful / (analytics.articleStats.totalHelpful + analytics.articleStats.totalNotHelpful)) * 100)
    : 0;

  const resolutionRate = analytics.requestStats.total > 0
    ? Math.round((analytics.requestStats.closed / analytics.requestStats.total) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/support">
          <Button variant="ghost" size="icon" data-testid="button-back-support">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Support Analytics</h1>
          <p className="text-sm text-muted-foreground">Monitor your customer support performance</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="stat-total-views">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Article Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.articleStats.totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across {analytics.articleStats.published} published articles
            </p>
          </CardContent>
        </Card>

        <Card data-testid="stat-helpful-rate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Helpful Rate</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{helpfulRate}%</div>
            <Progress value={helpfulRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.articleStats.totalHelpful} helpful / {analytics.articleStats.totalNotHelpful} not helpful
            </p>
          </CardContent>
        </Card>

        <Card data-testid="stat-support-requests">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Support Requests</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.requestStats.total}</div>
            <div className="flex gap-2 mt-2 text-xs">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {analytics.requestStats.new} New
              </Badge>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                {analytics.requestStats.inProgress} In Progress
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-resolution-rate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolutionRate}%</div>
            <Progress value={resolutionRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.requestStats.closed} of {analytics.requestStats.total} requests resolved
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card data-testid="card-top-articles">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Performing Articles
            </CardTitle>
            <CardDescription>Most viewed FAQ articles based on analytics</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.topArticles.length === 0 ? (
              <p className="text-muted-foreground text-sm">No articles yet. Create some FAQ articles to see analytics.</p>
            ) : (
              <div className="space-y-4">
                {analytics.topArticles.map((article, index) => (
                  <div key={article.id} className="flex items-center justify-between" data-testid={`top-article-${article.id}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg font-bold text-muted-foreground w-6">#{index + 1}</span>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{article.title}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {article.viewCount || 0} views
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" />
                            {article.helpfulCount || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsDown className="h-3 w-3" />
                            {article.notHelpfulCount || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-recent-requests">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Support Requests
            </CardTitle>
            <CardDescription>Latest customer support inquiries</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.recentRequests.length === 0 ? (
              <p className="text-muted-foreground text-sm">No support requests yet.</p>
            ) : (
              <div className="space-y-4">
                {analytics.recentRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between" data-testid={`recent-request-${request.id}`}>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{request.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {request.customerName || request.customerEmail || "Anonymous"} · {format(new Date(request.createdAt), "MMM d, h:mm a")}
                      </p>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={
                        request.status === 'closed' 
                          ? "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                          : request.status === 'new'
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                      }
                    >
                      {request.status === 'new' ? 'New' : request.status === 'closed' ? 'Closed' : 'Active'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-article-stats">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Knowledge Base Overview
          </CardTitle>
          <CardDescription>Article statistics and content health</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">{analytics.articleStats.published}</div>
              <p className="text-sm text-muted-foreground">Published Articles</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold text-yellow-600">{analytics.articleStats.draft}</div>
              <p className="text-sm text-muted-foreground">Draft Articles</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold">{analytics.articleStats.total}</div>
              <p className="text-sm text-muted-foreground">Total Articles</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-widget-info">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            WordPress Widget
          </CardTitle>
          <CardDescription>Embed your top FAQ articles on external websites</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Use the code below to embed your most popular FAQ articles on a WordPress site or any external website.
            The widget automatically displays articles sorted by view count and helpfulness.
          </p>
          <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto">
            <pre>{`<div id="nashoba-faq-widget"></div>
<script>
(function() {
  var w = document.getElementById('nashoba-faq-widget');
  var iframe = document.createElement('iframe');
  iframe.src = '${typeof window !== 'undefined' ? window.location.origin : ''}/faq-widget';
  iframe.style.width = '100%';
  iframe.style.border = 'none';
  iframe.style.minHeight = '300px';
  w.appendChild(iframe);
})();
</script>`}</pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
