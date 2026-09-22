import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatEquityCurveDate, skipLeadingZeroEquity } from "./format";

describe("formatEquityCurveDate", () => {
  it("labels a UTC-midnight Alpaca 1D bar as that UTC calendar day in ET", () => {
    const t = Date.parse("2026-09-19T00:00:00.000Z");

    // Raw ET formatting of midnight UTC is the previous evening.
    assert.equal(
      new Date(t).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "America/New_York",
      }),
      "Sep 18",
    );
    // Pacific (the original desk-clock bug) is also a day behind.
    assert.equal(
      new Date(t).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "America/Los_Angeles",
      }),
      "Sep 18",
    );

    assert.equal(formatEquityCurveDate(t), "Sep 19");
  });

  it("keeps a winter UTC-midnight bar on the same calendar day", () => {
    const t = Date.parse("2026-01-15T00:00:00.000Z");
    assert.equal(
      new Date(t).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "America/New_York",
      }),
      "Jan 14",
    );
    assert.equal(formatEquityCurveDate(t), "Jan 15");
  });

  it("does not roll a noon-UTC instant into the next ET day", () => {
    assert.equal(
      formatEquityCurveDate(Date.parse("2026-09-19T12:00:00.000Z")),
      "Sep 19",
    );
  });

  it("returns an em dash for invalid timestamps", () => {
    assert.equal(formatEquityCurveDate(Number.NaN), "—");
  });
});

describe("skipLeadingZeroEquity", () => {
  it("starts the series at the first funded day", () => {
    const points = [
      { t: Date.parse("2026-09-17T00:00:00.000Z"), equity: 0 },
      { t: Date.parse("2026-09-18T00:00:00.000Z"), equity: 0 },
      { t: Date.parse("2026-09-19T00:00:00.000Z"), equity: 10_000 },
      { t: Date.parse("2026-09-20T00:00:00.000Z"), equity: 10_050 },
    ];
    assert.deepEqual(skipLeadingZeroEquity(points), points.slice(2));
  });

  it("keeps an already-funded series unchanged", () => {
    const points = [
      { t: Date.parse("2026-09-19T00:00:00.000Z"), equity: 10_000 },
      { t: Date.parse("2026-09-20T00:00:00.000Z"), equity: 9_800 },
    ];
    assert.deepEqual(skipLeadingZeroEquity(points), points);
  });

  it("does not invent a curve when every broker point is zero", () => {
    const points = [
      { t: Date.parse("2026-09-19T00:00:00.000Z"), equity: 0 },
      { t: Date.parse("2026-09-20T00:00:00.000Z"), equity: 0 },
    ];
    assert.deepEqual(skipLeadingZeroEquity(points), points);
  });
});
