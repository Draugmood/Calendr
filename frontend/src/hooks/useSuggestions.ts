import type { Suggestion } from "@/types/suggestion";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import { useCallback, useEffect, useState } from "react";

const SUGGESTIONS_BASE_URL = "/api/suggestions";

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

// Open suggestions first, newest first within each group (matches the backend order).
function sortSuggestions(suggestions: Suggestion[]): Suggestion[] {
  return [...suggestions].sort(
    (a, b) =>
      Number(a.done) - Number(b.done) ||
      b.created_at.localeCompare(a.created_at) ||
      b.id - a.id,
  );
}

export function useSuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshSuggestions = useCallback(async () => {
    try {
      const response = await fetchWithTimeout(SUGGESTIONS_BASE_URL);
      setSuggestions(await readJsonOrThrow<Suggestion[]>(response));
      setErrorMessage(null);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not load suggestions",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createSuggestion = useCallback(async (text: string) => {
    const created = await sendJson<Suggestion>(SUGGESTIONS_BASE_URL, "POST", { text });
    setSuggestions((prev) => sortSuggestions([created, ...prev]));
    return created;
  }, []);

  const setSuggestionDone = useCallback(async (suggestionId: number, done: boolean) => {
    const updated = await sendJson<Suggestion>(
      `${SUGGESTIONS_BASE_URL}/${suggestionId}`,
      "PATCH",
      { done },
    );
    setSuggestions((prev) =>
      sortSuggestions(prev.map((s) => (s.id === updated.id ? updated : s))),
    );
    return updated;
  }, []);

  const deleteSuggestion = useCallback(async (suggestionId: number) => {
    await sendJson(`${SUGGESTIONS_BASE_URL}/${suggestionId}`, "DELETE");
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
  }, []);

  useEffect(() => {
    void refreshSuggestions();
  }, [refreshSuggestions]);

  return {
    suggestions,
    isLoading,
    errorMessage,
    createSuggestion,
    setSuggestionDone,
    deleteSuggestion,
  };
}
