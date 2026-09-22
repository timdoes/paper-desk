import {
  BookOpen,
  KeyRound,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DESK_NAME, DESK_OWNER, TEST_STAKE_USD } from "@/lib/constants";
import { DeskBackdrop } from "@/components/desk/desk-backdrop";
import { GlassBody, GlassHeader, GlassPanel } from "@/components/desk/glass-panel";

const steps = [
  {
    icon: BookOpen,
    title: "Open Alpaca Paper",
    body: "Create a paper trading account at alpaca.markets. Use Paper keys only — never a live trading key.",
  },
  {
    icon: KeyRound,
    title: "Set the three required env vars",
    body: "ALPACA_API_KEY, ALPACA_API_SECRET, and ALPACA_PAPER=true. Optional: DESK_START_ISO for the 30-day clock.",
  },
  {
    icon: ShieldCheck,
    title: "Reset paper buying power to $10,000",
    body: "Fresh Alpaca paper accounts often start near $100k. Tim’s verified desk is $10k. Reset paper buying power so ROI vs stake is honest.",
  },
];

export function SetupDesk() {
  return (
    <DeskBackdrop>
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] tracking-[0.28em] text-emerald-300/80">
              {DESK_OWNER} · maximize-ROI test
            </p>
            <h1 className="mt-2 font-sans text-5xl font-semibold tracking-tight text-white sm:text-6xl">
              {DESK_NAME}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/55">
              Premium paper monitor for a ${TEST_STAKE_USD.toLocaleString()}{" "}
              Alpaca Paper book. The desk is dark because broker keys are not
              loaded.
            </p>
          </div>
          <Badge className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 font-mono text-[10px] tracking-[0.2em] text-emerald-300 uppercase">
            Paper only
          </Badge>
        </div>

        <GlassPanel>
          <GlassHeader
            title="Setup desk"
            description="No invented balances, fills, or prices. $10,000 is the ROI baseline — not cash on this screen."
          />
          <GlassBody className="space-y-6">
            <div className="rounded-xl border border-amber-400/15 bg-amber-400/5 px-4 py-3 text-sm text-amber-100/80">
              <div className="flex items-start gap-3">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-300" />
                <p>
                  Keys are missing, so {DESK_NAME} will not call Alpaca and will
                  not paint a fake book. GET{" "}
                  <code className="font-mono text-amber-100">/api/account</code>{" "}
                  returns{" "}
                  <code className="font-mono text-amber-100">
                    {`{ configured: false }`}
                  </code>
                  .
                </p>
              </div>
            </div>

            <ol className="grid gap-4 md:grid-cols-3">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <li
                    key={step.title}
                    className="rounded-xl border border-white/8 bg-black/20 p-4"
                  >
                    <div className="mb-3 flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] text-white/35 uppercase">
                      <span>0{index + 1}</span>
                      <Icon className="size-3.5 text-emerald-300/80" />
                    </div>
                    <h2 className="text-sm font-medium text-white">{step.title}</h2>
                    <p className="mt-2 text-xs leading-5 text-white/50">
                      {step.body}
                    </p>
                  </li>
                );
              })}
            </ol>

            <Separator className="bg-white/8" />

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="font-mono text-[10px] tracking-[0.2em] text-white/35 uppercase">
                  Required locally / on Vercel
                </p>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-black/40 p-4 font-mono text-[12px] leading-6 text-emerald-100/90">
                  {`ALPACA_API_KEY=
ALPACA_API_SECRET=
ALPACA_PAPER=true
DESK_START_ISO=`}
                </pre>
              </div>
              <div className="space-y-3 text-sm text-white/55">
                <p>
                  Paper API base is hardcoded to{" "}
                  <code className="font-mono text-white/80">
                    https://paper-api.alpaca.markets
                  </code>
                  . Anything that points at{" "}
                  <code className="font-mono text-white/80">
                    api.alpaca.markets
                  </code>{" "}
                  hard-fails.
                </p>
                <p>
                  Copy{" "}
                  <code className="font-mono text-white/80">.env.example</code>{" "}
                  to{" "}
                  <code className="font-mono text-white/80">.env.local</code>,
                  add Paper keys, then restart{" "}
                  <code className="font-mono text-white/80">npm run dev</code>.
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  <a
                    href="https://app.alpaca.markets/signup"
                    className="inline-flex text-emerald-300 underline-offset-4 hover:underline"
                  >
                    Alpaca Paper signup →
                  </a>
                  <a
                    href="https://docs.alpaca.markets/docs/paper-trading"
                    className="inline-flex text-emerald-300/80 underline-offset-4 hover:underline"
                  >
                    Paper trading docs →
                  </a>
                </div>
              </div>
            </div>
          </GlassBody>
        </GlassPanel>
      </div>
    </DeskBackdrop>
  );
}
