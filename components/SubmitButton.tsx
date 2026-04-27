"use client";

import { useFormStatus } from "react-dom";

/**
 * Generic submit button that mirrors the parent <form>'s pending state via
 * `useFormStatus`. Use it for plain Server-Action forms that don't need
 * `useActionState` for return-value handling (e.g. publish toggles, delete,
 * logout). Renders a spinner and an alternate label while the action is
 * in flight.
 *
 * NOTE: useFormStatus only works when this component is rendered as a
 * descendant of a <form>. It will read the *closest* parent form's status.
 */
type Variant = "primary" | "outline" | "danger" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-[color:var(--color-ink)] text-white hover:bg-[color:var(--color-accent)]",
  outline:
    "border border-[color:var(--color-ink)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-ink)] hover:text-white",
  danger:
    "border border-red-200 text-red-700 hover:border-red-700 hover:bg-red-700 hover:text-white",
  ghost:
    "border border-[color:var(--color-line)] text-[color:var(--color-ink-soft)] hover:border-[color:var(--color-ink)] hover:text-[color:var(--color-ink)]",
};

const SIZES = {
  sm: "h-9 px-4 text-xs",
  md: "h-10 px-5 text-sm",
} as const;

export function SubmitButton({
  children,
  pendingLabel,
  variant = "outline",
  size = "sm",
  className = "",
}: {
  children: React.ReactNode;
  /** Label shown while the form is submitting. Falls back to children. */
  pendingLabel?: React.ReactNode;
  variant?: Variant;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium transition disabled:cursor-not-allowed disabled:opacity-70 ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
    >
      {pending ? (
        <>
          <Spinner />
          {pendingLabel ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}

function Spinner() {
  return (
    <svg
      className="mr-2 h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
