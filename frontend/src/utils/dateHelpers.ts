import { format, isToday, isTomorrow, isYesterday, parseISO } from "date-fns";

/** "Today", "Yesterday", "Tomorrow", "Jun 11", "Jan 5, 2024" */
export function relativeDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? parseISO(date) : date;
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  if (isTomorrow(d)) return "Tomorrow";
  const thisYear = new Date().getFullYear();
  if (d.getFullYear() === thisYear) return format(d, "MMM d");
  return format(d, "MMM d, yyyy");
}

/** "Jun 11, 2025 · 2:30 PM" */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy · h:mm a");
}

/** "2:30 PM" */
export function formatTimeOnly(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "h:mm a");
}

/** ISO date string "YYYY-MM-DD" from a Date */
export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}
