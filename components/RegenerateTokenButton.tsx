"use client";

import { useTranslations } from "next-intl";

import { regenerateTokenAction } from "@/lib/actions";
import { SubmitButton } from "./SubmitButton";

/**
 * Regenerates the family-edit token for a memorial. Used when the family
 * loses their link, or when we want to revoke access. The previous token is
 * permanently invalidated, so we gate the action behind a native confirm()
 * to avoid a slip of the mouse.
 */
export function RegenerateTokenButton({ id }: { id: string }) {
  const t = useTranslations("admin.list");
  return (
    <form
      action={regenerateTokenAction}
      onSubmit={(e) => {
        if (!confirm(t("regenerate_confirm"))) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="ghost" pendingLabel={t("generating")}>
        {t("new_family_link")}
      </SubmitButton>
    </form>
  );
}
