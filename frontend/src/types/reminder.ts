export type ReminderStatus = "pending" | "snoozed" | "completed";

export interface Reminder {
  id: number;
  title: string;
  description: string | null;
  due_at_utc: string;
  status: ReminderStatus;
  snoozed_until_utc: string | null;
  timezone: string | null;
  recurrence_rule: string | null;
  recurrence_text: string | null;
  recurrence_end_utc: string | null;
  is_recurring: boolean;
  effective_trigger_utc: string;
  created_at: string;
  updated_at: string;
}

export interface ReminderCreatePayload {
  title: string;
  description?: string;
  due_at_utc: string;
  timezone?: string;
  recurrence_rule?: string;
  recurrence_end_utc?: string;
}

export interface ReminderSnoozePayload {
  snooze_minutes: 5 | 10 | 30;
}
