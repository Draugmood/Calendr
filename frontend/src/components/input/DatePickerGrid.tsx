import { DateTime, Info, Interval } from "luxon";
import { useState } from "react";

const LOCALE = "nb";
const WEEKDAY_LABELS = Info.weekdays("short", { locale: LOCALE });

interface Props {
  /** Selected date as yyyy-MM-dd, or "". */
  value: string;
  /** Earliest selectable date as yyyy-MM-dd. */
  minDate: string;
  onSelect: (isoDate: string) => void;
}

export default function DatePickerGrid({ value, minDate, onSelect }: Props) {
  const [month, setMonth] = useState(() =>
    (value ? DateTime.fromISO(value) : DateTime.now()).startOf("month"),
  );
  const today = DateTime.now().toISODate();
  const days = Interval.fromDateTimes(
    month.startOf("week"),
    month.endOf("month").endOf("week"),
  )
    .splitBy({ days: 1 })
    .map((interval) => interval.start!);
  const monthLabel = month.setLocale(LOCALE).toFormat("LLLL yyyy");
  const canGoBack = month > DateTime.fromISO(minDate).startOf("month");

  return (
    <div className="rounded-lg border border-gray-500/50 p-3 select-none">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth((current) => current.minus({ months: 1 }))}
          disabled={!canGoBack}
          className="rounded p-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-default"
          aria-label="Forrige måned"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <span className="font-semibold first-letter:uppercase">{monthLabel}</span>
        <button
          type="button"
          onClick={() => setMonth((current) => current.plus({ months: 1 }))}
          className="rounded p-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700"
          aria-label="Neste måned"
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="text-xs text-gray-500 dark:text-gray-400">
            {label}
          </span>
        ))}
        {days.map((day) => {
          const isoDate = day.toISODate()!;
          const isSelected = isoDate === value;
          const isDisabled = isoDate < minDate;
          const isOutsideMonth = !day.hasSame(month, "month");

          return (
            <button
              key={isoDate}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelect(isoDate)}
              className={`h-11 rounded cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-default ${
                isSelected
                  ? "bg-cyan-600 text-stone-950 font-semibold"
                  : "hover:bg-gray-200 dark:hover:bg-zinc-700"
              } ${isOutsideMonth && !isSelected ? "text-gray-400 dark:text-gray-500" : ""} ${
                isoDate === today && !isSelected ? "ring-1 ring-cyan-600" : ""
              }`}
            >
              {day.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
