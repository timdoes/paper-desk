import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DESK_LENGTH_DAYS, EQUITY_CURVE_WINDOW_DAYS } from "./constants";
import {
  deskFundedEtDateKey,
  deskStartEtDateKey,
  getDeskClock,
  shapeEquityCurvePoints,
  toHistoryPoints,
} from "./desk";
import {
  formatEquityCurveDate,
  noonUtcForDateKey,
} from "./format";

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

describe("deskStartEtDateKey", () => {
  it("uses the America/New_York calendar date of DESK_START_ISO", () => {
    assert.equal(
      deskStartEtDateKey("2026-09-19T01:19:00-04:00"),
      "2026-09-19",
    );
    assert.equal(
      deskStartEtDateKey("2026-09-20T00:00:00-04:00"),
      "2026-09-20",
    );
  });

  it("returns null when the start is missing or invalid", () => {
    assert.equal(deskStartEtDateKey(null), null);
    assert.equal(deskStartEtDateKey(""), null);
    assert.equal(deskStartEtDateKey("not-a-date"), null);
  });
});

describe("deskFundedEtDateKey", () => {
  it("prefers first-funded over mandate start", () => {
    assert.equal(
      deskFundedEtDateKey(
        "2026-09-19T01:19:00-04:00",
        "2026-09-20T00:00:00-04:00",
      ),
      "2026-09-19",
    );
  });

  it("falls back to mandate start when funded is unset", () => {
    assert.equal(
      deskFundedEtDateKey(null, "2026-09-20T00:00:00-04:00"),
      "2026-09-20",
    );
  });
});

describe("getDeskClock", () => {
  const mandateStart = "2026-09-20T00:00:00-04:00";

  it("is a 28-day Sunday-to-Sunday mandate", () => {
    const clock = getDeskClock(
      mandateStart,
      Date.parse("2026-09-20T00:00:00-04:00"),
    );
    assert.equal(clock.configured, true);
    assert.equal(clock.totalDays, DESK_LENGTH_DAYS);
    assert.equal(DESK_LENGTH_DAYS, 28);
    if (clock.configured) {
      assert.equal(clock.startIso, "2026-09-20T04:00:00.000Z");
      assert.equal(clock.endsAt, "2026-10-18T04:00:00.000Z");
      assert.equal(clock.daysLeft, 28);
    }
  });

  it("counts whole days remaining through first RTH Monday", () => {
    const clock = getDeskClock(
      mandateStart,
      Date.parse("2026-09-21T13:30:00-04:00"),
    );
    assert.equal(clock.configured, true);
    if (clock.configured) {
      assert.equal(clock.daysLeft, 27);
      assert.equal(clock.totalDays, 28);
    }
  });

  it("hits zero at the Sunday cohort end", () => {
    const clock = getDeskClock(
      mandateStart,
      Date.parse("2026-10-18T00:00:00-04:00"),
    );
    assert.equal(clock.configured, true);
    if (clock.configured) {
      assert.equal(clock.daysLeft, 0);
    }
  });

  it("still reports totalDays when the start is unset", () => {
    const clock = getDeskClock("", Date.parse("2026-09-21T13:30:00-04:00"));
    assert.equal(clock.configured, false);
    assert.equal(clock.totalDays, 28);
    assert.equal(clock.daysLeft, null);
  });
});

