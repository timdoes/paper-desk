import { LIVE_ALPACA_HOST, PAPER_ALPACA_HOST } from "./constants";

export class PaperGuardError extends Error {
  readonly code = "PAPER_GUARD";

  constructor(message: string) {
    super(message);
    this.name = "PaperGuardError";
  }
}

export function keysConfigured(): boolean {
  const key = process.env.ALPACA_API_KEY?.trim();
  const secret = process.env.ALPACA_API_SECRET?.trim();
  return Boolean(key && secret);
}

export function pointsAtLiveAlpaca(value: string): boolean {
  const trimmed = value.trim();
  const urlMatches = trimmed.match(/https?:\/\/[^\s"'\\]+/gi) ?? [];
  for (const raw of urlMatches) {
    try {
      const url = new URL(raw);
      if (url.hostname === LIVE_ALPACA_HOST) {
        return true;
      }
    } catch {
      // Ignore unparseable fragments; token scan below still applies.
    }
  }

  const tokens = trimmed.split(/[^a-zA-Z0-9.-]+/);
  return tokens.some((token) => token.toLowerCase() === LIVE_ALPACA_HOST);
}

export function assertPaperOnly(
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (env.ALPACA_PAPER !== "true") {
    throw new PaperGuardError(
      "ALPACA_PAPER must be exactly 'true'. Paper Desk will not talk to a broker without an explicit paper flag.",
    );
  }

  for (const [name, value] of Object.entries(env)) {
    if (!value) {
      continue;
    }
    if (pointsAtLiveAlpaca(value)) {
      throw new PaperGuardError(
        `${name} points at live Alpaca (${LIVE_ALPACA_HOST}). Paper Desk hard-fails rather than send a live request.`,
      );
    }
  }
}

export function assertPaperUrl(url: string): void {
  const parsed = new URL(url);
  if (parsed.hostname !== PAPER_ALPACA_HOST) {
    throw new PaperGuardError(
      `Refusing request host ${parsed.hostname}. Only ${PAPER_ALPACA_HOST} is allowed.`,
    );
  }
}
