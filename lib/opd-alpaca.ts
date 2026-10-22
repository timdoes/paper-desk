import { PAPER_API_BASE } from "@/lib/constants";
import { AlpacaRequestError } from "@/lib/alpaca";
import { opdKeysConfigured } from "@/lib/opd-guard";
import { assertPaperOnly, assertPaperUrl } from "@/lib/paper-guard";

export async function opdFetch<T>(path: string): Promise<T> {
  assertPaperOnly();
  if (!opdKeysConfigured()) {
    throw new Error("OPD Alpaca keys are not configured");
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = `${PAPER_API_BASE}${normalized}`;
  assertPaperUrl(url);

  const headers = new Headers();
  headers.set("APCA-API-KEY-ID", process.env.OPD_APCA_API_KEY_ID!.trim());
  headers.set("APCA-API-SECRET-KEY", process.env.OPD_APCA_API_SECRET_KEY!.trim());
  headers.set("Accept", "application/json");

  const response = await fetch(url, {
    method: "GET",
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
