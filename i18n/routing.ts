import { defineRouting } from "next-intl/routing";

/**
 * Locale routing config.
 *
 * - English: lingua franca, also default for unmatched paths.
 * - French: primary market for the operator.
 * - Hebrew: religious/cultural alignment, RTL.
 * - Yiddish: heritage language for many traditional families, RTL.
 *
 * `localePrefix: "always"` means every URL is prefixed: /en, /fr, /he, /yi.
 * That gives us deterministic URLs (good SEO + shareable links) at the cost
 * of one redirect from `/` to `/en` on first visit. The middleware handles
 * that automatically.
 */
export const routing = defineRouting({
  locales: ["en", "fr", "he", "yi"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];

/** RTL languages in our supported set. Used for `dir="rtl"` on <html>. */
export const RTL_LOCALES: ReadonlySet<Locale> = new Set(["he", "yi"]);

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.has(locale);
}

/** Human-readable locale labels for the language switcher. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  he: "עברית",
  yi: "ייִדיש",
};
