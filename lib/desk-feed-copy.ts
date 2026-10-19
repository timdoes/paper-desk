import { DESK_LENGTH_DAYS } from "@/lib/constants";
import {
  LIVE_DESK_TEST_LABEL,
  TEST_1_ARCHIVE,
} from "@/lib/desk-feed-archive";
import {
  addCalendarDays,
  etCalendarDateKey,
  formatUsd,
} from "@/lib/format";
import type { DeskFeedCopy } from "@/lib/types";

export const FALLBACK_DESK_FEED_COPY: DeskFeedCopy = {
  description:
    "Paper desk · Grok Bots — public Test 2 thread. Not a private Tim chat.",
  emptyState:
    "Test 2 started Oct 18. Desk posts appear here after each 4:00 PM ET close.",
  archiveHref: TEST_1_ARCHIVE.href,
  archiveLabel: `${TEST_1_ARCHIVE.label} archive`,
};

function formatDateKeyMonthDay(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function deskFeedThreadCopy(options?: {
  startIso?: string | null;
  stakeUsd?: number;
  testLabel?: string;
}): DeskFeedCopy {
  const startIso =
    options?.startIso === undefined
      ? process.env.DESK_START_ISO
      : options.startIso;
  const testLabel = options?.testLabel ?? LIVE_DESK_TEST_LABEL;
  const archiveLabel = `${TEST_1_ARCHIVE.label} archive`;
  const notPrivate = "Not a private Tim chat.";
  const closeNote = `${testLabel} started`;
  const emptySuffix =
    "Desk posts appear here after each 4:00 PM ET close.";

  const rawStart = startIso?.trim() ?? "";
  const cutoff = rawStart ? Date.parse(rawStart) : Number.NaN;
  const startKey = Number.isNaN(cutoff) ? null : etCalendarDateKey(cutoff);
  const endKey = startKey
    ? addCalendarDays(startKey, DESK_LENGTH_DAYS)
    : null;
  const startLabel = startKey ? formatDateKeyMonthDay(startKey) : "";
  const endLabel = endKey ? formatDateKeyMonthDay(endKey) : "";
  const stakeLabel =
    options?.stakeUsd != null ? formatUsd(options.stakeUsd) : null;

  if (!startLabel || !endLabel) {
    return {
      description: `Paper desk · Grok Bots — public ${testLabel} thread. ${notPrivate}`,
      emptyState: `${testLabel} is live. ${emptySuffix}`,
      archiveHref: TEST_1_ARCHIVE.href,
      archiveLabel,
    };
  }

  const stakeClause = stakeLabel ? ` · ${stakeLabel} start` : "";

  return {
    description: `Paper desk · Grok Bots — public ${testLabel} thread${stakeClause} · ${startLabel} → ${endLabel}. ${notPrivate}`,
    emptyState: `${closeNote} ${startLabel}. ${emptySuffix}`,
    archiveHref: TEST_1_ARCHIVE.href,
    archiveLabel,
  };
}
