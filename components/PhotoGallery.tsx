import type { Photo } from "@/lib/supabase";

type Props = {
  photos: Photo[];
};

/**
 * Read-only photo grid for the public memorial page. Renders nothing if
 * there are no photos so the page stays sparse and respectful.
 *
 * We use a plain <img> tag rather than next/image because the photos live in
 * Supabase Storage and would otherwise require remotePatterns config per
 * project URL. For an MVP this is the simpler, lower-friction choice.
 */
export function PhotoGallery({ photos }: Props) {
  if (!photos.length) return null;

  const isSingle = photos.length === 1;

  return (
    <section
      aria-label="Photographs"
      className={`grid gap-3 ${
        isSingle ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3"
      }`}
    >
      {photos.map((photo) => (
        <figure
          key={photo.id}
          className="overflow-hidden rounded-lg bg-[color:var(--color-surface)] shadow-sm ring-1 ring-[color:var(--color-line)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.image_url}
            alt=""
            loading="lazy"
            className={`w-full ${
              isSingle ? "max-h-[28rem] object-contain" : "aspect-square object-cover"
            }`}
          />
        </figure>
      ))}
    </section>
  );
}
