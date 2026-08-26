import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import { useCallback, useEffect, useRef, useState } from "react";

const REFRESH_MARGIN_SECONDS = 300;
const MIN_REFRESH_DELAY_MS = 60 * 1000;
const MAX_REFRESH_DELAY_MS = 55 * 60 * 1000;
const INITIAL_RETRY_DELAY_MS = 30 * 1000;
const MAX_RETRY_DELAY_MS = 5 * 60 * 1000;

export function useGoogleToken() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  const timeoutRef = useRef<number | null>(null);
  const retryDelayRef = useRef(INITIAL_RETRY_DELAY_MS);
  const fetchTokenRef = useRef<() => void>(() => {});

  const scheduleFetch = useCallback((delayMs: number) => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(
      () => fetchTokenRef.current(),
      delayMs,
    );
  }, []);

  const fetchToken = useCallback(async () => {
    try {
      const response = await fetchWithTimeout("/api/auth/google/token");

      if (response.status === 401) {
        setAccessToken(null);
        setNeedsAuth(true);
        return;
      }

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.status}`);
      }

      const data = await response.json();
      setAccessToken(data.access_token ?? null);
      setNeedsAuth(false);
      retryDelayRef.current = INITIAL_RETRY_DELAY_MS;

      const lifetime = Number(data.expires_in) || 3600;
      const delayMs = (lifetime - REFRESH_MARGIN_SECONDS) * 1000;
      scheduleFetch(
        Math.min(Math.max(delayMs, MIN_REFRESH_DELAY_MS), MAX_REFRESH_DELAY_MS),
      );
    } catch (error) {
      // Transient failure: keep the current token and retry with backoff rather than prompting for re-auth
      console.error("Failed to fetch Google access token from backend:", error);
      scheduleFetch(retryDelayRef.current);
      retryDelayRef.current = Math.min(
        retryDelayRef.current * 2,
        MAX_RETRY_DELAY_MS,
      );
    }
  }, [scheduleFetch]);

  fetchTokenRef.current = () => {
    void fetchToken();
  };

  const refresh = useCallback(() => {
    void fetchToken();
  }, [fetchToken]);

  useEffect(() => {
    void fetchToken();
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, [fetchToken]);

  return { accessToken, needsAuth, refresh };
}
