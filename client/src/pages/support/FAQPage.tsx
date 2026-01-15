import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, ChevronDown, ChevronUp, ArrowLeft, BookOpen, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface FAQCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
}

interface FAQArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  categoryId: string | null;
  viewCount: number;
  isFeatured: boolean;
}

interface FAQData {
  categories: FAQCategory[];
  articles: FAQArticle[];
  featuredArticles: FAQArticle[];
}

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openArticles, setOpenArticles] = useState<Set<string>>(new Set());
  const [feedbackGiven, setFeedbackGiven] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data: faqData, isLoading } = useQuery<FAQData>({
    queryKey: ["/api/public/faq"],
  });

  const toggleArticle = (articleId: string) => {
    setOpenArticles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(articleId)) {
        newSet.delete(articleId);
      } else {
        newSet.add(articleId);
      }
      return newSet;
    });
  };

  const handleFeedback = async (articleId: string, helpful: boolean) => {
    if (feedbackGiven.has(articleId)) return;
    
    try {
      await apiRequest("POST", `/api/public/articles/${articleId}/feedback`, { helpful });
      setFeedbackGiven(prev => new Set(Array.from(prev).concat(articleId)));
      toast({ title: "Thank you for your feedback!" });
    } catch (error) {
      toast({ title: "Failed to submit feedback", variant: "destructive" });
    }
  };

  const filteredArticles = faqData?.articles.filter(article => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      article.title.toLowerCase().includes(query) ||
      article.content.toLowerCase().includes(query) ||
      article.summary?.toLowerCase().includes(query)
    );
  }) || [];

  const getArticlesByCategory = (categoryId: string | null) => {
    return filteredArticles.filter(article => article.categoryId === categoryId);
  };

  const uncategorizedArticles = getArticlesByCategory(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-home">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Frequently Asked Questions</h1>
              <p className="text-sm text-muted-foreground">Find answers to common questions</p>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search for answers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-faq-search"
            />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {faqData?.featuredArticles && faqData.featuredArticles.length > 0 && !searchQuery && (
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Featured Articles
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {faqData.featuredArticles.map((article) => (
                <Card key={article.id} className="hover-elevate cursor-pointer" data-testid={`featured-article-${article.id}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{article.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {article.summary || article.content.substring(0, 150) + "..."}
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="p-0 h-auto mt-2 text-primary hover:underline"
                      onClick={() => toggleArticle(article.id)}
                      data-testid={`button-read-featured-${article.id}`}
                    >
                      Read more
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {searchQuery && filteredArticles.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>No articles found matching "{searchQuery}"</p>
              <p className="text-sm mt-2">Try different keywords or browse categories below</p>
            </CardContent>
          </Card>
        )}

        {searchQuery && filteredArticles.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Search Results ({filteredArticles.length})</h2>
            <div className="space-y-2">
              {filteredArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  isOpen={openArticles.has(article.id)}
                  onToggle={() => toggleArticle(article.id)}
                  onFeedback={(helpful) => handleFeedback(article.id, helpful)}
                  hasFeedback={feedbackGiven.has(article.id)}
                />
              ))}
            </div>
          </section>
        )}

        {!searchQuery && faqData?.categories.map((category) => {
          const categoryArticles = getArticlesByCategory(category.id);
          if (categoryArticles.length === 0) return null;
          
          return (
            <section key={category.id} data-testid={`category-section-${category.id}`}>
              <div className="flex items-center gap-2 mb-3">
                <div 
                  className="h-6 w-6 rounded flex items-center justify-center text-white text-xs"
                  style={{ backgroundColor: category.color || "#6b7280" }}
                >
                  {category.name.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-lg font-semibold">{category.name}</h2>
                <Badge variant="secondary">{categoryArticles.length}</Badge>
              </div>
              {category.description && (
                <p className="text-sm text-muted-foreground mb-3">{category.description}</p>
              )}
              <div className="space-y-2">
                {categoryArticles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    isOpen={openArticles.has(article.id)}
                    onToggle={() => toggleArticle(article.id)}
                    onFeedback={(helpful) => handleFeedback(article.id, helpful)}
                    hasFeedback={feedbackGiven.has(article.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {!searchQuery && uncategorizedArticles.length > 0 && (
          <section data-testid="category-section-uncategorized">
            <h2 className="text-lg font-semibold mb-3">Other Questions</h2>
            <div className="space-y-2">
              {uncategorizedArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  isOpen={openArticles.has(article.id)}
                  onToggle={() => toggleArticle(article.id)}
                  onFeedback={(helpful) => handleFeedback(article.id, helpful)}
                  hasFeedback={feedbackGiven.has(article.id)}
                />
              ))}
            </div>
          </section>
        )}

        <section className="pt-6 border-t">
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-muted-foreground mb-3">Can't find what you're looking for?</p>
              <div className="flex justify-center gap-3">
                <Link href="/contact">
                  <Button data-testid="button-contact-us">Contact Us</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

interface ArticleCardProps {
  article: FAQArticle;
  isOpen: boolean;
  onToggle: () => void;
  onFeedback: (helpful: boolean) => void;
  hasFeedback: boolean;
}

function ArticleCard({ article, isOpen, onToggle, onFeedback, hasFeedback }: ArticleCardProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card data-testid={`article-${article.id}`}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover-elevate py-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base font-medium">{article.title}</CardTitle>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {article.content.split("\n").map((paragraph, i) => (
                <p key={i} className="mb-2 last:mb-0">{paragraph}</p>
              ))}
            </div>
            
            {!hasFeedback && (
              <div className="mt-4 pt-3 border-t flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Was this helpful?</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); onFeedback(true); }}
                  data-testid={`button-helpful-${article.id}`}
                >
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  Yes
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); onFeedback(false); }}
                  data-testid={`button-not-helpful-${article.id}`}
                >
                  <ThumbsDown className="h-3 w-3 mr-1" />
                  No
                </Button>
              </div>
            )}
            
            {hasFeedback && (
              <div className="mt-4 pt-3 border-t">
                <p className="text-sm text-muted-foreground">Thank you for your feedback!</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
