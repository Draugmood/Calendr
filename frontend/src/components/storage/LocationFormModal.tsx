import PrimaryButton from "@/components/buttons/PrimaryButton";
import SecondaryButton from "@/components/buttons/SecondaryButton";
import { segmentClass } from "@/components/buttons/segmentClass";
import TextInput from "@/components/input/TextInput";
import { KIND_LABELS, type LocationKind, type StorageLocation } from "@/types/storage";
import { allowedChildKinds, defaultChildKind, suggestName } from "@/utils/storageTree";
import { useState } from "react";
import StorageModal from "./StorageModal";

const NAME_PLACEHOLDERS: Record<LocationKind, string> = {
  floor: "F.eks. Loft",
  room: "F.eks. Bod",
  furniture: "F.eks. Reol",
  shelf: "F.eks. Øverste skuff",
  box: "F.eks. Boks 1",
};

export interface LocationFormValues {
  name: string;
  kind: LocationKind;
  notes: string;
}

interface Props {
  // Editing changes only name and notes; kind and parent are fixed (moves go through the picker).
  location: StorageLocation | null;
  parent: StorageLocation | null;
  locations: StorageLocation[];
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (values: LocationFormValues) => Promise<unknown>;
}

function titleFor(location: StorageLocation | null, parent: StorageLocation | null): string {
  if (location) return `Endre «${location.name}»`;
  return parent ? `Nytt sted i «${parent.name}»` : "Ny etasje";
}

export default function LocationFormModal({
  location,
  parent,
  locations,
  submitLabel = "Lagre",
  onClose,
  onSubmit,
}: Props) {
  const kinds = allowedChildKinds(parent);
  const [kind, setKind] = useState<LocationKind>(
    () => location?.kind ?? defaultChildKind(parent),
  );
  const [name, setName] = useState(
    () => location?.name ?? suggestName(kind, parent, locations),
  );
  const [notes, setNotes] = useState(location?.notes ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleKindChange = (nextKind: LocationKind) => {
    // Swap the suggestion along with the kind, unless the name has been typed over.
    if (name === suggestName(kind, parent, locations)) {
      setName(suggestName(nextKind, parent, locations));
    }
    setKind(nextKind);
  };

  const handleSubmit = async () => {
    if (isSaving) return;
    if (!name.trim()) {
      setErrorMessage("Stedet må ha et navn.");
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit({ name: name.trim(), kind, notes: notes.trim() });
      onClose();
    } catch {
      setErrorMessage("Kunne ikke lagre stedet.");
      setIsSaving(false);
    }
  };

  return (
    <StorageModal title={titleFor(location, parent)}>
      {!location && kinds.length > 1 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Type</span>
          <div className="flex flex-wrap gap-2">
            {kinds.map((value) => (
              <button
                key={value}
                type="button"
                className={segmentClass(kind === value)}
                onClick={() => handleKindChange(value)}
              >
                {KIND_LABELS[value]}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-500 dark:text-gray-400">Navn</span>
        <TextInput
          value={name}
          onChange={setName}
          onEnter={() => void handleSubmit()}
          placeholder={NAME_PLACEHOLDERS[kind]}
          autoFocus
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-500 dark:text-gray-400">Notat</span>
        <TextInput
          value={notes}
          onChange={setNotes}
          onEnter={() => void handleSubmit()}
          placeholder="F.eks. Bakerst til venstre"
        />
      </label>

      {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

      <div className="flex justify-end gap-3">
        <SecondaryButton label="Avbryt" onClick={onClose} />
        <PrimaryButton
          label={isSaving ? "Lagrer..." : submitLabel}
          onClick={isSaving ? undefined : () => void handleSubmit()}
        />
      </div>
    </StorageModal>
  );
}
