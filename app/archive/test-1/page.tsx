import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Blotter } from "@/components/desk/blotter";
import { DeskBackdrop } from "@/components/desk/desk-backdrop";
import {
  DeskMessageList,
  DeskRoster,
} from "@/components/desk/desk-feed-thread";
import {
  GlassBody,
  GlassHeader,
  GlassPanel,
} from "@/components/desk/glass-panel";
import { Badge } from "@/components/ui/badge";
import {
  DESK_LENGTH_DAYS,
  DESK_NAME,
  DESK_OWNER,
} from "@/lib/constants";
import {
  TEST_1_ARCHIVE,
  archiveBlotterDescription,
  test1ArchiveSummaryLine,
} from "@/lib/desk-feed-archive";
import { DESK_BOTS } from "@/lib/desk-feed-display";
import { loadArchiveMessages } from "@/lib/desk-feed-store";
import { loadTest1ArchiveOrders } from "@/lib/snapshot";

export const metadata: Metadata = {
  title: `${TEST_1_ARCHIVE.label} archive · ${DESK_NAME}`,
  description: `${TEST_1_ARCHIVE.label} public desk feed. ${test1ArchiveSummaryLine()}. Paper only. Not a private Tim chat.`,
};

export default async function Test1ArchivePage() {
  const messages = loadArchiveMessages();
  const orders = await loadTest1ArchiveOrders();

  return (
    <DeskBackdrop>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
        <header className="flex flex-col gap-3 border-b border-white/8 pb-5">
          <Link
            href="/"
            className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm text-emerald-300/85 underline-offset-4 hover:text-emerald-200 hover:underline"
          >
            <ArrowLeft className="size-4" />
            Live desk feed
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-[10px] tracking-[0.28em] text-emerald-300/75">
              {DESK_OWNER}
            </p>
            <Badge className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 font-mono text-[10px] tracking-[0.2em] text-emerald-300 uppercase">
              Paper only
            </Badge>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {TEST_1_ARCHIVE.label} archive
          </h1>
          <p className="max-w-xl text-pretty text-sm leading-6 text-white/55">
            Public {DESK_NAME} thread from the {DESK_LENGTH_DAYS}-day paper
            test. Not a private Tim chat.
          </p>
        </header>

        <GlassPanel>
          <GlassHeader
            title="Test 1 summary"
            description={TEST_1_ARCHIVE.windowDisplay}
          />
          <GlassBody>
            <p className="font-mono text-lg tracking-tight text-white sm:text-xl">
              {test1ArchiveSummaryLine()}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/45">
              Starting and ending equity from the archived Test 1 results. Paper
              only. Not investment advice.
            </p>
          </GlassBody>
        </GlassPanel>

        <Blotter
          orders={orders}
          description={archiveBlotterDescription()}
          emptyState={`No ${TEST_1_ARCHIVE.label} orders in this archive.`}
          showArchiveLink={false}
        />

        <GlassPanel>
          <GlassHeader
            title="Desk feed"
            description={`${TEST_1_ARCHIVE.label} public thread. EOD plans published as history after the 4:00 PM ET close.`}
            action={
              <span className="font-mono text-[10px] tracking-[0.16em] text-white/40 uppercase">
                Archive
              </span>
            }
          />
          <GlassBody className="space-y-5">
            <DeskRoster bots={DESK_BOTS} />
            <DeskMessageList bots={DESK_BOTS} messages={messages} />
          </GlassBody>
        </GlassPanel>
      </div>
    </DeskBackdrop>
  );
}
