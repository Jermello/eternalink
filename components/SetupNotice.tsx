import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

type ContextKey = "admin" | "family" | "memorial";

/**
 * Rendered everywhere Supabase is needed but not configured. Keeps the app
 * from crashing on first run and points the operator to the setup guide.
 *
 * `contextKey` selects the localized phrase explaining which surface needs
 * Supabase (admin dashboard / family edit page / memorial page).
 */
export async function SetupNotice({
  contextKey = "memorial",
}: {
  contextKey?: ContextKey;
}) {
  const t = await getTranslations("setup");
  const tCommon = await getTranslations("common");
  const context = t(`context_${contextKey}` as `context_${ContextKey}`);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
        {t("label")}
      </p>
      <h1 className="font-serif text-2xl text-[color:var(--color-ink)]">
        {t("supabase_title")}
      </h1>
      <p className="text-[color:var(--color-ink-soft)]">
        {t("supabase_body", { context })}
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
