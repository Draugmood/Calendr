import type { WeatherForecastTimeStep } from "@/hooks/useTodaysWeather";
import type { DateTime } from "luxon";
import WeatherIcon from "./WeatherIcon";
import {
  closestForecast,
  formatTemperature,
  getSymbolCode,
  PERIODS,
} from "./weatherUtils";

export default function PeriodForecasts({
  timeSteps,
  date,
}: {
  timeSteps: WeatherForecastTimeStep[];
  date: DateTime;
}) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-3 divide-x divide-gray-600">
      {PERIODS.map((period) => {
        const forecast = closestForecast(
          timeSteps,
          date.set({ hour: period.hour }),
        );

        return (
          <div
            key={period.label}
            className="flex flex-col items-center justify-center gap-3"
          >
            <span className="font-semibold">{period.label}</span>
            <WeatherIcon symbolCode={getSymbolCode(forecast)} />
            <span className="text-2xl font-bold">
              {formatTemperature(forecast?.data.instant.details.air_temperature)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
