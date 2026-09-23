import { NextResponse } from "next/server";
import { AlpacaRequestError } from "@/lib/alpaca";
import { PaperGuardError, keysConfigured } from "@/lib/paper-guard";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/security-headers";
import { unconfiguredPayload } from "@/lib/snapshot";

export const BROKER_UNAVAILABLE_MESSAGE = "Broker unavailable";

export type JsonPrivateInit = {
  status?: number;
};

export function jsonPrivate(data: unknown, init: JsonPrivateInit = {}) {
  return NextResponse.json(data, {
    status: init.status,
    headers: PRIVATE_NO_STORE_HEADERS,
  });
}

export function alpacaStatusCode(status: number) {
  return status >= 400 && status < 600 ? status : 502;
}

export function alpacaClientErrorBody(status: number) {
  return {
    configured: true as const,
    paper: true as const,
    error: BROKER_UNAVAILABLE_MESSAGE,
    status,
  };
}

export function alpacaClientErrorMessage(status: number) {
  return `${BROKER_UNAVAILABLE_MESSAGE} (${status})`;
}

export function logAlpacaRequestError(error: AlpacaRequestError) {
  console.error("Alpaca Paper request failed", {
    status: error.status,
    detail: error.detail,
  });
}

export function jsonUnconfigured() {
  return jsonPrivate(unconfiguredPayload());
}

export function handleRouteError(error: unknown) {
  if (error instanceof PaperGuardError) {
    return jsonPrivate(
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
    logAlpacaRequestError(error);
    return jsonPrivate(alpacaClientErrorBody(error.status), {
      status: alpacaStatusCode(error.status),
    });
  }

  console.error("Unexpected route error", error);
  return jsonPrivate(
    { configured: keysConfigured(), error: "Unexpected server error" },
    { status: 500 },
  );
}

export function requireConfigured() {
  if (!keysConfigured()) {
    return jsonUnconfigured();
  }
  return null;
}
