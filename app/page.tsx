import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <section className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Project Lakeview</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Operations Dashboard</h1>
        <p className="max-w-3xl text-sm text-slate-600 sm:text-base">
          Short-term rental operations dashboard for Airbnb calendar sync, cleaning jobs, and provider workflows.
        </p>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <Link
          href="/owner"
          className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Owner</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Owner Dashboard</h2>
          <p className="mt-2 text-sm text-slate-600">
            Manage properties, sync Airbnb calendars, generate cleaning jobs, and coordinate providers.
          </p>
          <p className="mt-4 text-sm font-medium text-slate-900 group-hover:underline">Go to Owner Dashboard</p>
        </Link>

        <Link
          href="/provider"
          className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Provider</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Provider Dashboard</h2>
          <p className="mt-2 text-sm text-slate-600">
            View assigned cleaning jobs, update job status, and manage notes from a cleaner-focused workflow.
          </p>
          <p className="mt-4 text-sm font-medium text-slate-900 group-hover:underline">Go to Provider Dashboard</p>
        </Link>
      </section>
    </main>
  );
}
