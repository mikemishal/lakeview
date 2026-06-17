import { test, expect } from "@playwright/test";
import { ensureOwnerOnboardingOrDashboard, ensureProviderVisibleInTeam, goToMyTeam } from "./helpers/workflow";
import { attachConsoleDiagnostics, criticalStep, failureEvidenceHint } from "./helpers/diagnostics";
import { e2eData } from "./helpers/test-data";

test("owner can add provider to My Team and set cleaning price", async ({ page }, testInfo) => {
  await attachConsoleDiagnostics(page);

  await criticalStep("Owner signs in", async () => {
    await ensureOwnerOnboardingOrDashboard(page);
  }, "Owner sign-in failed");

  await criticalStep(
    "Owner adds provider to My Team",
    async () => {
      await ensureProviderVisibleInTeam(page);
      await goToMyTeam(page);

      const providerOnTeam = page.locator("article").filter({ hasText: e2eData.providerEmail }).first();
      await expect(providerOnTeam).toBeVisible({ timeout: 20000 });
      await expect(providerOnTeam.getByText(/cleaning price/i).first()).toBeVisible({ timeout: 10000 });
    },
    `Provider was not available in My Team. ${failureEvidenceHint(testInfo)}`
  );
});
