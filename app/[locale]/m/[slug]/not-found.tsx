import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

export default async function MemorialNotFound() {
  const t = await getTranslations("memorial.not_found");
  const tCommon = await getTranslations("common");

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
        {t("label")}
      </p>
      <h1 className="font-serif text-2xl">{t("title")}</h1>
      <p className="text-[color:var(--color-ink-soft)]">{t("body")}</p>
      <Link
        href="/"
        className="mt-2 text-sm text-[color:var(--color-accent)] underline underline-offset-4"
      >
        {tCommon("back_home")}
      </Link>
    </main>
  );
}
