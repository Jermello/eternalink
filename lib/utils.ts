import crypto from "node:crypto";

/**
 * Simplified Hebrew → Latin transliteration map. Used as a fallback when
 * a memorial only has a Hebrew name and we still want a readable, ASCII
 * URL slug instead of percent-encoded Hebrew. We follow common informal
 * conventions (e.g. ע is silent, צ → tz, ש → sh) — not academic, but
 * recognisable to a French/English reader scanning a URL. Final-form
 * letters map to their normal-form transliteration.
 */
const HEBREW_TO_LATIN: Record<string, string> = {
  "א": "a", "ב": "b", "ג": "g", "ד": "d", "ה": "h",
  "ו": "v", "ז": "z", "ח": "ch", "ט": "t", "י": "y",
  "כ": "k", "ך": "k",
  "ל": "l",
  "מ": "m", "ם": "m",
  "נ": "n", "ן": "n",
  "ס": "s", "ע": "",
  "פ": "p", "ף": "p",
  "צ": "tz", "ץ": "tz",
  "ק": "k", "ר": "r", "ש": "sh", "ת": "t",
};

export function transliterateHebrew(input: string): string {
  if (!input) return "";
  // Strip niqqud / te'amim before mapping so a vowelled name still maps cleanly.
  const stripped = input.normalize("NFKD").replace(/[\u0591-\u05C7]/g, "");
  let out = "";
  for (const ch of stripped) {
    if (ch in HEBREW_TO_LATIN) {
      out += HEBREW_TO_LATIN[ch];
    } else if (/\s/.test(ch)) {
      out += " ";
    }
  }
  return out;
}

/**
 * Slugify a name into a URL-safe identifier and append a short random suffix
 * so collisions are vanishingly unlikely without a DB round-trip.
 *
 * Two-stage: the caller can pass either a Latin name or a Hebrew name. We
 * detect Hebrew-only input and transliterate it to Latin so the resulting
 * slug stays ASCII (clean URLs, friendly when shared via SMS/WhatsApp/
 * email). Non-Latin Unicode that isn't Hebrew (Arabic, CJK, emoji…) falls
 * through to the random-only fallback.
 */
export function generateSlug(name: string): string {
  const trimmed = (name || "").trim();
  // Decide what to feed the slugifier: if the name has no Latin letters
  // but does have Hebrew, transliterate it; otherwise use it as-is.
  const hasLatin = /[a-zA-Z]/.test(trimmed);
  const hasHebrew = /[\u0590-\u05FF]/.test(trimmed);
  const sluggable =
    hasLatin || !hasHebrew ? trimmed : transliterateHebrew(trimmed);

  const base = sluggable
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  const suffix = crypto.randomBytes(3).toString("hex"); // 6 chars
  return base ? `${base}-${suffix}` : `memorial-${suffix}`;
}

/**
 * Cryptographically random URL-safe token. Used as the family edit secret —
 * acts as a bearer credential, so it must be unguessable.
 */
export function generateFamilyToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

/**
 * Format a civil date for display (e.g. "12 Mar 2024"). Tolerant of
 * null/undefined/invalid input. The optional `locale` parameter controls
 * formatting — defaults to `en-GB` for backward compatibility, and we map
 * our app locales to BCP-47 tags that the Intl API understands.
 *
 * Note: Yiddish (`yi`) doesn't have broad ICU coverage; we fall back to
 * Hebrew (`he`) for date formatting since that's the closest locale with
 * appropriate Hebrew-month presentation when applicable.
 */
const LOCALE_TO_BCP47: Record<string, string> = {
  en: "en-GB",
  fr: "fr-FR",
  he: "he-IL",
  yi: "he-IL", // closest available; Intl has no full yi-* support
};

export function formatCivilDate(
  input: string | null | undefined,
  locale: string = "en"
): string {
  if (!input) return "";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const bcp47 = LOCALE_TO_BCP47[locale] ?? "en-GB";
  return d.toLocaleDateString(bcp47, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Resolve the public site origin. Prefers `NEXT_PUBLIC_SITE_URL`; falls back
 * to Vercel's `VERCEL_URL`; otherwise localhost.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
