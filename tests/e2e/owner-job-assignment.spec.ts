import { test, expect } from "@playwright/test";
import { ensureE2EWorkflowReady, ensureOwnerOnboardingOrDashboard, goToJobs, clickViewJobsAndWait } from "./helpers/workflow";
import { attachConsoleDiagnostics, criticalStep, failureEvidenceHint } from "./helpers/diagnostics";

// ensureE2EWorkflowReady performs several API-heavy steps; give extra time
// so cold-server runs don't exhaust the global 60 s budget.
test.setTimeout(120_000);

test("owner can assign a cleaning job to provider", async ({ page }, testInfo) => {
  await attachConsoleDiagnostics(page);

  await criticalStep("Owner signs in", async () => {
    await ensureOwnerOnboardingOrDashboard(page);
  }, "Owner sign-in failed");

  await criticalStep(
    "Owner assigns provider to E2E job",
    async () => {
      await ensureE2EWorkflowReady(page);
      await goToJobs(page);
      await clickViewJobsAndWait(page);

      // The CleaningJobCard status badge shows "Assigned" or "Waiting for provider" for assigned jobs
      const assignedStatusBadge = page
        .locator("article span")
        .filter({ hasText: /^Assigned$|^Waiting for provider$|^Accepted$/ })
        .first();
      await expect(assignedStatusBadge).toBeVisible({ timeout: 20000 });
    },
    `Job assignment failed. ${failureEvidenceHint(testInfo)}`
  );
});
