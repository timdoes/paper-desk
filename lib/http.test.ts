import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { AlpacaRequestError } from "./alpaca";
import {
  BROKER_UNAVAILABLE_MESSAGE,
  alpacaClientErrorBody,
  alpacaClientErrorMessage,
  alpacaStatusCode,
  handleRouteError,
} from "./http";
import { PaperGuardError } from "./paper-guard";
import { PRIVATE_NO_STORE } from "./security-headers";

const ALPACA_DETAIL =
  'upstream leak: {"message":"insufficient buying power","account":"deadbeef"}';

const accountRoute = readFileSync(
  new URL("../app/api/account/route.ts", import.meta.url),
  "utf8",
);
const positionsRoute = readFileSync(
  new URL("../app/api/positions/route.ts", import.meta.url),
  "utf8",
);
const ordersRoute = readFileSync(
  new URL("../app/api/orders/route.ts", import.meta.url),
  "utf8",
);
const historyRoute = readFileSync(
  new URL("../app/api/portfolio/history/route.ts", import.meta.url),
  "utf8",
);
const pageSource = readFileSync(
  new URL("../app/page.tsx", import.meta.url),
  "utf8",
);

describe("Alpaca client errors", () => {
  function silenceConsoleError(run: () => Promise<void>) {
    return async () => {
      const original = console.error;
      console.error = () => {};
      try {
        await run();
      } finally {
        console.error = original;
      }
    };
  }

  it("maps broker failures to a generic body with status only", () => {
    const body = alpacaClientErrorBody(503);
    assert.deepEqual(body, {
      configured: true,
      paper: true,
      error: BROKER_UNAVAILABLE_MESSAGE,
      status: 503,
    });
    assert.equal(Object.hasOwn(body, "detail"), false);
    assert.doesNotMatch(JSON.stringify(body), /insufficient buying power/);
    assert.equal(alpacaClientErrorMessage(503), "Broker unavailable (503)");
    assert.equal(alpacaStatusCode(200), 502);
    assert.equal(alpacaStatusCode(429), 429);
  });

  it(
    "keeps Alpaca detail out of public JSON error bodies",
    silenceConsoleError(async () => {
      const response = handleRouteError(
        new AlpacaRequestError(422, ALPACA_DETAIL),
      );
      const body = (await response.json()) as Record<string, unknown>;
      const serialized = JSON.stringify(body);

      assert.equal(response.status, 422);
      assert.equal(response.headers.get("Cache-Control"), PRIVATE_NO_STORE);
      assert.equal(body.error, BROKER_UNAVAILABLE_MESSAGE);
      assert.equal(body.status, 422);
      assert.equal(Object.hasOwn(body, "detail"), false);
      assert.doesNotMatch(serialized, /insufficient buying power/);
      assert.doesNotMatch(serialized, /deadbeef/);
      assert.doesNotMatch(serialized, /upstream leak/);
    }),
  );

  it(
    "does not echo unexpected Error messages to clients",
    silenceConsoleError(async () => {
      const response = handleRouteError(new Error(ALPACA_DETAIL));
      const body = (await response.json()) as Record<string, unknown>;

      assert.equal(response.status, 500);
      assert.equal(response.headers.get("Cache-Control"), PRIVATE_NO_STORE);
      assert.equal(body.error, "Unexpected server error");
      assert.doesNotMatch(JSON.stringify(body), /insufficient buying power/);
    }),
  );

  it("still returns paper-guard copy", async () => {
    const response = handleRouteError(
      new PaperGuardError("ALPACA_PAPER must be exactly 'true'."),
    );
    const body = (await response.json()) as Record<string, unknown>;

    assert.equal(response.status, 503);
    assert.equal(body.code, "PAPER_GUARD");
    assert.equal(body.error, "ALPACA_PAPER must be exactly 'true'.");
  });

  it("does not interpolate Alpaca detail into the homepage broker screen", () => {
    assert.match(pageSource, /alpacaClientErrorMessage/);
    assert.match(pageSource, /logAlpacaRequestError/);
    assert.doesNotMatch(pageSource, /error\.detail/);
  });
});

describe("Alpaca GET cache headers", () => {
  it("sends private no-store on account, positions, orders, and history", () => {
    for (const source of [
      accountRoute,
      positionsRoute,
      ordersRoute,
      historyRoute,
    ]) {
      assert.match(source, /jsonPrivate/);
      assert.doesNotMatch(source, /NextResponse\.json/);
    }
  });
});
