import Link from "next/link";
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-300">
              Project Lakeview
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">
              Short-term rental operations dashboard
            </h1>
            <p className="mt-4 max-w-2xl text-base text-slate-300">
              Manage Airbnb calendar sync, cleaning jobs, provider workflows,
              notifications, and owner/provider operations.
            </p>
          </div>

          <Show when="signed-in">
            <UserButton />
          </Show>
        </header>

        <Show when="signed-out">
          <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-lg">
            <h2 className="text-2xl font-semibold">Get started</h2>
            <p className="mt-2 text-sm text-slate-300">
              Sign in or create an account to continue.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <SignInButton mode="modal">
                <button className="rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400">
                  Sign in
                </button>
              </SignInButton>

              <SignUpButton mode="modal">
                <button className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200">
                  Sign up
                </button>
              </SignUpButton>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <Link
              href="/owner"
              className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-lg transition hover:border-sky-400"
            >
              <h2 className="text-xl font-semibold">Owner Dashboard</h2>
              <p className="mt-2 text-sm text-slate-300">
                Manage properties, jobs, providers, calendars, and issues.
              </p>
            </Link>

            <Link
              href="/provider"
              className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-lg transition hover:border-sky-400"
            >
              <h2 className="text-xl font-semibold">Provider Dashboard</h2>
              <p className="mt-2 text-sm text-slate-300">
                View assigned jobs, notifications, schedules, and action queues.
              </p>
            </Link>
          </section>
        </Show>

        <Show when="signed-in">
          <section className="rounded-2xl border border-sky-700 bg-sky-950/40 p-6 shadow-lg">
            <h2 className="text-2xl font-semibold">Manage account profiles</h2>
            <p className="mt-2 text-sm text-slate-300">
              Create or update your owner and provider profiles from one account.
            </p>
            <div className="mt-4">
              <Link
                href="/onboarding"
                className="inline-flex rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
              >
                Manage Profiles
              </Link>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <Link
              href="/owner"
              className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-lg transition hover:border-sky-400"
            >
              <h2 className="text-xl font-semibold">Owner Dashboard</h2>
              <p className="mt-2 text-sm text-slate-300">
                Manage properties, jobs, providers, calendars, and issues.
              </p>
            </Link>

            <Link
              href="/provider"
              className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-lg transition hover:border-sky-400"
            >
              <h2 className="text-xl font-semibold">Provider Dashboard</h2>
              <p className="mt-2 text-sm text-slate-300">
                View assigned jobs, notifications, schedules, and action queues.
              </p>
            </Link>
          </section>
        </Show>
      </div>
    </main>
  );
}