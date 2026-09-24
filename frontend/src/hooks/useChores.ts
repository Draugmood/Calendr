import type { Chore, ChorePayload } from "@/types/chore";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import { useCallback, useEffect, useState } from "react";

const CHORES_BASE_URL = "/api/chores";
const CHORES_POLL_INTERVAL_MS = 60 * 1000;

async function readJsonOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
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

export function useChores() {
  const [chores, setChores] = useState<Chore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const replaceChore = useCallback((updated: Chore) => {
    setChores((prev) =>
      prev.map((chore) => (chore.id === updated.id ? updated : chore)),
    );
  }, []);

  const refreshChores = useCallback(async (background = false) => {
    try {
      const response = await fetchWithTimeout(CHORES_BASE_URL);
      setChores(await readJsonOrThrow<Chore[]>(response));
      setErrorMessage(null);
    } catch (error: unknown) {
      if (!background) {
        setErrorMessage(
          error instanceof Error ? error.message : "Could not load chores",
        );
      }
    } finally {
      if (!background) setIsLoading(false);
    }
  }, []);

  const createChore = useCallback(async (payload: ChorePayload) => {
    const created = await sendJson<Chore>(CHORES_BASE_URL, "POST", payload);
    setChores((prev) => [...prev, created]);
    return created;
  }, []);

  const updateChore = useCallback(
    async (choreId: number, payload: Partial<ChorePayload>) => {
      const updated = await sendJson<Chore>(
        `${CHORES_BASE_URL}/${choreId}`,
        "PATCH",
        payload,
      );
      replaceChore(updated);
      return updated;
    },
    [replaceChore],
  );

  const deleteChore = useCallback(async (choreId: number) => {
    await sendJson(`${CHORES_BASE_URL}/${choreId}`, "DELETE");
    setChores((prev) => prev.filter((chore) => chore.id !== choreId));
  }, []);

  const completeChore = useCallback(
    async (choreId: number) => {
      const updated = await sendJson<Chore>(
        `${CHORES_BASE_URL}/${choreId}/complete`,
        "POST",
      );
      replaceChore(updated);
      return updated;
    },
    [replaceChore],
  );

  const undoComplete = useCallback(
    async (choreId: number) => {
      const updated = await sendJson<Chore>(
        `${CHORES_BASE_URL}/${choreId}/completions/latest`,
        "DELETE",
      );
      replaceChore(updated);
      return updated;
    },
    [replaceChore],
  );

  useEffect(() => {
    void refreshChores(false);
    const intervalId = window.setInterval(
      () => void refreshChores(true),
      CHORES_POLL_INTERVAL_MS,
    );
    return () => window.clearInterval(intervalId);
  }, [refreshChores]);

  return {
    chores,
    isLoading,
    errorMessage,
    createChore,
    updateChore,
    deleteChore,
    completeChore,
    undoComplete,
  };
}
