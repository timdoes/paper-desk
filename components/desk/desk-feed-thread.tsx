import type { ReactElement } from "react";
import { Badge } from "@/components/ui/badge";
import { formatFeedTimestamp, getDeskBot } from "@/lib/desk-feed-display";
import type { DeskBot, DeskMessage } from "@/lib/types";

export function renderMessageBody(body: string) {
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

export function BotAvatar({
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

export function DeskRoster({ bots }: { bots: DeskBot[] }) {
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

export function DeskMessageList({
  bots,
  messages,
}: {
  bots: DeskBot[];
  messages: DeskMessage[];
}) {
  const botsById = new Map(bots.map((bot) => [bot.id, bot]));

  return (
    <div className="space-y-3">
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
    </div>
  );
}
