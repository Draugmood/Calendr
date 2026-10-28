export type LocationKind = "floor" | "room" | "furniture" | "shelf" | "box";

// Outermost first. A location may only sit inside a kind at or above its own rank.
export const LOCATION_KINDS: LocationKind[] = ["floor", "room", "furniture", "shelf", "box"];

export const KIND_RANK: Record<LocationKind, number> = {
  floor: 0,
  room: 1,
  furniture: 2,
  shelf: 3,
  box: 4,
};

export const KIND_LABELS: Record<LocationKind, string> = {
  floor: "Etasje",
  room: "Rom",
  furniture: "Møbel",
  shelf: "Hylle/skuff",
  box: "Boks",
};

// Material Symbols names.
export const KIND_ICONS: Record<LocationKind, string> = {
  floor: "stairs",
  room: "door_front",
  furniture: "shelves",
  shelf: "table_rows",
  box: "package_2",
};

export const INBOX_ICON = "inbox";

export interface PathEntry {
  id: number;
  name: string;
}

export interface StorageLocation {
  id: number;
  name: string;
  kind: LocationKind;
  parent_id: number | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  is_inbox: boolean;
  item_count: number;
  child_count: number;
  total_item_count: number;
  // From the floor down to and including the location itself.
  path: PathEntry[];
}

export interface StorageItem {
  id: number;
  name: string;
  category: string | null;
  location_id: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StorageLocationDetail extends StorageLocation {
  children: StorageLocation[];
  items: StorageItem[];
}

export interface StorageSearchItem extends StorageItem {
  path: PathEntry[];
}

export interface StorageSearchResult {
  locations: StorageLocation[];
  items: StorageSearchItem[];
}

export interface LocationCreatePayload {
  name: string;
  kind: LocationKind;
  parent_id: number | null;
  notes?: string | null;
}

export interface LocationUpdatePayload {
  name?: string;
  notes?: string;
  parent_id?: number;
}

export interface ItemCreatePayload {
  name: string;
  location_id: number;
  category?: string | null;
  notes?: string | null;
}

// An empty string clears category or notes; a missing field leaves it unchanged.
export interface ItemUpdatePayload {
  name?: string;
  location_id?: number;
  category?: string;
  notes?: string;
}

export interface LocationNotEmptyDetail {
  message: string;
  child_count: number;
  item_count: number;
}
