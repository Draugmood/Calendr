import type { CalendarEvent } from "@/types/calendarEvent";
import EventBlock from "../events/EventBlock";
import { EventFunctions } from "@/utils/EventFunctions";
import { CALENDAR_LAYOUT } from "@/config/calendarLayout";

interface Props {
  events: CalendarEvent[];
  allDayEventSectionHeight: number;
}

export default function DayEventList({
  events,
  allDayEventSectionHeight,
}: Props) {
  const endHour = CALENDAR_LAYOUT.gridEndHour;
  const startHour = CALENDAR_LAYOUT.gridStartHour;
  const hourHeight = CALENDAR_LAYOUT.hourHeightPx;

  const totalGridHeight = (endHour - startHour) * hourHeight;

  return (
    <div
      className="relative rounded-sm bg-gray-700"
      style={{ height: `${totalGridHeight}px` }}
    >
      {events.length > 0 &&
        events.map((event) => {
          const { top, height } = EventFunctions.calculateEventPosition(
            event,
            allDayEventSectionHeight,
          );
          return (
            <EventBlock
              key={event.id}
              event={event}
              top={top}
              height={height}
            />
          );
        })}
    </div>
  );
}
