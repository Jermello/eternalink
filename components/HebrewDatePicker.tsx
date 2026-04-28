"use client";

import { HDate } from "@hebcal/core";
import { useTranslations } from "next-intl";
import { useState } from "react";

type Props = {
  /** Form name for the Gregorian date input (yyyy-mm-dd). */
  gregorianName: string;
  /** Form name for the Hebrew date input (free-form Hebrew text). */
  hebrewName: string;
  /** Initial Gregorian value, ISO date string (yyyy-mm-dd) or empty. */
  defaultGregorian?: string;
  /**
   * Initial Hebrew text. We use it both to show legacy data (memorials
   * created before the picker existed) and to seed manual-mode if the
   * stored Hebrew text doesn't look like the auto-derived one.
   */
  defaultHebrew?: string;
  gregorianLabel: string;
  hebrewLabel: string;
};

/**
 * Composite date picker for civil + Hebrew dates. The user picks a
 * Gregorian date (browser-native `<input type="date">`) and we derive
 * the Hebrew date in real time via `@hebcal/core`. The Hebrew rendering
 * uses `renderGematriya(true)` (gematria letters, no nikud) — that's
 * the format families recognise on yahrzeit cards.
 *
 * Two escape hatches:
 *  - "Après la tombée du jour" toggle: in halakha the Hebrew day starts
 *    at sunset, so a Gregorian "Tuesday evening" funeral happens on
 *    *Wednesday's* Hebrew date. We expose this as a boolean rather than
 *    a real time picker because that's how families verbalise it.
 *  - "Manual" mode: lets the admin override the rendered Hebrew text
 *    with anything they want (uncommon spellings, family preference,
 *    legacy data).
 *
 * The picker submits via two form fields:
 *  - `gregorianName` → ISO date or empty.
 *  - `hebrewName`    → rendered Hebrew text (or the manual override).
 */
export function HebrewDatePicker({
  gregorianName,
  hebrewName,
  defaultGregorian = "",
  defaultHebrew = "",
  gregorianLabel,
  hebrewLabel,
}: Props) {
  const t = useTranslations("date_picker");

  const [gregorian, setGregorian] = useState(defaultGregorian);
  const [afterSunset, setAfterSunset] = useState(false);
  // If we have legacy Hebrew text but no Gregorian date, drop straight
  // into manual mode so we don't silently wipe the existing value.
  const [manualMode, setManualMode] = useState(
    !defaultGregorian && Boolean(defaultHebrew)
  );
  const [manualHebrew, setManualHebrew] = useState(defaultHebrew);

  const computedHebrew = renderHebrewFromIso(gregorian, afterSunset);
  const submittedHebrew = manualMode ? manualHebrew : computedHebrew;

  return (
    <fieldset className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="block text-sm text-[color:var(--color-ink-soft)]">
            {gregorianLabel}
          </span>
          <input
            type="date"
            name={gregorianName}
            value={gregorian}
            onChange={(e) => setGregorian(e.target.value)}
            className="mt-1 h-12 w-full rounded-md border border-[color:var(--color-line)] bg-white px-3 text-base shadow-sm focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-accent)]"
          />
        </label>

        <div>
          <span className="block text-sm text-[color:var(--color-ink-soft)]">
            {hebrewLabel}
          </span>
          {manualMode ? (
            <input
              type="text"
              dir="rtl"
              lang="he"
              value={manualHebrew}
              onChange={(e) => setManualHebrew(e.target.value)}
              placeholder={t("manual_placeholder")}
              className="mt-1 h-12 w-full rounded-md border border-[color:var(--color-line)] bg-white px-3 font-serif text-lg shadow-sm focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-accent)]"
            />
          ) : (
            <div
              dir="rtl"
              lang="he"
              aria-live="polite"
              className="mt-1 flex h-12 w-full items-center rounded-md border border-[color:var(--color-line)] bg-[color:var(--color-accent-soft)]/40 px-3 font-serif text-lg text-[color:var(--color-ink)]"
            >
              {computedHebrew || (
                <span
                  className="text-sm text-[color:var(--color-muted)]"
                  dir="ltr"
                >
                  {t("preview_empty")}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs">
        <label
          className={`inline-flex items-center gap-2 ${
            manualMode
              ? "text-[color:var(--color-muted)]"
              : "text-[color:var(--color-ink-soft)]"
          }`}
        >
          <input
            type="checkbox"
            checked={afterSunset}
            onChange={(e) => setAfterSunset(e.target.checked)}
            disabled={manualMode}
            className="h-4 w-4 accent-[color:var(--color-accent)]"
          />
          <span>{t("after_sunset")}</span>
        </label>
        <button
          type="button"
          onClick={() => setManualMode((m) => !m)}
          className="text-[color:var(--color-accent)] underline underline-offset-2"
        >
          {manualMode ? t("auto_mode") : t("manual_mode")}
        </button>
      </div>

      {/* Always submit the resolved Hebrew text, regardless of mode, so
          server actions don't need to know about the toggle. */}
      <input type="hidden" name={hebrewName} value={submittedHebrew} />
    </fieldset>
  );
}

/**
 * Compute the Hebrew rendering for an ISO Gregorian date. Returns ""
 * when the input is empty or invalid so callers can render a
 * placeholder. We deliberately use `new Date(y, m-1, d)` (local
 * midnight) — the Gregorian/Hebrew alignment is the same for the whole
 * civil day, so timezone of the browser doesn't matter as long as we
 * stay in local time on both sides.
 */
function renderHebrewFromIso(iso: string, afterSunset: boolean): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return "";
  if (afterSunset) date.setDate(date.getDate() + 1);
  try {
    const hd = new HDate(date);
    return hd.renderGematriya(true);
  } catch {
    return "";
  }
}
