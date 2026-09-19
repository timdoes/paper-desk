import { NextResponse } from "next/server";
import { AlpacaRequestError } from "@/lib/alpaca";
import { PaperGuardError, keysConfigured } from "@/lib/paper-guard";
import { unconfiguredPayload } from "@/lib/snapshot";

export function jsonUnconfigured() {
  return NextResponse.json(unconfiguredPayload());
}

export function handleRouteError(error: unknown) {
  if (error instanceof PaperGuardError) {
    return NextResponse.json(
      {
        configured: keysConfigured(),
        paper: false,
        code: error.code,
        error: error.message,
      },
      { status: 503 },
    );
  }

  if (error instanceof AlpacaRequestError) {
    return NextResponse.json(
      {
        configured: true,
        paper: true,
        error: "Alpaca Paper request failed",
        status: error.status,
        detail: error.detail,
      },
      { status: error.status >= 400 && error.status < 600 ? error.status : 502 },
    );
  }

  const message =
    error instanceof Error ? error.message : "Unexpected server error";
  return NextResponse.json(
    { configured: keysConfigured(), error: message },
    { status: 500 },
  );
}

export function requireConfigured() {
  if (!keysConfigured()) {
    return jsonUnconfigured();
  }
  return null;
}
