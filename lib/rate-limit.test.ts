import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  DESK_FEED_WRITE_RATE_LIMIT,
  FixedWindowRateLimiter,
  UNKNOWN_CLIENT_IP,
  clientIpFromHeaders,
  deskFeedWriteRateLimitResponse,
  isPublicIp,
  normalizeIpCandidate,
} from "./rate-limit";

const deskFeedRoute = readFileSync(
  new URL("../app/api/desk-feed/route.ts", import.meta.url),
  "utf8",
);

describe("fixed-window rate limiter", () => {
  it("allows requests under the limit", () => {
    const limiter = new FixedWindowRateLimiter({
      limit: 20,
      windowMs: 60_000,
      now: () => 1_000,
    });

    for (let i = 0; i < 20; i += 1) {
      const decision = limiter.consume("203.0.113.10");
      assert.equal(decision.allowed, true);
      assert.equal(decision.remaining, 19 - i);
    }
  });

  it("rejects the request that exceeds the limit", () => {
    let now = 0;
    const limiter = new FixedWindowRateLimiter({
      limit: 2,
      windowMs: 60_000,
      now: () => now,
    });

    assert.equal(limiter.consume("203.0.113.10").allowed, true);
    now = 5_000;
    assert.equal(limiter.consume("203.0.113.10").allowed, true);

    const blocked = limiter.consume("203.0.113.10");
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.remaining, 0);
    assert.equal(blocked.retryAfterSeconds, 55);
  });

  it("resets the count after the window elapses", () => {
    let now = 10_000;
    const limiter = new FixedWindowRateLimiter({
      limit: 1,
      windowMs: 60_000,
      now: () => now,
    });

    assert.equal(limiter.consume("203.0.113.10").allowed, true);
    assert.equal(limiter.consume("203.0.113.10").allowed, false);

    now += 59_999;
    assert.equal(limiter.consume("203.0.113.10").allowed, false);

    now += 1;
    const reset = limiter.consume("203.0.113.10");
    assert.equal(reset.allowed, true);
    assert.equal(reset.remaining, 0);
  });

  it("tracks each key independently", () => {
    const limiter = new FixedWindowRateLimiter({
      limit: 1,
      windowMs: 60_000,
      now: () => 0,
    });

    assert.equal(limiter.consume("203.0.113.10").allowed, true);
    assert.equal(limiter.consume("203.0.113.11").allowed, true);
    assert.equal(limiter.consume("203.0.113.10").allowed, false);
    assert.equal(limiter.consume("203.0.113.11").allowed, false);
  });
});

describe("client IP from forwarded headers", () => {
  it("takes the first public hop in x-forwarded-for", () => {
    assert.equal(
      clientIpFromHeaders(
        new Headers({
          "x-forwarded-for": "10.0.0.8, 203.0.113.50, 192.168.1.2",
        }),
      ),
      "203.0.113.50",
    );
  });

  it("skips private, loopback, link-local, and CGNAT hops", () => {
    assert.equal(
      clientIpFromHeaders(
        new Headers({
          "x-forwarded-for":
            "127.0.0.1, 169.254.1.1, 100.64.1.2, 172.16.4.4, 198.51.100.7",
        }),
      ),
      "198.51.100.7",
    );
  });

  it("falls back to x-real-ip, then x-vercel-forwarded-for", () => {
    assert.equal(
      clientIpFromHeaders(new Headers({ "x-real-ip": "198.51.100.20" })),
      "198.51.100.20",
    );
    assert.equal(
      clientIpFromHeaders(
        new Headers({
          "x-forwarded-for": "10.1.1.1",
          "x-real-ip": "198.51.100.21",
        }),
      ),
      "198.51.100.21",
    );
    assert.equal(
      clientIpFromHeaders(
        new Headers({ "x-vercel-forwarded-for": "198.51.100.22" }),
      ),
      "198.51.100.22",
    );
  });

  it("uses the first hop when every address is private, else unknown", () => {
    assert.equal(
      clientIpFromHeaders(new Headers({ "x-forwarded-for": "10.0.0.2" })),
      "10.0.0.2",
    );
    assert.equal(clientIpFromHeaders(new Headers()), UNKNOWN_CLIENT_IP);
  });

  it("normalizes ports, brackets, and IPv4-mapped IPv6", () => {
    assert.equal(normalizeIpCandidate("203.0.113.9:443"), "203.0.113.9");
    assert.equal(normalizeIpCandidate("[2001:db8::1]:443"), "2001:db8::1");
    assert.equal(normalizeIpCandidate("::ffff:203.0.113.9"), "203.0.113.9");
    assert.equal(isPublicIp("2001:db8::1"), true);
    assert.equal(isPublicIp("fc00::1"), false);
    assert.equal(isPublicIp("fe80::1"), false);
    assert.equal(isPublicIp("::1"), false);
  });
});

describe("desk-feed write 429", () => {
  it("returns Retry-After when the IP is over the limit", async () => {
    const limiter = new FixedWindowRateLimiter({
      limit: 1,
      windowMs: 60_000,
      now: () => 0,
    });
    const headers = new Headers({ "x-real-ip": "203.0.113.40" });

    assert.equal(deskFeedWriteRateLimitResponse(headers, limiter), null);

    const blocked = deskFeedWriteRateLimitResponse(headers, limiter);
    assert.ok(blocked);
    assert.equal(blocked.status, 429);
    assert.equal(blocked.headers.get("Retry-After"), "60");
    assert.equal(blocked.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(await blocked.json(), { error: "Too many requests" });
  });

  it("rate-limits POST before token auth and leaves GET untouched", () => {
    const postAt = deskFeedRoute.indexOf("export async function POST");
    const getAt = deskFeedRoute.indexOf("export async function GET");
    assert.ok(getAt >= 0);
    assert.ok(postAt > getAt);

    const postSource = deskFeedRoute.slice(postAt);
    const limitAt = postSource.indexOf("deskFeedWriteRateLimitResponse");
    const authAt = postSource.indexOf("authorizeDeskFeedToken");
    assert.ok(limitAt >= 0);
    assert.ok(authAt > limitAt);
    assert.equal(DESK_FEED_WRITE_RATE_LIMIT.limit, 20);
    assert.equal(DESK_FEED_WRITE_RATE_LIMIT.windowMs, 60_000);

    const getSource = deskFeedRoute.slice(getAt, postAt);
    assert.doesNotMatch(getSource, /deskFeedWriteRateLimitResponse|429|Retry-After/);
  });
});
