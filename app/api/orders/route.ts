import { handleRouteError, jsonPrivate, requireConfigured } from "@/lib/http";
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
    return jsonPrivate({ configured: true, orders });
  } catch (error) {
    return handleRouteError(error);
  }
}
