"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrderSide, OrderType, RiskStripState } from "@/lib/types";
import { GlassBody, GlassHeader, GlassPanel } from "@/components/desk/glass-panel";

type TradeResult =
  | { kind: "ok"; message: string }
  | { kind: "error"; message: string }
  | null;

export function TradePanel({
  risk,
  onPlaced,
}: {
  risk: RiskStripState;
  onPlaced: () => Promise<void>;
}) {
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState<OrderSide>("buy");
  const [qty, setQty] = useState("1");
  const [type, setType] = useState<OrderType>("market");
  const [limitPrice, setLimitPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TradeResult>(null);

  const buysBlocked = risk.dailyLossTripped && side === "buy";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    setSubmitting(true);

    const payload: Record<string, string | number> = {
      symbol: symbol.trim().toUpperCase(),
      qty,
      side,
      type,
    };
    if (type === "limit") {
      payload.limit_price = limitPrice;
    }

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        configured?: boolean;
        error?: string;
        order?: { id?: string; status?: string; symbol?: string };
      };

      if (data.configured === false) {
        setResult({
          kind: "error",
          message: "Keys are not configured. The desk will not invent a fill.",
        });
        return;
      }

      if (!response.ok) {
        setResult({
          kind: "error",
          message: data.error ?? `Order rejected (${response.status}).`,
        });
        return;
      }

      setResult({
        kind: "ok",
        message: `Paper order ${data.order?.status ?? "accepted"} for ${data.order?.symbol ?? payload.symbol}.`,
      });
      await onPlaced();
    } catch {
      setResult({
        kind: "error",
        message: "Could not reach /api/orders.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <GlassPanel className="h-full">
      <GlassHeader
        title="Manual trade"
        description="Paper market / limit · POST /api/orders"
      />
      <GlassBody>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="symbol" className="text-white/50">
              Symbol
            </Label>
            <Input
              id="symbol"
              value={symbol}
              onChange={(event) => setSymbol(event.target.value.toUpperCase())}
              placeholder="AAPL"
              autoComplete="off"
              className="border-white/10 bg-black/30 font-mono uppercase"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/50">Side</Label>
              <Select
                value={side}
                onValueChange={(value) => setSide(value as OrderSide)}
              >
                <SelectTrigger className="w-full border-white/10 bg-black/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/50">Type</Label>
              <Select
                value={type}
                onValueChange={(value) => setType(value as OrderType)}
              >
                <SelectTrigger className="w-full border-white/10 bg-black/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="market">Market</SelectItem>
                  <SelectItem value="limit">Limit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qty" className="text-white/50">
                Qty
              </Label>
              <Input
                id="qty"
                value={qty}
                onChange={(event) => setQty(event.target.value)}
                inputMode="decimal"
                className="border-white/10 bg-black/30 font-mono"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="limit" className="text-white/50">
                Limit
              </Label>
              <Input
                id="limit"
                value={limitPrice}
                onChange={(event) => setLimitPrice(event.target.value)}
                inputMode="decimal"
                disabled={type !== "limit"}
                placeholder={type === "limit" ? "0.00" : "—"}
                className="border-white/10 bg-black/30 font-mono"
                required={type === "limit"}
              />
            </div>
          </div>
          {buysBlocked ? (
            <p className="text-xs text-rose-300">
              Daily loss breaker is open. This buy will be rejected by the desk;
              a sell will still go through.
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-400 text-emerald-950 hover:bg-emerald-300"
          >
            {submitting ? "Sending to paper…" : "Send paper order"}
          </Button>
          {result ? (
            <p
              className={
                result.kind === "ok"
                  ? "text-xs text-emerald-300"
                  : "text-xs text-rose-300"
              }
            >
              {result.message}
            </p>
          ) : (
            <p className="text-xs text-white/35">
              Risk: max 10% NAV per name · ~3% daily loss breaker.
            </p>
          )}
        </form>
      </GlassBody>
    </GlassPanel>
  );
}
