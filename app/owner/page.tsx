import { Suspense } from "react";
import OwnerDashboardClient from "./OwnerDashboardClient";

export default function OwnerPage() {
  return (
    <Suspense fallback={<p>Loading owner dashboard...</p>}>
      <OwnerDashboardClient />
    </Suspense>
  );
}
