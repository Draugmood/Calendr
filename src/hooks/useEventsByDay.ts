import type { CalendarEvent } from "@/types/calendarEvent";
import { DateTimeFunctions } from "@/utils/DateTimeFunctions";
import { DateTime } from "luxon";
import { useMemo } from "react";

function eventStartDate(event: CalendarEvent): DateTime | null {
  const raw = event.start?.dateTime || event.start?.date;
  if (!raw) return null;

  const dateTime = DateTime.fromISO(raw, { setZone: true });
  return dateTime.isValid ? dateTime : null;
}

export function useEventsByDay(
  datesInWeek: DateTime[],
  events: CalendarEvent[] = [],
) {
  return useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};

    for (const date of datesInWeek) {
      grouped[DateTimeFunctions.toDateKey(date)] = [];
    }

    for (const event of events) {
      const startDate = eventStartDate(event);
      if (!startDate) continue;

      const dateKey = DateTimeFunctions.toDateKey(startDate);
      if (grouped[dateKey]) {
        grouped[dateKey].push(event);
      }
    }

    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => {
        const aDate = eventStartDate(a)?.toMillis() ?? 0;
        const bDate = eventStartDate(b)?.toMillis() ?? 0;
        return aDate - bDate;
      });
    }

    return grouped;
  }, [datesInWeek, events]);
}
