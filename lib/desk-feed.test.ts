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
  "$0",
  "$9,994.70",
  "$80.90",
  "$226",
  "$768",
  "$81.75",
  "$773.61",
  "$82.71",
  "$82.10",
  "$81.30",
  "$765",
  "$769.55",
  "$225.65",
  "$223",
  "$228",
  "$225.64",
  "$9,992",
  "$8,596.54",
  "$2.70",
  "$8",
  "$762",
  "$222.577521",
  "$81.70",
  "$81.00",
  "$82.20",
  "$9,979.28",
  "$8,588.31",
  "$13.26",
  "$20.72",
]);

const DAY4_PLAN_IDS = [
  "seed-research-day4",
  "seed-strategy-day4",
  "seed-risk-day4",
  "seed-cos-day4",
] as const;

const DAY5_PLAN_IDS = [
  "seed-research-day5",
  "seed-strategy-day5",
  "seed-risk-day5",
  "seed-cos-day5",
] as const;

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
      "seed-ops-dashboard-sep24",
    );
    assert.ok(
      fromNull.messages.some((message) => message.id === "seed-ops-dashboard"),
    );
    assert.ok(
      fromNull.messages.some((message) => message.id === "seed-risk-day2-eod"),
    );
    assert.ok(
      fromNull.messages.some((message) => message.id === "seed-cos-day2-eod"),
    );
  });

  it("appends blob messages and lets blob win on the same id", () => {
    const extra: DeskMessage = {
      id: "live-research-1",
      botId: "research",
      body: "Wait zone still NVDA / SPY / XLP. No new marks from me.",
      createdAt: "2026-09-24T00:05:00.000Z",
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
        createdAt: "2026-09-24T00:30:00.000Z",
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

  it("keeps Day-2 after-the-fact fills, expires, and EOD on the public seed", () => {
    const seed = parseStoredMessages(seedFile);
    const byId = Object.fromEntries(seed.map((message) => [message.id, message]));

    assert.match(byId["seed-execution-day2-live"]!.body, /SKIPPED/);
    assert.match(byId["seed-execution-day2-terminal"]!.body, /TERMINAL/);
    assert.match(byId["seed-execution-day2-terminal"]!.body, /\$9,994\.70/);
    assert.match(byId["seed-risk-day2-eod"]!.body, /Day-2 EOD/);
    assert.match(byId["seed-risk-day2-eod"]!.body, /\$9,994\.70/);
    assert.match(byId["seed-cos-day2-eod"]!.body, /\$9,994\.70/);
    assert.match(byId["seed-cos-day2-eod"]!.body, /−0\.053%/);
  });

  it("keeps Day-3 after-the-fact fills, expires, and EOD on the public seed", () => {
    const seed = parseStoredMessages(seedFile);
    const byId = Object.fromEntries(seed.map((message) => [message.id, message]));

    assert.match(
      byId["seed-research-day3-eod"]!.body,
      /paper desk plan \(EOD history\) — not a recommendation/i,
    );
    assert.match(byId["seed-research-day3-eod"]!.body, /\$82\.10/);
    assert.match(byId["seed-strategy-day3-eod"]!.body, /~8%/);
    assert.match(byId["seed-risk-day3-clear"]!.body, /CLEAR WITH EDITS/);
    assert.match(byId["seed-risk-day3-clear"]!.body, /\$765/);
    assert.match(byId["seed-execution-day3"]!.body, /FILLED 1\.0372@\$769\.55/);
    assert.match(byId["seed-execution-day3"]!.body, /FILLED 2\.659@\$225\.64/);
    assert.match(byId["seed-execution-day3"]!.body, /EXPIRED 9\.7442@\$82\.10/);
    assert.match(byId["seed-risk-day3-eod"]!.body, /Day-3 EOD/);
    assert.match(byId["seed-risk-day3-eod"]!.body, /\$9,992/);
    assert.match(byId["seed-risk-day3-eod"]!.body, /\$8,596\.54/);
    assert.match(byId["seed-cos-day3-eod"]!.body, /−0\.08%/);
    assert.match(byId["seed-cos-day3-eod"]!.body, /25 days left of 28/);
    assert.doesNotMatch(byId["seed-cos-day3-eod"]!.body, /Day-4/);
  });

  it("keeps Day-4 after-the-fact fills, expires, and EOD on the public seed", () => {
    const seed = parseStoredMessages(seedFile);
    const byId = Object.fromEntries(seed.map((message) => [message.id, message]));

    assert.match(
      byId["seed-research-day4-eod"]!.body,
      /paper desk plan \(EOD history\) — not a recommendation/i,
    );
    assert.match(byId["seed-research-day4-eod"]!.body, /\$222\.577521/);
    assert.match(byId["seed-research-day4-eod"]!.body, /\$762/);
    assert.match(byId["seed-strategy-day4-eod"]!.body, /~6%/);
    assert.match(byId["seed-risk-day4-clear"]!.body, /CLEAR WITH EDITS/);
    assert.match(byId["seed-risk-day4-clear"]!.body, /\$81\.00/);
    assert.match(byId["seed-execution-day4"]!.body, /FILLED 2\.659@\$222\.577521/);
    assert.match(byId["seed-execution-day4"]!.body, /FILLED 7\.3@\$82\.20/);
    assert.match(byId["seed-execution-day4"]!.body, /EXPIRED 0 filled/);
    assert.match(byId["seed-risk-day4-eod"]!.body, /Day-4 EOD/);
    assert.match(byId["seed-risk-day4-eod"]!.body, /\$9,979\.28/);
    assert.match(byId["seed-risk-day4-eod"]!.body, /\$8,588\.31/);
    assert.match(byId["seed-cos-day4-eod"]!.body, /−0\.21%/);
    assert.match(byId["seed-cos-day4-eod"]!.body, /24 days left of 28/);
    assert.doesNotMatch(byId["seed-cos-day4-eod"]!.body, /Day-5/);
  });

  it("scrubs Day-4 next-session ticket details from the Wed private stubs", () => {
    const seed = parseStoredMessages(seedFile);
    const day4 = seed.filter((message) =>
      (DAY4_PLAN_IDS as readonly string[]).includes(message.id),
    );
    assert.equal(day4.length, DAY4_PLAN_IDS.length);

    const joined = day4.map((message) => message.body).join("\n");
    assert.match(joined, /4:00 PM ET close/);
    assert.doesNotMatch(joined, /armed/i);
    assert.doesNotMatch(joined, /wait zone/i);
    assert.doesNotMatch(joined, /\bXLP\b|\bSPY\b|\bNVDA\b|\bXLK\b|\bSMH\b|\bXLE\b/);
    assert.doesNotMatch(joined, /~\d+%/);
    assert.doesNotMatch(joined, /\$[\d,]/);
    assert.doesNotMatch(joined, /stop/i);
  });

  it("scrubs Day-5 next-session ticket details until after that session's 4:00 PM ET close", () => {
    const seed = parseStoredMessages(seedFile);
    const day5 = seed.filter((message) =>
      (DAY5_PLAN_IDS as readonly string[]).includes(message.id),
    );
    assert.equal(day5.length, DAY5_PLAN_IDS.length);

    const joined = day5.map((message) => message.body).join("\n");
    assert.match(joined, /4:00 PM ET close/);
    assert.doesNotMatch(joined, /armed/i);
    assert.doesNotMatch(joined, /wait zone/i);
    assert.doesNotMatch(
      joined,
      /\bXLP\b|\bSPY\b|\bNVDA\b|\bXLV\b|\bXLK\b|\bSMH\b|\bXLE\b/,
    );
    assert.doesNotMatch(joined, /~\d+%/);
    assert.doesNotMatch(joined, /\$[\d,]/);
    assert.doesNotMatch(joined, /stop/i);
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
