import { createPortal } from "react-dom";
import PrimaryButton from "@/components/buttons/PrimaryButton";
import SecondaryButton from "@/components/buttons/SecondaryButton";
import { useReminders } from "@/hooks/useReminders";
import { formatReminderRecurrence } from "@/utils/reminderRecurrence";

export default function ReminderLiveOverlay() {
  const { dueReminders, snoozeReminder, completeReminder } = useReminders();

  if (dueReminders.length === 0) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-black/55 p-6">
      <div className="w-full max-w-3xl rounded-xl border border-red-300 bg-red-50 dark:bg-zinc-900 dark:border-red-800 shadow-2xl p-6">
        <h2 className="text-2xl font-bold text-red-800 dark:text-red-300 mb-2">
          Viktig påminnelse!
        </h2>
        <p className="text-sm text-red-900/80 dark:text-red-200/80 mb-4">
          Må fullføres eller utsettes for å forsvinne
        </p>

        <ul className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          {dueReminders.map((reminder) => {
            const recurrenceSummary = formatReminderRecurrence(reminder);

            return (
              <li
                key={reminder.id}
                className="rounded-lg border border-red-200 dark:border-red-900 bg-white/80 dark:bg-zinc-950/80 p-4"
              >
                <div className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                  {reminder.title}
                </div>
                {recurrenceSummary ? (
                  <div className="mt-1 text-sm font-medium text-cyan-700 dark:text-cyan-400">
                    {recurrenceSummary}
                  </div>
                ) : null}
                {reminder.description ? (
                  <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                    {reminder.description}
                  </div>
                ) : null}
                {reminder.recurrence_end_utc ? (
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Ends{" "}
                    {new Date(reminder.recurrence_end_utc).toLocaleString()}
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <SecondaryButton
                    label="Snooze 5min"
                    onClick={() => {
                      void snoozeReminder(reminder.id, { snooze_minutes: 5 });
                    }}
                  />
                  <SecondaryButton
                    label="Snooze 10min"
                    onClick={() => {
                      void snoozeReminder(reminder.id, { snooze_minutes: 10 });
                    }}
                  />
                  <PrimaryButton
                    label={"Fullfør"}
                    onClick={() => {
                      void completeReminder(reminder.id);
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
