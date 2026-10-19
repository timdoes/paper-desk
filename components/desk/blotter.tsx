import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TEST_1_ARCHIVE,
  liveBlotterDescription,
  liveBlotterEmptyState,
} from "@/lib/desk-feed-archive";
import { formatDeskDay, formatQty, formatUsd } from "@/lib/format";
import type { OrderView } from "@/lib/types";
import { GlassBody, GlassHeader, GlassPanel } from "@/components/desk/glass-panel";

function statusVariant(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "filled") {
    return "default" as const;
  }
  if (normalized === "canceled" || normalized === "rejected" || normalized === "expired") {
    return "destructive" as const;
  }
  return "secondary" as const;
}

export function Blotter({
  orders,
  description = liveBlotterDescription(),
  emptyState = liveBlotterEmptyState(),
  archiveHref = TEST_1_ARCHIVE.href,
  archiveLabel = `${TEST_1_ARCHIVE.label} archive`,
  showArchiveLink = true,
}: {
  orders: OrderView[];
  description?: string;
  emptyState?: string;
  archiveHref?: string;
  archiveLabel?: string;
  showArchiveLink?: boolean;
}) {
  return (
    <GlassPanel>
      <GlassHeader title="Blotter" description={description} />
      <GlassBody className="px-0">
        {orders.length === 0 ? (
          <div className="space-y-3 px-5 pb-2">
            <p className="text-sm text-white/40">{emptyState}</p>
            {showArchiveLink ? (
              <Link
                href={archiveHref}
                className="inline-flex min-h-11 items-center text-sm text-emerald-300/85 underline-offset-4 hover:text-emerald-200 hover:underline"
              >
                {archiveLabel}
              </Link>
            ) : null}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/8 hover:bg-transparent">
                <TableHead className="px-5 text-white/40">When</TableHead>
                <TableHead className="text-white/40">Symbol</TableHead>
                <TableHead className="text-white/40">Side</TableHead>
                <TableHead className="text-white/40">Type</TableHead>
                <TableHead className="text-white/40">Qty</TableHead>
                <TableHead className="text-white/40">Fill / limit</TableHead>
                <TableHead className="px-5 text-white/40">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} className="border-white/6">
                  <TableCell className="px-5 font-mono text-xs text-white/55">
                    {formatDeskDay(order.filledAt ?? order.submittedAt)}
                  </TableCell>
                  <TableCell className="font-mono text-white">
                    {order.symbol}
                  </TableCell>
                  <TableCell className="font-mono uppercase text-white/80">
                    {order.side}
                  </TableCell>
                  <TableCell className="font-mono text-white/60">
                    {order.type}
                  </TableCell>
                  <TableCell className="font-mono text-white/80">
                    {formatQty(order.filledQty ?? order.qty)}
                  </TableCell>
                  <TableCell className="font-mono text-white/80">
                    {order.filledAvgPrice != null
                      ? formatUsd(order.filledAvgPrice)
                      : formatUsd(order.limitPrice)}
                  </TableCell>
                  <TableCell className="px-5">
                    <Badge
                      variant={statusVariant(order.status)}
                      className="rounded-full font-mono text-[10px] uppercase"
                    >
                      {order.status}
                    </Badge>
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
