import { isIP, isIPv4 } from "node:net";
import { NextResponse } from "next/server";

/**
 * In-memory fixed-window limiter for POST /api/desk-feed.
 *
 * Fine for Hobby / single-region: one Node process, one Map. If Vercel
 * fans the route out across instances, each instance counts separately,
 * so the cap is best-effort. No Redis/Blob coordination.
 */
export const DESK_FEED_WRITE_RATE_LIMIT = {
  limit: 20,
  windowMs: 60_000,
} as const;

export const UNKNOWN_CLIENT_IP = "unknown";

const PRIVATE_NO_STORE = {
  "Cache-Control": "no-store",
};

const IP_HEADER_NAMES = [
  "x-forwarded-for",
  "x-real-ip",
  "x-vercel-forwarded-for",
] as const;

type RateLimitBucket = {
  count: number;
  windowStartMs: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export type FixedWindowRateLimiterOptions = {
  limit: number;
  windowMs: number;
  now?: () => number;
};

export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly now: () => number;

  constructor(options: FixedWindowRateLimiterOptions) {
    this.limit = options.limit;
    this.windowMs = options.windowMs;
    this.now = options.now ?? Date.now;
  }

  consume(key: string): RateLimitDecision {
    const now = this.now();
    this.evictExpired(now);

    const existing = this.buckets.get(key);
    if (!existing || now >= existing.windowStartMs + this.windowMs) {
      this.buckets.set(key, { count: 1, windowStartMs: now });
      return {
        allowed: true,
        remaining: this.limit - 1,
        retryAfterSeconds: msToSeconds(this.windowMs),
      };
    }

    existing.count += 1;
    const retryAfterSeconds = Math.max(
      1,
      msToSeconds(existing.windowStartMs + this.windowMs - now),
    );

    if (existing.count > this.limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds,
      };
    }

    return {
      allowed: true,
      remaining: this.limit - existing.count,
      retryAfterSeconds,
    };
  }

  private evictExpired(now: number) {
    if (this.buckets.size < 1_024) {
      return;
    }

    for (const [key, bucket] of this.buckets) {
      if (now >= bucket.windowStartMs + this.windowMs) {
        this.buckets.delete(key);
      }
    }
  }
}

export const deskFeedWriteLimiter = new FixedWindowRateLimiter(
  DESK_FEED_WRITE_RATE_LIMIT,
);

export function clientIpFromHeaders(headers: Headers): string {
  const candidates: string[] = [];

  for (const name of IP_HEADER_NAMES) {
    for (const hop of splitForwardedHops(headers.get(name))) {
      const ip = normalizeIpCandidate(hop);
      if (ip) {
        candidates.push(ip);
      }
    }
  }

  for (const ip of candidates) {
    if (isPublicIp(ip)) {
      return ip;
    }
  }

  return candidates[0] ?? UNKNOWN_CLIENT_IP;
}

export function deskFeedWriteRateLimitResponse(
  headers: Headers,
  limiter: FixedWindowRateLimiter = deskFeedWriteLimiter,
): NextResponse | null {
  const decision = limiter.consume(clientIpFromHeaders(headers));
  if (decision.allowed) {
    return null;
  }

  return NextResponse.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: {
        ...PRIVATE_NO_STORE,
        "Retry-After": String(decision.retryAfterSeconds),
      },
    },
  );
}

export function splitForwardedHops(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return value.split(",").map((hop) => hop.trim()).filter(Boolean);
}

export function normalizeIpCandidate(raw: string): string | null {
  let value = raw.trim().replace(/^"+|"+$/g, "");
  if (!value) {
    return null;
  }

  if (value.startsWith("[")) {
    const end = value.indexOf("]");
    if (end === -1) {
      return null;
    }
    value = value.slice(1, end);
  } else {
    const colon = value.lastIndexOf(":");
    if (colon !== -1 && isIPv4(value.slice(0, colon))) {
      value = value.slice(0, colon);
    }
  }

  if (isIP(value) === 0) {
    return null;
  }

  const lower = value.toLowerCase();
  if (lower.startsWith("::ffff:") && isIPv4(lower.slice(7))) {
    return lower.slice(7);
  }

  return lower;
}

export function isPublicIp(ip: string): boolean {
  if (isIPv4(ip)) {
    return !isPrivateIPv4(ip);
  }

  return !isPrivateIPv6(ip);
}

function isPrivateIPv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  return (
    inCidr(value, "0.0.0.0", 8) ||
    inCidr(value, "10.0.0.0", 8) ||
    inCidr(value, "100.64.0.0", 10) ||
    inCidr(value, "127.0.0.0", 8) ||
    inCidr(value, "169.254.0.0", 16) ||
    inCidr(value, "172.16.0.0", 12) ||
    inCidr(value, "192.168.0.0", 16) ||
    inCidr(value, "224.0.0.0", 4) ||
    inCidr(value, "240.0.0.0", 4)
  );
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::" || lower === "::1") {
    return true;
  }
  if (lower.startsWith("::ffff:")) {
    const mapped = lower.slice(7);
    return isIPv4(mapped) ? isPrivateIPv4(mapped) : false;
  }

  const firstHextet = Number.parseInt(lower.split(":", 1)[0] || "0", 16);
  if (!Number.isFinite(firstHextet)) {
    return false;
  }

  // Unique local fc00::/7 and link-local fe80::/10.
  return (
    (firstHextet & 0xfe00) === 0xfc00 || (firstHextet & 0xffc0) === 0xfe80
  );
}

function ipv4ToInt(ip: string): number {
  const parts = ip.split(".");
  return (
    ((Number(parts[0]) << 24) |
      (Number(parts[1]) << 16) |
      (Number(parts[2]) << 8) |
      Number(parts[3])) >>>
    0
  );
}

function inCidr(ip: number, base: string, prefix: number): boolean {
  const shift = 32 - prefix;
  const mask = shift === 32 ? 0 : (0xffffffff << shift) >>> 0;
  return (ip & mask) === (ipv4ToInt(base) & mask);
}

function msToSeconds(ms: number): number {
  return Math.ceil(ms / 1000);
}
