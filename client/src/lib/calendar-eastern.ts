/** Eastern US calendar YYYY-MM-DD (matches server `calendarYmdEastern`). */
export function calendarYmdEastern(inst: Date | string | null | undefined): string {
  if (inst == null) return "invalid";
  const d =
    typeof inst === "string"
      ? new Date(inst)
      : inst instanceof Date
        ? inst
        : new Date(String(inst));
  if (Number.isNaN(d.getTime())) {
    if (typeof inst === "string") {
      const m = /^(\d{4}-\d{2}-\d{2})/.exec(inst);
      if (m) return m[1];
    }
    return "invalid";
  }
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    const y = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
    const da = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${mo}-${da}`;
  }
}
