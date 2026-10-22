import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { OPD_PATH, OPD_REQUEST_DESK_HEADER } from "@/lib/constants";
import {
  OPTIONS_ROBOTS_TAG,
  OPTIONS_ROBOTS_TXT,
  isAllowedOptionsHostPath,
  isBotMarketBrokerApiPath,
  isOpdDeskRequest,
  isOptionsHost,
} from "@/lib/opd-host";

function withOpdRequestHeaders(request: NextRequest, markDesk: boolean) {
  const requestHeaders = new Headers(request.headers);
  if (markDesk) {
    requestHeaders.set(OPD_REQUEST_DESK_HEADER, "1");
  }
  return requestHeaders;
}

function applyOptionsHostHeaders(response: NextResponse) {
  response.headers.set("X-Robots-Tag", OPTIONS_ROBOTS_TAG);
  return response;
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  const pathname = request.nextUrl.pathname;
  const optionsHost = isOptionsHost(host);
  const optionsDesk = isOpdDeskRequest(host, pathname);
  const requestHeaders = withOpdRequestHeaders(request, optionsDesk);

  if (optionsHost && pathname === "/robots.txt") {
    return new NextResponse(OPTIONS_ROBOTS_TXT, {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "X-Robots-Tag": OPTIONS_ROBOTS_TAG,
        "cache-control": "public, max-age=300",
      },
    });
  }

  if (
    optionsHost &&
    (isBotMarketBrokerApiPath(pathname) || !isAllowedOptionsHostPath(pathname))
  ) {
    return applyOptionsHostHeaders(
      new NextResponse(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: {
          "content-type": "application/json",
        },
      }),
    );
  }

  if (optionsHost && (pathname === "/" || pathname === "")) {
    const url = request.nextUrl.clone();
    url.pathname = OPD_PATH;
    return applyOptionsHostHeaders(
      NextResponse.rewrite(url, {
        request: { headers: requestHeaders },
      }),
    );
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  if (optionsHost) {
    applyOptionsHostHeaders(response);
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)",
  ],
};
