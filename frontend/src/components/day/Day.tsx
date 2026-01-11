import type { DateTime } from "luxon";
import DayEventList from "./DayEventList";
import DayHeader from "./DayHeader";
import type { CalendarEvent } from "@/types/calendarEvent";

interface Props {
  day: string;
  date: DateTime;
  dayEvents: CalendarEvent[];
}

export default function Day({ day, date, dayEvents }: Props) {
  return (
    <div className="relative h-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg">
      <DayHeader day={day} date={date} />
      <DayEventList events={dayEvents} />
    </div>
  );
}
