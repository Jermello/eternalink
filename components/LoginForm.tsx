"use client";

import { useActionState } from "react";

import { loginAction, type ActionResult } from "@/lib/actions";

const initial: ActionResult | null = null;

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <form
      action={action}
      className="space-y-4 rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-6 shadow-sm"
    >
      <label className="block">
        <span className="block text-sm text-[color:var(--color-ink-soft)]">
          Password
        </span>
        <input
          name="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          required
          className="mt-1 w-full rounded-md border border-[color:var(--color-line)] bg-white p-3 text-base shadow-sm focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-accent)]"
        />
      </label>

      {state && !state.ok ? (
        <p className="text-sm text-red-700">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 w-full items-center justify-center rounded-full bg-[color:var(--color-ink)] px-5 text-sm font-medium text-white transition hover:bg-[color:var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-center text-xs text-[color:var(--color-muted)]">
        Sessions last 14 days.
      </p>
    </form>
  );
}
