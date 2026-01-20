import { DateTime } from "luxon";
import DayEventList from "./DayEventList";
import DayHeader from "./DayHeader";
import type { CalendarEvent } from "@/types/calendarEvent";

interface Props {
  day: string;
  date: DateTime;
  dayEvents: CalendarEvent[];
  eventsLoading?: boolean;
}

export default function Day({ day, date, dayEvents, eventsLoading }: Props) {
  if (eventsLoading) {
    return (
      <div className="flex justify-center items-center h-64 w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-l-2">
          ?
        </div>
      </div>
    );
  }
  const isToday = date.hasSame(DateTime.now(), "day");

  return (
    <div
      className={
        `relative h-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg` +
        (isToday ? " outline-1 outline-blue-500 dark:outline-sky-600" : "")
      }
    >
      <DayHeader day={day} date={date} />
      <DayEventList events={dayEvents} />
    </div>
  );
}
