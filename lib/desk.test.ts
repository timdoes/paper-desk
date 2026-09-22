import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toHistoryPoints } from "./desk";

describe("toHistoryPoints", () => {
  it("keeps finite broker equity including leading zeros", () => {
    const points = toHistoryPoints({
      timestamp: [1_758_240_000, 1_758_326_400],
      equity: [0, 10_000],
      profit_loss: [null, null],
      profit_loss_pct: [null, null],
    });
    assert.deepEqual(points, [
      { t: 1_758_240_000_000, equity: 0 },
      { t: 1_758_326_400_000, equity: 10_000 },
    ]);
  });
});
