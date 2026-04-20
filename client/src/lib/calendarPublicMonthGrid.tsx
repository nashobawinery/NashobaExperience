import { Fragment, type ReactNode } from "react";
import { CalendarDayBanner } from "@/components/CalendarDayBanner";

/** Minimal event shape for month grid layout (banner + card placement). */
export type CalendarGridEvent = {
  id: number;
  eventDate: string;
  startTime: string;
};

/**
 * Build grid children for one month: per-day banners align with column cards when a day has one event;
 * multi-event banner days get a full-width banner plus an inner row of cards.
 */
export function buildCalendarMonthGridItems<T extends CalendarGridEvent>(
  monthEventsSorted: T[],
  labelByDate: Map<string, string>,
  renderCard: (event: T) => ReactNode,
  bannerTestIdPrefix = "banner-special-day",
): ReactNode[] {
  const eventsByDate = new Map<string, T[]>();
  for (const e of monthEventsSorted) {
    if (!eventsByDate.has(e.eventDate)) eventsByDate.set(e.eventDate, []);
    eventsByDate.get(e.eventDate)!.push(e);
  }
  const sortedDates = Array.from(eventsByDate.keys()).sort((a, b) => a.localeCompare(b));

  const monthGridItems: ReactNode[] = [];
  for (const eventDate of sortedDates) {
    const evs = eventsByDate.get(eventDate)!;
    const dayLabel = labelByDate.get(eventDate);

    if (dayLabel && evs.length === 1) {
      monthGridItems.push(
        <div key={`day-col-${eventDate}`} className="col-span-1 flex min-w-0 flex-col gap-2">
          <CalendarDayBanner eventDate={eventDate} label={dayLabel} testId={`${bannerTestIdPrefix}-${eventDate}`} />
          {renderCard(evs[0])}
        </div>,
      );
    } else if (dayLabel && evs.length > 1) {
      monthGridItems.push(
        <div key={`day-block-${eventDate}`} className="col-span-full flex min-w-0 flex-col gap-4">
          <CalendarDayBanner eventDate={eventDate} label={dayLabel} testId={`${bannerTestIdPrefix}-${eventDate}`} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {evs.map((e) => (
              <Fragment key={e.id}>{renderCard(e)}</Fragment>
            ))}
          </div>
        </div>,
      );
    } else {
      for (const e of evs) {
        monthGridItems.push(<Fragment key={e.id}>{renderCard(e)}</Fragment>);
      }
    }
  }
  return monthGridItems;
}
