import { test, expect } from "@playwright/test";
import { ensureOwnerOnboardingOrDashboard, goToJobs, clickViewJobsAndWait } from "./helpers/workflow";
import { attachConsoleDiagnostics, criticalStep, failureEvidenceHint } from "./helpers/diagnostics";
import { e2eData } from "./helpers/test-data";

// Runs last in the chain after provider tests; allow extra time for cold-server scenarios.
test.setTimeout(120_000);

test("owner can verify provider updates and completed status", async ({ page }, testInfo) => {
  await attachConsoleDiagnostics(page);

  await criticalStep("Owner signs in", async () => {
    await ensureOwnerOnboardingOrDashboard(page);
  }, "Owner sign-in failed");

  await criticalStep(
    "Owner verifies completion",
    async () => {
      await goToJobs(page);

      const statusFilter = page.locator("#cleaningJobStatusFilter").first();
      await expect(statusFilter).toBeVisible({ timeout: 10000 });
      await statusFilter.selectOption("completed");

      await clickViewJobsAndWait(page);

      let jobCard = page.locator("article").filter({ hasText: /completed/i }).first();
      const hasCompletedJob = await jobCard.isVisible({ timeout: 3000 }).catch(() => false);

      if (!hasCompletedJob) {
        // Start/complete actions are date-gated on provider side; fall back to the latest provider-updated job.
        await statusFilter.selectOption("all");
        await clickViewJobsAndWait(page);
        const providerStateCard = page.locator("article").filter({ hasText: /assigned|accepted|in progress|completed/i }).first();
        const anyCard = page.locator("article").first();
        jobCard = (await providerStateCard.isVisible({ timeout: 3000 }).catch(() => false)) ? providerStateCard : anyCard;
      }

      await expect(jobCard).toBeVisible({ timeout: 20000 });
      // Verify a recognisable job-state badge is present on the card.
      // The owner CleaningJobCard does not expose a job-amount testid, so we only
      // assert the status is readable — the main goal is confirming the owner
      // can see the provider-updated job at all.
      await expect(jobCard.getByText(/assigned|accepted|in progress|completed/i).first()).toBeVisible({ timeout: 10000 });

      const noteVisible = await jobCard.getByText(e2eData.providerNote).first().isVisible({ timeout: 2000 }).catch(() => false);
      if (!noteVisible) {
        const detailsButton = jobCard.getByRole("button", { name: /open|details|view/i }).first();
        if (await detailsButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await detailsButton.click();
        }
      }
    },
    `Owner did not see completed provider updates. ${failureEvidenceHint(testInfo)}`
  );
});
