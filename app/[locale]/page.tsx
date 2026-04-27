import { setRequestLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="flex-1">
      <Hero />
      <Tradition />
      <HowItWorks />
      <WhatsOnAPage />
      <Commitments />
      <Contact />
      <Footer />
    </main>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Hero
// ───────────────────────────────────────────────────────────────────────

async function Hero() {
  const t = await getTranslations("landing.hero");

  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-x-0 top-0 z-10 mx-auto flex max-w-5xl items-center justify-end px-6 pt-5">
        <LanguageSwitcher />
      </div>

      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 pt-20 pb-16 text-center sm:pt-28 sm:pb-24">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-muted)]">
          {t("tagline")}
        </p>
        <h1 className="mt-3 font-serif text-4xl leading-[1.05] tracking-tight sm:text-6xl">
          {t("title_line1")}
          <br />
          <span className="text-[color:var(--color-accent)]">
            {t("title_line2")}
          </span>
        </h1>
        <p className="mt-6 max-w-prose text-lg text-[color:var(--color-ink-soft)]">
          {t("subtitle")}
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <a
            href="#contact"
            className="inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--color-ink)] px-7 text-sm font-medium text-white transition hover:bg-[color:var(--color-accent)]"
          >
            {t("cta_primary")}
          </a>
          <a
            href="#tradition"
            className="inline-flex h-11 items-center justify-center px-2 text-sm text-[color:var(--color-ink-soft)] underline underline-offset-4 hover:text-[color:var(--color-ink)]"
          >
            {t("cta_secondary")}
          </a>
        </div>

        <div
          aria-label="Psalm 119 — Aleph"
          className="mt-16 w-full rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-8 shadow-sm sm:p-10"
          dir="rtl"
          lang="he"
        >
          <p className="font-serif text-2xl leading-[2.2] sm:text-3xl">
            אַשְׁרֵי תְמִימֵי־דָרֶךְ הַהֹלְכִים בְּתוֹרַת יְהוָה׃
          </p>
          <p
            className="mt-4 text-xs uppercase tracking-[0.25em] text-[color:var(--color-muted)]"
            dir="ltr"
            lang="en"
          >
            {t("verse_label")}
          </p>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Tradition
// ───────────────────────────────────────────────────────────────────────

const HEBREW_ALPHABET = [
  "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י", "כ",
  "ל", "מ", "נ", "ס", "ע", "פ", "צ", "ק", "ר", "ש", "ת",
];

const HIGHLIGHTED = new Set(["ר", "א", "ו", "ב", "נ", "ש", "מ", "ה"]);

async function Tradition() {
  const t = await getTranslations("landing.tradition");

  return (
    <section
      id="tradition"
      className="border-y border-[color:var(--color-line)] bg-[color:var(--color-accent-soft)]/30"
    >
      <div className="mx-auto max-w-3xl px-6 py-20 sm:py-28">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-muted)]">
          {t("section_label")}
        </p>
        <h2 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">
          {t("title")}
        </h2>
        <div className="prose-memorial mt-6 max-w-none">
          <p dangerouslySetInnerHTML={{ __html: t.raw("p1_html") }} />
          <p dangerouslySetInnerHTML={{ __html: t.raw("p2_html") }} />
        </div>

        <div className="mt-10 rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--color-muted)]">
            {t("example_label")}{" "}
            <span className="font-serif normal-case tracking-normal text-[color:var(--color-ink)]">
              {t("example_name")}
            </span>
          </p>
          <div
            dir="rtl"
            lang="he"
            className="mt-5 grid grid-cols-11 gap-2 sm:gap-3"
          >
            {HEBREW_ALPHABET.map((letter) => {
              const on = HIGHLIGHTED.has(letter);
              return (
                <div
                  key={letter}
                  className={`flex aspect-square items-center justify-center rounded-md font-serif text-xl transition sm:text-2xl ${
                    on
                      ? "bg-[color:var(--color-ink)] text-white"
                      : "bg-[color:var(--color-accent-soft)]/60 text-[color:var(--color-muted)]"
                  }`}
                >
                  {letter}
                </div>
              );
            })}
          </div>
          <p
            className="mt-5 text-xs text-[color:var(--color-ink-soft)]"
            dangerouslySetInnerHTML={{ __html: t.raw("example_explanation_html") }}
          />
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────
// How it works
// ───────────────────────────────────────────────────────────────────────

async function HowItWorks() {
  const t = await getTranslations("landing.how_it_works");

  const steps = [
    { n: "01", title: t("step1_title"), body: t("step1_body") },
    { n: "02", title: t("step2_title"), body: t("step2_body") },
    { n: "03", title: t("step3_title"), body: t("step3_body") },
  ];

  return (
    <section className="mx-auto max-w-4xl px-6 py-20 sm:py-28">
      <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-muted)]">
        {t("section_label")}
      </p>
      <h2 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">
        {t("title")}
      </h2>
      <ol className="mt-12 grid gap-6 sm:grid-cols-3">
        {steps.map((s) => (
          <li
            key={s.n}
            className="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-6"
          >
            <p className="font-serif text-3xl text-[color:var(--color-accent)]">
              {s.n}
            </p>
            <h3 className="mt-3 font-serif text-xl">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-ink-soft)]">
              {s.body}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────
// What's on a memorial page
// ───────────────────────────────────────────────────────────────────────

async function WhatsOnAPage() {
  const t = await getTranslations("landing.whats_on");
  const items = t.raw("items") as string[];

  return (
    <section className="border-t border-[color:var(--color-line)] bg-[color:var(--color-accent-soft)]/30">
      <div className="mx-auto grid max-w-5xl gap-12 px-6 py-20 sm:grid-cols-5 sm:py-28">
        <div className="sm:col-span-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-muted)]">
            {t("section_label")}
          </p>
          <h2 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-sm text-[color:var(--color-ink-soft)]">
            {t("subtitle")}
          </p>
        </div>
        <ul className="space-y-4 sm:col-span-3">
          {items.map((it) => (
            <li
              key={it}
              className="flex gap-3 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4"
            >
              <span
                aria-hidden="true"
                className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-accent)]"
              />
              <span className="text-sm leading-relaxed text-[color:var(--color-ink)]">
                {it}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Commitments
// ───────────────────────────────────────────────────────────────────────

async function Commitments() {
  const t = await getTranslations("landing.commitments");
  const items = t.raw("items") as { title: string; body: string }[];

  return (
    <section className="mx-auto max-w-4xl px-6 py-20 sm:py-28">
      <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-muted)]">
        {t("section_label")}
      </p>
      <h2 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">
        {t("title")}
      </h2>
      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {items.map((p) => (
          <div
            key={p.title}
            className="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-6"
          >
            <h3 className="font-serif text-lg">{p.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-ink-soft)]">
              {p.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Contact
// ───────────────────────────────────────────────────────────────────────

async function Contact() {
  const t = await getTranslations("landing.contact");
  const subject = encodeURIComponent(t("email_subject"));

  return (
    <section
      id="contact"
      className="border-t border-[color:var(--color-line)] bg-[color:var(--color-ink)] text-white"
    >
      <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-28">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">
          {t("section_label")}
        </p>
        <h2 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">
          {t("title_line1")}
          <br className="hidden sm:block" /> {t("title_line2")}
        </h2>
        <p className="mx-auto mt-5 max-w-prose text-base text-white/70">
          {t("body")}
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href={`mailto:hello@eternalink.app?subject=${subject}`}
            className="inline-flex h-11 items-center justify-center rounded-full bg-white px-7 text-sm font-medium text-[color:var(--color-ink)] transition hover:bg-[color:var(--color-accent-soft)]"
          >
            hello@eternalink.app
          </a>
          <span className="text-sm text-white/60">{t("reply_time")}</span>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Footer
// ───────────────────────────────────────────────────────────────────────

async function Footer() {
  const t = await getTranslations("landing.footer");
  const year = new Date().getFullYear();

  return (
    <footer className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 px-6 py-10 text-xs text-[color:var(--color-muted)] sm:flex-row">
      <p>
        © {year} EternaLink · {t("tagline")}
      </p>
      <div className="flex items-center gap-5">
        <a href="#tradition" className="hover:text-[color:var(--color-ink)]">
          {t("tradition_link")}
        </a>
        <a href="#contact" className="hover:text-[color:var(--color-ink)]">
          {t("contact_link")}
        </a>
        <Link href="/admin" className="hover:text-[color:var(--color-ink)]">
          {t("admin_link")}
        </Link>
      </div>
    </footer>
  );
}
