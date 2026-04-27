import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { routing } from "./routing";

/**
 * Server-side message resolver. Called on every request before rendering a
 * Server Component. Falls back to the default locale if the requested one
 * isn't supported (defensive — shouldn't happen with our middleware in
 * place, but keeps SSR safe if someone hits a malformed URL).
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
