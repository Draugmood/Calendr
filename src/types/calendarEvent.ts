export interface CalendarEvent {
  id: string;
  summary: string;
  source?: string;
  colorId?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}
