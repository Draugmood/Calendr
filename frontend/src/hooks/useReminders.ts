import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Reminder,
  ReminderCreatePayload,
  ReminderSnoozePayload,
} from "@/types/reminder";

const REMINDER_BASE_URL = "/api/reminders";

async function readJsonOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [dueReminders, setDueReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshReminders = useCallback(async (background = false) => {
    if (!background) {
      setIsLoading(true);
      setErrorMessage(null);
    }

    try {
      const response = await fetchWithTimeout(REMINDER_BASE_URL);
      const data = await readJsonOrThrow<Reminder[]>(response);
      setReminders(data);
    } catch (error: any) {
      if (!background) {
        setErrorMessage(error?.message ?? "Failed to fetch reminders");
      }
    } finally {
      if (!background) {
        setIsLoading(false);
      }
    }
  }, []);

  const refreshDueReminders = useCallback(async () => {
    try {
      const response = await fetchWithTimeout(`${REMINDER_BASE_URL}/due`);
      const data = await readJsonOrThrow<Reminder[]>(response);
      setDueReminders(data);
    } catch {
      // keep existing due reminders on transient fetch errors
    }
  }, []);

  const createReminder = useCallback(async (payload: ReminderCreatePayload) => {
    const response = await fetchWithTimeout(REMINDER_BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const created = await readJsonOrThrow<Reminder>(response);
    setReminders((prev) => {
      const next = [...prev, created];
      next.sort((a, b) =>
        a.effective_trigger_utc.localeCompare(b.effective_trigger_utc),
      );
      return next;
    });
    return created;
  }, []);

  const completeReminder = useCallback(async (reminderId: number) => {
    const response = await fetchWithTimeout(
      `${REMINDER_BASE_URL}/${reminderId}/complete`,
      {
        method: "POST",
      },
    );
    const updated = await readJsonOrThrow<Reminder>(response);

    setReminders((prev) =>
      prev.map((item) => (item.id === reminderId ? updated : item)),
    );
    setDueReminders((prev) => prev.filter((item) => item.id !== reminderId));
    return updated;
  }, []);

  const deleteReminder = useCallback(async (reminderId: number) => {
    const response = await fetchWithTimeout(
      `${REMINDER_BASE_URL}/${reminderId}`,
      {
        method: "DELETE",
      },
    );
    await readJsonOrThrow<{ success: boolean; id: number }>(response);

    setReminders((prev) => prev.filter((item) => item.id !== reminderId));
    setDueReminders((prev) => prev.filter((item) => item.id !== reminderId));
  }, []);

  const snoozeReminder = useCallback(
    async (reminderId: number, payload: ReminderSnoozePayload) => {
      const response = await fetchWithTimeout(
        `${REMINDER_BASE_URL}/${reminderId}/snooze`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const updated = await readJsonOrThrow<Reminder>(response);

      setReminders((prev) =>
        prev.map((item) => (item.id === reminderId ? updated : item)),
      );
      setDueReminders((prev) => prev.filter((item) => item.id !== reminderId));
      return updated;
    },
    [],
  );

  useEffect(() => {
    void refreshReminders(false);
    void refreshDueReminders();

    const reminderListIntervalId = window.setInterval(
      () => void refreshReminders(true),
      30 * 1000,
    );
    const dueIntervalId = window.setInterval(
      () => void refreshDueReminders(),
      15 * 1000,
    );

    return () => {
      window.clearInterval(reminderListIntervalId);
      window.clearInterval(dueIntervalId);
    };
  }, [refreshDueReminders, refreshReminders]);

  const activeReminders = useMemo(
    () => reminders.filter((item) => item.status !== "completed"),
    [reminders],
  );

  return {
    reminders,
    activeReminders,
    dueReminders,
    isLoading,
    errorMessage,
    refreshReminders,
    createReminder,
    completeReminder,
    snoozeReminder,
    deleteReminder,
  };
}
