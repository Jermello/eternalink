"use client";

import { useTranslations } from "next-intl";
import { useActionState, useRef, useState } from "react";

import { Link } from "@/i18n/navigation";

import {
  deletePhotoAction,
  saveMemorialAction,
  type ActionResult,
  type SaveResult,
} from "@/lib/actions";
import type { MemorialWithPhotos } from "@/lib/queries";

type Props = {
  memorial: MemorialWithPhotos;
  publicUrl: string;
  /**
   * When true, the form is being rendered for an authenticated admin who
   * arrived via the dashboard. Unlocks the Hebrew name field. The server
   * action also re-checks the admin session before persisting `hebrew_name`,
   * so this prop is purely a UX hint — it cannot grant privileges by itself.
   */
  isAdmin?: boolean;
};

const initialSave: SaveResult | null = null;
const initialDelete: ActionResult | null = null;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

/**
 * Token-gated edit experience. Single form for text + new photos with one
 * "Save changes" button at the bottom. Photo deletion stays inline as a
 * separate action because it is destructive and immediate.
 */
export function EditForm({ memorial, publicUrl, isAdmin = false }: Props) {
  const t = useTranslations("family");
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [stagedError, setStagedError] = useState<string | null>(null);

  // The action wrapper runs inside a React transition (via useActionState),
  // so setState calls here are batched and don't trigger the
  // "setState in useEffect" cascade-render warning. Doing the post-success
  // reset here also keeps the dataflow linear: submit → server → reset.
  const [saveState, saveAction, savePending] = useActionState(
    async (_prev: SaveResult | null, fd: FormData) => {
      const result = await saveMemorialAction(fd);
      if (result.ok) {
        if (fileInputRef.current) fileInputRef.current.value = "";
        setStagedFiles([]);
        setStagedError(null);
      }
      return result;
    },
    initialSave
  );

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const tooBig = files.find((f) => f.size > MAX_PHOTO_BYTES);
    if (tooBig) {
      setStagedError(
        t("photo_too_large", {
          name: tooBig.name,
          size: formatMb(tooBig.size),
        })
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      setStagedFiles([]);
      return;
    }
    setStagedError(null);
    setStagedFiles(files);
  }

  return (
    <div className="space-y-12">
      <PublishBanner memorial={memorial} publicUrl={publicUrl} />

      <form ref={formRef} action={saveAction} className="space-y-7">
        <input type="hidden" name="token" value={memorial.family_token} />

        {/* Identity */}
        <fieldset className="space-y-5">
          <legend className="font-serif text-xl">
            {t("section_identity")}
          </legend>

          {isAdmin ? (
            <Field
              label={t("field_hebrew_name_admin")}
              name="hebrew_name"
              defaultValue={memorial.hebrew_name}
              dir="rtl"
              lang="he"
              fontHebrew
              help={t("field_hebrew_name_help")}
            />
          ) : (
            <ReadOnlyHebrewName value={memorial.hebrew_name} />
          )}
          <Field
            label={t("field_civil_name")}
            name="civil_name"
            defaultValue={memorial.civil_name}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label={t("field_death_date")}
              name="death_date"
              type="date"
              defaultValue={memorial.death_date ?? ""}
            />
            <Field
              label={t("field_hebrew_death_date")}
              name="hebrew_death_date"
              defaultValue={memorial.hebrew_death_date}
              dir="rtl"
              lang="he"
              fontHebrew
            />
          </div>
        </fieldset>

        {/* Biography */}
        <fieldset className="space-y-3">
          <legend className="font-serif text-xl">
            {t("section_biography")}
          </legend>
          <textarea
            name="biography"
            rows={8}
            defaultValue={memorial.biography}
            className="w-full rounded-md border border-[color:var(--color-line)] bg-white p-3 text-base leading-relaxed shadow-sm focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-accent)]"
            placeholder={t("biography_placeholder")}
          />
        </fieldset>

        {/* New photos */}
        <fieldset className="space-y-3">
          <legend className="font-serif text-xl">
            {t("section_add_photos")}
          </legend>
          <p className="text-sm text-[color:var(--color-ink-soft)]">
            {t("photos_help")}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            name="photos"
            accept="image/*"
            multiple
            onChange={handleFilesChange}
            className="block w-full rounded-md border border-dashed border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-3 text-sm file:me-3 file:rounded-full file:border-0 file:bg-[color:var(--color-accent-soft)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[color:var(--color-accent)] hover:file:bg-[color:var(--color-line)]"
          />
          {stagedError ? (
            <p className="text-sm text-red-700">{stagedError}</p>
          ) : stagedFiles.length > 0 ? (
            <p className="text-sm text-[color:var(--color-ink-soft)]">
              {stagedFiles.length === 1
                ? t("photos_ready_one", {
                    size: formatMb(stagedFiles[0].size),
                  })
                : t("photos_ready_many", {
                    count: stagedFiles.length,
                    size: formatMb(
                      stagedFiles.reduce((s, f) => s + f.size, 0)
                    ),
                  })}
            </p>
          ) : null}
        </fieldset>

        {/* Submit */}
        <div className="flex flex-wrap items-center gap-4 border-t border-[color:var(--color-line)] pt-6">
          <button
            type="submit"
            disabled={savePending || Boolean(stagedError)}
            className="inline-flex h-10 items-center rounded-full bg-[color:var(--color-ink)] px-5 text-sm font-medium text-white transition hover:bg-[color:var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savePending ? (
              <>
                <Spinner />
                {stagedFiles.length > 0 ? t("uploading") : t("saving")}
              </>
            ) : (
              t("save")
            )}
          </button>
          {savePending && stagedFiles.length > 0 ? (
            <span className="text-xs text-[color:var(--color-ink-soft)]">
              {t("uploading_warning")}
            </span>
          ) : saveState?.ok ? (
            <span className="text-sm text-emerald-700">
              {saveState.photosUploaded === 0
                ? t("saved_text_only")
                : saveState.photosUploaded === 1
                ? t("saved_with_photos_one")
                : t("saved_with_photos_many", {
                    count: saveState.photosUploaded,
                  })}
            </span>
          ) : saveState && !saveState.ok ? (
            <span className="text-sm text-red-700">{saveState.error}</span>
          ) : null}
        </div>
      </form>

      {/* Existing photos. Lives OUTSIDE the main form so each delete can be
          its own form (HTML disallows nested forms). */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl">{t("section_current_photos")}</h2>
        {memorial.photos.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {memorial.photos.map((photo) => (
              <li
                key={photo.id}
                className="group relative overflow-hidden rounded-lg ring-1 ring-[color:var(--color-line)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.image_url}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
                <DeletePhotoButton
                  token={memorial.family_token}
                  photoId={photo.id}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[color:var(--color-ink-soft)]">
            {t("no_photos")}
          </p>
        )}
      </section>
    </div>
  );
}

function PublishBanner({
  memorial,
  publicUrl,
}: {
  memorial: MemorialWithPhotos;
  publicUrl: string;
}) {
  const t = useTranslations("family");
  return (
    <section className="rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
            {t("publish_section_label")}
          </p>
          <p className="mt-1 font-serif text-lg">
            {memorial.is_published
              ? t("publish_published")
              : t("publish_unpublished")}
          </p>
        </div>
        <div className="text-sm">
          {memorial.is_published ? (
            <Link
              href={`/m/${memorial.slug}`}
              className="text-[color:var(--color-accent)] underline underline-offset-4"
            >
              {t("view_memorial")}
            </Link>
          ) : (
            <span className="text-[color:var(--color-ink-soft)]">
              {t("ask_admin_to_publish")}
            </span>
          )}
        </div>
      </div>
      <p className="mt-3 break-all text-xs text-[color:var(--color-ink-soft)]">
        {publicUrl}
      </p>
    </section>
  );
}

function DeletePhotoButton({
  token,
  photoId,
}: {
  token: string;
  photoId: string;
}) {
  const t = useTranslations("family");
  const [, action, pending] = useActionState(
    async (_prev: ActionResult | null, fd: FormData) => deletePhotoAction(fd),
    initialDelete
  );
  return (
    <form
      action={action}
      className="absolute inset-x-0 bottom-0 flex justify-end bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition group-hover:opacity-100"
    >
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="photo_id" value={photoId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-red-700 hover:bg-white"
      >
        {pending ? t("deleting_photo") : t("delete_photo")}
      </button>
    </form>
  );
}

function ReadOnlyHebrewName({ value }: { value: string }) {
  const t = useTranslations("family");
  return (
    <div>
      <span className="block text-sm text-[color:var(--color-ink-soft)]">
        {t("field_hebrew_name")}
      </span>
      <div
        dir="rtl"
        lang="he"
        className="mt-1 flex min-h-[3rem] w-full items-center rounded-md border border-[color:var(--color-line)] bg-[color:var(--color-accent-soft)]/40 p-3 font-serif text-lg text-[color:var(--color-ink)]"
      >
        {value || (
          <span className="text-sm text-[color:var(--color-muted)]" dir="ltr">
            {t("field_hebrew_name_empty")}
          </span>
        )}
      </div>
      <span className="mt-1 block text-xs text-[color:var(--color-muted)]">
        {t("field_hebrew_name_locked_help")}
      </span>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  dir,
  lang,
  fontHebrew,
  help,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  dir?: "ltr" | "rtl";
  lang?: string;
  fontHebrew?: boolean;
  help?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm text-[color:var(--color-ink-soft)]">
        {label}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        dir={dir}
        lang={lang}
        className={`mt-1 w-full rounded-md border border-[color:var(--color-line)] bg-white p-3 text-base shadow-sm focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-accent)] ${
          fontHebrew ? "font-serif" : ""
        }`}
      />
      {help ? (
        <span className="mt-1 block text-xs text-[color:var(--color-muted)]">
          {help}
        </span>
      ) : null}
    </label>
  );
}

function Spinner() {
  return (
    <svg
      className="me-2 h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function formatMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
