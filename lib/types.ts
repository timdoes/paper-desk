export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit";

export type DeskClock =
  | {
      configured: true;
      startIso: string;
      endsAt: string;
      daysLeft: number;
      totalDays: number;
    }
  | {
      configured: false;
      startIso: string | null;
      endsAt: null;
      daysLeft: null;
      totalDays: number;
      invalid?: boolean;
    };

export type AlpacaAccount = {
  id?: string;
  account_number?: string;
  status?: string;
  currency?: string;
  cash?: string;
  portfolio_value?: string;
  buying_power?: string;
  equity?: string;
  last_equity?: string;
  long_market_value?: string;
  short_market_value?: string;
  multiplier?: string;
};

export type AlpacaPosition = {
  asset_id?: string;
  symbol: string;
  qty: string;
  avg_entry_price: string;
  market_value: string;
  cost_basis?: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  current_price: string;
  lastday_price?: string;
  change_today?: string;
  side?: string;
};

export type AlpacaOrder = {
  id: string;
  client_order_id?: string;
  created_at: string;
  updated_at?: string;
  submitted_at?: string;
  filled_at?: string | null;
  canceled_at?: string | null;
  expired_at?: string | null;
  failed_at?: string | null;
  symbol: string;
  qty?: string | null;
  filled_qty?: string;
  filled_avg_price?: string | null;
  type: string;
  order_type?: string;
  side: string;
  time_in_force?: string;
  limit_price?: string | null;
  status: string;
};

export type AlpacaPortfolioHistory = {
  timestamp: number[];
  equity: Array<number | null>;
  profit_loss: Array<number | null>;
  profit_loss_pct: Array<number | null>;
  base_value?: number | null;
  timeframe?: string;
};

export type PositionView = {
  symbol: string;
  qty: number | null;
  avgEntry: number | null;
  last: number | null;
  marketValue: number | null;
  unrealized: number | null;
  unrealizedPct: number | null;
};

export type OrderView = {
  id: string;
  submittedAt: string | null;
  filledAt: string | null;
  symbol: string;
  side: string;
  type: string;
  qty: number | null;
  filledQty: number | null;
  limitPrice: number | null;
  filledAvgPrice: number | null;
  status: string;
};

export type HistoryPoint = {
  t: number;
  equity: number;
};

export type RiskStripState = {
  dailyLossTripped: boolean;
  dailyLossUnknown: boolean;
  dayPl: number | null;
  dayPlPct: number | null;
  nameCapPct: number;
  nameBreaches: Array<{ symbol: string; navPct: number }>;
  equity: number | null;
};

export type RiskCode =
  | "DAILY_LOSS_BREAKER"
  | "NAME_CAP"
  | "NO_MARK_PRICE"
  | "MISSING_EQUITY";

export type RiskDecision =
  | {
      allowed: true;
      dailyLossTripped: boolean;
      nameCapPct: number;
      projectedNameNavPct: number | null;
    }
  | {
      allowed: false;
      code: RiskCode;
      reason: string;
      dailyLossTripped: boolean;
      nameCapPct: number;
      projectedNameNavPct: number | null;
    };

export type AccountView = {
  status: string | null;
  currency: string;
  cash: number | null;
  buyingPower: number | null;
  equity: number | null;
  lastEquity: number | null;
  portfolioValue: number | null;
  longMarketValue: number | null;
  dayPl: number | null;
  dayPlPct: number | null;
  roiVsStake: number | null;
  roiVsStakePct: number | null;
};

export type ConfiguredAccountPayload = {
  configured: true;
  paper: true;
  base: string;
  stake: number;
  clock: DeskClock;
  account: AccountView;
  risk: RiskStripState;
};

export type ConfiguredPositionsPayload = {
  configured: true;
  positions: PositionView[];
};

export type ConfiguredOrdersPayload = {
  configured: true;
  orders: OrderView[];
};

export type ConfiguredHistoryPayload = {
  configured: true;
  history: {
    timeframe: string | null;
    points: HistoryPoint[];
  };
};

export type UnconfiguredPayload = {
  configured: false;
};

export type DeskSnapshot = {
  configured: true;
  paper: true;
  base: string;
  stake: number;
  clock: DeskClock;
  account: AccountView;
  risk: RiskStripState;
  positions: PositionView[];
  orders: OrderView[];
  history: {
    timeframe: string | null;
    points: HistoryPoint[];
  };
};

export const DESK_BOT_IDS = [
  "chief-of-staff",
  "research",
  "strategy",
  "risk",
  "execution",
  "dashboard-ops",
] as const;

export type DeskBotId = (typeof DESK_BOT_IDS)[number];

export type DeskBot = {
  id: DeskBotId;
  name: string;
  role: string;
  initial: string;
  accent: string;
};

export type DeskMessage = {
  id: string;
  botId: DeskBotId;
  body: string;
  createdAt: string;
};

export type DeskFeedSort = "asc";

export type DeskFeedPayload = {
  bots: DeskBot[];
  messages: DeskMessage[];
  sort: DeskFeedSort;
};
