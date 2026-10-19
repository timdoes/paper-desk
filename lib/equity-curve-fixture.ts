import { readFileSync } from "node:fs";
import { PAPER_API_BASE } from "@/lib/constants";
import {
  deskStakeUsd,
  getDeskClock,
  shapeEquityCurvePoints,
  toAccountView,
} from "@/lib/desk";
import { deskRiskState } from "@/lib/risk";
import type { DeskSnapshot, HistoryPoint } from "@/lib/types";

const TEST_1_EQUITY_CSV = new URL(
  "../results/test-1-equity.csv",
  import.meta.url,
);

/** Last archived Test 1 close — used as live equity when Alpaca is not called. */
const ARCHIVED_LIVE_EQUITY = 9970.33;

export function localFixtureEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.NODE_ENV !== "production" && env.DESK_LOCAL_FIXTURE === "1";
}

export function parseArchivedEquityCsv(csv: string): HistoryPoint[] {
  const points: HistoryPoint[] = [];
  const lines = csv.trim().split(/\r?\n/);
  for (const line of lines.slice(1)) {
    const [date, equityRaw] = line.split(",");
    if (!date || equityRaw == null) {
      continue;
    }
    const equity = Number(equityRaw);
    if (!Number.isFinite(equity)) {
      continue;
    }
    const t = Date.parse(`${date}T00:00:00.000Z`);
    if (Number.isNaN(t)) {
      continue;
    }
    points.push({ t, equity });
  }
  return points;
}

export function loadLocalFixtureSnapshot(now = Date.now()): DeskSnapshot {
  const csv = readFileSync(TEST_1_EQUITY_CSV, "utf8");
  const brokerPoints = parseArchivedEquityCsv(csv);
  const stake = deskStakeUsd();
  const account = toAccountView({
    status: "ACTIVE",
    currency: "USD",
    cash: String(ARCHIVED_LIVE_EQUITY),
    buying_power: String(ARCHIVED_LIVE_EQUITY),
    equity: String(ARCHIVED_LIVE_EQUITY),
    last_equity: String(ARCHIVED_LIVE_EQUITY),
    portfolio_value: String(ARCHIVED_LIVE_EQUITY),
    long_market_value: "0",
  });

  return {
    configured: true,
    paper: true,
    base: PAPER_API_BASE,
    stake,
    clock: getDeskClock(process.env.DESK_START_ISO, now),
    account,
    risk: deskRiskState(account.equity, account.lastEquity, []),
    positions: [],
    orders: [],
    history: {
      timeframe: "1D",
      points: shapeEquityCurvePoints(brokerPoints, {
        liveEquity: ARCHIVED_LIVE_EQUITY,
        now,
      }),
    },
    dataSource: "local-fixture",
  };
}
