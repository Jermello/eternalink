"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import {
  deletePhotoAction,
  updateMemorialAction,
  uploadPhotoAction,
  type ActionResult,
} from "@/lib/actions";
import type { MemorialWithPhotos } from "@/lib/queries";

type Props = {
  memorial: MemorialWithPhotos;
  publicUrl: string;
};

const initialState: ActionResult | null = null;

/**
 * The token-gated edit experience. Three independent forms (text fields,
 * photo upload, photo delete) wired up via `useActionState` so each shows
 * its own pending/error state without blocking the others.
 */
export function EditForm({ memorial, publicUrl }: Props) {
  const [updateState, updateAction, updatePending] = useActionState(
    async (_prev: ActionResult | null, fd: FormData) => updateMemorialAction(fd),
    initialState
  );
  const [uploadState, uploadAction, uploadPending] = useActionState(
    async (_prev: ActionResult | null, fd: FormData) => uploadPhotoAction(fd),
    initialState
  );
  const fileFormRef = useRef<HTMLFormElement>(null);

  // Reset the file input after a successful upload so the user can pick another.
  useEffect(() => {
    if (uploadState?.ok && !uploadPending) {
      fileFormRef.current?.reset();
    }
  }, [uploadState, uploadPending]);

  return (
    <div className="space-y-12">
      {/* Public link banner */}
      <section className="rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
              Public memorial
            </p>
            <p className="mt-1 font-serif text-lg">
              {memorial.is_published ? "Published" : "Not yet published"}
            </p>
          </div>
          <div className="text-sm">
            {memorial.is_published ? (
              <Link
                href={`/m/${memorial.slug}`}
                className="text-[color:var(--color-accent)] underline underline-offset-4"
              >
                View memorial →
              </Link>
            ) : (
              <span className="text-[color:var(--color-ink-soft)]">
                Ask the administrator to publish.
              </span>
            )}
          </div>
        </div>
        <p className="mt-3 break-all text-xs text-[color:var(--color-ink-soft)]">
          {publicUrl}
        </p>
      </section>

      {/* Details form */}
      <form action={updateAction} className="space-y-5">
        <input type="hidden" name="token" value={memorial.family_token} />

        <ReadOnlyHebrewName value={memorial.hebrew_name} />
        <Field
          label="Civil name"
          name="civil_name"
          defaultValue={memorial.civil_name}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Date of passing"
            name="death_date"
            type="date"
            defaultValue={memorial.death_date ?? ""}
          />
          <Field
            label="Hebrew date"
            name="hebrew_death_date"
            defaultValue={memorial.hebrew_death_date}
            dir="rtl"
            lang="he"
            fontHebrew
          />
        </div>

        <label className="block">
          <span className="block text-sm text-[color:var(--color-ink-soft)]">
            Biography
          </span>
          <textarea
            name="biography"
            rows={8}
            defaultValue={memorial.biography}
            className="mt-1 w-full rounded-md border border-[color:var(--color-line)] bg-white p-3 text-base leading-relaxed shadow-sm focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-accent)]"
            placeholder="A few paragraphs about your loved one — separate paragraphs with a blank line."
          />
        </label>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={updatePending}
            className="inline-flex h-10 items-center rounded-full bg-[color:var(--color-ink)] px-5 text-sm font-medium text-white transition hover:bg-[color:var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {updatePending ? "Saving…" : "Save changes"}
          </button>
          {updateState?.ok ? (
            <span className="text-sm text-emerald-700">Saved.</span>
          ) : updateState && !updateState.ok ? (
            <span className="text-sm text-red-700">{updateState.error}</span>
          ) : null}
        </div>
      </form>

      {/* Photos */}
      <section className="space-y-5">
        <header>
          <h2 className="font-serif text-xl">Photos</h2>
          <p className="text-sm text-[color:var(--color-ink-soft)]">
            Add photos one at a time. Up to 10 MB per image.
          </p>
        </header>

        <form
          ref={fileFormRef}
          action={uploadAction}
          className="flex flex-col gap-3 rounded-lg border border-dashed border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4 sm:flex-row sm:items-center"
        >
          <input type="hidden" name="token" value={memorial.family_token} />
          <input
            type="file"
            name="file"
            accept="image/*"
            required
            className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-[color:var(--color-accent-soft)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[color:var(--color-accent)] hover:file:bg-[color:var(--color-line)]"
          />
          <button
            type="submit"
            disabled={uploadPending}
            className="inline-flex h-10 shrink-0 items-center rounded-full border border-[color:var(--color-ink)] px-5 text-sm font-medium text-[color:var(--color-ink)] transition hover:bg-[color:var(--color-ink)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploadPending ? "Uploading…" : "Upload photo"}
          </button>
        </form>
        {uploadState && !uploadState.ok ? (
          <p className="text-sm text-red-700">{uploadState.error}</p>
        ) : null}

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
            No photos yet.
          </p>
        )}
      </section>
    </div>
  );
}

function DeletePhotoButton({
  token,
  photoId,
}: {
  token: string;
  photoId: string;
}) {
  const [, action, pending] = useActionState(
    async (_prev: ActionResult | null, fd: FormData) => deletePhotoAction(fd),
    initialState
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
        {pending ? "Removing…" : "Remove"}
      </button>
    </form>
  );
}

function ReadOnlyHebrewName({ value }: { value: string }) {
  return (
    <div>
      <span className="block text-sm text-[color:var(--color-ink-soft)]">
        Hebrew name
      </span>
      <div
        dir="rtl"
        lang="he"
        className="mt-1 flex min-h-[3rem] w-full items-center rounded-md border border-[color:var(--color-line)] bg-[color:var(--color-accent-soft)]/40 p-3 font-serif text-lg text-[color:var(--color-ink)]"
      >
        {value || (
          <span className="text-sm text-[color:var(--color-muted)]" dir="ltr">
            Not set yet — please contact us.
          </span>
        )}
      </div>
      <span className="mt-1 block text-xs text-[color:var(--color-muted)]">
        The Hebrew name determines the Psalm 119 reading. To correct it,
        please contact us — we verify the spelling carefully before changing
        it.
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
