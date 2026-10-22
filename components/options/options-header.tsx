import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DESK_OWNER, OPD_DESK_NAME } from "@/lib/constants";

export function OptionsHeader({
  refreshedAt,
  onRefresh,
  refreshing,
  fixture,
}: {
  refreshedAt: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
  fixture?: boolean;
}) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="font-mono text-[10px] tracking-[0.28em] text-emerald-300/75">
          {DESK_OWNER} / {OPD_DESK_NAME}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Options Premium Desk
          </h1>
          <Badge className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 font-mono text-[10px] tracking-[0.2em] text-emerald-300 uppercase">
            Paper only
          </Badge>
          {fixture ? (
            <Badge
              variant="outline"
              className="rounded-full border-amber-400/40 bg-amber-400/10 font-mono text-[10px] tracking-[0.16em] text-amber-200 uppercase"
            >
              Layout fixture — not live
            </Badge>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-white/45">
          Read-only watch on the $25,000 Alpaca Paper book. No tickets from this
          screen.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <p className="font-mono text-[11px] text-white/35">
          {refreshedAt
            ? `as of ${refreshedAt}`
            : fixture
              ? "labelled fixture — not live Alpaca"
              : "live from Alpaca Paper"}
        </p>
        {onRefresh ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
            className="border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            <RefreshCw className={refreshing ? "animate-spin" : ""} />
            Refresh
          </Button>
        ) : null}
      </div>
    </header>
  );
}
