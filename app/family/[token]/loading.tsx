export default function FamilyLoading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10 sm:px-6 sm:py-14">
      <div className="animate-pulse">
        <div className="mb-10">
          <div className="h-3 w-24 rounded bg-[color:var(--color-line)]" />
          <div className="mt-3 h-8 w-3/4 rounded bg-[color:var(--color-line)]" />
          <div className="mt-3 h-4 w-full max-w-md rounded bg-[color:var(--color-line)]" />
        </div>

        <div className="space-y-12">
          <div className="rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5">
            <div className="h-3 w-24 rounded bg-[color:var(--color-line)]" />
            <div className="mt-2 h-5 w-40 rounded bg-[color:var(--color-line)]" />
            <div className="mt-4 h-3 w-full rounded bg-[color:var(--color-line)]" />
          </div>

          <div className="space-y-5">
            <div className="h-5 w-32 rounded bg-[color:var(--color-line)]" />
            <div className="h-12 rounded bg-[color:var(--color-line)]" />
            <div className="h-12 rounded bg-[color:var(--color-line)]" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="h-12 rounded bg-[color:var(--color-line)]" />
              <div className="h-12 rounded bg-[color:var(--color-line)]" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="h-5 w-32 rounded bg-[color:var(--color-line)]" />
            <div className="h-40 rounded bg-[color:var(--color-line)]" />
          </div>

          <div className="h-12 w-44 rounded-full bg-[color:var(--color-line)]" />
        </div>
      </div>
    </main>
  );
}
