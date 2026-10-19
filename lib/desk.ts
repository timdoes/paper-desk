import {
  DESK_LENGTH_DAYS,
  PAPER_API_BASE,
  TEST_STAKE_USD,
} from "@/lib/constants";
import {
  addCalendarDays,
  brokerSessionDateKey,
  etCalendarDateKey,
  noonUtcForDateKey,
  parseBrokerNumber,
} from "@/lib/format";
import { deskRiskState } from "@/lib/risk";
import type {
  AccountView,
  AlpacaAccount,
  AlpacaOrder,
  AlpacaPortfolioHistory,
  AlpacaPosition,
  DeskClock,
  HistoryPoint,
  OrderView,
  PositionView,
} from "@/lib/types";

/** ET calendar date of a desk ISO timestamp, if the value is valid. */
export function deskStartEtDateKey(
  startIso: string | null | undefined = process.env.DESK_START_ISO,
): string | null {
  const raw = startIso?.trim() ?? "";
  if (!raw) {
    return null;
  }
  const start = Date.parse(raw);
  if (Number.isNaN(start)) {
    return null;
  }
  return etCalendarDateKey(start);
}

/**
 * Equity-curve $0-before date: first-funded (`DESK_FUNDED_ISO`) when set,
 * otherwise the mandate start (`DESK_START_ISO`).
 */
export function deskFundedEtDateKey(
  fundedIso: string | null | undefined = process.env.DESK_FUNDED_ISO,
  startIso: string | null | undefined = process.env.DESK_START_ISO,
): string | null {
  return deskStartEtDateKey(fundedIso) ?? deskStartEtDateKey(startIso);
}

export function getDeskClock(
  startIso = process.env.DESK_START_ISO,
  now = Date.now(),
): DeskClock {
  const raw = startIso?.trim() ?? "";
  if (!raw) {
    return {
      configured: false,
      startIso: null,
      endsAt: null,
      daysLeft: null,
      totalDays: DESK_LENGTH_DAYS,
    };
  }

  const start = Date.parse(raw);
  if (Number.isNaN(start)) {
    return {
      configured: false,
      startIso: raw,
      endsAt: null,
      daysLeft: null,
      totalDays: DESK_LENGTH_DAYS,
      invalid: true,
    };
  }

  const endsAt = start + DESK_LENGTH_DAYS * 24 * 60 * 60 * 1000;
  const daysLeft = Math.ceil((endsAt - now) / (24 * 60 * 60 * 1000));

  return {
    configured: true,
    startIso: new Date(start).toISOString(),
    endsAt: new Date(endsAt).toISOString(),
    daysLeft,
    totalDays: DESK_LENGTH_DAYS,
  };
}

/** ROI baseline. Positive finite `DESK_STAKE_USD`, else `TEST_STAKE_USD`. */
export function deskStakeUsd(
  raw: string | null | undefined = process.env.DESK_STAKE_USD,
): number {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) {
    return TEST_STAKE_USD;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return TEST_STAKE_USD;
  }
  return parsed;
}

export function toAccountView(account: AlpacaAccount): AccountView {
  const equity = parseBrokerNumber(account.equity);
  const lastEquity = parseBrokerNumber(account.last_equity);
  const dayPl =
    equity == null || lastEquity == null ? null : equity - lastEquity;
  const dayPlPct =
    dayPl == null || lastEquity == null || lastEquity === 0
      ? null
      : dayPl / lastEquity;
  const stake = deskStakeUsd();
  const roiVsStake = equity == null ? null : equity - stake;
  const roiVsStakePct = equity == null ? null : roiVsStake! / stake;

  return {
    status: account.status ?? null,
    currency: account.currency ?? "USD",
    cash: parseBrokerNumber(account.cash),
    buyingPower: parseBrokerNumber(account.buying_power),
    equity,
    lastEquity,
    portfolioValue: parseBrokerNumber(account.portfolio_value),
    longMarketValue: parseBrokerNumber(account.long_market_value),
    dayPl,
    dayPlPct,
    roiVsStake,
    roiVsStakePct,
  };
}

export function toPositionView(position: AlpacaPosition): PositionView {
  return {
    symbol: position.symbol,
    qty: parseBrokerNumber(position.qty),
    avgEntry: parseBrokerNumber(position.avg_entry_price),
    last: parseBrokerNumber(position.current_price),
    marketValue: parseBrokerNumber(position.market_value),
    unrealized: parseBrokerNumber(position.unrealized_pl),
    unrealizedPct: parseBrokerNumber(position.unrealized_plpc),
  };
}

