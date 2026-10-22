import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { groupOpdSpreads, openMaxLossUsd } from "./opd-spreads";
import type { AlpacaPosition } from "./types";

const now = Date.parse("2026-10-22T12:00:00-04:00");

function position(
  symbol: string,
  qty: string,
  avg: string,
  last: string,
  market: string,
  pl: string,
): AlpacaPosition {
  return {
    symbol,
    qty,
    avg_entry_price: avg,
    current_price: last,
    market_value: market,
    unrealized_pl: pl,
    unrealized_plpc: "0",
  };
}

describe("groupOpdSpreads", () => {
  it("pairs a put credit spread into the 45–60 DTE sleeve", () => {
    const spreads = groupOpdSpreads(
      [
        position("SPY261218P00680000", "-2", "2.15", "1.62", "-324", "106"),
        position("SPY261218P00665000", "2", "0.95", "0.71", "142", "-48"),
      ],
      now,
    );
    assert.equal(spreads.length, 1);
    const spread = spreads[0]!;
    assert.equal(spread.kind, "put_credit");
    assert.equal(spread.sleeve, "credit");
    assert.equal(spread.underlying, "SPY");
    assert.equal(spread.shortStrike, 680);
    assert.equal(spread.longStrike, 665);
    assert.equal(spread.contracts, 2);
    assert.equal(spread.dte, 57);
    assert.equal(spread.creditReceived, 240);
    assert.equal(spread.mark, 182);
    assert.equal(spread.unrealized, 58);
    assert.equal(spread.maxLoss, 2760);
    assert.equal(spread.maxProfit, 240);
    assert.ok(spread.pctOfMaxProfit != null);
    assert.ok(Math.abs(spread.pctOfMaxProfit - 58 / 240) < 1e-9);
  });

  it("puts a 0–3 DTE pair in the day sleeve", () => {
    const spreads = groupOpdSpreads(
      [
        position("QQQ261023P00600000", "-1", "1.40", "1.85", "-185", "-45"),
        position("QQQ261023P00595000", "1", "0.70", "0.92", "92", "22"),
      ],
      now,
    );
    assert.equal(spreads.length, 1);
    assert.equal(spreads[0]!.sleeve, "day");
    assert.equal(spreads[0]!.kind, "put_credit");
    assert.equal(spreads[0]!.dte, 1);
    assert.equal(spreads[0]!.creditReceived, 70);
    assert.equal(spreads[0]!.maxLoss, 430);
  });

  it("leaves unmatched shorts as singles and sums open max loss", () => {
    const spreads = groupOpdSpreads(
      [position("IWM261218P00240000", "-1", "1.10", "1.00", "-100", "10")],
      now,
    );
    assert.equal(spreads[0]!.kind, "single");
    assert.equal(spreads[0]!.sleeve, "credit");
    assert.equal(openMaxLossUsd(spreads), 23890);
  });
});
