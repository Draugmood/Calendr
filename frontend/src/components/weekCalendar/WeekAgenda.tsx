import { useWeek } from "@/contexts/WeekContext";
import { useEventsByDay } from "@/hooks/useEventsByDay";
import { useGoogleCalendarEvents } from "@/hooks/useGoogleCalendarEvents";
import type { CalendarEvent } from "@/types/calendarEvent";
import { DateTimeFunctions } from "@/utils/DateTimeFunctions";
import { EventFunctions } from "@/utils/EventFunctions";
import { DateTime } from "luxon";

interface Props {
  accessToken: string | null;
  onAuthError?: () => void;
}

// All-day events end at midnight of the day after their last day.
function coversDay(event: CalendarEvent, date: DateTime): boolean {
  const start = EventFunctions.getEventStartDate(event);
  const end = EventFunctions.getEventEndDate(event);
  return !!start && !!end && date >= start && date < end;
}

/** The phone layout of the week: one list of events per day instead of a time grid. */
export default function WeekAgenda({ accessToken, onAuthError }: Props) {
  const { datesInWeek } = useWeek();
  const { events, errorMessage, isLoading } = useGoogleCalendarEvents(
    accessToken,
    datesInWeek[0],
    onAuthError,
  );

  const timedEvents = events.filter((event) => !EventFunctions.isAllDayEvent(event));
  const allDayEvents = events.filter((event) => EventFunctions.isAllDayEvent(event));
  const eventsByDay = useEventsByDay(datesInWeek, timedEvents);

  if (isLoading) {
    return <p className="py-8 text-center">Henter avtaler...</p>;
  }
  // Otherwise a failed request would read as a week without any appointments.
  if (errorMessage) {
    return <p className="py-8 text-center text-red-500">Kunne ikke hente avtaler.</p>;
  }

  const today = DateTime.now();

  return (
    <ol className="flex w-full flex-col gap-3 text-left">
      {datesInWeek.map((date) => {
        const dayEvents = eventsByDay[DateTimeFunctions.toDateKey(date)] ?? [];
        const dayAllDayEvents = allDayEvents.filter((event) => coversDay(event, date));
        const isToday = date.hasSame(today, "day");
        const isPast = date < today.startOf("day");

        return (
          <li
            key={date.toISODate()}
            className={`rounded-lg p-3 ${
              isToday
                ? "bg-blue-500/10 ring-1 ring-blue-500"
                : "bg-gray-100 dark:bg-gray-700/50"
            } ${isPast ? "opacity-60" : ""}`}
          >
            <h3 className="mb-2 flex items-baseline gap-2">
              <span
                className={`font-bold first-letter:uppercase ${
                  isToday ? "text-blue-500" : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {date.setLocale("nb").toFormat("cccc")}
              </span>
              <span
                className={`text-sm ${isToday ? "text-blue-500 font-bold" : "text-gray-500"}`}
              >
                {date.setLocale("nb").toFormat("d. LLL")}
              </span>
            </h3>

            {dayEvents.length === 0 && dayAllDayEvents.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Ingen avtaler</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {dayAllDayEvents.map((event) => (
                  <li
                    key={event.id}
                    className={`truncate rounded px-3 py-1 text-sm font-bold text-black ${EventFunctions.getEventColorClass(event)}`}
                  >
                    {event.summary}
                  </li>
                ))}
                {dayEvents.map((event) => (
                  <li
                    key={event.id}
                    className={`flex items-baseline gap-3 rounded-lg border border-slate-800 px-3 py-2 text-black shadow ${EventFunctions.getEventColorClass(event)}`}
                  >
                    <span className="shrink-0 text-sm tabular-nums">
                      {EventFunctions.getFormattedTime(event.start)}–
                      {EventFunctions.getFormattedTime(event.end)}
                    </span>
                    <strong className="min-w-0 break-words">{event.summary}</strong>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
