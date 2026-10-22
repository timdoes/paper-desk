import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { opdKeysConfigured } from "./opd-guard";
import { keysConfigured } from "./paper-guard";

describe("opdKeysConfigured", () => {
  it("is independent of the Test 2 Alpaca keys", () => {
    const previous = {
      ALPACA_API_KEY: process.env.ALPACA_API_KEY,
      ALPACA_API_SECRET: process.env.ALPACA_API_SECRET,
      OPD_APCA_API_KEY_ID: process.env.OPD_APCA_API_KEY_ID,
      OPD_APCA_API_SECRET_KEY: process.env.OPD_APCA_API_SECRET_KEY,
    };
    process.env.ALPACA_API_KEY = "PKTEST2";
    process.env.ALPACA_API_SECRET = "secret-test-2";
    delete process.env.OPD_APCA_API_KEY_ID;
    delete process.env.OPD_APCA_API_SECRET_KEY;
    try {
      assert.equal(keysConfigured(), true);
      assert.equal(opdKeysConfigured(), false);
      process.env.OPD_APCA_API_KEY_ID = "PKOPD";
      process.env.OPD_APCA_API_SECRET_KEY = "secret-opd";
      assert.equal(opdKeysConfigured(), true);
    } finally {
      for (const [name, value] of Object.entries(previous)) {
        if (value === undefined) {
          delete process.env[name];
        } else {
          process.env[name] = value;
        }
      }
    }
  });
});
