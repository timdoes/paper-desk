import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  DAILY_LOSS_BREAKER_PCT,
  DESK_LENGTH_DAYS,
  EQUITY_CURVE_WINDOW_DAYS,
  MAX_NAME_NAV_PCT,
  PAPER_DISCLAIMER,
} from "./constants";

const bannerSource = readFileSync(
  new URL("../components/desk/disclaimer-banner.tsx", import.meta.url),
  "utf8",
);
const layoutSource = readFileSync(
  new URL("../app/layout.tsx", import.meta.url),
  "utf8",
);
const headerSource = readFileSync(
  new URL("../components/desk/desk-header.tsx", import.meta.url),
  "utf8",
);
const setupSource = readFileSync(
  new URL("../components/desk/setup-desk.tsx", import.meta.url),
  "utf8",
);
const feedSource = readFileSync(
  new URL("../components/desk/desk-feed.tsx", import.meta.url),
  "utf8",
);
const equitySource = readFileSync(
  new URL("../components/desk/equity-curve.tsx", import.meta.url),
  "utf8",
);
const equityLibSource = readFileSync(
  new URL("./equity-curve.ts", import.meta.url),
  "utf8",
);
const riskStripSource = readFileSync(
  new URL("../components/desk/risk-strip.tsx", import.meta.url),
  "utf8",
);
const riskSource = readFileSync(new URL("./risk.ts", import.meta.url), "utf8");

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
    assert.doesNotMatch(bannerSource, /position:\s*(sticky|fixed)/);
    assert.doesNotMatch(layoutSource, /position:\s*(sticky|fixed)/);

    const classNames = [...bannerSource.matchAll(/className="([^"]*)"/g)].flatMap(
      (match) => match[1].split(/\s+/),
    );
    assert.ok(classNames.length > 0);
    assert.ok(!classNames.includes("sticky"));
    assert.ok(!classNames.includes("fixed"));
  });
});

describe("mandate clock", () => {
  it("is 28 calendar days; the equity-curve window stays 30", () => {
    assert.equal(DESK_LENGTH_DAYS, 28);
    assert.equal(EQUITY_CURVE_WINDOW_DAYS, 30);
  });

  it("describes the mandate as 28-day in chrome and metadata", () => {
    assert.match(layoutSource, /DESK_LENGTH_DAYS/);
    assert.doesNotMatch(layoutSource, /30-day/);
    assert.match(headerSource, /DESK_LENGTH_DAYS/);
    assert.doesNotMatch(headerSource, /30-day/);
    assert.match(setupSource, /DESK_LENGTH_DAYS/);
    assert.doesNotMatch(setupSource, /30-day/);
    assert.match(feedSource, /DESK_LENGTH_DAYS/);
    assert.doesNotMatch(feedSource, /30-day/);
  });

  it("keeps the 1M equity-curve window independent of the mandate", () => {
    assert.match(equityLibSource, /EQUITY_CURVE_WINDOW_DAYS/);
    assert.doesNotMatch(equitySource, /DESK_LENGTH_DAYS/);
    assert.doesNotMatch(equityLibSource, /DESK_LENGTH_DAYS/);
  });
});

describe("Test 2 risk limits", () => {
  it("caps a name at 15% of equity and trips the daily breaker at −2%", () => {
    assert.equal(MAX_NAME_NAV_PCT, 0.15);
    assert.equal(DAILY_LOSS_BREAKER_PCT, 0.02);
  });

  it("renders the risk strip from the shared constants", () => {
    assert.match(riskStripSource, /MAX_NAME_NAV_PCT/);
    assert.match(riskStripSource, /DAILY_LOSS_BREAKER_PCT/);
    assert.doesNotMatch(riskStripSource, /10% NAV/);
    assert.doesNotMatch(riskStripSource, /Daily loss breaker · 3%/);
  });

  it("does not hard-code the old 10% / ~3% copy in order-risk reasons", () => {
    assert.doesNotMatch(riskSource, /10% NAV name cap/);
    assert.doesNotMatch(riskSource, /~3% daily loss breaker/);
  });
});

