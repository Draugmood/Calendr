export type ChorePriority = 1 | 2 | 3;

export interface Chore {
  id: number;
  title: string;
  frequency_days: number;
  priority: ChorePriority;
  created_at: string;
  last_completed_at_utc: string | null;
}

export interface ChorePayload {
  title: string;
  frequency_days: number;
  priority: ChorePriority;
}

export const PRIORITY_WEIGHTS: Record<ChorePriority, number> = {
  1: 1,
  2: 1.5,
  3: 2,
};

export const PRIORITY_LABELS: Record<ChorePriority, string> = {
  1: "Lav",
  2: "Normal",
  3: "Høy",
};
