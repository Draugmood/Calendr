import WeekGrid from "./WeekGrid";
import WeekHeader from "./WeekHeader";
import WeekAgenda from "./WeekAgenda";
import MobileWeekHeader from "./MobileWeekHeader";
import DarkModeToggle from "./DarkModeToggle";
import { useGoogleAuthRedirect } from "@/hooks/useGoogleAuthRedirect";
import PrimaryButton from "../buttons/PrimaryButton";
import { WeekProvider } from "@/contexts/WeekContext";
import { useGoogleToken } from "@/hooks/useGoogleToken";
import { useIsMobileLayout } from "@/hooks/useIsMobile";
import { useEffect } from "react";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import ReminderLiveOverlay from "@/components/reminders/ReminderLiveOverlay";

export default function WeekCalendar() {
  const isMobileLayout = useIsMobileLayout();
  const { redirectToGoogleAuth } = useGoogleAuthRedirect();

  const { accessToken, needsAuth, refresh } = useGoogleToken();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      window.history.replaceState({}, document.title, window.location.pathname);

      fetchWithTimeout("/api/auth/google/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          redirect_uri: window.location.origin,
        }),
      }).then((result) => {
        if (result.ok) window.location.reload();
        else console.error("Auth exchange failed:", result.statusText);
      });
    }
  }, []);

  return (
    <WeekProvider>
      <div className="w-full">
        {isMobileLayout ? (
          <MobileWeekHeader trailing={<DarkModeToggle />} />
        ) : (
          <div className="w-full relative">
            <WeekHeader />
            <DarkModeToggle className="absolute top-0 right-4" />
          </div>
        )}
        {needsAuth && (
          <div className="my-4">
            <PrimaryButton
              onClick={redirectToGoogleAuth}
              label="Koble til Google Kalender"
            />
          </div>
        )}
        {isMobileLayout ? (
          <WeekAgenda accessToken={accessToken} onAuthError={refresh} />
        ) : (
          <WeekGrid accessToken={accessToken} onAuthError={refresh} />
        )}
        <ReminderLiveOverlay />
      </div>
    </WeekProvider>
  );
}
