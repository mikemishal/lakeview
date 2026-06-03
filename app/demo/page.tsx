"use client";

// Public, no-login demo of the Lakeview owner and provider dashboards.
// All data here is sample data held in component state. Nothing is fetched and
// nothing is saved. The provider job actions advance status locally so visitors
// can feel the accept, start, complete flow.
//
// Route: /demo (public, not covered by the auth middleware).

import Link from "next/link";
import { useMemo, useState } from "react";
import { useToast } from "@/components/Toast";

type JobStatus =
  | "needs_assignment"
  | "assigned"
  | "accepted"
  | "in_progress"
  | "completed";

type IssueFlag = "maintenance" | "restock" | "damage";

type DemoJob = {
  id: string;
  property: string;
  checkoutDate: string; // dd-MM-yyyy for display
  isTurnover: boolean;
  status: JobStatus;
  provider: string | null;
  issue: IssueFlag | null;
};

type DemoProperty = {
  id: string;
  name: string;
  address: string;
  beds: number;
  baths: number;
};

type DemoProvider = {
  id: string;
  name: string;
  company: string;
  service: "cleaning" | "maintenance";
};

const PROPERTIES: DemoProperty[] = [
  { id: "p1", name: "Birch Cabin", address: "12 Birch Way, Lake Geneva", beds: 3, baths: 2 },
  { id: "p2", name: "Lakeside Loft", address: "88 Shore Dr, Lake Geneva", beds: 1, baths: 1 },
  { id: "p3", name: "Pine Cottage", address: "5 Pine Ct, Lake Geneva", beds: 2, baths: 1 },
];

const PROVIDERS: DemoProvider[] = [
  { id: "v1", name: "Sam Rivera", company: "Sparkle Clean Co", service: "cleaning" },
  { id: "v2", name: "Dana Cole", company: "Fresh Start Cleaning", service: "cleaning" },
  { id: "v3", name: "Pat Quinn", company: "FixIt Maintenance", service: "maintenance" },
];

const INITIAL_JOBS: DemoJob[] = [
  { id: "j1", property: "Birch Cabin", checkoutDate: "08-06-2026", isTurnover: true, status: "needs_assignment", provider: null, issue: null },
  { id: "j2", property: "Lakeside Loft", checkoutDate: "05-06-2026", isTurnover: false, status: "assigned", provider: "Sparkle Clean Co", issue: null },
  { id: "j3", property: "Pine Cottage", checkoutDate: "12-06-2026", isTurnover: false, status: "accepted", provider: "Sparkle Clean Co", issue: null },
  { id: "j4", property: "Birch Cabin", checkoutDate: "02-06-2026", isTurnover: false, status: "in_progress", provider: "Fresh Start Cleaning", issue: null },
  { id: "j5", property: "Lakeside Loft", checkoutDate: "30-05-2026", isTurnover: false, status: "completed", provider: "Sparkle Clean Co", issue: "restock" },
];

const STATUS_LABEL: Record<JobStatus, string> = {
  needs_assignment: "Needs assignment",
  assigned: "Assigned",
  accepted: "Accepted",
  in_progress: "In progress",
  completed: "Completed",
};

const STATUS_PILL: Record<JobStatus, string> = {
  needs_assignment: "border-amber-300 bg-amber-50 text-amber-800",
  assigned: "border-blue-300 bg-blue-50 text-blue-700",
  accepted: "border-indigo-300 bg-indigo-50 text-indigo-700",
  in_progress: "border-purple-300 bg-purple-50 text-purple-700",
  completed: "border-emerald-300 bg-emerald-50 text-emerald-700",
};

const ISSUE_LABEL: Record<IssueFlag, string> = {
  maintenance: "Maintenance",
  restock: "Restock",
  damage: "Damage",
};

// The provider acting in this demo.
const DEMO_PROVIDER_COMPANY = "Sparkle Clean Co";

