import Link from "next/link";

export default function MemorialNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
        404
      </p>
      <h1 className="font-serif text-2xl">Memorial not found</h1>
      <p className="text-[color:var(--color-ink-soft)]">
        This memorial doesn&rsquo;t exist or hasn&rsquo;t been published yet.
        If you scanned a QR code from a plaque, the family may still be
        preparing the page.
      </p>
      <Link
        href="/"
        className="mt-2 text-sm text-[color:var(--color-accent)] underline underline-offset-4"
      >
        Back to home
      </Link>
    </main>
  );
}
