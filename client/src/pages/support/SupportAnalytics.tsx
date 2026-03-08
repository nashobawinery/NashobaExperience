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
  TrendingDown,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Bot,
  Mail,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  botPerformance?: {
    deflectionRate: number;
    botResolvedCount: number;
    totalResolved: number;
    avgResponseTimeMinutes: number;
    avgResolutionTimeMinutes: number;
    satisfactionScore: number;
    feedbackUp: number;
    feedbackDown: number;
    emailRequests: number;
    widgetRequests: number;
    dailyVolume: { date: string; count: number }[];
    statusBreakdown: Record<string, number>;
  };
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  } else if (minutes < 1440) {
    return `${(minutes / 60).toFixed(1)}h`;
  } else {
    return `${(minutes / 1440).toFixed(1)}d`;
  }
}

function SimpleBarChart({ data, label }: { data: { date: string; count: number }[]; label: string }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  
  return (
    <div className="space-y-2">
      {label && <div className="text-sm font-medium text-muted-foreground mb-4">{label}</div>}
      <div className="flex items-end gap-0.5 h-24">
        {data.map((item) => (
          <div 
            key={item.date}
            className="flex-1 bg-primary/20 hover:bg-primary/40 transition-colors rounded-t relative group"
            style={{ height: `${(item.count / maxCount) * 100}%`, minHeight: item.count > 0 ? '4px' : '0' }}
            title={`${format(new Date(item.date), 'MMM d')}: ${item.count}`}
          >
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover:block bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
              {format(new Date(item.date), 'MMM d')}: {item.count}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{data[0] ? format(new Date(data[0].date), 'MMM d') : ''}</span>
        <span>{data[data.length - 1] ? format(new Date(data[data.length - 1].date), 'MMM d') : ''}</span>
      </div>
    </div>
  );
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

  const bp = analytics.botPerformance;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/support">
          <Button variant="ghost" size="icon" data-testid="button-back-support">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Support Analytics</h1>
          <p className="text-sm text-muted-foreground">Monitor your customer support performance</p>
        </div>
      </div>

      <Tabs defaultValue="bot" className="space-y-6">
        <TabsList>
          <TabsTrigger value="bot" data-testid="tab-bot-performance">
            <Bot className="h-4 w-4 mr-2" />
            AI Bot Performance
          </TabsTrigger>
          <TabsTrigger value="articles" data-testid="tab-articles">
            <FileText className="h-4 w-4 mr-2" />
            Knowledge Base
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bot" className="space-y-6">
          {!bp && (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No Bot Performance Data Yet</p>
                  <p className="text-sm mt-2">Analytics will appear once you start receiving support requests and AI responses.</p>
                </div>
              </CardContent>
            </Card>
          )}
          {bp && (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card data-testid="stat-deflection-rate">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium">Bot Deflection Rate</CardTitle>
                    <Bot className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{bp.deflectionRate.toFixed(1)}%</div>
                    <Progress value={bp.deflectionRate} className="mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {bp.botResolvedCount} of {bp.totalResolved} resolved by bot
                    </p>
                    {bp.deflectionRate > 50 && (
                      <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                        <TrendingUp className="h-3 w-3" /> Good automation
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card data-testid="stat-satisfaction">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium">Satisfaction Score</CardTitle>
                    <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{bp.satisfactionScore.toFixed(0)}%</div>
                    <Progress value={bp.satisfactionScore} className="mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {bp.feedbackUp} helpful / {bp.feedbackDown} not helpful
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="stat-response-time">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatDuration(bp.avgResponseTimeMinutes)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Time to first response
                    </p>
                    {bp.avgResponseTimeMinutes < 60 && bp.avgResponseTimeMinutes > 0 && (
                      <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                        <TrendingUp className="h-3 w-3" /> Quick response
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card data-testid="stat-resolution-time">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatDuration(bp.avgResolutionTimeMinutes)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Time to close ticket
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card data-testid="card-daily-volume">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Request Volume (Last 30 Days)
                    </CardTitle>
                    <CardDescription>Daily support request count</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SimpleBarChart data={bp.dailyVolume} label="" />
                  </CardContent>
                </Card>

                <Card data-testid="card-sources">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Request Sources
                    </CardTitle>
                    <CardDescription>How customers reach out</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mail className="h-5 w-5 text-blue-600" />
                          <span className="font-medium">Email</span>
                        </div>
                        <span className="text-2xl font-bold">{bp.emailRequests}</span>
                      </div>
                      <Progress 
                        value={analytics.requestStats.total > 0 ? (bp.emailRequests / analytics.requestStats.total) * 100 : 0} 
                        className="h-2" 
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5 text-purple-600" />
                          <span className="font-medium">Chat Widget</span>
                        </div>
                        <span className="text-2xl font-bold">{bp.widgetRequests}</span>
                      </div>
                      <Progress 
                        value={analytics.requestStats.total > 0 ? (bp.widgetRequests / analytics.requestStats.total) * 100 : 0} 
                        className="h-2" 
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card data-testid="card-status-breakdown">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Tickets by Status
                  </CardTitle>
                  <CardDescription>Current distribution of ticket statuses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                    {[
                      { status: 'new', label: 'New', color: 'bg-blue-500' },
                      { status: 'open', label: 'Open', color: 'bg-yellow-500' },
                      { status: 'pending', label: 'Pending', color: 'bg-orange-500' },
                      { status: 'bot_responded', label: 'Bot Responded', color: 'bg-purple-500' },
                      { status: 'resolved', label: 'Resolved', color: 'bg-green-500' },
                      { status: 'closed', label: 'Closed', color: 'bg-gray-500' }
                    ].map(({ status, label, color }) => (
                      <div key={status} className="text-center p-3 rounded-lg bg-muted/50">
                        <div className={`w-3 h-3 rounded-full ${color} mx-auto mb-2`} />
                        <div className="text-2xl font-bold">{bp.statusBreakdown[status] || 0}</div>
                        <div className="text-xs text-muted-foreground">{label}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/30" data-testid="card-insights">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Key Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {bp.deflectionRate > 60 && (
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Strong bot deflection rate! Your knowledge base is helping resolve issues automatically.</span>
                      </li>
                    )}
                    {bp.deflectionRate < 30 && analytics.requestStats.total > 5 && (
                      <li className="flex items-start gap-2">
                        <TrendingDown className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <span>Consider expanding your knowledge base to improve bot deflection rate.</span>
                      </li>
                    )}
                    {bp.avgResponseTimeMinutes < 60 && bp.avgResponseTimeMinutes > 0 && (
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Excellent response time! Customers are getting quick initial responses.</span>
                      </li>
                    )}
                    {bp.satisfactionScore > 80 && (bp.feedbackUp + bp.feedbackDown) > 3 && (
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>High customer satisfaction! Your AI responses are meeting expectations.</span>
                      </li>
                    )}
                    {bp.satisfactionScore < 50 && (bp.feedbackUp + bp.feedbackDown) > 3 && (
                      <li className="flex items-start gap-2">
                        <TrendingDown className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <span>Consider reviewing negative feedback to improve AI response quality.</span>
                      </li>
                    )}
                    {analytics.requestStats.total === 0 && (
                      <li className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span>No requests yet. Check back later once you receive support requests.</span>
                      </li>
                    )}
                    {(bp.feedbackUp + bp.feedbackDown) === 0 && analytics.requestStats.total > 0 && (
                      <li className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span>No feedback collected yet. Customers can rate responses using the thumbs up/down buttons.</span>
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="articles" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="stat-total-views">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Article Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.articleStats.totalViews.toLocaleString('en-US')}</div>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
