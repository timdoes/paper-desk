import {
  EQUITY_CURVE_MIN_HALF_SPAN,
  EQUITY_CURVE_PAD_RATIO,
  EQUITY_CURVE_WEEK_DAYS,
  EQUITY_CURVE_WINDOW_DAYS,
} from "@/lib/constants";
import { deskStartEtDateKey } from "@/lib/desk";
import {
  addCalendarDays,
  equityCurveTicks,
  etCalendarDateKey,
} from "@/lib/format";

export { equityCurveTicks };
import type { HistoryPoint } from "@/lib/types";

export const EQUITY_CURVE_RANGES = ["1W", "1M", "TEST", "ALL"] as const;
export type EquityCurveRange = (typeof EQUITY_CURVE_RANGES)[number];

export const DEFAULT_EQUITY_CURVE_RANGE: EquityCurveRange = "TEST";

export function equityCurveRangeStartKey(
  range: EquityCurveRange,
  options: {
    endKey: string;
    testStartKey: string | null;
    firstPointKey: string | null;
  },
): string | null {
  switch (range) {
    case "1W":
      return addCalendarDays(options.endKey, -(EQUITY_CURVE_WEEK_DAYS - 1));
    case "1M":
      return addCalendarDays(options.endKey, -(EQUITY_CURVE_WINDOW_DAYS - 1));
    case "TEST":
      return options.testStartKey ?? options.firstPointKey;
    case "ALL":
      return options.firstPointKey;
    default: {
      const _exhaustive: never = range;
      return _exhaustive;
    }
  }
}

export function sliceEquityCurvePoints(
  points: HistoryPoint[],
  range: EquityCurveRange,
  options: {
    startIso?: string | null;
  } = {},
): HistoryPoint[] {
  if (points.length === 0) {
    return [];
  }
  const firstPointKey = etCalendarDateKey(points[0]!.t);
  const endKey = etCalendarDateKey(points[points.length - 1]!.t);
  const startKey = equityCurveRangeStartKey(range, {
    endKey,
    testStartKey: deskStartEtDateKey(options.startIso),
    firstPointKey,
  });
  if (!startKey) {
    return points;
  }
  return points.filter((point) => etCalendarDateKey(point.t) >= startKey);
}

export function equityCurveCompareBase(
  range: EquityCurveRange,
  points: HistoryPoint[],
  stake: number,
): number | null {
  switch (range) {
    case "TEST":
      return Number.isFinite(stake) ? stake : null;
    case "1W":
    case "1M":
    case "ALL":
      return points[0]?.equity ?? null;
    default: {
      const _exhaustive: never = range;
      return _exhaustive;
    }
  }
}

export function equityCurveHeader(
  displayed: HistoryPoint | null,
  compareBase: number | null,
): {
  equity: number | null;
  change: number | null;
  changePct: number | null;
} {
  const equity = displayed != null && Number.isFinite(displayed.equity)
    ? displayed.equity
    : null;
  const change =
    equity != null && compareBase != null && Number.isFinite(compareBase)
      ? equity - compareBase
      : null;
  const changePct =
    change != null && compareBase != null && compareBase !== 0
      ? change / compareBase
      : null;
  return { equity, change, changePct };
}

export function equityCurveYDomain(
  equities: number[],
  extras: number[] = [],
): [number, number] {
  const values: number[] = [];
  for (const value of equities) {
    if (Number.isFinite(value)) {
      values.push(value);
    }
  }
  for (const value of extras) {
    if (Number.isFinite(value)) {
      values.push(value);
    }
  }
  if (values.length === 0) {
    return [0, 1];
  }
  let min = values[0]!;
  let max = values[0]!;
  for (const value of values) {
    if (value < min) {
      min = value;
    }
    if (value > max) {
      max = value;
    }
  }
  const range = max - min;
  const pad = Math.max(
    range * EQUITY_CURVE_PAD_RATIO,
    EQUITY_CURVE_MIN_HALF_SPAN - range / 2,
  );
  return [min - pad, max + pad];
}

export function equityCurveCaption(
  range: EquityCurveRange,
  options: { fixture?: boolean } = {},
): string {
  const head = (() => {
    switch (range) {
      case "1W":
        return "7-day window · change vs first point in range";
      case "1M":
        return "30-day window · change vs first point in range";
      case "TEST":
        return "Test window from mandate start · change vs stake";
      case "ALL":
        return "All funded history · change vs first funded point";
      default: {
        const _exhaustive: never = range;
        return _exhaustive;
      }
    }
  })();
  const fixture = options.fixture
    ? " · local fixture (Test 1 archive, not live Alpaca)"
    : "";
  return `${head} · dates in Eastern Time · auto-scaled to this range · latest point is live equity when Alpaca history lags${fixture}`;
}

export function equityCurveTone(
  change: number | null | undefined,
): "up" | "down" {
  return change != null && change < 0 ? "down" : "up";
}
