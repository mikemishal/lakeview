import { expect, type Page } from "@playwright/test";
import { e2eData } from "./test-data";
import { criticalStep } from "./diagnostics";
import { ensureOwnerProfile, ensureProviderProfile } from "./workflow";

async function findPasswordInput(page: Page) {
  return page
    .locator('input[type="password"], input[name*="password" i], input[id*="password" i], input[autocomplete="current-password"]')
    .or(page.getByLabel(/password/i).first())
    .or(page.getByPlaceholder(/password/i).first())
    .first();
}

async function fillEmailPasswordAndSubmit(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });

  const emailInput = page
    .locator('input[type="email"], input[name*="email" i], input[id*="email" i], input[autocomplete="email"]')
    .or(page.getByLabel(/email address|email/i).first())
    .or(page.getByPlaceholder(/email/i).first())
    .first();
  await expect(emailInput).toBeVisible({ timeout: 15000 });
  await emailInput.fill(email);

  // Keep interactions inside the credential form and avoid social sign-in buttons.
  const form = emailInput.locator("xpath=ancestor::form[1]");
  const continueInForm = form
    .getByRole("button", { name: /^continue$/i })
    .filter({ hasNotText: /google|github|apple|microsoft/i })
    .first();

  let passwordInput = await findPasswordInput(page);
  const passwordAlreadyEnabled = await passwordInput
    .isEnabled({ timeout: 1500 })
    .catch(() => false);

  if (!passwordAlreadyEnabled && (await continueInForm.isVisible({ timeout: 3000 }).catch(() => false))) {
    await continueInForm.click();
  }

  passwordInput = await findPasswordInput(page);
  await expect(passwordInput).toBeVisible({ timeout: 15000 });
  await expect(passwordInput).toBeEnabled({ timeout: 15000 });
  await passwordInput.fill(password);

  const submitButton = form
    .getByRole("button", { name: /continue|sign in|log in/i })
    .filter({ hasNotText: /google|github|apple|microsoft/i })
    .first();
  await expect(submitButton).toBeVisible({ timeout: 15000 });
  await submitButton.click();
}

export async function signInAsOwner(page: Page): Promise<void> {
  await criticalStep(
    "Owner signs in",
    async () => {
      await fillEmailPasswordAndSubmit(page, e2eData.ownerEmail, e2eData.ownerPassword);
      if (page.url().includes("/sign-in/factor-two")) {
        throw new Error("Owner account requires Clerk factor-two authentication. Disable MFA for E2E test account or provide a deterministic test MFA strategy.");
      }
      await page.waitForURL(/\/owner|\/onboarding|\/$/, { timeout: 30000 });
    },
    "Owner sign-in failed"
  );

  // Ensure owner profile is complete before continuing
  await ensureOwnerProfile(page);
}

export async function signInAsProvider(page: Page): Promise<void> {
  await criticalStep(
    "Provider signs in",
    async () => {
      await fillEmailPasswordAndSubmit(page, e2eData.providerEmail, e2eData.providerPassword);
      if (page.url().includes("/sign-in/factor-two")) {
        throw new Error("Provider account requires Clerk factor-two authentication. Disable MFA for E2E test account or provide a deterministic test MFA strategy.");
      }
      await page.waitForURL(/\/provider|\/onboarding|\/$/, { timeout: 30000 });
    },
    "Provider sign-in failed"
  );

  // Ensure provider profile is complete before continuing
  await ensureProviderProfile(page);
}

export async function signOut(page: Page): Promise<void> {
  try {
    await page.goto("/");
    const userButton = page.getByRole("button", { name: /account|profile|user/i }).first();
    if (await userButton.isVisible({ timeout: 2000 })) {
      await userButton.click();
      const signOutButton = page.getByRole("button", { name: /sign out|log out/i }).first();
      if (await signOutButton.isVisible({ timeout: 2000 })) {
        await signOutButton.click();
      }
    }
  } catch {
    // Fall back to local session clear without touching app auth logic.
  }

  await page.context().clearCookies();
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
}
