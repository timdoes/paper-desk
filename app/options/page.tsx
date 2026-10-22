import { OptionsDesk } from "@/components/options/options-desk";
import { OptionsGuard } from "@/components/options/options-guard";
import { OptionsSetup } from "@/components/options/options-setup";
import { AlpacaRequestError } from "@/lib/alpaca";
import {
  alpacaClientErrorMessage,
  logAlpacaRequestError,
} from "@/lib/http";
import { loadOpdSnapshot, type OpdSnapshot } from "@/lib/opd";
import { PaperGuardError } from "@/lib/paper-guard";
import type { UnconfiguredPayload } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageState =
  | { kind: "setup" }
  | { kind: "desk"; snapshot: OpdSnapshot }
  | { kind: "guard"; message: string }
  | { kind: "broker"; message: string };

async function resolvePageState(): Promise<PageState> {
  try {
    const snapshot: OpdSnapshot | UnconfiguredPayload = await loadOpdSnapshot();
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

export default async function OptionsPage() {
  const state = await resolvePageState();

  switch (state.kind) {
    case "setup":
      return <OptionsSetup />;
    case "desk":
      return <OptionsDesk snapshot={state.snapshot} />;
    case "guard":
      return <OptionsGuard title="Paper guard" message={state.message} />;
    case "broker":
      return <OptionsGuard title="Broker unavailable" message={state.message} />;
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}
