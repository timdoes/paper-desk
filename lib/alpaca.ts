import { PAPER_API_BASE } from "@/lib/constants";
import {
  assertPaperOnly,
  assertPaperUrl,
  keysConfigured,
} from "@/lib/paper-guard";

export class AlpacaRequestError extends Error {
  readonly status: number;
  readonly detail: string;

  constructor(status: number, detail: string) {
    super(`Alpaca Paper request failed (${status})`);
    this.name = "AlpacaRequestError";
    this.status = status;
    this.detail = detail;
  }
}

export async function alpacaFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  assertPaperOnly();
  if (!keysConfigured()) {
    throw new Error("Alpaca keys are not configured");
  }

  const url = `${PAPER_API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  assertPaperUrl(url);

  const headers = new Headers(init?.headers);
  headers.set("APCA-API-KEY-ID", process.env.ALPACA_API_KEY!.trim());
  headers.set("APCA-API-SECRET-KEY", process.env.ALPACA_API_SECRET!.trim());
  headers.set("Accept", "application/json");
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new AlpacaRequestError(response.status, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
