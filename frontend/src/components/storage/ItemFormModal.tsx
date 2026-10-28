import PrimaryButton from "@/components/buttons/PrimaryButton";
import SecondaryButton from "@/components/buttons/SecondaryButton";
import { segmentClass } from "@/components/buttons/segmentClass";
import TextInput from "@/components/input/TextInput";
import { useStorageCategories } from "@/hooks/useStorage";
import type { StorageItem } from "@/types/storage";
import { useState } from "react";
import StorageModal from "./StorageModal";

const MAX_CATEGORY_CHIPS = 8;

export interface ItemFormValues {
  name: string;
  category: string;
  notes: string;
}

interface Props {
  item: StorageItem | null;
  locationName: string;
  onClose: () => void;
  onSubmit: (values: ItemFormValues) => Promise<unknown>;
}

export default function ItemFormModal({ item, locationName, onClose, onSubmit }: Props) {
  const categories = useStorageCategories();
  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState(item?.category ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedName, setSavedName] = useState<string | null>(null);
  // Remounts the name field after "Lagre og ny" so it takes focus again.
  const [nameFieldKey, setNameFieldKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const typedCategory = category.trim().toLocaleLowerCase("nb");
  const categoryChips = categories
    .filter((existing) => {
      const lowered = existing.toLocaleLowerCase("nb");
      return lowered !== typedCategory && lowered.includes(typedCategory);
    })
    .slice(0, MAX_CATEGORY_CHIPS);

  const save = async (keepOpen: boolean) => {
    if (isSaving) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Tingen må ha et navn.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      await onSubmit({ name: trimmedName, category: category.trim(), notes: notes.trim() });
    } catch {
      setErrorMessage("Kunne ikke lagre tingen.");
      setIsSaving(false);
      return;
    }

    if (!keepOpen) {
      onClose();
      return;
    }
    // Keep the category: a box is often packed with several things of the same kind.
    setSavedName(trimmedName);
    setName("");
    setNotes("");
    setNameFieldKey((key) => key + 1);
    setIsSaving(false);
  };

  return (
    <StorageModal title={item ? "Rediger ting" : `Ny ting i «${locationName}»`}>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-500 dark:text-gray-400">Navn</span>
        <TextInput
          key={nameFieldKey}
          value={name}
          onChange={setName}
          onEnter={() => void save(false)}
          placeholder="F.eks. Skøyter"
          autoFocus
        />
      </label>

      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-500 dark:text-gray-400">Kategori</span>
          <TextInput
            value={category}
            onChange={setCategory}
            onEnter={() => void save(false)}
            placeholder="F.eks. Sport"
          />
        </label>
        {categoryChips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {categoryChips.map((existing) => (
              <button
                key={existing}
                type="button"
                className={segmentClass(false)}
                onClick={() => setCategory(existing)}
              >
                {existing}
              </button>
            ))}
          </div>
        )}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-500 dark:text-gray-400">Notat</span>
        <TextInput
          value={notes}
          onChange={setNotes}
          onEnter={() => void save(false)}
          placeholder="F.eks. Str. 42"
        />
      </label>

      {savedName && !errorMessage && (
        <p className="text-sm text-green-600 dark:text-green-400">«{savedName}» er lagret.</p>
      )}
      {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

      <div className="flex flex-wrap justify-end gap-3">
        <SecondaryButton label={savedName ? "Ferdig" : "Avbryt"} onClick={onClose} />
        {!item && (
          <SecondaryButton
            label="Lagre og ny"
            onClick={isSaving ? undefined : () => void save(true)}
          />
        )}
        <PrimaryButton
          label={isSaving ? "Lagrer..." : "Lagre"}
          onClick={isSaving ? undefined : () => void save(false)}
        />
      </div>
    </StorageModal>
  );
}
