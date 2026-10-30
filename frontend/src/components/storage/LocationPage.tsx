import {
  StorageApiError,
  createItem,
  createLocation,
  deleteItem,
  deleteItems,
  deleteLocation,
  moveItems,
  updateItem,
  updateLocation,
  useStorageLocation,
  useStorageLocations,
} from "@/hooks/useStorage";
import {
  INBOX_ICON,
  KIND_ICONS,
  KIND_LABELS,
  type LocationNotEmptyDetail,
  type StorageItem,
  type StorageLocation,
} from "@/types/storage";
import { buildChildrenMap, canContain, formatPath, getDescendantIds } from "@/utils/storageTree";
import { type ReactNode, type Ref, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import OverflowMenu, { type OverflowMenuItem } from "@/components/buttons/OverflowMenu";
import ItemFormModal, { type ItemFormValues } from "./ItemFormModal";
import LocationFormModal, { type LocationFormValues } from "./LocationFormModal";
import LocationPickerModal from "./LocationPickerModal";

const ACTION_BUTTON_CLASS =
  "flex items-center gap-1 rounded-lg border border-gray-400 dark:border-gray-600 px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700 disabled:cursor-default disabled:opacity-50";
const ICON_BUTTON_CLASS = "rounded p-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700";

type FormState =
  | { mode: "closed" }
  | { mode: "createItem" }
  | { mode: "editItem"; item: StorageItem }
  | { mode: "moveItem"; item: StorageItem }
  | { mode: "moveSelected"; itemIds: number[] }
  | { mode: "createLocation" }
  | { mode: "editLocation" }
  | { mode: "moveLocation" };

interface Notice {
  text: string;
  linkTo?: string;
}

function isNotEmptyDetail(detail: unknown): detail is LocationNotEmptyDetail {
  return (
    typeof detail === "object" &&
    detail !== null &&
    "child_count" in detail &&
    "item_count" in detail
  );
}

function describeDeleteError(error: unknown): string {
  if (error instanceof StorageApiError && error.status === 409) {
    if (!isNotEmptyDetail(error.detail)) return "Innboksen kan ikke slettes.";
    const { child_count: childCount, item_count: itemCount } = error.detail;
    const parts = [];
    if (childCount > 0) parts.push(`${childCount} ${childCount === 1 ? "sted" : "steder"}`);
    if (itemCount > 0) parts.push(`${itemCount} ting`);
    return `Kan ikke slette: her ligger ${parts.join(" og ")}. Flytt eller slett dem først.`;
  }
  return "Kunne ikke slette stedet.";
}

function PageFrame({ children }: { children: ReactNode }) {
  return (
    <section className="w-full mt-2 md:mt-6 flex justify-center">
      <div className="w-full max-w-3xl border border-gray-600 rounded-lg p-3 md:p-4 text-left bg-white dark:bg-gray-800">
        {children}
      </div>
    </section>
  );
}

function LocationNotFound() {
  return (
    <PageFrame>
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <span className="material-symbols-outlined text-5xl! text-gray-400">help</span>
        <p className="text-lg">Fant ikke dette stedet.</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Det kan ha blitt slettet, eller lenken er feil.
        </p>
        <Link
          to="/storage"
          className="mt-2 rounded-lg bg-cyan-600 px-4 py-2 font-medium text-stone-950 hover:bg-cyan-500"
        >
          Til Oppbevaring
        </Link>
      </div>
    </PageFrame>
  );
}

function ItemDetails({ item }: { item: StorageItem }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="min-w-0 break-words text-lg font-semibold">{item.name}</span>
        {item.category && (
          <span className="shrink-0 rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-zinc-700 dark:text-gray-300">
            {item.category}
          </span>
        )}
      </span>
      {item.notes && (
        <span className="break-words text-sm text-gray-500 dark:text-gray-400">
          {item.notes}
        </span>
      )}
    </span>
  );
}

interface ItemRowProps {
  item: StorageItem;
  isHighlighted: boolean;
  rowRef?: Ref<HTMLLIElement>;
  onEdit: () => void;
  onMove: () => void;
  onDelete: () => void;
}

