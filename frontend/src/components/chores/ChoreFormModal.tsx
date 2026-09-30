import PrimaryButton from "@/components/buttons/PrimaryButton";
import SecondaryButton from "@/components/buttons/SecondaryButton";
import { segmentClass } from "@/components/buttons/segmentClass";
import TextInput from "@/components/input/TextInput";
import {
  type Chore,
  type ChorePayload,
  type ChorePriority,
  PRIORITY_LABELS,
} from "@/types/chore";
import { useState } from "react";
import { createPortal } from "react-dom";

const FREQUENCY_PRESETS = [
  { label: "Daglig", days: 1 },
  { label: "Ukentlig", days: 7 },
  { label: "Annenhver uke", days: 14 },
  { label: "Månedlig", days: 30 },
  { label: "Kvartalsvis", days: 90 },
] as const;

const PRIORITIES: ChorePriority[] = [1, 2, 3];

interface Props {
  chore: Chore | null;
  onClose: () => void;
  onSubmit: (payload: ChorePayload) => Promise<unknown>;
}

export default function ChoreFormModal({ chore, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState(chore?.title ?? "");
  const [frequencyDays, setFrequencyDays] = useState(
    chore?.frequency_days ?? 7,
  );
  const [priority, setPriority] = useState<ChorePriority>(chore?.priority ?? 2);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setErrorMessage("Oppgaven må ha et navn.");
      return;
    }
    if (!Number.isInteger(frequencyDays) || frequencyDays < 1) {
      setErrorMessage("Frekvensen må være minst 1 dag.");
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit({ title: title.trim(), frequency_days: frequencyDays, priority });
      onClose();
    } catch {
      setErrorMessage("Kunne ikke lagre oppgaven.");
      setIsSaving(false);
    }
  };

  return createPortal(
    // No backdrop click-to-close: while typing, a stray tap outside the field would
    // discard the form.
    <div className="fixed inset-x-0 top-0 bottom-(--osk-offset) z-50 p-4 flex items-center justify-center bg-black/60">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg max-h-full overflow-y-auto text-left flex flex-col gap-5">
        <h2 className="text-xl font-bold">
          {chore ? "Rediger oppgave" : "Ny oppgave"}
        </h2>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-500 dark:text-gray-400">Oppgave</span>
          <TextInput
            value={title}
            onChange={setTitle}
            onEnter={() => void handleSubmit()}
            placeholder="F.eks. Vaske toalettet"
            autoFocus
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Minst hver
          </span>
          <div className="flex flex-wrap gap-2">
            {FREQUENCY_PRESETS.map((preset) => (
              <button
                key={preset.days}
                type="button"
                className={segmentClass(frequencyDays === preset.days)}
                onClick={() => setFrequencyDays(preset.days)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <TextInput
              className="w-20 px-2! py-1!"
              layout="numeric"
              value={Number.isNaN(frequencyDays) ? "" : String(frequencyDays)}
              onChange={(value) =>
                setFrequencyDays(parseInt(value.replace(/\D/g, ""), 10))
              }
              onEnter={() => void handleSubmit()}
            />
            dager
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Prioritet
          </span>
          <div className="flex gap-2">
            {PRIORITIES.map((value) => (
              <button
                key={value}
                type="button"
                className={segmentClass(priority === value)}
                onClick={() => setPriority(value)}
              >
                {PRIORITY_LABELS[value]}
              </button>
            ))}
          </div>
        </div>

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
