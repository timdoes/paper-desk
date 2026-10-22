import {
  OPTION_CONTRACT_MULTIPLIER,
  OPD_CREDIT_DTE_MAX,
  OPD_CREDIT_DTE_MIN,
  OPD_DAY_SLEEVE_DTE_MAX,
} from "@/lib/constants";
import { parseBrokerNumber } from "@/lib/format";
import { optionDte, parseOccSymbol, type OptionRight } from "@/lib/opd-occ";
import type { AlpacaPosition } from "@/lib/types";

export type OpdSleeve = "credit" | "day" | "other";

export type OpdLegView = {
  symbol: string;
  underlying: string;
  expiry: string;
  dte: number;
  right: OptionRight;
  strike: number;
  qty: number;
  avgEntry: number | null;
  last: number | null;
  marketValue: number | null;
  unrealized: number | null;
};

export type OpdSpreadKind = "put_credit" | "call_credit" | "single";

export type OpdSpreadView = {
  id: string;
  kind: OpdSpreadKind;
  sleeve: OpdSleeve;
  underlying: string;
  expiry: string;
  dte: number;
  shortStrike: number | null;
  longStrike: number | null;
  contracts: number;
  creditReceived: number | null;
  mark: number | null;
  unrealized: number | null;
  maxLoss: number | null;
  maxProfit: number | null;
  pctOfMaxProfit: number | null;
  legs: OpdLegView[];
};

function sleeveForDte(dte: number): OpdSleeve {
  if (dte >= 0 && dte <= OPD_DAY_SLEEVE_DTE_MAX) {
    return "day";
  }
  if (dte >= OPD_CREDIT_DTE_MIN && dte <= OPD_CREDIT_DTE_MAX) {
    return "credit";
  }
  return "other";
}

export function toOpdLeg(
  position: AlpacaPosition,
  now: number,
): OpdLegView | null {
  const parsed = parseOccSymbol(position.symbol);
  const qty = parseBrokerNumber(position.qty);
  if (!parsed || qty == null || qty === 0) {
    return null;
  }
  return {
    symbol: parsed.symbol,
    underlying: parsed.underlying,
    expiry: parsed.expiry,
    dte: optionDte(parsed.expiry, now),
    right: parsed.right,
    strike: parsed.strike,
    qty,
    avgEntry: parseBrokerNumber(position.avg_entry_price),
    last: parseBrokerNumber(position.current_price),
    marketValue: parseBrokerNumber(position.market_value),
    unrealized: parseBrokerNumber(position.unrealized_pl),
  };
}

function premiumDollars(
  price: number | null,
  contracts: number,
): number | null {
  if (price == null || !Number.isFinite(price) || contracts <= 0) {
    return null;
  }
  return price * OPTION_CONTRACT_MULTIPLIER * contracts;
}

function sumNullable(values: Array<number | null>): number | null {
  let total = 0;
  let seen = false;
  for (const value of values) {
    if (value == null || !Number.isFinite(value)) {
      continue;
    }
    total += value;
    seen = true;
  }
  return seen ? total : null;
}

function buildSingle(leg: OpdLegView): OpdSpreadView {
  const contracts = Math.abs(leg.qty);
  const creditReceived =
    leg.qty < 0 ? premiumDollars(leg.avgEntry, contracts) : null;
  const debitPaid =
    leg.qty > 0 ? premiumDollars(leg.avgEntry, contracts) : null;
  const mark = premiumDollars(leg.last, contracts);
  const widthLoss =
    leg.qty < 0 && leg.right === "P"
      ? leg.strike * OPTION_CONTRACT_MULTIPLIER * contracts
      : null;
  const maxLoss =
    widthLoss != null && creditReceived != null
      ? Math.max(0, widthLoss - creditReceived)
      : widthLoss;
  const maxProfit = creditReceived;
  const pctOfMaxProfit =
    creditReceived != null && creditReceived !== 0 && leg.unrealized != null
      ? leg.unrealized / creditReceived
      : null;

  return {
    id: `single:${leg.symbol}`,
    kind: "single",
    sleeve: sleeveForDte(leg.dte),
    underlying: leg.underlying,
    expiry: leg.expiry,
    dte: leg.dte,
    shortStrike: leg.qty < 0 ? leg.strike : null,
    longStrike: leg.qty > 0 ? leg.strike : null,
    contracts,
    creditReceived: creditReceived ?? (debitPaid != null ? -debitPaid : null),
    mark,
    unrealized: leg.unrealized,
    maxLoss,
    maxProfit,
    pctOfMaxProfit,
    legs: [leg],
  };
}

