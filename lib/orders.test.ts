import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  archiveBlotterDescription,
  liveBlotterDescription,
  liveBlotterEmptyState,
} from "./desk-feed-archive";
import {
  BLOTTER_LIMIT,
  filterOrdersSince,
  filterTest1ArchiveOrders,
  hasTest1OrdersArchive,
  loadArchivedTest1Orders,
  parseOrderView,
  takeRecentLiveOrders,
} from "./orders";
import type { OrderView } from "./types";

const TEST_2_START = "2026-10-18T00:00:00-04:00";
const TEST_1_FUNDED = "2026-09-19T01:19:00-04:00";

const snapshotSource = readFileSync(
  new URL("../data/archive/test-1-orders.json", import.meta.url),
  "utf8",
);
const snapshotModule = readFileSync(new URL("./snapshot.ts", import.meta.url), "utf8");
const ordersRoute = readFileSync(
  new URL("../app/api/orders/route.ts", import.meta.url),
  "utf8",
);
const blotterSource = readFileSync(
  new URL("../components/desk/blotter.tsx", import.meta.url),
  "utf8",
);
const archivePageSource = readFileSync(
  new URL("../app/archive/test-1/page.tsx", import.meta.url),
  "utf8",
);

function order(
  id: string,
  submittedAt: string | null,
  extras: Partial<OrderView> = {},
): OrderView {
  return {
    id,
    submittedAt,
    filledAt: null,
    symbol: extras.symbol ?? "SPY",
    side: extras.side ?? "buy",
    type: extras.type ?? "limit",
    qty: extras.qty ?? 1,
    filledQty: extras.filledQty ?? 0,
    limitPrice: extras.limitPrice ?? 100,
    filledAvgPrice: extras.filledAvgPrice ?? null,
    status: extras.status ?? "new",
  };
}

describe("filterOrdersSince", () => {
  const before = order("before", "2026-10-17T23:59:59-04:00");
  const atStart = order("at-start", TEST_2_START);
  const after = order("after", "2026-10-18T00:00:01-04:00");

  it("drops orders before DESK_START_ISO and keeps the start instant and later", () => {
    const live = filterOrdersSince([before, atStart, after], TEST_2_START);
    assert.deepEqual(
      live.map((row) => row.id),
      ["at-start", "after"],
    );
  });

  it("keeps an order submitted at the exact Test 2 boundary", () => {
    const live = filterOrdersSince([atStart], TEST_2_START);
    assert.deepEqual(
      live.map((row) => row.id),
      ["at-start"],
    );
  });

  it("keeps every order when the start is unset or invalid", () => {
    const rows = [before, after];
    assert.deepEqual(filterOrdersSince(rows, null), rows);
    assert.deepEqual(filterOrdersSince(rows, ""), rows);
    assert.deepEqual(filterOrdersSince(rows, "not-a-date"), rows);
  });

  it("drops orders with a missing or invalid submitted/created time when a cutoff is set", () => {
    const missing = order("missing", null);
    const invalid = order("invalid", "not-a-date");
    assert.deepEqual(
      filterOrdersSince([missing, invalid, after], TEST_2_START).map(
        (row) => row.id,
      ),
      ["after"],
    );
  });
});

describe("takeRecentLiveOrders", () => {
  it("applies the last-50 cap after the cutoff, not before", () => {
    const olderLive = Array.from({ length: 12 }, (_, index) =>
      order(`live-old-${index}`, `2026-10-18T01:${String(index).padStart(2, "0")}:00-04:00`),
    );
    const newestLive = Array.from({ length: BLOTTER_LIMIT }, (_, index) =>
      order(
        `live-new-${index}`,
        `2026-10-19T10:${String(index).padStart(2, "0")}:00-04:00`,
      ),
    );
    const archived = Array.from({ length: 20 }, (_, index) =>
      order(`t1-${index}`, `2026-10-12T10:${String(index).padStart(2, "0")}:00-04:00`),
    );

    const recent = takeRecentLiveOrders(
      [...newestLive, ...olderLive, ...archived],
      { sinceIso: TEST_2_START },
    );

    assert.equal(recent.length, BLOTTER_LIMIT);
    assert.deepEqual(
      recent.map((row) => row.id),
      newestLive.map((row) => row.id),
    );
    assert.equal(
      recent.some((row) => row.id.startsWith("t1-")),
      false,
    );
    assert.equal(
      recent.some((row) => row.id.startsWith("live-old-")),
      false,
    );
  });
});

