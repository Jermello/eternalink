"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import {
  ADMIN_COOKIE,
  buildSessionValue,
  isAdminSession,
  requireAdmin,
  verifyPassword,
} from "./auth";
import { type Gender, getServiceSupabase, STORAGE_BUCKET } from "./supabase";
import { generateFamilyToken, generateSlug } from "./utils";

/**
 * Coerce arbitrary form input into a valid `Gender`. We default to
 * "male" because that's the historical (pre-feature) value and matches
 * the DB default — a missing or unexpected payload should not silently
 * flip a record's gender.
 */
function parseGender(raw: FormDataEntryValue | null): Gender {
  return raw === "female" ? "female" : "male";
}

/**
 * Build a locale-prefixed href for use with `redirect()`. We compose this
 * helper rather than wrapping `redirect()` itself so TypeScript's control
 * flow correctly narrows after the call (a `Promise<never>` doesn't
 * propagate through `await` for narrowing purposes).
 */
async function localizedHref(href: string): Promise<string> {
  const locale = await getLocale();
  return `/${locale}${href}`;
}

/**
 * Server Actions for EternaLink. Every write goes through the service-role
 * client and is gated by a hard-to-guess `family_token` (or simply runs from
 * the admin page, which is currently open per MVP scope).
 *
 * Failures are returned as `{ ok: false, error }` so client forms can render
 * a message. The admin create flow throws on misconfig because there is no
 * sensible recovery — the admin page renders a friendly setup screen first.
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

function requireService() {
  const sb = getServiceSupabase();
  if (!sb) {
    throw new Error(
      "Supabase service role is not configured. See SUPABASE_SETUP.md."
    );
  }
  return sb;
}

// ───────────────────────────────────────────────────────────────────
// Admin auth
// ───────────────────────────────────────────────────────────────────

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const t = await getTranslations("login");
  const password = String(formData.get("password") ?? "");
  if (!verifyPassword(password)) {
    // Same message regardless of cause so we don't leak whether
    // ADMIN_PASSWORD is set.
    return { ok: false, error: t("incorrect_password") };
  }
  const value = buildSessionValue();
  if (!value) {
    return { ok: false, error: t("auth_misconfigured") };
  }
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14, // matches SESSION_TTL_MS in lib/auth.ts
  });
  redirect(await localizedHref("/admin"));
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  redirect(await localizedHref("/admin/login"));
}

// ───────────────────────────────────────────────────────────────────
// Admin
// ───────────────────────────────────────────────────────────────────

export async function createMemorialAction(formData: FormData) {
  await requireAdmin();
  const sb = requireService();

  const civilName = String(formData.get("civil_name") ?? "").trim();
  const hebrewName = String(formData.get("hebrew_name") ?? "").trim();
  const hebrewParentName = String(
    formData.get("hebrew_parent_name") ?? ""
  ).trim();
  const gender = parseGender(formData.get("gender"));
  // Death dates are optional at creation — the family can fill them
  // later from the edit link. `death_date` is a YYYY-MM-DD string from
  // <input type="date">; we coerce empty to null so Postgres stores
  // NULL instead of a malformed string.
  const deathDate = String(formData.get("death_date") ?? "").trim() || null;
  const hebrewDeathDate = String(
    formData.get("hebrew_death_date") ?? ""
  ).trim();

  if (!civilName && !hebrewName) {
    throw new Error("Provide at least a civil or Hebrew name.");
  }

  const slug = generateSlug(civilName || hebrewName);
  const family_token = generateFamilyToken();

  const { error } = await sb.from("memorials").insert({
    slug,
    civil_name: civilName,
    hebrew_name: hebrewName,
    hebrew_parent_name: hebrewParentName,
    gender,
    death_date: deathDate,
    hebrew_death_date: hebrewDeathDate,
    family_token,
    is_published: false,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  redirect(await localizedHref(`/admin?created=${family_token}`));
}

export async function regenerateTokenAction(formData: FormData) {
  await requireAdmin();
  const sb = requireService();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing memorial id.");

  const newToken = generateFamilyToken();
  const { error } = await sb
    .from("memorials")
    .update({ family_token: newToken })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  // Surface the new token via the same query param the create flow uses, so
  // the admin sees the fresh family-edit URL immediately.
  redirect(await localizedHref(`/admin?created=${newToken}`));
}

export async function deleteMemorialAction(formData: FormData) {
  await requireAdmin();
  const sb = requireService();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing memorial id.");

  // Pull everything we need before destroying anything: the slug for cache
  // revalidation, and the storage folder path (we use the memorial id as
  // the prefix, mirroring uploadPhotoAction).
  const { data: memorial, error: fetchErr } = await sb
    .from("memorials")
    .select("id, slug")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!memorial) throw new Error("Memorial not found.");

  // Best-effort storage cleanup: list every object under `<id>/` and remove.
  // We do this BEFORE the DB delete so a failed storage call doesn't strand
  // us with a dead row. If listing fails (e.g. transient), we still proceed
  // to delete the DB row — the operator can clean up orphan files manually.
  const { data: objects } = await sb.storage
    .from(STORAGE_BUCKET)
    .list(memorial.id, { limit: 1000 });

  if (objects && objects.length > 0) {
    const paths = objects.map((o) => `${memorial.id}/${o.name}`);
    await sb.storage.from(STORAGE_BUCKET).remove(paths);
  }

  // The `photos` table has ON DELETE CASCADE on memorial_id, so deleting the
  // memorial automatically deletes its photo rows.
  const { error: delErr } = await sb
    .from("memorials")
    .delete()
    .eq("id", id);
  if (delErr) throw new Error(delErr.message);

  revalidatePath("/admin");
  revalidatePath(`/m/${memorial.slug}`);
  redirect(await localizedHref("/admin?deleted=1"));
}

export async function togglePublishAction(formData: FormData) {
  await requireAdmin();
  const sb = requireService();
  const id = String(formData.get("id") ?? "");
  const next = formData.get("publish") === "true";

  if (!id) throw new Error("Missing memorial id.");

  const { data: memorial, error: fetchErr } = await sb
    .from("memorials")
    .select("slug")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);

  const { error } = await sb
    .from("memorials")
    .update({ is_published: next })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  if (memorial?.slug) revalidatePath(`/m/${memorial.slug}`);
}

// ───────────────────────────────────────────────────────────────────
// Family edit (token-gated)
// ───────────────────────────────────────────────────────────────────

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export type SaveResult =
  | { ok: true; photosUploaded: number }
  | { ok: false; error: string };

/**
 * Single save endpoint for the family/admin edit form: persists text fields
 * and uploads any new photos in one round-trip. We chose to merge "save text"
 * and "upload photo" because UX-wise the family expects one save button at
 * the bottom — splitting them confused users.
 */
