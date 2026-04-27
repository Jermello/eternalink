import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ADMIN_COOKIE } from "@/lib/auth-shared";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

/**
 * Proxy (formerly "middleware" in Next.js < 16). Two responsibilities:
 *
 * 1. **i18n routing** — delegate to next-intl so every URL is prefixed with a
 *    supported locale (`/en`, `/fr`, `/he`, `/yi`). Also handles redirects
 *    from `/` to the user's preferred locale.
 *
 * 2. **Admin gate** — *optimistic* check: if the admin cookie is missing,
 *    redirect to `/<locale>/admin/login` before the admin route renders. The
 *    real cryptographic verification still happens inside the admin pages
 *    and server actions via `requireAdmin()`. The proxy is just a fast
 *    pre-filter.
 *
 * The matcher excludes Next internals and the `/api` namespace so e.g. the
 * QR-code endpoint stays locale-agnostic.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Locale-aware admin gate. We check the path *before* deferring to the
  // intl middleware because we want to preserve the locale prefix when
  // redirecting to /<locale>/admin/login.
  const adminMatch = pathname.match(/^\/([a-z]{2})\/admin(\/|$)/);
  if (adminMatch) {
    const locale = adminMatch[1];
    const isLoginPage = pathname.startsWith(`/${locale}/admin/login`);
    if (!isLoginPage) {
      const hasCookie = request.cookies.get(ADMIN_COOKIE)?.value;
      if (!hasCookie) {
        const loginUrl = new URL(`/${locale}/admin/login`, request.url);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  return intlMiddleware(request);
}

export const config = {
  // Match everything except API routes, Next internals, and static files.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
