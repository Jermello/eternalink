import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { MemorialHeader } from "@/components/MemorialHeader";
import { PhotoGallery } from "@/components/PhotoGallery";
import { PsalmReading } from "@/components/PsalmSection";
import { SetupNotice } from "@/components/SetupNotice";
import { fetchPublishedMemorialBySlug } from "@/lib/queries";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const t = await getTranslations({ locale, namespace: "family" });
  const memorial = await fetchPublishedMemorialBySlug(slug);
  if (!memorial) return { title: `${t("default_name")} · EternaLink` };

  const name = memorial.civil_name || memorial.hebrew_name || t("default_name");
  return {
    title: `${name} · EternaLink`,
    description: memorial.biography.slice(0, 160) || undefined,
  };
}

export default async function PublicMemorialPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  setRequestLocale(locale);

  if (!isSupabaseConfigured()) {
    return <SetupNotice contextKey="memorial" />;
  }

  const memorial = await fetchPublishedMemorialBySlug(slug);
  if (!memorial) notFound();

  const t = await getTranslations("memorial");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-24 sm:px-6">
      <MemorialHeader
        hebrewName={memorial.hebrew_name}
        civilName={memorial.civil_name}
        deathDate={memorial.death_date}
        hebrewDeathDate={memorial.hebrew_death_date}
        locale={locale}
      />

      {memorial.biography ? (
        <section
          aria-label={t("biography_label")}
          className="prose-memorial mx-auto max-w-prose pt-10 pb-12 font-serif text-lg"
        >
          {memorial.biography
            .split(/\n{2,}/)
            .map((para, i) => (
              <p key={i}>{para}</p>
            ))}
        </section>
      ) : null}

      {memorial.photos.length > 0 ? (
        <div className="pb-12">
          <PhotoGallery photos={memorial.photos} label={t("photos_label")} />
        </div>
      ) : null}

      {memorial.hebrew_name ? (
        <div className="pt-4">
          <PsalmReading hebrewName={memorial.hebrew_name} />
        </div>
      ) : null}

      <footer className="pt-16 text-center text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
        {t("footer_blessing")}
      </footer>
    </main>
  );
}
