import { test, expect } from "@playwright/test";
import { ensureProviderOnboardingOrWorkbench } from "./helpers/workflow";
import { attachConsoleDiagnostics, criticalStep, failureEvidenceHint } from "./helpers/diagnostics";

test("provider onboarding/profile is ready", async ({ page }, testInfo) => {
  await attachConsoleDiagnostics(page);

  await criticalStep(
    "Provider signs in and onboarding state resolves",
    async () => {
      await ensureProviderOnboardingOrWorkbench(page);
      await expect(page.getByRole("heading", { name: /provider workbench|provider/i }).first()).toBeVisible();
    },
    `Provider onboarding state could not be determined. ${failureEvidenceHint(testInfo)}`
  );
});