describe("filterTest1ArchiveOrders", () => {
  const beforeFunded = order("before-funded", "2026-09-19T01:18:59-04:00");
  const atFunded = order("at-funded", TEST_1_FUNDED);
  const mid = order("mid", "2026-10-12T13:51:50.421175Z");
  const atStart = order("at-start", TEST_2_START);
  const afterStart = order("after-start", "2026-10-18T00:00:01-04:00");

  it("keeps [DESK_FUNDED_ISO, DESK_START_ISO), including the funded boundary", () => {
    const archived = filterTest1ArchiveOrders(
      [beforeFunded, atFunded, mid, atStart, afterStart],
      { fundedIso: TEST_1_FUNDED, startIso: TEST_2_START },
    );
    assert.deepEqual(
      archived.map((row) => row.id),
      ["at-funded", "mid"],
    );
  });
});

describe("Test 1 orders archive snapshot", () => {
  it("loads the committed Alpaca Paper snapshot without inventing rows", () => {
    assert.equal(hasTest1OrdersArchive(), true);
    const orders = loadArchivedTest1Orders();
    const raw = JSON.parse(snapshotSource) as { orders: Array<{ id: string }> };
    assert.equal(orders.length, raw.orders.length);
    assert.equal(orders.length, 35);
    assert.equal(orders[0]?.id, "d3a9813c-9ca9-4fe9-9493-12a7e22ef65b");
    assert.equal(orders[0]?.symbol, "SPY");
    assert.equal(orders[0]?.submittedAt, "2026-10-12T13:51:50.421175Z");
    assert.deepEqual(
      orders.map((row) => row.id),
      raw.orders.map((row) => row.id),
    );

    const windowed = filterTest1ArchiveOrders(orders, {
      fundedIso: TEST_1_FUNDED,
      startIso: TEST_2_START,
    });
    assert.equal(windowed.length, orders.length);
  });

  it("rejects invented archive rows that are missing required fields", () => {
    assert.equal(parseOrderView({ symbol: "FAKE" }), null);
    assert.deepEqual(
      loadArchivedTest1Orders({ orders: [{ id: "x" }, null] }),
      [],
    );
  });
});

describe("blotter copy and wiring", () => {
  it("names the live card as Test 2 last-50 and the archive as Test 1", () => {
    assert.equal(
      liveBlotterDescription(),
      "Test 2 orders and fills from Alpaca Paper · last 50",
    );
    assert.equal(
      liveBlotterEmptyState(),
      "No Test 2 orders yet. Orders appear here once the desk trades.",
    );
    assert.equal(
      archiveBlotterDescription(),
      "Test 1 orders and fills from Alpaca Paper",
    );
  });

  it("filters the live loader after fetch and keeps GET /api/orders backward compatible", () => {
    assert.match(snapshotModule, /takeRecentLiveOrders/);
    assert.match(snapshotModule, /ALPACA_ORDERS_PATH/);
    assert.match(ordersRoute, /jsonPrivate\(\{ configured: true, orders \}\)/);
    assert.match(ordersRoute, /searchParams\.get\("since"\)/);
    assert.match(ordersRoute, /since === null \? undefined : since/);
  });

  it("renders the live empty-state archive link and archive blotter section", () => {
    assert.match(blotterSource, /liveBlotterDescription/);
    assert.match(blotterSource, /liveBlotterEmptyState/);
    assert.match(blotterSource, /formatDeskDay/);
    assert.match(blotterSource, /TEST_1_ARCHIVE\.href/);
    assert.match(archivePageSource, /<Blotter/);
    assert.match(archivePageSource, /loadTest1ArchiveOrders/);
    assert.match(archivePageSource, /showArchiveLink=\{false\}/);
    assert.doesNotMatch(blotterSource, /Recent orders and fills from Alpaca Paper/);
  });
});
