import {
  DESK_LENGTH_DAYS,
  PAPER_API_BASE,
  TEST_STAKE_USD,
} from "@/lib/constants";
import { parseBrokerNumber } from "@/lib/format";
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
