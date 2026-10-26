import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import { useEffect, useState } from "react";

interface WeatherPeriodDetails {
  precipitation_amount?: number;
  probability_of_precipitation?: number;
  air_temperature_min?: number;
  air_temperature_max?: number;
}

interface WeatherPeriodForecast {
  summary: {
    symbol_code: string;
  };
  details?: WeatherPeriodDetails;
}

export interface WeatherForecastTimeStep {
  time: string;
  data: {
    instant: {
      details: {
        air_temperature: number;
        wind_speed?: number;
        wind_from_direction?: number;
        wind_speed_of_gust?: number;
        relative_humidity?: number;
        cloud_area_fraction?: number;
        air_pressure_at_sea_level?: number;
        ultraviolet_index_clear_sky?: number;
      };
    };
    next_1_hours?: WeatherPeriodForecast;
    next_6_hours?: WeatherPeriodForecast;
    next_12_hours?: WeatherPeriodForecast;
  };
}

interface WeatherForecastResponse {
  properties: {
    timeseries: WeatherForecastTimeStep[];
  };
}

const WEATHER_MAX_AGE_MS = 15 * 60 * 1000;
const WEATHER_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

let weatherCache: WeatherForecastTimeStep[] | null = null;
let weatherFetchedAt = 0;
let weatherRequest: Promise<WeatherForecastTimeStep[]> | null = null;

function isWeatherCacheFresh(): boolean {
  return (
    weatherCache !== null && Date.now() - weatherFetchedAt < WEATHER_MAX_AGE_MS
  );
}

async function loadTodaysWeather(): Promise<WeatherForecastTimeStep[]> {
  if (weatherCache && isWeatherCacheFresh()) return weatherCache;
  if (weatherRequest) return weatherRequest;

  weatherRequest = fetchWithTimeout("/api/weather/today")
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Weather request failed: ${response.status}`);
      }

      const data = (await response.json()) as WeatherForecastResponse;
      weatherCache = data.properties.timeseries;
      weatherFetchedAt = Date.now();
      return weatherCache;
    })
    .finally(() => {
      weatherRequest = null;
    });

  return weatherRequest;
}

export function prefetchTodaysWeather(): Promise<void> {
  return loadTodaysWeather().then(() => undefined);
}

export function useTodaysWeather() {
  const [timeSteps, setTimeSteps] = useState<WeatherForecastTimeStep[]>(
    () => weatherCache ?? [],
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(() => weatherCache === null);

  useEffect(() => {
    let isActive = true;

    async function fetchWeather() {
      try {
        const nextTimeSteps = await loadTodaysWeather();
        if (!isActive) return;
        setTimeSteps(nextTimeSteps);
        setErrorMessage(null);
      } catch (error: unknown) {
        if (!isActive) return;
        // Keep showing the previous forecast if a background refresh fails.
        if (weatherCache) {
          console.warn("Background weather refresh failed:", error);
        } else {
          setErrorMessage(
            error instanceof Error ? error.message : "Could not load weather",
          );
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && !isWeatherCacheFresh()) {
        void fetchWeather();
      }
    }

    void fetchWeather();
    const intervalId = window.setInterval(
      () => void fetchWeather(),
      WEATHER_REFRESH_INTERVAL_MS,
    );
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return { timeSteps, errorMessage, isLoading };
}