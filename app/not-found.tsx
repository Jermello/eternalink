import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
        404
      </p>
      <h1 className="font-serif text-2xl">Page not found</h1>
      <Link
        href="/"
        className="text-sm text-[color:var(--color-accent)] underline underline-offset-4"
      >
        Back to home
      </Link>
    </main>
  );
}
