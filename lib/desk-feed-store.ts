import { get, put } from "@vercel/blob";
import archiveFile from "../data/archive/test-1-desk-feed.json";
import seedFile from "../data/desk-feed.json";
import { deskStakeUsd } from "./desk";
import { deskFeedThreadCopy } from "./desk-feed-copy";
import {
  blobStoreConfigured,
  DESK_BOTS,
  DESK_FEED_BLOB_PATH,
  DESK_FEED_SORT,
  filterLiveDeskFeedMessages,
  mergeDeskFeedMessages,
  parseStoredMessages,
  toDeskMessage,
  type IncomingDeskMessage,
} from "./desk-feed";
import type { DeskFeedPayload, DeskMessage } from "./types";

export type DeskFeedBlobAdapter = {
  read(): Promise<unknown | null>;
  write(payload: { messages: DeskMessage[] }): Promise<void>;
};

export function loadSeedMessages(source: unknown = seedFile): DeskMessage[] {
  return parseStoredMessages(source);
}

export function loadArchiveMessages(
  source: unknown = archiveFile,
): DeskMessage[] {
  return parseStoredMessages(source);
}

async function loadMergedDeskMessages(
  adapter?: DeskFeedBlobAdapter | null,
): Promise<DeskMessage[]> {
  const seed = loadSeedMessages();
  const stored = await readBlobFeed(adapter);
  return mergeDeskFeedMessages(seed, stored);
}

function toDeskFeedPayload(
  messages: DeskMessage[],
  startIso?: string | null,
): DeskFeedPayload {
  return {
    bots: DESK_BOTS,
    messages: filterLiveDeskFeedMessages(messages, startIso),
    sort: DESK_FEED_SORT,
    copy: deskFeedThreadCopy({
      startIso,
      stakeUsd: deskStakeUsd(),
    }),
  };
}

export async function readBlobFeed(
  adapter?: DeskFeedBlobAdapter | null,
): Promise<DeskMessage[]> {
  if (adapter === null) {
    return [];
  }

  const store = adapter ?? vercelBlobAdapter();
  if (!store) {
    return [];
  }

  try {
    const raw = await store.read();
    if (raw == null) {
      return [];
    }
    return parseStoredMessages(raw);
  } catch {
    return [];
  }
}

export async function writeBlobFeed(
  messages: DeskMessage[],
  adapter?: DeskFeedBlobAdapter | null,
): Promise<boolean> {
  if (adapter === null) {
    return false;
  }

  const store = adapter ?? vercelBlobAdapter();
  if (!store) {
    return false;
  }

  await store.write({ messages });
  return true;
}

export async function loadDeskFeed(
  adapter?: DeskFeedBlobAdapter | null,
  options?: { startIso?: string | null },
): Promise<DeskFeedPayload> {
  const merged = await loadMergedDeskMessages(adapter);
  return toDeskFeedPayload(merged, options?.startIso);
}

export async function appendDeskFeedMessage(
  incoming: IncomingDeskMessage,
  options?: {
    adapter?: DeskFeedBlobAdapter | null;
    now?: Date;
    startIso?: string | null;
  },
): Promise<{ payload: DeskFeedPayload; message: DeskMessage; persisted: boolean }> {
  const message = toDeskMessage(incoming, options?.now);
  const current = await loadMergedDeskMessages(options?.adapter);
  const messages = mergeDeskFeedMessages(current, [message]);
  const persisted = await writeBlobFeed(messages, options?.adapter);
  return {
    payload: toDeskFeedPayload(messages, options?.startIso),
    message,
    persisted,
  };
}

function vercelBlobAdapter(): DeskFeedBlobAdapter | null {
  if (!blobStoreConfigured()) {
    return null;
  }

  return {
    async read() {
      const result = await get(DESK_FEED_BLOB_PATH, {
        access: "public",
        useCache: false,
      });
      if (!result || result.statusCode !== 200 || !result.stream) {
        return null;
      }
      const text = await new Response(result.stream).text();
      if (!text.trim()) {
        return null;
      }
      return JSON.parse(text) as unknown;
    },
    async write(payload) {
      await put(DESK_FEED_BLOB_PATH, JSON.stringify(payload), {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
        cacheControlMaxAge: 60,
      });
    },
  };
}
