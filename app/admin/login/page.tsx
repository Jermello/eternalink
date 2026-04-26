import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/LoginForm";
import { isAdminAuthConfigured, isAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin sign in · EternaLink",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  // Already signed in → bounce to the dashboard.
  if (await isAdminSession()) {
    redirect("/admin");
  }

  if (!isAdminAuthConfigured()) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
          Setup required
        </p>
        <h1 className="font-serif text-2xl">Admin password not set</h1>
        <p className="text-[color:var(--color-ink-soft)]">
          Set <code>ADMIN_PASSWORD</code> in <code>.env.local</code> (see{" "}
          <code>SUPABASE_SETUP.md</code>) and restart the dev server.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <header className="mb-8 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-muted)]">
          EternaLink
        </p>
        <h1 className="mt-1 font-serif text-3xl">Admin sign in</h1>
      </header>
      <LoginForm />
    </main>
  );
}
