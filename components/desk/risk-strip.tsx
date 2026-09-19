import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPct } from "@/lib/format";
import type { RiskStripState } from "@/lib/types";

export function RiskStrip({ risk }: { risk: RiskStripState }) {
  const breakerOpen = risk.dailyLossTripped;
  const nameHot = risk.nameBreaches.length > 0;

  return (
    <section className="grid gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3 backdrop-blur-xl md:grid-cols-2">
      <div className="flex items-start gap-3 px-2 py-1">
        {breakerOpen ? (
          <ShieldAlert className="mt-0.5 size-4 text-rose-300" />
        ) : (
          <ShieldCheck className="mt-0.5 size-4 text-emerald-300" />
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-[10px] tracking-[0.18em] text-white/40 uppercase">
              Daily loss breaker · 3%
            </p>
            <Badge
              variant={breakerOpen ? "destructive" : "secondary"}
              className="rounded-full font-mono text-[10px] uppercase"
            >
              {risk.dailyLossUnknown
                ? "Unknown"
                : breakerOpen
                  ? "Open · buys blocked"
                  : "Armed"}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-white/50">
            Day P&L {formatPct(risk.dayPlPct)}. Sells stay available if the
            breaker trips.
          </p>
        </div>
      </div>
      <div className="flex items-start gap-3 px-2 py-1">
        {nameHot ? (
          <ShieldAlert className="mt-0.5 size-4 text-rose-300" />
        ) : (
          <ShieldCheck className="mt-0.5 size-4 text-emerald-300" />
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-[10px] tracking-[0.18em] text-white/40 uppercase">
              Name cap · 10% NAV
            </p>
            <Badge
              variant={nameHot ? "destructive" : "secondary"}
              className="rounded-full font-mono text-[10px] uppercase"
            >
              {nameHot ? `${risk.nameBreaches.length} over cap` : "Inside cap"}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-white/50">
            {nameHot
              ? risk.nameBreaches
                  .map((row) => `${row.symbol} ${formatPct(row.navPct, 1)}`)
                  .join(" · ")
              : "New buys that would push a name over 10% of NAV are blocked."}
          </p>
        </div>
      </div>
    </section>
  );
}
