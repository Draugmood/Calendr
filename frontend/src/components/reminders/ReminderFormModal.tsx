import PrimaryButton from "@/components/buttons/PrimaryButton";
import SecondaryButton from "@/components/buttons/SecondaryButton";
import { segmentClass } from "@/components/buttons/segmentClass";
import DateTimeField from "@/components/input/DateTimeField";
import TextInput from "@/components/input/TextInput";
import type { ReminderCreatePayload } from "@/types/reminder";
import {
  type ReminderRecurrenceFrequency,
  buildRecurrenceRule,
} from "@/utils/reminderRecurrence";
import { useState } from "react";
import { createPortal } from "react-dom";

const FREQUENCY_OPTIONS: { value: ReminderRecurrenceFrequency; label: string }[] = [
  { value: "daily", label: "Daglig" },
  { value: "weekly", label: "Ukentlig" },
  { value: "monthly", label: "Månedlig" },
  { value: "yearly", label: "Årlig" },
];

const WEEKDAY_LABELS = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"] as const;

interface Props {
  onClose: () => void;
  onSubmit: (payload: ReminderCreatePayload) => Promise<unknown>;
}

export default function ReminderFormModal({ onClose, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAtLocal, setDueAtLocal] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] =
    useState<ReminderRecurrenceFrequency>("weekly");
  const [weeklyDays, setWeeklyDays] = useState<number[]>([]);
  const [recurrenceEndLocal, setRecurrenceEndLocal] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function toggleWeeklyDay(weekday: number) {
    setWeeklyDays((current) =>
      current.includes(weekday)
        ? current.filter((value) => value !== weekday)
        : [...current, weekday].sort((a, b) => a - b),
    );
  }

  async function handleSubmit() {
    setErrorMessage(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMessage("Påminnelsen må ha en tittel.");
      return;
    }

    if (!dueAtLocal) {
      setErrorMessage("Velg dato og klokkeslett.");
      return;
    }

    const dueDate = new Date(dueAtLocal);
    if (Number.isNaN(dueDate.getTime())) {
      setErrorMessage("Ugyldig dato eller klokkeslett.");
      return;
    }
    if (dueDate <= new Date()) {
      setErrorMessage("Tidspunktet må være i fremtiden.");
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
        setErrorMessage("Fant ikke tidssonen.");
        return;
      }
      payload.timezone = timezone;

      let recurrenceEndDate: Date | null = null;
      if (recurrenceEndLocal) {
        recurrenceEndDate = new Date(recurrenceEndLocal);
        if (Number.isNaN(recurrenceEndDate.getTime())) {
          setErrorMessage("Ugyldig sluttdato.");
          return;
        }
        if (recurrenceEndDate <= dueDate) {
          setErrorMessage("Sluttdatoen må være etter første påminnelse.");
          return;
        }
        payload.recurrence_end_utc = recurrenceEndDate.toISOString();
      }

      payload.recurrence_rule = buildRecurrenceRule(
        recurrenceFrequency,
        dueDate,
        weeklyDays,
        recurrenceEndDate,
      );
    }

    setIsSaving(true);
    try {
      await onSubmit(payload);
      onClose();
    } catch {
      setErrorMessage("Kunne ikke lagre påminnelsen.");
      setIsSaving(false);
    }
  }

  return createPortal(
    // No backdrop click-to-close: while typing, a stray tap outside the field would
    // discard the form.
    <div className="fixed inset-x-0 top-0 bottom-(--osk-offset) z-50 p-4 flex items-center justify-center bg-black/60">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg max-h-full overflow-y-auto text-left flex flex-col gap-5">
        <h2 className="text-xl font-bold">Ny påminnelse</h2>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-500 dark:text-gray-400">Tittel</span>
          <TextInput
            value={title}
            onChange={setTitle}
            placeholder="F.eks. Betale regninger"
            autoFocus
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Beskrivelse (valgfritt)
          </span>
          <TextInput value={description} onChange={setDescription} />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Når</span>
          <DateTimeField onChange={setDueAtLocal} />
        </div>

        <button
          type="button"
          className={`${segmentClass(isRecurring)} self-start flex items-center gap-1`}
          onClick={() => setIsRecurring((current) => !current)}
          aria-pressed={isRecurring}
        >
          <span className="material-symbols-outlined text-base!">repeat</span>
          Gjentakende
        </button>

        {isRecurring && (
          <div className="flex flex-col gap-4 rounded-lg border border-gray-500/50 p-4">
            <div className="flex flex-col gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Gjentas</span>
              <div className="flex flex-wrap gap-2">
                {FREQUENCY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={segmentClass(recurrenceFrequency === option.value)}
                    onClick={() => setRecurrenceFrequency(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {recurrenceFrequency === "weekly" && (
              <div className="flex flex-col gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Hvilke dager
                </span>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_LABELS.map((label, weekday) => (
                    <button
                      key={label}
                      type="button"
                      className={segmentClass(weeklyDays.includes(weekday))}
                      onClick={() => toggleWeeklyDay(weekday)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {weeklyDays.length === 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Ingen valgt: bruker samme ukedag som første påminnelse.
                  </span>
                )}
              </div>
            )}

            {recurrenceFrequency === "monthly" && (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Gjentas på samme dato hver måned som første påminnelse.
              </p>
            )}

            {recurrenceFrequency === "yearly" && (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Gjentas på samme dag og måned hvert år som første påminnelse.
              </p>
            )}

            <div className="flex flex-col gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Slutter (valgfritt)
              </span>
              <DateTimeField onChange={setRecurrenceEndLocal} allowClear />
            </div>
          </div>
        )}

        {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

        <div className="flex justify-end gap-3">
          <SecondaryButton label="Avbryt" onClick={onClose} />
          <PrimaryButton
            label={isSaving ? "Lagrer..." : "Lagre"}
            onClick={isSaving ? undefined : () => void handleSubmit()}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
