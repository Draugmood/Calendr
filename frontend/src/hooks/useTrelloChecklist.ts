import type { Checklist } from "@/types/checklist";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import { useCallback, useEffect, useState } from "react";

const TRELLO_API_BASE = "https://api.trello.com/1";

const TRELLO_KEY = import.meta.env.VITE_TRELLO_KEY as string;
const TRELLO_TOKEN = import.meta.env.VITE_TRELLO_TOKEN as string;
const checklistCache = new Map<string, Checklist>();
const checklistRequests = new Map<string, Promise<Checklist>>();

function getChecklistUrl(checklistId: string): string {
  return `${TRELLO_API_BASE}/checklists/${checklistId}?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`;
}

async function loadChecklist(checklistId: string): Promise<Checklist> {
  const cachedChecklist = checklistCache.get(checklistId);
  if (cachedChecklist) return cachedChecklist;

  const existingRequest = checklistRequests.get(checklistId);
  if (existingRequest) return existingRequest;

  const request = fetchWithTimeout(getChecklistUrl(checklistId))
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Trello API request failed with status ${response.status}`);
      }

      const checklist = (await response.json()) as Checklist;
      checklistCache.set(checklistId, checklist);
      return checklist;
    })
    .finally(() => checklistRequests.delete(checklistId));

  checklistRequests.set(checklistId, request);
  return request;
}

export function prefetchTrelloChecklist(checklistId: string): Promise<void> {
  return loadChecklist(checklistId).then(() => undefined);
}

export function useTrelloChecklist(checklistId?: string) {
  const [checklist, setChecklist] = useState<Checklist | null>(
    () => (checklistId ? checklistCache.get(checklistId) ?? null : null),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchChecklist = useCallback(
    async (isBackground = false) => {
      if (!checklistId) return;

      const cachedChecklist = checklistCache.get(checklistId);
      if (!isBackground && !cachedChecklist) setIsLoading(true);
      setErrorMessage(null);

      try {
        setChecklist(await loadChecklist(checklistId));
      } catch (error: any) {
        if (!isBackground) {
          setErrorMessage(error?.message ?? "Failed to fetch Trello checklist");
        } else {
          console.warn("Background sync failed:", error);
        }
      } finally {
        if (!isBackground && !cachedChecklist) setIsLoading(false);
      }
    },
    [checklistId],
  );

  const updateChecklistItem = useCallback(
    async (
      cardId: string,
      itemId: string,
      newState: "complete" | "incomplete",
    ) => {
      setChecklist((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          checkItems: prev.checkItems.map((item) =>
            item.id === itemId ? { ...item, state: newState } : item,
          ),
        };
      });

      const updateUrl = `${TRELLO_API_BASE}/cards/${cardId}/checkItem/${itemId}?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}&state=${newState}`;
      try {
        const response = await fetchWithTimeout(updateUrl, { method: "PUT" });
        if (!response.ok) {
          throw new Error(
            `Failed to update item: ${response.status} - ${response.statusText}`,
          );
        }
      } catch (error: any) {
        console.error(error);
        setErrorMessage("Failed to update checklist item, reverting");
        fetchChecklist(false);
      }
    },
    [fetchChecklist],
  );

  useEffect(() => {
    fetchChecklist(false);

    const intervalId = setInterval(() => fetchChecklist(true), 15 * 1000);
    return () => clearInterval(intervalId);
  }, [fetchChecklist]);

  return {
    checklist,
    errorMessage,
    isLoading,
    refetch: fetchChecklist,
    updateChecklistItem,
  };
}
