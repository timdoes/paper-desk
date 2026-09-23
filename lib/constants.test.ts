import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  DESK_LENGTH_DAYS,
  EQUITY_CURVE_WINDOW_DAYS,
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

  it("keeps the rolling equity-curve window independent of the mandate", () => {
    assert.match(equitySource, /EQUITY_CURVE_WINDOW_DAYS/);
    assert.doesNotMatch(equitySource, /DESK_LENGTH_DAYS/);
  });
});

