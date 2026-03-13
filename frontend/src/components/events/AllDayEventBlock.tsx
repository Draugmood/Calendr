import type { CalendarEvent } from "@/types/calendarEvent";
import { EventFunctions } from "@/utils/EventFunctions";
import type { DateTime } from "luxon";

interface Props {
  event: CalendarEvent;
  weekStartDate: DateTime;
  weekEndDate: DateTime;
  rowIndex?: number;
}

export default function AllDayEventBlock({
  event,
  weekStartDate,
  weekEndDate,
  rowIndex,
}: Props) {
  const style = EventFunctions.getAllDayEventStyle(
    event,
    weekStartDate,
    weekEndDate,
  );

  return (
    <div
      style={{
        ...style,
        gridRow: rowIndex !== undefined ? rowIndex + 1 : undefined,
      }}
      className={`rounded px-2 py-1 text-xs text-left truncate text-black font-bold mb-1 shadow-sm ${EventFunctions.getEventColorClass(event)}`}
      title={event.summary}
    >
      {event.summary}
    </div>
  );
}
