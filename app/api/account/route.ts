import { NextResponse } from "next/server";
import { handleRouteError, requireConfigured } from "@/lib/http";
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
    return NextResponse.json(payload);
  } catch (error) {
    return handleRouteError(error);
  }
}
