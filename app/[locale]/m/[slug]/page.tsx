import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { MemorialBanner } from "@/components/MemorialBanner";
import { MemorialHeader } from "@/components/MemorialHeader";
import { PhotoGallery } from "@/components/PhotoGallery";
import { PsalmReading } from "@/components/PsalmSection";
import { SetupNotice } from "@/components/SetupNotice";
import { FEATURE_PHOTO_GALLERY } from "@/lib/featureFlags";
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

  const displayName = memorial.civil_name || memorial.hebrew_name;

  return (
    <div className="relative isolate flex w-full flex-1 flex-col">
      {/* Page-wide warm sunset undertone. Kept very faint (~12% photo
          showing) so the memorial content stays the focus and the body
          copy reads cleanly. */}
      <div
        aria-hidden
        className="fixed inset-0 -z-20 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/public-page.jpeg)" }}
      />
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-[color:var(--color-bg)]/88"
      />

      <MemorialBanner
        coverUrl={memorial.cover_photo_url}
        profileUrl={memorial.profile_photo_url}
        name={displayName}
      />

      <main className="mx-auto w-full max-w-2xl px-5 pb-24 sm:px-6">
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

        {FEATURE_PHOTO_GALLERY && memorial.photos.length > 0 ? (
          <div className="pb-12">
            <PhotoGallery
              photos={memorial.photos}
              label={t("photos_label")}
              labels={{
                previous: t("lightbox_previous"),
                next: t("lightbox_next"),
                close: t("lightbox_close"),
                counters: memorial.photos.map((_, i) =>
                  t("lightbox_counter", {
                    current: i + 1,
                    total: memorial.photos.length,
                  })
                ),
              }}
            />
          </div>
        ) : null}

        {memorial.hebrew_name ? (
          <div className="pt-4">
            <PsalmReading
              hebrewName={memorial.hebrew_name}
              hebrewParentName={memorial.hebrew_parent_name}
              gender={memorial.gender}
            />
          </div>
        ) : null}

        <footer className="pt-16 text-center text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
          {t("footer_blessing")}
        </footer>
      </main>
    </div>
  );
}
