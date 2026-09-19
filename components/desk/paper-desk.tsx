"use client";

import { useState } from "react";
import { Blotter } from "@/components/desk/blotter";
import { DeskBackdrop } from "@/components/desk/desk-backdrop";
import { DeskHeader } from "@/components/desk/desk-header";
import { EquityCurve } from "@/components/desk/equity-curve";
import { KpiStrip } from "@/components/desk/kpi-strip";
import { PositionsTable } from "@/components/desk/positions-table";
import { RiskStrip } from "@/components/desk/risk-strip";
import { SetupDesk } from "@/components/desk/setup-desk";
import { TradePanel } from "@/components/desk/trade-panel";
import { PaperGuardDesk } from "@/components/desk/paper-guard-desk";
import type { DeskSnapshot } from "@/lib/types";

export function PaperDesk({ snapshot }: { snapshot: DeskSnapshot }) {
  const [desk, setDesk] = useState(snapshot);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<"desk" | "setup" | "guard">("desk");
  const [guardMessage, setGuardMessage] = useState("");
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  async function refresh() {
    setRefreshing(true);
    try {
      const [accountRes, positionsRes, ordersRes, historyRes] = await Promise.all([
        fetch("/api/account", { cache: "no-store" }),
        fetch("/api/positions", { cache: "no-store" }),
        fetch("/api/orders", { cache: "no-store" }),
        fetch("/api/portfolio/history", { cache: "no-store" }),
      ]);

      const account = (await accountRes.json()) as Record<string, unknown>;
      if (account.configured === false) {
        setMode("setup");
        return;
      }
      if (account.code === "PAPER_GUARD" || account.paper === false) {
        setGuardMessage(String(account.error ?? "Paper guard refused to start."));
        setMode("guard");
        return;
      }
      if (!accountRes.ok) {
        setGuardMessage(String(account.error ?? "Alpaca Paper account request failed."));
        setMode("guard");
        return;
      }

      const positionsJson = (await positionsRes.json()) as {
        configured?: boolean;
        positions?: DeskSnapshot["positions"];
      };
      const ordersJson = (await ordersRes.json()) as {
        configured?: boolean;
        orders?: DeskSnapshot["orders"];
      };
      const historyJson = (await historyRes.json()) as {
        configured?: boolean;
        history?: DeskSnapshot["history"];
      };

      if (
        positionsJson.configured === false ||
        ordersJson.configured === false ||
        historyJson.configured === false
      ) {
        setMode("setup");
        return;
      }

      setDesk({
        configured: true,
        paper: true,
        base: String(account.base ?? desk.base),
        stake: Number(account.stake ?? desk.stake),
        clock: (account.clock as DeskSnapshot["clock"]) ?? desk.clock,
        account: (account.account as DeskSnapshot["account"]) ?? desk.account,
        risk: (account.risk as DeskSnapshot["risk"]) ?? desk.risk,
        positions: positionsJson.positions ?? desk.positions,
        orders: ordersJson.orders ?? desk.orders,
        history: historyJson.history ?? desk.history,
      });
      setMode("desk");
      setRefreshedAt(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    } finally {
      setRefreshing(false);
    }
  }

  if (mode === "setup") {
    return <SetupDesk />;
  }
  if (mode === "guard") {
    return <PaperGuardDesk message={guardMessage} />;
  }

  return (
    <DeskBackdrop>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-6 py-8">
        <DeskHeader
          clock={desk.clock}
          refreshedAt={refreshedAt}
          onRefresh={() => {
            void refresh();
          }}
          refreshing={refreshing}
        />
        <RiskStrip risk={desk.risk} />
        <KpiStrip account={desk.account} clock={desk.clock} />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
          <EquityCurve points={desk.history.points} />
          <TradePanel
            risk={desk.risk}
            onPlaced={refresh}
          />
        </div>
        <PositionsTable positions={desk.positions} />
        <Blotter orders={desk.orders} />
      </div>
    </DeskBackdrop>
  );
}
