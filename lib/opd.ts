import {
  OPD_DAILY_STOP_USD,
  OPD_DERISK_EQUITY_USD,
  OPD_KILL_SWITCH_EQUITY_USD,
  OPD_OPEN_MAX_LOSS_CAP_USD,
  OPD_STAKE_USD,
  PAPER_API_BASE,
} from "@/lib/constants";
import { shapeEquityCurvePoints, toHistoryPoints, toOrderView } from "@/lib/desk";
import { parseBrokerNumber } from "@/lib/format";
import { opdFetch } from "@/lib/opd-alpaca";
import { isAfterEtClose } from "@/lib/opd-clock";
import { opdKeysConfigured } from "@/lib/opd-guard";
import {
  groupOpdSpreads,
  openMaxLossUsd,
  type OpdSpreadView,
} from "@/lib/opd-spreads";
import { ALPACA_ORDERS_PATH } from "@/lib/orders";
import type {
  AlpacaAccount,
  AlpacaOrder,
  AlpacaPortfolioHistory,
  AlpacaPosition,
  HistoryPoint,
  OrderView,
  UnconfiguredPayload,
} from "@/lib/types";

const PORTFOLIO_HISTORY_PATH =
  "/v2/account/portfolio/history?period=all&timeframe=1D";

const TERMINAL_ORDER_STATUSES = new Set([
  "filled",
  "canceled",
  "cancelled",
  "expired",
  "rejected",
  "done_for_day",
  "stopped",
  "suspended",
]);

export type OpdAccountView = {
  status: string | null;
  currency: string;
  equity: number | null;
  lastEquity: number | null;
  cash: number | null;
  buyingPower: number | null;
  optionsBuyingPower: number | null;
  optionsBuyingPowerUsed: number | null;
  dayPl: number | null;
  dayPlPct: number | null;
  totalPl: number | null;
  totalPlPct: number | null;
};

export type OpdRiskView = {
  dailyStopUsd: number;
  dailyStopUsed: number | null;
  dailyStopRatio: number | null;
  dailyStopTripped: boolean;
  deriskEquity: number;
  deriskRatio: number | null;
  deriskTripped: boolean;
  killSwitchEquity: number;
  killSwitchRatio: number | null;
  killSwitchTripped: boolean;
  openMaxLossCap: number;
  openMaxLoss: number | null;
  openMaxLossRatio: number | null;
  openMaxLossTripped: boolean;
};

export type OpdSnapshot = {
  configured: true;
  paper: true;
  base: string;
  stake: number;
  account: OpdAccountView;
  risk: OpdRiskView;
  spreads: OpdSpreadView[];
  orders: OrderView[];
  workingHidden: boolean;
  history: {
    timeframe: string | null;
    points: HistoryPoint[];
  };
  dataSource?: "alpaca" | "local-fixture";
};

export function isWorkingOrderStatus(status: string | null | undefined): boolean {
  const normalized = status?.trim().toLowerCase() ?? "";
  if (!normalized) {
    return false;
  }
  return !TERMINAL_ORDER_STATUSES.has(normalized);
}

export function filterPublicOpdOrders(
  orders: OrderView[],
  now: number,
): { orders: OrderView[]; workingHidden: boolean } {
  if (isAfterEtClose(now)) {
    return { orders, workingHidden: false };
  }
  return {
    orders: orders.filter((order) => !isWorkingOrderStatus(order.status)),
    workingHidden: true,
  };
}

export function toOpdAccountView(
  account: AlpacaAccount,
  openMaxLoss: number | null,
): OpdAccountView {
  const equity = parseBrokerNumber(account.equity);
  const lastEquity = parseBrokerNumber(account.last_equity);
  const dayPl =
    equity == null || lastEquity == null ? null : equity - lastEquity;
  const dayPlPct =
    dayPl == null || lastEquity == null || lastEquity === 0
      ? null
      : dayPl / lastEquity;
  const totalPl = equity == null ? null : equity - OPD_STAKE_USD;
  const totalPlPct = equity == null ? null : totalPl! / OPD_STAKE_USD;
  const optionsBuyingPower = parseBrokerNumber(account.options_buying_power);

  return {
    status: account.status ?? null,
    currency: account.currency ?? "USD",
    equity,
    lastEquity,
    cash: parseBrokerNumber(account.cash),
    buyingPower: parseBrokerNumber(account.buying_power),
    optionsBuyingPower,
    optionsBuyingPowerUsed: openMaxLoss,
    dayPl,
    dayPlPct,
    totalPl,
    totalPlPct,
  };
}

