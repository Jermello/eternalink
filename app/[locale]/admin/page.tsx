import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { DeleteMemorialButton } from "@/components/DeleteMemorialButton";
import { HebrewDatePicker } from "@/components/HebrewDatePicker";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { RegenerateTokenButton } from "@/components/RegenerateTokenButton";
import { SetupNotice } from "@/components/SetupNotice";
import { SubmitButton } from "@/components/SubmitButton";
import { Link } from "@/i18n/navigation";
import {
  createMemorialAction,
  logoutAction,
  togglePublishAction,
} from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { fetchAllMemorials } from "@/lib/queries";
import { isServiceRoleConfigured } from "@/lib/supabase";
import { formatCivilDate, getSiteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return {
    title: t("metadata_title"),
    robots: { index: false, follow: false },
  };
}

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ created?: string; deleted?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Defense in depth: the proxy already redirected to /admin/login when no
  // cookie is present, but we still cryptographically verify the session
  // here before rendering or running any server actions.
  await requireAdmin();

  const t = await getTranslations("admin");
  const tList = await getTranslations("admin.list");

  if (!isServiceRoleConfigured()) {
    return <SetupNotice contextKey="admin" />;
  }

  const sp = await searchParams;
  const createdToken = typeof sp.created === "string" ? sp.created : undefined;
  const justDeleted = sp.deleted === "1";

  const memorials = await fetchAllMemorials();
  const siteUrl = getSiteUrl();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:px-6 sm:py-14">
      <header className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
            {t("section_label")}
          </p>
          <h1 className="mt-1 font-serif text-3xl">{t("title")}</h1>
          <p className="mt-2 text-sm text-[color:var(--color-ink-soft)]">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <LanguageSwitcher />
          <form action={logoutAction}>
            <SubmitButton variant="ghost" pendingLabel={t("signing_out")}>
              {t("sign_out")}
            </SubmitButton>
          </form>
        </div>
      </header>

      {justDeleted ? (
        <div className="mb-8 rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-accent-soft)] p-4 text-sm text-[color:var(--color-ink)]">
          {t("memorial_deleted")}
        </div>
      ) : null}

      {createdToken ? (
        <CreatedNotice token={createdToken} siteUrl={siteUrl} locale={locale} />
      ) : null}

      <CreateMemorialForm />

      <section className="mt-12">
        <h2 className="font-serif text-xl">{tList("title")}</h2>

        {memorials.length === 0 ? (
          <p className="mt-3 text-sm text-[color:var(--color-ink-soft)]">
            {tList("empty")}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[color:var(--color-line)] rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
            {memorials.map((m) => {
              const name = m.civil_name || m.hebrew_name || m.slug;
              return (
                <li
                  key={m.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-serif text-lg">
                      {name}{" "}
                      {m.is_published ? (
                        <span className="ms-2 align-middle rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-800">
                          {tList("status_published")}
                        </span>
                      ) : (
                        <span className="ms-2 align-middle rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-800">
                          {tList("status_draft")}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--color-ink-soft)]">
                      {tList("slug")}: <code>{m.slug}</code> ·{" "}
                      {tList("created")} {formatCivilDate(m.created_at, locale)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm">
                      <Link
                        href={`/m/${m.slug}`}
                        className="text-[color:var(--color-accent)] underline underline-offset-4"
                      >
                        {tList("public_page")}
                      </Link>
                      <Link
                        href={`/family/${m.family_token}`}
                        className="text-[color:var(--color-accent)] underline underline-offset-4"
                      >
                        {tList("edit_content")}
                      </Link>
                      <a
                        href={`/api/qr/${m.slug}`}
                        target="_blank"
                        rel="noopener"
                        className="text-[color:var(--color-accent)] underline underline-offset-4"
                      >
                        {tList("qr_code")}
                      </a>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <form action={togglePublishAction}>
                      <input type="hidden" name="id" value={m.id} />
                      <input
                        type="hidden"
                        name="publish"
                        value={String(!m.is_published)}
                      />
                      <SubmitButton
                        variant="outline"
                        pendingLabel={
                          m.is_published
                            ? tList("unpublishing")
                            : tList("publishing")
                        }
                      >
                        {m.is_published
                          ? tList("unpublish")
                          : tList("publish")}
                      </SubmitButton>
                    </form>
                    <RegenerateTokenButton id={m.id} />
                    <DeleteMemorialButton id={m.id} name={name} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

async function CreateMemorialForm() {
  const t = await getTranslations("admin.create");
  const tFamily = await getTranslations("family");
  return (
    <form
      action={createMemorialAction}
      className="rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5"
    >
      <h2 className="font-serif text-xl">{t("title")}</h2>
      <p className="mt-1 text-sm text-[color:var(--color-ink-soft)]">
        {t("subtitle")}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm text-[color:var(--color-ink-soft)]">
            {t("civil_name")}
          </span>
          <input
            name="civil_name"
            placeholder={t("civil_placeholder")}
            className="mt-1 w-full rounded-md border border-[color:var(--color-line)] bg-white p-2.5 text-base shadow-sm focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-accent)]"
          />
        </label>
        <label className="block">
          <span className="text-sm text-[color:var(--color-ink-soft)]">
            {t("hebrew_name")}
          </span>
          <input
            name="hebrew_name"
            dir="rtl"
            lang="he"
            placeholder={t("hebrew_placeholder")}
            className="mt-1 w-full rounded-md border border-[color:var(--color-line)] bg-white p-2.5 font-serif text-base shadow-sm focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-accent)]"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm text-[color:var(--color-ink-soft)]">
            {t("hebrew_parent_name")}
          </span>
          <input
            name="hebrew_parent_name"
            dir="rtl"
            lang="he"
            placeholder={t("hebrew_parent_placeholder")}
            className="mt-1 w-full rounded-md border border-[color:var(--color-line)] bg-white p-2.5 font-serif text-base shadow-sm focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-accent)]"
          />
          <span className="mt-1 block text-xs text-[color:var(--color-muted)]">
            {t("hebrew_parent_help")}
          </span>
        </label>

        <fieldset className="block sm:col-span-2">
          <legend className="text-sm text-[color:var(--color-ink-soft)]">
            {t("gender")}
          </legend>
          <div className="mt-2 flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="gender"
                value="male"
                defaultChecked
                className="h-4 w-4 accent-[color:var(--color-accent)]"
              />
              <span>{t("gender_male")}</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="gender"
                value="female"
                className="h-4 w-4 accent-[color:var(--color-accent)]"
              />
              <span>{t("gender_female")}</span>
            </label>
          </div>
          <span className="mt-1 block text-xs text-[color:var(--color-muted)]">
            {t("gender_help")}
          </span>
        </fieldset>

        <div className="block sm:col-span-2">
          <HebrewDatePicker
            gregorianName="death_date"
            hebrewName="hebrew_death_date"
            gregorianLabel={tFamily("field_death_date")}
            hebrewLabel={tFamily("field_hebrew_death_date")}
          />
        </div>
      </div>

      <div className="mt-4">
        <SubmitButton variant="primary" size="md" pendingLabel={t("creating")}>
          {t("submit")}
        </SubmitButton>
      </div>
    </form>
  );
}

async function CreatedNotice({
  token,
  siteUrl,
  locale,
}: {
  token: string;
  siteUrl: string;
  locale: string;
}) {
  const t = await getTranslations("admin.created_notice");
  // Embed the locale in the shared family-edit URL so the recipient lands in
  // the same language the admin was viewing in. They can switch via the
  // language switcher once on the page if desired.
  const familyUrl = `${siteUrl}/${locale}/family/${token}`;
  return (
    <div className="mb-8 rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
      <p className="text-xs uppercase tracking-[0.2em]">{t("label")}</p>
      <p className="mt-1 font-serif text-lg">{t("title")}</p>
      <code className="mt-2 block break-all rounded bg-white px-3 py-2 text-sm">
        {familyUrl}
      </code>
      <p className="mt-2 text-xs">{t("warning")}</p>
    </div>
  );
}
