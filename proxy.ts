import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ADMIN_COOKIE } from "@/lib/auth-shared";

/**
 * Proxy (formerly "middleware" in Next.js < 16). We use it for an
 * *optimistic* admin gate only: if the admin cookie is missing, redirect to
 * the login page before the admin route renders. The real cryptographic
 * verification happens inside the admin pages and server actions via
 * `requireAdmin()` — the proxy is just a fast pre-filter.
 *
 * The login page itself (`/admin/login`) is excluded so users can actually
 * reach it. The matcher also avoids `_next` and other Next internals.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  const hasCookie = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!hasCookie) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
