import { OPD_HOST, OPD_PATH } from "@/lib/constants";

export function hostnameFromHostHeader(
  host: string | null | undefined,
): string {
  const raw = host?.trim().toLowerCase() ?? "";
  if (!raw) {
    return "";
  }
  return raw.split(":")[0] ?? "";
}

export function isOptionsHost(host: string | null | undefined): boolean {
  return hostnameFromHostHeader(host) === OPD_HOST;
}

export function isOptionsPath(pathname: string | null | undefined): boolean {
  const path = pathname?.trim() ?? "";
  return path === OPD_PATH || path.startsWith(`${OPD_PATH}/`);
}

export function isOpdDeskRequest(
  host: string | null | undefined,
  pathname: string | null | undefined,
): boolean {
  return isOptionsHost(host) || isOptionsPath(pathname);
}

export function isAllowedOptionsHostPath(
  pathname: string | null | undefined,
): boolean {
  const path = pathname?.trim() ?? "";
  return (
    path === "/" ||
    path === "" ||
    path === "/robots.txt" ||
    path === OPD_PATH ||
    path.startsWith(`${OPD_PATH}/`) ||
    path === "/api/options" ||
    path.startsWith("/api/options/") ||
    path.startsWith("/_next/")
  );
}

export function isBotMarketBrokerApiPath(
  pathname: string | null | undefined,
): boolean {
  const path = pathname?.trim() ?? "";
  return (
    path === "/api/account" ||
    path.startsWith("/api/account/") ||
    path === "/api/positions" ||
    path.startsWith("/api/positions/") ||
    path === "/api/orders" ||
    path.startsWith("/api/orders/") ||
    path === "/api/portfolio/history" ||
    path.startsWith("/api/portfolio/history/") ||
    path === "/api/desk-feed" ||
    path.startsWith("/api/desk-feed/")
  );
}

export const OPTIONS_ROBOTS_TXT = "User-agent: *\nDisallow: /\n";

export const OPTIONS_ROBOTS_TAG = "noindex, nofollow";
