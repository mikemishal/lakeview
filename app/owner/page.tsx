import { Suspense } from "react";
import OwnerDashboardClient from "./OwnerDashboardClient";

export default function OwnerPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <section className="rounded-xl border border-[#E5E0D8] bg-white p-6 text-sm text-[#7A7060] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            Loading owner dashboard...
          </section>
        </main>
      }
    >
      <OwnerDashboardClient />
    </Suspense>
  );
}
