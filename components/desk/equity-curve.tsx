"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type MouseHandlerDataParam,
} from "recharts";
import { DESK_NAME } from "@/lib/constants";
import {
  DEFAULT_EQUITY_CURVE_RANGE,
  EQUITY_CURVE_RANGES,
  equityCurveCaption,
  equityCurveCompareBase,
  equityCurveHeader,
  equityCurveTicks,
  equityCurveTone,
  equityCurveYDomain,
  sliceEquityCurvePoints,
  type EquityCurveRange,
} from "@/lib/equity-curve";
import {
  etCalendarDateKey,
  formatEquityCurveDate,
  formatPct,
  formatSignedUsd,
  formatUsd,
} from "@/lib/format";
import type { DeskClock, DeskDataSource, HistoryPoint } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassBody, GlassHeader, GlassPanel } from "@/components/desk/glass-panel";

const UP_COLOR = "#34d399";
const DOWN_COLOR = "#fb7185";

export function EquityCurve({
  points,
  stake,
  clock,
  dataSource = "alpaca",
  caption,
}: {
  points: HistoryPoint[];
  stake: number;
  clock: DeskClock;
  dataSource?: DeskDataSource;
  caption?: string;
}) {
  const [range, setRange] = useState<EquityCurveRange>(DEFAULT_EQUITY_CURVE_RANGE);
  const [scrub, setScrub] = useState<HistoryPoint | null>(null);
  const fixture = dataSource === "local-fixture";
  const startIso = clock.configured ? clock.startIso : null;

  const data = useMemo(
    () => sliceEquityCurvePoints(points, range, { startIso }),
    [points, range, startIso],
  );
  const live = data[data.length - 1] ?? null;
  const displayed = scrub ?? live;
  const compareBase = equityCurveCompareBase(range, data, stake);
  const header = equityCurveHeader(displayed, compareBase);
  const tone = equityCurveTone(header.change);
  const lineColor = tone === "down" ? DOWN_COLOR : UP_COLOR;
  const dataMin = data.reduce(
    (min, point) => (point.equity < min ? point.equity : min),
    data[0]?.equity ?? 0,
  );
  const [yMin, yMax] = equityCurveYDomain(
    data.map((point) => point.equity),
    compareBase != null ? [compareBase] : [],
  );
  const startMs = data[0]?.t;
  const endMs = live?.t;
  const startKey = data[0] ? etCalendarDateKey(data[0].t) : "";
  const endKey = live ? etCalendarDateKey(live.t) : "";
  const ticks = startKey && endKey ? equityCurveTicks(startKey, endKey) : [];

  function onHover(state: MouseHandlerDataParam) {
    if (!state.isTooltipActive) {
      return;
    }
    const fromIndex =
      typeof state.activeIndex === "number"
        ? data[state.activeIndex]
        : undefined;
    const fromLabel =
      state.activeLabel != null ? data.find((point) => point.t === Number(state.activeLabel)) : undefined;
    const point = fromIndex ?? fromLabel;
    if (point != null && Number.isFinite(point.equity) && Number.isFinite(point.t)) {
      setScrub(point);
    }
  }

  return (
    <GlassPanel className="h-full">
      <GlassHeader
        title="Equity curve"
        description={caption ?? equityCurveCaption(range, { fixture })}
      />
      <GlassBody className="flex flex-col gap-3">
        {fixture ? (
          <Badge
            variant="outline"
            className="w-fit border-amber-400/40 bg-amber-400/10 font-mono text-[10px] tracking-[0.16em] text-amber-200 uppercase"
          >
            Local fixture — not live Alpaca
          </Badge>
        ) : null}
        <div
          className="flex flex-wrap gap-1"
          role="group"
          aria-label="Equity curve range"
        >
          {EQUITY_CURVE_RANGES.map((value) => {
            const selected = value === range;
            return (
              <Button
                key={value}
                type="button"
                size="xs"
                variant={selected ? "default" : "outline"}
                aria-pressed={selected}
                onClick={() => {
                  setRange(value);
                  setScrub(null);
                }}
                className={
                  selected
                    ? "min-w-12 font-mono"
                    : "min-w-12 border-white/10 bg-white/5 font-mono text-white/70 hover:bg-white/10"
                }
              >
                {value}
              </Button>
            );
          })}
        </div>
        {data.length === 0 || startMs == null || endMs == null ? (
          <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-white/10 bg-black/20 sm:h-[280px]">
            <p className="max-w-sm text-center text-sm text-white/40">
              No equity history from Alpaca Paper yet. {DESK_NAME} will not draw
              a synthetic curve.
            </p>
          </div>
        ) : (
          <>
            <div>
              <p
                className={`font-mono text-3xl tracking-tight sm:text-4xl ${
                  tone === "down" ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {formatUsd(header.equity)}
              </p>
              <p
                className={`mt-1 font-mono text-sm sm:text-base ${
                  tone === "down" ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {formatSignedUsd(header.change)}{" "}
                <span className="text-white/50">
                  ({formatPct(header.changePct)})
                </span>
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-white/40">
                {scrub
                  ? `as of ${formatEquityCurveDate(scrub.t)} ET`
                  : "live equity"}
              </p>
            </div>
            <div className="h-[220px] touch-none sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  onMouseMove={onHover}
                  onTouchMove={onHover}
                  onMouseLeave={() => {
                    setScrub(null);
                  }}
                  onTouchEnd={() => {
                    setScrub(null);
                  }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="t"
                    type="number"
                    domain={[startMs, endMs]}
                    ticks={ticks}
                    tickFormatter={formatEquityCurveDate}
                    tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[yMin, yMax]}
                    tickFormatter={(value: number) =>
                      `$${Math.round(value).toLocaleString()}`
                    }
                    tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={72}
                  />
                  <Tooltip
                    content={<EmptyTooltip />}
                    cursor={{
                      stroke: "rgba(255,255,255,0.45)",
                      strokeWidth: 1,
                    }}
                    isAnimationActive={false}
                  />
                  {compareBase != null ? (
                    <ReferenceLine
                      y={compareBase}
                      stroke="rgba(255,255,255,0.4)"
                      strokeDasharray="4 4"
                      ifOverflow="extendDomain"
                    />
                  ) : null}
                  <Area
                    type="monotone"
                    dataKey="equity"
                    stroke={lineColor}
                    strokeWidth={2}
                    fill={lineColor}
                    fillOpacity={0.12}
                    baseValue={dataMin}
                    isAnimationActive={false}
                    dot={false}
                    activeDot={{
                      r: 4,
                      stroke: lineColor,
                      fill: "#0b0f14",
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </GlassBody>
    </GlassPanel>
  );
}

function EmptyTooltip() {
  return null;
}
