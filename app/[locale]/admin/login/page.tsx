import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { LoginForm } from "@/components/LoginForm";
import { redirect } from "@/i18n/navigation";
import { isAdminAuthConfigured, isAdminSession } from "@/lib/auth";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "login" });
  return {
    title: t("metadata_title"),
    robots: { index: false, follow: false },
  };
}

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (await isAdminSession()) {
    redirect({ href: "/admin", locale: locale as Locale });
  }

  const t = await getTranslations("login");
  const tSetup = await getTranslations("setup");

  if (!isAdminAuthConfigured()) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
          {tSetup("label")}
        </p>
        <h1 className="font-serif text-2xl">{tSetup("admin_password_title")}</h1>
        <p className="text-[color:var(--color-ink-soft)]">
          {tSetup("admin_password_body")}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <header className="mb-8 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-muted)]">
          {t("section_label")}
        </p>
        <h1 className="mt-1 font-serif text-3xl">{t("title")}</h1>
      </header>
      <LoginForm />
    </main>
  );
}
