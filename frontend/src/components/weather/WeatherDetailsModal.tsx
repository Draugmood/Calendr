import type { WeatherForecastTimeStep } from "@/hooks/useTodaysWeather";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PeriodForecasts from "./PeriodForecasts";
import WeatherIcon from "./WeatherIcon";
import {
  formatTemperature,
  getPrecipitation,
  getSymbolCode,
  nowInWeatherZone,
  stepTime,
} from "./weatherUtils";

// Only today and tomorrow for now; raise this to allow paging further ahead.
const MAX_DAY_OFFSET = 1;

interface Props {
  onClose: () => void;
  initialDayOffset: number;
  timeSteps: WeatherForecastTimeStep[];
}

function maxOf(values: (number | undefined)[]): number | undefined {
  const defined = values.filter((value) => value !== undefined);
  return defined.length > 0 ? Math.max(...defined) : undefined;
}

function minOf(values: (number | undefined)[]): number | undefined {
  const defined = values.filter((value) => value !== undefined);
  return defined.length > 0 ? Math.min(...defined) : undefined;
}

function formatNumber(value: number | undefined, unit: string): string {
  return value === undefined ? "-" : `${Math.round(value * 10) / 10} ${unit}`;
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-gray-100 dark:bg-gray-700/60 px-2 py-2">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

// Mounted only while open, so each opening starts on initialDayOffset.
export default function WeatherDetailsModal({
  onClose,
  initialDayOffset,
  timeSteps,
}: Props) {
  const [dayOffset, setDayOffset] = useState(initialDayOffset);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") setDayOffset((d) => Math.max(0, d - 1));
      if (event.key === "ArrowRight") {
        setDayOffset((d) => Math.min(MAX_DAY_OFFSET, d + 1));
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const now = nowInWeatherZone();
  const date = now.plus({ days: dayOffset }).startOf("day");
  const daySteps = timeSteps.filter((step) =>
    stepTime(step).hasSame(date, "day"),
  );
  const dayLabel = dayOffset === 0 ? "I dag" : "I morgen";

  const temperatures = daySteps.map(
    (step) => step.data.instant.details.air_temperature,
  );
  const precipitationAmounts = daySteps.map(
    (step) => getPrecipitation(step)?.precipitation_amount,
  );
  const totalPrecipitation = precipitationAmounts.some((v) => v !== undefined)
    ? precipitationAmounts.reduce<number>((sum, v) => sum + (v ?? 0), 0)
    : undefined;
  const maxWind = maxOf(daySteps.map((s) => s.data.instant.details.wind_speed));
  const maxGust = maxOf(
    daySteps.map((s) => s.data.instant.details.wind_speed_of_gust),
  );
  const maxUv = maxOf(
    daySteps.map((s) => s.data.instant.details.ultraviolet_index_clear_sky),
  );

  return createPortal(
    <div
      className="fixed inset-0 z-50 p-4 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Værvarsel ${dayLabel.toLowerCase()}`}
        className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-xl p-4 md:p-6 w-full max-w-2xl relative max-h-full md:max-h-[90vh] flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <button
            onClick={() => setDayOffset((d) => d - 1)}
            disabled={dayOffset <= 0}
            className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Forrige dag"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <div className="text-center">
            <h2 className="text-xl font-bold">{dayLabel}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {date.setLocale("nb").toFormat("cccc d. LLLL")}
            </p>
          </div>
          <button
            onClick={() => setDayOffset((d) => d + 1)}
            disabled={dayOffset >= MAX_DAY_OFFSET}
            className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Neste dag"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
        <button
          onClick={onClose}
          className="absolute -right-2 -top-2 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 shadow-md flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500"
          aria-label="Lukk"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3">
          <SummaryItem
            label="Min / maks"
            value={`${formatTemperature(minOf(temperatures))} / ${formatTemperature(maxOf(temperatures))}`}
          />
          <SummaryItem
            label="Nedbør"
            value={formatNumber(totalPrecipitation, "mm")}
          />
          <SummaryItem
            label="Vind (kast)"
            value={
              maxWind === undefined
                ? "-"
                : `${Math.round(maxWind)}${maxGust === undefined ? "" : ` (${Math.round(maxGust)})`} m/s`
            }
          />
          <SummaryItem
            label="UV-indeks"
            value={maxUv === undefined ? "-" : `${Math.round(maxUv)}`}
          />
        </div>

        <div className="flex h-36 shrink-0 mb-3">
          <PeriodForecasts timeSteps={timeSteps} date={date} />
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 -mx-2 px-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          {daySteps.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-6">
              Ingen timesvarsel for denne dagen.
            </p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {daySteps.map((step) => {
                const time = stepTime(step);
                const details = step.data.instant.details;
                const precipitation = getPrecipitation(step);
                const isCurrentHour = time.hasSame(now, "hour");
                const isPast = !isCurrentHour && time < now;

                return (
                  <li
                    key={step.time}
                    className={`grid grid-cols-[3rem_2.5rem_3rem_1fr_auto] items-center gap-2 py-1.5 px-2 rounded ${
                      isCurrentHour ? "bg-blue-100 dark:bg-gray-700" : ""
                    } ${isPast ? "opacity-50" : ""}`}
                  >
                    <span className="tabular-nums text-sm">
                      {time.toFormat("HH:mm")}
                    </span>
                    <WeatherIcon
                      symbolCode={getSymbolCode(step)}
                      className="h-9 w-9"
                    />
                    <span className="font-semibold tabular-nums">
                      {formatTemperature(details.air_temperature)}
                    </span>
                    <span className="text-sm text-blue-600 dark:text-blue-300 tabular-nums">
                      {precipitation?.precipitation_amount
                        ? `${precipitation.precipitation_amount} mm`
                        : ""}
                      {precipitation?.probability_of_precipitation
                        ? ` · ${Math.round(precipitation.probability_of_precipitation)}%`
                        : ""}
                    </span>
                    <span className="flex items-center justify-end gap-1 text-sm tabular-nums">
                      {details.wind_from_direction !== undefined && (
                        <span
                          className="material-symbols-outlined text-base"
                          style={{
                            transform: `rotate(${details.wind_from_direction + 180}deg)`,
                          }}
                          aria-hidden="true"
                        >
                          arrow_upward
                        </span>
                      )}
                      {details.wind_speed === undefined
                        ? "-"
                        : `${Math.round(details.wind_speed)} m/s`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
