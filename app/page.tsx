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
        <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
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
            <div className="self-start sm:self-center">
              <UserButton />
            </div>
          </Show>
        </header>

        <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 shadow-lg">
          <h2 className="text-lg font-semibold">Install Lakeview on your phone</h2>
          <p className="mt-2 text-sm text-slate-300">
            Add Lakeview to your home screen for quicker access during turnovers and service jobs.
          </p>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>
              iPhone: Open Lakeview in Safari, tap Share, then Add to Home Screen.
            </li>
            <li>
              Android: Open Lakeview in Chrome, tap the menu, then Add to Home screen or Install app.
            </li>
          </ul>
        </section>

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