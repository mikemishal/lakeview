import { test, expect } from "@playwright/test";
import {
  findOrCreateE2EProperty,
  ensureOwnerOnboardingOrDashboard,
  syncAndGenerateE2EPropertyDeltaAware,
} from "./helpers/workflow";
import { attachConsoleDiagnostics, criticalStep, failureEvidenceHint } from "./helpers/diagnostics";

test("owner can create/reuse test property and manually sync calendar", async ({ page }, testInfo) => {
  await attachConsoleDiagnostics(page);

  await criticalStep("Owner signs in", async () => {
    await ensureOwnerOnboardingOrDashboard(page);
  }, "Owner sign-in failed");

  await findOrCreateE2EProperty(page);

  await criticalStep(
    "Owner syncs and generates jobs with delta check",
    async () => {
      const generationMessage = await syncAndGenerateE2EPropertyDeltaAware(page);

      const noChangesPattern = /no new or changed jobs were found/i;
      if (noChangesPattern.test(generationMessage)) {
        await expect(page.locator('[data-testid="cleaning-job-generation-message"]').first()).toContainText(
          /no new or changed jobs were found/i
        );
      } else {
        await expect(page.locator('[data-testid="cleaning-job-generation-message"]').first()).toContainText(
          /created\s+\d+\s+cleaning jobs|updated\s+\d+\s+existing jobs/i
        );
      }
    },
    `Property delta sync/generation failed. ${failureEvidenceHint(testInfo)}`
  );
});
