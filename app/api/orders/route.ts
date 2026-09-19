import { NextResponse } from "next/server";
import { handleRouteError, jsonUnconfigured, requireConfigured } from "@/lib/http";
import { OrderValidationError, RiskBlockError, placePaperOrder } from "@/lib/orders";
import { loadOrders } from "@/lib/snapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const unconfigured = requireConfigured();
  if (unconfigured) {
    return unconfigured;
  }

  try {
    const orders = await loadOrders();
    return NextResponse.json({ configured: true, orders });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  const unconfigured = requireConfigured();
  if (unconfigured) {
    return jsonUnconfigured();
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { configured: true, error: "Order body must be valid JSON." },
        { status: 400 },
      );
    }
    const result = await placePaperOrder(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return NextResponse.json(
        { configured: true, error: error.message },
        { status: error.status },
      );
    }
    if (error instanceof RiskBlockError) {
      return NextResponse.json(
        {
          configured: true,
          paper: true,
          error: error.message,
          code: error.code,
        },
        { status: error.status },
      );
    }
    return handleRouteError(error);
  }
}
