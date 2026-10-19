"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DeskMessageList,
  DeskRoster,
} from "@/components/desk/desk-feed-thread";
import {
  GlassBody,
  GlassHeader,
  GlassPanel,
} from "@/components/desk/glass-panel";
import { FALLBACK_DESK_FEED_COPY } from "@/lib/desk-feed-copy";
import { scrollFeedThreadToLatest } from "@/lib/desk-feed-scroll";
import type { DeskBot, DeskFeedCopy, DeskFeedPayload, DeskMessage } from "@/lib/types";

const POLL_MS = 30_000;

function DeskThread({
  bots,
  messages,
}: {
  bots: DeskBot[];
  messages: DeskMessage[];
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(true);
  const firstPaint = useRef(true);

  useEffect(() => {
    if (!pinned) {
      return;
    }
    scrollFeedThreadToLatest(
      scrollerRef.current,
      firstPaint.current ? "auto" : "smooth",
    );
    firstPaint.current = false;
  }, [messages, pinned]);

  function onScroll() {
    const el = scrollerRef.current;
    if (!el) {
      return;
    }
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setPinned(distance < 48);
  }

  function jumpLatest() {
    setPinned(true);
    scrollFeedThreadToLatest(scrollerRef.current, "smooth");
  }

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="desk-feed-thread max-h-[min(540px,70dvh)] space-y-3 overflow-y-auto pr-1"
      >
        <DeskMessageList bots={bots} messages={messages} />
      </div>
      {pinned ? null : (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
          <Button
            type="button"
            size="sm"
            onClick={jumpLatest}
            className="pointer-events-auto h-8 rounded-full border border-emerald-400/25 bg-[#05070b]/90 text-emerald-200 hover:bg-emerald-400/10"
          >
            <ArrowDown />
            Latest
          </Button>
        </div>
      )}
    </div>
  );
}

function EmptyDeskFeed({ copy }: { copy: DeskFeedCopy }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center">
      <p className="max-w-sm text-pretty text-sm leading-6 text-white/55">
        {copy.emptyState}
      </p>
    </div>
  );
}

function ArchiveFeedLink({ copy }: { copy: DeskFeedCopy }) {
  return (
    <Link
      href={copy.archiveHref}
      className="inline-flex min-h-11 items-center text-sm text-emerald-300/85 underline-offset-4 hover:text-emerald-200 hover:underline"
    >
      {copy.archiveLabel}
    </Link>
  );
}

export function DeskFeed({ refreshTick = 0 }: { refreshTick?: number }) {
  const [payload, setPayload] = useState<DeskFeedPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const copy = payload?.copy ?? FALLBACK_DESK_FEED_COPY;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/desk-feed", { cache: "no-store" });
        const json = (await response.json()) as DeskFeedPayload & {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(json.error ?? "Desk feed request failed.");
        }
        if (!cancelled) {
          setPayload(json);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Desk feed unavailable.",
          );
        }
      }
    }

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [refreshTick]);

  return (
    <GlassPanel>
      <GlassHeader
        title="Desk feed"
        description={copy.description}
        action={
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.16em] text-emerald-300/70 uppercase">
            <Radio className="size-3.5" />
            Live
          </span>
        }
      />
      <GlassBody className="space-y-5">
        <ArchiveFeedLink copy={copy} />
        {payload ? <DeskRoster bots={payload.bots} /> : (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-[58px] rounded-xl border border-white/8 bg-white/[0.03]"
              />
            ))}
          </div>
        )}
        {payload ? (
          payload.messages.length === 0 ? (
            <EmptyDeskFeed copy={copy} />
          ) : (
            <DeskThread bots={payload.bots} messages={payload.messages} />
          )
        ) : (
          <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/20">
            <p className="text-sm text-white/40">
              {error ?? "Loading paper desk Grok Bots…"}
            </p>
          </div>
        )}
      </GlassBody>
    </GlassPanel>
  );
}
