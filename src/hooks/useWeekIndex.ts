import { DateTime } from "luxon";
import { useMemo } from "react";

export function getCurrentWeekIndex(date: DateTime = DateTime.now()): number {
  return date.weekNumber;
}

export function useWeekIndex(date: DateTime = DateTime.now()): number {
  const time = date.toMillis();
  return useMemo(() => getCurrentWeekIndex(date), [time]);
}
