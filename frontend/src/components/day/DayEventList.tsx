import { CALENDAR_LAYOUT } from "@/config/calendarLayout";
import type { CalendarEvent } from "@/types/calendarEvent";
import { DateTime } from "luxon";

interface Props {
  events: CalendarEvent[];
}

function getEventColorClass(event: CalendarEvent) {
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

export default function DayEventList({ events }: Props) {
  const hourHeight = CALENDAR_LAYOUT.hourHeightPx;
  const gridStartHour = CALENDAR_LAYOUT.gridStartHour;

  return (
    <div className="relative">
      {events.map((event) => {
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

        const top = (startHours - gridStartHour) * hourHeight;
        const height = duration * hourHeight;
        return (
          <div
            key={event.id}
            className={`z-10 absolute left-2 right-2 text-black text-xs rounded-lg shadow-lg px-2 py-1 max-w-full ${getEventColorClass(
              event,
            )}`}
            style={{
              top: `${top}px`,
              height: `${height}px`,
            }}
          >
            {event.summary}
          </div>
        );
      })}
    </div>
  );
}
