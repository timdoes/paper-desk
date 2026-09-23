import { NextResponse } from "next/server";
import {
  authorizeDeskFeedToken,
  parseIncomingDeskMessage,
  readDeskFeedToken,
} from "@/lib/desk-feed";
import { appendDeskFeedMessage, loadDeskFeed } from "@/lib/desk-feed-store";
import { deskFeedWriteRateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = {
  "Cache-Control": "no-store",
};

export async function GET() {
  try {
    const payload = await loadDeskFeed();
    return NextResponse.json(payload, { headers: NO_STORE });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Desk feed failed to load.";
    return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE });
  }
}

export async function POST(request: Request) {
  const limited = deskFeedWriteRateLimitResponse(request.headers);
  if (limited) {
    return limited;
  }

  const token = readDeskFeedToken(request.headers);
  if (!authorizeDeskFeedToken(token)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: NO_STORE },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "JSON body required." },
      { status: 400, headers: NO_STORE },
    );
  }

  const parsed = parseIncomingDeskMessage(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const result = await appendDeskFeedMessage(parsed.message);
    return NextResponse.json(
      {
        ok: true,
        persisted: result.persisted,
        message: result.message,
        bots: result.payload.bots,
        messages: result.payload.messages,
        sort: result.payload.sort,
      },
      { status: 201, headers: NO_STORE },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Desk feed failed to persist.";
    return NextResponse.json({ error: message }, { status: 503, headers: NO_STORE });
  }
}
