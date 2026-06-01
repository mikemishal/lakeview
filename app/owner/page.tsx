import { Suspense } from "react";
import OwnerDashboardClient from "./OwnerDashboardClient";

export default function OwnerPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600 shadow-sm">
            Loading owner dashboard...
          </section>
        </main>
      }
    >
      <OwnerDashboardClient />
    </Suspense>
  );
}
