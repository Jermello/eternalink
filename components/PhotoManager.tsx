"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState, useTransition } from "react";

import {
  deletePhotoAction,
  reorderPhotosAction,
  type ActionResult,
} from "@/lib/actions";
import type { Photo } from "@/lib/supabase";

type Props = {
  token: string;
  photos: Photo[];
};

const initialDelete: ActionResult | null = null;

/**
 * Existing-photo grid for the family edit page. Supports:
 * - Inline delete (per photo)
 * - Reordering via ↑/↓ buttons. Local state is updated optimistically;
 *   a debounced-by-pending server action persists the new order.
 *
 * We use buttons instead of HTML5 drag-and-drop because (a) it works on
 * touch devices without a polyfill and (b) the keyboard accessibility is
 * trivially correct.
 */
export function PhotoManager({ token, photos: initial }: Props) {
  const t = useTranslations("family");
  const [photos, setPhotos] = useState<Photo[]>(initial);
  const [savingOrder, startSaveOrder] = useTransition();
  const [orderError, setOrderError] = useState<string | null>(null);

  // Reset local state if the server snapshot changes (e.g. after a delete
  // or a successful save round-trip causes revalidation). React 19
  // forbids setState in useEffect for this case and disallows ref reads
  // at render — the documented recipe is to track the previous prop in
  // state and update both setters in the same render. Subsequent
  // renders bail out (idempotent setters).
  const [prevInitial, setPrevInitial] = useState(initial);
  if (prevInitial !== initial) {
    setPrevInitial(initial);
    setPhotos(initial);
  }

  function persistOrder(next: Photo[]) {
    setOrderError(null);
    const ids = next.map((p) => p.id);
    startSaveOrder(async () => {
      const fd = new FormData();
      fd.set("token", token);
      fd.set("order", JSON.stringify(ids));
      const result = await reorderPhotosAction(fd);
      if (!result.ok) {
        // Revert on failure so the UI never lies about persisted state.
        setPhotos(initial);
        setOrderError(result.error);
      }
    });
  }

  function move(idx: number, delta: -1 | 1) {
    const target = idx + delta;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    [next[idx], next[target]] = [next[target], next[idx]];
    setPhotos(next);
    persistOrder(next);
  }

  if (photos.length === 0) {
    return (
      <p className="text-sm text-[color:var(--color-ink-soft)]">
        {t("no_photos")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-[color:var(--color-ink-soft)]">
        <span>{t("reorder_help")}</span>
        {savingOrder ? (
          <span className="text-[color:var(--color-muted)]">
            {t("reorder_saving")}
          </span>
        ) : orderError ? (
          <span className="text-red-700">{orderError}</span>
        ) : null}
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((photo, idx) => (
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

            {/* Order controls — top-left, always visible on touch */}
            <div className="absolute start-2 top-2 flex gap-1">
              <OrderButton
                label={t("move_up")}
                disabled={idx === 0 || savingOrder}
                onClick={() => move(idx, -1)}
              >
                <ChevronUp />
              </OrderButton>
              <OrderButton
                label={t("move_down")}
                disabled={idx === photos.length - 1 || savingOrder}
                onClick={() => move(idx, 1)}
              >
                <ChevronDown />
              </OrderButton>
            </div>

            {/* Position badge */}
            <span className="absolute end-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-xs font-medium text-white">
              {idx + 1}
            </span>

            <DeletePhotoButton token={token} photoId={photo.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function OrderButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[color:var(--color-ink)] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
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

function ChevronUp() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
