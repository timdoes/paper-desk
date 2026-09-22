import { alpacaFetch } from "@/lib/alpaca";
import {
  buildAccountPayload,
  shapeEquityCurvePoints,
  toHistoryPoints,
  toOrderView,
  toPositionView,
} from "@/lib/desk";
import { parseBrokerNumber } from "@/lib/format";
import { keysConfigured } from "@/lib/paper-guard";
import type {
  AlpacaAccount,
  AlpacaOrder,
  AlpacaPortfolioHistory,
  AlpacaPosition,
  DeskSnapshot,
  PositionView,
  UnconfiguredPayload,
} from "@/lib/types";

const PORTFOLIO_HISTORY_PATH =
  "/v2/account/portfolio/history?period=1M&timeframe=1D";

export async function loadPositions() {
  const positions = await alpacaFetch<AlpacaPosition[]>("/v2/positions");
  return positions.map(toPositionView);
}

export async function loadOrders() {
  const orders = await alpacaFetch<AlpacaOrder[]>(
    "/v2/orders?status=all&limit=50&direction=desc&nested=true",
  );
  return orders.map(toOrderView);
}

export async function loadHistory(liveEquity?: number | null) {
  const history = await alpacaFetch<AlpacaPortfolioHistory>(
    PORTFOLIO_HISTORY_PATH,
  );
  const resolvedEquity =
    liveEquity !== undefined
      ? liveEquity
      : parseBrokerNumber(
          (await alpacaFetch<AlpacaAccount>("/v2/account")).equity,
        );
  return {
    timeframe: history.timeframe ?? "1D",
    points: shapeEquityCurvePoints(toHistoryPoints(history), {
      liveEquity: resolvedEquity,
    }),
  };
}

export async function loadAccount(positions?: PositionView[]) {
  const resolved = positions ?? (await loadPositions());
  const account = await alpacaFetch<AlpacaAccount>("/v2/account");
  return buildAccountPayload(account, resolved);
}

export async function loadDeskSnapshot(): Promise<
  DeskSnapshot | UnconfiguredPayload
> {
  if (!keysConfigured()) {
    return { configured: false };
  }

  const [account, positions, orders, history] = await Promise.all([
    alpacaFetch<AlpacaAccount>("/v2/account"),
    loadPositions(),
    loadOrders(),
    alpacaFetch<AlpacaPortfolioHistory>(PORTFOLIO_HISTORY_PATH),
  ]);

  const payload = buildAccountPayload(account, positions);

  return {
    ...payload,
    positions,
    orders,
    history: {
      timeframe: history.timeframe ?? "1D",
      points: shapeEquityCurvePoints(toHistoryPoints(history), {
        liveEquity: payload.account.equity,
      }),
    },
  };
}

export function unconfiguredPayload(): UnconfiguredPayload {
  return { configured: false };
}
