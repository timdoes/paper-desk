import { Badge } from "@/components/ui/badge";
import { GlassBody, GlassHeader, GlassPanel } from "@/components/desk/glass-panel";
import { formatOpdDate, formatPct, formatUsd, pnlClass } from "@/lib/format";
import type { OpdSpreadView } from "@/lib/opd-spreads";

function kindLabel(kind: OpdSpreadView["kind"]): string {
  switch (kind) {
    case "put_credit":
      return "Put credit spread";
    case "call_credit":
      return "Call credit spread";
    case "single":
      return "Single";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function strikeLine(spread: OpdSpreadView): string {
  if (spread.shortStrike != null && spread.longStrike != null) {
    return `${spread.underlying} ${spread.shortStrike}/${spread.longStrike}`;
  }
  if (spread.shortStrike != null) {
    return `${spread.underlying} ${spread.shortStrike} short`;
  }
  if (spread.longStrike != null) {
    return `${spread.underlying} ${spread.longStrike} long`;
  }
  return spread.underlying;
}

function Metric({
  label,
  value,
  toneClass,
}: {
  label: string;
  value: string;
  toneClass?: string;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] tracking-[0.16em] text-white/35 uppercase">
        {label}
      </p>
      <p className={`mt-1 font-mono text-sm ${toneClass ?? "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function SpreadCard({ spread }: { spread: OpdSpreadView }) {
  return (
    <article className="rounded-xl border border-white/8 bg-black/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-medium tracking-tight text-white">
            {strikeLine(spread)}
          </h3>
          <p className="mt-1 text-xs text-white/45">
            {formatOpdDate(spread.expiry)} · {spread.dte} DTE ·{" "}
            {spread.contracts}x
          </p>
        </div>
        <Badge
          variant="outline"
          className="rounded-full border-white/15 bg-white/5 font-mono text-[10px] tracking-[0.14em] text-white/70 uppercase"
        >
          {kindLabel(spread.kind)}
        </Badge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric label="Credit received" value={formatUsd(spread.creditReceived)} />
        <Metric label="Current mark" value={formatUsd(spread.mark)} />
        <Metric
          label="Unrealized"
          value={formatUsd(spread.unrealized)}
          toneClass={pnlClass(spread.unrealized)}
        />
        <Metric label="Max loss" value={formatUsd(spread.maxLoss)} />
        <Metric
          label="% of max profit"
          value={formatPct(spread.pctOfMaxProfit)}
          toneClass={pnlClass(spread.pctOfMaxProfit)}
        />
      </div>
    </article>
  );
}

function Sleeve({
  title,
  description,
  spreads,
}: {
  title: string;
  description: string;
  spreads: OpdSpreadView[];
}) {
  return (
    <GlassPanel>
      <GlassHeader title={title} description={description} />
      <GlassBody>
        {spreads.length === 0 ? (
          <p className="text-sm text-white/40">No open positions in this sleeve.</p>
        ) : (
          <div className="grid gap-3">
            {spreads.map((spread) => (
              <SpreadCard key={spread.id} spread={spread} />
            ))}
          </div>
        )}
      </GlassBody>
    </GlassPanel>
  );
}

export function OptionsSpreads({ spreads }: { spreads: OpdSpreadView[] }) {
  const credit = spreads.filter((spread) => spread.sleeve === "credit");
  const day = spreads.filter((spread) => spread.sleeve === "day");
  const other = spreads.filter((spread) => spread.sleeve === "other");

  return (
    <div className="grid gap-5">
      <Sleeve
        title="Put credit spreads · 45–60 DTE"
        description="Defined-risk put credit spreads in the 45–60 day window."
        spreads={credit}
      />
      <Sleeve
        title="Day sleeve · 0–3 DTE"
        description="Same-week / 0–3 DTE paper sleeve."
        spreads={day}
      />
      {other.length > 0 ? (
        <Sleeve
          title="Other open options"
          description="Open option risk outside the two sleeves."
          spreads={other}
        />
      ) : null}
    </div>
  );
}
