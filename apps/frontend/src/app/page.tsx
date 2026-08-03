export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-6 font-sans text-zinc-900">
      <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
        Architecture Training
      </p>
      <h1 className="text-4xl font-semibold tracking-tight">Frontend placeholder</h1>
      <p className="max-w-md text-center text-zinc-600">
        Next.js app in a pnpm monorepo. Backend NestJS API runs on port 3001 by
        default.
      </p>
    </main>
  );
}
