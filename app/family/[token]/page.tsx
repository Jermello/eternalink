import type { Metadata } from "next";
import Link from "next/link";

import { EditForm } from "@/components/EditForm";
import { SetupNotice } from "@/components/SetupNotice";
import { fetchMemorialByToken } from "@/lib/queries";
import { isServiceRoleConfigured } from "@/lib/supabase";
import { getSiteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Family edit · EternaLink",
  robots: { index: false, follow: false },
};

export default async function FamilyEditPage(
  props: PageProps<"/family/[token]">
) {
  if (!isServiceRoleConfigured()) {
    return <SetupNotice context="The family edit page" />;
  }

  const { token } = await props.params;
  const memorial = await fetchMemorialByToken(token);

  if (!memorial) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
          Invalid link
        </p>
        <h1 className="font-serif text-2xl">This edit link is not valid.</h1>
        <p className="text-[color:var(--color-ink-soft)]">
          Family edit links are unique and unguessable. Double-check the URL,
          or ask the administrator for a fresh link.
        </p>
        <Link
          href="/"
          className="mt-2 text-sm text-[color:var(--color-accent)] underline underline-offset-4"
        >
          Back to home
        </Link>
      </main>
    );
  }

  const publicUrl = `${getSiteUrl()}/m/${memorial.slug}`;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10 sm:px-6 sm:py-14">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
          Family edit
        </p>
        <h1 className="mt-1 font-serif text-3xl">
          {memorial.civil_name || memorial.hebrew_name || "Memorial"}
        </h1>
        <p className="mt-2 text-sm text-[color:var(--color-ink-soft)]">
          Anyone with this link can edit the memorial. Keep it private to your
          family.
        </p>
      </header>

      <EditForm memorial={memorial} publicUrl={publicUrl} />
    </main>
  );
}
