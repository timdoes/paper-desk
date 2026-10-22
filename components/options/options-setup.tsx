import Link from "next/link";
import { KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DeskBackdrop } from "@/components/desk/desk-backdrop";
import { GlassBody, GlassHeader, GlassPanel } from "@/components/desk/glass-panel";
import {
  DESK_OWNER,
  OPD_DESK_NAME,
  OPD_ENV_KEY_ID,
  OPD_ENV_SECRET,
  OPD_FIXTURE_PATH,
} from "@/lib/constants";

export function OptionsSetup() {
  return (
    <DeskBackdrop>
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-16">
        <div className="mb-8">
          <p className="font-mono text-[11px] tracking-[0.28em] text-emerald-300/80">
            {DESK_OWNER} / {OPD_DESK_NAME}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-sans text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Options Premium Desk
            </h1>
            <Badge className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 font-mono text-[10px] tracking-[0.2em] text-emerald-300 uppercase">
              Paper only
            </Badge>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/55">
            Not connected yet. The paper book is dark until the server has
            read-only Alpaca Paper keys. No balances, fills, or marks are
            invented.
          </p>
        </div>

        <GlassPanel>
          <GlassHeader
            title="Waiting on keys"
            description="Read-only watch. This desk never places an order."
          />
          <GlassBody className="space-y-5">
            <div className="flex items-start gap-3 rounded-xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/60">
              <KeyRound className="mt-0.5 size-4 shrink-0 text-emerald-300/80" />
              <p>
                Set{" "}
                <code className="font-mono text-white/80">{OPD_ENV_KEY_ID}</code>{" "}
                and{" "}
                <code className="font-mono text-white/80">{OPD_ENV_SECRET}</code>{" "}
                on the server, then refresh. Those keys stay server-only.
              </p>
            </div>
            <p className="text-sm text-white/45">
              Preview the full layout with a labelled fixture — not live Alpaca
              numbers.
            </p>
            <Link
              href={OPD_FIXTURE_PATH}
              className="inline-flex min-h-11 items-center text-sm text-emerald-300 underline-offset-4 hover:underline"
            >
              Open layout fixture →
            </Link>
          </GlassBody>
        </GlassPanel>
      </div>
    </DeskBackdrop>
  );
}
