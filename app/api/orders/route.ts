import { handleRouteError, jsonPrivate, requireConfigured } from "@/lib/http";
import { loadOrders } from "@/lib/snapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const unconfigured = requireConfigured();
  if (unconfigured) {
    return unconfigured;
  }

  try {
    const since = new URL(request.url).searchParams.get("since");
    const orders = await loadOrders({
      sinceIso: since === null ? undefined : since,
    });
    return jsonPrivate({ configured: true, orders });
  } catch (error) {
    return handleRouteError(error);
  }
}
