import { DateTime } from "luxon";

interface Props {
  day: string;
  date: DateTime;
}

export default function DayHeader({ day, date }: Props) {
  const isToday = date.hasSame(DateTime.now(), "day");

  return (
    <div
      className={
        `font-bold text-center` +
        (isToday
          ? " text-blue-500 dark:text-sky-600"
          : " text-gray-700 dark:text-gray-300")
      }
    >
      {day}
      <br />
      {date.toFormat("dd LLL")}
    </div>
  );
}
