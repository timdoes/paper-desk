import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  loadLocalFixtureSnapshot,
  localFixtureEnabled,
  parseArchivedEquityCsv,
} from "./equity-curve-fixture";

const CSV = `date,equity,day_pl
2026-09-18,10000.00,0.00
2026-09-21,9994.70,-5.30
2026-10-16,9970.33,0.00
`;

describe("localFixtureEnabled", () => {
  it("is only on in non-production when DESK_LOCAL_FIXTURE=1", () => {
    assert.equal(
      localFixtureEnabled({ NODE_ENV: "development", DESK_LOCAL_FIXTURE: "1" }),
      true,
    );
    assert.equal(
      localFixtureEnabled({ NODE_ENV: "production", DESK_LOCAL_FIXTURE: "1" }),
      false,
    );
    assert.equal(
      localFixtureEnabled({ NODE_ENV: "development", DESK_LOCAL_FIXTURE: "0" }),
      false,
    );
  });
});

describe("parseArchivedEquityCsv", () => {
  it("reads date,equity rows and ignores extra columns", () => {
    assert.deepEqual(parseArchivedEquityCsv(CSV), [
      { t: Date.parse("2026-09-18T00:00:00.000Z"), equity: 10_000 },
      { t: Date.parse("2026-09-21T00:00:00.000Z"), equity: 9994.7 },
      { t: Date.parse("2026-10-16T00:00:00.000Z"), equity: 9970.33 },
    ]);
  });
});

describe("loadLocalFixtureSnapshot", () => {
  it("builds a labeled snapshot from the Test 1 archive", () => {
    const previousStart = process.env.DESK_START_ISO;
    const previousFunded = process.env.DESK_FUNDED_ISO;
    const previousStake = process.env.DESK_STAKE_USD;
    process.env.DESK_START_ISO = "2026-10-18T00:00:00-04:00";
    process.env.DESK_FUNDED_ISO = "2026-09-19T01:19:00-04:00";
    process.env.DESK_STAKE_USD = "9970.33";
    try {
      const snapshot = loadLocalFixtureSnapshot(
        Date.parse("2026-10-19T16:00:00.000Z"),
      );
      assert.equal(snapshot.dataSource, "local-fixture");
      assert.equal(snapshot.stake, 9970.33);
      assert.equal(snapshot.account.equity, 9970.33);
      assert.ok(snapshot.history.points.length > 0);
      assert.equal(
        snapshot.history.points[snapshot.history.points.length - 1]?.equity,
        9970.33,
      );
      assert.ok(snapshot.history.points.every((point) => point.equity !== 0));
    } finally {
      if (previousStart === undefined) {
        delete process.env.DESK_START_ISO;
      } else {
        process.env.DESK_START_ISO = previousStart;
      }
      if (previousFunded === undefined) {
        delete process.env.DESK_FUNDED_ISO;
      } else {
        process.env.DESK_FUNDED_ISO = previousFunded;
      }
      if (previousStake === undefined) {
        delete process.env.DESK_STAKE_USD;
      } else {
        process.env.DESK_STAKE_USD = previousStake;
      }
    }
  });
});
