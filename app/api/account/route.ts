import { handleRouteError, jsonPrivate, requireConfigured } from "@/lib/http";
import { loadAccount } from "@/lib/snapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const unconfigured = requireConfigured();
  if (unconfigured) {
    return unconfigured;
  }

  try {
    const payload = await loadAccount();
    return jsonPrivate(payload);
  } catch (error) {
    return handleRouteError(error);
  }
}