export async function saveMemorialAction(
  formData: FormData
): Promise<SaveResult> {
  try {
    const sb = requireService();
    const token = String(formData.get("token") ?? "");
    if (!token) return { ok: false, error: "Missing token." };

    // `hebrew_name` is religiously significant (drives the Psalm 119 reading)
    // and is verified at intake. The family form hides the field; admins
    // editing the same form can update it — we gate that here.
    const isAdmin = await isAdminSession();
    const updates: Record<string, string | null> = {
      civil_name: String(formData.get("civil_name") ?? "").trim(),
      biography: String(formData.get("biography") ?? "").trim(),
      death_date: String(formData.get("death_date") ?? "").trim() || null,
      hebrew_death_date: String(
        formData.get("hebrew_death_date") ?? ""
      ).trim(),
    };
    if (isAdmin) {
      // Hebrew identity fields drive the Psalm 119 reading. Empty parent
      // is intentionally accepted (admin may need to clear it); empty
      // hebrew_name is rejected silently here so a typo can't wipe it.
      const hebrewName = String(formData.get("hebrew_name") ?? "").trim();
      if (hebrewName) updates.hebrew_name = hebrewName;
      updates.hebrew_parent_name = String(
        formData.get("hebrew_parent_name") ?? ""
      ).trim();
      // `gender` is admin-only — it's part of the religious record, not
      // a self-service field. Only update if the form actually sent it
      // (so partial payloads don't accidentally reset to "male").
      if (formData.has("gender")) {
        updates.gender = parseGender(formData.get("gender"));
      }
    }

    const { data: memorial, error: updateErr } = await sb
      .from("memorials")
      .update(updates)
      .eq("family_token", token)
      .select("id, slug")
      .maybeSingle();

    if (updateErr) return { ok: false, error: updateErr.message };
    if (!memorial) return { ok: false, error: "Invalid token." };

    // Collect any uploaded files. The form input is `multiple`, so we get an
    // array. Empty selections are silently skipped so saving "text-only"
    // works without users having to clear the file input.
    const rawFiles = formData.getAll("photos");
    const files = rawFiles.filter(
      (f): f is File => f instanceof File && f.size > 0
    );

    let uploaded = 0;
    if (files.length > 0) {
      // Validate up-front so we don't half-upload then fail.
      for (const file of files) {
        if (file.size > MAX_PHOTO_BYTES) {
          return {
            ok: false,
            error: `"${file.name}" is over 10 MB. Compress it and try again.`,
          };
        }
        if (!file.type.startsWith("image/")) {
          return { ok: false, error: `"${file.name}" is not an image.` };
        }
      }

      // Look up the current photo count once so positions stay sequential.
      const { count } = await sb
        .from("photos")
        .select("*", { count: "exact", head: true })
        .eq("memorial_id", memorial.id);
      let nextPos = count ?? 0;

      for (const file of files) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const safeExt = ext.replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
        const path = `${memorial.id}/${randomUUID()}.${safeExt}`;

        const buffer = Buffer.from(await file.arrayBuffer());
        const { error: uploadErr } = await sb.storage
          .from(STORAGE_BUCKET)
          .upload(path, buffer, {
            contentType: file.type,
            upsert: false,
          });
        if (uploadErr) return { ok: false, error: uploadErr.message };

        const { data: pub } = sb.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(path);

        const { error: insertErr } = await sb.from("photos").insert({
          memorial_id: memorial.id,
          image_url: pub.publicUrl,
          position: nextPos++,
        });
        if (insertErr) return { ok: false, error: insertErr.message };
        uploaded++;
      }
    }

    revalidatePath(`/family/${token}`);
    revalidatePath(`/m/${memorial.slug}`);
    return { ok: true, photosUploaded: uploaded };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: msg };
  }
}

