import { useEffect, useState } from "react";

export function useGoogleAccessTokenFromHash() {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const token = hashParams.get("access_token");
    if (token) {
      setAccessToken(token);
      window.history.replaceState(
        null,
        document.title,
        window.location.pathname + window.location.search,
      );
    }
  }, []);

  return accessToken;
}
