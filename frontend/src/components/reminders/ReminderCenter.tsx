import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DateTime } from "luxon";
import { useReminders } from "@/hooks/useReminders";
import PrimaryButton from "@/components/buttons/PrimaryButton";
import SecondaryButton from "@/components/buttons/SecondaryButton";
import DangerButton from "@/components/buttons/DangerButton";
import type { ReminderStatus } from "@/types/reminder";
import { formatReminderRecurrence } from "@/utils/reminderRecurrence";
import ReminderFormModal from "./ReminderFormModal";

const STATUS_LABELS: Record<ReminderStatus, string> = {
  pending: "Venter",
  snoozed: "Utsatt",
  completed: "Fullført",
};

function formatAsLocalDateTime(utcIso: string): string {
  const date = DateTime.fromISO(utcIso);
  if (!date.isValid) {
    return "Ugyldig dato";
  }
  return date.setLocale("nb").toFormat("cccc d. LLLL 'kl.' HH:mm");
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

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
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

  async function runAction(action: () => Promise<unknown>, failureText: string) {
    setActionError(null);
    try {
      await action();
    } catch {
      setActionError(failureText);
    }
  }

  async function handleDeleteReminder(reminderId: number) {
    await runAction(async () => {
      await deleteReminder(reminderId);
      setConfirmDeleteReminderId(null);
    }, "Kunne ikke slette påminnelsen.");
  }

  return (
    <section className="w-full mt-6 flex justify-center">
      <div className="w-full max-w-3xl border border-gray-600 rounded-lg p-4 text-left bg-white dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="flex items-center rounded p-1 hover:bg-gray-200 dark:hover:bg-zinc-700"
              aria-label="Tilbake"
              title="Tilbake"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <h1 className="text-2xl font-bold">Påminnelser</h1>
          </div>
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-1 rounded-lg bg-cyan-600 px-4 py-2 font-medium text-stone-950 cursor-pointer hover:bg-cyan-500"
          >
            <span className="material-symbols-outlined">add</span>
            Ny påminnelse
          </button>
        </div>

        {actionError && <p className="mb-3 text-sm text-red-500">{actionError}</p>}

        {isLoading && sortedActiveReminders.length === 0 && (
          <p className="py-8 text-center">Henter påminnelser...</p>
        )}
        {!isLoading && errorMessage && (
          <p className="py-8 text-center text-red-500">Kunne ikke hente påminnelser.</p>
        )}
        {!isLoading && !errorMessage && sortedActiveReminders.length === 0 && (
          <p className="py-8 text-center text-gray-500 dark:text-gray-400">
            Ingen påminnelser ennå.
          </p>
        )}

        {sortedActiveReminders.length > 0 && (
          <ul className="flex flex-col gap-3">
            {sortedActiveReminders.map((reminder) => {
              const recurrenceSummary = formatReminderRecurrence(reminder);
              const isDue = dueIds.has(reminder.id);

              return (
                <li
                  key={reminder.id}
                  className={`rounded-lg border p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${
                    isDue ? "border-red-500 bg-red-50 dark:bg-red-950/30" : "border-gray-600"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-lg font-semibold">{reminder.title}</div>
                    {reminder.description && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {reminder.description}
                      </div>
                    )}
                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-1 first-letter:uppercase">
                      {formatAsLocalDateTime(reminder.effective_trigger_utc)}
                    </div>
                    {recurrenceSummary && (
                      <div className="text-sm text-cyan-700 dark:text-cyan-400 mt-1">
                        {recurrenceSummary}
                      </div>
                    )}
                    {reminder.recurrence_end_utc && (
                      <div className="text-xs text-gray-500 mt-1">
                        Slutter {formatAsLocalDateTime(reminder.recurrence_end_utc)}
                      </div>
                    )}
                    <div className="text-xs mt-1 uppercase tracking-wide text-cyan-700 dark:text-cyan-400">
                      {STATUS_LABELS[reminder.status]}
                      {isDue ? " – forfaller nå" : ""}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap shrink-0">
                    {confirmDeleteReminderId === reminder.id ? (
                      <>
                        <SecondaryButton
                          label="Avbryt"
                          onClick={() => setConfirmDeleteReminderId(null)}
                        />
                        <DangerButton
                          label="Slett for godt"
                          onClick={() => void handleDeleteReminder(reminder.id)}
                        />
                      </>
                    ) : (
                      <>
                        <PrimaryButton
                          label={reminder.is_recurring ? "Fullfør denne" : "Fullfør"}
                          onClick={() =>
                            void runAction(
                              () => completeReminder(reminder.id),
                              "Kunne ikke fullføre påminnelsen.",
                            )
                          }
                        />
                        <DangerButton
                          label="Slett"
                          onClick={() => {
                            setActionError(null);
                            setConfirmDeleteReminderId(reminder.id);
                          }}
                        />
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {isFormOpen && (
        <ReminderFormModal
          onClose={() => setIsFormOpen(false)}
          onSubmit={createReminder}
        />
      )}
    </section>
  );
}
