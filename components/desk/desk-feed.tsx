"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { ArrowDown, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GlassBody,
  GlassHeader,
  GlassPanel,
} from "@/components/desk/glass-panel";
import { formatFeedTimestamp, getDeskBot } from "@/lib/desk-feed-display";
import type { DeskBot, DeskFeedPayload, DeskMessage } from "@/lib/types";

const POLL_MS = 30_000;

function renderMessageBody(body: string) {
  const nodes: Array<string | ReactElement> = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match = pattern.exec(body);
  let key = 0;

  while (match) {
    if (match.index > lastIndex) {
      nodes.push(body.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={`b-${key}`} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      nodes.push(
        <code
          key={`c-${key}`}
          className="rounded-md bg-black/40 px-1 py-0.5 font-mono text-[12px] text-emerald-200"
        >
          {token.slice(1, -1)}
        </code>,
      );
    }
    key += 1;
    lastIndex = match.index + token.length;
    match = pattern.exec(body);
  }

  if (lastIndex < body.length) {
    nodes.push(body.slice(lastIndex));
  }
  return nodes;
}

function BotAvatar({
  bot,
  size = "md",
}: {
  bot: DeskBot;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "size-8 text-[11px]" : "size-10 text-sm";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-[#05070b] ring-1 ring-white/15 ${dim}`}
      style={{ backgroundColor: bot.accent }}
      aria-hidden
    >
      {bot.initial}
    </span>
  );
}

function DeskRoster({ bots }: { bots: DeskBot[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-6">
      {bots.map((bot) => {
        const quiet = bot.id === "dashboard-ops";
        return (
          <li
            key={bot.id}
            className={`flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 ${
              quiet ? "opacity-70" : ""
            }`}
          >
            <BotAvatar bot={bot} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{bot.name}</p>
              <p className="truncate text-[11px] text-white/40">{bot.role}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function sameGroup(current: DeskMessage, previous: DeskMessage | undefined) {
  if (!previous || previous.botId !== current.botId) {
    return false;
  }
  const gap = Date.parse(current.createdAt) - Date.parse(previous.createdAt);
  return Number.isFinite(gap) && gap >= 0 && gap < 5 * 60_000;
}

function DeskThread({
  bots,
  messages,
}: {
  bots: DeskBot[];
  messages: DeskMessage[];
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(true);
  const firstPaint = useRef(true);
  const botsById = new Map(bots.map((bot) => [bot.id, bot]));

  useEffect(() => {
    if (!pinned) {
      return;
    }
    bottomRef.current?.scrollIntoView({
      behavior: firstPaint.current ? "auto" : "smooth",
      block: "end",
    });
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
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="desk-feed-thread max-h-[540px] space-y-3 overflow-y-auto pr-1"
      >
        {messages.map((message, index) => {
          const bot = botsById.get(message.botId) ?? getDeskBot(message.botId);
          const grouped = sameGroup(message, messages[index - 1]);
          const quiet = bot.id === "dashboard-ops";
          return (
            <article
              key={message.id}
              className={`flex items-end gap-2.5 ${grouped ? "mt-1" : ""} ${
                quiet ? "opacity-80" : ""
              }`}
            >
              <div className="w-8 shrink-0">
                {grouped ? null : <BotAvatar bot={bot} size="sm" />}
              </div>
              <div className="min-w-0 max-w-[min(100%,42rem)] flex-1">
                {grouped ? null : (
                  <div className="mb-1 flex flex-wrap items-baseline gap-2">
                    <p className="text-[13px] font-medium text-white">{bot.name}</p>
                    <Badge
                      variant="outline"
                      className="h-4 rounded-full border-white/10 bg-white/[0.04] px-1.5 font-mono text-[9px] tracking-[0.14em] text-white/45 uppercase"
                    >
                      {bot.role}
                    </Badge>
                    <time
                      className="font-mono text-[10px] text-white/30"
                      dateTime={message.createdAt}
                    >
                      {formatFeedTimestamp(message.createdAt)}
                    </time>
                  </div>
                )}
                <div
                  className="rounded-[1.15rem] rounded-bl-md border border-white/8 bg-white/[0.055] px-3.5 py-2.5 shadow-[0_8px_30px_-20px_rgba(52,211,153,0.55)]"
                  style={{ boxShadow: `inset 2px 0 0 ${bot.accent}` }}
                >
                  <p className="whitespace-pre-wrap text-[14px] leading-6 text-white/82">
                    {renderMessageBody(message.body)}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
        <div ref={bottomRef} />
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

export function DeskFeed({ refreshTick = 0 }: { refreshTick?: number }) {
  const [payload, setPayload] = useState<DeskFeedPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        description="Paper desk · Grok Bots — public $10k / 30-day experiment thread. Not a private Tim chat."
        action={
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.16em] text-emerald-300/70 uppercase">
            <Radio className="size-3.5" />
            Live
          </span>
        }
      />
      <GlassBody className="space-y-5">
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
          <DeskThread bots={payload.bots} messages={payload.messages} />
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
