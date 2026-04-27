"use client";

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
  return (
    <form
      action={deleteMemorialAction}
      onSubmit={(e) => {
        const answer = prompt(
          `Permanently delete "${name}"?\n\nThis cannot be undone. The memorial page, the family-edit link, and all uploaded photos will be removed.\n\nType DELETE to confirm:`
        );
        if (answer !== "DELETE") {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="danger" pendingLabel="Deleting…">
        Delete
      </SubmitButton>
    </form>
  );
}
