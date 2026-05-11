/** Eastern US calendar YYYY-MM-DD (matches server `calendarYmdEastern`). */
export function calendarYmdEastern(inst: Date | string): string {
  const d = typeof inst === "string" ? new Date(inst) : inst;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
