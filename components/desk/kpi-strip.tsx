import { formatPct, formatUsd, pnlClass } from "@/lib/format";
import type { AccountView, DeskClock } from "@/lib/types";
import { TEST_STAKE_USD } from "@/lib/constants";

function Kpi({
  label,
  value,
  hint,
  toneClass,
}: {
  label: string;
  value: string;
  hint?: string;
  toneClass?: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 backdrop-blur-xl">
      <p className="font-mono text-[10px] tracking-[0.18em] text-white/35 uppercase">
        {label}
      </p>
      <p className={`mt-2 font-mono text-xl tracking-tight ${toneClass ?? "text-white"}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-white/35">{hint}</p> : null}
    </div>
  );
}

export function KpiStrip({
  account,
  clock,
}: {
  account: AccountView;
  clock: DeskClock;
}) {
  const daysValue = clock.configured
    ? `${clock.daysLeft}`
    : clock.invalid
      ? "Invalid"
      : "Unset";
  const daysHint = clock.configured
    ? `of ${clock.totalDays} · ${clock.endsAt.slice(0, 10)}`
    : "Set DESK_START_ISO";

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <Kpi
        label="Equity"
        value={formatUsd(account.equity)}
        hint="Alpaca Paper equity"
      />
      <Kpi
        label="Day P&L"
        value={formatUsd(account.dayPl)}
        hint={formatPct(account.dayPlPct)}
        toneClass={pnlClass(account.dayPl)}
      />
      <Kpi
        label="ROI vs $10k"
        value={formatPct(account.roiVsStakePct)}
        hint={`${formatUsd(account.roiVsStake)} vs ${formatUsd(TEST_STAKE_USD)} stake`}
        toneClass={pnlClass(account.roiVsStake)}
      />
      <Kpi label="Cash" value={formatUsd(account.cash)} hint="Settled cash" />
      <Kpi
        label="Buying power"
        value={formatUsd(account.buyingPower)}
        hint="Paper buying power"
      />
      <Kpi label="Days left" value={daysValue} hint={daysHint} />
    </section>
  );
}
