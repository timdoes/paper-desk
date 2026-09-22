import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shapeEquityCurvePoints, toHistoryPoints } from "./desk";
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

describe("shapeEquityCurvePoints", () => {
  const now = Date.parse("2026-09-22T16:00:00.000Z"); // noon ET on Tue Sep 22

  it("carries last broker equity through missing days and pins today to live equity", () => {
    const points = shapeEquityCurvePoints(
      [
        { t: Date.parse("2026-09-17T00:00:00.000Z"), equity: 0 },
        { t: Date.parse("2026-09-18T00:00:00.000Z"), equity: 0 },
        { t: Date.parse("2026-09-19T00:00:00.000Z"), equity: 10_000 },
      ],
      { liveEquity: 10_042.18, now },
    );

    assert.equal(points.length, 30);
    assert.equal(formatEquityCurveDate(points[0]!.t), "Aug 24");
    assert.equal(points[0]!.equity, 10_000);
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
      { liveEquity: 9_980, now: lateEt },
    );

    assert.equal(formatEquityCurveDate(points[0]!.t), "Aug 24");
    assert.equal(points[0]!.equity, 10_000);
    assert.equal(formatEquityCurveDate(points[points.length - 1]!.t), "Sep 22");
    assert.equal(points[points.length - 1]!.equity, 9_980);
  });

  it("overwrites today's broker bar with live equity so the KPI matches", () => {
    const points = shapeEquityCurvePoints(
      [
        { t: Date.parse("2026-09-21T00:00:00.000Z"), equity: 10_010 },
        { t: Date.parse("2026-09-22T00:00:00.000Z"), equity: 10_020 },
      ],
      { liveEquity: 10_055, now },
    );

    assert.equal(points[points.length - 1]!.equity, 10_055);
    assert.equal(formatEquityCurveDate(points[points.length - 1]!.t), "Sep 22");
  });

  it("pads the window start with first funded equity so the line starts at the left tick", () => {
    const points = shapeEquityCurvePoints(
      [
        { t: Date.parse("2026-08-24T00:00:00.000Z"), equity: 0 },
        { t: Date.parse("2026-09-18T00:00:00.000Z"), equity: 0 },
        { t: Date.parse("2026-09-19T00:00:00.000Z"), equity: 10_000 },
        { t: Date.parse("2026-09-21T00:00:00.000Z"), equity: 10_080 },
      ],
      { liveEquity: 10_090, now },
    );

    assert.equal(points.length, 30);
    assert.equal(formatEquityCurveDate(points[0]!.t), "Aug 24");
    assert.equal(points[0]!.equity, 10_000);
    const sep18 = points.find((point) => formatEquityCurveDate(point.t) === "Sep 18");
    const sep19 = points.find((point) => formatEquityCurveDate(point.t) === "Sep 19");
    const sep20 = points.find((point) => formatEquityCurveDate(point.t) === "Sep 20");
    const sep21 = points.find((point) => formatEquityCurveDate(point.t) === "Sep 21");
    assert.equal(sep18?.equity, 10_000);
    assert.equal(sep19?.equity, 10_000);
    assert.equal(sep20?.equity, 10_000);
    assert.equal(sep21?.equity, 10_080);
    assert.equal(points[points.length - 1]!.equity, 10_090);
    assert.equal(formatEquityCurveDate(points[points.length - 1]!.t), "Sep 22");
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
    });

    assert.equal(points.length, 30);
    assert.equal(formatEquityCurveDate(points[0]!.t), "Aug 24");
    assert.equal(formatEquityCurveDate(points[points.length - 1]!.t), "Sep 22");
    assert.equal(points[points.length - 1]!.equity, 10_500);

    const sep4 = points.find((point) => formatEquityCurveDate(point.t) === "Sep 4");
    const sep5 = points.find((point) => formatEquityCurveDate(point.t) === "Sep 5");
    const sep6 = points.find((point) => formatEquityCurveDate(point.t) === "Sep 6");
    assert.equal(sep4?.equity, 10_004);
    assert.equal(sep5?.equity, 10_004);
    assert.equal(sep6?.equity, 10_004);
  });

  it("uses live equity alone when every broker bar is still zero", () => {
    const points = shapeEquityCurvePoints(
      [
        { t: Date.parse("2026-09-19T00:00:00.000Z"), equity: 0 },
        { t: Date.parse("2026-09-21T00:00:00.000Z"), equity: 0 },
      ],
      { liveEquity: 10_000, now },
    );

    assert.equal(points.length, 30);
    assert.equal(formatEquityCurveDate(points[0]!.t), "Aug 24");
    assert.ok(points.every((point) => point.equity === 10_000));
    assert.equal(formatEquityCurveDate(points[points.length - 1]!.t), "Sep 22");
  });

  it("returns no points when history is unfunded and live equity is missing", () => {
    assert.deepEqual(
      shapeEquityCurvePoints(
        [{ t: Date.parse("2026-09-19T00:00:00.000Z"), equity: 0 }],
        { liveEquity: null, now },
      ),
      [],
    );
  });

  it("keeps today's carry when live equity is unavailable", () => {
    const points = shapeEquityCurvePoints(
      [{ t: Date.parse("2026-09-19T00:00:00.000Z"), equity: 10_000 }],
      { liveEquity: null, now },
    );

    assert.equal(points.length, 30);
    assert.equal(formatEquityCurveDate(points[0]!.t), "Aug 24");
    assert.equal(points[0]!.equity, 10_000);
    assert.equal(points[points.length - 1]!.equity, 10_000);
    assert.equal(formatEquityCurveDate(points[points.length - 1]!.t), "Sep 22");
  });
});
