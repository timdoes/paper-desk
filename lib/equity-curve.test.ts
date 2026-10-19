import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_EQUITY_CURVE_RANGE,
  equityCurveCaption,
  equityCurveCompareBase,
  equityCurveHeader,
  equityCurveTone,
  equityCurveYDomain,
  sliceEquityCurvePoints,
} from "./equity-curve";
import { noonUtcForDateKey } from "./format";

const stake = 9970.33;

function point(dateKey: string, equity: number) {
  return { t: noonUtcForDateKey(dateKey), equity };
}

const series = [
  point("2026-09-19", 10_000),
  point("2026-10-12", 9970.33),
  point("2026-10-13", 9970.33),
  point("2026-10-18", 9970.33),
  point("2026-10-19", 9970.33),
];

describe("sliceEquityCurvePoints", () => {
  it("defaults TEST to mandate start and keeps today as the right edge", () => {
    const sliced = sliceEquityCurvePoints(series, "TEST", {
      startIso: "2026-10-18T00:00:00-04:00",
    });
    assert.deepEqual(sliced, [
      point("2026-10-18", 9970.33),
      point("2026-10-19", 9970.33),
    ]);
  });

  it("ALL keeps first funding and does not insert $0", () => {
    const sliced = sliceEquityCurvePoints(series, "ALL", {
      startIso: "2026-10-18T00:00:00-04:00",
    });
    assert.equal(sliced[0]?.equity, 10_000);
    assert.equal(sliced[sliced.length - 1]?.equity, 9970.33);
    assert.ok(sliced.every((item) => item.equity !== 0));
  });

  it("1W and 1M start at their own windows without $0 padding", () => {
    const week = sliceEquityCurvePoints(series, "1W");
    const month = sliceEquityCurvePoints(series, "1M");
    assert.equal(week[0]?.t, noonUtcForDateKey("2026-10-13"));
    assert.equal(month[0]?.t, noonUtcForDateKey("2026-10-12"));
    assert.equal(week[week.length - 1]?.t, noonUtcForDateKey("2026-10-19"));
    assert.equal(month[month.length - 1]?.t, noonUtcForDateKey("2026-10-19"));
  });
});

describe("equityCurveCompareBase and header", () => {
  it("compares TEST to the stake and other ranges to the first point", () => {
    const testPoints = sliceEquityCurvePoints(series, "TEST", {
      startIso: "2026-10-18T00:00:00-04:00",
    });
    assert.equal(DEFAULT_EQUITY_CURVE_RANGE, "TEST");
    assert.equal(equityCurveCompareBase("TEST", testPoints, stake), stake);
    assert.equal(equityCurveCompareBase("ALL", series, stake), 10_000);
    assert.equal(equityCurveCompareBase("1W", series.slice(-2), stake), 9970.33);
  });

  it("builds signed change vs the compare base", () => {
    const live = point("2026-10-19", 9970.33);
    const vsStake = equityCurveHeader(live, stake);
    assert.equal(vsStake.equity, 9970.33);
    assert.equal(vsStake.change, 0);
    assert.equal(vsStake.changePct, 0);
    assert.equal(equityCurveTone(vsStake.change), "up");

    const vsAll = equityCurveHeader(live, 10_000);
    assert.ok(vsAll.change != null && vsAll.change < 0);
    assert.equal(equityCurveTone(vsAll.change), "down");
  });
});

describe("equityCurveYDomain", () => {
  it("pads about 10% and never anchors at $0", () => {
    const [min, max] = equityCurveYDomain([9960, 10_010]);
    assert.ok(min > 0);
    assert.ok(min < 9960);
    assert.ok(max > 10_010);
    assert.ok(max - min > 10_010 - 9960);
  });

  it("uses a ±$25 minimum span for a flat stretch", () => {
    const [min, max] = equityCurveYDomain([9970.33]);
    assert.ok(Math.abs(min - (9970.33 - 25)) < 1e-9);
    assert.ok(Math.abs(max - (9970.33 + 25)) < 1e-9);
  });

  it("includes the dashed baseline in the domain", () => {
    const [min, max] = equityCurveYDomain([10_000, 10_010], [9970.33]);
    assert.ok(min < 9970.33);
    assert.ok(max > 10_010);
  });
});

describe("equityCurveCaption", () => {
  it("describes auto-scale and live lag without $0 padding", () => {
    const caption = equityCurveCaption("TEST");
    assert.match(caption, /Test window from mandate start/);
    assert.match(caption, /change vs stake/);
    assert.match(caption, /auto-scaled/);
    assert.match(caption, /live equity when Alpaca history lags/);
    assert.doesNotMatch(caption, /\$0/);
  });

  it("labels local fixture data", () => {
    assert.match(
      equityCurveCaption("ALL", { fixture: true }),
      /local fixture \(Test 1 archive, not live Alpaca\)/,
    );
  });
});
