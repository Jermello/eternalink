import type { ReactNode } from "react";

type Props = {
  coverUrl: string;
  profileUrl: string;
  /** Used for the avatar's `alt` text and the cover's `aria-label`. */
  name: string;
  /** Optional overlay rendered in the cover's top-end corner (edit pencil). */
  coverAction?: ReactNode;
  /** Optional overlay rendered on the avatar's bottom-end (edit pencil). */
  profileAction?: ReactNode;
};

/**
 * Facebook-style memorial banner: a full-width cover image with a circular
 * portrait centered on its bottom edge, half overlapping. Falls back to a
 * soft gradient + silhouette when one or both photos are missing.
 *
 * The component is purely presentational — pass `coverAction` /
 * `profileAction` slots from a Client Component to add edit pencils.
 */
export function MemorialBanner({
  coverUrl,
  profileUrl,
  name,
  coverAction,
  profileAction,
}: Props) {
  return (
    <div className="relative w-full pb-12 sm:pb-16">
      {/* Cover. Fixed responsive heights rather than aspect-ratio so the
          banner stays comfortably slim on tall mobile viewports. */}
      <div
        aria-label={name ? `Cover photo of ${name}` : "Cover photo"}
        className="relative h-44 w-full overflow-hidden bg-[color:var(--color-surface)] sm:h-60"
      >
        {coverUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={coverUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <CoverFallback />
        )}
        {coverAction ? (
          <div className="absolute end-3 top-3 sm:end-4 sm:top-4">
            {coverAction}
          </div>
        ) : null}
      </div>

      {/* Avatar — centered horizontally, vertically straddling the cover's
          bottom edge (half overlaps the cover, half sits in the pb space). */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
        <div className="relative">
          <div className="h-24 w-24 overflow-hidden rounded-full bg-[color:var(--color-surface)] ring-4 ring-[color:var(--color-bg)] shadow-md sm:h-32 sm:w-32">
            {profileUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={profileUrl}
                alt={name ? `Portrait of ${name}` : ""}
                className="h-full w-full object-cover"
              />
            ) : (
              <ProfileFallback />
            )}
          </div>
          {profileAction ? (
            <div className="absolute bottom-0 end-0">{profileAction}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CoverFallback() {
  return (
    <div
      aria-hidden
      className="h-full w-full"
      style={{
        background:
          "linear-gradient(135deg, var(--color-accent-soft) 0%, var(--color-surface) 50%, var(--color-line) 100%)",
      }}
    />
  );
}

function ProfileFallback() {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden
      className="h-full w-full text-[color:var(--color-line)]"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="100" height="100" fill="currentColor" />
      <circle cx="50" cy="40" r="18" fill="var(--color-bg)" />
      <path
        d="M20 92c4-18 17-28 30-28s26 10 30 28"
        fill="var(--color-bg)"
      />
    </svg>
  );
}
