export const PAPER_API_BASE = "https://paper-api.alpaca.markets";
export const LIVE_ALPACA_HOST = "api.alpaca.markets";
export const PAPER_ALPACA_HOST = "paper-api.alpaca.markets";

/** ROI baseline for the 28-day (4-week) mandate — not invented cash. */
export const TEST_STAKE_USD = 10_000;
/** Mandate length: exactly four weeks, Sunday-anchored. */
export const DESK_LENGTH_DAYS = 28;
/** 1M equity-curve range length in ET calendar days. Independent of the mandate clock. */
export const EQUITY_CURVE_WINDOW_DAYS = 30;
/** 1W equity-curve range length in ET calendar days. */
export const EQUITY_CURVE_WEEK_DAYS = 7;
/** Y-axis pad as a fraction of the plotted min/max span. */
export const EQUITY_CURVE_PAD_RATIO = 0.1;
/** Minimum half-span (dollars) so a near-flat stretch is not jagged noise. */
export const EQUITY_CURVE_MIN_HALF_SPAN = 25;
/** Test 2 max position: 15% of equity. */
export const MAX_NAME_NAV_PCT = 0.15;
/** Test 2 daily loss breaker: −2% vs prior close. */
export const DAILY_LOSS_BREAKER_PCT = 0.02;

export const DESK_OWNER = "TimDOES";
export const DESK_NAME = "BotMarket";

/** Persistent public-site copy. Always visible — not dismissible. */
export const PAPER_DISCLAIMER =
  "Alpaca Paper only. Simulated. No real money. Not investment advice. Not a solicitation. Do not copy these tickets. Past paper results do not predict live results. Personal TimDOES experiment — not an RIA or broker-dealer.";
