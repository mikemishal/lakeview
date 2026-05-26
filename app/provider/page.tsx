import { Suspense } from "react";
import ProviderDashboardClient from "./ProviderDashboardClient";

export default function ProviderPage() {
  return (
    <Suspense fallback={<p>Loading provider dashboard...</p>}>
      <ProviderDashboardClient />
    </Suspense>
  );
}