export function toOrderView(order: AlpacaOrder): OrderView {
  return {
    id: order.id,
    submittedAt: order.submitted_at ?? order.created_at ?? null,
    filledAt: order.filled_at ?? null,
    symbol: order.symbol,
    side: order.side,
    type: order.order_type ?? order.type,
    qty: parseBrokerNumber(order.qty),
    filledQty: parseBrokerNumber(order.filled_qty),
    limitPrice: parseBrokerNumber(order.limit_price),
    filledAvgPrice: parseBrokerNumber(order.filled_avg_price),
    status: order.status,
  };
}

export function toHistoryPoints(
  history: AlpacaPortfolioHistory,
): HistoryPoint[] {
  const timestamps = history.timestamp ?? [];
  const equity = history.equity ?? [];
  const points: HistoryPoint[] = [];

  for (let i = 0; i < timestamps.length; i += 1) {
    const t = timestamps[i];
    const value = equity[i];
    if (t == null || value == null || !Number.isFinite(value)) {
      continue;
    }
    const ms = t > 1_000_000_000_000 ? t : t * 1000;
    points.push({ t: ms, equity: value });
  }

  return points;
}

/**
 * Build the funded equity series ending today in America/New_York.
 *
 * Alpaca `1D` history is market days only and often lags the current ET date.
 * Use broker bars where they exist. After the last bar, carry the last known
 * equity through each ET calendar day. Prefer live `account.equity` for today
 * so the right edge matches the KPI.
 *
 * Starts at first funding: `DESK_FUNDED_ISO` when set, otherwise the first
 * nonzero broker bar. Mandate start (`DESK_START_ISO`) is not a clip — TEST
 * range slicing uses that date. No $0 lead-in: a zero point would wreck an
 * auto-scaled axis. Never interpolate a zigzag.
 */
export function shapeEquityCurvePoints(
  brokerPoints: HistoryPoint[],
  options: {
    liveEquity: number | null;
    now?: number;
    windowDays?: number;
    deskStartIso?: string | null;
    deskFundedIso?: string | null;
  },
): HistoryPoint[] {
  const now = options.now ?? Date.now();
  const endKey = etCalendarDateKey(now);
  const liveEquity =
    options.liveEquity != null && Number.isFinite(options.liveEquity)
      ? options.liveEquity
      : null;
  const fundedIso =
    options.deskFundedIso !== undefined
      ? options.deskFundedIso
      : process.env.DESK_FUNDED_ISO;

  const byDay = new Map<string, number>();
  for (const point of brokerPoints) {
    const key = brokerSessionDateKey(point.t);
    if (!key || !Number.isFinite(point.equity)) {
      continue;
    }
    byDay.set(key, point.equity);
  }

  const dayKeys = [...byDay.keys()].sort();
  let firstFundedKey: string | null = null;
  for (const key of dayKeys) {
    if (byDay.get(key) !== 0) {
      firstFundedKey = key;
      break;
    }
  }

  const firstFundedEquity =
    firstFundedKey != null ? byDay.get(firstFundedKey) ?? null : liveEquity;
  if (firstFundedEquity == null || !Number.isFinite(firstFundedEquity)) {
    return [];
  }

  const fundedEnvKey = deskStartEtDateKey(fundedIso);
  let startKey = fundedEnvKey ?? firstFundedKey ?? endKey;
  if (firstFundedKey == null && fundedEnvKey == null) {
    startKey = endKey;
  }
  if (options.windowDays != null && options.windowDays > 0) {
    const windowStart = addCalendarDays(endKey, -(options.windowDays - 1));
    if (startKey < windowStart) {
      startKey = windowStart;
    }
  }
  if (startKey > endKey) {
    startKey = endKey;
  }

  let lastKnown: number | null = null;
  if (firstFundedKey != null && firstFundedKey < startKey) {
    for (const key of dayKeys) {
      if (key >= startKey) {
        break;
      }
      const value = byDay.get(key);
      if (value != null && key >= firstFundedKey) {
        lastKnown = value;
      }
    }
  }

  const points: HistoryPoint[] = [];
  for (let key = startKey; key <= endKey; key = addCalendarDays(key, 1)) {
    if (lastKnown == null) {
      lastKnown = firstFundedEquity;
    }
    if (firstFundedKey != null && key >= firstFundedKey && byDay.has(key)) {
      lastKnown = byDay.get(key) ?? lastKnown;
    }
    const equity = key === endKey && liveEquity != null ? liveEquity : lastKnown;
    if (equity == null || !Number.isFinite(equity)) {
      continue;
    }
    points.push({ t: noonUtcForDateKey(key), equity });
  }

  return points;
}

export function buildAccountPayload(
  account: AlpacaAccount,
  positions: PositionView[],
) {
  const view = toAccountView(account);
  return {
    configured: true as const,
    paper: true as const,
    base: PAPER_API_BASE,
    stake: deskStakeUsd(),
    clock: getDeskClock(),
    account: view,
    risk: deskRiskState(view.equity, view.lastEquity, positions),
  };
}
