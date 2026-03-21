import type { Reminder } from "@/types/reminder";

export function formatReminderRecurrence(reminder: Reminder): string | null {
  if (!reminder.is_recurring) {
    return null;
  }

  return reminder.recurrence_text ?? "Gjentas";
}
