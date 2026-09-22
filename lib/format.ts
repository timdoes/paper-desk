import type { HistoryPoint } from "@/lib/types";

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
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const EQUITY_CURVE_TIME_ZONE = "America/New_York";

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
    timeZone: EQUITY_CURVE_TIME_ZONE,
  });
}

/** Drop leading $0 bars so the curve starts on the first funded session day. */
export function skipLeadingZeroEquity(points: HistoryPoint[]): HistoryPoint[] {
  const firstFunded = points.findIndex((point) => point.equity !== 0);
  return firstFunded <= 0 ? points : points.slice(firstFunded);
}
