import { Sparkles } from "lucide-react";

/** Shared decorative banner for public media calendars (food trucks, live music, special events). */
export function CalendarDayBanner({
  eventDate,
  label,
  testId,
}: {
  eventDate: string;
  label: string;
  /** Defaults to `banner-special-day-${eventDate}` */
  testId?: string;
}) {
  const tid = testId ?? `banner-special-day-${eventDate}`;
  return (
    <div
      className="relative w-full min-w-0 overflow-hidden rounded-lg border-2 border-amber-400/55 bg-gradient-to-r from-primary via-primary to-primary/85 px-4 py-3.5 text-center shadow-lg shadow-primary/35 ring-1 ring-amber-300/40"
      data-testid={tid}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-2/5 bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent motion-safe:animate-banner-sheen motion-reduce:animate-none"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/80 to-transparent" />
      <div className="relative flex w-full min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center">
        <Sparkles
          className="h-5 w-5 shrink-0 text-amber-200 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)] motion-safe:animate-pulse motion-reduce:animate-none"
          aria-hidden
        />
        <p className="min-w-0 max-w-full flex-1 font-serif text-base font-bold uppercase leading-snug tracking-[0.12em] text-primary-foreground break-words drop-shadow-md sm:text-lg">
          {label}
        </p>
        <Sparkles
          className="h-5 w-5 shrink-0 text-amber-200 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)] motion-safe:animate-pulse motion-reduce:animate-none"
          aria-hidden
        />
      </div>
    </div>
  );
}
