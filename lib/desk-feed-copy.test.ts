import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  TEST_1_ARCHIVE,
  archiveBlotterDescription,
  liveBlotterDescription,
  liveBlotterEmptyState,
  test1ArchiveSummaryLine,
} from "./desk-feed-archive";
import { deskFeedThreadCopy } from "./desk-feed-copy";

describe("desk feed thread copy", () => {
  it("derives Test 2 dates and stake from start ISO + stake, not a hardcoded header", () => {
    const copy = deskFeedThreadCopy({
      startIso: "2026-10-18T00:00:00-04:00",
      stakeUsd: 9970.33,
    });

    assert.equal(
      copy.description,
      "Paper desk · Grok Bots — public Test 2 thread · $9,970.33 start · Oct 18 → Nov 15. Not a private Tim chat.",
    );
    assert.equal(
      copy.emptyState,
      "Test 2 started Oct 18. Desk posts appear here after each 4:00 PM ET close.",
    );
    assert.equal(copy.archiveHref, "/archive/test-1");
    assert.equal(copy.archiveLabel, "Test 1 archive");
  });

  it("crosses DST with calendar days so the window still ends on the Sunday", () => {
    const copy = deskFeedThreadCopy({
      startIso: "2026-10-18T00:00:00-04:00",
      stakeUsd: 9970.33,
    });
    assert.match(copy.description, /Oct 18 → Nov 15/);
    assert.doesNotMatch(copy.description, /Nov 14/);
  });

  it("omits dates when the mandate start is unset", () => {
    const copy = deskFeedThreadCopy({ startIso: null, stakeUsd: 9970.33 });
    assert.equal(
      copy.description,
      "Paper desk · Grok Bots — public Test 2 thread. Not a private Tim chat.",
    );
    assert.match(copy.emptyState, /4:00 PM ET close/);
    assert.doesNotMatch(copy.emptyState, /Oct 18/);
  });
});

describe("Test 1 archive summary", () => {
  it("uses only headline figures from the archived results markdown", () => {
    assert.equal(TEST_1_ARCHIVE.startUsdDisplay, "$10,000.00");
    assert.equal(TEST_1_ARCHIVE.endUsdDisplay, "$9,970.33");
    assert.equal(TEST_1_ARCHIVE.pnlPctDisplay, "−0.30%");
    assert.equal(
      test1ArchiveSummaryLine(),
      "$10,000.00 → $9,970.33, −0.30%",
    );
    assert.equal(TEST_1_ARCHIVE.href, "/archive/test-1");
  });

  it("names the live blotter as Test 2 last-50", () => {
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
});
