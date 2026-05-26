import { expect, test } from "@playwright/test";

test.describe.serial("owner/provider core workflow", () => {
  const e2eNote = "E2E test note: missing towels.";

  async function waitForProviderScheduleToLoad(page: import("@playwright/test").Page) {
    await expect(page.getByText("Loading cleaner schedule...")).toBeHidden({
      timeout: 30_000,
    });
  }

  function getJobQueueSection(page: import("@playwright/test").Page) {
    return page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Job queue" }) })
      .first();
  }

  function getOwnerJobQueueSection(page: import("@playwright/test").Page) {
    return page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Owner job queue" }) })
      .first();
  }

  test("provider can accept, start, flag issue, add notes, and complete a job", async ({
    page,
  }) => {
    let targetJobTitle = "";

    await test.step("open provider dashboard and select Test Cleaner", async () => {
      await page.goto("/provider", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });

      await expect(
        page.getByRole("heading", { name: "Provider Dashboard" })
      ).toBeVisible();

      const cleanerSelect = page.getByLabel("Cleaner");

      const testCleanerValue = await cleanerSelect
        .locator("option", { hasText: "Test Cleaner" })
        .first()
        .getAttribute("value");

      expect(testCleanerValue).not.toBeNull();

      const scheduleResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/service-providers/") &&
          response.url().includes("/cleaning-jobs") &&
          response.request().method() === "GET",
        { timeout: 30_000 }
      );

      await cleanerSelect.selectOption(testCleanerValue as string);

      const scheduleResponse = await scheduleResponsePromise;
      expect(scheduleResponse.ok()).toBeTruthy();

      await waitForProviderScheduleToLoad(page);

      await expect(
        page.getByRole("button", { name: /Pending accept/i })
      ).toBeVisible({
        timeout: 15_000,
      });
    });

    const queueSection = getJobQueueSection(page);

    await test.step("open Pending accept queue and accept a job", async () => {
      await page.getByRole("button", { name: /Pending accept/i }).click();

      await expect(queueSection).toBeVisible();
      await expect(queueSection).toContainText("Pending accept");

      const acceptButton = queueSection
        .getByRole("button", { name: "Accept job" })
        .first();

      await expect(acceptButton).toBeVisible({
        timeout: 15_000,
      });

      await acceptButton.click();

      await expect(acceptButton).toBeHidden({
        timeout: 15_000,
      });
    });

    await test.step("switch to Accepted queue and start the accepted job", async () => {
      await page.getByRole("button", { name: /Accepted/i }).click();

      await expect(queueSection).toContainText("Accepted jobs");

      const acceptedCard = queueSection
        .locator("article")
        .filter({
          has: queueSection.getByRole("button", { name: "Start job" }),
        })
        .first();

      await expect(acceptedCard).toBeVisible({
        timeout: 15_000,
      });

      const possibleTitle = acceptedCard
        .locator("h3, h4, p")
        .filter({ hasText: /cleaning/i })
        .first();

      targetJobTitle = (await possibleTitle.innerText()).trim();

      await acceptedCard.getByRole("button", { name: "Start job" }).click();

      await expect(
        acceptedCard.getByRole("button", { name: "Start job" })
      ).toBeHidden({
        timeout: 15_000,
      });
    });

    await test.step("move to In progress queue, update notes and issue flag, then complete", async () => {
      await page.getByRole("button", { name: /In progress/i }).click();

      await expect(queueSection).toContainText("In progress jobs");

      const inProgressCard = queueSection
        .locator("article")
        .filter({ hasText: targetJobTitle })
        .first();

      await expect(inProgressCard).toBeVisible({
        timeout: 15_000,
      });

      const addOrEditNotesButton = inProgressCard.getByRole("button", {
        name: /Add notes|Edit notes/i,
      });

      await expect(addOrEditNotesButton).toBeVisible({
        timeout: 15_000,
      });

      await addOrEditNotesButton.click();

      await inProgressCard.locator("textarea").first().fill(e2eNote);

      await inProgressCard.getByRole("button", { name: "Save notes" }).click();

      await expect(inProgressCard).toContainText(e2eNote, {
        timeout: 15_000,
      });

      const restockCheckbox = inProgressCard.getByLabel("Restock needed");

      if (!(await restockCheckbox.isChecked())) {
        await restockCheckbox.check();
      }

      await expect(restockCheckbox).toBeChecked();

      await inProgressCard.getByRole("button", { name: "Complete job" }).click();

      await expect(
        queueSection.locator("article").filter({ hasText: targetJobTitle })
      ).toHaveCount(0, {
        timeout: 15_000,
      });
    });
  });

  test("owner can see provider notes and issue flags", async ({ page }) => {
    await test.step("open owner dashboard", async () => {
      await page.goto("/owner", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });

      await expect(
        page.getByRole("heading", { name: "Owner Dashboard" })
      ).toBeVisible();
    });

    const ownerQueueSection = getOwnerJobQueueSection(page);

    await test.step("open restock issue queue from Issue summary", async () => {
      await page.getByRole("button", { name: /Restock/i }).first().click();

      await expect(ownerQueueSection).toBeVisible({
        timeout: 15_000,
      });

      await expect(ownerQueueSection).toContainText("Restock", {
        timeout: 15_000,
      });

      await expect(ownerQueueSection).toContainText(e2eNote, {
        timeout: 15_000,
      });

      await expect(ownerQueueSection).toContainText("Restock needed", {
        timeout: 15_000,
      });

      const updatedJobCard = ownerQueueSection
        .locator("article")
        .filter({ hasText: e2eNote })
        .first();

      await expect(updatedJobCard).toBeVisible({
        timeout: 15_000,
      });

      await expect(updatedJobCard).toContainText(/Completed/i);
    });
  });
});