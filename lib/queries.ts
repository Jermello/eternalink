import "server-only";

import {
  getPublicSupabase,
  getServiceSupabase,
  type Memorial,
  type Photo,
} from "./supabase";

/**
 * Server-only query helpers. These centralise the read paths so pages stay
 * dumb. We use the *anon* client for public reads (RLS guarantees only
 * published memorials are returned) and the *service* client for trusted
 * lookups (admin list, family-token lookup that must work pre-publish).
 */

export type MemorialWithPhotos = Memorial & { photos: Photo[] };

export async function fetchPublishedMemorialBySlug(
  slug: string
): Promise<MemorialWithPhotos | null> {
  const sb = getPublicSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("memorials")
    .select("*, photos(*)")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error || !data) return null;

  const photos = (data.photos ?? []) as Photo[];
  photos.sort((a, b) => a.position - b.position);
  return { ...(data as Memorial), photos };
}

export async function fetchMemorialByToken(
  token: string
): Promise<MemorialWithPhotos | null> {
  const sb = getServiceSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("memorials")
    .select("*, photos(*)")
    .eq("family_token", token)
    .maybeSingle();

  if (error || !data) return null;

  const photos = (data.photos ?? []) as Photo[];
  photos.sort((a, b) => a.position - b.position);
  return { ...(data as Memorial), photos };
}

export async function fetchAllMemorials(): Promise<Memorial[]> {
  const sb = getServiceSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from("memorials")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as Memorial[];
}