function ItemRow({ item, isHighlighted, rowRef, onEdit, onMove, onDelete }: ItemRowProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  return (
    <li
      ref={rowRef}
      className={`flex items-center gap-3 rounded-lg border p-3 ${
        isHighlighted
          ? "border-cyan-600 bg-cyan-50 dark:bg-cyan-950/40"
          : "border-gray-600"
      }`}
    >
      <ItemDetails item={item} />

      <div className="flex shrink-0 items-center gap-1">
        {isConfirmingDelete ? (
          <>
            <button
              type="button"
              onClick={onDelete}
              className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white cursor-pointer hover:bg-red-500"
            >
              Slett
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(false)}
              className="rounded px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700"
            >
              Avbryt
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onEdit} className={ICON_BUTTON_CLASS} aria-label="Rediger" title="Rediger">
              <span className="material-symbols-outlined">edit</span>
            </button>
            <button type="button" onClick={onMove} className={ICON_BUTTON_CLASS} aria-label="Flytt" title="Flytt">
              <span className="material-symbols-outlined">drive_file_move</span>
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              className={ICON_BUTTON_CLASS}
              aria-label="Slett"
              title="Slett"
            >
              <span className="material-symbols-outlined">delete</span>
            </button>
          </>
        )}
      </div>
    </li>
  );
}

interface SelectableItemRowProps {
  item: StorageItem;
  isSelected: boolean;
  onToggle: () => void;
}

