import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * EternaLink uses two Supabase clients:
 *
 *  - `getPublicSupabase()` uses the anon key. Subject to RLS, used for read-only
 *    public consumption (e.g. fetching a published memorial by slug from a
 *    Server Component). Safe in the browser.
 *
 *  - `getServiceSupabase()` uses the service-role key. Bypasses RLS, used on the
 *    server for trusted writes (admin dashboard, family edits gated by an
 *    unguessable token). Never import this from a client component.
 *
 * Both helpers return `null` instead of throwing when the corresponding env
 * vars are missing. Callers should detect this and render a friendly setup
 * message — see `isSupabaseConfigured()`.
 */

// Supabase migrated to a new key naming scheme:
//   - "Publishable key" (sb_publishable_...) replaces the legacy anon key.
//   - "Secret key"      (sb_secret_...)      replaces the legacy service_role.
// We prefer the new names but fall back to the legacy ones so existing
// deployments keep working until they rotate keys.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

export const STORAGE_BUCKET = "memorial-photos";

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

export function isServiceRoleConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SECRET_KEY);
}

let _public: SupabaseClient | null | undefined;
let _service: SupabaseClient | null | undefined;

export function getPublicSupabase(): SupabaseClient | null {
  if (_public !== undefined) return _public;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    _public = null;
    return null;
  }
  _public = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _public;
}

export function getServiceSupabase(): SupabaseClient | null {
  if (_service !== undefined) return _service;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    _service = null;
    return null;
  }
  _service = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _service;
}

// ───────────────────────────────────────────────────────────────────
// Domain types — mirror the SQL schema from SUPABASE_SETUP.md.
// ───────────────────────────────────────────────────────────────────

export type Memorial = {
  id: string;
  slug: string;
  hebrew_name: string;
  civil_name: string;
  biography: string;
  death_date: string | null;
  hebrew_death_date: string;
  family_token: string;
  is_published: boolean;
  created_at: string;
};

export type Photo = {
  id: string;
  memorial_id: string;
  image_url: string;
  position: number;
  created_at: string;
};
