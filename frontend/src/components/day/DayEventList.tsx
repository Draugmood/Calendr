import type { CalendarEvent } from "@/types/calendarEvent";
import AllDayEvents from "./AllDayEvents";
import EventBlock from "../events/EventBlock";
import { EventFunctions } from "@/utils/EventFunctions";

interface Props {
  events: CalendarEvent[];
}

export default function DayEventList({ events }: Props) {
  const allDayEvents = events.filter((event) =>
    EventFunctions.isAllDayEvent(event),
  );
  const timedEvents = events.filter(
    (event) => !EventFunctions.isAllDayEvent(event),
  );

  return (
    <div className="relative">
      <AllDayEvents events={allDayEvents} />
      {events.length > 0 &&
        timedEvents.map((event) => {
          const { top, height } = EventFunctions.calculateEventPosition(event);
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
