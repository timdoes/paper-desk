import { alpacaFetch } from "@/lib/alpaca";
import { parseBrokerNumber } from "@/lib/format";
import { evaluateOrderRisk } from "@/lib/risk";
import { loadAccount, loadPositions } from "@/lib/snapshot";
import type {
  AlpacaOrder,
  OrderSide,
  OrderType,
  PlaceOrderBody,
} from "@/lib/types";

export class OrderValidationError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = "OrderValidationError";
  }
}

export class RiskBlockError extends Error {
  readonly status = 409;
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "RiskBlockError";
    this.code = code;
  }
}

function isOrderSide(value: string): value is OrderSide {
  return value === "buy" || value === "sell";
}

function isOrderType(value: string): value is OrderType {
  return value === "market" || value === "limit";
}

export function parsePlaceOrderBody(input: unknown): {
  symbol: string;
  qty: number;
  side: OrderSide;
  type: OrderType;
  limitPrice?: number;
  timeInForce: "day" | "gtc";
} {
  if (input == null || typeof input !== "object") {
    throw new OrderValidationError("Order body must be a JSON object.");
  }

  const body = input as PlaceOrderBody;
  const symbol = String(body.symbol ?? "")
    .trim()
    .toUpperCase();
  if (!symbol || !/^[A-Z.-]{1,10}$/.test(symbol)) {
    throw new OrderValidationError("Symbol is required.");
  }

  const qty = parseBrokerNumber(body.qty);
  if (qty == null || qty <= 0) {
    throw new OrderValidationError("Quantity must be a positive number.");
  }

  const side = String(body.side ?? "").toLowerCase();
  if (!isOrderSide(side)) {
    throw new OrderValidationError("Side must be buy or sell.");
  }

  const type = String(body.type ?? "").toLowerCase();
  if (!isOrderType(type)) {
    throw new OrderValidationError("Type must be market or limit.");
  }

  const timeInForce = body.time_in_force === "gtc" ? "gtc" : "day";
  let limitPrice: number | undefined;

  switch (type) {
    case "limit": {
      const parsed = parseBrokerNumber(body.limit_price);
      if (parsed == null || parsed <= 0) {
        throw new OrderValidationError(
          "Limit orders require a positive limit_price.",
        );
      }
      limitPrice = parsed;
      break;
    }
    case "market":
      break;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }

  return { symbol, qty, side, type, limitPrice, timeInForce };
}

export async function placePaperOrder(input: unknown) {
  const order = parsePlaceOrderBody(input);
  const positions = await loadPositions();
  const accountPayload = await loadAccount(positions);
  const decision = evaluateOrderRisk({
    side: order.side,
    type: order.type,
    symbol: order.symbol,
    qty: order.qty,
    limitPrice: order.limitPrice,
    equity: accountPayload.account.equity,
    lastEquity: accountPayload.account.lastEquity,
    positions,
  });

  if (!decision.allowed) {
    throw new RiskBlockError(decision.reason, decision.code);
  }

  const payload: Record<string, string> = {
    symbol: order.symbol,
    qty: String(order.qty),
    side: order.side,
    type: order.type,
    time_in_force: order.timeInForce,
  };

  if (order.type === "limit" && order.limitPrice != null) {
    payload.limit_price = String(order.limitPrice);
  }

  const submitted = await alpacaFetch<AlpacaOrder>("/v2/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return {
    configured: true as const,
    paper: true as const,
    risk: decision,
    order: submitted,
  };
}
