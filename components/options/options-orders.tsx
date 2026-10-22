import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GlassBody, GlassHeader, GlassPanel } from "@/components/desk/glass-panel";
import { formatEtStamp, formatQty, formatUsd } from "@/lib/format";
import { isWorkingOrderStatus } from "@/lib/opd";
import type { OrderView } from "@/lib/types";

function statusVariant(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "filled") {
    return "default" as const;
  }
  if (
    normalized === "canceled" ||
    normalized === "rejected" ||
    normalized === "expired"
  ) {
    return "destructive" as const;
  }
  return "secondary" as const;
}

function OrderTable({ orders }: { orders: OrderView[] }) {
  return (
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
              {formatEtStamp(order.filledAt ?? order.submittedAt)}
            </TableCell>
            <TableCell className="font-mono text-white">{order.symbol}</TableCell>
            <TableCell className="font-mono uppercase text-white/80">
              {order.side}
            </TableCell>
            <TableCell className="font-mono text-white/60">{order.type}</TableCell>
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
  );
}

export function OptionsOrders({
  orders,
  workingHidden,
}: {
  orders: OrderView[];
  workingHidden: boolean;
}) {
  const filled = orders.filter((order) => !isWorkingOrderStatus(order.status));
  const working = orders.filter((order) => isWorkingOrderStatus(order.status));

  return (
    <GlassPanel>
      <GlassHeader
        title="Filled orders"
        description={
          workingHidden
            ? "Filled tickets only until the 4:00 PM ET close. Working orders stay off this public desk until then."
            : "Filled history, plus working tickets after the 4:00 PM ET close."
        }
      />
      <GlassBody className="px-0">
        {filled.length === 0 ? (
          <p className="px-5 pb-2 text-sm text-white/40">
            No filled orders from Alpaca Paper yet.
          </p>
        ) : (
          <OrderTable orders={filled} />
        )}
        {workingHidden ? (
          <p className="border-t border-white/6 px-5 py-3 text-xs text-white/40">
            Working and unfilled tickets are hidden until after 4:00 PM ET.
          </p>
        ) : working.length > 0 ? (
          <div className="border-t border-white/6 pt-3">
            <p className="px-5 pb-2 font-mono text-[10px] tracking-[0.18em] text-white/35 uppercase">
              Working after close
            </p>
            <OrderTable orders={working} />
          </div>
        ) : (
          <p className="border-t border-white/6 px-5 py-3 text-xs text-white/40">
            No working tickets after the 4:00 PM ET close.
          </p>
        )}
      </GlassBody>
    </GlassPanel>
  );
}
