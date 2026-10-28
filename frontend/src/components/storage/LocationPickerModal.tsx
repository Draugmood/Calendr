import SecondaryButton from "@/components/buttons/SecondaryButton";
import TextInput from "@/components/input/TextInput";
import { INBOX_ICON, KIND_ICONS, type StorageLocation } from "@/types/storage";
import { formatPath } from "@/utils/storageTree";
import { useState } from "react";
import LocationTree from "./LocationTree";
import StorageModal from "./StorageModal";

interface Props {
  title: string;
  locations: StorageLocation[];
  // Where the thing sits now; its branch starts expanded.
  currentId: number;
  disabledIds: Set<number>;
  onClose: () => void;
  onSubmit: (target: StorageLocation) => Promise<unknown>;
}

export default function LocationPickerModal({
  title,
  locations,
  currentId,
  disabledIds,
  onClose,
  onSubmit,
}: Props) {
  const [filter, setFilter] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const current = locations.find((location) => location.id === currentId);
  const expandedIds = current?.path.slice(0, -1).map((entry) => entry.id) ?? [];
  const query = filter.trim().toLocaleLowerCase("nb");
  const matches = query
    ? locations.filter((location) => location.name.toLocaleLowerCase("nb").includes(query))
    : [];

  const handleSelect = async (target: StorageLocation) => {
    if (isSaving || disabledIds.has(target.id) || target.id === currentId) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await onSubmit(target);
      onClose();
    } catch {
      setErrorMessage("Kunne ikke flytte hit.");
      setIsSaving(false);
    }
  };

  return (
    <StorageModal title={title}>
      <TextInput
        value={filter}
        onChange={setFilter}
        enterLabel="Ferdig"
        placeholder="Søk etter sted"
      />

      {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

      {query ? (
        matches.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {matches.map((location) => {
              const isDisabled = disabledIds.has(location.id);
              const isCurrent = location.id === currentId;
              return (
                <li key={location.id}>
                  <button
                    type="button"
                    disabled={isDisabled || isCurrent}
                    onClick={() => void handleSelect(location)}
                    className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left ${
                      isDisabled
                        ? "opacity-40"
                        : "cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    <span className="material-symbols-outlined shrink-0 text-gray-500 dark:text-gray-400">
                      {location.is_inbox ? INBOX_ICON : KIND_ICONS[location.kind]}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className={`break-words ${isCurrent ? "font-semibold" : ""}`}>
                        {location.name}
                        {isCurrent && (
                          <span className="ml-2 text-xs font-normal text-cyan-700 dark:text-cyan-400">
                            Her nå
                          </span>
                        )}
                      </span>
                      {location.path.length > 1 && (
                        <span className="break-words text-sm text-gray-500 dark:text-gray-400">
                          {formatPath(location.path.slice(0, -1))}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="py-4 text-center text-gray-500 dark:text-gray-400">
            Fant ingen steder som heter «{filter.trim()}».
          </p>
        )
      ) : (
        <LocationTree
          locations={locations}
          onSelect={(target) => void handleSelect(target)}
          disabledIds={disabledIds}
          currentId={currentId}
          initialExpandedIds={expandedIds}
        />
      )}

      <div className="flex justify-end gap-3">
        <SecondaryButton label={isSaving ? "Flytter..." : "Avbryt"} onClick={isSaving ? undefined : onClose} />
      </div>
    </StorageModal>
  );
}
