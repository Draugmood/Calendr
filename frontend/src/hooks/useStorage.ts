import type {
  ItemCreatePayload,
  ItemUpdatePayload,
  LocationCreatePayload,
  LocationUpdatePayload,
  StorageItem,
  StorageLocation,
  StorageLocationDetail,
  StorageSearchResult,
} from "@/types/storage";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_BASE_URL = "/api/storage";
const LOCATIONS_URL = `${STORAGE_BASE_URL}/locations`;
const ITEMS_URL = `${STORAGE_BASE_URL}/items`;
const SEARCH_DEBOUNCE_MS = 250;

/** A failed storage request, with FastAPI's parsed `detail` so callers can read 409 counts. */
export class StorageApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown, message: string) {
    super(message);
    this.name = "StorageApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function readJsonOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    let detail: unknown = text;
    try {
      detail = (JSON.parse(text) as { detail?: unknown }).detail ?? text;
    } catch {
      // Not JSON (e.g. an nginx error page), so keep the raw text.
    }
    throw new StorageApiError(
      response.status,
      detail,
      text || `Request failed with status ${response.status}`,
    );
  }
  return (await response.json()) as T;
}

async function sendJson<T>(
  url: string,
  method: string,
  body?: unknown,
): Promise<T> {
  const response = await fetchWithTimeout(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return readJsonOrThrow<T>(response);
}

export function createLocation(payload: LocationCreatePayload) {
  return sendJson<StorageLocation>(LOCATIONS_URL, "POST", payload);
}

export function updateLocation(locationId: number, payload: LocationUpdatePayload) {
  return sendJson<StorageLocation>(`${LOCATIONS_URL}/${locationId}`, "PATCH", payload);
}

export function deleteLocation(locationId: number) {
  return sendJson(`${LOCATIONS_URL}/${locationId}`, "DELETE");
}

export function createItem(payload: ItemCreatePayload) {
  return sendJson<StorageItem>(ITEMS_URL, "POST", payload);
}

export function updateItem(itemId: number, payload: ItemUpdatePayload) {
  return sendJson<StorageItem>(`${ITEMS_URL}/${itemId}`, "PATCH", payload);
}

export function deleteItem(itemId: number) {
  return sendJson(`${ITEMS_URL}/${itemId}`, "DELETE");
}

/** Moves every item or none: the backend rejects the whole batch if one is missing. */
export function moveItems(itemIds: number[], locationId: number) {
  return sendJson(`${ITEMS_URL}/move`, "POST", { item_ids: itemIds, location_id: locationId });
}

export function deleteItems(itemIds: number[]) {
  return sendJson(`${ITEMS_URL}/delete`, "POST", { item_ids: itemIds });
}

/**
 * Refreshes overlap (a quick second action, a slow Pi) and can answer out of order.
 * Each one asks this for a check, and only the newest may update state, so an older
 * answer can't bring back a deleted item or stale counts.
 */
function useLatestRequest() {
  const latest = useRef(0);
  return useCallback(() => {
    const request = ++latest.current;
    return () => request === latest.current;
  }, []);
}

export function useStorageLocations() {
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const beginRequest = useLatestRequest();

  const refresh = useCallback(async () => {
    const isLatest = beginRequest();
    try {
      const response = await fetchWithTimeout(LOCATIONS_URL);
      const loaded = await readJsonOrThrow<StorageLocation[]>(response);
      if (!isLatest()) return;
      setLocations(loaded);
      setErrorMessage(null);
    } catch (error: unknown) {
      if (!isLatest()) return;
      setErrorMessage(
        error instanceof Error ? error.message : "Could not load locations",
      );
    } finally {
      if (isLatest()) setIsLoading(false);
    }
  }, [beginRequest]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { locations, isLoading, errorMessage, refresh };
}

/** One location with its children and items. Mount it per id (e.g. keyed by the route). */
export function useStorageLocation(locationId: number) {
  const [location, setLocation] = useState<StorageLocationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const beginRequest = useLatestRequest();

  const refresh = useCallback(async () => {
    const isLatest = beginRequest();
    try {
      const response = await fetchWithTimeout(`${LOCATIONS_URL}/${locationId}`);
      const loaded = await readJsonOrThrow<StorageLocationDetail>(response);
      if (!isLatest()) return;
      setLocation(loaded);
      setIsNotFound(false);
      setErrorMessage(null);
    } catch (error: unknown) {
      if (!isLatest()) return;
      if (error instanceof StorageApiError && error.status === 404) {
        setLocation(null);
        setIsNotFound(true);
      } else {
        setErrorMessage(
          error instanceof Error ? error.message : "Could not load location",
        );
      }
    } finally {
      if (isLatest()) setIsLoading(false);
    }
  }, [beginRequest, locationId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { location, isLoading, isNotFound, errorMessage, refresh };
}

interface SearchState {
  query: string;
  result: StorageSearchResult | null;
  hasError: boolean;
}

const EMPTY_SEARCH_RESULT: StorageSearchResult = { locations: [], items: [] };

/** Debounced search. Responses for an older query than the latest are dropped. */
export function useStorageSearch(query: string) {
  const trimmedQuery = query.trim();
  const [state, setState] = useState<SearchState>({
    query: "",
    result: EMPTY_SEARCH_RESULT,
    hasError: false,
  });

  useEffect(() => {
    if (!trimmedQuery) return;
    let isCurrent = true;
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetchWithTimeout(
          `${STORAGE_BASE_URL}/search?q=${encodeURIComponent(trimmedQuery)}`,
        );
        const result = await readJsonOrThrow<StorageSearchResult>(response);
        if (isCurrent) setState({ query: trimmedQuery, result, hasError: false });
      } catch {
        if (isCurrent) setState({ query: trimmedQuery, result: null, hasError: true });
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeoutId);
    };
  }, [trimmedQuery]);

  if (!trimmedQuery) {
    return { result: EMPTY_SEARCH_RESULT, isSearching: false, hasError: false };
  }
  // Until the latest query answers, keep showing the previous hits instead of flashing empty.
  const isSearching = state.query !== trimmedQuery;
  return {
    result: state.result ?? EMPTY_SEARCH_RESULT,
    isSearching,
    hasError: !isSearching && state.hasError,
  };
}

export function useStorageCategories() {
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    let isCurrent = true;
    const load = async () => {
      try {
        const response = await fetchWithTimeout(`${STORAGE_BASE_URL}/categories`);
        const loaded = await readJsonOrThrow<string[]>(response);
        if (isCurrent) setCategories(loaded);
      } catch {
        // Suggestions only; the field still works without them.
      }
    };
    void load();
    return () => {
      isCurrent = false;
    };
  }, []);

  return categories;
}
