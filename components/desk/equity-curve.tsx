"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DESK_NAME } from "@/lib/constants";
import {
  equityCurveWindow,
  formatEquityCurveDate,
  formatUsd,
  skipLeadingZeroEquity,
} from "@/lib/format";
import type { HistoryPoint } from "@/lib/types";
import { GlassBody, GlassHeader, GlassPanel } from "@/components/desk/glass-panel";

export function EquityCurve({ points }: { points: HistoryPoint[] }) {
  const data = skipLeadingZeroEquity(points).map((point) => ({
    t: point.t,
    equity: point.equity,
  }));
  const last = data[data.length - 1];
  const axis = last ? equityCurveWindow(last.t) : null;

  return (
    <GlassPanel className="h-full">
      <GlassHeader
        title="Equity curve"
        description="30-day window · dates in Eastern Time · latest point is live equity when Alpaca history lags."
      />
      <GlassBody className="h-[320px]">
        {data.length === 0 || axis == null ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-white/10 bg-black/20">
            <p className="max-w-sm text-center text-sm text-white/40">
              No equity history from Alpaca Paper yet. {DESK_NAME} will not draw
              a synthetic curve.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="t"
                type="number"
                domain={[axis.startMs, axis.endMs]}
                ticks={axis.ticks}
                tickFormatter={formatEquityCurveDate}
                tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(value: number) =>
                  `$${Math.round(value).toLocaleString()}`
                }
                tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={72}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(8,10,14,0.92)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelFormatter={(label) => formatEquityCurveDate(Number(label))}
                formatter={(value) => [
                  formatUsd(typeof value === "number" ? value : null),
                  "Equity",
                ]}
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke="#34d399"
                strokeWidth={2}
                fill="url(#equityFill)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </GlassBody>
    </GlassPanel>
  );
}
