"use client";

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

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
        Something went wrong
      </p>
      <h1 className="font-serif text-2xl">
        We couldn&rsquo;t load this page.
      </h1>
      <p className="text-sm text-[color:var(--color-ink-soft)]">
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        className="mt-2 inline-flex h-10 items-center rounded-full border border-[color:var(--color-ink)] px-5 text-sm font-medium hover:bg-[color:var(--color-ink)] hover:text-white"
      >
        Try again
      </button>
    </main>
  );
}
