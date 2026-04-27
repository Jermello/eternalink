"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";

import { LOCALE_LABELS, routing, type Locale } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";

/**
 * Compact <select>-based language switcher. Native widget so it works on
 * mobile, in-keyboard, and inside RTL layouts without us re-implementing
 * focus traps. The route stays the same; only the locale prefix changes.
 */
export function LanguageSwitcher({
  className = "",
}: {
  className?: string;
}) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Locale;
    if (next === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <label
      className={`inline-flex items-center gap-2 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-1.5 text-xs text-[color:var(--color-ink-soft)] shadow-sm ${className}`}
    >
      <span aria-hidden="true">🌐</span>
      <select
        value={locale}
        onChange={onChange}
        className="appearance-none bg-transparent pe-1 text-xs font-medium text-[color:var(--color-ink)] focus:outline-none"
        aria-label="Language"
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc}>
            {LOCALE_LABELS[loc]}
          </option>
        ))}
      </select>
    </label>
  );
}
