import type { Metadata } from "next";
import Link from "next/link";

import { DeleteMemorialButton } from "@/components/DeleteMemorialButton";
import { RegenerateTokenButton } from "@/components/RegenerateTokenButton";
import { SetupNotice } from "@/components/SetupNotice";
import { SubmitButton } from "@/components/SubmitButton";
import {
  createMemorialAction,
  logoutAction,
  togglePublishAction,
} from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { fetchAllMemorials } from "@/lib/queries";
import { isServiceRoleConfigured } from "@/lib/supabase";
import { formatCivilDate, getSiteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin · EternaLink",
  robots: { index: false, follow: false },
};

export default async function AdminPage(
  props: PageProps<"/admin">
) {
  // Defense in depth: the proxy already redirected to /admin/login when no
  // cookie is present, but we still cryptographically verify the session
  // here before rendering or running any server actions.
  await requireAdmin();

  if (!isServiceRoleConfigured()) {
    return <SetupNotice context="The admin dashboard" />;
  }

  const sp = await props.searchParams;
  const createdToken =
    typeof sp.created === "string" ? sp.created : undefined;
  const justDeleted = sp.deleted === "1";

  const memorials = await fetchAllMemorials();
  const siteUrl = getSiteUrl();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:px-6 sm:py-14">
      <header className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
            Admin
          </p>
          <h1 className="mt-1 font-serif text-3xl">EternaLink memorials</h1>
          <p className="mt-2 text-sm text-[color:var(--color-ink-soft)]">
            Create new memorials and manage publication. The family-edit link
            is unguessable and acts as the credential — share it only with
            the family.
          </p>
        </div>
        <form action={logoutAction} className="shrink-0">
          <SubmitButton variant="ghost" pendingLabel="Signing out…">
            Sign out
          </SubmitButton>
        </form>
      </header>

      {justDeleted ? (
        <div className="mb-8 rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-accent-soft)] p-4 text-sm text-[color:var(--color-ink)]">
          Memorial deleted.
        </div>
      ) : null}

      {createdToken ? (
        <CreatedNotice token={createdToken} siteUrl={siteUrl} />
      ) : null}

      <CreateMemorialForm />

      <section className="mt-12">
        <h2 className="font-serif text-xl">Memorials</h2>

        {memorials.length === 0 ? (
          <p className="mt-3 text-sm text-[color:var(--color-ink-soft)]">
            No memorials yet. Create the first one above.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[color:var(--color-line)] rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
            {memorials.map((m) => {
              const name = m.civil_name || m.hebrew_name || m.slug;
              return (
                <li
                  key={m.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-serif text-lg">
                      {name}{" "}
                      {m.is_published ? (
                        <span className="ml-2 align-middle rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-800">
                          Published
                        </span>
                      ) : (
                        <span className="ml-2 align-middle rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-800">
                          Draft
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--color-ink-soft)]">
                      Slug: <code>{m.slug}</code> · Created{" "}
                      {formatCivilDate(m.created_at)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm">
                      <Link
                        href={`/m/${m.slug}`}
                        className="text-[color:var(--color-accent)] underline underline-offset-4"
                      >
                        Public page
                      </Link>
                      <Link
                        href={`/family/${m.family_token}`}
                        className="text-[color:var(--color-accent)] underline underline-offset-4"
                      >
                        Edit content
                      </Link>
                      <a
                        href={`/api/qr/${m.slug}`}
                        target="_blank"
                        rel="noopener"
                        className="text-[color:var(--color-accent)] underline underline-offset-4"
                      >
                        QR code
                      </a>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <form action={togglePublishAction}>
                      <input type="hidden" name="id" value={m.id} />
                      <input
                        type="hidden"
                        name="publish"
                        value={String(!m.is_published)}
                      />
                      <SubmitButton
                        variant="outline"
                        pendingLabel={
                          m.is_published ? "Unpublishing…" : "Publishing…"
                        }
                      >
                        {m.is_published ? "Unpublish" : "Publish"}
                      </SubmitButton>
                    </form>
                    <RegenerateTokenButton id={m.id} />
                    <DeleteMemorialButton id={m.id} name={name} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

function CreateMemorialForm() {
  return (
    <form
      action={createMemorialAction}
      className="rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5"
    >
      <h2 className="font-serif text-xl">New memorial</h2>
      <p className="mt-1 text-sm text-[color:var(--color-ink-soft)]">
        Generate a slug and a private family-edit link. You can fill the
        biography and photos later from the family link.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm text-[color:var(--color-ink-soft)]">
            Civil name
          </span>
          <input
            name="civil_name"
            placeholder="e.g. Sarah Cohen"
            className="mt-1 w-full rounded-md border border-[color:var(--color-line)] bg-white p-2.5 text-base shadow-sm focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-accent)]"
          />
        </label>
        <label className="block">
          <span className="text-sm text-[color:var(--color-ink-soft)]">
            Hebrew name
          </span>
          <input
            name="hebrew_name"
            dir="rtl"
            lang="he"
            placeholder="שרה בת אברהם"
            className="mt-1 w-full rounded-md border border-[color:var(--color-line)] bg-white p-2.5 font-serif text-base shadow-sm focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-accent)]"
          />
        </label>
      </div>

      <div className="mt-4">
        <SubmitButton variant="primary" size="md" pendingLabel="Creating…">
          Create memorial
        </SubmitButton>
      </div>
    </form>
  );
}

function CreatedNotice({ token, siteUrl }: { token: string; siteUrl: string }) {
  const familyUrl = `${siteUrl}/family/${token}`;
  return (
    <div className="mb-8 rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
      <p className="text-xs uppercase tracking-[0.2em]">Family edit link</p>
      <p className="mt-1 font-serif text-lg">
        Share this private link with the family
      </p>
      <code className="mt-2 block break-all rounded bg-white px-3 py-2 text-sm">
        {familyUrl}
      </code>
      <p className="mt-2 text-xs">
        This link is the only way to edit the memorial. Any previous link has
        been invalidated. There is no password recovery — keep it safe.
      </p>
    </div>
  );
}