function SelectableItemRow({ item, isSelected, onToggle }: SelectableItemRowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={isSelected}
        className={`flex w-full items-center gap-1 rounded-lg border p-3 text-left cursor-pointer ${
          isSelected
            ? "border-cyan-600 bg-cyan-50 dark:bg-cyan-950/40"
            : "border-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-700"
        }`}
      >
        {/* Wrapped like the row's icon buttons, so rows keep their height in select mode. */}
        <span className="shrink-0 p-2 -ml-2">
          <span
            className={`material-symbols-outlined ${
              isSelected ? "text-cyan-600" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {isSelected ? "check_box" : "check_box_outline_blank"}
          </span>
        </span>
        <ItemDetails item={item} />
      </button>
    </li>
  );
}

function ChildRow({ child }: { child: StorageLocation }) {
  return (
    <li>
      <Link
        to={`/b/${child.id}`}
        className="flex min-h-12 items-center gap-3 rounded-lg border border-gray-600 px-3 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700"
      >
        <span className="material-symbols-outlined shrink-0 text-gray-500 dark:text-gray-400">
          {KIND_ICONS[child.kind]}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="break-words font-semibold">{child.name}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {KIND_LABELS[child.kind]}
            {child.total_item_count > 0 && ` · ${child.total_item_count} ting`}
          </span>
        </span>
        <span className="material-symbols-outlined shrink-0">chevron_right</span>
      </Link>
    </li>
  );
}

function LocationPage({ locationId }: { locationId: number }) {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const [searchParams] = useSearchParams();
  const highlightedItemId = Number(searchParams.get("item"));
  const { location, isLoading, isNotFound, errorMessage, refresh } =
    useStorageLocation(locationId);
  const {
    locations,
    isLoading: isLoadingLocations,
    refresh: refreshLocations,
  } = useStorageLocations();
  const [formState, setFormState] = useState<FormState>({ mode: "closed" });
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  // null when not selecting; otherwise the ticked item ids.
  const [selectedIds, setSelectedIds] = useState<Set<number> | null>(null);
  const [isConfirmingBulkDelete, setIsConfirmingBulkDelete] = useState(false);
  const highlightedRowRef = useRef<HTMLLIElement>(null);

  const childrenMap = useMemo(() => buildChildrenMap(locations), [locations]);

  // Scroll a thing opened from search into view once the page has loaded.
  const hasLoaded = location !== null;
  useEffect(() => {
    if (hasLoaded) highlightedRowRef.current?.scrollIntoView({ block: "center" });
  }, [hasLoaded]);

  if (isNotFound) return <LocationNotFound />;
  if (!location) {
    return (
      <PageFrame>
        {isLoading && <p className="py-8 text-center">Henter stedet...</p>}
        {!isLoading && errorMessage && (
          <p className="py-8 text-center text-red-500">Kunne ikke hente stedet.</p>
        )}
      </PageFrame>
    );
  }

  const parentId = location.parent_id;
  const ancestors = location.path.slice(0, -1);
  const canMove = location.kind !== "floor" && !location.is_inbox;
  const isSelecting = selectedIds !== null;
  // Only ids still on this page, in case a refresh removed some.
  const selectedItemIds = location.items
    .filter((item) => selectedIds?.has(item.id))
    .map((item) => item.id);
  const isAllSelected = selectedItemIds.length === location.items.length;

  const refreshAll = async () => {
    await Promise.all([refresh(), refreshLocations()]);
  };

  const runAction = async (action: () => Promise<unknown>, failureText: string) => {
    try {
      setActionError(null);
      setNotice(null);
      await action();
      return true;
    } catch {
      setActionError(failureText);
      return false;
    }
  };

  const handleBack = () => {
    // A QR scan opens this page with no history inside the app.
    if (routerLocation.key !== "default") navigate(-1);
    else navigate("/storage");
  };

  const handleDeleteLocation = async () => {
    setIsConfirmingDelete(false);
    setNotice(null);
    try {
      setActionError(null);
      await deleteLocation(location.id);
      navigate(parentId === null ? "/storage" : `/b/${parentId}`, { replace: true });
    } catch (error: unknown) {
      setActionError(describeDeleteError(error));
    }
  };

  const handleSubmitItem = async (values: ItemFormValues) => {
    if (formState.mode === "editItem") {
      // Empty strings clear category and notes on update.
      await updateItem(formState.item.id, values);
    } else {
      await createItem({
        name: values.name,
        location_id: location.id,
        category: values.category || null,
        notes: values.notes || null,
      });
    }
    await refreshAll();
  };

  const handleSubmitLocation = async (values: LocationFormValues) => {
    if (formState.mode === "editLocation") {
      await updateLocation(location.id, { name: values.name, notes: values.notes });
    } else {
      await createLocation({
        name: values.name,
        kind: values.kind,
        parent_id: location.id,
        notes: values.notes || null,
      });
    }
    await refreshAll();
  };

  const handleMoveItem = async (item: StorageItem, target: StorageLocation) => {
    await updateItem(item.id, { location_id: target.id });
    setNotice({
      text: `«${item.name}» er flyttet til ${formatPath(target.path)}.`,
      linkTo: `/b/${target.id}?item=${item.id}`,
    });
    await refreshAll();
  };

  const handleMoveLocation = async (target: StorageLocation) => {
    await updateLocation(location.id, { parent_id: target.id });
    setNotice({ text: `«${location.name}» er flyttet til ${formatPath(target.path)}.` });
    await refreshAll();
  };

  const startSelecting = () => {
    setNotice(null);
    setActionError(null);
    setSelectedIds(new Set());
  };

  const stopSelecting = () => {
    setSelectedIds(null);
    setIsConfirmingBulkDelete(false);
  };

  const toggleSelected = (itemId: number) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (!next.delete(itemId)) next.add(itemId);
      return next;
    });
  };

  const toggleAllSelected = () => {
    setSelectedIds(new Set(isAllSelected ? [] : location.items.map((item) => item.id)));
  };

  const handleMoveSelected = async (itemIds: number[], target: StorageLocation) => {
    await moveItems(itemIds, target.id);
    setNotice({
      text: `${itemIds.length} ting er flyttet til ${formatPath(target.path)}.`,
      linkTo: `/b/${target.id}`,
    });
    stopSelecting();
    await refreshAll();
  };

  const handleDeleteSelected = async () => {
    const itemIds = selectedItemIds;
    setIsConfirmingBulkDelete(false);
    const isDeleted = await runAction(async () => {
      await deleteItems(itemIds);
      await refreshAll();
    }, "Kunne ikke slette tingene.");
    if (isDeleted) {
      stopSelecting();
      setNotice({ text: `${itemIds.length} ting er slettet.` });
    }
  };

  // A place made from the move picker; the picker then moves the things into it.
  const handleCreatePlace = async (parent: StorageLocation, values: LocationFormValues) => {
    const created = await createLocation({
      name: values.name,
      kind: values.kind,
      parent_id: parent.id,
      notes: values.notes || null,
    });
    await refreshLocations();
    return created;
  };

  const placeMenuItems: OverflowMenuItem[] = [
    { label: "Endre", icon: "edit", onSelect: () => setFormState({ mode: "editLocation" }) },
  ];
  if (canMove) {
    placeMenuItems.push({
      label: "Flytt",
      icon: "drive_file_move",
      disabled: isLoadingLocations,
      onSelect: () => setFormState({ mode: "moveLocation" }),
    });
  }
  if (!location.is_inbox) {
    placeMenuItems.push({
      label: "Slett",
      icon: "delete",
      isDanger: true,
      onSelect: () => setIsConfirmingDelete(true),
    });
  }

  const locationMoveDisabledIds = () => {
    const disabled = getDescendantIds(childrenMap, location.id);
    for (const candidate of locations) {
      if (!canContain(candidate, location.kind)) disabled.add(candidate.id);
    }
    return disabled;
  };

  return (
    <PageFrame>
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center rounded p-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700"
            aria-label="Tilbake"
            title="Tilbake"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex min-w-0 flex-1 flex-col">
            <nav className="flex flex-wrap items-center gap-x-1 text-sm text-gray-500 dark:text-gray-400" aria-label="Sti">
              <Link to="/storage" className="hover:underline">
                Oppbevaring
              </Link>
              {ancestors.map((entry) => (
                <span key={entry.id} className="flex items-center gap-x-1">
                  <span aria-hidden="true">›</span>
                  <Link to={`/b/${entry.id}`} className="break-words hover:underline">
                    {entry.name}
                  </Link>
                </span>
              ))}
            </nav>
            <h1 className="flex items-center gap-2 break-words text-2xl font-bold">
              <span className="material-symbols-outlined shrink-0 text-gray-500 dark:text-gray-400">
                {location.is_inbox ? INBOX_ICON : KIND_ICONS[location.kind]}
              </span>
              <span className="min-w-0 break-words">{location.name}</span>
            </h1>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {location.is_inbox ? "Ting som ikke har fast plass ennå" : KIND_LABELS[location.kind]}
            </span>
          </div>
        </div>

        {location.notes && (
          <p className="break-words rounded bg-gray-100 px-3 py-2 text-sm dark:bg-zinc-900">
            {location.notes}
          </p>
        )}

        {isConfirmingDelete ? (
          <div className="flex flex-wrap items-center gap-2">
            <span>Slette «{location.name}»?</span>
            <button
              type="button"
              onClick={() => void handleDeleteLocation()}
              className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white cursor-pointer hover:bg-red-500"
            >
              Slett
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(false)}
              className="rounded px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700"
            >
              Avbryt
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFormState({ mode: "createItem" })}
              className="flex items-center gap-1 rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-medium text-stone-950 cursor-pointer hover:bg-cyan-500"
            >
              <span className="material-symbols-outlined">add</span>
              Ting
            </button>
            {!location.is_inbox && (
              <button
                type="button"
                disabled={isLoadingLocations}
                onClick={() => setFormState({ mode: "createLocation" })}
                className={ACTION_BUTTON_CLASS}
              >
                <span className="material-symbols-outlined">add</span>
                Sted
              </button>
            )}
            {/* The place's own actions are needed less often, so they share a menu and
                the row fits on one line on a phone. */}
            <div className="ml-auto">
              <OverflowMenu
                label={`Flere valg for «${location.name}»`}
                triggerClassName={ACTION_BUTTON_CLASS}
                items={placeMenuItems}
              />
            </div>
          </div>
        )}

        {actionError && <p className="text-sm text-red-500">{actionError}</p>}
        {notice && (
          <p className="text-sm text-green-600 dark:text-green-400">
            {notice.text}{" "}
            {notice.linkTo && (
              <Link to={notice.linkTo} className="font-medium underline">
                Gå dit
              </Link>
            )}
          </p>
        )}
      </div>

      {location.children.length > 0 && (
        <div className="mb-4">
          <h2 className="mb-2 text-lg font-semibold">Steder her</h2>
          <ul className="flex flex-col gap-2">
            {location.children.map((child) => (
              <ChildRow key={child.id} child={child} />
            ))}
          </ul>
        </div>
      )}

      {location.items.length > 0 && (
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="flex-1 text-lg font-semibold">Ting her</h2>
            {isSelecting ? (
              <>
                <button
                  type="button"
                  onClick={toggleAllSelected}
                  className="rounded px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700"
                >
                  {isAllSelected ? "Fjern alle" : "Velg alle"}
                </button>
                <button
                  type="button"
                  onClick={stopSelecting}
                  className="rounded px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700"
                >
                  Avbryt
                </button>
              </>
            ) : (
              location.items.length > 1 && (
                <button type="button" onClick={startSelecting} className={ACTION_BUTTON_CLASS}>
                  <span className="material-symbols-outlined">checklist</span>
                  Velg
                </button>
              )
            )}
          </div>
          <ul className="flex flex-col gap-2">
            {location.items.map((item) =>
              isSelecting ? (
                <SelectableItemRow
                  key={item.id}
                  item={item}
                  isSelected={selectedIds.has(item.id)}
                  onToggle={() => toggleSelected(item.id)}
                />
              ) : (
                <ItemRow
                  key={item.id}
                  item={item}
                  isHighlighted={item.id === highlightedItemId}
                  rowRef={item.id === highlightedItemId ? highlightedRowRef : undefined}
                  onEdit={() => setFormState({ mode: "editItem", item })}
                  onMove={() => setFormState({ mode: "moveItem", item })}
                  onDelete={() =>
                    void runAction(async () => {
                      await deleteItem(item.id);
                      await refreshAll();
                    }, "Kunne ikke slette tingen.")
                  }
                />
              ),
            )}
          </ul>

          {/* z-40 keeps the bar above the seasonal decorations (z-30) in the corners. */}
          {isSelecting && (
            <div className="sticky bottom-2 z-40 mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-cyan-600 bg-white p-2 shadow-lg dark:bg-gray-800">
              {isConfirmingBulkDelete ? (
                <>
                  <span className="flex-1 px-1">Slette {selectedItemIds.length} ting?</span>
                  <button
                    type="button"
                    onClick={() => void handleDeleteSelected()}
                    className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white cursor-pointer hover:bg-red-500"
                  >
                    Slett
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingBulkDelete(false)}
                    className="rounded px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700"
                  >
                    Avbryt
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 px-1 text-sm font-medium">
                    {selectedItemIds.length} valgt
                  </span>
                  <button
                    type="button"
                    disabled={selectedItemIds.length === 0 || isLoadingLocations}
                    onClick={() => setFormState({ mode: "moveSelected", itemIds: selectedItemIds })}
                    className={ACTION_BUTTON_CLASS}
                  >
                    <span className="material-symbols-outlined">drive_file_move</span>
                    Flytt
                  </button>
                  <button
                    type="button"
                    disabled={selectedItemIds.length === 0}
                    onClick={() => setIsConfirmingBulkDelete(true)}
                    className={ACTION_BUTTON_CLASS}
                  >
                    <span className="material-symbols-outlined">delete</span>
                    Slett
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {location.children.length === 0 && location.items.length === 0 && (
        <p className="py-8 text-center text-gray-500 dark:text-gray-400">Ingenting her ennå.</p>
      )}

      {(formState.mode === "createItem" || formState.mode === "editItem") && (
        <ItemFormModal
          item={formState.mode === "editItem" ? formState.item : null}
          locationName={location.name}
          onClose={() => setFormState({ mode: "closed" })}
          onSubmit={handleSubmitItem}
        />
      )}

      {(formState.mode === "createLocation" || formState.mode === "editLocation") && (
        <LocationFormModal
          location={formState.mode === "editLocation" ? location : null}
          parent={location}
          locations={locations}
          onClose={() => setFormState({ mode: "closed" })}
          onSubmit={handleSubmitLocation}
        />
      )}

      {formState.mode === "moveItem" && (
        <LocationPickerModal
          title={`Flytt «${formState.item.name}»`}
          locations={locations}
          currentId={formState.item.location_id}
          disabledIds={new Set()}
          onCreate={handleCreatePlace}
          onClose={() => setFormState({ mode: "closed" })}
          onSubmit={(target) => handleMoveItem(formState.item, target)}
        />
      )}

      {formState.mode === "moveSelected" && (
        <LocationPickerModal
          title={`Flytt ${formState.itemIds.length} ting`}
          locations={locations}
          currentId={location.id}
          disabledIds={new Set()}
          onCreate={handleCreatePlace}
          onClose={() => setFormState({ mode: "closed" })}
          onSubmit={(target) => handleMoveSelected(formState.itemIds, target)}
        />
      )}

      {formState.mode === "moveLocation" && parentId !== null && (
        <LocationPickerModal
          title={`Flytt «${location.name}»`}
          locations={locations}
          currentId={parentId}
          disabledIds={locationMoveDisabledIds()}
          onClose={() => setFormState({ mode: "closed" })}
          onSubmit={handleMoveLocation}
        />
      )}
    </PageFrame>
  );
}

/** `/b/:id`, the page a QR label opens. */
export default function LocationRoute() {
  const { id } = useParams();
  const locationId = /^\d+$/.test(id ?? "") ? Number(id) : null;
  if (!locationId) return <LocationNotFound />;
  // Keyed so moving between locations starts with fresh state and closed forms.
  return <LocationPage key={locationId} locationId={locationId} />;
}
