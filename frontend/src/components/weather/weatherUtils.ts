import type { WeatherForecastTimeStep } from "@/hooks/useTodaysWeather";
import { DateTime } from "luxon";

export const WEATHER_ZONE = "Europe/Oslo";
export const PERIODS = [
  { label: "Morgen", hour: 8 },
  { label: "Dag", hour: 13 },
  { label: "Kveld", hour: 19 },
] as const;
// Past hours we never stored should show "-" rather than a far-off forecast.
const MAX_FORECAST_DISTANCE_HOURS = 2;

export function nowInWeatherZone(): DateTime {
  return DateTime.now().setZone(WEATHER_ZONE);
}

export function stepTime(step: WeatherForecastTimeStep): DateTime {
  return DateTime.fromISO(step.time).setZone(WEATHER_ZONE);
}

export function getSymbolCode(forecast?: WeatherForecastTimeStep): string {
  return (
    forecast?.data.next_1_hours?.summary.symbol_code ??
    forecast?.data.next_6_hours?.summary.symbol_code ??
    forecast?.data.next_12_hours?.summary.symbol_code ??
    "cloudy"
  );
}

export function getPrecipitation(step: WeatherForecastTimeStep) {
  return step.data.next_1_hours?.details;
}

export function formatTemperature(temperature?: number): string {
  return temperature === undefined ? "-" : `${Math.round(temperature)}°`;
}

export function closestForecast(
  timeSteps: WeatherForecastTimeStep[],
  target: DateTime,
): WeatherForecastTimeStep | undefined {
  let closest: WeatherForecastTimeStep | undefined;
  let closestDifference = Infinity;

  for (const step of timeSteps) {
    const difference = Math.abs(
      DateTime.fromISO(step.time).diff(target).as("hours"),
    );
    if (difference < closestDifference) {
      closest = step;
      closestDifference = difference;
    }
  }

  return closestDifference <= MAX_FORECAST_DISTANCE_HOURS ? closest : undefined;
}
