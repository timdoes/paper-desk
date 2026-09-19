import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PaperGuardError,
  assertPaperOnly,
  keysConfigured,
  pointsAtLiveAlpaca,
} from "./paper-guard";

describe("pointsAtLiveAlpaca", () => {
  it("rejects the live trading host", () => {
    assert.equal(pointsAtLiveAlpaca("https://api.alpaca.markets"), true);
    assert.equal(pointsAtLiveAlpaca("https://api.alpaca.markets/v2/account"), true);
    assert.equal(pointsAtLiveAlpaca("api.alpaca.markets"), true);
  });

  it("allows the paper trading host", () => {
    assert.equal(pointsAtLiveAlpaca("https://paper-api.alpaca.markets"), false);
    assert.equal(
      pointsAtLiveAlpaca("https://paper-api.alpaca.markets/v2/account"),
      false,
    );
    assert.equal(pointsAtLiveAlpaca("paper-api.alpaca.markets"), false);
  });
});

describe("assertPaperOnly", () => {
  it("hard-fails unless ALPACA_PAPER is exactly true", () => {
    assert.throws(
      () => assertPaperOnly({ ALPACA_PAPER: "false" }),
      PaperGuardError,
    );
    assert.throws(() => assertPaperOnly({}), PaperGuardError);
  });

  it("hard-fails when any env value points at live Alpaca", () => {
    assert.throws(
      () =>
        assertPaperOnly({
          ALPACA_PAPER: "true",
          ALPACA_BASE_URL: "https://api.alpaca.markets",
        }),
      PaperGuardError,
    );
  });

  it("allows a paper-only environment", () => {
    assert.doesNotThrow(() =>
      assertPaperOnly({
        ALPACA_PAPER: "true",
        ALPACA_API_KEY: "PKTEST",
        ALPACA_BASE: "https://paper-api.alpaca.markets",
      }),
    );
  });
});

describe("keysConfigured", () => {
  it("is false when keys are blank", () => {
    const previousKey = process.env.ALPACA_API_KEY;
    const previousSecret = process.env.ALPACA_API_SECRET;
    delete process.env.ALPACA_API_KEY;
    delete process.env.ALPACA_API_SECRET;
    try {
      assert.equal(keysConfigured(), false);
    } finally {
      if (previousKey === undefined) {
        delete process.env.ALPACA_API_KEY;
      } else {
        process.env.ALPACA_API_KEY = previousKey;
      }
      if (previousSecret === undefined) {
        delete process.env.ALPACA_API_SECRET;
      } else {
        process.env.ALPACA_API_SECRET = previousSecret;
      }
    }
  });
});
