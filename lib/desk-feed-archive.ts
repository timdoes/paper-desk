/**
 * Test 1 public-feed archive metadata.
 * Dollar figures are copied from results/test-1-2026-09-20_2026-10-18.md
 * (Headline table). Do not invent or recompute them.
 */
export const TEST_1_ARCHIVE = {
  id: "test-1",
  label: "Test 1",
  href: "/archive/test-1",
  startUsdDisplay: "$10,000.00",
  endUsdDisplay: "$9,970.33",
  pnlPctDisplay: "−0.30%",
  windowDisplay: "Sun Sep 20 → Sun Oct 18 2026 ET",
} as const;

export const LIVE_DESK_TEST_LABEL = "Test 2";
/** Live blotter row cap, applied after the Test 2 cutoff. */
export const BLOTTER_LIMIT = 50;

export function test1ArchiveSummaryLine(): string {
  return `${TEST_1_ARCHIVE.startUsdDisplay} → ${TEST_1_ARCHIVE.endUsdDisplay}, ${TEST_1_ARCHIVE.pnlPctDisplay}`;
}

export function liveBlotterDescription(
  testLabel: string = LIVE_DESK_TEST_LABEL,
): string {
  return `${testLabel} orders and fills from Alpaca Paper · last ${BLOTTER_LIMIT}`;
}

export function liveBlotterEmptyState(
  testLabel: string = LIVE_DESK_TEST_LABEL,
): string {
  return `No ${testLabel} orders yet. Orders appear here once the desk trades.`;
}

export function archiveBlotterDescription(
  testLabel: string = TEST_1_ARCHIVE.label,
): string {
  return `${testLabel} orders and fills from Alpaca Paper`;
}
