import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOpdSnapshot,
  filterPublicOpdOrders,
  isWorkingOrderStatus,
  toOpdAccountView,
} from "./opd";
import type { AlpacaAccount, AlpacaOrder, AlpacaPortfolioHistory } from "./types";

const account: AlpacaAccount = {
  id: "should-never-leak",
  account_number: "PA3DO3OD3",
  status: "ACTIVE",
  currency: "USD",
  cash: "21000",
  buying_power: "18000",
  options_buying_power: "18000",
  equity: "24820.4",
  last_equity: "25005.1",
  portfolio_value: "24820.4",
};

describe("toOpdAccountView", () => {
  it("strips broker ids and measures P&L versus the $25,000 baseline", () => {
    const view = toOpdAccountView(account, 1200);
    assert.equal(view.equity, 24820.4);
    assert.ok(view.dayPl != null);
    assert.ok(Math.abs(view.dayPl + 184.7) < 0.001);
    assert.ok(view.totalPl != null);
    assert.ok(Math.abs(view.totalPl + 179.6) < 0.001);
    assert.equal(view.optionsBuyingPowerUsed, 1200);
    assert.equal(Object.hasOwn(view, "id"), false);
    assert.doesNotMatch(JSON.stringify(view), /should-never-leak/);
    assert.doesNotMatch(JSON.stringify(view), /PA3DO3OD3/);
  });
});

describe("public legal lock", () => {
  const filled = {
    id: "fill",
    submittedAt: "2026-10-21T14:12:00-04:00",
    filledAt: "2026-10-21T14:12:08-04:00",
    symbol: "SPY261218P00680000",
    side: "sell",
    type: "limit",
    qty: 2,
    filledQty: 2,
    limitPrice: 2.15,
    filledAvgPrice: 2.15,
    status: "filled",
  };
  const working = {
    ...filled,
    id: "work",
    filledAt: null,
    filledQty: 0,
    filledAvgPrice: null,
    status: "new",
  };

  it("hides working orders before the 4:00 PM ET close", () => {
    assert.equal(isWorkingOrderStatus("new"), true);
    assert.equal(isWorkingOrderStatus("filled"), false);
    const before = filterPublicOpdOrders(
      [filled, working],
      Date.parse("2026-10-21T15:59:00-04:00"),
    );
    assert.equal(before.workingHidden, true);
    assert.deepEqual(
      before.orders.map((order) => order.id),
      ["fill"],
    );
  });

  it("shows working orders after the 4:00 PM ET close", () => {
    const after = filterPublicOpdOrders(
      [filled, working],
      Date.parse("2026-10-21T16:00:00-04:00"),
    );
    assert.equal(after.workingHidden, false);
    assert.deepEqual(
      after.orders.map((order) => order.id),
      ["fill", "work"],
    );
  });
});

describe("buildOpdSnapshot", () => {
  it("does not use the Test 2 DESK_* env for history or stake", () => {
    const previousStart = process.env.DESK_START_ISO;
    const previousFunded = process.env.DESK_FUNDED_ISO;
    const previousStake = process.env.DESK_STAKE_USD;
    process.env.DESK_START_ISO = "2026-10-18T00:00:00-04:00";
    process.env.DESK_FUNDED_ISO = "2026-09-19T01:19:00-04:00";
    process.env.DESK_STAKE_USD = "9970.33";
    try {
      const history: AlpacaPortfolioHistory = {
        timestamp: [Date.parse("2026-10-20T00:00:00.000Z") / 1000],
        equity: [25010],
        profit_loss: [10],
        profit_loss_pct: [0.0004],
        timeframe: "1D",
      };
      const snapshot = buildOpdSnapshot({
        account,
        positions: [],
        orders: [] as AlpacaOrder[],
        history,
        now: Date.parse("2026-10-22T12:00:00-04:00"),
      });
      assert.equal(snapshot.stake, 25_000);
      assert.equal(snapshot.base, "https://paper-api.alpaca.markets");
      assert.ok(snapshot.history.points.length > 0);
      assert.equal(snapshot.history.points[0]!.equity, 25010);
    } finally {
      if (previousStart === undefined) {
        delete process.env.DESK_START_ISO;
      } else {
        process.env.DESK_START_ISO = previousStart;
      }
      if (previousFunded === undefined) {
        delete process.env.DESK_FUNDED_ISO;
      } else {
        process.env.DESK_FUNDED_ISO = previousFunded;
      }
      if (previousStake === undefined) {
        delete process.env.DESK_STAKE_USD;
      } else {
        process.env.DESK_STAKE_USD = previousStake;
      }
    }
  });
});
