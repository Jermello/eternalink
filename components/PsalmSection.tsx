import { getTranslations } from "next-intl/server";

import {
  buildPrayerName,
  getLiturgicalSegments,
  type PsalmSection,
} from "@/lib/psalm119";

type Props = {
  hebrewName: string;
  /** Parent's Hebrew name; used to compose "<name> בן <parent>". */
  hebrewParentName?: string;
};

/**
 * Renders the Psalm 119 reading derived from the deceased's Hebrew name
 * combined with the parent name and נשמה (soul). The reading is grouped
 * into segments (name, "בן", parent, נשמה) with a small subtitle above
 * each segment so a visitor can see *which* word's letters they're
 * currently reading.
 *
 * The verses themselves are *always* in Hebrew (sacred liturgical text).
 * Only the surrounding labels (heading, "verse N") are translated.
 */
export async function PsalmReading({ hebrewName, hebrewParentName }: Props) {
  const segments = getLiturgicalSegments({ hebrewName, hebrewParentName });
  if (!segments.length) return null;

  const prayerName = buildPrayerName({ hebrewName, hebrewParentName });
  const t = await getTranslations("memorial");

  return (
    <section
      aria-label={t("psalm_label")}
      className="space-y-10"
      dir="rtl"
      lang="he"
    >
      <header className="text-center">
        <p
          className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-accent)]"
          dir="ltr"
          lang="en"
        >
          {t("psalm_heading")}
        </p>
        <h2 className="mt-2 font-serif text-2xl text-[color:var(--color-ink)]">
          {prayerName}
          <span className="text-[color:var(--color-accent)]"> — נשמה</span>
        </h2>
      </header>

      <div className="space-y-10">
        {segments.map((segment) => (
          <div key={segment.key} className="space-y-4">
            {/* Segment subtitle — small, always visible, with a soft
                accent rule on the side so it reads as a divider rather
                than competing with the section headers below. */}
            <h3 className="flex items-center gap-3 font-serif text-2xl text-[color:var(--color-accent)]">
              <span className="h-px flex-1 bg-[color:var(--color-line)]" aria-hidden />
              {segment.text}
              <span className="h-px flex-1 bg-[color:var(--color-line)]" aria-hidden />
            </h3>
            <div className="space-y-6">
              {segment.sections.map((section, idx) => (
                <PsalmLetterBlock
                  key={`${segment.key}-${section.letter}-${idx}`}
                  section={section}
                  verseLabel={t("verse_marker")}
                />
              ))}
            </div>
          </div>
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