function StatusPill({ status }: { status: JobStatus }) {
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_PILL[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}

export default function DemoPage() {
  const [role, setRole] = useState<"owner" | "provider">("owner");
  const [jobs, setJobs] = useState<DemoJob[]>(INITIAL_JOBS);
  const { notify } = useToast();

  const isOwner = role === "owner";
  const accentText = isOwner ? "text-blue-700" : "text-emerald-700";
  const accentBorder = isOwner ? "border-blue-500" : "border-emerald-500";

  // Jobs visible to the demo provider.
  const providerJobs = useMemo(
    () => jobs.filter((job) => job.provider === DEMO_PROVIDER_COMPANY),
    [jobs]
  );

  const ownerKpis = useMemo(() => {
    const needsAssignment = jobs.filter((j) => j.status === "needs_assignment").length;
    const turnovers = jobs.filter((j) => j.isTurnover).length;
    const issues = jobs.filter((j) => j.issue !== null).length;
    return { needsAssignment, turnovers, issues };
  }, [jobs]);

  // Advance a provider job to the next status in the accept -> start -> complete flow.
  function advanceJob(id: string) {
    const job = jobs.find((item) => item.id === id);
    if (!job) return;
    const next: Partial<Record<JobStatus, JobStatus>> = {
      assigned: "accepted",
      accepted: "in_progress",
      in_progress: "completed",
    };
    const nextStatus = next[job.status];
    if (!nextStatus) return;
    setJobs((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: nextStatus } : item))
    );
    notify("success", `${job.property}: ${STATUS_LABEL[nextStatus]}`);
  }

  function nextActionLabel(status: JobStatus): string | null {
    if (status === "assigned") return "Accept";
    if (status === "accepted") return "Start";
    if (status === "in_progress") return "Complete";
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className={`border-b-2 ${accentBorder} bg-white`}>
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-700">Lakeview</span>
            <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              Demo
            </span>
          </div>

          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
            <button
              onClick={() => setRole("owner")}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                isOwner ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-white"
              }`}
            >
              Owner view
            </button>
            <button
              onClick={() => setRole("provider")}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                !isOwner ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-white"
              }`}
            >
              Provider view
            </button>
          </div>

          <Link
            href="/sign-up"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Create an account
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          This is a live demo with sample data. Nothing here is saved. Switch between the owner and
          provider views above. In the provider view you can accept, start, and complete jobs.
        </div>

        {isOwner ? (
          <section className="space-y-6">
            <div>
              <p className={`text-sm font-medium uppercase tracking-wide ${accentText}`}>Owner workspace</p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Owner Dashboard</h1>
              <p className="text-sm text-slate-600">Jordan Lake, Lakeview Rentals</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiCard label="Properties" value={String(PROPERTIES.length)} accent="text-blue-700" />
              <KpiCard label="Upcoming turnovers" value={String(ownerKpis.turnovers)} accent="text-blue-700" />
              <KpiCard label="Needs assignment" value={String(ownerKpis.needsAssignment)} accent="text-amber-700" />
              <KpiCard label="Open issues" value={String(ownerKpis.issues)} accent="text-rose-700" />
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Cleaning jobs</h2>
              <div className="space-y-2">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">{job.property}</p>
                        {job.isTurnover ? (
                          <span className="rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                            Same-day turnover
                          </span>
                        ) : null}
                        {job.issue ? (
                          <span className="rounded-full border border-orange-300 bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700">
                            {ISSUE_LABEL[job.issue]} flagged
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-500">
                        Checkout {job.checkoutDate}
                        {job.provider ? ` | ${job.provider}` : " | unassigned"}
                      </p>
                    </div>
                    <StatusPill status={job.status} />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h2 className="mb-3 text-lg font-semibold text-slate-900">Properties</h2>
                <div className="space-y-2">
                  {PROPERTIES.map((p) => (
                    <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="font-semibold text-slate-900">{p.name}</p>
                      <p className="text-sm text-slate-500">{p.address}</p>
                      <p className="mt-1 text-xs text-slate-400">{p.beds} bed, {p.baths} bath</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-lg font-semibold text-slate-900">Providers</h2>
                <div className="space-y-2">
                  {PROVIDERS.map((v) => (
                    <div key={v.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="font-semibold text-slate-900">{v.company}</p>
                      <p className="text-sm text-slate-500">{v.name}</p>
                      <span className="mt-1 inline-block rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600">
                        {v.service}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="space-y-6">
            <div>
              <p className={`text-sm font-medium uppercase tracking-wide ${accentText}`}>Provider workspace</p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Provider Dashboard</h1>
              <p className="text-sm text-slate-600">Signed in as Sparkle Clean Co</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <KpiCard
                label="Assigned to you"
                value={String(providerJobs.filter((j) => j.status !== "completed").length)}
                accent="text-emerald-700"
              />
              <KpiCard
                label="In progress"
                value={String(providerJobs.filter((j) => j.status === "in_progress").length)}
                accent="text-purple-700"
              />
              <KpiCard
                label="Completed"
                value={String(providerJobs.filter((j) => j.status === "completed").length)}
                accent="text-emerald-700"
              />
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Your job queue</h2>
              <div className="space-y-2">
                {providerJobs.map((job) => {
                  const action = nextActionLabel(job.status);
                  return (
                    <div
                      key={job.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">{job.property}</p>
                          {job.isTurnover ? (
                            <span className="rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                              Same-day turnover
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-sm text-slate-500">Checkout {job.checkoutDate}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusPill status={job.status} />
                        {action ? (
                          <button
                            onClick={() => advanceJob(job.id)}
                            className="min-h-11 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                          >
                            {action}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Tip: accept a job, then start it, then complete it to see the status change.
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
