import { EQUITY_CURVE_WINDOW_DAYS } from "@/lib/constants";

export function parseBrokerNumber(
  value: string | number | null | undefined,
): number | null {
  if (value == null || value === "") {
    return null;
  }
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function formatUsd(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatSignedUsd(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  const formatted = formatUsd(Math.abs(value));
  if (value > 0) {
    return `+${formatted}`;
  }
  if (value < 0) {
    return `−${formatted}`;
  }
  return formatted;
}

export function formatQty(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
  }).format(value);
}

export function formatPct(
  value: number | null | undefined,
  digits = 2,
): string {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(digits)}%`;
}

export type PnlTone = "up" | "down" | "flat";

export function pnlTone(value: number | null | undefined): PnlTone {
  if (value == null || Number.isNaN(value) || value === 0) {
    return "flat";
  }
  return value > 0 ? "up" : "down";
}

export function pnlClass(value: number | null | undefined): string {
  const tone = pnlTone(value);
  switch (tone) {
    case "up":
      return "text-emerald-400";
    case "down":
      return "text-rose-400";
    case "flat":
      return "text-muted-foreground";
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

export const ET_TIME_ZONE = "America/New_York";

/** Friendly blotter timestamp in Eastern Time (en-US, America/New_York). */
export function formatDeskDay(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: ET_TIME_ZONE,
  }).format(date);
}

const ISO_CALENDAR_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;

export type EtDateFormat = "full" | "short" | "weekday";

const etDateFull = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: ET_TIME_ZONE,
});

const etDateShort = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: ET_TIME_ZONE,
});

const etDateWeekday = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: ET_TIME_ZONE,
});

const etDateYear = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  timeZone: ET_TIME_ZONE,
});

/**
 * Calendar date written in an ISO value, as an instant that stays on that
 * civil day in America/New_York. Date-only strings (`2026-11-15`) are not
 * parsed as UTC midnight — that rolls back to the previous ET evening.
 * Full timestamps use the YYYY-MM-DD prefix so a clock end like
 * `2026-11-15T04:00:00.000Z` (Nov 14 11pm EST after the fall-back) still
 * labels as Nov 15, matching the UTC date the desk already used.
 */
function instantForWrittenIsoDate(
  iso: string | null | undefined,
): Date | null {
  const raw = iso?.trim() ?? "";
  if (!raw) {
    return null;
  }
  const match = ISO_CALENDAR_DATE_RE.exec(raw);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = Date.UTC(year, month - 1, day);
  const check = new Date(utc);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return new Date(noonUtcForDateKey(`${match[1]}-${match[2]}-${match[3]}`));
}

export function formatEtDate(
  iso: string | null | undefined,
  format: EtDateFormat = "full",
): string {
  const instant = instantForWrittenIsoDate(iso);
  if (!instant) {
    return "—";
  }
  switch (format) {
    case "full":
      return etDateFull.format(instant);
    case "short":
      return etDateShort.format(instant);
    case "weekday":
      return etDateWeekday.format(instant);
    default: {
      const _exhaustive: never = format;
      return _exhaustive;
    }
  }
}

export function formatEtDateRange(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
): string {
  const start = instantForWrittenIsoDate(startIso);
  const end = instantForWrittenIsoDate(endIso);
  if (!start || !end) {
    return "—";
  }
  const startYear = etDateYear.format(start);
  const endYear = etDateYear.format(end);
  if (startYear === endYear) {
    return `${etDateShort.format(start)} → ${etDateShort.format(end)}, ${endYear} ET`;
  }
  return `${etDateShort.format(start)}, ${startYear} → ${etDateShort.format(end)}, ${endYear} ET`;
}

export function etCalendarDateKey(t: number): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ET_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(t));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    return "";
  }
  return `${year}-${month}-${day}`;
}

export function addCalendarDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) {
    return dateKey;
  }
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function noonUtcForDateKey(dateKey: string): number {
  return Date.parse(`${dateKey}T12:00:00.000Z`);
}

/**
 * Alpaca 1D bars are timestamped at 00:00 UTC. The noon-UTC pin used for ET
 * labels makes the session date the UTC Y-M-D (noon UTC is still morning ET).
 */
export function brokerSessionDateKey(t: number): string {
  const date = new Date(t);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  date.setUTCHours(12, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

export function equityCurveWindow(
  now = Date.now(),
  windowDays = EQUITY_CURVE_WINDOW_DAYS,
): {
  startKey: string;
  endKey: string;
  startMs: number;
  endMs: number;
  ticks: number[];
} {
  const endKey = etCalendarDateKey(now);
  const startKey = addCalendarDays(endKey, -(windowDays - 1));
  const startMs = noonUtcForDateKey(startKey);
  const endMs = noonUtcForDateKey(endKey);
  const ticks: number[] = [];
  const step = 5;
  for (
    let key = startKey;
    key < endKey;
    key = addCalendarDays(key, step)
  ) {
    ticks.push(noonUtcForDateKey(key));
  }
  ticks.push(endMs);
  return { startKey, endKey, startMs, endMs, ticks };
}

export function equityCurveTicks(startKey: string, endKey: string): number[] {
  if (!startKey || !endKey || startKey > endKey) {
    return [];
  }
  let days = 1;
  for (let key = startKey; key < endKey; key = addCalendarDays(key, 1)) {
    days += 1;
  }
  const step = days <= 8 ? 1 : days <= 40 ? 5 : days <= 100 ? 14 : 28;
  const ticks: number[] = [];
  for (let key = startKey; key < endKey; key = addCalendarDays(key, step)) {
    ticks.push(noonUtcForDateKey(key));
  }
  ticks.push(noonUtcForDateKey(endKey));
  return ticks;
}

/**
 * Alpaca 1D portfolio-history bars are timestamped at 00:00 UTC for that
 * calendar date. Formatting that instant in America/New_York (the desk clock)
 * rolls back to the previous evening — 2026-09-19T00:00:00Z is Sep 18 8:00 PM
 * EDT. Pin the instant to noon UTC on the same UTC Y-M-D so ET labels match
 * the bar's intended session date (Sep 19).
 */
export function formatEquityCurveDate(t: number): string {
  const date = new Date(t);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  date.setUTCHours(12, 0, 0, 0);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: ET_TIME_ZONE,
  });
}

