"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Link } from "@/i18n/navigation";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");
  const tCommon = useTranslations("common");

  useEffect(() => {
    console.error(error);
  }, [error]);

  // The default Server Action body limit (configured in next.config.ts) is
  // 12 MB; if a user somehow bypasses the client check and hits it, the
  // bundler surfaces a generic "Body exceeded" error. Pattern-match it so
  // we can show the family something actionable instead of a stack trace.
  const isBodyTooLarge = /Body exceeded|413|payload too large/i.test(
    error.message ?? ""
  );

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
        {t("label")}
      </p>
      <h1 className="font-serif text-2xl">
        {isBodyTooLarge ? t("title_too_large") : t("title")}
      </h1>
      <p className="text-sm text-[color:var(--color-ink-soft)]">
        {isBodyTooLarge
          ? t("body_too_large")
          : error.message || t("fallback")}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="inline-flex h-10 items-center rounded-full border border-[color:var(--color-ink)] px-5 text-sm font-medium hover:bg-[color:var(--color-ink)] hover:text-white"
        >
          {t("try_again")}
        </button>
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-full px-5 text-sm font-medium text-[color:var(--color-ink-soft)] underline underline-offset-4 hover:text-[color:var(--color-ink)]"
        >
          {tCommon("back_home")}
        </Link>
      </div>
      {error.digest ? (
        <p className="mt-6 text-xs text-[color:var(--color-muted)]">
          {t("reference", { digest: error.digest })}
        </p>
      ) : null}
    </main>
  );
}
