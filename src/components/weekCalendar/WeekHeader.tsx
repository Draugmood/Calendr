import { useWeek } from "@/contexts/weekContext";
import { useWeekIndex } from "@/hooks/useWeekIndex";
import { DateTime } from "luxon";
import SecondaryButton from "../buttons/SecondaryButton";

export default function WeekHeader() {
  const { anchorDate, goToNextWeek, goToPreviousWeek, goToToday } = useWeek();
  const weekNumber = useWeekIndex(anchorDate);

  return (
    <div className="grid grid-cols-3 justify-center justify-items-center w-full my-4 px-12">
      {weekNumber !== DateTime.now().weekNumber ? (
        <SecondaryButton label="I dag" onClick={goToToday} />
      ) : (
        <div />
      )}
      <div className="flex items-center gap-8">
        <SecondaryButton label="Forrige" onClick={goToPreviousWeek} />

        <div className="text-4xl font-bold text-gray-800 dark:text-white">
          Uke {weekNumber}
        </div>

        <SecondaryButton label="Neste" onClick={goToNextWeek} />
      </div>
      <div />
    </div>
  );
}
