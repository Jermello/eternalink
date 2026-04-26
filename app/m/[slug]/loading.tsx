export default function MemorialLoading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-16 sm:px-6">
      <div className="animate-pulse space-y-6">
        <div className="mx-auto h-10 w-3/4 rounded bg-[color:var(--color-line)]" />
        <div className="mx-auto h-6 w-1/2 rounded bg-[color:var(--color-line)]" />
        <div className="mx-auto h-px w-12 bg-[color:var(--color-accent)]" />
        <div className="space-y-2 pt-8">
          <div className="h-3 w-full rounded bg-[color:var(--color-line)]" />
          <div className="h-3 w-5/6 rounded bg-[color:var(--color-line)]" />
          <div className="h-3 w-4/6 rounded bg-[color:var(--color-line)]" />
        </div>
      </div>
    </main>
  );
}
