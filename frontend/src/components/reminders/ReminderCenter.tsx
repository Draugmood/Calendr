import { useMemo, useState } from "react";
import { useReminders } from "@/hooks/useReminders";
import PrimaryButton from "@/components/buttons/PrimaryButton";
import SecondaryButton from "@/components/buttons/SecondaryButton";
import Checkbox from "@/components/input/Checkbox";
import type { ReminderCreatePayload } from "@/types/reminder";
import { formatReminderRecurrence } from "@/utils/reminderRecurrence";
import DangerButton from "../buttons/DangerButton";

type ReminderRecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

const WEEKDAY_OPTIONS = [
  { value: 0, label: "Mon" },
  { value: 1, label: "Tue" },
  { value: 2, label: "Wed" },
  { value: 3, label: "Thu" },
  { value: 4, label: "Fri" },
  { value: 5, label: "Sat" },
  { value: 6, label: "Sun" },
] as const;

const WEEKDAY_TOKENS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;

function formatAsLocalDateTime(utcIso: string): string {
  const date = new Date(utcIso);
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }
  return date.toLocaleString();
}

function getWeekdayFromLocalInput(localValue: string): number | null {
  if (!localValue) {
    return null;
  }

  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return (date.getDay() + 6) % 7;
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

function buildRecurrenceRule(
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

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export default function ReminderCenter() {
  const {
    activeReminders,
    dueReminders,
    isLoading,
    errorMessage,
    createReminder,
    completeReminder,
    deleteReminder,
  } = useReminders();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAtLocal, setDueAtLocal] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] =
    useState<ReminderRecurrenceFrequency>("weekly");
  const [weeklyDays, setWeeklyDays] = useState<number[]>([]);
  const [recurrenceEndLocal, setRecurrenceEndLocal] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDeleteReminderId, setConfirmDeleteReminderId] = useState<
    number | null
  >(null);

  const sortedActiveReminders = useMemo(
    () =>
      [...activeReminders].sort((a, b) =>
        a.effective_trigger_utc.localeCompare(b.effective_trigger_utc),
      ),
    [activeReminders],
  );

  const dueIds = useMemo(
    () => new Set(dueReminders.map((item) => item.id)),
    [dueReminders],
  );

  function toggleWeeklyDay(weekday: number) {
    setWeeklyDays((current) =>
      current.includes(weekday)
        ? current.filter((value) => value !== weekday)
        : [...current, weekday].sort((a, b) => a - b),
    );
  }

  async function handleCreateReminder() {
    setFormError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError("Title is required");
      return;
    }

    if (!dueAtLocal) {
      setFormError("Due date and time are required");
      return;
    }

    const dueDate = new Date(dueAtLocal);
    if (Number.isNaN(dueDate.getTime())) {
      setFormError("Invalid due date/time");
      return;
    }

    const payload: ReminderCreatePayload = {
      title: trimmedTitle,
      description: description.trim() || undefined,
      due_at_utc: dueDate.toISOString(),
    };

    if (isRecurring) {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!timezone) {
        setFormError("Could not determine browser timezone");
        return;
      }

      payload.timezone = timezone;
      let recurrenceEndDate: Date | null = null;

      if (recurrenceFrequency === "weekly" && weeklyDays.length === 0) {
        const fallbackWeekday = getWeekdayFromLocalInput(dueAtLocal);
        if (fallbackWeekday === null) {
          setFormError("Choose at least one weekday for weekly recurrence");
          return;
        }
        setWeeklyDays([fallbackWeekday]);
      }

      if (recurrenceEndLocal) {
        recurrenceEndDate = new Date(recurrenceEndLocal);
        if (Number.isNaN(recurrenceEndDate.getTime())) {
          setFormError("Invalid recurrence end date");
          return;
        }

        if (recurrenceEndDate <= dueDate) {
          setFormError("Recurrence end must be after the first reminder time");
          return;
        }
      }

      payload.recurrence_rule = buildRecurrenceRule(
        recurrenceFrequency,
        dueDate,
        weeklyDays,
        recurrenceEndDate,
      );
      if (recurrenceEndDate) {
        payload.recurrence_end_utc = recurrenceEndDate.toISOString();
      }
    }

    try {
      setIsSubmitting(true);
      await createReminder(payload);

      setTitle("");
      setDescription("");
      setDueAtLocal("");
      setIsRecurring(false);
      setRecurrenceFrequency("weekly");
      setWeeklyDays([]);
      setRecurrenceEndLocal("");
    } catch (error: unknown) {
      setFormError(getErrorMessage(error, "Failed to create reminder"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteReminder(reminderId: number) {
    setActionError(null);
    try {
      await deleteReminder(reminderId);
      setConfirmDeleteReminderId(null);
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, "Failed to delete reminder"));
    }
  }

  return (
    <section className="w-full mt-6">
      <div className="border border-gray-600 rounded-lg p-4 text-left bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Important Reminders</h2>
          {isLoading ? (
            <span className="text-sm text-gray-500">Refreshing...</span>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <input
            className="border border-gray-400 rounded px-3 py-2 bg-transparent"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Title"
          />
          <input
            className="border border-gray-400 rounded px-3 py-2 bg-transparent md:col-span-2"
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description (optional)"
          />
          <input
            className="border border-gray-400 rounded px-3 py-2 bg-transparent"
            type="datetime-local"
            value={dueAtLocal}
            onChange={(event) => setDueAtLocal(event.target.value)}
          />
        </div>

        <div className="mb-4 rounded-lg border border-gray-500/50 p-4">
          <div className="flex flex-col gap-3">
            <Checkbox
              checked={isRecurring}
              onChange={() => setIsRecurring((current) => !current)}
              label="Recurring reminder"
            />

            {isRecurring ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-200">
                      Gjentas
                    </span>
                    <select
                      className="border border-gray-400 rounded px-3 py-2 bg-transparent"
                      value={recurrenceFrequency}
                      onChange={(event) =>
                        setRecurrenceFrequency(
                          event.target.value as ReminderRecurrenceFrequency,
                        )
                      }
                    >
                      <option className="text-black" value="daily">
                        Daily
                      </option>
                      <option className="text-black" value="weekly">
                        Weekly
                      </option>
                      <option className="text-black" value="monthly">
                        Monthly
                      </option>
                      <option className="text-black" value="yearly">
                        Yearly
                      </option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-sm md:col-span-2">
                    <span className="font-medium text-gray-700 dark:text-gray-200">
                      Ends (optional)
                    </span>
                    <input
                      className="border border-gray-400 rounded px-3 py-2 bg-transparent"
                      type="datetime-local"
                      value={recurrenceEndLocal}
                      onChange={(event) =>
                        setRecurrenceEndLocal(event.target.value)
                      }
                    />
                  </label>
                </div>

                {recurrenceFrequency === "weekly" ? (
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Repeat on
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAY_OPTIONS.map((option) => {
                        const isSelected = weeklyDays.includes(option.value);
                        return (
                          <button
                            key={option.value}
                            type="button"
                            className={[
                              "rounded-full border px-3 py-1 text-sm transition-colors",
                              isSelected
                                ? "border-cyan-500 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300"
                                : "border-gray-400 text-gray-700 dark:text-gray-200",
                            ].join(" ")}
                            onClick={() => toggleWeeklyDay(option.value)}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {recurrenceFrequency === "monthly" ? (
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Monthly reminders repeat on the same day number as the first
                    due date.
                  </div>
                ) : null}

                {recurrenceFrequency === "yearly" ? (
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Yearly reminders repeat on the same month and day as the
                    first due date.
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <PrimaryButton
            label={isSubmitting ? "Saving..." : "Add reminder"}
            onClick={() => {
              void handleCreateReminder();
            }}
          />
        </div>

        {formError ? (
          <div className="text-red-500 mb-3">{formError}</div>
        ) : null}
        {errorMessage ? (
          <div className="text-red-500 mb-3">{errorMessage}</div>
        ) : null}
        {actionError ? (
          <div className="text-red-500 mb-3">{actionError}</div>
        ) : null}

        {sortedActiveReminders.length === 0 ? (
          <div className="text-gray-500">No active reminders yet.</div>
        ) : (
          <ul className="space-y-2">
            {sortedActiveReminders.map((reminder) => {
              const recurrenceSummary = formatReminderRecurrence(reminder);

              return (
                <li
                  key={reminder.id}
                  className="border border-gray-500 rounded p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div>
                    <div className="font-semibold">{reminder.title}</div>
                    {reminder.description ? (
                      <div className="text-sm text-gray-500">
                        {reminder.description}
                      </div>
                    ) : null}
                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      Trigger:{" "}
                      {formatAsLocalDateTime(reminder.effective_trigger_utc)}
                    </div>
                    {recurrenceSummary ? (
                      <div className="text-sm text-cyan-700 dark:text-cyan-400 mt-1">
                        {recurrenceSummary}
                      </div>
                    ) : null}
                    {reminder.recurrence_end_utc ? (
                      <div className="text-xs text-gray-500 mt-1">
                        Ends{" "}
                        {formatAsLocalDateTime(reminder.recurrence_end_utc)}
                      </div>
                    ) : null}
                    <div className="text-xs mt-1 uppercase tracking-wide text-cyan-700 dark:text-cyan-400">
                      {reminder.status}
                      {dueIds.has(reminder.id) ? " - due now" : ""}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <PrimaryButton
                      label={
                        reminder.is_recurring
                          ? "Complete occurrence"
                          : "Complete"
                      }
                      onClick={() => {
                        void completeReminder(reminder.id);
                      }}
                    />
                    {confirmDeleteReminderId === reminder.id ? (
                      <>
                        <SecondaryButton
                          label="Cancel"
                          onClick={() => {
                            setConfirmDeleteReminderId(null);
                          }}
                        />
                        <DangerButton
                          label="Delete permanently"
                          onClick={() => {
                            void handleDeleteReminder(reminder.id);
                          }}
                        />
                      </>
                    ) : (
                      <DangerButton
                        label="Delete"
                        onClick={() => {
                          setActionError(null);
                          setConfirmDeleteReminderId(reminder.id);
                        }}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
