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

export const OPD_DESK_NAME = "BotMarket Options";
export const OPD_HOST = "options.timdoes.com";
export const OPD_PATH = "/options";
export const OPD_FIXTURE_PATH = "/options/fixture";
export const OPD_API_PATH = "/api/options";
export const OPD_ENV_KEY_ID = "OPD_APCA_API_KEY_ID";
export const OPD_ENV_SECRET = "OPD_APCA_API_SECRET_KEY";
export const OPD_REQUEST_DESK_HEADER = "x-opd-desk";

/** Persistent options-host Legal copy. Always visible — not dismissible. */
export const OPD_PAPER_DISCLAIMER =
  "Paper trading only. Not investment advice.";

/** Options Premium Desk ROI / risk baseline — not invented cash. */
export const OPD_STAKE_USD = 25_000;
export const OPD_DAILY_STOP_USD = 750;
export const OPD_DERISK_EQUITY_USD = 23_500;
export const OPD_KILL_SWITCH_EQUITY_USD = 22_500;
export const OPD_OPEN_MAX_LOSS_CAP_USD = 6_250;
export const OPD_CREDIT_DTE_MIN = 45;
export const OPD_CREDIT_DTE_MAX = 60;
export const OPD_DAY_SLEEVE_DTE_MAX = 3;
export const OPD_REFRESH_MS = 20_000;
export const OPTION_CONTRACT_MULTIPLIER = 100;
