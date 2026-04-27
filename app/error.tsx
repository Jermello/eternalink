"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // The default Server Action body limit (configured in next.config.ts) is
  // 12 MB; if a user somehow bypasses the client check and hits it, the
  // bundler surfaces a generic "Body exceeded" error. Pattern-match it so
  // we can show the family something actionable instead of a stack trace.
  const isBodyTooLarge = /Body exceeded|413|payload too large/i.test(
    error.message ?? ""
  );

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
        Something went wrong
      </p>
      <h1 className="font-serif text-2xl">
        {isBodyTooLarge
          ? "That file is too large."
          : "We couldn\u2019t load this page."}
      </h1>
      <p className="text-sm text-[color:var(--color-ink-soft)]">
        {isBodyTooLarge
          ? "Photos must be under 10 MB. Compress the image (most phones have a built-in setting) and try again."
          : error.message || "An unexpected error occurred."}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="inline-flex h-10 items-center rounded-full border border-[color:var(--color-ink)] px-5 text-sm font-medium hover:bg-[color:var(--color-ink)] hover:text-white"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-full px-5 text-sm font-medium text-[color:var(--color-ink-soft)] underline underline-offset-4 hover:text-[color:var(--color-ink)]"
        >
          Back to home
        </Link>
      </div>
      {error.digest ? (
        <p className="mt-6 text-xs text-[color:var(--color-muted)]">
          Reference: {error.digest}
        </p>
      ) : null}
    </main>
  );
}
