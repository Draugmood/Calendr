import { EventFunctions } from "@/utils/EventFunctions";

interface Props {
  event: any;
  top: number;
  height: number;
}

export default function EventBlock({ event, top, height }: Props) {
  return (
    <div
      key={event.id}
      className={`z-10 absolute left-1 right-1 text-black text-xs border border-slate-800 rounded-lg shadow-xl px-2 py-1 max-w-full ${EventFunctions.getEventColorClass(
        event,
      )}`}
      style={{
        top: `${top}px`,
        height: `${height}px`,
      }}
    >
      <strong className="truncate block w-full whitespace-nowrap overflow-hidden text-ellipsis">
        {event.summary}
      </strong>
      {!EventFunctions.isAllDayEvent(event) && (
        <span className="block">
          {EventFunctions.getFormattedTime(event.start)} -{" "}
          {EventFunctions.getFormattedTime(event.end)}
        </span>
      )}
    </div>
  );
}
