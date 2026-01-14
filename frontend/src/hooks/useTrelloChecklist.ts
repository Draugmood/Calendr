import type { Checklist } from "@/types/checklist";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import { useCallback, useEffect, useState } from "react";

const TRELLO_API_BASE = "https://api.trello.com/1";

const TRELLO_KEY = import.meta.env.VITE_TRELLO_KEY as string;
const TRELLO_TOKEN = import.meta.env.VITE_TRELLO_TOKEN as string;

export function useTrelloChecklist(checklistId?: string) {
  const url = `${TRELLO_API_BASE}/checklists/${checklistId}?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`;

  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchChecklist = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetchWithTimeout(url);
      if (!response.ok) {
        throw new Error(
          `Trello API request failed with status ${response.status}`,
        );
      }
      const data = (await response.json()) as Checklist;

      setChecklist(data);
    } catch (error: any) {
      setErrorMessage(error?.message ?? "Failed to fetch Trello checklist");
    } finally {
      setIsLoading(false);
    }
  }, [url]);

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
        fetchChecklist();
      }
    },
    [fetchChecklist],
  );

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  return {
    checklist,
    errorMessage,
    isLoading,
    refetch: fetchChecklist,
    updateChecklistItem,
  };
}
