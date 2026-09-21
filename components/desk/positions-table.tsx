import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPct, formatQty, formatUsd, pnlClass } from "@/lib/format";
import type { PositionView } from "@/lib/types";
import { GlassBody, GlassHeader, GlassPanel } from "@/components/desk/glass-panel";

export function PositionsTable({ positions }: { positions: PositionView[] }) {
  return (
    <GlassPanel>
      <GlassHeader
        title="Positions"
        description={`${positions.length} open · marks from Alpaca Paper`}
      />
      <GlassBody className="px-0">
        {positions.length === 0 ? (
          <p className="px-5 pb-2 text-sm text-white/40">
            No open positions from Alpaca Paper.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/8 hover:bg-transparent">
                <TableHead className="px-5 text-white/40">Symbol</TableHead>
                <TableHead className="text-white/40">Qty</TableHead>
                <TableHead className="text-white/40">Avg</TableHead>
                <TableHead className="text-white/40">Last</TableHead>
                <TableHead className="text-right px-5 text-white/40">
                  Unrealized
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((position) => (
                <TableRow key={position.symbol} className="border-white/6">
                  <TableCell className="px-5 font-mono font-medium text-white">
                    {position.symbol}
                  </TableCell>
                  <TableCell className="font-mono text-white/80">
                    {formatQty(position.qty)}
                  </TableCell>
                  <TableCell className="font-mono text-white/80">
                    {formatUsd(position.avgEntry)}
                  </TableCell>
                  <TableCell className="font-mono text-white/80">
                    {formatUsd(position.last)}
                  </TableCell>
                  <TableCell
                    className={`px-5 text-right font-mono ${pnlClass(position.unrealized)}`}
                  >
                    {formatUsd(position.unrealized)}{" "}
                    <span className="text-[11px]">
                      {formatPct(position.unrealizedPct)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </GlassBody>
    </GlassPanel>
  );
}
