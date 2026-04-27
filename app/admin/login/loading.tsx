export default function AdminLoginLoading() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10 sm:px-6 sm:py-14">
      <div className="animate-pulse space-y-4">
        <div className="h-3 w-20 rounded bg-[color:var(--color-line)]" />
        <div className="h-8 w-48 rounded bg-[color:var(--color-line)]" />
        <div className="h-4 w-full rounded bg-[color:var(--color-line)]" />
        <div className="h-12 rounded bg-[color:var(--color-line)]" />
        <div className="h-10 w-32 rounded-full bg-[color:var(--color-line)]" />
      </div>
    </main>
  );
}
