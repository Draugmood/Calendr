import { CALENDAR_LAYOUT } from "@/config/calendarLayout";
import { DateTime } from "luxon";

interface Props {
  day: string;
  date: DateTime;
}

export default function DayHeader({ day, date }: Props) {
  const isToday = date.hasSame(DateTime.now(), "day");

  return (
    <div
      className="text-center"
      style={{ minHeight: CALENDAR_LAYOUT.dayHeaderHeight }}
    >
      <span
        className={`block font-bold ${isToday ? "text-blue-500" : "text-gray-700 dark:text-gray-300"}`}
      >
        {day}
      </span>
      <span
        className={`text-sm ${isToday ? "text-blue-500 font-bold" : "text-gray-500"}`}
      >
        {date.toFormat("dd LLL")}
      </span>
    </div>
  );
}
