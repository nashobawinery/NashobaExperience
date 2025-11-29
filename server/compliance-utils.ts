import { addDays, addWeeks, addMonths } from "date-fns";

export type RecurrenceType = 
  | "one_time"
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "semi_annual"
  | "annual"
  | "custom";

export function calculateNextDueDate(
  currentDueDate: Date,
  recurrence: RecurrenceType,
  customRecurrenceDays?: number | null
): Date | null {
  switch (recurrence) {
    case "one_time":
      return null;
    case "daily":
      return addDays(currentDueDate, 1);
    case "weekly":
      return addWeeks(currentDueDate, 1);
    case "monthly":
      return addMonths(currentDueDate, 1);
    case "quarterly":
      return addMonths(currentDueDate, 3);
    case "semi_annual":
      return addMonths(currentDueDate, 6);
    case "annual":
      return addMonths(currentDueDate, 12);
    case "custom":
      if (customRecurrenceDays && customRecurrenceDays > 0) {
        return addDays(currentDueDate, customRecurrenceDays);
      }
      return null;
    default:
      return null;
  }
}
