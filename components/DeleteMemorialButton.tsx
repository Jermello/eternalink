"use client";

import { deleteMemorialAction } from "@/lib/actions";

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
      <button
        type="submit"
        className="inline-flex h-9 items-center rounded-full border border-red-200 px-4 text-xs font-medium text-red-700 transition hover:border-red-700 hover:bg-red-700 hover:text-white"
      >
        Delete
      </button>
    </form>
  );
}
