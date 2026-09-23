import { BrokerErrorDesk } from "@/components/desk/broker-error-desk";
import { PaperDesk } from "@/components/desk/paper-desk";
import { PaperGuardDesk } from "@/components/desk/paper-guard-desk";
import { SetupDesk } from "@/components/desk/setup-desk";
import { AlpacaRequestError } from "@/lib/alpaca";
import {
  alpacaClientErrorMessage,
  logAlpacaRequestError,
} from "@/lib/http";
import { PaperGuardError } from "@/lib/paper-guard";
import { loadDeskSnapshot } from "@/lib/snapshot";
import type { DeskSnapshot, UnconfiguredPayload } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageState =
  | { kind: "setup" }
  | { kind: "desk"; snapshot: DeskSnapshot }
  | { kind: "guard"; message: string }
  | { kind: "broker"; message: string };

async function resolvePageState(): Promise<PageState> {
  try {
    const snapshot: DeskSnapshot | UnconfiguredPayload = await loadDeskSnapshot();
    if (!snapshot.configured) {
      return { kind: "setup" };
    }
    return { kind: "desk", snapshot };
  } catch (error) {
    if (error instanceof PaperGuardError) {
      return { kind: "guard", message: error.message };
    }
    if (error instanceof AlpacaRequestError) {
      logAlpacaRequestError(error);
      return {
        kind: "broker",
        message: alpacaClientErrorMessage(error.status),
      };
    }
    throw error;
  }
}

export default async function HomePage() {
  const state = await resolvePageState();

  switch (state.kind) {
    case "setup":
      return <SetupDesk />;
    case "desk":
      return <PaperDesk snapshot={state.snapshot} />;
    case "guard":
      return <PaperGuardDesk message={state.message} />;
    case "broker":
      return <BrokerErrorDesk message={state.message} />;
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}
