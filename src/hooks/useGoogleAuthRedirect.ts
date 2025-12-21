import { useCallback } from "react";

const CLIENT_ID = import.meta.env.VITE_CLIENT_ID as string;

type Options = {
  scope?: string;
  redirectUri?: string;
};

export function useGoogleAuthRedirect() {
  const redirectToGoogleAuth = useCallback((options: Options = {}) => {
    if (!CLIENT_ID) {
      throw new Error("Missing VITE_CLIENT_ID (check env variables)");
    }

    const scope =
      options.scope ?? "https://www.googleapis.com/auth/calendar.readonly";
    const redirectUri = options.redirectUri ?? window.location.origin;

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "token");
    authUrl.searchParams.set("scope", scope);

    window.location.assign(authUrl);
  }, []);

  return { redirectToGoogleAuth };
}
