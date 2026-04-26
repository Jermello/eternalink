import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MemorialHeader } from "@/components/MemorialHeader";
import { PhotoGallery } from "@/components/PhotoGallery";
import { PsalmReading } from "@/components/PsalmSection";
import { SetupNotice } from "@/components/SetupNotice";
import { fetchPublishedMemorialBySlug } from "@/lib/queries";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: PageProps<"/m/[slug]">
): Promise<Metadata> {
  const { slug } = await props.params;
  const memorial = await fetchPublishedMemorialBySlug(slug);
  if (!memorial) return { title: "Memorial · EternaLink" };

  const name = memorial.civil_name || memorial.hebrew_name || "Memorial";
  return {
    title: `${name} · EternaLink`,
    description:
      memorial.biography.slice(0, 160) ||
      `In loving memory of ${name}.`,
  };
}

export default async function PublicMemorialPage(
  props: PageProps<"/m/[slug]">
) {
  if (!isSupabaseConfigured()) {
    return <SetupNotice context="The public memorial page" />;
  }

  const { slug } = await props.params;
  const memorial = await fetchPublishedMemorialBySlug(slug);
  if (!memorial) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-24 sm:px-6">
      <MemorialHeader
        hebrewName={memorial.hebrew_name}
        civilName={memorial.civil_name}
        deathDate={memorial.death_date}
        hebrewDeathDate={memorial.hebrew_death_date}
      />

      {memorial.biography ? (
        <section
          aria-label="Biography"
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
          <PhotoGallery photos={memorial.photos} />
        </div>
      ) : null}

      {memorial.hebrew_name ? (
        <div className="pt-4">
          <PsalmReading hebrewName={memorial.hebrew_name} />
        </div>
      ) : null}

      <footer className="pt-16 text-center text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
        EternaLink · זכרונו לברכה
      </footer>
    </main>
  );
}
