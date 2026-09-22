import { get, put } from "@vercel/blob";
import seedFile from "../data/desk-feed.json";
import {
  blobStoreConfigured,
  DESK_BOTS,
  DESK_FEED_BLOB_PATH,
  DESK_FEED_SORT,
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
): Promise<DeskFeedPayload> {
  const seed = loadSeedMessages();
  const stored = await readBlobFeed(adapter);
  return {
    bots: DESK_BOTS,
    messages: mergeDeskFeedMessages(seed, stored),
    sort: DESK_FEED_SORT,
  };
}

export async function appendDeskFeedMessage(
  incoming: IncomingDeskMessage,
  options?: {
    adapter?: DeskFeedBlobAdapter | null;
    now?: Date;
  },
): Promise<{ payload: DeskFeedPayload; message: DeskMessage; persisted: boolean }> {
  const message = toDeskMessage(incoming, options?.now);
  const current = await loadDeskFeed(options?.adapter);
  const messages = mergeDeskFeedMessages(current.messages, [message]);
  const persisted = await writeBlobFeed(messages, options?.adapter);
  return {
    payload: {
      bots: DESK_BOTS,
      messages,
      sort: DESK_FEED_SORT,
    },
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
