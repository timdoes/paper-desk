import { addCalendarDays, etCalendarDateKey } from "@/lib/format";

export type OptionRight = "C" | "P";

export type ParsedOccSymbol = {
  symbol: string;
  underlying: string;
  expiry: string;
  right: OptionRight;
  strike: number;
};

const OCC_RE = /^([A-Z]{1,6})(\d{2})(\d{2})(\d{2})([CP])(\d{8})$/;

export function parseOccSymbol(
  symbol: string | null | undefined,
): ParsedOccSymbol | null {
  const raw = symbol?.trim().toUpperCase().replace(/\s+/g, "") ?? "";
  if (!raw) {
    return null;
  }
  const match = OCC_RE.exec(raw);
  if (!match) {
    return null;
  }
  const year = 2000 + Number(match[2]);
  const month = Number(match[3]);
  const day = Number(match[4]);
  const right = match[5] as OptionRight;
  const strike = Number(match[6]) / 1000;
  if (
    !Number.isFinite(year) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    !Number.isFinite(strike) ||
    strike <= 0
  ) {
    return null;
  }
  const expiry = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return {
    symbol: raw,
    underlying: match[1]!,
    expiry,
    right,
    strike,
  };
}

export function calendarDaysBetween(startKey: string, endKey: string): number {
  if (!startKey || !endKey) {
    return 0;
  }
  const start = Date.parse(`${startKey}T12:00:00.000Z`);
  const end = Date.parse(`${endKey}T12:00:00.000Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 0;
  }
  return Math.round((end - start) / 86_400_000);
}

export function optionDte(expiry: string, now: number): number {
  return calendarDaysBetween(etCalendarDateKey(now), expiry);
}

export function addExpiryDays(expiry: string, days: number): string {
  return addCalendarDays(expiry, days);
}
