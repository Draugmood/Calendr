import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import { useEffect, useState } from "react";

export interface WeatherForecastTimeStep {
  time: string;
  data: {
    instant: {
      details: {
        air_temperature: number;
      };
    };
    next_1_hours?: {
      summary: {
        symbol_code: string;
      };
    };
    next_6_hours?: {
      summary: {
        symbol_code: string;
      };
    };
    next_12_hours?: {
      summary: {
        symbol_code: string;
      };
    };
  };
}

interface WeatherForecastResponse {
  properties: {
    timeseries: WeatherForecastTimeStep[];
  };
}

let weatherCache: WeatherForecastTimeStep[] | null = null;
let weatherRequest: Promise<WeatherForecastTimeStep[]> | null = null;

async function loadTodaysWeather(): Promise<WeatherForecastTimeStep[]> {
  if (weatherCache) return weatherCache;
  if (weatherRequest) return weatherRequest;

  weatherRequest = fetchWithTimeout("/api/weather/today")
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Weather request failed: ${response.status}`);
      }

      const data = (await response.json()) as WeatherForecastResponse;
      weatherCache = data.properties.timeseries;
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
    async function fetchWeather() {
      try {
        setTimeSteps(await loadTodaysWeather());
        setErrorMessage(null);
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error ? error.message : "Could not load weather",
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchWeather();
  }, []);

  return { timeSteps, errorMessage, isLoading };
}