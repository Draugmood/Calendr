import type { CalendarEvent } from "@/types/calendarEvent";
import { DateTimeFunctions } from "@/utils/DateTimeFunctions";
import { EventFunctions } from "@/utils/EventFunctions";
import { DateTime } from "luxon";
import { useMemo } from "react";

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
      const startDate = EventFunctions.getEventStartDate(event);
      if (!startDate) continue;

      const dateKey = DateTimeFunctions.toDateKey(startDate);
      if (grouped[dateKey]) {
        grouped[dateKey].push(event);
      }
    }

    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => {
        const aDate = EventFunctions.getEventStartDate(a)?.toMillis() ?? 0;
        const bDate = EventFunctions.getEventStartDate(b)?.toMillis() ?? 0;
        return aDate - bDate;
      });
    }

    return grouped;
  }, [datesInWeek, events]);
}
