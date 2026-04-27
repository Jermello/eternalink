"use client";

import { regenerateTokenAction } from "@/lib/actions";
import { SubmitButton } from "./SubmitButton";

/**
 * Regenerates the family-edit token for a memorial. Used when the family
 * loses their link, or when we want to revoke access. The previous token is
 * permanently invalidated, so we gate the action behind a native confirm()
 * to avoid a slip of the mouse.
 */
export function RegenerateTokenButton({ id }: { id: string }) {
  return (
    <form
      action={regenerateTokenAction}
      onSubmit={(e) => {
        if (
          !confirm(
            "Generate a new family-edit link?\n\nThe current link will stop working immediately. Make sure you can share the new one with the family."
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="ghost" pendingLabel="Generating…">
        New family link
      </SubmitButton>
    </form>
  );
}