function buildCreditSpread(
  shortLeg: OpdLegView,
  longLeg: OpdLegView,
  contracts: number,
): OpdSpreadView {
  const kind: OpdSpreadKind =
    shortLeg.right === "P" ? "put_credit" : "call_credit";
  const width = Math.abs(shortLeg.strike - longLeg.strike);
  const shortCredit = premiumDollars(shortLeg.avgEntry, contracts);
  const longDebit = premiumDollars(longLeg.avgEntry, contracts);
  const creditReceived =
    shortCredit != null && longDebit != null ? shortCredit - longDebit : null;
  const shortMark = premiumDollars(shortLeg.last, contracts);
  const longMark = premiumDollars(longLeg.last, contracts);
  const mark =
    shortMark != null && longMark != null ? shortMark - longMark : null;
  const widthDollars = width * OPTION_CONTRACT_MULTIPLIER * contracts;
  const maxLoss =
    creditReceived != null ? Math.max(0, widthDollars - creditReceived) : widthDollars;
  const unrealized = sumNullable([shortLeg.unrealized, longLeg.unrealized]);
  const pctOfMaxProfit =
    creditReceived != null && creditReceived !== 0 && unrealized != null
      ? unrealized / creditReceived
      : null;

  return {
    id: `${kind}:${shortLeg.underlying}:${shortLeg.expiry}:${shortLeg.strike}/${longLeg.strike}`,
    kind,
    sleeve: sleeveForDte(shortLeg.dte),
    underlying: shortLeg.underlying,
    expiry: shortLeg.expiry,
    dte: shortLeg.dte,
    shortStrike: shortLeg.strike,
    longStrike: longLeg.strike,
    contracts,
    creditReceived,
    mark,
    unrealized,
    maxLoss,
    maxProfit: creditReceived,
    pctOfMaxProfit,
    legs: [shortLeg, longLeg],
  };
}

function pairCredits(legs: OpdLegView[]): OpdSpreadView[] {
  const shorts = legs
    .filter((leg) => leg.qty < 0)
    .sort((left, right) => right.strike - left.strike);
  const longs = legs
    .filter((leg) => leg.qty > 0)
    .sort((left, right) => right.strike - left.strike);
  const remainingLongs = [...longs];
  const spreads: OpdSpreadView[] = [];
  const leftovers: OpdLegView[] = [];

  for (const shortLeg of shorts) {
    const right = shortLeg.right;
    const longIndex = remainingLongs.findIndex((longLeg) => {
      if (longLeg.right !== right) {
        return false;
      }
      if (right === "P") {
        return longLeg.strike < shortLeg.strike;
      }
      return longLeg.strike > shortLeg.strike;
    });
    if (longIndex < 0) {
      leftovers.push(shortLeg);
      continue;
    }
    const [longLeg] = remainingLongs.splice(longIndex, 1);
    if (!longLeg) {
      leftovers.push(shortLeg);
      continue;
    }
    const contracts = Math.min(Math.abs(shortLeg.qty), Math.abs(longLeg.qty));
    if (contracts <= 0) {
      leftovers.push(shortLeg, longLeg);
      continue;
    }
    spreads.push(buildCreditSpread(shortLeg, longLeg, contracts));
  }

  leftovers.push(...remainingLongs);
  for (const leg of leftovers) {
    spreads.push(buildSingle(leg));
  }
  return spreads;
}

export function groupOpdSpreads(
  positions: AlpacaPosition[],
  now: number,
): OpdSpreadView[] {
  const legs = positions
    .map((position) => toOpdLeg(position, now))
    .filter((leg): leg is OpdLegView => leg != null);

  const groups = new Map<string, OpdLegView[]>();
  for (const leg of legs) {
    const key = `${leg.underlying}|${leg.expiry}|${leg.right}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(leg);
    groups.set(key, bucket);
  }

  const spreads: OpdSpreadView[] = [];
  for (const bucket of groups.values()) {
    spreads.push(...pairCredits(bucket));
  }

  return spreads.sort((left, right) => {
    if (left.dte !== right.dte) {
      return left.dte - right.dte;
    }
    if (left.underlying !== right.underlying) {
      return left.underlying.localeCompare(right.underlying);
    }
    return left.id.localeCompare(right.id);
  });
}

export function sleeveSpreads(
  spreads: OpdSpreadView[],
  sleeve: OpdSleeve,
): OpdSpreadView[] {
  return spreads.filter((spread) => spread.sleeve === sleeve);
}

export function openMaxLossUsd(spreads: OpdSpreadView[]): number | null {
  return sumNullable(spreads.map((spread) => spread.maxLoss));
}
