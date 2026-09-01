import {
  type WeatherForecastTimeStep,
  useTodaysWeather,
} from "@/hooks/useTodaysWeather";
import { DateTime } from "luxon";
import { useEffect, useState } from "react";

const PERIODS = [
  { label: "Morgen", hour: 8 },
  { label: "Dag", hour: 13 },
  { label: "Kveld", hour: 19 },
] as const;
const TOMORROW_FORECAST_CUTOFF_HOUR = 19;
const WEATHER_ICON_BASE_URL =
  "https://cdn.jsdelivr.net/gh/metno/weathericons@latest/weather/svg";

function getSymbolCode(forecast?: WeatherForecastTimeStep): string {
  return (
    forecast?.data.next_1_hours?.summary.symbol_code ??
    forecast?.data.next_6_hours?.summary.symbol_code ??
    forecast?.data.next_12_hours?.summary.symbol_code ??
    "cloudy"
  );
}

function WeatherIcon({ symbolCode }: { symbolCode: string }) {
  return (
    <img
      src={`${WEATHER_ICON_BASE_URL}/${symbolCode}.svg`}
      alt=""
      aria-hidden="true"
      draggable={false}
      className="h-16 w-16 select-none object-contain"
    />
  );
}

function closestForecast(
  timeSteps: WeatherForecastTimeStep[],
  target: DateTime,
): WeatherForecastTimeStep | undefined {
  return timeSteps.reduce<WeatherForecastTimeStep | undefined>((closest, step) => {
    if (!closest) return step;

    const difference = Math.abs(DateTime.fromISO(step.time).diff(target).as("hours"));
    const closestDifference = Math.abs(
      DateTime.fromISO(closest.time).diff(target).as("hours"),
    );
    return difference < closestDifference ? step : closest;
  }, undefined);
}

export default function WeatherTile() {
  const { timeSteps, errorMessage, isLoading } = useTodaysWeather();
  const [now, setNow] = useState(() => DateTime.now().setZone("Europe/Oslo"));
  const showTomorrow = now.hour >= TOMORROW_FORECAST_CUTOFF_HOUR;
  const forecastDate = (showTomorrow ? now.plus({ days: 1 }) : now).startOf(
    "day",
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(DateTime.now().setZone("Europe/Oslo"));
    }, 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <section className="mt-4 flex h-[346px] w-full max-w-md min-w-96 flex-col border border-gray-600 rounded-lg p-4">
      <h2 className="mb-4 text-center text-2xl font-bold">
        {showTomorrow ? "Været i morgen" : "Dagens vær"}
      </h2>
      <p className="mb-5 text-center text-sm text-gray-500 dark:text-gray-400">
        Tolines vei, Tønsberg
      </p>
      {isLoading && (
        <p className="flex flex-1 items-center justify-center text-center">
          Henter værvarsel...
        </p>
      )}
      {errorMessage && (
        <p className="flex flex-1 items-center justify-center text-center text-red-500">
          Kunne ikke hente værvarsel.
        </p>
      )}
      {!isLoading && !errorMessage && (
        <div className="grid min-h-0 flex-1 grid-cols-3 divide-x divide-gray-600">
          {PERIODS.map((period) => {
            const forecast = closestForecast(
              timeSteps,
              forecastDate.set({ hour: period.hour }),
            );
            const temperature = forecast?.data.instant.details.air_temperature;
            const symbolCode = getSymbolCode(forecast);

            return (
              <div key={period.label} className="flex flex-col items-center justify-center gap-3">
                <span className="font-semibold">{period.label}</span>
                <WeatherIcon symbolCode={symbolCode} />
                <span className="text-2xl font-bold">
                  {temperature === undefined ? "-" : `${Math.round(temperature)}°`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}