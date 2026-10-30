import TextInput from "@/components/input/TextInput";
import { createLocation, useStorageLocations, useStorageSearch } from "@/hooks/useStorage";
import {
  INBOX_ICON,
  KIND_ICONS,
  type StorageLocation,
  type StorageSearchItem,
} from "@/types/storage";
import { formatPath } from "@/utils/storageTree";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import LocationFormModal from "./LocationFormModal";
import LocationTree from "./LocationTree";

const TREE_EXPANDED_KEY = "storage-tree-expanded";

function LocationHit({ location }: { location: StorageLocation }) {
  return (
    <li>
      <Link
        to={`/b/${location.id}`}
        className="flex items-center gap-3 rounded-lg border border-gray-600 px-3 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700"
      >
        <span className="material-symbols-outlined shrink-0 text-gray-500 dark:text-gray-400">
          {location.is_inbox ? INBOX_ICON : KIND_ICONS[location.kind]}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="break-words font-semibold">{location.name}</span>
          {location.path.length > 1 && (
            <span className="break-words text-sm text-gray-500 dark:text-gray-400">
              {formatPath(location.path.slice(0, -1))}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

function ItemHit({ item }: { item: StorageSearchItem }) {
  return (
    <li>
      <Link
        to={`/b/${item.location_id}?item=${item.id}`}
        className="flex flex-col gap-0.5 rounded-lg border border-gray-600 px-3 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700"
      >
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="min-w-0 break-words font-semibold">{item.name}</span>
          {item.category && (
            <span className="shrink-0 rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-zinc-700 dark:text-gray-300">
              {item.category}
            </span>
          )}
        </span>
        <span className="break-words text-sm text-gray-500 dark:text-gray-400">
          {formatPath(item.path)}
        </span>
      </Link>
    </li>
  );
}

function SearchResults({ query }: { query: string }) {
  const { result, isSearching, hasError } = useStorageSearch(query);
  const hitCount = result.locations.length + result.items.length;

  if (hasError) {
    return <p className="py-8 text-center text-red-500">Kunne ikke søke.</p>;
  }
  if (hitCount === 0) {
    return (
      <p className="py-8 text-center text-gray-500 dark:text-gray-400">
        {isSearching ? "Søker..." : `Fant ingenting for «${query.trim()}».`}
      </p>
    );
  }

  return (
    <div className={`flex flex-col gap-4 ${isSearching ? "opacity-60" : ""}`}>
      {result.locations.length > 0 && (
        <div>
          <h2 className="mb-2 text-lg font-semibold">Steder</h2>
          <ul className="flex flex-col gap-2">
            {result.locations.map((location) => (
              <LocationHit key={location.id} location={location} />
            ))}
          </ul>
        </div>
      )}
      {result.items.length > 0 && (
        <div>
          <h2 className="mb-2 text-lg font-semibold">Ting</h2>
          <ul className="flex flex-col gap-2">
            {result.items.map((item) => (
              <ItemHit key={item.id} item={item} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function StoragePage() {
  const { locations, isLoading, errorMessage, refresh } = useStorageLocations();
  const [searchParams, setSearchParams] = useSearchParams();
  // Local state drives the field; the URL copy brings the search back on "back".
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [isCreatingFloor, setIsCreatingFloor] = useState(false);

  const inbox = locations.find((location) => location.is_inbox);

  const handleQueryChange = (next: string) => {
    setQuery(next);
    setSearchParams(next.trim() ? { q: next } : {}, { replace: true });
  };

  return (
    <section className="w-full mt-2 md:mt-6 flex justify-center">
      <div className="w-full max-w-3xl border border-gray-600 rounded-lg p-3 md:p-4 text-left bg-white dark:bg-gray-800">
        <div className="mb-4 flex items-center gap-2">
          <Link
            to="/"
            className="flex items-center rounded p-1 hover:bg-gray-200 dark:hover:bg-zinc-700"
            aria-label="Tilbake"
            title="Tilbake"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="text-2xl font-bold">Oppbevaring</h1>
        </div>

        <div className="relative mb-4">
          <TextInput
            className="w-full pr-10!"
            value={query}
            onChange={handleQueryChange}
            enterLabel="Ferdig"
            placeholder="Hvor ligger ...?"
          />
          {query && (
            <button
              type="button"
              onClick={() => handleQueryChange("")}
              className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center rounded p-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700"
              aria-label="Tøm søket"
              title="Tøm søket"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>

        {query.trim() ? (
          <SearchResults query={query} />
        ) : (
          <>
            {inbox && inbox.total_item_count > 0 && (
              <Link
                to={`/b/${inbox.id}`}
                className="mb-4 flex items-center gap-3 rounded-lg border border-amber-500 bg-amber-50 p-3 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/70"
              >
                <span className="material-symbols-outlined shrink-0">{INBOX_ICON}</span>
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{inbox.name}</span>
                  {" – "}
                  {inbox.total_item_count} ting uten fast plass
                </span>
                <span className="material-symbols-outlined shrink-0">chevron_right</span>
              </Link>
            )}

            {isLoading && <p className="py-8 text-center">Henter steder...</p>}
            {!isLoading && errorMessage && (
              <p className="py-8 text-center text-red-500">Kunne ikke hente steder.</p>
            )}
            {!isLoading && !errorMessage && (
              <>
                <LocationTree locations={locations} persistKey={TREE_EXPANDED_KEY} />
                <button
                  type="button"
                  onClick={() => setIsCreatingFloor(true)}
                  className="mt-3 flex items-center gap-1 rounded px-2 py-1.5 text-sm text-gray-500 cursor-pointer hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-zinc-700"
                >
                  <span className="material-symbols-outlined">add</span>
                  Ny etasje
                </button>
              </>
            )}
          </>
        )}
      </div>

      {isCreatingFloor && (
        <LocationFormModal
          location={null}
          parent={null}
          locations={locations}
          onClose={() => setIsCreatingFloor(false)}
          onSubmit={async (values) => {
            await createLocation({
              name: values.name,
              kind: values.kind,
              parent_id: null,
              notes: values.notes || null,
            });
            await refresh();
          }}
        />
      )}
    </section>
  );
}
