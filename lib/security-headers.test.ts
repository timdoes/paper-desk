import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  PERMISSIONS_POLICY,
  PRIVATE_NO_STORE,
  buildContentSecurityPolicy,
  securityHeaders,
} from "./security-headers";

const nextConfigSource = readFileSync(
  new URL("../next.config.ts", import.meta.url),
  "utf8",
);

function headerMap(nodeEnv?: string) {
  return new Map(
    securityHeaders(nodeEnv).map((header) => [header.key, header.value]),
  );
}

describe("security headers", () => {
  it("exports the baseline hardening set", () => {
    const headers = headerMap("production");
    const csp = headers.get("Content-Security-Policy") ?? "";

    assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
    assert.equal(
      headers.get("Referrer-Policy"),
      "strict-origin-when-cross-origin",
    );
    assert.equal(headers.get("X-Frame-Options"), "DENY");
    assert.equal(headers.get("Permissions-Policy"), PERMISSIONS_POLICY);
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /script-src 'self' 'unsafe-inline'/);
    assert.doesNotMatch(csp, /unsafe-eval/);
    assert.match(PERMISSIONS_POLICY, /camera=\(\)/);
    assert.match(PERMISSIONS_POLICY, /geolocation=\(\)/);
    assert.match(PERMISSIONS_POLICY, /microphone=\(\)/);
    assert.match(PERMISSIONS_POLICY, /payment=\(\)/);
  });

  it("allows eval only for local Next.js development", () => {
    assert.match(
      buildContentSecurityPolicy("development"),
      /script-src 'self' 'unsafe-inline' 'unsafe-eval'/,
    );
    assert.doesNotMatch(buildContentSecurityPolicy("production"), /unsafe-eval/);
  });

  it("is wired through next.config.ts without fighting HSTS", () => {
    assert.match(nextConfigSource, /poweredByHeader:\s*false/);
    assert.match(nextConfigSource, /securityHeaders/);
    assert.match(nextConfigSource, /async headers\(/);
    assert.doesNotMatch(nextConfigSource, /Strict-Transport-Security/);
    assert.doesNotMatch(nextConfigSource, /X-Powered-By/);
  });

  it("keeps the private no-store cache token for Alpaca JSON", () => {
    assert.equal(PRIVATE_NO_STORE, "private, no-store");
  });
});
