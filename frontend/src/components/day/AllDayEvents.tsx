import { CALENDAR_LAYOUT } from "@/config/calendarLayout";
import type { CalendarEvent } from "@/types/calendarEvent";
import EventBlock from "../events/EventBlock";
import { useEffect, useState } from "react";

interface Props {
  events: CalendarEvent[];
}

export default function AllDayEvents({ events }: Props) {
  const [index, setIndex] = useState(0);

  const displayEvents = events.length === 2 ? [...events, ...events] : events;
  const N = displayEvents.length;

  useEffect(() => {
    if (events.length <= 1) {
      return;
    }

    const intervalId = setInterval(() => {
      setIndex((previous) => (previous + 1) % N);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [events.length, N]);

  if (events.length === 0) {
    return null;
  }
  if (events.length === 1) {
    return (
      <EventBlock
        event={events[0]}
        top={10}
        height={CALENDAR_LAYOUT.hourHeightPx / 2}
      />
    );
  }

  return (
    <div
      className="absolute left-0 right-0 overflow-hidden pointer-events-none"
      style={{
        top: 0,
        height: `${CALENDAR_LAYOUT.hourHeightPx / 2 + 20}px`,
      }}
    >
      {displayEvents.map((event, i) => {
        const uniqueKey = events.length === 2 ? `${event.id}-${i}` : event.id;

        return (
          <div
            key={uniqueKey}
            className={`absolute inset-0 w-full h-full ${getSlideClasses(
              i,
              index,
              N,
            )}`}
          >
            <div className="relative w-full h-full pointer-events-auto">
              <EventBlock
                event={event}
                top={10}
                height={CALENDAR_LAYOUT.hourHeightPx / 2}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

const getSlideClasses = (i: number, currentIndex: number, total: number) => {
  const diff = mod(i - currentIndex, total);

  if (diff === 0) {
    // Current active item
    return "translate-x-0 transition-transform duration-700 ease-in-out z-20 opacity-100";
  }
  if (diff === total - 1) {
    // Previous item (sliding out left)
    return "-translate-x-full transition-transform duration-700 ease-in-out z-10 opacity-100";
  }
  if (diff === 1) {
    // Next item (waiting on right)
    return "translate-x-full transition-none z-10 opacity-100";
  }

  // Others (hidden/reset)
  return "translate-x-full transition-none z-0 opacity-0";
};
