import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EQUITY_CURVE_WINDOW_DAYS } from "./constants";
import {
  addCalendarDays,
  etCalendarDateKey,
  equityCurveTicks,
  equityCurveWindow,
  formatDeskDay,
  formatEquityCurveDate,
  formatEtDate,
  formatEtDateRange,
  formatSignedUsd,
} from "./format";

function naiveEtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });
}

describe("formatDeskDay", () => {
  it("labels blotter times in America/New_York, not the host or Pacific clock", () => {
    const spyLimit = "2026-10-12T13:51:50.421175Z";
    assert.equal(
      new Date(spyLimit).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/Los_Angeles",
      }),
      "Oct 12, 6:51 AM",
    );
    assert.equal(formatDeskDay(spyLimit), "Oct 12, 9:51 AM");
    assert.equal(formatDeskDay("2026-10-18T00:00:00-04:00"), "Oct 18, 12:00 AM");
    assert.equal(formatDeskDay(null), "—");
    assert.equal(formatDeskDay("not-a-date"), "—");
  });
});

describe("formatEtDate", () => {
  it("keeps a date-only ISO string on that civil day in Eastern Time", () => {
    assert.equal(naiveEtDate("2026-11-15"), "Sat, Nov 14, 2026");
    assert.equal(formatEtDate("2026-11-15"), "Sun, Nov 15, 2026");
    assert.equal(formatEtDate("2026-11-15", "short"), "Nov 15");
    assert.equal(formatEtDate("2026-11-15", "weekday"), "Sun, Nov 15");
  });

  it("does not roll the Nov 1 2026 DST fall-back back to October", () => {
    assert.equal(naiveEtDate("2026-11-01"), "Sat, Oct 31, 2026");
    assert.equal(formatEtDate("2026-11-01"), "Sun, Nov 1, 2026");
    assert.equal(formatEtDate("2026-11-01", "short"), "Nov 1");
    assert.equal(formatEtDate("2026-11-01", "weekday"), "Sun, Nov 1");
  });

  it("labels a DST-shifted clock end from its written UTC date, not the ET instant", () => {
    const clockEnd = "2026-11-15T04:00:00.000Z";
    assert.equal(naiveEtDate(clockEnd), "Sat, Nov 14, 2026");
    assert.equal(formatEtDate(clockEnd), "Sun, Nov 15, 2026");
    assert.equal(
      formatEtDateRange("2026-10-18T00:00:00-04:00", clockEnd),
      "Oct 18 → Nov 15, 2026 ET",
    );
  });

  it("includes both years when the range crosses New Year", () => {
    assert.equal(
      formatEtDateRange("2026-12-20", "2027-01-17"),
      "Dec 20, 2026 → Jan 17, 2027 ET",
    );
  });

  it("returns an em dash for missing or invalid values", () => {
    assert.equal(formatEtDate(null), "—");
    assert.equal(formatEtDate("not-a-date"), "—");
    assert.equal(formatEtDate("2026-11-31"), "—");
    assert.equal(formatEtDateRange("2026-11-15", null), "—");
  });
});

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

describe("formatSignedUsd", () => {
  it("adds an explicit plus for gains and a minus for losses", () => {
    assert.equal(formatSignedUsd(12.34), "+$12.34");
    assert.equal(formatSignedUsd(-12.34), "−$12.34");
    assert.equal(formatSignedUsd(0), "$0.00");
    assert.equal(formatSignedUsd(null), "—");
  });
});

describe("equityCurveTicks", () => {
  it("always includes the last day and steps up on longer windows", () => {
    const week = equityCurveTicks("2026-10-13", "2026-10-19");
    assert.equal(week[week.length - 1], Date.parse("2026-10-19T12:00:00.000Z"));
    assert.ok(week.length >= 2);
    const month = equityCurveTicks("2026-09-20", "2026-10-19");
    assert.ok(month.length < week.length + 10);
  });
});

describe("equityCurveWindow", () => {
  it("is a 30 inclusive ET-day window ending today, independent of the 28-day mandate", () => {
    const window = equityCurveWindow(Date.parse("2026-09-22T16:00:00.000Z"));
    assert.equal(EQUITY_CURVE_WINDOW_DAYS, 30);
    assert.equal(window.startKey, "2026-08-24");
    assert.equal(window.endKey, "2026-09-22");
    assert.equal(addCalendarDays(window.startKey, 29), window.endKey);
    assert.equal(formatEquityCurveDate(window.endMs), "Sep 22");
    assert.equal(formatEquityCurveDate(window.startMs), "Aug 24");
  });
});
