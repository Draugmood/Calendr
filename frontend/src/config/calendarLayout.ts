export const CALENDAR_LAYOUT = {
  hourHeightPx: 64,
  gridStartHour: 6,
  gridEndHour: 25,

  dayHeaderHeight: 48,
  initialSpacing: 64,
} as const;

export function hoursInGrid() {
  return CALENDAR_LAYOUT.gridEndHour - CALENDAR_LAYOUT.gridStartHour;
}
