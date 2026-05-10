import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { STAFF_MANAGEMENT_SEGMENTS } from "@/pages/staff-management/staffSegments";

type Props = {
  className?: string;
};

export function StaffSegmentCardGrid({ className }: Props) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3", className)}>
      {STAFF_MANAGEMENT_SEGMENTS.map((segment) => {
        const Icon = segment.icon;
        const href = `/staff-dashboard/${segment.slug}`;

        return (
          <Link key={segment.slug} href={href} className="block group">
            <Card
              className="h-full transition-all hover-elevate cursor-pointer border-border/80"
              data-testid={`card-staff-segment-${segment.slug}`}
            >
              <CardHeader className="pb-3 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wide" data-testid={`badge-construction-${segment.slug}`}>
                      Under construction
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hidden sm:block" />
                  </div>
                </div>
                <div className="space-y-1.5 pr-1">
                  <CardTitle className="text-lg leading-snug">{segment.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{segment.shortDescription}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
