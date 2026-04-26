import "server-only";

import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_COOKIE } from "./auth-shared";

export { ADMIN_COOKIE };

/**
 * Single-operator admin auth.
 *
 * The threat model is small: one administrator (the operator) needs to be
 * distinguished from the public. We therefore avoid a full auth system and
 * use a single shared password from the env, validated server-side, plus a
 * signed session cookie.
 *
 * Cookie format:  `<expiresAt>.<hmac>`
 *   - expiresAt: ms-since-epoch the session expires.
 *   - hmac     : HMAC-SHA256(secret, expiresAt + "|admin")
 *
 * The cookie is httpOnly + sameSite=lax + secure (in production), so it can't
 * be read by JS, sent on cross-site requests is restricted, and only flows
 * over HTTPS in production.
 */

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

function getSecret(): string | null {
  // Re-use the admin password as the HMAC key. Rotating the password
  // invalidates all existing sessions, which is the desired behaviour.
  return process.env.ADMIN_PASSWORD ?? null;
}

export function isAdminAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Validate the user-submitted password against `ADMIN_PASSWORD`. Constant-
 * time compare to avoid leaking the password length / prefix via timing.
 */
export function verifyPassword(input: string): boolean {
  const secret = getSecret();
  if (!secret || !input) return false;
  return safeEqual(input, secret);
}

export function buildSessionValue(now: number = Date.now()): string | null {
  const secret = getSecret();
  if (!secret) return null;
  const expiresAt = now + SESSION_TTL_MS;
  // Mix in a random nonce so two sessions issued in the same ms differ
  // (purely cosmetic — defense in depth against "predictable cookie" worries).
  const nonce = randomBytes(8).toString("hex");
  const payload = `${expiresAt}.${nonce}`;
  const mac = sign(`${payload}|admin`, secret);
  return `${payload}.${mac}`;
}

function parseAndVerify(value: string | undefined): boolean {
  if (!value) return false;
  const secret = getSecret();
  if (!secret) return false;

  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [expiresAtStr, nonce, mac] = parts;
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const expected = sign(`${expiresAtStr}.${nonce}|admin`, secret);
  return safeEqual(mac, expected);
}

/**
 * Read the session cookie and return whether it is currently valid. Use this
 * inside admin pages / server actions for the *real* auth check (defense in
 * depth — `proxy.ts` only does an optimistic presence check).
 */
export async function isAdminSession(): Promise<boolean> {
  const jar = await cookies();
  return parseAndVerify(jar.get(ADMIN_COOKIE)?.value);
}

/**
 * Server-component / server-action helper: redirect to /admin/login unless
 * the current request carries a valid admin session. Throws via redirect()
 * so callers can use it as the first line of a page.
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdminSession())) {
    redirect("/admin/login");
  }
}
