import { test, expect } from "@playwright/test";
import { ensureOwnerOnboardingOrDashboard } from "./helpers/workflow";
import { attachConsoleDiagnostics, criticalStep, failureEvidenceHint } from "./helpers/diagnostics";

test("owner onboarding/profile is ready", async ({ page }, testInfo) => {
  await attachConsoleDiagnostics(page);

  await criticalStep(
    "Owner signs in and onboarding state resolves",
    async () => {
      await ensureOwnerOnboardingOrDashboard(page);
      await expect(page.locator('[data-testid="owner-dashboard"]')).toBeVisible();
    },
    `Owner onboarding state could not be determined. ${failureEvidenceHint(testInfo)}`
  );
});
