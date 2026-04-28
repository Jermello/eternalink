"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";

import { MemorialBanner } from "@/components/MemorialBanner";
import { updateBannerAction } from "@/lib/actions";
import { compressImage } from "@/lib/imageCompression";

/**
 * useEffect that revokes the previous blob URL whenever `url` changes
 * (and on unmount). Keeping it as a hook keeps `setOptimistic` pure
 * (no ref reads at render time) and lets the lifecycle handle cleanup
 * via the standard effect-cleanup contract — no `setState` inside the
 * effect, so it sidesteps React 19's set-state-in-effect rule.
 */
function useRevokeBlobOnChange(url: string | null) {
  useEffect(() => {
    if (!url || !url.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);
}

type Kind = "cover" | "profile";

type Props = {
  token: string;
  name: string;
  coverUrl: string;
  profileUrl: string;
};

/**
 * Family-edit wrapper around `MemorialBanner` that exposes pencil buttons
 * to upload or remove the cover and profile photos. Each button opens a
 * file picker, compresses the image client-side (same path as the gallery)
 * and dispatches `updateBannerAction`. While the upload is in flight we
 * show the freshly-picked file via `URL.createObjectURL` for an optimistic
 * preview — on failure we revert.
 */
export function BannerEditor({ token, name, coverUrl, profileUrl }: Props) {
  const t = useTranslations("family");

  // Optimistic, locally-staged URLs. They take priority over the props
  // until the server confirms the change (after which revalidation feeds
  // the new server URL back through props and we clear the override).
  const [optimisticCover, setOptimisticCover] = useState<string | null>(null);
  const [optimisticProfile, setOptimisticProfile] = useState<string | null>(
    null
  );
  const [pendingKind, setPendingKind] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Revoke the blob URL associated with each optimistic preview when it
  // changes (and on unmount). Doing the cleanup in an effect — rather
  // than trying to revoke synchronously inside the setter — keeps the
  // setter pure (no ref reads at render time) and satisfies React 19's
  // strict rules.
  useRevokeBlobOnChange(optimisticCover);
  useRevokeBlobOnChange(optimisticProfile);

  function setOptimistic(kind: Kind, url: string | null) {
    if (kind === "cover") setOptimisticCover(url);
    else setOptimisticProfile(url);
  }

  // When the server prop changes (revalidation after a successful save),
  // drop the optimistic override so we display the canonical URL. We
  // track the previous prop in *state* rather than a ref so we can
  // safely compare during render; the second setter is a no-op once
  // both are aligned, so React bails out without an extra render. This
  // is the canonical "reset state when a prop changes" recipe from
  // react.dev.
  const [prevCoverUrl, setPrevCoverUrl] = useState(coverUrl);
  if (prevCoverUrl !== coverUrl) {
    setPrevCoverUrl(coverUrl);
    if (optimisticCover !== null) setOptimisticCover(null);
  }
  const [prevProfileUrl, setPrevProfileUrl] = useState(profileUrl);
  if (prevProfileUrl !== profileUrl) {
    setPrevProfileUrl(profileUrl);
    if (optimisticProfile !== null) setOptimisticProfile(null);
  }

  async function dispatchUpload(kind: Kind, file: File) {
    setError(null);
    const compressed = await compressImage(file).catch(() => file);
    const previewUrl = URL.createObjectURL(compressed);
    setOptimistic(kind, previewUrl);

    const fd = new FormData();
    fd.set("token", token);
    fd.set("kind", kind);
    fd.set("photo", compressed);

    setPendingKind(kind);
    startTransition(async () => {
      const result = await updateBannerAction(fd);
      setPendingKind(null);
      if (!result.ok) {
        setError(result.error);
        setOptimistic(kind, null);
      }
      // On success: revalidatePath fires server-side; new prop arrives
      // → effect above clears the optimistic value.
    });
  }

  async function dispatchRemove(kind: Kind) {
    setError(null);
    setOptimistic(kind, null);
    const fd = new FormData();
    fd.set("token", token);
    fd.set("kind", kind);
    fd.set("remove", "true");
    setPendingKind(kind);
    startTransition(async () => {
      const result = await updateBannerAction(fd);
      setPendingKind(null);
      if (!result.ok) setError(result.error);
    });
  }

  const displayCover = optimisticCover ?? coverUrl;
  const displayProfile = optimisticProfile ?? profileUrl;

  return (
    <div className="space-y-2">
      <MemorialBanner
        coverUrl={displayCover}
        profileUrl={displayProfile}
        name={name}
        coverAction={
          <PencilControls
            label={t(displayCover ? "edit_cover" : "add_cover")}
            removeLabel={t("remove_cover")}
            hasValue={Boolean(displayCover)}
            pending={pendingKind === "cover"}
            onPick={(file) => dispatchUpload("cover", file)}
            onRemove={() => dispatchRemove("cover")}
          />
        }
        profileAction={
          <PencilControls
            label={t(displayProfile ? "edit_profile" : "add_profile")}
            removeLabel={t("remove_profile")}
            hasValue={Boolean(displayProfile)}
            pending={pendingKind === "profile"}
            onPick={(file) => dispatchUpload("profile", file)}
            onRemove={() => dispatchRemove("profile")}
            compact
          />
        }
      />
      {error ? (
        <p className="px-5 text-sm text-red-700 sm:px-6">{error}</p>
      ) : null}
    </div>
  );
}

/**
 * Tiny floating button that opens a hidden file input. We intentionally
 * skip a "menu" UI: clicking the pencil opens the file picker directly,
 * with a separate ✕ button to remove. Keeps the affordance discoverable
 * on touch where hover menus are awkward.
 */
function PencilControls({
  label,
  removeLabel,
  hasValue,
  pending,
  onPick,
  onRemove,
  compact = false,
}: {
  label: string;
  removeLabel: string;
  hasValue: boolean;
  pending: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const size = compact ? "h-8 w-8" : "h-9 w-9";

  return (
    <div className="flex items-center gap-1.5">
      {hasValue && !compact ? (
        <button
          type="button"
          aria-label={removeLabel}
          title={removeLabel}
          disabled={pending}
          onClick={onRemove}
          className={`${size} inline-flex items-center justify-center rounded-full bg-white/90 text-[color:var(--color-ink)] shadow-md transition hover:bg-white disabled:opacity-50`}
        >
          <TrashIcon />
        </button>
      ) : null}
      <button
        type="button"
        aria-label={label}
        title={label}
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        className={`${size} inline-flex items-center justify-center rounded-full bg-white/90 text-[color:var(--color-ink)] shadow-md transition hover:bg-white disabled:opacity-50`}
      >
        {pending ? <SpinnerIcon /> : <PencilIcon />}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          // Reset so picking the same file twice fires onChange again.
          e.target.value = "";
        }}
      />
    </div>
  );
}

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 animate-spin"
      fill="none"
      aria-hidden
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
