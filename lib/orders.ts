import archiveFile from "../data/archive/test-1-orders.json";
import { BLOTTER_LIMIT } from "@/lib/desk-feed-archive";
import { deskFeedCutoffMs } from "@/lib/desk-feed";
import type { OrderView } from "@/lib/types";

export { BLOTTER_LIMIT };

/** Alpaca `/v2/orders` max page size. Filter first, then take `BLOTTER_LIMIT`. */
export const ALPACA_ORDER_FETCH_LIMIT = 500;

export const ALPACA_ORDERS_PATH =
  `/v2/orders?status=all&limit=${ALPACA_ORDER_FETCH_LIMIT}&direction=desc&nested=true`;

/**
 * Created/submitted instant for cutoff checks.
 * `OrderView.submittedAt` is already `submitted_at ?? created_at`.
 */
export function orderTimestampMs(
  order: Pick<OrderView, "submittedAt">,
): number | null {
  const raw = order.submittedAt?.trim() ?? "";
  if (!raw) {
    return null;
  }
  const time = Date.parse(raw);
  return Number.isNaN(time) ? null : time;
}

/**
 * Live blotter rows are those at or after `DESK_START_ISO`.
 * Earlier tickets belong in a prior-test archive. Unset/invalid start keeps all.
 */
export function filterOrdersSince(
  orders: OrderView[],
  sinceIso: string | null | undefined = process.env.DESK_START_ISO,
): OrderView[] {
  const cutoff = deskFeedCutoffMs(sinceIso);
  if (cutoff == null) {
    return orders;
  }
  return orders.filter((order) => {
    const time = orderTimestampMs(order);
    return time != null && time >= cutoff;
  });
}

/**
 * Test 1 archive window: `[DESK_FUNDED_ISO, DESK_START_ISO)`.
 * Missing bounds skip that side of the clip. Invalid timestamps are dropped.
 */
export function filterTest1ArchiveOrders(
  orders: OrderView[],
  options?: {
    fundedIso?: string | null;
    startIso?: string | null;
  },
): OrderView[] {
  const fundedIso =
    options?.fundedIso === undefined
      ? process.env.DESK_FUNDED_ISO
      : options.fundedIso;
  const startIso =
    options?.startIso === undefined
      ? process.env.DESK_START_ISO
      : options.startIso;
  const funded = deskFeedCutoffMs(fundedIso);
  const start = deskFeedCutoffMs(startIso);
  return orders.filter((order) => {
    const time = orderTimestampMs(order);
    if (time == null) {
      return false;
    }
    if (funded != null && time < funded) {
      return false;
    }
    if (start != null && time >= start) {
      return false;
    }
    return true;
  });
}

export function takeRecentLiveOrders(
  orders: OrderView[],
  options?: {
    sinceIso?: string | null;
    limit?: number;
  },
): OrderView[] {
  const filtered = filterOrdersSince(orders, options?.sinceIso);
  const limit = options?.limit ?? BLOTTER_LIMIT;
  return filtered.slice(0, limit);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function optionalIso(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function parseOrderView(value: unknown): OrderView | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || !record.id.trim()) {
    return null;
  }
  if (typeof record.symbol !== "string" || !record.symbol.trim()) {
    return null;
  }
  if (typeof record.side !== "string" || !record.side.trim()) {
    return null;
  }
  if (typeof record.type !== "string" || !record.type.trim()) {
    return null;
  }
  if (typeof record.status !== "string" || !record.status.trim()) {
    return null;
  }

  return {
    id: record.id.trim(),
    submittedAt: optionalIso(record.submittedAt),
    filledAt: optionalIso(record.filledAt),
    symbol: record.symbol,
    side: record.side,
    type: record.type,
    qty: isFiniteNumber(record.qty) ? record.qty : null,
    filledQty: isFiniteNumber(record.filledQty) ? record.filledQty : null,
    limitPrice: isFiniteNumber(record.limitPrice) ? record.limitPrice : null,
    filledAvgPrice: isFiniteNumber(record.filledAvgPrice)
      ? record.filledAvgPrice
      : null,
    status: record.status,
  };
}

export function isOrdersArchive(
  data: unknown,
): data is { orders: unknown[] } {
  return Boolean(
    data &&
      typeof data === "object" &&
      Array.isArray((data as { orders?: unknown }).orders),
  );
}

export function hasTest1OrdersArchive(source: unknown = archiveFile): boolean {
  return isOrdersArchive(source);
}

export function loadArchivedTest1Orders(
  source: unknown = archiveFile,
): OrderView[] {
  if (!isOrdersArchive(source)) {
    return [];
  }
  const orders: OrderView[] = [];
  for (const item of source.orders) {
    const order = parseOrderView(item);
    if (order) {
      orders.push(order);
    }
  }
  return orders;
}
