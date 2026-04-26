import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16 sm:py-24">
      <div className="space-y-3 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-muted)]">
          EternaLink
        </p>
        <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
          A digital memorial,
          <br />
          read in Psalms.
        </h1>
        <p className="mx-auto mt-4 max-w-prose text-lg text-[color:var(--color-ink-soft)]">
          A QR code on the plaque opens a private page where families can share
          a biography, photographs, and a reading of Psalm 119 generated from
          the deceased&rsquo;s Hebrew name &mdash; one section per letter, in
          order, in keeping with tradition.
        </p>
      </div>

      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/admin"
          className="inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--color-ink)] px-6 text-sm font-medium text-white transition hover:bg-[color:var(--color-accent)]"
        >
          Open admin
        </Link>
        <a
          href="https://github.com/"
          className="text-sm text-[color:var(--color-ink-soft)] underline underline-offset-4 hover:text-[color:var(--color-ink)]"
        >
          How it works
        </a>
      </div>

      <section
        aria-label="Hebrew sample"
        className="mt-16 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-8 text-center shadow-sm"
        dir="rtl"
        lang="he"
      >
        <p className="font-serif text-2xl leading-loose text-[color:var(--color-ink)]">
          אַשְׁרֵי תְמִימֵי־דָרֶךְ הַהֹלְכִים בְּתוֹרַת יְהוָה׃
        </p>
        <p
          className="mt-3 text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]"
          dir="ltr"
          lang="en"
        >
          Tehillim 119:1 — Aleph
        </p>
      </section>
    </main>
  );
}
