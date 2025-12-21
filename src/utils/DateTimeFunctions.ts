import { DateTime } from "luxon";

export const DEFAULT_ZONE = DateTime.local().zoneName;

export class DateTimeFunctions {
  static now(zone: string = DEFAULT_ZONE): DateTime {
    return DateTime.now().setZone(zone);
  }

  static fromDate(date: Date, zone: string = DEFAULT_ZONE): DateTime {
    return DateTime.fromJSDate(date).setZone(zone);
  }

  static toDate(dateTime: DateTime): Date {
    return dateTime.toJSDate();
  }

  static toDateKey(dateTime: DateTime, zone: string = DEFAULT_ZONE): string {
    return dateTime.setZone(zone).toFormat("yyyy-LL-dd");
  }

  static startOfWeekMonday(
    dateTime: DateTime,
    zone: string = DEFAULT_ZONE,
  ): DateTime {
    return dateTime.setZone(zone).startOf("week");
  }
}