describe("shapeEquityCurvePoints", () => {
  const now = Date.parse("2026-09-22T16:00:00.000Z"); // noon ET on Tue Sep 22
  const isolated = {
    deskStartIso: null as string | null,
    deskFundedIso: null as string | null,
  };

  function equityOn(points: { t: number; equity: number }[], label: string) {
    return points.find((point) => formatEquityCurveDate(point.t) === label)
      ?.equity;
  }

  it("carries last broker equity through missing days and pins today to live equity", () => {
    const points = shapeEquityCurvePoints(
      [
        { t: Date.parse("2026-09-17T00:00:00.000Z"), equity: 0 },
        { t: Date.parse("2026-09-18T00:00:00.000Z"), equity: 0 },
        { t: Date.parse("2026-09-19T00:00:00.000Z"), equity: 10_000 },
      ],
      { liveEquity: 10_042.18, now, ...isolated },
    );

    assert.equal(points.length, EQUITY_CURVE_WINDOW_DAYS);
    assert.equal(formatEquityCurveDate(points[0]!.t), "Aug 24");
    assert.equal(points[0]!.equity, 0);
    assert.equal(equityOn(points, "Sep 18"), 0);
    assert.deepEqual(points.slice(-4), [
      { t: noonUtcForDateKey("2026-09-19"), equity: 10_000 },
      { t: noonUtcForDateKey("2026-09-20"), equity: 10_000 },
      { t: noonUtcForDateKey("2026-09-21"), equity: 10_000 },
      { t: noonUtcForDateKey("2026-09-22"), equity: 10_042.18 },
    ]);
    assert.equal(formatEquityCurveDate(points[points.length - 1]!.t), "Sep 22");
  });

  it("keeps the current ET date as the right edge after 10pm ET", () => {
    const lateEt = Date.parse("2026-09-23T02:00:00.000Z"); // 10pm ET Sep 22
    const points = shapeEquityCurvePoints(
      [{ t: Date.parse("2026-09-19T00:00:00.000Z"), equity: 10_000 }],
      { liveEquity: 9_980, now: lateEt, ...isolated },
    );

    assert.equal(formatEquityCurveDate(points[0]!.t), "Aug 24");
    assert.equal(points[0]!.equity, 0);
    assert.equal(formatEquityCurveDate(points[points.length - 1]!.t), "Sep 22");
    assert.equal(points[points.length - 1]!.equity, 9_980);
  });

  it("overwrites today's broker bar with live equity so the KPI matches", () => {
    const points = shapeEquityCurvePoints(
      [
        { t: Date.parse("2026-09-21T00:00:00.000Z"), equity: 10_010 },
        { t: Date.parse("2026-09-22T00:00:00.000Z"), equity: 10_020 },
      ],
      { liveEquity: 10_055, now, ...isolated },
    );

    assert.equal(points[points.length - 1]!.equity, 10_055);
    assert.equal(formatEquityCurveDate(points[points.length - 1]!.t), "Sep 22");
  });

  it("keeps pre-funding days at $0 and starts the real path on the first funded day", () => {
    const points = shapeEquityCurvePoints(
      [
        { t: Date.parse("2026-08-24T00:00:00.000Z"), equity: 0 },
        { t: Date.parse("2026-09-18T00:00:00.000Z"), equity: 0 },
        { t: Date.parse("2026-09-19T00:00:00.000Z"), equity: 10_000 },
        { t: Date.parse("2026-09-21T00:00:00.000Z"), equity: 10_080 },
      ],
      { liveEquity: 10_090, now, ...isolated },
    );

    assert.equal(points.length, EQUITY_CURVE_WINDOW_DAYS);
    assert.equal(formatEquityCurveDate(points[0]!.t), "Aug 24");
    assert.ok(
      points
        .filter((point) => point.t < noonUtcForDateKey("2026-09-19"))
        .every((point) => point.equity === 0),
    );
    assert.equal(points[0]!.equity, 0);
    assert.equal(equityOn(points, "Sep 18"), 0);
    assert.equal(equityOn(points, "Sep 19"), 10_000);
    assert.equal(equityOn(points, "Sep 20"), 10_000);
    assert.equal(equityOn(points, "Sep 21"), 10_080);
    assert.equal(points[points.length - 1]!.equity, 10_090);
    assert.equal(formatEquityCurveDate(points[points.length - 1]!.t), "Sep 22");
    assert.equal(
      points.filter(
        (point) =>
          point.equity === 10_000 && point.t < noonUtcForDateKey("2026-09-19"),
      ).length,
      0,
    );
  });

  it("uses first-funded when mandate Sunday is later than Saturday funding", () => {
    const points = shapeEquityCurvePoints(
      [
        { t: Date.parse("2026-09-18T00:00:00.000Z"), equity: 10_000 },
        { t: Date.parse("2026-09-19T00:00:00.000Z"), equity: 10_012 },
        { t: Date.parse("2026-09-21T00:00:00.000Z"), equity: 10_080 },
      ],
      {
        liveEquity: 10_090,
        now,
        deskStartIso: "2026-09-20T00:00:00-04:00",
        deskFundedIso: "2026-09-19T01:19:00-04:00",
      },
    );

    assert.equal(points.length, EQUITY_CURVE_WINDOW_DAYS);
    assert.equal(equityOn(points, "Sep 18"), 0);
    assert.equal(equityOn(points, "Sep 19"), 10_012);
    assert.equal(equityOn(points, "Sep 20"), 10_012);
    assert.equal(equityOn(points, "Sep 21"), 10_080);
    assert.equal(points[points.length - 1]!.equity, 10_090);
  });

  it("zeros Saturday when only the Sunday mandate start is set", () => {
    const points = shapeEquityCurvePoints(
      [
        { t: Date.parse("2026-09-18T00:00:00.000Z"), equity: 10_000 },
        { t: Date.parse("2026-09-19T00:00:00.000Z"), equity: 10_012 },
        { t: Date.parse("2026-09-21T00:00:00.000Z"), equity: 10_080 },
      ],
      {
        liveEquity: 10_090,
        now,
        deskStartIso: "2026-09-20T00:00:00-04:00",
        deskFundedIso: null,
      },
    );

    assert.equal(equityOn(points, "Sep 19"), 0);
    assert.equal(equityOn(points, "Sep 20"), 10_012);
    assert.equal(equityOn(points, "Sep 21"), 10_080);
  });

  it("uses DESK_START_ISO as the first nonzero day when it is set", () => {
    const points = shapeEquityCurvePoints(
      [
        { t: Date.parse("2026-09-18T00:00:00.000Z"), equity: 10_000 },
        { t: Date.parse("2026-09-19T00:00:00.000Z"), equity: 10_012 },
        { t: Date.parse("2026-09-21T00:00:00.000Z"), equity: 10_080 },
      ],
      {
        liveEquity: 10_090,
        now,
        deskStartIso: "2026-09-19T01:19:00-04:00",
      },
    );

    assert.equal(points.length, EQUITY_CURVE_WINDOW_DAYS);
    assert.equal(equityOn(points, "Sep 18"), 0);
    assert.equal(equityOn(points, "Sep 19"), 10_012);
    assert.equal(equityOn(points, "Sep 20"), 10_012);
    assert.equal(equityOn(points, "Sep 21"), 10_080);
    assert.equal(points[points.length - 1]!.equity, 10_090);
  });

  it("shows first funded equity from DESK_START when history starts later", () => {
    const points = shapeEquityCurvePoints(
      [{ t: Date.parse("2026-09-21T00:00:00.000Z"), equity: 10_080 }],
      {
        liveEquity: 10_090,
        now,
        deskStartIso: "2026-09-19T01:19:00-04:00",
      },
    );

    assert.equal(equityOn(points, "Sep 18"), 0);
    assert.equal(equityOn(points, "Sep 19"), 10_080);
    assert.equal(equityOn(points, "Sep 20"), 10_080);
    assert.equal(equityOn(points, "Sep 21"), 10_080);
    assert.equal(points[points.length - 1]!.equity, 10_090);
  });

  it("zeros days before DESK_START even when older funded history exists", () => {
    const points = shapeEquityCurvePoints(
      [
        { t: Date.parse("2026-08-24T00:00:00.000Z"), equity: 9_500 },
        { t: Date.parse("2026-09-19T00:00:00.000Z"), equity: 10_000 },
      ],
      {
        liveEquity: 10_010,
        now,
        deskStartIso: "2026-09-19T01:19:00-04:00",
      },
    );

    assert.equal(points[0]!.equity, 0);
    assert.ok(
      points
        .filter((point) => point.t < noonUtcForDateKey("2026-09-19"))
        .every((point) => point.equity === 0),
    );
    assert.equal(equityOn(points, "Sep 19"), 10_000);
    assert.equal(points[points.length - 1]!.equity, 10_010);
  });

  it("fills a 30-day window from older funded history without zigzag gaps", () => {
    const broker: { t: number; equity: number }[] = [];
    for (let day = 20; day <= 31; day += 1) {
      broker.push({
        t: Date.parse(`2026-08-${day}T00:00:00.000Z`),
        equity: 9_000 + day,
      });
    }
    for (let day = 1; day <= 19; day += 1) {
      if (day === 5 || day === 6) {
        continue;
      }
      broker.push({
        t: Date.parse(`2026-09-${String(day).padStart(2, "0")}T00:00:00.000Z`),
        equity: 10_000 + day,
      });
    }

    const points = shapeEquityCurvePoints(broker, {
      liveEquity: 10_500,
      now,
      ...isolated,
    });

    assert.equal(points.length, EQUITY_CURVE_WINDOW_DAYS);
    assert.equal(formatEquityCurveDate(points[0]!.t), "Aug 24");
    assert.equal(formatEquityCurveDate(points[points.length - 1]!.t), "Sep 22");
    assert.equal(points[points.length - 1]!.equity, 10_500);
    assert.equal(points[0]!.equity, 9_024);

    const sep4 = points.find((point) => formatEquityCurveDate(point.t) === "Sep 4");
    const sep5 = points.find((point) => formatEquityCurveDate(point.t) === "Sep 5");
    const sep6 = points.find((point) => formatEquityCurveDate(point.t) === "Sep 6");
    assert.equal(sep4?.equity, 10_004);
    assert.equal(sep5?.equity, 10_004);
    assert.equal(sep6?.equity, 10_004);
  });

  it("uses live equity on today only when every broker bar is still zero", () => {
    const points = shapeEquityCurvePoints(
      [
        { t: Date.parse("2026-09-19T00:00:00.000Z"), equity: 0 },
        { t: Date.parse("2026-09-21T00:00:00.000Z"), equity: 0 },
      ],
      { liveEquity: 10_000, now, ...isolated },
    );

    assert.equal(points.length, EQUITY_CURVE_WINDOW_DAYS);
    assert.equal(formatEquityCurveDate(points[0]!.t), "Aug 24");
    assert.equal(points[0]!.equity, 0);
    assert.ok(points.slice(0, -1).every((point) => point.equity === 0));
    assert.equal(points[points.length - 1]!.equity, 10_000);
    assert.equal(formatEquityCurveDate(points[points.length - 1]!.t), "Sep 22");
  });

  it("returns no points when history is unfunded and live equity is missing", () => {
    assert.deepEqual(
      shapeEquityCurvePoints(
        [{ t: Date.parse("2026-09-19T00:00:00.000Z"), equity: 0 }],
        { liveEquity: null, now, ...isolated },
      ),
      [],
    );
  });

  it("keeps today's carry when live equity is unavailable", () => {
    const points = shapeEquityCurvePoints(
      [{ t: Date.parse("2026-09-19T00:00:00.000Z"), equity: 10_000 }],
      { liveEquity: null, now, ...isolated },
    );

    assert.equal(points.length, EQUITY_CURVE_WINDOW_DAYS);
    assert.equal(formatEquityCurveDate(points[0]!.t), "Aug 24");
    assert.equal(points[0]!.equity, 0);
    assert.equal(equityOn(points, "Sep 19"), 10_000);
    assert.equal(points[points.length - 1]!.equity, 10_000);
    assert.equal(formatEquityCurveDate(points[points.length - 1]!.t), "Sep 22");
  });
});
