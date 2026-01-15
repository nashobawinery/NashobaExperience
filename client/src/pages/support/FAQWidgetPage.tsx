import { useQuery } from "@tanstack/react-query";
import { ChevronRight, HelpCircle } from "lucide-react";
import type { SupportArticle } from "@shared/schema";

export default function FAQWidgetPage() {
  const { data: articles = [], isLoading } = useQuery<SupportArticle[]>({
    queryKey: ["/api/public/faq-widget"],
  });

  if (isLoading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Loading FAQ...
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No FAQ articles available yet.</p>
      </div>
    );
  }

  return (
    <div className="font-sans">
      <div className="border-b pb-2 mb-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Frequently Asked Questions
        </h3>
      </div>
      <ul className="space-y-2">
        {articles.map((article) => (
          <li key={article.id}>
            <a
              href={`/faq#${article.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
              data-testid={`widget-article-${article.id}`}
            >
              <span className="font-medium group-hover:text-primary transition-colors">
                {article.title}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </a>
          </li>
        ))}
      </ul>
      <div className="mt-4 pt-3 border-t text-center">
        <a
          href="/faq"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline"
        >
          View all FAQ articles
        </a>
      </div>
    </div>
  );
}
