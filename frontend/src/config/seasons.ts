import { DateTime } from "luxon";

export type SeasonId =
  | "halloween"
  | "christmas"
  | "newYear"
  | "valentines"
  | "easter"
  | "constitutionDay";

export interface Season {
  id: SeasonId;
  label: string;
  emoji: string;
  isActive: (date: DateTime) => boolean;
}

// Inclusive window of fixed calendar dates. Wraps over new year when `from` is after `to`.
function between(fromMonth: number, fromDay: number, toMonth: number, toDay: number) {
  const from = fromMonth * 100 + fromDay;
  const to = toMonth * 100 + toDay;
  return (date: DateTime) => {
    const value = date.month * 100 + date.day;
    return from <= to ? value >= from && value <= to : value >= from || value <= to;
  };
}

// Easter Sunday for a Gregorian year (Anonymous Gregorian algorithm).
export function easterSunday(year: number): DateTime {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return DateTime.local(year, month, day);
}

// Påskeuka: Palm Sunday through Easter Monday.
function easterWeek(date: DateTime) {
  const easter = easterSunday(date.year);
  const day = date.startOf("day");
  return day >= easter.minus({ days: 7 }) && day <= easter.plus({ days: 1 });
}

// First match wins, so put narrow windows before broad ones.
export const SEASONS: Season[] = [
  { id: "newYear", label: "Godt nyttår", emoji: "🎆", isActive: between(12, 31, 1, 1) },
  { id: "christmas", label: "God jul", emoji: "🎄", isActive: between(12, 1, 12, 30) },
  { id: "valentines", label: "Valentinsdag", emoji: "💕", isActive: between(2, 13, 2, 14) },
  { id: "easter", label: "God påske", emoji: "🐣", isActive: easterWeek },
  { id: "constitutionDay", label: "Hipp hurra", emoji: "🇳🇴", isActive: between(5, 15, 5, 17) },
  { id: "halloween", label: "Halloween", emoji: "🎃", isActive: between(10, 15, 10, 31) },
];

export function seasonById(id: string | null | undefined): Season | undefined {
  return SEASONS.find((season) => season.id === id);
}

export function activeSeason(date: DateTime = DateTime.local()): Season | undefined {
  return SEASONS.find((season) => season.isActive(date));
}
