import { INBOX_ICON, KIND_ICONS, KIND_LABELS, type StorageLocation } from "@/types/storage";
import { buildChildrenMap, type ChildrenMap } from "@/utils/storageTree";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

interface Props {
  locations: StorageLocation[];
  // Without it, rows link to the location's page.
  onSelect?: (location: StorageLocation) => void;
  // Adds a "new place here" button to every row that isn't disabled or the inbox.
  onCreateChild?: (parent: StorageLocation) => void;
  disabledIds?: Set<number>;
  currentId?: number;
  initialExpandedIds?: Iterable<number>;
  // sessionStorage key that keeps the expanded rows across visits in this tab.
  persistKey?: string;
}

function readExpandedIds(persistKey: string | undefined): number[] {
  if (!persistKey) return [];
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(persistKey) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "number") : [];
  } catch {
    return [];
  }
}

function writeExpandedIds(persistKey: string | undefined, ids: Set<number>) {
  if (!persistKey) return;
  try {
    window.sessionStorage.setItem(persistKey, JSON.stringify([...ids]));
  } catch {
    // Private mode or blocked storage: the tree just starts collapsed next time.
  }
}

interface RowProps {
  location: StorageLocation;
  depth: number;
  childrenMap: ChildrenMap;
  expandedIds: Set<number>;
  onToggle: (id: number) => void;
  onSelect?: (location: StorageLocation) => void;
  onCreateChild?: (parent: StorageLocation) => void;
  disabledIds?: Set<number>;
  currentId?: number;
}

function LocationTreeRow({
  location,
  depth,
  childrenMap,
  expandedIds,
  onToggle,
  onSelect,
  onCreateChild,
  disabledIds,
  currentId,
}: RowProps) {
  const children = childrenMap.get(location.id) ?? [];
  const isExpanded = expandedIds.has(location.id);
  const isDisabled = disabledIds?.has(location.id) ?? false;
  const isCurrent = location.id === currentId;
  // Picking where something already is would be a no-op.
  const isSelectable = !isDisabled && !isCurrent;

  const content = (
    <>
      <span className="material-symbols-outlined shrink-0 text-gray-500 dark:text-gray-400">
        {location.is_inbox ? INBOX_ICON : KIND_ICONS[location.kind]}
      </span>
      <span className="min-w-0 flex-1 truncate">{location.name}</span>
      {isCurrent && (
        <span className="shrink-0 text-xs text-cyan-700 dark:text-cyan-400">Her nå</span>
      )}
      {location.total_item_count > 0 && (
        <span
          className="shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-xs dark:bg-zinc-700"
          title={`${location.total_item_count} ting`}
        >
          {location.total_item_count}
        </span>
      )}
    </>
  );
  const rowClass = `flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded px-2 text-left ${
    isDisabled ? "opacity-40" : ""
  } ${isSelectable ? "cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700" : ""} ${
    isCurrent ? "font-semibold" : ""
  }`;

  return (
    <li>
      <div className="flex items-center gap-1" style={{ paddingLeft: `${depth}rem` }}>
        {children.length > 0 ? (
          <button
            type="button"
            onClick={() => onToggle(location.id)}
            className="flex h-11 w-9 shrink-0 items-center justify-center rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700"
            aria-label={isExpanded ? `Skjul innhold i ${location.name}` : `Vis innhold i ${location.name}`}
            aria-expanded={isExpanded}
          >
            <span className="material-symbols-outlined">
              {isExpanded ? "expand_more" : "chevron_right"}
            </span>
          </button>
        ) : (
          <span className="w-9 shrink-0" />
        )}
        {onSelect ? (
          <button
            type="button"
            disabled={!isSelectable}
            onClick={() => onSelect(location)}
            className={rowClass}
            title={KIND_LABELS[location.kind]}
          >
            {content}
          </button>
        ) : (
          <Link to={`/b/${location.id}`} className={rowClass} title={KIND_LABELS[location.kind]}>
            {content}
          </Link>
        )}
        {onCreateChild && !isDisabled && !location.is_inbox && (
          <NewChildButton parent={location} onCreateChild={onCreateChild} />
        )}
      </div>
      {isExpanded && children.length > 0 && (
        <ul>
          {children.map((child) => (
            <LocationTreeRow
              key={child.id}
              location={child}
              depth={depth + 1}
              childrenMap={childrenMap}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
              onCreateChild={onCreateChild}
              disabledIds={disabledIds}
              currentId={currentId}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function NewChildButton({
  parent,
  onCreateChild,
}: {
  parent: StorageLocation;
  onCreateChild: (parent: StorageLocation) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onCreateChild(parent)}
      className="flex h-11 w-10 shrink-0 items-center justify-center rounded text-gray-500 cursor-pointer hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-zinc-700"
      aria-label={`Nytt sted i ${parent.name}`}
      title={`Nytt sted i ${parent.name}`}
    >
      <span className="material-symbols-outlined">add</span>
    </button>
  );
}

export default function LocationTree({
  locations,
  onSelect,
  onCreateChild,
  disabledIds,
  currentId,
  initialExpandedIds,
  persistKey,
}: Props) {
  const childrenMap = useMemo(() => buildChildrenMap(locations), [locations]);
  const [expandedIds, setExpandedIds] = useState(
    () => new Set([...readExpandedIds(persistKey), ...(initialExpandedIds ?? [])]),
  );

  const handleToggle = (id: number) => {
    const next = new Set(expandedIds);
    if (!next.delete(id)) next.add(id);
    setExpandedIds(next);
    writeExpandedIds(persistKey, next);
  };

  return (
    <ul className="flex flex-col">
      {(childrenMap.get(null) ?? []).map((location) => (
        <LocationTreeRow
          key={location.id}
          location={location}
          depth={0}
          childrenMap={childrenMap}
          expandedIds={expandedIds}
          onToggle={handleToggle}
          onSelect={onSelect}
          onCreateChild={onCreateChild}
          disabledIds={disabledIds}
          currentId={currentId}
        />
      ))}
    </ul>
  );
}
