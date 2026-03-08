import { useState } from "react";
import { Info, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageDocBannerProps {
  summary: string;
  details?: string[];
  tips?: string[];
  docsLink?: string;
  docsLabel?: string;
}

export function PageDocBanner({ summary, details, tips, docsLink, docsLabel }: PageDocBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = (details && details.length > 0) || (tips && tips.length > 0);

  return (
    <div className="rounded-md border border-border bg-muted/40 px-4 py-3 mb-4" data-testid="page-doc-banner">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground leading-relaxed">{summary}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {docsLink && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.dispatchEvent(new CustomEvent("rcc-navigate", { detail: docsLink }))}
              data-testid="btn-doc-banner-docs-link"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              {docsLabel ?? "Full docs"}
            </Button>
          )}
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(e => !e)}
              data-testid="btn-doc-banner-toggle"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5 mr-1.5" />
                  Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5 mr-1.5" />
                  How it works
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {expanded && hasMore && (
        <div className="mt-3 pl-6 space-y-3">
          {details && details.length > 0 && (
            <ul className="space-y-1.5" data-testid="doc-banner-details">
              {details.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          )}
          {tips && tips.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Tips</p>
              <ul className="space-y-1.5">
                {tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
