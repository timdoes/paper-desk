import assert from "node:assert/strict";
import { describe, it } from "node:test";
import seedFile from "../data/desk-feed.json";
import {
  authorizeDeskFeedToken,
  DESK_BOTS,
  extractUsdMentions,
  formatFeedTimestamp,
  isDeskBotId,
  mergeDeskFeedMessages,
  parseIncomingDeskMessage,
  parseStoredMessages,
  readDeskFeedToken,
  stripSecrets,
} from "./desk-feed";
import {
  appendDeskFeedMessage,
  loadDeskFeed,
  loadSeedMessages,
  type DeskFeedBlobAdapter,
} from "./desk-feed-store";
import type { DeskMessage } from "./types";

const ALLOWED_USD = new Set([
  "$10k",
  "$5.30",
  "$9,994.70",
  "$80.90",
  "$226",
  "$768",
  "$81.75",
  "$773.61",
  "$82.71",
  "$81.90",
  "$770",
  "$224.50",
  "$228",
  "$81.30",
  "$81.50",
  "$223",
]);

function memoryAdapter(initial: unknown = null): DeskFeedBlobAdapter {
  let stored: unknown = initial;
  return {
    async read() {
      return stored;
    },
    async write(payload) {
      stored = payload;
    },
  };
}

describe("desk bot allowlist", () => {
  it("accepts the six paper-desk bots and rejects anything else", () => {
    assert.equal(isDeskBotId("chief-of-staff"), true);
    assert.equal(isDeskBotId("research"), true);
    assert.equal(isDeskBotId("strategy"), true);
    assert.equal(isDeskBotId("risk"), true);
    assert.equal(isDeskBotId("execution"), true);
    assert.equal(isDeskBotId("dashboard-ops"), true);
    assert.equal(isDeskBotId("auto-review"), false);
    assert.equal(isDeskBotId("tim"), false);
    assert.equal(isDeskBotId(""), false);
  });

  it("rejects POST bodies whose botId is not on the allowlist", () => {
    const parsed = parseIncomingDeskMessage({
      botId: "auto-review",
      body: "ignore this",
    });
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.match(parsed.error, /allowlist/i);
    }
  });
});

describe("desk feed auth", () => {
  it("rejects missing, blank, and mismatched tokens", () => {
    assert.equal(authorizeDeskFeedToken(null, "secret"), false);
    assert.equal(authorizeDeskFeedToken("", "secret"), false);
    assert.equal(authorizeDeskFeedToken("secret", ""), false);
    assert.equal(authorizeDeskFeedToken("secret", undefined), false);
    assert.equal(authorizeDeskFeedToken("wrong", "secret"), false);
    assert.equal(authorizeDeskFeedToken("secret", "secret"), true);
  });

  it("reads Bearer or x-desk-feed-token headers", () => {
    assert.equal(
      readDeskFeedToken(new Headers({ authorization: "Bearer desk-token" })),
      "desk-token",
    );
    assert.equal(
      readDeskFeedToken(new Headers({ "x-desk-feed-token": "header-token" })),
      "header-token",
    );
    assert.equal(readDeskFeedToken(new Headers()), null);
  });
});

