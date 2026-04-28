import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { BannerEditor } from "@/components/BannerEditor";
import { EditForm } from "@/components/EditForm";
import { SetupNotice } from "@/components/SetupNotice";
import { Link } from "@/i18n/navigation";
import { isAdminSession } from "@/lib/auth";
import { fetchMemorialByToken } from "@/lib/queries";
import { isServiceRoleConfigured } from "@/lib/supabase";
import { getSiteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "family" });
  return {
    title: t("metadata_title"),
    robots: { index: false, follow: false },
  };
}

export default async function FamilyEditPage({
  params,
}: {
  params: Promise<{ token: string; locale: string }>;
}) {
  const { token, locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("family");
  const tCommon = await getTranslations("common");

  if (!isServiceRoleConfigured()) {
    return <SetupNotice contextKey="family" />;
  }

  const [memorial, isAdmin] = await Promise.all([
    fetchMemorialByToken(token),
    isAdminSession(),
  ]);

  if (!memorial) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
          {t("invalid_link_label")}
        </p>
        <h1 className="font-serif text-2xl">{t("invalid_link_title")}</h1>
        <p className="text-[color:var(--color-ink-soft)]">
          {t("invalid_link_body")}
        </p>
        <Link
          href="/"
          className="mt-2 text-sm text-[color:var(--color-accent)] underline underline-offset-4"
        >
          {tCommon("back_home")}
        </Link>
      </main>
    );
  }

  const publicUrl = `${getSiteUrl()}/${locale}/m/${memorial.slug}`;
  const displayName =
    memorial.civil_name || memorial.hebrew_name || t("default_name");

  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="mx-auto w-full max-w-2xl px-5 pt-8 sm:px-6 sm:pt-12">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
              {isAdmin ? t("label_admin") : t("label_family")}
            </p>
            <h1 className="mt-1 font-serif text-3xl">{displayName}</h1>
            <p className="mt-2 text-sm text-[color:var(--color-ink-soft)]">
              {isAdmin ? t("intro_admin") : t("intro_family")}
            </p>
          </div>
        </header>
      </div>

      <BannerEditor
        token={memorial.family_token}
        name={displayName}
        coverUrl={memorial.cover_photo_url}
        profileUrl={memorial.profile_photo_url}
      />

      <main className="mx-auto w-full max-w-2xl px-5 pt-8 pb-14 sm:px-6 sm:pt-12">
        <EditForm memorial={memorial} publicUrl={publicUrl} isAdmin={isAdmin} />
      </main>
    </div>
  );
}
