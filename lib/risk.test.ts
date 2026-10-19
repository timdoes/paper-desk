import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateOrderRisk } from "./risk";
import type { PositionView } from "./types";

const aapl: PositionView = {
  symbol: "AAPL",
  qty: 10,
  avgEntry: 100,
  last: 100,
  marketValue: 1000,
  unrealized: 0,
  unrealizedPct: 0,
};

describe("evaluateOrderRisk", () => {
  it("blocks buys when the daily loss breaker is open at −2%", () => {
    const decision = evaluateOrderRisk({
      side: "buy",
      type: "limit",
      symbol: "MSFT",
      qty: 1,
      limitPrice: 10,
      equity: 9800,
      lastEquity: 10000,
      positions: [],
    });
    assert.equal(decision.allowed, false);
    if (!decision.allowed) {
      assert.equal(decision.code, "DAILY_LOSS_BREAKER");
    }
  });

  it("allows buys when day P&L is inside the −2% breaker", () => {
    const decision = evaluateOrderRisk({
      side: "buy",
      type: "limit",
      symbol: "MSFT",
      qty: 1,
      limitPrice: 10,
      equity: 9801,
      lastEquity: 10000,
      positions: [],
    });
    assert.equal(decision.allowed, true);
  });

  it("still allows sells when the breaker is open", () => {
    const decision = evaluateOrderRisk({
      side: "sell",
      type: "market",
      symbol: "AAPL",
      qty: 1,
      equity: 9800,
      lastEquity: 10000,
      positions: [aapl],
    });
    assert.equal(decision.allowed, true);
  });

  it("blocks buys that would exceed 15% NAV", () => {
    const decision = evaluateOrderRisk({
      side: "buy",
      type: "limit",
      symbol: "NVDA",
      qty: 16,
      limitPrice: 100,
      equity: 10000,
      lastEquity: 10000,
      positions: [],
    });
    assert.equal(decision.allowed, false);
    if (!decision.allowed) {
      assert.equal(decision.code, "NAME_CAP");
    }
  });

  it("allows a limit buy at 12% NAV (over the old 10% cap, inside 15%)", () => {
    const decision = evaluateOrderRisk({
      side: "buy",
      type: "limit",
      symbol: "MSFT",
      qty: 12,
      limitPrice: 100,
      equity: 10000,
      lastEquity: 10000,
      positions: [],
    });
    assert.equal(decision.allowed, true);
  });

  it("allows a limit buy at the 15% name cap", () => {
    const decision = evaluateOrderRisk({
      side: "buy",
      type: "limit",
      symbol: "MSFT",
      qty: 15,
      limitPrice: 100,
      equity: 10000,
      lastEquity: 10000,
      positions: [],
    });
    assert.equal(decision.allowed, true);
  });

  it("refuses a market buy without a mark price", () => {
    const decision = evaluateOrderRisk({
      side: "buy",
      type: "market",
      symbol: "NEW",
      qty: 1,
      equity: 10000,
      lastEquity: 10000,
      positions: [],
    });
    assert.equal(decision.allowed, false);
    if (!decision.allowed) {
      assert.equal(decision.code, "NO_MARK_PRICE");
    }
  });
});
