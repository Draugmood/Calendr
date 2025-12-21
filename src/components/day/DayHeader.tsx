import type { DateTime } from "luxon";

interface Props {
  day: string;
  date: DateTime;
}

export default function DayHeader({ day, date }: Props) {
  return (
    <div className="font-bold text-center text-gray-700 dark:text-gray-300">
      {day}
      <br />
      {date.toFormat("dd LLL")}
    </div>
  );
}
