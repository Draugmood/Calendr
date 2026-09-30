import { segmentClass } from "@/components/buttons/segmentClass";
import { DateTime } from "luxon";
import { useState } from "react";
import DatePickerGrid from "./DatePickerGrid";
import TextInput from "./TextInput";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const TIME_PRESETS = ["08:00", "12:00", "18:00"] as const;

/** Keep digits only and insert the colon once the minutes start: "0830" -> "08:30". */
function formatTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
}

interface Props {
  /** Initial value as a local yyyy-MM-ddTHH:mm string, or "". */
  defaultValue?: string;
  /** Receives yyyy-MM-ddTHH:mm once both date and a valid time are set, otherwise "". */
  onChange: (value: string) => void;
  allowClear?: boolean;
}

export default function DateTimeField({ defaultValue = "", onChange, allowClear }: Props) {
  const [date, setDate] = useState(defaultValue.slice(0, 10));
  const [time, setTime] = useState(defaultValue.slice(11, 16));
  const [isPickingDate, setIsPickingDate] = useState(false);

  const now = DateTime.now();
  const today = now.toISODate()!;
  const tomorrow = now.plus({ days: 1 }).toISODate()!;
  const isOtherDate = date !== "" && date !== today && date !== tomorrow;
  const isTimeInvalid = time.length === 5 && !TIME_PATTERN.test(time);

  const update = (nextDate: string, nextTime: string) => {
    setDate(nextDate);
    setTime(nextTime);
    onChange(nextDate && TIME_PATTERN.test(nextTime) ? `${nextDate}T${nextTime}` : "");
  };

  const selectDate = (isoDate: string) => {
    setIsPickingDate(false);
    update(isoDate, time);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={segmentClass(date === today)}
          onClick={() => selectDate(today)}
        >
          I dag
        </button>
        <button
          type="button"
          className={segmentClass(date === tomorrow)}
          onClick={() => selectDate(tomorrow)}
        >
          I morgen
        </button>
        <button
          type="button"
          className={segmentClass(isOtherDate || isPickingDate)}
          onClick={() => setIsPickingDate((current) => !current)}
        >
          {isOtherDate
            ? DateTime.fromISO(date).setLocale("nb").toFormat("ccc d. LLL")
            : "Velg dato…"}
        </button>
        {allowClear && (date || time) && (
          <button
            type="button"
            className="rounded px-2 py-1.5 text-sm cursor-pointer text-gray-500 hover:bg-gray-200 dark:hover:bg-zinc-700"
            onClick={() => {
              setIsPickingDate(false);
              update("", "");
            }}
          >
            Fjern
          </button>
        )}
      </div>

      {isPickingDate && (
        <DatePickerGrid value={date} minDate={today} onSelect={selectDate} />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <TextInput
          className={`w-24 text-center ${isTimeInvalid ? "border-red-500!" : ""}`}
          layout="numeric"
          value={time}
          onChange={(value) => update(date, formatTimeInput(value))}
          placeholder="TT:MM"
        />
        {TIME_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className={segmentClass(time === preset)}
            onClick={() => update(date, preset)}
          >
            {preset}
          </button>
        ))}
        {isTimeInvalid && (
          <span className="text-sm text-red-500">Ugyldig klokkeslett</span>
        )}
      </div>
    </div>
  );
}
