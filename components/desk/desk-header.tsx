import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DESK_NAME, DESK_OWNER, TEST_STAKE_USD } from "@/lib/constants";
import type { DeskClock } from "@/lib/types";

export function DeskHeader({
  clock,
  refreshedAt,
  onRefresh,
  refreshing,
}: {
  clock: DeskClock;
  refreshedAt: string | null;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-white/8 pb-5 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="font-mono text-[10px] tracking-[0.28em] text-emerald-300/75">
          {DESK_OWNER}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {DESK_NAME}
          </h1>
          <Badge className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 font-mono text-[10px] tracking-[0.2em] text-emerald-300 uppercase">
            Paper only
          </Badge>
        </div>
        <p className="mt-2 text-sm text-white/45">
          ${TEST_STAKE_USD.toLocaleString()} stake · 30-day maximize-ROI · Alpaca
          Paper
          {clock.configured ? ` · clock ends ${clock.endsAt.slice(0, 10)}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <p className="font-mono text-[11px] text-white/35">
          {refreshedAt ? `as of ${refreshedAt}` : "live from Alpaca Paper"}
        </p>
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
      </div>
    </header>
  );
}
