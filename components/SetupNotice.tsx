import Link from "next/link";

/**
 * Rendered everywhere Supabase is needed but not configured. Keeps the app
 * from crashing on first run and points the operator to the setup guide.
 */
export function SetupNotice({
  context = "this page",
}: {
  context?: string;
}) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
        Setup required
      </p>
      <h1 className="font-serif text-2xl text-[color:var(--color-ink)]">
        EternaLink isn&rsquo;t connected to Supabase yet
      </h1>
      <p className="text-[color:var(--color-ink-soft)]">
        {context} needs a Supabase project. Follow the{" "}
        <code className="rounded bg-[color:var(--color-accent-soft)] px-1.5 py-0.5 text-sm">
          SUPABASE_SETUP.md
        </code>{" "}
        guide in the repository root, then add the values to{" "}
        <code className="rounded bg-[color:var(--color-accent-soft)] px-1.5 py-0.5 text-sm">
          .env.local
        </code>{" "}
        and restart the dev server.
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
