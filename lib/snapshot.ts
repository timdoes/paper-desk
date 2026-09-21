import { alpacaFetch } from "@/lib/alpaca";
import {
  buildAccountPayload,
  toHistoryPoints,
  toOrderView,
  toPositionView,
} from "@/lib/desk";
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

export async function loadHistory() {
  const history = await alpacaFetch<AlpacaPortfolioHistory>(
    "/v2/account/portfolio/history?period=1M&timeframe=1D",
  );
  return {
    timeframe: history.timeframe ?? "1D",
    points: toHistoryPoints(history),
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
    loadHistory(),
  ]);

  const payload = buildAccountPayload(account, positions);

  return {
    ...payload,
    positions,
    orders,
    history,
  };
}

export function unconfiguredPayload(): UnconfiguredPayload {
  return { configured: false };
}
