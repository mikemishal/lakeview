import { test, expect } from "@playwright/test";
import { ensureProviderOnboardingOrWorkbench, goToWorkQueue } from "./helpers/workflow";
import { attachConsoleDiagnostics, criticalStep, failureEvidenceHint } from "./helpers/diagnostics";

test("provider can see assigned job amount and accept from work queue", async ({ page }, testInfo) => {
  await attachConsoleDiagnostics(page);

  await criticalStep("Provider signs in", async () => {
    await ensureProviderOnboardingOrWorkbench(page);
  }, "Provider sign-in failed");

  await criticalStep(
    "Provider sees assigned job in work queue",
    async () => {
      await goToWorkQueue(page);

      // Provider job cards only appear when jobs are assigned to this provider
      const jobCard = page.locator('[data-testid="provider-job-card"]').first();
      await expect(jobCard).toBeVisible({
        timeout: 30000,
        // Provider queue may need a moment to load after assignment by owner
      });
      await expect(jobCard.getByTestId("job-amount")).toBeVisible({ timeout: 10000 });
    },
    `Provider did not see assigned job. ${failureEvidenceHint(testInfo)}`
  );

  await criticalStep(
    "Provider accepts assigned job",
    async () => {
      const jobCard = page.locator('[data-testid="provider-job-card"]').first();
      await expect(jobCard).toBeVisible({ timeout: 10000 });

      const acceptButton = jobCard.locator('[data-testid="accept-job-button"]').first();
      if (await acceptButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await acceptButton.click();
      }

      await expect(jobCard.getByText(/accepted|in progress|view details|completed/i).first()).toBeVisible({ timeout: 15000 });
    },
    `Provider accept action failed. ${failureEvidenceHint(testInfo)}`
  );
});
