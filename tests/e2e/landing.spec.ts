import { expect, test } from "@playwright/test";

test("landing page loads with owner and provider links", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Operations Dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Owner Dashboard/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Provider Dashboard/i })).toBeVisible();
});