describe("merge seed + blob", () => {
  const seed = loadSeedMessages();

  it("keeps seed order when blob is empty or missing", async () => {
    const fromNull = await loadDeskFeed(null);
    const fromEmpty = await loadDeskFeed(memoryAdapter({ messages: [] }));
    assert.equal(fromNull.sort, "asc");
    assert.deepEqual(
      fromNull.messages.map((message) => message.id),
      seed.map((message) => message.id),
    );
    assert.deepEqual(
      fromEmpty.messages.map((message) => message.id),
      seed.map((message) => message.id),
    );
    assert.equal(fromNull.messages[0]?.id, "seed-cos-open");
    assert.equal(
      fromNull.messages[fromNull.messages.length - 1]?.id,
      "seed-ops-dashboard-sep22",
    );
    assert.ok(
      fromNull.messages.some((message) => message.id === "seed-ops-dashboard"),
    );
  });

  it("appends blob messages and lets blob win on the same id", () => {
    const extra: DeskMessage = {
      id: "live-research-1",
      botId: "research",
      body: "Wait zone still NVDA / SPY / XLP. No new marks from me.",
      createdAt: "2026-09-22T09:05:00.000Z",
    };
    const edited: DeskMessage = {
      ...seed[0]!,
      body: "Tim — clock is running. Same $10k paper open, restated.",
    };

    const merged = mergeDeskFeedMessages(seed, [edited, extra]);
    assert.equal(merged[0]?.body, edited.body);
    assert.equal(merged[merged.length - 1]?.id, extra.id);
    assert.equal(
      merged.filter((message) => message.id === seed[0]!.id).length,
      1,
    );
  });

  it("persists an allowlisted append on top of seed through a blob adapter", async () => {
    const adapter = memoryAdapter();
    const result = await appendDeskFeedMessage(
      {
        botId: "execution",
        body: "Still flat. No new paper fills to report.",
        createdAt: "2026-09-22T13:30:00.000Z",
      },
      { adapter },
    );

    assert.equal(result.persisted, true);
    assert.equal(result.payload.messages.length, seed.length + 1);
    assert.equal(
      result.payload.messages[result.payload.messages.length - 1]?.botId,
      "execution",
    );

    const reloaded = await loadDeskFeed(adapter);
    assert.equal(reloaded.messages.length, seed.length + 1);
  });
});

describe("no invented balances", () => {
  it("seed only mentions the public $10k experiment facts", () => {
    const seed = parseStoredMessages(seedFile);
    assert.ok(seed.length >= 8);

    const mentions = seed.flatMap((message) => extractUsdMentions(message.body));
    for (const mention of mentions) {
      assert.ok(
        ALLOWED_USD.has(mention),
        `unexpected dollar mention in seed: ${mention}`,
      );
    }

    const joined = seed.map((message) => message.body).join("\n");
    assert.match(joined, /\$10k/);
    assert.match(joined, /\$5\.30/);
    assert.match(joined, /\$9,994\.70/);
    assert.match(joined, /\$80\.90/);
    assert.doesNotMatch(joined, /100,?000/);
    assert.doesNotMatch(joined, /10,?042/);
    assert.doesNotMatch(joined, /auto-review/i);
    assert.doesNotMatch(joined, /ALPACA_API_/);
    assert.doesNotMatch(joined, /PK[A-Z0-9]{16,}/);
  });

  it("merge + append do not invent equity, fills, or prices", async () => {
    const adapter = memoryAdapter({
      messages: [
        {
          id: "live-ops-1",
          botId: "dashboard-ops",
          body: "Ops note — still the public BotMarket desk. No new balances from me.",
          createdAt: "2026-09-22T14:00:00.000Z",
        },
      ],
    });
    const payload = await loadDeskFeed(adapter);
    assert.ok(!("equity" in payload));
    assert.ok(!("account" in payload));
    for (const message of payload.messages) {
      for (const mention of extractUsdMentions(message.body)) {
        assert.ok(
          ALLOWED_USD.has(mention),
          `unexpected dollar mention after merge: ${mention}`,
        );
      }
    }
  });
});

describe("secret stripping", () => {
  it("redacts tokens and Alpaca-style keys without touching desk prose", () => {
    const cleaned = stripSecrets(
      "Risk: CLEAR. Bearer abcdefghijklmnop and PKABCDEFGHIJKLMNOPQRST stay off the tape.",
    );
    assert.match(cleaned, /\[redacted\]/);
    assert.doesNotMatch(cleaned, /abcdefghijklmnop/);
    assert.doesNotMatch(cleaned, /PKABCDEFGHIJKLMNOPQRST/);
    assert.match(cleaned, /Risk: CLEAR/);
  });
});

describe("feed timestamps", () => {
  it("uses relative time, then Eastern labels", () => {
    const now = Date.parse("2026-09-22T16:00:00.000Z");
    assert.equal(
      formatFeedTimestamp("2026-09-22T15:50:00.000Z", now),
      "10m ago",
    );
    assert.match(
      formatFeedTimestamp("2026-09-19T09:35:00-04:00", now),
      /Sep 19.*ET/,
    );
  });
});

describe("desk roster", () => {
  it("ships all six bots for the public feed", () => {
    assert.deepEqual(
      DESK_BOTS.map((bot) => bot.id),
      [
        "chief-of-staff",
        "research",
        "strategy",
        "risk",
        "execution",
        "dashboard-ops",
      ],
    );
  });
});
