import { formatPct, formatUsd, pnlClass } from "@/lib/format";
import type { OpdAccountView } from "@/lib/opd";

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

export function OptionsKpis({
  account,
  stake,
}: {
  account: OpdAccountView;
  stake: number;
}) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi
        label="Day P&L"
        value={formatUsd(account.dayPl)}
        hint={formatPct(account.dayPlPct)}
        toneClass={pnlClass(account.dayPl)}
      />
      <Kpi
        label={`Total vs ${formatUsd(stake)}`}
        value={formatUsd(account.totalPl)}
        hint={formatPct(account.totalPlPct)}
        toneClass={pnlClass(account.totalPl)}
      />
      <Kpi
        label="Options BP used"
        value={formatUsd(account.optionsBuyingPowerUsed)}
        hint={
          account.optionsBuyingPower != null
            ? `${formatUsd(account.optionsBuyingPower)} remaining`
            : "Open max loss of current spreads"
        }
      />
      <Kpi
        label="Buying power"
        value={formatUsd(account.buyingPower)}
        hint="Alpaca Paper buying power"
      />
    </section>
  );
}
