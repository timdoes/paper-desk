import { NextResponse } from "next/server";
import { handleRouteError, requireConfigured } from "@/lib/http";
import { loadPositions } from "@/lib/snapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const unconfigured = requireConfigured();
  if (unconfigured) {
    return unconfigured;
  }

  try {
    const positions = await loadPositions();
    return NextResponse.json({ configured: true, positions });
  } catch (error) {
    return handleRouteError(error);
  }
}
