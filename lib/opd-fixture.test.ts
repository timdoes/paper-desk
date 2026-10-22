import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadOpdFixtureSnapshot, OPD_FIXTURE_NOW } from "./opd-fixture";

describe("options layout fixture", () => {
  it("renders a labelled after-close book with both sleeves", () => {
    const snapshot = loadOpdFixtureSnapshot();
    assert.equal(snapshot.configured, true);
    assert.equal(snapshot.dataSource, "local-fixture");
    assert.equal(snapshot.stake, 25_000);
    assert.equal(snapshot.account.equity, 24820.4);
    assert.equal(snapshot.workingHidden, false);
    assert.ok(snapshot.spreads.some((spread) => spread.sleeve === "credit"));
    assert.ok(snapshot.spreads.some((spread) => spread.sleeve === "day"));
    assert.ok(snapshot.orders.some((order) => order.status === "filled"));
    assert.ok(snapshot.orders.some((order) => order.status === "new"));
    assert.ok(snapshot.history.points.length > 4);
    assert.equal(OPD_FIXTURE_NOW, Date.parse("2026-10-23T16:30:00-04:00"));
  });

  it("still hides working tickets if the fixture clock is before close", () => {
    const snapshot = loadOpdFixtureSnapshot(
      Date.parse("2026-10-23T15:00:00-04:00"),
    );
    assert.equal(snapshot.workingHidden, true);
    assert.equal(
      snapshot.orders.some((order) => order.status === "new"),
      false,
    );
    assert.ok(snapshot.orders.some((order) => order.status === "filled"));
  });
});
