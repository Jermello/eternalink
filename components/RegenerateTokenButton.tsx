"use client";

import { regenerateTokenAction } from "@/lib/actions";

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
      <button
        type="submit"
        className="inline-flex h-9 items-center rounded-full border border-[color:var(--color-line)] px-4 text-xs font-medium text-[color:var(--color-ink-soft)] transition hover:border-[color:var(--color-ink)] hover:text-[color:var(--color-ink)]"
      >
        New family link
      </button>
    </form>
  );
}
