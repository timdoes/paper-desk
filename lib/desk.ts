import {
  DESK_LENGTH_DAYS,
  EQUITY_CURVE_WINDOW_DAYS,
  PAPER_API_BASE,
  TEST_STAKE_USD,
} from "@/lib/constants";
import {
  addCalendarDays,
  brokerSessionDateKey,
  equityCurveWindow,
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

export function toAccountView(account: AlpacaAccount): AccountView {
  const equity = parseBrokerNumber(account.equity);
  const lastEquity = parseBrokerNumber(account.last_equity);
  const dayPl =
    equity == null || lastEquity == null ? null : equity - lastEquity;
  const dayPlPct =
    dayPl == null || lastEquity == null || lastEquity === 0
      ? null
      : dayPl / lastEquity;
  const roiVsStake = equity == null ? null : equity - TEST_STAKE_USD;
  const roiVsStakePct = equity == null ? null : roiVsStake! / TEST_STAKE_USD;

  return {
    id: account.id ?? account.account_number ?? null,
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
 * Build the desk equity series for a rolling ET window ending today.
 * Window length is `EQUITY_CURVE_WINDOW_DAYS` (30), not the 28-day mandate.
 *
 * Alpaca `1D` history is market days only and often lags the current ET date.
 * Use broker bars where they exist. After the last bar, carry the last known
 * equity through each ET calendar day. Prefer live `account.equity` for today
 * so the right edge matches the KPI.
 *
 * Days before first-funded (`DESK_FUNDED_ISO`) or, if that is unset, mandate
 * start (`DESK_START_ISO`) or the first funded broker bar stay at $0 — the
 * original Alpaca lead-in. From that start day onward the series is the real
 * path. Never carry first-funded equity back across the unfunded lead-in, and
 * never interpolate a zigzag.
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
  const windowDays = options.windowDays ?? EQUITY_CURVE_WINDOW_DAYS;
  const { startKey, endKey } = equityCurveWindow(now, windowDays);
  const liveEquity =
    options.liveEquity != null && Number.isFinite(options.liveEquity)
      ? options.liveEquity
      : null;
  const fundedIso =
    options.deskFundedIso !== undefined
      ? options.deskFundedIso
      : process.env.DESK_FUNDED_ISO;
  const startIso =
    options.deskStartIso !== undefined
      ? options.deskStartIso
      : process.env.DESK_START_ISO;
  const deskStartKey = deskFundedEtDateKey(fundedIso, startIso);

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

  const equityStartKey = deskStartKey ?? firstFundedKey ?? endKey;

  let lastKnown: number | null = null;
  if (firstFundedKey != null && firstFundedKey < equityStartKey) {
    for (const key of dayKeys) {
      if (key >= equityStartKey) {
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
    if (key < equityStartKey) {
      points.push({ t: noonUtcForDateKey(key), equity: 0 });
      continue;
    }

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
    stake: TEST_STAKE_USD,
    clock: getDeskClock(),
    account: view,
    risk: deskRiskState(view.equity, view.lastEquity, positions),
  };
}
