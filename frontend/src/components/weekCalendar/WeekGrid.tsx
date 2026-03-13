import { useWeek } from "@/contexts/WeekContext";
import { useMemo } from "react";
import Day from "../day/Day";
import { useGoogleCalendarEvents } from "@/hooks/useGoogleCalendarEvents";
import { useEventsByDay } from "@/hooks/useEventsByDay";
import { DateTimeFunctions } from "@/utils/DateTimeFunctions";
import { CALENDAR_LAYOUT } from "@/config/calendarLayout";
import { EventFunctions } from "@/utils/EventFunctions";
import DayHeader from "../day/DayHeader";
import AllDayEventBlock from "../events/AllDayEventBlock";

interface Props {
  accessToken: string | null;
}

export default function WeekGrid({ accessToken }: Props) {
  const hourHeight = CALENDAR_LAYOUT.hourHeightPx;
  const gridStartHour = CALENDAR_LAYOUT.gridStartHour;
  const gridEndHour = CALENDAR_LAYOUT.gridEndHour;
  const dayHeaderHeight = CALENDAR_LAYOUT.dayHeaderHeight;
  const initialSpacing = CALENDAR_LAYOUT.initialSpacing;

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
  const weekEndDate = datesInWeek[6].plus({ days: 1 });
  const useEvents = useGoogleCalendarEvents(accessToken ?? null, weekStartDate);

  const allEvents = useEvents.events;
  const timedEvents = allEvents.filter(
    (event) => !EventFunctions.isAllDayEvent(event),
  );

  const allDayEvents = allEvents.filter((event) =>
    EventFunctions.isAllDayEvent(event),
  );

  const eventRows = useMemo(
    () =>
      EventFunctions.assignAllDayEventRows(
        allDayEvents,
        weekStartDate,
        weekEndDate,
      ),
    [allDayEvents, datesInWeek],
  );

  const maxOverlappingAllDayEvents = useMemo(
    () =>
      EventFunctions.getMaxOverlappingAllDayEvents(allDayEvents, datesInWeek),
    [allDayEvents, datesInWeek],
  );

  const allDayEventSectionHeight =
    maxOverlappingAllDayEvents > 0 ? maxOverlappingAllDayEvents * 24 : 0;

  const eventsByDay = useEventsByDay(datesInWeek, timedEvents);

  const hours = useMemo(
    () =>
      Array.from(
        { length: gridEndHour - gridStartHour },
        (_, i) => i + gridStartHour,
      ),
    [],
  );

  return (
    <div className="relative flex flex-row w-full mx-auto">
      <div className="w-12 flex flex-col items-end pr-2 text-right">
        <div style={{ height: `${dayHeaderHeight}px` }} />
        {allDayEvents.length > 0 && (
          <div
            className="border-b border-transparent text.xs text-gray-500"
            style={{ height: `${allDayEventSectionHeight}px` }}
          />
        )}
        <div
          className="flex flex-col"
          style={{ height: `${(gridEndHour - gridStartHour) * hourHeight}px` }}
        >
          {hours.map((hour) => (
            <div
              key={hour}
              style={{ height: `${hourHeight}px` }}
              className="content-end"
            >
              {hour}:00
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col w-full relative">
        <div className="grid grid-cols-7 w-full gap-1 mb-1">
          {datesInWeek.map((date, index) => (
            <DayHeader
              key={date.toISODate()}
              day={daysOfWeek[index]}
              date={date}
            />
          ))}
        </div>
        {allDayEvents.length > 0 && (
          <div className="grid grid-cols-7 w-full gap-1 auto-rows-fr">
            {allDayEvents.map((event) => (
              <AllDayEventBlock
                key={event.id}
                event={event}
                weekStartDate={weekStartDate}
                weekEndDate={weekEndDate}
                rowIndex={eventRows[event.id]}
              />
            ))}
          </div>
        )}
        <div className="grid grid-cols-7 w-full gap-1">
          {datesInWeek.map((date) => {
            const key = DateTimeFunctions.toDateKey(date);
            const dayEvents = eventsByDay[key] ?? [];

            return (
              <Day
                key={date.toISODate()}
                dayEvents={dayEvents}
                eventsLoading={useEvents.isLoading}
                allDayEventSectionHeight={allDayEventSectionHeight}
              />
            );
          })}
        </div>
      </div>
      <div
        className="absolute -left-0.5 w-full pointer-events-none"
        style={{
          height: `${(gridEndHour - gridStartHour) * hourHeight}px`,
        }}
      >
        {Array.from({ length: gridEndHour - gridStartHour }, (_, i) => i).map(
          (i) => (
            <div
              key={i}
              className="absolute w-full border-t border-gray-300 dark:border-gray-900"
              style={{
                top: `${dayHeaderHeight + allDayEventSectionHeight + initialSpacing + i * hourHeight}px`,
              }}
            />
          ),
        )}
      </div>
    </div>
  );
}
