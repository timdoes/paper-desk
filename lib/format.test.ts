import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addCalendarDays,
  etCalendarDateKey,
  equityCurveWindow,
  formatEquityCurveDate,
} from "./format";

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

describe("etCalendarDateKey", () => {
  it("stays on the ET calendar date after 10pm Eastern", () => {
    assert.equal(etCalendarDateKey(Date.parse("2026-09-23T02:00:00.000Z")), "2026-09-22");
  });

  it("uses the ET date, not the UTC date, around midnight", () => {
    assert.equal(etCalendarDateKey(Date.parse("2026-09-22T03:30:00.000Z")), "2026-09-21");
  });
});

describe("equityCurveWindow", () => {
  it("is 30 inclusive ET days ending today", () => {
    const window = equityCurveWindow(Date.parse("2026-09-22T16:00:00.000Z"));
    assert.equal(window.startKey, "2026-08-24");
    assert.equal(window.endKey, "2026-09-22");
    assert.equal(addCalendarDays(window.startKey, 29), window.endKey);
    assert.equal(formatEquityCurveDate(window.endMs), "Sep 22");
    assert.equal(formatEquityCurveDate(window.startMs), "Aug 24");
  });
});
