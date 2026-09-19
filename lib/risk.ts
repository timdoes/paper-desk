import {
  DAILY_LOSS_BREAKER_PCT,
  MAX_NAME_NAV_PCT,
} from "./constants";
import type {
  OrderSide,
  OrderType,
  PositionView,
  RiskDecision,
  RiskStripState,
} from "./types";

export function dayPnl(
  equity: number | null,
  lastEquity: number | null,
): { dayPl: number | null; dayPlPct: number | null } {
  if (equity == null || lastEquity == null) {
    return { dayPl: null, dayPlPct: null };
  }
  const dayPl = equity - lastEquity;
  const dayPlPct = lastEquity === 0 ? null : dayPl / lastEquity;
  return { dayPl, dayPlPct };
}

export function deskRiskState(
  equity: number | null,
  lastEquity: number | null,
  positions: PositionView[],
): RiskStripState {
  const { dayPl, dayPlPct } = dayPnl(equity, lastEquity);
  const dailyLossUnknown = dayPlPct == null;
  const dailyLossTripped =
    dayPlPct != null && dayPlPct <= -DAILY_LOSS_BREAKER_PCT;

  const nameBreaches =
    equity != null && equity > 0
      ? positions
          .map((position) => ({
            symbol: position.symbol,
            navPct:
              position.marketValue == null
                ? null
                : Math.abs(position.marketValue) / equity,
          }))
          .filter(
            (row): row is { symbol: string; navPct: number } =>
              row.navPct != null && row.navPct > MAX_NAME_NAV_PCT,
          )
      : [];

  return {
    dailyLossTripped,
    dailyLossUnknown,
    dayPl,
    dayPlPct,
    nameCapPct: MAX_NAME_NAV_PCT,
    nameBreaches,
    equity,
  };
}

export function resolveMarkPrice(input: {
  type: OrderType;
  symbol: string;
  limitPrice?: number;
  positions: PositionView[];
}): number | null {
  switch (input.type) {
    case "limit":
      return input.limitPrice != null && input.limitPrice > 0
        ? input.limitPrice
        : null;
    case "market": {
      const existing = input.positions.find(
        (position) =>
          position.symbol.toUpperCase() === input.symbol.toUpperCase(),
      );
      return existing?.last != null && existing.last > 0 ? existing.last : null;
    }
    default: {
      const _exhaustive: never = input.type;
      return _exhaustive;
    }
  }
}

export function evaluateOrderRisk(input: {
  side: OrderSide;
  type: OrderType;
  symbol: string;
  qty: number;
  limitPrice?: number;
  equity: number | null;
  lastEquity: number | null;
  positions: PositionView[];
}): RiskDecision {
  const { dayPlPct } = dayPnl(input.equity, input.lastEquity);
  const dailyLossTripped =
    dayPlPct != null && dayPlPct <= -DAILY_LOSS_BREAKER_PCT;

  switch (input.side) {
    case "sell":
      return {
        allowed: true,
        dailyLossTripped,
        nameCapPct: MAX_NAME_NAV_PCT,
        projectedNameNavPct: null,
      };
    case "buy":
      break;
    default: {
      const _exhaustive: never = input.side;
      return _exhaustive;
    }
  }

  if (dayPlPct == null) {
    return {
      allowed: false,
      code: "MISSING_EQUITY",
      reason:
        "Cannot evaluate the ~3% daily loss breaker without equity and last_equity from Alpaca Paper. Buys are blocked.",
      dailyLossTripped: false,
      nameCapPct: MAX_NAME_NAV_PCT,
      projectedNameNavPct: null,
    };
  }

  if (dailyLossTripped) {
    return {
      allowed: false,
      code: "DAILY_LOSS_BREAKER",
      reason: `Daily loss breaker is open (day P&L ${((dayPlPct ?? 0) * 100).toFixed(2)}% ≤ -${(DAILY_LOSS_BREAKER_PCT * 100).toFixed(0)}%). Buys are blocked; sells remain open.`,
      dailyLossTripped: true,
      nameCapPct: MAX_NAME_NAV_PCT,
      projectedNameNavPct: null,
    };
  }

  if (input.equity == null || input.equity <= 0) {
    return {
      allowed: false,
      code: "MISSING_EQUITY",
      reason:
        "Cannot enforce the 10% NAV name cap without equity from Alpaca Paper. Buys are blocked.",
      dailyLossTripped: false,
      nameCapPct: MAX_NAME_NAV_PCT,
      projectedNameNavPct: null,
    };
  }

  const mark = resolveMarkPrice(input);
  if (mark == null) {
    return {
      allowed: false,
      code: "NO_MARK_PRICE",
      reason:
        "Cannot enforce the 10% NAV name cap on a market buy without a mark from an open position. Use a limit order so the desk can price the risk.",
      dailyLossTripped: false,
      nameCapPct: MAX_NAME_NAV_PCT,
      projectedNameNavPct: null,
    };
  }

  const existing = input.positions.find(
    (position) => position.symbol.toUpperCase() === input.symbol.toUpperCase(),
  );
  const existingMv = existing?.marketValue == null ? 0 : Math.abs(existing.marketValue);
  const projected = existingMv + mark * input.qty;
  const projectedNameNavPct = projected / input.equity;

  if (projectedNameNavPct > MAX_NAME_NAV_PCT) {
    return {
      allowed: false,
      code: "NAME_CAP",
      reason: `Name cap: ${input.symbol.toUpperCase()} would be ${(projectedNameNavPct * 100).toFixed(1)}% of NAV (max ${(MAX_NAME_NAV_PCT * 100).toFixed(0)}%). Buys that breach the cap are blocked.`,
      dailyLossTripped: false,
      nameCapPct: MAX_NAME_NAV_PCT,
      projectedNameNavPct,
    };
  }

  return {
    allowed: true,
    dailyLossTripped: false,
    nameCapPct: MAX_NAME_NAV_PCT,
    projectedNameNavPct,
  };
}