function ratioTowardFloor(
  equity: number | null,
  floor: number,
  ceiling: number,
): number | null {
  if (equity == null || !Number.isFinite(equity)) {
    return null;
  }
  const span = ceiling - floor;
  if (span <= 0) {
    return null;
  }
  return Math.max(0, (ceiling - equity) / span);
}

export function toOpdRiskView(
  account: OpdAccountView,
  openMaxLoss: number | null,
): OpdRiskView {
  const dayLoss =
    account.dayPl != null && account.dayPl < 0 ? Math.abs(account.dayPl) : 0;
  const dailyStopUsed = account.dayPl == null ? null : dayLoss;
  const dailyStopRatio =
    dailyStopUsed == null ? null : dailyStopUsed / OPD_DAILY_STOP_USD;
  const openMaxLossRatio =
    openMaxLoss == null ? null : openMaxLoss / OPD_OPEN_MAX_LOSS_CAP_USD;

  return {
    dailyStopUsd: OPD_DAILY_STOP_USD,
    dailyStopUsed,
    dailyStopRatio,
    dailyStopTripped: dailyStopUsed != null && dailyStopUsed >= OPD_DAILY_STOP_USD,
    deriskEquity: OPD_DERISK_EQUITY_USD,
    deriskRatio: ratioTowardFloor(
      account.equity,
      OPD_DERISK_EQUITY_USD,
      OPD_STAKE_USD,
    ),
    deriskTripped:
      account.equity != null && account.equity <= OPD_DERISK_EQUITY_USD,
    killSwitchEquity: OPD_KILL_SWITCH_EQUITY_USD,
    killSwitchRatio: ratioTowardFloor(
      account.equity,
      OPD_KILL_SWITCH_EQUITY_USD,
      OPD_STAKE_USD,
    ),
    killSwitchTripped:
      account.equity != null && account.equity <= OPD_KILL_SWITCH_EQUITY_USD,
    openMaxLossCap: OPD_OPEN_MAX_LOSS_CAP_USD,
    openMaxLoss,
    openMaxLossRatio,
    openMaxLossTripped:
      openMaxLoss != null && openMaxLoss >= OPD_OPEN_MAX_LOSS_CAP_USD,
  };
}

export function buildOpdSnapshot(input: {
  account: AlpacaAccount;
  positions: AlpacaPosition[];
  orders: AlpacaOrder[];
  history: AlpacaPortfolioHistory;
  now?: number;
  dataSource?: "alpaca" | "local-fixture";
}): OpdSnapshot {
  const now = input.now ?? Date.now();
  const spreads = groupOpdSpreads(input.positions, now);
  const openMaxLoss = openMaxLossUsd(spreads);
  const account = toOpdAccountView(input.account, openMaxLoss);
  const publicOrders = filterPublicOpdOrders(
    input.orders.map(toOrderView),
    now,
  );

  return {
    configured: true,
    paper: true,
    base: PAPER_API_BASE,
    stake: OPD_STAKE_USD,
    account,
    risk: toOpdRiskView(account, openMaxLoss),
    spreads,
    orders: publicOrders.orders,
    workingHidden: publicOrders.workingHidden,
    history: {
      timeframe: input.history.timeframe ?? "1D",
      points: shapeEquityCurvePoints(toHistoryPoints(input.history), {
        liveEquity: account.equity,
        now,
        deskStartIso: null,
        deskFundedIso: null,
      }),
    },
    dataSource: input.dataSource,
  };
}

export async function loadOpdSnapshot(
  now = Date.now(),
): Promise<OpdSnapshot | UnconfiguredPayload> {
  if (!opdKeysConfigured()) {
    return { configured: false };
  }

  const [account, positions, orders, history] = await Promise.all([
    opdFetch<AlpacaAccount>("/v2/account"),
    opdFetch<AlpacaPosition[]>("/v2/positions"),
    opdFetch<AlpacaOrder[]>(ALPACA_ORDERS_PATH),
    opdFetch<AlpacaPortfolioHistory>(PORTFOLIO_HISTORY_PATH),
  ]);

  return buildOpdSnapshot({
    account,
    positions,
    orders,
    history,
    now,
    dataSource: "alpaca",
  });
}

export function opdUnconfiguredPayload(): UnconfiguredPayload {
  return { configured: false };
}
