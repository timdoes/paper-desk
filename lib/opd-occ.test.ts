import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { optionDte, parseOccSymbol } from "./opd-occ";

describe("OCC option symbols", () => {
  it("parses an Alpaca put symbol into strike and expiry", () => {
    const parsed = parseOccSymbol("SPY261218P00680000");
    assert.deepEqual(parsed, {
      symbol: "SPY261218P00680000",
      underlying: "SPY",
      expiry: "2026-12-18",
      right: "P",
      strike: 680,
    });
  });

  it("accepts space-padded OCC roots and rejects junk", () => {
    const parsed = parseOccSymbol("AAPL  261117C00200000");
    assert.equal(parsed?.underlying, "AAPL");
    assert.equal(parsed?.strike, 200);
    assert.equal(parsed?.right, "C");
    assert.equal(parseOccSymbol("SPY"), null);
    assert.equal(parseOccSymbol("not-an-option"), null);
  });

  it("counts DTE on the ET calendar", () => {
    const now = Date.parse("2026-10-22T12:00:00-04:00");
    assert.equal(optionDte("2026-10-22", now), 0);
    assert.equal(optionDte("2026-10-23", now), 1);
    assert.equal(optionDte("2026-12-18", now), 57);
  });
});
