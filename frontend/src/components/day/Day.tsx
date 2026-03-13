import DayEventList from "./DayEventList";
import type { CalendarEvent } from "@/types/calendarEvent";

interface Props {
  dayEvents: CalendarEvent[];
  eventsLoading?: boolean;
  allDayEventSectionHeight: number;
}

export default function Day({
  dayEvents,
  eventsLoading,
  allDayEventSectionHeight,
}: Props) {
  if (eventsLoading) {
    return (
      <div className="flex justify-center items-center h-64 w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-l-2">
          ?
        </div>
      </div>
    );
  }

  return (
    <DayEventList
      events={dayEvents}
      allDayEventSectionHeight={allDayEventSectionHeight}
    />
  );
}
