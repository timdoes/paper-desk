import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { DESK_BOT_IDS, type DeskBotId, type DeskMessage } from "./types";

export { DESK_BOTS, formatFeedTimestamp, getDeskBot } from "./desk-feed-display";

export const DESK_FEED_BLOB_PATH = "desk-feed.json";
export const DESK_FEED_MAX_BODY_CHARS = 4_000;
export const DESK_FEED_SORT = "asc" as const;

const SECRET_PATTERNS: RegExp[] = [
  /\b(ALPACA_API_(?:KEY|SECRET)|DESK_FEED_TOKEN|BLOB_READ_WRITE_TOKEN)\b/g,
  /\bBearer\s+[A-Za-z0-9._\-+/=]{8,}/gi,
  /\b(?:PK|SK)[A-Z0-9]{16,}\b/g,
  /\b(?:ghp|gho|github_pat)_[A-Za-z0-9_]+\b/g,
  /-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/g,
];

export function isDeskBotId(value: unknown): value is DeskBotId {
  return (
    typeof value === "string" &&
    (DESK_BOT_IDS as readonly string[]).includes(value)
  );
}

export function readDeskFeedToken(headers: Headers): string | null {
  const authorization = headers.get("authorization");
  if (authorization) {
    const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }

  const headerToken = headers.get("x-desk-feed-token")?.trim();
  return headerToken || null;
}

export function authorizeDeskFeedToken(
  provided: string | null | undefined,
  expected: string | null | undefined = process.env.DESK_FEED_TOKEN,
): boolean {
  const got = provided?.trim() ?? "";
  const want = expected?.trim() ?? "";
  if (!got || !want) {
    return false;
  }

  const gotHash = createHash("sha256").update(got).digest();
  const wantHash = createHash("sha256").update(want).digest();
  return timingSafeEqual(gotHash, wantHash);
}

export function stripSecrets(body: string): string {
  let next = body;
  for (const pattern of SECRET_PATTERNS) {
    next = next.replace(pattern, "[redacted]");
  }
  return next;
}

export function sortDeskMessages(messages: DeskMessage[]): DeskMessage[] {
  return [...messages].sort((left, right) => {
    const leftTime = Date.parse(left.createdAt);
    const rightTime = Date.parse(right.createdAt);
    const leftValid = Number.isFinite(leftTime);
    const rightValid = Number.isFinite(rightTime);
    if (leftValid && rightValid && leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    if (leftValid !== rightValid) {
      return leftValid ? -1 : 1;
    }
    return left.id.localeCompare(right.id);
  });
}

export function mergeDeskFeedMessages(
  seed: DeskMessage[],
  stored: DeskMessage[],
): DeskMessage[] {
  const byId = new Map<string, DeskMessage>();
  for (const message of seed) {
    byId.set(message.id, message);
  }
  for (const message of stored) {
    byId.set(message.id, message);
  }
  return sortDeskMessages([...byId.values()]);
}

export function parseDeskMessage(value: unknown): DeskMessage | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (!isDeskBotId(record.botId)) {
    return null;
  }
  if (typeof record.id !== "string" || !record.id.trim()) {
    return null;
  }
  if (typeof record.body !== "string") {
    return null;
  }
  if (typeof record.createdAt !== "string" || Number.isNaN(Date.parse(record.createdAt))) {
    return null;
  }

  const body = stripSecrets(record.body).trim();
  if (!body || body.length > DESK_FEED_MAX_BODY_CHARS) {
    return null;
  }

  return {
    id: record.id.trim(),
    botId: record.botId,
    body,
    createdAt: new Date(record.createdAt).toISOString(),
  };
}

export function parseStoredMessages(data: unknown): DeskMessage[] {
  if (data == null) {
    return [];
  }

  const rawMessages = Array.isArray(data)
    ? data
    : data && typeof data === "object" && "messages" in data
      ? (data as { messages: unknown }).messages
      : null;

  if (!Array.isArray(rawMessages)) {
    return [];
  }

  const parsed: DeskMessage[] = [];
  for (const item of rawMessages) {
    const message = parseDeskMessage(item);
    if (message) {
      parsed.push(message);
    }
  }
  return parsed;
}

export type IncomingDeskMessage = {
  botId: DeskBotId;
  body: string;
  createdAt?: string;
  id?: string;
};

export type IncomingDeskMessageError = {
  ok: false;
  error: string;
};

export type IncomingDeskMessageOk = {
  ok: true;
  message: IncomingDeskMessage;
};

export function parseIncomingDeskMessage(
  value: unknown,
): IncomingDeskMessageOk | IncomingDeskMessageError {
  if (!value || typeof value !== "object") {
    return { ok: false, error: "JSON object required." };
  }

  const record = value as Record<string, unknown>;
  if (!isDeskBotId(record.botId)) {
    return { ok: false, error: "botId is not on the desk allowlist." };
  }
  if (typeof record.body !== "string") {
    return { ok: false, error: "body must be a string." };
  }

  const body = stripSecrets(record.body).trim();
  if (!body) {
    return { ok: false, error: "body is empty." };
  }
  if (body.length > DESK_FEED_MAX_BODY_CHARS) {
    return { ok: false, error: `body exceeds ${DESK_FEED_MAX_BODY_CHARS} characters.` };
  }

  let createdAt: string | undefined;
  if (record.createdAt != null) {
    if (typeof record.createdAt !== "string" || Number.isNaN(Date.parse(record.createdAt))) {
      return { ok: false, error: "createdAt must be a valid ISO timestamp." };
    }
    createdAt = new Date(record.createdAt).toISOString();
  }

  let id: string | undefined;
  if (record.id != null) {
    if (typeof record.id !== "string" || !record.id.trim()) {
      return { ok: false, error: "id must be a non-empty string." };
    }
    id = record.id.trim();
  }

  return {
    ok: true,
    message: {
      botId: record.botId,
      body,
      createdAt,
      id,
    },
  };
}

export function createDeskMessageId(now = Date.now()): string {
  return `desk-${now.toString(36)}-${randomBytes(4).toString("hex")}`;
}

export function toDeskMessage(
  incoming: IncomingDeskMessage,
  now = new Date(),
): DeskMessage {
  return {
    id: incoming.id ?? createDeskMessageId(now.getTime()),
    botId: incoming.botId,
    body: incoming.body,
    createdAt: incoming.createdAt ?? now.toISOString(),
  };
}

export function blobStoreConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(env.BLOB_READ_WRITE_TOKEN?.trim());
}

export function extractUsdMentions(text: string): string[] {
  const matches = text.match(/~?\$[\d,]+(?:\.\d+)?k?\b/gi) ?? [];
  return matches.map((value) => value.toLowerCase());
}
