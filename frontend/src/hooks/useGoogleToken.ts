import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import { useEffect, useState } from "react";

export function useGoogleToken() {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetchWithTimeout("/api/auth/google/token");
        if (response.ok) {
          const data = await response.json();
          setAccessToken(data.access_token);
        }
      } catch (error) {
        console.error(
          "Failed to fetch Google access token from backend:",
          error,
        );
      }
    };

    fetchToken();

    const intervalId = setInterval(fetchToken, 45 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  return accessToken;
}
