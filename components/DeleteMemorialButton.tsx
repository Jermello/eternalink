"use client";

import { useTranslations } from "next-intl";

import { deleteMemorialAction } from "@/lib/actions";
import { SubmitButton } from "./SubmitButton";

/**
 * Permanently deletes a memorial — DB row + storage folder. Destructive,
 * irreversible, gated by a typed-confirmation prompt that includes the
 * memorial's name to avoid wrong-row clicks.
 */
export function DeleteMemorialButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const t = useTranslations("admin.list");
  return (
    <form
      action={deleteMemorialAction}
      onSubmit={(e) => {
        const answer = prompt(t("delete_confirm", { name }));
        if (answer !== "DELETE") {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="danger" pendingLabel={t("deleting")}>
        {t("delete")}
      </SubmitButton>
    </form>
  );
}
