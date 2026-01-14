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

  static calculateEventPosition(event: CalendarEvent) {
    const hourHeight = CALENDAR_LAYOUT.hourHeightPx;
    const gridStartHour = CALENDAR_LAYOUT.gridStartHour;
    const startRaw = event.start?.dateTime || event.start?.date;
    const endRaw = event.end?.dateTime || event.end?.date;

    const startDateTime = startRaw
      ? DateTime.fromISO(startRaw, { setZone: true })
      : null;
    const endDateTime = endRaw
      ? DateTime.fromISO(endRaw, { setZone: true })
      : null;

    const startHours = startDateTime
      ? startDateTime.hour + startDateTime.minute / 60
      : 0;
    const endHours = endDateTime
      ? endDateTime.hour + endDateTime.minute / 60
      : 0;

    const duration = endHours - startHours;

    const top = (startHours - gridStartHour + 1) * hourHeight;
    const height = duration * hourHeight;

    return { top, height };
  }
}
