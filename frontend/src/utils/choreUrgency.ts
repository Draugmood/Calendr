import { type Chore, PRIORITY_WEIGHTS } from "@/types/chore";
import { DateTime } from "luxon";

export interface ChoreUrgency {
  ratio: number;
  score: number;
  dueAt: DateTime | null;
  isOverdue: boolean;
}

export function getChoreUrgency(chore: Chore, now: DateTime): ChoreUrgency {
  const weight = PRIORITY_WEIGHTS[chore.priority];

  // A chore that has never been done counts as exactly due.
  if (!chore.last_completed_at_utc) {
    return { ratio: 1, score: weight, dueAt: null, isOverdue: true };
  }

  const lastDone = DateTime.fromISO(chore.last_completed_at_utc);
  const elapsedDays = Math.max(0, now.diff(lastDone).as("days"));
  const ratio = elapsedDays / chore.frequency_days;

  return {
    ratio,
    score: weight * ratio,
    dueAt: lastDone.plus({ days: chore.frequency_days }),
    isOverdue: ratio >= 1,
  };
}

export interface RankedChore {
  chore: Chore;
  urgency: ChoreUrgency;
}

export function sortChoresByUrgency(
  chores: Chore[],
  now: DateTime,
): RankedChore[] {
  return chores
    .map((chore) => ({ chore, urgency: getChoreUrgency(chore, now) }))
    .sort((a, b) => {
      if (b.urgency.score !== a.urgency.score) {
        return b.urgency.score - a.urgency.score;
      }
      const aDue = a.urgency.dueAt?.toMillis() ?? -Infinity;
      const bDue = b.urgency.dueAt?.toMillis() ?? -Infinity;
      return aDue - bDue;
    });
}

export function formatDueText(urgency: ChoreUrgency, now: DateTime): string {
  if (!urgency.dueAt) return "Aldri gjort";

  const dayDiff = Math.round(
    urgency.dueAt.startOf("day").diff(now.startOf("day"), "days").days,
  );

  if (dayDiff === 0) return "Forfaller i dag";
  if (dayDiff === 1) return "Forfaller i morgen";
  if (dayDiff === -1) return "Forfalt i går";
  if (dayDiff > 1) return `Forfaller om ${dayDiff} dager`;
  return `Forfalt for ${-dayDiff} dager siden`;
}

export function formatFrequency(frequencyDays: number): string {
  if (frequencyDays === 1) return "Hver dag";
  if (frequencyDays === 7) return "Hver uke";
  if (frequencyDays === 14) return "Annenhver uke";
  if (frequencyDays === 30) return "Hver måned";
  if (frequencyDays === 90) return "Hvert kvartal";
  if (frequencyDays % 7 === 0) return `Hver ${frequencyDays / 7}. uke`;
  return `Hver ${frequencyDays}. dag`;
}
