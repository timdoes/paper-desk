import { OPD_STAKE_USD } from "@/lib/constants";
import { formatUsd } from "@/lib/format";
import type { OpdRiskView } from "@/lib/opd";
import { GlassBody, GlassHeader, GlassPanel } from "@/components/desk/glass-panel";

function barTone(ratio: number | null, tripped: boolean): string {
  if (tripped || (ratio != null && ratio >= 1)) {
    return "bg-rose-400";
  }
  if (ratio != null && ratio >= 0.7) {
    return "bg-amber-400";
  }
  return "bg-emerald-400";
}

function RiskBar({
  label,
  value,
  hint,
  ratio,
  tripped,
}: {
  label: string;
  value: string;
  hint: string;
  ratio: number | null;
  tripped: boolean;
}) {
  const width = Math.min(100, Math.max(0, (ratio ?? 0) * 100));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] tracking-[0.18em] text-white/40 uppercase">
            {label}
          </p>
          <p className="mt-1 text-xs text-white/50">{hint}</p>
        </div>
        <p
          className={`font-mono text-sm ${tripped ? "text-rose-300" : "text-white/80"}`}
        >
          {value}
        </p>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(width)}
      >
        <div
          className={`h-full rounded-full ${barTone(ratio, tripped)}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export function OptionsRisk({ risk }: { risk: OpdRiskView }) {
  return (
    <GlassPanel>
      <GlassHeader
        title="Risk lines"
        description="Paper rules only. Daily stop −$750 · de-risk $23,500 · kill switch $22,500 · open max-loss cap $6,250."
      />
      <GlassBody className="grid gap-5">
        <RiskBar
          label="Daily stop"
          hint="Day P&L used versus the −$750 paper stop"
          value={
            risk.dailyStopUsed == null
              ? "—"
              : `${formatUsd(risk.dailyStopUsed)} of ${formatUsd(risk.dailyStopUsd)}`
          }
          ratio={risk.dailyStopRatio}
          tripped={risk.dailyStopTripped}
        />
        <RiskBar
          label="De-risk"
          hint={`Equity walking from ${formatUsd(OPD_STAKE_USD)} toward ${formatUsd(risk.deriskEquity)}`}
          value={formatUsd(risk.deriskEquity)}
          ratio={risk.deriskRatio}
          tripped={risk.deriskTripped}
        />
        <RiskBar
          label="Kill switch"
          hint={`Hard floor at ${formatUsd(risk.killSwitchEquity)}`}
          value={formatUsd(risk.killSwitchEquity)}
          ratio={risk.killSwitchRatio}
          tripped={risk.killSwitchTripped}
        />
        <RiskBar
          label="Open max loss"
          hint="Sum of current spread max loss versus the $6,250 cap"
          value={
            risk.openMaxLoss == null
              ? "—"
              : `${formatUsd(risk.openMaxLoss)} of ${formatUsd(risk.openMaxLossCap)}`
          }
          ratio={risk.openMaxLossRatio}
          tripped={risk.openMaxLossTripped}
        />
      </GlassBody>
    </GlassPanel>
  );
}
