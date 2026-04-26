import crypto from "node:crypto";

/**
 * Slugify a name into a URL-safe identifier and append a short random suffix
 * so collisions are vanishingly unlikely without a DB round-trip. Strips
 * Hebrew niqqud, normalises Unicode, and falls back to `memorial` if the
 * input collapses to nothing.
 */
export function generateSlug(name: string): string {
  const base = (name || "")
    .normalize("NFKD")
    .replace(/[\u0591-\u05C7]/g, "") // Hebrew niqqud / cantillation marks
    .replace(/[\u0300-\u036f]/g, "") // Latin diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF]+/g, "-")
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
 * null/undefined/invalid input.
 */
export function formatCivilDate(input: string | null | undefined): string {
  if (!input) return "";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
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
