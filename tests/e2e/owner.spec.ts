import { expect, test } from "@playwright/test";

test("owner dashboard loads", async ({ page }) => {
  await page.goto("/owner");

  await expect(page.getByRole("heading", { name: "Owner Dashboard" })).toBeVisible();
});
