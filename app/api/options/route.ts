import { AlpacaRequestError } from "@/lib/alpaca";
import {
  alpacaClientErrorBody,
  alpacaStatusCode,
  jsonPrivate,
  logAlpacaRequestError,
} from "@/lib/http";
import { loadOpdSnapshot, opdUnconfiguredPayload } from "@/lib/opd";
import { opdKeysConfigured } from "@/lib/opd-guard";
import { PaperGuardError } from "@/lib/paper-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function handleOpdRouteError(error: unknown) {
  if (error instanceof PaperGuardError) {
    return jsonPrivate(
      {
        configured: opdKeysConfigured(),
        paper: false,
        code: error.code,
        error: error.message,
      },
      { status: 503 },
    );
  }

  if (error instanceof AlpacaRequestError) {
    logAlpacaRequestError(error);
    return jsonPrivate(alpacaClientErrorBody(error.status), {
      status: alpacaStatusCode(error.status),
    });
  }

  console.error("Unexpected options route error", error);
  return jsonPrivate(
    { configured: opdKeysConfigured(), error: "Unexpected server error" },
    { status: 500 },
  );
}

export async function GET() {
  if (!opdKeysConfigured()) {
    return jsonPrivate(opdUnconfiguredPayload());
  }

  try {
    const payload = await loadOpdSnapshot();
    return jsonPrivate(payload);
  } catch (error) {
    return handleOpdRouteError(error);
  }
}
