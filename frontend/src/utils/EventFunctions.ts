import { CALENDAR_LAYOUT } from "@/config/calendarLayout";
import type { CalendarEvent } from "@/types/calendarEvent";
import { DateTime } from "luxon";

export class EventFunctions {
  static getFormattedTime(time: CalendarEvent["start"] | CalendarEvent["end"]) {
    return new Date(time.dateTime || time.date || "").toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  static getEventStartDate(event: CalendarEvent): DateTime | null {
    const raw = event.start?.dateTime || event.start?.date;
    if (!raw) return null;

    const dateTime = DateTime.fromISO(raw, { setZone: true });
    return dateTime.isValid ? dateTime : null;
  }

  static getEventEndDate(event: CalendarEvent): DateTime | null {
    const raw = event.end?.dateTime || event.end?.date;
    if (!raw) return null;

    const dateTime = DateTime.fromISO(raw, { setZone: true });
    return dateTime.isValid ? dateTime : null;
  }

  static isAllDayEvent(event: CalendarEvent) {
    return !!event.start.date && !event.start.dateTime;
  }

  static getEventColorClass(event: CalendarEvent) {
    const colorMapping: Record<string, string> = {
      "1": "bg-green-100",
      "2": "bg-green-500",
      "3": "bg-fuchsia-600",
      "4": "bg-purple-500",
      "5": "bg-amber-400",
      "6": "bg-yellow-500",
      "7": "bg-blue-400",
    };

    // If colorId is present and matches a key, return that class.
    // Otherwise, return a default color.
    let color =
      event.colorId && colorMapping[event.colorId]
        ? colorMapping[event.colorId]
        : "bg-indigo-300";

    if (event.source === "linelineakaasa@gmail.com") {
      color = "bg-indigo-300";
    }
    if (event.source === "mortostr@gmail.com") {
      color = "bg-blue-400";
    }
    return color;
  }

  static calculateEventPosition(
    event: CalendarEvent,
    allDayEventSectionHeight: number,
  ) {
    const hourHeight = CALENDAR_LAYOUT.hourHeightPx;
    const gridStartHour = CALENDAR_LAYOUT.gridStartHour - 1; // -1 works, no idea why

    const startDateTime = EventFunctions.getEventStartDate(event);
    const endDateTime = EventFunctions.getEventEndDate(event);

    const startHours = startDateTime
      ? startDateTime.hour + startDateTime.minute / 60
      : 0;
    const endHours = endDateTime
      ? endDateTime.hour + endDateTime.minute / 60
      : 0;

    const duration = endHours - startHours;

    const allDayBlockOffset =
      allDayEventSectionHeight - CALENDAR_LAYOUT.hourHeightPx;

    const top = (startHours - gridStartHour) * hourHeight + allDayBlockOffset;
    const height = duration * hourHeight;

    return { top, height };
  }

  static getAllDayEventStyle = (
    event: CalendarEvent,
    weekStart: DateTime,
    weekEnd: DateTime,
  ) => {
    let startDate = EventFunctions.getEventStartDate(event);
    let endDate = EventFunctions.getEventEndDate(event);

    if (!startDate || !endDate) {
      return { left: "0%", width: "100%" };
    }

    if (startDate < weekStart) startDate = weekStart;
    if (endDate > weekEnd) endDate = weekEnd;

    const startIndex = Math.max(0, startDate.diff(weekStart, "days").days);
    const duration = endDate.diff(startDate, "days").days;

    return {
      gridColumnStart: Math.round(startIndex) + 1,
      gridColumnEnd: `span ${Math.round(duration)}`,
    };
  };

  static assignAllDayEventRows(
    events: CalendarEvent[],
    weekStart: DateTime,
    weekEnd: DateTime,
  ): Record<string, number> {
    const sortedEvents = [...events].sort((a, b) => {
      const startA = EventFunctions.getEventStartDate(a)?.toMillis() ?? 0;
      const startB = EventFunctions.getEventStartDate(b)?.toMillis() ?? 0;
      if (startA !== startB) return startA - startB;

      const endA = EventFunctions.getEventEndDate(a)?.toMillis() ?? 0;
      const endB = EventFunctions.getEventEndDate(b)?.toMillis() ?? 0;
      return endB - startB - (endA - startA);
    });

    const rows: DateTime[] = [];
    const eventRows: Record<string, number> = {};

    sortedEvents.forEach((event) => {
      let start = EventFunctions.getEventStartDate(event);
      let end = EventFunctions.getEventEndDate(event);

      if (!start || !end) return;
      if (start < weekStart) start = weekStart;
      if (end > weekEnd) end = weekEnd;

      let rowIndex = -1;
      for (let i = 0; i < rows.length; i++) {
        const rowNextAvailable = rows[i];

        if (start.toMillis() >= rowNextAvailable.toMillis()) {
          rowIndex = i;
          break;
        }
      }

      if (rowIndex === -1) {
        rowIndex = rows.length;
        rows.push(end);
      } else {
        rows[rowIndex] = end;
      }

      eventRows[event.id] = rowIndex;
    });

    return eventRows;
  }

  static getMaxOverlappingAllDayEvents(
    allDayEvents: CalendarEvent[],
    datesInWeek: DateTime[],
  ): number {
    const counts = new Array(datesInWeek.length).fill(0);

    allDayEvents.forEach((event) => {
      let start = EventFunctions.getEventStartDate(event);
      let end = EventFunctions.getEventEndDate(event);

      if (!start || !end) return;

      // Check each day of the week to see if this event covers it
      datesInWeek.forEach((date, index) => {
        // We use >= start and < end because all-day events usually end at midnight of the *next* day
        // e.g. Jan 1 00:00 to Jan 2 00:00 covers Jan 1.
        if (date >= start! && date < end!) {
          counts[index]++;
        }
      });
    });

    return Math.max(...counts, 0);
  }
}
