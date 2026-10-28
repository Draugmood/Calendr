import {
  KIND_RANK,
  LOCATION_KINDS,
  type LocationKind,
  type PathEntry,
  type StorageLocation,
} from "@/types/storage";

export type ChildrenMap = Map<number | null, StorageLocation[]>;

/**
 * Children per parent id, keeping the API's order. Top level (key `null`) has the
 * inbox last, whatever its sort order.
 */
export function buildChildrenMap(locations: StorageLocation[]): ChildrenMap {
  const map: ChildrenMap = new Map();
  for (const location of locations) {
    const siblings = map.get(location.parent_id) ?? [];
    siblings.push(location);
    map.set(location.parent_id, siblings);
  }
  const topLevel = map.get(null);
  if (topLevel) {
    map.set(null, [
      ...topLevel.filter((location) => !location.is_inbox),
      ...topLevel.filter((location) => location.is_inbox),
    ]);
  }
  return map;
}

/** The location itself and everything below it. */
export function getDescendantIds(childrenMap: ChildrenMap, locationId: number): Set<number> {
  const ids = new Set<number>();
  const stack = [locationId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (ids.has(id)) continue;
    ids.add(id);
    for (const child of childrenMap.get(id) ?? []) stack.push(child.id);
  }
  return ids;
}

/** Kinds that may sit directly inside `parent`; only floors go at the top level. */
export function allowedChildKinds(parent: StorageLocation | null): LocationKind[] {
  if (!parent) return ["floor"];
  return LOCATION_KINDS.filter(
    (kind) => kind !== "floor" && KIND_RANK[kind] >= KIND_RANK[parent.kind],
  );
}

/** The kind one step further in (a room gets furniture), or a box inside a box. */
export function defaultChildKind(parent: StorageLocation | null): LocationKind {
  const allowed = allowedChildKinds(parent);
  return allowed.find((kind) => parent && KIND_RANK[kind] > KIND_RANK[parent.kind]) ??
    allowed[allowed.length - 1];
}

/** Whether a location of `kind` may be placed directly inside `target`. */
export function canContain(target: StorageLocation, kind: LocationKind): boolean {
  return kind !== "floor" && KIND_RANK[target.kind] <= KIND_RANK[kind];
}

export function formatPath(path: PathEntry[]): string {
  return path.map((entry) => entry.name).join(" › ");
}

function nextNumber(names: string[], prefix: string): number {
  const pattern = new RegExp(`^${prefix}\\s+(\\d+)$`, "i");
  const numbers = names
    .map((name) => pattern.exec(name.trim())?.[1])
    .filter((match): match is string => match !== undefined)
    .map(Number);
  return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
}

/**
 * A starting name for a new location. Boxes are numbered across the whole house
 * (their label shows only the name, and boxes move); shelves within their parent.
 */
export function suggestName(
  kind: LocationKind,
  parent: StorageLocation | null,
  locations: StorageLocation[],
): string {
  if (kind === "box") {
    const boxNames = locations
      .filter((location) => location.kind === "box")
      .map((location) => location.name);
    return `Boks ${nextNumber(boxNames, "Boks")}`;
  }
  if (kind === "shelf" && parent) {
    const shelfNames = locations
      .filter((location) => location.kind === "shelf" && location.parent_id === parent.id)
      .map((location) => location.name);
    return `Hylle ${nextNumber(shelfNames, "Hylle")}`;
  }
  return "";
}
