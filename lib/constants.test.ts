import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { PAPER_DISCLAIMER } from "./constants";

const bannerSource = readFileSync(
  new URL("../components/desk/disclaimer-banner.tsx", import.meta.url),
  "utf8",
);
const layoutSource = readFileSync(
  new URL("../app/layout.tsx", import.meta.url),
  "utf8",
);

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

  it("renders the full Legal copy from the root layout in document flow", () => {
    assert.match(layoutSource, /DisclaimerBanner/);
    assert.match(bannerSource, /\{PAPER_DISCLAIMER\}/);
    assert.doesNotMatch(bannerSource, /\bsticky\b/);
    assert.doesNotMatch(bannerSource, /\bfixed\b/);
    assert.doesNotMatch(bannerSource, /position:\s*(sticky|fixed)/);
    assert.doesNotMatch(layoutSource, /\bsticky\b|\bfixed\b/);
  });
});

