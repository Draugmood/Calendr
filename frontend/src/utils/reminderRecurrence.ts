import type { Reminder } from "@/types/reminder";

export type ReminderRecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

const WEEKDAY_TOKENS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;

export function formatReminderRecurrence(reminder: Reminder): string | null {
  if (!reminder.is_recurring) {
    return null;
  }

  return reminder.recurrence_text ?? "Gjentas";
}

function toUntilRruleValue(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  const second = String(date.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hour}${minute}${second}Z`;
}

/** weeklyDays are Monday-based indexes (0 = Monday); falls back to the due date's weekday. */
export function buildRecurrenceRule(
  recurrenceFrequency: ReminderRecurrenceFrequency,
  dueDate: Date,
  weeklyDays: number[],
  recurrenceEndDate: Date | null,
): string {
  const tokens: string[] = [`FREQ=${recurrenceFrequency.toUpperCase()}`];

  if (recurrenceFrequency === "weekly") {
    const fallbackWeekday = (dueDate.getDay() + 6) % 7;
    const resolvedDays = weeklyDays.length > 0 ? weeklyDays : [fallbackWeekday];
    const byDay = [...new Set(resolvedDays)]
      .sort((a, b) => a - b)
      .map((weekday) => WEEKDAY_TOKENS[weekday])
      .join(",");
    tokens.push(`BYDAY=${byDay}`);
  }

  if (recurrenceFrequency === "monthly") {
    tokens.push(`BYMONTHDAY=${dueDate.getDate()}`);
  }

  if (recurrenceEndDate) {
    tokens.push(`UNTIL=${toUntilRruleValue(recurrenceEndDate)}`);
  }

  return tokens.join(";");
}
