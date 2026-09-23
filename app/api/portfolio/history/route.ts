import { handleRouteError, jsonPrivate, requireConfigured } from "@/lib/http";
import { loadHistory } from "@/lib/snapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const unconfigured = requireConfigured();
  if (unconfigured) {
    return unconfigured;
  }

  try {
    const history = await loadHistory();
    return jsonPrivate({ configured: true, history });
  } catch (error) {
    return handleRouteError(error);
  }
}
