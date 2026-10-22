import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAfterEtClose, isEtMarketHours, isWeekendEt } from "./opd-clock";

describe("options ET session clock", () => {
  it("treats weekday RTH as market hours and pre-close as not after close", () => {
    const wednesdayOpen = Date.parse("2026-10-21T09:30:00-04:00");
    const wednesdayNoon = Date.parse("2026-10-21T12:00:00-04:00");
    const justBeforeClose = Date.parse("2026-10-21T15:59:00-04:00");
    assert.equal(isWeekendEt(wednesdayNoon), false);
    assert.equal(isEtMarketHours(wednesdayOpen), true);
    assert.equal(isEtMarketHours(wednesdayNoon), true);
    assert.equal(isEtMarketHours(justBeforeClose), true);
    assert.equal(isAfterEtClose(justBeforeClose), false);
  });

  it("shows working orders only at or after the 4:00 PM ET close", () => {
    const atClose = Date.parse("2026-10-21T16:00:00-04:00");
    const afterClose = Date.parse("2026-10-21T16:01:00-04:00");
    const saturday = Date.parse("2026-10-24T11:00:00-04:00");
    assert.equal(isAfterEtClose(atClose), true);
    assert.equal(isAfterEtClose(afterClose), true);
    assert.equal(isAfterEtClose(saturday), true);
    assert.equal(isEtMarketHours(atClose), false);
    assert.equal(isEtMarketHours(saturday), false);
  });

  it("is closed before the 9:30 AM ET open", () => {
    const preopen = Date.parse("2026-10-21T09:29:00-04:00");
    assert.equal(isEtMarketHours(preopen), false);
    assert.equal(isAfterEtClose(preopen), false);
  });
});
