import { useTodaysWeather } from "@/hooks/useTodaysWeather";
import { useEffect, useState } from "react";
import PeriodForecasts from "../weather/PeriodForecasts";
import WeatherDetailsModal from "../weather/WeatherDetailsModal";
import { nowInWeatherZone } from "../weather/weatherUtils";

const TOMORROW_FORECAST_CUTOFF_HOUR = 19;

export default function WeatherTile() {
  const { timeSteps, errorMessage, isLoading } = useTodaysWeather();
  const [now, setNow] = useState(nowInWeatherZone);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const showTomorrow = now.hour >= TOMORROW_FORECAST_CUTOFF_HOUR;
  const forecastDate = (showTomorrow ? now.plus({ days: 1 }) : now).startOf(
    "day",
  );
  const hasForecast = !isLoading && !errorMessage;

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(nowInWeatherZone());
    }, 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <section className="relative mt-4 flex md:h-[346px] w-full max-w-md md:min-w-96 flex-col border border-gray-600 rounded-lg p-4">
      {hasForecast && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="absolute right-3 top-3 w-8 h-8 rounded-full bg-blue-500 text-white shadow-md hover:bg-blue-600 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors flex items-center justify-center"
          aria-label="Vis detaljert værvarsel"
          title="Detaljer"
        >
          <span className="material-symbols-outlined text-xl">open_in_full</span>
        </button>
      )}
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
      {hasForecast && (
        <PeriodForecasts timeSteps={timeSteps} date={forecastDate} />
      )}
      {isModalOpen && (
        <WeatherDetailsModal
          onClose={() => setIsModalOpen(false)}
          initialDayOffset={showTomorrow ? 1 : 0}
          timeSteps={timeSteps}
        />
      )}
    </section>
  );
}
