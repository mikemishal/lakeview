import { expect, test } from "@playwright/test";

test("provider dashboard loads", async ({ page }) => {
  await page.goto("/provider");

  await expect(page.getByRole("heading", { name: "Provider Dashboard" })).toBeVisible();
});
