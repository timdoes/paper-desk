import { noonUtcForDateKey } from "@/lib/format";
import { buildOpdSnapshot, type OpdSnapshot } from "@/lib/opd";
import type {
  AlpacaAccount,
  AlpacaOrder,
  AlpacaPortfolioHistory,
  AlpacaPosition,
} from "@/lib/types";

/** Friday after the 4:00 PM ET close — working tickets are legal to show. */
export const OPD_FIXTURE_NOW = Date.parse("2026-10-23T16:30:00-04:00");

const FIXTURE_ACCOUNT: AlpacaAccount = {
  status: "ACTIVE",
  currency: "USD",
  cash: "21420.40",
  buying_power: "18740.40",
  options_buying_power: "18740.40",
  equity: "24820.40",
  last_equity: "25005.10",
  portfolio_value: "24820.40",
  long_market_value: "1840.00",
  short_market_value: "-2440.00",
};

const FIXTURE_POSITIONS: AlpacaPosition[] = [
  {
    symbol: "SPY261218P00680000",
    qty: "-2",
    avg_entry_price: "2.15",
    current_price: "1.62",
    market_value: "-324.00",
    unrealized_pl: "106.00",
    unrealized_plpc: "0.2465",
    side: "short",
  },
  {
    symbol: "SPY261218P00665000",
    qty: "2",
    avg_entry_price: "0.95",
    current_price: "0.71",
    market_value: "142.00",
    unrealized_pl: "-48.00",
    unrealized_plpc: "-0.2526",
    side: "long",
  },
  {
    symbol: "QQQ261023P00600000",
    qty: "-1",
    avg_entry_price: "1.40",
    current_price: "1.85",
    market_value: "-185.00",
    unrealized_pl: "-45.00",
    unrealized_plpc: "-0.3214",
    side: "short",
  },
  {
    symbol: "QQQ261023P00595000",
    qty: "1",
    avg_entry_price: "0.70",
    current_price: "0.92",
    market_value: "92.00",
    unrealized_pl: "22.00",
    unrealized_plpc: "0.3143",
    side: "long",
  },
];

const FIXTURE_ORDERS: AlpacaOrder[] = [
  {
    id: "fixture-fill-spy-short",
    created_at: "2026-10-21T14:12:00-04:00",
    submitted_at: "2026-10-21T14:12:00-04:00",
    filled_at: "2026-10-21T14:12:08-04:00",
    symbol: "SPY261218P00680000",
    qty: "2",
    filled_qty: "2",
    filled_avg_price: "2.15",
    type: "limit",
    side: "sell",
    limit_price: "2.15",
    status: "filled",
  },
  {
    id: "fixture-fill-spy-long",
    created_at: "2026-10-21T14:12:01-04:00",
    submitted_at: "2026-10-21T14:12:01-04:00",
    filled_at: "2026-10-21T14:12:09-04:00",
    symbol: "SPY261218P00665000",
    qty: "2",
    filled_qty: "2",
    filled_avg_price: "0.95",
    type: "limit",
    side: "buy",
    limit_price: "0.95",
    status: "filled",
  },
  {
    id: "fixture-fill-qqq-short",
    created_at: "2026-10-23T10:05:00-04:00",
    submitted_at: "2026-10-23T10:05:00-04:00",
    filled_at: "2026-10-23T10:05:12-04:00",
    symbol: "QQQ261023P00600000",
    qty: "1",
    filled_qty: "1",
    filled_avg_price: "1.40",
    type: "limit",
    side: "sell",
    limit_price: "1.40",
    status: "filled",
  },
  {
    id: "fixture-fill-qqq-long",
    created_at: "2026-10-23T10:05:01-04:00",
    submitted_at: "2026-10-23T10:05:01-04:00",
    filled_at: "2026-10-23T10:05:13-04:00",
    symbol: "QQQ261023P00595000",
    qty: "1",
    filled_qty: "1",
    filled_avg_price: "0.70",
    type: "limit",
    side: "buy",
    limit_price: "0.70",
    status: "filled",
  },
  {
    id: "fixture-working-close",
    created_at: "2026-10-23T15:48:00-04:00",
    submitted_at: "2026-10-23T15:48:00-04:00",
    filled_at: null,
    symbol: "QQQ261023P00600000",
    qty: "1",
    filled_qty: "0",
    filled_avg_price: null,
    type: "limit",
    side: "buy",
    limit_price: "1.70",
    status: "new",
  },
];

function fixtureHistory(): AlpacaPortfolioHistory {
  const keys = [
    "2026-10-01",
    "2026-10-02",
    "2026-10-03",
    "2026-10-06",
    "2026-10-07",
    "2026-10-08",
    "2026-10-09",
    "2026-10-10",
    "2026-10-13",
    "2026-10-14",
    "2026-10-15",
    "2026-10-16",
    "2026-10-17",
    "2026-10-20",
    "2026-10-21",
    "2026-10-22",
    "2026-10-23",
  ];
  const equities = [
    25000, 25012, 24988, 25040, 25018, 24995, 25022, 24970, 24955, 24980,
    25010, 24990, 24972, 25005, 25040, 25005.1, 24820.4,
  ];
  return {
    timestamp: keys.map((key) => noonUtcForDateKey(key) / 1000),
    equity: equities,
    profit_loss: equities.map((value) => value - 25000),
    profit_loss_pct: equities.map((value) => (value - 25000) / 25000),
    timeframe: "1D",
  };
}

export function loadOpdFixtureSnapshot(
  now = OPD_FIXTURE_NOW,
): OpdSnapshot {
  return buildOpdSnapshot({
    account: FIXTURE_ACCOUNT,
    positions: FIXTURE_POSITIONS,
    orders: FIXTURE_ORDERS,
    history: fixtureHistory(),
    now,
    dataSource: "local-fixture",
  });
}
