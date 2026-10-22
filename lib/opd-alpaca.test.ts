import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, describe, it } from "node:test";
import { opdFetch } from "./opd-alpaca";

const opdAlpacaSource = readFileSync(
  new URL("./opd-alpaca.ts", import.meta.url),
  "utf8",
);
const deskAlpacaSource = readFileSync(
  new URL("./alpaca.ts", import.meta.url),
  "utf8",
);

describe("opdFetch isolation", () => {
  const previousFetch = globalThis.fetch;
  const previousEnv = {
    ALPACA_PAPER: process.env.ALPACA_PAPER,
    ALPACA_API_KEY: process.env.ALPACA_API_KEY,
    ALPACA_API_SECRET: process.env.ALPACA_API_SECRET,
    OPD_APCA_API_KEY_ID: process.env.OPD_APCA_API_KEY_ID,
    OPD_APCA_API_SECRET_KEY: process.env.OPD_APCA_API_SECRET_KEY,
  };

  afterEach(() => {
    globalThis.fetch = previousFetch;
    for (const [name, value] of Object.entries(previousEnv)) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  });

  it("sends GET to the paper host with OPD keys only", async () => {
    process.env.ALPACA_PAPER = "true";
    process.env.ALPACA_API_KEY = "PK-TEST-2-SHOULD-NOT-BE-SENT";
    process.env.ALPACA_API_SECRET = "SECRET-TEST-2-SHOULD-NOT-BE-SENT";
    process.env.OPD_APCA_API_KEY_ID = "PK-OPD";
    process.env.OPD_APCA_API_SECRET_KEY = "SECRET-OPD";

    const calls: Array<{ url: string; method: string; headers: Headers }> = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      calls.push({
        url,
        method: init?.method ?? "GET",
        headers: new Headers(init?.headers),
      });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as typeof fetch;

    const body = await opdFetch<{ ok: boolean }>("/v2/account");
    assert.equal(body.ok, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.url, "https://paper-api.alpaca.markets/v2/account");
    assert.equal(calls[0]!.method, "GET");
    assert.equal(calls[0]!.headers.get("APCA-API-KEY-ID"), "PK-OPD");
    assert.equal(calls[0]!.headers.get("APCA-API-SECRET-KEY"), "SECRET-OPD");
    assert.notEqual(
      calls[0]!.headers.get("APCA-API-KEY-ID"),
      "PK-TEST-2-SHOULD-NOT-BE-SENT",
    );
  });

  it("keeps the two Alpaca clients on separate env vars", () => {
    assert.match(opdAlpacaSource, /OPD_APCA_API_KEY_ID/);
    assert.match(opdAlpacaSource, /OPD_APCA_API_SECRET_KEY/);
    assert.match(opdAlpacaSource, /method:\s*"GET"/);
    assert.doesNotMatch(opdAlpacaSource, /ALPACA_API_KEY/);
    assert.doesNotMatch(opdAlpacaSource, /ALPACA_API_SECRET/);
    assert.doesNotMatch(opdAlpacaSource, /method:\s*"POST"/);
    assert.doesNotMatch(deskAlpacaSource, /OPD_APCA_API_KEY_ID/);
    assert.doesNotMatch(deskAlpacaSource, /OPD_APCA_API_SECRET_KEY/);
  });
});
