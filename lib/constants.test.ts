import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PAPER_DISCLAIMER } from "./constants";

describe("paper disclaimer", () => {
  it("keeps the persistent paper-only / not-advice copy", () => {
    assert.match(PAPER_DISCLAIMER, /Alpaca Paper only/);
    assert.match(PAPER_DISCLAIMER, /Simulated/);
    assert.match(PAPER_DISCLAIMER, /No real money/);
    assert.match(PAPER_DISCLAIMER, /Not investment advice/);
    assert.match(PAPER_DISCLAIMER, /Not a solicitation/);
    assert.match(PAPER_DISCLAIMER, /Do not copy these tickets/);
    assert.match(PAPER_DISCLAIMER, /Past paper results do not predict live results/);
    assert.match(PAPER_DISCLAIMER, /not an RIA or broker-dealer/);
  });
});
