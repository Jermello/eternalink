import { formatCivilDate } from "@/lib/utils";

type Props = {
  hebrewName: string;
  civilName: string;
  deathDate: string | null;
  hebrewDeathDate: string;
  locale: string;
};

/**
 * Front-matter of a memorial page: the deceased's name(s) and dates, in a
 * minimalist, gravestone-inspired layout. Mobile-first, since the QR-code
 * scan use-case dominates.
 *
 * `locale` is forwarded to `formatCivilDate` so the civil date shows up in
 * the visitor's preferred language formatting.
 */
export function MemorialHeader({
  hebrewName,
  civilName,
  deathDate,
  hebrewDeathDate,
  locale,
}: Props) {
  const civilDate = formatCivilDate(deathDate, locale);

  return (
    <header className="text-center pt-12 pb-10 sm:pt-20 sm:pb-14 border-b border-[color:var(--color-line)]">
      {hebrewName ? (
        <h1
          lang="he"
          className="font-serif text-4xl sm:text-5xl leading-tight tracking-tight text-[color:var(--color-ink)]"
        >
          {hebrewName}
        </h1>
      ) : null}

      {civilName ? (
        <p
          className={`font-serif text-xl sm:text-2xl text-[color:var(--color-ink-soft)] ${
            hebrewName ? "mt-3" : ""
          }`}
        >
          {civilName}
        </p>
      ) : null}

      {(civilDate || hebrewDeathDate) && (
        <div className="mt-6 inline-flex flex-col items-center gap-1 text-sm text-[color:var(--color-ink-soft)]">
          {hebrewDeathDate ? (
            <span lang="he" className="font-serif text-base">
              {hebrewDeathDate}
            </span>
          ) : null}
          {civilDate ? <span>{civilDate}</span> : null}
        </div>
      )}

      <div
        className="mx-auto mt-8 h-px w-12 bg-[color:var(--color-accent)]"
        aria-hidden
      />
    </header>
  );
}
