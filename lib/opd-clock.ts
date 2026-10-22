import { ET_TIME_ZONE, etCalendarDateKey } from "@/lib/format";

export type EtClockParts = {
  weekday: string;
  hour: number;
  minute: number;
  dateKey: string;
};

export function etClockParts(now: number): EtClockParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ET_TIME_ZONE,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(now));

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const hour = Number(read("hour"));
  const minute = Number(read("minute"));
  const year = read("year");
  const month = read("month");
  const day = read("day");

  return {
    weekday: read("weekday"),
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number.isFinite(minute) ? minute : 0,
    dateKey: year && month && day ? `${year}-${month}-${day}` : etCalendarDateKey(now),
  };
}

export function isWeekendEt(now: number): boolean {
  const weekday = etClockParts(now).weekday;
  return weekday === "Sat" || weekday === "Sun";
}

/** Regular-hours close is 4:00 PM ET. Weekends are after Friday's close. */
export function isAfterEtClose(now: number): boolean {
  if (isWeekendEt(now)) {
    return true;
  }
  const { hour, minute } = etClockParts(now);
  return hour > 16 || (hour === 16 && minute >= 0);
}

/** RTH: weekday 9:30 AM–4:00 PM ET. */
export function isEtMarketHours(now: number): boolean {
  if (isWeekendEt(now)) {
    return false;
  }
  const { hour, minute } = etClockParts(now);
  const mins = hour * 60 + minute;
  return mins >= 9 * 60 + 30 && mins < 16 * 60;
}
