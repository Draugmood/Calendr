import { DateTimeFunctions } from "@/utils/DateTimeFunctions";
import { DateTime } from "luxon";
import { useCallback, useMemo, useState } from "react";

export function useDatesInWeek(initialAnchor: DateTime = DateTime.now()) {
  const [anchorDate, setAnchorDate] = useState<DateTime>(initialAnchor);

  const datesInWeek = useMemo(() => {
    const startDate = DateTimeFunctions.startOfWeekMonday(anchorDate);
    return Array.from({ length: 7 }, (_, i) => {
      return startDate.plus({ days: i });
    });
  }, [anchorDate]);

  const goToNextWeek = useCallback(() => {
    setAnchorDate((prev) => {
      return prev.plus({ weeks: 1 });
    });
  }, []);

  const goToPreviousWeek = useCallback(() => {
    setAnchorDate((prev) => {
      return prev.minus({ weeks: 1 });
    });
  }, []);

  const goToToday = useCallback(() => {
    setAnchorDate(DateTimeFunctions.now());
  }, []);

  return {
    anchorDate,
    setAnchorDate,
    datesInWeek,
    goToNextWeek,
    goToPreviousWeek,
    goToToday,
  };
}
