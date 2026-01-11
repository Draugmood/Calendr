import { useWeek } from "@/contexts/WeekContext";
import { useMemo } from "react";
import Day from "../day/Day";
import { useGoogleCalendarEvents } from "@/hooks/useGoogleCalendarEvents";
import { useEventsByDay } from "@/hooks/useEventsByDay";
import { DateTimeFunctions } from "@/utils/DateTimeFunctions";
import { CALENDAR_LAYOUT } from "@/config/calendarLayout";

interface Props {
  accessToken: string | null;
}

export default function WeekGrid({ accessToken }: Props) {
  const hourHeight = CALENDAR_LAYOUT.hourHeightPx;
  const gridStartHour = CALENDAR_LAYOUT.gridStartHour;
  const gridEndHour = CALENDAR_LAYOUT.gridEndHour;
  const headerHeight = CALENDAR_LAYOUT.headerHeightPx;

  const daysOfWeek = [
    "Mandag",
    "Tirsdag",
    "Onsdag",
    "Torsdag",
    "Fredag",
    "Lørdag",
    "Søndag",
  ];

  const { datesInWeek } = useWeek();
  const weekStartDate = datesInWeek[0];
  const useEvents = useGoogleCalendarEvents(accessToken ?? null, weekStartDate);
  const eventsByDay = useEventsByDay(datesInWeek, useEvents.events);

  const hours = useMemo(
    () =>
      Array.from(
        { length: gridEndHour - gridStartHour },
        (_, i) => i + gridStartHour,
      ),
    [],
  );

  if (useEvents.isLoading || !useEvents.events) {
    return (
      <div className="flex justify-center items-center h-64 w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-l-2">
          ?
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-row w-full mx-auto">
      <div className="w-12 flex flex-col items-end pr-2 text-right">
        <div className="h-16" />
        <div
          className="flex flex-col"
          style={{ height: `${(gridEndHour - gridStartHour) * hourHeight}px` }}
        >
          {hours.map((hour) => (
            <div
              key={hour}
              style={{ height: `${hourHeight}px` }}
              className="content-center pt-2"
            >
              {hour}:00
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-7 w-full gap-2">
        {datesInWeek.map((date, index) => {
          const key = DateTimeFunctions.toDateKey(date);
          const dayEvents = eventsByDay[key] ?? [];

          return (
            <Day
              key={date.toISODate()}
              day={daysOfWeek[index]}
              date={date}
              dayEvents={dayEvents}
            />
          );
        })}
      </div>
      <div
        className="absolute -top-3 -left-0.5 w-full pointer-events-none"
        style={{
          height: `${(gridEndHour - gridStartHour) * hourHeight}px`,
        }}
      >
        {Array.from({ length: gridEndHour - gridStartHour }, (_, i) => i).map(
          (i) => (
            <div
              key={i}
              className="absolute w-full border-t border-gray-300 dark:border-gray-900"
              style={{ top: `${headerHeight + (i + 1) * hourHeight}px` }}
            />
          ),
        )}
      </div>
    </div>
  );
}
