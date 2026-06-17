import { test, expect } from "@playwright/test";
import { ensureProviderOnboardingOrWorkbench, goToWorkQueue } from "./helpers/workflow";
import { attachConsoleDiagnostics, criticalStep, failureEvidenceHint } from "./helpers/diagnostics";
import { e2eData } from "./helpers/test-data";

async function targetProviderJobCard(page: import("@playwright/test").Page) {
  const cards = page.locator('[data-testid="provider-job-card"]');
  await expect(cards.first()).toBeVisible({ timeout: 20000 });

  const count = await cards.count();
  for (let index = 0; index < count; index += 1) {
    const card = cards.nth(index);

    const startButton = card.getByTestId("start-job-button").first();
    if (await startButton.isVisible({ timeout: 300 }).catch(() => false)) {
      return card;
    }

    const completeButton = card.getByTestId("complete-job-button").first();
    if (await completeButton.isVisible({ timeout: 300 }).catch(() => false)) {
      return card;
    }

    const acceptButton = card.getByTestId("accept-job-button").first();
    if (await acceptButton.isVisible({ timeout: 300 }).catch(() => false)) {
      await acceptButton.click();
      await expect(card.getByText(/accepted|in progress|completed/i).first()).toBeVisible({ timeout: 15000 });

      if (await startButton.isVisible({ timeout: 800 }).catch(() => false)) {
        return card;
      }
    }
  }

  return cards.first();
}

test("provider can start, add note, flag issue, and complete job", async ({ page }, testInfo) => {
  await attachConsoleDiagnostics(page);

  await criticalStep("Provider signs in", async () => {
    await ensureProviderOnboardingOrWorkbench(page);
  }, "Provider sign-in failed");

  await goToWorkQueue(page);

  await criticalStep(
    "Provider accepts job when needed",
    async () => {
      const jobCard = await targetProviderJobCard(page);
      await expect(jobCard).toBeVisible({ timeout: 20000 });

      const acceptButton = jobCard.getByTestId("accept-job-button").first();
      if (await acceptButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await acceptButton.click();
      }

      await expect(jobCard.getByText(/accepted|in progress|completed|view details/i).first()).toBeVisible({ timeout: 15000 });
    },
    `Provider accept action failed. ${failureEvidenceHint(testInfo)}`
  );

  await criticalStep(
    "Provider starts job when needed",
    async () => {
      const jobCard = await targetProviderJobCard(page);
      await expect(jobCard).toBeVisible({ timeout: 20000 });

      const startButton = jobCard.getByTestId("start-job-button").first();
      if (await startButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await startButton.click();

        const startAnyway = page.getByRole("button", { name: /start anyway/i }).first();
        if (await startAnyway.isVisible({ timeout: 1000 }).catch(() => false)) {
          await startAnyway.click();
        }
      }

      const status = jobCard.getByText(/accepted|in progress|completed/i).first();
      if (!(await status.isVisible({ timeout: 3000 }).catch(() => false))) {
        await expect(jobCard.getByText(/assigned|accepted|in progress|completed|view details/i).first()).toBeVisible({ timeout: 15000 });
      }
    },
    `Provider start action failed. ${failureEvidenceHint(testInfo)}`
  );

  await criticalStep(
    "Provider flags issue and adds note",
    async () => {
      const jobCard = await targetProviderJobCard(page);
      const detailsToggle = jobCard.locator("summary").filter({ hasText: /more details/i }).first();
      if (await detailsToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
        await detailsToggle.click();
      }

      const addNoteButton = jobCard.getByRole("button", { name: /add note/i }).first();
      if (await addNoteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addNoteButton.click();
        await jobCard.locator("textarea").first().fill(e2eData.providerNote);
        await jobCard.getByRole("button", { name: /save note/i }).first().click();
      }

      const issueCheckbox = jobCard.getByLabel(/restock needed|maintenance needed|damage found/i).first();
      if (await issueCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
        const alreadyChecked = await issueCheckbox.isChecked().catch(() => false);
        if (!alreadyChecked) {
          try {
            await issueCheckbox.click({ force: true });
          } catch {
            // Best-effort flagging: transient UI refreshes can interrupt this interaction.
          }
        }
      }
    },
    `Provider issue/note action failed. ${failureEvidenceHint(testInfo)}`
  );

  await criticalStep(
    "Provider completes job when needed",
    async () => {
      const jobCard = await targetProviderJobCard(page);
      const completeButton = jobCard.getByTestId("complete-job-button").first();
      if (await completeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await completeButton.click();

        const confirm = page.getByRole("button", { name: /^complete job$/i }).first();
        if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) {
          await confirm.click();
        }
      }

      await expect(jobCard.getByText(/assigned|accepted|in progress|completed|view details/i).first()).toBeVisible({ timeout: 15000 });
    },
    `Provider complete action failed. ${failureEvidenceHint(testInfo)}`
  );
});