// ───────────────────────────────────────────────────────────────────
// Banner / profile photo (single-image fields on the memorial row)
// ───────────────────────────────────────────────────────────────────

const BANNER_KINDS = ["cover", "profile"] as const;
type BannerKind = (typeof BANNER_KINDS)[number];
const BANNER_COLUMN: Record<BannerKind, "cover_photo_url" | "profile_photo_url"> = {
  cover: "cover_photo_url",
  profile: "profile_photo_url",
};

/**
 * Replace or remove the cover/profile photo of a memorial. Unlike the
 * gallery, these are single-image fields stored directly on the memorial
 * row, so we upload to a deterministic-but-unique path
 * (`<id>/<kind>-<timestamp>.jpg`) and rewrite the URL column. The previous
 * file is removed best-effort to keep storage tidy.
 */
export async function updateBannerAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const sb = requireService();
    const token = String(formData.get("token") ?? "");
    const kindRaw = String(formData.get("kind") ?? "");
    const remove = formData.get("remove") === "true";
    if (!token) return { ok: false, error: "Missing token." };
    if (!BANNER_KINDS.includes(kindRaw as BannerKind)) {
      return { ok: false, error: "Invalid banner kind." };
    }
    const kind = kindRaw as BannerKind;
    const column = BANNER_COLUMN[kind];

    const { data: memorial } = await sb
      .from("memorials")
      .select(`id, slug, ${column}`)
      .eq("family_token", token)
      .maybeSingle<{ id: string; slug: string } & Record<string, string>>();
    if (!memorial) return { ok: false, error: "Invalid token." };

    const previousUrl = memorial[column] ?? "";

    // Always best-effort clean up the previous object first so we don't
    // leave orphans in storage when the URL flips.
    async function removePrevious() {
      if (!previousUrl) return;
      const marker = `/object/public/${STORAGE_BUCKET}/`;
      const i = previousUrl.indexOf(marker);
      if (i < 0) return;
      const path = previousUrl.slice(i + marker.length);
      await sb.storage.from(STORAGE_BUCKET).remove([path]);
    }

    if (remove) {
      await removePrevious();
      const { error } = await sb
        .from("memorials")
        .update({ [column]: "" })
        .eq("id", memorial.id);
      if (error) return { ok: false, error: error.message };
      revalidatePath(`/family/${token}`);
      revalidatePath(`/m/${memorial.slug}`);
      return { ok: true };
    }

    // Replace flow.
    const file = formData.get("photo");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "No file provided." };
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return { ok: false, error: `File is over 10 MB.` };
    }
    if (!file.type.startsWith("image/")) {
      return { ok: false, error: "File is not an image." };
    }

    const ext = (file.name.split(".").pop() || "jpg")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 5) || "jpg";
    // Timestamp keeps each upload unique (cheap cache-bust) and prevents
    // colliding with the previous file before we delete it.
    const path = `${memorial.id}/${kind}-${Date.now()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadErr } = await sb.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });
    if (uploadErr) return { ok: false, error: uploadErr.message };

    const { data: pub } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(path);

    const { error: updateErr } = await sb
      .from("memorials")
      .update({ [column]: pub.publicUrl })
      .eq("id", memorial.id);
    if (updateErr) {
      // Try to roll back the storage upload so we don't strand the file.
      await sb.storage.from(STORAGE_BUCKET).remove([path]);
      return { ok: false, error: updateErr.message };
    }

    // Only remove the previous object after we've successfully committed
    // the new URL — avoids a window where the row points at a deleted file.
    await removePrevious();

    revalidatePath(`/family/${token}`);
    revalidatePath(`/m/${memorial.slug}`);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: msg };
  }
}

export async function deletePhotoAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const sb = requireService();
    const token = String(formData.get("token") ?? "");
    const photoId = String(formData.get("photo_id") ?? "");
    if (!token || !photoId) {
      return { ok: false, error: "Missing parameters." };
    }

    const { data: memorial } = await sb
      .from("memorials")
      .select("id, slug")
      .eq("family_token", token)
      .maybeSingle();
    if (!memorial) return { ok: false, error: "Invalid token." };

    const { data: photo } = await sb
      .from("photos")
      .select("image_url")
      .eq("id", photoId)
      .eq("memorial_id", memorial.id)
      .maybeSingle();
    if (!photo) return { ok: false, error: "Photo not found." };

    // Best-effort storage cleanup. We derive the storage path from the public
    // URL; if the URL shape ever changes, the DB row is still removed.
    const marker = `/object/public/${STORAGE_BUCKET}/`;
    const i = photo.image_url.indexOf(marker);
    if (i >= 0) {
      const path = photo.image_url.slice(i + marker.length);
      await sb.storage.from(STORAGE_BUCKET).remove([path]);
    }

    const { error: delErr } = await sb
      .from("photos")
      .delete()
      .eq("id", photoId);
    if (delErr) return { ok: false, error: delErr.message };

    revalidatePath(`/family/${token}`);
    revalidatePath(`/m/${memorial.slug}`);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: msg };
  }
}

/**
 * Reorder photos for a memorial. The client sends the desired order as a
 * JSON array of photo IDs (top-of-form). We map each ID to a 0-based
 * position, scoping every update to the memorial via the family token so
 * one family can't reorder another's photos.
 */
export async function reorderPhotosAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const sb = requireService();
    const token = String(formData.get("token") ?? "");
    const orderJson = String(formData.get("order") ?? "");
    if (!token || !orderJson) {
      return { ok: false, error: "Missing parameters." };
    }

    let ids: string[];
    try {
      const parsed = JSON.parse(orderJson);
      if (!Array.isArray(parsed)) throw new Error("not array");
      ids = parsed.map(String);
    } catch {
      return { ok: false, error: "Invalid order payload." };
    }

    const { data: memorial } = await sb
      .from("memorials")
      .select("id, slug")
      .eq("family_token", token)
      .maybeSingle();
    if (!memorial) return { ok: false, error: "Invalid token." };

    // Update each photo's position. We scope by memorial_id so a token can
    // only reorder its own photos — even if a malicious client smuggles
    // foreign IDs into the array, those rows won't match the eq().
    for (let i = 0; i < ids.length; i++) {
      const { error } = await sb
        .from("photos")
        .update({ position: i })
        .eq("id", ids[i])
        .eq("memorial_id", memorial.id);
      if (error) return { ok: false, error: error.message };
    }

    revalidatePath(`/family/${token}`);
    revalidatePath(`/m/${memorial.slug}`);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: msg };
  }
}
