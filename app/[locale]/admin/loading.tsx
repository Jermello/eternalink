export default function AdminLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:px-6 sm:py-14">
      <div className="animate-pulse">
        <div className="mb-10">
          <div className="h-3 w-16 rounded bg-[color:var(--color-line)]" />
          <div className="mt-3 h-8 w-72 rounded bg-[color:var(--color-line)]" />
          <div className="mt-3 h-4 w-full max-w-md rounded bg-[color:var(--color-line)]" />
        </div>

        <div className="rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5">
          <div className="h-5 w-40 rounded bg-[color:var(--color-line)]" />
          <div className="mt-3 h-3 w-full max-w-md rounded bg-[color:var(--color-line)]" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="h-12 rounded bg-[color:var(--color-line)]" />
            <div className="h-12 rounded bg-[color:var(--color-line)]" />
          </div>
          <div className="mt-4 h-10 w-40 rounded-full bg-[color:var(--color-line)]" />
        </div>

        <div className="mt-12">
          <div className="h-5 w-32 rounded bg-[color:var(--color-line)]" />
          <ul className="mt-4 divide-y divide-[color:var(--color-line)] rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-5 w-48 rounded bg-[color:var(--color-line)]" />
                  <div className="h-3 w-64 rounded bg-[color:var(--color-line)]" />
                  <div className="h-3 w-40 rounded bg-[color:var(--color-line)]" />
                </div>
                <div className="flex shrink-0 gap-2">
                  <div className="h-9 w-24 rounded-full bg-[color:var(--color-line)]" />
                  <div className="h-9 w-24 rounded-full bg-[color:var(--color-line)]" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
