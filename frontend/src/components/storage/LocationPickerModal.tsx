import SecondaryButton from "@/components/buttons/SecondaryButton";
import TextInput from "@/components/input/TextInput";
import { INBOX_ICON, KIND_ICONS, type StorageLocation } from "@/types/storage";
import { formatPath } from "@/utils/storageTree";
import { useState } from "react";
import LocationFormModal, { type LocationFormValues } from "./LocationFormModal";
import LocationTree, { NewChildButton } from "./LocationTree";
import StorageModal from "./StorageModal";

interface Props {
  title: string;
  locations: StorageLocation[];
  // Where the thing sits now; its branch starts expanded.
  currentId: number;
  disabledIds: Set<number>;
  // When given, each row can create a new place, and the move then goes there.
  onCreate?: (parent: StorageLocation, values: LocationFormValues) => Promise<StorageLocation>;
  onClose: () => void;
  onSubmit: (target: StorageLocation) => Promise<unknown>;
}

export default function LocationPickerModal({
  title,
  locations,
  currentId,
  disabledIds,
  onCreate,
  onClose,
  onSubmit,
}: Props) {
  const [filter, setFilter] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [createParent, setCreateParent] = useState<StorageLocation | null>(null);

  const current = locations.find((location) => location.id === currentId);
  // Includes the current place itself, so its own shelves and boxes are in view.
  const expandedIds = current?.path.map((entry) => entry.id) ?? [];
  const query = filter.trim().toLocaleLowerCase("nb");
  const matches = query
    ? locations.filter((location) => location.name.toLocaleLowerCase("nb").includes(query))
    : [];
  const handleCreateChild = onCreate && !isSaving ? setCreateParent : undefined;

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

  const handleCreate = async (parent: StorageLocation, values: LocationFormValues) => {
    if (!onCreate) return;
    // A failed create keeps the form open; a failed move after it shows here instead.
    const created = await onCreate(parent, values);
    setCreateParent(null);
    await handleSelect(created);
  };

  return (
    <StorageModal title={title}>
      <TextInput
        value={filter}
        onChange={setFilter}
        enterLabel="Ferdig"
        placeholder="Søk etter sted"
      />

      {onCreate && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Finnes ikke stedet ennå? Trykk + for å lage det og flytte hit.
        </p>
      )}

      {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

      {query ? (
        matches.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {matches.map((location) => {
              const isDisabled = disabledIds.has(location.id);
              const isCurrent = location.id === currentId;
              return (
                <li key={location.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={isDisabled || isCurrent}
                    onClick={() => void handleSelect(location)}
                    className={`flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-2 text-left ${
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
                  {handleCreateChild && !isDisabled && !location.is_inbox && (
                    <NewChildButton parent={location} onCreateChild={handleCreateChild} />
                  )}
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
          onCreateChild={handleCreateChild}
          disabledIds={disabledIds}
          currentId={currentId}
          initialExpandedIds={expandedIds}
        />
      )}

      <div className="flex justify-end gap-3">
        <SecondaryButton label={isSaving ? "Flytter..." : "Avbryt"} onClick={isSaving ? undefined : onClose} />
      </div>

      {createParent && (
        <LocationFormModal
          location={null}
          parent={createParent}
          locations={locations}
          submitLabel="Lagre og flytt hit"
          onClose={() => setCreateParent(null)}
          onSubmit={(values) => handleCreate(createParent, values)}
        />
      )}
    </StorageModal>
  );
}
