export const CALENDAR_LAYOUT = {
  hourHeightPx: 60,
  gridStartHour: 6,
  gridEndHour: 25,

  // Matches Tailwind `h-16` used by DayHeader and time gutter spacer.
  headerHeightPx: 64,
} as const;

export function hoursInGrid() {
  return CALENDAR_LAYOUT.gridEndHour - CALENDAR_LAYOUT.gridStartHour;
}
