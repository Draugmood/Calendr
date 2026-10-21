import { useWeek } from "@/contexts/WeekContext";
import { useWeekIndex } from "@/hooks/useWeekIndex";
import { DateTime } from "luxon";
import type { ReactNode } from "react";

const ICON_BUTTON_CLASS =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded border border-gray-300 dark:border-gray-700 cursor-pointer";

interface Props {
  /** Rendered at the right edge, opposite the "I dag" button. */
  trailing?: ReactNode;
}

export default function MobileWeekHeader({ trailing }: Props) {
  const { anchorDate, goToNextWeek, goToPreviousWeek, goToToday } = useWeek();
  const weekNumber = useWeekIndex(anchorDate);

  return (
    <div className="my-3 flex w-full items-center justify-between gap-2">
      {weekNumber !== DateTime.now().weekNumber ? (
        <button
          type="button"
          onClick={goToToday}
          className={ICON_BUTTON_CLASS}
          aria-label="I dag"
          title="I dag"
        >
          <span className="material-symbols-outlined">today</span>
        </button>
      ) : (
        <div className="w-10 shrink-0" />
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={goToPreviousWeek}
          className={ICON_BUTTON_CLASS}
          aria-label="Forrige uke"
          title="Forrige"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <div className="min-w-max text-2xl font-bold text-gray-800 dark:text-white">
          Uke {weekNumber}
        </div>
        <button
          type="button"
          onClick={goToNextWeek}
          className={ICON_BUTTON_CLASS}
          aria-label="Neste uke"
          title="Neste"
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>

      {trailing ?? <div className="w-10 shrink-0" />}
    </div>
  );
}
