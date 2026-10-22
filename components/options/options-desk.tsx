"use client";

import { useEffect, useState } from "react";
import { DeskBackdrop } from "@/components/desk/desk-backdrop";
import { EquityCurve } from "@/components/desk/equity-curve";
import { OptionsGuard } from "@/components/options/options-guard";
import { OptionsHeader } from "@/components/options/options-header";
import { OptionsKpis } from "@/components/options/options-kpis";
import { OptionsOrders } from "@/components/options/options-orders";
import { OptionsRisk } from "@/components/options/options-risk";
import { OptionsSetup } from "@/components/options/options-setup";
import { OptionsSpreads } from "@/components/options/options-spreads";
import { DESK_LENGTH_DAYS, OPD_API_PATH, OPD_REFRESH_MS } from "@/lib/constants";
import { formatEtStamp } from "@/lib/format";
import { isEtMarketHours } from "@/lib/opd-clock";
import type { OpdSnapshot } from "@/lib/opd";
import type { DeskClock } from "@/lib/types";

const OPD_CLOCK: DeskClock = {
  configured: false,
  startIso: null,
  endsAt: null,
  daysLeft: null,
  totalDays: DESK_LENGTH_DAYS,
};

const OPD_CURVE_CAPTION =
  "Funded history · change vs the $25,000 baseline on TEST · dates in Eastern Time · auto-scaled to this range · latest point is live equity when Alpaca history lags";

export function OptionsDesk({
  snapshot,
  live = true,
}: {
  snapshot: OpdSnapshot;
  live?: boolean;
}) {
  const [desk, setDesk] = useState(snapshot);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<"desk" | "setup" | "guard">("desk");
  const [guardMessage, setGuardMessage] = useState("");
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const fixture = desk.dataSource === "local-fixture" || !live;

  function applyPayload(response: Response, payload: Record<string, unknown>) {
    if (payload.configured === false) {
      setMode("setup");
      return;
    }
    if (payload.code === "PAPER_GUARD" || payload.paper === false) {
      setGuardMessage(String(payload.error ?? "Paper guard refused to start."));
      setMode("guard");
      return;
    }
    if (!response.ok) {
      setGuardMessage(String(payload.error ?? "Alpaca Paper request failed."));
      setMode("guard");
      return;
    }
    setDesk(payload as unknown as OpdSnapshot);
    setMode("desk");
    setRefreshedAt(formatEtStamp(new Date().toISOString()));
  }

  async function refresh() {
    if (fixture) {
      setRefreshedAt(formatEtStamp(new Date().toISOString()));
      return;
    }
    setRefreshing(true);
    try {
      const response = await fetch(OPD_API_PATH, { cache: "no-store" });
      const payload = (await response.json()) as Record<string, unknown>;
      applyPayload(response, payload);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (fixture) {
      return;
    }
    const timer = window.setInterval(() => {
      if (isEtMarketHours(Date.now())) {
        void refresh();
      }
    }, OPD_REFRESH_MS);
    return () => {
      window.clearInterval(timer);
    };
    // refresh closes over latest applyPayload; interval is the only subscriber.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- market-hours poll
  }, [fixture]);

  if (mode === "setup") {
    return <OptionsSetup />;
  }
  if (mode === "guard") {
    return <OptionsGuard title="Paper guard" message={guardMessage} />;
  }

  return (
    <DeskBackdrop>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
        <OptionsHeader
          refreshedAt={refreshedAt}
          onRefresh={fixture ? undefined : () => void refresh()}
          refreshing={refreshing}
          fixture={fixture}
        />
        <EquityCurve
          points={desk.history.points}
          stake={desk.stake}
          clock={OPD_CLOCK}
          dataSource={desk.dataSource}
          caption={OPD_CURVE_CAPTION}
        />
        <OptionsKpis account={desk.account} stake={desk.stake} />
        <OptionsRisk risk={desk.risk} />
        <OptionsSpreads spreads={desk.spreads} />
        <OptionsOrders orders={desk.orders} workingHidden={desk.workingHidden} />
      </div>
    </DeskBackdrop>
  );
}
