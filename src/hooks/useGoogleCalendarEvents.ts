import type { CalendarEvent } from "@/types/calendarEvent";
import type { GoogleCalendarListItem } from "@/types/googleCalendarListItem";
import { DateTimeFunctions } from "@/utils/DateTimeFunctions";
import { DateTime } from "luxon";
import { useCallback, useEffect, useMemo, useState } from "react";

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = 10000,
): Promise<Response> {
  const controller = new AbortController();
  const id = window.setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    window.clearTimeout(id);
    return response;
  } catch (error: any) {
    window.clearTimeout(id);
    throw new Error(
      `Network request failed for ${url}: ${error?.message ?? error}`,
    );
  }
}

function eventStartDateTime(event: CalendarEvent): DateTime | null {
  const raw = event.start?.dateTime || event.start?.date;
  if (!raw) return null;

  const dateTime = DateTime.fromISO(raw, { setZone: true });
  return dateTime.isValid ? dateTime : null;
}

export function useGoogleCalendarEvents(
  accessToken: string | null,
  weekStart?: DateTime,
) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const effectiveWeekStart = useMemo(
    () => DateTimeFunctions.startOfWeekMonday(weekStart ?? DateTime.now()),
    [weekStart],
  );

  const fetchCalendars = useCallback(async (): Promise<
    GoogleCalendarListItem[]
  > => {
    const response = await fetchWithTimeout(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    if (!response.ok) {
      throw new Error(
        `Failed to fetch calendar list: ${response.status} ${response.statusText}`,
      );
    }
    const data = await response.json();
    return (data.items ?? []) as GoogleCalendarListItem[];
  }, [accessToken]);

  const fetchEventsForWeek = useCallback(
    async (weekStartDate: DateTime) => {
      if (!accessToken) return;
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const start = DateTimeFunctions.startOfWeekMonday(
          weekStartDate ?? effectiveWeekStart,
        );
        const end = start.plus({ weeks: 1 });

        const calendars = await fetchCalendars();
        const params = new URLSearchParams({
          timeMin: start.toISO() ?? "",
          timeMax: end.toISO() ?? "",
          singleEvents: "true",
          orderBy: "startTime",
        });

        const baseUrl = "https://www.googleapis.com/calendar/v3/calendars";

        const eventArrays = await Promise.all(
          calendars.map(async (calendar) => {
            const url = `${baseUrl}/${encodeURIComponent(
              calendar.id,
            )}/events?${params.toString()}`;
            try {
              const response = await fetchWithTimeout(url, {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              });
              if (!response.ok) {
                throw new Error(
                  `Failed to fetch events for calendar ${calendar.id}: ${response.status} ${response.statusText}`,
                );
              }

              const data = await response.json();
              const items = (data.items ?? []) as CalendarEvent[];

              items.forEach((event) => {
                event.source = calendar.summary;
              });

              return items;
            } catch (error: any) {
              console.error(error);
              return [] as CalendarEvent[];
            }
          }),
        );

        const allEvents = eventArrays.flat();

        allEvents.sort((a, b) => {
          const aDateTime = eventStartDateTime(a);
          const bDateTime = eventStartDateTime(b);

          if (!aDateTime && !bDateTime) return 0;
          if (!aDateTime) return 1;
          if (!bDateTime) return -1;

          return aDateTime.toMillis() - bDateTime.toMillis();
        });

        setEvents(allEvents);
      } catch (error: any) {
        setErrorMessage(error?.message ?? String(error));
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken, effectiveWeekStart, fetchCalendars],
  );

  useEffect(() => {
    if (!accessToken) return;
    fetchEventsForWeek(effectiveWeekStart);
  }, [accessToken, effectiveWeekStart, fetchEventsForWeek]);

  return { events, errorMessage, isLoading, fetchEventsForWeek };
}
