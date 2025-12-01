import { Card } from "@/components/ui/card";
import { BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ModuleDocumentation as ModuleDocType, DocSection } from "@/docs/index";

interface ModuleDocumentationProps {
  documentation: ModuleDocType;
  headerContent?: React.ReactNode;
}

function DocSectionCard({ section, defaultExpanded = true }: { section: DocSection; defaultExpanded?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
        data-testid={`section-toggle-${section.id}`}
      >
        <h3 className="font-serif text-xl font-medium">{section.title}</h3>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      <div
        className={cn(
          "transition-all duration-200 ease-in-out",
          isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"
        )}
      >
        <div className="p-4 pt-2">
          {section.content}
        </div>
      </div>
    </div>
  );
}

export default function ModuleDocumentation({ documentation, headerContent }: ModuleDocumentationProps) {
  return (
    <Card className="p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-primary" />
          <h2 className="font-serif text-2xl md:text-3xl font-medium mb-2">
            {documentation.moduleName}
          </h2>
          <p className="text-muted-foreground">{documentation.description}</p>
          {documentation.lastUpdated && (
            <p className="text-xs text-muted-foreground mt-2">
              Last updated: {documentation.lastUpdated}
            </p>
          )}
        </div>

        {headerContent && (
          <div className="mb-8">
            {headerContent}
          </div>
        )}

        <div className="space-y-4">
          {documentation.sections.map((section, index) => (
            <DocSectionCard
              key={section.id}
              section={section}
              defaultExpanded={index < 2}
            />
          ))}
        </div>

        <div className="mt-8 pt-6 border-t text-center">
          <p className="text-sm text-muted-foreground">
            For technical support or questions, please contact your IT administrator.
          </p>
        </div>
      </div>
    </Card>
  );
}
