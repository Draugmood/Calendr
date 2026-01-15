import { useDarkMode } from "@/hooks/useDarkMode";
import WeekGrid from "./WeekGrid";
import WeekHeader from "./WeekHeader";
import { useGoogleAuthRedirect } from "@/hooks/useGoogleAuthRedirect";
import PrimaryButton from "../buttons/PrimaryButton";
import { WeekProvider } from "@/contexts/WeekContext";
import { useGoogleToken } from "@/hooks/useGoogleToken";
import { useEffect } from "react";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

export default function WeekCalendar() {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { redirectToGoogleAuth } = useGoogleAuthRedirect();

  const access_token = useGoogleToken();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      window.history.replaceState({}, document.title, window.location.pathname);

      fetchWithTimeout("/api/auth/google/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      }).then((result) => {
        if (result.ok) window.location.reload();
        else console.error("Auth exchange failed:", result.statusText);
      });
    }
  }, []);

  return (
    <WeekProvider>
      <div className="w-full">
        <div className="w-full relative">
          <WeekHeader />
          <button
            onClick={toggleDarkMode}
            className="absolute top-0 right-4 p-2 w-10 h-10 rounded bg-blue-500 text-white shadow-md hover:bg-blue-600 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors"
            aria-label={
              isDarkMode ? "Switch to light mode" : "Switch to dark mode"
            }
            title={isDarkMode ? "Light mode" : "Dark mode"}
          >
            {isDarkMode ? "☀️" : "🌙"}
          </button>
        </div>
        {access_token === null && (
          <div className="my-4">
            <PrimaryButton
              onClick={redirectToGoogleAuth}
              label="Authorize with Google Calendar"
            />
          </div>
        )}
        <WeekGrid accessToken={access_token} />
      </div>
    </WeekProvider>
  );
}
