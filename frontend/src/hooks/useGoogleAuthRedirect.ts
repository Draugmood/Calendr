import { useCallback } from "react";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const REDIRECT_URI = window.location.origin;

export function useGoogleAuthRedirect() {
  const redirectToGoogleAuth = useCallback(() => {
    if (!CLIENT_ID) {
      throw new Error("Missing VITE_GOOGLE_CLIENT_ID (check env variables)");
    }

    const scope = "https://www.googleapis.com/auth/calendar.readonly";

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

    authUrl.searchParams.set("client_id", CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", REDIRECT_URI);

    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");

    authUrl.searchParams.set("scope", scope);

    window.location.assign(authUrl);
  }, []);

  return { redirectToGoogleAuth };
}
