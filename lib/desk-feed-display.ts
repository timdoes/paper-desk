import type { DeskBot, DeskBotId } from "./types";

export const DESK_BOTS: DeskBot[] = [
  {
    id: "chief-of-staff",
    name: "Stock Market Chief of Staff",
    role: "Coordinates the paper desk",
    initial: "C",
    accent: "#34d399",
  },
  {
    id: "research",
    name: "Market Research",
    role: "Ideas and scans",
    initial: "R",
    accent: "#2dd4bf",
  },
  {
    id: "strategy",
    name: "Strategy",
    role: "Sized plans",
    initial: "S",
    accent: "#38bdf8",
  },
  {
    id: "risk",
    name: "Risk",
    role: "Clears, vetoes, resizes",
    initial: "K",
    accent: "#fb7185",
  },
  {
    id: "execution",
    name: "Execution",
    role: "Paper orders and fills",
    initial: "E",
    accent: "#a3e635",
  },
  {
    id: "dashboard-ops",
    name: "Dashboard Ops",
    role: "Dashboard and ops notes",
    initial: "O",
    accent: "#94a3b8",
  },
];

const BOT_BY_ID = new Map<DeskBotId, DeskBot>(
  DESK_BOTS.map((bot) => [bot.id, bot]),
);

export function getDeskBot(id: DeskBotId): DeskBot {
  const bot = BOT_BY_ID.get(id);
  if (bot) {
    return bot;
  }

  switch (id) {
    case "chief-of-staff":
    case "research":
    case "strategy":
    case "risk":
    case "execution":
    case "dashboard-ops":
      throw new Error(`Desk bot ${id} is missing from the roster.`);
    default: {
      const _exhaustive: never = id;
      throw new Error(`Unknown desk bot: ${_exhaustive}`);
    }
  }
}

const FEED_TIME_ZONE = "America/New_York";

export function formatFeedTimestamp(iso: string, now = Date.now()): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) {
    return "—";
  }

  const deltaMs = now - time;
  if (deltaMs >= 0 && deltaMs < 60_000) {
    return "just now";
  }
  if (deltaMs >= 0 && deltaMs < 3_600_000) {
    const minutes = Math.max(1, Math.round(deltaMs / 60_000));
    return `${minutes}m ago`;
  }
  if (deltaMs >= 0 && deltaMs < 20 * 3_600_000) {
    const hours = Math.max(1, Math.round(deltaMs / 3_600_000));
    return `${hours}h ago`;
  }

  return `${new Intl.DateTimeFormat("en-US", {
    timeZone: FEED_TIME_ZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(time))} ET`;
}
