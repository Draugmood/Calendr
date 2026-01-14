export const CALENDAR_LAYOUT = {
  hourHeightPx: 60,
  gridStartHour: 6,
  gridEndHour: 25,

  headerHeightPx: 60,
} as const;

export function hoursInGrid() {
  return CALENDAR_LAYOUT.gridEndHour - CALENDAR_LAYOUT.gridStartHour;
}
