"use client";

import { useCallback, useEffect, useState } from "react";

import type { Photo } from "@/lib/supabase";

type Props = {
  photos: Photo[];
  /** Localized aria-label for the gallery section. */
  label?: string;
  /** Localized labels for lightbox controls. */
  labels?: {
    previous: string;
    next: string;
    close: string;
    /**
     * Pre-rendered counter strings, one per photo (e.g. "1 / 5"). We avoid
     * passing a function from the server component because functions aren't
     * serializable across the RSC boundary.
     */
    counters: string[];
  };
};

const DEFAULT_LABELS = {
  previous: "Previous photo",
  next: "Next photo",
  close: "Close",
};

/**
 * Read-only photo grid for the public memorial page with a lightbox overlay.
 * Renders nothing if there are no photos so the page stays sparse.
 *
 * Plain <img> rather than next/image because the photos live in Supabase
 * Storage and would otherwise require per-project remotePatterns config.
 */
export function PhotoGallery({
  photos,
  label = "Photographs",
  labels,
}: Props) {
  const l = {
    ...DEFAULT_LABELS,
    counters: photos.map((_, i) => `${i + 1} / ${photos.length}`),
    ...(labels ?? {}),
  };
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const close = useCallback(() => setOpenIdx(null), []);
  const prev = useCallback(
    () =>
      setOpenIdx((i) =>
        i === null ? null : (i - 1 + photos.length) % photos.length
      ),
    [photos.length]
  );
  const next = useCallback(
    () => setOpenIdx((i) => (i === null ? null : (i + 1) % photos.length)),
    [photos.length]
  );

  // Keyboard handling + body scroll lock while open.
  useEffect(() => {
    if (openIdx === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [openIdx, close, prev, next]);

  if (!photos.length) return null;
  const isSingle = photos.length === 1;

  return (
    <>
      <section
        aria-label={label}
        className={`grid gap-3 ${
          isSingle ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3"
        }`}
      >
        {photos.map((photo, idx) => (
          <figure
            key={photo.id}
            className="overflow-hidden rounded-lg bg-[color:var(--color-surface)] shadow-sm ring-1 ring-[color:var(--color-line)]"
          >
            <button
              type="button"
              onClick={() => setOpenIdx(idx)}
              className="block w-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.image_url}
                alt=""
                loading="lazy"
                className={`w-full ${
                  isSingle
                    ? "max-h-[28rem] object-contain"
                    : "aspect-square object-cover"
                }`}
              />
            </button>
          </figure>
        ))}
      </section>

      {openIdx !== null ? (
        <Lightbox
          photo={photos[openIdx]}
          counter={l.counters[openIdx]}
          showNav={photos.length > 1}
          onClose={close}
          onPrev={prev}
          onNext={next}
          labels={l}
        />
      ) : null}
    </>
  );
}

function Lightbox({
  photo,
  counter,
  showNav,
  onClose,
  onPrev,
  onNext,
  labels,
}: {
  photo: Photo;
  counter: string;
  showNav: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  labels: { previous: string; next: string; close: string };
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={labels.close}
        className="absolute end-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        {/* close icon */}
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {showNav ? (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            aria-label={labels.previous}
            className="absolute start-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            aria-label={labels.next}
            className="absolute end-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronRight />
          </button>
        </>
      ) : null}

      <figure
        className="flex max-h-full max-w-full flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.image_url}
          alt=""
          className="max-h-[85vh] max-w-[92vw] rounded-md object-contain shadow-2xl"
        />
        {showNav ? (
          <figcaption className="mt-3 text-xs text-white/70">
            {counter}
          </figcaption>
        ) : null}
      </figure>
    </div>
  );
}

function ChevronLeft() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6 rtl:rotate-180"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6 rtl:rotate-180"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
