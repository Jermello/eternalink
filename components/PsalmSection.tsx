import { getTranslations } from "next-intl/server";

import { getPsalmReading, type PsalmSection } from "@/lib/psalm119";

type Props = {
  hebrewName: string;
};

/**
 * Renders the Psalm 119 reading derived from a Hebrew name: one block per
 * letter, in the order they appear in the name (duplicates included). If the
 * name has no Hebrew letters, the section is omitted entirely.
 *
 * The verses themselves are *always* in Hebrew (sacred liturgical text).
 * Only the surrounding labels (heading, "verse N") are translated.
 */
export async function PsalmReading({ hebrewName }: Props) {
  const sections = getPsalmReading(hebrewName);
  if (!sections.length) return null;

  const t = await getTranslations("memorial");

  return (
    <section
      aria-label={t("psalm_label")}
      className="space-y-8"
      dir="rtl"
      lang="he"
    >
      <header className="text-center">
        <p
          className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]"
          dir="ltr"
          lang="en"
        >
          {t("psalm_heading")}
        </p>
        <h2 className="mt-2 font-serif text-2xl text-[color:var(--color-ink)]">
          {hebrewName}
        </h2>
      </header>

      <div className="space-y-6">
        {sections.map((section, idx) => (
          <PsalmLetterBlock
            key={`${section.letter}-${idx}`}
            section={section}
            verseLabel={t("verse_marker")}
          />
        ))}
      </div>
    </section>
  );
}

function PsalmLetterBlock({
  section,
  verseLabel,
}: {
  section: PsalmSection;
  verseLabel: string;
}) {
  return (
    <article className="rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-6 shadow-sm">
      <div className="flex items-baseline justify-between gap-4">
        <span
          className="font-serif text-3xl text-[color:var(--color-accent)]"
          aria-hidden
        >
          {section.letter}
        </span>
        <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
          {section.letterName} · {verseLabel} {section.verseStart}
        </span>
      </div>

      <ol
        className="mt-4 space-y-2 font-serif text-lg leading-loose text-[color:var(--color-ink)]"
        start={section.verseStart}
      >
        {section.verses.map((verse, i) => (
          <li key={i} className="marker:text-[color:var(--color-muted)]">
            {verse}
          </li>
        ))}
      </ol>
    </article>
  );
}
